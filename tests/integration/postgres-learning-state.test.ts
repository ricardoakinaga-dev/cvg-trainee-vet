import { randomUUID } from "node:crypto";

import { and, asc, eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  createAppeal,
  createAssessmentWorkflowResult,
  createFeedbackTicket,
  createLearningAssignment,
  transitionAssessmentWorkflowResult,
  transitionFeedbackTicket,
  transitionLearningAssignment,
} from "../../packages/domain/src/index.js";

import {
  createAppealReadRepository,
  createLearningStateRepository,
  LearningStatePersistenceConflictError,
} from "../../packages/persistence/src/learning-state-repository.js";
import {
  activityAssignments,
  accounts,
  appeals,
  assessmentWorkflows,
  auditEntries,
  attempts,
  feedbackTickets,
  feedbackTicketHistory,
  learningActivities,
  learningAssignments,
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
  "PostgreSQL learning state persistence and contextual RLS",
  () => {
    it("persists versioned learning states atomically and denies cross-context reads", async ({
      skip,
    }) => {
      const harness = await openLivePostgresHarness();
      if (!hasAdministrativeCleanupCapability(harness.adminRole)) {
        await closeLivePostgresHarness(harness);
        skip(liveAdminCapabilityMessage);
        return;
      }
      const { application: database, admin } = harness;

      const participantId = randomUUID();
      const otherParticipantId = randomUUID();
      const scopeId = randomUUID();
      const otherScopeId = randomUUID();
      const activityId = randomUUID();
      const attemptId = randomUUID();
      const assignmentId = randomUUID();
      const resultId = randomUUID();
      const ticketId = randomUUID();
      const appealId = randomUUID();
      const itemId = randomUUID();
      const rlsRole = `cvg_rls_${randomUUID().replaceAll("-", "")}`;
      let rlsRoleCreated = false;
      const context = {
        participantId,
        scopeId,
        actorId: participantId,
        requestId: randomUUID(),
        correlationId: randomUUID(),
      } as const;

      try {
        await admin.db.insert(accounts).values([
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
        ]);
        await admin.db.insert(learningActivities).values({
          id: activityId,
          scopeId,
          slug: `state-activity-${activityId}`,
          title: "Atividade sintética de estados",
          status: "PUBLISHED",
        });
        await admin.db.insert(attempts).values({
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

        const history = await admin.db
          .select({
            scopeId: feedbackTicketHistory.scopeId,
            ticketVersion: feedbackTicketHistory.ticketVersion,
            eventType: feedbackTicketHistory.eventType,
            fromStatus: feedbackTicketHistory.fromStatus,
            toStatus: feedbackTicketHistory.toStatus,
          })
          .from(feedbackTicketHistory)
          .where(
            and(
              eq(feedbackTicketHistory.ticketId, ticketId),
              eq(feedbackTicketHistory.scopeId, scopeId),
            ),
          )
          .orderBy(asc(feedbackTicketHistory.ticketVersion));
        expect(history).toEqual([
          {
            scopeId,
            ticketVersion: 0,
            eventType: "CRIADO",
            fromStatus: null,
            toStatus: "NOVO",
          },
          {
            scopeId,
            ticketVersion: 1,
            eventType: "STATUS_ALTERADO",
            fromStatus: "NOVO",
            toStatus: "TRIADO",
          },
        ]);
        const auditHistory = await admin.db
          .select({
            principalId: auditEntries.principalId,
            action: auditEntries.action,
            resourceType: auditEntries.resourceType,
            resourceId: auditEntries.resourceId,
            scopeId: auditEntries.scopeId,
            requestId: auditEntries.requestId,
            correlationId: auditEntries.correlationId,
          })
          .from(auditEntries)
          .where(eq(auditEntries.resourceId, ticketId));
        expect(auditHistory).toHaveLength(2);
        expect(auditHistory).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              principalId: participantId,
              action: "FEEDBACK_TICKET_CREATED",
              resourceType: "feedback_ticket",
              resourceId: ticketId,
              scopeId,
            }),
            expect.objectContaining({
              principalId: participantId,
              action: "FEEDBACK_TICKET_STATUS_CHANGED",
              resourceType: "feedback_ticket",
              resourceId: ticketId,
              scopeId,
            }),
          ]),
        );

        const historyBeforeRollback = await admin.db
          .select({
            ticketVersion: feedbackTicketHistory.ticketVersion,
            eventType: feedbackTicketHistory.eventType,
            fromStatus: feedbackTicketHistory.fromStatus,
            toStatus: feedbackTicketHistory.toStatus,
          })
          .from(feedbackTicketHistory)
          .where(eq(feedbackTicketHistory.ticketId, ticketId))
          .orderBy(asc(feedbackTicketHistory.ticketVersion));

        await expect(
          admin.db.transaction(async (tx) => {
            await tx
              .update(feedbackTickets)
              .set({
                status: "EM_TRATAMENTO",
                version: 2,
                updatedAt: new Date("2026-08-10T12:01:00.000Z"),
              })
              .where(
                and(
                  eq(feedbackTickets.id, ticketId),
                  eq(feedbackTickets.version, 1),
                ),
              );
            await tx.insert(feedbackTicketHistory).values({
              ticketId,
              scopeId,
              ticketVersion: 2,
              eventType: "STATUS_ALTERADO",
              fromStatus: "TRIADO",
              toStatus: "RESOLVIDO",
              createdAt: new Date("2026-08-10T12:01:00.000Z"),
            });
          }),
        ).rejects.toThrow();
        await expect(
          admin.db
            .select({
              status: feedbackTickets.status,
              version: feedbackTickets.version,
            })
            .from(feedbackTickets)
            .where(eq(feedbackTickets.id, ticketId)),
        ).resolves.toEqual([{ status: "TRIADO", version: 1 }]);
        await expect(
          admin.db
            .select({
              ticketVersion: feedbackTicketHistory.ticketVersion,
              eventType: feedbackTicketHistory.eventType,
              fromStatus: feedbackTicketHistory.fromStatus,
              toStatus: feedbackTicketHistory.toStatus,
            })
            .from(feedbackTicketHistory)
            .where(eq(feedbackTicketHistory.ticketId, ticketId))
            .orderBy(asc(feedbackTicketHistory.ticketVersion)),
        ).resolves.toEqual(historyBeforeRollback);

        const initialAppeal = createAppeal({
          appealId,
          participantId,
          attemptId,
          itemId,
          justification: "Solicito revisão do item sintético.",
          createdAt: "2026-08-10T12:00:00.000Z",
        });
        await repository.saveAppeal(context, initialAppeal);

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
          state: { status: "ABERTA", version: 0 },
        });
        expect(
          await createAppealReadRepository(database.db).listAppeals(
            context,
            attemptId,
          ),
        ).toMatchObject([
          {
            scopeId,
            state: { appealId, attemptId, status: "ABERTA" },
          },
        ]);

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
        expect(
          await createAppealReadRepository(database.db).listAppeals(
            otherContext,
            attemptId,
          ),
        ).toEqual([]);

        if (harness.adminRole.canCreateRoles) {
          await admin.db.execute(
            sql.raw(`create role "${rlsRole}" nologin nosuperuser nobypassrls`),
          );
          rlsRoleCreated = true;
          await admin.db.execute(
            sql.raw(
              `grant usage on schema public to "${rlsRole}"; grant select, insert, update, delete on table learning_assignments, assessment_workflows, feedback_tickets, appeals to "${rlsRole}"`,
            ),
          );
          await admin.db.execute(
            sql.raw(
              `grant "${rlsRole}" to "${harness.applicationRole.roleName}"`,
            ),
          );
        } else {
          console.warn(
            "PostgreSQL role-admin capability is absent; learning-state RLS probe uses the configured non-privileged application role",
          );
          if (
            harness.applicationRole.isSuperuser ||
            harness.applicationRole.bypassesRls
          ) {
            skip(
              "CREATE ROLE is unavailable and CVG_TEST_DATABASE_URL is privileged; the RLS probe cannot be evaluated safely",
            );
            return;
          }
        }
        const noContextRows = await database.db.transaction(async (tx) => {
          if (rlsRoleCreated) {
            await tx.execute(sql.raw(`set local role "${rlsRole}"`));
          }
          return tx.execute(
            sql`select id from learning_assignments where id = ${assignmentId}`,
          );
        });
        expect(noContextRows).toHaveLength(0);
        const crossContextRows = await database.db.transaction(async (tx) => {
          if (rlsRoleCreated) {
            await tx.execute(sql.raw(`set local role "${rlsRole}"`));
          }
          await tx.execute(
            sql`select set_config('cvg.participant_id', ${otherParticipantId}, true), set_config('cvg.scope_id', ${otherScopeId}, true)`,
          );
          return tx.execute(
            sql`select id from learning_assignments where id = ${assignmentId}`,
          );
        });
        expect(crossContextRows).toHaveLength(0);

        const policyRows = await admin.db.execute(sql`
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
          database.db.transaction(async (tx) => {
            await tx.execute(
              sql`select set_config('cvg.participant_id', ${participantId}, true), set_config('cvg.scope_id', ${scopeId}, true)`,
            );
            await tx.insert(learningAssignments).values({
              id: rollbackAssignmentId,
              participantId,
              scopeId,
              moduleId: "M04",
              availableAt: new Date("2026-08-10T12:00:00.000Z"),
              status: "ATRIBUIDO",
              version: 0,
            });
            throw new Error("synthetic transaction rollback");
          }),
        ).rejects.toThrow("synthetic transaction rollback");
        const rollbackRows = await database.db
          .select({ id: learningAssignments.id })
          .from(learningAssignments)
          .where(eq(learningAssignments.id, rollbackAssignmentId));
        expect(rollbackRows).toHaveLength(0);

        await expect(
          database.db.transaction(async (tx) => {
            await tx.execute(
              sql`select set_config('cvg.participant_id', ${participantId}, true), set_config('cvg.scope_id', ${scopeId}, true)`,
            );
            await tx.insert(learningAssignments).values({
              id: randomUUID(),
              participantId,
              scopeId,
              moduleId: "M04",
              availableAt: new Date("2026-08-10T12:00:00.000Z"),
              status: "BLOQUEADO",
              version: 0,
              blockReason: null,
            });
          }),
        ).rejects.toThrow();
      } finally {
        await admin.db.transaction(async (tx) => {
          await tx.delete(appeals).where(eq(appeals.id, appealId));
          // The history/audit triggers are append-only; this disposable suite
          // has no other fixtures in these tables, so truncate them during
          // cleanup before removing the ticket/account parents.
          await tx.execute(
            sql`truncate table "feedback_ticket_history", "audit_entries"`,
          );
          await tx
            .delete(feedbackTickets)
            .where(eq(feedbackTickets.id, ticketId));
          await tx
            .delete(assessmentWorkflows)
            .where(eq(assessmentWorkflows.resultId, resultId));
          await tx
            .delete(learningAssignments)
            .where(eq(learningAssignments.id, assignmentId));
        });
        await admin.db.delete(attempts).where(eq(attempts.id, attemptId));
        await admin.db
          .delete(learningActivities)
          .where(eq(learningActivities.id, activityId));
        await admin.db
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
        await admin.db
          .delete(accounts)
          .where(eq(accounts.id, otherParticipantId));
        if (rlsRoleCreated) {
          await admin.db.execute(
            sql.raw(
              `revoke all privileges on schema public from "${rlsRole}"; revoke all privileges on table learning_assignments, assessment_workflows, feedback_tickets, appeals from "${rlsRole}"; drop role if exists "${rlsRole}"`,
            ),
          );
        }
        await closeLivePostgresHarness(harness);
      }
    });

    it("synchronizes only explicit published activity bindings", async ({
      skip,
    }) => {
      const harness = await openLivePostgresHarness();
      if (!hasAdministrativeCleanupCapability(harness.adminRole)) {
        await closeLivePostgresHarness(harness);
        skip(liveAdminCapabilityMessage);
        return;
      }
      const { application: database, admin } = harness;
      if (
        harness.applicationRole.isSuperuser ||
        harness.applicationRole.bypassesRls
      ) {
        await closeLivePostgresHarness(harness);
        skip(
          "CVG_TEST_DATABASE_URL is privileged; JOURNEY-REL-002 RLS behavior cannot be evaluated safely",
        );
        return;
      }
      const participantId = randomUUID();
      const scopeId = randomUUID();
      const assignmentId = randomUUID();
      const publishedActivityId = randomUUID();
      const progressedActivityId = randomUUID();
      const withdrawnActivityId = randomUUID();
      const legacyActivityId = randomUUID();
      const mismatchedActivityId = randomUUID();
      const context = { participantId, scopeId } as const;

      try {
        await admin.db.insert(accounts).values({
          id: participantId,
          professionalEmail: `state-sync-${participantId}@example.invalid`,
          status: "ACTIVE",
        });
        await admin.db.insert(learningActivities).values([
          {
            id: publishedActivityId,
            scopeId,
            slug: `state-sync-published-${publishedActivityId}`,
            title: "Atividade publicada sintética",
            moduleId: "M03",
            status: "PUBLISHED",
          },
          {
            id: withdrawnActivityId,
            scopeId,
            slug: `state-sync-withdrawn-${withdrawnActivityId}`,
            title: "Atividade retirada sintética",
            moduleId: "M03",
            status: "WITHDRAWN",
          },
          {
            id: progressedActivityId,
            scopeId,
            slug: `state-sync-progressed-${progressedActivityId}`,
            title: "Atividade em andamento sintética",
            moduleId: "M03",
            status: "PUBLISHED",
          },
          {
            id: legacyActivityId,
            scopeId,
            slug: `state-sync-legacy-${legacyActivityId}`,
            title: "Atividade legada sintética",
            moduleId: null,
            status: "PUBLISHED",
          },
        ]);

        const repository = createLearningStateRepository(database.db);
        const initial = createLearningAssignment({
          assignmentId,
          participantId,
          moduleId: "M03",
          availableAt: "2026-08-10T10:00:00.000Z",
        });
        const assigned = transitionLearningAssignment(initial, {
          type: "ATRIBUIR",
        });
        await repository.saveLearningAssignment(context, initial);
        await repository.saveLearningAssignment(context, assigned);

        await admin.db.insert(activityAssignments).values([
          {
            participantId,
            activityId: publishedActivityId,
            learningAssignmentId: assignmentId,
            status: "ATRIBUIDO",
          },
          {
            participantId,
            activityId: withdrawnActivityId,
            learningAssignmentId: assignmentId,
            status: "ATRIBUIDO",
          },
          {
            participantId,
            activityId: progressedActivityId,
            learningAssignmentId: assignmentId,
            status: "EM_ANDAMENTO",
          },
          {
            participantId,
            activityId: legacyActivityId,
            learningAssignmentId: null,
            status: "ATRIBUIDO",
          },
        ]);

        const available = transitionLearningAssignment(assigned, {
          type: "DISPONIBILIZAR",
          now: "2026-08-10T12:00:00.000Z",
        });
        await repository.saveLearningAssignment(context, available);

        const activityRows = await admin.db
          .select({
            activityId: activityAssignments.activityId,
            learningAssignmentId: activityAssignments.learningAssignmentId,
            status: activityAssignments.status,
          })
          .from(activityAssignments)
          .where(eq(activityAssignments.participantId, participantId));
        expect(activityRows).toEqual(
          expect.arrayContaining([
            {
              activityId: publishedActivityId,
              learningAssignmentId: assignmentId,
              status: "DISPONIVEL",
            },
            {
              activityId: withdrawnActivityId,
              learningAssignmentId: assignmentId,
              status: "ATRIBUIDO",
            },
            {
              activityId: progressedActivityId,
              learningAssignmentId: assignmentId,
              status: "EM_ANDAMENTO",
            },
            {
              activityId: legacyActivityId,
              learningAssignmentId: null,
              status: "ATRIBUIDO",
            },
          ]),
        );

        await admin.db.insert(learningActivities).values({
          id: mismatchedActivityId,
          scopeId,
          slug: `state-sync-mismatch-${mismatchedActivityId}`,
          title: "Atividade com vínculo inconsistente sintética",
          moduleId: "M04",
          status: "PUBLISHED",
        });
        await admin.db.insert(activityAssignments).values({
          participantId,
          activityId: mismatchedActivityId,
          learningAssignmentId: assignmentId,
          status: "ATRIBUIDO",
        });

        const started = transitionLearningAssignment(available, {
          type: "INICIAR",
        });
        await expect(
          repository.saveLearningAssignment(context, started),
        ).rejects.toThrow();
        await expect(
          admin.db
            .select({ status: learningAssignments.status })
            .from(learningAssignments)
            .where(eq(learningAssignments.id, assignmentId)),
        ).resolves.toEqual([{ status: "DISPONIVEL" }]);
        await expect(
          admin.db
            .select({
              activityId: activityAssignments.activityId,
              status: activityAssignments.status,
            })
            .from(activityAssignments)
            .where(eq(activityAssignments.participantId, participantId)),
        ).resolves.toEqual(
          expect.arrayContaining([
            { activityId: publishedActivityId, status: "DISPONIVEL" },
            { activityId: mismatchedActivityId, status: "ATRIBUIDO" },
          ]),
        );
      } finally {
        await admin.db
          .delete(activityAssignments)
          .where(eq(activityAssignments.participantId, participantId));
        await admin.db
          .delete(learningAssignments)
          .where(eq(learningAssignments.id, assignmentId));
        await admin.db
          .delete(learningActivities)
          .where(
            and(
              eq(learningActivities.scopeId, scopeId),
              eq(learningActivities.id, publishedActivityId),
            ),
          );
        await admin.db
          .delete(learningActivities)
          .where(eq(learningActivities.id, withdrawnActivityId));
        await admin.db
          .delete(learningActivities)
          .where(eq(learningActivities.id, progressedActivityId));
        await admin.db
          .delete(learningActivities)
          .where(eq(learningActivities.id, legacyActivityId));
        await admin.db
          .delete(learningActivities)
          .where(eq(learningActivities.id, mismatchedActivityId));
        await admin.db
          .delete(accounts)
          .where(
            and(
              eq(accounts.id, participantId),
              eq(
                accounts.professionalEmail,
                `state-sync-${participantId}@example.invalid`,
              ),
            ),
          );
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
