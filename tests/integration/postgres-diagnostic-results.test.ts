import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createDiagnosticResultRepository } from "../../packages/persistence/src/index.js";
import {
  accounts,
  diagnosticResults,
} from "../../packages/persistence/src/schema.js";
import {
  closeLivePostgresHarness,
  hasAdministrativeCleanupCapability,
  liveAdminCapabilityMessage,
  liveDatabaseUrl,
  openLivePostgresHarness,
} from "./live-postgres-harness.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";

const diagnosticResult = {
  diagnosticId: "B07-DIAGNOSTIC-V1" as const,
  version: "0.1.0" as const,
  notPunitive: true as const,
  noGlobalPassFail: true as const,
  totalItemCount: 120,
  answeredItemCount: 1,
  themeResults: [
    {
      themeId: "B07-S1" as const,
      itemCount: 40,
      answeredItemCount: 1,
      earnedPoints: 1,
      possiblePoints: 1,
      percent: 100,
      recommendedModuleIds: ["M01"],
    },
    {
      themeId: "B07-S2" as const,
      itemCount: 40,
      answeredItemCount: 0,
      earnedPoints: 0,
      possiblePoints: 0,
      percent: 0,
      recommendedModuleIds: ["M02"],
    },
    {
      themeId: "B07-S3" as const,
      itemCount: 40,
      answeredItemCount: 0,
      earnedPoints: 0,
      possiblePoints: 0,
      percent: 0,
      recommendedModuleIds: ["M11"],
    },
  ],
  recommendedModuleIds: ["M01", "M02", "M11"],
  remediationObjectiveIds: ["M01-OBJ-01"],
};

describe.skipIf(!runLiveDatabaseTests || liveDatabaseUrl === undefined)(
  "PostgreSQL diagnostic result integration",
  () => {
    it("persists and reads only the participant's scoped aggregate", async ({
      skip,
    }) => {
      const harness = await openLivePostgresHarness();
      if (!hasAdministrativeCleanupCapability(harness.adminRole)) {
        await closeLivePostgresHarness(harness);
        skip(liveAdminCapabilityMessage);
        return;
      }
      const { application: database, admin } = harness;
      const participantId = randomUUID();
      const otherParticipantId = randomUUID();
      const scopeId = randomUUID();
      const resultId = randomUUID();

      try {
        await admin.db.insert(accounts).values([
          {
            id: participantId,
            professionalEmail: `diagnostic-participant-${participantId}@example.invalid`,
            status: "ACTIVE",
          },
          {
            id: otherParticipantId,
            professionalEmail: `diagnostic-other-${otherParticipantId}@example.invalid`,
            status: "ACTIVE",
          },
        ]);

        const repository = createDiagnosticResultRepository(
          database.db,
          () => resultId,
        );
        const saved = await repository.saveDiagnosticResult({
          participantId,
          scopeId,
          completedAt: "2026-08-23T12:00:00.000Z",
          result: diagnosticResult,
        });
        expect(saved.resultId).toBe(resultId);
        expect(saved.result.themeResults).toHaveLength(3);

        await expect(
          repository.findDiagnosticResults(participantId, [scopeId]),
        ).resolves.toEqual([saved]);
        await expect(
          repository.findDiagnosticResults(otherParticipantId, [scopeId]),
        ).resolves.toEqual([]);
      } finally {
        await admin.db
          .delete(diagnosticResults)
          .where(eq(diagnosticResults.participantId, participantId));
        await admin.db.delete(accounts).where(eq(accounts.id, participantId));
        await admin.db
          .delete(accounts)
          .where(eq(accounts.id, otherParticipantId));
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
