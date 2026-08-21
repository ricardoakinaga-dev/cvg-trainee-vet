import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const health = {
    start: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    address: vi.fn(() => null),
    markReady: vi.fn(),
    markDependenciesHealthy: vi.fn(),
    markDependenciesUnhealthy: vi.fn(),
    markSyntheticProbePassed: vi.fn(),
    markSyntheticProbeFailed: vi.fn(),
    markHeartbeat: vi.fn(),
  };
  const integrations = {
    database: { db: {} },
    vectorStore: null,
    embedding: null,
    ai: null,
    initialize: vi.fn(async () => undefined),
    healthcheck: vi.fn(async () => undefined),
    dependencyStatus: vi.fn(async () => ({
      status: "READY" as const,
      dependencies: {
        postgres: "UP" as const,
        qdrant: "DISABLED" as const,
        ai: "DISABLED" as const,
      },
    })),
    close: vi.fn(async () => undefined),
  };
  const outbox = {
    insertProbe: vi.fn(async () => "synthetic-probe"),
    claimProbe: vi.fn(async () => []),
    removeProbe: vi.fn(async () => undefined),
  };
  const source = {
    findPublishedIndexable: vi.fn(async () => null),
    listPublishedIndexable: vi.fn(async () => []),
  };
  const suggestionSink = {
    saveDraftSuggestion: vi.fn(async () => undefined),
  };
  const observability = {
    metrics: { prometheus: vi.fn(() => "") },
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };

  return {
    health,
    integrations,
    outbox,
    source,
    suggestionSink,
    observability,
    createWorkerHealthServer: vi.fn(() => health),
    createServerIntegrations: vi.fn(() => integrations),
    createObservability: vi.fn(() => observability),
    createOtlpHttpTraceSink: vi.fn(() => ({})),
    createOutboxRepository: vi.fn(() => outbox),
    createContentIndexSourceRepository: vi.fn(() => source),
    createContentExpiryUseCaseDependencies: vi.fn(() => ({})),
    createAiSuggestionSink: vi.fn(() => suggestionSink),
    createIntegrationHandlers: vi.fn(() => ({})),
    processOutboxOnce: vi.fn(async () => ({
      claimed: 0,
      processed: 0,
      failed: 0,
    })),
    runWorkerClaimAckProbe: vi.fn(async () => ({
      claimed: 1,
      processed: 1,
      failed: 0,
      acknowledged: true,
    })),
    reconcileVectorIndex: vi.fn(async () => ({
      expected: 0,
      upserted: 0,
      removed: 0,
    })),
    expireDueContent: vi.fn(async () => ({})),
  };
});

vi.mock("@cvg/integrations", () => ({
  createServerIntegrations: mocks.createServerIntegrations,
}));

vi.mock("@cvg/observability", () => ({
  createObservability: mocks.createObservability,
  createOtlpHttpTraceSink: mocks.createOtlpHttpTraceSink,
}));

vi.mock("@cvg/persistence", () => ({
  createOutboxRepository: mocks.createOutboxRepository,
  createContentIndexSourceRepository: mocks.createContentIndexSourceRepository,
  createContentExpiryUseCaseDependencies:
    mocks.createContentExpiryUseCaseDependencies,
  createAiSuggestionSink: mocks.createAiSuggestionSink,
}));

vi.mock("@cvg/application", () => ({
  expireDueContent: mocks.expireDueContent,
}));

vi.mock("./handlers.js", () => ({
  createIntegrationHandlers: mocks.createIntegrationHandlers,
}));

vi.mock("./health.js", () => ({
  createWorkerHealthServer: mocks.createWorkerHealthServer,
}));

vi.mock("./loop.js", () => ({
  processOutboxOnce: mocks.processOutboxOnce,
  runWorkerClaimAckProbe: mocks.runWorkerClaimAckProbe,
}));

vi.mock("./reconcile.js", () => ({
  reconcileVectorIndex: mocks.reconcileVectorIndex,
}));

import { createWorkerRuntime } from "./main.js";

function environment(
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:5432/synthetic",
    QDRANT_ENABLED: "false",
    AI_ENABLED: "false",
    ...overrides,
  };
}

function resetScenario(): void {
  mocks.createWorkerHealthServer.mockReset();
  mocks.createServerIntegrations.mockReset();
  mocks.createObservability.mockReset();
  mocks.createOtlpHttpTraceSink.mockReset();
  mocks.createOutboxRepository.mockReset();
  mocks.createContentIndexSourceRepository.mockReset();
  mocks.createContentExpiryUseCaseDependencies.mockReset();
  mocks.createAiSuggestionSink.mockReset();
  mocks.createIntegrationHandlers.mockReset();
  mocks.processOutboxOnce.mockReset();
  mocks.runWorkerClaimAckProbe.mockReset();
  mocks.reconcileVectorIndex.mockReset();
  mocks.expireDueContent.mockReset();

  mocks.health.start.mockReset().mockResolvedValue(undefined);
  mocks.health.close.mockReset().mockResolvedValue(undefined);
  mocks.health.address.mockReset().mockReturnValue(null);
  mocks.health.markReady.mockReset();
  mocks.health.markDependenciesHealthy.mockReset();
  mocks.health.markDependenciesUnhealthy.mockReset();
  mocks.health.markSyntheticProbePassed.mockReset();
  mocks.health.markSyntheticProbeFailed.mockReset();
  mocks.health.markHeartbeat.mockReset();

  mocks.integrations.initialize.mockReset().mockResolvedValue(undefined);
  mocks.integrations.healthcheck.mockReset().mockResolvedValue(undefined);
  mocks.integrations.close.mockReset().mockResolvedValue(undefined);
  mocks.outbox.insertProbe.mockReset().mockResolvedValue("synthetic-probe");
  mocks.outbox.claimProbe.mockReset().mockResolvedValue([]);
  mocks.outbox.removeProbe.mockReset().mockResolvedValue(undefined);
  mocks.source.findPublishedIndexable.mockReset().mockResolvedValue(null);
  mocks.source.listPublishedIndexable.mockReset().mockResolvedValue([]);
  mocks.suggestionSink.saveDraftSuggestion
    .mockReset()
    .mockResolvedValue(undefined);

  mocks.createWorkerHealthServer.mockReturnValue(mocks.health);
  mocks.createServerIntegrations.mockReturnValue(mocks.integrations);
  mocks.createObservability.mockReturnValue(mocks.observability);
  mocks.createOtlpHttpTraceSink.mockReturnValue({});
  mocks.createOutboxRepository.mockReturnValue(mocks.outbox);
  mocks.createContentIndexSourceRepository.mockReturnValue(mocks.source);
  mocks.createContentExpiryUseCaseDependencies.mockReturnValue({});
  mocks.createAiSuggestionSink.mockReturnValue(mocks.suggestionSink);
  mocks.createIntegrationHandlers.mockReturnValue({});
  mocks.processOutboxOnce.mockResolvedValue({
    claimed: 0,
    processed: 0,
    failed: 0,
  });
  mocks.runWorkerClaimAckProbe.mockResolvedValue({
    claimed: 1,
    processed: 1,
    failed: 0,
    acknowledged: true,
  });
  mocks.reconcileVectorIndex.mockResolvedValue({
    expected: 0,
    upserted: 0,
    removed: 0,
  });
  mocks.expireDueContent.mockResolvedValue({});
}

beforeEach(resetScenario);

describe("worker runtime", () => {
  it("starts with deterministic assistive integrations disabled", async () => {
    const runtime = createWorkerRuntime(environment());

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

  it("uses safe defaults and forwards valid metrics settings", async () => {
    createWorkerRuntime(
      environment({
        WORKER_METRICS_PORT: " ",
        WORKER_HEARTBEAT_TTL_MS: "",
      }),
    );

    expect(mocks.createWorkerHealthServer).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 9091,
        heartbeatTtlMs: 15_000,
      }),
    );

    const runtime = createWorkerRuntime(
      environment({
        WORKER_METRICS_PORT: "0",
        WORKER_HEARTBEAT_TTL_MS: "300000",
      }),
    );
    expect(mocks.createWorkerHealthServer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        port: 0,
        heartbeatTtlMs: 300_000,
      }),
    );
    await runtime.close();
  });

  it.each([
    ["WORKER_METRICS_PORT", "not-a-port", "WORKER_METRICS_PORT"],
    ["WORKER_METRICS_PORT", "65536", "WORKER_METRICS_PORT"],
    ["WORKER_HEARTBEAT_TTL_MS", "0", "WORKER_HEARTBEAT_TTL_MS"],
    ["WORKER_HEARTBEAT_TTL_MS", "300001", "WORKER_HEARTBEAT_TTL_MS"],
  ])("rejects invalid %s=%s", (name, value, message) => {
    expect(() => createWorkerRuntime(environment({ [name]: value }))).toThrow(
      message,
    );
  });

  it("initializes only after dependencies and the synthetic probe are ready", async () => {
    const runtime = createWorkerRuntime(environment());

    await expect(runtime.initialize()).resolves.toBeUndefined();

    expect(mocks.integrations.initialize).toHaveBeenCalledOnce();
    expect(mocks.integrations.healthcheck).toHaveBeenCalledOnce();
    expect(mocks.runWorkerClaimAckProbe).toHaveBeenCalledWith(
      expect.objectContaining({
        insertProbe: mocks.outbox.insertProbe,
        claimProbe: mocks.outbox.claimProbe,
        removeProbe: mocks.outbox.removeProbe,
      }),
    );
    expect(mocks.health.markDependenciesHealthy).toHaveBeenCalledOnce();
    expect(mocks.health.markSyntheticProbePassed).toHaveBeenCalledOnce();
    expect(mocks.health.markReady).toHaveBeenCalledOnce();
    expect(mocks.health.markHeartbeat).toHaveBeenCalledOnce();

    await runtime.close();
  });

  it("fails readiness closed when a dependency healthcheck rejects", async () => {
    mocks.integrations.healthcheck.mockRejectedValueOnce(
      new Error("synthetic dependency failure"),
    );
    const runtime = createWorkerRuntime(environment());

    await expect(runtime.initialize()).rejects.toThrow(
      "worker readiness checks failed",
    );
    expect(mocks.health.markDependenciesUnhealthy).toHaveBeenCalledOnce();
    expect(mocks.health.markSyntheticProbeFailed).toHaveBeenCalledOnce();
    expect(mocks.runWorkerClaimAckProbe).not.toHaveBeenCalled();
    expect(mocks.health.markReady).not.toHaveBeenCalled();

    await runtime.close();
  });

  it("fails initialization when the readiness probe is not acknowledged", async () => {
    mocks.runWorkerClaimAckProbe.mockResolvedValueOnce({
      claimed: 1,
      processed: 0,
      failed: 1,
      acknowledged: false,
    });
    const runtime = createWorkerRuntime(environment());

    await expect(runtime.initialize()).rejects.toThrow(
      "worker readiness checks failed",
    );
    expect(mocks.health.markSyntheticProbeFailed).toHaveBeenCalledOnce();
    expect(mocks.health.markReady).not.toHaveBeenCalled();

    await runtime.close();
  });

  it("fails readiness when the probe repository is incomplete", async () => {
    mocks.createOutboxRepository.mockReturnValueOnce({
      ...mocks.outbox,
      claimProbe: undefined,
    } as never);
    const runtime = createWorkerRuntime(environment());

    await expect(runtime.initialize()).rejects.toThrow(
      "worker readiness checks failed",
    );
    expect(mocks.health.markDependenciesUnhealthy).toHaveBeenCalledOnce();
    expect(mocks.health.markSyntheticProbeFailed).toHaveBeenCalledOnce();
    expect(mocks.runWorkerClaimAckProbe).not.toHaveBeenCalled();

    await runtime.close();
  });

  it("delegates content expiry with the composed dependencies", async () => {
    const runtime = createWorkerRuntime(environment());
    const command = {} as never;

    await expect(runtime.expireContent(command)).resolves.toEqual({});
    expect(mocks.expireDueContent).toHaveBeenCalledWith(
      command,
      expect.anything(),
    );

    await runtime.close();
  });

  it("closes the health server when initialization fails during run", async () => {
    const initializationError = new Error("synthetic initialization failure");
    mocks.integrations.initialize.mockRejectedValueOnce(initializationError);
    const runtime = createWorkerRuntime(environment());

    await expect(runtime.run()).rejects.toBe(initializationError);
    expect(mocks.health.start).toHaveBeenCalledOnce();
    expect(mocks.health.close).toHaveBeenCalledOnce();
    expect(mocks.integrations.close).toHaveBeenCalledOnce();
    expect(mocks.integrations.healthcheck).not.toHaveBeenCalled();
  });

  it("closes integrations when processing fails during run", async () => {
    const processingError = new Error("synthetic processing failure");
    mocks.processOutboxOnce.mockRejectedValueOnce(processingError);
    const runtime = createWorkerRuntime(environment());

    await expect(runtime.run()).rejects.toBe(processingError);
    expect(mocks.health.close).toHaveBeenCalledOnce();
    expect(mocks.integrations.close).toHaveBeenCalledOnce();
  });

  it("waits through a readiness failure and stops during the idle cycle", async () => {
    vi.useFakeTimers();
    try {
      let healthcheckCalls = 0;
      let resolveSecondHealthcheck: (() => void) | undefined;
      const secondHealthcheck = new Promise<void>((resolve) => {
        resolveSecondHealthcheck = resolve;
      });
      mocks.integrations.healthcheck.mockImplementation(async () => {
        healthcheckCalls += 1;
        if (healthcheckCalls === 2) {
          resolveSecondHealthcheck?.();
          throw new Error("synthetic dependency outage");
        }
      });
      const runtime = createWorkerRuntime(environment());
      const runPromise = runtime.run();

      await secondHealthcheck;
      await Promise.resolve();
      await Promise.resolve();
      expect(mocks.health.markDependenciesUnhealthy).toHaveBeenCalledOnce();
      expect(mocks.processOutboxOnce).not.toHaveBeenCalled();

      await runtime.close();
      await vi.advanceTimersByTimeAsync(1_000);
      await expect(runPromise).resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("rechecks dependencies and claim-to-ack before processing after recovery", async () => {
    vi.useFakeTimers();
    try {
      let healthcheckCalls = 0;
      let resolveFailure: (() => void) | undefined;
      const failureObserved = new Promise<void>((resolve) => {
        resolveFailure = resolve;
      });
      mocks.integrations.healthcheck.mockImplementation(async () => {
        healthcheckCalls += 1;
        if (healthcheckCalls === 2) {
          resolveFailure?.();
          throw new Error("synthetic dependency outage");
        }
      });
      const runtime = createWorkerRuntime(environment());
      mocks.processOutboxOnce.mockImplementation(async () => {
        expect(mocks.runWorkerClaimAckProbe).toHaveBeenCalledTimes(2);
        await runtime.close();
        return { claimed: 0, processed: 0, failed: 0 };
      });

      const runPromise = runtime.run();
      await failureObserved;
      await Promise.resolve();
      await Promise.resolve();
      expect(mocks.processOutboxOnce).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1_000);
      await vi.advanceTimersByTimeAsync(1_000);
      await expect(runPromise).resolves.toBeUndefined();
      expect(healthcheckCalls).toBe(3);
      expect(mocks.runWorkerClaimAckProbe).toHaveBeenCalledTimes(2);
      expect(mocks.processOutboxOnce).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it("processes an idle batch, waits, and exits after close", async () => {
    vi.useFakeTimers();
    try {
      let resolveProcessCall: (() => void) | undefined;
      const processCalled = new Promise<void>((resolve) => {
        resolveProcessCall = resolve;
      });
      mocks.processOutboxOnce.mockImplementation(async () => {
        resolveProcessCall?.();
        return { claimed: 0, processed: 0, failed: 0 };
      });
      const runtime = createWorkerRuntime(environment());
      const runPromise = runtime.run();

      await processCalled;
      expect(mocks.processOutboxOnce).toHaveBeenCalledOnce();

      await runtime.close();
      await vi.advanceTimersByTimeAsync(1_000);
      await expect(runPromise).resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops after a claimed batch without waiting for an idle delay", async () => {
    const runtime = createWorkerRuntime(environment());
    mocks.processOutboxOnce.mockImplementation(async () => {
      await runtime.close();
      return { claimed: 1, processed: 1, failed: 0 };
    });

    await expect(runtime.run()).resolves.toBeUndefined();
    expect(mocks.processOutboxOnce).toHaveBeenCalledOnce();
    expect(mocks.integrations.close).toHaveBeenCalledOnce();
  });

  it("closes the health server and integrations explicitly", async () => {
    const runtime = createWorkerRuntime(environment());

    await expect(runtime.close()).resolves.toBeUndefined();

    expect(mocks.health.close).toHaveBeenCalledOnce();
    expect(mocks.integrations.close).toHaveBeenCalledOnce();
  });
});
