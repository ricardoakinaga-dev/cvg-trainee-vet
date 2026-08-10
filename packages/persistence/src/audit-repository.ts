import { sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { AuditEntry, AuditPort } from "@cvg/application";

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

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

export function createAuditRepository(
  db: PostgresJsDatabase<typeof schema>,
): AuditPort {
  const repository: AuditPort = {
    append: async (entry: AuditEntry): Promise<void> => {
      await db.execute(sql`select set_config('cvg.audit_write', 'on', true)`);
      await db.insert(auditEntries).values(auditEntryToRow(entry));
    },
  };
  return Object.freeze(repository);
}

export type { DatabaseExecutor };
