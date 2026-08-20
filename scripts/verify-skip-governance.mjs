import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const POLICY_FILE = "skip-governance.json";
const SOURCE_ROOTS = ["tests", "packages", "apps"];
const SKIP_MARKER = ".skipIf(";

export async function loadSkipGovernanceSnapshot(root = process.cwd()) {
  const entries = [
    [POLICY_FILE, await readFile(resolve(root, POLICY_FILE), "utf8")],
  ];
  for (const sourceRoot of SOURCE_ROOTS) {
    for (const file of await listSourceFiles(resolve(root, sourceRoot))) {
      entries.push([
        relative(root, file).replaceAll("\\", "/"),
        await readFile(file, "utf8"),
      ]);
    }
  }
  return new Map(entries);
}

function validateSkipEntry(entry, snapshot, declaredPaths, errors) {
  if (
    typeof entry !== "object" ||
    entry === null ||
    typeof entry.path !== "string"
  ) {
    errors.push("skip entry must have a path");
    return;
  }
  if (declaredPaths.has(entry.path))
    errors.push(`duplicate skip entry ${entry.path}`);
  declaredPaths.add(entry.path);
  const source = snapshot.get(entry.path);
  if (source === undefined) {
    errors.push(`skip path ${entry.path} does not exist`);
    return;
  }
  if (!source.includes(SKIP_MARKER)) {
    errors.push(`skip path ${entry.path} has no skipIf guard`);
  }
  if (!Number.isInteger(entry.testCount) || entry.testCount < 1) {
    errors.push(`skip path ${entry.path} has invalid testCount`);
  } else if (entry.testCount !== countTestDeclarations(source)) {
    errors.push(
      `skip path ${entry.path} declares ${entry.testCount} tests but contains ${countTestDeclarations(source)}`,
    );
  }
  if (!Array.isArray(entry.guard) || entry.guard.length === 0) {
    errors.push(`skip path ${entry.path} has no guard variables`);
  }
  if (typeof entry.reason !== "string" || entry.reason.trim() === "") {
    errors.push(`skip path ${entry.path} has no reason`);
  }
}

function validateSkipEntries(entries, snapshot, guardedFiles, errors) {
  const declaredPaths = new Set();
  for (const entry of entries) {
    validateSkipEntry(entry, snapshot, declaredPaths, errors);
  }
  for (const path of guardedFiles) {
    if (!declaredPaths.has(path))
      errors.push(`skip path ${path} is not classified`);
  }
  for (const path of declaredPaths) {
    if (!guardedFiles.includes(path) && snapshot.has(path)) {
      errors.push(`skip path ${path} is not a guarded test file`);
    }
  }
}

function validateObservedRuns(observedRuns, flakyRateLimitPercent, errors) {
  let flakyFailures = 0;
  for (const run of observedRuns) {
    if (typeof run !== "object" || run === null) {
      errors.push("observed run must be an object");
      continue;
    }
    if (typeof run.mode !== "string" || run.mode.trim() === "") {
      errors.push("observed run must have a mode");
    }
    if (!Number.isInteger(run.skippedTests) || run.skippedTests < 0) {
      errors.push(`observed run ${String(run.mode)} has invalid skippedTests`);
    }
    if (!Number.isInteger(run.flakyFailures) || run.flakyFailures < 0) {
      errors.push(`observed run ${String(run.mode)} has invalid flakyFailures`);
    } else flakyFailures += run.flakyFailures;
    if (typeof run.evidence !== "string" || run.evidence.trim() === "") {
      errors.push(`observed run ${String(run.mode)} has no evidence`);
    }
  }
  const flakyRatePercent =
    observedRuns.length === 0
      ? 100
      : (flakyFailures / observedRuns.length) * 100;
  if (flakyRatePercent >= flakyRateLimitPercent) {
    errors.push(
      `flaky rate ${flakyRatePercent.toFixed(2)}% exceeds configured limit ${flakyRateLimitPercent}%`,
    );
  }
}

export function validateSkipGovernance(snapshot) {
  const errors = [];
  const policyText = snapshot.get(POLICY_FILE);
  if (policyText === undefined) return ["skip governance policy is missing"];
  let policy;
  try {
    policy = JSON.parse(policyText);
  } catch {
    return ["skip governance policy is not valid JSON"];
  }
  if (policy.version !== 1) errors.push("policy version must be 1");
  if (policy.taskId !== "ENT95-14-C") errors.push("task id is invalid");
  if (!Number.isInteger(policy.requiredRuns) || policy.requiredRuns < 20) {
    errors.push("requiredRuns must be at least 20");
  }
  if (
    typeof policy.flakyRateLimitPercent !== "number" ||
    policy.flakyRateLimitPercent <= 0 ||
    policy.flakyRateLimitPercent >= 100
  ) {
    errors.push("flakyRateLimitPercent must be between 0 and 100");
  }
  if (!Array.isArray(policy.skips)) errors.push("skips must be an array");
  if (!Array.isArray(policy.observedRuns))
    errors.push("observedRuns must be an array");
  const guardedFiles = findGuardedFiles(snapshot);
  validateSkipEntries(
    Array.isArray(policy.skips) ? policy.skips : [],
    snapshot,
    guardedFiles,
    errors,
  );
  validateObservedRuns(
    Array.isArray(policy.observedRuns) ? policy.observedRuns : [],
    policy.flakyRateLimitPercent,
    errors,
  );
  if (policy.releaseDisposition !== "PILOT_BLOCKED") {
    errors.push("skip governance cannot release the pilot");
  }
  return errors;
}

export function buildSkipGovernanceReport(snapshot) {
  const policy = JSON.parse(snapshot.get(POLICY_FILE) ?? "{}");
  const entries = Array.isArray(policy.skips) ? policy.skips : [];
  const observedRuns = Array.isArray(policy.observedRuns)
    ? policy.observedRuns
    : [];
  const flakyFailures = observedRuns.reduce(
    (total, run) =>
      total + (typeof run?.flakyFailures === "number" ? run.flakyFailures : 0),
    0,
  );
  const flakyRatePercent =
    observedRuns.length === 0
      ? 100
      : (flakyFailures / observedRuns.length) * 100;
  const unexplainedSkips = Math.max(
    0,
    findGuardedFiles(snapshot).filter(
      (path) => !entries.some((entry) => entry?.path === path),
    ).length,
  );
  return {
    task: policy.taskId,
    guardedFiles: entries.length,
    guardedTests: entries.reduce(
      (total, entry) =>
        total + (typeof entry?.testCount === "number" ? entry.testCount : 0),
      0,
    ),
    unexplainedSkips,
    observedRuns: observedRuns.length,
    requiredRuns: policy.requiredRuns,
    flakyFailures,
    flakyRatePercent,
    status:
      observedRuns.length >= policy.requiredRuns &&
      flakyRatePercent < policy.flakyRateLimitPercent
        ? "PASS"
        : "PASS_WITH_GAPS",
    releaseDisposition: policy.releaseDisposition,
  };
}

async function listSourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(entryPath)));
    } else if (/\.(?:ts|tsx)$/u.test(entry.name)) {
      files.push(entryPath);
    }
  }
  return files;
}

function findGuardedFiles(snapshot) {
  return [...snapshot.entries()]
    .filter(
      ([path, source]) =>
        path.startsWith("tests/") &&
        /\.(?:ts|tsx)$/u.test(path) &&
        source.includes(SKIP_MARKER),
    )
    .map(([path]) => path)
    .sort();
}

function countTestDeclarations(source) {
  return (source.match(/^\s*(?:it|test)(?:\.\w+)*\s*\(/gmu) ?? []).length;
}

if (process.argv[1]?.endsWith("verify-skip-governance.mjs")) {
  const snapshot = await loadSkipGovernanceSnapshot();
  const errors = validateSkipGovernance(snapshot);
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log(JSON.stringify(buildSkipGovernanceReport(snapshot), null, 2));
}
