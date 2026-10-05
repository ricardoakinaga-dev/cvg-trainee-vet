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
  readonly orderBy: () => FakeQuery;
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
        orderBy: () => query,
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
      publicationReady: true,
    },
    {
      contentId: row.contentId,
      version: row.version,
      scopeId: row.scopeId,
      status: "PUBLICADO",
      publicationReady: true,
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

  it("requires the configured reviewer and keeps the global publication hold active", async () => {
    const configuredApproverId = "55555555-5555-4555-8555-555555555555";
    const editorialRecordId = "66666666-6666-4666-8666-666666666666";
    const distinctReviewer = createContentRepository(
      fakeAuthoringPublicationDatabase([
        [row],
        [
          {
            editorialRecordId,
            preflight: {
              technicalChecksPassed: true,
              readyForPublication: true,
              checks: { publicationBlocked: false },
            },
          },
        ],
        [
          {
            decision: "APROVAR_CLINICAMENTE",
            reviewerId: "77777777-7777-4777-8777-777777777777",
          },
        ],
      ]),
    );
    const configuredReviewer = createContentRepository(
      fakeAuthoringPublicationDatabase([
        [row],
        [
          {
            editorialRecordId,
            preflight: {
              technicalChecksPassed: true,
              readyForPublication: true,
              checks: { publicationBlocked: false },
            },
          },
        ],
        [
          {
            decision: "APROVAR_CLINICAMENTE",
            reviewerId: configuredApproverId,
          },
        ],
      ]),
    );

    await expect(
      distinctReviewer.find(row.contentId, row.version, configuredApproverId),
    ).resolves.toMatchObject({
      publicationReady: false,
      publicationBlockReasons: [
        "CLINICAL_PUBLICATION_HOLD_ACTIVE",
        "CONFIGURED_CLINICAL_APPROVAL_MISSING",
      ],
    });
    await expect(
      configuredReviewer.find(row.contentId, row.version, configuredApproverId),
    ).resolves.toMatchObject({
      publicationReady: false,
      publicationBlockReasons: ["CLINICAL_PUBLICATION_HOLD_ACTIVE"],
    });
  });

  it("keeps the H-CONTENT publication hold closed after configured approval", async () => {
    const configuredApproverId = "55555555-5555-4555-8555-555555555555";
    const heldRepository = createContentRepository(
      fakeAuthoringPublicationDatabase([
        [row],
        [
          {
            editorialRecordId: "66666666-6666-4666-8666-666666666666",
            preflight: {
              technicalChecksPassed: true,
              readyForPublication: false,
              checks: { publicationBlocked: true },
            },
          },
        ],
        [
          {
            decision: "APROVAR_CLINICAMENTE",
            reviewerId: configuredApproverId,
          },
        ],
      ]),
    );

    await expect(
      heldRepository.find(row.contentId, row.version, configuredApproverId),
    ).resolves.toMatchObject({
      publicationReady: false,
      publicationBlockReasons: [
        "CLINICAL_PUBLICATION_HOLD_ACTIVE",
        "PUBLICATION_PREFLIGHT_NOT_READY",
      ],
    });
    await expect(
      heldRepository.save(
        {
          contentId: row.contentId,
          version: row.version,
          scopeId: row.scopeId,
          status: "AUTORIZADO_PARA_PUBLICACAO",
          publicationReady: true,
        },
        {
          contentId: row.contentId,
          version: row.version,
          scopeId: row.scopeId,
          status: "PUBLICADO",
          publicationReady: true,
        },
      ),
    ).rejects.toThrow("clinical publication hold is active");
  });

  it("refuses direct publication saves even when the caller claims the gate is ready", async () => {
    const database = fakeAuthoringPublicationDatabase([]);
    await expect(authoringSave(database)).rejects.toThrow(
      "clinical publication hold is active",
    );
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
