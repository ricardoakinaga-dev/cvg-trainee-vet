import { readFile } from "node:fs/promises";
import { join } from "node:path";

const POLICY_PATH = "test-evidence-governance.json";
const REQUIRED_FIELDS = Object.freeze([
  "id",
  "requirementIds",
  "taskIds",
  "artifactId",
  "command",
  "timestamp",
  "environment",
  "seed",
  "syntheticData",
  "sanitization",
  "teardown",
  "retention",
  "commit",
  "artifact",
  "paths",
]);
const SHA_PATTERN = /^[0-9a-f]{40}$/iu;
const GAP_PATTERN = /^GAP:[a-z0-9-]+$/iu;
const FORBIDDEN_MARKER =
  /(?:password|secret|token)\s*[:=]\s*(?!<synthetic>|<redacted>)[^\s,}]+/iu;

export async function loadTestEvidenceGovernanceSnapshot(root = process.cwd()) {
  const policy = await readFile(join(root, POLICY_PATH), "utf8");
  const parsed = JSON.parse(policy);
  const paths = new Set([POLICY_PATH]);
  for (const evidence of parsed.evidence ?? []) {
    for (const path of evidence.paths ?? []) paths.add(path);
  }
  const entries = await Promise.all(
    [...paths].map(async (path) => [
      path,
      await readFile(join(root, path), "utf8"),
    ]),
  );
  return new Map(entries);
}

export function validateTestEvidenceGovernance(snapshot) {
  const policyText = snapshot.get(POLICY_PATH);
  if (policyText === undefined) return [`missing ${POLICY_PATH}`];

  let policy;
  try {
    policy = JSON.parse(policyText);
  } catch {
    return [`${POLICY_PATH} is not valid JSON`];
  }

  const errors = validatePolicyMetadata(policy);
  if (!Array.isArray(policy.evidence) || policy.evidence.length === 0) {
    errors.push("evidence must be a non-empty array");
    return errors;
  }

  return errors.concat(validateEvidenceEntries(policy.evidence, snapshot));
}

function validatePolicyMetadata(policy) {
  const errors = [];
  if (policy.version !== 1) errors.push("policy version must be 1");
  if (policy.taskId !== "ENT95-14-D") errors.push("task id is invalid");
  if (policy.releaseDisposition !== "PILOT_BLOCKED") {
    errors.push("test evidence cannot release the pilot");
  }
  return errors;
}

function validateEvidenceEntries(entries, snapshot) {
  const errors = [];
  const ids = new Set();
  for (const evidence of entries) {
    errors.push(...validateEvidenceEntry(evidence, snapshot, ids));
  }
  return errors;
}

function validateEvidenceEntry(evidence, snapshot, ids) {
  if (typeof evidence !== "object" || evidence === null) {
    return ["evidence entry must be an object"];
  }

  const evidenceId = String(evidence.id);
  return [
    ...validateRequiredEvidenceFields(evidence, evidenceId),
    ...validateEvidenceIdentity(evidence, ids),
    ...validateEvidenceAssociations(evidence, evidenceId),
    ...validateEvidenceMetadata(evidence, evidenceId),
    ...validateEvidenceIntegrity(evidence, evidenceId),
    ...validateEvidenceArtifacts(evidence, evidenceId, snapshot),
    ...validateEvidenceRedaction(evidence, evidenceId),
  ];
}

function validateRequiredEvidenceFields(evidence, evidenceId) {
  const errors = [];
  for (const field of REQUIRED_FIELDS) {
    if (!(field in evidence))
      errors.push(`evidence ${evidenceId} is missing ${field}`);
  }
  return errors;
}

function validateEvidenceIdentity(evidence, ids) {
  if (typeof evidence.id !== "string" || evidence.id.trim() === "") {
    return ["evidence id must be non-empty"];
  }
  if (ids.has(evidence.id)) return [`duplicate evidence id ${evidence.id}`];
  ids.add(evidence.id);
  return [];
}

function validateEvidenceAssociations(evidence, evidenceId) {
  const errors = [];
  if (
    !Array.isArray(evidence.requirementIds) ||
    evidence.requirementIds.length === 0
  ) {
    errors.push(`evidence ${evidenceId} has no requirementIds`);
  }
  if (!Array.isArray(evidence.taskIds) || evidence.taskIds.length === 0) {
    errors.push(`evidence ${evidenceId} has no taskIds`);
  }
  if (
    typeof evidence.artifactId !== "string" ||
    evidence.artifactId.trim() === ""
  ) {
    errors.push(`evidence ${evidenceId} has no artifactId`);
  }
  if (
    typeof evidence.command !== "string" ||
    !evidence.command.includes("pnpm")
  ) {
    errors.push(`evidence ${evidenceId} has no reproducible command`);
  }
  if (
    typeof evidence.timestamp !== "string" ||
    Number.isNaN(Date.parse(evidence.timestamp))
  ) {
    errors.push(`evidence ${evidenceId} has invalid timestamp`);
  }
  return errors;
}

function validateEvidenceMetadata(evidence, evidenceId) {
  const errors = [];
  for (const field of [
    "environment",
    "seed",
    "sanitization",
    "teardown",
    "retention",
  ]) {
    if (typeof evidence[field] !== "string" || evidence[field].trim() === "") {
      errors.push(`evidence ${evidenceId} has invalid ${field}`);
    }
  }
  return errors;
}

function validateEvidenceIntegrity(evidence, evidenceId) {
  const errors = [];
  if (evidence.syntheticData !== true) {
    errors.push(`evidence ${evidenceId} syntheticData must be true`);
  }
  if (evidence.sanitization !== "redacted") {
    errors.push(`evidence ${evidenceId} sanitization must be redacted`);
  }
  if (evidence.teardown !== "verified") {
    errors.push(`evidence ${evidenceId} teardown must be verified`);
  }
  return errors;
}

function validateEvidenceArtifacts(evidence, evidenceId, snapshot) {
  const errors = [];
  if (!isShaOrGap(evidence.commit)) {
    errors.push(`evidence ${evidenceId} commit must be a SHA or explicit GAP`);
  }
  if (!isPathOrGap(evidence.artifact, snapshot)) {
    errors.push(
      `evidence ${evidenceId} artifact must exist or be an explicit GAP`,
    );
  }
  for (const path of Array.isArray(evidence.paths) ? evidence.paths : []) {
    if (!snapshot.has(path))
      errors.push(`evidence ${evidenceId} path ${path} does not exist`);
  }
  return errors;
}

function validateEvidenceRedaction(evidence, evidenceId) {
  if (FORBIDDEN_MARKER.test(JSON.stringify(evidence))) {
    return [`evidence ${evidenceId} contains an unredacted secret marker`];
  }
  return [];
}

export function buildTestEvidenceGovernanceReport(snapshot) {
  const policy = JSON.parse(snapshot.get(POLICY_PATH) ?? "{}");
  const evidence = Array.isArray(policy.evidence) ? policy.evidence : [];
  const completeEvidence = evidence.filter(
    (entry) =>
      SHA_PATTERN.test(String(entry.commit)) &&
      !GAP_PATTERN.test(String(entry.artifact)) &&
      !GAP_PATTERN.test(String(entry.retention)),
  ).length;
  return Object.freeze({
    task: policy.taskId,
    evidenceCount: evidence.length,
    completeEvidence,
    explicitGaps: evidence.length - completeEvidence,
    syntheticEvidence: evidence.filter((entry) => entry.syntheticData === true)
      .length,
    teardownVerified: evidence.filter((entry) => entry.teardown === "verified")
      .length,
    status: completeEvidence === evidence.length ? "PASS" : "PASS_WITH_GAPS",
    releaseDisposition: policy.releaseDisposition,
  });
}

function isShaOrGap(value) {
  return SHA_PATTERN.test(String(value)) || GAP_PATTERN.test(String(value));
}

function isPathOrGap(value, snapshot) {
  return GAP_PATTERN.test(String(value)) || snapshot.has(value);
}

async function main() {
  const snapshot = await loadTestEvidenceGovernanceSnapshot();
  const errors = validateTestEvidenceGovernance(snapshot);
  if (errors.length > 0) {
    console.error(
      `test evidence governance failed (${errors.length} findings):`,
    );
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    JSON.stringify(buildTestEvidenceGovernanceReport(snapshot), null, 2),
  );
}

if (process.argv[1]?.endsWith("verify-test-evidence-governance.mjs")) {
  await main();
}
