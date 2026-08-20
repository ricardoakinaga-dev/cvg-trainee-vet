import { sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { assertNonEmpty } from "./learning-state-mappers.js";
import type * as schema from "./schema.js";

export type DatabaseExecutor = PostgresJsDatabase<typeof schema>;
export type DatabaseTransaction = Parameters<
  Parameters<DatabaseExecutor["transaction"]>[0]
>[0];

export type PersistenceContext = Readonly<{
  readonly participantId: string;
  readonly scopeId: string;
}>;

export class LearningStatePersistenceConflictError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "LearningStatePersistenceConflictError";
  }
}

function assertPersistenceContext(context: PersistenceContext): void {
  assertNonEmpty(context.participantId, "participantId");
  assertNonEmpty(context.scopeId, "scopeId");
}

export async function withContext<T>(
  db: DatabaseExecutor,
  context: PersistenceContext,
  action: (tx: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  assertPersistenceContext(context);
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('cvg.participant_id', ${context.participantId}, true), set_config('cvg.scope_id', ${context.scopeId}, true), set_config('cvg.feedback_staff_read', 'false', true)`,
    );
    return action(tx);
  });
}

export async function withFeedbackStaffContext<T>(
  db: DatabaseExecutor,
  scopeId: string,
  action: (tx: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  assertNonEmpty(scopeId, "scopeId");
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('cvg.participant_id', '', true), set_config('cvg.scope_id', ${scopeId}, true), set_config('cvg.feedback_staff_read', 'true', true)`,
    );
    return action(tx);
  });
}

export function conflict(message: string): never {
  throw new LearningStatePersistenceConflictError(message);
}
