import { randomUUID } from "node:crypto";

import { and, asc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  advanceContent,
  reviewAuthoringContent,
} from "../../packages/application/src/index.js";
import {
  accounts,
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
    it("persists item-level review and blocks publication until all gates are closed", async ({
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

        const authoringRepository = createAuthoringRepository(database.db);
        const contentDependencies = createContentUseCaseDependencies(
          database.db,
          randomUUID,
        );
        const reviewed = await reviewAuthoringContent(
          {
            principalId: reviewerId,
            accountStatus: "ACTIVE",
            roles: ["AUTHOR", "CLINICAL_APPROVER"],
            scopes: [scopeId],
            contentId,
            version: 1,
            scopeId,
            decision: "APROVAR_CLINICAMENTE",
            rationale: "Revisão sintética concluída.",
            correlationId: requestId,
          },
          {
            repository: authoringRepository,
            transition: (command) =>
              advanceContent(command, contentDependencies),
          },
        );

        expect(reviewed.record.contentStatus).toBe("APROVADO_CLINICAMENTE");
        expect(reviewed.record.latestReview?.reviewerId).toBe(reviewerId);
        const persisted = await authoringRepository.find(contentId, 1, scopeId);
        expect(persisted?.latestReview?.decision).toBe("APROVAR_CLINICAMENTE");
        expect(persisted?.correctChoiceIds).toEqual(["a"]);

        await advanceContent(
          {
            principalId: reviewerId,
            accountStatus: "ACTIVE",
            roles: ["AUTHOR", "CLINICAL_APPROVER"],
            scopes: [scopeId],
            approvedClinicalApproverId: reviewerId,
            contentId,
            version: 1,
            scopeId,
            event: "VERIFICAR_PROJECAO",
            correlationId: randomUUID(),
          },
          contentDependencies,
        );
        await advanceContent(
          {
            principalId: reviewerId,
            accountStatus: "ACTIVE",
            roles: ["CLINICAL_APPROVER"],
            scopes: [scopeId],
            approvedClinicalApproverId: reviewerId,
            contentId,
            version: 1,
            scopeId,
            event: "AUTORIZAR_PUBLICACAO",
            correlationId: randomUUID(),
          },
          contentDependencies,
        );
        await admin.db
          .update(contentEditorialRecords)
          .set({ moduleId: "M99" })
          .where(eq(contentEditorialRecords.id, editorialRecordId));
        await expect(
          advanceContent(
            {
              principalId: reviewerId,
              accountStatus: "ACTIVE",
              roles: ["CLINICAL_APPROVER"],
              scopes: [scopeId],
              approvedClinicalApproverId: reviewerId,
              contentId,
              version: 1,
              scopeId,
              event: "PUBLICAR",
              correlationId: randomUUID(),
            },
            contentDependencies,
          ),
        ).rejects.toBeDefined();
        await expect(
          admin.db
            .select({ status: contentVersions.status })
            .from(contentVersions)
            .where(eq(contentVersions.id, contentVersionId)),
        ).resolves.toEqual([{ status: "AUTORIZADO_PARA_PUBLICACAO" }]);
        await expect(
          admin.db
            .select({ id: learningActivities.id })
            .from(learningActivities)
            .where(eq(learningActivities.scopeId, scopeId)),
        ).resolves.toHaveLength(0);
        await admin.db
          .update(contentEditorialRecords)
          .set({ moduleId: "M02" })
          .where(eq(contentEditorialRecords.id, editorialRecordId));
        const published = await advanceContent(
          {
            principalId: reviewerId,
            accountStatus: "ACTIVE",
            roles: ["CLINICAL_APPROVER"],
            scopes: [scopeId],
            approvedClinicalApproverId: reviewerId,
            contentId,
            version: 1,
            scopeId,
            event: "PUBLICAR",
            correlationId: randomUUID(),
          },
          contentDependencies,
        );
        expect(published.status).toBe("PUBLICADO");

        const publishedActivities = await admin.db
          .select({
            id: learningActivities.id,
            scopeId: learningActivities.scopeId,
            moduleId: learningActivities.moduleId,
            sessionId: learningActivities.sessionId,
            status: learningActivities.status,
          })
          .from(learningActivities)
          .where(
            and(
              eq(learningActivities.scopeId, scopeId),
              eq(learningActivities.moduleId, "M02"),
              eq(learningActivities.sessionId, "M02-S1"),
            ),
          );
        expect(publishedActivities).toHaveLength(1);
        const publishedActivity = publishedActivities[0];
        if (publishedActivity === undefined) {
          throw new Error("published authoring activity is required");
        }
        expect(publishedActivity).toMatchObject({
          scopeId,
          moduleId: "M02",
          sessionId: "M02-S1",
          status: "PUBLISHED",
        });
        await expect(
          admin.db
            .select({
              contentVersionId: learningActivityItems.contentVersionId,
              ordinal: learningActivityItems.ordinal,
            })
            .from(learningActivityItems)
            .where(eq(learningActivityItems.activityId, publishedActivity.id)),
        ).resolves.toEqual([{ contentVersionId, ordinal: 1 }]);

        await database.db.transaction(async (transaction) => {
          await setDatabaseSecurityContext(transaction, { scopeId });
          const contentRepository = createContentRepository(
            transaction as unknown as Parameters<
              typeof createContentRepository
            >[0],
          );
          await contentRepository.save(
            {
              contentId,
              version: 1,
              scopeId,
              status: "PUBLICADO",
            },
            {
              contentId,
              version: 1,
              scopeId,
              status: "PUBLICADO",
            },
          );
        });
        await expect(
          admin.db
            .select({ id: learningActivities.id })
            .from(learningActivities)
            .where(
              and(
                eq(learningActivities.scopeId, scopeId),
                eq(learningActivities.moduleId, "M02"),
                eq(learningActivities.sessionId, "M02-S1"),
              ),
            ),
        ).resolves.toHaveLength(1);

        await admin.db
          .delete(learningActivityItems)
          .where(eq(learningActivityItems.activityId, publishedActivity.id));
        await admin.db
          .delete(learningActivities)
          .where(eq(learningActivities.id, publishedActivity.id));

        await admin.db.insert(contentVersions).values({
          id: secondContentVersionId,
          contentId: secondContentId,
          scopeId,
          version: 1,
          status: "PUBLICADO",
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

        const savePublishedVersion = (publishedContentId: string) =>
          database.db.transaction(async (transaction) => {
            await setDatabaseSecurityContext(transaction, { scopeId });
            const contentRepository = createContentRepository(
              transaction as unknown as Parameters<
                typeof createContentRepository
              >[0],
            );
            await contentRepository.save(
              {
                contentId: publishedContentId,
                version: 1,
                scopeId,
                status: "PUBLICADO",
              },
              {
                contentId: publishedContentId,
                version: 1,
                scopeId,
                status: "PUBLICADO",
              },
            );
          });
        await Promise.all([
          savePublishedVersion(contentId),
          savePublishedVersion(secondContentId),
        ]);

        const concurrentActivities = await admin.db
          .select({
            id: learningActivities.id,
            moduleId: learningActivities.moduleId,
            sessionId: learningActivities.sessionId,
            status: learningActivities.status,
          })
          .from(learningActivities)
          .where(
            and(
              eq(learningActivities.scopeId, scopeId),
              eq(learningActivities.moduleId, "M02"),
              eq(learningActivities.sessionId, "M02-S1"),
            ),
          );
        expect(concurrentActivities).toHaveLength(1);
        const concurrentActivity = concurrentActivities[0];
        if (concurrentActivity === undefined) {
          throw new Error("concurrent authoring activity is required");
        }
        expect(concurrentActivity.status).toBe("PUBLISHED");
        await expect(
          admin.db
            .select({
              contentVersionId: learningActivityItems.contentVersionId,
              ordinal: learningActivityItems.ordinal,
            })
            .from(learningActivityItems)
            .where(eq(learningActivityItems.activityId, concurrentActivity.id))
            .orderBy(asc(learningActivityItems.ordinal)),
        ).resolves.toEqual([
          { contentVersionId, ordinal: 1 },
          { contentVersionId: secondContentVersionId, ordinal: 2 },
        ]);

        const reviews = await admin.db
          .select({ decision: contentReviewDecisions.decision })
          .from(contentReviewDecisions)
          .where(eq(contentReviewDecisions.contentId, contentId));
        expect(reviews).toHaveLength(1);
        expect(reviews[0]?.decision).toBe("APROVAR_CLINICAMENTE");

        const stored = await createContentRepository(admin.db).find(
          contentId,
          1,
        );
        expect(stored).toMatchObject({ publicationReady: true });
        expect(JSON.stringify(stored)).not.toContain("correctChoiceIds");
      } finally {
        await admin.db
          .delete(outboxEvents)
          .where(eq(outboxEvents.aggregateId, contentId));
        const activities = await admin.db
          .select({ id: learningActivities.id })
          .from(learningActivities)
          .where(
            and(
              eq(learningActivities.scopeId, scopeId),
              eq(learningActivities.moduleId, "M02"),
              eq(learningActivities.sessionId, "M02-S1"),
            ),
          );
        for (const activity of activities) {
          await admin.db
            .delete(learningActivityItems)
            .where(eq(learningActivityItems.activityId, activity.id));
          await admin.db
            .delete(learningActivities)
            .where(eq(learningActivities.id, activity.id));
        }
        await admin.db
          .delete(learningActivities)
          .where(eq(learningActivities.id, foreignActivityId));
        await admin.db
          .delete(contentReviewDecisions)
          .where(eq(contentReviewDecisions.contentId, contentId));
        await admin.db
          .delete(contentEditorialRecords)
          .where(eq(contentEditorialRecords.id, editorialRecordId));
        await admin.db
          .delete(contentEditorialRecords)
          .where(eq(contentEditorialRecords.id, secondEditorialRecordId));
        await admin.db
          .delete(contentVersions)
          .where(
            and(
              eq(contentVersions.id, contentVersionId),
              eq(contentVersions.contentId, contentId),
            ),
          );
        await admin.db
          .delete(contentVersions)
          .where(
            and(
              eq(contentVersions.id, secondContentVersionId),
              eq(contentVersions.contentId, secondContentId),
            ),
          );
        await admin.db.delete(accounts).where(eq(accounts.id, authorId));
        await admin.db.delete(accounts).where(eq(accounts.id, reviewerId));
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
