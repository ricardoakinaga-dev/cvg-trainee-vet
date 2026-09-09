import { describe, expect, it } from "vitest";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  ContentMappingError,
  contentRowToRecord,
  createContentIndexSourceRepository,
  createContentRepository,
} from "./content-repository.js";
import type * as schema from "./schema.js";

const row = {
  id: "11111111-1111-4111-8111-111111111111",
  contentId: "22222222-2222-4222-8222-222222222222",
  version: 1,
  scopeId: "33333333-3333-4333-8333-333333333333",
  status: "AUTORIZADO_PARA_PUBLICACAO",
  participantText: "Texto interno sintético.",
};

function fakeDatabase(rows: readonly (typeof row)[]) {
  const query = {
    select: () => query,
    from: () => query,
    where: () => query,
    orderBy: () => query,
    limit: async () => rows,
    execute: async () => [],
  };
  return {
    select: () => query,
    transaction: async (
      work: (transaction: typeof query) => Promise<unknown>,
    ) => work(query),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => [{ id: row.id }],
        }),
      }),
    }),
  } as unknown as PostgresJsDatabase<typeof schema>;
}

type FakeQuery = {
  readonly from: () => FakeQuery;
  readonly innerJoin: () => FakeQuery;
  readonly where: () => FakeQuery;
  readonly orderBy: () => Promise<readonly unknown[]>;
  readonly limit: () => Promise<readonly unknown[]>;
  readonly then: Promise<readonly unknown[]>["then"];
};

function fakeAuthoringPublicationDatabase(
  selectResults: readonly (readonly unknown[])[],
) {
  let selectIndex = 0;
  const updateResult = {
    set: () => ({
      where: () => ({
        returning: async () => [{ id: row.id }],
      }),
    }),
  };
  return {
    update: () => updateResult,
    select: () => {
      const result = selectResults[selectIndex] ?? [];
      selectIndex += 1;
      const query: FakeQuery = {
        from: () => query,
        innerJoin: () => query,
        where: () => query,
        orderBy: async () => result,
        limit: async () => result,
        then: (...args) => Promise.resolve(result).then(...args),
      };
      return query;
    },
    insert: () => ({
      values: () => ({
        onConflictDoNothing: async () => undefined,
      }),
    }),
  } as unknown as PostgresJsDatabase<typeof schema>;
}

const authoringActivity = {
  id: "44444444-4444-4444-8444-444444444444",
  scopeId: row.scopeId,
  moduleId: "M02",
  sessionId: "M02-S1",
  status: "PUBLISHED",
};

const authoringEditorial = {
  moduleId: "M02",
  sessionId: "M02-S1",
  editorialContentId: row.contentId,
  editorialVersion: row.version,
  versionContentId: row.contentId,
  versionNumber: row.version,
  versionScopeId: row.scopeId,
};

const authoringPublishedItem = {
  contentVersionId: row.id,
  editorialContentId: row.contentId,
  editorialVersion: row.version,
  versionContentId: row.contentId,
  versionNumber: row.version,
  title: "Atividade sintética",
  item: { participant: { ordinal: 1 } },
};

function authoringSave(
  database: PostgresJsDatabase<typeof schema>,
): Promise<void> {
  const repository = createContentRepository(database);
  return repository.save(
    {
      contentId: row.contentId,
      version: row.version,
      scopeId: row.scopeId,
      status: "AUTORIZADO_PARA_PUBLICACAO",
    },
    {
      contentId: row.contentId,
      version: row.version,
      scopeId: row.scopeId,
      status: "PUBLICADO",
    },
  );
}

describe("content persistence mapping", () => {
  it("maps a content version without carrying participant or source data", () => {
    expect(contentRowToRecord(row)).toEqual({
      contentId: row.contentId,
      version: row.version,
      scopeId: row.scopeId,
      status: row.status,
    });
    expect(JSON.stringify(contentRowToRecord(row))).not.toContain("source");
    expect(JSON.stringify(contentRowToRecord(row))).not.toContain(
      "participantText",
    );
  });

  it("rejects unsupported editorial states", () => {
    expect(() => contentRowToRecord({ ...row, status: "INVALIDO" })).toThrow(
      ContentMappingError,
    );
  });

  it("reads and updates a version with an optimistic status condition", async () => {
    const repository = createContentRepository(fakeDatabase([row]));
    const current = await repository.find(row.contentId, row.version);
    if (current === null) throw new Error("content version is required");
    const next = { ...current, status: "PROJECAO_VERIFICADA" as const };

    await repository.save(current, next);

    expect(next.status).toBe("PROJECAO_VERIFICADA");
  });

  it("materializes a published authoring session idempotently", async () => {
    const database = fakeAuthoringPublicationDatabase([
      [authoringEditorial],
      [authoringPublishedItem],
      [authoringActivity],
      [],
      [{ contentVersionId: row.id, ordinal: 1 }],
      [authoringEditorial],
      [authoringPublishedItem],
      [authoringActivity],
      [{ activityId: authoringActivity.id, contentVersionId: row.id }],
      [{ contentVersionId: row.id, ordinal: 1 }],
    ]);

    await authoringSave(database);
    await authoringSave(database);
  });

  it.each([
    {
      name: "without editorial record",
      results: [[]],
    },
    {
      name: "with an invalid module",
      results: [[{ ...authoringEditorial, moduleId: "M99" }]],
    },
    {
      name: "with a session from another module",
      results: [[{ ...authoringEditorial, sessionId: "M03-S1" }]],
    },
    {
      name: "with mismatched content identity",
      results: [
        [{ ...authoringEditorial, editorialContentId: "other-content" }],
      ],
    },
    {
      name: "with no published item for the target version",
      results: [[authoringEditorial], []],
    },
    {
      name: "with an invalid participant item",
      results: [
        [authoringEditorial],
        [{ ...authoringPublishedItem, item: { participant: null } }],
      ],
    },
    {
      name: "with duplicate item ordinals",
      results: [
        [authoringEditorial],
        [
          authoringPublishedItem,
          {
            ...authoringPublishedItem,
            contentVersionId: "55555555-5555-4555-8555-555555555555",
          },
        ],
      ],
    },
    {
      name: "without a target activity",
      results: [[authoringEditorial], [authoringPublishedItem], []],
    },
    {
      name: "with a withdrawn target activity",
      results: [
        [authoringEditorial],
        [authoringPublishedItem],
        [{ ...authoringActivity, status: "WITHDRAWN" }],
      ],
    },
    {
      name: "with a content item mapped elsewhere",
      results: [
        [authoringEditorial],
        [authoringPublishedItem],
        [authoringActivity],
        [
          {
            activityId: "66666666-6666-4666-8666-666666666666",
            contentVersionId: row.id,
          },
        ],
      ],
    },
    {
      name: "with an incomplete item write",
      results: [
        [authoringEditorial],
        [authoringPublishedItem],
        [authoringActivity],
        [],
        [],
      ],
    },
    {
      name: "with an unexpected persisted item",
      results: [
        [authoringEditorial],
        [authoringPublishedItem],
        [authoringActivity],
        [],
        [
          { contentVersionId: row.id, ordinal: 1 },
          {
            contentVersionId: "77777777-7777-4777-8777-777777777777",
            ordinal: 2,
          },
        ],
      ],
    },
  ])("rejects authoring materialization when $name", async ({ results }) => {
    const database = fakeAuthoringPublicationDatabase(results);
    await expect(authoringSave(database)).rejects.toBeInstanceOf(Error);
  });

  it("returns null when a content version is not found", async () => {
    const repository = createContentRepository(fakeDatabase([]));

    await expect(
      repository.find(row.contentId, row.version),
    ).resolves.toBeNull();
  });

  it("exposes indexable text only through the worker-facing internal port", async () => {
    const source = createContentIndexSourceRepository(
      fakeDatabase([{ ...row, status: "PUBLICADO" }]),
    );

    await expect(
      source.findPublishedIndexable(row.contentId, row.version),
    ).resolves.toEqual({
      contentId: row.contentId,
      version: row.version,
      scopeId: row.scopeId,
      text: row.participantText,
    });
    await expect(source.listPublishedIndexable()).resolves.toEqual([
      {
        contentId: row.contentId,
        version: row.version,
        scopeId: row.scopeId,
        text: row.participantText,
      },
    ]);
  });
});
