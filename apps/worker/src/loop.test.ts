import { describe, expect, it, vi } from "vitest";

import { createObservability, type LogRecord } from "@cvg/observability";
import type { OutboxEventRecord, OutboxRepositoryPort } from "@cvg/persistence";

import { processOutboxOnce, type WorkerEventHandler } from "./loop.js";

const syntheticLeaseMarker = "lease-11111111-1111-4111-8111-111111111111";

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
  leaseToken: syntheticLeaseMarker,
  lastErrorCode: null,
  processedAt: null,
  createdAt: new Date("2026-08-09T17:00:00.000Z"),
};

function outbox(
  events: readonly OutboxEventRecord[],
  markProcessedOverride?: OutboxRepositoryPort["markProcessed"],
  markFailedOverride?: OutboxRepositoryPort["markFailed"],
): OutboxRepositoryPort & {
  readonly processed: string[];
  readonly failures: string[];
} {
  const processed: string[] = [];
  const failures: string[] = [];
  return {
    processed,
    failures,
    claim: vi.fn(async () => events),
    markProcessed:
      markProcessedOverride ??
      vi.fn(async (eventId: string) => {
        processed.push(eventId);
        return true;
      }),
    markFailed:
      markFailedOverride ??
      vi.fn(async (eventId: string) => {
        failures.push(eventId);
        return true;
      }),
  };
}

describe("outbox worker loop", () => {
  it("processes a claimed event and marks it only after the handler succeeds", async () => {
    const repository = outbox([event]);
    const handler = vi.fn<WorkerEventHandler>(async () => undefined);

    await expect(
      processOutboxOnce(repository, { "content.published.v1": handler }),
    ).resolves.toEqual({ claimed: 1, processed: 1, failed: 0 });
    expect(handler).toHaveBeenCalledWith(event);
    expect(repository.markProcessed).toHaveBeenCalledWith(
      event.id,
      event.leaseToken,
      expect.any(Date),
    );
    expect(repository.processed).toEqual([event.id]);
    expect(repository.failures).toEqual([]);
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
      event.leaseToken,
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
      event.leaseToken,
      3,
      "worker_event_unhandled",
      expect.any(Date),
      0,
      3,
    );
  });

  it("records batch and event outcomes without event payloads", async () => {
    const records: LogRecord[] = [];
    const observability = createObservability({
      service: "worker",
      sink: (record) => records.push(record),
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
      fields: { event_type: "content.published.v1", outcome: "success" },
    });
    expect(records[1]).toMatchObject({
      fields: { claimed: 1, processed: 1, failed: 0, outcome: "success" },
    });
    expect(JSON.stringify(records)).not.toContain("content_id");
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

  it("does not count a stale worker as successful after its lease is fenced", async () => {
    const markProcessed = vi.fn<OutboxRepositoryPort["markProcessed"]>(
      async () => false,
    );
    const repository = outbox([event], markProcessed);
    const handler = vi.fn<WorkerEventHandler>(async () => undefined);

    await expect(
      processOutboxOnce(repository, { "content.published.v1": handler }),
    ).resolves.toEqual({ claimed: 1, processed: 0, failed: 1 });
    expect(handler).toHaveBeenCalledWith(event);
    expect(repository.markProcessed).toHaveBeenCalledWith(
      event.id,
      event.leaseToken,
      expect.any(Date),
    );
    expect(repository.markFailed).not.toHaveBeenCalled();
  });

  it("does not report retry or dead-letter when failure fencing rejects the update", async () => {
    const records: LogRecord[] = [];
    const observability = createObservability({
      service: "worker",
      sink: (record) => records.push(record),
    });
    const markFailed = vi.fn<OutboxRepositoryPort["markFailed"]>(
      async () => false,
    );
    const repository = outbox([event], undefined, markFailed);
    const handler = vi.fn<WorkerEventHandler>(async () => {
      throw new Error("stale handler failure");
    });

    await expect(
      processOutboxOnce(
        repository,
        { "content.published.v1": handler },
        { observability },
      ),
    ).resolves.toEqual({ claimed: 1, processed: 0, failed: 1 });
    expect(records).toContainEqual(
      expect.objectContaining({
        event: "worker.event.failed",
        fields: expect.objectContaining({
          error_code: "worker_handler_failed",
          outcome: "lease_lost",
        }),
      }),
    );
  });

  it("redelivers an event that crashed before its ACK without double-acking", async () => {
    const pending = new Map([[event.id, { ...event }]]);
    const processed: string[] = [];
    let deliveries = 0;
    const repository: OutboxRepositoryPort = {
      claim: vi.fn(async () =>
        [...pending.values()].map((entry) => ({ ...entry })),
      ),
      markProcessed: vi.fn(async (eventId: string) => {
        if (!pending.has(eventId)) return false;
        pending.delete(eventId);
        processed.push(eventId);
        return true;
      }),
      markFailed: vi.fn(async () => true),
    };
    const handler = vi.fn<WorkerEventHandler>(async () => {
      deliveries += 1;
      if (deliveries === 1) throw new Error("crash before ack");
    });

    await expect(
      processOutboxOnce(repository, { "content.published.v1": handler }),
    ).resolves.toEqual({ claimed: 1, processed: 0, failed: 1 });
    await expect(
      processOutboxOnce(repository, { "content.published.v1": handler }),
    ).resolves.toEqual({ claimed: 1, processed: 1, failed: 0 });
    expect(deliveries).toBe(2);
    expect(processed).toEqual([event.id]);
  });

  it("prevents a competing worker from double-claiming a leased event", async () => {
    const leased = new Set<string>();
    const done = new Set<string>();
    const repository: OutboxRepositoryPort = {
      claim: vi.fn(async () => {
        if (done.has(event.id) || leased.has(event.id)) return [];
        leased.add(event.id);
        return [{ ...event }];
      }),
      markProcessed: vi.fn(async (eventId: string) => {
        leased.delete(eventId);
        done.add(eventId);
        return true;
      }),
      markFailed: vi.fn(async (eventId: string) => {
        leased.delete(eventId);
        return true;
      }),
    };
    const handlers = {
      "content.published.v1": (async () => undefined) as WorkerEventHandler,
    };
    await expect(processOutboxOnce(repository, handlers)).resolves.toEqual({
      claimed: 1,
      processed: 1,
      failed: 0,
    });
    await expect(processOutboxOnce(repository, handlers)).resolves.toEqual({
      claimed: 0,
      processed: 0,
      failed: 0,
    });
    expect(repository.claim).toHaveBeenCalledTimes(2);
  });
});
