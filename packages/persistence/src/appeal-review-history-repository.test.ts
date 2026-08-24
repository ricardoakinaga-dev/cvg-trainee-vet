import { describe, expect, it } from "vitest";

import { appealReviewHistory, appeals } from "./schema.js";
import { createAppealReviewHistoryRepository } from "./appeal-review-history-repository.js";

const appealId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const historyId = "33333333-3333-4333-8333-333333333333";

describe("appeal review history persistence", () => {
  it("sets the review context before checking the appeal and reading history", async () => {
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
            if (table === appeals) {
              calls.push("appeal-query");
              return [{ id: appealId, scopeId }];
            }
            if (table !== appealReviewHistory)
              throw new Error("unexpected table");
            calls.push("history-query");
            return [
              {
                id: historyId,
                appealId,
                scopeId,
                appealVersion: 1,
                eventType: "ATRIBUIR_REVISOR",
                fromStatus: "ABERTA",
                toStatus: "EM_REVISAO",
                reviewerId: null,
                decision: null,
                decisionRationale: null,
                decisionAt: null,
                decisionCorrelationId: null,
                createdAt: new Date("2026-08-24T12:00:00.000Z"),
              },
            ];
          },
        };
        return builder;
      },
      transaction: async (work: (current: unknown) => Promise<unknown>) =>
        work(executor),
    };

    const result = await createAppealReviewHistoryRepository(
      executor as never,
    ).getAppealReviewHistory(appealId, [scopeId], 100);

    expect(result).toMatchObject({
      appealExists: true,
      scopeId,
      events: [{ historyId, appealVersion: 1 }],
    });
    expect(calls).toEqual([
      "security-context",
      "appeal-query",
      "history-query",
    ]);
  });

  it("does not disclose an appeal outside the authorized scopes", async () => {
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

    const result = await createAppealReviewHistoryRepository(
      executor as never,
    ).getAppealReviewHistory(appealId, [scopeId], 100);

    expect(result).toMatchObject({ appealExists: false, events: [] });
  });
});
