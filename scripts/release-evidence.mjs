import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = process.cwd();

const BUNDLE_FILES = Object.freeze([
  "manifest.json",
  "git-sha.txt",
  "provenance.json",
  "migration-head.txt",
  "artifact-digests.json",
  "ci-runs.json",
]);

const SUMMARY_FILES = Object.freeze([
  "coverage-summary.json",
  "test-summary.json",
  "security-summary.json",
  "rls-live-summary.json",
  "multi-instance-summary.json",
  "load-summary.json",
  "otel-summary.json",
  "mutation-summary.json",
  "redis-candidate-summary.json",
  "staging-summary.json",
  "restore-summary.json",
  "remote-ci-summary.json",
]);

async function git(args) {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd: root });
    return stdout.trim();
  } catch {
    return "unknown";
  }
}

function sha256Hex(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function migrationHead() {
  const journal = JSON.parse(
    await readFile(
      join(root, "packages/persistence/drizzle/meta/_journal.json"),
      "utf8",
    ),
  );
  const entries = journal.entries ?? [];
  return entries.length > 0 ? entries[entries.length - 1].tag : "unknown";
}

async function digestTree() {
  const { stdout } = await execFileAsync("git", ["ls-files", "-s"], {
    cwd: root,
  });
  return sha256Hex(stdout);
}

async function toolVersions() {
  const declared = JSON.parse(
    await readFile(join(root, "package.json"), "utf8").catch(() => "{}"),
  ).devDependencies;
  const pick = (name) =>
    typeof declared?.[name] === "string" ? declared[name] : "unknown";
  const pnpmVersion = await execFileAsync("pnpm", ["--version"])
    .then(({ stdout }) => stdout.trim())
    .catch(() => "unknown");
  return {
    node: process.version,
    pnpm: pnpmVersion,
    typescript: pick("typescript"),
    vitest: pick("vitest"),
    eslint: pick("eslint"),
    playwright: pick("@playwright/test"),
    drizzleKit: pick("drizzle-kit"),
  };
}

async function workspaceManifestDigests() {
  const manifests = ["package.json"];
  for (const scope of ["apps", "packages"]) {
    const entries = await readdir(join(root, scope), {
      withFileTypes: true,
    }).catch(() => []);
    for (const entry of entries) {
      if (entry.isDirectory())
        manifests.push(join(scope, entry.name, "package.json"));
    }
  }
  const digests = {};
  for (const manifest of manifests.sort()) {
    const content = await readFile(join(root, manifest), "utf8").catch(
      () => null,
    );
    if (content !== null) digests[manifest] = sha256Hex(content);
  }
  return digests;
}

export function flagValue(name) {
  const equals = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (equals !== undefined) return equals.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const next = process.argv[index + 1];
  // A bare flag at the end (or followed by another flag) has no value.
  if (next === undefined || next.startsWith("--")) return null;
  return next;
}

function readJsonFile(path) {
  return readFile(path, "utf8").then((text) => JSON.parse(text));
}

export function validateSbom(sbom) {
  const failures = [];
  if (sbom === null || typeof sbom !== "object") {
    return ["sbom is not a JSON object"];
  }
  if (sbom.bomFormat !== "CycloneDX") {
    failures.push(
      `sbom bomFormat is ${String(sbom.bomFormat)}, expected CycloneDX`,
    );
  }
  if (typeof sbom.specVersion !== "string" || sbom.specVersion.length === 0) {
    failures.push("sbom specVersion is missing");
  }
  if (!Array.isArray(sbom.components) || sbom.components.length === 0) {
    failures.push("sbom has no components");
  }
  if (sbom.metadata === undefined || typeof sbom.metadata !== "object") {
    failures.push("sbom metadata is missing");
  }
  return failures;
}

export async function validateBundle(directory, options = {}) {
  const strict = options.strict === true;
  const expectedHead = options.head ?? null;
  const failures = [];
  const manifest = await readJsonFile(join(directory, "manifest.json")).catch(
    () => null,
  );
  if (manifest === null) return ["manifest.json is missing or unparsable"];
  for (const file of [
    ...BUNDLE_FILES,
    ...SUMMARY_FILES,
    "sbom.cyclonedx.json",
  ]) {
    if (file === "manifest.json") continue;
    const listed = (manifest.artifacts ?? []).some(
      (entry) => entry.path === file,
    );
    if (!listed) {
      failures.push(`manifest does not list ${file}`);
    }
  }
  const sha = await readFile(join(directory, "git-sha.txt"), "utf8")
    .then((text) => text.trim())
    .catch(() => "");
  if (!/^[0-9a-f]{40}$/u.test(sha)) {
    failures.push("git-sha.txt is not a full commit SHA");
  } else if (manifest.commit !== sha) {
    failures.push("manifest commit does not match git-sha.txt");
  }
  const digests = await readJsonFile(
    join(directory, "artifact-digests.json"),
  ).catch(() => null);
  if (digests === null || typeof digests !== "object") {
    failures.push("artifact-digests.json is missing or unparsable");
  } else {
    for (const [file, expected] of Object.entries(digests)) {
      const actual = await readFile(join(directory, file), "utf8")
        .then((text) => sha256Hex(text))
        .catch(() => null);
      if (actual === null) {
        failures.push(`digested artifact missing: ${file}`);
      } else if (actual !== expected) {
        failures.push(`digest mismatch: ${file}`);
      }
    }
  }
  const sbomEntry = manifest.artifacts.find(
    (entry) => entry.path === "sbom.cyclonedx.json",
  );
  const sbomStatus =
    sbomEntry?.status ?? (sbomEntry?.sha256 ? "present" : undefined);
  if (sbomStatus === "present") {
    const sbom = await readJsonFile(
      join(directory, "sbom.cyclonedx.json"),
    ).catch(() => null);
    if (sbom === null) {
      failures.push("sbom.cyclonedx.json listed present but unreadable");
    } else {
      failures.push(...validateSbom(sbom).map((finding) => `sbom: ${finding}`));
    }
  } else if (sbomStatus !== "missing-blocked") {
    failures.push("sbom status must be present or missing-blocked");
  }
  if (strict) {
    // AAA-CERT-004 §35: final promotion admits no stale or placeholder
    // evidence. Every summary must be present, parse, PASS (where the
    // format defines a status) and belong to the expected HEAD (where the
    // format carries a sha).
    if (expectedHead === null || !/^[0-9a-f]{40}$/u.test(expectedHead)) {
      failures.push("strict validation requires a full HEAD sha");
    } else {
      if (sha !== expectedHead) {
        failures.push("git-sha.txt does not match the validated HEAD");
      }
      for (const file of SUMMARY_FILES) {
        const parsed = await readJsonFile(join(directory, file)).catch(
          () => null,
        );
        if (parsed === null || typeof parsed !== "object") {
          failures.push(`${file} is missing or unparsable`);
          continue;
        }
        if (parsed.status === "missing-blocked") {
          failures.push(`${file} is missing-blocked`);
          continue;
        }
        if ("status" in parsed && parsed.status !== "PASS") {
          failures.push(`${file} status is ${String(parsed.status)}`);
        }
        if ("sha" in parsed && parsed.sha !== expectedHead) {
          failures.push(
            `${file} belongs to ${String(parsed.sha)}, expected ${expectedHead}`,
          );
        }
      }
      const mutation = await readJsonFile(
        join(directory, "mutation-summary.json"),
      ).catch(() => null);
      if (mutation !== null) {
        if (
          typeof mutation.adjusted_score !== "number" ||
          mutation.adjusted_score < 0.9
        ) {
          failures.push("mutation adjusted score < 0.9");
        }
        if (mutation.critical_real_survivors !== 0) {
          failures.push("mutation critical real survivors > 0");
        }
      }
      const redis = await readJsonFile(
        join(directory, "redis-candidate-summary.json"),
      ).catch(() => null);
      if (
        redis !== null &&
        redis.backend !== "redis" &&
        redis.backend !== "valkey"
      ) {
        failures.push("redis candidate backend is not durable");
      }
    }
  }
  return failures;
}

async function generate(outDir, options) {
  await mkdir(outDir, { recursive: true });
  const commit = await git(["rev-parse", "HEAD"]);
  const branch = await git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const lockfile = await readFile(join(root, "pnpm-lock.yaml"), "utf8").catch(
    () => "",
  );
  const files = await readdir(join(root, "packages/persistence/drizzle")).catch(
    () => [],
  );
  const provenance = {
    format: "cvg-release-provenance/v1",
    commit,
    branch,
    buildTimestamp: new Date().toISOString(),
    tools: await toolVersions(),
    lockfileSha256: lockfile === "" ? "unknown" : sha256Hex(lockfile),
    workspaceManifests: await workspaceManifestDigests(),
    migrationHead: await migrationHead(),
    migrationFiles: files.filter((file) => file.endsWith(".sql")).length,
    treeDigest: await digestTree(),
    ci:
      process.env.GITHUB_RUN_ID === undefined
        ? { runner: "local" }
        : {
            runner: process.env.RUNNER_NAME ?? "github-hosted",
            os: process.env.RUNNER_OS ?? "unknown",
            runId: process.env.GITHUB_RUN_ID,
            workflow: process.env.GITHUB_WORKFLOW ?? "unknown",
          },
  };

  const artifacts = [];
  const writeArtifact = async (name, content) => {
    await writeFile(join(outDir, name), content);
    artifacts.push({ path: name, sha256: sha256Hex(content) });
  };

  await writeArtifact("git-sha.txt", `${commit}\n`);
  await writeArtifact(
    "provenance.json",
    `${JSON.stringify(provenance, null, 2)}\n`,
  );
  await writeArtifact("migration-head.txt", `${provenance.migrationHead}\n`);

  for (const summary of SUMMARY_FILES) {
    const source = options.summaries[summary];
    if (source === null) {
      await writeArtifact(
        summary,
        `${JSON.stringify({ status: "missing-blocked", commit }, null, 2)}\n`,
      );
    } else {
      await writeArtifact(
        summary,
        await readFile(source, "utf8").catch(() => {
          throw new Error(`summary source unreadable: ${source}`);
        }),
      );
    }
  }

  if (options.sbom === null) {
    artifacts.push({ path: "sbom.cyclonedx.json", status: "missing-blocked" });
  } else {
    await copyFile(options.sbom, join(outDir, "sbom.cyclonedx.json"));
    const content = await readFile(join(outDir, "sbom.cyclonedx.json"), "utf8");
    const sbomFailures = validateSbom(JSON.parse(content));
    if (sbomFailures.length > 0) {
      throw new Error(`invalid SBOM: ${sbomFailures.join("; ")}`);
    }
    artifacts.push({ path: "sbom.cyclonedx.json", sha256: sha256Hex(content) });
  }

  if (options.ciRuns === null) {
    await writeArtifact(
      "ci-runs.json",
      `${JSON.stringify({ status: "missing-blocked", commit }, null, 2)}\n`,
    );
  } else {
    await writeArtifact(
      "ci-runs.json",
      await readFile(options.ciRuns, "utf8").catch(() => {
        throw new Error(`ci-runs source unreadable: ${options.ciRuns}`);
      }),
    );
  }

  const manifest = {
    format: "cvg-release-evidence/v1",
    commit,
    artifacts,
  };
  await writeFile(
    join(outDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  const digests = {};
  for (const entry of artifacts) {
    if (entry.sha256 !== undefined) digests[entry.path] = entry.sha256;
  }
  const digestsContent = `${JSON.stringify(digests, null, 2)}\n`;
  await writeFile(join(outDir, "artifact-digests.json"), digestsContent);
  manifest.artifacts.push({
    path: "artifact-digests.json",
    sha256: sha256Hex(digestsContent),
  });
  await writeFile(
    join(outDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.log(`release evidence written to ${outDir} at ${commit}`);
}

async function main() {
  if (process.argv.includes("--self-test")) {
    const directory = await mkdtemp(join(tmpdir(), "cvg-evidence-"));
    try {
      await generate(directory, {
        sbom: null,
        ciRuns: null,
        summaries: {
          "coverage-summary.json": null,
          "test-summary.json": null,
          "security-summary.json": null,
          "rls-live-summary.json": null,
          "multi-instance-summary.json": null,
          "load-summary.json": null,
          "otel-summary.json": null,
          "mutation-summary.json": null,
          "redis-candidate-summary.json": null,
          "staging-summary.json": null,
          "restore-summary.json": null,
          "remote-ci-summary.json": null,
        },
      });
      const failures = await validateBundle(directory);
      if (failures.length > 0) {
        for (const failure of failures) console.error(`- ${failure}`);
        process.exitCode = 1;
        return;
      }
      console.log("release evidence self-test: generate + validate PASS");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
    return;
  }
  const checkDir = flagValue("--check");
  if (checkDir !== null) {
    const strictHead = flagValue("--strict");
    const failures =
      strictHead === null
        ? await validateBundle(checkDir)
        : await validateBundle(checkDir, { strict: true, head: strictHead });
    if (failures.length > 0) {
      for (const failure of failures) console.error(`- ${failure}`);
      process.exitCode = 1;
      return;
    }
    console.log(`release evidence valid: ${checkDir}`);
    return;
  }
  const outDir = flagValue("--out-dir") ?? "release-evidence";
  await generate(outDir, {
    sbom: flagValue("--sbom"),
    ciRuns: flagValue("--ci-runs"),
    summaries: {
      "coverage-summary.json": flagValue("--coverage-summary"),
      "test-summary.json": flagValue("--test-summary"),
      "security-summary.json": flagValue("--security-summary"),
      "rls-live-summary.json": flagValue("--rls-live-summary"),
      "multi-instance-summary.json": flagValue("--multi-instance-summary"),
      "load-summary.json": flagValue("--load-summary"),
      "otel-summary.json": flagValue("--otel-summary"),
      "mutation-summary.json": flagValue("--mutation-summary"),
      "redis-candidate-summary.json": flagValue("--redis-candidate-summary"),
      "staging-summary.json": flagValue("--staging-summary"),
      "restore-summary.json": flagValue("--restore-summary"),
      "remote-ci-summary.json": flagValue("--remote-ci-summary"),
    },
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main().catch((error) => {
    console.error(`release evidence failed: ${error.message}`);
    process.exitCode = 1;
  });
}
