import { describe, expect, it } from "vitest";

import {
  getFeedbackTicketHistory,
  type FeedbackTicketHistoryReadPort,
} from "./feedback-ticket-history-use-cases.js";

const principalId = "11111111-1111-4111-8111-111111111111";
const ticketId = "22222222-2222-4222-8222-222222222222";
const scopeId = "33333333-3333-4333-8333-333333333333";
const createdAt = "2026-08-24T17:00:00.000Z";

const event = {
  historyId: "44444444-4444-4444-8444-444444444444",
  ticketId,
  ticketVersion: 0,
  eventType: "CRIADO" as const,
  toStatus: "NOVO" as const,
  createdAt,
};

function command(
  overrides: Partial<Parameters<typeof getFeedbackTicketHistory>[0]> = {},
) {
  return {
    principalId,
    accountStatus: "ACTIVE" as const,
    roles: ["MODERATOR"] as const,
    scopes: [scopeId],
    ticketId,
    limit: 100,
    ...overrides,
  };
}

function port(
  result: Awaited<
    ReturnType<FeedbackTicketHistoryReadPort["getFeedbackTicketHistory"]>
  >,
): FeedbackTicketHistoryReadPort {
  return {
    getFeedbackTicketHistory: async () => result,
  };
}

describe("getFeedbackTicketHistory", () => {
  it("returns a scoped, sorted, immutable internal timeline", async () => {
    const result = await getFeedbackTicketHistory(
      command(),
      port({
        ticketExists: true,
        scopeId,
        events: [event],
      }),
    );

    expect(result).not.toBeNull();
    if (result === null) return;
    expect(result).toEqual({ ticketId, scopeId, events: [event] });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.events)).toBe(true);
  });

  it("returns null for a ticket outside every authorized scope", async () => {
    await expect(
      getFeedbackTicketHistory(
        command(),
        port({ ticketExists: false, scopeId: "", events: [] }),
      ),
    ).resolves.toBeNull();
  });

  it("denies callers without the internal queue capability", async () => {
    await expect(
      getFeedbackTicketHistory(
        command({ roles: ["PARTICIPANT"] as const }),
        port({ ticketExists: true, scopeId, events: [event] }),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("fails closed when persistence returns an unauthorized or oversized timeline", async () => {
    await expect(
      getFeedbackTicketHistory(
        command(),
        port({ ticketExists: true, scopeId: ticketId, events: [event] }),
      ),
    ).rejects.toMatchObject({ code: "internal_error" });

    await expect(
      getFeedbackTicketHistory(
        command({ limit: 1 }),
        port({
          ticketExists: true,
          scopeId,
          events: [
            event,
            { ...event, historyId: principalId, ticketVersion: 1 },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: "internal_error" });
  });
});
