import { describe, expect, it } from "vitest";

import {
  appealReviewQueueProjectionSchema,
  appealReviewQueueQuerySchema,
} from "./appeal-review-queue.js";

const scopeId = "11111111-1111-4111-8111-111111111111";
const appealId = "22222222-2222-4222-8222-222222222222";
const participantId = "33333333-3333-4333-8333-333333333333";
const attemptId = "44444444-4444-4444-8444-444444444444";
const itemId = "55555555-5555-4555-8555-555555555555";

const item = {
  appealId,
  participantId,
  attemptId,
  itemId,
  justification: "Solicito revisão do resultado sintético.",
  createdAt: "2026-08-23T20:00:00.000Z",
  dueAt: "2026-09-02T20:00:00.000Z",
  status: "ABERTA" as const,
  version: 0,
};

describe("appeal review queue contracts", () => {
  it("defaults to a bounded query and accepts only appeal statuses", () => {
    expect(appealReviewQueueQuerySchema.parse({ scopeId })).toEqual({
      scopeId,
      limit: 50,
    });
    expect(
      appealReviewQueueQuerySchema.parse({
        scopeId,
        status: "RECALCULO_PENDENTE",
        limit: 100,
      }),
    ).toEqual({
      scopeId,
      status: "RECALCULO_PENDENTE",
      limit: 100,
    });
  });

  it("rejects unknown filters and unbounded limits", () => {
    expect(() =>
      appealReviewQueueQuerySchema.parse({ scopeId, participantId }),
    ).toThrow();
    expect(() =>
      appealReviewQueueQuerySchema.parse({ scopeId, limit: 101 }),
    ).toThrow();
    expect(() =>
      appealReviewQueueQuerySchema.parse({ scopeId, status: "UNKNOWN" }),
    ).toThrow();
  });

  it("allows only the internal redacted review projection", () => {
    const projection = appealReviewQueueProjectionSchema.parse({
      kind: "appeal_review_queue",
      scopeId,
      generatedAt: "2026-08-23T20:01:00.000Z",
      filters: { scopeId, limit: 50 },
      items: [item],
    });
    expect(projection.items[0]).toMatchObject({
      appealId,
      justification: item.justification,
    });

    expect(() =>
      appealReviewQueueProjectionSchema.parse({
        kind: "appeal_review_queue",
        scopeId,
        generatedAt: "2026-08-23T20:01:00.000Z",
        filters: { scopeId, limit: 50 },
        items: [{ ...item, response: "resposta proibida" }],
      }),
    ).toThrow();
  });
});
