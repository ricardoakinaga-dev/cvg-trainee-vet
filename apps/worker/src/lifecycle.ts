import {
  calculateQdrantInitializationRetryDelay,
  classifyQdrantInitializationError,
  DEFAULT_QDRANT_INITIALIZATION_RETRY_POLICY,
  type ServerIntegrationSet,
} from "@cvg/integrations";
import type { Observability } from "@cvg/observability";
export type WorkerInitializationOptions = Readonly<{
  waitForOptionalDependencies?: boolean;
}>;

export function createWorkerInitialization(
  integrations: ServerIntegrationSet,
  observability: Observability,
  isStopped: () => boolean,
) {
  let initializationRetryTimer: ReturnType<typeof setTimeout> | undefined;
  let initializationInFlight: Promise<void> | undefined;
  let initializationAttempts = 0;
  let observation: Promise<void> | undefined;
  const retryPolicy = DEFAULT_QDRANT_INITIALIZATION_RETRY_POLICY;
  const cancelIntegrationInitializationRetry = (): void => {
    if (initializationRetryTimer === undefined) return;
    clearTimeout(initializationRetryTimer);
    initializationRetryTimer = undefined;
  };
  const scheduleIntegrationInitializationRetry = (delay: number): void => {
    if (isStopped() || initializationRetryTimer !== undefined) return;
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
    const currentAttempt = initializationInFlight;
    if (currentAttempt !== undefined) {
      if (!forceNewBudget) return currentAttempt;
      return currentAttempt.then(
        () => undefined,
        (error: unknown) => {
          if (isStopped()) throw error;
          if (initializationInFlight === currentAttempt) {
            initializationInFlight = undefined;
            return startIntegrationInitialization(true);
          }
          return initializationInFlight ?? startIntegrationInitialization(true);
        },
      );
    }
    if (isStopped()) return Promise.resolve();
    if (forceNewBudget) {
      cancelIntegrationInitializationRetry();
      initializationAttempts = 0;
    }
    const attemptNumber = initializationAttempts + 1;
    initializationAttempts = attemptNumber;
    const attempt = integrations.initialize();
    initializationInFlight = attempt;
    observation = attempt
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
  return Object.freeze({
    initialize,
    cancel: cancelIntegrationInitializationRetry,
    settle: async (): Promise<void> => {
      await observation;
    },
  });
}

export class WorkerStoppingError extends Error {
  public constructor() {
    super("worker is stopping");
    this.name = "WorkerStoppingError";
  }
}

// Closing denies admission synchronously. Drain observes actual callbacks; it
// never races them against a timer or claims cancellation of an external effect.
export function createWorkerLifecycle(
  stopInitialization: () => void,
  closeResources: () => Promise<void>,
) {
  let stopped = false;
  let closing: Promise<void> | undefined;
  const active = new Set<Promise<unknown>>();
  const idleWaiters = new Set<() => void>();
  const admit = <T>(work: () => Promise<T>): Promise<T> => {
    if (stopped) return Promise.reject(new WorkerStoppingError());
    const operation = Promise.resolve().then(work);
    active.add(operation);
    // Observe both outcomes without replacing the caller's original failure or
    // creating an unhandled rejecting cleanup promise.
    void operation.then(
      () => active.delete(operation),
      () => active.delete(operation),
    );
    return operation;
  };
  const waitForPoll = (): Promise<void> => {
    if (stopped) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const wake = (): void => {
        clearTimeout(timer);
        idleWaiters.delete(wake);
        resolve();
      };
      const timer = setTimeout(wake, 1_000);
      idleWaiters.add(wake);
    });
  };
  const close = (): Promise<void> => {
    if (closing !== undefined) return closing;
    stopped = true;
    // Pending promises and unreferenced callbacks do not own process liveness.
    // This reference belongs only to drain, never a work deadline or cancellation.
    const reference = setInterval(() => undefined, 2 ** 31 - 1);
    closing = Promise.resolve().then(async () => {
      try {
        await Promise.allSettled([...active]);
        await closeResources();
      } finally {
        clearInterval(reference);
      }
    });
    stopInitialization();
    for (const wake of idleWaiters) wake();
    return closing;
  };
  return Object.freeze({ isStopped: () => stopped, admit, waitForPoll, close });
}
