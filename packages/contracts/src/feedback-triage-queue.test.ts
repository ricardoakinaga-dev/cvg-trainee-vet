import { describe, expect, it } from "vitest";

import {
  feedbackTriageQueueProjectionSchema,
  feedbackTriageQueueQuerySchema,
} from "./feedback-triage-queue.js";

const scopeId = "11111111-1111-4111-8111-111111111111";
const ticketId = "33333333-3333-4333-8333-333333333333";

describe("feedback triage queue contract", () => {
  it("defaults to a bounded scoped query and parses an allowlisted item", () => {
    expect(
      feedbackTriageQueueQuerySchema.parse({
        scopeId,
        cursor: "cursor-page-2",
      }),
    ).toEqual({
      scopeId,
      cursor: "cursor-page-2",
      limit: 50,
    });
    expect(
      feedbackTriageQueueProjectionSchema.parse({
        kind: "feedback_triage_queue",
        scopeId,
        generatedAt: "2026-08-24T12:00:00.000Z",
        filters: { scopeId, status: "NOVO", limit: 25 },
        items: [
          {
            ticketId,
            type: "ERRO_CONTEUDO",
            description: "Relato sintético para triagem.",
            createdAt: "2026-08-24T11:00:00.000Z",
            status: "NOVO",
            version: 0,
            priority: "NORMAL",
          },
        ],
      }),
    ).toMatchObject({
      kind: "feedback_triage_queue",
      items: [{ ticketId, status: "NOVO" }],
    });
  });

  it("rejects unknown fields and unsafe bounds", () => {
    expect(() =>
      feedbackTriageQueueQuerySchema.parse({
        scopeId,
        participantId: "22222222-2222-4222-8222-222222222222",
      }),
    ).toThrow();
    expect(() =>
      feedbackTriageQueueQuerySchema.parse({
        scopeId,
        cursor: "cursor with spaces",
      }),
    ).toThrow();
    expect(() =>
      feedbackTriageQueueProjectionSchema.parse({
        kind: "feedback_triage_queue",
        scopeId,
        generatedAt: "2026-08-24T12:00:00.000Z",
        filters: { scopeId, limit: 101 },
        items: [],
      }),
    ).toThrow();
  });
});
