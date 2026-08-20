import { describe, expect, it } from "vitest";

import {
  createRestoreResult,
  createRestoreTarget,
  parseRestoreInvariantResult,
  parseStoredRestorePaths,
} from "../../scripts/verify-postgres-restore-support.mjs";

describe("PostgreSQL restore verification support", () => {
  it("parses paired stored artifact paths and rejects partial configuration", () => {
    expect(
      parseStoredRestorePaths({
        CVG_RESTORE_BACKUP_FILE: " /tmp/synthetic.dump ",
        CVG_RESTORE_BACKUP_MANIFEST: " /tmp/synthetic.json ",
      }),
    ).toEqual({
      backupPath: "/tmp/synthetic.dump",
      manifestPath: "/tmp/synthetic.json",
    });
    expect(() =>
      parseStoredRestorePaths({ CVG_RESTORE_BACKUP_FILE: "/tmp/only.dump" }),
    ).toThrow(
      "CVG_RESTORE_BACKUP_FILE and CVG_RESTORE_BACKUP_MANIFEST must be provided together",
    );
  });

  it("creates isolated target names and bounded verification reports", () => {
    const target = createRestoreTarget(
      () => "11111111-1111-4111-8111-111111111111",
    );

    expect(target).toEqual({
      targetDatabase: "cvg_restore_11111111111141118111111111111111",
      markerTable: "cvg_restore_marker_11111111111141118111111111111111",
      markerValue: "11111111-1111-4111-8111-111111111111",
      quotedMarkerTable:
        '"cvg_restore_marker_11111111111141118111111111111111"',
    });
    expect(
      createRestoreResult({
        mode: "synthetic-marker",
        rtoMs: 12,
        markerVerified: true,
        invariantsVerified: true,
      }),
    ).toEqual({
      status: "PASS",
      markerVerified: true,
      artifactVerified: false,
      invariantsVerified: true,
      verificationMode: "synthetic-marker",
      targetIsolated: true,
      rtoMs: 12,
    });
    expect(
      createRestoreResult({
        mode: "stored-artifact",
        rtoMs: 18,
        backupId: "cvg-backup-20260816091443-ab12cd34",
        restoredObjects: 4,
        invariantsVerified: true,
      }),
    ).toEqual({
      status: "PASS",
      markerVerified: false,
      artifactVerified: true,
      invariantsVerified: true,
      verificationMode: "stored-artifact",
      backupId: "cvg-backup-20260816091443-ab12cd34",
      restoredObjects: 4,
      targetIsolated: true,
      rtoMs: 18,
    });
  });

  it("accepts only a complete all-true invariant probe", () => {
    expect(parseRestoreInvariantResult("t|t|t|t|t|t|t|t|t|t")).toEqual({
      auditRlsForced: true,
      auditInsertPolicy: true,
      auditSelectPolicy: true,
      auditAppendOnlyTrigger: true,
      attemptsRlsForced: true,
      answersRlsForced: true,
      attemptIdempotencyRlsForced: true,
      answerIdempotencyRlsForced: true,
      openAttemptUniqueIndex: true,
      answerItemUniqueIndex: true,
    });
    expect(() => parseRestoreInvariantResult("t|t|f|t|t|t|t|t|t|t")).toThrow(
      "restore invariants were not preserved",
    );
    expect(() => parseRestoreInvariantResult("t|t")).toThrow(
      "restore invariant probe is invalid",
    );
  });
});
