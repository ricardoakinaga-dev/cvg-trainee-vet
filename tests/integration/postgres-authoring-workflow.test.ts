import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  advanceContent,
  publishAuthoringContent,
  reviewAuthoringContent,
} from "../../packages/application/src/index.js";
import { createPostgresDatabase } from "../../packages/persistence/src/database.js";
import {
  accounts,
  contentEditorialRecords,
  contentReviewDecisions,
  contentVersions,
  createAuthoringRepository,
  createContentRepository,
  createContentUseCaseDependencies,
  outboxEvents,
} from "../../packages/persistence/src/index.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";
const databaseUrl = process.env.CVG_TEST_DATABASE_URL;

describe.skipIf(!runLiveDatabaseTests || databaseUrl === undefined)(
  "PostgreSQL authoring and clinical review integration",
  () => {
    it("persists source preflight, independent clinical approval, and publication", async () => {
      if (databaseUrl === undefined)
        throw new Error("test database URL is required");

      const database = createPostgresDatabase(databaseUrl);
      const authorId = randomUUID();
      const reviewerId = randomUUID();
      const contentId = randomUUID();
      const contentVersionId = randomUUID();
      const editorialRecordId = randomUUID();
      const scopeId = randomUUID();
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
        await database.db.insert(accounts).values([
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
        await database.db.insert(contentVersions).values({
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
        await database.db.insert(contentEditorialRecords).values({
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
        const review = await reviewAuthoringContent(
          {
            principalId: reviewerId,
            accountStatus: "ACTIVE",
            roles: ["CLINICAL_APPROVER"],
            scopes: [scopeId],
            contentId,
            version: 1,
            scopeId,
            decision: "APROVAR_CLINICAMENTE",
            rationale: "Revisão clínica sintética independente.",
            correlationId: requestId,
          },
          {
            repository: authoringRepository,
            transition: (command) =>
              advanceContent(command, contentDependencies),
            idFactory: randomUUID,
          },
        );
        expect(review.record.contentStatus).toBe("APROVADO_CLINICAMENTE");

        const published = await publishAuthoringContent(
          {
            principalId: authorId,
            accountStatus: "ACTIVE",
            roles: ["AUTHOR"],
            scopes: [scopeId],
            contentId,
            version: 1,
            scopeId,
            correlationId: requestId,
          },
          {
            repository: authoringRepository,
            transition: (command) =>
              advanceContent(command, contentDependencies),
          },
        );

        expect(published.record.contentStatus).toBe("PUBLICADO");
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
      } finally {
        await database.db
          .delete(contentReviewDecisions)
          .where(eq(contentReviewDecisions.contentId, contentId));
        await database.db
          .delete(outboxEvents)
          .where(eq(outboxEvents.aggregateId, contentId));
        await database.db
          .delete(contentEditorialRecords)
          .where(eq(contentEditorialRecords.id, editorialRecordId));
        await database.db
          .delete(contentVersions)
          .where(
            and(
              eq(contentVersions.id, contentVersionId),
              eq(contentVersions.contentId, contentId),
            ),
          );
        await database.db.delete(accounts).where(eq(accounts.id, authorId));
        await database.db.delete(accounts).where(eq(accounts.id, reviewerId));
        await database.close();
      }
    });
  },
);
