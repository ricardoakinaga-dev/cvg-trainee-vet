import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  createAppeal,
  createAssessmentWorkflowResult,
  createFeedbackTicket,
  createLearningAssignment,
  transitionAppeal,
  transitionAssessmentWorkflowResult,
  transitionFeedbackTicket,
  transitionLearningAssignment,
} from "../../packages/domain/src/index.js";

import { createPostgresDatabase } from "../../packages/persistence/src/database.js";
import {
  createLearningStateRepository,
  LearningStatePersistenceConflictError,
} from "../../packages/persistence/src/learning-state-repository.js";
import {
  accounts,
  appeals,
  assessmentWorkflows,
  attempts,
  feedbackTickets,
  learningActivities,
  learningAssignments,
} from "../../packages/persistence/src/schema.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";
const databaseUrl = process.env.CVG_TEST_DATABASE_URL;
const adminDatabaseUrl = process.env.CVG_TEST_ADMIN_DATABASE_URL;

describe.skipIf(
  !runLiveDatabaseTests ||
    databaseUrl === undefined ||
    adminDatabaseUrl === undefined,
)("PostgreSQL learning state persistence and contextual RLS", () => {
  it("persists versioned learning states atomically and denies cross-context reads", async () => {
    if (databaseUrl === undefined || adminDatabaseUrl === undefined)
      throw new Error("application and admin database URLs are required");

    const database = createPostgresDatabase(databaseUrl);
    const adminDatabase = createPostgresDatabase(adminDatabaseUrl);
    const participantId = randomUUID();
    const otherParticipantId = randomUUID();
    const reviewerId = randomUUID();
    const scopeId = randomUUID();
    const otherScopeId = randomUUID();
    const activityId = randomUUID();
    const attemptId = randomUUID();
    const assignmentId = randomUUID();
    const raceAssignmentId = randomUUID();
    const resultId = randomUUID();
    const ticketId = randomUUID();
    const appealId = randomUUID();
    const itemId = randomUUID();
    const rlsRole = `cvg_rls_${randomUUID().replaceAll("-", "")}`;
    const context = { participantId, scopeId } as const;
    let roleCreated = false;

    try {
      await adminDatabase.db.insert(accounts).values([
        {
          id: participantId,
          professionalEmail: `state-${participantId}@example.invalid`,
          status: "ACTIVE",
        },
        {
          id: otherParticipantId,
          professionalEmail: `state-other-${otherParticipantId}@example.invalid`,
          status: "ACTIVE",
        },
        {
          id: reviewerId,
          professionalEmail: `state-reviewer-${reviewerId}@example.invalid`,
          status: "ACTIVE",
        },
      ]);
      await adminDatabase.db.insert(learningActivities).values({
        id: activityId,
        scopeId,
        slug: `state-activity-${activityId}`,
        title: "Atividade sintética de estados",
        status: "PUBLISHED",
      });
      await adminDatabase.db.insert(attempts).values({
        id: attemptId,
        participantId,
        activityId,
        status: "SUBMETIDA",
        version: 1,
        submittedAt: new Date("2026-08-10T11:00:00.000Z"),
      });

      const repository = createLearningStateRepository(database.db);
      const createdAssignment = createLearningAssignment({
        assignmentId,
        participantId,
        moduleId: "M03",
        availableAt: "2026-08-10T10:00:00.000Z",
      });
      const assigned = transitionLearningAssignment(createdAssignment, {
        type: "ATRIBUIR",
      });
      await repository.saveLearningAssignment(context, createdAssignment);
      const savedAssignment = await repository.saveLearningAssignment(
        context,
        assigned,
      );
      expect(savedAssignment.state).toMatchObject({
        assignmentId,
        status: "ATRIBUIDO",
        version: 1,
      });

      const available = transitionLearningAssignment(assigned, {
        type: "DISPONIBILIZAR",
        now: "2026-08-10T12:00:00.000Z",
      });
      await repository.saveLearningAssignment(context, available);
      await expect(
        repository.saveLearningAssignment(context, available),
      ).rejects.toBeInstanceOf(LearningStatePersistenceConflictError);

      const raceCreatedAssignment = createLearningAssignment({
        assignmentId: raceAssignmentId,
        participantId,
        moduleId: "M04",
        availableAt: "2026-08-10T10:00:00.000Z",
      });
      const raceAssignedAssignment = transitionLearningAssignment(
        raceCreatedAssignment,
        { type: "ATRIBUIR" },
      );
      const raceAvailableAssignment = transitionLearningAssignment(
        raceAssignedAssignment,
        { type: "DISPONIBILIZAR", now: "2026-08-10T12:00:00.000Z" },
      );
      const raceStartedAssignment = transitionLearningAssignment(
        raceAvailableAssignment,
        { type: "INICIAR" },
      );
      await repository.saveLearningAssignment(context, raceCreatedAssignment);
      await repository.saveLearningAssignment(context, raceAssignedAssignment);
      await repository.saveLearningAssignment(context, raceAvailableAssignment);
      const raceResults = await Promise.allSettled([
        repository.saveLearningAssignment(context, raceStartedAssignment),
        repository.saveLearningAssignment(context, raceStartedAssignment),
      ]);
      expect(
        raceResults.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        raceResults.filter(
          (result) =>
            result.status === "rejected" &&
            result.reason instanceof LearningStatePersistenceConflictError,
        ),
      ).toHaveLength(1);
      await expect(
        repository.findLearningAssignment(context, raceAssignmentId),
      ).resolves.toMatchObject({
        state: { status: "EM_ANDAMENTO", version: 3 },
      });

      const initialWorkflow = createAssessmentWorkflowResult({
        resultId,
        attemptId,
        ruleVersion: "summative-v1",
      });
      const workflow = transitionAssessmentWorkflowResult(initialWorkflow, {
        type: "DISPONIBILIZAR",
      });
      await repository.saveAssessmentWorkflow(context, initialWorkflow);
      await repository.saveAssessmentWorkflow(context, workflow);

      const initialTicket = createFeedbackTicket({
        ticketId,
        participantId,
        type: "CONTESTACAO",
        description: "Solicitação sintética de revisão.",
        createdAt: "2026-08-10T12:00:00.000Z",
      });
      const ticket = transitionFeedbackTicket(initialTicket, {
        type: "TRIAR",
      });
      await repository.saveFeedbackTicket(context, initialTicket);
      await repository.saveFeedbackTicket(context, ticket);

      const initialAppeal = createAppeal({
        appealId,
        participantId,
        attemptId,
        itemId,
        justification: "Solicito revisão do item sintético.",
        createdAt: "2026-08-10T12:00:00.000Z",
      });
      const appeal = transitionAppeal(initialAppeal, {
        type: "ATRIBUIR_REVISOR",
        reviewerId,
      });
      await repository.saveAppeal(context, initialAppeal);
      await repository.saveAppeal(context, appeal);

      expect(
        await repository.findLearningAssignment(context, assignmentId),
      ).toMatchObject({ state: { status: "DISPONIVEL", version: 2 } });
      expect(
        await repository.findAssessmentWorkflow(context, resultId),
      ).toMatchObject({
        state: { status: "RESULTADO_DISPONIVEL", version: 1 },
      });
      expect(
        await repository.findFeedbackTicket(context, ticketId),
      ).toMatchObject({
        state: { status: "TRIADO", version: 1 },
      });
      expect(await repository.findAppeal(context, appealId)).toMatchObject({
        state: { status: "EM_REVISAO", reviewerId, version: 1 },
      });

      const otherContext = {
        participantId: otherParticipantId,
        scopeId: otherScopeId,
      } as const;
      const otherRepository = createLearningStateRepository(database.db);
      expect(
        await otherRepository.findLearningAssignment(
          otherContext,
          assignmentId,
        ),
      ).toBeNull();
      expect(
        await otherRepository.findFeedbackTicket(otherContext, ticketId),
      ).toBeNull();

      await adminDatabase.db.execute(
        sql.raw(`create role "${rlsRole}" nologin nosuperuser nobypassrls`),
      );
      roleCreated = true;
      await adminDatabase.db.execute(
        sql.raw(
          `grant usage on schema public to "${rlsRole}"; grant select, insert, update, delete on table learning_assignments, assessment_workflows, feedback_tickets, appeals to "${rlsRole}"`,
        ),
      );
      const noContextRows = await adminDatabase.db.transaction(async (tx) => {
        await tx.execute(sql.raw(`set local role "${rlsRole}"`));
        return tx.execute(
          sql`select id from learning_assignments where id = ${assignmentId}`,
        );
      });
      expect(noContextRows).toHaveLength(0);
      const crossContextRows = await adminDatabase.db.transaction(
        async (tx) => {
          await tx.execute(sql.raw(`set local role "${rlsRole}"`));
          await tx.execute(
            sql`select set_config('cvg.participant_id', ${otherParticipantId}, true), set_config('cvg.scope_id', ${otherScopeId}, true)`,
          );
          return tx.execute(
            sql`select id from learning_assignments where id = ${assignmentId}`,
          );
        },
      );
      expect(crossContextRows).toHaveLength(0);

      const policyRows = await adminDatabase.db.execute(sql`
          select c.relname as table_name, c.relrowsecurity, c.relforcerowsecurity
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public'
            and c.relname in ('learning_assignments', 'assessment_workflows', 'feedback_tickets', 'appeals')
          order by c.relname
        `);
      expect(policyRows).toHaveLength(4);
      expect(policyRows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            relrowsecurity: true,
            relforcerowsecurity: true,
          }),
        ]),
      );

      const rollbackAssignmentId = randomUUID();
      await expect(
        adminDatabase.db.transaction(async (tx) => {
          await tx.insert(learningAssignments).values({
            id: rollbackAssignmentId,
            participantId,
            scopeId,
            moduleId: "M05",
            availableAt: new Date("2026-08-10T12:00:00.000Z"),
            status: "ATRIBUIDO",
            version: 0,
          });
          throw new Error("synthetic transaction rollback");
        }),
      ).rejects.toThrow("synthetic transaction rollback");
      const rollbackRows = await adminDatabase.db
        .select({ id: learningAssignments.id })
        .from(learningAssignments)
        .where(eq(learningAssignments.id, rollbackAssignmentId));
      expect(rollbackRows).toHaveLength(0);

      await expect(
        adminDatabase.db.insert(learningAssignments).values({
          id: randomUUID(),
          participantId,
          scopeId,
          moduleId: "M04",
          availableAt: new Date("2026-08-10T12:00:00.000Z"),
          status: "BLOQUEADO",
          version: 0,
          blockReason: null,
        }),
      ).rejects.toThrow();
    } finally {
      await adminDatabase.db.transaction(async (tx) => {
        await tx.execute(
          sql`select set_config('cvg.participant_id', ${participantId}, true), set_config('cvg.scope_id', ${scopeId}, true)`,
        );
        await tx.delete(appeals).where(eq(appeals.id, appealId));
        await tx
          .delete(feedbackTickets)
          .where(eq(feedbackTickets.id, ticketId));
        await tx
          .delete(assessmentWorkflows)
          .where(eq(assessmentWorkflows.resultId, resultId));
        await tx
          .delete(learningAssignments)
          .where(eq(learningAssignments.id, assignmentId));
        await tx
          .delete(learningAssignments)
          .where(eq(learningAssignments.id, raceAssignmentId));
      });
      await adminDatabase.db.delete(attempts).where(eq(attempts.id, attemptId));
      await adminDatabase.db
        .delete(learningActivities)
        .where(eq(learningActivities.id, activityId));
      await adminDatabase.db
        .delete(accounts)
        .where(
          and(
            eq(accounts.id, participantId),
            eq(
              accounts.professionalEmail,
              `state-${participantId}@example.invalid`,
            ),
          ),
        );
      await adminDatabase.db
        .delete(accounts)
        .where(eq(accounts.id, otherParticipantId));
      await adminDatabase.db
        .delete(accounts)
        .where(eq(accounts.id, reviewerId));
      if (roleCreated) {
        await adminDatabase.db.execute(
          sql.raw(
            `revoke all privileges on schema public from "${rlsRole}"; revoke all privileges on table learning_assignments, assessment_workflows, feedback_tickets, appeals from "${rlsRole}"; drop role if exists "${rlsRole}"`,
          ),
        );
      }
      await Promise.all([database.close(), adminDatabase.close()]);
    }
  });
});
