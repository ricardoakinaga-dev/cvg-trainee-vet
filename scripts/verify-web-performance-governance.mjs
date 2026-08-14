import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const CURRENT_SCRIPT_PATH = fileURLToPath(import.meta.url);
const REQUIRED_EVIDENCE = new Set([
  "PERF-BUILD-001",
  "PERF-STATES-002",
  "PERF-NETWORK-003",
]);
const REQUIRED_BUDGETS = [
  "bundleJsKilobytes",
  "lcpMilliseconds",
  "inpMilliseconds",
  "cls",
  "maxRetryAttempts",
];

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function nonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function loadWebPerformanceGovernanceSnapshot(rootDir = REPO_ROOT) {
  return JSON.parse(
    fs.readFileSync(
      path.join(rootDir, "web-performance-governance.json"),
      "utf8",
    ),
  );
}

function validateEvidence(evidence, index, errors) {
  const label = `evidence[${index}]`;
  if (!isRecord(evidence)) {
    errors.push(`${label} must be an object`);
    return;
  }
  for (const field of ["id", "criterion", "status", "command", "artifactId"]) {
    if (!isNonEmptyString(evidence[field])) {
      errors.push(`${label} requires ${field}`);
    }
  }
  if (evidence.status !== "PASS") errors.push(`${label} status must be PASS`);
  if (evidence.syntheticData !== true) {
    errors.push(`${label} must use synthetic data`);
  }
  if (evidence.testPath !== undefined && !isNonEmptyString(evidence.testPath)) {
    errors.push(`${label} testPath must be non-empty when present`);
  }
  if (evidence.id === "PERF-NETWORK-003" && evidence.testPath === undefined) {
    errors.push("network retry evidence requires testPath");
  }
}

function validateMeasurement(measurement, index, budgets, errors) {
  const label = `measurements[${index}]`;
  if (!isRecord(measurement)) {
    errors.push(`${label} must be an object`);
    return;
  }
  for (const field of ["id", "viewport", "network", "status"]) {
    if (!isNonEmptyString(measurement[field])) {
      errors.push(`${label} requires ${field}`);
    }
  }
  for (const field of [
    "bundleJsKilobytes",
    "lcpMilliseconds",
    "inpMilliseconds",
    "cls",
  ]) {
    if (!nonNegativeNumber(measurement[field])) {
      errors.push(`${label} ${field} must be non-negative`);
    }
  }
  if (measurement.status !== "PASS")
    errors.push(`${label} status must be PASS`);
  if (measurement.syntheticData !== true) {
    errors.push(`${label} must use synthetic data`);
  }
  if (measurement.bundleJsKilobytes > budgets.bundleJsKilobytes) {
    errors.push(`${label} exceeds bundle budget`);
  }
  if (measurement.lcpMilliseconds > budgets.lcpMilliseconds) {
    errors.push(`${label} exceeds lcp budget`);
  }
  if (measurement.inpMilliseconds > budgets.inpMilliseconds) {
    errors.push(`${label} exceeds inp budget`);
  }
  if (measurement.cls > budgets.cls) {
    errors.push(`${label} exceeds cls budget`);
  }
}

function validateGap(gap, index, errors) {
  const label = `manualGaps[${index}]`;
  if (!isRecord(gap)) {
    errors.push(`${label} must be an object`);
    return;
  }
  for (const field of ["id", "criterion", "owner", "reason", "nextAction"]) {
    if (!isNonEmptyString(gap[field]))
      errors.push(`${label} requires ${field}`);
  }
  if (gap.status !== "GAP") errors.push(`${label} status must be GAP`);
}

export function validateWebPerformanceGovernanceSnapshot(snapshot) {
  const errors = [];
  if (!isRecord(snapshot))
    return ["web performance governance must be an object"];
  if (snapshot.version !== 1) errors.push("web performance version must be 1");
  if (snapshot.taskId !== "ENT95-13-D")
    errors.push("web performance taskId is invalid");
  if (snapshot.status !== "PASS_WITH_GAPS") {
    errors.push("web performance status must remain PASS_WITH_GAPS");
  }
  if (snapshot.releaseDisposition !== "PILOT_BLOCKED") {
    errors.push("web performance release must remain PILOT_BLOCKED");
  }
  if (snapshot.environment !== "local-ha-synthetic") {
    errors.push("web performance environment must be local-ha-synthetic");
  }

  if (!isRecord(snapshot.budgets)) {
    errors.push("budgets must be an object");
  } else {
    for (const field of REQUIRED_BUDGETS) {
      if (!nonNegativeNumber(snapshot.budgets[field])) {
        errors.push(`budget ${field} must be non-negative`);
      }
    }
    if (snapshot.budgets.maxRetryAttempts < 1) {
      errors.push("budget maxRetryAttempts must be positive");
    }
  }

  const evidence = snapshot.evidence;
  if (!Array.isArray(evidence)) {
    errors.push("evidence must be an array");
  } else {
    const ids = new Set();
    evidence.forEach((entry, index) => {
      validateEvidence(entry, index, errors);
      if (isRecord(entry) && isNonEmptyString(entry.id)) ids.add(entry.id);
    });
    for (const requiredId of REQUIRED_EVIDENCE) {
      if (!ids.has(requiredId))
        errors.push(`missing required evidence ${requiredId}`);
    }
  }

  if (!Array.isArray(snapshot.measurements)) {
    errors.push("measurements must be an array");
  } else {
    if (snapshot.measurements.length < 2) {
      errors.push("measurements require mobile and desktop records");
    }
    if (isRecord(snapshot.budgets)) {
      snapshot.measurements.forEach((measurement, index) =>
        validateMeasurement(measurement, index, snapshot.budgets, errors),
      );
    }
  }

  if (!Array.isArray(snapshot.manualGaps)) {
    errors.push("manual gaps must be an array");
  } else {
    if (snapshot.manualGaps.length < 4)
      errors.push("manual gaps require at least 4 records");
    const ids = new Set();
    snapshot.manualGaps.forEach((gap, index) => {
      validateGap(gap, index, errors);
      if (isRecord(gap) && isNonEmptyString(gap.id)) {
        if (ids.has(gap.id)) errors.push(`duplicate manual gap ${gap.id}`);
        ids.add(gap.id);
      }
    });
  }

  return Object.freeze(errors);
}

export function buildWebPerformanceGovernanceReport(snapshot) {
  const evidence = Array.isArray(snapshot.evidence) ? snapshot.evidence : [];
  const measurements = Array.isArray(snapshot.measurements)
    ? snapshot.measurements
    : [];
  const manualGaps = Array.isArray(snapshot.manualGaps)
    ? snapshot.manualGaps
    : [];
  return Object.freeze({
    task: snapshot.taskId,
    evidencePassCount: evidence.filter((entry) => entry?.status === "PASS")
      .length,
    measurementCount: measurements.length,
    gapCount: manualGaps.length,
    status: snapshot.status,
    releaseDisposition: snapshot.releaseDisposition,
  });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(CURRENT_SCRIPT_PATH)
) {
  const snapshot = loadWebPerformanceGovernanceSnapshot();
  const errors = validateWebPerformanceGovernanceSnapshot(snapshot);
  if (errors.length > 0) {
    console.error(JSON.stringify({ status: "FAIL", errors }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(
      JSON.stringify(buildWebPerformanceGovernanceReport(snapshot), null, 2),
    );
  }
}
