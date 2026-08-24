import { describe, expect, it } from "vitest";

import {
  appealReviewHistoryProjectionSchema,
  appealReviewHistoryQuerySchema,
} from "./appeal-review-history.js";

const appealId = "11111111-1111-4111-8111-111111111111";
const historyId = "22222222-2222-4222-8222-222222222222";

describe("appeal review history contracts", () => {
  it("accepts an internal bounded timeline with allowlisted fields", () => {
    const result = appealReviewHistoryProjectionSchema.parse({
      appealId,
      events: [
        {
          historyId,
          appealId,
          appealVersion: 1,
          eventType: "DECIDIR",
          fromStatus: "EM_REVISAO",
          toStatus: "DECIDIDA",
          reviewerId: "33333333-3333-4333-8333-333333333333",
          decision: "MANTER_RESULTADO",
          decisionRationale: "Rationale interno sintético.",
          decisionAt: "2026-08-24T12:00:00.000Z",
          decisionCorrelationId: "44444444-4444-4444-8444-444444444444",
          createdAt: "2026-08-24T12:00:01.000Z",
        },
      ],
    });

    expect(result.events[0]?.eventType).toBe("DECIDIR");
    expect(appealReviewHistoryQuerySchema.parse({ limit: 100 })).toEqual({
      limit: 100,
    });
    expect(appealReviewHistoryQuerySchema.parse({})).toEqual({});
  });

  it("rejects internal fields outside the strict projection and unbounded limits", () => {
    expect(() =>
      appealReviewHistoryProjectionSchema.parse({
        appealId,
        events: [
          {
            historyId,
            appealId,
            appealVersion: 1,
            eventType: "ATRIBUIR_REVISOR",
            fromStatus: "ABERTA",
            toStatus: "EM_REVISAO",
            createdAt: "2026-08-24T12:00:00.000Z",
            participantId: "55555555-5555-4555-8555-555555555555",
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      appealReviewHistoryQuerySchema.parse({ limit: 101 }),
    ).toThrow();
  });
});
