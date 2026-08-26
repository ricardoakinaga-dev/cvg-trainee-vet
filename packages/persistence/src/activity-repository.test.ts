import { describe, expect, it } from "vitest";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  PersistenceMappingError,
  activityRowsToState,
  createParticipantActivityItemResolver,
  createActivityReadRepository,
  reflectionRowsToState,
  type ActivityRowShape,
  type ReflectionRowShape,
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
    contentStatus: "PUBLICADO",
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
    contentStatus: "PUBLICADO",
    itemTitle: "Prioridades",
    text: "Texto autoral.",
    responseMode: "NONE",
  },
] as const;

type FakeQuery = {
  readonly from: (table: unknown) => FakeQuery;
  readonly innerJoin: (...values: readonly unknown[]) => FakeQuery;
  readonly leftJoin: (...values: readonly unknown[]) => FakeQuery;
  readonly where: (condition: unknown) => FakeQuery;
  readonly orderBy: (
    ...columns: readonly unknown[]
  ) => Promise<readonly unknown[]>;
  readonly limit: (value: number) => Promise<readonly unknown[]>;
};

function fakeDatabase(
  result: readonly ActivityRowShape[],
  reflectionResult: readonly ReflectionRowShape[] = [],
  resolvedScopeId: string | undefined = result[0]?.scopeId,
): PostgresJsDatabase<typeof schema> {
  const results: readonly (readonly unknown[])[] = [result, reflectionResult];
  let selectIndex = 0;
  const query: FakeQuery = {
    from: () => query,
    innerJoin: () => query,
    leftJoin: () => query,
    where: () => query,
    orderBy: async () => results[selectIndex++] ?? [],
    limit: async () => results[selectIndex++] ?? [],
  };
  const transaction = {
    execute: async () =>
      resolvedScopeId === undefined ? [] : [{ scopeId: resolvedScopeId }],
    select: () => query,
  };
  return {
    select: () => query,
    transaction: async (
      callback: (value: typeof transaction) => Promise<unknown>,
    ) => callback(transaction),
  } as unknown as PostgresJsDatabase<typeof schema>;
}

function fakeItemResolverDatabase(
  result: readonly Readonly<{ readonly itemId: string }>[],
): PostgresJsDatabase<typeof schema> {
  const query = {
    from: () => query,
    innerJoin: () => query,
    where: () => query,
    limit: async () => result,
  };
  const transaction = {
    execute: async () =>
      result.length === 0 ? [] : [{ scopeId: rows[0]?.scopeId }],
    select: () => query,
  };
  return {
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

  it("fails closed when one activity item is not publicly released", () => {
    expect(
      activityRowsToState([
        { ...rows[0], contentStatus: "EM_REVISAO_CLINICA" },
        rows[1],
      ]),
    ).toBeNull();
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

  it("resolves only an owned answerable activity item", async () => {
    const resolver = createParticipantActivityItemResolver(
      fakeItemResolverDatabase([{ itemId: rows[0].itemId }]),
    );

    await expect(
      resolver(
        "22222222-2222-4222-8222-222222222222",
        rows[0].activityId,
        rows[0].itemId,
      ),
    ).resolves.toBe(true);
    await expect(
      createParticipantActivityItemResolver(fakeItemResolverDatabase([]))(
        "22222222-2222-4222-8222-222222222222",
        rows[0].activityId,
        rows[1].itemId,
      ),
    ).resolves.toBe(false);
  });

  it("derives a participant reflection from the latest attempt and its own answers", () => {
    const reflectionItemIds = [
      "77777777-7777-4777-8777-777777777777",
      "88888888-8888-4888-8888-888888888888",
    ] as const;
    const latestUpdatedAt = new Date("2026-08-23T20:00:00.000Z");
    const state = reflectionRowsToState(reflectionItemIds, [
      {
        itemId: reflectionItemIds[0],
        attemptId: "99999999-9999-4999-8999-999999999999",
        attemptStatus: "SALVA",
        attemptVersion: 2,
        attemptUpdatedAt: latestUpdatedAt,
        response: "Resposta sintética.",
        savedAt: latestUpdatedAt,
      },
      {
        itemId: reflectionItemIds[1],
        attemptId: "99999999-9999-4999-8999-999999999999",
        attemptStatus: "SALVA",
        attemptVersion: 2,
        attemptUpdatedAt: latestUpdatedAt,
        response: null,
        savedAt: null,
      },
      {
        itemId: reflectionItemIds[0],
        attemptId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        attemptStatus: "SUBMETIDA",
        attemptVersion: 1,
        attemptUpdatedAt: new Date("2026-08-22T20:00:00.000Z"),
        response: "Resposta anterior.",
        savedAt: new Date("2026-08-22T20:00:00.000Z"),
      },
    ]);

    expect(state).toMatchObject({
      status: "EM_ANDAMENTO",
      nextAction: "RETOMAR_REFLEXAO",
      answeredItemCount: 1,
      answers: [
        {
          itemId: reflectionItemIds[0],
          response: "Resposta sintética.",
        },
      ],
    });
  });

  it("reads the participant reflection in the same protected activity transaction", async () => {
    const activityRows = [
      ...rows,
      {
        activityId: rows[0].activityId,
        scopeId: rows[0].scopeId,
        slug: rows[0].slug,
        title: rows[0].title,
        itemId: "77777777-7777-4777-8777-777777777777",
        ordinal: 3,
        kind: "REFLEXAO",
        contentStatus: "PUBLICADO",
        itemTitle: "Reflexão final",
        text: "Descreva a próxima ação.",
        responseMode: "TEXT",
      },
    ] as const;
    const reflectionRows: readonly ReflectionRowShape[] = [
      {
        itemId: "77777777-7777-4777-8777-777777777777",
        attemptId: "99999999-9999-4999-8999-999999999999",
        attemptStatus: "SALVA",
        attemptVersion: 1,
        attemptUpdatedAt: new Date("2026-08-23T20:00:00.000Z"),
        response: "Próxima ação sintética.",
        savedAt: new Date("2026-08-23T20:00:00.000Z"),
      },
    ];

    const repository = createActivityReadRepository(
      fakeDatabase(activityRows, reflectionRows),
    );

    await expect(
      repository.findParticipantActivity(
        "55555555-5555-4555-8555-555555555555",
        rows[0].activityId,
      ),
    ).resolves.toMatchObject({
      reflection: {
        status: "EM_ANDAMENTO",
        answeredItemCount: 1,
        answers: [{ response: "Próxima ação sintética." }],
      },
    });
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
    const repository = createActivityReadRepository(
      fakeDatabase([], [], rows[0].scopeId),
    );

    await expect(
      repository.findParticipantActivity(
        "55555555-5555-4555-8555-555555555555",
        rows[0].activityId,
      ),
    ).resolves.toBeNull();
  });
});
