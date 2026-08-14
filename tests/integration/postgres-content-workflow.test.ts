import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  advanceContent,
  type AdvanceContentCommand,
} from "../../packages/application/src/index.js";
import { createPostgresDatabase } from "../../packages/persistence/src/database.js";
import {
  accounts,
  contentVersions,
  contentEditorialRecords,
  contentReviewDecisions,
  createContentUseCaseDependencies,
  outboxEvents,
} from "../../packages/persistence/src/index.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";
const databaseUrl = process.env.CVG_TEST_DATABASE_URL;

describe.skipIf(!runLiveDatabaseTests || databaseUrl === undefined)(
  "PostgreSQL content workflow integration",
  () => {
    it("persists an authorized publication transition and a redacted outbox event", async () => {
      if (databaseUrl === undefined)
        throw new Error("test database URL is required");

      const database = createPostgresDatabase(databaseUrl);
      const contentId = randomUUID();
      const versionId = randomUUID();
      const scopeId = randomUUID();
      const correlationId = randomUUID();
      const approverId = randomUUID();
      const editorialRecordId = randomUUID();
      const reviewDecisionId = randomUUID();

      try {
        await database.db.insert(accounts).values({
          id: approverId,
          professionalEmail: `${approverId}@example.invalid`,
          status: "ACTIVE",
        });
        await database.db.insert(contentVersions).values({
          id: versionId,
          contentId,
          scopeId,
          version: 1,
          status: "AUTORIZADO_PARA_PUBLICACAO",
          kind: "LEITURA",
          title: "Conteúdo sintético",
          participantText: "Texto autoral sintético.",
          responseMode: "NONE",
        });
        await database.db.insert(contentEditorialRecords).values({
          id: editorialRecordId,
          contentVersionId: versionId,
          contentId,
          scopeId,
          version: 1,
          moduleId: "M02",
          sessionId: "M02-S1",
          objectiveId: "M02-OBJ-01",
          authorId: approverId,
          item: {
            title: "Conteúdo sintético",
            prompt: "Texto sintético de revisão.",
            responseMode: "TEXT",
            rubric: {
              dimensions: [
                {
                  id: "clarity",
                  label: "clareza",
                  description: "Explica o ponto principal.",
                  maxPoints: 2,
                },
              ],
              passScore: 1,
              criticalErrors: ["omitir o ponto principal"],
            },
            feedback: "Feedback sintético.",
            critical: false,
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
              kind: "CASO",
              title: "Conteúdo sintético",
              prompt: "Texto sintético de revisão.",
              responseMode: "TEXT",
            },
          },
          preflight: {
            ruleVersion: "authoring-preflight-v1",
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
          },
        });
        await database.db.insert(contentReviewDecisions).values({
          id: reviewDecisionId,
          contentEditorialRecordId: editorialRecordId,
          contentVersionId: versionId,
          contentId,
          version: 1,
          scopeId,
          reviewerId: approverId,
          decision: "APROVAR_CLINICAMENTE",
          rationale: "Aprovação clínica sintética para teste de integração.",
          correlationId,
          reviewedAt: new Date("2026-08-10T12:00:00.000Z"),
        });
        const command: AdvanceContentCommand = {
          principalId: approverId,
          accountStatus: "ACTIVE",
          roles: ["AUTHOR"],
          scopes: [scopeId],
          approvedClinicalApproverId: approverId,
          contentId,
          version: 1,
          scopeId,
          event: "PUBLICAR",
          correlationId,
          approvedClinicalReviewerId: approverId,
        };
        const dependencies = createContentUseCaseDependencies(
          database.db,
          randomUUID,
        );
        const published = await advanceContent(command, dependencies);
        const stored = await database.db
          .select({ status: contentVersions.status })
          .from(contentVersions)
          .where(eq(contentVersions.id, versionId));
        const events = await database.db
          .select()
          .from(outboxEvents)
          .where(eq(outboxEvents.aggregateId, contentId));

        expect(published.status).toBe("PUBLICADO");
        expect(stored[0]?.status).toBe("PUBLICADO");
        expect(events).toHaveLength(1);
        expect(events[0]?.eventType).toBe("content.published.v1");
        expect(JSON.stringify(events[0]?.payload)).not.toContain(
          "participantText",
        );
      } finally {
        await database.db
          .delete(outboxEvents)
          .where(eq(outboxEvents.aggregateId, contentId));
        await database.db
          .delete(contentReviewDecisions)
          .where(eq(contentReviewDecisions.id, reviewDecisionId));
        await database.db
          .delete(contentEditorialRecords)
          .where(eq(contentEditorialRecords.id, editorialRecordId));
        await database.db
          .delete(contentVersions)
          .where(eq(contentVersions.id, versionId));
        await database.db.delete(accounts).where(eq(accounts.id, approverId));
        await database.close();
      }
    });
  },
);
