export const REQUIRED_TASK_IDS = Object.freeze([
  "ENT95-09-A",
  "ENT95-09-C",
  "ENT95-09-D",
  "ENT95-10-C",
]);

export const REQUIRED_EVIDENCE_IDS = Object.freeze([
  "JCG-EVIDENCE-001",
  "JCG-EVIDENCE-002",
  "JCG-EVIDENCE-003",
  "JCG-EVIDENCE-004",
]);

const FORBIDDEN_MARKER =
  /\b(?:password|secret|token|email|patient|prompt|sourceRefs|photo|pdf)\b/iu;

export function isRecord(value) {
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

export function validateJourneyCorrectionMetadata(snapshot) {
  const errors = [];
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
  return errors;
}

function validateInvariantEntry(invariant) {
  if (!isRecord(invariant)) return ["invariant entry must be an object"];
  const errors = [];
  for (const field of ["id", "name", "assertion"]) {
    if (!isNonEmptyString(invariant[field])) {
      errors.push(`invariant ${invariant.id ?? "<unknown>"} requires ${field}`);
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
  return errors;
}

export function validateJourneyCorrectionInvariants(snapshot) {
  const errors = [];
  const invariants = Array.isArray(snapshot.invariants)
    ? snapshot.invariants
    : [];
  if (invariants.length < REQUIRED_EVIDENCE_IDS.length) {
    errors.push("invariants must cover all local evidence records");
  }
  for (const id of duplicateIds(invariants.map((invariant) => invariant?.id))) {
    errors.push(`duplicate invariant id ${id}`);
  }
  for (const invariant of invariants) {
    errors.push(...validateInvariantEntry(invariant));
  }
  return errors;
}

function validateEvidenceEntry(entry, rootDir) {
  if (!isRecord(entry)) return ["evidence entry must be an object"];
  const id = entry.id ?? "<unknown>";
  const errors = [];
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
        !rootDir ||
        !fsExists(rootDir, testPath)
      ) {
        errors.push(`evidence ${id} test path does not exist: ${testPath}`);
      }
    }
  }
  if (entry.status !== "PASS") errors.push(`evidence ${id} must be PASS`);
  if (entry.syntheticData !== true)
    errors.push(`evidence ${id} must be synthetic`);
  if (!isNonEmptyString(entry.command) || !entry.command.includes("pnpm")) {
    errors.push(`evidence ${id} command must be reproducible with pnpm`);
  }
  for (const taskId of entry.taskIds ?? []) {
    if (!REQUIRED_TASK_IDS.includes(taskId)) {
      errors.push(`evidence ${id} references an unsupported task ${taskId}`);
    }
  }
  return errors;
}

function fsExists(rootDir, testPath) {
  return fs.existsSync(path.join(rootDir, testPath));
}

function validateEvidenceIds(evidence) {
  const errors = [];
  if (
    !sameMembers(
      evidence.map((entry) => entry?.id),
      REQUIRED_EVIDENCE_IDS,
    )
  ) {
    errors.push("evidence ids must cover all four required local slices");
  }
  return errors;
}

export function validateJourneyCorrectionEvidence(snapshot, rootDir) {
  const evidence = Array.isArray(snapshot.evidence) ? snapshot.evidence : [];
  const errors = validateEvidenceIds(evidence);
  const evidenceIds = new Set();
  for (const entry of evidence) {
    if (isRecord(entry) && evidenceIds.has(entry.id)) {
      errors.push(`duplicate evidence id ${entry.id ?? "<unknown>"}`);
    }
    if (isRecord(entry)) evidenceIds.add(entry.id);
    errors.push(...validateEvidenceEntry(entry, rootDir));
  }
  return errors;
}

function validateGapEntry(gap) {
  if (!isRecord(gap)) return ["gap entry must be an object"];
  const errors = [];
  for (const field of ["id", "area", "owner", "reason", "nextAction"]) {
    if (!isNonEmptyString(gap[field]))
      errors.push(`gap ${gap.id ?? "<unknown>"} requires ${field}`);
  }
  if (gap.status !== "GAP")
    errors.push(`gap ${gap.id ?? "<unknown>"} must remain GAP`);
  return errors;
}

export function validateJourneyCorrectionGaps(snapshot) {
  const gaps = Array.isArray(snapshot.gaps) ? snapshot.gaps : [];
  const errors = [];
  if (gaps.length < 5) errors.push("at least five explicit gaps are required");
  for (const id of duplicateIds(gaps.map((gap) => gap?.id))) {
    errors.push(`duplicate gap id ${id}`);
  }
  for (const gap of gaps) errors.push(...validateGapEntry(gap));
  return errors;
}
import fs from "node:fs";
import path from "node:path";
