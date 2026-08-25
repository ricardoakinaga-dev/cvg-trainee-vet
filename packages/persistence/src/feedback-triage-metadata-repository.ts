import { randomUUID } from "node:crypto";

import { and, eq, isNotNull, or, sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  FeedbackTriageMetadataConflictError,
  FeedbackTriageMetadataEligibilityError,
  type FeedbackTriageMetadataReadPort,
  type FeedbackTriageMetadataState,
  type FeedbackTriageMetadataUpdateInput,
} from "@cvg/application";

import {
  feedbackTicketHistory,
  feedbackTickets,
  accountInvitations,
  accounts,
  auditEntries,
} from "./schema.js";
import type * as schema from "./schema.js";
import {
  feedbackTicketRowToState,
  type FeedbackTicketRowShape,
} from "./learning-state-repository.js";
import { setDatabaseSecurityContext } from "./security-context.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

const priorities = ["BAIXA", "NORMAL", "ALTA", "URGENTE"] as const;
const assignments = ["MANTER", "ASSUMIR", "LIBERAR"] as const;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function assertUuid(value: string, field: string): void {
  if (!uuidPattern.test(value)) throw new TypeError(`${field} is invalid`);
}

function assertInput(input: FeedbackTriageMetadataUpdateInput): void {
  assertUuid(input.ticketId, "ticketId");
  if (
    !Array.isArray(input.scopeIds) ||
    input.scopeIds.length === 0 ||
    input.scopeIds.length > 100
  ) {
    throw new TypeError("scopeIds are invalid");
  }
  for (const scopeId of input.scopeIds) assertUuid(scopeId, "scopeId");
  assertUuid(input.actorId, "actorId");
  assertUuid(input.requestId, "requestId");
  assertUuid(input.correlationId, "correlationId");
  if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) {
    throw new TypeError("expectedVersion is invalid");
  }
  if (!priorities.includes(input.priority)) {
    throw new TypeError("priority is invalid");
  }
  if (!assignments.includes(input.assignment)) {
    throw new TypeError("assignment is invalid");
  }
}

async function assertEligibleActor(
  executor: DatabaseExecutor,
  actorId: string,
  scopeId: string,
): Promise<void> {
  const eligible = await executor
    .select({ id: accounts.id })
    .from(accounts)
    .innerJoin(
      accountInvitations,
      eq(accountInvitations.accountId, accounts.id),
    )
    .where(
      and(
        eq(accounts.id, actorId),
        eq(accounts.status, "ACTIVE"),
        isNotNull(accountInvitations.acceptedAt),
        sql`${accountInvitations.scopes} @> ${JSON.stringify([scopeId])}::jsonb`,
        or(
          sql`${accountInvitations.roles} @> ${JSON.stringify(["MODERATOR"])}::jsonb`,
          sql`${accountInvitations.roles} @> ${JSON.stringify(["ADMIN"])}::jsonb`,
        ),
      ),
    )
    .limit(1);
  if (eligible.length === 0) {
    throw new FeedbackTriageMetadataEligibilityError();
  }
}

function toState(row: FeedbackTicketRowShape): FeedbackTriageMetadataState {
  const mapped = feedbackTicketRowToState(row);
  return Object.freeze({
    ticketId: mapped.state.ticketId,
    scopeId: mapped.scopeId,
    status: mapped.state.status,
    version: mapped.state.version,
    priority: mapped.state.priority,
    ...(mapped.state.assigneeId === undefined
      ? {}
      : { assigneeId: mapped.state.assigneeId }),
  });
}

export function createFeedbackTriageMetadataRepository(
  db: DatabaseExecutor,
): FeedbackTriageMetadataReadPort {
  return Object.freeze({
    update: async (
      input: FeedbackTriageMetadataUpdateInput,
    ): Promise<FeedbackTriageMetadataState | null> => {
      assertInput(input);
      return db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        for (const scopeId of [...new Set(input.scopeIds)]) {
          await setDatabaseSecurityContext(executor, { scopeId });
          const rows = await executor
            .select()
            .from(feedbackTickets)
            .where(
              and(
                eq(feedbackTickets.id, input.ticketId),
                eq(feedbackTickets.scopeId, scopeId),
              ),
            )
            .limit(1);
          const current = rows[0] as FeedbackTicketRowShape | undefined;
          if (current === undefined) continue;

          await assertEligibleActor(executor, input.actorId, scopeId);
          const currentState = feedbackTicketRowToState(current).state;
          const nextAssigneeId =
            input.assignment === "ASSUMIR"
              ? input.actorId
              : input.assignment === "LIBERAR"
                ? null
                : (currentState.assigneeId ?? null);
          const nextVersion = input.expectedVersion + 1;
          const updatedAt = new Date();
          const updated = await executor
            .update(feedbackTickets)
            .set({
              priority: input.priority,
              assigneeId: nextAssigneeId,
              version: nextVersion,
              updatedAt,
            })
            .where(
              and(
                eq(feedbackTickets.id, input.ticketId),
                eq(feedbackTickets.scopeId, scopeId),
                eq(feedbackTickets.version, input.expectedVersion),
              ),
            )
            .returning({ id: feedbackTickets.id });
          if (updated.length === 0) {
            throw new FeedbackTriageMetadataConflictError();
          }

          await executor.insert(feedbackTicketHistory).values({
            ticketId: input.ticketId,
            scopeId,
            ticketVersion: nextVersion,
            eventType: "METADATA_ALTERADO",
            fromStatus: currentState.status,
            toStatus: currentState.status,
            fromPriority: currentState.priority,
            toPriority: input.priority,
            fromAssigneeId: currentState.assigneeId ?? null,
            toAssigneeId: nextAssigneeId,
            createdAt: updatedAt,
          });

          await executor.execute(
            sql`select
              set_config('cvg.audit_write', 'on', true),
              set_config('cvg.audit_read', '', true),
              set_config('cvg.audit_scope_id', ${scopeId}, true)`,
          );
          await executor.insert(auditEntries).values({
            id: randomUUID(),
            actorKind: "AUTHENTICATED",
            principalId: input.actorId,
            action: "FEEDBACK_TICKET_TRIAGE_METADATA_UPDATED",
            resourceType: "feedback_ticket",
            resourceId: input.ticketId,
            scopeId,
            outcome: "SUCCESS",
            reasonCode: "feedback_ticket_triage_metadata_updated",
            requestId: input.requestId,
            correlationId: input.correlationId,
            beforeHash: null,
            afterHash: null,
            occurredAt: updatedAt,
          });

          const savedRows = await executor
            .select()
            .from(feedbackTickets)
            .where(
              and(
                eq(feedbackTickets.id, input.ticketId),
                eq(feedbackTickets.scopeId, scopeId),
              ),
            )
            .limit(1);
          const saved = savedRows[0] as FeedbackTicketRowShape | undefined;
          if (saved === undefined) {
            throw new FeedbackTriageMetadataConflictError(
              "feedback ticket was not persisted",
            );
          }
          return toState(saved);
        }
        return null;
      });
    },
  });
}
