import { createServer } from "node:http";

import { describe, expect, it, vi } from "vitest";

import { createApiRuntime } from "./main.js";

describe("API runtime", () => {
  it("starts with deterministic integrations disabled", async () => {
    const runtime = createApiRuntime({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
      QDRANT_ENABLED: "false",
      AI_ENABLED: "false",
    });

    expect(runtime.service).toBe("api");
    expect(runtime.config.qdrant.enabled).toBe(false);
    expect(runtime.integrations.vectorStore).toBeNull();
    expect(runtime.integrations.ai).toBeNull();
    await runtime.close();
  });

  it("binds before optional Qdrant initialization can fail", async () => {
    let runtime: ReturnType<typeof createApiRuntime> | undefined;
    let requestCount = 0;
    let apiWasBoundWhenQdrantFailed = false;
    let resolveQdrantRequest: (() => void) | undefined;
    const qdrantRequest = new Promise<void>((resolve) => {
      resolveQdrantRequest = resolve;
    });
    const qdrant = createServer((_request, response) => {
      requestCount += 1;
      apiWasBoundWhenQdrantFailed =
        runtime !== undefined && runtime.server.address() !== null;
      resolveQdrantRequest?.();
      response.statusCode = 503;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ status: "unavailable" }));
    });

    await new Promise<void>((resolve, reject) => {
      qdrant.once("error", reject);
      qdrant.listen(0, "127.0.0.1", () => resolve());
    });
    const qdrantAddress = qdrant.address();
    if (qdrantAddress === null || typeof qdrantAddress === "string") {
      throw new Error("synthetic Qdrant server did not bind");
    }

    try {
      runtime = createApiRuntime({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        API_HOST: "127.0.0.1",
        API_PORT: "0",
        QDRANT_ENABLED: "true",
        QDRANT_URL: `http://127.0.0.1:${qdrantAddress.port}`,
        QDRANT_COLLECTION: "cvg_test_startup_v1",
        QDRANT_INDEX_VERSION: "v1",
        EMBEDDING_PROVIDER: "fake",
        EMBEDDING_MODEL: "cvg-local-embedding-v1",
        EMBEDDING_DIMENSION: "8",
        AI_ENABLED: "false",
      });

      await expect(runtime.listen()).resolves.toBeUndefined();
      await qdrantRequest;
      expect(requestCount).toBeGreaterThan(0);
      expect(apiWasBoundWhenQdrantFailed).toBe(true);
      const address = runtime.server.address();
      expect(address).not.toBeNull();
      if (address !== null && typeof address !== "string") {
        const live = await fetch(
          `http://127.0.0.1:${address.port}/health/live`,
        );
        expect(live.status).toBe(200);
      }
    } finally {
      if (runtime !== undefined) await runtime.close();
      await new Promise<void>((resolve) => qdrant.close(() => resolve()));
    }
  });

  it("bounds transient optional initialization retries and stops after exhaustion", async () => {
    const waiters: Array<{ expected: number; resolve: () => void }> = [];
    let requestCount = 0;
    const notifyRequest = (): void => {
      for (let index = waiters.length - 1; index >= 0; index -= 1) {
        const waiter = waiters[index];
        if (waiter !== undefined && requestCount >= waiter.expected) {
          waiters.splice(index, 1);
          waiter.resolve();
        }
      }
    };
    const waitForRequests = (expected: number): Promise<void> => {
      if (requestCount >= expected) return Promise.resolve();
      return new Promise<void>((resolve) => {
        waiters.push({ expected, resolve });
      });
    };
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);
    let runtime: ReturnType<typeof createApiRuntime> | undefined;
    const qdrant = createServer((request, response) => {
      if (!request.url?.endsWith("/exists")) {
        response.statusCode = 404;
        response.end(JSON.stringify({ status: "not found" }));
        return;
      }
      requestCount += 1;
      notifyRequest();
      response.statusCode = 503;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ status: "unavailable" }));
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
      runtime = createApiRuntime({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        API_HOST: "127.0.0.1",
        API_PORT: "0",
        QDRANT_ENABLED: "true",
        QDRANT_URL: `http://127.0.0.1:${address.port}`,
        QDRANT_COLLECTION: "cvg_test_api_bounded_retry_v1",
        QDRANT_INDEX_VERSION: "v1",
        EMBEDDING_PROVIDER: "fake",
        EMBEDDING_MODEL: "cvg-local-embedding-v1",
        EMBEDDING_DIMENSION: "8",
        AI_ENABLED: "false",
      });

      await expect(runtime.listen()).resolves.toBeUndefined();
      await waitForRequests(1);
      await new Promise<void>((resolve) => setImmediate(resolve));

      for (const [expectedRequestCount, delay] of [
        [2, 5_000],
        [3, 10_000],
        [4, 20_000],
        [5, 40_000],
      ] as const) {
        await vi.advanceTimersByTimeAsync(delay);
        await waitForRequests(expectedRequestCount);
        await new Promise<void>((resolve) => setImmediate(resolve));
      }

      expect(requestCount).toBe(5);
      await vi.advanceTimersByTimeAsync(60_000);
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(requestCount).toBe(5);
    } finally {
      if (runtime !== undefined) await runtime.close();
      randomSpy.mockRestore();
      vi.useRealTimers();
      await new Promise<void>((resolve) => qdrant.close(() => resolve()));
    }
  });
});
