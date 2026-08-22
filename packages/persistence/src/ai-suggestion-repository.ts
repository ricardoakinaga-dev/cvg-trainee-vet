import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type * as schema from "./schema.js";

const SUGGESTION_EVENT_LEASE_MS = 60_000;

type DatabaseExecutor = Pick<PostgresJsDatabase<typeof schema>, "execute">;

export type AiSuggestionEventClaim =
  | Readonly<{ readonly state: "ACQUIRED"; readonly leaseToken: string }>
  | Readonly<{
      readonly state: "COMPLETED" | "IN_PROGRESS" | "CONFLICT";
      readonly leaseToken: null;
    }>;

export type InternalAiSuggestion = Readonly<{
  readonly eventId: string;
  readonly contentId: string;
  readonly version: number;
  readonly draftText: string;
  readonly warnings: readonly string[];
}>;

export type AiSuggestionSinkPort = Readonly<{
  readonly claimEvent: (
    eventId: string,
    contentId: string,
    version: number,
  ) => Promise<AiSuggestionEventClaim>;
  readonly saveDraftSuggestion: (
    suggestion: InternalAiSuggestion,
    leaseToken: string,
  ) => Promise<boolean>;
  readonly releaseEvent: (
    eventId: string,
    leaseToken: string,
  ) => Promise<boolean>;
}>;

type SuggestionEventRow = Readonly<{
  contentId: string;
  version: number;
  status: "PROCESSING" | "COMPLETED";
  leaseToken: string;
  lockedUntil: Date;
  databaseNow: Date;
}>;

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) throw new TypeError(`${field} is required`);
}

function assertUuid(value: string, field: string): void {
  assertNonEmpty(value, field);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(
      value,
    )
  ) {
    throw new TypeError(`${field} must be a UUID`);
  }
}

function assertVersion(value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError("version must be positive");
  }
}

function firstRow(value: unknown): Readonly<Record<string, unknown>> | null {
  if (!Array.isArray(value)) return null;
  const row = value[0];
  if (row === null || typeof row !== "object" || Array.isArray(row)) {
    return null;
  }
  return Object.fromEntries(Object.entries(row));
}

function eventRow(value: unknown): SuggestionEventRow | null {
  const row = firstRow(value);
  if (row === null) return null;
  const lockedUntil =
    row.lockedUntil instanceof Date
      ? new Date(row.lockedUntil)
      : typeof row.lockedUntil === "string"
        ? new Date(row.lockedUntil)
        : null;
  const databaseNow =
    row.databaseNow instanceof Date
      ? new Date(row.databaseNow)
      : typeof row.databaseNow === "string"
        ? new Date(row.databaseNow)
        : null;
  if (
    typeof row.contentId !== "string" ||
    typeof row.version !== "number" ||
    (row.status !== "PROCESSING" && row.status !== "COMPLETED") ||
    typeof row.leaseToken !== "string" ||
    lockedUntil === null ||
    databaseNow === null ||
    Number.isNaN(lockedUntil.getTime()) ||
    Number.isNaN(databaseNow.getTime())
  ) {
    throw new Error("AI suggestion event row is invalid");
  }
  return Object.freeze({
    contentId: row.contentId,
    version: row.version,
    status: row.status,
    leaseToken: row.leaseToken,
    lockedUntil,
    databaseNow,
  });
}

function acquired(leaseToken: string): AiSuggestionEventClaim {
  return Object.freeze({ state: "ACQUIRED", leaseToken });
}

function notAcquired(
  state: "COMPLETED" | "IN_PROGRESS" | "CONFLICT",
): AiSuggestionEventClaim {
  return Object.freeze({ state, leaseToken: null });
}

async function lockSuggestionEvent(
  executor: DatabaseExecutor,
  eventId: string,
): Promise<boolean> {
  const row = firstRow(
    await executor.execute(sql`
    select
      set_config('cvg.ai_suggestion_worker', 'true', true),
      pg_try_advisory_xact_lock(hashtextextended(${eventId}, 0)) as "acquired"
  `),
  );
  if (row === null || typeof row.acquired !== "boolean") {
    throw new Error("AI suggestion advisory lock response is invalid");
  }
  return row.acquired;
}

async function readSuggestionEvent(
  executor: DatabaseExecutor,
  eventId: string,
): Promise<SuggestionEventRow | null> {
  return eventRow(
    await executor.execute(sql`
      select
        content_id as "contentId",
        version,
        status,
        lease_token as "leaseToken",
        locked_until as "lockedUntil",
        clock_timestamp() as "databaseNow"
      from ai_suggestion_events
      where event_id = ${eventId}
      for update
    `),
  );
}

function validateSuggestion(suggestion: InternalAiSuggestion): void {
  assertNonEmpty(suggestion.eventId, "eventId");
  assertNonEmpty(suggestion.contentId, "contentId");
  assertVersion(suggestion.version);
  assertNonEmpty(suggestion.draftText, "draftText");
  if (suggestion.draftText.length > 20_000) {
    throw new RangeError("draftText exceeds the maximum size");
  }
  if (/<[^>]*>/u.test(suggestion.draftText)) {
    throw new TypeError("draftText must be plain text");
  }
  if (
    suggestion.warnings.length > 20 ||
    suggestion.warnings.some(
      (warning) => warning.trim().length === 0 || warning.length > 500,
    )
  ) {
    throw new TypeError("warnings are invalid");
  }
}

function ownsProcessingClaim(
  row: SuggestionEventRow | null,
  suggestion: InternalAiSuggestion,
  leaseToken: string,
): boolean {
  return (
    row !== null &&
    row.status === "PROCESSING" &&
    row.leaseToken === leaseToken &&
    row.contentId === suggestion.contentId &&
    row.version === suggestion.version
  );
}

async function createClaim(
  executor: DatabaseExecutor,
  eventId: string,
  contentId: string,
  version: number,
  leaseToken: string,
): Promise<AiSuggestionEventClaim> {
  await executor.execute(sql`
    insert into ai_suggestion_events (
      event_id, content_id, version, status, attempts, lease_token,
      locked_until, created_at, updated_at
    ) values (
      ${eventId}, ${contentId}, ${version}, 'PROCESSING', 1, ${leaseToken},
      clock_timestamp() + (${SUGGESTION_EVENT_LEASE_MS} * interval '1 millisecond'),
      clock_timestamp(),
      clock_timestamp()
    )
  `);
  return acquired(leaseToken);
}

async function reclaimExpiredEvent(
  executor: DatabaseExecutor,
  eventId: string,
  leaseToken: string,
): Promise<AiSuggestionEventClaim> {
  const updated = await executor.execute(sql`
    update ai_suggestion_events
    set attempts = attempts + 1,
        lease_token = ${leaseToken},
        locked_until = clock_timestamp() + (${SUGGESTION_EVENT_LEASE_MS} * interval '1 millisecond'),
        updated_at = clock_timestamp()
    where event_id = ${eventId}
      and status = 'PROCESSING'
    returning event_id as "eventId"
  `);
  if (firstRow(updated) === null) {
    throw new Error("AI suggestion event reclaim lost its locked row");
  }
  return acquired(leaseToken);
}

async function claimWithinTransaction(
  executor: DatabaseExecutor,
  eventId: string,
  contentId: string,
  version: number,
  leaseTokenFactory: () => string,
): Promise<AiSuggestionEventClaim> {
  if (!(await lockSuggestionEvent(executor, eventId))) {
    return notAcquired("IN_PROGRESS");
  }
  const current = await readSuggestionEvent(executor, eventId);
  if (current === null) {
    return createClaim(
      executor,
      eventId,
      contentId,
      version,
      leaseTokenFactory(),
    );
  }
  if (current.contentId !== contentId || current.version !== version) {
    return notAcquired("CONFLICT");
  }
  if (current.status === "COMPLETED") return notAcquired("COMPLETED");
  if (current.lockedUntil.getTime() > current.databaseNow.getTime()) {
    return notAcquired("IN_PROGRESS");
  }
  return reclaimExpiredEvent(executor, eventId, leaseTokenFactory());
}

async function saveOwnedSuggestion(
  executor: DatabaseExecutor,
  suggestion: InternalAiSuggestion,
  leaseToken: string,
  idFactory: () => string,
): Promise<boolean> {
  if (!(await lockSuggestionEvent(executor, suggestion.eventId))) return false;
  const current = await readSuggestionEvent(executor, suggestion.eventId);
  if (!ownsProcessingClaim(current, suggestion, leaseToken)) return false;
  await executor.execute(sql`
    insert into ai_suggestions (
      id, source_event_id, content_id, version, status, draft_text, warnings,
      created_at, updated_at
    ) values (
      ${idFactory()}, ${suggestion.eventId}, ${suggestion.contentId},
      ${suggestion.version}, 'DRAFT_AI', ${suggestion.draftText},
      ${JSON.stringify([...suggestion.warnings])}::jsonb,
      clock_timestamp(),
      clock_timestamp()
    )
    on conflict (content_id, version) do update
    set source_event_id = excluded.source_event_id,
        status = 'DRAFT_AI',
        draft_text = excluded.draft_text,
        warnings = excluded.warnings,
        updated_at = excluded.updated_at
  `);
  const completed = await executor.execute(sql`
    update ai_suggestion_events
    set status = 'COMPLETED',
        completed_at = clock_timestamp(),
        locked_until = clock_timestamp(),
        updated_at = clock_timestamp()
    where event_id = ${suggestion.eventId}
      and status = 'PROCESSING'
      and lease_token = ${leaseToken}
    returning event_id as "eventId"
  `);
  if (firstRow(completed) === null) {
    throw new Error("AI suggestion event completion lost its locked row");
  }
  return true;
}

export function createAiSuggestionSink(
  db: PostgresJsDatabase<typeof schema>,
  idFactory: () => string,
  leaseTokenFactory: () => string = randomUUID,
): AiSuggestionSinkPort {
  return Object.freeze({
    claimEvent: async (eventId, contentId, version) => {
      assertUuid(eventId, "eventId");
      assertUuid(contentId, "contentId");
      assertVersion(version);
      return db.transaction((transaction) =>
        claimWithinTransaction(
          transaction,
          eventId,
          contentId,
          version,
          leaseTokenFactory,
        ),
      );
    },
    saveDraftSuggestion: async (suggestion, leaseToken) => {
      validateSuggestion(suggestion);
      assertUuid(suggestion.eventId, "eventId");
      assertUuid(suggestion.contentId, "contentId");
      assertUuid(leaseToken, "leaseToken");
      return db.transaction((transaction) =>
        saveOwnedSuggestion(transaction, suggestion, leaseToken, idFactory),
      );
    },
    releaseEvent: async (eventId, leaseToken) => {
      assertUuid(eventId, "eventId");
      assertUuid(leaseToken, "leaseToken");
      return db.transaction(async (transaction) => {
        if (!(await lockSuggestionEvent(transaction, eventId))) return false;
        const released = await transaction.execute(sql`
          delete from ai_suggestion_events
          where event_id = ${eventId}
            and status = 'PROCESSING'
            and lease_token = ${leaseToken}
          returning event_id as "eventId"
        `);
        return firstRow(released) !== null;
      });
    },
  });
}
