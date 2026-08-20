import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const CURRENT_SCRIPT_PATH = fileURLToPath(import.meta.url);
const REQUIRED_AUTOMATED_EVIDENCE = 6;
const REQUIRED_MANUAL_GAPS = 5;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function loadAccessibilityGovernanceSnapshot(rootDir = REPO_ROOT) {
  return JSON.parse(
    fs.readFileSync(
      path.join(rootDir, "accessibility-governance.json"),
      "utf8",
    ),
  );
}

function validateAccessibilityMetadata(snapshot) {
  const errors = [];
  if (snapshot.version !== 1)
    errors.push("accessibility governance version must be 1");
  if (snapshot.taskId !== "ENT95-13-B")
    errors.push("accessibility governance taskId is invalid");
  if (snapshot.standard !== "WCAG-2.2-AA")
    errors.push("accessibility standard must be WCAG-2.2-AA");
  if (snapshot.status !== "PASS_WITH_GAPS")
    errors.push("accessibility governance must remain PASS_WITH_GAPS");
  if (snapshot.releaseDisposition !== "PILOT_BLOCKED")
    errors.push("accessibility governance must remain PILOT_BLOCKED");

  if (!Array.isArray(snapshot.surfaces) || snapshot.surfaces.length < 2) {
    errors.push("accessibility governance must declare at least two surfaces");
  }
  return errors;
}

function resolveEvidencePath(rootDir, testPath) {
  if (path.isAbsolute(testPath)) return null;
  const root = path.resolve(rootDir);
  const candidate = path.resolve(rootDir, testPath);
  const relative = path.relative(root, candidate);
  if (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  ) {
    return candidate;
  }
  return null;
}

function validateAutomatedEvidence(snapshot, rootDir) {
  const errors = [];
  if (!Array.isArray(snapshot.automatedEvidence)) {
    errors.push("automated evidence must be an array");
  } else {
    if (snapshot.automatedEvidence.length !== REQUIRED_AUTOMATED_EVIDENCE) {
      errors.push(
        `automated evidence must contain ${REQUIRED_AUTOMATED_EVIDENCE} records`,
      );
    }
    const evidenceIds = new Set();
    for (const evidence of snapshot.automatedEvidence) {
      if (!isRecord(evidence)) {
        errors.push("automated evidence entry must be an object");
        continue;
      }
      for (const field of [
        "id",
        "criterion",
        "testPath",
        "testName",
        "command",
      ]) {
        if (!isNonEmptyString(evidence[field])) {
          errors.push(
            `automated evidence ${evidence.id ?? "<unknown>"} requires ${field}`,
          );
        }
      }
      if (evidence.status !== "PASS") {
        errors.push(
          `automated evidence ${evidence.id ?? "<unknown>"} must be PASS`,
        );
      }
      if (evidence.syntheticData !== true) {
        errors.push(
          `automated evidence ${evidence.id ?? "<unknown>"} must use synthetic data`,
        );
      }
      if (evidenceIds.has(evidence.id)) {
        errors.push(`automated evidence has duplicate id ${evidence.id}`);
      }
      evidenceIds.add(evidence.id);
      if (isNonEmptyString(evidence.testPath)) {
        const testPath = resolveEvidencePath(rootDir, evidence.testPath);
        if (testPath === null) {
          errors.push(
            `automated evidence ${evidence.id ?? "<unknown>"} testPath must remain inside repository`,
          );
        } else if (!fs.existsSync(testPath)) {
          errors.push(
            `automated evidence ${evidence.id} testPath does not exist`,
          );
        }
      }
    }
  }
  return errors;
}

function validateManualGaps(snapshot) {
  const errors = [];
  if (!Array.isArray(snapshot.manualGaps)) {
    errors.push("manual gaps must be an array");
  } else {
    if (snapshot.manualGaps.length < REQUIRED_MANUAL_GAPS) {
      errors.push(
        `manual gaps must declare at least ${REQUIRED_MANUAL_GAPS} records`,
      );
    }
    const gapIds = new Set();
    for (const gap of snapshot.manualGaps) {
      if (!isRecord(gap)) {
        errors.push("manual gap entry must be an object");
        continue;
      }
      for (const field of [
        "id",
        "criterion",
        "owner",
        "reason",
        "nextAction",
      ]) {
        if (!isNonEmptyString(gap[field])) {
          errors.push(`manual gap ${gap.id ?? "<unknown>"} requires ${field}`);
        }
      }
      if (gap.status !== "GAP") {
        errors.push(`manual gap ${gap.id ?? "<unknown>"} must remain GAP`);
      }
      if (gapIds.has(gap.id))
        errors.push(`manual gaps have duplicate id ${gap.id}`);
      gapIds.add(gap.id);
    }
  }
  return errors;
}

export function validateAccessibilityGovernanceSnapshot(
  snapshot,
  rootDir = REPO_ROOT,
) {
  if (!isRecord(snapshot))
    return ["accessibility governance must be an object"];

  return Object.freeze([
    ...validateAccessibilityMetadata(snapshot),
    ...validateAutomatedEvidence(snapshot, rootDir),
    ...validateManualGaps(snapshot),
  ]);
}

export function buildAccessibilityGovernanceReport(snapshot) {
  const automatedEvidence = Array.isArray(snapshot.automatedEvidence)
    ? snapshot.automatedEvidence
    : [];
  const manualGaps = Array.isArray(snapshot.manualGaps)
    ? snapshot.manualGaps
    : [];
  return Object.freeze({
    task: snapshot.taskId,
    standard: snapshot.standard,
    surfaces: Array.isArray(snapshot.surfaces) ? snapshot.surfaces.length : 0,
    automatedEvidenceCount: automatedEvidence.length,
    automatedPassCount: automatedEvidence.filter(
      (evidence) => evidence.status === "PASS",
    ).length,
    manualGapCount: manualGaps.length,
    status: snapshot.status,
    releaseDisposition: snapshot.releaseDisposition,
  });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(CURRENT_SCRIPT_PATH)
) {
  const snapshot = loadAccessibilityGovernanceSnapshot();
  const errors = validateAccessibilityGovernanceSnapshot(snapshot);
  if (errors.length > 0) {
    console.error(JSON.stringify({ status: "FAIL", errors }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(
      JSON.stringify(buildAccessibilityGovernanceReport(snapshot), null, 2),
    );
  }
}
