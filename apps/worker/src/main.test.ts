import { createServer } from "node:http";

import { describe, expect, it } from "vitest";

import { createWorkerRuntime } from "./main.js";

describe("worker runtime", () => {
  it("starts without assistive integrations", async () => {
    const runtime = createWorkerRuntime({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
      QDRANT_ENABLED: "false",
      AI_ENABLED: "false",
    });

    expect(runtime.service).toBe("worker");
    expect(runtime.config.ai.enabled).toBe(false);
    expect(runtime.integrations.embedding).toBeNull();
    await expect(runtime.reconcile()).resolves.toEqual({
      expected: 0,
      upserted: 0,
      removed: 0,
    });
    await runtime.close();
  });

  it("keeps the worker loop available while optional Qdrant is unavailable", async () => {
    const runtime = createWorkerRuntime({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
      QDRANT_ENABLED: "true",
      QDRANT_URL: "http://127.0.0.1:1",
      QDRANT_COLLECTION: "cvg_test_worker_startup_v1",
      QDRANT_INDEX_VERSION: "v1",
      EMBEDDING_PROVIDER: "fake",
      EMBEDDING_MODEL: "cvg-local-embedding-v1",
      EMBEDDING_DIMENSION: "8",
      AI_ENABLED: "false",
    });

    await expect(runtime.initialize()).resolves.toBeUndefined();
    await runtime.close();
  });

  it("can await optional Qdrant initialization for explicit reconciliation", async () => {
    const runtime = createWorkerRuntime({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
      QDRANT_ENABLED: "true",
      QDRANT_URL: "http://127.0.0.1:1",
      QDRANT_COLLECTION: "cvg_test_worker_reconcile_v1",
      QDRANT_INDEX_VERSION: "v1",
      EMBEDDING_PROVIDER: "fake",
      EMBEDDING_MODEL: "cvg-local-embedding-v1",
      EMBEDDING_DIMENSION: "8",
      AI_ENABLED: "false",
    });

    await expect(
      runtime.initialize({ waitForOptionalDependencies: true }),
    ).rejects.toThrow();
    await runtime.close();
  });

  it("prepares the Qdrant collection before explicit reconciliation can run", async () => {
    const collection = "cvg_test_worker_reconcile_ready_v1";
    const requests: string[] = [];
    const qdrant = createServer((request, response) => {
      requests.push(`${request.method ?? ""} ${request.url ?? ""}`);
      response.statusCode = 200;
      response.setHeader("content-type", "application/json");
      if (request.url?.endsWith("/exists")) {
        response.end(JSON.stringify({ result: { exists: false } }));
        return;
      }
      if (request.method === "GET") {
        response.end(
          JSON.stringify({
            result: {
              config: { params: { vectors: { size: 8, distance: "Cosine" } } },
              payload_schema: {},
            },
          }),
        );
        return;
      }
      response.end(JSON.stringify({ result: true }));
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
      const runtime = createWorkerRuntime({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        QDRANT_ENABLED: "true",
        QDRANT_URL: `http://127.0.0.1:${address.port}`,
        QDRANT_COLLECTION: collection,
        QDRANT_INDEX_VERSION: "v1",
        EMBEDDING_PROVIDER: "fake",
        EMBEDDING_MODEL: "cvg-local-embedding-v1",
        EMBEDDING_DIMENSION: "8",
        AI_ENABLED: "false",
      });

      await expect(
        runtime.initialize({ waitForOptionalDependencies: true }),
      ).resolves.toBeUndefined();
      expect(
        requests.some(
          (request) => request === `GET /collections/${collection}/exists`,
        ),
      ).toBe(true);
      expect(
        requests.some(
          (request) => request === `PUT /collections/${collection}`,
        ),
      ).toBe(true);
      expect(
        requests.filter((request) =>
          request.startsWith(`PUT /collections/${collection}/index`),
        ),
      ).toHaveLength(4);
      await runtime.close();
    } finally {
      await new Promise<void>((resolve) => qdrant.close(() => resolve()));
    }
  });
});
