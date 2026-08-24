import { sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { validateOutboxPayload } from "./attempt-repository.js";
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
  readonly leaseToken: string | null;
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
  readonly markProcessed: (
    eventId: string,
    leaseToken: string,
    now: Date,
  ) => Promise<boolean>;
  readonly markFailed: (
    eventId: string,
    leaseToken: string,
    attempts: number,
    errorCode: string,
    now: Date,
    retryAfterSeconds: number,
    maxAttempts: number,
  ) => Promise<boolean>;
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

function nullableLeaseTokenValue(
  record: Record<string, unknown>,
): string | null {
  const value = record.lease_token;
  if (value === null) return null;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new OutboxMappingError(
      "lease_token must be a non-empty string or null",
    );
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
    leaseToken: nullableLeaseTokenValue(row),
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

export function createOutboxRepository(
  db: DatabaseExecutor,
): OutboxRepositoryPort {
  const repository: OutboxRepositoryPort = {
    claim: async (
      limit: number,
      now: Date,
      leaseSeconds: number,
    ): Promise<readonly OutboxEventRecord[]> => {
      assertPositiveInteger(limit, "limit");
      assertPositiveInteger(leaseSeconds, "leaseSeconds");
      assertDate(now, "now");
      const result = await db.execute(sql`
        with candidates as (
          select id
          from outbox_events
          where (
            status = 'PENDING' and available_at <= statement_timestamp()
          ) or (
            status = 'PROCESSING'
            and locked_until is not null
            and locked_until <= statement_timestamp()
          )
          order by created_at asc
          for update skip locked
          limit ${limit}
        )
        update outbox_events as event
        set status = 'PROCESSING',
            attempts = event.attempts + 1,
            locked_until = statement_timestamp() +
              (${leaseSeconds} * interval '1 second'),
            lease_token = gen_random_uuid()::text,
            last_error_code = null
        from candidates
        where event.id = candidates.id
        returning event.*
      `);
      return (result as unknown[]).map(outboxRowToRecord);
    },
    markProcessed: async (
      eventId: string,
      leaseToken: string,
      now: Date,
    ): Promise<boolean> => {
      if (eventId.trim().length === 0)
        throw new TypeError("eventId is required");
      if (leaseToken.trim().length === 0)
        throw new TypeError("leaseToken is required");
      assertDate(now, "now");
      const result = await db.execute(sql`
        update outbox_events
        set status = 'PROCESSED',
            processed_at = statement_timestamp(),
            locked_until = null,
            lease_token = null
        where id = ${eventId}
          and status = 'PROCESSING'
          and lease_token = ${leaseToken}
          and locked_until is not null
          and locked_until > statement_timestamp()
        returning id
      `);
      return (result as unknown[]).length > 0;
    },
    markFailed: async (
      eventId: string,
      leaseToken: string,
      attempts: number,
      errorCode: string,
      now: Date,
      retryAfterSeconds: number,
      maxAttempts: number,
    ): Promise<boolean> => {
      if (eventId.trim().length === 0)
        throw new TypeError("eventId is required");
      if (leaseToken.trim().length === 0)
        throw new TypeError("leaseToken is required");
      if (errorCode.trim().length === 0)
        throw new TypeError("errorCode is required");
      assertPositiveInteger(attempts, "attempts");
      assertPositiveInteger(maxAttempts, "maxAttempts");
      if (!Number.isInteger(retryAfterSeconds) || retryAfterSeconds < 0) {
        throw new RangeError("retryAfterSeconds must be non-negative");
      }
      assertDate(now, "now");
      const nextStatus: OutboxStatus =
        attempts >= maxAttempts ? "FAILED" : "PENDING";
      const result = await db.execute(sql`
        update outbox_events
        set status = ${nextStatus},
            available_at = statement_timestamp() +
              (${retryAfterSeconds} * interval '1 second'),
            locked_until = null,
            lease_token = null,
            last_error_code = ${errorCode},
            processed_at = null
        where id = ${eventId}
          and status = 'PROCESSING'
          and lease_token = ${leaseToken}
          and locked_until is not null
          and locked_until > statement_timestamp()
        returning id
      `);
      return (result as unknown[]).length > 0;
    },
  };
  return Object.freeze(repository);
}
