import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  correctOpenResponse,
  saveAnswer,
  startAttempt,
  submitAttempt,
} from "../../packages/application/src/index.js";
import { createPostgresDatabase } from "../../packages/persistence/src/database.js";
import {
  createAnswerUseCaseDependencies,
  createAttemptUseCaseDependencies,
  createCorrectionUseCaseDependencies,
  createCurriculumRuntimeRepository,
  createParticipantJourneyRepository,
  createPostgresRateLimiter,
  setDatabaseSecurityContext,
} from "../../packages/persistence/src/index.js";
import {
  accounts,
  answerIdempotency,
  answers,
  assessmentIdempotency,
  assessmentResults,
  assessmentWorkflows,
  attemptIdempotency,
  attempts,
  activityAssignments,
  curriculumRuntimeStates,
  learningActivities,
  learningAssignments,
  outboxEvents,
  rateLimitBuckets,
} from "../../packages/persistence/src/schema.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";
const databaseUrl = process.env.CVG_TEST_DATABASE_URL;

function quoteIdentifier(value: string): string {
  if (!/^cvg_rls_[a-f0-9]+$/u.test(value)) {
    throw new Error("unsafe synthetic role identifier");
  }
  return `"${value}"`;
}

describe.skipIf(!runLiveDatabaseTests || databaseUrl === undefined)(
  "PostgreSQL participant security isolation",
  () => {
    it("requires transaction context and isolates participant and staff scope paths", async () => {
      if (databaseUrl === undefined) {
        throw new Error("test database URL is required");
      }

      const admin = createPostgresDatabase(databaseUrl);
      const roleName = `cvg_rls_${randomUUID().replaceAll("-", "")}`;
      const rolePassword = randomUUID().replaceAll("-", "");
      const role = quoteIdentifier(roleName);
      const participantId = randomUUID();
      const otherParticipantId = randomUUID();
      const staffId = randomUUID();
      const scopeId = randomUUID();
      const otherScopeId = randomUUID();
      const activityId = randomUUID();
      const otherActivityId = randomUUID();
      const runtimeId = randomUUID();
      const assignmentId = randomUUID();
      const workflowId = randomUUID();
      const rateLimitKey = randomUUID();
      let attemptId: string | null = null;

      const protectedTables = [
        "activity_assignments",
        "curriculum_runtime_states",
        "attempts",
        "answers",
        "attempt_idempotency",
        "answer_idempotency",
        "assessment_results",
        "assessment_idempotency",
        "learning_assignments",
        "assessment_workflows",
        "rate_limit_buckets",
      ] as const;

      try {
        await admin.db.execute(
          sql.raw(
            `create role ${role} login password '${rolePassword}' nosuperuser nobypassrls`,
          ),
        );
        await admin.db.execute(
          sql.raw(`grant usage on schema public to ${role}`),
        );
        await admin.db.execute(
          sql.raw(`grant select on learning_activities to ${role}`),
        );
        await admin.db.execute(
          sql.raw(`grant select on activity_assignments to ${role}`),
        );
        for (const table of protectedTables) {
          await admin.db.execute(
            sql.raw(`grant select, insert, update on ${table} to ${role}`),
          );
        }
        await admin.db.execute(
          sql.raw(
            `grant insert on outbox_events, audit_entries, rate_limit_buckets to ${role}`,
          ),
        );
        await admin.db.execute(
          sql.raw(`grant delete on rate_limit_buckets to ${role}`),
        );

        await admin.db.insert(accounts).values([
          {
            id: participantId,
            professionalEmail: `synthetic-${participantId}@internal.invalid`,
            status: "ACTIVE",
          },
          {
            id: otherParticipantId,
            professionalEmail: `synthetic-${otherParticipantId}@internal.invalid`,
            status: "ACTIVE",
          },
          {
            id: staffId,
            professionalEmail: `synthetic-${staffId}@internal.invalid`,
            status: "ACTIVE",
          },
        ]);
        await admin.db.insert(learningActivities).values([
          {
            id: activityId,
            scopeId,
            slug: `synthetic-security-${activityId}`,
            status: "PUBLISHED",
          },
          {
            id: otherActivityId,
            scopeId: otherScopeId,
            slug: `synthetic-security-${otherActivityId}`,
            status: "PUBLISHED",
          },
        ]);
        await admin.db.insert(activityAssignments).values([
          { participantId, activityId, status: "DISPONIVEL" },
          {
            participantId: otherParticipantId,
            activityId: otherActivityId,
            status: "DISPONIVEL",
          },
        ]);
        await admin.db.insert(curriculumRuntimeStates).values({
          id: runtimeId,
          participantId,
          scopeId,
          moduleId: "M01",
          version: 1,
          state: {
            moduleId: "M01",
            status: "DOMINIO_DIGITAL",
            nextAction: "REVISAR_RETENCAO",
            objectiveResults: [],
            remediationObjectiveIds: [],
            criticalErrorItemIds: [],
            invalidAnswerItemIds: [],
            unansweredChoiceItemIds: [],
            openResponseItemIds: [],
            retentionReviews: [],
            practicalCompetenceClaim: "PROIBIDO_MVP",
            synthetic: true,
          },
        });
        await admin.db.insert(learningAssignments).values({
          id: assignmentId,
          participantId,
          scopeId,
          moduleId: "M01",
          availableAt: new Date("2026-08-10T05:00:00.000Z"),
          status: "DISPONIVEL",
          version: 0,
        });

        const restricted = createPostgresDatabase(
          `postgresql://${roleName}:${rolePassword}@127.0.0.1:${new URL(databaseUrl).port || "5432"}/${new URL(databaseUrl).pathname.slice(1)}`,
        );

        try {
          await expect(restricted.healthcheck()).resolves.toBeUndefined();
          const firstRateLimiter = createPostgresRateLimiter(restricted.db, {
            maxRequests: 2,
            windowMs: 1_000,
          });
          const secondRateLimiter = createPostgresRateLimiter(restricted.db, {
            maxRequests: 2,
            windowMs: 1_000,
          });
          await expect(
            firstRateLimiter.check(rateLimitKey, 10_000),
          ).resolves.toMatchObject({ allowed: true, remaining: 1 });
          await expect(
            secondRateLimiter.check(rateLimitKey, 10_001),
          ).resolves.toMatchObject({ allowed: true, remaining: 0 });
          await expect(
            firstRateLimiter.check(rateLimitKey, 10_002),
          ).resolves.toMatchObject({ allowed: false, remaining: 0 });
          const privilegedGuard = createPostgresDatabase(databaseUrl, {
            requireLeastPrivilege: true,
          });
          try {
            await expect(privilegedGuard.healthcheck()).rejects.toThrow(
              "non-superuser role",
            );
          } finally {
            await privilegedGuard.close();
          }

          const withoutContext = await restricted.db.transaction(
            async (transaction) => ({
              assignments: await transaction.select().from(activityAssignments),
              runtimes: await transaction
                .select()
                .from(curriculumRuntimeStates),
              attempts: await transaction.select().from(attempts),
            }),
          );
          expect(withoutContext.assignments).toHaveLength(0);
          expect(withoutContext.runtimes).toHaveLength(0);
          expect(withoutContext.attempts).toHaveLength(0);

          const contextRows = await restricted.db.transaction(
            async (transaction) => {
              await setDatabaseSecurityContext(transaction, { participantId });
              return {
                assignments: await transaction
                  .select()
                  .from(activityAssignments),
                runtimes: await transaction
                  .select()
                  .from(curriculumRuntimeStates),
              };
            },
          );
          expect(contextRows.assignments).toHaveLength(1);
          expect(contextRows.assignments[0]?.participantId).toBe(participantId);
          expect(contextRows.runtimes).toHaveLength(1);

          const runtimeRepository = createCurriculumRuntimeRepository(
            restricted.db,
          );
          await expect(
            runtimeRepository.findCurriculumRuntime(otherParticipantId, "M01"),
          ).resolves.toBeNull();

          const attemptDependencies = createAttemptUseCaseDependencies(
            restricted.db,
            randomUUID,
          );
          const answerDependencies = createAnswerUseCaseDependencies(
            restricted.db,
            randomUUID,
          );
          const correctionDependencies = createCorrectionUseCaseDependencies(
            restricted.db,
            randomUUID,
          );
          const correlationId = randomUUID();
          const started = await startAttempt(
            {
              participantId,
              activityId,
              idempotencyKey: `security-start-${activityId}`,
              correlationId,
            },
            attemptDependencies,
          );
          attemptId = started.attemptId;

          await expect(
            startAttempt(
              {
                participantId: otherParticipantId,
                activityId: activityId,
                idempotencyKey: `security-cross-${activityId}`,
                correlationId: randomUUID(),
              },
              attemptDependencies,
            ),
          ).rejects.toMatchObject({ code: "not_found" });

          const saved = await saveAnswer(
            {
              attemptId,
              participantId,
              activityId,
              itemId: randomUUID(),
              response: "resposta sintética",
              idempotencyKey: `security-answer-${activityId}`,
              correlationId,
              savedAt: "2026-08-10T05:00:00.000Z",
            },
            answerDependencies,
          );
          expect(saved.attempt.status).toBe("SALVA");

          const submitted = await submitAttempt(
            {
              attemptId,
              participantId,
              idempotencyKey: `security-submit-${activityId}`,
              correlationId,
              submittedAt: "2026-08-10T05:01:00.000Z",
            },
            attemptDependencies,
          );
          expect(submitted.status).toBe("SUBMETIDA");

          const corrected = await correctOpenResponse(
            {
              principalId: staffId,
              accountStatus: "ACTIVE",
              roles: ["CLINICAL_APPROVER"],
              scopes: [scopeId],
              approvedClinicalApproverId: staffId,
              scopeId,
              attemptId,
              idempotencyKey: `security-correction-${activityId}`,
              correlationId,
              score: 82,
              outcome: "APROVADO",
              feedback: "Feedback sintético.",
              ruleVersion: "synthetic-v1",
            },
            correctionDependencies,
          );
          expect(corrected.result.kind).toBe("HUMANA");
          await admin.db.insert(assessmentWorkflows).values({
            resultId: workflowId,
            attemptId,
            participantId,
            scopeId,
            ruleVersion: "synthetic-v1",
            version: 0,
            status: "RESULTADO_EM_PROCESSAMENTO",
          });

          const journeyRepository = createParticipantJourneyRepository(
            restricted.db,
          );
          const journey =
            await journeyRepository.findParticipantLearningJourney(
              participantId,
              [scopeId],
            );
          expect(journey.assignments).toHaveLength(1);
          expect(journey.activities).toHaveLength(1);
          expect(journey.activities[0]?.attemptId).toBe(attemptId);
          expect(journey.results).toHaveLength(1);
          expect(journey.runtimes).toHaveLength(1);
          await expect(
            journeyRepository.findParticipantLearningJourney(
              otherParticipantId,
              [scopeId],
            ),
          ).resolves.toMatchObject({
            assignments: [],
            activities: [],
            results: [],
            runtimes: [],
          });

          const ownAttemptRows = await restricted.db.transaction(
            async (transaction) => {
              await setDatabaseSecurityContext(transaction, { participantId });
              return {
                attempts: await transaction.select().from(attempts),
                answers: await transaction.select().from(answers),
                idempotency: await transaction.select().from(answerIdempotency),
              };
            },
          );
          expect(ownAttemptRows.attempts).toHaveLength(1);
          expect(ownAttemptRows.answers).toHaveLength(1);
          expect(ownAttemptRows.idempotency).toHaveLength(1);

          const crossParticipantRows = await restricted.db.transaction(
            async (transaction) => {
              await setDatabaseSecurityContext(transaction, {
                participantId: otherParticipantId,
              });
              return {
                attempts: await transaction.select().from(attempts),
                answers: await transaction.select().from(answers),
                results: await transaction.select().from(assessmentResults),
              };
            },
          );
          expect(crossParticipantRows.attempts).toHaveLength(0);
          expect(crossParticipantRows.answers).toHaveLength(0);
          expect(crossParticipantRows.results).toHaveLength(0);

          const staffScopeRows = await restricted.db.transaction(
            async (transaction) => {
              await setDatabaseSecurityContext(transaction, { scopeId });
              return {
                attempts: await transaction.select().from(attempts),
                results: await transaction.select().from(assessmentResults),
                correctionIdempotency: await transaction
                  .select()
                  .from(assessmentIdempotency),
              };
            },
          );
          expect(staffScopeRows.attempts).toHaveLength(1);
          expect(staffScopeRows.results).toHaveLength(1);
          expect(staffScopeRows.correctionIdempotency).toHaveLength(1);

          const otherScopeRows = await restricted.db.transaction(
            async (transaction) => {
              await setDatabaseSecurityContext(transaction, {
                scopeId: otherScopeId,
              });
              return transaction.select().from(attempts);
            },
          );
          expect(otherScopeRows).toHaveLength(0);
        } finally {
          await restricted.close();
        }
      } finally {
        if (attemptId !== null) {
          await admin.db
            .delete(assessmentWorkflows)
            .where(eq(assessmentWorkflows.resultId, workflowId));
          await admin.db
            .delete(assessmentIdempotency)
            .where(eq(assessmentIdempotency.attemptId, attemptId));
          await admin.db
            .delete(assessmentResults)
            .where(eq(assessmentResults.attemptId, attemptId));
          await admin.db
            .delete(answerIdempotency)
            .where(eq(answerIdempotency.attemptId, attemptId));
          await admin.db
            .delete(answers)
            .where(eq(answers.attemptId, attemptId));
          await admin.db
            .delete(attemptIdempotency)
            .where(eq(attemptIdempotency.attemptId, attemptId));
          await admin.db
            .delete(outboxEvents)
            .where(eq(outboxEvents.aggregateId, attemptId));
          await admin.db.delete(attempts).where(eq(attempts.id, attemptId));
        }
        await admin.db
          .delete(curriculumRuntimeStates)
          .where(eq(curriculumRuntimeStates.id, runtimeId));
        await admin.db
          .delete(learningAssignments)
          .where(eq(learningAssignments.id, assignmentId));
        await admin.db
          .delete(rateLimitBuckets)
          .where(eq(rateLimitBuckets.key, rateLimitKey));
        await admin.db
          .delete(activityAssignments)
          .where(
            and(
              eq(activityAssignments.activityId, activityId),
              eq(activityAssignments.participantId, participantId),
            ),
          );
        await admin.db
          .delete(activityAssignments)
          .where(
            and(
              eq(activityAssignments.activityId, otherActivityId),
              eq(activityAssignments.participantId, otherParticipantId),
            ),
          );
        await admin.db
          .delete(learningActivities)
          .where(eq(learningActivities.id, activityId));
        await admin.db
          .delete(learningActivities)
          .where(eq(learningActivities.id, otherActivityId));
        await admin.db.delete(accounts).where(eq(accounts.id, participantId));
        await admin.db
          .delete(accounts)
          .where(eq(accounts.id, otherParticipantId));
        await admin.db.delete(accounts).where(eq(accounts.id, staffId));
        await admin.db.execute(
          sql.raw(`revoke usage on schema public from ${role}`),
        );
        for (const table of [
          "learning_activities",
          "activity_assignments",
          "curriculum_runtime_states",
          "attempts",
          "answers",
          "attempt_idempotency",
          "answer_idempotency",
          "assessment_results",
          "assessment_idempotency",
          "learning_assignments",
          "assessment_workflows",
          "rate_limit_buckets",
          "outbox_events",
          "audit_entries",
        ]) {
          await admin.db.execute(
            sql.raw(`revoke all privileges on ${table} from ${role}`),
          );
        }
        await admin.db.execute(sql.raw(`drop role if exists ${role}`));
        await admin.close();
      }
    });
  },
);
