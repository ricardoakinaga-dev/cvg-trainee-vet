import type { OutboxEventRecord, OutboxRepositoryPort } from "@cvg/persistence";
import {
  isolateObservabilityWrites,
  type Observability,
} from "@cvg/observability";
import { withWorkerLease, WorkerLeaseLostError } from "./lease-guard.js";

export type WorkerEventHandler = (event: OutboxEventRecord) => Promise<void>;

export type WorkerEventHandlers = Readonly<
  Record<string, WorkerEventHandler | undefined>
>;

export type WorkerLoopOptions = Readonly<{
  readonly batchSize?: number;
  readonly leaseSeconds?: number;
  readonly baseRetrySeconds?: number;
  readonly maxRetrySeconds?: number;
  readonly maxAttempts?: number;
  readonly now?: Date;
  readonly observability?: Observability;
}>;

export type WorkerBatchResult = Readonly<{
  readonly claimed: number;
  readonly processed: number;
  readonly failed: number;
}>;

class WorkerAttemptsExhaustedError extends Error {}

function positiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${field} must be a positive integer`);
  }
}

function nonNegativeInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative integer`);
  }
}

function retryDelay(
  attempts: number,
  baseRetrySeconds: number,
  maxRetrySeconds: number,
): number {
  const exponential = baseRetrySeconds * 2 ** Math.max(0, attempts - 1);
  return Math.min(maxRetrySeconds, exponential);
}

function recordBatchCompletion(
  result: WorkerBatchResult,
  startedAt: number,
  observability: Observability | undefined,
): void {
  const { claimed, processed, failed } = result;
  const outcome =
    failed === 0 ? "success" : processed === 0 ? "failure" : "partial";
  observability?.metrics.increment("worker.batches.completed", {
    outcome,
  });
  observability?.metrics.observe(
    "worker.batch.duration_ms",
    Math.max(0, Date.now() - startedAt),
    { outcome },
  );
  observability?.logger.info("worker.batch.completed", {
    fields: {
      claimed,
      processed,
      failed,
      outcome,
    },
  });
}

function recordEventFailure(
  event: OutboxEventRecord,
  observability: Observability | undefined,
  errorCode: string,
  outcome: "lease_lost" | "dead_letter" | "retry",
  retryable: boolean,
): void {
  observability?.metrics.increment("worker.events.failed", {
    event_type: event.eventType,
    outcome,
  });
  observability?.logger.warn("worker.event.failed", {
    correlationId: event.correlationId,
    fields: {
      event_type: event.eventType,
      error_code: errorCode,
      outcome,
      retryable,
    },
  });
}

export async function processOutboxOnce(
  repository: OutboxRepositoryPort,
  handlers: WorkerEventHandlers,
  options: WorkerLoopOptions = {},
): Promise<WorkerBatchResult> {
  const batchSize = options.batchSize ?? 25;
  const leaseSeconds = options.leaseSeconds ?? 60;
  const baseRetrySeconds = options.baseRetrySeconds ?? 5;
  const maxRetrySeconds = options.maxRetrySeconds ?? 300;
  const maxAttempts = options.maxAttempts ?? 5;
  const now = options.now ?? new Date();
  const startedAt = Date.now();

  positiveInteger(batchSize, "batchSize");
  positiveInteger(leaseSeconds, "leaseSeconds");
  nonNegativeInteger(baseRetrySeconds, "baseRetrySeconds");
  positiveInteger(maxRetrySeconds, "maxRetrySeconds");
  positiveInteger(maxAttempts, "maxAttempts");
  if (Number.isNaN(now.getTime())) throw new RangeError("now must be valid");

  const observation = options.observability;
  const observability =
    observation === undefined
      ? undefined
      : isolateObservabilityWrites(observation);
  let claimed = 0;
  let processed = 0;
  let failed = 0;

  for (let slot = 0; slot < batchSize; slot += 1) {
    // Capacity is one: queued jobs do not age under a lease while another
    // handler awaits a provider. Each active job renews independently.
    const events = await repository.claim(
      1,
      options.now ?? new Date(),
      leaseSeconds,
      maxAttempts,
    );
    if (events.length > 1) throw new Error("claim exceeded worker capacity");
    const event = events[0];
    if (event === undefined) break;
    claimed += 1;
    const handler = handlers[event.eventType];
    try {
      if (event.leaseToken === null) {
        throw new WorkerLeaseLostError("worker lease token is missing");
      }
      if (event.attempts > maxAttempts)
        throw new WorkerAttemptsExhaustedError();
      if (handler === undefined) throw new Error("unhandled event");
      const leaseToken = event.leaseToken;
      await withWorkerLease(
        repository,
        event.id,
        leaseToken,
        leaseSeconds,
        () => handler(event),
      );
      if (event.leaseToken !== leaseToken) throw new WorkerLeaseLostError();
      const markedProcessed = await repository.markProcessed(
        event.id,
        event.leaseToken,
        options.now ?? new Date(),
      );
      if (!markedProcessed) throw new WorkerLeaseLostError();
    } catch (error) {
      if (error instanceof WorkerLeaseLostError) {
        failed += 1;
        recordEventFailure(
          event,
          observability,
          "worker_lease_lost",
          "lease_lost",
          true,
        );
        continue;
      }
      const terminal = event.attempts >= maxAttempts;
      const leaseToken = event.leaseToken;
      if (leaseToken === null) {
        failed += 1;
        continue;
      }
      const markedFailed = await repository.markFailed(
        event.id,
        leaseToken,
        event.attempts,
        error instanceof WorkerAttemptsExhaustedError
          ? "worker_attempts_exhausted"
          : handler === undefined
            ? "worker_event_unhandled"
            : "worker_handler_failed",
        options.now ?? new Date(),
        terminal
          ? 0
          : retryDelay(event.attempts, baseRetrySeconds, maxRetrySeconds),
        maxAttempts,
      );
      failed += 1;
      recordEventFailure(
        event,
        observability,
        error instanceof WorkerAttemptsExhaustedError
          ? "worker_attempts_exhausted"
          : handler === undefined
            ? "worker_event_unhandled"
            : "worker_handler_failed",
        markedFailed ? (terminal ? "dead_letter" : "retry") : "lease_lost",
        !terminal || !markedFailed,
      );
      continue;
    }
    processed += 1;
    observability?.metrics.increment("worker.events.processed", {
      event_type: event.eventType,
      outcome: "success",
    });
    observability?.logger.info("worker.event.processed", {
      correlationId: event.correlationId,
      fields: { event_type: event.eventType, outcome: "success" },
    });
  }

  recordBatchCompletion(
    { claimed, processed, failed },
    startedAt,
    observability,
  );

  return Object.freeze({
    claimed,
    processed,
    failed,
  });
}
