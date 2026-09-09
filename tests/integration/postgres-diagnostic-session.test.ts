import { randomUUID } from "node:crypto";

import {
  createB07DiagnosticSessionCatalog,
  finalizeDiagnosticSession,
  saveDiagnosticSessionAnswer,
  startDiagnosticSession,
} from "../../packages/application/src/index.js";
import { and, eq, inArray, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDiagnosticSessionRepository } from "../../packages/persistence/src/diagnostic-session-repository.js";
import {
  accountInvitations,
  accounts,
  auditEntries,
  diagnosticResults,
  diagnosticSessionAnswers,
  diagnosticSessionIdempotency,
  diagnosticSessions,
  learningAssignments,
  outboxEvents,
} from "../../packages/persistence/src/schema.js";
import { setDatabaseSecurityContext } from "../../packages/persistence/src/security-context.js";
import {
  closeLivePostgresHarness,
  hasAdministrativeCleanupCapability,
  liveAdminCapabilityMessage,
  liveDatabaseUrl,
  openLivePostgresHarness,
} from "./live-postgres-harness.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";

describe.skipIf(!runLiveDatabaseTests || liveDatabaseUrl === undefined)(
  "PostgreSQL diagnostic session integration",
  () => {
    it("persists a resumable session and finalizes result and assignments atomically", async ({
      skip,
    }) => {
      const harness = await openLivePostgresHarness();
      if (!hasAdministrativeCleanupCapability(harness.adminRole)) {
        await closeLivePostgresHarness(harness);
        skip(liveAdminCapabilityMessage);
        return;
      }
      if (!harness.adminRole.isSuperuser) {
        await closeLivePostgresHarness(harness);
        skip(
          "diagnostic session integration cleanup requires a superuser because the session/result fixture has cyclic restrictive foreign keys",
        );
        return;
      }

      const { application, admin } = harness;
      const participantId = randomUUID();
      const otherParticipantId = randomUUID();
      const scopeId = randomUUID();
      const invitationId = randomUUID();
      const sessionId = randomUUID();
      const resultId = randomUUID();
      const startCorrelationId = randomUUID();
      const answerCorrelationId = randomUUID();
      const finalizeCorrelationId = randomUUID();
      const catalog = createB07DiagnosticSessionCatalog();
      const repository = createDiagnosticSessionRepository(
        application.db,
        (() => {
          const ids = [
            sessionId,
            randomUUID(),
            randomUUID(),
            randomUUID(),
            randomUUID(),
            randomUUID(),
            resultId,
            randomUUID(),
            randomUUID(),
            randomUUID(),
            randomUUID(),
            randomUUID(),
            randomUUID(),
            randomUUID(),
            randomUUID(),
          ];
          let index = 0;
          return () => ids[index++] ?? randomUUID();
        })(),
      );
      const startedAt = new Date().toISOString();
      const item = catalog.items[0];
      const choice = item?.choices[0];
      if (item === undefined || choice === undefined) {
        throw new Error("B07 fixture is incomplete");
      }

      try {
        await admin.db.insert(accounts).values([
          {
            id: participantId,
            professionalEmail: `diagnostic-session-${participantId}@example.invalid`,
            status: "ACTIVE",
          },
          {
            id: otherParticipantId,
            professionalEmail: `diagnostic-session-other-${otherParticipantId}@example.invalid`,
            status: "ACTIVE",
          },
        ]);
        await admin.db.insert(accountInvitations).values({
          id: invitationId,
          accountId: participantId,
          tokenHash: "d".repeat(64),
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
          expiresAt: new Date("2027-08-26T12:00:00.000Z"),
          acceptedAt: new Date("2026-08-26T11:00:00.000Z"),
          createdBy: participantId,
        });

        const started = await startDiagnosticSession(
          {
            participantId,
            scopeId,
            startedAt,
            idempotencyKey: "live-start-b07-session-0001",
            correlationId: startCorrelationId,
          },
          repository,
          catalog,
        );
        const replayedStart = await startDiagnosticSession(
          {
            participantId,
            scopeId,
            startedAt,
            idempotencyKey: "live-start-b07-session-0001",
            correlationId: startCorrelationId,
          },
          repository,
          catalog,
        );
        expect(started.session.sessionId).toBe(sessionId);
        expect(replayedStart.session.sessionId).toBe(sessionId);

        const saved = await saveDiagnosticSessionAnswer(
          {
            participantId,
            scopeId,
            sessionId,
            version: started.session.version,
            itemId: item.publicItemId,
            selectedChoiceIds: [choice.id],
            idempotencyKey: "live-save-b07-answer-0001",
            correlationId: answerCorrelationId,
            occurredAt: new Date(Date.now() + 1_000).toISOString(),
          },
          repository,
        );
        const replayedSave = await saveDiagnosticSessionAnswer(
          {
            participantId,
            scopeId,
            sessionId,
            version: started.session.version,
            itemId: item.publicItemId,
            selectedChoiceIds: [choice.id],
            idempotencyKey: "live-save-b07-answer-0001",
            correlationId: answerCorrelationId,
            occurredAt: new Date(Date.now() + 1_000).toISOString(),
          },
          repository,
        );
        expect(saved.session.version).toBe(1);
        expect(replayedSave.session.version).toBe(1);

        const finalized = await finalizeDiagnosticSession(
          {
            participantId,
            scopeId,
            sessionId,
            version: saved.session.version,
            idempotencyKey: "live-finalize-b07-session-0001",
            correlationId: finalizeCorrelationId,
            completedAt: new Date(Date.now() + 2_000).toISOString(),
          },
          repository,
        );
        const finalizedAt = finalized.aggregate.session.finalizedAt;
        if (finalizedAt === undefined) {
          throw new Error(
            "diagnostic session finalization timestamp is missing",
          );
        }
        const replayedFinalization = await finalizeDiagnosticSession(
          {
            participantId,
            scopeId,
            sessionId,
            version: saved.session.version,
            idempotencyKey: "live-finalize-b07-session-0001",
            correlationId: finalizeCorrelationId,
            completedAt: finalizedAt,
          },
          repository,
        );
        const replayedSaveAfterFinalization = await saveDiagnosticSessionAnswer(
          {
            participantId,
            scopeId,
            sessionId,
            version: started.session.version,
            itemId: item.publicItemId,
            selectedChoiceIds: [choice.id],
            idempotencyKey: "live-save-b07-answer-0001",
            correlationId: answerCorrelationId,
            occurredAt: new Date(Date.now() + 1_000).toISOString(),
          },
          repository,
        );

        const persistedAnswerUpdate = await application.db.transaction(
          async (transaction) => {
            await setDatabaseSecurityContext(transaction, {
              participantId,
              scopeId,
            });
            return transaction
              .update(diagnosticSessionAnswers)
              .set({ selectedChoiceIds: [choice.id] })
              .where(eq(diagnosticSessionAnswers.sessionId, sessionId))
              .returning({ id: diagnosticSessionAnswers.id });
          },
        );
        const persistedAnswerDelete = await application.db.transaction(
          async (transaction) => {
            await setDatabaseSecurityContext(transaction, {
              participantId,
              scopeId,
            });
            return transaction
              .delete(diagnosticSessionAnswers)
              .where(eq(diagnosticSessionAnswers.sessionId, sessionId))
              .returning({ id: diagnosticSessionAnswers.id });
          },
        );
        const secondItem = catalog.items[1];
        const secondSnapshotItem = catalog.snapshot.items[1];
        const secondChoice = secondItem?.choices[0];
        if (
          secondItem === undefined ||
          secondSnapshotItem === undefined ||
          secondChoice === undefined
        ) {
          throw new Error("B07 second item fixture is incomplete");
        }
        await expect(
          application.db.transaction(async (transaction) => {
            await setDatabaseSecurityContext(transaction, {
              participantId,
              scopeId,
            });
            await transaction.insert(diagnosticSessionAnswers).values({
              id: randomUUID(),
              sessionId,
              canonicalItemId: secondSnapshotItem.canonicalItemId,
              selectedChoiceIds: [secondChoice.id],
              savedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }),
        ).rejects.toThrow(/row-level security/i);

        const persistedSession = await admin.db
          .select()
          .from(diagnosticSessions)
          .where(eq(diagnosticSessions.id, sessionId));
        const persistedAnswers = await admin.db
          .select()
          .from(diagnosticSessionAnswers)
          .where(eq(diagnosticSessionAnswers.sessionId, sessionId));
        const persistedResult = await admin.db
          .select()
          .from(diagnosticResults)
          .where(eq(diagnosticResults.id, resultId));
        const persistedIdempotency = await admin.db
          .select()
          .from(diagnosticSessionIdempotency)
          .where(
            and(
              eq(diagnosticSessionIdempotency.participantId, participantId),
              eq(diagnosticSessionIdempotency.scopeId, scopeId),
            ),
          );
        const persistedAssignments = await admin.db
          .select()
          .from(learningAssignments)
          .where(
            and(
              eq(learningAssignments.participantId, participantId),
              eq(learningAssignments.scopeId, scopeId),
            ),
          );
        const persistedEvents = await admin.db
          .select()
          .from(outboxEvents)
          .where(eq(outboxEvents.aggregateId, sessionId));
        const persistedAudit = await admin.db
          .select()
          .from(auditEntries)
          .where(eq(auditEntries.resourceId, sessionId));

        expect(finalized.aggregate.session.status).toBe("FINALIZADA");
        expect(finalized.aggregate.answers).toHaveLength(1);
        expect(finalized.aggregate.answers[0]?.canonicalItemId).toBe(
          catalog.snapshot.items[0]?.canonicalItemId,
        );
        expect(replayedFinalization.aggregate.result?.resultId).toBe(resultId);
        expect(replayedFinalization.aggregate.answers).toHaveLength(1);
        expect(replayedSaveAfterFinalization.session.status).toBe("FINALIZADA");
        expect(replayedSaveAfterFinalization.session.version).toBe(
          finalized.aggregate.session.version,
        );
        expect(persistedAnswerUpdate).toHaveLength(0);
        expect(persistedAnswerDelete).toHaveLength(0);
        expect(persistedSession[0]).toMatchObject({
          id: sessionId,
          status: "FINALIZADA",
          diagnosticResultId: resultId,
        });
        expect(persistedSession[0]?.catalogSnapshot.items).toHaveLength(120);
        expect(persistedAnswers).toHaveLength(1);
        expect(persistedResult[0]?.sessionId).toBe(sessionId);
        expect(persistedIdempotency).toHaveLength(3);
        expect(persistedAssignments.map((row) => row.moduleId)).toEqual(
          expect.arrayContaining(["M01", "M02", "M11"]),
        );
        expect(persistedEvents).toHaveLength(3);
        expect(persistedEvents.at(-1)?.payload).toMatchObject({
          answeredItemCount: 1,
        });
        expect(persistedAudit).toHaveLength(3);
        await expect(
          repository.findById(sessionId, otherParticipantId, scopeId),
        ).resolves.toBeNull();
      } finally {
        await admin.db
          .delete(outboxEvents)
          .where(eq(outboxEvents.aggregateId, sessionId));
        await admin.db
          .delete(auditEntries)
          .where(eq(auditEntries.resourceId, sessionId));
        await admin.db
          .delete(learningAssignments)
          .where(eq(learningAssignments.participantId, participantId));
        await admin.db
          .delete(diagnosticSessionIdempotency)
          .where(
            and(
              eq(diagnosticSessionIdempotency.participantId, participantId),
              eq(diagnosticSessionIdempotency.scopeId, scopeId),
            ),
          );
        await admin.db
          .delete(diagnosticSessionAnswers)
          .where(eq(diagnosticSessionAnswers.sessionId, sessionId));
        await admin.db.execute(
          sql`ALTER TABLE diagnostic_sessions DISABLE TRIGGER diagnostic_session_update_guard`,
        );
        try {
          await admin.db.execute(sql`
            UPDATE diagnostic_sessions
            SET diagnostic_result_id = NULL,
                status = 'EM_ANDAMENTO',
                finalized_at = NULL,
                version = version + 1,
                updated_at = now()
            WHERE id = ${sessionId}
          `);
        } finally {
          await admin.db.execute(
            sql`ALTER TABLE diagnostic_sessions ENABLE TRIGGER diagnostic_session_update_guard`,
          );
        }
        await admin.db
          .delete(diagnosticResults)
          .where(eq(diagnosticResults.id, resultId));
        await admin.db
          .delete(diagnosticSessions)
          .where(eq(diagnosticSessions.id, sessionId));
        await admin.db
          .delete(accountInvitations)
          .where(eq(accountInvitations.id, invitationId));
        await admin.db
          .delete(accounts)
          .where(inArray(accounts.id, [participantId, otherParticipantId]));
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
