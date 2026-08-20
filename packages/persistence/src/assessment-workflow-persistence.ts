import { and, eq } from "drizzle-orm";
import type { AssessmentWorkflowState } from "@cvg/domain";
import {
  assessmentWorkflowRowToState,
  assessmentWorkflowStateToRow,
} from "./learning-state-mappers.js";
import type {
  PersistenceContext,
  ScopedAssessmentWorkflow,
} from "./learning-state-repository.js";
import {
  conflict,
  type DatabaseExecutor,
  type DatabaseTransaction,
  withContext,
} from "./learning-state-repository-support.js";
import { assessmentWorkflows } from "./schema.js";

export type AssessmentWorkflowPersistence = Readonly<{
  readonly saveWorkflow: (
    context: PersistenceContext,
    state: AssessmentWorkflowState,
  ) => Promise<ScopedAssessmentWorkflow>;
  readonly findWorkflow: (
    context: PersistenceContext,
    resultId: string,
  ) => Promise<ScopedAssessmentWorkflow | null>;
}>;

async function persistWorkflowRow(
  tx: DatabaseTransaction,
  row: ReturnType<typeof assessmentWorkflowStateToRow>,
  now: Date,
): Promise<void> {
  if (row.version === 0) {
    const inserted = await tx
      .insert(assessmentWorkflows)
      .values({ ...row, createdAt: now, updatedAt: now })
      .onConflictDoNothing()
      .returning({ id: assessmentWorkflows.resultId });
    if (inserted.length === 0) conflict("assessment workflow already exists");
    return;
  }
  const updated = await tx
    .update(assessmentWorkflows)
    .set({ ...row, updatedAt: now })
    .where(
      and(
        eq(assessmentWorkflows.resultId, row.resultId),
        eq(assessmentWorkflows.participantId, row.participantId),
        eq(assessmentWorkflows.scopeId, row.scopeId),
        eq(assessmentWorkflows.version, row.version - 1),
      ),
    )
    .returning({ id: assessmentWorkflows.resultId });
  if (updated.length === 0) conflict("assessment workflow version changed");
}

async function readWorkflow(
  tx: DatabaseTransaction,
  resultId: string,
): Promise<ScopedAssessmentWorkflow> {
  const rows = await tx
    .select()
    .from(assessmentWorkflows)
    .where(eq(assessmentWorkflows.resultId, resultId))
    .limit(1);
  const saved = rows[0];
  if (saved === undefined) conflict("assessment workflow was not persisted");
  return assessmentWorkflowRowToState(saved);
}

async function saveWorkflow(
  db: DatabaseExecutor,
  context: PersistenceContext,
  state: AssessmentWorkflowState,
): Promise<ScopedAssessmentWorkflow> {
  return withContext(db, context, async (tx) => {
    const row = assessmentWorkflowStateToRow({
      scopeId: context.scopeId,
      participantId: context.participantId,
      state,
    });
    await persistWorkflowRow(tx, row, new Date());
    return readWorkflow(tx, row.resultId);
  });
}

async function findWorkflow(
  db: DatabaseExecutor,
  context: PersistenceContext,
  resultId: string,
): Promise<ScopedAssessmentWorkflow | null> {
  return withContext(db, context, async (tx) => {
    const rows = await tx
      .select()
      .from(assessmentWorkflows)
      .where(
        and(
          eq(assessmentWorkflows.resultId, resultId),
          eq(assessmentWorkflows.participantId, context.participantId),
          eq(assessmentWorkflows.scopeId, context.scopeId),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row === undefined ? null : assessmentWorkflowRowToState(row);
  });
}

export function createAssessmentWorkflowPersistence(
  db: DatabaseExecutor,
): AssessmentWorkflowPersistence {
  return {
    saveWorkflow: (context, state) => saveWorkflow(db, context, state),
    findWorkflow: (context, resultId) => findWorkflow(db, context, resultId),
  };
}
