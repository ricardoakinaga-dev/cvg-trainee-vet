import { spawn } from "node:child_process";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import {
  lstat,
  mkdir,
  mkdtemp,
  open,
  readlink,
  realpath,
  rm,
  rmdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  MUTATION_CONTROL_FILES,
  MUTATION_REPORT_SCOPES,
  MUTATION_RUNNER_INPUT_FILES,
  buildBoundedMutationManifest,
  resolveRepositoryRoot,
  sha256FileBytes,
} from "./mutation-bounded-contract.mjs";
import { readContainedMutationFile } from "./mutation-safe-files.mjs";

const { O_CREAT, O_DIRECTORY, O_EXCL, O_NOFOLLOW, O_RDONLY, O_WRONLY } =
  fsConstants;
const execFileAsync = promisify(execFile);
const safeRunId = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/u;

function required(value, detail) {
  if (!value) throw new Error(detail);
}

function waitForProcess(child, label) {
  return new Promise((resolvePromise, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code === 0 && signal === null) {
        resolvePromise();
      } else {
        reject(new Error(`${label} failed (code=${code}, signal=${signal})`));
      }
    });
  });
}

async function run(command, args, cwd, env, label) {
  const child = spawn(command, args, { cwd, env, stdio: "inherit" });
  await waitForProcess(child, label);
}

async function runGitArchive(repositoryRoot, candidateRoot) {
  const archive = spawn("git", ["archive", "--format=tar", "HEAD"], {
    cwd: repositoryRoot,
    stdio: ["ignore", "pipe", "inherit"],
  });
  const extract = spawn("tar", ["-xf", "-", "-C", candidateRoot], {
    cwd: candidateRoot,
    stdio: ["pipe", "ignore", "inherit"],
  });
  archive.stdout.pipe(extract.stdin);
  await Promise.all([
    waitForProcess(archive, "git archive of candidate HEAD"),
    waitForProcess(extract, "candidate archive extraction"),
  ]);
}

function safeOutputSegments(path) {
  required(
    typeof path === "string" &&
      path.length > 0 &&
      !isAbsolute(path) &&
      !path.includes("\\") &&
      path
        .split("/")
        .every(
          (segment) => segment !== "" && segment !== "." && segment !== "..",
        ),
    `candidate mutation output path is unsafe: ${path}`,
  );
  return path.split("/");
}

function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function isOutside(root, path) {
  const pathRelative = relative(root, path);
  return (
    pathRelative === ".." ||
    pathRelative.startsWith(`..${sep}`) ||
    isAbsolute(pathRelative)
  );
}

async function openMutationOutputFilesystem(repositoryRoot) {
  required(
    process.platform === "linux",
    "safe mutation output requires Linux directory descriptors and /proc/self/fd",
  );
  const canonicalRoot = await realpath(repositoryRoot);
  required(
    canonicalRoot === repositoryRoot,
    "repository root is not a canonical physical path",
  );

  const directoryFlags = O_RDONLY | O_DIRECTORY | O_NOFOLLOW;
  const rootHandle = await open(repositoryRoot, directoryFlags);
  const directories = new Map([["", rootHandle]]);
  const createdDirectories = [];
  const createdFiles = [];
  const anchoredPath = (handle, name = "") =>
    name
      ? join(`/proc/self/fd/${handle.fd}`, name)
      : `/proc/self/fd/${handle.fd}`;

  async function assertDirectoryLocation(path, handle) {
    const actual = await readlink(anchoredPath(handle));
    const expected = path
      ? join(repositoryRoot, ...path.split("/"))
      : repositoryRoot;
    required(
      actual === expected && !isOutside(repositoryRoot, actual),
      `candidate mutation output parent changed during execution: ${path || "."}`,
    );
  }

  async function assertAbsent(path) {
    const segments = safeOutputSegments(path);
    const temporaryHandles = [];
    let parent = rootHandle;
    let parentPath = "";
    try {
      for (const segment of segments.slice(0, -1)) {
        parentPath = parentPath ? `${parentPath}/${segment}` : segment;
        let child;
        try {
          child = await open(anchoredPath(parent, segment), directoryFlags);
        } catch (error) {
          if (error.code === "ENOENT") return;
          throw error;
        }
        temporaryHandles.push(child);
        await assertDirectoryLocation(parentPath, child);
        parent = child;
      }
      const target = anchoredPath(parent, segments.at(-1));
      const stats = await lstat(target).catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      required(
        stats === null,
        `candidate mutation output already exists: ${path}`,
      );
    } finally {
      for (const handle of temporaryHandles.reverse()) await handle.close();
    }
  }

  async function ensureDirectory(path) {
    const segments = path ? safeOutputSegments(path) : [];
    let currentPath = "";
    let parent = rootHandle;
    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const cached = directories.get(currentPath);
      if (cached) {
        await assertDirectoryLocation(currentPath, cached);
        parent = cached;
        continue;
      }

      const target = anchoredPath(parent, segment);
      let created = false;
      let child;
      try {
        child = await open(target, directoryFlags);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        await mkdir(target, { mode: 0o755 });
        created = true;
        child = await open(target, directoryFlags);
      }
      directories.set(currentPath, child);
      if (created) {
        createdDirectories.push({
          parent,
          parentPath: dirname(currentPath) === "." ? "" : dirname(currentPath),
          name: segment,
          identity: await child.stat(),
        });
      }
      await assertDirectoryLocation(currentPath, child);
      parent = child;
    }
    return parent;
  }

  async function writeFileExclusive(path, bytes) {
    const segments = safeOutputSegments(path);
    const fileName = segments.at(-1);
    const parentPath = segments.slice(0, -1).join("/");
    const parent = await ensureDirectory(parentPath);
    await assertDirectoryLocation(parentPath, parent);
    const handle = await open(
      anchoredPath(parent, fileName),
      O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW,
      0o644,
    );
    const identity = await handle.stat();
    createdFiles.push({
      parent,
      parentPath,
      name: fileName,
      identity,
    });
    try {
      await handle.writeFile(bytes);
      await assertDirectoryLocation(parentPath, parent);
    } finally {
      await handle.close();
    }
  }

  async function assertCreatedOutputsCurrent() {
    for (const [path, handle] of directories) {
      if (path) await assertDirectoryLocation(path, handle);
    }
    for (const file of createdFiles) {
      await assertDirectoryLocation(file.parentPath, file.parent);
      const stats = await lstat(anchoredPath(file.parent, file.name));
      required(
        stats.isFile() &&
          !stats.isSymbolicLink() &&
          sameIdentity(stats, file.identity),
        `candidate mutation output changed during execution: ${file.parentPath}/${file.name}`,
      );
    }
  }

  async function cleanupCreatedOutputs() {
    const failures = [];
    for (const file of [...createdFiles].reverse()) {
      try {
        const target = anchoredPath(file.parent, file.name);
        const stats = await lstat(target).catch((error) => {
          if (error.code === "ENOENT") return null;
          throw error;
        });
        if (stats && stats.isFile() && sameIdentity(stats, file.identity)) {
          await unlink(target);
        }
      } catch (error) {
        failures.push(error);
      }
    }
    for (const directory of [...createdDirectories].reverse()) {
      try {
        const target = anchoredPath(directory.parent, directory.name);
        const stats = await lstat(target).catch((error) => {
          if (error.code === "ENOENT") return null;
          throw error;
        });
        if (
          stats &&
          stats.isDirectory() &&
          !stats.isSymbolicLink() &&
          sameIdentity(stats, directory.identity)
        ) {
          await rmdir(target);
        }
      } catch (error) {
        failures.push(error);
      }
    }
    return failures;
  }

  async function close() {
    const uniqueHandles = [...new Set(directories.values())].reverse();
    for (const handle of uniqueHandles) {
      await handle.close().catch(() => {});
    }
  }

  return {
    assertAbsent,
    ensureDirectory,
    writeFileExclusive,
    assertCreatedOutputsCurrent,
    cleanupCreatedOutputs,
    close,
  };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function verifyControlFilesMatchHead(repositoryRoot, candidateSha) {
  for (const path of MUTATION_CONTROL_FILES) {
    const { bytes: current } = await readContainedMutationFile(
      repositoryRoot,
      path,
    );
    const committed = await execFileAsync(
      "git",
      ["show", `${candidateSha}:${path}`],
      { cwd: repositoryRoot, encoding: "buffer" },
    ).catch(() => null);
    required(
      committed !== null && current.equals(committed.stdout),
      `mutation evidence control file differs from candidate HEAD: ${path}`,
    );
  }
}

async function collectRunnerInputDigests(
  candidateRoot,
  repositoryRoot,
  candidateSha,
) {
  const digests = {};
  for (const path of MUTATION_RUNNER_INPUT_FILES) {
    const { bytes } = await readContainedMutationFile(candidateRoot, path);
    const committed = await execFileAsync(
      "git",
      ["show", `${candidateSha}:${path}`],
      { cwd: repositoryRoot, encoding: "buffer" },
    );
    required(
      bytes.equals(committed.stdout),
      `candidate mutation runner input differs from HEAD: ${path}`,
    );
    digests[path] = sha256(bytes);
  }
  return digests;
}

async function main() {
  const repositoryRoot = resolveRepositoryRoot();
  required(
    resolve(process.cwd()) === repositoryRoot,
    "run mutation discovery from the candidate repository root",
  );
  const candidateRunId = process.env.CVG_MUTATION_CANDIDATE_ID?.trim();
  const expectedSha = process.env.EXPECTED_SHA?.trim().toLowerCase();
  required(
    candidateRunId && safeRunId.test(candidateRunId),
    "candidate run id is missing or invalid",
  );
  required(
    expectedSha && /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/u.test(expectedSha),
    "EXPECTED_SHA is missing or malformed",
  );
  const { stdout: headOutput } = await execFileAsync(
    "git",
    ["rev-parse", "HEAD"],
    { cwd: repositoryRoot },
  );
  const candidateSha = headOutput.trim().toLowerCase();
  required(
    candidateSha === expectedSha,
    "checked out HEAD differs from EXPECTED_SHA",
  );
  await verifyControlFilesMatchHead(repositoryRoot, candidateSha);

  const boundedRelativeDirectory = `reports/mutation-bounded/${candidateRunId}`;
  const rawRunRelativeDirectory = `reports/mutation-runs/${candidateRunId}`;
  const outputs = [
    boundedRelativeDirectory,
    rawRunRelativeDirectory,
    "reports/mutation-summary.json",
    ...MUTATION_REPORT_SCOPES.map((scope) => scope.evidencePath),
    ...MUTATION_REPORT_SCOPES.map(
      (scope) => `${rawRunRelativeDirectory}/${scope.id}/mutation.json`,
    ),
  ];
  const outputFilesystem = await openMutationOutputFilesystem(repositoryRoot);
  let tempRoot;
  let succeeded = false;
  try {
    for (const path of outputs) await outputFilesystem.assertAbsent(path);
    await outputFilesystem.ensureDirectory(boundedRelativeDirectory);

    tempRoot = await mkdtemp(join(tmpdir(), "cvg-mutation-candidate-"));
    const candidateRoot = join(tempRoot, "source");
    await mkdir(candidateRoot);
    await runGitArchive(repositoryRoot, candidateRoot);
    await writeFile(
      join(candidateRoot, ".cvg-mutation-candidate.json"),
      JSON.stringify({
        format: "cvg-mutation-candidate/v1",
        root: candidateRoot,
        candidateSha,
        candidateRunId,
      }),
      { flag: "wx" },
    );
    await run(
      "pnpm",
      ["install", "--frozen-lockfile"],
      candidateRoot,
      process.env,
      "isolated candidate install",
    );
    await run(
      "pnpm",
      ["build"],
      candidateRoot,
      process.env,
      "isolated candidate build",
    );

    const runnerInputDigests = await collectRunnerInputDigests(
      candidateRoot,
      repositoryRoot,
      candidateSha,
    );
    const strykerResults = [];
    const mutationCommands = [
      ["authorization", "mutation:authorization"],
      ["critical", "mutation:critical"],
      ["worker", "mutation:worker-loop"],
    ];
    for (const [scopeId, packageScript] of mutationCommands) {
      const scope = MUTATION_REPORT_SCOPES.find((item) => item.id === scopeId);
      required(scope, `unknown configured Stryker scope: ${scopeId}`);
      const path = `${rawRunRelativeDirectory}/${scopeId}/mutation.json`;
      const startedAt = Date.now();
      await run(
        "pnpm",
        [packageScript],
        candidateRoot,
        { ...process.env, CVG_MUTATION_CANDIDATE_ID: candidateRunId },
        `Stryker ${scopeId}`,
      );
      const finishedAt = Date.now();
      const candidateReportPath = `reports/mutation-runs/${candidateRunId}/${scopeId}/mutation.json`;
      const { bytes } = await readContainedMutationFile(
        candidateRoot,
        candidateReportPath,
      );
      const report = JSON.parse(bytes.toString("utf8"));
      required(
        resolve(report.projectRoot) === candidateRoot,
        `Stryker ${scopeId} report came from a different project root`,
      );
      for (const sourceName of scope.sources) {
        const { stdout } = await execFileAsync(
          "git",
          ["show", `${candidateSha}:${sourceName}`],
          { cwd: repositoryRoot },
        );
        required(
          report.files?.[sourceName]?.source === stdout,
          `Stryker ${scopeId} source differs from candidate HEAD: ${sourceName}`,
        );
      }
      await outputFilesystem.writeFileExclusive(path, bytes);
      await outputFilesystem.writeFileExclusive(scope.evidencePath, bytes);
      strykerResults.push({
        scope: scopeId,
        path,
        evidencePath: scope.evidencePath,
        sha256: sha256(bytes),
        runId: candidateRunId,
        startedAt,
        finishedAt,
        report,
      });
    }

    const generatedAt = new Date().toISOString();
    const manifest = buildBoundedMutationManifest({
      root: candidateRoot,
      vitest: join(candidateRoot, "node_modules", "vitest", "vitest.mjs"),
      config: "vitest.config.ts",
      candidateSha,
      candidateRunId,
      repositoryRoot,
      generatedAt,
      reports: strykerResults,
      runnerInputDigests,
    });
    const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
    await outputFilesystem.writeFileExclusive(
      `${boundedRelativeDirectory}/manifest.json`,
      manifestBytes,
    );
    await outputFilesystem.assertCreatedOutputsCurrent();
    console.log(
      JSON.stringify({
        status: "READY",
        candidateSha,
        candidateRunId,
        manifest: `${boundedRelativeDirectory}/manifest.json`,
        manifestSha256: sha256FileBytes(manifestBytes),
        isolatedCandidateRoot: candidateRoot,
        totalMutants: manifest.provenance.totalMutants,
        rawKilled: manifest.provenance.rawKilled,
        pendingMutants: manifest.provenance.pendingMutants,
      }),
    );
    succeeded = true;
  } finally {
    if (!succeeded) {
      if (tempRoot) {
        await rm(tempRoot, { recursive: true, force: true }).catch((error) => {
          console.error(`candidate temp cleanup failed: ${error.message}`);
        });
      }
      const cleanupFailures = await outputFilesystem.cleanupCreatedOutputs();
      for (const error of cleanupFailures) {
        console.error(`candidate output cleanup failed: ${error.message}`);
      }
    }
    await outputFilesystem.close();
  }
}

await main().catch((error) => {
  console.error(`candidate mutation discovery failed: ${error.message}`);
  process.exitCode = 1;
});
