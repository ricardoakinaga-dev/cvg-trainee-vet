import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  advanceContent,
  publishAuthoringContent,
  reviewAuthoringContent,
} from "../../packages/application/src/index.js";
import type {
  AdvanceContentCommand,
  AuthoringTransactionPort,
  AuthoringTransactionalOperations,
} from "../../packages/application/src/index.js";
import { createPostgresDatabase } from "../../packages/persistence/src/database.js";
import {
  accounts,
  activityAssignments,
  authoringWorkflowIdempotency,
  contentEditorialRecords,
  contentReviewDecisions,
  contentWithdrawalAffected,
  contentVersions,
  createAuthoringRepository,
  createAuthoringTransactionPort,
  createContentRepository,
  createContentUseCaseDependencies,
  learningActivities,
  learningActivityItems,
  outboxEvents,
} from "../../packages/persistence/src/index.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";
const databaseUrl = process.env.CVG_TEST_DATABASE_URL;
const adminDatabaseUrl = process.env.CVG_TEST_ADMIN_DATABASE_URL;

describe.skipIf(
  !runLiveDatabaseTests ||
    databaseUrl === undefined ||
    adminDatabaseUrl === undefined,
)("PostgreSQL authoring and clinical review integration", () => {
  it("persists source preflight with designated approver and rejects divergence before publication", async () => {
    if (databaseUrl === undefined || adminDatabaseUrl === undefined) {
      throw new Error("application and admin database URLs are required");
    }

    const database = createPostgresDatabase(databaseUrl);
    const adminDatabase = createPostgresDatabase(adminDatabaseUrl);
    const authorId = randomUUID();
    const reviewerId = randomUUID();
    const participantId = randomUUID();
    const contentId = randomUUID();
    const contentVersionId = randomUUID();
    const editorialRecordId = randomUUID();
    const scopeId = randomUUID();
    const requestId = randomUUID();
    const activityId = randomUUID();
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
          code: "BOOK_ETTINGER_9E",
          locator: "capítulo 123, seção de ressuscitação",
          updateRequired: false,
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
    const preflight = {
      ruleVersion: "authoring-preflight-v1" as const,
      technicalChecksPassed: true,
      readyForPublication: true,
      checks: {
        requiredFields: true,
        correctionMetadata: true,
        publicBoundary: true,
        sourceTraceability: true,
        publicationBlocked: false,
      },
      checkedAt: new Date().toISOString(),
    };

    try {
      await adminDatabase.db.insert(accounts).values([
        {
          id: authorId,
          professionalEmail: `${authorId}@example.invalid`,
          status: "ACTIVE",
          roles: ["AUTHOR"],
          scopes: [scopeId],
        },
        {
          id: reviewerId,
          professionalEmail: `${reviewerId}@example.invalid`,
          status: "ACTIVE",
          roles: ["CLINICAL_APPROVER"],
          scopes: [scopeId],
        },
        {
          id: participantId,
          professionalEmail: `${participantId}@example.invalid`,
          status: "ACTIVE",
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
        },
      ]);
      await adminDatabase.db.insert(contentVersions).values({
        id: contentVersionId,
        contentId,
        scopeId,
        version: 1,
        status: "PROJECAO_VERIFICADA",
        kind: "QUESTAO",
        title: bankItem.title,
        participantText: bankItem.prompt,
        responseMode: "CHOICE",
        participantOptions: bankItem.participant.choices,
        participantSelectionMode: "SINGLE",
      });
      await adminDatabase.db.insert(contentEditorialRecords).values({
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
      await adminDatabase.db.insert(learningActivities).values({
        id: activityId,
        scopeId,
        slug: `synthetic-withdrawal-${activityId}`,
        title: "Atividade sintética",
        status: "PUBLISHED",
      });
      await adminDatabase.db.insert(learningActivityItems).values({
        activityId,
        contentVersionId,
        ordinal: 1,
      });
      await adminDatabase.db.insert(activityAssignments).values({
        participantId,
        activityId,
        status: "DISPONIVEL",
      });

      const authoringRepository = createAuthoringRepository(database.db);
      const authoringTransaction = createAuthoringTransactionPort(
        database.db,
        randomUUID,
      );
      const faultAfterSecondTransition = (
        base: AuthoringTransactionPort,
      ): AuthoringTransactionPort => ({
        run: async <Result>(
          work: (
            operations: AuthoringTransactionalOperations,
          ) => Promise<Result>,
        ): Promise<Result> =>
          base.run(async (operations) => {
            let transitionCount = 0;
            const faultedOperations: AuthoringTransactionalOperations =
              Object.freeze({
                ...operations,
                transition: async (command: AdvanceContentCommand) => {
                  const result = await operations.transition(command);
                  transitionCount += 1;
                  if (transitionCount === 2) {
                    throw new Error("synthetic authoring transaction fault");
                  }
                  return result;
                },
              });
            return work(faultedOperations);
          }),
      });
      const contentDependencies = createContentUseCaseDependencies(
        database.db,
        randomUUID,
      );
      const reviewCommand = {
        principalId: reviewerId,
        accountStatus: "ACTIVE" as const,
        roles: ["CLINICAL_APPROVER"] as const,
        scopes: [scopeId],
        contentId,
        version: 1,
        scopeId,
        decision: "APROVAR_CLINICAMENTE" as const,
        rationale: "Revisão clínica sintética independente.",
        correlationId: requestId,
        idempotencyKey: `review-${contentId}-v1`,
        approvedClinicalApproverId: reviewerId,
      };

      await expect(
        reviewAuthoringContent(
          {
            ...reviewCommand,
            correlationId: randomUUID(),
            approvedClinicalApproverId: randomUUID(),
          },
          {
            repository: authoringRepository,
            transition: (command) =>
              advanceContent(command, contentDependencies),
            idFactory: randomUUID,
            transaction: authoringTransaction,
          },
        ),
      ).rejects.toMatchObject({ code: "forbidden" });
      const afterDivergentReview = await createContentRepository(
        database.db,
      ).find(contentId, 1);
      expect(afterDivergentReview).toMatchObject({
        status: "PROJECAO_VERIFICADA",
      });

      await expect(
        reviewAuthoringContent(
          { ...reviewCommand, correlationId: randomUUID() },
          {
            repository: authoringRepository,
            transition: (command) =>
              advanceContent(command, contentDependencies),
            idFactory: randomUUID,
            transaction: faultAfterSecondTransition(authoringTransaction),
          },
        ),
      ).rejects.toThrow("synthetic authoring transaction fault");

      const afterReviewFault = await createContentRepository(database.db).find(
        contentId,
        1,
      );
      expect(afterReviewFault).toMatchObject({
        status: "PROJECAO_VERIFICADA",
      });
      expect(
        await database.db
          .select({ id: contentReviewDecisions.id })
          .from(contentReviewDecisions)
          .where(eq(contentReviewDecisions.contentId, contentId)),
      ).toEqual([]);
      expect(
        await database.db
          .select({ id: outboxEvents.id })
          .from(outboxEvents)
          .where(eq(outboxEvents.aggregateId, contentId)),
      ).toEqual([]);

      const review = await reviewAuthoringContent(reviewCommand, {
        repository: authoringRepository,
        transition: (command) => advanceContent(command, contentDependencies),
        idFactory: randomUUID,
        transaction: authoringTransaction,
      });
      const replayedReview = await reviewAuthoringContent(reviewCommand, {
        repository: authoringRepository,
        transition: (command) => advanceContent(command, contentDependencies),
        idFactory: randomUUID,
        transaction: authoringTransaction,
      });
      expect(replayedReview).toEqual(review);
      expect(review.record.contentStatus).toBe("APROVADO_CLINICAMENTE");
      expect(
        await database.db
          .select({ id: contentReviewDecisions.id })
          .from(contentReviewDecisions)
          .where(eq(contentReviewDecisions.contentId, contentId)),
      ).toHaveLength(1);

      const publicationCommand = {
        principalId: authorId,
        accountStatus: "ACTIVE" as const,
        roles: ["AUTHOR"] as const,
        scopes: [scopeId],
        contentId,
        version: 1,
        scopeId,
        correlationId: randomUUID(),
        idempotencyKey: `publish-${contentId}-v1`,
        approvedClinicalApproverId: reviewerId,
      };
      await expect(
        publishAuthoringContent(publicationCommand, {
          repository: authoringRepository,
          transition: (command) => advanceContent(command, contentDependencies),
          transaction: faultAfterSecondTransition(authoringTransaction),
        }),
      ).rejects.toThrow("synthetic authoring transaction fault");
      const afterPublicationFault = await createContentRepository(
        database.db,
      ).find(contentId, 1);
      expect(afterPublicationFault).toMatchObject({
        status: "APROVADO_CLINICAMENTE",
      });

      const published = await publishAuthoringContent(
        {
          ...publicationCommand,
          correlationId: randomUUID(),
          approvedClinicalApproverId: randomUUID(),
        },
        {
          repository: authoringRepository,
          transition: (command) => advanceContent(command, contentDependencies),
          transaction: authoringTransaction,
        },
      );
      const replayedPublication = await publishAuthoringContent(
        publicationCommand,
        {
          repository: authoringRepository,
          transition: (command) => advanceContent(command, contentDependencies),
          transaction: authoringTransaction,
        },
      );
      expect(published.record.contentStatus).toBe("PUBLICADO");
      expect(replayedPublication).toEqual(published);
      const persisted = await authoringRepository.find(contentId, 1);
      expect(persisted?.correctChoiceIds).toEqual(["a"]);

      const stored = await createContentRepository(database.db).find(
        contentId,
        1,
      );
      expect(stored).toMatchObject({ publicationReady: true });
      const persistedReview =
        await authoringRepository.findLatestClinicalReview(contentId, 1);
      expect(persistedReview).toMatchObject({
        reviewerId,
        decision: "APROVAR_CLINICAMENTE",
      });
      expect(JSON.stringify(stored)).not.toContain("correctChoiceIds");

      const retired = await advanceContent(
        {
          principalId: reviewerId,
          accountStatus: "ACTIVE",
          roles: ["CLINICAL_APPROVER"],
          scopes: [scopeId],
          contentId,
          version: 1,
          scopeId,
          event: "RETIRAR",
          withdrawalReasonCode: "ERRO_CONTEUDO",
          approvedClinicalApproverId: reviewerId,
          correlationId: randomUUID(),
        },
        contentDependencies,
      );
      expect(retired).toMatchObject({
        status: "RETIRADO",
        withdrawalReasonCode: "ERRO_CONTEUDO",
        affectedParticipantCount: 1,
      });
      const affected = await database.db
        .select({ participantId: contentWithdrawalAffected.participantId })
        .from(contentWithdrawalAffected)
        .where(eq(contentWithdrawalAffected.contentId, contentId));
      expect(affected).toEqual([{ participantId }]);
      const workflowEvents = await database.db
        .select({ eventType: outboxEvents.eventType })
        .from(outboxEvents)
        .where(eq(outboxEvents.aggregateId, contentId));
      expect(workflowEvents.map((event) => event.eventType)).toEqual(
        expect.arrayContaining([
          "content.published.v1",
          "content.withdrawn.v1",
        ]),
      );
    } finally {
      await adminDatabase.db
        .delete(contentWithdrawalAffected)
        .where(eq(contentWithdrawalAffected.contentId, contentId));
      await adminDatabase.db
        .delete(activityAssignments)
        .where(eq(activityAssignments.activityId, activityId));
      await adminDatabase.db
        .delete(learningActivityItems)
        .where(eq(learningActivityItems.activityId, activityId));
      await adminDatabase.db
        .delete(learningActivities)
        .where(eq(learningActivities.id, activityId));
      await adminDatabase.db
        .delete(contentReviewDecisions)
        .where(eq(contentReviewDecisions.contentId, contentId));
      await adminDatabase.db
        .delete(authoringWorkflowIdempotency)
        .where(eq(authoringWorkflowIdempotency.contentId, contentId));
      await adminDatabase.db
        .delete(outboxEvents)
        .where(eq(outboxEvents.aggregateId, contentId));
      await adminDatabase.db
        .delete(contentEditorialRecords)
        .where(eq(contentEditorialRecords.id, editorialRecordId));
      await adminDatabase.db
        .delete(contentVersions)
        .where(
          and(
            eq(contentVersions.id, contentVersionId),
            eq(contentVersions.contentId, contentId),
          ),
        );
      await adminDatabase.db.delete(accounts).where(eq(accounts.id, authorId));
      await adminDatabase.db
        .delete(accounts)
        .where(eq(accounts.id, reviewerId));
      await adminDatabase.db
        .delete(accounts)
        .where(eq(accounts.id, participantId));
      await database.close();
      await adminDatabase.close();
    }
  });
});
