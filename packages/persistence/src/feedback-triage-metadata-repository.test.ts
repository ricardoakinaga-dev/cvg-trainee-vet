import { describe, expect, it } from "vitest";

import {
  FeedbackTriageMetadataConflictError,
  FeedbackTriageMetadataEligibilityError,
} from "@cvg/application";

import {
  accounts,
  auditEntries,
  feedbackTicketHistory,
  feedbackTickets,
} from "./schema.js";
import { createFeedbackTriageMetadataRepository } from "./feedback-triage-metadata-repository.js";

const actorId = "11111111-1111-4111-8111-111111111111";
const participantId = "22222222-2222-4222-8222-222222222222";
const scopeId = "33333333-3333-4333-8333-333333333333";
const ticketId = "44444444-4444-4444-8444-444444444444";
const requestId = "55555555-5555-4555-8555-555555555555";
const correlationId = "66666666-6666-4666-8666-666666666666";

function ticketRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ticketId,
    participantId,
    scopeId,
    type: "BUG_TECNICO",
    description: "Relato sintético para triagem.",
    createdAt: new Date("2026-08-24T12:00:00.000Z"),
    version: 2,
    status: "TRIADO",
    priority: "NORMAL",
    assigneeId: null,
    updatedAt: new Date("2026-08-24T12:00:00.000Z"),
    ...overrides,
  };
}

function database(options: {
  readonly ticketRows: readonly Record<string, unknown>[];
  readonly actorRows?: readonly Record<string, unknown>[];
  readonly savedRows?: readonly Record<string, unknown>[];
  readonly updateRows?: readonly Record<string, unknown>[];
  readonly inserted?: Array<{ table: unknown; values: unknown }>;
}) {
  let ticketQueries = 0;
  const inserted = options.inserted ?? [];
  const execute = async () => [] as const;
  const transaction = async (work: (executor: unknown) => Promise<unknown>) =>
    work({
      execute,
      select: () => {
        let source: unknown;
        const builder = {
          from(table: unknown) {
            source = table;
            return builder;
          },
          innerJoin() {
            return builder;
          },
          where() {
            return builder;
          },
          limit: async () => {
            if (source === feedbackTickets) {
              ticketQueries += 1;
              return ticketQueries === 1
                ? options.ticketRows
                : (options.savedRows ?? options.ticketRows);
            }
            if (source === accounts)
              return options.actorRows ?? [{ id: actorId }];
            return [];
          },
        };
        return builder;
      },
      update: () => {
        let values: unknown;
        const builder = {
          set(nextValues: unknown) {
            values = nextValues;
            return builder;
          },
          where() {
            return builder;
          },
          returning: async () => {
            if (options.updateRows === undefined) return [{ id: ticketId }];
            return options.updateRows;
          },
          get values() {
            return values;
          },
        };
        return builder;
      },
      insert: (table: unknown) => ({
        values(values: unknown) {
          inserted.push({ table, values });
          return this;
        },
      }),
    });
  return { transaction, inserted };
}

describe("feedback triage metadata persistence", () => {
  it("derives assignment from the actor and atomically writes metadata history and audit", async () => {
    const fake = database({
      ticketRows: [ticketRow()],
      savedRows: [
        ticketRow({ version: 3, priority: "ALTA", assigneeId: actorId }),
      ],
    });
    const result = await createFeedbackTriageMetadataRepository(
      fake as never,
    ).update({
      ticketId,
      scopeIds: [scopeId],
      expectedVersion: 2,
      priority: "ALTA",
      assignment: "ASSUMIR",
      actorId,
      requestId,
      correlationId,
    });

    expect(result).toMatchObject({
      ticketId,
      scopeId,
      version: 3,
      priority: "ALTA",
      assigneeId: actorId,
    });
    expect(fake.inserted).toEqual(
      expect.arrayContaining([
        {
          table: feedbackTicketHistory,
          values: expect.objectContaining({
            eventType: "METADATA_ALTERADO",
            ticketVersion: 3,
            fromPriority: "NORMAL",
            toPriority: "ALTA",
            fromAssigneeId: null,
            toAssigneeId: actorId,
          }),
        },
        {
          table: auditEntries,
          values: expect.objectContaining({
            action: "FEEDBACK_TICKET_TRIAGE_METADATA_UPDATED",
            principalId: actorId,
            scopeId,
          }),
        },
      ]),
    );
  });

  it("does not disclose tickets outside authorized scopes and rejects ineligible actors", async () => {
    const missing = database({ ticketRows: [] });
    await expect(
      createFeedbackTriageMetadataRepository(missing as never).update({
        ticketId,
        scopeIds: [scopeId],
        expectedVersion: 0,
        priority: "NORMAL",
        assignment: "MANTER",
        actorId,
        requestId,
        correlationId,
      }),
    ).resolves.toBeNull();

    const ineligible = database({ ticketRows: [ticketRow()], actorRows: [] });
    await expect(
      createFeedbackTriageMetadataRepository(ineligible as never).update({
        ticketId,
        scopeIds: [scopeId],
        expectedVersion: 2,
        priority: "ALTA",
        assignment: "ASSUMIR",
        actorId,
        requestId,
        correlationId,
      }),
    ).rejects.toBeInstanceOf(FeedbackTriageMetadataEligibilityError);
  });

  it("maps a compare-and-set miss to a conflict", async () => {
    const fake = database({ ticketRows: [ticketRow()], updateRows: [] });
    await expect(
      createFeedbackTriageMetadataRepository(fake as never).update({
        ticketId,
        scopeIds: [scopeId],
        expectedVersion: 2,
        priority: "ALTA",
        assignment: "LIBERAR",
        actorId,
        requestId,
        correlationId,
      }),
    ).rejects.toBeInstanceOf(FeedbackTriageMetadataConflictError);
  });
});
