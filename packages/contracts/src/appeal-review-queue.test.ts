import { describe, expect, it } from "vitest";

import {
  appealReviewQueueProjectionSchema,
  appealReviewQueueQuerySchema,
  parseAppealReviewQueueProjection,
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
      items: [
        {
          ...item,
          status: "DECIDIDA",
          version: 2,
          reviewerId: "66666666-6666-4666-8666-666666666666",
          decision: "MANTER_RESULTADO",
          decisionRationale: "Rationale interna sintética.",
          decisionAt: "2026-08-23T20:00:30.000Z",
          decisionCorrelationId: "77777777-7777-4777-8777-777777777777",
        },
      ],
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

describe("appeal review queue decision consistency", () => {
  const itemBase = {
    appealId: "11111111-1111-4111-8111-111111111111",
    participantId: "22222222-2222-4222-8222-222222222222",
    attemptId: "33333333-3333-4333-8333-333333333333",
    itemId: "44444444-4444-4444-8444-444444444444",
    justification: "Justificativa sintética.",
    createdAt: "2026-08-24T11:00:00.000Z",
    dueAt: "2026-08-25T11:00:00.000Z",
    status: "ABERTA",
    version: 0,
  } as const;

  it("requires full decision metadata after deciding", () => {
    const projection = {
      kind: "appeal_review_queue",
      scopeId: itemBase.participantId,
      generatedAt: "2026-08-24T12:00:00.000Z",
      filters: { scopeId: itemBase.participantId, limit: 50 },
      items: [
        {
          ...itemBase,
          status: "DECIDIDA",
          reviewerId: "55555555-5555-4555-8555-555555555555",
          decision: "MANTER_RESULTADO",
          decisionRationale: "Manter.",
          decisionAt: "2026-08-24T12:00:00.000Z",
          decisionCorrelationId: "66666666-6666-4666-8666-666666666666",
        },
      ],
    };
    expect(parseAppealReviewQueueProjection(projection).items).toHaveLength(1);
    expect(() =>
      parseAppealReviewQueueProjection({
        ...projection,
        items: [{ ...projection.items[0], decision: undefined }],
      }),
    ).toThrow();
    expect(() =>
      parseAppealReviewQueueProjection({
        ...projection,
        items: [
          {
            ...projection.items[0],
            decisionRationale: undefined,
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects decision metadata on open items", () => {
    const projection = {
      kind: "appeal_review_queue",
      scopeId: itemBase.participantId,
      generatedAt: "2026-08-24T12:00:00.000Z",
      filters: { scopeId: itemBase.participantId, limit: 50 },
      items: [
        {
          ...itemBase,
          decision: "MANTER_RESULTADO",
          decisionRationale: "x",
          decisionAt: "2026-08-24T12:00:00.000Z",
          decisionCorrelationId: "66666666-6666-4666-8666-666666666666",
        },
      ],
    };
    expect(() => parseAppealReviewQueueProjection(projection)).toThrow();
  });

  it("applies the default limit and rejects invalid queries", () => {
    const query = appealReviewQueueQuerySchema.parse({
      scopeId: itemBase.participantId,
      status: "ABERTA",
    });
    expect(query.limit).toBe(50);
    expect(() =>
      appealReviewQueueQuerySchema.parse({
        scopeId: itemBase.participantId,
        limit: 0,
      }),
    ).toThrow();
    expect(() =>
      appealReviewQueueQuerySchema.parse({
        scopeId: "not-a-uuid",
      }),
    ).toThrow();
  });
});
