import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  authenticateSessionCookie,
  createSession,
  hashSessionToken,
  rotateSession,
  saveAnswer,
  startAttempt,
} from "../../packages/application/src/index.js";
import { createPostgresDatabase } from "../../packages/persistence/src/database.js";
import {
  createAnswerUseCaseDependencies,
  createAttemptUseCaseDependencies,
  createSessionRepository,
} from "../../packages/persistence/src/index.js";
import {
  accounts,
  answerIdempotency,
  answers,
  attemptIdempotency,
  auditEntries,
  activityAssignments,
  attempts,
  learningActivities,
  outboxEvents,
  sessions,
} from "../../packages/persistence/src/schema.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";
const databaseUrl = process.env.CVG_TEST_DATABASE_URL;

describe.skipIf(!runLiveDatabaseTests || databaseUrl === undefined)(
  "PostgreSQL answer, session, and audit integration",
  () => {
    it("persists SaveAnswer atomically, redacts events, and authenticates server sessions", async () => {
      if (databaseUrl === undefined)
        throw new Error("test database URL is required");
      const database = createPostgresDatabase(databaseUrl);
      const accountId = randomUUID();
      const activityId = randomUUID();
      const participantId = accountId;
      const scopeId = randomUUID();
      const itemId = randomUUID();
      let attemptId: string | null = null;
      const now = new Date("2026-08-09T17:00:00.000Z");

      try {
        await database.db.insert(accounts).values({
          id: accountId,
          professionalEmail: `synthetic-${accountId}@internal.invalid`,
          status: "ACTIVE",
        });
        await database.db.insert(learningActivities).values({
          id: activityId,
          scopeId,
          slug: `synthetic-answer-${activityId}`,
          status: "PUBLISHED",
        });
        await database.db.insert(activityAssignments).values({
          participantId,
          activityId,
          status: "DISPONIVEL",
        });

        const attemptDependencies = createAttemptUseCaseDependencies(
          database.db,
          randomUUID,
        );
        const answerDependencies = createAnswerUseCaseDependencies(
          database.db,
          randomUUID,
        );
        const started = await startAttempt(
          {
            participantId,
            activityId,
            idempotencyKey: `start-${activityId}`,
            correlationId: randomUUID(),
          },
          attemptDependencies,
        );
        attemptId = started.attemptId;
        const command = {
          attemptId,
          participantId,
          activityId,
          itemId,
          response: "resposta interna de teste",
          idempotencyKey: `answer-${activityId}`,
          correlationId: randomUUID(),
          savedAt: now.toISOString(),
        } as const;
        const saved = await saveAnswer(command, answerDependencies);
        const replay = await saveAnswer(command, answerDependencies);
        const storedAnswers = await database.db
          .select()
          .from(answers)
          .where(eq(answers.attemptId, attemptId));
        const storedIdempotency = await database.db
          .select()
          .from(answerIdempotency)
          .where(eq(answerIdempotency.key, command.idempotencyKey));
        const storedEvents = await database.db
          .select()
          .from(outboxEvents)
          .where(eq(outboxEvents.aggregateId, attemptId));

        expect(saved.attempt.status).toBe("SALVA");
        expect(replay).toEqual(saved);
        expect(storedAnswers).toHaveLength(1);
        expect(storedIdempotency).toHaveLength(1);
        expect(storedEvents).toHaveLength(1);
        expect(JSON.stringify(storedEvents[0]?.payload)).not.toContain(
          command.response,
        );

        const sessionRepository = createSessionRepository(database.db);
        const session = await createSession(
          {
            accountId,
            expiresInSeconds: 3600,
            roles: ["PARTICIPANT"],
            scopes: [scopeId],
          },
          sessionRepository,
          now,
        );
        const principal = await authenticateSessionCookie(
          session.cookie,
          sessionRepository,
          now,
        );
        expect(principal).toMatchObject({
          accountId,
          accountStatus: "ACTIVE",
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
        });
        const rotated = await rotateSession(
          session.cookie,
          {
            expiresInSeconds: 3600,
            tokenFactory: () => "rotated-session-token-1234567890abcdefgh",
          },
          sessionRepository,
          now,
        );
        expect(rotated).not.toBeNull();
        await expect(
          authenticateSessionCookie(session.cookie, sessionRepository, now),
        ).resolves.toBeNull();
        if (rotated === null) throw new Error("rotated session is required");
        await expect(
          authenticateSessionCookie(rotated.cookie, sessionRepository, now),
        ).resolves.toMatchObject({ accountId });
        await sessionRepository.revoke(hashSessionToken(rotated.token), now);
        await expect(
          authenticateSessionCookie(rotated.cookie, sessionRepository, now),
        ).resolves.toBeNull();

        const storedAudit = await database.db.transaction(
          async (transaction) => {
            await transaction.execute(
              sql`select set_config('cvg.audit_read', 'on', true)`,
            );
            return transaction
              .select()
              .from(auditEntries)
              .where(
                and(
                  eq(auditEntries.resourceId, attemptId as string),
                  eq(auditEntries.action, "ANSWER_SAVED"),
                ),
              );
          },
        );
        expect(storedAudit).toHaveLength(1);
        const auditId = storedAudit[0]?.id;
        if (auditId === undefined) throw new Error("audit row is required");
        await expect(
          database.db
            .update(auditEntries)
            .set({ action: "AUDIT_MUTATION_ATTEMPT" })
            .where(eq(auditEntries.id, auditId)),
        ).rejects.toThrow();
      } finally {
        if (attemptId !== null) {
          await database.db
            .delete(outboxEvents)
            .where(eq(outboxEvents.aggregateId, attemptId));
          await database.db
            .delete(answerIdempotency)
            .where(eq(answerIdempotency.attemptId, attemptId));
          await database.db
            .delete(attemptIdempotency)
            .where(eq(attemptIdempotency.attemptId, attemptId));
          await database.db
            .delete(answers)
            .where(eq(answers.attemptId, attemptId));
          await database.db.delete(attempts).where(eq(attempts.id, attemptId));
        }
        await database.db
          .delete(sessions)
          .where(eq(sessions.accountId, accountId));
        await database.db
          .delete(activityAssignments)
          .where(eq(activityAssignments.activityId, activityId));
        await database.db
          .delete(learningActivities)
          .where(eq(learningActivities.id, activityId));
        await database.db.delete(accounts).where(eq(accounts.id, accountId));
        await database.close();
      }
    });
  },
);
