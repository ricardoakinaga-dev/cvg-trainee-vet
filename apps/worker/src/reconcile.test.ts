import { describe, expect, it, vi } from "vitest";

import type {
  EmbeddingPort,
  VectorPointMetadata,
  VectorStorePort,
} from "@cvg/integrations";
import type {
  ContentIndexSourcePort,
  IndexableContentRecord,
  OutboxEventRecord,
} from "@cvg/persistence";

import {
  reconcileVectorIndex,
  type VectorReconciliationResult,
} from "./reconcile.js";
import { createInternalVectorPoint } from "./indexing.js";
import {
  createInternalVectorPointMetadata,
  vectorPointId,
} from "./indexing.js";
import { createIntegrationHandlers } from "./handlers.js";

const publishedContent = [
  {
    contentId: "11111111-1111-4111-8111-111111111111",
    version: 2,
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
      findPublishedIndexable: vi.fn(
        async (contentId, version) =>
          publishedContent.find(
            (record) =>
              record.contentId === contentId && record.version === version,
          ) ?? null,
      ),
      listPublishedIndexable: vi.fn(async () => publishedContent),
      withContentVersionFence: vi.fn(async (contentId, version, work) =>
        work(
          publishedContent.find(
            (record) =>
              record.contentId === contentId && record.version === version,
          ) ?? null,
        ),
      ),
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

function deferred() {
  let resolve: () => void = () => {
    throw new Error("not initialized");
  };
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function raceDependencies(
  initial: readonly IndexableContentRecord[] = publishedContent,
  existing: readonly VectorPointMetadata[] = [],
) {
  const state: { current: IndexableContentRecord | null } = {
    current: initial[0] ?? null,
  };
  const points = new Set(existing.map((point) => point.id));
  const effects: string[] = [];
  const queues = new Map<string, Promise<void>>();
  const source = {
    findPublishedIndexable: vi.fn(async () => state.current),
    listPublishedIndexable: vi.fn(async () => initial),
    withContentVersionFence: vi.fn(
      async (
        contentId: string,
        version: number,
        work: (current: IndexableContentRecord | null) => Promise<void>,
      ) => {
        const key = JSON.stringify([contentId, version]);
        const previous = queues.get(key) ?? Promise.resolve();
        const gate = deferred();
        queues.set(
          key,
          previous.then(() => gate.promise),
        );
        await previous;
        try {
          await work(state.current);
        } finally {
          gate.resolve();
        }
      },
    ),
  } satisfies ContentIndexSourcePort;
  const base = dependencies(existing);
  const deps = {
    ...base,
    source,
    embedding: {
      model: base.embedding.model,
      embed: vi.fn(async () => [[0.1, 0.2]]),
    },
    vectorStore: {
      ...base.vectorStore,
      upsert: vi.fn(async (batch: Parameters<VectorStorePort["upsert"]>[0]) => {
        effects.push("upsert");
        for (const point of batch) points.add(point.id);
      }),
      delete: vi.fn(async (ids: readonly string[]) => {
        effects.push("delete");
        for (const id of ids) points.delete(id);
      }),
    },
  };
  return { state, points, effects, deps };
}

function withdrawnEvent(): OutboxEventRecord {
  const record = publishedContent[0];
  const now = new Date();
  return {
    id: "synthetic-withdraw",
    eventType: "content.withdrawn.v1",
    aggregateType: "content",
    aggregateId: record.contentId,
    occurredAt: now,
    schemaVersion: 1,
    correlationId: "synthetic-correlation",
    payload: { content_id: record.contentId, version: String(record.version) },
    status: "PENDING",
    attempts: 1,
    availableAt: now,
    lockedUntil: null,
    leaseToken: null,
    lastErrorCode: null,
    processedAt: null,
    createdAt: now,
  };
}

describe("Qdrant reconciliation", () => {
  it("repair T22 does not resurrect withdraw completed during embedding (provider DOUBLE)", async () => {
    const { state, points, deps } = raceDependencies();
    const entered = deferred();
    const release = deferred();
    deps.embedding.embed = vi.fn(async () => {
      entered.resolve();
      await release.promise;
      return [[0.1, 0.2]];
    });
    const pending = reconcileVectorIndex(deps);
    await entered.promise;
    state.current = null;
    const handlers = createIntegrationHandlers({
      source: deps.source,
      vectorStore: deps.vectorStore,
      embedding: null,
    });
    await handlers["content.withdrawn.v1"](withdrawnEvent());
    expect(points.size).toBe(0);
    release.resolve();
    const result = await pending;
    expect(deps.vectorStore.upsert).not.toHaveBeenCalled();
    expect(points.size).toBe(0);
    expect(result).toEqual({ expected: 0, upserted: 0, removed: 0 });
  });

  it("repair T22 rehydrates unchanged publication under its version fence", async () => {
    const { deps, points } = raceDependencies();
    await expect(reconcileVectorIndex(deps)).resolves.toEqual({
      expected: 1,
      upserted: 1,
      removed: 0,
    });
    expect(deps.source.withContentVersionFence).toHaveBeenCalledWith(
      publishedContent[0].contentId,
      publishedContent[0].version,
      expect.any(Function),
    );
    expect(
      points.has(
        vectorPointId(
          publishedContent[0].contentId,
          publishedContent[0].version,
        ),
      ),
    ).toBe(true);
  });

  it.each(["contentId", "version", "scopeId", "text"] as const)(
    "repair T22 denies embedding after published %s changes",
    async (field) => {
      const { state, points, deps } = raceDependencies();
      const entered = deferred();
      const release = deferred();
      deps.embedding.embed = vi.fn(async () => {
        entered.resolve();
        await release.promise;
        return [[0.1, 0.2]];
      });
      const pending = reconcileVectorIndex(deps);
      const rejected = expect(pending).rejects.toThrow(
        "published index source changed during embedding",
      );
      await entered.promise;
      state.current = {
        ...publishedContent[0],
        [field]: field === "version" ? 3 : "synthetic-changed",
      };
      release.resolve();
      await rejected;
      expect(points.size).toBe(0);
      expect(deps.vectorStore.upsert).not.toHaveBeenCalled();
    },
  );

  it("repair T22 fails closed without the content version fence", async () => {
    const { deps } = raceDependencies();
    const source: ContentIndexSourcePort = {
      findPublishedIndexable: deps.source.findPublishedIndexable,
      listPublishedIndexable: deps.source.listPublishedIndexable,
    };
    await expect(reconcileVectorIndex({ ...deps, source })).rejects.toThrow(
      "content version effect fence is not configured",
    );
    expect(deps.embedding.embed).not.toHaveBeenCalled();
    expect(deps.vectorStore.upsert).not.toHaveBeenCalled();
  });

  it("repair T22 preserves republished points after stale deletion snapshot", async () => {
    const record = publishedContent[0];
    const point = createInternalVectorPointMetadata(
      record,
      "v1",
      "embedding-test",
    );
    const { state, points, deps } = raceDependencies([], [point]);
    deps.vectorStore.list = vi.fn(async () => {
      state.current = record;
      return [point];
    });
    await expect(reconcileVectorIndex(deps)).resolves.toEqual({
      expected: 1,
      upserted: 0,
      removed: 0,
    });
    expect(deps.vectorStore.delete).not.toHaveBeenCalled();
    expect(points.has(point.id)).toBe(true);
  });

  it("repair T22 shares the effect fence with withdrawal while upsert awaits", async () => {
    const { state, points, effects, deps } = raceDependencies();
    const entered = deferred();
    const release = deferred();
    deps.vectorStore.upsert = vi.fn(async (batch) => {
      entered.resolve();
      await release.promise;
      effects.push("upsert");
      for (const point of batch) points.add(point.id);
    });
    const pending = reconcileVectorIndex(deps);
    await entered.promise;
    state.current = null;
    const handlers = createIntegrationHandlers({
      source: deps.source,
      vectorStore: deps.vectorStore,
      embedding: null,
    });
    const withdraw = handlers["content.withdrawn.v1"](withdrawnEvent());
    await Promise.resolve();
    await Promise.resolve();
    release.resolve();
    await Promise.all([pending, withdraw]);
    expect(effects).toEqual(["upsert", "delete"]);
    expect(points.size).toBe(0);
  });

  it("repair T22 snapshots text even if the source double mutates its listed object", async () => {
    const record: {
      contentId: string;
      version: number;
      scopeId: string;
      text: string;
    } = { ...publishedContent[0] };
    const { deps } = raceDependencies([record]);
    const entered = deferred();
    const release = deferred();
    deps.embedding.embed = vi.fn(async () => {
      entered.resolve();
      await release.promise;
      return [[0.1, 0.2]];
    });
    const pending = reconcileVectorIndex(deps);
    const rejected = expect(pending).rejects.toThrow(
      "published index source changed during embedding",
    );
    await entered.promise;
    record.text = "changed during embedding";
    release.resolve();
    await rejected;
    expect(deps.vectorStore.upsert).not.toHaveBeenCalled();
  });

  it.each(["scopeId", "text"] as const)(
    "repair T22 keeps republication with changed %s during delete decision",
    async (field) => {
      const record = publishedContent[0];
      const point = createInternalVectorPointMetadata(
        record,
        "v1",
        "embedding-test",
      );
      const { state, points, deps } = raceDependencies([], [point]);
      deps.vectorStore.list = vi.fn(async () => {
        state.current = { ...record, [field]: "changed-publication" };
        return [point];
      });
      await expect(reconcileVectorIndex(deps)).resolves.toEqual({
        expected: 1,
        upserted: 0,
        removed: 0,
      });
      expect(deps.vectorStore.delete).not.toHaveBeenCalled();
      expect(points.has(point.id)).toBe(true);
    },
  );

  it.each(["contentId", "version"] as const)(
    "repair T22 denies wrong %s returned by deletion fence",
    async (field) => {
      const record = publishedContent[0];
      const point = createInternalVectorPointMetadata(
        record,
        "v1",
        "embedding-test",
      );
      const { state, deps } = raceDependencies([], [point]);
      deps.vectorStore.list = vi.fn(async () => {
        state.current = {
          ...record,
          [field]: field === "version" ? 3 : "wrong-identity",
        };
        return [point];
      });
      await expect(reconcileVectorIndex(deps)).rejects.toThrow(
        "published index source identity differs from deletion fence",
      );
      expect(deps.vectorStore.delete).not.toHaveBeenCalled();
    },
  );

  it("repair T22 refuses a stale point with malformed version identity", async () => {
    const point = {
      ...createInternalVectorPointMetadata(
        publishedContent[0],
        "v1",
        "embedding-test",
      ),
      sectionId: "unknown",
    };
    const { deps } = raceDependencies([], [point]);
    await expect(reconcileVectorIndex(deps)).rejects.toThrow(
      "indexed content version identity is invalid",
    );
    expect(deps.source.withContentVersionFence).not.toHaveBeenCalled();
    expect(deps.vectorStore.delete).not.toHaveBeenCalled();
  });

  it("repair T22 does not perform effects when the shared version fence is busy", async () => {
    const { deps } = raceDependencies();
    deps.source.withContentVersionFence.mockRejectedValue(
      new Error("content version effect fence busy"),
    );
    await expect(reconcileVectorIndex(deps)).rejects.toThrow(
      "content version effect fence busy",
    );
    expect(deps.vectorStore.upsert).not.toHaveBeenCalled();
    expect(deps.vectorStore.delete).not.toHaveBeenCalled();
  });

  it("repair T22 removes a withdrawn matching point only inside its version fence", async () => {
    const point = createInternalVectorPointMetadata(
      publishedContent[0],
      "v1",
      "embedding-test",
    );
    const { state, points, deps } = raceDependencies(publishedContent, [point]);
    deps.vectorStore.list = vi.fn(async () => {
      state.current = null;
      return [point];
    });
    await expect(reconcileVectorIndex(deps)).resolves.toEqual({
      expected: 0,
      upserted: 0,
      removed: 1,
    });
    expect(points.size).toBe(0);
    expect(deps.embedding.embed).not.toHaveBeenCalled();
    expect(deps.vectorStore.delete).toHaveBeenCalledWith([point.id]);
  });

  it("repair T22 retains exclusion between two global reconciliation runs", async () => {
    const { deps } = raceDependencies();
    const entered = deferred();
    const release = deferred();
    let queue = Promise.resolve();
    let active = 0;
    let peak = 0;
    deps.withExclusiveLock = vi.fn(async (work) => {
      const previous = queue;
      const gate = deferred();
      queue = previous.then(() => gate.promise);
      await previous;
      active += 1;
      peak = Math.max(peak, active);
      try {
        return await work();
      } finally {
        active -= 1;
        gate.resolve();
      }
    });
    deps.embedding.embed = vi.fn(async () => {
      entered.resolve();
      await release.promise;
      return [[0.1, 0.2]];
    });
    const first = reconcileVectorIndex(deps);
    await entered.promise;
    const second = reconcileVectorIndex(deps);
    await Promise.resolve();
    const readsBeforeRelease =
      deps.source.listPublishedIndexable.mock.calls.length;
    release.resolve();
    await Promise.all([first, second]);
    expect(readsBeforeRelease).toBe(1);
    expect(peak).toBe(1);
    expect(deps.withExclusiveLock).toHaveBeenCalledTimes(2);
  });

  it("repair T22 fences orphan versions independently and preserves only the republished namespace", async () => {
    const first = publishedContent[0];
    const second = {
      ...first,
      contentId: "44444444-4444-4444-8444-444444444444",
    };
    const a = createInternalVectorPointMetadata(first, "v1", "embedding-test");
    const b = createInternalVectorPointMetadata(second, "v1", "embedding-test");
    const { deps, points } = raceDependencies([], [a, b]);
    deps.source.withContentVersionFence = vi.fn(
      async (contentId, _version, work) => {
        await work(contentId === second.contentId ? second : null);
      },
    );
    await expect(reconcileVectorIndex(deps)).resolves.toEqual({
      expected: 1,
      upserted: 0,
      removed: 1,
    });
    expect(deps.source.withContentVersionFence).toHaveBeenCalledWith(
      first.contentId,
      first.version,
      expect.any(Function),
    );
    expect(deps.source.withContentVersionFence).toHaveBeenCalledWith(
      second.contentId,
      second.version,
      expect.any(Function),
    );
    expect(deps.vectorStore.delete).toHaveBeenCalledExactlyOnceWith([a.id]);
    expect(points.has(a.id)).toBe(false);
    expect(points.has(b.id)).toBe(true);
  });

  it("repair T22 shares a pending delete fence with the connected publication handler", async () => {
    const record = publishedContent[0];
    const point = createInternalVectorPointMetadata(
      record,
      "v1",
      "embedding-test",
    );
    const { state, points, effects, deps } = raceDependencies([], [point]);
    const entered = deferred();
    const release = deferred();
    const publishQueued = deferred();
    let deletePending = false;
    const originalFence = deps.source.withContentVersionFence;
    deps.source.withContentVersionFence = vi.fn(
      async (contentId, version, work) => {
        if (deletePending) publishQueued.resolve();
        await originalFence(contentId, version, work);
      },
    );
    deps.vectorStore.delete = vi.fn(async (ids) => {
      deletePending = true;
      entered.resolve();
      await release.promise;
      effects.push("delete");
      for (const id of ids) points.delete(id);
      deletePending = false;
    });
    const pending = reconcileVectorIndex(deps);
    await entered.promise;
    state.current = record;
    const handlers = createIntegrationHandlers({
      source: deps.source,
      vectorStore: deps.vectorStore,
      embedding: deps.embedding,
    });
    const publish = handlers["content.published.v1"]({
      ...withdrawnEvent(),
      eventType: "content.published.v1",
    });
    await publishQueued.promise;
    await Promise.resolve();
    release.resolve();
    await Promise.all([pending, publish]);
    expect(effects).toEqual(["delete", "upsert"]);
    expect(points.has(point.id)).toBe(true);
  });

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
        knowledgeId: "gone-a",
        sectionId: "gone-a:v1",
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
    const previousVersionId = vectorPointId(publishedContent[0].contentId, 1);
    expect(previousVersionId).not.toBe(expected.id);
    const deps = dependencies([
      {
        id: previousVersionId,
        knowledgeId: expected.knowledgeId,
        sectionId: `${expected.knowledgeId}:v1`,
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
