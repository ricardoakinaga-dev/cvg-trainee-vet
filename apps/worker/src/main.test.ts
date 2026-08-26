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
});
