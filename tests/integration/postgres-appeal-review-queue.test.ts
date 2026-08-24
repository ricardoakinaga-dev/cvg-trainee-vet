import { randomUUID } from "node:crypto";

import { and, eq, inArray, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createAppealReviewQueueRepository } from "../../packages/persistence/src/index.js";
import {
  accounts,
  appeals,
  attempts,
  learningActivities,
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
  "PostgreSQL appeal review queue integration",
  () => {
    it("reads only scoped queue metadata through the reviewer context", async ({
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
      const appealIds = [randomUUID(), randomUUID(), randomUUID()];
      const createdAt = new Date("2026-08-23T10:00:00.000Z");

      try {
        await admin.db.insert(accounts).values([
          {
            id: participantId,
            professionalEmail: `appeal-queue-participant-${participantId}@example.invalid`,
            status: "ACTIVE",
          },
          {
            id: reviewerId,
            professionalEmail: `appeal-queue-reviewer-${reviewerId}@example.invalid`,
            status: "ACTIVE",
          },
        ]);
        await admin.db.insert(learningActivities).values({
          id: activityId,
          scopeId,
          slug: `appeal-queue-activity-${activityId}`,
          title: "Atividade sintética de contestação",
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
        await admin.db.insert(appeals).values([
          {
            id: appealIds[0]!,
            participantId,
            scopeId,
            attemptId,
            itemId: randomUUID(),
            justification: "Justificativa sintética aberta.",
            createdAt,
            dueAt: new Date("2026-08-24T10:00:00.000Z"),
            version: 0,
            status: "ABERTA",
            reviewerId: null,
            decision: null,
            decisionRationale: null,
            decisionAt: null,
            decisionCorrelationId: null,
          },
          {
            id: appealIds[1]!,
            participantId,
            scopeId,
            attemptId,
            itemId: randomUUID(),
            justification: "Justificativa sintética em revisão.",
            createdAt: new Date("2026-08-23T11:00:00.000Z"),
            dueAt: new Date("2026-08-25T10:00:00.000Z"),
            version: 1,
            status: "EM_REVISAO",
            reviewerId,
            decision: null,
            decisionRationale: null,
            decisionAt: null,
            decisionCorrelationId: null,
          },
          {
            id: appealIds[2]!,
            participantId,
            scopeId: otherScopeId,
            attemptId,
            itemId: randomUUID(),
            justification: "Justificativa sintética de outro escopo.",
            createdAt,
            dueAt: new Date("2026-08-24T09:00:00.000Z"),
            version: 0,
            status: "ABERTA",
            reviewerId: null,
            decision: null,
            decisionRationale: null,
            decisionAt: null,
            decisionCorrelationId: null,
          },
        ]);

        const repository = createAppealReviewQueueRepository(database.db);
        const queue = await repository.listAppeals({ scopeId, limit: 50 });
        expect(queue).toHaveLength(2);
        expect(queue.map((record) => record.state.appealId)).toEqual([
          appealIds[0],
          appealIds[1],
        ]);
        expect(queue.every((record) => record.scopeId === scopeId)).toBe(true);
        expect(JSON.stringify(queue)).not.toContain("answer");
        expect(JSON.stringify(queue)).not.toContain("sourceRefs");
        expect(JSON.stringify(queue)).not.toContain("prompt");

        const otherScopeQueue = await repository.listAppeals({
          scopeId: otherScopeId,
          limit: 50,
        });
        expect(otherScopeQueue).toHaveLength(1);
        expect(otherScopeQueue[0]?.state.appealId).toBe(appealIds[2]);

        const closedAppealId = randomUUID();
        await admin.db.insert(appeals).values({
          id: closedAppealId,
          participantId,
          scopeId,
          attemptId,
          itemId: randomUUID(),
          justification: "Justificativa sintética encerrada.",
          createdAt,
          dueAt: new Date("2026-08-26T10:00:00.000Z"),
          version: 2,
          status: "ENCERRADA",
          reviewerId,
          decision: "MANTER_RESULTADO",
          decisionRationale: "A decisão sintética mantém o resultado.",
          decisionAt: new Date("2026-08-24T12:01:00.000Z"),
          decisionCorrelationId: randomUUID(),
        });
        const closedQueue = await repository.listAppeals({
          scopeId,
          status: "ENCERRADA",
          limit: 50,
        });
        expect(closedQueue).toHaveLength(1);
        expect(closedQueue[0]?.state.appealId).toBe(closedAppealId);

        if (
          !harness.applicationRole.isSuperuser &&
          !harness.applicationRole.bypassesRls
        ) {
          const noContextRows = await database.db.transaction((tx) =>
            tx.execute(sql`select id from appeals where scope_id = ${scopeId}`),
          );
          expect(noContextRows).toHaveLength(0);
        }
      } finally {
        await admin.db
          .delete(appeals)
          .where(
            and(
              eq(appeals.participantId, participantId),
              inArray(appeals.scopeId, [scopeId, otherScopeId]),
            ),
          );
        await admin.db.delete(attempts).where(eq(attempts.id, attemptId));
        await admin.db
          .delete(learningActivities)
          .where(eq(learningActivities.id, activityId));
        await admin.db
          .delete(accounts)
          .where(inArray(accounts.id, [participantId, reviewerId]));
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
