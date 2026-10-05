import type { ServerIntegrationSet } from "@cvg/integrations";
import type {
  LogRecord,
  Observability,
  ObservabilityOptions,
} from "@cvg/observability";
import type * as ObservabilityModule from "@cvg/observability";
import type { OutboxRepositoryPort } from "@cvg/persistence";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { createWorkerRuntime } from "./main.js";

const environment = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://cvg:cvg@localhost:5432/cvg",
  QDRANT_ENABLED: "false",
  AI_ENABLED: "false",
};
type Fault = "healthy" | "logger" | "metrics" | "all";
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

describe("worker runtime diagnostics are isolated from its lifecycle", () => {
  let fault: Fault;
  let records: LogRecord[];
  let attempts: string[];
  let telemetry: Observability;
  let runtime: ReturnType<typeof createWorkerRuntime>;
  let repository: OutboxRepositoryPort;
  let initialize: ReturnType<typeof vi.fn<() => Promise<void>>>;
  let close: ReturnType<typeof vi.fn<() => Promise<void>>>;

  beforeEach(async () => {
    vi.resetModules();
    fault = "healthy";
    records = [];
    attempts = [];
    initialize = vi.fn(async () => {});
    close = vi.fn(async () => {});
    repository = {
      claim: vi.fn(async () => []),
      renewLease: vi.fn(async () => true),
      withLeaseFence: async (_id, _token, _seconds, work) => ({
        owned: true,
        value: await work(),
      }),
      markProcessed: vi.fn(async () => true),
      markFailed: vi.fn(async () => true),
    };
    // Labelled factory doubles: no native database, Redis or provider is created.
    const integrations = {
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
      createContentIndexSourceRepository: () => ({
        findPublishedIndexable: async () => null,
        listPublishedIndexable: async () => [],
      }),
      createAppealRecalculationProcessor: () => async () => {},
      createAiSuggestionSink: () => ({ saveDraftSuggestion: async () => {} }),
    }));
    vi.doMock("@cvg/observability", async () => {
      const actual =
        await vi.importActual<typeof ObservabilityModule>("@cvg/observability");
      return {
        ...actual,
        createObservability: (options: ObservabilityOptions) => {
          const base = actual.createObservability({
            ...options,
            sink: (record) => {
              attempts.push(record.event);
              if (fault === "logger" || fault === "all")
                throw new Error("sink down");
              records.push(record);
            },
          });
          telemetry = {
            ...base,
            metrics: {
              ...base.metrics,
              increment: (name, labels, amount) => {
                attempts.push(name);
                if (fault === "metrics" || fault === "all")
                  throw new Error("counter down");
                base.metrics.increment(name, labels, amount);
              },
              observe: (name, value, labels) => {
                attempts.push(name);
                if (fault === "metrics" || fault === "all")
                  throw new Error("histogram down");
                base.metrics.observe(name, value, labels);
              },
            },
          };
          return telemetry;
        },
      };
    });
    runtime = (await import("./main.js")).createWorkerRuntime(environment);
  });

  afterEach(async () => {
    await runtime.close().catch(() => undefined);
    expect(close).toHaveBeenCalledTimes(1);
    vi.doUnmock("@cvg/integrations");
    vi.doUnmock("@cvg/persistence");
    vi.doUnmock("@cvg/observability");
    vi.useRealTimers();
  });

  it.each<Fault>(["healthy", "logger", "metrics", "all"])(
    "preserves original run error and exact cleanup with %s observers",
    async (outage) => {
      fault = outage;
      const original = new Error("private claim detail");
      vi.mocked(repository.claim).mockRejectedValueOnce(original);
      await expect(runtime.run()).rejects.toBe(original);
      const first = runtime.close();
      expect(runtime.close()).toBe(first);
      await expect(first).resolves.toBeUndefined();
      expect(close).toHaveBeenCalledTimes(1);
      expect(initialize).toHaveBeenCalledTimes(1);
      expect(repository.markProcessed).not.toHaveBeenCalled();
      expect(repository.markFailed).not.toHaveBeenCalled();
      expect(attempts).toContain("worker.runtime.failed");
      expect(attempts).toContain("worker.shutdown.completed");
      expect(JSON.stringify(records)).not.toContain(original.message);
      if (outage === "healthy" || outage === "metrics")
        expect(records).toContainEqual(
          expect.objectContaining({
            event: "worker.runtime.failed",
            fields: { outcome: "failure", error_code: "WORKER_RUN_FAILED" },
          }),
        );
    },
  );

  it.each<Fault>(["healthy", "logger", "metrics", "all"])(
    "preserves original resource-close error with %s observers",
    async (outage) => {
      fault = outage;
      const original = new Error("private close detail");
      close.mockRejectedValueOnce(original);
      const first = runtime.close();
      expect(runtime.close()).toBe(first);
      await expect(first).rejects.toBe(original);
      expect(runtime.close()).toBe(first);
      expect(close).toHaveBeenCalledTimes(1);
      expect(attempts).toEqual(["worker.shutdown.failed"]);
      expect(JSON.stringify(records)).not.toContain(original.message);
      if (outage === "healthy" || outage === "metrics")
        expect(records[0]?.fields).toEqual({
          outcome: "failure",
          error_code: "WORKER_CLOSE_FAILED",
        });
    },
  );

  it.each<Fault>(["healthy", "logger", "metrics", "all"])(
    "retains successful startup and idle run/close with %s observers",
    async (outage) => {
      fault = outage;
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      const running = runtime.run();
      const observed = expect(running).resolves.toBeUndefined();
      await tick();
      expect(repository.claim).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(1);
      await runtime.close();
      await observed;
      expect(vi.getTimerCount()).toBe(0);
      expect(close).toHaveBeenCalledTimes(1);
      expect(initialize).toHaveBeenCalledTimes(1);
      expect(attempts).toEqual([
        "integration.initialization.succeeded",
        "integration.initialization.succeeded",
        "worker.batches.completed",
        "worker.batch.duration_ms",
        "worker.batch.completed",
        "worker.shutdown.completed",
      ]);
      if (outage === "healthy") {
        expect(records.map((record) => record.event)).toEqual([
          "integration.initialization.succeeded",
          "worker.batch.completed",
          "worker.shutdown.completed",
        ]);
        expect(telemetry.metrics.snapshot().counters).toContainEqual({
          name: "integration.initialization.succeeded",
          value: 1,
          labels: { dependency: "qdrant", outcome: "success" },
        });
      }
    },
  );

  it("settles failed initialization diagnostics and closes resources despite all observer outages", async () => {
    fault = "all";
    const original = new Error("private initialization detail");
    initialize.mockRejectedValueOnce(original);
    await expect(
      runtime.initialize({ waitForOptionalDependencies: true }),
    ).rejects.toBe(original);
    await expect(runtime.close()).resolves.toBeUndefined();
    expect(close).toHaveBeenCalledTimes(1);
    expect(attempts).toContain("integration.initialization.failed");
    expect(attempts).toContain("worker.shutdown.completed");
    expect(JSON.stringify(records)).not.toContain(original.message);
  });

  it("isolates an explicitly supplied processOnce observer port", async () => {
    const supplied: Observability = {
      ...telemetry,
      metrics: {
        ...telemetry.metrics,
        increment: () => {
          throw new Error("counter down");
        },
        observe: () => {
          throw new Error("histogram down");
        },
      },
    };
    await expect(
      runtime.processOnce({ observability: supplied }),
    ).resolves.toEqual({ claimed: 0, processed: 0, failed: 0 });
    await runtime.close();
    expect(close).toHaveBeenCalledTimes(1);
  });
});
