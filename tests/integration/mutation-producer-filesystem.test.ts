import { execFile } from "node:child_process";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  MUTATION_CONTROL_FILES,
  MUTATION_REPORT_SCOPES,
  MUTATION_RUNNER_INPUT_FILES,
} from "../../scripts/mutation-bounded-contract.mjs";

const execFileAsync = promisify(execFile);
const sourceRoot = process.cwd();
const runId = "producer-filesystem-fixture";
const candidateTempPrefix = "cvg-mutation-candidate-";
let fixtureRoot: string;
let fixtureScript: string;
let fakePnpmDirectory: string;

async function copyFixtureInputs(root: string) {
  const paths = new Set([
    ...MUTATION_CONTROL_FILES,
    ...MUTATION_RUNNER_INPUT_FILES,
    ...MUTATION_REPORT_SCOPES.flatMap((scope) => scope.sources),
  ]);

  for (const path of paths) {
    const destination = join(root, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, await readFile(join(sourceRoot, path)));
  }

  await execFileAsync("git", ["init", "-q", "--initial-branch=main"], {
    cwd: root,
  });
  await execFileAsync(
    "git",
    ["config", "user.email", "producer-test@example.invalid"],
    {
      cwd: root,
    },
  );
  await execFileAsync("git", ["config", "user.name", "Producer Test"], {
    cwd: root,
  });
  await execFileAsync("git", ["add", "--all"], { cwd: root });
  await execFileAsync("git", ["commit", "-qm", "producer fixture"], {
    cwd: root,
  });
}

async function installFakePnpm(root: string) {
  const directory = join(root, "fake-bin");
  await mkdir(directory, { recursive: true });
  const executable = join(directory, "pnpm");
  await writeFile(
    executable,
    `#!/usr/bin/env node
import { mkdir, readFile, rename, symlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const [command] = process.argv.slice(2);
const capture = process.env.CVG_TEST_CANDIDATE_CAPTURE;
if (capture) await writeFile(capture, process.cwd());
if (command === "install" && process.env.CVG_TEST_SWAP_REPORTS_OUTSIDE) {
  const repositoryRoot = process.env.CVG_TEST_REPOSITORY_ROOT;
  await rename(join(repositoryRoot, "reports"), join(repositoryRoot, "reports-original"));
  await symlink(process.env.CVG_TEST_SWAP_REPORTS_OUTSIDE, join(repositoryRoot, "reports"), "dir");
}
if (process.env.CVG_TEST_FAIL_AT === command) {
  console.error("injected producer failure");
  process.exit(37);
}
if (command === "install" || command === "build") process.exit(0);

const scopeId = command.replace("mutation:", "").replace("worker-loop", "worker");
const scope = ${JSON.stringify(MUTATION_REPORT_SCOPES)}.find((item) => item.id === scopeId);
if (!scope) process.exit(38);
const files = {};
for (const source of scope.sources) {
  files[source] = {
    language: "typescript",
    source: await readFile(source, "utf8"),
    mutants: [{
      id: "fixture-mutant",
      mutatorName: "BooleanLiteral",
      replacement: "false",
      status: "Survived",
      location: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } },
    }],
  };
}
const report = {
  schemaVersion: "1.0",
  projectRoot: process.cwd(),
  config: { mutate: scope.sources },
  files,
};
const path = join("reports", "mutation-runs", process.env.CVG_MUTATION_CANDIDATE_ID, scopeId, "mutation.json");
await mkdir(dirname(path), { recursive: true });
if (process.env.CVG_TEST_REPORT_SYMLINK_TARGET) {
  await symlink(process.env.CVG_TEST_REPORT_SYMLINK_TARGET, path, "file");
} else {
  await writeFile(path, JSON.stringify(report));
}
`,
  );
  await chmod(executable, 0o755);
  return directory;
}

async function runProducer(
  root: string,
  overrides: Record<string, string> = {},
) {
  const head = await execFileAsync("git", ["rev-parse", "HEAD"], {
    cwd: root,
  });
  const result = await execFileAsync(process.execPath, [fixtureScript], {
    cwd: root,
    env: {
      ...process.env,
      PATH: `${fakePnpmDirectory}:${process.env.PATH ?? ""}`,
      CVG_MUTATION_CANDIDATE_ID: runId,
      EXPECTED_SHA: head.stdout.trim(),
      ...overrides,
    },
    maxBuffer: 8 * 1024 * 1024,
  }).then(
    (value) => ({ code: 0, stdout: value.stdout, stderr: value.stderr }),
    (error: { code: number; stdout: string; stderr: string }) => error,
  );
  return result;
}

async function listCandidateTempRoots() {
  const entries = await readdir(tmpdir(), { withFileTypes: true });
  return entries
    .filter(
      (entry) =>
        entry.isDirectory() && entry.name.startsWith(candidateTempPrefix),
    )
    .map((entry) => join(tmpdir(), entry.name));
}

beforeEach(async () => {
  fixtureRoot = await mkdtemp(join(tmpdir(), "cvg-mutation-producer-test-"));
  await copyFixtureInputs(fixtureRoot);
  fixtureScript = join(fixtureRoot, "scripts/discover-candidate-mutation.mjs");
  fakePnpmDirectory = await installFakePnpm(fixtureRoot);
});

afterEach(async () => {
  for (const captureName of [
    "candidate-root.txt",
    "successful-candidate-root.txt",
  ]) {
    const capture = join(fixtureRoot, captureName);
    const candidateRoot = await readFile(capture, "utf8").catch(() => null);
    if (candidateRoot) {
      await rm(dirname(candidateRoot), { recursive: true, force: true });
    }
  }
  await rm(fixtureRoot, { recursive: true, force: true });
});

describe("candidate mutation producer filesystem safety", () => {
  it("rejects a symlinked reports parent and preserves the external sentinel", async () => {
    const outside = await mkdtemp(
      join(tmpdir(), "cvg-mutation-output-outside-"),
    );
    const sentinel = join(outside, "sentinel.txt");
    const capture = join(fixtureRoot, "candidate-root.txt");
    await writeFile(sentinel, "keep this external file\n");
    await symlink(outside, join(fixtureRoot, "reports"), "dir");

    try {
      const result = await runProducer(fixtureRoot, {
        CVG_TEST_FAIL_AT: "install",
        CVG_TEST_CANDIDATE_CAPTURE: capture,
      });

      expect(result.code).toBe(1);
      expect(result.stderr).toMatch(/ENOTDIR|ELOOP|symbolic link|symlink/iu);
      expect(await readFile(sentinel, "utf8")).toBe(
        "keep this external file\n",
      );
      expect(await readdir(outside)).toEqual(["sentinel.txt"]);
      await expect(lstat(capture)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(join(fixtureRoot, "reports"), { force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });

  it("keeps output writes anchored when reports is swapped to an external symlink", async () => {
    const outside = await mkdtemp(join(tmpdir(), "cvg-mutation-output-swap-"));
    const sentinel = join(outside, "sentinel.txt");
    const reports = join(fixtureRoot, "reports");
    const movedReports = join(fixtureRoot, "reports-original");
    const capture = join(fixtureRoot, "candidate-root.txt");
    await mkdir(reports);
    await writeFile(join(reports, "keep.txt"), "preserve report parent\n");
    await writeFile(sentinel, "keep this external file\n");

    try {
      const result = await runProducer(fixtureRoot, {
        CVG_TEST_CANDIDATE_CAPTURE: capture,
        CVG_TEST_REPOSITORY_ROOT: fixtureRoot,
        CVG_TEST_SWAP_REPORTS_OUTSIDE: outside,
      });

      expect(result.code).toBe(1);
      expect(result.stderr).toContain("parent changed during execution");
      expect(await readFile(sentinel, "utf8")).toBe(
        "keep this external file\n",
      );
      expect(await readdir(outside)).toEqual(["sentinel.txt"]);
      expect(await readdir(movedReports)).toEqual(["keep.txt"]);
      expect(await readlink(reports)).toBe(outside);
      const candidateRoot = await readFile(capture, "utf8");
      await expect(lstat(candidateRoot)).rejects.toMatchObject({
        code: "ENOENT",
      });
      await expect(lstat(dirname(candidateRoot))).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });

  it("rejects a Stryker report symlink instead of reading outside the candidate", async () => {
    const outside = await mkdtemp(
      join(tmpdir(), "cvg-mutation-report-outside-"),
    );
    const sentinel = join(outside, "sentinel.json");
    const capture = join(fixtureRoot, "candidate-root.txt");
    const sentinelContents = "external report sentinel\n";
    await writeFile(sentinel, sentinelContents);

    try {
      const result = await runProducer(fixtureRoot, {
        CVG_TEST_CANDIDATE_CAPTURE: capture,
        CVG_TEST_REPORT_SYMLINK_TARGET: sentinel,
      });

      expect(result.code).toBe(1);
      expect(result.stderr).toMatch(/symlink|symbolic link|ELOOP/iu);
      expect(await readFile(sentinel, "utf8")).toBe(sentinelContents);
      const candidateRoot = await readFile(capture, "utf8");
      await expect(lstat(candidateRoot)).rejects.toMatchObject({
        code: "ENOENT",
      });
      await expect(lstat(dirname(candidateRoot))).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });

  it("removes only its partial output and candidate root after a late failure", async () => {
    const reports = join(fixtureRoot, "reports");
    const capture = join(fixtureRoot, "candidate-root.txt");
    const sentinel = join(reports, "keep.txt");
    await mkdir(reports, { recursive: true });
    await writeFile(sentinel, "preserve preexisting report\n");
    const candidateRootsBefore = await listCandidateTempRoots();

    const result = await runProducer(fixtureRoot, {
      CVG_TEST_CANDIDATE_CAPTURE: capture,
      CVG_TEST_FAIL_AT: "mutation:critical",
    });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("injected producer failure");
    expect(await readFile(sentinel, "utf8")).toBe(
      "preserve preexisting report\n",
    );
    for (const path of [
      join(reports, "mutation-bounded", runId),
      join(reports, "mutation-runs", runId),
      ...MUTATION_REPORT_SCOPES.map((scope) =>
        join(fixtureRoot, scope.evidencePath),
      ),
    ]) {
      await expect(lstat(path)).rejects.toMatchObject({ code: "ENOENT" });
    }
    const candidateRoot = await readFile(capture, "utf8");
    await expect(lstat(candidateRoot)).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(lstat(dirname(candidateRoot))).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(await listCandidateTempRoots()).toEqual(candidateRootsBefore);
  });

  it("retains the isolated candidate root after a successful run", async () => {
    const capture = join(fixtureRoot, "successful-candidate-root.txt");
    const result = await runProducer(fixtureRoot, {
      CVG_TEST_CANDIDATE_CAPTURE: capture,
    });

    expect(result.code, result.stderr).toBe(0);
    const output = JSON.parse(result.stdout) as {
      isolatedCandidateRoot: string;
      manifest: string;
      status: string;
    };
    expect(output).toMatchObject({ status: "READY" });
    await lstat(output.isolatedCandidateRoot);
    expect(await readFile(capture, "utf8")).toBe(output.isolatedCandidateRoot);
    await readFile(
      join(output.isolatedCandidateRoot, ".cvg-mutation-candidate.json"),
    );
    await readFile(join(fixtureRoot, output.manifest));
    await rm(dirname(output.isolatedCandidateRoot), {
      recursive: true,
      force: true,
    });
  });
});
