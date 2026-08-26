import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import {
  startAttempt,
  submitAttempt,
} from "../../packages/application/src/attempt-use-cases.js";
import { createAttemptUseCaseDependencies } from "../../packages/persistence/src/attempt-repository.js";
import {
  accountInvitations,
  accounts,
  activityAssignments,
  attemptIdempotency,
  attempts,
  contentVersions,
  learningActivityItems,
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
      const scopeId = randomUUID();
      const invitationId = randomUUID();
      const contentVersionId = randomUUID();
      const contentId = randomUUID();
      const correlationId = randomUUID();
      let attemptId: string | null = null;

      try {
        await admin.db.insert(accounts).values({
          id: participantId,
          professionalEmail: `attempt-${participantId}@example.invalid`,
          status: "ACTIVE",
        });
        await admin.db.insert(accountInvitations).values({
          id: invitationId,
          accountId: participantId,
          tokenHash: "b".repeat(64),
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
          expiresAt: new Date("2027-08-09T17:00:00.000Z"),
          acceptedAt: new Date("2026-08-09T16:00:00.000Z"),
          createdBy: participantId,
        });
        await admin.db.insert(learningActivities).values({
          id: activityId,
          scopeId,
          slug: `synthetic-${activityId}`,
          status: "PUBLISHED",
        });
        await admin.db.insert(contentVersions).values({
          id: contentVersionId,
          contentId,
          scopeId,
          version: 1,
          status: "PUBLICADO",
          kind: "QUESTAO",
          title: "Questão sintética de tentativa",
          participantText: "Responda em texto.",
          responseMode: "TEXT",
        });
        await admin.db.insert(learningActivityItems).values({
          activityId,
          contentVersionId,
          ordinal: 1,
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
            scopeId,
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
          scopeId,
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
        await admin.db.delete(accounts).where(eq(accounts.id, participantId));
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
