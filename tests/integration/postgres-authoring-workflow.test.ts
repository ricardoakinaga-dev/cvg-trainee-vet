import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  advanceContent,
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
    it("persists item-level review and blocks publication until all gates are closed", async () => {
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
          status: "EM_REVISAO_CLINICA",
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
        const persisted = await authoringRepository.find(contentId, 1);
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

        const reviews = await database.db
          .select({ decision: contentReviewDecisions.decision })
          .from(contentReviewDecisions)
          .where(eq(contentReviewDecisions.contentId, contentId));
        expect(reviews).toHaveLength(1);
        expect(reviews[0]?.decision).toBe("APROVAR_CLINICAMENTE");

        const stored = await createContentRepository(database.db).find(
          contentId,
          1,
        );
        expect(stored).toMatchObject({ publicationReady: true });
        expect(JSON.stringify(stored)).not.toContain("correctChoiceIds");
      } finally {
        await database.db
          .delete(outboxEvents)
          .where(eq(outboxEvents.aggregateId, contentId));
        await database.db
          .delete(contentReviewDecisions)
          .where(eq(contentReviewDecisions.contentId, contentId));
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
