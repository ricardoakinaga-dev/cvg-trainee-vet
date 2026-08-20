import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isRecord,
  validateCapacityExplorationEvidence,
  validateCapacityGaps,
  validateCapacityMetadata,
  validateCapacitySmokeEvidence,
} from "./verify-capacity-governance-support.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const CURRENT_SCRIPT_PATH = fileURLToPath(import.meta.url);

export function loadCapacityGovernanceSnapshot(rootDir = REPO_ROOT) {
  return JSON.parse(
    fs.readFileSync(path.join(rootDir, "capacity-governance.json"), "utf8"),
  );
}

export function validateCapacityGovernanceSnapshot(snapshot) {
  if (!isRecord(snapshot)) return ["capacity governance must be an object"];
  return Object.freeze([
    ...validateCapacityMetadata(snapshot),
    ...validateCapacitySmokeEvidence(snapshot),
    ...validateCapacityExplorationEvidence(snapshot),
    ...validateCapacityGaps(snapshot),
  ]);
}

export function buildCapacityGovernanceReport(snapshot) {
  const smoke = isRecord(snapshot.smokeEvidence) ? snapshot.smokeEvidence : {};
  const requestCount =
    typeof smoke.requestCount === "number" ? smoke.requestCount : 0;
  const successCount =
    typeof smoke.successCount === "number" ? smoke.successCount : 0;
  const exploration = isRecord(snapshot.explorationEvidence)
    ? snapshot.explorationEvidence
    : {};
  const failover = isRecord(exploration.failover) ? exploration.failover : {};
  return Object.freeze({
    task: snapshot.taskId,
    requestCount,
    successCount,
    successRatePercent:
      requestCount === 0 ? 0 : (successCount / requestCount) * 100,
    p95Milliseconds: smoke.p95Milliseconds,
    gapCount: Array.isArray(snapshot.gaps) ? snapshot.gaps.length : 0,
    steppedLoadRuns: Array.isArray(exploration.loadRuns)
      ? exploration.loadRuns.length
      : 0,
    failoverSuccessRatePercent: failover.successRatePercent,
    soakStatus: isRecord(exploration.soak)
      ? exploration.soak.status
      : "NOT_EXECUTED",
    status: snapshot.status,
    releaseDisposition: snapshot.releaseDisposition,
  });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(CURRENT_SCRIPT_PATH)
) {
  const snapshot = loadCapacityGovernanceSnapshot();
  const errors = validateCapacityGovernanceSnapshot(snapshot);
  if (errors.length > 0) {
    console.error(JSON.stringify({ status: "FAIL", errors }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(
      JSON.stringify(buildCapacityGovernanceReport(snapshot), null, 2),
    );
  }
}
