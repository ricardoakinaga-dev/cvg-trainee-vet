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

describe("content persistence mapping", () => {
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
