import { describe, expect, it } from "vitest";

import { contentEditorialRecords, contentReviewDecisions } from "./schema.js";
import {
  contentReviewQueueRowToItem,
  createContentReviewQueueRepository,
} from "./content-review-queue-repository.js";

const scopeId = "11111111-1111-4111-8111-111111111111";
const contentId = "22222222-2222-4222-8222-222222222222";
const versionId = "33333333-3333-4333-8333-333333333333";
const editorialRecordId = "44444444-4444-4444-8444-444444444444";
const authorId = "55555555-5555-4555-8555-555555555555";

const baseRow = {
  editorialRecordId,
  contentId,
  contentVersionId: versionId,
  scopeId,
  version: 1,
  moduleId: "M02",
  sessionId: "S1",
  title: "Item sintético",
  authorId,
  status: "EM_REVISAO_CLINICA",
  preflight: {
    technicalChecksPassed: true,
    checkedAt: "2026-08-23T17:00:00.000Z",
  },
  updatedAt: new Date("2026-08-23T17:30:00.000Z"),
};

describe("content review queue persistence", () => {
  it("maps only bounded review metadata and derives the next action", () => {
    expect(
      contentReviewQueueRowToItem(baseRow, {
        decision: "SOLICITAR_AJUSTES",
        reviewedAt: "2026-08-23T17:10:00.000Z",
      }),
    ).toMatchObject({
      contentId,
      status: "EM_REVISAO_CLINICA",
      nextAction: "REVISAR_CLINICAMENTE",
      latestReview: { decision: "SOLICITAR_AJUSTES" },
    });
  });

  it("rejects malformed persisted status or preflight", () => {
    expect(() =>
      contentReviewQueueRowToItem({ ...baseRow, status: "PUBLICADO" }),
    ).toThrow("content queue status is invalid");
    expect(() =>
      contentReviewQueueRowToItem({ ...baseRow, preflight: null }),
    ).toThrow("content queue preflight is invalid");
  });

  it("reads with a transaction and applies context before the scoped query", async () => {
    const rows = new Map<object, readonly unknown[]>([
      [contentEditorialRecords, [baseRow]],
      [contentReviewDecisions, []],
    ]);
    const calls: string[] = [];
    const executor = {
      execute: async () => {
        calls.push("context");
        return [];
      },
      select: () => {
        let table: object | undefined;
        const builder = {
          from(source: object) {
            table = source;
            return builder;
          },
          innerJoin() {
            return builder;
          },
          where() {
            return builder;
          },
          orderBy() {
            return builder;
          },
          limit: async () => {
            calls.push(table === contentEditorialRecords ? "queue" : "review");
            return rows.get(table ?? contentEditorialRecords) ?? [];
          },
        };
        return builder;
      },
      transaction: async (work: (current: unknown) => Promise<unknown>) =>
        work(executor),
    };
    const repository = createContentReviewQueueRepository(executor as never, {
      now: () => new Date("2026-08-23T18:00:00.000Z"),
    });
    const result = await repository.findContentReviewQueue({
      scopeId,
      limit: 1,
    });
    expect(result.items).toHaveLength(1);
    expect(calls).toEqual(["context", "queue", "review"]);
  });
});
