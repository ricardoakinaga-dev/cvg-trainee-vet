import type { OutboxEventRecord, OutboxRepositoryPort } from "@cvg/persistence";
import type { Observability } from "@cvg/observability";

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

  const events = await repository.claim(batchSize, now, leaseSeconds);
  options.observability?.metrics.increment(
    "worker.events.claimed",
    {},
    events.length,
  );
  let processed = 0;
  let failed = 0;

  for (const event of events) {
    const handler = handlers[event.eventType];
    try {
      if (handler === undefined) throw new Error("unhandled event");
      await handler(event);
      await repository.markProcessed(event.id, now);
      processed += 1;
      options.observability?.metrics.increment("worker.events.processed", {
        event_type: event.eventType,
        outcome: "success",
      });
      options.observability?.logger.info("worker.event.processed", {
        correlationId: event.correlationId,
        fields: { event_type: event.eventType, outcome: "success" },
      });
    } catch {
      const terminal = event.attempts >= maxAttempts;
      await repository.markFailed(
        event.id,
        event.attempts,
        handler === undefined
          ? "worker_event_unhandled"
          : "worker_handler_failed",
        now,
        terminal
          ? 0
          : retryDelay(event.attempts, baseRetrySeconds, maxRetrySeconds),
        maxAttempts,
      );
      failed += 1;
      options.observability?.metrics.increment("worker.events.failed", {
        event_type: event.eventType,
        outcome: terminal ? "dead_letter" : "retry",
      });
      options.observability?.logger.warn("worker.event.failed", {
        correlationId: event.correlationId,
        fields: {
          event_type: event.eventType,
          error_code:
            handler === undefined
              ? "worker_event_unhandled"
              : "worker_handler_failed",
          outcome: terminal ? "dead_letter" : "retry",
          retryable: !terminal,
        },
      });
    }
  }

  const outcome =
    failed === 0 ? "success" : processed === 0 ? "failure" : "partial";
  options.observability?.metrics.increment("worker.batches.completed", {
    outcome,
  });
  options.observability?.metrics.observe(
    "worker.batch.duration_ms",
    Math.max(0, Date.now() - startedAt),
    { outcome },
  );
  options.observability?.logger.info("worker.batch.completed", {
    fields: {
      claimed: events.length,
      processed,
      failed,
      outcome,
    },
  });

  return Object.freeze({
    claimed: events.length,
    processed,
    failed,
  });
}
