import { sql, type SQL } from "drizzle-orm";

export type DatabaseSecurityContext = Readonly<{
  readonly participantId?: string;
  readonly scopeId?: string;
}>;

type ContextExecutor = Readonly<{
  readonly execute: (query: SQL) => Promise<unknown>;
}>;

function normalizeValue(value: string | undefined, field: string): string {
  if (value === undefined) return "";
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty when provided`);
  }
  return value;
}

export function normalizeDatabaseSecurityContext(
  context: DatabaseSecurityContext,
): DatabaseSecurityContext {
  const participantId = normalizeValue(context.participantId, "participantId");
  const scopeId = normalizeValue(context.scopeId, "scopeId");
  if (participantId.length === 0 && scopeId.length === 0) {
    throw new TypeError(
      "security context must include participantId or scopeId",
    );
  }
  return Object.freeze({
    ...(participantId.length === 0 ? {} : { participantId }),
    ...(scopeId.length === 0 ? {} : { scopeId }),
  });
}

export async function setDatabaseSecurityContext(
  executor: ContextExecutor,
  context: DatabaseSecurityContext,
): Promise<void> {
  const normalized = normalizeDatabaseSecurityContext(context);
  await executor.execute(
    sql`select set_config('cvg.participant_id', ${normalized.participantId ?? ""}, true), set_config('cvg.scope_id', ${normalized.scopeId ?? ""}, true)`,
  );
}
