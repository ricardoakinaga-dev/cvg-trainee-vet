import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import {
  startAttempt,
  submitAttempt,
} from "../../packages/application/src/attempt-use-cases.js";
import { createAttemptUseCaseDependencies } from "../../packages/persistence/src/attempt-repository.js";
import {
  activityAssignments,
  attemptIdempotency,
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
  "PostgreSQL attempt repository",
  () => {
    it("persists a transaction, idempotency snapshot, and submitted outbox event", async ({
      skip,
    }) => {
      const harness = await openLivePostgresHarness();
      if (!hasAdministrativeCleanupCapability(harness.adminRole)) {
        await closeLivePostgresHarness(harness);
        skip(liveAdminCapabilityMessage);
        return;
      }
      const { application: database, admin } = harness;
      const activityId = randomUUID();
      const participantId = randomUUID();
      const correlationId = randomUUID();
      let attemptId: string | null = null;

      try {
        await admin.db.insert(learningActivities).values({
          id: activityId,
          scopeId: randomUUID(),
          slug: `synthetic-${activityId}`,
          status: "PUBLISHED",
        });
        await admin.db.insert(activityAssignments).values({
          participantId,
          activityId,
          status: "DISPONIVEL",
        });

        const dependencies = createAttemptUseCaseDependencies(
          database.db,
          randomUUID,
        );
        const started = await startAttempt(
          {
            participantId,
            activityId,
            idempotencyKey: `start-${activityId}`,
            correlationId,
          },
          dependencies,
        );
        attemptId = started.attemptId;

        await admin.db
          .update(attempts)
          .set({ status: "SALVA", version: 2 })
          .where(eq(attempts.id, started.attemptId));

        const command = {
          attemptId: started.attemptId,
          participantId,
          idempotencyKey: `submit-${activityId}`,
          correlationId,
          submittedAt: "2026-08-09T17:00:00.000Z",
        } as const;
        const submitted = await submitAttempt(command, dependencies);
        const replay = await submitAttempt(command, dependencies);
        const storedOutbox = await admin.db
          .select()
          .from(outboxEvents)
          .where(eq(outboxEvents.aggregateId, started.attemptId));
        const storedIdempotency = await admin.db
          .select()
          .from(attemptIdempotency)
          .where(eq(attemptIdempotency.key, command.idempotencyKey));

        expect(submitted.status).toBe("SUBMETIDA");
        expect(replay).toEqual(submitted);
        expect(storedOutbox).toHaveLength(1);
        expect(storedOutbox[0]?.eventType).toBe("attempt.submitted.v1");
        expect(storedIdempotency).toHaveLength(1);
      } finally {
        if (attemptId !== null) {
          await admin.db
            .delete(outboxEvents)
            .where(eq(outboxEvents.aggregateId, attemptId));
          await admin.db
            .delete(attemptIdempotency)
            .where(eq(attemptIdempotency.attemptId, attemptId));
          await admin.db.delete(attempts).where(eq(attempts.id, attemptId));
        }
        await admin.db
          .delete(activityAssignments)
          .where(eq(activityAssignments.activityId, activityId));
        await admin.db
          .delete(learningActivities)
          .where(eq(learningActivities.id, activityId));
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
