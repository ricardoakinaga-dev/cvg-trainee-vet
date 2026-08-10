import { describe, expect, it, vi } from "vitest";

import { createQdrantVectorStore, validateVectorDimension } from "./qdrant.js";

describe("Qdrant integration boundary", () => {
  it("rejects invalid vector dimensions and non-finite values", () => {
    expect(() => validateVectorDimension([1], 2)).toThrow("dimension");
    expect(() => validateVectorDimension([1, Number.NaN], 2)).toThrow("finite");
  });

  it("rejects invalid collection, dimension and search limits", async () => {
    const client = {
      collectionExists: vi.fn(),
      createCollection: vi.fn(),
      getCollection: vi.fn(),
      createPayloadIndex: vi.fn(),
      scroll: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      query: vi.fn(),
    };
    expect(() =>
      createQdrantVectorStore(
        {
          url: "http://127.0.0.1:6333",
          collection: " ",
          embeddingDimension: 2,
          embeddingModel: "embedding-test",
          indexVersion: "v1",
        },
        client,
      ),
    ).toThrow("collection");
    expect(() =>
      createQdrantVectorStore(
        {
          url: "http://127.0.0.1:6333",
          collection: "cvg_test",
          embeddingDimension: 0,
          embeddingModel: "embedding-test",
          indexVersion: "v1",
        },
        client,
      ),
    ).toThrow("embeddingDimension");

    const store = createQdrantVectorStore(
      {
        url: "http://127.0.0.1:6333",
        collection: "cvg_test",
        embeddingDimension: 2,
        embeddingModel: "embedding-test",
        indexVersion: "v1",
      },
      client,
    );
    await expect(
      store.search({ vector: [0.1, 0.2], scopeId: "scope", limit: 0 }),
    ).rejects.toThrow("limit");
    await store.upsert([]);
    expect(client.upsert).not.toHaveBeenCalled();
  });

  it("keeps Qdrant payload internal and uses the configured index version", async () => {
    const collectionExists = vi.fn().mockResolvedValue({ exists: false });
    const createCollection = vi.fn().mockResolvedValue(true);
    const getCollection = vi.fn().mockResolvedValue({
      config: { params: { vectors: { size: 2, distance: "Cosine" } } },
      payload_schema: {},
    });
    const createPayloadIndex = vi.fn().mockResolvedValue({
      status: "completed",
    });
    const upsert = vi.fn().mockResolvedValue({ status: "completed" });
    const remove = vi.fn().mockResolvedValue({ status: "completed" });
    const scroll = vi.fn().mockResolvedValue({
      points: [
        {
          id: "point-1",
          payload: {
            index_version: "v1",
            visibility: "INTERNAL",
            status: "APPROVED_FOR_INTERNAL_SEARCH",
            knowledge_id: "knowledge-1",
            section_id: "section-1",
            scope_id: "scope-1",
            content_hash: "hash-1",
          },
        },
      ],
      next_page_offset: null,
    });
    const query = vi.fn().mockResolvedValue({
      points: [
        {
          id: "point-1",
          score: 0.92,
          payload: {
            index_version: "v1",
            visibility: "INTERNAL",
            status: "APPROVED_FOR_INTERNAL_SEARCH",
            knowledge_id: "knowledge-1",
            section_id: "section-1",
            scope_id: "scope-1",
            content_hash: "hash-1",
          },
        },
        {
          id: "point-2",
          score: 0.4,
          payload: {
            index_version: "v2",
            visibility: "INTERNAL",
            status: "APPROVED_FOR_INTERNAL_SEARCH",
            knowledge_id: "knowledge-2",
            section_id: "section-2",
            scope_id: "scope-2",
            content_hash: "hash-2",
          },
        },
      ],
    });
    const client = {
      collectionExists,
      createCollection,
      getCollection,
      createPayloadIndex,
      scroll,
      upsert,
      delete: remove,
      query,
    };
    const store = createQdrantVectorStore(
      {
        url: "http://127.0.0.1:6333",
        collection: "cvg_internal_knowledge_v1",
        embeddingDimension: 2,
        embeddingModel: "embedding-test",
        indexVersion: "v1",
      },
      client,
    );

    await store.ensureCollection();
    await store.healthcheck();
    await store.upsert([
      {
        id: "point-1",
        vector: [0.1, 0.2],
        knowledgeId: "knowledge-1",
        sectionId: "section-1",
        scopeId: "scope-1",
        contentHash: "hash-1",
        status: "APPROVED_FOR_INTERNAL_SEARCH",
      },
    ]);
    await store.delete(["point-1"]);
    await expect(store.list()).resolves.toEqual([
      {
        id: "point-1",
        knowledgeId: "knowledge-1",
        sectionId: "section-1",
        scopeId: "scope-1",
        contentHash: "hash-1",
      },
    ]);
    const matches = await store.search({
      vector: [0.1, 0.2],
      scopeId: "scope-1",
      limit: 5,
      scoreThreshold: 0.5,
    });

    expect(createCollection).toHaveBeenCalledWith(
      "cvg_internal_knowledge_v1",
      expect.objectContaining({
        vectors: { size: 2, distance: "Cosine" },
      }),
    );
    expect(createPayloadIndex).toHaveBeenCalledTimes(4);
    expect(upsert).toHaveBeenCalledWith(
      "cvg_internal_knowledge_v1",
      expect.objectContaining({
        points: [
          expect.objectContaining({
            payload: {
              index_version: "v1",
              embedding_model: "embedding-test",
              visibility: "INTERNAL",
              status: "APPROVED_FOR_INTERNAL_SEARCH",
              knowledge_id: "knowledge-1",
              section_id: "section-1",
              scope_id: "scope-1",
              content_hash: "hash-1",
            },
          }),
        ],
      }),
    );
    expect(remove).toHaveBeenCalledWith("cvg_internal_knowledge_v1", {
      wait: true,
      points: ["point-1"],
    });
    expect(query).toHaveBeenCalledWith(
      "cvg_internal_knowledge_v1",
      expect.objectContaining({
        score_threshold: 0.5,
        filter: {
          must: [
            { key: "index_version", match: { value: "v1" } },
            { key: "visibility", match: { value: "INTERNAL" } },
            {
              key: "status",
              match: { value: "APPROVED_FOR_INTERNAL_SEARCH" },
            },
            { key: "scope_id", match: { value: "scope-1" } },
          ],
        },
      }),
    );
    expect(scroll).toHaveBeenCalledWith(
      "cvg_internal_knowledge_v1",
      expect.objectContaining({
        limit: 100,
        with_payload: true,
        with_vector: false,
      }),
    );
    expect(matches).toEqual([
      {
        id: "point-1",
        score: 0.92,
        knowledgeId: "knowledge-1",
        sectionId: "section-1",
        scopeId: "scope-1",
        contentHash: "hash-1",
      },
    ]);
  });

  it("does not recreate an existing collection or duplicate its indexes", async () => {
    const createCollection = vi.fn();
    const createPayloadIndex = vi.fn();
    const store = createQdrantVectorStore(
      {
        url: "http://127.0.0.1:6333",
        collection: "cvg_existing",
        embeddingDimension: 2,
        embeddingModel: "embedding-test",
        indexVersion: "v1",
      },
      {
        collectionExists: vi.fn().mockResolvedValue({ exists: true }),
        createCollection,
        getCollection: vi.fn().mockResolvedValue({
          config: { params: { vectors: { size: 2, distance: "Cosine" } } },
          payload_schema: {
            index_version: {},
            visibility: {},
            status: {},
            scope_id: {},
          },
        }),
        createPayloadIndex,
        scroll: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
        query: vi.fn(),
      },
    );

    await store.ensureCollection();
    expect(createCollection).not.toHaveBeenCalled();
    expect(createPayloadIndex).not.toHaveBeenCalled();
  });

  it("blocks an existing collection with an incompatible vector contract", async () => {
    const store = createQdrantVectorStore(
      {
        url: "http://127.0.0.1:6333",
        collection: "cvg_incompatible",
        embeddingDimension: 2,
        embeddingModel: "embedding-test",
        indexVersion: "v1",
      },
      {
        collectionExists: vi.fn().mockResolvedValue({ exists: true }),
        createCollection: vi.fn(),
        getCollection: vi.fn().mockResolvedValue({
          config: { params: { vectors: { size: 3, distance: "Cosine" } } },
          payload_schema: {},
        }),
        createPayloadIndex: vi.fn(),
        scroll: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
        query: vi.fn(),
      },
    );

    await expect(store.ensureCollection()).rejects.toThrow("incompatible");
  });
});
