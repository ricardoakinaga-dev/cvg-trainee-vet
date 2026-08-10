import { describe, expect, it, vi } from "vitest";

import { createObservability, type LogRecord } from "@cvg/observability";
import type { OutboxEventRecord, OutboxRepositoryPort } from "@cvg/persistence";

import { processOutboxOnce, type WorkerEventHandler } from "./loop.js";

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
    }),
    markFailed: vi.fn(async (eventId: string) => {
      failures.push(eventId);
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
});
