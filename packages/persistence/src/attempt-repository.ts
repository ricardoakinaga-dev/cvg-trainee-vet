import { and, eq, inArray, type SQL } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { AttemptState, AttemptStatus } from "@cvg/domain";
import {
  ApplicationError,
  type AttemptTransactionalOperations,
  type AttemptUseCaseDependencies,
  type IdempotencyRecord,
  type TransactionSecurityContext,
} from "@cvg/application";

import {
  activityAssignments,
  attemptIdempotency,
  attempts,
  learningActivities,
  outboxEvents,
} from "./schema.js";
import type { PersistedAttemptSnapshot } from "./schema.js";
import type * as schema from "./schema.js";
import { createAuditRepository } from "./audit-repository.js";
import { setDatabaseSecurityContext } from "./security-context.js";

export class PersistenceMappingError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PersistenceMappingError";
  }
}

export class PersistenceConflictError extends ApplicationError {
  public constructor(message: string) {
    super("state_conflict", message);
    this.name = "PersistenceConflictError";
  }
}

export type AttemptRowShape = Readonly<{
  readonly id: string;
  readonly participantId: string;
  readonly activityId: string;
  readonly status: string;
  readonly version: number;
  readonly submittedAt: Date | null;
}>;

export type AttemptInsertRow = Readonly<{
  readonly id: string;
  readonly participantId: string;
  readonly activityId: string;
  readonly status: AttemptStatus;
  readonly version: number;
  readonly submittedAt: Date | null;
}>;

const attemptStatuses: readonly AttemptStatus[] = [
  "CRIADA",
  "EM_ANDAMENTO",
  "SALVA",
  "SUBMETIDA",
  "CORRIGIDA_AUTOMATICAMENTE",
  "AGUARDA_CORRECAO_HUMANA",
  "CORRIGIDA_HUMANAMENTE",
  "ANULADA",
];

const openAttemptStatuses: readonly AttemptStatus[] = [
  "CRIADA",
  "EM_ANDAMENTO",
  "SALVA",
  "SUBMETIDA",
  "AGUARDA_CORRECAO_HUMANA",
];

const forbiddenPayloadFields = new Set([
  "source_record_id",
  "source_id",
  "source",
  "work",
  "author",
  "edition",
  "chapter",
  "page",
  "pdf",
  "ocr",
  "photo",
  "figure",
  "table",
  "prompt",
  "response",
  "ai_response",
  "answer_key",
  "rubric_internal",
]);

function isAttemptStatus(value: string): value is AttemptStatus {
  return attemptStatuses.includes(value as AttemptStatus);
}

export function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new PersistenceMappingError(`${field} must not be empty`);
  }
}

function assertVersion(value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new PersistenceMappingError("version must be a non-negative integer");
  }
}

function toIsoTimestamp(value: Date, field: string): string {
  if (Number.isNaN(value.getTime())) {
    throw new PersistenceMappingError(`${field} must be a valid timestamp`);
  }
  return value.toISOString();
}

export function attemptStateToRow(state: AttemptState): AttemptInsertRow {
  assertNonEmpty(state.attemptId, "attemptId");
  assertNonEmpty(state.participantId, "participantId");
  assertNonEmpty(state.activityId, "activityId");
  assertVersion(state.version);
  if (!isAttemptStatus(state.status)) {
    throw new PersistenceMappingError(
      "status is not a supported attempt state",
    );
  }

  return {
    id: state.attemptId,
    participantId: state.participantId,
    activityId: state.activityId,
    status: state.status,
    version: state.version,
    submittedAt: state.submittedAt ? new Date(state.submittedAt) : null,
  };
}

export function attemptRowToState(row: AttemptRowShape): AttemptState {
  assertNonEmpty(row.id, "id");
  assertNonEmpty(row.participantId, "participantId");
  assertNonEmpty(row.activityId, "activityId");
  assertVersion(row.version);
  if (!isAttemptStatus(row.status)) {
    throw new PersistenceMappingError(
      "status is not a supported attempt state",
    );
  }

  const submittedAt =
    row.submittedAt === null
      ? undefined
      : toIsoTimestamp(row.submittedAt, "submittedAt");

  return {
    attemptId: row.id,
    participantId: row.participantId,
    activityId: row.activityId,
    status: row.status,
    version: row.version,
    ...(submittedAt ? { submittedAt } : {}),
  };
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
  if (typeof value !== "number") {
    throw new PersistenceMappingError(`${field} must be a number`);
  }
  return value;
}

function snapshotToState(value: unknown): AttemptState {
  const record = readRecord(value);
  const status = readString(record, "status");
  if (!isAttemptStatus(status)) {
    throw new PersistenceMappingError("snapshot status is not supported");
  }
  const submittedAt = record.submittedAt;
  if (submittedAt !== undefined && typeof submittedAt !== "string") {
    throw new PersistenceMappingError("snapshot submittedAt must be a string");
  }

  return {
    attemptId: readString(record, "attemptId"),
    participantId: readString(record, "participantId"),
    activityId: readString(record, "activityId"),
    status,
    version: readNumber(record, "version"),
    ...(submittedAt !== undefined ? { submittedAt } : {}),
  };
}

export function idempotencyRowToRecord(row: {
  readonly fingerprint: string;
  readonly response: unknown;
}): IdempotencyRecord {
  assertNonEmpty(row.fingerprint, "fingerprint");
  const attempt = snapshotToState(row.response);
  assertVersion(attempt.version);
  return Object.freeze({ fingerprint: row.fingerprint, attempt });
}

function visitPayload(value: unknown, depth: number): void {
  if (depth > 6)
    throw new PersistenceMappingError("payload nesting is too deep");
  if (Array.isArray(value)) {
    if (value.length > 100) {
      throw new PersistenceMappingError("payload array is too large");
    }
    value.forEach((item) => visitPayload(item, depth + 1));
    return;
  }
  if (value === null || typeof value !== "object") return;

  for (const [key, nested] of Object.entries(value)) {
    if (forbiddenPayloadFields.has(key.toLowerCase())) {
      throw new PersistenceMappingError(`forbidden payload field: ${key}`);
    }
    visitPayload(nested, depth + 1);
  }
}

export function validateOutboxPayload(
  payload: unknown,
): Readonly<Record<string, unknown>> {
  const record = readRecord(payload);
  visitPayload(record, 0);
  try {
    if (JSON.stringify(record).length > 64_000) {
      throw new PersistenceMappingError("payload is too large");
    }
  } catch (error) {
    if (error instanceof PersistenceMappingError) throw error;
    throw new PersistenceMappingError("payload must be serializable JSON");
  }
  return record;
}

export type OutboxEventInput = Readonly<{
  readonly eventId: string;
  readonly eventType: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly occurredAt: string;
  readonly schemaVersion: number;
  readonly correlationId: string;
  readonly payload: unknown;
}>;

export function outboxEventToRow(input: OutboxEventInput) {
  assertNonEmpty(input.eventId, "eventId");
  assertNonEmpty(input.eventType, "eventType");
  assertNonEmpty(input.aggregateType, "aggregateType");
  assertNonEmpty(input.aggregateId, "aggregateId");
  assertNonEmpty(input.correlationId, "correlationId");
  if (!Number.isInteger(input.schemaVersion) || input.schemaVersion < 1) {
    throw new PersistenceMappingError("schemaVersion must be positive");
  }
  const occurredAt = new Date(input.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) {
    throw new PersistenceMappingError("occurredAt must be a valid timestamp");
  }

  return {
    id: input.eventId,
    eventType: input.eventType,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    occurredAt,
    schemaVersion: input.schemaVersion,
    correlationId: input.correlationId,
    payload: validateOutboxPayload(input.payload),
    status: "PENDING" as const,
    attempts: 0,
  };
}

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

type AttemptOperations = AttemptTransactionalOperations;

const attemptSelection = {
  id: attempts.id,
  participantId: attempts.participantId,
  activityId: attempts.activityId,
  status: attempts.status,
  version: attempts.version,
  submittedAt: attempts.submittedAt,
};

async function findAttemptByCondition(
  db: DatabaseExecutor,
  condition: SQL<unknown> | undefined,
): Promise<AttemptState | null> {
  const rows = await db
    .select(attemptSelection)
    .from(attempts)
    .where(condition)
    .limit(1);
  const row = rows[0];
  return row ? attemptRowToState(row) : null;
}

function findOpenAttempt(
  db: DatabaseExecutor,
  participantId: string,
  activityId: string,
): Promise<AttemptState | null> {
  return findAttemptByCondition(
    db,
    and(
      eq(attempts.participantId, participantId),
      eq(attempts.activityId, activityId),
      inArray(attempts.status, openAttemptStatuses),
    ),
  );
}

function findAttemptById(
  db: DatabaseExecutor,
  attemptId: string,
): Promise<AttemptState | null> {
  return findAttemptByCondition(db, eq(attempts.id, attemptId));
}

async function insertAttempt(
  db: DatabaseExecutor,
  state: AttemptState,
): Promise<void> {
  try {
    await db.insert(attempts).values(attemptStateToRow(state));
  } catch (error) {
    if (!isUniqueConstraintViolation(error)) throw error;
    throw new PersistenceConflictError(
      "attempt already exists or changed concurrently",
    );
  }
}

async function updateAttempt(
  db: DatabaseExecutor,
  state: AttemptState,
): Promise<void> {
  const previousVersion = state.version - 1;
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
        eq(attempts.version, previousVersion),
      ),
    )
    .returning({ id: attempts.id });
  if (rows.length === 0) {
    throw new PersistenceConflictError("attempt version changed concurrently");
  }
}

function createAttemptPort(
  db: DatabaseExecutor,
): AttemptOperations["attemptsPort"] {
  return Object.freeze({
    findOpenByParticipantAndActivity: (
      participantId: string,
      activityId: string,
    ) => findOpenAttempt(db, participantId, activityId),
    findById: (attemptId: string) => findAttemptById(db, attemptId),
    insert: (state: AttemptState) => insertAttempt(db, state),
    update: (state: AttemptState) => updateAttempt(db, state),
  });
}

function createActivityPort(
  db: DatabaseExecutor,
): AttemptOperations["activity"] {
  return Object.freeze({
    isAvailable: async (
      participantId: string,
      activityId: string,
    ): Promise<boolean> => {
      const rows = await db
        .select({ activityId: activityAssignments.activityId })
        .from(activityAssignments)
        .innerJoin(
          learningActivities,
          eq(activityAssignments.activityId, learningActivities.id),
        )
        .where(
          and(
            eq(activityAssignments.participantId, participantId),
            eq(activityAssignments.activityId, activityId),
            inArray(activityAssignments.status, [
              "DISPONIVEL",
              "EM_ANDAMENTO",
              "EM_REFORCO",
            ]),
            eq(learningActivities.status, "PUBLISHED"),
          ),
        )
        .limit(1);
      return rows.length > 0;
    },
  });
}

function createAttemptIdempotency(
  db: DatabaseExecutor,
): AttemptOperations["idempotency"] {
  return Object.freeze({
    find: async (key: string): Promise<IdempotencyRecord | null> => {
      const rows = await db
        .select({
          fingerprint: attemptIdempotency.fingerprint,
          response: attemptIdempotency.response,
        })
        .from(attemptIdempotency)
        .where(eq(attemptIdempotency.key, key))
        .limit(1);
      const row = rows[0];
      return row ? idempotencyRowToRecord(row) : null;
    },
    store: async (key: string, record: IdempotencyRecord): Promise<void> => {
      const existing = await db
        .select({ fingerprint: attemptIdempotency.fingerprint })
        .from(attemptIdempotency)
        .where(eq(attemptIdempotency.key, key))
        .limit(1);
      if (existing[0] && existing[0].fingerprint !== record.fingerprint) {
        throw new PersistenceConflictError(
          "idempotency key has another fingerprint",
        );
      }
      if (existing[0]) return;

      try {
        await db.insert(attemptIdempotency).values({
          key,
          operation: "attempt",
          fingerprint: record.fingerprint,
          attemptId: record.attempt.attemptId,
          response: record.attempt as PersistedAttemptSnapshot,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
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

function createAttemptEventPublisher(
  db: DatabaseExecutor,
): AttemptOperations["eventPublisher"] {
  return Object.freeze({
    publish: async (
      event: Parameters<AttemptOperations["eventPublisher"]["publish"]>[0],
    ): Promise<void> => {
      await db.insert(outboxEvents).values(createOutboxInsert(event));
    },
  });
}

export function createAttemptOperationsMethods(
  db: DatabaseExecutor,
): AttemptOperations {
  return Object.freeze({
    activity: createActivityPort(db),
    attemptsPort: createAttemptPort(db),
    idempotency: createAttemptIdempotency(db),
    eventPublisher: createAttemptEventPublisher(db),
    audit: createAuditRepository(db),
  });
}

function createOperations(db: DatabaseExecutor): AttemptOperations {
  return createAttemptOperationsMethods(db);
}

export function createAttemptUseCaseDependencies(
  db: PostgresJsDatabase<typeof schema>,
  idFactory: () => string,
): AttemptUseCaseDependencies {
  const operations = createOperations(db);

  return Object.freeze({
    ...operations,
    idFactory,
    transaction: {
      run: async <Result>(
        work: (
          transactional: AttemptTransactionalOperations,
        ) => Promise<Result>,
        context?: TransactionSecurityContext,
      ): Promise<Result> =>
        db.transaction(async (transaction) => {
          const executor = transaction;
          if (context !== undefined) {
            await setDatabaseSecurityContext(executor, context);
          }
          return work(createOperations(executor));
        }),
    },
  });
}

export function createActivityScopeResolver(
  db: PostgresJsDatabase<typeof schema>,
): (activityId: string) => Promise<string | null> {
  return async (activityId: string): Promise<string | null> => {
    const rows = await db
      .select({ scopeId: learningActivities.scopeId })
      .from(learningActivities)
      .where(eq(learningActivities.id, activityId))
      .limit(1);
    return rows[0]?.scopeId ?? null;
  };
}

export function createOutboxInsert(input: OutboxEventInput) {
  return outboxEventToRow(input) as typeof outboxEvents.$inferInsert;
}
