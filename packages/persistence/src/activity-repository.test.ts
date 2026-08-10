import { describe, expect, it } from "vitest";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  PersistenceMappingError,
  activityRowsToState,
  createActivityReadRepository,
  type ActivityRowShape,
} from "./activity-repository.js";
import { contentVersions, learningActivityItems } from "./schema.js";
import type * as schema from "./schema.js";

const rows = [
  {
    activityId: "11111111-1111-4111-8111-111111111111",
    scopeId: "44444444-4444-4444-8444-444444444444",
    slug: "emergencia-v1",
    title: "Emergência",
    itemId: "22222222-2222-4222-8222-222222222222",
    ordinal: 2,
    kind: "QUESTAO",
    itemTitle: "Conduta inicial",
    text: "Questão autoral.",
    responseMode: "TEXT",
  },
  {
    activityId: "11111111-1111-4111-8111-111111111111",
    scopeId: "44444444-4444-4444-8444-444444444444",
    slug: "emergencia-v1",
    title: "Emergência",
    itemId: "33333333-3333-4333-8333-333333333333",
    ordinal: 1,
    kind: "LEITURA",
    itemTitle: "Prioridades",
    text: "Texto autoral.",
    responseMode: "NONE",
  },
] as const;

type FakeQuery = {
  readonly from: (table: unknown) => FakeQuery;
  readonly innerJoin: (...values: readonly unknown[]) => FakeQuery;
  readonly where: (condition: unknown) => FakeQuery;
  readonly orderBy: (
    ...columns: readonly unknown[]
  ) => Promise<readonly ActivityRowShape[]>;
};

function fakeDatabase(
  result: readonly ActivityRowShape[],
): PostgresJsDatabase<typeof schema> {
  const query: FakeQuery = {
    from: () => query,
    innerJoin: () => query,
    where: () => query,
    orderBy: async () => result,
  };
  const transaction = {
    execute: async () => undefined,
    select: () => query,
  };
  return {
    select: () => query,
    transaction: async (
      callback: (value: typeof transaction) => Promise<unknown>,
    ) => callback(transaction),
  } as unknown as PostgresJsDatabase<typeof schema>;
}

describe("published activity persistence mapping", () => {
  it("groups and orders published content rows without internal fields", () => {
    const state = activityRowsToState(rows);

    expect(state).toMatchObject({
      activityId: rows[0].activityId,
      scopeId: rows[0].scopeId,
      slug: rows[0].slug,
      title: rows[0].title,
    });
    expect(state?.items.map((item) => item.ordinal)).toEqual([1, 2]);
    expect(JSON.stringify(state)).not.toMatch(/"source"\s*:/u);
    expect(JSON.stringify(state)).not.toMatch(/"photo"\s*:/u);
  });

  it("returns null for no rows and rejects invalid or duplicate content", () => {
    expect(activityRowsToState([])).toBeNull();
    expect(() =>
      activityRowsToState([{ ...rows[0], text: "<img src=x>" }]),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      activityRowsToState([rows[0], { ...rows[1], ordinal: rows[0].ordinal }]),
    ).toThrow("ordinal");
  });

  it("maps published choice metadata without internal fields", () => {
    const state = activityRowsToState([
      {
        ...rows[0],
        responseMode: "CHOICE",
        selectionMode: "SINGLE",
        choices: [
          { id: "a", label: "A", text: "Primeira opção." },
          { id: "b", label: "B", text: "Segunda opção." },
        ],
      },
    ]);

    expect(state?.items[0]?.choices).toEqual([
      { id: "a", label: "A", text: "Primeira opção." },
      { id: "b", label: "B", text: "Segunda opção." },
    ]);
    expect(() =>
      activityRowsToState([
        {
          ...rows[0],
          responseMode: "CHOICE",
          selectionMode: "SINGLE",
          choices: [{ id: "a", label: "A", text: "<script>" }],
        },
      ]),
    ).toThrow(PersistenceMappingError);
  });

  it("keeps content and activity-item tables explicit", () => {
    expect(contentVersions).toBeDefined();
    expect(learningActivityItems).toBeDefined();
  });

  it("reads assigned published rows through the complete join chain", async () => {
    const repository = createActivityReadRepository(fakeDatabase(rows));

    await expect(
      repository.findParticipantActivity(
        "55555555-5555-4555-8555-555555555555",
        rows[0].activityId,
      ),
    ).resolves.toMatchObject({
      activityId: rows[0].activityId,
      items: [{ ordinal: 1 }, { ordinal: 2 }],
    });
  });

  it("maps an empty joined result to an unavailable activity", async () => {
    const repository = createActivityReadRepository(fakeDatabase([]));

    await expect(
      repository.findParticipantActivity(
        "55555555-5555-4555-8555-555555555555",
        rows[0].activityId,
      ),
    ).resolves.toBeNull();
  });
});
