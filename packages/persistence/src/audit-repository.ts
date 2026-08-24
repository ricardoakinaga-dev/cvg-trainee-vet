import { sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { AuditEntry, AuditPort } from "@cvg/application";

import { PersistenceMappingError } from "./attempt-repository.js";
import { auditEntries } from "./schema.js";
import type * as schema from "./schema.js";

export { PersistenceMappingError } from "./attempt-repository.js";

export type AuditInsertRow = Readonly<{
  readonly id: string;
  readonly actorKind: "AUTHENTICATED" | "ANONYMOUS";
  readonly principalId: string | null;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string | null;
  readonly scopeId: string | null;
  readonly outcome: "SUCCESS" | "DENIED" | "FAILURE";
  readonly reasonCode: string | null;
  readonly requestId: string;
  readonly correlationId: string;
  readonly beforeHash: string | null;
  readonly afterHash: string | null;
  readonly occurredAt: Date;
}>;

function assertNonEmpty(value: string | undefined, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new PersistenceMappingError(`${field} must not be empty`);
  }
}

export function auditEntryToRow(entry: AuditEntry): AuditInsertRow {
  assertNonEmpty(entry.auditId, "auditId");
  const actorKind = entry.actorKind ?? "AUTHENTICATED";
  if (actorKind !== "AUTHENTICATED" && actorKind !== "ANONYMOUS") {
    throw new PersistenceMappingError("audit actor kind is not supported");
  }
  if (actorKind === "AUTHENTICATED") {
    if (entry.principalId === undefined) {
      throw new PersistenceMappingError(
        "principalId is required for authenticated audit entries",
      );
    }
    assertNonEmpty(entry.principalId, "principalId");
    if (entry.scopeId === undefined) {
      throw new PersistenceMappingError(
        "scopeId is required for authenticated audit entries",
      );
    }
    assertNonEmpty(entry.scopeId, "scopeId");
  } else if (entry.principalId !== undefined) {
    throw new PersistenceMappingError(
      "anonymous audit entries cannot contain a principalId",
    );
  }
  assertNonEmpty(entry.action, "action");
  assertNonEmpty(entry.resourceType, "resourceType");
  if (entry.resourceId !== undefined)
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
    actorKind,
    principalId: entry.principalId ?? null,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId ?? null,
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
      await db.transaction(async (transaction) => {
        await transaction.execute(
          sql`select
            set_config('cvg.audit_write', 'on', true),
            set_config('cvg.audit_read', '', true),
            set_config('cvg.audit_scope_id', '', true)`,
        );
        await transaction.insert(auditEntries).values(auditEntryToRow(entry));
      });
    },
  };
  return Object.freeze(repository);
}

export type { DatabaseExecutor };
