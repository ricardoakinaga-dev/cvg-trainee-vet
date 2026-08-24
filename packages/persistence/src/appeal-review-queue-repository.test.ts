import { describe, expect, it } from "vitest";

import { appeals } from "./schema.js";
import { createAppealReviewQueueRepository } from "./appeal-review-queue-repository.js";

const scopeId = "11111111-1111-4111-8111-111111111111";
const participantId = "22222222-2222-4222-8222-222222222222";
const appealId = "33333333-3333-4333-8333-333333333333";
const attemptId = "44444444-4444-4444-8444-444444444444";
const itemId = "55555555-5555-4555-8555-555555555555";

const row = {
  id: appealId,
  participantId,
  scopeId,
  attemptId,
  itemId,
  justification: "Solicito revisão do resultado sintético.",
  createdAt: new Date("2026-08-23T20:00:00.000Z"),
  dueAt: new Date("2026-09-02T20:00:00.000Z"),
  version: 0,
  status: "ABERTA",
  reviewerId: null,
  decision: null,
  updatedAt: new Date("2026-08-23T20:00:00.000Z"),
};

describe("appeal review queue persistence", () => {
  it("sets the dedicated reviewer context before a bounded scope query", async () => {
    const calls: string[] = [];
    const executor = {
      execute: async () => {
        calls.push("reviewer-context");
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
            calls.push(table === appeals ? "appeal-query" : "unexpected");
            return [row];
          },
        };
        return builder;
      },
      transaction: async (work: (current: unknown) => Promise<unknown>) =>
        work(executor),
    };

    const repository = createAppealReviewQueueRepository(executor as never);
    const result = await repository.listAppeals({
      scopeId,
      status: "ABERTA",
      limit: 1,
    });

    expect(result).toMatchObject([
      {
        scopeId,
        state: {
          appealId,
          participantId,
          justification: row.justification,
          status: "ABERTA",
        },
      },
    ]);
    expect(calls).toEqual(["reviewer-context", "appeal-query"]);
  });

  it("rejects empty, invalid and unbounded repository queries", async () => {
    const repository = createAppealReviewQueueRepository({
      transaction: async () => [],
    } as never);

    await expect(
      repository.listAppeals({ scopeId: " ", limit: 1 }),
    ).rejects.toThrow("scopeId");
    await expect(repository.listAppeals({ scopeId, limit: 0 })).rejects.toThrow(
      "limit",
    );
    await expect(
      repository.listAppeals({ scopeId, limit: 101 }),
    ).rejects.toThrow("limit");
    await expect(
      repository.listAppeals({
        scopeId,
        limit: 1,
        status: "UNKNOWN" as never,
      }),
    ).rejects.toThrow("status");
  });
});
