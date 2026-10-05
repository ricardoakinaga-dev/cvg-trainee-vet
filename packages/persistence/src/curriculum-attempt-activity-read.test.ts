import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { activityRowsToState } from "./activity-repository.js";
import {
  capturedActivityRows,
  readCapturedParticipantActivity,
} from "./curriculum-attempt-activity-read.js";

const context = {
  participantId: "11111111-1111-4111-8111-111111111111",
  scopeId: "22222222-2222-4222-8222-222222222222",
  activityId: "33333333-3333-4333-8333-333333333333",
};
const attemptId = "44444444-4444-4444-8444-444444444444";
const itemId = "55555555-5555-4555-8555-555555555555";
const metadata = {
  activityId: context.activityId,
  scopeId: context.scopeId,
  slug: "technical",
  title: "Synthetic activity",
};
const publicItem = {
  itemId,
  ordinal: 1,
  kind: "QUESTAO",
  title: "Frozen title",
  text: "Frozen prompt",
  responseMode: "TEXT",
};
const captured = { itemId, ordinal: 1, publicItem };

function database(
  attempt: unknown = [{ attemptId, status: "SALVA" }],
  items: unknown = [{ ...captured, expectedCount: 1 }],
) {
  const queries: string[] = [];
  return {
    queries,
    execute: async (query: SQL): Promise<unknown> => {
      const text = new PgDialect().sqlToQuery(query).sql;
      queries.push(text);
      if (text.includes('a.id as "attemptId"')) return attempt;
      if (text.includes('as "activityBound"'))
        return [
          { activityBound: true, attemptId, formVersionId: context.scopeId },
        ];
      if (text.includes('as "expectedCount"')) return items;
      if (text.includes('id as "activityId"')) return [metadata];
      if (text.includes('saved_at as "savedAt"'))
        return [
          {
            itemId,
            response: "Synthetic reflection",
            savedAt: new Date("2026-10-03T00:00:00Z"),
          },
        ];
      return [];
    },
  };
}

describe("captured participant public activity", () => {
  it("renders frozen public items without current text or private fields", async () => {
    const db = database(undefined, [
      {
        ...captured,
        publicItem: {
          ...publicItem,
          correctChoiceIds: ["private"],
          rubric: "private",
        },
        expectedCount: 1,
      },
    ]);
    const activity = await readCapturedParticipantActivity(
      db,
      context,
      activityRowsToState,
    );
    expect(activity?.items).toEqual([publicItem]);
    expect(JSON.stringify(activity)).not.toMatch(
      /private|correctChoiceIds|rubric/u,
    );
    expect(db.queries.join("\n")).not.toContain("learning_activity_items");
  });
  it("uses the legacy reader only before any attempt exists", async () => {
    await expect(
      readCapturedParticipantActivity(
        database([]),
        context,
        activityRowsToState,
      ),
    ).resolves.toBeUndefined();
  });
  it("denies annulled attempts and incomplete captures instead of legacy fallback", async () => {
    await expect(
      readCapturedParticipantActivity(
        database([{ attemptId, status: "ANULADA" }]),
        context,
        activityRowsToState,
      ),
    ).resolves.toBeNull();
    await expect(
      readCapturedParticipantActivity(
        database(undefined, []),
        context,
        activityRowsToState,
      ),
    ).resolves.toBeNull();
  });
  it.each([
    { ...captured, publicItem: null },
    { ...captured, publicItem: [] },
    { ...captured, publicItem: { ...publicItem, itemId: context.scopeId } },
    { ...captured, publicItem: { ...publicItem, ordinal: 2 } },
    { ...captured, publicItem: { ...publicItem, text: 100 } },
    { ...captured, publicItem: { ...publicItem, title: null } },
  ])("denies a malformed or mismatched public snapshot", (item) => {
    expect(capturedActivityRows(metadata, [item])).toBeNull();
  });
  it("retains existing published mapping safety for HTML and unsupported modes", () => {
    const rows = capturedActivityRows(metadata, [
      {
        ...captured,
        publicItem: { ...publicItem, text: "<script>private</script>" },
      },
    ]);
    expect(rows).not.toBeNull();
    expect(() => activityRowsToState(rows ?? [])).toThrow("plain text");
  });
  it("derives reflection from the same locked attempt and frozen item identities", async () => {
    const db = database(undefined, [
      {
        ...captured,
        publicItem: { ...publicItem, kind: "REFLEXAO" },
        expectedCount: 1,
      },
    ]);
    const activity = await readCapturedParticipantActivity(
      db,
      context,
      activityRowsToState,
    );
    expect(activity?.reflection?.answers).toEqual([
      {
        itemId,
        response: "Synthetic reflection",
        savedAt: "2026-10-03T00:00:00.000Z",
      },
    ]);
    expect(db.queries[0]).toContain("for share of a");
  });
});
