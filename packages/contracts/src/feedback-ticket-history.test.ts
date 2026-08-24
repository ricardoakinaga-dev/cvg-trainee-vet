import { describe, expect, it } from "vitest";

import {
  feedbackTicketHistoryPathSchema,
  feedbackTicketHistoryProjectionSchema,
  feedbackTicketHistoryQuerySchema,
} from "./feedback-ticket-history.js";

const ticketId = "11111111-1111-4111-8111-111111111111";
const historyId = "22222222-2222-4222-8222-222222222222";
const createdAt = "2026-08-24T17:00:00.000Z";

describe("feedback ticket history contracts", () => {
  it("accepts a bounded internal timeline with deterministic event fields", () => {
    expect(feedbackTicketHistoryPathSchema.parse({ ticketId })).toEqual({
      ticketId,
    });
    expect(feedbackTicketHistoryQuerySchema.parse({ limit: 25 })).toEqual({
      limit: 25,
    });
    const result = feedbackTicketHistoryProjectionSchema.parse({
      ticketId,
      events: [
        {
          historyId,
          ticketId,
          ticketVersion: 0,
          eventType: "CRIADO",
          toStatus: "NOVO",
          createdAt,
        },
        {
          historyId: "33333333-3333-4333-8333-333333333333",
          ticketId,
          ticketVersion: 1,
          eventType: "STATUS_ALTERADO",
          fromStatus: "NOVO",
          toStatus: "TRIADO",
          createdAt,
        },
      ],
    });
    expect(result.ticketId).toBe(ticketId);
    expect(result.events[0]?.eventType).toBe("CRIADO");
  });

  it("rejects public or unsafe fields and invalid bounds", () => {
    expect(() =>
      feedbackTicketHistoryProjectionSchema.parse({
        ticketId,
        events: [
          {
            historyId,
            ticketId,
            ticketVersion: 0,
            eventType: "CRIADO",
            toStatus: "NOVO",
            createdAt,
            description: "do not expose ticket text here",
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      feedbackTicketHistoryQuerySchema.parse({ limit: 101 }),
    ).toThrow();
    expect(() =>
      feedbackTicketHistoryPathSchema.parse({ ticketId, scopeId: ticketId }),
    ).toThrow();
  });
});
