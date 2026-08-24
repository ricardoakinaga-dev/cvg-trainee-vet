import { and, eq } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  AppealReviewTransitionContext,
  AppealReviewTransitionRepositoryPort,
} from "@cvg/application";

import {
  appealRowToState,
  appealStateToRow,
  LearningStatePersistenceConflictError,
  type AppealRowShape,
} from "./learning-state-repository.js";
import { appeals } from "./schema.js";
import type * as schema from "./schema.js";
import { setDatabaseAppealReviewContext } from "./security-context.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

function assertScopeId(scopeId: string): void {
  if (scopeId.trim().length === 0) {
    throw new TypeError("scopeId must not be empty");
  }
}

function assertAppealId(appealId: string): void {
  if (appealId.trim().length === 0) {
    throw new TypeError("appealId must not be empty");
  }
}

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
  updatedAt: appeals.updatedAt,
} as const;

async function findScopedAppeal(
  executor: DatabaseExecutor,
  scopeId: string,
  appealId: string,
): Promise<ReturnType<typeof appealRowToState> | null> {
  const rows = await executor
    .select(appealReviewColumns)
    .from(appeals)
    .where(and(eq(appeals.id, appealId), eq(appeals.scopeId, scopeId)))
    .limit(1);
  const row = rows[0] as AppealRowShape | undefined;
  return row === undefined ? null : appealRowToState(row);
}

async function withReviewContext<T>(
  db: DatabaseExecutor,
  scopeId: string,
  action: (executor: DatabaseExecutor) => Promise<T>,
): Promise<T> {
  assertScopeId(scopeId);
  return db.transaction(async (transaction) => {
    const executor = transaction as unknown as DatabaseExecutor;
    await setDatabaseAppealReviewContext(executor, { scopeId });
    return action(executor);
  });
}

export function createAppealReviewTransitionRepository(
  db: DatabaseExecutor,
): AppealReviewTransitionRepositoryPort {
  return Object.freeze({
    findAppealForReview: async (
      context: AppealReviewTransitionContext,
      appealId: string,
    ) => {
      assertScopeId(context.scopeId);
      assertAppealId(appealId);
      return withReviewContext(db, context.scopeId, async (executor) =>
        findScopedAppeal(executor, context.scopeId, appealId),
      );
    },
    saveAppealForReview: async (
      context: AppealReviewTransitionContext,
      state: Parameters<
        AppealReviewTransitionRepositoryPort["saveAppealForReview"]
      >[1],
    ) => {
      assertScopeId(context.scopeId);
      const row = appealStateToRow({ scopeId: context.scopeId, state });
      if (row.version < 1) {
        throw new TypeError("appeal review transition requires version >= 1");
      }
      return withReviewContext(db, context.scopeId, async (executor) => {
        const updated = await executor
          .update(appeals)
          .set({
            status: row.status,
            version: row.version,
            reviewerId: row.reviewerId,
            decision: row.decision,
            updatedAt: new Date(),
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
            "appeal review version changed",
          );
        }
        const saved = await findScopedAppeal(executor, context.scopeId, row.id);
        if (saved === null) {
          throw new LearningStatePersistenceConflictError(
            "appeal review was not persisted",
          );
        }
        return saved;
      });
    },
  });
}
