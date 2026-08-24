import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { transitionAppealReviewState } from "../../packages/application/src/index.js";
import { createAppealReviewTransitionRepository } from "../../packages/persistence/src/index.js";
import {
  accounts,
  appealReviewHistory,
  appeals,
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
  "PostgreSQL appeal review transition integration",
  () => {
    it("binds transitions to reviewer context and denies an unscoped mutation", async ({
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
      const otherScopeId = randomUUID();
      const activityId = randomUUID();
      const attemptId = randomUUID();
      const appealId = randomUUID();
      const itemId = randomUUID();
      const decisionCorrelationId = randomUUID();
      const createdAt = new Date("2026-08-24T12:00:00.000Z");

      try {
        await admin.db.insert(accounts).values([
          {
            id: participantId,
            professionalEmail: `appeal-transition-participant-${participantId}@example.invalid`,
            status: "ACTIVE",
          },
          {
            id: reviewerId,
            professionalEmail: `appeal-transition-reviewer-${reviewerId}@example.invalid`,
            status: "ACTIVE",
          },
        ]);
        await admin.db.insert(learningActivities).values({
          id: activityId,
          scopeId,
          slug: `appeal-transition-activity-${activityId}`,
          title: "Atividade sintética de transição de contestação",
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
        await admin.db.insert(appeals).values({
          id: appealId,
          participantId,
          scopeId,
          attemptId,
          itemId,
          justification: "Justificativa sintética de transição.",
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
        await expect(
          transitionAppealReviewState(
            {
              appealId,
              scopeId,
              actorId: reviewerId,
              version: 0,
              correlationId: randomUUID(),
              event: { type: "ATRIBUIR_REVISOR" },
            },
            repository,
          ),
        ).resolves.toMatchObject({
          status: "EM_REVISAO",
          reviewerId,
          version: 1,
        });

        await expect(
          transitionAppealReviewState(
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
          ),
        ).resolves.toMatchObject({
          status: "DECIDIDA",
          decision: "MANTER_RESULTADO",
          version: 2,
        });

        await expect(
          transitionAppealReviewState(
            {
              appealId,
              scopeId,
              actorId: reviewerId,
              version: 2,
              correlationId: randomUUID(),
              event: { type: "SOLICITAR_RECALCULO" },
            },
            repository,
          ),
        ).resolves.toMatchObject({ status: "RECALCULO_PENDENTE", version: 3 });

        await expect(
          repository.findAppealForReview({ scopeId: otherScopeId }, appealId),
        ).resolves.toBeNull();

        if (
          !database.applicationRole.isSuperuser &&
          !database.applicationRole.bypassesRls
        ) {
          const noContextRows = await database.db.transaction((tx) =>
            tx.execute(sql`select id from appeals where id = ${appealId}`),
          );
          expect(noContextRows).toHaveLength(0);
        }

        const persisted = await admin.db
          .select({
            status: appeals.status,
            version: appeals.version,
            decisionRationale: appeals.decisionRationale,
            decisionAt: appeals.decisionAt,
            decisionCorrelationId: appeals.decisionCorrelationId,
          })
          .from(appeals)
          .where(eq(appeals.id, appealId))
          .limit(1);
        expect(persisted[0]).toMatchObject({
          status: "RECALCULO_PENDENTE",
          version: 3,
          decisionRationale: "A decisão sintética mantém o resultado.",
          decisionCorrelationId,
        });
      } finally {
        await admin.db
          .delete(outboxEvents)
          .where(eq(outboxEvents.aggregateId, appealId));
        await admin.db
          .delete(appealReviewHistory)
          .where(eq(appealReviewHistory.appealId, appealId));
        await admin.db.delete(appeals).where(eq(appeals.id, appealId));
        await admin.db.delete(attempts).where(eq(attempts.id, attemptId));
        await admin.db
          .delete(learningActivities)
          .where(
            and(
              eq(learningActivities.id, activityId),
              eq(learningActivities.scopeId, scopeId),
            ),
          );
        await admin.db
          .delete(accounts)
          .where(
            and(eq(accounts.id, participantId), eq(accounts.status, "ACTIVE")),
          );
        await admin.db
          .delete(accounts)
          .where(
            and(eq(accounts.id, reviewerId), eq(accounts.status, "ACTIVE")),
          );
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
