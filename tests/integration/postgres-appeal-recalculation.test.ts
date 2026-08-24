import { randomUUID } from "node:crypto";

import { asc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { transitionAppealReviewState } from "../../packages/application/src/index.js";
import {
  createAppealRecalculationProcessor,
  createAppealReviewTransitionRepository,
} from "../../packages/persistence/src/index.js";
import {
  accounts,
  appealReviewHistory,
  appeals,
  assessmentResults,
  attempts,
  learningActivities,
  outboxEvents,
} from "../../packages/persistence/src/schema.js";
import {
  closeLivePostgresHarness,
  hasAdministrativeCleanupCapability,
  liveAdminCapabilityMessage,
  liveDatabaseUrl,
  openLivePostgresHarness,
} from "./live-postgres-harness.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";

describe.skipIf(!runLiveDatabaseTests || liveDatabaseUrl === undefined)(
  "PostgreSQL bounded appeal recalculation integration",
  () => {
    it("preserves the prior result, closes only after worker completion, and replays without duplication", async ({
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
      const reviewerId = randomUUID();
      const scopeId = randomUUID();
      const activityId = randomUUID();
      const attemptId = randomUUID();
      const appealId = randomUUID();
      const itemId = randomUUID();
      const initialResultId = randomUUID();
      const createdAt = new Date("2026-08-24T12:00:00.000Z");
      const decisionCorrelationId = randomUUID();

      try {
        await admin.db.insert(accounts).values([
          {
            id: participantId,
            professionalEmail: `appeal-recalc-participant-${participantId}@example.invalid`,
            status: "ACTIVE",
          },
          {
            id: reviewerId,
            professionalEmail: `appeal-recalc-reviewer-${reviewerId}@example.invalid`,
            status: "ACTIVE",
          },
        ]);
        await admin.db.insert(learningActivities).values({
          id: activityId,
          scopeId,
          slug: `appeal-recalc-activity-${activityId}`,
          title: "Atividade sintética de recálculo",
          status: "PUBLISHED",
        });
        await admin.db.insert(attempts).values({
          id: attemptId,
          participantId,
          activityId,
          status: "SUBMETIDA",
          version: 1,
          submittedAt: createdAt,
        });
        await admin.db.insert(assessmentResults).values({
          id: initialResultId,
          attemptId,
          version: 1,
          kind: "HUMANA",
          score: 82,
          outcome: "APROVADO",
          feedback: "Feedback sintético.",
          ruleVersion: "rubrica-sintetica-v1",
          correctedBy: reviewerId,
          correctedAt: createdAt,
        });
        await admin.db.insert(appeals).values({
          id: appealId,
          participantId,
          scopeId,
          attemptId,
          itemId,
          justification: "Justificativa sintética de recálculo.",
          createdAt,
          dueAt: new Date("2026-09-03T12:00:00.000Z"),
          version: 0,
          status: "ABERTA",
          reviewerId: null,
          decision: null,
          decisionRationale: null,
          decisionAt: null,
          decisionCorrelationId: null,
        });

        const repository = createAppealReviewTransitionRepository(database.db);
        await transitionAppealReviewState(
          {
            appealId,
            scopeId,
            actorId: reviewerId,
            version: 0,
            correlationId: randomUUID(),
            event: { type: "ATRIBUIR_REVISOR" },
          },
          repository,
        );
        await transitionAppealReviewState(
          {
            appealId,
            scopeId,
            actorId: reviewerId,
            version: 1,
            correlationId: decisionCorrelationId,
            event: {
              type: "DECIDIR",
              decision: "MANTER_RESULTADO",
              decisionRationale: "A decisão sintética mantém o resultado.",
            },
          },
          repository,
        );
        await transitionAppealReviewState(
          {
            appealId,
            scopeId,
            actorId: reviewerId,
            version: 2,
            correlationId: randomUUID(),
            event: { type: "SOLICITAR_RECALCULO" },
          },
          repository,
        );

        const pendingEvent = await admin.db
          .select()
          .from(outboxEvents)
          .where(eq(outboxEvents.aggregateId, appealId));
        expect(pendingEvent).toHaveLength(1);
        expect(pendingEvent[0]?.eventType).toBe(
          "appeal.recalculation.requested.v1",
        );

        const processor = createAppealRecalculationProcessor(database.db);
        const command = {
          appealId,
          scopeId,
          attemptId,
          appealVersion: 3,
          correlationId: decisionCorrelationId,
          now: "2026-08-24T12:03:00.000Z",
        } as const;
        await processor(command);
        await processor(command);

        const storedAppeal = await admin.db
          .select({ status: appeals.status, version: appeals.version })
          .from(appeals)
          .where(eq(appeals.id, appealId));
        expect(storedAppeal).toEqual([{ status: "ENCERRADA", version: 4 }]);

        const storedResults = await admin.db
          .select({
            version: assessmentResults.version,
            kind: assessmentResults.kind,
            score: assessmentResults.score,
            outcome: assessmentResults.outcome,
            feedback: assessmentResults.feedback,
            ruleVersion: assessmentResults.ruleVersion,
          })
          .from(assessmentResults)
          .where(eq(assessmentResults.attemptId, attemptId))
          .orderBy(asc(assessmentResults.version));
        expect(storedResults).toEqual([
          {
            version: 1,
            kind: "HUMANA",
            score: 82,
            outcome: "APROVADO",
            feedback: "Feedback sintético.",
            ruleVersion: "rubrica-sintetica-v1",
          },
          {
            version: 2,
            kind: "AUTOMATICA",
            score: 82,
            outcome: "APROVADO",
            feedback: "Feedback sintético.",
            ruleVersion: "appeal-recalculation-v1",
          },
        ]);

        const history = await admin.db
          .select({
            appealVersion: appealReviewHistory.appealVersion,
            eventType: appealReviewHistory.eventType,
          })
          .from(appealReviewHistory)
          .where(eq(appealReviewHistory.appealId, appealId))
          .orderBy(asc(appealReviewHistory.appealVersion));
        expect(history).toEqual([
          { appealVersion: 1, eventType: "ATRIBUIR_REVISOR" },
          { appealVersion: 2, eventType: "DECIDIR" },
          { appealVersion: 3, eventType: "SOLICITAR_RECALCULO" },
          { appealVersion: 4, eventType: "CONCLUIR_RECALCULO" },
        ]);
      } finally {
        // The history is append-only by design. This suite runs against a
        // disposable database, so retaining this synthetic aggregate is safer
        // than weakening the trigger for fixture cleanup.
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
