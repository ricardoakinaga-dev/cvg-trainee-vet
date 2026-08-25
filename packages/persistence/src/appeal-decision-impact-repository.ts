import { and, desc, eq, sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  AppealDecisionImpactReadPort,
  AppealDecisionImpactReadResult,
} from "@cvg/application";

import {
  appealRowToState,
  type AppealRowShape,
} from "./learning-state-repository.js";
import {
  attemptRowToState,
  type AttemptRowShape,
} from "./attempt-repository.js";
import {
  assessmentResults,
  appeals,
  attempts,
  learningActivities,
} from "./schema.js";
import type * as schema from "./schema.js";
import { setDatabaseAppealReviewContext } from "./security-context.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

function assertNonEmpty(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}

function assertQuery(
  appealId: string,
  scopeIds: readonly string[],
  decision: string,
): void {
  assertNonEmpty(appealId, "appealId");
  if (
    !Array.isArray(scopeIds) ||
    scopeIds.length === 0 ||
    scopeIds.length > 100
  ) {
    throw new TypeError("scopeIds are invalid");
  }
  scopeIds.forEach((scopeId) => assertNonEmpty(scopeId, "scopeId"));
  if (decision !== "ANULAR_ITEM") {
    throw new TypeError("decision is invalid");
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
  decisionRationale: appeals.decisionRationale,
  decisionAt: appeals.decisionAt,
  decisionCorrelationId: appeals.decisionCorrelationId,
  updatedAt: appeals.updatedAt,
} as const;

export function createAppealDecisionImpactRepository(
  db: DatabaseExecutor,
): AppealDecisionImpactReadPort {
  return Object.freeze({
    getAppealDecisionImpact: async (
      appealId: string,
      scopeIds: readonly string[],
      decision: "ANULAR_ITEM",
    ): Promise<AppealDecisionImpactReadResult> => {
      assertQuery(appealId, scopeIds, decision);

      return db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await executor.execute(
          sql`set transaction isolation level repeatable read`,
        );
        for (const scopeId of [...new Set(scopeIds)]) {
          await setDatabaseAppealReviewContext(executor, { scopeId });
          const appealRows = await executor
            .select(appealReviewColumns)
            .from(appeals)
            .where(and(eq(appeals.id, appealId), eq(appeals.scopeId, scopeId)))
            .limit(1);
          const appealRow = appealRows[0] as AppealRowShape | undefined;
          if (appealRow === undefined) continue;

          const scopedAppeal = appealRowToState(appealRow);
          const attemptRows = await executor
            .select({
              id: attempts.id,
              participantId: attempts.participantId,
              activityId: attempts.activityId,
              status: attempts.status,
              version: attempts.version,
              submittedAt: attempts.submittedAt,
            })
            .from(attempts)
            .innerJoin(
              learningActivities,
              eq(attempts.activityId, learningActivities.id),
            )
            .where(
              and(
                eq(attempts.id, scopedAppeal.state.attemptId),
                eq(learningActivities.scopeId, scopeId),
              ),
            )
            .limit(1);
          const attemptRow = attemptRows[0] as AttemptRowShape | undefined;
          const attempt =
            attemptRow === undefined ? null : attemptRowToState(attemptRow);

          const latestResult =
            attempt === null
              ? null
              : await (async () => {
                  const resultRows = await executor
                    .select({
                      resultId: assessmentResults.id,
                      attemptId: assessmentResults.attemptId,
                      version: assessmentResults.version,
                    })
                    .from(assessmentResults)
                    .innerJoin(
                      attempts,
                      eq(assessmentResults.attemptId, attempts.id),
                    )
                    .innerJoin(
                      learningActivities,
                      eq(attempts.activityId, learningActivities.id),
                    )
                    .where(
                      and(
                        eq(
                          assessmentResults.attemptId,
                          scopedAppeal.state.attemptId,
                        ),
                        eq(learningActivities.scopeId, scopeId),
                      ),
                    )
                    .orderBy(desc(assessmentResults.version))
                    .limit(1);
                  return resultRows[0]
                    ? Object.freeze({
                        resultId: resultRows[0].resultId,
                        attemptId: resultRows[0].attemptId,
                        version: resultRows[0].version,
                      })
                    : null;
                })();

          return Object.freeze({
            appealExists: true as const,
            scopeId,
            appeal: scopedAppeal.state,
            attempt,
            latestResult,
          });
        }

        return Object.freeze({
          appealExists: false as const,
          scopeId: "",
          appeal: null,
          attempt: null,
          latestResult: null,
        });
      });
    },
  });
}
