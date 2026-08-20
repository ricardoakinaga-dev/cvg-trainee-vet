import { describe, expect, it, vi } from "vitest";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { ContentWorkflowEvent } from "@cvg/application";

import {
  ContentMappingError,
  contentRowToRecord,
  createContentExpiryUseCaseDependencies,
  createContentIndexSourceRepository,
  createContentRepository,
  createContentRepositoryMethods,
  createContentTransactionalOperations,
  createContentUseCaseDependencies,
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

function fakeDatabase(rows: readonly Record<string, unknown>[]) {
  const query = {
    from: () => query,
    where: () => query,
    orderBy: () => query,
    limit: async () => rows,
  };
  return {
    select: () => query,
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => [{ id: row.id }],
        }),
      }),
    }),
  } as unknown as PostgresJsDatabase<typeof schema>;
}

function scriptedDatabase(input: {
  readonly selectResults?: readonly unknown[][];
  readonly updateResults?: readonly unknown[][];
  readonly insertResults?: readonly unknown[][];
}) {
  const selectResults = [...(input.selectResults ?? [])];
  const updateResults = [...(input.updateResults ?? [])];
  const insertResults = [...(input.insertResults ?? [])];
  const inserted: unknown[] = [];

  const createQuery = (result: readonly unknown[]) => {
    const query = {
      from: vi.fn(),
      innerJoin: vi.fn(),
      leftJoin: vi.fn(),
      where: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn(),
      then: (
        resolve: (value: readonly unknown[]) => unknown,
        reject: (reason: unknown) => unknown,
      ) => Promise.resolve(result).then(resolve, reject),
    };
    query.from.mockReturnValue(query);
    query.innerJoin.mockReturnValue(query);
    query.leftJoin.mockReturnValue(query);
    query.where.mockReturnValue(query);
    query.orderBy.mockReturnValue(query);
    query.limit.mockResolvedValue(result);
    return query;
  };

  const executor = {
    execute: vi.fn(async () => undefined),
    select: vi.fn(() => createQuery(selectResults.shift() ?? [])),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => updateResults.shift() ?? []),
        })),
      })),
    })),
    insert: vi.fn(() => {
      const insertQuery = {
        values: vi.fn((value: unknown) => {
          inserted.push(value);
          return insertQuery;
        }),
        onConflictDoNothing: vi.fn(),
        returning: vi.fn(async () => insertResults.shift() ?? []),
      };
      insertQuery.onConflictDoNothing.mockReturnValue(insertQuery);
      return insertQuery;
    }),
  };

  return { executor, inserted };
}

describe("content persistence mapping", () => {
  it("composes frozen content repository methods", () => {
    const methods = createContentRepositoryMethods(fakeDatabase([row]));

    expect(Object.isFrozen(methods)).toBe(true);
    expect(Object.keys(methods).sort()).toEqual([
      "find",
      "listAffectedParticipantIds",
      "listPublishedDueForExpiry",
      "recordWithdrawalAffected",
      "save",
    ]);
  });

  it("maps editorial validity timestamps without exposing participant text", () => {
    const validUntil = new Date("2026-08-12T11:59:59.000Z");
    const nextReviewAt = new Date("2026-09-01T00:00:00.000Z");

    expect(
      contentRowToRecord({ ...row, validUntil, nextReviewAt }),
    ).toMatchObject({
      contentId: row.contentId,
      validUntil: validUntil.toISOString(),
      nextReviewAt: nextReviewAt.toISOString(),
    });
  });

  it("maps emergency withdrawal metadata without exposing affected identities", () => {
    const withdrawnAt = new Date("2026-08-14T12:00:00.000Z");

    expect(
      contentRowToRecord({
        ...row,
        status: "RETIRADO",
        withdrawalReasonCode: "ERRO_CONTEUDO",
        withdrawnAt,
      }),
    ).toEqual({
      contentId: row.contentId,
      version: row.version,
      scopeId: row.scopeId,
      status: "RETIRADO",
      withdrawalReasonCode: "ERRO_CONTEUDO",
      withdrawnAt: withdrawnAt.toISOString(),
    });
  });

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

  it("rejects invalid identity, withdrawal and editorial timestamps", () => {
    expect(() => contentRowToRecord({ ...row, contentId: " " })).toThrow(
      ContentMappingError,
    );
    expect(() => contentRowToRecord({ ...row, scopeId: " " })).toThrow(
      ContentMappingError,
    );
    expect(() => contentRowToRecord({ ...row, version: 0 })).toThrow(
      ContentMappingError,
    );
    expect(() =>
      contentRowToRecord({ ...row, withdrawalReasonCode: "UNKNOWN" }),
    ).toThrow(ContentMappingError);
    expect(() =>
      contentRowToRecord({ ...row, withdrawnAt: "invalid" }),
    ).toThrow(ContentMappingError);
    expect(() => contentRowToRecord({ ...row, validUntil: "invalid" })).toThrow(
      ContentMappingError,
    );
    expect(() =>
      contentRowToRecord({ ...row, nextReviewAt: "invalid" }),
    ).toThrow(ContentMappingError);

    const mapped = contentRowToRecord({
      ...row,
      publicationReady: true,
      publicationBlockReasons: ["CLINICAL_REVIEW_MISSING"],
    });
    expect(mapped.publicationReady).toBe(true);
    expect(mapped.publicationBlockReasons).toEqual(["CLINICAL_REVIEW_MISSING"]);
    expect(Object.isFrozen(mapped.publicationBlockReasons)).toBe(true);
  });

  it("reads and updates a version with an optimistic status condition", async () => {
    const repository = createContentRepository(fakeDatabase([row]));
    const current = await repository.find(row.contentId, row.version);
    if (current === null) throw new Error("content version is required");
    const next = { ...current, status: "PUBLICADO" as const };

    await repository.save(current, next);

    expect(next.status).toBe("PUBLICADO");
  });

  it("lists only published content whose validity window has elapsed", async () => {
    const validUntil = new Date("2026-08-12T11:59:59.000Z");
    const repository = createContentRepository(
      fakeDatabase([
        {
          ...row,
          status: "PUBLICADO",
          validUntil,
          nextReviewAt: new Date("2026-08-01T00:00:00.000Z"),
        },
      ]),
    );
    if (repository.listPublishedDueForExpiry === undefined) {
      throw new Error("expiry repository port is required");
    }

    await expect(
      repository.listPublishedDueForExpiry(
        "2026-08-12T12:00:00.000Z",
        [row.scopeId],
        10,
      ),
    ).resolves.toMatchObject([
      {
        contentId: row.contentId,
        status: "PUBLICADO",
        validUntil: validUntil.toISOString(),
      },
    ]);
  });

  it("returns null when a content version is not found", async () => {
    const repository = createContentRepository(fakeDatabase([]));

    await expect(
      repository.find(row.contentId, row.version),
    ).resolves.toBeNull();
  });

  it("marks a version ready only after technical and clinical gates pass", async () => {
    const database = scriptedDatabase({
      selectResults: [
        [{ ...row, status: "PUBLICADO" }],
        [{ preflight: { technicalChecksPassed: true } }],
        [{ decision: "APROVAR_CLINICAMENTE" }],
      ],
    });
    const repository = createContentRepository(database.executor as never);

    await expect(
      repository.find(row.contentId, row.version),
    ).resolves.toMatchObject({
      status: "PUBLICADO",
      publicationReady: true,
      publicationBlockReasons: [],
    });
  });

  it("validates expiry input and deduplicates affected participant identities", async () => {
    const due = {
      ...row,
      status: "PUBLICADO",
      validUntil: new Date("2026-08-12T00:00:00.000Z"),
    };
    const database = scriptedDatabase({
      selectResults: [
        [due],
        [
          { participantId: "participant-a" },
          { participantId: "participant-a" },
          { participantId: "participant-b" },
        ],
      ],
    });
    const repository = createContentRepository(database.executor as never);
    if (
      repository.listPublishedDueForExpiry === undefined ||
      repository.listAffectedParticipantIds === undefined
    ) {
      throw new Error("content reconciliation methods are required");
    }

    await expect(
      repository.listPublishedDueForExpiry(
        "2026-08-12T12:00:00.000Z",
        [row.scopeId, ` ${row.scopeId} `],
        10,
      ),
    ).resolves.toHaveLength(1);
    await expect(
      repository.listPublishedDueForExpiry("2026-08-12T12:00:00.000Z", [], 10),
    ).resolves.toEqual([]);
    await expect(
      repository.listPublishedDueForExpiry("invalid", [row.scopeId], 10),
    ).rejects.toThrow(ContentMappingError);
    await expect(
      repository.listPublishedDueForExpiry(
        "2026-08-12T12:00:00.000Z",
        [row.scopeId],
        101,
      ),
    ).rejects.toThrow(ContentMappingError);
    await expect(
      repository.listAffectedParticipantIds(
        row.contentId,
        row.version,
        row.scopeId,
      ),
    ).resolves.toEqual(["participant-a", "participant-b"]);
  });

  it("records withdrawal impact and fails closed for missing content versions", async () => {
    const database = scriptedDatabase({
      selectResults: [[{ id: row.id }], []],
      insertResults: [[{ id: "affected-row" }]],
    });
    const repository = createContentRepository(database.executor as never);
    if (repository.recordWithdrawalAffected === undefined) {
      throw new Error("withdrawal audit method is required");
    }
    const metadata = {
      contentId: row.contentId,
      version: row.version,
      scopeId: row.scopeId,
      withdrawnAt: "2026-08-14T12:00:00.000Z",
      correlationId: "66666666-6666-4666-8666-666666666666",
    };

    await expect(
      repository.recordWithdrawalAffected(["participant-a"], metadata),
    ).resolves.toBe(1);
    await expect(
      repository.recordWithdrawalAffected([], metadata),
    ).rejects.toThrow(ContentMappingError);
    expect(database.inserted).toHaveLength(1);
  });

  it("protects content identity and reports optimistic conflicts", async () => {
    const current = {
      contentId: row.contentId,
      version: row.version,
      scopeId: row.scopeId,
      status: "PUBLICADO" as const,
    };
    const repository = createContentRepository(
      scriptedDatabase({ updateResults: [[]] }).executor as never,
    );

    await expect(
      repository.save(current, { ...current, contentId: "other-content" }),
    ).rejects.toThrow(ContentMappingError);
    await expect(
      repository.save(current, { ...current, status: "RETIRADO" }),
    ).rejects.toMatchObject({ name: "PersistenceConflictError" });
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

  it("returns null for an unpublished lookup and rejects unsafe index batches", async () => {
    const missing = createContentIndexSourceRepository(
      scriptedDatabase({ selectResults: [[]] }).executor as never,
    );
    await expect(
      missing.findPublishedIndexable(row.contentId, row.version),
    ).resolves.toBeNull();

    const blank = createContentIndexSourceRepository(
      scriptedDatabase({
        selectResults: [
          [{ ...row, status: "PUBLICADO", participantText: " " }],
        ],
      }).executor as never,
    );
    await expect(
      blank.findPublishedIndexable(row.contentId, row.version),
    ).rejects.toThrow(ContentMappingError);

    const tooMany = createContentIndexSourceRepository(
      scriptedDatabase({
        selectResults: [Array.from({ length: 10_001 }, () => row)],
      }).executor as never,
    );
    await expect(tooMany.listPublishedIndexable()).rejects.toThrow(
      ContentMappingError,
    );
  });

  it("publishes content events and checks clinical approval transactionally", async () => {
    const database = scriptedDatabase({
      selectResults: [[], [{ id: row.id }]],
    });
    const methods = createContentTransactionalOperations(
      database.executor as never,
    );
    const event: ContentWorkflowEvent = {
      eventId: "77777777-7777-4777-8777-777777777777",
      eventType: "content.workflow.changed.v1",
      aggregateType: "content_version",
      aggregateId: row.contentId,
      occurredAt: "2026-08-14T12:00:00.000Z",
      schemaVersion: 1,
      correlationId: "88888888-8888-4888-8888-888888888888",
      payload: {
        content_id: row.contentId,
        version: String(row.version),
        status: "PUBLICADO",
      },
    };

    await expect(
      methods.clinicalReview.hasApproved(
        row.contentId,
        row.version,
        "reviewer-id",
      ),
    ).resolves.toBe(false);
    await expect(
      methods.clinicalReview.hasApproved(
        row.contentId,
        row.version,
        "reviewer-id",
      ),
    ).resolves.toBe(true);
    await methods.eventPublisher.publish(event);
    expect(database.inserted).toHaveLength(1);
  });

  it("composes content transactions and expiry dependencies", async () => {
    const database = scriptedDatabase({});
    const db = {
      transaction: vi.fn(async (work: (executor: unknown) => unknown) =>
        work(database.executor),
      ),
    };
    const dependencies = createContentUseCaseDependencies(
      db as never,
      () => "generated-id",
    );
    const expiry = createContentExpiryUseCaseDependencies(
      db as never,
      () => "generated-id",
    );

    await expect(
      dependencies.transaction.run(async (operations) =>
        Object.keys(operations).sort(),
      ),
    ).resolves.toEqual([
      "approver",
      "audit",
      "clinicalReview",
      "content",
      "eventPublisher",
    ]);
    expect(expiry.idFactory()).toBe("generated-id");
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });
});
