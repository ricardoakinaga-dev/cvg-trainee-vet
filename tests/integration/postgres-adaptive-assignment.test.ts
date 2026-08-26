import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getParticipantLearningJourney } from "../../packages/application/src/index.js";

import {
  createActivityReadRepository,
  createAdaptiveAssignmentRepository,
  createDiagnosticResultRepository,
  createParticipantJourneyRepository,
  setDatabaseSecurityContext,
} from "../../packages/persistence/src/index.js";
import {
  accountInvitations,
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
      const invitationId = randomUUID();
      const completedAt = "2026-08-24T12:00:00.000Z";

      try {
        await admin.db.insert(accounts).values({
          id: participantId,
          professionalEmail: `adaptive-${participantId}@example.invalid`,
          status: "ACTIVE",
        });
        await admin.db.insert(accountInvitations).values({
          id: invitationId,
          accountId: participantId,
          tokenHash: "a".repeat(64),
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
          expiresAt: new Date("2027-08-24T12:00:00.000Z"),
          acceptedAt: new Date("2026-08-24T11:00:00.000Z"),
          createdBy: participantId,
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
        await admin.db
          .delete(accountInvitations)
          .where(eq(accountInvitations.id, invitationId));
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
      const unpublishedActivityId = randomUUID();
      const unpublishedContentVersionId = randomUUID();
      const unpublishedContentId = randomUUID();
      const mixedPublishedContentVersionId = randomUUID();
      const mixedPublishedContentId = randomUUID();
      const invitationId = randomUUID();
      const completedAt = "2026-08-24T12:00:00.000Z";

      try {
        await admin.db.insert(accounts).values({
          id: participantId,
          professionalEmail: `adaptive-activity-${participantId}@example.invalid`,
          status: "ACTIVE",
        });
        await admin.db.insert(accountInvitations).values({
          id: invitationId,
          accountId: participantId,
          tokenHash: "b".repeat(64),
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
          expiresAt: new Date("2027-08-24T12:00:00.000Z"),
          acceptedAt: new Date("2026-08-24T11:00:00.000Z"),
          createdBy: participantId,
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
        await expect(
          createActivityReadRepository(database.db).findParticipantActivity(
            participantId,
            activityId,
          ),
        ).resolves.toBeNull();
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
        const learningAssignmentId = first.assignments[0]?.state.assignmentId;
        if (learningAssignmentId === undefined) {
          throw new Error("adaptive assignment was not materialized");
        }
        await admin.db.insert(learningActivities).values({
          id: unpublishedActivityId,
          scopeId,
          moduleId: "M01",
          slug: `adaptive-unpublished-${unpublishedActivityId}`,
          title: "Atividade sem conteúdo publicado",
          status: "PUBLISHED",
        });
        await admin.db.insert(contentVersions).values({
          id: unpublishedContentVersionId,
          contentId: unpublishedContentId,
          scopeId,
          version: 1,
          status: "RASCUNHO",
          kind: "QUESTAO",
          title: "Item ainda em rascunho",
          participantText: "Não deve ser atribuído.",
          responseMode: "TEXT",
        });
        await admin.db.insert(contentVersions).values({
          id: mixedPublishedContentVersionId,
          contentId: mixedPublishedContentId,
          scopeId,
          version: 1,
          status: "PUBLICADO",
          kind: "QUESTAO",
          title: "Item publicado em atividade mista",
          participantText: "Não deve liberar atividade mista.",
          responseMode: "TEXT",
        });
        await admin.db.insert(learningActivityItems).values({
          activityId: unpublishedActivityId,
          contentVersionId: unpublishedContentVersionId,
          ordinal: 1,
        });
        await admin.db.insert(learningActivityItems).values({
          activityId: unpublishedActivityId,
          contentVersionId: mixedPublishedContentVersionId,
          ordinal: 2,
        });
        await expect(
          repository.materializeCurriculumAssignments({
            diagnosticResultId: resultId,
            scopeId,
            moduleIds: ["M01"],
          }),
        ).resolves.toBeDefined();
        await expect(
          database.db.transaction(async (tx) => {
            await setDatabaseSecurityContext(tx, { participantId, scopeId });
            await tx.insert(activityAssignments).values({
              participantId,
              activityId: unpublishedActivityId,
              learningAssignmentId,
              status: "ATRIBUIDO",
            });
          }),
        ).rejects.toThrow();
        const integrityRows = await database.db.transaction(async (tx) => {
          await setDatabaseSecurityContext(tx, { participantId, scopeId });
          return tx.execute(sql`
            select
              cvg_learning_activity_assignment_write_allowed(
                ${activityId}::uuid,
                ${learningAssignmentId}::uuid,
                ${participantId}::uuid,
                ${scopeId}::text,
                'ATRIBUIDO'::text
              ) as "valid",
              cvg_learning_activity_assignment_write_allowed(
                ${activityId}::uuid,
                ${learningAssignmentId}::uuid,
                ${participantId}::uuid,
                ${scopeId}::text,
                'INVALIDO'::text
              ) as "mismatchedStatus"
          `);
        });
        expect(integrityRows).toEqual([
          { valid: true, mismatchedStatus: false },
        ]);
        await admin.db
          .update(learningAssignments)
          .set({ status: "NAO_ATRIBUIDO" })
          .where(eq(learningAssignments.id, learningAssignmentId));
        const unassignedRows = await database.db.transaction(async (tx) => {
          await setDatabaseSecurityContext(tx, { participantId, scopeId });
          return tx.execute(sql`
            select cvg_learning_activity_assignment_write_allowed(
              ${activityId}::uuid,
              ${learningAssignmentId}::uuid,
              ${participantId}::uuid,
              ${scopeId}::text,
              'ATRIBUIDO'::text
            ) as "valid"
          `);
        });
        expect(unassignedRows).toEqual([{ valid: false }]);
        await admin.db
          .update(learningAssignments)
          .set({ status: "ATRIBUIDO" })
          .where(eq(learningAssignments.id, learningAssignmentId));
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
          .delete(learningActivityItems)
          .where(
            eq(
              learningActivityItems.contentVersionId,
              unpublishedContentVersionId,
            ),
          );
        await admin.db
          .delete(learningActivityItems)
          .where(
            eq(
              learningActivityItems.contentVersionId,
              mixedPublishedContentVersionId,
            ),
          );
        await admin.db
          .delete(contentVersions)
          .where(eq(contentVersions.id, unpublishedContentVersionId));
        await admin.db
          .delete(contentVersions)
          .where(eq(contentVersions.id, mixedPublishedContentVersionId));
        await admin.db
          .delete(learningActivities)
          .where(eq(learningActivities.id, unpublishedActivityId));
        await admin.db
          .delete(contentVersions)
          .where(eq(contentVersions.id, contentVersionId));
        await admin.db
          .delete(accountInvitations)
          .where(eq(accountInvitations.id, invitationId));
        await admin.db.delete(accounts).where(eq(accounts.id, participantId));
        await closeLivePostgresHarness(harness);
      }
    });

    it("serializes concurrent materialization without duplicate bindings", async ({
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
      const invitationId = randomUUID();

      try {
        await admin.db.insert(accounts).values({
          id: participantId,
          professionalEmail: `adaptive-concurrent-${participantId}@example.invalid`,
          status: "ACTIVE",
        });
        await admin.db.insert(accountInvitations).values({
          id: invitationId,
          accountId: participantId,
          tokenHash: "c".repeat(64),
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
          expiresAt: new Date("2027-08-24T12:00:00.000Z"),
          acceptedAt: new Date("2026-08-24T11:00:00.000Z"),
          createdBy: participantId,
        });
        await admin.db.insert(learningActivities).values({
          id: activityId,
          scopeId,
          moduleId: "M01",
          slug: `adaptive-concurrent-${activityId}`,
          title: "Atividade concorrente sintética",
          status: "PUBLISHED",
        });
        await admin.db.insert(contentVersions).values({
          id: contentVersionId,
          contentId,
          scopeId,
          version: 1,
          status: "PUBLICADO",
          kind: "QUESTAO",
          title: "Item concorrente sintético",
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
          completedAt: "2026-08-24T12:00:00.000Z",
          result: diagnosticResult,
        });
        const firstRepository = createAdaptiveAssignmentRepository(
          database.db,
          () => randomUUID(),
        );
        const secondRepository = createAdaptiveAssignmentRepository(
          database.db,
          () => randomUUID(),
        );
        const [first, second] = await Promise.all([
          firstRepository.materializeCurriculumAssignments({
            diagnosticResultId: resultId,
            scopeId,
            moduleIds: ["M01"],
          }),
          secondRepository.materializeCurriculumAssignments({
            diagnosticResultId: resultId,
            scopeId,
            moduleIds: ["M01"],
          }),
        ]);
        const persistedAssignments = await admin.db
          .select()
          .from(learningAssignments)
          .where(eq(learningAssignments.participantId, participantId));
        const persistedActivityAssignments = await admin.db
          .select()
          .from(activityAssignments)
          .where(eq(activityAssignments.participantId, participantId));

        expect(first.assignments[0]?.state.assignmentId).toBe(
          second.assignments[0]?.state.assignmentId,
        );
        expect(persistedAssignments).toHaveLength(1);
        expect(persistedActivityAssignments).toEqual([
          expect.objectContaining({
            activityId,
            participantId,
            learningAssignmentId: first.assignments[0]?.state.assignmentId,
            status: "ATRIBUIDO",
          }),
        ]);
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
        await admin.db
          .delete(accountInvitations)
          .where(eq(accountInvitations.id, invitationId));
        await admin.db.delete(accounts).where(eq(accounts.id, participantId));
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
