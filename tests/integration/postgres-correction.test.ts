import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  correctOpenResponse,
  type CorrectOpenResponseCommand,
} from "../../packages/application/src/index.js";
import { createPostgresDatabase } from "../../packages/persistence/src/database.js";
import {
  assessmentIdempotency,
  assessmentResults,
  attempts,
  createCorrectionReadRepository,
  createCorrectionUseCaseDependencies,
  learningActivities,
  outboxEvents,
} from "../../packages/persistence/src/index.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";
const databaseUrl = process.env.CVG_TEST_DATABASE_URL;

describe.skipIf(!runLiveDatabaseTests || databaseUrl === undefined)(
  "PostgreSQL correction integration",
  () => {
    it("persists a versioned human correction, audit event, and idempotent replay", async () => {
      if (databaseUrl === undefined)
        throw new Error("test database URL is required");

      const database = createPostgresDatabase(databaseUrl);
      const participantId = randomUUID();
      const approverId = randomUUID();
      const activityId = randomUUID();
      const attemptId = randomUUID();
      const scopeId = randomUUID();
      const correlationId = randomUUID();

      try {
        await database.db.insert(learningActivities).values({
          id: activityId,
          scopeId,
          slug: `synthetic-correction-${activityId}`,
          title: "Atividade sintética de correção",
          status: "PUBLISHED",
        });
        await database.db.insert(attempts).values({
          id: attemptId,
          participantId,
          activityId,
          status: "SUBMETIDA",
          version: 3,
        });

        const command: CorrectOpenResponseCommand = {
          principalId: approverId,
          accountStatus: "ACTIVE",
          roles: ["CLINICAL_APPROVER"],
          scopes: [scopeId],
          approvedClinicalApproverId: approverId,
          scopeId,
          attemptId,
          idempotencyKey: `correct-${attemptId}`,
          correlationId,
          score: 82,
          outcome: "APROVADO",
          feedback: "Feedback interno sintético.",
          ruleVersion: "rubrica-v1",
        };
        const dependencies = createCorrectionUseCaseDependencies(
          database.db,
          randomUUID,
        );
        const first = await correctOpenResponse(command, dependencies);
        const replay = await correctOpenResponse(command, dependencies);
        const feedback = await createCorrectionReadRepository(
          database.db,
        ).findByParticipantAndAttempt(participantId, attemptId);
        const crossParticipantFeedback = await createCorrectionReadRepository(
          database.db,
        ).findByParticipantAndAttempt(randomUUID(), attemptId);
        const storedAttempt = await database.db
          .select({ status: attempts.status, version: attempts.version })
          .from(attempts)
          .where(eq(attempts.id, attemptId));
        const storedResults = await database.db
          .select({
            version: assessmentResults.version,
            score: assessmentResults.score,
            outcome: assessmentResults.outcome,
            feedback: assessmentResults.feedback,
          })
          .from(assessmentResults)
          .where(eq(assessmentResults.attemptId, attemptId));
        const storedEvents = await database.db
          .select({
            eventType: outboxEvents.eventType,
            payload: outboxEvents.payload,
          })
          .from(outboxEvents)
          .where(eq(outboxEvents.aggregateId, attemptId));

        expect(first.attempt.status).toBe("CORRIGIDA_HUMANAMENTE");
        expect(first.attempt.version).toBe(5);
        expect(replay).toEqual(first);
        expect(feedback?.result.feedback).toBe("Feedback interno sintético.");
        expect(crossParticipantFeedback).toBeNull();
        expect(storedAttempt).toEqual([
          { status: "CORRIGIDA_HUMANAMENTE", version: 5 },
        ]);
        expect(storedResults).toEqual([
          {
            version: 1,
            score: 82,
            outcome: "APROVADO",
            feedback: "Feedback interno sintético.",
          },
        ]);
        expect(storedEvents).toEqual([
          expect.objectContaining({ eventType: "assessment.corrected.v1" }),
        ]);
        expect(JSON.stringify(storedEvents)).not.toContain(
          "Feedback interno sintético",
        );
      } finally {
        await database.db
          .delete(assessmentIdempotency)
          .where(eq(assessmentIdempotency.attemptId, attemptId));
        await database.db
          .delete(assessmentResults)
          .where(eq(assessmentResults.attemptId, attemptId));
        await database.db
          .delete(outboxEvents)
          .where(eq(outboxEvents.aggregateId, attemptId));
        await database.db.delete(attempts).where(eq(attempts.id, attemptId));
        await database.db
          .delete(learningActivities)
          .where(
            and(
              eq(learningActivities.id, activityId),
              inArray(learningActivities.id, [activityId]),
            ),
          );
        await database.close();
      }
    });
  },
);
