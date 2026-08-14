import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const CURRENT_SCRIPT_PATH = fileURLToPath(import.meta.url);
const POLICY_PATH = "journey-correction-governance.json";
const REQUIRED_TASK_IDS = Object.freeze([
  "ENT95-09-A",
  "ENT95-09-C",
  "ENT95-09-D",
  "ENT95-10-C",
]);
const REQUIRED_EVIDENCE_IDS = Object.freeze([
  "JCG-EVIDENCE-001",
  "JCG-EVIDENCE-002",
  "JCG-EVIDENCE-003",
  "JCG-EVIDENCE-004",
]);
const FORBIDDEN_MARKER =
  /\b(?:password|secret|token|email|patient|prompt|sourceRefs|photo|pdf)\b/iu;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function duplicateIds(values) {
  const seen = new Set();
  return values.filter((value) => {
    if (seen.has(value)) return true;
    seen.add(value);
    return false;
  });
}

function sameMembers(actual, expected) {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    expected.every((value) => actual.includes(value))
  );
}

export async function loadJourneyCorrectionGovernanceSnapshot(
  rootDir = REPO_ROOT,
) {
  return JSON.parse(
    await fs.promises.readFile(path.join(rootDir, POLICY_PATH), "utf8"),
  );
}

export function validateJourneyCorrectionGovernance(
  snapshot,
  rootDir = REPO_ROOT,
) {
  const errors = [];

  if (!isRecord(snapshot))
    return ["journey correction governance must be an object"];
  if (snapshot.version !== 1) errors.push("policy version must be 1");
  if (snapshot.programId !== "CVG-SUB80-TO-95") {
    errors.push("program id must be CVG-SUB80-TO-95");
  }
  if (!sameMembers(snapshot.taskIds, REQUIRED_TASK_IDS)) {
    errors.push(
      "task ids must cover ENT95-09-A, ENT95-09-C, ENT95-09-D and ENT95-10-C",
    );
  }
  if (snapshot.status !== "PASS_WITH_GAPS") {
    errors.push("status must remain PASS_WITH_GAPS");
  }
  if (snapshot.releaseDisposition !== "PILOT_BLOCKED") {
    errors.push("release disposition must remain PILOT_BLOCKED");
  }
  if (snapshot.environment !== "local-ha-synthetic") {
    errors.push("environment must remain local-ha-synthetic");
  }
  if (FORBIDDEN_MARKER.test(JSON.stringify(snapshot))) {
    errors.push("policy contains a forbidden sensitive-data marker");
  }

  const invariants = Array.isArray(snapshot.invariants)
    ? snapshot.invariants
    : [];
  if (invariants.length < REQUIRED_EVIDENCE_IDS.length) {
    errors.push("invariants must cover all local evidence records");
  }
  const invariantIds = invariants.map((invariant) => invariant?.id);
  for (const id of duplicateIds(invariantIds)) {
    errors.push(`duplicate invariant id ${id}`);
  }
  for (const invariant of invariants) {
    if (!isRecord(invariant)) {
      errors.push("invariant entry must be an object");
      continue;
    }
    for (const field of ["id", "name", "assertion"]) {
      if (!isNonEmptyString(invariant[field])) {
        errors.push(
          `invariant ${invariant.id ?? "<unknown>"} requires ${field}`,
        );
      }
    }
    if (invariant.status !== "PASS") {
      errors.push(`invariant ${invariant.id ?? "<unknown>"} must be PASS`);
    }
    if (
      !Array.isArray(invariant.evidenceIds) ||
      invariant.evidenceIds.length === 0
    ) {
      errors.push(
        `invariant ${invariant.id ?? "<unknown>"} requires evidenceIds`,
      );
    }
  }

  const evidence = Array.isArray(snapshot.evidence) ? snapshot.evidence : [];
  if (
    !sameMembers(
      evidence.map((entry) => entry?.id),
      REQUIRED_EVIDENCE_IDS,
    )
  ) {
    errors.push("evidence ids must cover all four required local slices");
  }
  const evidenceIds = new Set();
  for (const entry of evidence) {
    if (!isRecord(entry)) {
      errors.push("evidence entry must be an object");
      continue;
    }
    const id = entry.id ?? "<unknown>";
    if (evidenceIds.has(entry.id)) errors.push(`duplicate evidence id ${id}`);
    evidenceIds.add(entry.id);
    for (const field of [
      "id",
      "criterion",
      "command",
      "ownerScope",
      "teardown",
      "artifact",
    ]) {
      if (!isNonEmptyString(entry[field]))
        errors.push(`evidence ${id} requires ${field}`);
    }
    if (!Array.isArray(entry.taskIds) || entry.taskIds.length === 0) {
      errors.push(`evidence ${id} requires taskIds`);
    }
    if (!Array.isArray(entry.testPaths) || entry.testPaths.length === 0) {
      errors.push(`evidence ${id} requires test paths`);
    } else {
      for (const testPath of entry.testPaths) {
        if (
          !isNonEmptyString(testPath) ||
          !fs.existsSync(path.join(rootDir, testPath))
        ) {
          errors.push(`evidence ${id} test path does not exist: ${testPath}`);
        }
      }
    }
    if (entry.status !== "PASS") errors.push(`evidence ${id} must be PASS`);
    if (entry.syntheticData !== true)
      errors.push(`evidence ${id} must be synthetic`);
    if (!entry.command.includes("pnpm"))
      errors.push(`evidence ${id} command must be reproducible with pnpm`);
    for (const taskId of entry.taskIds ?? []) {
      if (!REQUIRED_TASK_IDS.includes(taskId)) {
        errors.push(`evidence ${id} references an unsupported task ${taskId}`);
      }
    }
  }

  const gaps = Array.isArray(snapshot.gaps) ? snapshot.gaps : [];
  if (gaps.length < 5) errors.push("at least five explicit gaps are required");
  const gapIds = gaps.map((gap) => gap?.id);
  for (const id of duplicateIds(gapIds)) errors.push(`duplicate gap id ${id}`);
  for (const gap of gaps) {
    if (!isRecord(gap)) {
      errors.push("gap entry must be an object");
      continue;
    }
    for (const field of ["id", "area", "owner", "reason", "nextAction"]) {
      if (!isNonEmptyString(gap[field]))
        errors.push(`gap ${gap.id ?? "<unknown>"} requires ${field}`);
    }
    if (gap.status !== "GAP")
      errors.push(`gap ${gap.id ?? "<unknown>"} must remain GAP`);
  }

  return Object.freeze(errors);
}

export function buildJourneyCorrectionGovernanceReport(snapshot) {
  const evidence = Array.isArray(snapshot.evidence) ? snapshot.evidence : [];
  const gaps = Array.isArray(snapshot.gaps) ? snapshot.gaps : [];
  return Object.freeze({
    programId: snapshot.programId,
    taskCount: Array.isArray(snapshot.taskIds) ? snapshot.taskIds.length : 0,
    invariantCount: Array.isArray(snapshot.invariants)
      ? snapshot.invariants.length
      : 0,
    evidenceCount: evidence.length,
    evidencePassCount: evidence.filter((entry) => entry.status === "PASS")
      .length,
    gapCount: gaps.length,
    status: snapshot.status,
    releaseDisposition: snapshot.releaseDisposition,
  });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(CURRENT_SCRIPT_PATH)
) {
  const snapshot = await loadJourneyCorrectionGovernanceSnapshot();
  const errors = validateJourneyCorrectionGovernance(snapshot);
  if (errors.length > 0) {
    console.error(JSON.stringify({ status: "FAIL", errors }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(
      JSON.stringify(buildJourneyCorrectionGovernanceReport(snapshot), null, 2),
    );
  }
}
