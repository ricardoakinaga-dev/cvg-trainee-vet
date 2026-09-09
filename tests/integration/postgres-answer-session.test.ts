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
import {
  createAnswerUseCaseDependencies,
  createAttemptUseCaseDependencies,
  createSessionRepository,
} from "../../packages/persistence/src/index.js";
import {
  accountInvitations,
  accounts,
  answerIdempotency,
  answers,
  attemptIdempotency,
  auditEntries,
  activityAssignments,
  attempts,
  contentVersions,
  learningAssignments,
  learningActivityItems,
  learningActivities,
  outboxEvents,
  sessions,
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
  "PostgreSQL answer, session, and audit integration",
  () => {
    it("persists SaveAnswer atomically, redacts events, and authenticates server sessions", async ({
      skip,
    }) => {
      const harness = await openLivePostgresHarness();
      if (!hasAdministrativeCleanupCapability(harness.adminRole)) {
        await closeLivePostgresHarness(harness);
        skip(liveAdminCapabilityMessage);
        return;
      }
      const { application: database, admin } = harness;
      const accountId = randomUUID();
      const activityId = randomUUID();
      const participantId = accountId;
      const scopeId = randomUUID();
      const itemId = randomUUID();
      const contentVersionId = itemId;
      const contentId = randomUUID();
      const invitationId = randomUUID();
      const assignmentId = randomUUID();
      let attemptId: string | null = null;
      const now = new Date("2026-08-09T17:00:00.000Z");

      try {
        await admin.db.insert(accounts).values({
          id: accountId,
          professionalEmail: `synthetic-${accountId}@internal.invalid`,
          status: "ACTIVE",
        });
        await admin.db.insert(accountInvitations).values({
          id: invitationId,
          accountId,
          tokenHash: "a".repeat(64),
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
          expiresAt: new Date("2027-08-09T17:00:00.000Z"),
          acceptedAt: new Date("2026-08-09T16:00:00.000Z"),
          createdBy: accountId,
        });
        await admin.db.insert(learningActivities).values({
          id: activityId,
          scopeId,
          slug: `synthetic-answer-${activityId}`,
          moduleId: "M01",
          status: "PUBLISHED",
        });
        await admin.db.insert(contentVersions).values({
          id: contentVersionId,
          contentId,
          scopeId,
          version: 1,
          status: "PUBLICADO",
          kind: "QUESTAO",
          title: "Questão sintética",
          participantText: "Responda em texto.",
          responseMode: "TEXT",
        });
        await admin.db.insert(learningActivityItems).values({
          activityId,
          contentVersionId,
          ordinal: 1,
        });
        await admin.db.insert(learningAssignments).values({
          id: assignmentId,
          participantId,
          scopeId,
          moduleId: "M01",
          availableAt: now,
          status: "DISPONIVEL",
          version: 0,
        });
        await admin.db.insert(activityAssignments).values({
          participantId,
          activityId,
          learningAssignmentId: assignmentId,
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
            scopeId,
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
          scopeId,
          itemId,
          response: "resposta interna de teste",
          idempotencyKey: `answer-${activityId}`,
          correlationId: randomUUID(),
          savedAt: now.toISOString(),
        } as const;
        const saved = await saveAnswer(command, answerDependencies);
        const replay = await saveAnswer(command, answerDependencies);
        const storedAnswers = await admin.db
          .select()
          .from(answers)
          .where(eq(answers.attemptId, attemptId));
        const storedIdempotency = await admin.db
          .select()
          .from(answerIdempotency)
          .where(eq(answerIdempotency.key, command.idempotencyKey));
        const storedEvents = await admin.db
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

        const storedAudit = await admin.db.transaction(async (transaction) => {
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
        });
        expect(storedAudit).toHaveLength(1);
        const auditId = storedAudit[0]?.id;
        if (auditId === undefined) throw new Error("audit row is required");
        await expect(
          admin.db
            .update(auditEntries)
            .set({ action: "AUDIT_MUTATION_ATTEMPT" })
            .where(eq(auditEntries.id, auditId)),
        ).rejects.toThrow();
      } finally {
        if (attemptId !== null) {
          await admin.db
            .delete(outboxEvents)
            .where(eq(outboxEvents.aggregateId, attemptId));
          await admin.db
            .delete(answerIdempotency)
            .where(eq(answerIdempotency.attemptId, attemptId));
          await admin.db
            .delete(attemptIdempotency)
            .where(eq(attemptIdempotency.attemptId, attemptId));
          await admin.db
            .delete(answers)
            .where(eq(answers.attemptId, attemptId));
          await admin.db.delete(attempts).where(eq(attempts.id, attemptId));
        }
        await admin.db
          .delete(sessions)
          .where(eq(sessions.accountId, accountId));
        await admin.db
          .delete(activityAssignments)
          .where(eq(activityAssignments.activityId, activityId));
        await admin.db
          .delete(learningAssignments)
          .where(eq(learningAssignments.id, assignmentId));
        await admin.db
          .delete(learningActivityItems)
          .where(eq(learningActivityItems.activityId, activityId));
        await admin.db
          .delete(learningActivities)
          .where(eq(learningActivities.id, activityId));
        await admin.db
          .delete(contentVersions)
          .where(eq(contentVersions.id, contentVersionId));
        await admin.db
          .delete(accountInvitations)
          .where(eq(accountInvitations.id, invitationId));
        await admin.db.delete(accounts).where(eq(accounts.id, accountId));
        await closeLivePostgresHarness(harness);
      }
    });

    it("converges concurrent identical answer idempotency stores without a primary-key race", async ({
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
      const scopeId = randomUUID();
      const attemptId = randomUUID();
      const answerId = randomUUID();
      const itemId = randomUUID();
      const idempotencyKey = `answer-race-${answerId}`;
      const savedAt = new Date("2026-08-09T17:00:00.000Z");
      const record = {
        fingerprint: "answer-fingerprint-race",
        result: {
          attempt: {
            attemptId,
            participantId,
            activityId,
            status: "SALVA" as const,
            version: 1,
          },
          answer: {
            answerId,
            attemptId,
            itemId,
            response: "resposta interna de concorrência",
            savedAt: savedAt.toISOString(),
          },
        },
      };

      try {
        await admin.db.insert(learningActivities).values({
          id: activityId,
          scopeId,
          slug: `synthetic-answer-race-${activityId}`,
          status: "PUBLISHED",
        });
        await admin.db.insert(attempts).values({
          id: attemptId,
          participantId,
          activityId,
          status: record.result.attempt.status,
          version: record.result.attempt.version,
        });
        await admin.db.insert(answers).values({
          id: answerId,
          attemptId,
          itemId,
          response: record.result.answer.response,
          savedAt,
        });

        const dependencies = createAnswerUseCaseDependencies(
          database.db,
          randomUUID,
        );
        const store = () =>
          dependencies.transaction.run(
            (operations) =>
              operations.idempotency.store(idempotencyKey, record),
            { participantId, scopeId },
          );

        await expect(Promise.all([store(), store()])).resolves.toEqual([
          undefined,
          undefined,
        ]);
        await expect(
          admin.db
            .select({
              key: answerIdempotency.key,
              fingerprint: answerIdempotency.fingerprint,
            })
            .from(answerIdempotency)
            .where(eq(answerIdempotency.key, idempotencyKey)),
        ).resolves.toEqual([
          { key: idempotencyKey, fingerprint: record.fingerprint },
        ]);

        await expect(
          dependencies.transaction.run(
            (operations) =>
              operations.idempotency.store(idempotencyKey, {
                ...record,
                fingerprint: "answer-fingerprint-conflict",
              }),
            { participantId, scopeId },
          ),
        ).rejects.toThrow("answer idempotency key has another fingerprint");
      } finally {
        await admin.db
          .delete(answerIdempotency)
          .where(eq(answerIdempotency.key, idempotencyKey));
        await admin.db.delete(answers).where(eq(answers.id, answerId));
        await admin.db.delete(attempts).where(eq(attempts.id, attemptId));
        await admin.db
          .delete(learningActivities)
          .where(eq(learningActivities.id, activityId));
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
