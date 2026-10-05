import { createServer } from "node:http";

import { describe, expect, it, vi } from "vitest";

import { createWorkerRuntime } from "./main.js";
import { afterEach, beforeEach } from "vitest";
import type { ServerIntegrationSet } from "@cvg/integrations";
import type {
  ContentIndexSourcePort,
  OutboxEventRecord,
  OutboxRepositoryPort,
} from "@cvg/persistence";
import type {
  LogRecord,
  Observability,
  ObservabilityOptions,
} from "@cvg/observability";
import type * as ObservabilityModule from "@cvg/observability";

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

// T23: explicit integration/persistence doubles. The production main, loop,
// lease guard, handlers and reconciliation execute unchanged through these ports.
describe("worker shutdown T23", () => {
  const environment = {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://synthetic:synthetic@localhost:1/synthetic",
    QDRANT_ENABLED: "false",
    AI_ENABLED: "false",
  };
  const gate = <T>() => {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((yes, no) => {
      resolve = yes;
      reject = no;
    });
    return { promise, resolve, reject };
  };
  const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
  let repository: OutboxRepositoryPort;
  let source: ContentIndexSourcePort;
  let integrations: ServerIntegrationSet;
  let close: ReturnType<typeof vi.fn<() => Promise<void>>>;
  let initialize: ReturnType<typeof vi.fn<() => Promise<void>>>;
  let recalculate: ReturnType<typeof vi.fn<() => Promise<void>>>;
  let runtime: ReturnType<typeof createWorkerRuntime>;
  const order: string[] = [];
  const logs: string[] = [];
  const records: LogRecord[] = [];
  let telemetry: Observability;
  const event = (): OutboxEventRecord => ({
    id: "synthetic-event",
    eventType: "appeal.recalculation.requested.v1",
    aggregateType: "appeal",
    aggregateId: "synthetic-appeal",
    occurredAt: new Date(0),
    schemaVersion: 1,
    correlationId: "synthetic-correlation",
    payload: {
      appeal_id: "synthetic-appeal",
      scope_id: "synthetic-scope",
      attempt_id: "synthetic-attempt",
      appeal_version: "1",
      decision: "MANTER_RESULTADO",
    },
    status: "PROCESSING",
    attempts: 1,
    availableAt: new Date(0),
    lockedUntil: new Date(60_000),
    leaseToken: "synthetic-token",
    lastErrorCode: null,
    processedAt: null,
    createdAt: new Date(0),
  });
  beforeEach(async () => {
    vi.resetModules();
    order.length = 0;
    logs.length = 0;
    records.length = 0;
    close = vi.fn(async () => {
      order.push("resources.close");
      logs.push("resources.close");
    });
    initialize = vi.fn(async () => {});
    recalculate = vi.fn(async () => {});
    repository = {
      claim: vi.fn(async () => []),
      renewLease: vi.fn(async () => true),
      withLeaseFence: async (_id, _token, _seconds, work) => ({
        owned: true,
        value: await work(),
      }),
      markProcessed: vi.fn(async () => {
        order.push("event.processed");
        return true;
      }),
      markFailed: vi.fn(async () => {
        order.push("event.retry");
        return true;
      }),
    };
    source = {
      findPublishedIndexable: vi.fn(async () => null),
      listPublishedIndexable: vi.fn(async () => []),
    };
    // No database/client/provider is created: this is a lifecycle port double.
    integrations = {
      database: {
        db: {},
        withAdvisoryLock: async (_key: string, work: () => Promise<unknown>) =>
          work(),
      },
      embedding: null,
      vectorStore: null,
      ai: null,
      initialize,
      close,
    } as unknown as ServerIntegrationSet;
    vi.doMock("@cvg/integrations", async () => ({
      ...(await vi.importActual<object>("@cvg/integrations")),
      createServerIntegrations: () => integrations,
    }));
    vi.doMock("@cvg/persistence", async () => ({
      ...(await vi.importActual<object>("@cvg/persistence")),
      createOutboxRepository: () => repository,
      createContentIndexSourceRepository: () => source,
      createAppealRecalculationProcessor: () => recalculate,
      createAiSuggestionSink: () => ({
        saveDraftSuggestion: vi.fn(async () => {}),
      }),
    }));
    vi.doMock("@cvg/observability", async () => {
      const actual =
        await vi.importActual<typeof ObservabilityModule>("@cvg/observability");
      return {
        ...actual,
        createObservability: (options: ObservabilityOptions) => {
          telemetry = actual.createObservability({
            ...options,
            sink: (record: LogRecord) => {
              logs.push(record.event);
              records.push(record);
            },
          });
          return telemetry;
        },
      };
    });
    runtime = (await import("./main.js")).createWorkerRuntime(environment);
  });
  afterEach(async () => {
    await runtime.close().catch(() => undefined);
    vi.doUnmock("@cvg/integrations");
    vi.doUnmock("@cvg/persistence");
    vi.doUnmock("@cvg/observability");
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("waits for the original blocked handler and stops subsequent intra-batch claims", async () => {
    const work = gate<void>();
    const entered = gate<void>();
    vi.mocked(repository.claim).mockResolvedValue([event()]);
    recalculate.mockImplementation(async () => {
      entered.resolve();
      await work.promise;
      order.push("handler.settled");
    });
    const batch = runtime.processOnce({ batchSize: 3 });
    await entered.promise;
    const closing = runtime.close();
    try {
      await tick();
      expect(close).not.toHaveBeenCalled();
    } finally {
      work.resolve();
      await Promise.allSettled([batch, closing]);
    }
    expect(repository.claim).toHaveBeenCalledTimes(1);
    expect(await batch).toEqual({ claimed: 1, processed: 1, failed: 0 });
    expect(order).toEqual([
      "handler.settled",
      "event.processed",
      "resources.close",
    ]);
    expect(logs).toEqual([
      "worker.event.processed",
      "worker.batch.completed",
      "resources.close",
      "worker.shutdown.completed",
    ]);
    expect(telemetry.metrics.snapshot().counters).toContainEqual({
      name: "worker.events.processed",
      value: 1,
      labels: {
        event_type: "appeal.recalculation.requested.v1",
        outcome: "success",
      },
    });
  });

  it("refuses every new public operation after close", async () => {
    await runtime.close();
    await expect(runtime.processOnce()).rejects.toThrow("worker is stopping");
    await expect(runtime.reconcile()).rejects.toThrow("worker is stopping");
    await expect(runtime.initialize()).rejects.toThrow("worker is stopping");
    await expect(runtime.run()).rejects.toThrow("worker is stopping");
    expect(repository.claim).not.toHaveBeenCalled();
    expect(initialize).not.toHaveBeenCalled();
  });

  it("shares the exact close promise and performs one resource close", async () => {
    const first = runtime.close();
    const second = runtime.close();
    expect(first).toBe(second);
    await first;
    expect(runtime.close()).toBe(first);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("drains an already started claim and its resulting callback", async () => {
    const claim = gate<readonly OutboxEventRecord[]>();
    vi.mocked(repository.claim).mockReturnValueOnce(claim.promise);
    const batch = runtime.processOnce({ batchSize: 2 });
    await tick();
    const closing = runtime.close();
    try {
      await tick();
      expect(close).not.toHaveBeenCalled();
    } finally {
      claim.resolve([event()]);
      await Promise.allSettled([batch, closing]);
    }
    expect(recalculate).toHaveBeenCalledTimes(1);
    expect(repository.claim).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["event.processed", "resources.close"]);
  });

  it("surfaces a claim failure while close safely drains the failed operation", async () => {
    const claim = gate<readonly OutboxEventRecord[]>();
    vi.mocked(repository.claim).mockReturnValueOnce(claim.promise);
    const batch = runtime.processOnce();
    const observed = expect(batch).rejects.toThrow("synthetic claim failure");
    await tick();
    const closing = runtime.close();
    claim.reject(new Error("synthetic claim failure"));
    await observed;
    await closing;
    expect(close).toHaveBeenCalledTimes(1);
    expect(repository.markProcessed).not.toHaveBeenCalled();
  });

  it("preserves a retryable failed handler instead of acknowledging it at shutdown", async () => {
    const work = gate<void>();
    const entered = gate<void>();
    vi.mocked(repository.claim).mockResolvedValue([event()]);
    recalculate.mockImplementation(async () => {
      entered.resolve();
      await work.promise;
    });
    const batch = runtime.processOnce({ batchSize: 2 });
    await entered.promise;
    const closing = runtime.close();
    work.reject(new Error("synthetic handler failure"));
    expect(await batch).toEqual({ claimed: 1, processed: 0, failed: 1 });
    await closing;
    expect(repository.markProcessed).not.toHaveBeenCalled();
    expect(repository.markFailed).toHaveBeenCalledWith(
      "synthetic-event",
      "synthetic-token",
      1,
      "worker_handler_failed",
      expect.any(Date),
      5,
      5,
    );
    expect(order).toEqual(["event.retry", "resources.close"]);
  });

  it("waits for original reconciliation under its advisory lock", async () => {
    const work =
      gate<
        Awaited<ReturnType<ContentIndexSourcePort["listPublishedIndexable"]>>
      >();
    const entered = gate<void>();
    source = {
      ...source,
      withContentVersionFence: async (_id, _version, callback) =>
        callback(null),
      listPublishedIndexable: vi.fn(async () => {
        entered.resolve();
        return work.promise;
      }),
    };
    const vectorStore = {
      list: vi.fn(async () => []),
      upsert: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
    };
    integrations = {
      ...integrations,
      vectorStore,
      embedding: { embed: vi.fn(async () => []) },
    } as unknown as ServerIntegrationSet;
    runtime = (await import("./main.js")).createWorkerRuntime(environment);
    const reconciliation = runtime.reconcile();
    await entered.promise;
    const closing = runtime.close();
    try {
      await tick();
      expect(close).not.toHaveBeenCalled();
    } finally {
      work.resolve([]);
      await Promise.allSettled([reconciliation, closing]);
    }
    expect(await reconciliation).toEqual({
      expected: 0,
      upserted: 0,
      removed: 0,
    });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("drains initialization rejection without retries or unhandled background failures", async () => {
    const work = gate<void>();
    initialize.mockReturnValueOnce(work.promise);
    await runtime.initialize();
    const explicit = runtime.initialize({ waitForOptionalDependencies: true });
    const observed = expect(explicit).rejects.toThrow(
      "synthetic startup failure",
    );
    const closing = runtime.close();
    await tick();
    expect(close).not.toHaveBeenCalled();
    work.reject(new Error("synthetic startup failure"));
    await observed;
    await closing;
    expect(initialize).toHaveBeenCalledTimes(1);
  });

  it("wakes an idle run and settles it before resource close", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const running = runtime.run();
    await tick();
    expect(repository.claim).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);
    let settled = false;
    const observed = running.then(() => {
      settled = true;
    });
    await runtime.close();
    try {
      await tick();
      expect(settled).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      await vi.advanceTimersByTimeAsync(1000);
      await observed;
    }
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("waits for the active run batch instead of closing under its handler", async () => {
    const entered = gate<void>();
    const work = gate<void>();
    vi.mocked(repository.claim).mockResolvedValue([event()]);
    recalculate.mockImplementation(async () => {
      entered.resolve();
      await work.promise;
    });
    const running = runtime.run();
    await entered.promise;
    const closing = runtime.close();
    try {
      await tick();
      expect(close).not.toHaveBeenCalled();
    } finally {
      work.resolve();
      await Promise.all([running, closing]);
    }
    expect(repository.claim).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["event.processed", "resources.close"]);
  });

  it("keeps pools open until an original in-flight lease renewal settles", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const work = gate<void>();
    const entered = gate<void>();
    const renewal = gate<boolean>();
    vi.mocked(repository.claim).mockResolvedValue([event()]);
    vi.mocked(repository.renewLease!).mockReturnValue(renewal.promise);
    recalculate.mockImplementation(async () => {
      entered.resolve();
      await work.promise;
    });
    const batch = runtime.processOnce({ batchSize: 2, leaseSeconds: 3 });
    await entered.promise;
    const closing = runtime.close();
    try {
      await vi.advanceTimersByTimeAsync(1000);
      expect(repository.renewLease).toHaveBeenCalledTimes(1);
      work.resolve();
      await tick();
      expect(close).not.toHaveBeenCalled();
      expect(repository.markProcessed).not.toHaveBeenCalled();
    } finally {
      work.resolve();
      renewal.resolve(true);
      await Promise.all([batch, closing]);
    }
    expect(vi.getTimerCount()).toBe(0);
    expect(repository.claim).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["event.processed", "resources.close"]);
  });

  it("retains lost lease work for reclaim without fake acknowledgment at shutdown", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const work = gate<void>();
    const entered = gate<void>();
    vi.mocked(repository.claim).mockResolvedValue([event()]);
    vi.mocked(repository.renewLease!).mockResolvedValue(false);
    recalculate.mockImplementation(async () => {
      entered.resolve();
      await work.promise;
    });
    const batch = runtime.processOnce({ batchSize: 2, leaseSeconds: 3 });
    await entered.promise;
    const closing = runtime.close();
    try {
      await vi.advanceTimersByTimeAsync(1000);
      expect(close).not.toHaveBeenCalled();
    } finally {
      work.resolve();
      await Promise.all([batch, closing]);
    }
    expect(await batch).toEqual({ claimed: 1, processed: 0, failed: 1 });
    expect(repository.markProcessed).not.toHaveBeenCalled();
    expect(repository.markFailed).not.toHaveBeenCalled();
    expect(repository.claim).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("T23 diagnoses fatal run failure with fixed fields and preserves its error identity", async () => {
    const failure = new Error("synthetic private claim failure");
    Object.defineProperty(failure, "payload", {
      get: () => {
        throw new Error("payload must never be inspected");
      },
    });
    vi.mocked(repository.claim).mockRejectedValueOnce(failure);
    await expect(runtime.run()).rejects.toBe(failure);
    await runtime.close();
    expect(
      records
        .filter((record) => record.event === "worker.runtime.failed")
        .map((record) => ({ level: record.level, fields: record.fields })),
    ).toEqual([
      {
        level: "error",
        fields: { outcome: "failure", error_code: "WORKER_RUN_FAILED" },
      },
    ]);
    expect(JSON.stringify(records)).not.toContain(
      "synthetic private claim failure",
    );
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("T23 diagnoses fatal close once without replacing its error or exposing its message", async () => {
    const failure = new Error("synthetic private shutdown failure");
    close.mockRejectedValueOnce(failure);
    const first = runtime.close();
    expect(runtime.close()).toBe(first);
    await expect(first).rejects.toBe(failure);
    expect(
      records
        .filter((record) => record.event === "worker.shutdown.failed")
        .map((record) => ({ level: record.level, fields: record.fields })),
    ).toEqual([
      {
        level: "error",
        fields: { outcome: "failure", error_code: "WORKER_CLOSE_FAILED" },
      },
    ]);
    expect(JSON.stringify(records)).not.toContain(
      "synthetic private shutdown failure",
    );
    expect(logs).not.toContain("worker.shutdown.completed");
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("shares a resource-close failure without retrying closure or emitting success", async () => {
    close.mockRejectedValue(new Error("synthetic close failure"));
    const first = runtime.close();
    expect(runtime.close()).toBe(first);
    await expect(first).rejects.toThrow("synthetic close failure");
    expect(runtime.close()).toBe(first);
    expect(close).toHaveBeenCalledTimes(1);
    expect(logs).not.toContain("worker.shutdown.completed");
  });

  it("surfaces synchronous initialization failure safely", async () => {
    initialize.mockImplementation(() => {
      throw new Error("synthetic synchronous startup failure");
    });
    await expect(runtime.initialize()).rejects.toThrow(
      "synthetic synchronous startup failure",
    );
    await runtime.close();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("handles repeated SIGTERM and SIGINT through one drain while original work is active", async () => {
    const work = gate<void>();
    const entered = gate<void>();
    const beforeTerm = process.listeners("SIGTERM");
    const beforeInt = process.listeners("SIGINT");
    vi.mocked(repository.claim).mockResolvedValue([event()]);
    recalculate.mockImplementation(async () => {
      entered.resolve();
      await work.promise;
    });
    for (const [key, value] of Object.entries(environment))
      vi.stubEnv(key, value);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CVG_WORKER_AUTOSTART", "true");
    vi.resetModules();
    await import("./main.js");
    await entered.promise;
    try {
      process.emit("SIGTERM");
      process.emit("SIGTERM");
      process.emit("SIGINT");
      await tick();
      expect(close).not.toHaveBeenCalled();
      expect(process.listeners("SIGTERM")).toHaveLength(beforeTerm.length + 1);
      expect(process.listeners("SIGINT")).toHaveLength(beforeInt.length + 1);
    } finally {
      work.resolve();
      await tick();
      for (const listener of process.listeners("SIGTERM"))
        if (!beforeTerm.includes(listener))
          process.removeListener("SIGTERM", listener);
      for (const listener of process.listeners("SIGINT"))
        if (!beforeInt.includes(listener))
          process.removeListener("SIGINT", listener);
    }
    expect(close).toHaveBeenCalledTimes(1);
    expect(repository.claim).toHaveBeenCalledTimes(1);
    expect(logs).toContain("worker.shutdown.completed");
    expect(process.listeners("SIGTERM")).toEqual(beforeTerm);
    expect(process.listeners("SIGINT")).toEqual(beforeInt);
  });

  it("closes resources after an autostart process error instead of leaving pools alive", async () => {
    const beforeTerm = process.listeners("SIGTERM");
    const beforeInt = process.listeners("SIGINT");
    const previousExitCode = process.exitCode;
    vi.mocked(repository.claim).mockRejectedValue(
      new Error("synthetic claim failure"),
    );
    for (const [key, value] of Object.entries(environment))
      vi.stubEnv(key, value);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CVG_WORKER_AUTOSTART", "true");
    vi.resetModules();
    try {
      await import("./main.js");
      await tick();
      expect(process.exitCode).toBe(1);
      expect(close).toHaveBeenCalledTimes(1);
      expect(repository.claim).toHaveBeenCalledTimes(1);
    } finally {
      process.exitCode = previousExitCode;
      for (const listener of process.listeners("SIGTERM"))
        if (!beforeTerm.includes(listener))
          process.removeListener("SIGTERM", listener);
      for (const listener of process.listeners("SIGINT"))
        if (!beforeInt.includes(listener))
          process.removeListener("SIGINT", listener);
    }
  });
});
