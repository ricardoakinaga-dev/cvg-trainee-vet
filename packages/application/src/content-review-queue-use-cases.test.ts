import { describe, expect, it, vi } from "vitest";

import {
  getContentReviewQueue,
  type ContentReviewQueueReadPort,
  type ContentReviewQueueState,
} from "./content-review-queue-use-cases.js";

const scopeId = "11111111-1111-4111-8111-111111111111";
const principalId = "22222222-2222-4222-8222-222222222222";

const state: ContentReviewQueueState = {
  kind: "content_review_queue",
  scopeId,
  generatedAt: "2026-08-23T18:00:00.000Z",
  filters: { scopeId, limit: 50 },
  items: [],
};

const queueItem: ContentReviewQueueState["items"][number] = {
  contentId: "44444444-4444-4444-8444-444444444444",
  version: 1,
  scopeId,
  moduleId: "M02",
  sessionId: "M02-S1",
  title: "Item sintético",
  authorId: principalId,
  status: "EM_REVISAO_CLINICA",
  preflight: {
    technicalChecksPassed: true,
    checkedAt: "2026-08-23T17:00:00.000Z",
  },
  updatedAt: "2026-08-23T17:30:00.000Z",
  canOpenAuthoring: true,
  nextAction: "REVISAR_CLINICAMENTE",
};

function repository(
  value: ContentReviewQueueState,
): ContentReviewQueueReadPort {
  return { findContentReviewQueue: async () => value };
}

describe("content review queue use case", () => {
  it("allows an active scoped author and freezes the result", async () => {
    const result = await getContentReviewQueue(
      {
        principalId,
        accountStatus: "ACTIVE",
        roles: ["AUTHOR"],
        scopes: [scopeId],
        query: { scopeId },
      },
      repository(state),
    );
    expect(result).toEqual(state);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.filters)).toBe(true);
    expect(Object.isFrozen(result.items)).toBe(true);
  });

  it("freezes queue item metadata with and without a latest review", async () => {
    const withoutReview = await getContentReviewQueue(
      {
        principalId,
        accountStatus: "ACTIVE",
        roles: ["AUTHOR"],
        scopes: [scopeId],
        query: { scopeId },
      },
      repository({ ...state, items: [queueItem] }),
    );
    expect(Object.isFrozen(withoutReview.items[0])).toBe(true);
    expect(Object.isFrozen(withoutReview.items[0]?.preflight)).toBe(true);

    const withReview = await getContentReviewQueue(
      {
        principalId,
        accountStatus: "ACTIVE",
        roles: ["AUTHOR"],
        scopes: [scopeId],
        query: { scopeId },
      },
      repository({
        ...state,
        items: [
          {
            ...queueItem,
            latestReview: {
              decision: "SOLICITAR_AJUSTES",
              reviewedAt: "2026-08-23T18:00:00.000Z",
            },
          },
        ],
      }),
    );
    expect(Object.isFrozen(withReview.items[0]?.latestReview)).toBe(true);
  });

  it("fails closed for inactive, cross-scope and malformed queries", async () => {
    await expect(
      getContentReviewQueue(
        {
          principalId,
          accountStatus: "SUSPENDED",
          roles: ["ADMIN"],
          scopes: [scopeId],
          query: { scopeId },
        },
        repository(state),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      getContentReviewQueue(
        {
          principalId,
          accountStatus: "ACTIVE",
          roles: ["ADMIN"],
          scopes: ["33333333-3333-4333-8333-333333333333"],
          query: { scopeId },
        },
        repository(state),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      getContentReviewQueue(
        {
          principalId,
          accountStatus: "ACTIVE",
          roles: ["AUTHOR"],
          scopes: [scopeId],
          query: { scopeId: "not-a-uuid" },
        },
        repository(state),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("rejects a repository projection that crosses the requested scope", async () => {
    await expect(
      getContentReviewQueue(
        {
          principalId,
          accountStatus: "ACTIVE",
          roles: ["ADMIN"],
          scopes: [scopeId],
          query: { scopeId },
        },
        repository({
          ...state,
          scopeId: "33333333-3333-4333-8333-333333333333",
        }),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("limits an author to authored records while scoped staff can see the queue", async () => {
    const findContentReviewQueue = vi.fn(async () => state);
    const readPort: ContentReviewQueueReadPort = { findContentReviewQueue };
    await getContentReviewQueue(
      {
        principalId,
        accountStatus: "ACTIVE",
        roles: ["AUTHOR"],
        scopes: [scopeId],
        query: { scopeId },
      },
      readPort,
    );
    expect(findContentReviewQueue).toHaveBeenCalledWith({
      scopeId,
      limit: 50,
      authorId: principalId,
    });

    await getContentReviewQueue(
      {
        principalId,
        accountStatus: "ACTIVE",
        roles: ["AUTHOR", "MODERATOR"],
        scopes: [scopeId],
        query: { scopeId },
      },
      readPort,
    );
    expect(findContentReviewQueue).toHaveBeenLastCalledWith({
      scopeId,
      limit: 50,
    });
  });
});
