import { and, asc, eq } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  AppealReviewHistoryEvent,
  AppealReviewHistoryReadPort,
  AppealReviewHistoryReadResult,
} from "@cvg/application";

import { appealReviewHistory, appeals } from "./schema.js";
import type * as schema from "./schema.js";
import { setDatabaseAppealReviewContext } from "./security-context.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;
const MAX_HISTORY_EVENTS = 100;

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}

function assertLimit(limit: number): void {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_HISTORY_EVENTS) {
    throw new TypeError("limit must be between 1 and 100");
  }
}

function mapHistoryEvent(
  row: typeof appealReviewHistory.$inferSelect,
): AppealReviewHistoryEvent {
  return Object.freeze({
    historyId: row.id,
    appealId: row.appealId,
    appealVersion: row.appealVersion,
    eventType: row.eventType as AppealReviewHistoryEvent["eventType"],
    fromStatus: row.fromStatus as AppealReviewHistoryEvent["fromStatus"],
    toStatus: row.toStatus as AppealReviewHistoryEvent["toStatus"],
    ...(row.reviewerId === null ? {} : { reviewerId: row.reviewerId }),
    ...(row.decision === null
      ? {}
      : {
          decision: row.decision as NonNullable<
            AppealReviewHistoryEvent["decision"]
          >,
        }),
    ...(row.decisionRationale === null
      ? {}
      : { decisionRationale: row.decisionRationale }),
    ...(row.decisionAt === null
      ? {}
      : { decisionAt: row.decisionAt.toISOString() }),
    ...(row.decisionCorrelationId === null
      ? {}
      : { decisionCorrelationId: row.decisionCorrelationId }),
    createdAt: row.createdAt.toISOString(),
  });
}

export function createAppealReviewHistoryRepository(
  db: DatabaseExecutor,
): AppealReviewHistoryReadPort {
  return Object.freeze({
    getAppealReviewHistory: async (
      appealId: string,
      scopeIds: readonly string[],
      limit: number,
    ): Promise<AppealReviewHistoryReadResult> => {
      assertNonEmpty(appealId, "appealId");
      if (scopeIds.length === 0 || scopeIds.length > MAX_HISTORY_EVENTS) {
        throw new TypeError("scopeIds are invalid");
      }
      scopeIds.forEach((scopeId) => assertNonEmpty(scopeId, "scopeId"));
      assertLimit(limit);

      return db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        for (const scopeId of [...new Set(scopeIds)]) {
          await setDatabaseAppealReviewContext(executor, { scopeId });
          const appealRows = await executor
            .select({ id: appeals.id, scopeId: appeals.scopeId })
            .from(appeals)
            .where(and(eq(appeals.id, appealId), eq(appeals.scopeId, scopeId)))
            .limit(1);
          if (appealRows.length === 0) continue;

          const historyRows = await executor
            .select()
            .from(appealReviewHistory)
            .where(
              and(
                eq(appealReviewHistory.appealId, appealId),
                eq(appealReviewHistory.scopeId, scopeId),
              ),
            )
            .orderBy(
              asc(appealReviewHistory.appealVersion),
              asc(appealReviewHistory.createdAt),
              asc(appealReviewHistory.id),
            )
            .limit(limit);
          return Object.freeze({
            appealExists: true,
            scopeId,
            events: Object.freeze(
              historyRows.map((row) => mapHistoryEvent(row)),
            ),
          });
        }
        return Object.freeze({
          appealExists: false,
          scopeId: "",
          events: Object.freeze([] as AppealReviewHistoryEvent[]),
        });
      });
    },
  });
}
