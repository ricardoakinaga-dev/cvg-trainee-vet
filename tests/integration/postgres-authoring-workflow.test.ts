import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  advanceContent,
  reviewAuthoringContent,
} from "../../packages/application/src/index.js";
import {
  accounts,
  auditEntries,
  contentEditorialRecords,
  contentReviewDecisions,
  contentVersions,
  createAuthoringRepository,
  createContentRepository,
  createContentUseCaseDependencies,
  learningActivities,
  learningActivityItems,
  outboxEvents,
  setDatabaseSecurityContext,
} from "../../packages/persistence/src/index.js";
import {
  closeLivePostgresHarness,
  hasAdministrativeCleanupCapability,
  liveAdminCapabilityMessage,
  openLivePostgresHarness,
} from "./live-postgres-harness.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";
const databaseUrl = process.env.CVG_TEST_DATABASE_URL;

describe.skipIf(!runLiveDatabaseTests || databaseUrl === undefined)(
  "PostgreSQL authoring and clinical review integration",
  () => {
    it("commits clinical approval and refusal atomically while H-CONTENT blocks publication", async ({
      skip,
    }) => {
      if (databaseUrl === undefined)
        throw new Error("test database URL is required");

      const harness = await openLivePostgresHarness();
      if (!hasAdministrativeCleanupCapability(harness.adminRole)) {
        await closeLivePostgresHarness(harness);
        skip(liveAdminCapabilityMessage);
        return;
      }
      const { application: database, admin } = harness;
      const authorId = randomUUID();
      const reviewerId = randomUUID();
      const contentId = randomUUID();
      const contentVersionId = randomUUID();
      const editorialRecordId = randomUUID();
      const secondContentId = randomUUID();
      const secondContentVersionId = randomUUID();
      const secondEditorialRecordId = randomUUID();
      const scopeId = randomUUID();
      const foreignScopeId = randomUUID();
      const foreignActivityId = randomUUID();
      const requestId = randomUUID();
      const bankItem = {
        title: "Prioridade sintética",
        prompt: "Escolha a próxima ação segura em um caso fictício.",
        responseMode: "CHOICE" as const,
        choices: [
          { id: "a", label: "A", text: "Priorizar e reavaliar." },
          { id: "b", label: "B", text: "Aguardar sem meta." },
        ],
        correctChoiceIds: ["a"],
        feedback: "Defina uma meta e reavalie.",
        critical: true,
        remediationTargetObjectiveId: "M02-OBJ-01",
        sourceRefs: [
          {
            code: "F-02",
            locator: "localizador interno",
            updateRequired: true,
          },
        ],
        participant: {
          id: contentId,
          ordinal: 1,
          kind: "QUESTAO" as const,
          title: "Prioridade sintética",
          prompt: "Escolha a próxima ação segura em um caso fictício.",
          responseMode: "CHOICE" as const,
          choices: [
            { id: "a", label: "A", text: "Priorizar e reavaliar." },
            { id: "b", label: "B", text: "Aguardar sem meta." },
          ],
          selectionMode: "SINGLE" as const,
        },
      };
      const secondBankItem = {
        ...bankItem,
        title: "Reavaliação sintética",
        prompt: "Escolha a meta de reavaliação em um caso fictício.",
        participant: {
          ...bankItem.participant,
          id: secondContentId,
          ordinal: 2,
          title: "Reavaliação sintética",
          prompt: "Escolha a meta de reavaliação em um caso fictício.",
        },
      };
      const preflight = {
        ruleVersion: "authoring-preflight-v1" as const,
        technicalChecksPassed: true,
        readyForClinicalReview: true,
        readyForPublication: false,
        checks: {
          requiredFields: true,
          correctionMetadata: true,
          publicBoundary: true,
          sourceTraceability: true,
          publicationBlocked: true,
        },
        checkedAt: new Date().toISOString(),
      };

      try {
        await admin.db.insert(accounts).values([
          {
            id: authorId,
            professionalEmail: `${authorId}@example.invalid`,
            status: "ACTIVE",
          },
          {
            id: reviewerId,
            professionalEmail: `${reviewerId}@example.invalid`,
            status: "ACTIVE",
          },
        ]);
        await admin.db.insert(contentVersions).values({
          id: contentVersionId,
          contentId,
          scopeId,
          version: 1,
          status: "EM_REVISAO_CLINICA",
          kind: "QUESTAO",
          title: bankItem.title,
          participantText: bankItem.prompt,
          responseMode: "CHOICE",
          participantOptions: bankItem.participant.choices,
          participantSelectionMode: "SINGLE",
        });
        await admin.db.insert(contentEditorialRecords).values({
          id: editorialRecordId,
          contentVersionId,
          contentId,
          scopeId,
          version: 1,
          moduleId: "M02",
          sessionId: "M02-S1",
          objectiveId: "M02-OBJ-01",
          authorId,
          item: bankItem,
          preflight,
        });

        expect(harness.applicationRole).toMatchObject({
          isSuperuser: false,
          bypassesRls: false,
        });
        const authoringRepository = createAuthoringRepository(database.db);
        const contentDependencies = createContentUseCaseDependencies(
          database.db,
          randomUUID,
        );
        const reviewCommand = {
          principalId: reviewerId,
          accountStatus: "ACTIVE" as const,
          roles: ["AUTHOR", "CLINICAL_APPROVER"] as const,
          scopes: [scopeId],
          contentId,
          version: 1,
          scopeId,
          decision: "APROVAR_CLINICAMENTE" as const,
          rationale: "Revisão sintética concluída.",
          correlationId: requestId,
        };
        await expect(
          reviewAuthoringContent(
            { ...reviewCommand, principalId: authorId },
            { repository: authoringRepository, idFactory: randomUUID },
          ),
        ).rejects.toMatchObject({ code: "forbidden" });
        const reviewed = await reviewAuthoringContent(reviewCommand, {
          repository: authoringRepository,
          idFactory: randomUUID,
        });
        expect(reviewed.record.contentStatus).toBe("APROVADO_CLINICAMENTE");
        expect(reviewed.record.latestReview?.reviewerId).toBe(reviewerId);
        const persisted = await authoringRepository.find(contentId, 1, scopeId);
        expect(persisted?.latestReview?.decision).toBe("APROVAR_CLINICAMENTE");
        expect(persisted?.correctChoiceIds).toEqual(["a"]);
        expect(persisted?.preflight).toMatchObject({
          readyForPublication: false,
          checks: { publicationBlocked: true },
        });

        await advanceContent(
          {
            ...reviewCommand,
            approvedClinicalApproverId: reviewerId,
            event: "VERIFICAR_PROJECAO",
            correlationId: randomUUID(),
          },
          contentDependencies,
        );
        const successfulEvents = await admin.db
          .select()
          .from(outboxEvents)
          .where(eq(outboxEvents.aggregateId, contentId));
        const successfulAudits = await admin.db
          .select()
          .from(auditEntries)
          .where(eq(auditEntries.resourceId, contentId));
        expect(successfulEvents).toHaveLength(2);
        expect(successfulEvents.map((event) => event.eventType)).toEqual([
          "content.workflow.changed.v1",
          "content.workflow.changed.v1",
        ]);
        expect(successfulAudits.map((entry) => entry.action).sort()).toEqual([
          "CONTENT_APROVAR_CLINICAMENTE",
          "CONTENT_VERIFICAR_PROJECAO",
        ]);
        for (const event of successfulEvents) {
          expect(event.payload).toEqual({
            content_id: contentId,
            version: "1",
            status: expect.any(String),
          });
          expect(JSON.stringify(event.payload)).not.toMatch(
            /correctChoiceIds|sourceRefs|participantText/u,
          );
        }
        const storedGate = await createContentRepository(admin.db).find(
          contentId,
          1,
          reviewerId,
        );
        expect(storedGate).toMatchObject({
          publicationReady: false,
          publicationBlockReasons: expect.arrayContaining([
            "CLINICAL_PUBLICATION_HOLD_ACTIVE",
          ]),
        });
        for (const event of ["AUTORIZAR_PUBLICACAO", "PUBLICAR"] as const) {
          await expect(
            advanceContent(
              {
                ...reviewCommand,
                approvedClinicalApproverId: reviewerId,
                event,
                correlationId: randomUUID(),
              },
              contentDependencies,
            ),
          ).rejects.toMatchObject({ code: "state_conflict" });
        }
        // Direct persistence is also held, even if a caller forges readiness.
        await expect(
          database.db.transaction(async (transaction) => {
            await setDatabaseSecurityContext(transaction, { scopeId });
            const repository = createContentRepository(
              transaction as unknown as Parameters<
                typeof createContentRepository
              >[0],
            );
            await repository.save(
              {
                contentId,
                version: 1,
                scopeId,
                status: "PROJECAO_VERIFICADA",
                publicationReady: true,
              },
              {
                contentId,
                version: 1,
                scopeId,
                status: "PUBLICADO",
                publicationReady: true,
              },
            );
          }),
        ).rejects.toThrow("clinical publication hold is active");
        expect(
          await admin.db
            .select({ status: contentVersions.status })
            .from(contentVersions)
            .where(eq(contentVersions.id, contentVersionId)),
        ).toEqual([{ status: "PROJECAO_VERIFICADA" }]);
        expect(
          await admin.db
            .select()
            .from(outboxEvents)
            .where(eq(outboxEvents.aggregateId, contentId)),
        ).toEqual(successfulEvents);
        expect(
          await admin.db
            .select()
            .from(auditEntries)
            .where(eq(auditEntries.resourceId, contentId)),
        ).toEqual(successfulAudits);
        expect(
          await admin.db
            .select()
            .from(learningActivities)
            .where(eq(learningActivities.scopeId, scopeId)),
        ).toHaveLength(0);

        await admin.db.insert(contentVersions).values({
          id: secondContentVersionId,
          contentId: secondContentId,
          scopeId,
          version: 1,
          status: "EM_REVISAO_CLINICA",
          kind: "QUESTAO",
          title: secondBankItem.title,
          participantText: secondBankItem.prompt,
          responseMode: "CHOICE",
          participantOptions: secondBankItem.participant.choices,
          participantSelectionMode: "SINGLE",
        });
        await admin.db.insert(contentEditorialRecords).values({
          id: secondEditorialRecordId,
          contentVersionId: secondContentVersionId,
          contentId: secondContentId,
          scopeId,
          version: 1,
          moduleId: "M02",
          sessionId: "M02-S1",
          objectiveId: "M02-OBJ-01",
          authorId,
          item: secondBankItem,
          preflight,
        });
        const collisionId = successfulEvents[0]?.id;
        if (collisionId === undefined)
          throw new Error("committed outbox identity required");
        // A real unique constraint failure after review writes must roll back all writes.
        await expect(
          reviewAuthoringContent(
            {
              ...reviewCommand,
              contentId: secondContentId,
              correlationId: randomUUID(),
            },
            { repository: authoringRepository, idFactory: () => collisionId },
          ),
        ).rejects.toBeDefined();
        expect(
          await admin.db
            .select({ status: contentVersions.status })
            .from(contentVersions)
            .where(eq(contentVersions.id, secondContentVersionId)),
        ).toEqual([{ status: "EM_REVISAO_CLINICA" }]);
        expect(
          await admin.db
            .select({ preflight: contentEditorialRecords.preflight })
            .from(contentEditorialRecords)
            .where(eq(contentEditorialRecords.id, secondEditorialRecordId)),
        ).toEqual([{ preflight }]);
        expect(
          await admin.db
            .select()
            .from(contentReviewDecisions)
            .where(eq(contentReviewDecisions.contentId, secondContentId)),
        ).toHaveLength(0);
        expect(
          await admin.db
            .select()
            .from(outboxEvents)
            .where(eq(outboxEvents.aggregateId, secondContentId)),
        ).toHaveLength(0);
        expect(
          await admin.db
            .select()
            .from(auditEntries)
            .where(eq(auditEntries.resourceId, secondContentId)),
        ).toHaveLength(0);

        const refused = await reviewAuthoringContent(
          {
            ...reviewCommand,
            contentId: secondContentId,
            decision: "SOLICITAR_AJUSTES",
            roles: ["MODERATOR"],
            correlationId: randomUUID(),
          },
          { repository: authoringRepository, idFactory: randomUUID },
        );
        expect(refused.record.contentStatus).toBe("AJUSTES_SOLICITADOS");
        expect(
          await admin.db
            .select({ decision: contentReviewDecisions.decision })
            .from(contentReviewDecisions)
            .where(eq(contentReviewDecisions.contentId, secondContentId)),
        ).toEqual([{ decision: "SOLICITAR_AJUSTES" }]);
        expect(
          await admin.db
            .select({ eventType: outboxEvents.eventType })
            .from(outboxEvents)
            .where(eq(outboxEvents.aggregateId, secondContentId)),
        ).toEqual([{ eventType: "content.workflow.changed.v1" }]);
        expect(
          await admin.db
            .select({
              action: auditEntries.action,
              outcome: auditEntries.outcome,
            })
            .from(auditEntries)
            .where(eq(auditEntries.resourceId, secondContentId)),
        ).toEqual([
          { action: "CONTENT_SOLICITAR_AJUSTES", outcome: "SUCCESS" },
        ]);
        await admin.db.insert(learningActivities).values({
          id: foreignActivityId,
          scopeId: foreignScopeId,
          slug: `foreign-authoring-${foreignActivityId}`,
          moduleId: "M02",
          sessionId: "M02-S1",
          title: "Atividade de outro escopo",
          status: "PUBLISHED",
        });
        await expect(
          database.db.transaction(async (transaction) => {
            await setDatabaseSecurityContext(transaction, { scopeId });
            const visibleForeignActivity = await transaction
              .select({ id: learningActivities.id })
              .from(learningActivities)
              .where(eq(learningActivities.id, foreignActivityId));
            expect(visibleForeignActivity).toEqual([]);
          }),
        ).resolves.toBeUndefined();
        await expect(
          database.db.transaction(async (transaction) => {
            await setDatabaseSecurityContext(transaction, { scopeId });
            await transaction.insert(learningActivities).values({
              id: randomUUID(),
              scopeId: foreignScopeId,
              slug: `rejected-authoring-${randomUUID()}`,
              moduleId: "M02",
              sessionId: "M02-S1",
              title: "Escrita fora do escopo",
              status: "PUBLISHED",
            });
          }),
        ).rejects.toBeDefined();
      } finally {
        for (const id of [contentId, secondContentId]) {
          await admin.db
            .delete(outboxEvents)
            .where(eq(outboxEvents.aggregateId, id));
          await admin.db
            .delete(contentReviewDecisions)
            .where(eq(contentReviewDecisions.contentId, id));
        }
        const activities = await admin.db
          .select({ id: learningActivities.id })
          .from(learningActivities)
          .where(eq(learningActivities.scopeId, scopeId));
        for (const activity of activities) {
          await admin.db
            .delete(learningActivityItems)
            .where(eq(learningActivityItems.activityId, activity.id));
          await admin.db
            .delete(learningActivities)
            .where(eq(learningActivities.id, activity.id));
        }
        for (const id of [editorialRecordId, secondEditorialRecordId]) {
          await admin.db
            .delete(contentEditorialRecords)
            .where(eq(contentEditorialRecords.id, id));
        }
        for (const id of [contentVersionId, secondContentVersionId]) {
          await admin.db
            .delete(contentVersions)
            .where(eq(contentVersions.id, id));
        }
        await admin.db
          .delete(learningActivities)
          .where(eq(learningActivities.id, foreignActivityId));
        await admin.db.delete(accounts).where(eq(accounts.id, authorId));
        await admin.db.delete(accounts).where(eq(accounts.id, reviewerId));
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
