import { and, asc, eq, inArray } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { AppealReviewQueueReadPort } from "@cvg/application";
import type { AppealStatus } from "@cvg/domain";

import {
  appealRowToState,
  type AppealRowShape,
} from "./learning-state-repository.js";
import { appeals } from "./schema.js";
import type * as schema from "./schema.js";
import { setDatabaseAppealReviewContext } from "./security-context.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

const queueStatuses: readonly AppealStatus[] = [
  "ABERTA",
  "EM_REVISAO",
  "DECIDIDA",
  "RECALCULO_PENDENTE",
];
const allStatuses: readonly AppealStatus[] = [...queueStatuses, "ENCERRADA"];

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}

function assertQuery(
  query: Parameters<AppealReviewQueueReadPort["listAppeals"]>[0],
): void {
  assertNonEmpty(query.scopeId, "scopeId");
  if (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > 100) {
    throw new TypeError("limit must be between 1 and 100");
  }
  if (
    query.status !== undefined &&
    !allStatuses.includes(query.status as AppealStatus)
  ) {
    throw new TypeError("status is invalid");
  }
}

export function createAppealReviewQueueRepository(
  db: DatabaseExecutor,
): AppealReviewQueueReadPort {
  return Object.freeze({
    listAppeals: async (
      query: Parameters<AppealReviewQueueReadPort["listAppeals"]>[0],
    ) => {
      assertQuery(query);
      return db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseAppealReviewContext(executor, {
          scopeId: query.scopeId,
        });
        const statusPredicate =
          query.status === undefined
            ? inArray(appeals.status, queueStatuses)
            : eq(appeals.status, query.status);
        const rows = await executor
          .select({
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
          })
          .from(appeals)
          .where(and(eq(appeals.scopeId, query.scopeId), statusPredicate))
          .orderBy(asc(appeals.dueAt), asc(appeals.createdAt), asc(appeals.id))
          .limit(query.limit);
        return Object.freeze(
          (rows as readonly AppealRowShape[]).map((row) =>
            appealRowToState(row),
          ),
        );
      });
    },
  });
}
