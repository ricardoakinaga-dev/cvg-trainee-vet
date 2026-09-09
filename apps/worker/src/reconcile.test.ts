import { describe, expect, it, vi } from "vitest";

import type {
  EmbeddingPort,
  VectorPointMetadata,
  VectorStorePort,
} from "@cvg/integrations";
import type { ContentIndexSourcePort } from "@cvg/persistence";

import {
  reconcileVectorIndex,
  type VectorReconciliationResult,
} from "./reconcile.js";
import { createInternalVectorPoint } from "./indexing.js";

const publishedContent = [
  {
    contentId: "11111111-1111-4111-8111-111111111111",
    version: 1,
    scopeId: "22222222-2222-4222-8222-222222222222",
    text: "Texto interno sintético.",
  },
] as const;

function dependencies(
  existing: readonly VectorPointMetadata[] = [
    {
      id: "orphan-point",
      knowledgeId: "orphan",
      sectionId: "orphan:v1",
      scopeId: publishedContent[0]?.scopeId ?? "scope",
      contentHash: "old-hash",
      indexVersion: "v1",
      embeddingModel: "embedding-test",
    },
  ],
): {
  readonly source: ContentIndexSourcePort;
  readonly embedding: EmbeddingPort;
  readonly vectorStore: VectorStorePort;
  readonly withExclusiveLock: (
    work: () => Promise<VectorReconciliationResult>,
  ) => Promise<VectorReconciliationResult>;
} {
  return {
    source: {
      findPublishedIndexable: vi.fn(async () => publishedContent[0] ?? null),
      listPublishedIndexable: vi.fn(async () => publishedContent),
    },
    embedding: {
      model: "embedding-test",
      embed: vi.fn(async () => [[0.1, 0.2]]),
    },
    vectorStore: {
      indexVersion: "v1",
      embeddingModel: "embedding-test",
      healthcheck: vi.fn(async () => undefined),
      ensureCollection: vi.fn(async () => undefined),
      list: vi.fn(async () => existing),
      upsert: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
      search: vi.fn(async () => []),
    },
    withExclusiveLock: vi.fn(
      async (work: () => Promise<VectorReconciliationResult>) => work(),
    ),
  };
}

describe("Qdrant reconciliation", () => {
  it("rebuilds expected points from PostgreSQL and removes orphans", async () => {
    const deps = dependencies();

    const result = await reconcileVectorIndex(deps);

    expect(deps.source.listPublishedIndexable).toHaveBeenCalledOnce();
    expect(deps.withExclusiveLock).toHaveBeenCalledOnce();
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

  it("does not call vector dependencies when integrations are disabled", async () => {
    const deps = dependencies();

    const result = await reconcileVectorIndex({
      source: deps.source,
      embedding: null,
      vectorStore: null,
      withExclusiveLock: async (
        work: () => Promise<VectorReconciliationResult>,
      ) => work(),
    });

    expect(result).toEqual({ expected: 0, upserted: 0, removed: 0 });
    expect(deps.source.listPublishedIndexable).not.toHaveBeenCalled();
  });

  it("reindexes an existing point when index version or embedding model drifts", async () => {
    const expected = createInternalVectorPoint(
      publishedContent[0]!,
      [0.1, 0.2],
    );
    const deps = dependencies([
      {
        id: expected.id,
        knowledgeId: expected.knowledgeId,
        sectionId: expected.sectionId,
        scopeId: expected.scopeId,
        contentHash: expected.contentHash,
        indexVersion: "v0",
        embeddingModel: "embedding-old",
      },
    ]);

    await expect(reconcileVectorIndex(deps)).resolves.toEqual({
      expected: 1,
      upserted: 1,
      removed: 0,
    });
    expect(deps.vectorStore.upsert).toHaveBeenCalledWith([
      expect.objectContaining({ id: expected.id }),
    ]);
    expect(deps.vectorStore.delete).not.toHaveBeenCalled();
  });

  it("is idempotent when content and index metadata already match", async () => {
    const expected = createInternalVectorPoint(
      publishedContent[0]!,
      [0.1, 0.2],
    );
    const deps = dependencies([
      {
        id: expected.id,
        knowledgeId: expected.knowledgeId,
        sectionId: expected.sectionId,
        scopeId: expected.scopeId,
        contentHash: expected.contentHash,
        indexVersion: "v1",
        embeddingModel: "embedding-test",
      },
    ]);

    await expect(reconcileVectorIndex(deps)).resolves.toEqual({
      expected: 1,
      upserted: 0,
      removed: 0,
    });
    expect(deps.vectorStore.upsert).not.toHaveBeenCalled();
    expect(deps.vectorStore.delete).not.toHaveBeenCalled();
    expect(deps.embedding.embed).not.toHaveBeenCalled();
  });

  it("fails closed when only one integration is configured", async () => {
    const deps = dependencies();

    await expect(
      reconcileVectorIndex({
        ...deps,
        embedding: deps.embedding,
        vectorStore: null,
      }),
    ).rejects.toThrow("both embedding and vector store");
    await expect(
      reconcileVectorIndex({
        ...deps,
        embedding: null,
        vectorStore: deps.vectorStore,
      }),
    ).rejects.toThrow("both embedding and vector store");
    expect(deps.source.listPublishedIndexable).not.toHaveBeenCalled();
    expect(deps.withExclusiveLock).not.toHaveBeenCalled();
  });

  it("reindexes an existing point when only the content hash drifts", async () => {
    const expected = createInternalVectorPoint(
      publishedContent[0]!,
      [0.1, 0.2],
    );
    const deps = dependencies([
      {
        id: expected.id,
        knowledgeId: expected.knowledgeId,
        sectionId: expected.sectionId,
        scopeId: expected.scopeId,
        contentHash: "deadbeef".repeat(8).slice(0, 64),
        indexVersion: "v1",
        embeddingModel: "embedding-test",
      },
    ]);

    await expect(reconcileVectorIndex(deps)).resolves.toEqual({
      expected: 1,
      upserted: 1,
      removed: 0,
    });
    expect(deps.vectorStore.upsert).toHaveBeenCalledWith([
      expect.objectContaining({ id: expected.id }),
    ]);
    expect(deps.vectorStore.delete).not.toHaveBeenCalled();
  });

  it("reindexes an existing point when only the scope drifts", async () => {
    const expected = createInternalVectorPoint(
      publishedContent[0]!,
      [0.1, 0.2],
    );
    const deps = dependencies([
      {
        id: expected.id,
        knowledgeId: expected.knowledgeId,
        sectionId: expected.sectionId,
        scopeId: "33333333-3333-4333-8333-333333333333",
        contentHash: expected.contentHash,
        indexVersion: "v1",
        embeddingModel: "embedding-test",
      },
    ]);

    await expect(reconcileVectorIndex(deps)).resolves.toEqual({
      expected: 1,
      upserted: 1,
      removed: 0,
    });
    expect(deps.vectorStore.delete).not.toHaveBeenCalled();
  });

  it("removes every indexed point without calling embeddings when the source is empty", async () => {
    const base = dependencies([
      {
        id: "stale-a",
        knowledgeId: "gone-a",
        sectionId: "gone-a:v1",
        scopeId: "scope",
        contentHash: "hash-a",
        indexVersion: "v1",
        embeddingModel: "embedding-test",
      },
      {
        id: "stale-b",
        knowledgeId: "gone-b",
        sectionId: "gone-b:v1",
        scopeId: "scope",
        contentHash: "hash-b",
        indexVersion: "v1",
        embeddingModel: "embedding-test",
      },
    ]);
    const deps = {
      ...base,
      source: {
        ...base.source,
        listPublishedIndexable: vi.fn(async () => []),
      },
    };

    await expect(reconcileVectorIndex(deps)).resolves.toEqual({
      expected: 0,
      upserted: 0,
      removed: 2,
    });
    expect(deps.embedding.embed).not.toHaveBeenCalled();
    expect(deps.vectorStore.upsert).not.toHaveBeenCalled();
    expect(deps.vectorStore.delete).toHaveBeenCalledWith(
      expect.arrayContaining(["stale-a", "stale-b"]),
    );
  });

  it("removes a previous content version held under a different point id", async () => {
    const expected = createInternalVectorPoint(
      publishedContent[0]!,
      [0.1, 0.2],
    );
    const lastChar = expected.id.slice(-1);
    const previousVersionId = `${expected.id.slice(0, -1)}${lastChar === "0" ? "1" : "0"}`;
    expect(previousVersionId).not.toBe(expected.id);
    const deps = dependencies([
      {
        id: previousVersionId,
        knowledgeId: expected.knowledgeId,
        sectionId: `${expected.knowledgeId}:v0`,
        scopeId: expected.scopeId,
        contentHash: expected.contentHash,
        indexVersion: "v1",
        embeddingModel: "embedding-test",
      },
      {
        id: expected.id,
        knowledgeId: expected.knowledgeId,
        sectionId: expected.sectionId,
        scopeId: expected.scopeId,
        contentHash: expected.contentHash,
        indexVersion: "v1",
        embeddingModel: "embedding-test",
      },
    ]);

    await expect(reconcileVectorIndex(deps)).resolves.toEqual({
      expected: 1,
      upserted: 0,
      removed: 1,
    });
    expect(deps.vectorStore.delete).toHaveBeenCalledWith([previousVersionId]);
  });

  it("never consults vector retrieval: poisoned search cannot alter the index", async () => {
    const base = dependencies();
    const deps = {
      ...base,
      vectorStore: {
        ...base.vectorStore,
        search: vi.fn(async () => {
          throw new Error("retrieval must not influence reconciliation");
        }),
      },
    };

    await expect(reconcileVectorIndex(deps)).resolves.toMatchObject({
      expected: 1,
    });
    expect(deps.vectorStore.search).not.toHaveBeenCalled();
    expect(deps.vectorStore.upsert).toHaveBeenCalledOnce();
  });
});
