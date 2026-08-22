import { randomUUID } from "node:crypto";

import {
  expireDueContent,
  type ExpireContentCommand,
  type ExpireContentResult,
} from "@cvg/application";
import { loadRuntimeConfig } from "@cvg/config";
import {
  createServerIntegrations,
  type ServerIntegrationSet,
} from "@cvg/integrations";
import {
  createObservability,
  createOtlpHttpTraceSink,
} from "@cvg/observability";
import {
  createAiSuggestionSink,
  createContentExpiryUseCaseDependencies,
  createContentIndexSourceRepository,
  createOutboxRepository,
} from "@cvg/persistence";

import { createIntegrationHandlers } from "./handlers.js";
import { createWorkerHealthServer, type WorkerHealthServer } from "./health.js";
import {
  processOutboxOnce,
  runWorkerClaimAckProbe,
  type WorkerLoopOptions,
} from "./loop.js";
import {
  reconcileVectorIndex,
  type VectorReconciliationResult,
} from "./reconcile.js";

function workerMetricsPort(value: string | undefined): number {
  if (value === undefined || value.trim().length === 0) return 9091;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error(
      "WORKER_METRICS_PORT must be an integer between 0 and 65535",
    );
  }
  return port;
}

function workerHeartbeatTtlMs(value: string | undefined): number {
  if (value === undefined || value.trim().length === 0) return 15_000;
  const ttl = Number(value);
  if (!Number.isInteger(ttl) || ttl < 1 || ttl > 300_000) {
    throw new Error(
      "WORKER_HEARTBEAT_TTL_MS must be an integer between 1 and 300000",
    );
  }
  return ttl;
}

async function refreshWorkerReadiness(
  integrations: ServerIntegrationSet,
  health: WorkerHealthServer,
  outbox: ReturnType<typeof createOutboxRepository>,
): Promise<boolean> {
  try {
    await integrations.healthcheck();
    health.markDependenciesHealthy();
    if (
      outbox.insertProbe === undefined ||
      outbox.claimProbe === undefined ||
      outbox.removeProbe === undefined
    ) {
      throw new Error("worker readiness probe is not configured");
    }
    const probe = await runWorkerClaimAckProbe({
      ...outbox,
      insertProbe: outbox.insertProbe,
      claimProbe: outbox.claimProbe,
      removeProbe: outbox.removeProbe,
    });
    if (!probe.acknowledged) {
      health.markSyntheticProbeFailed();
      return false;
    }
    health.markSyntheticProbePassed();
    return true;
  } catch {
    health.markDependenciesUnhealthy();
    health.markSyntheticProbeFailed();
    return false;
  }
}

async function initializeWorker(
  integrations: ServerIntegrationSet,
  health: WorkerHealthServer,
  refreshReadiness: () => Promise<boolean>,
): Promise<void> {
  await integrations.initialize();
  if (!(await refreshReadiness())) {
    throw new Error("worker readiness checks failed");
  }
  health.markReady();
  health.markHeartbeat();
}

function waitForWorkerCycle(): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 1_000);
  });
}

async function runWorkerLoop(
  health: WorkerHealthServer,
  initialize: () => Promise<void>,
  refreshReadiness: () => Promise<boolean>,
  processOnce: () => ReturnType<typeof processOutboxOnce>,
  closeResources: () => Promise<void>,
  isStopped: () => boolean,
): Promise<void> {
  try {
    await health.start();
    await initialize();
    while (!isStopped()) {
      health.markHeartbeat();
      if (!(await refreshReadiness())) {
        if (isStopped()) break;
        await waitForWorkerCycle();
        continue;
      }
      if (isStopped()) break;
      const result = await processOnce();
      health.markHeartbeat();
      if (result.claimed === 0) await waitForWorkerCycle();
    }
  } catch (error) {
    await Promise.allSettled([closeResources()]);
    throw error;
  }
  await closeResources();
}

async function closeWorkerResources(
  health: WorkerHealthServer,
  integrations: ServerIntegrationSet,
): Promise<void> {
  const results = await Promise.allSettled([
    health.close(),
    integrations.close(),
  ]);
  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  if (failures.length === 1) throw failures[0]?.reason;
  if (failures.length > 1) {
    throw new AggregateError(
      failures.map(({ reason }) => reason),
      "worker resources failed to close",
    );
  }
}

function createWorkerComposition(
  environment: Record<string, string | undefined>,
  config: ReturnType<typeof loadRuntimeConfig>,
  integrations: ServerIntegrationSet,
) {
  const observability = createObservability({
    service: "worker",
    ...(config.observability.configured
      ? {
          traceSink: createOtlpHttpTraceSink(config.observability.otlpEndpoint),
        }
      : {}),
  });
  const health = createWorkerHealthServer({
    host: environment.WORKER_METRICS_HOST ?? "0.0.0.0",
    port: workerMetricsPort(environment.WORKER_METRICS_PORT),
    ...(config.metricsScrapeToken === undefined
      ? {}
      : { metricsScrapeToken: config.metricsScrapeToken }),
    heartbeatTtlMs: workerHeartbeatTtlMs(environment.WORKER_HEARTBEAT_TTL_MS),
    observability,
  });
  const outbox = createOutboxRepository(integrations.database.db);
  const source = createContentIndexSourceRepository(integrations.database.db);
  const contentExpiryDependencies = createContentExpiryUseCaseDependencies(
    integrations.database.db,
    randomUUID,
  );
  const workerDependencies = {
    source,
    embedding: integrations.embedding,
    vectorStore: integrations.vectorStore,
  } as const;
  const handlers = createIntegrationHandlers({
    ...workerDependencies,
    embedding: integrations.embedding,
    vectorStore: integrations.vectorStore,
    ai: integrations.ai,
    suggestionSink: createAiSuggestionSink(
      integrations.database.db,
      randomUUID,
    ),
  });
  return Object.freeze({
    observability,
    health,
    outbox,
    source,
    contentExpiryDependencies,
    workerDependencies,
    handlers,
  });
}

export function createWorkerRuntime(
  environment: Record<string, string | undefined>,
): Readonly<{
  service: "worker";
  config: ReturnType<typeof loadRuntimeConfig>;
  integrations: ServerIntegrationSet;
  initialize: () => Promise<void>;
  reconcile: () => Promise<VectorReconciliationResult>;
  processOnce: (
    options?: WorkerLoopOptions,
  ) => ReturnType<typeof processOutboxOnce>;
  expireContent: (
    command: ExpireContentCommand,
  ) => Promise<ExpireContentResult>;
  requestDrain: () => void;
  run: () => Promise<void>;
  close: () => Promise<void>;
}> {
  const config = loadRuntimeConfig(environment);
  const integrations = createServerIntegrations(config);
  const composition = createWorkerComposition(
    environment,
    config,
    integrations,
  );
  const {
    observability,
    health,
    outbox,
    contentExpiryDependencies,
    workerDependencies,
    handlers,
  } = composition;
  let stopped = false;
  let runPromise: Promise<void> | null = null;
  let resourceClosePromise: Promise<void> | null = null;
  const refreshReadiness = (): Promise<boolean> =>
    refreshWorkerReadiness(integrations, health, outbox);
  const initialize = (): Promise<void> =>
    initializeWorker(integrations, health, refreshReadiness);
  const processOnce = (options: WorkerLoopOptions = {}) =>
    processOutboxOnce(outbox, handlers, {
      ...options,
      observability: options.observability ?? observability,
    });
  const expireContent = (
    command: ExpireContentCommand,
  ): Promise<ExpireContentResult> =>
    expireDueContent(command, contentExpiryDependencies);
  const reconcile = (): Promise<VectorReconciliationResult> =>
    reconcileVectorIndex(workerDependencies);
  const requestDrain = (): void => {
    if (stopped) return;
    stopped = true;
    health.markDraining();
  };
  const closeResources = (): Promise<void> => {
    resourceClosePromise ??= closeWorkerResources(health, integrations);
    return resourceClosePromise;
  };
  const run = (): Promise<void> => {
    runPromise ??= runWorkerLoop(
      health,
      initialize,
      refreshReadiness,
      processOnce,
      closeResources,
      () => Boolean(stopped),
    );
    return runPromise;
  };

  return Object.freeze({
    service: "worker" as const,
    config,
    integrations,
    initialize,
    reconcile,
    processOnce,
    expireContent,
    requestDrain,
    run,
    close: async () => {
      requestDrain();
      if (runPromise !== null) {
        await runPromise;
        return;
      }
      await closeResources();
    },
  });
}

if (
  process.env.NODE_ENV !== "test" &&
  process.env.CVG_WORKER_AUTOSTART !== "false"
) {
  const runtime = createWorkerRuntime(process.env);
  process.once("SIGTERM", () => {
    void runtime.close().catch(() => {
      process.exitCode = 1;
    });
  });
  process.once("SIGINT", () => {
    void runtime.close().catch(() => {
      process.exitCode = 1;
    });
  });
  void runtime.run().catch(() => {
    process.exitCode = 1;
  });
}
