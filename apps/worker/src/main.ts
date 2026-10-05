import { randomUUID } from "node:crypto";

import { loadRuntimeConfig } from "@cvg/config";
import {
  createServerIntegrations,
  type ServerIntegrationSet,
} from "@cvg/integrations";
import {
  createObservability,
  isolateObservabilityWrites,
} from "@cvg/observability";
import {
  createAiSuggestionSink,
  createAppealRecalculationProcessor,
  createContentIndexSourceRepository,
  createOutboxRepository,
} from "@cvg/persistence";

import { createIntegrationHandlers } from "./handlers.js";
import {
  createWorkerInitialization,
  createWorkerLifecycle,
  type WorkerInitializationOptions,
} from "./lifecycle.js";
import { processOutboxOnce, type WorkerLoopOptions } from "./loop.js";
import {
  QDRANT_RECONCILIATION_LOCK_KEY,
  reconcileVectorIndex,
  type VectorReconciliationResult,
} from "./reconcile.js";

export type { WorkerInitializationOptions } from "./lifecycle.js";

export function createWorkerRuntime(
  environment: Record<string, string | undefined>,
): Readonly<{
  service: "worker";
  config: ReturnType<typeof loadRuntimeConfig>;
  integrations: ServerIntegrationSet;
  initialize: (options?: WorkerInitializationOptions) => Promise<void>;
  reconcile: () => Promise<VectorReconciliationResult>;
  processOnce: (
    options?: WorkerLoopOptions,
  ) => ReturnType<typeof processOutboxOnce>;
  run: () => Promise<void>;
  close: () => Promise<void>;
}> {
  const config = loadRuntimeConfig(environment);
  const integrations = createServerIntegrations(config);
  const observability = isolateObservabilityWrites(
    createObservability({ service: "worker" }),
  );
  const outbox = createOutboxRepository(integrations.database.db);
  const recalculateAppeal = createAppealRecalculationProcessor(
    integrations.database.db,
  );
  const source = createContentIndexSourceRepository(integrations.database.db);
  const workerDependencies = {
    source,
    embedding: integrations.embedding,
    vectorStore: integrations.vectorStore,
    withExclusiveLock: (work: () => Promise<VectorReconciliationResult>) =>
      integrations.database.withAdvisoryLock(
        QDRANT_RECONCILIATION_LOCK_KEY,
        work,
      ),
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
    recalculateAppeal,
  });
  const lifecycle = createWorkerLifecycle(
    () => initialization.cancel(),
    async () => {
      try {
        try {
          await initialization.settle();
        } finally {
          await integrations.close();
        }
      } catch (error) {
        observability.logger.error("worker.shutdown.failed", {
          fields: { outcome: "failure", error_code: "WORKER_CLOSE_FAILED" },
        });
        throw error;
      }
      observability.logger.info("worker.shutdown.completed", {
        fields: { outcome: "success" },
      });
    },
  );
  const initialization = createWorkerInitialization(
    integrations,
    observability,
    lifecycle.isStopped,
  );
  // Preserve lease/fence/finalization operations while denying only new claims.
  // A claim already submitted before shutdown still owns its resulting work.
  const drainingOutbox = {
    ...outbox,
    claim: (...args: Parameters<typeof outbox.claim>) =>
      lifecycle.isStopped() ? Promise.resolve([]) : outbox.claim(...args),
  };
  const initialize = (options: WorkerInitializationOptions = {}) =>
    lifecycle.admit(() => initialization.initialize(options));
  const processOnce = (options: WorkerLoopOptions = {}) =>
    lifecycle.admit(() =>
      processOutboxOnce(drainingOutbox, handlers, {
        ...options,
        observability: options.observability ?? observability,
      }),
    );
  const reconcile = (): Promise<VectorReconciliationResult> =>
    lifecycle.admit(() => reconcileVectorIndex(workerDependencies));
  const run = (): Promise<void> =>
    lifecycle.admit(async () => {
      if (lifecycle.isStopped()) return;
      try {
        await initialize();
        while (!lifecycle.isStopped()) {
          const result = await processOnce();
          if (result.claimed === 0) await lifecycle.waitForPoll();
        }
      } catch (error) {
        observability.logger.error("worker.runtime.failed", {
          fields: { outcome: "failure", error_code: "WORKER_RUN_FAILED" },
        });
        throw error;
      }
    });

  return Object.freeze({
    service: "worker" as const,
    config,
    integrations,
    initialize,
    reconcile,
    processOnce,
    run,
    close: lifecycle.close,
  });
}

if (
  process.env.NODE_ENV !== "test" &&
  process.env.CVG_WORKER_AUTOSTART !== "false"
) {
  const runtime = createWorkerRuntime(process.env);
  const close = (): void => {
    void runtime.close().catch(() => {
      process.exitCode = 1;
    });
  };
  process.on("SIGTERM", close);
  process.on("SIGINT", close);
  void runtime.run().catch(() => {
    process.exitCode = 1;
    close();
  });
}
