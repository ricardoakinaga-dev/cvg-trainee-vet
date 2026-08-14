import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const CURRENT_SCRIPT_PATH = fileURLToPath(import.meta.url);
const REQUIRED_RECORD_FIELDS = [
  "id",
  "sprintId",
  "owner",
  "reason",
  "impact",
  "acceptance",
  "rollback",
  "status",
  "artifactIds",
];
const ALLOWED_SEVERITIES = new Set(["P0", "P1", "P2", "P3"]);
const SCORE_MINIMUM = 0;
const SCORE_MAXIMUM = 100;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateRequiredRecordFields(kind, record, errors) {
  for (const field of REQUIRED_RECORD_FIELDS) {
    if (!isNonEmptyString(record?.[field]) && field !== "artifactIds") {
      errors.push(`${kind} ${record?.id ?? "<unknown>"} requires ${field}`);
    }
  }

  if (
    !Array.isArray(record?.artifactIds) ||
    record.artifactIds.length === 0 ||
    record.artifactIds.some((artifactId) => !isNonEmptyString(artifactId))
  ) {
    errors.push(`${kind} ${record?.id ?? "<unknown>"} requires artifactIds`);
  }
}

function validateRecords(kind, records, errors, ids) {
  if (!Array.isArray(records)) {
    errors.push(`${kind} must be an array`);
    return;
  }

  for (const record of records) {
    if (!isRecord(record)) {
      errors.push(`${kind} entry must be an object`);
      continue;
    }

    validateRequiredRecordFields(kind, record, errors);
    if (isNonEmptyString(record.id)) {
      if (ids.has(record.id)) {
        errors.push(`duplicate governance record id ${record.id}`);
      }
      ids.add(record.id);
    }
  }
}

function validateScoreImpact(changeRequest, snapshot, errors) {
  const impact = changeRequest.scoreImpact;
  if (!isRecord(impact)) {
    errors.push(`change request ${changeRequest.id} requires scoreImpact`);
    return;
  }

  if (impact.sprintId !== changeRequest.sprintId) {
    errors.push(
      `change request ${changeRequest.id} scoreImpact sprintId must match`,
    );
  }

  for (const field of ["baselineScore", "weightedScore", "targetFloor"]) {
    if (
      typeof impact[field] !== "number" ||
      impact[field] < SCORE_MINIMUM ||
      impact[field] > SCORE_MAXIMUM
    ) {
      errors.push(
        `change request ${changeRequest.id} scoreImpact ${field} is invalid`,
      );
    }
  }

  if (!Array.isArray(impact.itemScoreChanges)) {
    errors.push(
      `change request ${changeRequest.id} scoreImpact itemScoreChanges is required`,
    );
  }

  const hasScoreDelta = (impact.itemScoreChanges ?? []).some(
    (item) => isRecord(item) && item.before !== item.after,
  );
  if (impact.scoreChanged !== hasScoreDelta) {
    errors.push(
      `change request ${changeRequest.id} scoreChanged disagrees with itemScoreChanges`,
    );
  }

  if (impact.releaseDisposition !== snapshot.releaseDisposition) {
    errors.push(
      `change request ${changeRequest.id} scoreImpact releaseDisposition must match policy`,
    );
  }

  if (
    impact.scoreChanged &&
    changeRequest.approvalStatus !== "HUMAN_APPROVED"
  ) {
    errors.push(
      `change request ${changeRequest.id} score changes require HUMAN_APPROVED`,
    );
  }
}

export function loadChangeControlSnapshot(rootDir = REPO_ROOT) {
  const policyPath = path.join(rootDir, "change-control-governance.json");
  return JSON.parse(fs.readFileSync(policyPath, "utf8"));
}

export function validateChangeControlSnapshot(snapshot) {
  const errors = [];

  if (!isRecord(snapshot)) {
    return ["change control policy must be an object"];
  }
  if (snapshot.version !== 1) {
    errors.push("change control policy version must be 1");
  }
  if (snapshot.programId !== "CVG-PREMIUM-ENTERPRISE-95") {
    errors.push("change control policy programId is invalid");
  }
  if (snapshot.status !== "PASS_WITH_GAPS") {
    errors.push("change control policy status must be PASS_WITH_GAPS");
  }
  if (snapshot.releaseDisposition !== "PILOT_BLOCKED") {
    errors.push("change control policy must remain PILOT_BLOCKED");
  }

  const ids = new Set();
  validateRecords("decision", snapshot.decisions, errors, ids);
  validateRecords("risk", snapshot.risks, errors, ids);
  validateRecords("change request", snapshot.changeRequests, errors, ids);

  const decisionIds = new Set(
    (snapshot.decisions ?? [])
      .filter((decision) => isRecord(decision))
      .map((decision) => decision.id),
  );
  for (const risk of snapshot.risks ?? []) {
    if (isRecord(risk) && !ALLOWED_SEVERITIES.has(risk.severity)) {
      errors.push(`risk ${risk.id} has invalid severity`);
    }
  }
  for (const changeRequest of snapshot.changeRequests ?? []) {
    if (!isRecord(changeRequest)) continue;
    if (!decisionIds.has(changeRequest.decisionId)) {
      errors.push(
        `change request ${changeRequest.id} references unknown decisionId`,
      );
    }
    if (
      !Array.isArray(changeRequest.affectedTasks) ||
      changeRequest.affectedTasks.length === 0 ||
      changeRequest.affectedTasks.some((taskId) => !isNonEmptyString(taskId))
    ) {
      errors.push(`change request ${changeRequest.id} requires affectedTasks`);
    }
    validateScoreImpact(changeRequest, snapshot, errors);
  }

  return Object.freeze(errors);
}

export function buildChangeControlReport(snapshot) {
  const changes = Array.isArray(snapshot.changeRequests)
    ? snapshot.changeRequests
    : [];
  const risks = Array.isArray(snapshot.risks) ? snapshot.risks : [];
  const scoreChangedCount = changes.filter(
    (changeRequest) => changeRequest.scoreImpact?.scoreChanged === true,
  ).length;

  return Object.freeze({
    programId: snapshot.programId,
    decisionCount: Array.isArray(snapshot.decisions)
      ? snapshot.decisions.length
      : 0,
    riskCount: risks.length,
    openRiskCount: risks.filter((risk) => risk.status === "OPEN").length,
    changeRequestCount: changes.length,
    sprintImpactCount: changes.filter((changeRequest) =>
      isRecord(changeRequest.scoreImpact),
    ).length,
    scoreChangedCount,
    status: snapshot.status,
    releaseDisposition: snapshot.releaseDisposition,
  });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(CURRENT_SCRIPT_PATH)
) {
  const snapshot = loadChangeControlSnapshot();
  const errors = validateChangeControlSnapshot(snapshot);
  if (errors.length > 0) {
    console.error(JSON.stringify({ status: "FAIL", errors }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(buildChangeControlReport(snapshot), null, 2));
  }
}
