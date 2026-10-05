import { afterEach, describe, expect, it, vi } from "vitest";
import type { OutboxEventRecord } from "@cvg/persistence";
import { processOutboxOnce } from "./loop.js";

function queue(size = 25, attempts = 0) {
  const rows: OutboxEventRecord[] = Array.from(
    { length: size },
    (_, i) =>
      ({
        id: String(i),
        eventType: "test.v1",
        aggregateType: "test",
        aggregateId: String(i),
        occurredAt: new Date(),
        schemaVersion: 1,
        correlationId: "synthetic",
        payload: {},
        status: "PENDING",
        attempts,
        availableAt: new Date(),
        lockedUntil: null,
        leaseToken: null,
        lastErrorCode: null,
        processedAt: null,
        createdAt: new Date(),
      }) satisfies OutboxEventRecord,
  );
  const claim = vi.fn(
    async (limit: number, _now: Date, leaseSeconds: number) => {
      const eligible = rows.filter(
        (row) =>
          row.status === "PENDING" ||
          (row.status === "PROCESSING" &&
            row.lockedUntil !== null &&
            row.lockedUntil.getTime() <= Date.now()),
      );
      return eligible.slice(0, limit).map((row) => {
        Object.assign(row, {
          status: "PROCESSING",
          attempts: row.attempts + 1,
          leaseToken: `${row.id}:${row.attempts + 1}`,
          lockedUntil: new Date(Date.now() + leaseSeconds * 1000),
        });
        return { ...row };
      });
    },
  );
  const owned = (id: string, token: string) =>
    rows.find(
      (row) =>
        row.id === id &&
        row.status === "PROCESSING" &&
        row.leaseToken === token &&
        row.lockedUntil !== null &&
        row.lockedUntil.getTime() > Date.now(),
    );
  const renewLease = vi.fn(
    async (id: string, token: string, seconds: number) => {
      const row = owned(id, token);
      if (row === undefined) return false;
      Object.assign(row, {
        lockedUntil: new Date(Date.now() + seconds * 1000),
      });
      return true;
    },
  );
  const withLeaseFence = async <T>(
    id: string,
    token: string,
    seconds: number,
    work: () => Promise<T>,
  ) => {
    if (!(await renewLease(id, token, seconds)))
      return { owned: false } as const;
    return { owned: true, value: await work() } as const;
  };
  const markProcessed = vi.fn(async (id: string, token: string) => {
    const row = owned(id, token);
    if (row === undefined) return false;
    Object.assign(row, { status: "PROCESSED" });
    return true;
  });
  const markFailed = vi.fn(
    async (
      id: string,
      token: string,
      count: number,
      code: string,
      _now: Date,
      _delay: number,
      maxAttempts: number,
    ) => {
      const row = owned(id, token);
      if (row === undefined) return false;
      Object.assign(row, {
        status: count >= maxAttempts ? "FAILED" : "PENDING",
        lastErrorCode: code,
      });
      return true;
    },
  );
  return {
    rows,
    owned,
    claim,
    renewLease,
    withLeaseFence,
    markProcessed,
    markFailed,
  };
}

afterEach(() => {
  vi.useRealTimers();
});
describe("worker ownership across slow batches", () => {
  it("processes 25 slow jobs without reserving idle jobs or running expired effects", async () => {
    vi.useFakeTimers();
    const repository = queue();
    const effects: string[] = [];
    const expired: string[] = [];
    const result = await processOutboxOnce(repository, {
      "test.v1": async (event) => {
        await vi.advanceTimersByTimeAsync(65_000);
        if (
          event.leaseToken === null ||
          repository.owned(event.id, event.leaseToken) === undefined
        )
          expired.push(event.id);
        effects.push(event.id);
      },
    });
    expect(result).toEqual({ claimed: 25, processed: 25, failed: 0 });
    expect(effects).toHaveLength(25);
    expect(new Set(effects).size).toBe(25);
    expect(expired).toEqual([]);
    expect(repository.claim.mock.calls.every(([limit]) => limit === 1)).toBe(
      true,
    );
    expect(repository.renewLease).toHaveBeenCalled();
  });

  it("keeps another instance from reclaiming a still-running slow handler", async () => {
    vi.useFakeTimers();
    const repository = queue(1);
    let release: () => void = () => {};
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const handler = vi.fn(async () => {
      await blocked;
    });
    const first = processOutboxOnce(
      repository,
      { "test.v1": handler },
      { batchSize: 1 },
    );
    await vi.advanceTimersByTimeAsync(65_000);
    const second = await processOutboxOnce(
      repository,
      { "test.v1": async () => {} },
      { batchSize: 1 },
    );
    release();
    const firstResult = await first;
    expect(second.claimed).toBe(0);
    expect(firstResult.processed).toBe(1);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(repository.rows[0]?.attempts).toBe(1);
  });

  it("refuses a sixth attempt before invoking the handler", async () => {
    const repository = queue(1, 5);
    const handler = vi.fn(async () => {});
    await processOutboxOnce(
      repository,
      { "test.v1": handler },
      { batchSize: 1, maxAttempts: 5 },
    );
    expect(handler).not.toHaveBeenCalled();
    expect(repository.rows[0]?.status).toBe("FAILED");
    expect(repository.rows[0]?.lastErrorCode).toBe("worker_attempts_exhausted");
  });
});
