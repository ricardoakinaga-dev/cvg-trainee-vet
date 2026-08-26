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
import type { DatabaseHandle } from "../../packages/persistence/src/database.js";
import {
  accounts,
  accountInvitations,
  answerIdempotency,
  answers,
  assessmentIdempotency,
  assessmentResults,
  assessmentWorkflows,
  attemptIdempotency,
  attempts,
  activityAssignments,
  contentVersions,
  curriculumRuntimeStates,
  diagnosticResults,
  learningActivities,
  learningActivityItems,
  learningAssignments,
  outboxEvents,
  rateLimitBuckets,
} from "../../packages/persistence/src/schema.js";
import {
  closeLivePostgresHarness,
  hasAdministrativeCleanupCapability,
  liveAdminCapabilityMessage,
  liveDatabaseUrl,
  openLivePostgresHarness,
} from "./live-postgres-harness.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";

function quoteIdentifier(value: string): string {
  if (!/^cvg_rls_[a-f0-9]+$/u.test(value)) {
    throw new Error("unsafe synthetic role identifier");
  }
  return `"${value}"`;
}

describe.skipIf(!runLiveDatabaseTests || liveDatabaseUrl === undefined)(
  "PostgreSQL participant security isolation",
  () => {
    it("requires transaction context and isolates participant and staff scope paths", async ({
      skip,
    }) => {
      const harness = await openLivePostgresHarness();
      if (!hasAdministrativeCleanupCapability(harness.adminRole)) {
        await closeLivePostgresHarness(harness);
        skip(liveAdminCapabilityMessage);
        return;
      }

      const { application, admin } = harness;
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
      const contentVersionId = randomUUID();
      const contentId = randomUUID();
      const invitationId = randomUUID();
      const otherInvitationId = randomUUID();
      const runtimeId = randomUUID();
      const assignmentId = randomUUID();
      const workflowId = randomUUID();
      const rateLimitKey = randomUUID();
      let attemptId: string | null = null;
      let restricted: DatabaseHandle | null = null;
      let roleCreated = false;

      const protectedTables = [
        "activity_assignments",
        "curriculum_runtime_states",
        "diagnostic_results",
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
      const rlsHelperFunctions = [
        "public.cvg_learning_activity_in_scope(uuid,text)",
        "public.cvg_learning_activity_for_participant(uuid,text)",
        "public.cvg_learning_activity_item_insert_allowed(uuid,uuid,text)",
        "public.cvg_learning_activity_content_for_participant(uuid,text)",
        "public.cvg_participant_in_scope(uuid,uuid)",
        "public.cvg_learning_activity_assignment_insert_allowed(uuid,uuid,uuid,text)",
        "public.cvg_learning_activity_assignment_write_allowed(uuid,uuid,uuid,text,text)",
        "public.cvg_learning_activity_journey_visible(uuid,text)",
        "public.cvg_learning_activity_scope_for_participant(uuid,text)",
      ] as const;

      try {
        if (harness.adminRole.canCreateRoles) {
          await admin.db.execute(
            sql.raw(
              `create role ${role} login password '${rolePassword}' nosuperuser nobypassrls`,
            ),
          );
          roleCreated = true;
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
          for (const table of ["content_versions", "learning_activity_items"]) {
            await admin.db.execute(
              sql.raw(`grant select on ${table} to ${role}`),
            );
          }
          for (const procedure of rlsHelperFunctions) {
            await admin.db.execute(
              sql.raw(`grant execute on function ${procedure} to ${role}`),
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
        } else {
          console.warn(
            "PostgreSQL CREATEROLE capability is absent; participant isolation uses the configured non-privileged application role",
          );
          if (
            harness.applicationRole.isSuperuser ||
            harness.applicationRole.bypassesRls
          ) {
            skip(
              "CREATE ROLE is unavailable and CVG_TEST_DATABASE_URL is privileged; participant isolation cannot be evaluated safely",
            );
            return;
          }
        }

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
        await admin.db.insert(accountInvitations).values([
          {
            id: invitationId,
            accountId: participantId,
            tokenHash: `${randomUUID().replaceAll("-", "")}${randomUUID().replaceAll("-", "")}`,
            roles: ["PARTICIPANT"],
            scopes: [scopeId],
            expiresAt: new Date("2027-08-10T05:00:00.000Z"),
            acceptedAt: new Date("2026-08-10T04:00:00.000Z"),
            createdBy: staffId,
          },
          {
            id: otherInvitationId,
            accountId: otherParticipantId,
            tokenHash: `${randomUUID().replaceAll("-", "")}${randomUUID().replaceAll("-", "")}`,
            roles: ["PARTICIPANT"],
            scopes: [otherScopeId],
            expiresAt: new Date("2027-08-10T05:00:00.000Z"),
            acceptedAt: new Date("2026-08-10T04:00:00.000Z"),
            createdBy: staffId,
          },
        ]);
        await admin.db.insert(learningActivities).values([
          {
            id: activityId,
            scopeId,
            slug: `synthetic-security-${activityId}`,
            moduleId: "M01",
            status: "PUBLISHED",
          },
          {
            id: otherActivityId,
            scopeId: otherScopeId,
            slug: `synthetic-security-${otherActivityId}`,
            status: "PUBLISHED",
          },
        ]);
        await admin.db.insert(contentVersions).values({
          id: contentVersionId,
          contentId,
          scopeId,
          version: 1,
          status: "PUBLICADO",
          kind: "QUESTAO",
          title: "Questão sintética de segurança",
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
          availableAt: new Date("2026-08-10T05:00:00.000Z"),
          status: "DISPONIVEL",
          version: 0,
        });
        await admin.db.insert(activityAssignments).values([
          {
            participantId,
            activityId,
            learningAssignmentId: assignmentId,
            status: "DISPONIVEL",
          },
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
        await admin.db.insert(diagnosticResults).values({
          id: randomUUID(),
          participantId,
          scopeId,
          diagnosticId: "B07-DIAGNOSTIC-V1",
          diagnosticVersion: "0.1.0",
          result: {
            diagnosticId: "B07-DIAGNOSTIC-V1",
            version: "0.1.0",
            notPunitive: true,
            noGlobalPassFail: true,
            totalItemCount: 120,
            answeredItemCount: 1,
            themeResults: [
              {
                themeId: "B07-S1",
                itemCount: 40,
                answeredItemCount: 1,
                earnedPoints: 1,
                possiblePoints: 1,
                percent: 100,
                recommendedModuleIds: ["M01"],
              },
              {
                themeId: "B07-S2",
                itemCount: 40,
                answeredItemCount: 0,
                earnedPoints: 0,
                possiblePoints: 0,
                percent: 0,
                recommendedModuleIds: ["M02"],
              },
              {
                themeId: "B07-S3",
                itemCount: 40,
                answeredItemCount: 0,
                earnedPoints: 0,
                possiblePoints: 0,
                percent: 0,
                recommendedModuleIds: ["M11"],
              },
            ],
            recommendedModuleIds: ["M01", "M02", "M11"],
            remediationObjectiveIds: ["M01-OBJ-01"],
          },
          completedAt: new Date("2026-08-10T05:00:00.000Z"),
        });

        restricted = roleCreated
          ? createPostgresDatabase(
              `postgresql://${roleName}:${rolePassword}@127.0.0.1:${new URL(liveDatabaseUrl).port || "5432"}/${new URL(liveDatabaseUrl).pathname.slice(1)}`,
            )
          : application;

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
          if (
            harness.applicationRole.isSuperuser ||
            harness.applicationRole.bypassesRls
          ) {
            const privilegedGuard = createPostgresDatabase(liveDatabaseUrl, {
              requireLeastPrivilege: true,
            });
            try {
              await expect(privilegedGuard.healthcheck()).rejects.toThrow(
                "non-superuser role",
              );
            } finally {
              await privilegedGuard.close();
            }
          } else {
            await expect(application.healthcheck()).resolves.toBeUndefined();
          }

          const withoutContext = await restricted.db.transaction(
            async (transaction) => ({
              assignments: await transaction.select().from(activityAssignments),
              activities: await transaction.select().from(learningActivities),
              runtimes: await transaction
                .select()
                .from(curriculumRuntimeStates),
              diagnostics: await transaction.select().from(diagnosticResults),
              attempts: await transaction.select().from(attempts),
            }),
          );
          expect(withoutContext.assignments).toHaveLength(0);
          expect(withoutContext.activities).toHaveLength(0);
          expect(withoutContext.runtimes).toHaveLength(0);
          expect(withoutContext.diagnostics).toHaveLength(0);
          expect(withoutContext.attempts).toHaveLength(0);

          const contextRows = await restricted.db.transaction(
            async (transaction) => {
              await setDatabaseSecurityContext(transaction, {
                participantId,
                scopeId,
              });
              return {
                assignments: await transaction
                  .select()
                  .from(activityAssignments),
                activities: await transaction.select().from(learningActivities),
                runtimes: await transaction
                  .select()
                  .from(curriculumRuntimeStates),
                diagnostics: await transaction.select().from(diagnosticResults),
              };
            },
          );
          expect(contextRows.assignments).toHaveLength(1);
          expect(contextRows.assignments[0]?.participantId).toBe(participantId);
          expect(contextRows.activities).toHaveLength(1);
          expect(contextRows.activities[0]?.id).toBe(activityId);
          expect(contextRows.runtimes).toHaveLength(1);
          expect(contextRows.diagnostics).toHaveLength(1);
          expect(contextRows.diagnostics[0]?.participantId).toBe(participantId);

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
              scopeId,
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
                scopeId,
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
              scopeId,
              itemId: contentVersionId,
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
              scopeId,
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
                diagnostics: await transaction.select().from(diagnosticResults),
              };
            },
          );
          expect(crossParticipantRows.attempts).toHaveLength(0);
          expect(crossParticipantRows.answers).toHaveLength(0);
          expect(crossParticipantRows.results).toHaveLength(0);
          expect(crossParticipantRows.diagnostics).toHaveLength(0);

          const staffScopeRows = await restricted.db.transaction(
            async (transaction) => {
              await setDatabaseSecurityContext(transaction, { scopeId });
              return {
                attempts: await transaction.select().from(attempts),
                results: await transaction.select().from(assessmentResults),
                correctionIdempotency: await transaction
                  .select()
                  .from(assessmentIdempotency),
                diagnostics: await transaction.select().from(diagnosticResults),
              };
            },
          );
          expect(staffScopeRows.attempts).toHaveLength(1);
          expect(staffScopeRows.results).toHaveLength(1);
          expect(staffScopeRows.correctionIdempotency).toHaveLength(1);
          expect(staffScopeRows.diagnostics).toHaveLength(1);

          const otherScopeRows = await restricted.db.transaction(
            async (transaction) => {
              await setDatabaseSecurityContext(transaction, {
                scopeId: otherScopeId,
              });
              return {
                attempts: await transaction.select().from(attempts),
                diagnostics: await transaction.select().from(diagnosticResults),
              };
            },
          );
          expect(otherScopeRows.attempts).toHaveLength(0);
          expect(otherScopeRows.diagnostics).toHaveLength(0);
        } finally {
          if (restricted !== application) {
            await restricted.close();
          }
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
          .delete(learningAssignments)
          .where(eq(learningAssignments.id, assignmentId));
        await admin.db
          .delete(learningActivityItems)
          .where(eq(learningActivityItems.activityId, activityId));
        await admin.db
          .delete(accountInvitations)
          .where(
            and(
              eq(accountInvitations.id, invitationId),
              eq(accountInvitations.accountId, participantId),
            ),
          );
        await admin.db
          .delete(accountInvitations)
          .where(
            and(
              eq(accountInvitations.id, otherInvitationId),
              eq(accountInvitations.accountId, otherParticipantId),
            ),
          );
        await admin.db
          .delete(learningActivities)
          .where(eq(learningActivities.id, activityId));
        await admin.db
          .delete(learningActivities)
          .where(eq(learningActivities.id, otherActivityId));
        await admin.db
          .delete(contentVersions)
          .where(eq(contentVersions.id, contentVersionId));
        await admin.db
          .delete(diagnosticResults)
          .where(eq(diagnosticResults.participantId, participantId));
        await admin.db.delete(accounts).where(eq(accounts.id, participantId));
        await admin.db
          .delete(accounts)
          .where(eq(accounts.id, otherParticipantId));
        await admin.db.delete(accounts).where(eq(accounts.id, staffId));
        if (roleCreated) {
          for (const procedure of rlsHelperFunctions) {
            await admin.db.execute(
              sql.raw(`revoke execute on function ${procedure} from ${role}`),
            );
          }
          await admin.db.execute(
            sql.raw(`revoke usage on schema public from ${role}`),
          );
          for (const table of [
            "learning_activities",
            "content_versions",
            "learning_activity_items",
            "activity_assignments",
            "curriculum_runtime_states",
            "diagnostic_results",
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
        }
        await closeLivePostgresHarness(harness);
      }
    });

    it("returns all authorized scopes without leaking an unauthorized scope", async ({
      skip,
    }) => {
      const harness = await openLivePostgresHarness();
      if (!hasAdministrativeCleanupCapability(harness.adminRole)) {
        await closeLivePostgresHarness(harness);
        skip(liveAdminCapabilityMessage);
        return;
      }
      if (
        harness.applicationRole.isSuperuser ||
        harness.applicationRole.bypassesRls
      ) {
        await closeLivePostgresHarness(harness);
        skip(
          "CVG_TEST_DATABASE_URL is privileged; multi-scope participant isolation cannot be evaluated safely",
        );
        return;
      }

      const { application, admin } = harness;
      const participantId = randomUUID();
      const staffId = randomUUID();
      const scopeA = randomUUID();
      const scopeB = randomUUID();
      const unauthorizedScope = randomUUID();
      const invitationId = randomUUID();
      const activityA = randomUUID();
      const activityB = randomUUID();
      const unauthorizedActivity = randomUUID();
      const contentVersionA = randomUUID();
      const contentVersionB = randomUUID();
      const unauthorizedContentVersion = randomUUID();
      const contentA = randomUUID();
      const contentB = randomUUID();
      const unauthorizedContent = randomUUID();
      const assignmentA = randomUUID();
      const assignmentB = randomUUID();
      const unauthorizedAssignment = randomUUID();

      try {
        await admin.db.insert(accounts).values([
          {
            id: participantId,
            professionalEmail: `multi-scope-${participantId}@internal.invalid`,
            status: "ACTIVE",
          },
          {
            id: staffId,
            professionalEmail: `multi-scope-staff-${staffId}@internal.invalid`,
            status: "ACTIVE",
          },
        ]);
        await admin.db.insert(accountInvitations).values({
          id: invitationId,
          accountId: participantId,
          tokenHash: `${randomUUID().replaceAll("-", "")}${randomUUID().replaceAll("-", "")}`,
          roles: ["PARTICIPANT"],
          scopes: [scopeA, scopeB],
          expiresAt: new Date("2027-08-26T05:00:00.000Z"),
          acceptedAt: new Date("2026-08-26T04:00:00.000Z"),
          createdBy: staffId,
        });
        await admin.db.insert(learningActivities).values([
          {
            id: activityA,
            scopeId: scopeA,
            slug: `multi-scope-a-${activityA}`,
            moduleId: "M01",
            title: "Atividade autorizada A",
            status: "PUBLISHED",
          },
          {
            id: activityB,
            scopeId: scopeB,
            slug: `multi-scope-b-${activityB}`,
            moduleId: "M02",
            title: "Atividade autorizada B",
            status: "PUBLISHED",
          },
          {
            id: unauthorizedActivity,
            scopeId: unauthorizedScope,
            slug: `multi-scope-unauthorized-${unauthorizedActivity}`,
            moduleId: "M03",
            title: "Atividade fora do escopo",
            status: "PUBLISHED",
          },
        ]);
        await admin.db.insert(contentVersions).values([
          {
            id: contentVersionA,
            contentId: contentA,
            scopeId: scopeA,
            version: 1,
            status: "PUBLICADO",
            kind: "QUESTAO",
            title: "Questão autorizada A",
            participantText: "Resposta sintética A.",
            responseMode: "TEXT",
          },
          {
            id: contentVersionB,
            contentId: contentB,
            scopeId: scopeB,
            version: 1,
            status: "PUBLICADO",
            kind: "QUESTAO",
            title: "Questão autorizada B",
            participantText: "Resposta sintética B.",
            responseMode: "TEXT",
          },
          {
            id: unauthorizedContentVersion,
            contentId: unauthorizedContent,
            scopeId: unauthorizedScope,
            version: 1,
            status: "PUBLICADO",
            kind: "QUESTAO",
            title: "Questão fora do escopo",
            participantText: "Resposta sintética fora do escopo.",
            responseMode: "TEXT",
          },
        ]);
        await admin.db.insert(learningActivityItems).values([
          {
            activityId: activityA,
            contentVersionId: contentVersionA,
            ordinal: 1,
          },
          {
            activityId: activityB,
            contentVersionId: contentVersionB,
            ordinal: 1,
          },
          {
            activityId: unauthorizedActivity,
            contentVersionId: unauthorizedContentVersion,
            ordinal: 1,
          },
        ]);
        await admin.db.insert(learningAssignments).values([
          {
            id: assignmentA,
            participantId,
            scopeId: scopeA,
            moduleId: "M01",
            availableAt: new Date("2026-08-26T05:00:00.000Z"),
            status: "DISPONIVEL",
            version: 0,
          },
          {
            id: assignmentB,
            participantId,
            scopeId: scopeB,
            moduleId: "M02",
            availableAt: new Date("2026-08-26T05:00:00.000Z"),
            status: "DISPONIVEL",
            version: 0,
          },
          {
            id: unauthorizedAssignment,
            participantId,
            scopeId: unauthorizedScope,
            moduleId: "M03",
            availableAt: new Date("2026-08-26T05:00:00.000Z"),
            status: "DISPONIVEL",
            version: 0,
          },
        ]);
        await admin.db.insert(activityAssignments).values([
          {
            participantId,
            activityId: activityA,
            learningAssignmentId: assignmentA,
            status: "DISPONIVEL",
          },
          {
            participantId,
            activityId: activityB,
            learningAssignmentId: assignmentB,
            status: "DISPONIVEL",
          },
          {
            participantId,
            activityId: unauthorizedActivity,
            learningAssignmentId: unauthorizedAssignment,
            status: "DISPONIVEL",
          },
        ]);

        const journeyRepository = createParticipantJourneyRepository(
          application.db,
        );
        const journey = await journeyRepository.findParticipantLearningJourney(
          participantId,
          [scopeA, scopeB, unauthorizedScope],
        );
        expect(journey.activities).toHaveLength(2);
        expect(
          journey.activities.map((activity) => activity.scopeId).sort(),
        ).toEqual([scopeA, scopeB].sort());
        expect(journey.assignments).toHaveLength(2);
        expect(
          journey.assignments.map((assignment) => assignment.scopeId).sort(),
        ).toEqual([scopeA, scopeB].sort());

        const reorderedJourney =
          await journeyRepository.findParticipantLearningJourney(
            participantId,
            [scopeB, unauthorizedScope, scopeA],
          );
        expect(reorderedJourney.activities).toHaveLength(2);
        expect(
          reorderedJourney.activities
            .map((activity) => activity.scopeId)
            .sort(),
        ).toEqual([scopeA, scopeB].sort());
        expect(
          reorderedJourney.assignments
            .map((assignment) => assignment.scopeId)
            .sort(),
        ).toEqual([scopeA, scopeB].sort());

        const oracleRows = await application.db.transaction(async (tx) => {
          await setDatabaseSecurityContext(tx, {
            participantId,
            scopeId: scopeA,
          });
          return tx.execute(
            sql`select
              cvg_learning_activity_journey_visible(${activityA}::uuid, ${participantId}::text) as "matching",
              cvg_learning_activity_journey_visible(${activityB}::uuid, ${participantId}::text) as "crossScope",
              cvg_learning_activity_journey_visible(${activityA}::uuid, ${staffId}::text) as "crossParticipant"`,
          );
        });
        expect(oracleRows).toEqual([
          { matching: true, crossScope: false, crossParticipant: false },
        ]);
        const withoutParticipantOracleRows = await application.db.transaction(
          async (tx) => {
            await setDatabaseSecurityContext(tx, { scopeId: scopeA });
            return tx.execute(
              sql`select cvg_learning_activity_journey_visible(${activityA}::uuid, ${participantId}::text) as "visible"`,
            );
          },
        );
        expect(withoutParticipantOracleRows).toEqual([{ visible: false }]);
      } finally {
        try {
          for (const activityId of [
            activityA,
            activityB,
            unauthorizedActivity,
          ]) {
            await admin.db
              .delete(activityAssignments)
              .where(
                and(
                  eq(activityAssignments.participantId, participantId),
                  eq(activityAssignments.activityId, activityId),
                ),
              );
          }
          for (const activityId of [
            activityA,
            activityB,
            unauthorizedActivity,
          ]) {
            await admin.db
              .delete(learningActivityItems)
              .where(eq(learningActivityItems.activityId, activityId));
          }
          for (const assignmentId of [
            assignmentA,
            assignmentB,
            unauthorizedAssignment,
          ]) {
            await admin.db
              .delete(learningAssignments)
              .where(eq(learningAssignments.id, assignmentId));
          }
          for (const activityId of [
            activityA,
            activityB,
            unauthorizedActivity,
          ]) {
            await admin.db
              .delete(learningActivities)
              .where(eq(learningActivities.id, activityId));
          }
          for (const contentVersionId of [
            contentVersionA,
            contentVersionB,
            unauthorizedContentVersion,
          ]) {
            await admin.db
              .delete(contentVersions)
              .where(eq(contentVersions.id, contentVersionId));
          }
          await admin.db
            .delete(accountInvitations)
            .where(eq(accountInvitations.id, invitationId));
          await admin.db.delete(accounts).where(eq(accounts.id, participantId));
          await admin.db.delete(accounts).where(eq(accounts.id, staffId));
        } finally {
          await closeLivePostgresHarness(harness);
        }
      }
    });
  },
);
