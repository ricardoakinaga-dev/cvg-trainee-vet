import { describe, expect, it } from "vitest";

import {
  contentReviewQueueQuerySchema,
  parseContentReviewQueueProjection,
} from "./content-review-queue.js";

const scopeId = "11111111-1111-4111-8111-111111111111";
const contentId = "22222222-2222-4222-8222-222222222222";
const authorId = "33333333-3333-4333-8333-333333333333";

describe("content review queue contracts", () => {
  it("normalizes a scoped queue query and accepts bounded operational metadata", () => {
    expect(contentReviewQueueQuerySchema.parse({ scopeId })).toEqual({
      scopeId,
      limit: 50,
    });
    expect(
      parseContentReviewQueueProjection({
        kind: "content_review_queue",
        scopeId,
        generatedAt: "2026-08-23T18:00:00.000Z",
        filters: { scopeId, status: "EM_REVISAO_CLINICA", limit: 25 },
        items: [
          {
            contentId,
            version: 2,
            scopeId,
            moduleId: "M02",
            sessionId: "S1",
            title: "Triagem digital sintética",
            authorId,
            status: "EM_REVISAO_CLINICA",
            preflight: {
              technicalChecksPassed: true,
              checkedAt: "2026-08-23T17:00:00.000Z",
            },
            canOpenAuthoring: true,
            updatedAt: "2026-08-23T17:30:00.000Z",
            nextAction: "REVISAR_CLINICAMENTE",
          },
        ],
      }),
    ).toMatchObject({ kind: "content_review_queue" });
  });

  it("rejects cross-scope and authoring-only fields", () => {
    expect(() =>
      contentReviewQueueQuerySchema.parse({
        scopeId,
        status: "PUBLICADO",
      }),
    ).toThrow();
    expect(() =>
      parseContentReviewQueueProjection({
        kind: "content_review_queue",
        scopeId,
        generatedAt: "2026-08-23T18:00:00.000Z",
        filters: { scopeId, limit: 25 },
        items: [],
        prompt: "não pertence à fila",
      }),
    ).toThrow();
  });
});
