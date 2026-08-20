import { and, eq } from "drizzle-orm";
import type { LearningAssignmentState } from "@cvg/domain";
import {
  learningAssignmentRowToState,
  learningAssignmentStateToRow,
} from "./learning-state-mappers.js";
import type {
  PersistenceContext,
  ScopedLearningAssignment,
} from "./learning-state-repository.js";
import {
  conflict,
  type DatabaseExecutor,
  type DatabaseTransaction,
  withContext,
} from "./learning-state-repository-support.js";
import { learningAssignments } from "./schema.js";

export type LearningAssignmentPersistence = Readonly<{
  readonly saveAssignment: (
    context: PersistenceContext,
    state: LearningAssignmentState,
  ) => Promise<ScopedLearningAssignment>;
  readonly findAssignment: (
    context: PersistenceContext,
    assignmentId: string,
  ) => Promise<ScopedLearningAssignment | null>;
}>;

async function persistAssignmentRow(
  tx: DatabaseTransaction,
  row: ReturnType<typeof learningAssignmentStateToRow>,
  now: Date,
): Promise<void> {
  if (row.version === 0) {
    const inserted = await tx
      .insert(learningAssignments)
      .values({ ...row, createdAt: now, updatedAt: now })
      .onConflictDoNothing()
      .returning({ id: learningAssignments.id });
    if (inserted.length === 0) conflict("learning assignment already exists");
    return;
  }
  const updated = await tx
    .update(learningAssignments)
    .set({ ...row, updatedAt: now })
    .where(
      and(
        eq(learningAssignments.id, row.id),
        eq(learningAssignments.participantId, row.participantId),
        eq(learningAssignments.scopeId, row.scopeId),
        eq(learningAssignments.version, row.version - 1),
      ),
    )
    .returning({ id: learningAssignments.id });
  if (updated.length === 0) conflict("learning assignment version changed");
}

async function readAssignment(
  tx: DatabaseTransaction,
  assignmentId: string,
  message: string,
): Promise<ScopedLearningAssignment> {
  const rows = await tx
    .select()
    .from(learningAssignments)
    .where(eq(learningAssignments.id, assignmentId))
    .limit(1);
  const saved = rows[0];
  if (saved === undefined) conflict(message);
  return learningAssignmentRowToState(saved);
}

async function saveAssignment(
  db: DatabaseExecutor,
  context: PersistenceContext,
  state: LearningAssignmentState,
): Promise<ScopedLearningAssignment> {
  return withContext(db, context, async (tx) => {
    const row = learningAssignmentStateToRow({
      scopeId: context.scopeId,
      state,
    });
    await persistAssignmentRow(tx, row, new Date());
    return readAssignment(tx, row.id, "learning assignment was not persisted");
  });
}

async function findAssignment(
  db: DatabaseExecutor,
  context: PersistenceContext,
  assignmentId: string,
): Promise<ScopedLearningAssignment | null> {
  return withContext(db, context, async (tx) => {
    const rows = await tx
      .select()
      .from(learningAssignments)
      .where(
        and(
          eq(learningAssignments.id, assignmentId),
          eq(learningAssignments.participantId, context.participantId),
          eq(learningAssignments.scopeId, context.scopeId),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row === undefined ? null : learningAssignmentRowToState(row);
  });
}

export function createLearningAssignmentPersistence(
  db: DatabaseExecutor,
): LearningAssignmentPersistence {
  return {
    saveAssignment: (context, state) => saveAssignment(db, context, state),
    findAssignment: (context, assignmentId) =>
      findAssignment(db, context, assignmentId),
  };
}
