import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import {
  readCapturedAnswerItem,
  assertCapturedAnswerResponse,
} from "./curriculum-attempt-answer-write.js";
import {
  readCapturedAttemptItems,
  type CapturedAttemptItem,
} from "./curriculum-attempt-item-read.js";

vi.mock("./curriculum-attempt-item-read.js", () => ({
  readCapturedAttemptItems: vi.fn(),
}));
const context = {
  participantId: "11111111-1111-4111-8111-111111111111",
  scopeId: "22222222-2222-4222-8222-222222222222",
  activityId: "33333333-3333-4333-8333-333333333333",
  attemptId: "44444444-4444-4444-8444-444444444444",
};
const item: CapturedAttemptItem = {
  itemId: "55555555-5555-4555-8555-555555555555",
  ordinal: 1,
  publicItem: {
    itemId: "55555555-5555-4555-8555-555555555555",
    kind: "QUESTAO",
    responseMode: "CHOICE",
    selectionMode: "SINGLE",
    choices: [{ id: "a" }, { id: "b" }],
  },
};
function projection(delta: Record<string, unknown>): CapturedAttemptItem {
  return {
    ...item,
    publicItem: { ...(item.publicItem as Record<string, unknown>), ...delta },
  };
}

describe("frozen answer response and current assignment boundary", () => {
  it("preserves explicit legacy and broken binding distinctions without reading current membership", async () => {
    const db = { execute: vi.fn(async () => []) };
    vi.mocked(readCapturedAttemptItems)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(null);
    expect(
      await readCapturedAnswerItem(db, context, item.itemId),
    ).toBeUndefined();
    expect(await readCapturedAnswerItem(db, context, item.itemId)).toBeNull();
    expect(db.execute).not.toHaveBeenCalled();
  });
  it("requires current authorized assignment but uses captured item inventory", async () => {
    let statement = "";
    const db = {
      execute: vi.fn(async (query: SQL) => {
        statement = new PgDialect().sqlToQuery(query).sql;
        return [{ id: context.activityId }];
      }),
    };
    vi.mocked(readCapturedAttemptItems).mockResolvedValue([item]);
    expect(await readCapturedAnswerItem(db, context, item.itemId)).toEqual(
      item,
    );
    expect(statement).toContain("learning_assignments");
    expect(statement).toContain("'DISPONIVEL', 'EM_ANDAMENTO', 'EM_REFORCO'");
    expect(statement).not.toMatch(
      /learning_activity_items|catalog_item|correctChoiceIds/u,
    );
    expect(
      await readCapturedAnswerItem(db, context, context.scopeId),
    ).toBeNull();
  });
  it.each([[], [{ id: context.activityId }, { id: context.activityId }], null])(
    "denies absent or ambiguous current authority %#",
    async (rows) => {
      vi.mocked(readCapturedAttemptItems).mockResolvedValue([item]);
      expect(
        await readCapturedAnswerItem(
          { execute: async () => rows },
          context,
          item.itemId,
        ),
      ).toBeNull();
    },
  );
  it.each(["LEITURA", "unknown", { toString: () => "QUESTAO" }])(
    "denies unsupported frozen answer kind %#",
    async (kind) => {
      vi.mocked(readCapturedAttemptItems).mockResolvedValue([
        projection({ kind }),
      ]);
      expect(
        await readCapturedAnswerItem(
          { execute: async () => [{ id: context.activityId }] },
          context,
          item.itemId,
        ),
      ).toBeNull();
    },
  );
  it("validates SINGLE raw, MULTIPLE strict JSON and TEXT plain independently of answer keys", () => {
    expect(() => assertCapturedAnswerResponse(item, "b")).not.toThrow();
    expect(() =>
      assertCapturedAnswerResponse(
        projection({ selectionMode: "MULTIPLE" }),
        '["b","a"]',
      ),
    ).not.toThrow();
    expect(() =>
      assertCapturedAnswerResponse(
        projection({ responseMode: "TEXT", choices: undefined }),
        "Plain synthetic response",
      ),
    ).not.toThrow();
  });
  it.each(["unknown", '["a"]', "", "<b>a</b>"])(
    "rejects invalid SINGLE persisted representation %s",
    (response) => {
      expect(() => assertCapturedAnswerResponse(item, response)).toThrow(
        expect.objectContaining({ code: "validation_error" }),
      );
    },
  );
  it.each(["a", "[]", '["a","a"]', '["unknown"]', "{}"])(
    "rejects invalid MULTIPLE persisted representation %s",
    (response) => {
      expect(() =>
        assertCapturedAnswerResponse(
          projection({ selectionMode: "MULTIPLE" }),
          response,
        ),
      ).toThrow(expect.objectContaining({ code: "validation_error" }));
    },
  );
  it.each([
    null,
    {},
    { responseMode: "NONE" },
    { itemId: item.itemId, responseMode: "CHOICE" },
    {
      itemId: item.itemId,
      responseMode: "CHOICE",
      selectionMode: "SINGLE",
      choices: [null],
    },
  ])("denies malformed frozen projection %#", (publicItem) => {
    expect(() =>
      assertCapturedAnswerResponse({ ...item, publicItem }, "a"),
    ).toThrow(expect.objectContaining({ code: "state_conflict" }));
  });
});
