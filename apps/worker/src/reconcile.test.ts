import { describe, expect, it, vi } from "vitest";

import type {
  EmbeddingPort,
  InternalVectorPoint,
  VectorPointMetadata,
  VectorStorePort,
} from "@cvg/integrations";
import type {
  ContentIndexSourcePort,
  IndexableContentRecord,
} from "@cvg/persistence";

import { createInternalVectorPoint } from "./indexing.js";
import { reconcileVectorIndex } from "./reconcile.js";

const publishedContent = [
  {
    contentId: "11111111-1111-4111-8111-111111111111",
    version: 1,
    scopeId: "22222222-2222-4222-8222-222222222222",
    text: "Texto interno sintético.",
  },
] as const;

function syntheticContent(count: number): readonly IndexableContentRecord[] {
  return Object.freeze(
    Array.from({ length: count }, (_, index) => ({
      contentId: `synthetic-content-${index}`,
      version: 1,
      scopeId: "22222222-2222-4222-8222-222222222222",
      text: `Synthetic indexable text ${index}`,
    })),
  );
}

function dependencies(): {
  readonly source: ContentIndexSourcePort;
  readonly embedding: EmbeddingPort;
  readonly vectorStore: VectorStorePort;
} {
  let stored: VectorPointMetadata[] = [
    {
      id: "orphan-point",
      knowledgeId: "orphan",
      sectionId: "orphan:v1",
      scopeId: publishedContent[0]?.scopeId ?? "scope",
      contentHash: "old-hash",
    },
  ];
  return {
    source: {
      findPublishedIndexable: vi.fn(async () => publishedContent[0] ?? null),
      listPublishedIndexable: vi.fn(async () => publishedContent),
    },
    embedding: {
      embed: vi.fn(async () => [[0.1, 0.2]]),
    },
    vectorStore: {
      healthcheck: vi.fn(async () => undefined),
      ensureCollection: vi.fn(async () => undefined),
      list: vi.fn(async () => stored),
      upsert: vi.fn(async (points: readonly InternalVectorPoint[]) => {
        const pointIds = new Set(points.map((point) => point.id));
        stored = [
          ...stored.filter((point) => !pointIds.has(point.id)),
          ...points.map((point) => ({
            id: point.id,
            knowledgeId: point.knowledgeId,
            sectionId: point.sectionId,
            scopeId: point.scopeId,
            contentHash: point.contentHash,
          })),
        ];
      }),
      delete: vi.fn(async (ids) => {
        const removedIds = new Set(ids);
        stored = stored.filter((point) => !removedIds.has(point.id));
      }),
      search: vi.fn(async () => []),
    },
  };
}

describe("Qdrant reconciliation", () => {
  it("rebuilds expected points from PostgreSQL and removes orphans", async () => {
    const deps = dependencies();

    const result = await reconcileVectorIndex(deps);

    expect(deps.source.listPublishedIndexable).toHaveBeenCalledTimes(2);
    expect(deps.embedding.embed).toHaveBeenCalledWith([
      "Texto interno sintético.",
    ]);
    expect(deps.vectorStore.upsert).toHaveBeenCalledWith([
      expect.objectContaining({
        knowledgeId: publishedContent[0]?.contentId,
        contentHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      }),
    ]);
    expect(deps.vectorStore.delete).toHaveBeenCalledWith(["orphan-point"]);
    expect(result).toEqual({ expected: 1, upserted: 1, removed: 1 });
    expect(
      JSON.stringify(vi.mocked(deps.vectorStore.upsert).mock.calls),
    ).not.toContain("Texto interno");
  });

  it("fails explicitly instead of reporting success when integrations are disabled", async () => {
    const deps = dependencies();

    await expect(
      reconcileVectorIndex({
        source: deps.source,
        embedding: null,
        vectorStore: null,
      }),
    ).rejects.toThrow("reconciliation is disabled");
    expect(deps.source.listPublishedIndexable).not.toHaveBeenCalled();
  });

  it("detects a resolved partial delete and converges on retry", async () => {
    const deps = dependencies();
    const expected = createInternalVectorPoint(publishedContent[0], [0.1, 0.2]);
    let stored: VectorPointMetadata[] = [
      {
        id: "orphan-point",
        knowledgeId: "orphan",
        sectionId: "orphan:v1",
        scopeId: publishedContent[0]?.scopeId ?? "scope",
        contentHash: "old-hash",
      },
    ];
    let deleteAttempts = 0;
    vi.mocked(deps.vectorStore.list).mockImplementation(async () => stored);
    vi.mocked(deps.vectorStore.upsert).mockImplementation(async (points) => {
      stored = points.map((point) => ({
        id: point.id,
        knowledgeId: point.knowledgeId,
        sectionId: point.sectionId,
        scopeId: point.scopeId,
        contentHash: point.contentHash,
      }));
      stored = [
        ...stored,
        {
          id: "orphan-point",
          knowledgeId: "orphan",
          sectionId: "orphan:v1",
          scopeId: publishedContent[0]?.scopeId ?? "scope",
          contentHash: "old-hash",
        },
      ];
    });
    vi.mocked(deps.vectorStore.delete).mockImplementation(async (ids) => {
      deleteAttempts += 1;
      if (deleteAttempts === 1) return;
      const removedIds = new Set(ids);
      stored = stored.filter((point) => !removedIds.has(point.id));
    });

    await expect(reconcileVectorIndex(deps)).rejects.toThrow(
      "did not converge",
    );
    expect(stored.map((point) => point.id).sort()).toEqual(
      [expected.id, "orphan-point"].sort(),
    );

    await expect(reconcileVectorIndex(deps)).resolves.toEqual({
      expected: 1,
      upserted: 0,
      removed: 1,
    });
    expect(stored).toEqual([
      expect.objectContaining({
        id: expected.id,
        contentHash: expected.contentHash,
      }),
    ]);
  });

  it("does not delete stale points when a resolved upsert is incomplete", async () => {
    const deps = dependencies();
    vi.mocked(deps.vectorStore.upsert).mockResolvedValueOnce(undefined);

    await expect(reconcileVectorIndex(deps)).rejects.toThrow(
      "upsert did not converge",
    );
    expect(deps.vectorStore.delete).not.toHaveBeenCalled();
  });

  it("rechecks PostgreSQL and removes a point withdrawn during reconciliation", async () => {
    const deps = dependencies();
    let sourceReads = 0;
    let stored: VectorPointMetadata[] = [];
    vi.mocked(deps.source.listPublishedIndexable).mockImplementation(
      async () => {
        sourceReads += 1;
        return sourceReads === 1 ? publishedContent : [];
      },
    );
    vi.mocked(deps.embedding.embed).mockImplementation(async (inputs) =>
      inputs.map(() => [0.1, 0.2]),
    );
    vi.mocked(deps.vectorStore.list).mockImplementation(async () => stored);
    vi.mocked(deps.vectorStore.upsert).mockImplementation(async (points) => {
      stored = points.map((point) => ({
        id: point.id,
        knowledgeId: point.knowledgeId,
        sectionId: point.sectionId,
        scopeId: point.scopeId,
        contentHash: point.contentHash,
      }));
    });
    vi.mocked(deps.vectorStore.delete).mockImplementation(async (ids) => {
      const removedIds = new Set(ids);
      stored = stored.filter((point) => !removedIds.has(point.id));
    });

    await expect(reconcileVectorIndex(deps)).resolves.toEqual({
      expected: 0,
      upserted: 1,
      removed: 1,
    });
    expect(deps.source.listPublishedIndexable).toHaveBeenCalledTimes(3);
    expect(stored).toEqual([]);
  });

  it("fails bounded and redacted when the PostgreSQL snapshot keeps changing", async () => {
    const deps = dependencies();
    let sourceReads = 0;
    vi.mocked(deps.source.listPublishedIndexable).mockImplementation(
      async () => {
        sourceReads += 1;
        return [
          {
            ...publishedContent[0],
            text: `SYNTHETIC_PRIVATE_MARKER_${sourceReads}`,
          },
        ];
      },
    );
    vi.mocked(deps.embedding.embed).mockImplementation(async (inputs) =>
      inputs.map(() => [0.1, 0.2]),
    );

    const error = await reconcileVectorIndex(deps).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(
      "Qdrant reconciliation source changed repeatedly",
    );
    expect((error as Error).message).not.toContain("SYNTHETIC_PRIVATE_MARKER");
    expect(deps.source.listPublishedIndexable).toHaveBeenCalledTimes(4);
  });

  it("does not call the embedding provider for an unchanged index", async () => {
    const deps = dependencies();
    const point = createInternalVectorPoint(publishedContent[0], [0.1, 0.2]);
    vi.mocked(deps.vectorStore.list).mockResolvedValue([point]);

    const unchanged = await reconcileVectorIndex(deps);
    expect(unchanged.upserted).toBe(0);
    expect(unchanged.removed).toBe(0);
    expect(deps.embedding.embed).not.toHaveBeenCalled();
    expect(deps.vectorStore.upsert).not.toHaveBeenCalled();
    expect(deps.vectorStore.delete).not.toHaveBeenCalled();
  });

  it("embeds 2,049 changed records in provider-bounded batches", async () => {
    const deps = dependencies();
    const content = syntheticContent(2_049);
    vi.mocked(deps.source.listPublishedIndexable).mockResolvedValue(content);
    vi.mocked(deps.embedding.embed).mockImplementation(async (inputs) =>
      inputs.map(() => [0.1, 0.2]),
    );

    await expect(reconcileVectorIndex(deps)).resolves.toEqual({
      expected: 2_049,
      upserted: 2_049,
      removed: 1,
    });

    const embeddingBatchSizes = vi
      .mocked(deps.embedding.embed)
      .mock.calls.map(([inputs]) => inputs.length);
    expect(embeddingBatchSizes).toEqual([2_048, 1]);
    expect(
      vi
        .mocked(deps.vectorStore.upsert)
        .mock.calls.every(([points]) => points.length <= 100),
    ).toBe(true);
  });

  it("splits embedding batches by their UTF-8 byte budget", async () => {
    const deps = dependencies();
    const content = syntheticContent(2).map((record, index) => ({
      ...record,
      text: `${index}` + "á".repeat(75_001),
    }));
    vi.mocked(deps.source.listPublishedIndexable).mockResolvedValue(content);
    vi.mocked(deps.embedding.embed).mockImplementation(async (inputs) =>
      inputs.map(() => [0.1, 0.2]),
    );

    await expect(reconcileVectorIndex(deps)).resolves.toEqual({
      expected: 2,
      upserted: 2,
      removed: 1,
    });
    const batches = vi
      .mocked(deps.embedding.embed)
      .mock.calls.map(([inputs]) => inputs);
    expect(batches.map((batch) => batch.length)).toEqual([1, 1]);
    expect(
      batches.every(
        (batch) =>
          batch.reduce((total, input) => total + Buffer.byteLength(input), 0) <=
          300_000,
      ),
    ).toBe(true);
  });

  it("deletes stale points in bounded write batches", async () => {
    const deps = dependencies();
    let stored: VectorPointMetadata[] = Array.from(
      { length: 201 },
      (_, index) => ({
        id: `stale-${index}`,
        knowledgeId: `stale-${index}`,
        sectionId: `stale-${index}:v1`,
        scopeId: "22222222-2222-4222-8222-222222222222",
        contentHash: `hash-${index}`,
      }),
    );
    vi.mocked(deps.source.listPublishedIndexable).mockResolvedValue([]);
    vi.mocked(deps.vectorStore.list).mockImplementation(async () => stored);
    vi.mocked(deps.vectorStore.delete).mockImplementation(async (ids) => {
      const removedIds = new Set(ids);
      stored = stored.filter((point) => !removedIds.has(point.id));
    });

    await expect(reconcileVectorIndex(deps)).resolves.toEqual({
      expected: 0,
      upserted: 0,
      removed: 201,
    });
    expect(
      vi.mocked(deps.vectorStore.delete).mock.calls.map(([ids]) => ids.length),
    ).toEqual([100, 100, 1]);
    expect(stored).toEqual([]);
  });

  it("resumes after a failed later upsert batch without re-embedding committed points", async () => {
    const deps = dependencies();
    const content = syntheticContent(101);
    let stored: VectorPointMetadata[] = [];
    let upsertCalls = 0;
    vi.mocked(deps.source.listPublishedIndexable).mockResolvedValue(content);
    vi.mocked(deps.embedding.embed).mockImplementation(async (inputs) =>
      inputs.map(() => [0.1, 0.2]),
    );
    vi.mocked(deps.vectorStore.list).mockImplementation(async () => stored);
    vi.mocked(deps.vectorStore.upsert).mockImplementation(async (points) => {
      upsertCalls += 1;
      if (upsertCalls === 2) throw new Error("synthetic write failure");
      stored = [
        ...stored,
        ...points.map((point) => ({
          id: point.id,
          knowledgeId: point.knowledgeId,
          sectionId: point.sectionId,
          scopeId: point.scopeId,
          contentHash: point.contentHash,
        })),
      ];
    });

    await expect(reconcileVectorIndex(deps)).rejects.toThrow(
      "synthetic write failure",
    );
    expect(stored).toHaveLength(100);

    await expect(reconcileVectorIndex(deps)).resolves.toEqual({
      expected: 101,
      upserted: 1,
      removed: 0,
    });
    expect(
      vi
        .mocked(deps.embedding.embed)
        .mock.calls.map(([inputs]) => inputs.length),
    ).toEqual([101, 1]);
    expect(stored).toHaveLength(101);
  });

  it("rejects incomplete embedding batches", async () => {
    const deps = dependencies();

    vi.mocked(deps.embedding.embed).mockResolvedValue([]);
    await expect(reconcileVectorIndex(deps)).rejects.toThrow(
      "unexpected vector count",
    );

    vi.mocked(deps.embedding.embed).mockResolvedValue([undefined as never]);
    await expect(reconcileVectorIndex(deps)).rejects.toThrow(
      "incomplete vector set",
    );
  });
});
