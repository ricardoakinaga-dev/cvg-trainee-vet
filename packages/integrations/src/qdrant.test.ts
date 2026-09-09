import { createServer } from "node:http";

import { QdrantClientUnexpectedResponseError } from "@qdrant/js-client-rest";
import { describe, expect, it, vi } from "vitest";

import { createQdrantVectorStore, validateVectorDimension } from "./qdrant.js";
import { classifyQdrantInitializationError } from "./retry.js";

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
            embedding_model: "embedding-test",
            visibility: "INTERNAL",
            status: "APPROVED_FOR_INTERNAL_SEARCH",
            knowledge_id: "knowledge-1",
            section_id: "section-1",
            scope_id: "scope-1",
            content_hash: "hash-1",
          },
        },
        {
          id: "point-old-index",
          payload: {
            index_version: "v0",
            embedding_model: "embedding-old",
            visibility: "INTERNAL",
            status: "APPROVED_FOR_INTERNAL_SEARCH",
            knowledge_id: "knowledge-old",
            section_id: "section-old",
            scope_id: "scope-old",
            content_hash: "hash-old",
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
            embedding_model: "embedding-test",
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
            embedding_model: "embedding-test",
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
        indexVersion: "v1",
        embeddingModel: "embedding-test",
      },
      {
        id: "point-old-index",
        knowledgeId: "knowledge-old",
        sectionId: "section-old",
        scopeId: "scope-old",
        contentHash: "hash-old",
        indexVersion: "v0",
        embeddingModel: "embedding-old",
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
    expect(createPayloadIndex).toHaveBeenCalledTimes(5);
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
            { key: "embedding_model", match: { value: "embedding-test" } },
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
        with_payload: [
          "index_version",
          "embedding_model",
          "visibility",
          "status",
          "knowledge_id",
          "section_id",
          "scope_id",
          "content_hash",
        ],
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
            embedding_model: {},
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

  it("waits for sibling index operations before propagating an index failure", async () => {
    let releaseSibling: (() => void) | undefined;
    const siblingGate = new Promise<void>((resolve) => {
      releaseSibling = resolve;
    });
    let resolveSiblingStarted: (() => void) | undefined;
    const siblingStarted = new Promise<void>((resolve) => {
      resolveSiblingStarted = resolve;
    });
    const createPayloadIndex = vi.fn(
      async (
        _collection: string,
        input: { field_name: string },
      ): Promise<{ status: "completed" }> => {
        if (input.field_name === "index_version") {
          throw new Error("synthetic index failure");
        }
        if (input.field_name === "visibility") {
          resolveSiblingStarted?.();
          await siblingGate;
        }
        return { status: "completed" };
      },
    );
    const store = createQdrantVectorStore(
      {
        url: "http://127.0.0.1:6333",
        collection: "cvg_sibling_failure",
        embeddingDimension: 2,
        embeddingModel: "embedding-test",
        indexVersion: "v1",
      },
      {
        collectionExists: vi.fn().mockResolvedValue({ exists: true }),
        createCollection: vi.fn(),
        getCollection: vi.fn().mockResolvedValue({
          config: { params: { vectors: { size: 2, distance: "Cosine" } } },
          payload_schema: {},
        }),
        createPayloadIndex,
        scroll: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
        query: vi.fn(),
      },
    );

    const initialization = store.ensureCollection();
    let settled = false;
    void initialization.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );

    await siblingStarted;
    for (let index = 0; index < 3; index += 1) await Promise.resolve();
    expect(settled).toBe(false);
    releaseSibling?.();
    await expect(initialization).rejects.toThrow("synthetic index failure");
    expect(settled).toBe(true);
    expect(createPayloadIndex).toHaveBeenCalledTimes(5);
  });

  it("preserves a delta-seconds Retry-After header through the SDK boundary", async () => {
    const qdrant = createServer((_request, response) => {
      response.statusCode = 429;
      response.setHeader("content-type", "application/json");
      response.setHeader("retry-after", "120");
      response.end(JSON.stringify({ status: "busy" }));
    });

    await new Promise<void>((resolve, reject) => {
      qdrant.once("error", reject);
      qdrant.listen(0, "127.0.0.1", () => resolve());
    });
    const address = qdrant.address();
    if (address === null || typeof address === "string") {
      throw new Error("synthetic Qdrant server did not bind");
    }

    try {
      const store = createQdrantVectorStore({
        url: `http://127.0.0.1:${address.port}`,
        collection: "cvg_retry_after",
        embeddingDimension: 2,
        embeddingModel: "embedding-test",
        indexVersion: "v1",
      });
      let error: unknown;
      try {
        await store.ensureCollection();
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeDefined();
      expect(classifyQdrantInitializationError(error)).toEqual({
        classification: "rate_limited",
        retryable: true,
        statusCode: 429,
        retryAfterMilliseconds: 120_000,
      });
    } finally {
      await new Promise<void>((resolve) => qdrant.close(() => resolve()));
    }
  });

  it("does not hide a permanent sibling failure behind a retryable one", async () => {
    const createPayloadIndex = vi.fn(
      async (
        _collection: string,
        input: { field_name: string },
      ): Promise<{ status: "completed" }> => {
        if (input.field_name === "index_version") {
          throw new QdrantClientUnexpectedResponseError(
            "Unexpected Response: 503 (Service Unavailable)",
          );
        }
        if (input.field_name === "visibility") {
          throw new QdrantClientUnexpectedResponseError(
            "Unexpected Response: 401 (Unauthorized)",
          );
        }
        return { status: "completed" };
      },
    );
    const store = createQdrantVectorStore(
      {
        url: "http://127.0.0.1:6333",
        collection: "cvg_mixed_index_failure",
        embeddingDimension: 2,
        embeddingModel: "embedding-test",
        indexVersion: "v1",
      },
      {
        collectionExists: vi.fn().mockResolvedValue({ exists: true }),
        createCollection: vi.fn(),
        getCollection: vi.fn().mockResolvedValue({
          config: { params: { vectors: { size: 2, distance: "Cosine" } } },
          payload_schema: {},
        }),
        createPayloadIndex,
        scroll: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
        query: vi.fn(),
      },
    );

    await expect(store.ensureCollection()).rejects.toThrow("401");
    expect(createPayloadIndex).toHaveBeenCalledTimes(5);
  });

  it("rejects an empty embedding model or index version before any I/O", () => {
    const fakeClient = {
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
          collection: "cvg_test",
          embeddingDimension: 2,
          embeddingModel: "  ",
          indexVersion: "v1",
        },
        fakeClient,
      ),
    ).toThrow("embeddingModel");
    expect(() =>
      createQdrantVectorStore(
        {
          url: "http://127.0.0.1:6333",
          collection: "cvg_test",
          embeddingDimension: 2,
          embeddingModel: "embedding-test",
          indexVersion: "",
        },
        fakeClient,
      ),
    ).toThrow("indexVersion");
    expect(fakeClient.collectionExists).not.toHaveBeenCalled();
  });

  it("rejects padded identity values that would silently never match", () => {
    const fakeClient = {
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
          collection: "cvg_test",
          embeddingDimension: 2,
          embeddingModel: " embedding-test ",
          indexVersion: "v1",
        },
        fakeClient,
      ),
    ).toThrow("embeddingModel");
    expect(() =>
      createQdrantVectorStore(
        {
          url: "http://127.0.0.1:6333",
          collection: "cvg_test",
          embeddingDimension: 2,
          embeddingModel: "embedding-test",
          indexVersion: " v1",
        },
        fakeClient,
      ),
    ).toThrow("indexVersion");
    expect(fakeClient.collectionExists).not.toHaveBeenCalled();
  });

  it("indexes the embedding model and restricts search to the operational model", async () => {
    const createPayloadIndex = vi.fn().mockResolvedValue({
      status: "completed",
    });
    const query = vi.fn().mockResolvedValue({
      points: [
        {
          id: "point-current-model",
          score: 0.9,
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
        },
        {
          id: "point-stale-model",
          score: 0.95,
          payload: {
            index_version: "v1",
            embedding_model: "embedding-old",
            visibility: "INTERNAL",
            status: "APPROVED_FOR_INTERNAL_SEARCH",
            knowledge_id: "knowledge-1",
            section_id: "section-1",
            scope_id: "scope-1",
            content_hash: "hash-1",
          },
        },
      ],
    });
    const store = createQdrantVectorStore(
      {
        url: "http://127.0.0.1:6333",
        collection: "cvg_model_filter",
        embeddingDimension: 2,
        embeddingModel: "embedding-test",
        indexVersion: "v1",
      },
      {
        collectionExists: vi.fn().mockResolvedValue({ exists: true }),
        createCollection: vi.fn(),
        getCollection: vi.fn().mockResolvedValue({
          config: { params: { vectors: { size: 2, distance: "Cosine" } } },
          payload_schema: {},
        }),
        createPayloadIndex,
        scroll: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
        query,
      },
    );

    await store.ensureCollection();
    expect(createPayloadIndex).toHaveBeenCalledWith(
      "cvg_model_filter",
      expect.objectContaining({ field_name: "embedding_model" }),
    );

    const matches = await store.search({
      vector: [0.1, 0.2],
      scopeId: "scope-1",
      limit: 5,
    });
    expect(query).toHaveBeenCalledWith(
      "cvg_model_filter",
      expect.objectContaining({
        filter: {
          must: expect.arrayContaining([
            { key: "embedding_model", match: { value: "embedding-test" } },
          ]),
        },
        with_payload: expect.arrayContaining(["embedding_model"]),
      }),
    );
    expect(matches.map((match) => match.id)).toEqual(["point-current-model"]);
  });

  it("keeps legacy points without an embedding model observable for reconciliation", async () => {
    const scroll = vi.fn().mockResolvedValue({
      points: [
        {
          id: "point-legacy",
          payload: {
            index_version: "v0",
            visibility: "INTERNAL",
            status: "APPROVED_FOR_INTERNAL_SEARCH",
            knowledge_id: "knowledge-legacy",
            section_id: "section-legacy",
            scope_id: "scope-legacy",
            content_hash: "hash-legacy",
          },
        },
      ],
      next_page_offset: null,
    });
    const store = createQdrantVectorStore(
      {
        url: "http://127.0.0.1:6333",
        collection: "cvg_legacy",
        embeddingDimension: 2,
        embeddingModel: "embedding-test",
        indexVersion: "v1",
      },
      {
        collectionExists: vi.fn(),
        createCollection: vi.fn(),
        getCollection: vi.fn(),
        createPayloadIndex: vi.fn(),
        scroll,
        upsert: vi.fn(),
        delete: vi.fn(),
        query: vi.fn().mockResolvedValue({ points: [] }),
      },
    );

    await expect(store.list()).resolves.toEqual([
      {
        id: "point-legacy",
        knowledgeId: "knowledge-legacy",
        sectionId: "section-legacy",
        scopeId: "scope-legacy",
        contentHash: "hash-legacy",
        indexVersion: "v0",
        embeddingModel: "",
      },
    ]);
  });
});
