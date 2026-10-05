import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { readCapturedAttemptItemIds } from "./curriculum-attempt-item-read.js";

const context = {
  participantId: "11111111-1111-4111-8111-111111111111",
  scopeId: "22222222-2222-4222-8222-222222222222",
  activityId: "33333333-3333-4333-8333-333333333333",
  attemptId: "44444444-4444-4444-8444-444444444444",
};
const itemId = "55555555-5555-4555-8555-555555555555";
const binding = [
  {
    activityBound: true,
    attemptId: context.attemptId,
    formVersionId: "66666666-6666-4666-8666-666666666666",
  },
];

function executor(header: unknown, items: unknown, failure = false) {
  const queries: string[] = [];
  return {
    queries,
    execute: async (query: SQL): Promise<unknown> => {
      const text = new PgDialect().sqlToQuery(query).sql;
      queries.push(text);
      if (text.includes('as "activityBound"')) return header;
      if (text.includes('as "expectedCount"')) {
        if (failure) throw new Error("native read failed");
        return items;
      }
      return [];
    },
  };
}

describe("captured attempt item read boundary", () => {
  it("reads only complete captured ids and restores ordinary context", async () => {
    const db = executor(binding, [{ itemId, ordinal: 1, expectedCount: 1 }]);
    const result = await readCapturedAttemptItemIds(db, context);
    expect(result).toEqual([itemId]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(db.queries.at(-1)).toContain("cvg.curriculum_attempt_id");
    expect(db.queries.at(-1)).not.toContain('as "expectedCount"');
    expect(db.queries.join("\n")).not.toMatch(
      /catalog_item|correctChoiceIds|rubric|sourceRefs/u,
    );
  });

  it("permits legacy fallback only when the activity has no explicit binding", async () => {
    expect(
      await readCapturedAttemptItemIds(
        executor([{ activityBound: false, attemptId: null }], []),
        context,
      ),
    ).toBeUndefined();
    expect(
      await readCapturedAttemptItemIds(
        executor([{ activityBound: true, attemptId: null }], []),
        context,
      ),
    ).toBeNull();
    expect(
      await readCapturedAttemptItemIds(
        executor([{ activityBound: "false", attemptId: null }], []),
        context,
      ),
    ).toBeNull();
  });

  it.each(
    [
      [],
      [{ itemId, ordinal: 1, expectedCount: 2 }],
      [{ itemId, ordinal: 1, expectedCount: 0 }],
      [{ itemId, ordinal: 1, expectedCount: 101 }],
      [{ itemId, ordinal: 1, expectedCount: "1" }],
      [{ itemId: "invalid", ordinal: 1, expectedCount: 1 }],
      [{ itemId, ordinal: 0, expectedCount: 1 }],
      [{ itemId, ordinal: 1.5, expectedCount: 1 }],
      [
        { itemId, ordinal: 1, expectedCount: 2 },
        { itemId, ordinal: 2, expectedCount: 2 },
      ],
      [
        { itemId, ordinal: 1, expectedCount: 2 },
        { itemId: context.scopeId, ordinal: 1, expectedCount: 2 },
      ],
      [
        { itemId, ordinal: 1, expectedCount: 2 },
        { itemId: context.scopeId, ordinal: 2, expectedCount: 1 },
      ],
    ].map((items, index) => ({ items, index })),
  )(
    "denies incomplete or malformed captured inventory $index",
    async ({ items }) => {
      expect(
        await readCapturedAttemptItemIds(executor(binding, items), context),
      ).toBeNull();
    },
  );

  it("restores context even when a native read fails", async () => {
    const db = executor(binding, [], true);
    await expect(readCapturedAttemptItemIds(db, context)).rejects.toThrow(
      "native read failed",
    );
    expect(db.queries.at(-1)).toContain("cvg.curriculum_attempt_id");
  });
});
