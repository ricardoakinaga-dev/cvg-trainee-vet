import { describe, expect, it } from "vitest";

import {
  createFeedbackTicketHistoryRepository,
  feedbackTicketHistoryRowToEvent,
  type FeedbackTicketHistoryRowShape,
} from "./feedback-ticket-history-repository.js";
import { feedbackTicketHistory, feedbackTickets } from "./schema.js";

const ticketId = "11111111-1111-4111-8111-111111111111";

function row(
  overrides: Partial<FeedbackTicketHistoryRowShape> = {},
): FeedbackTicketHistoryRowShape {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    ticketId,
    scopeId: "33333333-3333-4333-8333-333333333333",
    ticketVersion: 1,
    eventType: "STATUS_ALTERADO",
    fromStatus: "NOVO",
    toStatus: "TRIADO",
    createdAt: new Date("2026-08-24T17:00:00.000Z"),
    ...overrides,
  };
}

describe("feedback ticket history repository mapping", () => {
  it("maps only allowlisted status-transition metadata", () => {
    expect(feedbackTicketHistoryRowToEvent(row())).toEqual({
      historyId: "22222222-2222-4222-8222-222222222222",
      ticketId,
      ticketVersion: 1,
      eventType: "STATUS_ALTERADO",
      fromStatus: "NOVO",
      toStatus: "TRIADO",
      createdAt: "2026-08-24T17:00:00.000Z",
    });
  });

  it("maps creation events without inventing a previous status", () => {
    expect(
      feedbackTicketHistoryRowToEvent(
        row({
          ticketVersion: 0,
          eventType: "CRIADO",
          fromStatus: null,
          toStatus: "NOVO",
        }),
      ).fromStatus,
    ).toBeUndefined();
  });

  it("rejects malformed rows", () => {
    expect(() =>
      feedbackTicketHistoryRowToEvent(row({ ticketVersion: -1 })),
    ).toThrow();
    expect(() =>
      feedbackTicketHistoryRowToEvent(row({ eventType: "CRIADO" })),
    ).toThrow();
  });

  it("sets the scope context before checking the ticket and reading its timeline", async () => {
    const calls: string[] = [];
    const executor = {
      execute: async () => {
        calls.push("security-context");
        return [];
      },
      select: () => {
        let table: object | undefined;
        const builder = {
          from(source: object) {
            table = source;
            return builder;
          },
          where() {
            return builder;
          },
          orderBy() {
            return builder;
          },
          limit: async () => {
            if (table === feedbackTickets) {
              calls.push("ticket-query");
              return [
                {
                  id: ticketId,
                  scopeId: "33333333-3333-4333-8333-333333333333",
                },
              ];
            }
            if (table !== feedbackTicketHistory) {
              throw new Error("unexpected table");
            }
            calls.push("history-query");
            return [
              row({ ticketVersion: 0, eventType: "CRIADO", fromStatus: null }),
            ];
          },
        };
        return builder;
      },
      transaction: async (work: (current: unknown) => Promise<unknown>) =>
        work(executor),
    };

    const result = await createFeedbackTicketHistoryRepository(
      executor as never,
    ).getFeedbackTicketHistory(
      ticketId,
      ["33333333-3333-4333-8333-333333333333"],
      100,
    );

    expect(result).toMatchObject({
      ticketExists: true,
      scopeId: "33333333-3333-4333-8333-333333333333",
      events: [{ ticketVersion: 0, eventType: "CRIADO" }],
    });
    expect(calls).toEqual([
      "security-context",
      "ticket-query",
      "history-query",
    ]);
  });

  it("does not disclose a ticket outside the authorized scopes", async () => {
    const executor = {
      execute: async () => [],
      select: () => {
        const builder = {
          from: () => builder,
          where: () => builder,
          orderBy: () => builder,
          limit: async () => [],
        };
        return builder;
      },
      transaction: async (work: (current: unknown) => Promise<unknown>) =>
        work(executor),
    };

    const result = await createFeedbackTicketHistoryRepository(
      executor as never,
    ).getFeedbackTicketHistory(
      ticketId,
      ["33333333-3333-4333-8333-333333333333"],
      100,
    );

    expect(result).toMatchObject({ ticketExists: false, events: [] });
  });
});
