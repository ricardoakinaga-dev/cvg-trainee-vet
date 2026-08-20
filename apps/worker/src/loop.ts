import { randomUUID } from "node:crypto";

import type {
  OutboxEventInput,
  OutboxEventRecord,
  OutboxRepositoryPort,
} from "@cvg/persistence";
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

export type WorkerClaimAckProbeResult = WorkerBatchResult &
  Readonly<{
    readonly acknowledged: boolean;
  }>;

export type WorkerProbeRepository = OutboxRepositoryPort & {
  readonly insertProbe: NonNullable<OutboxRepositoryPort["insertProbe"]>;
  readonly claimProbe: NonNullable<OutboxRepositoryPort["claimProbe"]>;
  readonly removeProbe: NonNullable<OutboxRepositoryPort["removeProbe"]>;
};

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

type WorkerRuntimeOptions = Readonly<{
  readonly batchSize: number;
  readonly leaseSeconds: number;
  readonly baseRetrySeconds: number;
  readonly maxRetrySeconds: number;
  readonly maxAttempts: number;
  readonly now: Date;
  readonly startedAt: number;
  readonly observability: Observability | undefined;
}>;

type WorkerEventResult =
  | Readonly<{
      readonly outcome: "processed";
    }>
  | Readonly<{
      readonly outcome: "failed";
      readonly terminal: boolean;
      readonly errorCode: string;
    }>;

function resolveWorkerOptions(
  options: WorkerLoopOptions,
): WorkerRuntimeOptions {
  const batchSize = options.batchSize ?? 25;
  const leaseSeconds = options.leaseSeconds ?? 60;
  const baseRetrySeconds = options.baseRetrySeconds ?? 5;
  const maxRetrySeconds = options.maxRetrySeconds ?? 300;
  const maxAttempts = options.maxAttempts ?? 5;
  const now = options.now ?? new Date();

  positiveInteger(batchSize, "batchSize");
  positiveInteger(leaseSeconds, "leaseSeconds");
  nonNegativeInteger(baseRetrySeconds, "baseRetrySeconds");
  positiveInteger(maxRetrySeconds, "maxRetrySeconds");
  positiveInteger(maxAttempts, "maxAttempts");
  if (Number.isNaN(now.getTime())) throw new RangeError("now must be valid");

  return Object.freeze({
    batchSize,
    leaseSeconds,
    baseRetrySeconds,
    maxRetrySeconds,
    maxAttempts,
    now,
    startedAt: Date.now(),
    observability: options.observability,
  });
}

async function processClaimedEvent(
  repository: OutboxRepositoryPort,
  handlers: WorkerEventHandlers,
  event: OutboxEventRecord,
  options: WorkerRuntimeOptions,
): Promise<WorkerEventResult> {
  const handler = handlers[event.eventType];
  try {
    if (handler === undefined) throw new Error("unhandled event");
    await handler(event);
    await repository.markProcessed(event.id, options.now);
    return { outcome: "processed" };
  } catch {
    const terminal = event.attempts >= options.maxAttempts;
    const errorCode =
      handler === undefined
        ? "worker_event_unhandled"
        : "worker_handler_failed";
    await repository.markFailed(
      event.id,
      event.attempts,
      errorCode,
      options.now,
      terminal
        ? 0
        : retryDelay(
            event.attempts,
            options.baseRetrySeconds,
            options.maxRetrySeconds,
          ),
      options.maxAttempts,
    );
    return { outcome: "failed", terminal, errorCode };
  }
}

function recordEventOutcome(
  observability: Observability | undefined,
  event: OutboxEventRecord,
  result: WorkerEventResult,
): void {
  if (observability === undefined) return;
  if (result.outcome === "processed") {
    observability.metrics.increment("worker.events.processed", {
      event_type: event.eventType,
      outcome: "success",
    });
    observability.logger.info("worker.event.processed", {
      correlationId: event.correlationId,
      fields: { event_type: event.eventType, outcome: "success" },
    });
    return;
  }
  observability.metrics.increment("worker.events.failed", {
    event_type: event.eventType,
    outcome: result.terminal ? "dead_letter" : "retry",
  });
  observability.logger.warn("worker.event.failed", {
    correlationId: event.correlationId,
    fields: {
      event_type: event.eventType,
      error_code: result.errorCode,
      outcome: result.terminal ? "dead_letter" : "retry",
      retryable: !result.terminal,
    },
  });
}

function recordBatchOutcome(
  observability: Observability | undefined,
  events: readonly OutboxEventRecord[],
  results: readonly WorkerEventResult[],
  startedAt: number,
): void {
  const processed = results.filter(
    (result) => result.outcome === "processed",
  ).length;
  const failed = results.filter((result) => result.outcome === "failed").length;
  const outcome =
    failed === 0 ? "success" : processed === 0 ? "failure" : "partial";
  observability?.metrics.increment("worker.batches.completed", { outcome });
  observability?.metrics.observe(
    "worker.batch.duration_ms",
    Math.max(0, Date.now() - startedAt),
    { outcome },
  );
  observability?.logger.info("worker.batch.completed", {
    fields: {
      claimed: events.length,
      processed,
      failed,
      outcome,
    },
  });
}

export async function processOutboxOnce(
  repository: OutboxRepositoryPort,
  handlers: WorkerEventHandlers,
  options: WorkerLoopOptions = {},
): Promise<WorkerBatchResult> {
  const runtime = resolveWorkerOptions(options);
  const events = await repository.claim(
    runtime.batchSize,
    runtime.now,
    runtime.leaseSeconds,
  );
  runtime.observability?.metrics.increment(
    "worker.events.claimed",
    {},
    events.length,
  );
  let results: readonly WorkerEventResult[] = [];
  for (const event of events) {
    const result = await processClaimedEvent(
      repository,
      handlers,
      event,
      runtime,
    );
    results = [...results, result];
    recordEventOutcome(runtime.observability, event, result);
  }
  recordBatchOutcome(runtime.observability, events, results, runtime.startedAt);

  const processed = results.filter(
    (result) => result.outcome === "processed",
  ).length;
  const failed = results.filter((result) => result.outcome === "failed").length;

  return Object.freeze({
    claimed: events.length,
    processed,
    failed,
  });
}

export async function runWorkerClaimAckProbe(
  repository: WorkerProbeRepository,
): Promise<WorkerClaimAckProbeResult> {
  const now = new Date();
  const eventId = randomUUID();
  const probeInput: OutboxEventInput = Object.freeze({
    eventId,
    eventType: "worker.readiness.probe.v1",
    aggregateType: "worker_readiness_probe",
    aggregateId: randomUUID(),
    occurredAt: now.toISOString(),
    schemaVersion: 1,
    correlationId: randomUUID(),
    payload: Object.freeze({ probe: "worker_claim_ack_v1" }),
  });

  await repository.insertProbe(probeInput);
  try {
    const probeRepository: OutboxRepositoryPort = {
      claim: async (_limit, claimAt, leaseSeconds) => {
        const event = await repository.claimProbe(
          eventId,
          claimAt,
          leaseSeconds,
        );
        return event === null ? [] : [event];
      },
      markProcessed: repository.markProcessed,
      markFailed: repository.markFailed,
    };
    const result = await processOutboxOnce(
      probeRepository,
      {
        "worker.readiness.probe.v1": async (event) => {
          if (event.payload.probe !== "worker_claim_ack_v1") {
            throw new Error("readiness probe payload is invalid");
          }
        },
      },
      { batchSize: 1, leaseSeconds: 5, maxAttempts: 1, now },
    );
    return Object.freeze({
      ...result,
      acknowledged: result.processed === 1 && result.failed === 0,
    });
  } finally {
    await repository.removeProbe(eventId);
  }
}
