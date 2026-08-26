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
  accountInvitations,
  accounts,
  appeals,
  assessmentWorkflows,
  auditEntries,
  attempts,
  contentVersions,
  feedbackTickets,
  feedbackTicketHistory,
  learningActivities,
  learningActivityItems,
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
      if (
        harness.applicationRole.isSuperuser ||
        harness.applicationRole.bypassesRls
      ) {
        await closeLivePostgresHarness(harness);
        skip(
          "CVG_TEST_DATABASE_URL is privileged; feedback RLS behavior cannot be evaluated safely",
        );
        return;
      }
      const { application: database, admin } = harness;

      const participantId = randomUUID();
      const otherParticipantId = randomUUID();
      const staffId = randomUUID();
      const scopeId = randomUUID();
      const otherScopeId = randomUUID();
      const activityId = randomUUID();
      const attemptId = randomUUID();
      const assignmentId = randomUUID();
      const invitationId = randomUUID();
      const resultId = randomUUID();
      const ticketId = randomUUID();
      const participantInsertTicketId = randomUUID();
      const forgedInsertTicketId = randomUUID();
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
      const feedbackCreateRequestId = randomUUID();
      const feedbackCreateCorrelationId = randomUUID();
      const feedbackTransitionRequestId = randomUUID();
      const feedbackTransitionCorrelationId = randomUUID();
      const feedbackCreateContext = {
        ...context,
        requestId: feedbackCreateRequestId,
        correlationId: feedbackCreateCorrelationId,
      } as const;
      const feedbackTransitionContext = {
        ...context,
        requestId: feedbackTransitionRequestId,
        correlationId: feedbackTransitionCorrelationId,
      } as const;
      const feedbackStaffContext = {
        scopeId,
        actorId: staffId,
        requestId: feedbackTransitionContext.requestId,
        correlationId: feedbackTransitionContext.correlationId,
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
          {
            id: staffId,
            professionalEmail: `state-staff-${staffId}@example.invalid`,
            status: "ACTIVE",
          },
        ]);
        await admin.db.insert(accountInvitations).values({
          id: invitationId,
          accountId: participantId,
          tokenHash: `${randomUUID().replaceAll("-", "")}${randomUUID().replaceAll("-", "")}`,
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
          expiresAt: new Date("2027-08-10T05:00:00.000Z"),
          acceptedAt: new Date("2026-08-10T04:00:00.000Z"),
          createdBy: staffId,
        });
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
        await repository.saveFeedbackTicket(
          feedbackCreateContext,
          initialTicket,
        );
        await repository.saveFeedbackTicketAsStaff(
          feedbackStaffContext,
          ticket,
        );

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
              requestId: feedbackCreateRequestId,
              correlationId: feedbackCreateCorrelationId,
            }),
            expect.objectContaining({
              principalId: staffId,
              action: "FEEDBACK_TICKET_STATUS_CHANGED",
              resourceType: "feedback_ticket",
              resourceId: ticketId,
              scopeId,
              requestId: feedbackTransitionRequestId,
              correlationId: feedbackTransitionCorrelationId,
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
          .where(
            and(
              eq(feedbackTicketHistory.ticketId, ticketId),
              eq(feedbackTicketHistory.scopeId, scopeId),
            ),
          )
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
            .where(
              and(
                eq(feedbackTicketHistory.ticketId, ticketId),
                eq(feedbackTicketHistory.scopeId, scopeId),
              ),
            )
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
              `grant usage on schema public to "${rlsRole}"; grant select, insert, update, delete on table learning_assignments, assessment_workflows, feedback_tickets, feedback_ticket_history, appeals to "${rlsRole}"`,
            ),
          );
          await admin.db.execute(
            sql.raw(
              `grant execute on function public.cvg_participant_in_scope(uuid,uuid) to "${rlsRole}"`,
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
        }
        const participantInsertTicket = createFeedbackTicket({
          ticketId: participantInsertTicketId,
          participantId: otherParticipantId,
          type: "BUG_TECNICO",
          description: "Relato sintético de inserção no próprio escopo.",
          createdAt: "2026-08-10T12:02:00.000Z",
        });
        await repository.saveFeedbackTicket(
          {
            participantId: otherParticipantId,
            scopeId,
            actorId: otherParticipantId,
            requestId: randomUUID(),
            correlationId: randomUUID(),
          },
          participantInsertTicket,
        );
        const ownParticipantRows = await database.db.transaction(async (tx) => {
          if (rlsRoleCreated) {
            await tx.execute(sql.raw(`set local role "${rlsRole}"`));
          }
          await tx.execute(
            sql`select set_config('cvg.participant_id', ${otherParticipantId}, true), set_config('cvg.scope_id', ${scopeId}, true)`,
          );
          const ticketRows = await tx.execute(
            sql`select id from feedback_tickets where id = ${participantInsertTicketId}`,
          );
          const historyRows = await tx.execute(
            sql`select id from feedback_ticket_history where ticket_id = ${participantInsertTicketId}`,
          );
          return { ticketRows, historyRows };
        });
        expect(ownParticipantRows.ticketRows).toHaveLength(1);
        expect(ownParticipantRows.historyRows).toHaveLength(1);
        const sameScopeOtherParticipantRows = await database.db.transaction(
          async (tx) => {
            if (rlsRoleCreated) {
              await tx.execute(sql.raw(`set local role "${rlsRole}"`));
            }
            await tx.execute(
              sql`select set_config('cvg.participant_id', ${otherParticipantId}, true), set_config('cvg.scope_id', ${scopeId}, true)`,
            );
            const ticketRows = await tx.execute(
              sql`select id from feedback_tickets where id = ${ticketId}`,
            );
            const historyRows = await tx.execute(
              sql`select id from feedback_ticket_history where ticket_id = ${ticketId}`,
            );
            return { ticketRows, historyRows };
          },
        );
        expect(sameScopeOtherParticipantRows.ticketRows).toHaveLength(0);
        expect(sameScopeOtherParticipantRows.historyRows).toHaveLength(0);

        let forgedInsertRows = 0;
        let forgedInsertDenied = false;
        try {
          forgedInsertRows = (
            await database.db.transaction(async (tx) => {
              if (rlsRoleCreated) {
                await tx.execute(sql.raw(`set local role "${rlsRole}"`));
              }
              await tx.execute(
                sql`select set_config('cvg.participant_id', ${otherParticipantId}, true), set_config('cvg.scope_id', ${scopeId}, true)`,
              );
              return tx
                .insert(feedbackTickets)
                .values({
                  id: forgedInsertTicketId,
                  participantId,
                  scopeId,
                  type: "BUG_TECNICO",
                  description: "Tentativa sintética de identidade forjada.",
                  createdAt: new Date("2026-08-10T12:03:00.000Z"),
                  version: 0,
                  status: "NOVO",
                  priority: "NORMAL",
                  assigneeId: null,
                  updatedAt: new Date("2026-08-10T12:03:00.000Z"),
                })
                .returning({ id: feedbackTickets.id });
            })
          ).length;
        } catch {
          forgedInsertDenied = true;
        }
        expect(forgedInsertDenied || forgedInsertRows === 0).toBe(true);
        await expect(
          admin.db
            .select({ id: feedbackTickets.id })
            .from(feedbackTickets)
            .where(eq(feedbackTickets.id, forgedInsertTicketId)),
        ).resolves.toEqual([]);

        let participantUpdateRows = 0;
        let participantUpdateDenied = false;
        try {
          participantUpdateRows = (
            await database.db.transaction(async (tx) => {
              if (rlsRoleCreated) {
                await tx.execute(sql.raw(`set local role "${rlsRole}"`));
              }
              await tx.execute(
                sql`select set_config('cvg.participant_id', ${participantId}, true), set_config('cvg.scope_id', ${scopeId}, true)`,
              );
              return tx
                .update(feedbackTickets)
                .set({ description: "Tentativa sintética não autorizada." })
                .where(eq(feedbackTickets.id, ticketId))
                .returning({ id: feedbackTickets.id });
            })
          ).length;
        } catch {
          participantUpdateDenied = true;
        }
        expect(participantUpdateDenied || participantUpdateRows === 0).toBe(
          true,
        );

        let participantDeleteRows = 0;
        let participantDeleteDenied = false;
        try {
          participantDeleteRows = (
            await database.db.transaction(async (tx) => {
              if (rlsRoleCreated) {
                await tx.execute(sql.raw(`set local role "${rlsRole}"`));
              }
              await tx.execute(
                sql`select set_config('cvg.participant_id', ${participantId}, true), set_config('cvg.scope_id', ${scopeId}, true)`,
              );
              return tx
                .delete(feedbackTickets)
                .where(eq(feedbackTickets.id, ticketId))
                .returning({ id: feedbackTickets.id });
            })
          ).length;
        } catch {
          participantDeleteDenied = true;
        }
        expect(participantDeleteDenied || participantDeleteRows === 0).toBe(
          true,
        );
        await expect(
          admin.db
            .select({
              description: feedbackTickets.description,
              status: feedbackTickets.status,
              version: feedbackTickets.version,
            })
            .from(feedbackTickets)
            .where(eq(feedbackTickets.id, ticketId)),
        ).resolves.toEqual([
          {
            description: initialTicket.description,
            status: "TRIADO",
            version: 1,
          },
        ]);
        const historyAfterParticipantDenied = await admin.db
          .select({ id: feedbackTicketHistory.id })
          .from(feedbackTicketHistory)
          .where(
            and(
              eq(feedbackTicketHistory.ticketId, ticketId),
              eq(feedbackTicketHistory.scopeId, scopeId),
            ),
          )
          .orderBy(asc(feedbackTicketHistory.ticketVersion));
        const auditAfterParticipantDenied = await admin.db
          .select({ id: auditEntries.id })
          .from(auditEntries)
          .where(eq(auditEntries.resourceId, ticketId));
        expect(historyAfterParticipantDenied).toHaveLength(2);
        expect(auditAfterParticipantDenied).toHaveLength(2);

        const forgedHistoryId = randomUUID();
        let forgedHistoryDenied = false;
        try {
          await database.db.transaction(async (tx) => {
            if (rlsRoleCreated) {
              await tx.execute(sql.raw(`set local role "${rlsRole}"`));
            }
            await tx.execute(
              sql`select set_config('cvg.participant_id', ${otherParticipantId}, true), set_config('cvg.scope_id', ${scopeId}, true)`,
            );
            await tx.insert(feedbackTicketHistory).values({
              id: forgedHistoryId,
              ticketId,
              scopeId,
              ticketVersion: 1,
              eventType: "STATUS_ALTERADO",
              fromStatus: "NOVO",
              toStatus: "TRIADO",
            });
          });
        } catch {
          forgedHistoryDenied = true;
        }
        expect(forgedHistoryDenied).toBe(true);
        await expect(
          admin.db
            .select({ id: feedbackTicketHistory.id })
            .from(feedbackTicketHistory)
            .where(eq(feedbackTicketHistory.id, forgedHistoryId)),
        ).resolves.toEqual([]);

        const historyId = historyAfterParticipantDenied[0]?.id;
        if (historyId === undefined) {
          throw new Error("feedback history row was not created");
        }
        let historyUpdateRows = 0;
        let historyUpdateDenied = false;
        try {
          historyUpdateRows = (
            await database.db.transaction(async (tx) => {
              if (rlsRoleCreated) {
                await tx.execute(sql.raw(`set local role "${rlsRole}"`));
              }
              await tx.execute(
                sql`select set_config('cvg.participant_id', ${participantId}, true), set_config('cvg.scope_id', ${scopeId}, true)`,
              );
              return tx
                .update(feedbackTicketHistory)
                .set({ toStatus: "EM_TRATAMENTO" })
                .where(eq(feedbackTicketHistory.id, historyId))
                .returning({ id: feedbackTicketHistory.id });
            })
          ).length;
        } catch {
          historyUpdateDenied = true;
        }
        expect(historyUpdateDenied || historyUpdateRows === 0).toBe(true);

        let historyDeleteRows = 0;
        let historyDeleteDenied = false;
        try {
          historyDeleteRows = (
            await database.db.transaction(async (tx) => {
              if (rlsRoleCreated) {
                await tx.execute(sql.raw(`set local role "${rlsRole}"`));
              }
              await tx.execute(
                sql`select set_config('cvg.participant_id', ${participantId}, true), set_config('cvg.scope_id', ${scopeId}, true)`,
              );
              return tx
                .delete(feedbackTicketHistory)
                .where(eq(feedbackTicketHistory.id, historyId))
                .returning({ id: feedbackTicketHistory.id });
            })
          ).length;
        } catch {
          historyDeleteDenied = true;
        }
        expect(historyDeleteDenied || historyDeleteRows === 0).toBe(true);
        await expect(
          admin.db
            .select({
              eventType: feedbackTicketHistory.eventType,
              toStatus: feedbackTicketHistory.toStatus,
            })
            .from(feedbackTicketHistory)
            .where(eq(feedbackTicketHistory.id, historyId)),
        ).resolves.toEqual([{ eventType: "CRIADO", toStatus: "NOVO" }]);
        await expect(
          repository.saveFeedbackTicketAsStaff(feedbackStaffContext, ticket),
        ).rejects.toBeInstanceOf(LearningStatePersistenceConflictError);

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
          .delete(accountInvitations)
          .where(eq(accountInvitations.id, invitationId));
        // Feedback tickets and their history are intentionally retained: both
        // projections are append-only and the parent FK forbids deleting a
        // ticket after its immutable history exists.
        if (rlsRoleCreated) {
          await admin.db.execute(
            sql.raw(
              `revoke all privileges on schema public from "${rlsRole}"; revoke all privileges on table learning_assignments, assessment_workflows, feedback_tickets, feedback_ticket_history, appeals from "${rlsRole}"; revoke execute on function public.cvg_participant_in_scope(uuid,uuid) from "${rlsRole}"; drop role if exists "${rlsRole}"`,
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
      const invitationId = randomUUID();
      const publishedActivityId = randomUUID();
      const progressedActivityId = randomUUID();
      const withdrawnActivityId = randomUUID();
      const legacyActivityId = randomUUID();
      const mismatchedActivityId = randomUUID();
      const contentVersionId = randomUUID();
      const contentId = randomUUID();
      const context = { participantId, scopeId } as const;

      try {
        await admin.db.insert(accounts).values({
          id: participantId,
          professionalEmail: `state-sync-${participantId}@example.invalid`,
          status: "ACTIVE",
        });
        await admin.db.insert(accountInvitations).values({
          id: invitationId,
          accountId: participantId,
          tokenHash: `${randomUUID().replaceAll("-", "")}${randomUUID().replaceAll("-", "")}`,
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
          expiresAt: new Date("2027-08-10T05:00:00.000Z"),
          acceptedAt: new Date("2026-08-10T04:00:00.000Z"),
          createdBy: participantId,
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
        await admin.db.insert(contentVersions).values({
          id: contentVersionId,
          contentId,
          scopeId,
          version: 1,
          status: "PUBLICADO",
          kind: "QUESTAO",
          title: "Item de sincronização sintético",
          participantText: "Selecione a próxima ação segura.",
          responseMode: "TEXT",
        });
        await admin.db.insert(learningActivityItems).values({
          activityId: publishedActivityId,
          contentVersionId,
          ordinal: 1,
        });

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
          .delete(learningActivityItems)
          .where(eq(learningActivityItems.contentVersionId, contentVersionId));
        await admin.db
          .delete(contentVersions)
          .where(eq(contentVersions.id, contentVersionId));
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
          .delete(accountInvitations)
          .where(eq(accountInvitations.id, invitationId));
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
