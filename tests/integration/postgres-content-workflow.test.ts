import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  advanceContent,
  type AdvanceContentCommand,
} from "../../packages/application/src/index.js";
import {
  accounts,
  contentVersions,
  contentEditorialRecords,
  contentReviewDecisions,
  createContentUseCaseDependencies,
  learningActivities,
  learningActivityItems,
  outboxEvents,
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
  "PostgreSQL content workflow integration",
  () => {
    it("persists an authorized publication transition and a redacted outbox event", async ({
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
      const contentId = randomUUID();
      const versionId = randomUUID();
      const scopeId = randomUUID();
      const correlationId = randomUUID();
      const approverId = randomUUID();
      const editorialRecordId = randomUUID();

      try {
        await admin.db.insert(accounts).values({
          id: approverId,
          professionalEmail: `${approverId}@example.invalid`,
          status: "ACTIVE",
        });
        await admin.db.insert(contentVersions).values({
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
        await admin.db.insert(contentEditorialRecords).values({
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
              { code: "F-02", locator: "interno", updateRequired: true },
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
          },
        });
        await admin.db.insert(contentReviewDecisions).values({
          contentEditorialRecordId: editorialRecordId,
          contentVersionId: versionId,
          contentId,
          version: 1,
          scopeId,
          reviewerId: approverId,
          decision: "APROVAR_CLINICAMENTE",
          rationale: "Revisão sintética.",
          correlationId,
          reviewedAt: new Date(),
        });

        const command: AdvanceContentCommand = {
          principalId: approverId,
          accountStatus: "ACTIVE",
          roles: ["CLINICAL_APPROVER"],
          scopes: [scopeId],
          approvedClinicalApproverId: approverId,
          contentId,
          version: 1,
          scopeId,
          event: "PUBLICAR",
          correlationId,
        };
        const dependencies = createContentUseCaseDependencies(
          database.db,
          randomUUID,
        );
        const published = await advanceContent(command, dependencies);
        const stored = await admin.db
          .select({ status: contentVersions.status })
          .from(contentVersions)
          .where(eq(contentVersions.id, versionId));
        const events = await admin.db
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
        await admin.db
          .delete(outboxEvents)
          .where(eq(outboxEvents.aggregateId, contentId));
        await admin.db
          .delete(contentReviewDecisions)
          .where(eq(contentReviewDecisions.contentId, contentId));
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
        await admin.db
          .delete(contentEditorialRecords)
          .where(eq(contentEditorialRecords.id, editorialRecordId));
        await admin.db
          .delete(contentVersions)
          .where(eq(contentVersions.id, versionId));
        await admin.db.delete(accounts).where(eq(accounts.id, approverId));
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
