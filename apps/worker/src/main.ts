import { randomUUID } from "node:crypto";

import { loadRuntimeConfig } from "@cvg/config";
import {
  calculateQdrantInitializationRetryDelay,
  classifyQdrantInitializationError,
  createServerIntegrations,
  DEFAULT_QDRANT_INITIALIZATION_RETRY_POLICY,
  type ServerIntegrationSet,
} from "@cvg/integrations";
import { createObservability } from "@cvg/observability";
import {
  createAiSuggestionSink,
  createAppealRecalculationProcessor,
  createContentIndexSourceRepository,
  createOutboxRepository,
} from "@cvg/persistence";

import { createIntegrationHandlers } from "./handlers.js";
import { processOutboxOnce, type WorkerLoopOptions } from "./loop.js";
import {
  QDRANT_RECONCILIATION_LOCK_KEY,
  reconcileVectorIndex,
  type VectorReconciliationResult,
} from "./reconcile.js";

export type WorkerInitializationOptions = Readonly<{
  waitForOptionalDependencies?: boolean;
}>;

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
  const observability = createObservability({ service: "worker" });
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
  let stopped = false;
  let initializationRetryTimer: ReturnType<typeof setTimeout> | undefined;
  let initializationInFlight: Promise<void> | undefined;
  let initializationAttempts = 0;
  const retryPolicy = DEFAULT_QDRANT_INITIALIZATION_RETRY_POLICY;
  const cancelIntegrationInitializationRetry = (): void => {
    if (initializationRetryTimer === undefined) return;
    clearTimeout(initializationRetryTimer);
    initializationRetryTimer = undefined;
  };
  const scheduleIntegrationInitializationRetry = (delay: number): void => {
    if (stopped || initializationRetryTimer !== undefined) return;
    const retryTimer = setTimeout(() => {
      if (initializationRetryTimer !== retryTimer) return;
      initializationRetryTimer = undefined;
      startIntegrationInitialization();
    }, delay);
    initializationRetryTimer = retryTimer;
    retryTimer.unref?.();
  };
  const startIntegrationInitialization = (
    forceNewBudget = false,
  ): Promise<void> => {
    if (stopped) return Promise.resolve();
    const currentAttempt = initializationInFlight;
    if (currentAttempt !== undefined) {
      if (!forceNewBudget) return currentAttempt;
      return currentAttempt.then(
        () => undefined,
        () => {
          if (initializationInFlight === currentAttempt) {
            initializationInFlight = undefined;
            return startIntegrationInitialization(true);
          }
          return initializationInFlight ?? startIntegrationInitialization(true);
        },
      );
    }
    if (forceNewBudget) {
      cancelIntegrationInitializationRetry();
      initializationAttempts = 0;
    }
    const attemptNumber = initializationAttempts + 1;
    initializationAttempts = attemptNumber;
    const attempt = integrations.initialize();
    initializationInFlight = attempt;
    void attempt
      .then(() => {
        initializationAttempts = 0;
        cancelIntegrationInitializationRetry();
        observability.logger.info("integration.initialization.succeeded", {
          fields: { dependency: "qdrant", attempts: attemptNumber },
        });
        observability.metrics.increment(
          "integration.initialization.succeeded",
          {
            dependency: "qdrant",
            outcome: "success",
          },
        );
      })
      .catch((error: unknown) => {
        const failure = classifyQdrantInitializationError(error);
        const exhausted =
          failure.retryable && attemptNumber >= retryPolicy.maxAttempts;
        const delay = exhausted
          ? 0
          : failure.retryable
            ? calculateQdrantInitializationRetryDelay(
                retryPolicy,
                attemptNumber,
                Math.random,
                failure.retryAfterMilliseconds,
              )
            : 0;
        observability.logger.warn("integration.initialization.failed", {
          fields: {
            dependency: "qdrant",
            classification: failure.classification,
            retryable: failure.retryable,
            attempts: attemptNumber,
            max_attempts: retryPolicy.maxAttempts,
            ...(failure.statusCode === undefined
              ? {}
              : { status: failure.statusCode }),
            ...(delay === 0 ? {} : { delay_ms: delay }),
          },
        });
        observability.metrics.increment("integration.initialization.failed", {
          dependency: "qdrant",
          classification: failure.classification,
          outcome: failure.retryable ? "retryable" : "terminal",
        });
        if (exhausted) {
          observability.logger.warn("integration.initialization.exhausted", {
            fields: {
              dependency: "qdrant",
              classification: failure.classification,
              retryable: true,
              attempts: attemptNumber,
              max_attempts: retryPolicy.maxAttempts,
              outcome: "exhausted",
            },
          });
          observability.metrics.increment(
            "integration.initialization.exhausted",
            { dependency: "qdrant", outcome: "exhausted" },
          );
        } else if (failure.retryable && initializationInFlight === attempt) {
          scheduleIntegrationInitializationRetry(delay);
        }
      })
      .finally(() => {
        if (initializationInFlight === attempt) {
          initializationInFlight = undefined;
        }
      });
    return attempt;
  };
  const initialize = async (
    options: WorkerInitializationOptions = {},
  ): Promise<void> => {
    if (options.waitForOptionalDependencies === true) {
      await startIntegrationInitialization(true);
      return;
    }
    void startIntegrationInitialization();
  };
  const processOnce = (options: WorkerLoopOptions = {}) =>
    processOutboxOnce(outbox, handlers, {
      ...options,
      observability: options.observability ?? observability,
    });
  const reconcile = (): Promise<VectorReconciliationResult> =>
    reconcileVectorIndex(workerDependencies);
  const run = async (): Promise<void> => {
    await initialize();
    while (!stopped) {
      const result = await processOnce();
      if (result.claimed === 0) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 1_000);
        });
      }
    }
  };

  return Object.freeze({
    service: "worker" as const,
    config,
    integrations,
    initialize,
    reconcile,
    processOnce,
    run,
    close: async () => {
      stopped = true;
      cancelIntegrationInitializationRetry();
      if (initializationInFlight !== undefined) {
        await initializationInFlight.catch(() => undefined);
      }
      await integrations.close();
    },
  });
}

if (
  process.env.NODE_ENV !== "test" &&
  process.env.CVG_WORKER_AUTOSTART !== "false"
) {
  const runtime = createWorkerRuntime(process.env);
  process.once("SIGTERM", () => {
    void runtime.close();
  });
  process.once("SIGINT", () => {
    void runtime.close();
  });
  void runtime.run().catch(() => {
    process.exitCode = 1;
  });
}
