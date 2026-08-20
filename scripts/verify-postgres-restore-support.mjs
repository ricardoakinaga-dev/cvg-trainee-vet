import { randomUUID } from "node:crypto";

export function optionalEnvironmentValue(environment, name) {
  const value = environment[name]?.trim();
  return value === undefined || value === "" ? undefined : value;
}

export function parseStoredRestorePaths(environment) {
  const backupPath = optionalEnvironmentValue(
    environment,
    "CVG_RESTORE_BACKUP_FILE",
  );
  const manifestPath = optionalEnvironmentValue(
    environment,
    "CVG_RESTORE_BACKUP_MANIFEST",
  );
  if ((backupPath === undefined) !== (manifestPath === undefined)) {
    throw new Error(
      "CVG_RESTORE_BACKUP_FILE and CVG_RESTORE_BACKUP_MANIFEST must be provided together",
    );
  }
  return Object.freeze(
    backupPath === undefined || manifestPath === undefined
      ? undefined
      : { backupPath, manifestPath },
  );
}

const restoreInvariantKeys = [
  "auditRlsForced",
  "auditInsertPolicy",
  "auditSelectPolicy",
  "auditAppendOnlyTrigger",
  "attemptsRlsForced",
  "answersRlsForced",
  "attemptIdempotencyRlsForced",
  "answerIdempotencyRlsForced",
  "openAttemptUniqueIndex",
  "answerItemUniqueIndex",
];

export function parseRestoreInvariantResult(value) {
  const flags = value.trim().split("|");
  if (
    flags.length !== restoreInvariantKeys.length ||
    flags.some((flag) => flag !== "t" && flag !== "f")
  ) {
    throw new Error("restore invariant probe is invalid");
  }
  if (flags.some((flag) => flag !== "t")) {
    throw new Error("restore invariants were not preserved");
  }
  return Object.freeze(
    Object.fromEntries(
      restoreInvariantKeys.map((key, index) => [key, flags[index] === "t"]),
    ),
  );
}

export function createRestoreTarget(uuidFactory = randomUUID) {
  const targetDatabase = `cvg_restore_${uuidFactory().replaceAll("-", "")}`;
  const markerTable = `cvg_restore_marker_${uuidFactory().replaceAll("-", "")}`;
  const markerValue = uuidFactory();
  return Object.freeze({
    targetDatabase,
    markerTable,
    markerValue,
    quotedMarkerTable: `"${markerTable.replaceAll('"', '""')}"`,
  });
}

export function createRestoreResult(options) {
  if (options.invariantsVerified !== true) {
    throw new Error("restore invariants were not verified");
  }
  if (options.mode === "synthetic-marker") {
    return Object.freeze({
      status: "PASS",
      markerVerified: options.markerVerified,
      artifactVerified: false,
      invariantsVerified: true,
      verificationMode: "synthetic-marker",
      targetIsolated: true,
      rtoMs: options.rtoMs,
    });
  }
  if (options.mode === "stored-artifact") {
    return Object.freeze({
      status: "PASS",
      markerVerified: false,
      artifactVerified: true,
      invariantsVerified: true,
      verificationMode: "stored-artifact",
      backupId: options.backupId,
      restoredObjects: options.restoredObjects,
      targetIsolated: true,
      rtoMs: options.rtoMs,
    });
  }
  throw new Error("restore verification mode is invalid");
}
