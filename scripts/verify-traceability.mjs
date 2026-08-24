import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const CURRENT_TRACEABILITY_ARTIFACT_IDS = Object.freeze([
  "TRAINING-MANAGEMENT-020",
  "LEARNING-PROFILE-021",
  "STAFF-ONBOARDING-022",
  "DIAGNOSTIC-PROFILE-023",
  "STAFF-DIAGNOSTIC-PROFILE-024",
  "ADMIN-LIFECYCLE-025",
  "CPD-REPORTING-026",
  "EDITORIAL-QUEUE-027",
  "ACCOUNT-RECOVERY-028",
  "IDENTITY-RLS-029",
  "IDENTITY-RLS-030",
  "AUDIT-NEGATIVE-031",
  "DB-PRIVILEGE-032",
  "TRACEABILITY-033",
  "OPERATIONAL-SNAPSHOT-034",
  "REFLECTION-DIGITAL-035",
  "REFLECTION-MANAGEMENT-035",
  "APPEAL-036",
  "APPEAL-037",
  "APPEAL-038",
  "APPEAL-039",
  "APPEAL-040",
  "FEEDBACK-041",
  "APPEAL-042",
  "FEEDBACK-043",
  "ADAPTIVE-044",
  "JOURNEY-045",
  "RESULT-FEEDBACK-046",
  "JOURNEY-REL-001",
  "JOURNEY-REL-002",
  "AUTHORING-E2E-PIPELINE-001",
  "ACTIVITY-RLS-047",
]);

const SHA_PATTERN = /^[0-9a-f]{40}$/u;

function artifactBlocks(manifest) {
  return manifest
    .split(/\n(?=\x20{2}-\x20id:)/u)
    .map((block) => block.trimEnd())
    .filter((block) => /^\x20{2}-\x20id:/u.test(block));
}

function artifactId(block) {
  return /^\x20{2}-\x20id:\s*["']([^"']+)["']/mu.exec(block)?.[1] ?? null;
}

function hasField(block, field) {
  return new RegExp(`^    ${field}:`, "mu").test(block);
}

function fieldValue(block, field) {
  return new RegExp(`^    ${field}:\\s*["']?([^"'\\n]+)["']?`, "mu")
    .exec(block)?.[1]
    ?.trim();
}

function listValues(block, field) {
  const match = new RegExp(
    `^    ${field}:\\s*(\\[[\\s\\S]*?\\])(?=\\n    \\w|$)`,
    "mu",
  ).exec(block);
  if (match === null) return [];
  return [...match[1].matchAll(/"([^"]+)"/gu)].map((item) => item[1]);
}

function currentIds(options) {
  return new Set(
    options.currentArtifactIds ?? CURRENT_TRACEABILITY_ARTIFACT_IDS,
  );
}

export function validateTraceabilityManifest(manifest, options = {}) {
  const errors = [];
  const requiredCurrentIds = currentIds(options);

  if (!manifest.includes("version:"))
    errors.push("traceability has no version");
  if (!manifest.includes('project: "cvg-trainee-vet"')) {
    errors.push("traceability has no canonical project");
  }

  const blocks = artifactBlocks(manifest);
  if (blocks.length === 0) {
    errors.push("traceability has no artifact entries");
    return errors;
  }

  const seen = new Set();
  for (const block of blocks) {
    const id = artifactId(block);
    if (id === null) {
      errors.push("traceability artifact has no id");
      continue;
    }
    if (seen.has(id)) errors.push(`traceability has duplicate artifact ${id}`);
    seen.add(id);

    for (const field of ["requirements", "documents", "tests", "status"]) {
      if (!hasField(block, field)) {
        errors.push(`artifact ${id} has no ${field}`);
      }
    }

    if (!requiredCurrentIds.has(id)) continue;
    for (const field of ["commit", "artifacts", "verification"]) {
      if (!hasField(block, field)) {
        errors.push(`artifact ${id} has no ${field}`);
      }
    }
  }

  for (const id of requiredCurrentIds) {
    if (!seen.has(id))
      errors.push(`traceability has no current artifact ${id}`);
  }

  return errors;
}

function findArtifactBlock(manifest, id) {
  return artifactBlocks(manifest).find((block) => artifactId(block) === id);
}

export function validateReleaseTraceability(manifest, options = {}) {
  const requiredCurrentIds =
    options.currentArtifactIds ?? CURRENT_TRACEABILITY_ARTIFACT_IDS;
  const errors = validateTraceabilityManifest(manifest, {
    currentArtifactIds: requiredCurrentIds,
  });
  const headSha = options.headSha ?? "";
  const reachableCommits = options.reachableCommits ?? new Set();
  const trackedPaths = options.trackedPaths ?? new Set();

  if ((options.worktreeStatus ?? "").trim().length > 0) {
    errors.push("release traceability requires a clean worktree");
  }
  if (!SHA_PATTERN.test(headSha)) {
    errors.push("release traceability could not resolve a valid HEAD SHA");
  }

  for (const id of requiredCurrentIds) {
    const block = findArtifactBlock(manifest, id);
    if (block === undefined) continue;

    const commit = fieldValue(block, "commit") ?? "";
    if (!SHA_PATTERN.test(commit)) {
      errors.push(`artifact ${id} commit is not a 40-character Git SHA`);
    } else if (!reachableCommits.has(commit)) {
      errors.push(`artifact ${id} commit ${commit} is not reachable from HEAD`);
    }

    for (const path of listValues(block, "code")) {
      if (
        ![...trackedPaths].some(
          (tracked) => tracked === path || tracked.startsWith(`${path}/`),
        )
      ) {
        errors.push(`artifact ${id} code path is not tracked: ${path}`);
      }
    }
    for (const path of listValues(block, "tests")) {
      if (
        ![...trackedPaths].some(
          (tracked) => tracked === path || tracked.startsWith(`${path}/`),
        )
      ) {
        errors.push(`artifact ${id} test path is not tracked: ${path}`);
      }
    }
  }

  return errors;
}

function gitOutput(root, args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" });
  } catch {
    return "";
  }
}

async function main() {
  const root = process.cwd();
  const manifest = await readFile("traceability.yml", "utf8");
  const releaseMode = process.env.CVG_TRACEABILITY_RELEASE === "true";
  const errors = validateTraceabilityManifest(manifest);

  if (releaseMode) {
    errors.push(
      ...validateReleaseTraceability(manifest, {
        headSha: gitOutput(root, ["rev-parse", "HEAD"]).trim(),
        worktreeStatus: gitOutput(root, ["status", "--porcelain"]),
        reachableCommits: new Set(
          gitOutput(root, ["rev-list", "HEAD"]).split("\n").filter(Boolean),
        ),
        trackedPaths: new Set(
          gitOutput(root, ["ls-files"]).split("\n").filter(Boolean),
        ),
      }),
    );
  }

  const uniqueErrors = [...new Set(errors)];
  if (uniqueErrors.length > 0) {
    console.error(
      `${releaseMode ? "release traceability" : "traceability manifest"} failed (${uniqueErrors.length} findings):`,
    );
    for (const error of uniqueErrors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    releaseMode
      ? "release traceability: current artifacts resolve to reachable commits and tracked paths"
      : "traceability manifest: structurally valid with current artifact evidence",
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
