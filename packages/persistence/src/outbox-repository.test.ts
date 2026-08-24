import { describe, expect, it, vi } from "vitest";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  OutboxMappingError,
  createOutboxRepository,
  outboxRowToRecord,
} from "./outbox-repository.js";
import type * as schema from "./schema.js";

const syntheticLeaseMarker = "lease-11111111-1111-4111-8111-111111111111";

const row = {
  id: "11111111-1111-4111-8111-111111111111",
  event_type: "content.published.v1",
  aggregate_type: "content_version",
  aggregate_id: "22222222-2222-4222-8222-222222222222",
  occurred_at: new Date("2026-08-09T17:00:00.000Z"),
  schema_version: 1,
  correlation_id: "33333333-3333-4333-8333-333333333333",
  payload: { content_id: "22222222-2222-4222-8222-222222222222" },
  status: "PROCESSING",
  attempts: 1,
  available_at: new Date("2026-08-09T17:00:00.000Z"),
  locked_until: new Date("2026-08-09T17:01:00.000Z"),
  lease_token: syntheticLeaseMarker,
  last_error_code: null,
  processed_at: null,
  created_at: new Date("2026-08-09T17:00:00.000Z"),
};

function fakeDatabase(result: readonly Record<string, unknown>[]) {
  return {
    execute: vi.fn(async () => result),
  } as unknown as PostgresJsDatabase<typeof schema>;
}

describe("outbox persistence", () => {
  it("maps a leased event and keeps payload metadata-only", () => {
    const mapped = outboxRowToRecord(row);

    expect(mapped).toMatchObject({
      id: row.id,
      eventType: row.event_type,
      status: "PROCESSING",
      attempts: 1,
      leaseToken: row.lease_token,
    });
    expect(JSON.stringify(mapped.payload)).not.toContain("participantText");
  });

  it("maps string timestamps and nullable processing metadata", () => {
    const mapped = outboxRowToRecord({
      ...row,
      occurred_at: "2026-08-09T17:00:00.000Z",
      available_at: "2026-08-09T17:00:00.000Z",
      locked_until: "2026-08-09T17:01:00.000Z",
      lease_token: syntheticLeaseMarker,
      last_error_code: "temporary_failure",
      processed_at: "2026-08-09T17:02:00.000Z",
      created_at: "2026-08-09T17:00:00.000Z",
    });

    expect(mapped.lockedUntil).toBeInstanceOf(Date);
    expect(mapped.lastErrorCode).toBe("temporary_failure");
    expect(mapped.processedAt).toBeInstanceOf(Date);
  });

  it("rejects malformed status and payload rows", () => {
    expect(() => outboxRowToRecord({ ...row, status: "UNKNOWN" })).toThrow(
      OutboxMappingError,
    );
    expect(() =>
      outboxRowToRecord({ ...row, payload: "not-an-object" }),
    ).toThrow(OutboxMappingError);
  });

  it("rejects malformed row identity, counters, timestamps, and nullable fields", () => {
    expect(() => outboxRowToRecord(null)).toThrow(OutboxMappingError);
    expect(() => outboxRowToRecord([])).toThrow(OutboxMappingError);
    for (const field of [
      "id",
      "event_type",
      "aggregate_type",
      "aggregate_id",
      "correlation_id",
    ]) {
      expect(() => outboxRowToRecord({ ...row, [field]: " " })).toThrow(
        OutboxMappingError,
      );
      expect(() => outboxRowToRecord({ ...row, [field]: 10 })).toThrow(
        OutboxMappingError,
      );
    }
    for (const field of ["schema_version", "attempts"]) {
      expect(() => outboxRowToRecord({ ...row, [field]: -1 })).toThrow(
        OutboxMappingError,
      );
      expect(() => outboxRowToRecord({ ...row, [field]: "1" })).toThrow(
        OutboxMappingError,
      );
    }
    for (const field of [
      "occurred_at",
      "available_at",
      "locked_until",
      "processed_at",
      "created_at",
    ]) {
      expect(() => outboxRowToRecord({ ...row, [field]: "invalid" })).toThrow(
        OutboxMappingError,
      );
    }
    expect(() => outboxRowToRecord({ ...row, lease_token: " " })).toThrow(
      OutboxMappingError,
    );
    expect(() => outboxRowToRecord({ ...row, last_error_code: 10 })).toThrow(
      OutboxMappingError,
    );
  });

  it("claims, completes, and fails events through the SQL adapter", async () => {
    const database = fakeDatabase([row]);
    const repository = createOutboxRepository(database);
    const now = new Date("2026-08-09T17:00:00.000Z");

    await expect(repository.claim(10, now, 60)).resolves.toEqual([
      outboxRowToRecord(row),
    ]);
    await expect(
      repository.markProcessed(
        row.id,
        "lease-11111111-1111-4111-8111-111111111111",
        now,
      ),
    ).resolves.toBe(true);
    await expect(
      repository.markFailed(
        row.id,
        "lease-11111111-1111-4111-8111-111111111111",
        1,
        "handler_failed",
        now,
        30,
        3,
      ),
    ).resolves.toBe(true);
    expect(database.execute).toHaveBeenCalledTimes(3);
  });

  it("reports a fenced update when PostgreSQL returns no affected row", async () => {
    const database = fakeDatabase([]);
    const repository = createOutboxRepository(database);
    const now = new Date("2026-08-09T17:00:00.000Z");

    await expect(
      repository.markProcessed(row.id, "lease-token", now),
    ).resolves.toBe(false);
    await expect(
      repository.markFailed(
        row.id,
        "lease-token",
        1,
        "stale_failure",
        now,
        0,
        2,
      ),
    ).resolves.toBe(false);
  });

  it("validates lease, completion, and retry parameters before SQL", async () => {
    const database = fakeDatabase([row]);
    const repository = createOutboxRepository(database);
    const now = new Date("2026-08-09T17:00:00.000Z");
    const invalidDate = new Date("invalid");

    await expect(repository.claim(0, now, 1)).rejects.toThrow("limit");
    await expect(repository.claim(1, now, 0)).rejects.toThrow("leaseSeconds");
    await expect(repository.claim(1, invalidDate, 1)).rejects.toThrow("now");
    await expect(
      repository.markProcessed("", "lease-token", now),
    ).rejects.toThrow("eventId");
    await expect(repository.markProcessed(row.id, " ", now)).rejects.toThrow(
      "leaseToken",
    );
    await expect(
      repository.markProcessed(row.id, "lease-token", invalidDate),
    ).rejects.toThrow("now");
    await expect(
      repository.markFailed("", "lease-token", 1, "failure", now, 0, 2),
    ).rejects.toThrow("eventId");
    await expect(
      repository.markFailed(row.id, " ", 1, "failure", now, 0, 2),
    ).rejects.toThrow("leaseToken");
    await expect(
      repository.markFailed(row.id, "lease-token", 1, " ", now, 0, 2),
    ).rejects.toThrow("errorCode");
    await expect(
      repository.markFailed(row.id, "lease-token", 0, "failure", now, 0, 2),
    ).rejects.toThrow("attempts");
    await expect(
      repository.markFailed(row.id, "lease-token", 1, "failure", now, 0, 0),
    ).rejects.toThrow("maxAttempts");
    await expect(
      repository.markFailed(row.id, "lease-token", 1, "failure", now, -1, 2),
    ).rejects.toThrow("retryAfterSeconds");
    await expect(
      repository.markFailed(
        row.id,
        "lease-token",
        1,
        "failure",
        invalidDate,
        0,
        2,
      ),
    ).rejects.toThrow("now");
  });

  it("supports both retryable and terminal failure statuses", async () => {
    const database = fakeDatabase([]);
    const repository = createOutboxRepository(database);
    const now = new Date("2026-08-09T17:00:00.000Z");

    await repository.markFailed(
      row.id,
      "lease-token",
      1,
      "temporary_failure",
      now,
      10,
      2,
    );
    await repository.markFailed(
      row.id,
      "lease-token",
      2,
      "terminal_failure",
      now,
      0,
      2,
    );

    expect(database.execute).toHaveBeenCalledTimes(2);
  });
});
