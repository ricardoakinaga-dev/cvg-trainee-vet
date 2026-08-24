import { createHash } from "node:crypto";

import { and, desc, eq, gte, isNull, lt, lte, or } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  AuditActorKind,
  AuditOutcome,
  AuditTrailReadPage,
  AuditTrailReadPort,
  AuditTrailRecord,
} from "@cvg/application";

import { auditEntries } from "./schema.js";
import type * as schema from "./schema.js";
import { setDatabaseAuditReadContext } from "./security-context.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;
type AuditTrailCursor = Readonly<{
  readonly version: 1;
  readonly auditId: string;
  readonly occurredAt: Date;
  readonly scopeId: string;
  readonly queryHash: string;
}>;

type AuditTrailReadQuery = Parameters<AuditTrailReadPort["listAuditTrail"]>[0];

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const tokenPattern = /^[A-Za-z][A-Za-z0-9_.-]{1,127}$/u;
const cursorPattern = /^[A-Za-z0-9_-]{1,512}$/u;
const hashPattern = /^[a-f0-9]{64}$/u;

function assertUuid(value: string, field: string): void {
  if (!uuidPattern.test(value)) throw new TypeError(`${field} is invalid`);
}

function assertToken(value: string | undefined, field: string): void {
  if (value !== undefined && !tokenPattern.test(value)) {
    throw new TypeError(`${field} is invalid`);
  }
}

function assertText(value: string | undefined, field: string): void {
  if (
    value !== undefined &&
    (value.trim().length === 0 || value.length > 256)
  ) {
    throw new TypeError(`${field} is invalid`);
  }
}

export function auditTrailQueryFingerprint(query: AuditTrailReadQuery): string {
  const canonical: readonly (string | number | null)[] = [
    query.scopeId,
    query.action ?? null,
    query.resourceType ?? null,
    query.resourceId ?? null,
    query.principalId ?? null,
    query.actorKind ?? null,
    query.outcome ?? null,
    query.from ?? null,
    query.to ?? null,
    query.limit,
  ];
  return createHash("sha256")
    .update(JSON.stringify(canonical), "utf8")
    .digest("hex");
}

export function encodeAuditTrailCursor(cursor: AuditTrailCursor): string {
  assertUuid(cursor.auditId, "auditId");
  assertUuid(cursor.scopeId, "scopeId");
  if (cursor.version !== 1) throw new TypeError("cursor version is invalid");
  if (!hashPattern.test(cursor.queryHash)) {
    throw new TypeError("cursor query hash is invalid");
  }
  if (Number.isNaN(cursor.occurredAt.getTime())) {
    throw new TypeError("occurredAt is invalid");
  }
  return Buffer.from(
    JSON.stringify({
      version: cursor.version,
      auditId: cursor.auditId,
      occurredAt: cursor.occurredAt.toISOString(),
      scopeId: cursor.scopeId,
      queryHash: cursor.queryHash,
    }),
    "utf8",
  ).toString("base64url");
}

export function decodeAuditTrailCursor(value: string): AuditTrailCursor {
  if (!cursorPattern.test(value)) throw new TypeError("cursor is invalid");
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    );
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      !Object.hasOwn(parsed, "auditId") ||
      !Object.hasOwn(parsed, "occurredAt") ||
      !Object.hasOwn(parsed, "version") ||
      !Object.hasOwn(parsed, "scopeId") ||
      !Object.hasOwn(parsed, "queryHash")
    ) {
      throw new TypeError("cursor payload is invalid");
    }
    const candidate = parsed as Record<string, unknown>;
    const expectedKeys = [
      "auditId",
      "occurredAt",
      "queryHash",
      "scopeId",
      "version",
    ].sort();
    if (
      JSON.stringify(Object.keys(candidate).sort()) !==
      JSON.stringify(expectedKeys)
    ) {
      throw new TypeError("cursor payload is invalid");
    }
    if (
      typeof candidate.auditId !== "string" ||
      typeof candidate.occurredAt !== "string" ||
      candidate.version !== 1 ||
      typeof candidate.scopeId !== "string" ||
      typeof candidate.queryHash !== "string"
    ) {
      throw new TypeError("cursor payload is invalid");
    }
    const occurredAt = new Date(candidate.occurredAt);
    assertUuid(candidate.auditId, "auditId");
    assertUuid(candidate.scopeId, "scopeId");
    if (!hashPattern.test(candidate.queryHash)) {
      throw new TypeError("cursor query hash is invalid");
    }
    if (Number.isNaN(occurredAt.getTime())) {
      throw new TypeError("occurredAt is invalid");
    }
    return Object.freeze({
      version: 1,
      auditId: candidate.auditId,
      occurredAt,
      scopeId: candidate.scopeId,
      queryHash: candidate.queryHash,
    });
  } catch {
    throw new TypeError("cursor is invalid");
  }
}

function mapAuditRow(row: typeof auditEntries.$inferSelect): AuditTrailRecord {
  return Object.freeze({
    auditId: row.id,
    occurredAt: row.occurredAt.toISOString(),
    actorKind: row.actorKind as AuditActorKind,
    ...(row.principalId === null ? {} : { principalId: row.principalId }),
    action: row.action,
    resourceType: row.resourceType,
    ...(row.resourceId === null ? {} : { resourceId: row.resourceId }),
    ...(row.scopeId === null ? {} : { scopeId: row.scopeId }),
    outcome: row.outcome as AuditOutcome,
    ...(row.reasonCode === null ? {} : { reasonCode: row.reasonCode }),
    requestId: row.requestId,
    correlationId: row.correlationId,
    ...(row.beforeHash === null ? {} : { beforeHash: row.beforeHash }),
    ...(row.afterHash === null ? {} : { afterHash: row.afterHash }),
  });
}

function assertQuery(query: AuditTrailReadQuery): void {
  assertUuid(query.scopeId, "scopeId");
  assertToken(query.action, "action");
  assertToken(query.resourceType, "resourceType");
  assertText(query.resourceId, "resourceId");
  if (query.principalId !== undefined)
    assertUuid(query.principalId, "principalId");
  if (query.from !== undefined && Number.isNaN(Date.parse(query.from))) {
    throw new TypeError("from is invalid");
  }
  if (query.to !== undefined && Number.isNaN(Date.parse(query.to))) {
    throw new TypeError("to is invalid");
  }
  if (
    query.from !== undefined &&
    query.to !== undefined &&
    Date.parse(query.from) > Date.parse(query.to)
  ) {
    throw new TypeError("from must be before to");
  }
  if (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > 100) {
    throw new TypeError("limit must be between 1 and 100");
  }
}

export function createAuditTrailRepository(
  db: DatabaseExecutor,
): AuditTrailReadPort {
  return Object.freeze({
    listAuditTrail: async (
      query: Parameters<AuditTrailReadPort["listAuditTrail"]>[0],
    ): Promise<AuditTrailReadPage> => {
      assertQuery(query);
      const cursor =
        query.cursor === undefined
          ? undefined
          : decodeAuditTrailCursor(query.cursor);
      if (
        cursor !== undefined &&
        (cursor.scopeId !== query.scopeId ||
          cursor.queryHash !== auditTrailQueryFingerprint(query))
      ) {
        throw new TypeError("cursor does not belong to this query");
      }
      return db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseAuditReadContext(executor, { scopeId: query.scopeId });
        const predicates = [
          or(
            eq(auditEntries.scopeId, query.scopeId),
            and(
              isNull(auditEntries.scopeId),
              eq(auditEntries.actorKind, "ANONYMOUS"),
            ),
          ),
          ...(query.action === undefined
            ? []
            : [eq(auditEntries.action, query.action)]),
          ...(query.resourceType === undefined
            ? []
            : [eq(auditEntries.resourceType, query.resourceType)]),
          ...(query.resourceId === undefined
            ? []
            : [eq(auditEntries.resourceId, query.resourceId)]),
          ...(query.principalId === undefined
            ? []
            : [eq(auditEntries.principalId, query.principalId)]),
          ...(query.actorKind === undefined
            ? []
            : [eq(auditEntries.actorKind, query.actorKind)]),
          ...(query.outcome === undefined
            ? []
            : [eq(auditEntries.outcome, query.outcome)]),
          ...(query.from === undefined
            ? []
            : [gte(auditEntries.occurredAt, new Date(query.from))]),
          ...(query.to === undefined
            ? []
            : [lte(auditEntries.occurredAt, new Date(query.to))]),
        ];
        if (cursor !== undefined) {
          predicates.push(
            or(
              lt(auditEntries.occurredAt, cursor.occurredAt),
              and(
                eq(auditEntries.occurredAt, cursor.occurredAt),
                lt(auditEntries.id, cursor.auditId),
              ),
            ),
          );
        }
        const rows = await executor
          .select()
          .from(auditEntries)
          .where(and(...predicates))
          .orderBy(desc(auditEntries.occurredAt), desc(auditEntries.id))
          .limit(query.limit + 1);
        const hasNext = rows.length > query.limit;
        const items = rows.slice(0, query.limit).map(mapAuditRow);
        const last = items.at(-1);
        return Object.freeze({
          scopeId: query.scopeId,
          items: Object.freeze(items),
          hasNext,
          ...(hasNext && last !== undefined
            ? {
                nextCursor: encodeAuditTrailCursor({
                  version: 1,
                  auditId: last.auditId,
                  occurredAt: new Date(last.occurredAt),
                  scopeId: query.scopeId,
                  queryHash: auditTrailQueryFingerprint(query),
                }),
              }
            : {}),
        });
      });
    },
  });
}
