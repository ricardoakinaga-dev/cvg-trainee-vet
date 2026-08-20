import { describe, expect, it, vi } from "vitest";

import {
  createObservability,
  traceIdForCorrelationId,
  type LogRecord,
  type TraceSpan,
} from "@cvg/observability";
import type {
  OutboxEventInput,
  OutboxEventRecord,
  OutboxRepositoryPort,
} from "@cvg/persistence";

import {
  processOutboxOnce,
  runWorkerClaimAckProbe,
  type WorkerProbeRepository,
  type WorkerEventHandler,
} from "./loop.js";

const event: OutboxEventRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  eventType: "content.published.v1",
  aggregateType: "content_version",
  aggregateId: "22222222-2222-4222-8222-222222222222",
  occurredAt: new Date("2026-08-09T17:00:00.000Z"),
  schemaVersion: 1,
  correlationId: "33333333-3333-4333-8333-333333333333",
  payload: { content_id: "22222222-2222-4222-8222-222222222222" },
  status: "PROCESSING",
  attempts: 1,
  availableAt: new Date("2026-08-09T17:00:00.000Z"),
  lockedUntil: new Date("2026-08-09T17:01:00.000Z"),
  lastErrorCode: null,
  processedAt: null,
  createdAt: new Date("2026-08-09T17:00:00.000Z"),
};

function outbox(events: readonly OutboxEventRecord[]): OutboxRepositoryPort & {
  readonly processed: string[];
  readonly failures: string[];
} {
  const processed: string[] = [];
  const failures: string[] = [];
  return {
    processed,
    failures,
    claim: vi.fn(async () => events),
    markProcessed: vi.fn(async (eventId: string) => {
      processed.push(eventId);
      return true;
    }),
    markFailed: vi.fn(async (eventId: string) => {
      failures.push(eventId);
      return true;
    }),
  };
}

function probeOutbox(
  failOnProcess = false,
  availableAt = () => new Date(0),
): WorkerProbeRepository & {
  readonly inserted: OutboxEventInput[];
  readonly removed: string[];
} {
  let current: OutboxEventRecord | null = null;
  const inserted: OutboxEventInput[] = [];
  const removed: string[] = [];
  return {
    inserted,
    removed,
    insertProbe: vi.fn(async (input) => {
      inserted.push(input);
      const occurredAt = new Date(input.occurredAt);
      current = {
        id: input.eventId,
        eventType: input.eventType,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        occurredAt,
        schemaVersion: input.schemaVersion,
        correlationId: input.correlationId,
        payload: input.payload as Readonly<Record<string, unknown>>,
        status: "PENDING",
        attempts: 0,
        availableAt: availableAt(),
        lockedUntil: null,
        lastErrorCode: null,
        processedAt: null,
        createdAt: occurredAt,
      };
    }),
    claimProbe: vi.fn(async (eventId, now, leaseSeconds) => {
      if (current === null || current.id !== eventId) return null;
      if (current.status !== "PENDING") return null;
      if (current.availableAt > now) return null;
      current = {
        ...current,
        status: "PROCESSING",
        attempts: current.attempts + 1,
        lockedUntil: new Date(now.getTime() + leaseSeconds * 1_000),
      };
      return current;
    }),
    claim: vi.fn(async () => (current === null ? [] : [current])),
    markProcessed: vi.fn(async (eventId, _attempts, now) => {
      if (failOnProcess) throw new Error("synthetic acknowledgement failure");
      const snapshot = current;
      if (snapshot === null || snapshot.id !== eventId) {
        throw new Error("probe event is missing");
      }
      current = {
        ...snapshot,
        status: "PROCESSED",
        processedAt: now,
        lockedUntil: null,
      };
      return true;
    }),
    markFailed: vi.fn(async (eventId, _attempts, errorCode, now) => {
      const snapshot = current;
      if (snapshot === null || snapshot.id !== eventId) {
        throw new Error("probe event is missing");
      }
      current = {
        ...snapshot,
        status: "FAILED",
        lastErrorCode: errorCode,
        processedAt: null,
        lockedUntil: null,
        availableAt: now,
      };
      return true;
    }),
    removeProbe: vi.fn(async (eventId) => {
      removed.push(eventId);
      if (current?.id === eventId) current = null;
    }),
  };
}

describe("outbox worker loop", () => {
  it("proves the synthetic claim-to-ack path through the repository boundary", async () => {
    const repository = probeOutbox();
    await expect(runWorkerClaimAckProbe(repository)).resolves.toEqual({
      claimed: 1,
      processed: 1,
      failed: 0,
      acknowledged: true,
    });
    expect(repository.inserted).toHaveLength(1);
    expect(repository.removed).toEqual([repository.inserted[0]?.eventId]);
  });

  it("fails the synthetic probe when the real repository cannot acknowledge", async () => {
    const repository = probeOutbox(true);
    await expect(runWorkerClaimAckProbe(repository)).resolves.toMatchObject({
      claimed: 1,
      processed: 0,
      failed: 1,
      acknowledged: false,
    });
    expect(repository.removed).toHaveLength(1);
  });

  it("claims a probe after a delayed insert becomes available", async () => {
    vi.useFakeTimers();
    const insertedAt = new Date("2026-08-20T13:20:00.000Z");
    const committedAt = new Date(insertedAt.getTime() + 1_000);
    vi.setSystemTime(insertedAt);
    const repository = probeOutbox(false, () => new Date());
    const insert = repository.insertProbe;
    const originalInsert = vi.mocked(insert).getMockImplementation();
    if (originalInsert === undefined)
      throw new Error("probe insert is missing");
    vi.mocked(insert).mockImplementation(async (input) => {
      vi.setSystemTime(committedAt);
      await originalInsert(input);
    });

    try {
      await expect(runWorkerClaimAckProbe(repository)).resolves.toEqual({
        claimed: 1,
        processed: 1,
        failed: 0,
        acknowledged: true,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("processes a claimed event and marks it only after the handler succeeds", async () => {
    const repository = outbox([event]);
    const handler = vi.fn<WorkerEventHandler>(async () => undefined);

    await expect(
      processOutboxOnce(repository, { "content.published.v1": handler }),
    ).resolves.toEqual({ claimed: 1, processed: 1, failed: 0 });
    expect(handler).toHaveBeenCalledWith(event);
    expect(repository.processed).toEqual([event.id]);
    expect(repository.failures).toEqual([]);
  });

  it("does not count an acknowledgement rejected by the lease fence", async () => {
    const markProcessed = vi.fn(async () => false);
    const markFailed = vi.fn(async () => true);
    const repository = {
      claim: vi.fn(async () => [event]),
      markProcessed,
      markFailed,
    } as unknown as OutboxRepositoryPort;

    await expect(
      processOutboxOnce(repository, {
        "content.published.v1": vi.fn(async () => undefined),
      }),
    ).resolves.toEqual({ claimed: 1, processed: 0, failed: 1 });
    expect(markProcessed).toHaveBeenCalledWith(
      event.id,
      event.attempts,
      expect.any(Date),
    );
    expect(markFailed).not.toHaveBeenCalled();
  });

  it("uses the current clock value when acknowledging a claimed event", async () => {
    const claimedAt = new Date("2026-08-20T11:00:00.000Z");
    const acknowledgedAt = new Date("2026-08-20T11:00:30.000Z");
    const clock = vi
      .fn<() => Date>()
      .mockReturnValueOnce(claimedAt)
      .mockReturnValueOnce(acknowledgedAt);
    const markProcessed = vi.fn(async () => true);
    const repository = {
      claim: vi.fn(async (_limit: number, now: Date) => {
        expect(now).toEqual(claimedAt);
        return [event];
      }),
      markProcessed,
      markFailed: vi.fn(async () => true),
    } as unknown as OutboxRepositoryPort;

    await expect(
      processOutboxOnce(
        repository,
        { "content.published.v1": vi.fn(async () => undefined) },
        { clock },
      ),
    ).resolves.toEqual({ claimed: 1, processed: 1, failed: 0 });
    expect(markProcessed).toHaveBeenCalledWith(
      event.id,
      event.attempts,
      acknowledgedAt,
    );
  });

  it("cleans terminal outbox events after processing a batch", async () => {
    const cleanup = vi.fn(async () => 2);
    const repository = { ...outbox([event]), cleanup };
    const now = new Date("2026-08-09T17:00:00.000Z");

    await processOutboxOnce(
      repository,
      { "content.published.v1": vi.fn(async () => undefined) },
      { now },
    );

    expect(cleanup).toHaveBeenCalledWith(
      new Date(now.getTime() - 86_400_000),
      100,
    );
  });

  it("records a retryable failure with bounded exponential backoff", async () => {
    const repository = outbox([{ ...event, attempts: 2 }]);
    const handler = vi.fn<WorkerEventHandler>(async () => {
      throw new Error("temporary dependency failure");
    });

    await expect(
      processOutboxOnce(
        repository,
        { "content.published.v1": handler },
        {
          baseRetrySeconds: 10,
          maxAttempts: 5,
        },
      ),
    ).resolves.toEqual({ claimed: 1, processed: 0, failed: 1 });
    expect(repository.markFailed).toHaveBeenCalledWith(
      event.id,
      2,
      "worker_handler_failed",
      expect.any(Date),
      20,
      5,
    );
  });

  it("dead-letters an unhandled event after the configured attempt limit", async () => {
    const repository = outbox([{ ...event, attempts: 3 }]);

    await expect(
      processOutboxOnce(repository, {}, { maxAttempts: 3 }),
    ).resolves.toEqual({ claimed: 1, processed: 0, failed: 1 });
    expect(repository.markFailed).toHaveBeenCalledWith(
      event.id,
      3,
      "worker_event_unhandled",
      expect.any(Date),
      0,
      3,
    );
  });

  it("records batch and event outcomes without event payloads", async () => {
    const records: LogRecord[] = [];
    const spans: TraceSpan[] = [];
    const observability = createObservability({
      service: "worker",
      sink: (record) => records.push(record),
      traceSink: (span) => spans.push(span),
    });
    const repository = outbox([event]);

    await processOutboxOnce(
      repository,
      { "content.published.v1": vi.fn(async () => undefined) },
      { observability },
    );

    expect(records.map((record) => record.event)).toEqual([
      "worker.event.processed",
      "worker.batch.completed",
    ]);
    expect(records[0]).toMatchObject({
      traceId: traceIdForCorrelationId(event.correlationId),
      correlationId: event.correlationId,
      fields: { event_type: "content.published.v1", outcome: "success" },
    });
    expect(records[1]).toMatchObject({
      fields: { claimed: 1, processed: 1, failed: 0, outcome: "success" },
    });
    expect(JSON.stringify(records)).not.toContain("content_id");
    expect(spans[0]).toMatchObject({
      name: "worker.event",
      traceId: traceIdForCorrelationId(event.correlationId),
      correlationId: event.correlationId,
      status: "ok",
    });
  });

  it("records retry telemetry for a partially failed batch without the error text", async () => {
    const records: LogRecord[] = [];
    const observability = createObservability({
      service: "worker",
      sink: (record) => records.push(record),
    });
    const retryEvent = {
      ...event,
      id: "44444444-4444-4444-8444-444444444444",
      eventType: "content.withdrawn.v1",
    } satisfies OutboxEventRecord;
    const repository = outbox([event, retryEvent]);

    await processOutboxOnce(
      repository,
      {
        "content.published.v1": vi.fn(async () => undefined),
        "content.withdrawn.v1": vi.fn(async () => {
          throw new Error("internal payload must not be logged");
        }),
      },
      { observability },
    );

    expect(records.map((record) => record.event)).toEqual([
      "worker.event.processed",
      "worker.event.failed",
      "worker.batch.completed",
    ]);
    expect(records[1]).toMatchObject({
      fields: {
        event_type: "content.withdrawn.v1",
        error_code: "worker_handler_failed",
        outcome: "retry",
        retryable: true,
      },
    });
    expect(records[2]).toMatchObject({
      fields: { claimed: 2, processed: 1, failed: 1, outcome: "partial" },
    });
    expect(JSON.stringify(records)).not.toContain("internal payload");
  });
});
