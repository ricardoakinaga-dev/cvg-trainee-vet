import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  isRecord,
  validateJourneyCorrectionEvidence,
  validateJourneyCorrectionGaps,
  validateJourneyCorrectionInvariants,
  validateJourneyCorrectionMetadata,
} from "./journey-correction-governance-support.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const CURRENT_SCRIPT_PATH = fileURLToPath(import.meta.url);
const POLICY_PATH = "journey-correction-governance.json";

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
  if (!isRecord(snapshot)) {
    return Object.freeze(["journey correction governance must be an object"]);
  }
  return Object.freeze([
    ...validateJourneyCorrectionMetadata(snapshot),
    ...validateJourneyCorrectionInvariants(snapshot),
    ...validateJourneyCorrectionEvidence(snapshot, rootDir),
    ...validateJourneyCorrectionGaps(snapshot),
  ]);
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
