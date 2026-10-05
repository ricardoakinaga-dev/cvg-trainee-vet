import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  advanceContent,
  type AdvanceContentCommand,
} from "../../packages/application/src/index.js";
import {
  accounts,
  auditEntries,
  createContentRepository,
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
    it("rejects publication under H-CONTENT and rolls back state, outbox and audit", async ({
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
        expect(harness.applicationRole).toMatchObject({
          isSuperuser: false,
          bypassesRls: false,
        });
        const held = await createContentRepository(admin.db).find(
          contentId,
          1,
          approverId,
        );
        expect(held).toMatchObject({
          publicationReady: false,
          publicationBlockReasons: expect.arrayContaining([
            "CLINICAL_PUBLICATION_HOLD_ACTIVE",
            "PUBLICATION_PREFLIGHT_NOT_READY",
          ]),
        });
        await expect(
          advanceContent(command, dependencies),
        ).rejects.toMatchObject({ code: "state_conflict" });
        // An administrative fixture may claim readiness; H-CONTENT still wins.
        await admin.db
          .update(contentEditorialRecords)
          .set({
            preflight: {
              ruleVersion: "authoring-preflight-v1",
              technicalChecksPassed: true,
              readyForClinicalReview: true,
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
          })
          .where(eq(contentEditorialRecords.id, editorialRecordId));
        const forged = await createContentRepository(admin.db).find(
          contentId,
          1,
          approverId,
        );
        expect(forged).toMatchObject({
          publicationReady: false,
          publicationBlockReasons: ["CLINICAL_PUBLICATION_HOLD_ACTIVE"],
        });
        await expect(
          advanceContent(command, dependencies),
        ).rejects.toMatchObject({ code: "state_conflict" });
        const stored = await admin.db
          .select({ status: contentVersions.status })
          .from(contentVersions)
          .where(eq(contentVersions.id, versionId));
        const events = await admin.db
          .select()
          .from(outboxEvents)
          .where(eq(outboxEvents.aggregateId, contentId));

        expect(stored).toEqual([{ status: "AUTORIZADO_PARA_PUBLICACAO" }]);
        expect(events).toHaveLength(0);
        expect(
          await admin.db
            .select()
            .from(auditEntries)
            .where(eq(auditEntries.resourceId, contentId)),
        ).toHaveLength(0);
        expect(
          await admin.db
            .select()
            .from(learningActivities)
            .where(eq(learningActivities.scopeId, scopeId)),
        ).toHaveLength(0);
        expect(
          await admin.db
            .select({ decision: contentReviewDecisions.decision })
            .from(contentReviewDecisions)
            .where(eq(contentReviewDecisions.contentId, contentId)),
        ).toEqual([{ decision: "APROVAR_CLINICAMENTE" }]);
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
