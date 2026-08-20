import { and, desc, eq, sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  createAssessmentResult,
  type AssessmentResultState,
  type AttemptState,
} from "@cvg/domain";
import type {
  CorrectionIdempotencyRecord,
  CorrectionResult,
  CorrectionTransactionalOperations,
  CorrectionUseCaseDependencies,
  FeedbackReadPort,
  TransactionSecurityContext,
} from "@cvg/application";

import {
  attemptRowToState,
  createOutboxInsert,
  PersistenceConflictError,
  isUniqueConstraintViolation,
} from "./attempt-repository.js";
import { createAuditRepository } from "./audit-repository.js";
import { createClinicalApproverPort } from "./clinical-approver-repository.js";
import {
  assertIdempotencyKey,
  lockIdempotencyKey,
} from "./idempotency-policy.js";
import {
  assessmentIdempotency,
  assessmentResults,
  attempts,
  outboxEvents,
} from "./schema.js";
import type * as schema from "./schema.js";
import type { PersistedCorrectionSnapshot } from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";

export class AssessmentMappingError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AssessmentMappingError";
  }
}

export type AssessmentResultRowShape = Readonly<{
  readonly id: string;
  readonly attemptId: string;
  readonly version: number;
  readonly kind: string;
  readonly score: number;
  readonly outcome: string;
  readonly feedback: string;
  readonly ruleVersion: string;
  readonly correctedBy: string;
  readonly correctedAt: Date | string;
}>;

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new AssessmentMappingError(`${field} must not be empty`);
  }
}

function dateToIso(value: Date | string, field: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AssessmentMappingError(`${field} must be a valid timestamp`);
  }
  return date.toISOString();
}

export function assessmentResultRowToState(
  row: AssessmentResultRowShape,
): AssessmentResultState {
  assertNonEmpty(row.id, "id");
  assertNonEmpty(row.attemptId, "attemptId");
  try {
    return createAssessmentResult({
      resultId: row.id,
      attemptId: row.attemptId,
      version: row.version,
      kind: row.kind as AssessmentResultState["kind"],
      score: row.score,
      outcome: row.outcome as AssessmentResultState["outcome"],
      feedback: row.feedback,
      ruleVersion: row.ruleVersion,
      correctedBy: row.correctedBy,
      correctedAt: dateToIso(row.correctedAt, "correctedAt"),
    });
  } catch (error) {
    throw new AssessmentMappingError(
      error instanceof Error ? error.message : "assessment result is invalid",
    );
  }
}

export function assessmentResultStateToRow(state: AssessmentResultState) {
  const result = assessmentResultRowToState({
    id: state.resultId,
    attemptId: state.attemptId,
    version: state.version,
    kind: state.kind,
    score: state.score,
    outcome: state.outcome,
    feedback: state.feedback,
    ruleVersion: state.ruleVersion,
    correctedBy: state.correctedBy,
    correctedAt: state.correctedAt,
  });
  return {
    id: result.resultId,
    attemptId: result.attemptId,
    version: result.version,
    kind: result.kind,
    score: result.score,
    outcome: result.outcome,
    feedback: result.feedback,
    ruleVersion: result.ruleVersion,
    correctedBy: result.correctedBy,
    correctedAt: new Date(result.correctedAt),
  } satisfies typeof assessmentResults.$inferInsert;
}

function objectRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new AssessmentMappingError("assessment snapshot must be an object");
  }
  return Object.fromEntries(Object.entries(value));
}

function snapshotToResult(value: unknown): AssessmentResultState {
  const record = objectRecord(value);
  return assessmentResultRowToState({
    id: String(record.resultId ?? ""),
    attemptId: String(record.attemptId ?? ""),
    version: Number(record.version),
    kind: String(record.kind ?? ""),
    score: Number(record.score),
    outcome: String(record.outcome ?? ""),
    feedback: String(record.feedback ?? ""),
    ruleVersion: String(record.ruleVersion ?? ""),
    correctedBy: String(record.correctedBy ?? ""),
    correctedAt: String(record.correctedAt ?? ""),
  });
}

function snapshotToAttempt(value: unknown): AttemptState {
  const record = objectRecord(value);
  try {
    return attemptRowToState({
      id: String(record.attemptId ?? ""),
      participantId: String(record.participantId ?? ""),
      activityId: String(record.activityId ?? ""),
      status: String(record.status ?? ""),
      version: Number(record.version),
      submittedAt:
        record.submittedAt === undefined || record.submittedAt === null
          ? null
          : new Date(String(record.submittedAt)),
    });
  } catch (error) {
    throw new AssessmentMappingError(
      error instanceof Error ? error.message : "attempt snapshot is invalid",
    );
  }
}

export function assessmentIdempotencyRowToRecord(
  value: unknown,
): CorrectionIdempotencyRecord {
  const row = objectRecord(value);
  const fingerprint = row.fingerprint;
  if (typeof fingerprint !== "string" || fingerprint.trim().length === 0) {
    throw new AssessmentMappingError("fingerprint must be non-empty");
  }
  const response = objectRecord(row.response);
  return Object.freeze({
    fingerprint,
    result: Object.freeze({
      attempt: snapshotToAttempt(response.attempt),
      result: snapshotToResult(response.result),
    }),
  });
}

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

function createCorrectionAttempts(
  executor: DatabaseExecutor,
): CorrectionTransactionalOperations["attempts"] {
  return Object.freeze({
    findById: async (attemptId: string): Promise<AttemptState | null> => {
      const rows = await executor
        .select({
          id: attempts.id,
          participantId: attempts.participantId,
          activityId: attempts.activityId,
          status: attempts.status,
          version: attempts.version,
          submittedAt: attempts.submittedAt,
        })
        .from(attempts)
        .where(eq(attempts.id, attemptId))
        .limit(1);
      const row = rows[0];
      return row === undefined ? null : attemptRowToState(row);
    },
    update: async (state: AttemptState): Promise<void> => {
      const rows = await executor
        .update(attempts)
        .set({
          status: state.status,
          version: state.version,
          submittedAt: state.submittedAt ? new Date(state.submittedAt) : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(attempts.id, state.attemptId),
            eq(attempts.version, state.version - 1),
          ),
        )
        .returning({ id: attempts.id });
      if (rows.length === 0) {
        throw new PersistenceConflictError(
          "attempt version changed concurrently",
        );
      }
    },
  });
}

function createCorrectionResults(
  executor: DatabaseExecutor,
): CorrectionTransactionalOperations["results"] {
  return Object.freeze({
    findLatest: async (
      attemptId: string,
    ): Promise<AssessmentResultState | null> => {
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
      const row = rows[0];
      return row === undefined ? null : assessmentResultRowToState(row);
    },
    insert: async (result: AssessmentResultState): Promise<void> => {
      await executor
        .insert(assessmentResults)
        .values(assessmentResultStateToRow(result));
    },
  });
}

function createCorrectionIdempotency(
  executor: DatabaseExecutor,
): CorrectionTransactionalOperations["idempotency"] {
  return Object.freeze({
    find: async (key: string): Promise<CorrectionIdempotencyRecord | null> => {
      assertIdempotencyKey(key);
      await lockIdempotencyKey(executor, "correction", key);
      const rows = await executor
        .select({
          fingerprint: assessmentIdempotency.fingerprint,
          response: assessmentIdempotency.response,
        })
        .from(assessmentIdempotency)
        .where(
          and(
            eq(assessmentIdempotency.key, key),
            sql`${assessmentIdempotency.expiresAt} > CURRENT_TIMESTAMP`,
          ),
        )
        .limit(1);
      const row = rows[0];
      return row === undefined ? null : assessmentIdempotencyRowToRecord(row);
    },
    store: async (
      key: string,
      record: CorrectionIdempotencyRecord,
    ): Promise<void> => {
      assertIdempotencyKey(key);
      await lockIdempotencyKey(executor, "correction", key);
      await executor.execute(
        sql`delete from "assessment_idempotency" where "expires_at" <= CURRENT_TIMESTAMP`,
      );
      const existing = await executor
        .select({ fingerprint: assessmentIdempotency.fingerprint })
        .from(assessmentIdempotency)
        .where(eq(assessmentIdempotency.key, key))
        .limit(1);
      if (existing[0] && existing[0].fingerprint !== record.fingerprint) {
        throw new PersistenceConflictError(
          "idempotency key has another fingerprint",
        );
      }
      if (existing[0]) return;

      try {
        await executor.insert(assessmentIdempotency).values({
          key,
          operation: "correction",
          fingerprint: record.fingerprint,
          attemptId: record.result.attempt.attemptId,
          response: record.result as PersistedCorrectionSnapshot,
        });
      } catch (error) {
        if (!isUniqueConstraintViolation(error)) throw error;
        throw new PersistenceConflictError(
          "idempotency key was created concurrently",
        );
      }
    },
  });
}

function createCorrectionEventPublisher(
  executor: DatabaseExecutor,
): CorrectionTransactionalOperations["eventPublisher"] {
  return Object.freeze({
    publish: async (
      event: Parameters<
        CorrectionUseCaseDependencies["eventPublisher"]["publish"]
      >[0],
    ): Promise<void> => {
      await executor.insert(outboxEvents).values(createOutboxInsert(event));
    },
  });
}

export function createCorrectionOperationsMethods(
  executor: DatabaseExecutor,
): CorrectionTransactionalOperations {
  return Object.freeze({
    attempts: createCorrectionAttempts(executor),
    results: createCorrectionResults(executor),
    idempotency: createCorrectionIdempotency(executor),
    eventPublisher: createCorrectionEventPublisher(executor),
    audit: createAuditRepository(executor),
    approver: createClinicalApproverPort(executor),
  });
}

export function createCorrectionUseCaseDependencies(
  db: DatabaseExecutor,
  idFactory: () => string,
): CorrectionUseCaseDependencies {
  const operations = (executor: DatabaseExecutor) =>
    createCorrectionOperationsMethods(executor);

  return Object.freeze({
    idFactory,
    ...operations(db),
    transaction: {
      run: async <Result>(
        work: (current: ReturnType<typeof operations>) => Promise<Result>,
        context?: TransactionSecurityContext,
      ): Promise<Result> =>
        db.transaction(async (transaction) => {
          const executor = transaction;
          if (context !== undefined) {
            await setDatabaseSecurityContext(executor, context);
          }
          return work(operations(executor));
        }),
    },
  });
}
export function createCorrectionReadRepository(
  db: DatabaseExecutor,
): FeedbackReadPort {
  const repository: FeedbackReadPort = {
    findByParticipantAndAttempt: async (
      participantId: string,
      attemptId: string,
    ): Promise<CorrectionResult | null> => {
      return db.transaction(async (transaction) => {
        const executor = transaction;
        await setDatabaseSecurityContext(executor, { participantId });
        const rows = await executor
          .select({
            attemptId: attempts.id,
            participantId: attempts.participantId,
            activityId: attempts.activityId,
            attemptStatus: attempts.status,
            attemptVersion: attempts.version,
            submittedAt: attempts.submittedAt,
            resultId: assessmentResults.id,
            resultAttemptId: assessmentResults.attemptId,
            resultVersion: assessmentResults.version,
            resultKind: assessmentResults.kind,
            resultScore: assessmentResults.score,
            resultOutcome: assessmentResults.outcome,
            resultFeedback: assessmentResults.feedback,
            resultRuleVersion: assessmentResults.ruleVersion,
            resultCorrectedBy: assessmentResults.correctedBy,
            resultCorrectedAt: assessmentResults.correctedAt,
          })
          .from(attempts)
          .leftJoin(
            assessmentResults,
            eq(assessmentResults.attemptId, attempts.id),
          )
          .where(
            and(
              eq(attempts.id, attemptId),
              eq(attempts.participantId, participantId),
            ),
          )
          .orderBy(desc(assessmentResults.version))
          .limit(1);
        const row = rows[0];
        if (row === undefined || row.resultId === null) return null;

        const attempt = attemptRowToState({
          id: row.attemptId,
          participantId: row.participantId,
          activityId: row.activityId,
          status: row.attemptStatus,
          version: row.attemptVersion,
          submittedAt: row.submittedAt,
        });
        const result = assessmentResultRowToState({
          id: row.resultId,
          attemptId: row.resultAttemptId as string,
          version: row.resultVersion as number,
          kind: row.resultKind as string,
          score: row.resultScore as number,
          outcome: row.resultOutcome as string,
          feedback: row.resultFeedback as string,
          ruleVersion: row.resultRuleVersion as string,
          correctedBy: row.resultCorrectedBy as string,
          correctedAt: row.resultCorrectedAt as Date,
        });
        return Object.freeze({ attempt, result });
      });
    },
  };
  return Object.freeze(repository);
}
