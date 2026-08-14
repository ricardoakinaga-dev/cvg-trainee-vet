import { desc, sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { AuditEntry, AuditPort, AuditReadPort } from "@cvg/application";

import { PersistenceMappingError } from "./attempt-repository.js";
import { auditEntries } from "./schema.js";
import type * as schema from "./schema.js";

export { PersistenceMappingError } from "./attempt-repository.js";

export type AuditInsertRow = Readonly<{
  readonly id: string;
  readonly principalId: string;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly scopeId: string | null;
  readonly outcome: "SUCCESS" | "DENIED" | "FAILURE";
  readonly reasonCode: string | null;
  readonly requestId: string;
  readonly correlationId: string;
  readonly beforeHash: string | null;
  readonly afterHash: string | null;
  readonly occurredAt: Date;
}>;

export type AuditRowShape = Readonly<{
  readonly id: string;
  readonly principalId: string;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly scopeId: string | null;
  readonly outcome: "SUCCESS" | "DENIED" | "FAILURE";
  readonly reasonCode: string | null;
  readonly requestId: string;
  readonly correlationId: string;
  readonly beforeHash: string | null;
  readonly afterHash: string | null;
  readonly occurredAt: Date;
}>;

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new PersistenceMappingError(`${field} must not be empty`);
  }
}

export function auditEntryToRow(entry: AuditEntry): AuditInsertRow {
  assertNonEmpty(entry.auditId, "auditId");
  assertNonEmpty(entry.principalId, "principalId");
  assertNonEmpty(entry.action, "action");
  assertNonEmpty(entry.resourceType, "resourceType");
  assertNonEmpty(entry.resourceId, "resourceId");
  assertNonEmpty(entry.requestId, "requestId");
  assertNonEmpty(entry.correlationId, "correlationId");
  if (!["SUCCESS", "DENIED", "FAILURE"].includes(entry.outcome)) {
    throw new PersistenceMappingError("audit outcome is not supported");
  }
  const occurredAt = new Date(entry.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) {
    throw new PersistenceMappingError("occurredAt must be a valid timestamp");
  }

  return {
    id: entry.auditId,
    principalId: entry.principalId,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    scopeId: entry.scopeId ?? null,
    outcome: entry.outcome,
    reasonCode: entry.reasonCode ?? null,
    requestId: entry.requestId,
    correlationId: entry.correlationId,
    beforeHash: entry.beforeHash ?? null,
    afterHash: entry.afterHash ?? null,
    occurredAt,
  };
}

export function auditRowToEntry(row: AuditRowShape): AuditEntry {
  const entry = {
    auditId: row.id,
    principalId: row.principalId,
    action: row.action,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    ...(row.scopeId === null ? {} : { scopeId: row.scopeId }),
    outcome: row.outcome,
    ...(row.reasonCode === null ? {} : { reasonCode: row.reasonCode }),
    requestId: row.requestId,
    correlationId: row.correlationId,
    ...(row.beforeHash === null ? {} : { beforeHash: row.beforeHash }),
    ...(row.afterHash === null ? {} : { afterHash: row.afterHash }),
    occurredAt: row.occurredAt.toISOString(),
  } satisfies AuditEntry;
  return Object.freeze(entry);
}

function isAuditOutcome(value: string): value is AuditRowShape["outcome"] {
  return value === "SUCCESS" || value === "DENIED" || value === "FAILURE";
}

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

export function createAuditRepository(
  db: PostgresJsDatabase<typeof schema>,
): AuditPort & AuditReadPort {
  const repository: AuditPort & AuditReadPort = {
    append: async (entry: AuditEntry): Promise<void> => {
      await db.execute(sql`select set_config('cvg.audit_write', 'on', true)`);
      await db.insert(auditEntries).values(auditEntryToRow(entry));
    },
    list: async (): Promise<readonly AuditEntry[]> => {
      const rows = await db.transaction(async (transaction) => {
        await transaction.execute(
          sql`select set_config('cvg.audit_read', 'on', true)`,
        );
        return transaction
          .select()
          .from(auditEntries)
          .orderBy(desc(auditEntries.occurredAt), desc(auditEntries.id))
          .limit(100);
      });
      return Object.freeze(
        rows.map((row) => {
          if (!isAuditOutcome(row.outcome)) {
            throw new PersistenceMappingError("audit outcome is not supported");
          }
          return auditRowToEntry({
            ...row,
            outcome: row.outcome,
          });
        }),
      );
    },
  };
  return Object.freeze(repository);
}

export type { DatabaseExecutor };
