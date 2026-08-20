import { and, eq, sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  createOutboxInsert,
  validateOutboxPayload,
  type OutboxEventInput,
} from "./attempt-repository.js";
import { outboxEvents } from "./schema.js";
import type * as schema from "./schema.js";

export type OutboxStatus = "PENDING" | "PROCESSING" | "PROCESSED" | "FAILED";

export type OutboxEventRecord = Readonly<{
  readonly id: string;
  readonly eventType: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly schemaVersion: number;
  readonly correlationId: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly status: OutboxStatus;
  readonly attempts: number;
  readonly availableAt: Date;
  readonly lockedUntil: Date | null;
  readonly lastErrorCode: string | null;
  readonly processedAt: Date | null;
  readonly createdAt: Date;
}>;

export interface OutboxRepositoryPort {
  readonly claim: (
    limit: number,
    now: Date,
    leaseSeconds: number,
  ) => Promise<readonly OutboxEventRecord[]>;
  readonly markProcessed: (eventId: string, now: Date) => Promise<void>;
  readonly markFailed: (
    eventId: string,
    attempts: number,
    errorCode: string,
    now: Date,
    retryAfterSeconds: number,
    maxAttempts: number,
  ) => Promise<void>;
  /** The probe methods are deliberately scoped to the readiness event type. */
  readonly insertProbe?: (input: OutboxEventInput) => Promise<void>;
  readonly claimProbe?: (
    eventId: string,
    now: Date,
    leaseSeconds: number,
  ) => Promise<OutboxEventRecord | null>;
  readonly removeProbe?: (eventId: string) => Promise<void>;
}

export class OutboxMappingError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "OutboxMappingError";
  }
}

function objectRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new OutboxMappingError("outbox row must be an object");
  }
  return Object.fromEntries(Object.entries(value));
}

function stringValue(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new OutboxMappingError(`${field} must be a non-empty string`);
  }
  return value;
}

function integerValue(record: Record<string, unknown>, field: string): number {
  const value = record[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new OutboxMappingError(`${field} must be a non-negative integer`);
  }
  return value;
}

function dateValue(record: Record<string, unknown>, field: string): Date {
  const value = record[field];
  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new OutboxMappingError(`${field} must be a valid timestamp`);
  }
  return date;
}

function nullableDateValue(
  record: Record<string, unknown>,
  field: string,
): Date | null {
  const value = record[field];
  return value === null ? null : dateValue(record, field);
}

function nullableStringValue(
  record: Record<string, unknown>,
  field: string,
): string | null {
  const value = record[field];
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new OutboxMappingError(`${field} must be a string or null`);
  }
  return value;
}

function statusValue(value: string): OutboxStatus {
  if (
    !(["PENDING", "PROCESSING", "PROCESSED", "FAILED"] as const).includes(
      value as OutboxStatus,
    )
  ) {
    throw new OutboxMappingError("outbox status is not supported");
  }
  return value as OutboxStatus;
}

export function outboxRowToRecord(value: unknown): OutboxEventRecord {
  const row = objectRecord(value);
  let payload: Readonly<Record<string, unknown>>;
  try {
    payload = validateOutboxPayload(row.payload);
  } catch (error) {
    throw new OutboxMappingError(
      error instanceof Error ? error.message : "outbox payload is invalid",
    );
  }
  return Object.freeze({
    id: stringValue(row, "id"),
    eventType: stringValue(row, "event_type"),
    aggregateType: stringValue(row, "aggregate_type"),
    aggregateId: stringValue(row, "aggregate_id"),
    occurredAt: dateValue(row, "occurred_at"),
    schemaVersion: integerValue(row, "schema_version"),
    correlationId: stringValue(row, "correlation_id"),
    payload,
    status: statusValue(stringValue(row, "status")),
    attempts: integerValue(row, "attempts"),
    availableAt: dateValue(row, "available_at"),
    lockedUntil: nullableDateValue(row, "locked_until"),
    lastErrorCode: nullableStringValue(row, "last_error_code"),
    processedAt: nullableDateValue(row, "processed_at"),
    createdAt: dateValue(row, "created_at"),
  });
}

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

function assertDate(value: Date, field: string): void {
  if (Number.isNaN(value.getTime())) {
    throw new RangeError(`${field} must be valid`);
  }
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${field} must be a positive integer`);
  }
}

function assertEventId(eventId: string): void {
  if (eventId.trim().length === 0) {
    throw new TypeError("eventId is required");
  }
}

function assertErrorCode(errorCode: string): void {
  if (errorCode.trim().length === 0) {
    throw new TypeError("errorCode is required");
  }
}

function leaseWindow(
  now: Date,
  leaseSeconds: number,
): Readonly<{ nowIso: string; lockedUntilIso: string }> {
  const lockedUntil = new Date(now.getTime() + leaseSeconds * 1_000);
  return {
    nowIso: now.toISOString(),
    lockedUntilIso: lockedUntil.toISOString(),
  };
}

function createClaim(db: DatabaseExecutor): OutboxRepositoryPort["claim"] {
  return async (
    limit: number,
    now: Date,
    leaseSeconds: number,
  ): Promise<readonly OutboxEventRecord[]> => {
    assertPositiveInteger(limit, "limit");
    assertPositiveInteger(leaseSeconds, "leaseSeconds");
    assertDate(now, "now");
    const { nowIso, lockedUntilIso } = leaseWindow(now, leaseSeconds);
    const result = await db.execute(sql`
      with candidates as (
        select id
        from outbox_events
        where (
          status = 'PENDING' and available_at <= ${nowIso}::timestamptz
        ) or (
          status = 'PROCESSING'
          and locked_until is not null
          and locked_until <= ${nowIso}::timestamptz
        )
        order by created_at asc
        for update skip locked
        limit ${limit}
      )
      update outbox_events as event
      set status = 'PROCESSING',
          attempts = event.attempts + 1,
          locked_until = ${lockedUntilIso}::timestamptz,
          last_error_code = null
      from candidates
      where event.id = candidates.id
      returning event.*
    `);
    return (result as unknown[]).map(outboxRowToRecord);
  };
}

function createMarkProcessed(
  db: DatabaseExecutor,
): OutboxRepositoryPort["markProcessed"] {
  return async (eventId: string, now: Date): Promise<void> => {
    assertEventId(eventId);
    assertDate(now, "now");
    const nowIso = now.toISOString();
    await db.execute(sql`
      update outbox_events
      set status = 'PROCESSED',
          processed_at = ${nowIso}::timestamptz,
          locked_until = null
      where id = ${eventId} and status = 'PROCESSING'
    `);
  };
}

function createMarkFailed(
  db: DatabaseExecutor,
): OutboxRepositoryPort["markFailed"] {
  return async (
    eventId: string,
    attempts: number,
    errorCode: string,
    now: Date,
    retryAfterSeconds: number,
    maxAttempts: number,
  ): Promise<void> => {
    assertEventId(eventId);
    assertErrorCode(errorCode);
    assertPositiveInteger(attempts, "attempts");
    assertPositiveInteger(maxAttempts, "maxAttempts");
    if (!Number.isInteger(retryAfterSeconds) || retryAfterSeconds < 0) {
      throw new RangeError("retryAfterSeconds must be non-negative");
    }
    assertDate(now, "now");
    const nextStatus: OutboxStatus =
      attempts >= maxAttempts ? "FAILED" : "PENDING";
    const availableAt = new Date(now.getTime() + retryAfterSeconds * 1_000);
    const availableAtIso = availableAt.toISOString();
    await db.execute(sql`
      update outbox_events
      set status = ${nextStatus},
          available_at = ${availableAtIso}::timestamptz,
          locked_until = null,
          last_error_code = ${errorCode},
          processed_at = null
      where id = ${eventId} and status = 'PROCESSING'
    `);
  };
}

function createInsertProbe(
  db: DatabaseExecutor,
): NonNullable<OutboxRepositoryPort["insertProbe"]> {
  return async (input: OutboxEventInput): Promise<void> => {
    await db.insert(outboxEvents).values(createOutboxInsert(input));
  };
}

function createClaimProbe(
  db: DatabaseExecutor,
): NonNullable<OutboxRepositoryPort["claimProbe"]> {
  return async (
    eventId: string,
    now: Date,
    leaseSeconds: number,
  ): Promise<OutboxEventRecord | null> => {
    assertEventId(eventId);
    assertPositiveInteger(leaseSeconds, "leaseSeconds");
    assertDate(now, "now");
    const { nowIso, lockedUntilIso } = leaseWindow(now, leaseSeconds);
    const result = await db.execute(sql`
      update outbox_events
      set status = 'PROCESSING',
          attempts = attempts + 1,
          locked_until = ${lockedUntilIso}::timestamptz,
          last_error_code = null
      where id = ${eventId}
        and event_type = 'worker.readiness.probe.v1'
        and (
          (status = 'PENDING' and available_at <= ${nowIso}::timestamptz)
          or (
            status = 'PROCESSING'
            and locked_until is not null
            and locked_until <= ${nowIso}::timestamptz
          )
        )
      returning *
    `);
    const row = (result as unknown[])[0];
    return row === undefined ? null : outboxRowToRecord(row);
  };
}

function createRemoveProbe(
  db: DatabaseExecutor,
): NonNullable<OutboxRepositoryPort["removeProbe"]> {
  return async (eventId: string): Promise<void> => {
    assertEventId(eventId);
    await db
      .delete(outboxEvents)
      .where(
        and(
          eq(outboxEvents.id, eventId),
          eq(outboxEvents.eventType, "worker.readiness.probe.v1"),
        ),
      );
  };
}

export function createOutboxRepository(
  db: DatabaseExecutor,
): OutboxRepositoryPort {
  const repository: OutboxRepositoryPort = {
    claim: createClaim(db),
    markProcessed: createMarkProcessed(db),
    markFailed: createMarkFailed(db),
    insertProbe: createInsertProbe(db),
    claimProbe: createClaimProbe(db),
    removeProbe: createRemoveProbe(db),
  };
  return Object.freeze(repository);
}
