import { describe, expect, it, vi } from "vitest";

import { createObservability } from "@cvg/observability";
import type { OutboxEventRecord } from "@cvg/persistence";

import { processOutboxOnce } from "./loop.js";

/**
 * AAA-FINAL-003 — Coverage margin hardening (worker replay/lease paths).
 *
 * Risco: worker travar ou perder eventos em bordas (validação, lease
 * ausente/corrompido, terminal). Branches: guards, leaseToken null,
 * dead_letter, retryable=false. Comportamento: contadores + marcações.
 */

const syntheticLeaseMarker = "lease-11111111-1111-4111-8111-111111111111";

function baseEvent(): OutboxEventRecord {
  return {
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
}

const base = baseEvent();

function repository(events: readonly OutboxEventRecord[]) {
  return {
    claim: vi.fn(async () => events),
    markProcessed: vi.fn(async () => true),
    markFailed: vi.fn(async () => true),
  };
}

describe("worker branch closure — option validation", () => {
  it("rejects non-positive batch, negative base retry and invalid clock", async () => {
    const repo = repository([base]);
    const handlers = { "content.published.v1": async () => undefined };
    await expect(
      processOutboxOnce(repo, handlers, { batchSize: 0 }),
    ).rejects.toThrow(RangeError);
    await expect(
      processOutboxOnce(repo, handlers, { baseRetrySeconds: -1 }),
    ).rejects.toThrow(RangeError);
    await expect(
      processOutboxOnce(repo, handlers, { now: new Date("invalid") }),
    ).rejects.toThrow(RangeError);
    expect(repo.claim).not.toHaveBeenCalled();
  });
});

describe("worker branch closure — lease edges", () => {
  it("fails a lease-less claim as lease_lost without marking", async () => {
    const repo = repository([{ ...base, leaseToken: null }]);
    const handler = vi.fn(async () => undefined);
    await expect(
      processOutboxOnce(repo, { "content.published.v1": handler }),
    ).resolves.toEqual({ claimed: 1, processed: 0, failed: 1 });
    expect(handler).not.toHaveBeenCalled();
    expect(repo.markProcessed).not.toHaveBeenCalled();
    expect(repo.markFailed).not.toHaveBeenCalled();
  });

  it("survives a handler that nullifies the lease token", async () => {
    const repo = repository([baseEvent()]);
    const corrupting = vi.fn(async (received: OutboxEventRecord) => {
      (received as { leaseToken: string | null }).leaseToken = null;
      throw new Error("handler failed after corrupting the lease");
    });
    await expect(
      processOutboxOnce(repo, { "content.published.v1": corrupting }),
    ).resolves.toEqual({ claimed: 1, processed: 0, failed: 1 });
    expect(repo.markFailed).not.toHaveBeenCalled();
  });
});

describe("worker branch closure — terminal telemetry", () => {
  it("reports dead_letter with retryable false at the attempt limit", async () => {
    const observability = createObservability({ service: "test" });
    const metrics: Array<{ name: string; fields: unknown }> = [];
    const events = [{ ...base, attempts: 5 }];
    const repo = repository(events);
    await processOutboxOnce(
      repo,
      {
        "content.published.v1": async () => {
          throw new Error("permanent handler failure");
        },
      },
      {
        maxAttempts: 5,
        observability: {
          ...observability,
          metrics: {
            ...observability.metrics,
            increment: ((name: string, fields?: unknown) => {
              metrics.push({ name, fields });
            }) as typeof observability.metrics.increment,
          },
        },
      },
    );
    const failed = metrics.find(
      (metric) => metric.name === "worker.events.failed",
    );
    expect(failed?.fields).toMatchObject({
      outcome: "dead_letter",
      event_type: "content.published.v1",
    });
  });
});
