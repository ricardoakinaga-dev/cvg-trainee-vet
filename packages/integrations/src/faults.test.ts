import { describe, expect, it } from "vitest";

import {
  failingVectorStore,
  malformedAiTextProvider,
  providerErrorAiTextProvider,
  slowVectorStore,
  timeoutEmbeddingProvider,
} from "./faults.js";
import type { VectorStorePort } from "./qdrant.js";

const healthy: VectorStorePort = Object.freeze({
  indexVersion: "v1",
  embeddingModel: "model",
  healthcheck: async () => undefined,
  ensureCollection: async () => undefined,
  list: async () => [],
  upsert: async () => undefined,
  delete: async () => undefined,
  search: async () => [],
});

describe("fault injection (test-only)", () => {
  it("refuses to arm faults in production", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      expect(() => failingVectorStore()).toThrow("test-only");
      expect(() => slowVectorStore(healthy, { delayMs: 1 })).toThrow(
        "test-only",
      );
      expect(() => timeoutEmbeddingProvider({ delayMs: 1 })).toThrow(
        "test-only",
      );
      expect(() => malformedAiTextProvider()).toThrow("test-only");
      expect(() => providerErrorAiTextProvider(500)).toThrow("test-only");
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it("fails every vector operation fast", async () => {
    const store = failingVectorStore("qdrant down");
    await expect(store.healthcheck()).rejects.toThrow("qdrant down");
    await expect(store.list()).rejects.toThrow("qdrant down");
    await expect(
      store.search({ vector: [], scopeId: "scope-1", limit: 1 }),
    ).rejects.toThrow("qdrant down");
  });

  it("delays healthy operations and honors cancellation", async () => {
    const store = slowVectorStore(healthy, { delayMs: 5 });
    await expect(store.list()).resolves.toEqual([]);

    const controller = new AbortController();
    controller.abort();
    const cancelled = slowVectorStore(healthy, {
      delayMs: 5_000,
      signal: controller.signal,
    });
    await expect(cancelled.list()).rejects.toThrow("aborted");
  });

  it("times out embeddings and surfaces malformed/provider errors", async () => {
    const slow = timeoutEmbeddingProvider({ delayMs: 5 });
    await expect(slow.embed(["hello"])).resolves.toEqual([]);

    const request = {
      input: "x",
      instructions: "be structured",
      schemaName: "test",
      jsonSchema: {},
      parse: (value: unknown) => value as string,
    };
    const malformed = malformedAiTextProvider();
    await expect(malformed.generateStructured(request)).rejects.toMatchObject({
      code: "MALFORMED_PROVIDER_OUTPUT",
    });

    const serverError = providerErrorAiTextProvider(500);
    await expect(serverError.generateStructured(request)).rejects.toMatchObject(
      { code: "PROVIDER_500" },
    );
  });
});
