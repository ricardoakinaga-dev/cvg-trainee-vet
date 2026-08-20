import { and, eq } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  AnswerIdempotencyRecord,
  AnswerTransactionalOperations,
  AnswerUseCaseDependencies,
  TransactionSecurityContext,
} from "@cvg/application";
import {
  AnswerDomainError,
  createAnswer,
  type AnswerState,
  type AttemptState,
} from "@cvg/domain";

import {
  createOutboxInsert,
  PersistenceConflictError,
  PersistenceMappingError,
  isUniqueConstraintViolation,
} from "./attempt-repository.js";
import { createAuditRepository } from "./audit-repository.js";
import type {
  PersistedAnswerSnapshot,
  PersistedAttemptSnapshot,
} from "./schema.js";
import {
  answerIdempotency,
  answers,
  attempts,
  outboxEvents,
} from "./schema.js";
import type * as schema from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";

export { PersistenceMappingError } from "./attempt-repository.js";

export type AnswerRowShape = Readonly<{
  readonly id: string;
  readonly attemptId: string;
  readonly itemId: string;
  readonly response: string;
  readonly savedAt: Date;
}>;

export type AnswerInsertRow = Readonly<{
  readonly id: string;
  readonly attemptId: string;
  readonly itemId: string;
  readonly response: string;
  readonly savedAt: Date;
}>;

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new PersistenceMappingError(`${field} must not be empty`);
  }
}

function assertTimestamp(value: Date, field: string): void {
  if (Number.isNaN(value.getTime())) {
    throw new PersistenceMappingError(`${field} must be a valid timestamp`);
  }
}

export function answerStateToRow(state: AnswerState): AnswerInsertRow {
  assertNonEmpty(state.answerId, "answerId");
  assertNonEmpty(state.attemptId, "attemptId");
  assertNonEmpty(state.itemId, "itemId");
  assertNonEmpty(state.response, "response");
  const savedAt = new Date(state.savedAt);
  assertTimestamp(savedAt, "savedAt");
  try {
    createAnswer({ ...state });
  } catch (error) {
    if (error instanceof AnswerDomainError) {
      throw new PersistenceMappingError(error.message);
    }
    throw error;
  }

  return {
    id: state.answerId,
    attemptId: state.attemptId,
    itemId: state.itemId,
    response: state.response,
    savedAt,
  };
}

export function answerRowToState(row: AnswerRowShape): AnswerState {
  assertNonEmpty(row.id, "id");
  assertNonEmpty(row.attemptId, "attemptId");
  assertNonEmpty(row.itemId, "itemId");
  assertTimestamp(row.savedAt, "savedAt");
  try {
    return createAnswer({
      answerId: row.id,
      attemptId: row.attemptId,
      itemId: row.itemId,
      response: row.response,
      savedAt: row.savedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof AnswerDomainError) {
      throw new PersistenceMappingError(error.message);
    }
    throw error;
  }
}

function readRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new PersistenceMappingError("JSON snapshot must be an object");
  }
  return Object.fromEntries(Object.entries(value));
}

function readString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== "string") {
    throw new PersistenceMappingError(`${field} must be a string`);
  }
  assertNonEmpty(value, field);
  return value;
}

function readNumber(record: Record<string, unknown>, field: string): number {
  const value = record[field];
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new PersistenceMappingError(`${field} must be an integer`);
  }
  return value;
}

function attemptSnapshotToState(value: unknown): AttemptState {
  const record = readRecord(value);
  const submittedAt = record.submittedAt;
  if (submittedAt !== undefined && typeof submittedAt !== "string") {
    throw new PersistenceMappingError("submittedAt must be a string");
  }
  const status = readString(record, "status");
  const supportedStatuses = [
    "CRIADA",
    "EM_ANDAMENTO",
    "SALVA",
    "SUBMETIDA",
    "CORRIGIDA_AUTOMATICAMENTE",
    "AGUARDA_CORRECAO_HUMANA",
    "CORRIGIDA_HUMANAMENTE",
    "ANULADA",
  ] as const;
  if (
    !supportedStatuses.includes(status as (typeof supportedStatuses)[number])
  ) {
    throw new PersistenceMappingError("status is not supported");
  }
  return {
    attemptId: readString(record, "attemptId"),
    participantId: readString(record, "participantId"),
    activityId: readString(record, "activityId"),
    status: status as AttemptState["status"],
    version: readNumber(record, "version"),
    ...(submittedAt !== undefined ? { submittedAt } : {}),
  };
}

function answerSnapshotToState(value: unknown): AnswerState {
  const record = readRecord(value);
  return createAnswer({
    answerId: readString(record, "answerId"),
    attemptId: readString(record, "attemptId"),
    itemId: readString(record, "itemId"),
    response: readString(record, "response"),
    savedAt: readString(record, "savedAt"),
  });
}

export function answerIdempotencyRowToRecord(row: {
  readonly fingerprint: string;
  readonly response: unknown;
}): AnswerIdempotencyRecord {
  assertNonEmpty(row.fingerprint, "fingerprint");
  const snapshot = readRecord(row.response);
  const result = Object.freeze({
    attempt: attemptSnapshotToState(snapshot.attempt),
    answer: answerSnapshotToState(snapshot.answer),
  });
  return Object.freeze({ fingerprint: row.fingerprint, result });
}

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

async function insertAnswerIdempotency(
  db: DatabaseExecutor,
  key: string,
  record: AnswerIdempotencyRecord,
  response: PersistedAnswerSnapshot,
): Promise<void> {
  try {
    await db.insert(answerIdempotency).values({
      key,
      operation: "answer",
      fingerprint: record.fingerprint,
      attemptId: record.result.attempt.attemptId,
      answerId: record.result.answer.answerId,
      response,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  } catch (error) {
    if (!isUniqueConstraintViolation(error)) throw error;
    throw new PersistenceConflictError(
      "idempotency key was created concurrently",
    );
  }
}

function createAnswersPort(
  db: DatabaseExecutor,
): AnswerTransactionalOperations["answersPort"] {
  return Object.freeze({
    findByAttemptAndItem: async (
      attemptId: string,
      itemId: string,
    ): Promise<AnswerState | null> => {
      const rows = await db
        .select({
          id: answers.id,
          attemptId: answers.attemptId,
          itemId: answers.itemId,
          response: answers.response,
          savedAt: answers.savedAt,
        })
        .from(answers)
        .where(
          and(eq(answers.attemptId, attemptId), eq(answers.itemId, itemId)),
        )
        .limit(1);
      const row = rows[0];
      return row ? answerRowToState(row) : null;
    },
    save: async (answer: AnswerState): Promise<void> => {
      await db
        .insert(answers)
        .values(answerStateToRow(answer))
        .onConflictDoUpdate({
          target: [answers.attemptId, answers.itemId],
          set: {
            response: answer.response,
            savedAt: new Date(answer.savedAt),
            updatedAt: new Date(),
          },
        });
    },
  });
}

function createAttemptsPort(
  db: DatabaseExecutor,
): AnswerTransactionalOperations["attemptsPort"] {
  return Object.freeze({
    findById: async (attemptId: string): Promise<AttemptState | null> => {
      const rows = await db
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
      if (!row) return null;
      const supportedStatuses = [
        "CRIADA",
        "EM_ANDAMENTO",
        "SALVA",
        "SUBMETIDA",
        "CORRIGIDA_AUTOMATICAMENTE",
        "AGUARDA_CORRECAO_HUMANA",
        "CORRIGIDA_HUMANAMENTE",
        "ANULADA",
      ] as const;
      if (
        !supportedStatuses.includes(
          row.status as (typeof supportedStatuses)[number],
        )
      ) {
        throw new PersistenceMappingError("attempt status is not supported");
      }
      return {
        attemptId: row.id,
        participantId: row.participantId,
        activityId: row.activityId,
        status: row.status as AttemptState["status"],
        version: row.version,
        ...(row.submittedAt
          ? { submittedAt: row.submittedAt.toISOString() }
          : {}),
      };
    },
    update: async (state: AttemptState): Promise<void> => {
      const rows = await db
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

function createAnswerIdempotency(
  db: DatabaseExecutor,
): AnswerTransactionalOperations["idempotency"] {
  return Object.freeze({
    find: async (key: string): Promise<AnswerIdempotencyRecord | null> => {
      const rows = await db
        .select({
          fingerprint: answerIdempotency.fingerprint,
          response: answerIdempotency.response,
        })
        .from(answerIdempotency)
        .where(eq(answerIdempotency.key, key))
        .limit(1);
      const row = rows[0];
      return row ? answerIdempotencyRowToRecord(row) : null;
    },
    store: async (
      key: string,
      record: AnswerIdempotencyRecord,
    ): Promise<void> => {
      const existing = await db
        .select({ fingerprint: answerIdempotency.fingerprint })
        .from(answerIdempotency)
        .where(eq(answerIdempotency.key, key))
        .limit(1);
      if (existing[0] && existing[0].fingerprint !== record.fingerprint) {
        throw new Error("answer idempotency key has another fingerprint");
      }
      if (existing[0]) return;

      const response: PersistedAnswerSnapshot = {
        attempt: record.result.attempt as PersistedAttemptSnapshot,
        answer: record.result.answer,
      };
      await insertAnswerIdempotency(db, key, record, response);
    },
  });
}

function createAnswerEventPublisher(
  db: DatabaseExecutor,
): AnswerTransactionalOperations["eventPublisher"] {
  return Object.freeze({
    publish: async (
      event: Parameters<
        AnswerTransactionalOperations["eventPublisher"]["publish"]
      >[0],
    ): Promise<void> => {
      await db.insert(outboxEvents).values(createOutboxInsert(event));
    },
  });
}

export function createAnswerOperationsMethods(
  db: DatabaseExecutor,
): AnswerTransactionalOperations {
  return Object.freeze({
    attemptsPort: createAttemptsPort(db),
    answersPort: createAnswersPort(db),
    idempotency: createAnswerIdempotency(db),
    eventPublisher: createAnswerEventPublisher(db),
    audit: createAuditRepository(db),
  });
}

function createAnswerOperations(
  db: DatabaseExecutor,
): AnswerTransactionalOperations {
  return createAnswerOperationsMethods(db);
}

export function createAnswerUseCaseDependencies(
  db: PostgresJsDatabase<typeof schema>,
  idFactory: () => string,
): AnswerUseCaseDependencies {
  const operations = createAnswerOperations(db);

  return Object.freeze({
    ...operations,
    idFactory,
    transaction: {
      run: async <Result>(
        work: (transactional: AnswerTransactionalOperations) => Promise<Result>,
        context?: TransactionSecurityContext,
      ): Promise<Result> =>
        db.transaction(async (transaction) => {
          const executor = transaction;
          if (context !== undefined) {
            await setDatabaseSecurityContext(executor, context);
          }
          return work(createAnswerOperations(executor));
        }),
    },
  });
}
