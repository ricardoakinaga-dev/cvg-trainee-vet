import { describe, expect, it, vi } from "vitest";

import type { EmbeddingPort, VectorStorePort } from "@cvg/integrations";
import type { ContentIndexSourcePort } from "@cvg/persistence";

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

function dependencies(): {
  readonly source: ContentIndexSourcePort;
  readonly embedding: EmbeddingPort;
  readonly vectorStore: VectorStorePort;
} {
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
      list: vi.fn(async () => [
        {
          id: "orphan-point",
          knowledgeId: "orphan",
          sectionId: "orphan:v1",
          scopeId: publishedContent[0]?.scopeId ?? "scope",
          contentHash: "old-hash",
        },
      ]),
      upsert: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
      search: vi.fn(async () => []),
    },
  };
}

describe("Qdrant reconciliation", () => {
  it("rebuilds expected points from PostgreSQL and removes orphans", async () => {
    const deps = dependencies();

    const result = await reconcileVectorIndex(deps);

    expect(deps.source.listPublishedIndexable).toHaveBeenCalledOnce();
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
    });

    expect(result).toEqual({ expected: 0, upserted: 0, removed: 0 });
    expect(deps.source.listPublishedIndexable).not.toHaveBeenCalled();
  });

  it("skips unchanged points and rejects incomplete embedding batches", async () => {
    const deps = dependencies();
    const point = createInternalVectorPoint(publishedContent[0], [0.1, 0.2]);
    vi.mocked(deps.vectorStore.list).mockResolvedValue([point]);
    vi.mocked(deps.embedding.embed).mockResolvedValue([[0.1, 0.2]]);

    const unchanged = await reconcileVectorIndex(deps);
    expect(unchanged.upserted).toBe(0);
    expect(unchanged.removed).toBe(0);
    expect(deps.vectorStore.upsert).not.toHaveBeenCalled();
    expect(deps.vectorStore.delete).not.toHaveBeenCalled();

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
