import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getParticipantLearningJourney } from "../../packages/application/src/index.js";

import {
  createAdaptiveAssignmentRepository,
  createDiagnosticResultRepository,
  createParticipantJourneyRepository,
} from "../../packages/persistence/src/index.js";
import {
  accounts,
  activityAssignments,
  contentVersions,
  diagnosticResults,
  learningActivities,
  learningActivityItems,
  learningAssignments,
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
      earnedPoints: 0,
      possiblePoints: 1,
      percent: 0,
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
  remediationObjectiveIds: [],
};

describe.skipIf(!runLiveDatabaseTests || liveDatabaseUrl === undefined)(
  "PostgreSQL adaptive curriculum assignment",
  () => {
    it("derives participant identity from the diagnostic row and is replay-safe", async ({
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
      const scopeId = randomUUID();
      const resultId = randomUUID();
      const completedAt = "2026-08-24T12:00:00.000Z";

      try {
        await admin.db.insert(accounts).values({
          id: participantId,
          professionalEmail: `adaptive-${participantId}@example.invalid`,
          status: "ACTIVE",
        });
        const diagnosticRepository = createDiagnosticResultRepository(
          database.db,
          () => resultId,
        );
        await diagnosticRepository.saveDiagnosticResult({
          participantId,
          scopeId,
          completedAt,
          result: diagnosticResult,
        });

        const repository = createAdaptiveAssignmentRepository(database.db, () =>
          randomUUID(),
        );
        const first = await repository.materializeCurriculumAssignments({
          diagnosticResultId: resultId,
          scopeId,
          moduleIds: ["M01", "M02", "M11"],
        });
        const replay = await repository.materializeCurriculumAssignments({
          diagnosticResultId: resultId,
          scopeId,
          moduleIds: ["M01", "M02", "M11"],
        });

        expect(first.participantId).toBe(participantId);
        expect(first.assignments.map(({ state }) => state.moduleId)).toEqual([
          "M01",
          "M02",
          "M11",
        ]);
        expect(first.assignments.map(({ state }) => state.status)).toEqual([
          "ATRIBUIDO",
          "ATRIBUIDO",
          "ATRIBUIDO",
        ]);
        expect(
          replay.assignments.map(({ state }) => state.assignmentId),
        ).toEqual(first.assignments.map(({ state }) => state.assignmentId));
        await expect(
          repository.materializeCurriculumAssignments({
            diagnosticResultId: resultId,
            scopeId: randomUUID(),
            moduleIds: ["M01"],
            availableAt: completedAt,
          }),
        ).rejects.toThrow();
      } finally {
        await admin.db
          .delete(learningAssignments)
          .where(eq(learningAssignments.participantId, participantId));
        await admin.db
          .delete(diagnosticResults)
          .where(
            and(
              eq(diagnosticResults.id, resultId),
              eq(diagnosticResults.participantId, participantId),
            ),
          );
        await admin.db.delete(accounts).where(eq(accounts.id, participantId));
        await closeLivePostgresHarness(harness);
      }
    });

    it("links explicitly mapped activities atomically and preserves provenance", async ({
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
      const scopeId = randomUUID();
      const resultId = randomUUID();
      const activityId = randomUUID();
      const contentVersionId = randomUUID();
      const contentId = randomUUID();
      const completedAt = "2026-08-24T12:00:00.000Z";

      try {
        await admin.db.insert(accounts).values({
          id: participantId,
          professionalEmail: `adaptive-activity-${participantId}@example.invalid`,
          status: "ACTIVE",
        });
        await admin.db.insert(learningActivities).values({
          id: activityId,
          scopeId,
          moduleId: "M01",
          slug: `adaptive-activity-${activityId}`,
          title: "Atividade adaptativa sintética",
          status: "PUBLISHED",
        });
        await admin.db.insert(contentVersions).values({
          id: contentVersionId,
          contentId,
          scopeId,
          version: 1,
          status: "PUBLICADO",
          kind: "QUESTAO",
          title: "Item sintético publicado",
          participantText: "Escolha a próxima ação segura.",
          responseMode: "TEXT",
        });
        await admin.db.insert(learningActivityItems).values({
          activityId,
          contentVersionId,
          ordinal: 1,
        });
        const diagnosticRepository = createDiagnosticResultRepository(
          database.db,
          () => resultId,
        );
        await diagnosticRepository.saveDiagnosticResult({
          participantId,
          scopeId,
          completedAt,
          result: diagnosticResult,
        });

        const repository = createAdaptiveAssignmentRepository(database.db, () =>
          randomUUID(),
        );
        const first = await repository.materializeCurriculumAssignments({
          diagnosticResultId: resultId,
          scopeId,
          moduleIds: ["M01"],
        });
        const journey = await getParticipantLearningJourney(
          { participantId, scopeIds: [scopeId] },
          createParticipantJourneyRepository(database.db),
        );
        const replay = await repository.materializeCurriculumAssignments({
          diagnosticResultId: resultId,
          scopeId,
          moduleIds: ["M01"],
        });
        const linkedActivities = await admin.db
          .select()
          .from(activityAssignments)
          .where(eq(activityAssignments.participantId, participantId));
        const persistedAssignments = await admin.db
          .select()
          .from(learningAssignments)
          .where(eq(learningAssignments.participantId, participantId));

        expect(linkedActivities).toHaveLength(1);
        expect(linkedActivities[0]).toMatchObject({
          participantId,
          activityId,
          status: "ATRIBUIDO",
          learningAssignmentId: first.assignments[0]?.state.assignmentId,
        });
        expect(persistedAssignments[0]?.sourceDiagnosticResultId).toBe(
          resultId,
        );
        expect(replay.assignments[0]?.state.assignmentId).toBe(
          first.assignments[0]?.state.assignmentId,
        );
        expect(journey.activities).toHaveLength(1);
        expect(journey.nextAction).toBe("INICIAR_ATIVIDADE");
        expect(journey.nextActionTarget).toEqual({
          kind: "ACTIVITY",
          activityId,
        });
      } finally {
        await admin.db
          .delete(activityAssignments)
          .where(eq(activityAssignments.participantId, participantId));
        await admin.db
          .delete(learningAssignments)
          .where(eq(learningAssignments.participantId, participantId));
        await admin.db
          .delete(diagnosticResults)
          .where(
            and(
              eq(diagnosticResults.id, resultId),
              eq(diagnosticResults.participantId, participantId),
            ),
          );
        await admin.db
          .delete(learningActivityItems)
          .where(eq(learningActivityItems.activityId, activityId));
        await admin.db
          .delete(learningActivities)
          .where(eq(learningActivities.id, activityId));
        await admin.db
          .delete(contentVersions)
          .where(eq(contentVersions.id, contentVersionId));
        await admin.db.delete(accounts).where(eq(accounts.id, participantId));
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
