import { and, desc, eq } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  AppealRecalculationCommand,
  AppealRecalculationTransactionContext,
  AppealRecalculationTransactionPort,
  AppealRecalculationTransactionalOperations,
} from "@cvg/application";
import { recalculateAppealResult } from "@cvg/application";
import type { AppealState, AssessmentResultState } from "@cvg/domain";

import {
  appealRowToState,
  appealStateToRow,
  LearningStatePersistenceConflictError,
  type AppealRowShape,
} from "./learning-state-repository.js";
import {
  assessmentResultRowToState,
  assessmentResultStateToRow,
  type AssessmentResultRowShape,
} from "./correction-repository.js";
import { appeals, assessmentResults } from "./schema.js";
import type * as schema from "./schema.js";
import { appendAppealReviewHistory } from "./appeal-review-history.js";
import { setDatabaseAppealReviewContext } from "./security-context.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

const appealReviewColumns = {
  id: appeals.id,
  participantId: appeals.participantId,
  scopeId: appeals.scopeId,
  attemptId: appeals.attemptId,
  itemId: appeals.itemId,
  justification: appeals.justification,
  createdAt: appeals.createdAt,
  dueAt: appeals.dueAt,
  version: appeals.version,
  status: appeals.status,
  reviewerId: appeals.reviewerId,
  decision: appeals.decision,
  decisionRationale: appeals.decisionRationale,
  decisionAt: appeals.decisionAt,
  decisionCorrelationId: appeals.decisionCorrelationId,
  updatedAt: appeals.updatedAt,
} as const;

async function findScopedAppeal(
  executor: DatabaseExecutor,
  scopeId: string,
  appealId: string,
): Promise<{ readonly scopeId: string; readonly state: AppealState } | null> {
  const rows = await executor
    .select(appealReviewColumns)
    .from(appeals)
    .where(and(eq(appeals.id, appealId), eq(appeals.scopeId, scopeId)))
    .limit(1);
  const row = rows[0] as AppealRowShape | undefined;
  return row === undefined ? null : appealRowToState(row);
}

async function setContext(
  executor: DatabaseExecutor,
  context: AppealRecalculationTransactionContext,
): Promise<void> {
  await setDatabaseAppealReviewContext(executor, context);
}

async function findLatestResult(
  executor: DatabaseExecutor,
  attemptId: string,
): Promise<AssessmentResultState | null> {
  const rows = await executor
    .select({
      id: assessmentResults.id,
      attemptId: assessmentResults.attemptId,
      version: assessmentResults.version,
      kind: assessmentResults.kind,
      score: assessmentResults.score,
      outcome: assessmentResults.outcome,
      feedback: assessmentResults.feedback,
      ruleVersion: assessmentResults.ruleVersion,
      correctedBy: assessmentResults.correctedBy,
      correctedAt: assessmentResults.correctedAt,
    })
    .from(assessmentResults)
    .where(eq(assessmentResults.attemptId, attemptId))
    .orderBy(desc(assessmentResults.version))
    .limit(1);
  const row = rows[0] as AssessmentResultRowShape | undefined;
  return row === undefined ? null : assessmentResultRowToState(row);
}

function operations(
  executor: DatabaseExecutor,
): AppealRecalculationTransactionalOperations {
  return {
    findAppeal: async (context, appealId) => {
      await setContext(executor, context);
      const scoped = await findScopedAppeal(
        executor,
        context.scopeId,
        appealId,
      );
      return scoped?.state ?? null;
    },
    findLatestResult: (attemptId) => findLatestResult(executor, attemptId),
    insertResult: async (result) => {
      await executor
        .insert(assessmentResults)
        .values(assessmentResultStateToRow(result));
    },
    saveAppeal: async (context, state) => {
      await setContext(executor, context);
      const row = appealStateToRow({ scopeId: context.scopeId, state });
      const previous = await findScopedAppeal(
        executor,
        context.scopeId,
        row.id,
      );
      if (previous === null) {
        throw new LearningStatePersistenceConflictError(
          "appeal recalculation was not found before closure",
        );
      }
      const occurredAt = new Date();
      const updated = await executor
        .update(appeals)
        .set({
          status: row.status,
          version: row.version,
          reviewerId: row.reviewerId,
          decision: row.decision,
          decisionRationale: row.decisionRationale,
          decisionAt: row.decisionAt,
          decisionCorrelationId: row.decisionCorrelationId,
          updatedAt: occurredAt,
        })
        .where(
          and(
            eq(appeals.id, row.id),
            eq(appeals.scopeId, row.scopeId),
            eq(appeals.version, row.version - 1),
          ),
        )
        .returning({ id: appeals.id });
      if (updated.length === 0) {
        throw new LearningStatePersistenceConflictError(
          "appeal recalculation version changed",
        );
      }
      const saved = await findScopedAppeal(executor, context.scopeId, row.id);
      if (saved === null) {
        throw new LearningStatePersistenceConflictError(
          "appeal recalculation was not persisted",
        );
      }
      await appendAppealReviewHistory(executor, {
        scopeId: context.scopeId,
        previous: previous.state,
        next: saved.state,
        createdAt: occurredAt,
      });
      return saved.state;
    },
  };
}

export function createAppealRecalculationRepository(
  db: DatabaseExecutor,
): AppealRecalculationTransactionPort {
  return Object.freeze({
    run: async <Result>(
      work: (
        current: AppealRecalculationTransactionalOperations,
      ) => Promise<Result>,
    ): Promise<Result> =>
      db.transaction(async (transaction) =>
        work(operations(transaction as unknown as DatabaseExecutor)),
      ),
  });
}

export function createAppealRecalculationProcessor(
  db: DatabaseExecutor,
): (command: AppealRecalculationCommand) => Promise<unknown> {
  const repository = createAppealRecalculationRepository(db);
  return (command) => recalculateAppealResult(command, repository);
}
