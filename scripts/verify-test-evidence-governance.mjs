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
  const errors = [];
  const policyText = snapshot.get(POLICY_PATH);
  if (policyText === undefined) return [`missing ${POLICY_PATH}`];

  let policy;
  try {
    policy = JSON.parse(policyText);
  } catch {
    return [`${POLICY_PATH} is not valid JSON`];
  }

  if (policy.version !== 1) errors.push("policy version must be 1");
  if (policy.taskId !== "ENT95-14-D") errors.push("task id is invalid");
  if (policy.releaseDisposition !== "PILOT_BLOCKED") {
    errors.push("test evidence cannot release the pilot");
  }
  if (!Array.isArray(policy.evidence) || policy.evidence.length === 0) {
    errors.push("evidence must be a non-empty array");
    return errors;
  }

  const ids = new Set();
  for (const evidence of policy.evidence) {
    if (typeof evidence !== "object" || evidence === null) {
      errors.push("evidence entry must be an object");
      continue;
    }
    for (const field of REQUIRED_FIELDS) {
      if (!(field in evidence))
        errors.push(`evidence ${String(evidence.id)} is missing ${field}`);
    }
    if (typeof evidence.id !== "string" || evidence.id.trim() === "") {
      errors.push("evidence id must be non-empty");
    } else if (ids.has(evidence.id)) {
      errors.push(`duplicate evidence id ${evidence.id}`);
    } else {
      ids.add(evidence.id);
    }
    if (
      !Array.isArray(evidence.requirementIds) ||
      evidence.requirementIds.length === 0
    ) {
      errors.push(`evidence ${String(evidence.id)} has no requirementIds`);
    }
    if (!Array.isArray(evidence.taskIds) || evidence.taskIds.length === 0) {
      errors.push(`evidence ${String(evidence.id)} has no taskIds`);
    }
    if (
      typeof evidence.artifactId !== "string" ||
      evidence.artifactId.trim() === ""
    ) {
      errors.push(`evidence ${String(evidence.id)} has no artifactId`);
    }
    if (
      typeof evidence.command !== "string" ||
      !evidence.command.includes("pnpm")
    ) {
      errors.push(
        `evidence ${String(evidence.id)} has no reproducible command`,
      );
    }
    if (
      typeof evidence.timestamp !== "string" ||
      Number.isNaN(Date.parse(evidence.timestamp))
    ) {
      errors.push(`evidence ${String(evidence.id)} has invalid timestamp`);
    }
    for (const field of [
      "environment",
      "seed",
      "sanitization",
      "teardown",
      "retention",
    ]) {
      if (
        typeof evidence[field] !== "string" ||
        evidence[field].trim() === ""
      ) {
        errors.push(`evidence ${String(evidence.id)} has invalid ${field}`);
      }
    }
    if (evidence.syntheticData !== true) {
      errors.push(`evidence ${String(evidence.id)} syntheticData must be true`);
    }
    if (evidence.sanitization !== "redacted") {
      errors.push(
        `evidence ${String(evidence.id)} sanitization must be redacted`,
      );
    }
    if (evidence.teardown !== "verified") {
      errors.push(`evidence ${String(evidence.id)} teardown must be verified`);
    }
    if (!isShaOrGap(evidence.commit)) {
      errors.push(
        `evidence ${String(evidence.id)} commit must be a SHA or explicit GAP`,
      );
    }
    if (!isPathOrGap(evidence.artifact, snapshot)) {
      errors.push(
        `evidence ${String(evidence.id)} artifact must exist or be an explicit GAP`,
      );
    }
    for (const path of Array.isArray(evidence.paths) ? evidence.paths : []) {
      if (!snapshot.has(path))
        errors.push(
          `evidence ${String(evidence.id)} path ${path} does not exist`,
        );
    }
    if (FORBIDDEN_MARKER.test(JSON.stringify(evidence))) {
      errors.push(
        `evidence ${String(evidence.id)} contains an unredacted secret marker`,
      );
    }
  }
  return errors;
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
