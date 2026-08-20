import { and, eq } from "drizzle-orm";
import type { AppealState } from "@cvg/domain";
import {
  appealRowToState,
  appealStateToRow,
} from "./learning-state-mappers.js";
import type {
  PersistenceContext,
  ScopedAppeal,
} from "./learning-state-repository.js";
import {
  conflict,
  type DatabaseExecutor,
  type DatabaseTransaction,
  withContext,
} from "./learning-state-repository-support.js";
import { appeals } from "./schema.js";

export type AppealPersistence = Readonly<{
  readonly saveAppealState: (
    context: PersistenceContext,
    state: AppealState,
  ) => Promise<ScopedAppeal>;
  readonly findAppealState: (
    context: PersistenceContext,
    appealId: string,
  ) => Promise<ScopedAppeal | null>;
}>;

async function persistAppealRow(
  tx: DatabaseTransaction,
  row: ReturnType<typeof appealStateToRow>,
  now: Date,
): Promise<void> {
  if (row.version === 0) {
    const inserted = await tx
      .insert(appeals)
      .values({ ...row, updatedAt: now })
      .onConflictDoNothing()
      .returning({ id: appeals.id });
    if (inserted.length === 0) conflict("appeal already exists");
    return;
  }
  const updated = await tx
    .update(appeals)
    .set({ ...row, updatedAt: now })
    .where(
      and(
        eq(appeals.id, row.id),
        eq(appeals.participantId, row.participantId),
        eq(appeals.scopeId, row.scopeId),
        eq(appeals.version, row.version - 1),
      ),
    )
    .returning({ id: appeals.id });
  if (updated.length === 0) conflict("appeal version changed");
}

async function readAppeal(
  tx: DatabaseTransaction,
  appealId: string,
): Promise<ScopedAppeal> {
  const rows = await tx
    .select()
    .from(appeals)
    .where(eq(appeals.id, appealId))
    .limit(1);
  const saved = rows[0];
  if (saved === undefined) conflict("appeal was not persisted");
  return appealRowToState(saved);
}

async function saveAppealState(
  db: DatabaseExecutor,
  context: PersistenceContext,
  state: AppealState,
): Promise<ScopedAppeal> {
  return withContext(db, context, async (tx) => {
    const row = appealStateToRow({ scopeId: context.scopeId, state });
    await persistAppealRow(tx, row, new Date());
    return readAppeal(tx, row.id);
  });
}

async function findAppealState(
  db: DatabaseExecutor,
  context: PersistenceContext,
  appealId: string,
): Promise<ScopedAppeal | null> {
  return withContext(db, context, async (tx) => {
    const rows = await tx
      .select()
      .from(appeals)
      .where(
        and(
          eq(appeals.id, appealId),
          eq(appeals.participantId, context.participantId),
          eq(appeals.scopeId, context.scopeId),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row === undefined ? null : appealRowToState(row);
  });
}

export function createAppealPersistence(
  db: DatabaseExecutor,
): AppealPersistence {
  return {
    saveAppealState: (context, state) => saveAppealState(db, context, state),
    findAppealState: (context, appealId) =>
      findAppealState(db, context, appealId),
  };
}
