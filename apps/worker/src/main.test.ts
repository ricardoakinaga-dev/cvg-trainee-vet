import { createServer } from "node:http";

import { describe, expect, it, vi } from "vitest";

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
      ).toHaveLength(5);
      await runtime.close();
    } finally {
      await new Promise<void>((resolve) => qdrant.close(() => resolve()));
    }
  });

  it("waits for slow optional initialization before closing", async () => {
    let releaseResponse: (() => void) | undefined;
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    let resolveRequestStarted: (() => void) | undefined;
    const requestStarted = new Promise<void>((resolve) => {
      resolveRequestStarted = resolve;
    });
    const qdrant = createServer((request, response) => {
      if (!request.url?.endsWith("/exists")) {
        response.statusCode = 404;
        response.end(JSON.stringify({ status: "not found" }));
        return;
      }
      resolveRequestStarted?.();
      void responseGate.then(() => {
        response.statusCode = 503;
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ status: "unavailable" }));
      });
    });

    await new Promise<void>((resolve, reject) => {
      qdrant.once("error", reject);
      qdrant.listen(0, "127.0.0.1", () => resolve());
    });
    const address = qdrant.address();
    if (address === null || typeof address === "string") {
      throw new Error("synthetic Qdrant server did not bind");
    }

    let runtime: ReturnType<typeof createWorkerRuntime> | undefined;
    let closing: Promise<void> | undefined;
    try {
      runtime = createWorkerRuntime({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        QDRANT_ENABLED: "true",
        QDRANT_URL: `http://127.0.0.1:${address.port}`,
        QDRANT_COLLECTION: "cvg_test_worker_close_slow_v1",
        QDRANT_INDEX_VERSION: "v1",
        EMBEDDING_PROVIDER: "fake",
        EMBEDDING_MODEL: "cvg-local-embedding-v1",
        EMBEDDING_DIMENSION: "8",
        AI_ENABLED: "false",
      });

      await expect(runtime.initialize()).resolves.toBeUndefined();
      await requestStarted;
      let closeSettled = false;
      closing = runtime.close().then(() => {
        closeSettled = true;
      });
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(closeSettled).toBe(false);

      releaseResponse?.();
      await expect(closing).resolves.toBeUndefined();
      expect(closeSettled).toBe(true);
    } finally {
      releaseResponse?.();
      if (runtime !== undefined && closing === undefined) {
        await runtime.close();
      }
      await new Promise<void>((resolve) => qdrant.close(() => resolve()));
    }
  });

  it("shares one in-flight initialization between boot and explicit mode", async () => {
    let releaseResponse: (() => void) | undefined;
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    let resolveRequestStarted: (() => void) | undefined;
    const requestStarted = new Promise<void>((resolve) => {
      resolveRequestStarted = resolve;
    });
    let existsRequests = 0;
    const qdrant = createServer((request, response) => {
      response.statusCode = 200;
      response.setHeader("content-type", "application/json");
      if (request.url?.endsWith("/exists")) {
        existsRequests += 1;
        if (existsRequests === 1) {
          resolveRequestStarted?.();
          void responseGate.then(() => {
            response.end(JSON.stringify({ result: { exists: false } }));
          });
          return;
        }
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

    let runtime: ReturnType<typeof createWorkerRuntime> | undefined;
    let closed = false;
    try {
      runtime = createWorkerRuntime({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        QDRANT_ENABLED: "true",
        QDRANT_URL: `http://127.0.0.1:${address.port}`,
        QDRANT_COLLECTION: "cvg_test_worker_shared_init_v1",
        QDRANT_INDEX_VERSION: "v1",
        EMBEDDING_PROVIDER: "fake",
        EMBEDDING_MODEL: "cvg-local-embedding-v1",
        EMBEDDING_DIMENSION: "8",
        AI_ENABLED: "false",
      });

      await expect(runtime.initialize()).resolves.toBeUndefined();
      await requestStarted;
      const awaitedInitialization = runtime.initialize({
        waitForOptionalDependencies: true,
      });
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(existsRequests).toBe(1);

      releaseResponse?.();
      await expect(awaitedInitialization).resolves.toBeUndefined();
      expect(existsRequests).toBe(1);
      await runtime.close();
      closed = true;
    } finally {
      releaseResponse?.();
      if (runtime !== undefined && !closed) await runtime.close();
      await new Promise<void>((resolve) => qdrant.close(() => resolve()));
    }
  });

  it("cancels a stale retry after explicit initialization recovers", async () => {
    type RetryTimer = {
      cleared: boolean;
      handle: ReturnType<typeof setTimeout>;
      fire: () => void;
    };
    const retryTimers: RetryTimer[] = [];
    const originalSetTimeout = globalThis.setTimeout;
    const originalClearTimeout = globalThis.clearTimeout;
    const setTimeoutSpy = vi
      .spyOn(globalThis, "setTimeout")
      .mockImplementation((handler, timeout, ...args) => {
        if (timeout === 5_000) {
          const timer = { cleared: false } as RetryTimer;
          timer.handle = timer as unknown as ReturnType<typeof setTimeout>;
          timer.fire = () => {
            if (typeof handler === "function") {
              handler(...args);
            }
          };
          retryTimers.push(timer);
          return timer.handle;
        }
        return originalSetTimeout(handler, timeout, ...args);
      });
    const clearTimeoutSpy = vi
      .spyOn(globalThis, "clearTimeout")
      .mockImplementation((timeout) => {
        const timer = retryTimers.find((candidate) =>
          Object.is(candidate.handle, timeout),
        );
        if (timer !== undefined) {
          timer.cleared = true;
          return;
        }
        originalClearTimeout(timeout);
      });
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);
    const collection = "cvg_test_worker_retry_recovery_v1";
    let existsRequests = 0;
    let resolveFirstFailure: (() => void) | undefined;
    const firstFailure = new Promise<void>((resolve) => {
      resolveFirstFailure = resolve;
    });
    const qdrant = createServer((request, response) => {
      response.statusCode = 200;
      response.setHeader("content-type", "application/json");
      if (request.url?.endsWith("/exists")) {
        existsRequests += 1;
        if (existsRequests === 1) {
          response.statusCode = 503;
          response.end(JSON.stringify({ status: "unavailable" }));
          resolveFirstFailure?.();
          return;
        }
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

    let runtime: ReturnType<typeof createWorkerRuntime> | undefined;
    let closed = false;
    try {
      runtime = createWorkerRuntime({
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

      await expect(runtime.initialize()).resolves.toBeUndefined();
      await firstFailure;
      await new Promise<void>((resolve) => setImmediate(resolve));
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(retryTimers).toHaveLength(1);

      await expect(
        runtime.initialize({ waitForOptionalDependencies: true }),
      ).resolves.toBeUndefined();
      expect(retryTimers[0]?.cleared).toBe(true);
      const existsRequestsAfterRecovery = existsRequests;
      retryTimers[0]?.fire();
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
      expect(existsRequests).toBe(existsRequestsAfterRecovery);
      await runtime.close();
      closed = true;
    } finally {
      if (runtime !== undefined && !closed) await runtime.close();
      setTimeoutSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
      randomSpy.mockRestore();
      await new Promise<void>((resolve) => qdrant.close(() => resolve()));
    }
  });

  it("bounds transient retries and permits a fresh explicit budget after exhaustion", async () => {
    type RetryTimer = {
      cleared: boolean;
      handle: ReturnType<typeof setTimeout>;
      fire: () => void;
    };
    const retryTimers: RetryTimer[] = [];
    const originalSetTimeout = globalThis.setTimeout;
    const originalClearTimeout = globalThis.clearTimeout;
    const setTimeoutSpy = vi
      .spyOn(globalThis, "setTimeout")
      .mockImplementation((handler, timeout, ...args) => {
        if (
          typeof timeout === "number" &&
          [4_000, 8_000, 16_000, 32_000].includes(timeout)
        ) {
          const timer = { cleared: false } as RetryTimer;
          timer.handle = timer as unknown as ReturnType<typeof setTimeout>;
          timer.fire = () => {
            if (typeof handler === "function") handler(...args);
          };
          retryTimers.push(timer);
          return timer.handle;
        }
        return originalSetTimeout(handler, timeout, ...args);
      });
    const clearTimeoutSpy = vi
      .spyOn(globalThis, "clearTimeout")
      .mockImplementation((timeout) => {
        const timer = retryTimers.find((candidate) =>
          Object.is(candidate.handle, timeout),
        );
        if (timer !== undefined) {
          timer.cleared = true;
          return;
        }
        originalClearTimeout(timeout);
      });
    const waiters: Array<{ expected: number; resolve: () => void }> = [];
    let existsRequests = 0;
    const notifyRequest = (): void => {
      for (let index = waiters.length - 1; index >= 0; index -= 1) {
        const waiter = waiters[index];
        if (waiter !== undefined && existsRequests >= waiter.expected) {
          waiters.splice(index, 1);
          waiter.resolve();
        }
      }
    };
    const waitForRequests = (expected: number): Promise<void> => {
      if (existsRequests >= expected) return Promise.resolve();
      return new Promise<void>((resolve) => {
        waiters.push({ expected, resolve });
      });
    };
    const waitForRetryTimer = async (index: number): Promise<void> => {
      while (retryTimers.length <= index) {
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    };
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const collection = "cvg_test_worker_bounded_retry_v1";
    const qdrant = createServer((request, response) => {
      response.setHeader("content-type", "application/json");
      if (request.url?.endsWith("/exists")) {
        existsRequests += 1;
        notifyRequest();
        if (existsRequests <= 5) {
          response.statusCode = 503;
          response.end(JSON.stringify({ status: "unavailable" }));
          return;
        }
        response.statusCode = 200;
        response.end(JSON.stringify({ result: { exists: false } }));
        return;
      }
      response.statusCode = 200;
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

    let runtime: ReturnType<typeof createWorkerRuntime> | undefined;
    try {
      runtime = createWorkerRuntime({
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

      await expect(runtime.initialize()).resolves.toBeUndefined();
      await waitForRequests(1);
      await waitForRetryTimer(0);
      for (const expectedRequestCount of [2, 3, 4, 5]) {
        await waitForRetryTimer(expectedRequestCount - 2);
        retryTimers[expectedRequestCount - 2]?.fire();
        await waitForRequests(expectedRequestCount);
      }

      expect(existsRequests).toBe(5);
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(existsRequests).toBe(5);

      await expect(
        runtime.initialize({ waitForOptionalDependencies: true }),
      ).resolves.toBeUndefined();
      expect(existsRequests).toBe(6);
    } finally {
      if (runtime !== undefined) await runtime.close();
      randomSpy.mockRestore();
      setTimeoutSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
      await new Promise<void>((resolve) => qdrant.close(() => resolve()));
    }
  });

  it("does not retry a permanent Qdrant client failure", async () => {
    let requestCount = 0;
    let resolveRequest: (() => void) | undefined;
    const requestReceived = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const qdrant = createServer((request, response) => {
      if (!request.url?.endsWith("/exists")) {
        response.statusCode = 404;
        response.end(JSON.stringify({ status: "not found" }));
        return;
      }
      requestCount += 1;
      resolveRequest?.();
      response.statusCode = 401;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ status: "unauthorized" }));
    });

    await new Promise<void>((resolve, reject) => {
      qdrant.once("error", reject);
      qdrant.listen(0, "127.0.0.1", () => resolve());
    });
    const address = qdrant.address();
    if (address === null || typeof address === "string") {
      throw new Error("synthetic Qdrant server did not bind");
    }

    let runtime: ReturnType<typeof createWorkerRuntime> | undefined;
    try {
      runtime = createWorkerRuntime({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        QDRANT_ENABLED: "true",
        QDRANT_URL: `http://127.0.0.1:${address.port}`,
        QDRANT_COLLECTION: "cvg_test_worker_permanent_retry_v1",
        QDRANT_INDEX_VERSION: "v1",
        EMBEDDING_PROVIDER: "fake",
        EMBEDDING_MODEL: "cvg-local-embedding-v1",
        EMBEDDING_DIMENSION: "8",
        AI_ENABLED: "false",
      });

      await expect(runtime.initialize()).resolves.toBeUndefined();
      await requestReceived;
      await new Promise<void>((resolve) => setImmediate(resolve));
      await vi.advanceTimersByTimeAsync(60_000);
      expect(requestCount).toBe(1);
    } finally {
      if (runtime !== undefined) await runtime.close();
      vi.useRealTimers();
      await new Promise<void>((resolve) => qdrant.close(() => resolve()));
    }
  });

  it("does not leave a stale retry when explicit recovery meets a permanent failure", async () => {
    let releaseFirstResponse: (() => void) | undefined;
    const firstResponseGate = new Promise<void>((resolve) => {
      releaseFirstResponse = resolve;
    });
    let resolveFirstRequest: (() => void) | undefined;
    const firstRequest = new Promise<void>((resolve) => {
      resolveFirstRequest = resolve;
    });
    let requestCount = 0;
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const qdrant = createServer((request, response) => {
      if (!request.url?.endsWith("/exists")) {
        response.statusCode = 404;
        response.end(JSON.stringify({ status: "not found" }));
        return;
      }
      requestCount += 1;
      if (requestCount === 1) {
        resolveFirstRequest?.();
        void firstResponseGate.then(() => {
          response.statusCode = 503;
          response.setHeader("content-type", "application/json");
          response.end(JSON.stringify({ status: "unavailable" }));
        });
        return;
      }
      response.statusCode = 401;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ status: "unauthorized" }));
    });

    await new Promise<void>((resolve, reject) => {
      qdrant.once("error", reject);
      qdrant.listen(0, "127.0.0.1", () => resolve());
    });
    const address = qdrant.address();
    if (address === null || typeof address === "string") {
      throw new Error("synthetic Qdrant server did not bind");
    }

    let runtime: ReturnType<typeof createWorkerRuntime> | undefined;
    try {
      runtime = createWorkerRuntime({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
        QDRANT_ENABLED: "true",
        QDRANT_URL: `http://127.0.0.1:${address.port}`,
        QDRANT_COLLECTION: "cvg_test_worker_racing_recovery_v1",
        QDRANT_INDEX_VERSION: "v1",
        EMBEDDING_PROVIDER: "fake",
        EMBEDDING_MODEL: "cvg-local-embedding-v1",
        EMBEDDING_DIMENSION: "8",
        AI_ENABLED: "false",
      });

      await expect(runtime.initialize()).resolves.toBeUndefined();
      await firstRequest;
      const explicitInitialization = runtime.initialize({
        waitForOptionalDependencies: true,
      });
      releaseFirstResponse?.();

      await expect(explicitInitialization).rejects.toThrow("Unauthorized");
      expect(requestCount).toBe(2);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(requestCount).toBe(2);
    } finally {
      releaseFirstResponse?.();
      if (runtime !== undefined) await runtime.close();
      vi.useRealTimers();
      await new Promise<void>((resolve) => qdrant.close(() => resolve()));
    }
  });
});
