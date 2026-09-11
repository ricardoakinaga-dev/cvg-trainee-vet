import { describe, expect, it, vi } from "vitest";

import { createObservability } from "@cvg/observability";
import type { OutboxEventRecord } from "@cvg/persistence";

import { processOutboxOnce } from "./loop.js";

/**
 * AAA-V6 §29 — Mutation Assurance Closure (worker/outbox semantics).
 *
 * Killer tests comportamentais: validação de opções, defaults, terminal
 * invertido, retryable, rótulos de telemetria, batch outcomes. Riscos:
 * duplicate side effect, lost work, dead-letter indevido.
 */
const base: OutboxEventRecord = {
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
  leaseToken: "lease-11111111-1111-4111-8111-111111111111",
  lastErrorCode: null,
  processedAt: null,
  createdAt: new Date("2026-08-09T17:00:00.000Z"),
};

function repository(events: readonly OutboxEventRecord[]) {
  const failures: string[] = [];
  return {
    failures,
    claim: vi.fn(async () => events),
    markProcessed: vi.fn(async () => true),
    markFailed: vi.fn(async (eventId: string) => {
      failures.push(eventId);
      return true;
    }),
  };
}

function observed() {
  const observability = createObservability({ service: "test" });
  const metrics: Array<{ name: string; fields: unknown }> = [];
  const logs: Array<{ event?: string; info?: string; fields?: unknown }> = [];
  const observedDurations: Array<{ name: string; value: unknown }> = [];
  return {
    observability: {
      ...observability,
      metrics: {
        ...observability.metrics,
        increment: ((name: string, fields?: unknown) => {
          metrics.push({ name, fields });
        }) as typeof observability.metrics.increment,
        observe: ((name: string, value: number) => {
          observedDurations.push({ name, value });
        }) as typeof observability.metrics.observe,
      },
      logger: {
        ...observability.logger,
        warn: ((message: string, context?: { fields?: unknown }) => {
          logs.push({ event: message, fields: context?.fields });
        }) as typeof observability.logger.warn,
        info: ((message: string, context?: { fields?: unknown }) => {
          logs.push({ info: message, fields: context?.fields });
        }) as typeof observability.logger.info,
      },
    },
    metrics,
    logs,
    observedDurations,
  };
}

describe("worker mutation closure — terminal and retryable", () => {
  it("marks terminal failures dead_letter with retryable false", async () => {
    const seen = observed();
    const repo = repository([{ ...base, attempts: 5 }]);
    await processOutboxOnce(
      repo,
      {
        "content.published.v1": async () => {
          throw new Error("permanent");
        },
      },
      { maxAttempts: 5, observability: seen.observability },
    );
    const failed = seen.metrics.find(
      (metric) => metric.name === "worker.events.failed",
    );
    expect(failed?.fields).toMatchObject({
      outcome: "dead_letter",
      event_type: "content.published.v1",
    });
    expect(seen.logs[0]?.fields).toMatchObject({
      outcome: "dead_letter",
      error_code: "worker_handler_failed",
      retryable: false,
    });
  });

  it("marks non-terminal failures retry with retryable true", async () => {
    const seen = observed();
    const repo = repository([{ ...base, attempts: 1 }]);
    await processOutboxOnce(
      repo,
      {
        "content.published.v1": async () => {
          throw new Error("transient");
        },
      },
      { maxAttempts: 5, observability: seen.observability },
    );
    const failed = seen.metrics.find(
      (metric) => metric.name === "worker.events.failed",
    );
    expect(failed?.fields).toMatchObject({ outcome: "retry" });
    expect(seen.logs[0]?.fields).toMatchObject({ retryable: true });
  });

  it("labels unhandled events distinctly from handler failures", async () => {
    const seen = observed();
    const repo = repository([{ ...base, attempts: 1 }]);
    await processOutboxOnce(
      repo,
      {},
      {
        maxAttempts: 5,
        observability: seen.observability,
      },
    );
    const failed = seen.metrics.find(
      (metric) => metric.name === "worker.events.failed",
    );
    expect(failed?.fields).toMatchObject({ outcome: "retry" });
    expect(seen.logs[0]?.fields).toMatchObject({
      error_code: "worker_event_unhandled",
    });
    expect(repo.markFailed).toHaveBeenCalledWith(
      base.id,
      base.leaseToken,
      1,
      "worker_event_unhandled",
      expect.any(Date),
      expect.any(Number),
      5,
    );
  });

  it("reports batch outcomes on telemetry labels", async () => {
    const seen = observed();
    const repo = repository([{ ...base, attempts: 5 }]);
    const result = await processOutboxOnce(
      repo,
      {
        "content.published.v1": async () => {
          throw new Error("permanent");
        },
      },
      { maxAttempts: 5, observability: seen.observability },
    );
    expect(result).toEqual({ claimed: 1, processed: 0, failed: 1 });
    const batch = seen.metrics.find(
      (metric) => metric.name === "worker.batches.completed",
    );
    expect(batch?.fields).toMatchObject({ outcome: "failure" });
    const completed = seen.logs.find(
      (entry) => (entry as { info?: string }).info === "worker.batch.completed",
    );
    expect(
      (completed as { fields?: Record<string, unknown> } | undefined)?.fields,
    ).toMatchObject({ claimed: 1, processed: 0, failed: 1 });
  });

  it("emits processed telemetry with names and outcomes", async () => {
    const seen = observed();
    const repo = repository([base]);
    await expect(
      processOutboxOnce(
        repo,
        { "content.published.v1": async () => undefined },
        { observability: seen.observability },
      ),
    ).resolves.toMatchObject({ claimed: 1, processed: 1, failed: 0 });
    const processed = seen.metrics.find(
      (metric) => metric.name === "worker.events.processed",
    );
    expect(processed?.fields).toMatchObject({
      event_type: "content.published.v1",
      outcome: "success",
    });
    const duration = seen.observedDurations.find(
      (metric) => metric.name === "worker.batch.duration_ms",
    );
    expect(typeof duration?.value).toBe("number");
  });

  it("labels lease_lost failures with names, codes and retryable", async () => {
    const seen = observed();
    const repo = repository([{ ...base, leaseToken: null }]);
    await expect(
      processOutboxOnce(
        repo,
        { "content.published.v1": async () => undefined },
        { observability: seen.observability },
      ),
    ).resolves.toEqual({ claimed: 1, processed: 0, failed: 1 });
    const failed = seen.metrics.find(
      (metric) => metric.name === "worker.events.failed",
    );
    expect(failed?.fields).toMatchObject({
      outcome: "lease_lost",
      event_type: "content.published.v1",
    });
    const warned = seen.logs.find(
      (entry) =>
        (entry as { info?: string }).info === undefined &&
        (entry as { event?: string }).event === "worker.event.failed",
    );
    expect(warned).toBeDefined();
    expect(warned?.fields).toMatchObject({
      outcome: "lease_lost",
      error_code: "worker_lease_lost",
      retryable: true,
    });
  });

  it("labels fencing rejections lease_lost on terminal events", async () => {
    const seen = observed();
    const repo = repository([{ ...base, attempts: 5 }]);
    repo.markFailed = vi.fn(async () => false);
    await processOutboxOnce(
      repo,
      {
        "content.published.v1": async () => {
          throw new Error("fenced");
        },
      },
      { maxAttempts: 5, observability: seen.observability },
    );
    const failed = seen.metrics.find(
      (metric) => metric.name === "worker.events.failed",
    );
    expect(failed?.fields).toMatchObject({ outcome: "lease_lost" });
  });

  it("accepts zero base retry and runs without observability", async () => {
    const repo = repository([base]);
    await expect(
      processOutboxOnce(
        repo,
        { "content.published.v1": async () => undefined },
        { baseRetrySeconds: 0 },
      ),
    ).resolves.toMatchObject({ claimed: 1, processed: 1, failed: 0 });
    const bare = repository([{ ...base, attempts: 2 }]);
    await expect(
      processOutboxOnce(
        bare,
        {
          "content.published.v1": async () => {
            throw new Error("transient without telemetry");
          },
        },
        { maxAttempts: 5 },
      ),
    ).resolves.toMatchObject({ claimed: 1, processed: 0, failed: 1 });
    expect(bare.failures).toEqual([base.id]);
  });

  it("accepts boundary value one for budgets", async () => {
    const repo = repository([base]);
    await expect(
      processOutboxOnce(
        repo,
        { "content.published.v1": async () => undefined },
        { batchSize: 1, leaseSeconds: 1, maxAttempts: 1 },
      ),
    ).resolves.toMatchObject({ claimed: 1, processed: 1, failed: 0 });
  });
});
