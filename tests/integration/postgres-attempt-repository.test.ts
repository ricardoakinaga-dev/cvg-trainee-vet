import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";

import {
  startAttempt,
  submitAttempt,
} from "../../packages/application/src/attempt-use-cases.js";
import { createPostgresDatabase } from "../../packages/persistence/src/database.js";
import { createAttemptUseCaseDependencies } from "../../packages/persistence/src/attempt-repository.js";
import {
  activityAssignments,
  attemptIdempotency,
  attempts,
  learningActivities,
  outboxEvents,
} from "../../packages/persistence/src/schema.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";
const databaseUrl = process.env.CVG_TEST_DATABASE_URL;
const adminDatabaseUrl = process.env.CVG_TEST_ADMIN_DATABASE_URL;

describe.skipIf(
  !runLiveDatabaseTests ||
    databaseUrl === undefined ||
    adminDatabaseUrl === undefined,
)("PostgreSQL attempt repository", () => {
  it("persists a transaction, idempotency snapshot, and submitted outbox event", async () => {
    if (databaseUrl === undefined || adminDatabaseUrl === undefined)
      throw new Error("application and admin database URLs are required");
    const database = createPostgresDatabase(databaseUrl);
    const adminDatabase = createPostgresDatabase(adminDatabaseUrl);
    const activityId = randomUUID();
    const participantId = randomUUID();
    const correlationId = randomUUID();
    let attemptId: string | null = null;

    try {
      await adminDatabase.db.insert(learningActivities).values({
        id: activityId,
        scopeId: randomUUID(),
        slug: `synthetic-${activityId}`,
        status: "PUBLISHED",
      });
      await adminDatabase.db.insert(activityAssignments).values({
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

      await adminDatabase.db
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
      const storedOutbox = await adminDatabase.db
        .select()
        .from(outboxEvents)
        .where(eq(outboxEvents.aggregateId, started.attemptId));
      const storedIdempotency = await adminDatabase.db
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
        await adminDatabase.db
          .delete(outboxEvents)
          .where(eq(outboxEvents.aggregateId, attemptId));
        await adminDatabase.db
          .delete(attemptIdempotency)
          .where(eq(attemptIdempotency.attemptId, attemptId));
        await adminDatabase.db
          .delete(attempts)
          .where(eq(attempts.id, attemptId));
      }
      await adminDatabase.db
        .delete(activityAssignments)
        .where(eq(activityAssignments.activityId, activityId));
      await adminDatabase.db
        .delete(learningActivities)
        .where(eq(learningActivities.id, activityId));
      await Promise.all([database.close(), adminDatabase.close()]);
    }
  });

  it("returns one winner and one conflict for concurrent open-attempt starts", async () => {
    if (databaseUrl === undefined || adminDatabaseUrl === undefined)
      throw new Error("application and admin database URLs are required");
    const database = createPostgresDatabase(databaseUrl);
    const adminDatabase = createPostgresDatabase(adminDatabaseUrl);
    const activityId = randomUUID();
    const participantId = randomUUID();
    let createdAttemptIds: readonly string[] = [];

    try {
      await adminDatabase.db.insert(learningActivities).values({
        id: activityId,
        scopeId: randomUUID(),
        slug: `synthetic-race-${activityId}`,
        status: "PUBLISHED",
      });
      await adminDatabase.db.insert(activityAssignments).values({
        participantId,
        activityId,
        status: "DISPONIVEL",
      });

      const dependencies = createAttemptUseCaseDependencies(
        database.db,
        randomUUID,
      );
      const settled = await Promise.allSettled([
        startAttempt(
          {
            participantId,
            activityId,
            idempotencyKey: `race-a-${activityId}`,
            correlationId: randomUUID(),
          },
          dependencies,
        ),
        startAttempt(
          {
            participantId,
            activityId,
            idempotencyKey: `race-b-${activityId}`,
            correlationId: randomUUID(),
          },
          dependencies,
        ),
      ]);
      const fulfilled = settled.filter(
        (
          result,
        ): result is PromiseFulfilledResult<
          Awaited<ReturnType<typeof startAttempt>>
        > => result.status === "fulfilled",
      );
      const rejected = settled.filter(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
      );
      createdAttemptIds = fulfilled.map((result) => result.value.attemptId);

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0]?.reason).toMatchObject({
        code: "state_conflict",
        status: 409,
      });
      const winningAttemptId = fulfilled[0]?.value.attemptId ?? null;
      expect(winningAttemptId).not.toBeNull();

      const storedAttempts = await adminDatabase.db
        .select()
        .from(attempts)
        .where(eq(attempts.activityId, activityId));
      const storedIdempotency = await adminDatabase.db
        .select()
        .from(attemptIdempotency)
        .where(eq(attemptIdempotency.attemptId, winningAttemptId as string));

      expect(storedAttempts).toHaveLength(1);
      expect(storedIdempotency).toHaveLength(1);
    } finally {
      if (createdAttemptIds.length > 0) {
        await adminDatabase.db
          .delete(attemptIdempotency)
          .where(inArray(attemptIdempotency.attemptId, createdAttemptIds));
        await adminDatabase.db
          .delete(attempts)
          .where(inArray(attempts.id, createdAttemptIds));
      }
      await adminDatabase.db
        .delete(activityAssignments)
        .where(eq(activityAssignments.activityId, activityId));
      await adminDatabase.db
        .delete(learningActivities)
        .where(eq(learningActivities.id, activityId));
      await Promise.all([database.close(), adminDatabase.close()]);
    }
  });
});
