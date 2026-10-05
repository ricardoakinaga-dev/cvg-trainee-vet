import {
  createObservability,
  type LogRecord,
  type Observability,
} from "@cvg/observability";
import type { OutboxEventRecord, OutboxRepositoryPort } from "@cvg/persistence";
import { describe, expect, it, vi } from "vitest";

import { WorkerLeaseLostError } from "./lease-guard.js";
import { processOutboxOnce } from "./loop.js";

const now = new Date(0);
const event: OutboxEventRecord = {
  id: "event",
  eventType: "effect",
  aggregateType: "content",
  aggregateId: "item",
  occurredAt: now,
  schemaVersion: 1,
  correlationId: "corr",
  payload: {},
  status: "PROCESSING",
  attempts: 1,
  availableAt: now,
  lockedUntil: new Date(60_000),
  leaseToken: String(7),
  lastErrorCode: null,
  processedAt: null,
  createdAt: now,
};

function repository(events: readonly OutboxEventRecord[] = [event]) {
  const remaining = [...events];
  const states: string[] = [];
  const port = {
    claim: vi.fn<OutboxRepositoryPort["claim"]>(async () =>
      remaining.splice(0, 1),
    ),
    renewLease: vi.fn(async () => true),
    withLeaseFence: async <T>(
      _id: string,
      _token: string,
      _seconds: number,
      work: () => Promise<T>,
    ) => ({ owned: true as const, value: await work() }),
    markProcessed: vi.fn<OutboxRepositoryPort["markProcessed"]>(async () => {
      states.push("processed");
      return true;
    }),
    markFailed: vi.fn<OutboxRepositoryPort["markFailed"]>(async () => {
      states.push("failed");
      return true;
    }),
  } satisfies OutboxRepositoryPort;
  return { port, states };
}

type Fault = "healthy" | "logger" | "increment" | "observe" | "all" | "once";
function observers(fault: Fault) {
  const records: LogRecord[] = [];
  const attempts: string[] = [];
  let tripped = false;
  const base = createObservability({
    service: "worker",
    sink: (record) => {
      attempts.push(record.event);
      if (fault === "logger" || fault === "all") throw new Error("sink down");
      records.push(record);
    },
  });
  const port: Observability = {
    ...base,
    metrics: {
      ...base.metrics,
      increment: (name, labels, amount) => {
        attempts.push(name);
        if (
          fault === "increment" ||
          fault === "all" ||
          (fault === "once" && name === "worker.events.processed" && !tripped)
        ) {
          tripped = true;
          throw new Error("counter down");
        }
        base.metrics.increment(name, labels, amount);
      },
      observe: (name, value, labels) => {
        attempts.push(name);
        if (fault === "observe" || fault === "all")
          throw new Error("histogram down");
        base.metrics.observe(name, value, labels);
      },
    },
  };
  return { port, records, attempts };
}

describe("worker event outcomes during observer outages", () => {
  it.each<Fault>(["healthy", "logger", "increment", "observe", "all", "once"])(
    "keeps a committed effect successful with %s observers",
    async (fault) => {
      const { port, states } = repository();
      const observation = observers(fault);
      const effect = vi.fn(async () => {});
      const result = await processOutboxOnce(
        port,
        { effect },
        { observability: observation.port, now },
      );
      expect(result).toEqual({ claimed: 1, processed: 1, failed: 0 });
      expect(Object.isFrozen(result)).toBe(true);
      expect(effect).toHaveBeenCalledExactlyOnceWith(event);
      expect(port.markProcessed).toHaveBeenCalledExactlyOnceWith(
        event.id,
        event.leaseToken,
        now,
      );
      expect(port.markFailed).not.toHaveBeenCalled();
      expect(states).toEqual(["processed"]);
      expect(observation.attempts).toEqual([
        "worker.events.processed",
        "worker.event.processed",
        "worker.batches.completed",
        "worker.batch.duration_ms",
        "worker.batch.completed",
      ]);
      if (fault === "healthy" || fault === "once") {
        expect(observation.records.map((record) => record.event)).toEqual([
          "worker.event.processed",
          "worker.batch.completed",
        ]);
        expect(observation.records[1]?.fields).toEqual({
          claimed: 1,
          processed: 1,
          failed: 0,
          outcome: "success",
        });
        expect(observation.port.metrics.snapshot().counters).toContainEqual({
          name: "worker.batches.completed",
          labels: { outcome: "success" },
          value: 1,
        });
        expect(
          observation.records.some((record) => record.level === "warn"),
        ).toBe(false);
      }
    },
  );

  it.each<Fault>(["healthy", "logger", "increment", "observe", "all"])(
    "returns an empty successful batch with %s observers",
    async (fault) => {
      const { port } = repository([]);
      const observation = observers(fault);
      await expect(
        processOutboxOnce(port, {}, { observability: observation.port }),
      ).resolves.toEqual({ claimed: 0, processed: 0, failed: 0 });
      expect(port.markProcessed).not.toHaveBeenCalled();
      expect(port.markFailed).not.toHaveBeenCalled();
      expect(observation.attempts).toEqual([
        "worker.batches.completed",
        "worker.batch.duration_ms",
        "worker.batch.completed",
      ]);
    },
  );

  it.each([1, 5])(
    "preserves true handler failure at attempt %i through observer outage",
    async (attempts) => {
      const current = { ...event, attempts };
      const { port, states } = repository([current]);
      const observation = observers("all");
      const failure = new Error("private effect detail");
      await expect(
        processOutboxOnce(
          port,
          {
            effect: async () => {
              throw failure;
            },
          },
          { observability: observation.port, now },
        ),
      ).resolves.toEqual({ claimed: 1, processed: 0, failed: 1 });
      expect(port.markProcessed).not.toHaveBeenCalled();
      expect(port.markFailed).toHaveBeenCalledExactlyOnceWith(
        current.id,
        current.leaseToken,
        attempts,
        "worker_handler_failed",
        now,
        attempts === 5 ? 0 : 5,
        5,
      );
      expect(states).toEqual(["failed"]);
      expect(observation.attempts).toEqual([
        "worker.events.failed",
        "worker.event.failed",
        "worker.batches.completed",
        "worker.batch.duration_ms",
        "worker.batch.completed",
      ]);
      expect(JSON.stringify(observation.records)).not.toContain(
        failure.message,
      );
    },
  );

  it.each(["handler", "ack"])(
    "preserves lease loss from %s without marking failure under outage",
    async (boundary) => {
      const { port } = repository();
      if (boundary === "ack") port.markProcessed.mockResolvedValue(false);
      const effect = vi.fn(async () => {
        if (boundary === "handler") throw new WorkerLeaseLostError();
      });
      await expect(
        processOutboxOnce(
          port,
          { effect },
          { observability: observers("all").port },
        ),
      ).resolves.toEqual({ claimed: 1, processed: 0, failed: 1 });
      expect(port.markProcessed).toHaveBeenCalledTimes(
        boundary === "ack" ? 1 : 0,
      );
      expect(port.markFailed).not.toHaveBeenCalled();
    },
  );

  it("keeps both outcomes in a mixed batch and redacts the original handler error", async () => {
    const { port } = repository([
      event,
      { ...event, id: "other", eventType: "bad" },
    ]);
    const observation = observers("once");
    const failure = new Error("private effect detail");
    await expect(
      processOutboxOnce(
        port,
        {
          effect: async () => {},
          bad: async () => {
            throw failure;
          },
        },
        { observability: observation.port },
      ),
    ).resolves.toEqual({ claimed: 2, processed: 1, failed: 1 });
    expect(port.markProcessed).toHaveBeenCalledTimes(1);
    expect(port.markFailed).toHaveBeenCalledTimes(1);
    expect(observation.records[1]?.fields).toMatchObject({
      error_code: "worker_handler_failed",
      outcome: "retry",
      retryable: true,
    });
    expect(observation.records[2]?.fields).toEqual({
      claimed: 2,
      processed: 1,
      failed: 1,
      outcome: "partial",
    });
    expect(JSON.stringify(observation.records)).not.toContain(failure.message);
  });

  it("preserves claim and failure-write error identity", async () => {
    const { port } = repository();
    const failure = new Error("original persistence detail");
    port.claim.mockRejectedValueOnce(failure);
    await expect(
      processOutboxOnce(port, {}, { observability: observers("all").port }),
    ).rejects.toBe(failure);
    port.markFailed.mockRejectedValueOnce(failure);
    await expect(
      processOutboxOnce(
        port,
        {
          effect: async () => {
            throw new Error("handler");
          },
        },
        { observability: observers("all").port },
      ),
    ).rejects.toBe(failure);
  });

  it("allows an absent observation port", async () => {
    const { port } = repository();
    await expect(
      processOutboxOnce(port, { effect: async () => {} }),
    ).resolves.toEqual({ claimed: 1, processed: 1, failed: 0 });
    expect(port.markFailed).not.toHaveBeenCalled();
  });
});
