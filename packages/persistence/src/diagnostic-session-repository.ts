import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, gt, lte, sql } from "drizzle-orm";
import type {
  DiagnosticSessionAggregate,
  DiagnosticSessionAnswerState,
  DiagnosticSessionCatalogSnapshot,
  DiagnosticSessionCatalogSnapshotItem,
  DiagnosticSessionFinalizationState,
  DiagnosticSessionRepositoryPort,
  MaterializeCurriculumAssignmentsInput,
} from "@cvg/application";
import {
  createAuditEntry,
  type MaterializedCurriculumAssignments,
} from "@cvg/application";
import type {
  Choice,
  CurriculumDiagnosticResult,
  DiagnosticSessionId,
  ModuleAnswer,
} from "@cvg/curriculum";
import {
  createDiagnosticSession,
  type DiagnosticSessionState,
} from "@cvg/domain";

import { auditEntryToRow } from "./audit-repository.js";
import {
  type DatabaseExecutor,
  materializeCurriculumAssignmentsInTransaction,
} from "./adaptive-assignment-repository.js";
import { createOutboxInsert } from "./attempt-repository.js";
import {
  diagnosticResultRowToState,
  diagnosticResultStateToRow,
} from "./diagnostic-result-repository.js";
import {
  auditEntries,
  diagnosticResults,
  diagnosticSessionAnswers,
  diagnosticSessionIdempotency,
  diagnosticSessions,
  outboxEvents,
} from "./schema.js";
import type { PersistedDiagnosticSessionCatalogSnapshot } from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const diagnosticSessionIds: readonly DiagnosticSessionId[] = [
  "B07-S1",
  "B07-S2",
  "B07-S3",
];

type DatabaseTransaction = Parameters<
  Parameters<DatabaseExecutor["transaction"]>[0]
>[0];

type SessionExecutor = DatabaseExecutor | DatabaseTransaction;
type SessionRow = typeof diagnosticSessions.$inferSelect;
type AnswerRow = typeof diagnosticSessionAnswers.$inferSelect;
type IdempotencyRow = typeof diagnosticSessionIdempotency.$inferSelect;

export class DiagnosticSessionPersistenceError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "DiagnosticSessionPersistenceError";
  }
}

export class DiagnosticSessionNotFoundError extends DiagnosticSessionPersistenceError {
  public constructor() {
    super("diagnostic session was not found in the requested scope");
    this.name = "DiagnosticSessionNotFoundError";
  }
}

export class DiagnosticSessionConflictError extends DiagnosticSessionPersistenceError {
  public constructor(message = "diagnostic session changed concurrently") {
    super(message);
    this.name = "DiagnosticSessionConflictError";
  }
}

export class DiagnosticSessionIdempotencyConflictError extends DiagnosticSessionPersistenceError {
  public constructor() {
    super("diagnostic idempotency key was already used with another request");
    this.name = "DiagnosticSessionIdempotencyConflictError";
  }
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new DiagnosticSessionPersistenceError(`${field} must be an object`);
  }
  return Object.fromEntries(Object.entries(value));
}

function stringValue(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new DiagnosticSessionPersistenceError(
      `${field} must be a non-empty string`,
    );
  }
  return value;
}

function integerValue(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new DiagnosticSessionPersistenceError(
      `${field} must be a non-negative integer`,
    );
  }
  return value;
}

function isoDate(value: Date, field: string): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new DiagnosticSessionPersistenceError(
      `${field} must be a valid timestamp`,
    );
  }
  return value.toISOString();
}

function optionalIsoDate(
  value: Date | null,
  field: string,
): string | undefined {
  return value === null ? undefined : isoDate(value, field);
}

function stringArray(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new DiagnosticSessionPersistenceError(
      `${field} must be a string array`,
    );
  }
  const values = value.map((item) => stringValue(item, field));
  if (new Set(values).size !== values.length) {
    throw new DiagnosticSessionPersistenceError(
      `${field} must not contain duplicates`,
    );
  }
  return Object.freeze(values);
}

function choiceFromSnapshot(value: unknown): Choice {
  const candidate = record(value, "diagnostic choice");
  return Object.freeze({
    id: stringValue(candidate.id, "choice.id"),
    label: stringValue(candidate.label, "choice.label"),
    text: stringValue(candidate.text, "choice.text"),
  });
}

function catalogItemFromSnapshot(
  value: unknown,
): DiagnosticSessionCatalogSnapshotItem {
  const candidate = record(value, "diagnostic catalog item");
  const diagnosticSessionId = stringValue(
    candidate.diagnosticSessionId,
    "diagnosticSessionId",
  );
  if (
    !diagnosticSessionIds.includes(diagnosticSessionId as DiagnosticSessionId)
  ) {
    throw new DiagnosticSessionPersistenceError(
      "diagnostic catalog session id is invalid",
    );
  }
  const responseMode = candidate.responseMode;
  if (responseMode !== "CHOICE") {
    throw new DiagnosticSessionPersistenceError(
      "diagnostic catalog response mode is invalid",
    );
  }
  const selectionMode = candidate.selectionMode;
  if (selectionMode !== "SINGLE" && selectionMode !== "MULTIPLE") {
    throw new DiagnosticSessionPersistenceError(
      "diagnostic catalog selection mode is invalid",
    );
  }
  const choicesValue = candidate.choices;
  if (!Array.isArray(choicesValue) || choicesValue.length === 0) {
    throw new DiagnosticSessionPersistenceError(
      "diagnostic catalog choices are invalid",
    );
  }
  const choices = Object.freeze(choicesValue.map(choiceFromSnapshot));
  if (new Set(choices.map((choice) => choice.id)).size !== choices.length) {
    throw new DiagnosticSessionPersistenceError(
      "diagnostic catalog choice ids must be unique",
    );
  }
  const correctChoiceIds = stringArray(
    candidate.correctChoiceIds,
    "correctChoiceIds",
  );
  const choiceIds = new Set(choices.map((choice) => choice.id));
  if (correctChoiceIds.some((choiceId) => !choiceIds.has(choiceId))) {
    throw new DiagnosticSessionPersistenceError(
      "diagnostic catalog answer key is outside the choices",
    );
  }
  if (selectionMode === "SINGLE" && correctChoiceIds.length > 1) {
    throw new DiagnosticSessionPersistenceError(
      "single-choice diagnostic answer key is invalid",
    );
  }
  return Object.freeze({
    canonicalItemId: stringValue(candidate.canonicalItemId, "canonicalItemId"),
    publicItemId: stringValue(candidate.publicItemId, "publicItemId"),
    diagnosticSessionId: diagnosticSessionId as DiagnosticSessionId,
    objectiveId: stringValue(candidate.objectiveId, "objectiveId"),
    ordinal: integerValue(candidate.ordinal, "ordinal"),
    title: stringValue(candidate.title, "title"),
    text: stringValue(candidate.text, "text"),
    responseMode,
    choices,
    correctChoiceIds,
    selectionMode,
  });
}

export function diagnosticSessionCatalogFromSnapshot(
  value: unknown,
): DiagnosticSessionCatalogSnapshot {
  const candidate = record(value, "diagnostic catalog snapshot");
  if (
    candidate.diagnosticId !== "B07-DIAGNOSTIC-V1" ||
    candidate.diagnosticVersion !== "0.1.0" ||
    candidate.status !== "RASCUNHO" ||
    candidate.publicationAuthorized !== false ||
    candidate.clinicalReview !== "PENDENTE"
  ) {
    throw new DiagnosticSessionPersistenceError(
      "diagnostic catalog snapshot is not the eligible technical draft",
    );
  }
  if (!Array.isArray(candidate.items) || candidate.items.length !== 120) {
    throw new DiagnosticSessionPersistenceError(
      "diagnostic catalog snapshot must contain 120 items",
    );
  }
  const items = Object.freeze(candidate.items.map(catalogItemFromSnapshot));
  const ordinals = new Set(items.map((item) => item.ordinal));
  const publicIds = new Set(items.map((item) => item.publicItemId));
  const canonicalIds = new Set(items.map((item) => item.canonicalItemId));
  if (ordinals.size !== items.length || publicIds.size !== items.length) {
    throw new DiagnosticSessionPersistenceError(
      "diagnostic catalog item identities must be unique",
    );
  }
  if (canonicalIds.size !== items.length) {
    throw new DiagnosticSessionPersistenceError(
      "diagnostic catalog canonical identities must be unique",
    );
  }
  return Object.freeze({
    diagnosticId: "B07-DIAGNOSTIC-V1",
    diagnosticVersion: "0.1.0",
    status: "RASCUNHO",
    publicationAuthorized: false,
    clinicalReview: "PENDENTE",
    items,
  });
}

function sessionFromRow(row: SessionRow): DiagnosticSessionState {
  if (
    row.diagnosticId !== "B07-DIAGNOSTIC-V1" ||
    row.diagnosticVersion !== "0.1.0"
  ) {
    throw new DiagnosticSessionPersistenceError(
      "stored diagnostic session identity is invalid",
    );
  }
  if (row.status !== "EM_ANDAMENTO" && row.status !== "FINALIZADA") {
    throw new DiagnosticSessionPersistenceError(
      "stored diagnostic session status is invalid",
    );
  }
  const startedAt = isoDate(row.startedAt, "startedAt");
  const lastCheckpointAt = optionalIsoDate(
    row.lastCheckpointAt,
    "lastCheckpointAt",
  );
  const finalizedAt = optionalIsoDate(row.finalizedAt, "finalizedAt");
  if (row.status === "EM_ANDAMENTO" && finalizedAt !== undefined) {
    throw new DiagnosticSessionPersistenceError(
      "in-progress diagnostic session contains finalization",
    );
  }
  if (row.status === "FINALIZADA" && finalizedAt === undefined) {
    throw new DiagnosticSessionPersistenceError(
      "finalized diagnostic session has no finalizedAt",
    );
  }
  integerValue(row.version, "version");
  const created = createDiagnosticSession({
    sessionId: row.id,
    participantId: row.participantId,
    scopeId: row.scopeId,
    diagnosticId: "B07-DIAGNOSTIC-V1",
    diagnosticVersion: "0.1.0",
    startedAt,
  });
  return Object.freeze({
    ...created,
    status: row.status,
    version: row.version,
    ...(lastCheckpointAt === undefined ? {} : { lastCheckpointAt }),
    ...(finalizedAt === undefined ? {} : { finalizedAt }),
  });
}

function sessionFromStored(value: unknown): DiagnosticSessionState {
  const candidate = record(value, "stored diagnostic session");
  const status = candidate.status;
  if (status !== "EM_ANDAMENTO" && status !== "FINALIZADA") {
    throw new DiagnosticSessionPersistenceError(
      "stored session status is invalid",
    );
  }
  const startedAt = stringValue(candidate.startedAt, "startedAt");
  const finalizedAtValue = candidate.finalizedAt;
  const finalizedAt =
    finalizedAtValue === undefined
      ? undefined
      : stringValue(finalizedAtValue, "finalizedAt");
  if (status === "FINALIZADA" && finalizedAt === undefined) {
    throw new DiagnosticSessionPersistenceError(
      "stored finalization is incomplete",
    );
  }
  if (status === "EM_ANDAMENTO" && finalizedAt !== undefined) {
    throw new DiagnosticSessionPersistenceError(
      "stored finalization is invalid",
    );
  }
  const created = createDiagnosticSession({
    sessionId: stringValue(candidate.sessionId, "sessionId"),
    participantId: stringValue(candidate.participantId, "participantId"),
    scopeId: stringValue(candidate.scopeId, "scopeId"),
    diagnosticId: "B07-DIAGNOSTIC-V1",
    diagnosticVersion: "0.1.0",
    startedAt,
  });
  const lastCheckpointValue = candidate.lastCheckpointAt;
  const lastCheckpointAt =
    lastCheckpointValue === undefined
      ? undefined
      : stringValue(lastCheckpointValue, "lastCheckpointAt");
  return Object.freeze({
    ...created,
    status,
    version: integerValue(candidate.version, "version"),
    ...(lastCheckpointAt === undefined ? {} : { lastCheckpointAt }),
    ...(finalizedAt === undefined ? {} : { finalizedAt }),
  });
}

function answerFromRow(
  row: AnswerRow,
  catalog: DiagnosticSessionCatalogSnapshot,
): DiagnosticSessionAnswerState {
  const item = catalog.items.find(
    (candidate) => candidate.canonicalItemId === row.canonicalItemId,
  );
  if (item === undefined) {
    throw new DiagnosticSessionPersistenceError(
      "stored answer references an unknown catalog item",
    );
  }
  const selectedChoiceIds = stringArray(
    row.selectedChoiceIds,
    "selectedChoiceIds",
  );
  if (selectedChoiceIds.length === 0 || selectedChoiceIds.length > 8) {
    throw new DiagnosticSessionPersistenceError(
      "stored answer selection count is invalid",
    );
  }
  const choiceIds = new Set(item.choices.map((choice) => choice.id));
  if (selectedChoiceIds.some((choiceId) => !choiceIds.has(choiceId))) {
    throw new DiagnosticSessionPersistenceError(
      "stored answer contains a choice outside the catalog",
    );
  }
  if (item.selectionMode === "SINGLE" && selectedChoiceIds.length !== 1) {
    throw new DiagnosticSessionPersistenceError(
      "stored single-choice answer is invalid",
    );
  }
  return Object.freeze({
    canonicalItemId: row.canonicalItemId,
    selectedChoiceIds: Object.freeze([...selectedChoiceIds].sort()),
    savedAt: isoDate(row.savedAt, "savedAt"),
  });
}

function answerFromStored(
  value: unknown,
  catalog: DiagnosticSessionCatalogSnapshot,
): DiagnosticSessionAnswerState {
  const candidate = record(value, "stored diagnostic answer");
  const itemId = stringValue(candidate.canonicalItemId, "canonicalItemId");
  const item = catalog.items.find(
    (catalogItem) => catalogItem.canonicalItemId === itemId,
  );
  if (item === undefined) {
    throw new DiagnosticSessionPersistenceError(
      "stored answer item is invalid",
    );
  }
  const selectedChoiceIds = stringArray(
    candidate.selectedChoiceIds,
    "selectedChoiceIds",
  );
  if (selectedChoiceIds.length === 0 || selectedChoiceIds.length > 8) {
    throw new DiagnosticSessionPersistenceError(
      "stored answer count is invalid",
    );
  }
  const choiceIds = new Set(item.choices.map((choice) => choice.id));
  if (
    selectedChoiceIds.some((choiceId) => !choiceIds.has(choiceId)) ||
    (item.selectionMode === "SINGLE" && selectedChoiceIds.length !== 1)
  ) {
    throw new DiagnosticSessionPersistenceError(
      "stored answer choices are invalid",
    );
  }
  return Object.freeze({
    canonicalItemId: itemId,
    selectedChoiceIds: Object.freeze([...selectedChoiceIds].sort()),
    savedAt: stringValue(candidate.savedAt, "savedAt"),
  });
}

function diagnosticResultFromStored(
  value: unknown,
): DiagnosticSessionAggregate["result"] {
  const candidate = record(value, "stored diagnostic result");
  const result = record(
    candidate.result,
    "stored diagnostic result payload",
  ) as unknown as CurriculumDiagnosticResult;
  return diagnosticResultRowToState({
    id: stringValue(candidate.resultId, "resultId"),
    participantId: stringValue(candidate.participantId, "participantId"),
    scopeId: stringValue(candidate.scopeId, "scopeId"),
    diagnosticId: stringValue(candidate.diagnosticId, "diagnosticId"),
    diagnosticVersion: stringValue(candidate.version, "version"),
    result,
    completedAt: new Date(stringValue(candidate.completedAt, "completedAt")),
  });
}

function aggregateFromStored(value: unknown): DiagnosticSessionAggregate {
  const envelope = record(value, "stored idempotency response");
  const candidate = envelope.aggregate ?? value;
  const aggregate = record(candidate, "stored diagnostic aggregate");
  const catalog = diagnosticSessionCatalogFromSnapshot(aggregate.catalog);
  if (!Array.isArray(aggregate.answers)) {
    throw new DiagnosticSessionPersistenceError(
      "stored diagnostic answers are invalid",
    );
  }
  const answers = Object.freeze(
    aggregate.answers.map((answer) => answerFromStored(answer, catalog)),
  );
  const result =
    aggregate.result === undefined
      ? undefined
      : diagnosticResultFromStored(aggregate.result);
  return Object.freeze({
    session: sessionFromStored(aggregate.session),
    catalog,
    answers,
    ...(result === undefined ? {} : { result }),
  });
}

function assignmentsFromStored(
  value: unknown,
): MaterializedCurriculumAssignments {
  const candidate = record(value, "stored assignments");
  if (!Array.isArray(candidate.assignments)) {
    throw new DiagnosticSessionPersistenceError(
      "stored assignments are invalid",
    );
  }
  return Object.freeze({
    diagnosticResultId: stringValue(
      candidate.diagnosticResultId,
      "diagnosticResultId",
    ),
    participantId: stringValue(candidate.participantId, "participantId"),
    scopeId: stringValue(candidate.scopeId, "scopeId"),
    assignments: Object.freeze(
      candidate.assignments as MaterializedCurriculumAssignments["assignments"],
    ),
  });
}

function aggregateResponse(
  aggregate: DiagnosticSessionAggregate,
): Readonly<Record<string, unknown>> {
  return { aggregate };
}

function finalizationResponse(
  finalization: DiagnosticSessionFinalizationState,
): Readonly<Record<string, unknown>> {
  return finalization;
}

function idempotencyResponse(
  row: IdempotencyRow,
  operation: "START" | "SAVE_ANSWER" | "FINALIZE",
  fingerprint: string,
): void {
  if (row.operation !== operation || row.fingerprint !== fingerprint) {
    throw new DiagnosticSessionIdempotencyConflictError();
  }
}

function assertInputStrings(values: Readonly<Record<string, string>>): void {
  for (const [field, value] of Object.entries(values)) {
    stringValue(value, field);
  }
}

async function lock(executor: SessionExecutor, key: string): Promise<void> {
  await (executor as DatabaseExecutor).execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`,
  );
}

async function findSessionRow(
  executor: SessionExecutor,
  sessionId: string,
  participantId: string,
  scopeId: string,
): Promise<SessionRow | undefined> {
  const rows = await executor
    .select()
    .from(diagnosticSessions)
    .where(
      and(
        eq(diagnosticSessions.id, sessionId),
        eq(diagnosticSessions.participantId, participantId),
        eq(diagnosticSessions.scopeId, scopeId),
      ),
    )
    .limit(1);
  return rows[0];
}

async function loadAggregate(
  executor: SessionExecutor,
  row: SessionRow,
): Promise<DiagnosticSessionAggregate> {
  const catalog = diagnosticSessionCatalogFromSnapshot(row.catalogSnapshot);
  const answerRows = await executor
    .select()
    .from(diagnosticSessionAnswers)
    .where(eq(diagnosticSessionAnswers.sessionId, row.id))
    .orderBy(asc(diagnosticSessionAnswers.canonicalItemId));
  const answers = Object.freeze(
    answerRows.map((answer) => answerFromRow(answer, catalog)),
  );
  if (
    new Set(answers.map((answer) => answer.canonicalItemId)).size !==
    answers.length
  ) {
    throw new DiagnosticSessionPersistenceError(
      "stored diagnostic answers are duplicated",
    );
  }
  const session = sessionFromRow(row);
  if (row.diagnosticResultId === null) {
    return Object.freeze({ session, catalog, answers });
  }
  const resultRows = await executor
    .select()
    .from(diagnosticResults)
    .where(
      and(
        eq(diagnosticResults.id, row.diagnosticResultId),
        eq(diagnosticResults.participantId, row.participantId),
        eq(diagnosticResults.scopeId, row.scopeId),
        eq(diagnosticResults.sessionId, row.id),
      ),
    )
    .limit(1);
  const resultRow = resultRows[0];
  if (resultRow === undefined) {
    throw new DiagnosticSessionPersistenceError(
      "finalized diagnostic session has no diagnostic result",
    );
  }
  const result = diagnosticResultRowToState({
    id: resultRow.id,
    participantId: resultRow.participantId,
    scopeId: resultRow.scopeId,
    diagnosticId: resultRow.diagnosticId,
    diagnosticVersion: resultRow.diagnosticVersion,
    result: resultRow.result,
    completedAt: resultRow.completedAt,
  });
  return Object.freeze({ session, catalog, answers, result });
}

async function currentSessionRow(
  executor: SessionExecutor,
  participantId: string,
  scopeId: string,
): Promise<SessionRow | undefined> {
  const rows = await executor
    .select()
    .from(diagnosticSessions)
    .where(
      and(
        eq(diagnosticSessions.participantId, participantId),
        eq(diagnosticSessions.scopeId, scopeId),
        eq(diagnosticSessions.diagnosticId, "B07-DIAGNOSTIC-V1"),
        eq(diagnosticSessions.diagnosticVersion, "0.1.0"),
      ),
    )
    .orderBy(
      desc(diagnosticSessions.updatedAt),
      desc(diagnosticSessions.createdAt),
    )
    .limit(1);
  return rows[0];
}

async function findIdempotency(
  executor: SessionExecutor,
  participantId: string,
  scopeId: string,
  operation: "START" | "SAVE_ANSWER" | "FINALIZE",
  idempotencyKey: string,
  now = new Date(),
): Promise<IdempotencyRow | undefined> {
  const rows = await executor
    .select()
    .from(diagnosticSessionIdempotency)
    .where(
      and(
        eq(diagnosticSessionIdempotency.participantId, participantId),
        eq(diagnosticSessionIdempotency.scopeId, scopeId),
        eq(diagnosticSessionIdempotency.operation, operation),
        eq(diagnosticSessionIdempotency.idempotencyKey, idempotencyKey),
        gt(diagnosticSessionIdempotency.expiresAt, now),
      ),
    )
    .limit(1);
  return rows[0];
}

async function saveIdempotency(
  executor: SessionExecutor,
  input: Readonly<{
    readonly participantId: string;
    readonly scopeId: string;
    readonly idempotencyKey: string;
    readonly operation: "START" | "SAVE_ANSWER" | "FINALIZE";
    readonly fingerprint: string;
    readonly sessionId: string;
    readonly response: Readonly<Record<string, unknown>>;
    readonly createdAt: Date;
  }>,
): Promise<IdempotencyRow> {
  const expiresAt = new Date(input.createdAt.getTime() + IDEMPOTENCY_TTL_MS);
  await executor
    .delete(diagnosticSessionIdempotency)
    .where(
      and(
        eq(diagnosticSessionIdempotency.participantId, input.participantId),
        eq(diagnosticSessionIdempotency.scopeId, input.scopeId),
        eq(diagnosticSessionIdempotency.operation, input.operation),
        eq(diagnosticSessionIdempotency.idempotencyKey, input.idempotencyKey),
        lte(diagnosticSessionIdempotency.expiresAt, new Date()),
      ),
    );
  await executor
    .insert(diagnosticSessionIdempotency)
    .values({
      participantId: input.participantId,
      scopeId: input.scopeId,
      idempotencyKey: input.idempotencyKey,
      operation: input.operation,
      fingerprint: input.fingerprint,
      sessionId: input.sessionId,
      response: input.response,
      createdAt: input.createdAt,
      expiresAt,
    })
    .onConflictDoNothing();
  const stored = await findIdempotency(
    executor,
    input.participantId,
    input.scopeId,
    input.operation,
    input.idempotencyKey,
  );
  if (stored === undefined) {
    throw new DiagnosticSessionConflictError(
      "idempotency record was not persisted",
    );
  }
  idempotencyResponse(stored, input.operation, input.fingerprint);
  return stored;
}

async function appendEvents(
  executor: SessionExecutor,
  idFactory: () => string,
  input: Readonly<{
    readonly participantId: string;
    readonly scopeId: string;
    readonly sessionId: string;
    readonly correlationId: string;
    readonly occurredAt: Date;
    readonly action: string;
    readonly eventType: string;
    readonly payload: Readonly<Record<string, unknown>>;
  }>,
): Promise<void> {
  const databaseExecutor = executor as DatabaseExecutor;
  await databaseExecutor.execute(
    sql`select
      set_config('cvg.audit_write', 'on', true),
      set_config('cvg.audit_scope_id', ${input.scopeId}, true),
      set_config('cvg.audit_read', '', true)`,
  );
  const audit = createAuditEntry({
    auditId: idFactory(),
    principalId: input.participantId,
    action: input.action,
    resourceType: "DIAGNOSTIC_SESSION",
    resourceId: input.sessionId,
    scopeId: input.scopeId,
    outcome: "SUCCESS",
    requestId: input.correlationId,
    correlationId: input.correlationId,
    occurredAt: input.occurredAt.toISOString(),
  });
  await databaseExecutor.insert(auditEntries).values(auditEntryToRow(audit));
  await databaseExecutor.insert(outboxEvents).values(
    createOutboxInsert({
      eventId: idFactory(),
      eventType: input.eventType,
      aggregateType: "diagnostic_session",
      aggregateId: input.sessionId,
      occurredAt: input.occurredAt.toISOString(),
      schemaVersion: 1,
      correlationId: input.correlationId,
      payload: input.payload,
    }),
  );
}

function moduleAnswers(
  answers: readonly DiagnosticSessionAnswerState[],
): readonly ModuleAnswer[] {
  return Object.freeze(
    answers.map((answer) =>
      Object.freeze({
        itemId: answer.canonicalItemId,
        selectedChoiceIds: Object.freeze([...answer.selectedChoiceIds]),
      }),
    ),
  );
}

function assertAnswerAgainstCatalog(
  catalog: DiagnosticSessionCatalogSnapshot,
  canonicalItemId: string,
  selectedChoiceIds: readonly string[],
): void {
  const item = catalog.items.find(
    (candidate) => candidate.canonicalItemId === canonicalItemId,
  );
  if (item === undefined) {
    throw new DiagnosticSessionPersistenceError(
      "diagnostic item is outside the session snapshot",
    );
  }
  if (selectedChoiceIds.length === 0) return;
  const choiceIds = new Set(item.choices.map((choice) => choice.id));
  if (
    selectedChoiceIds.some((choiceId) => !choiceIds.has(choiceId)) ||
    (item.selectionMode === "SINGLE" && selectedChoiceIds.length !== 1)
  ) {
    throw new DiagnosticSessionPersistenceError("diagnostic answer is invalid");
  }
}

function finalizationFromStored(
  value: unknown,
): DiagnosticSessionFinalizationState {
  const candidate = record(value, "stored finalization response");
  const aggregate = aggregateFromStored(candidate.aggregate);
  return Object.freeze({
    aggregate,
    assignments: assignmentsFromStored(candidate.assignments),
  });
}

export function createDiagnosticSessionRepository(
  db: DatabaseExecutor,
  idFactory: () => string = randomUUID,
): DiagnosticSessionRepositoryPort {
  const repository: DiagnosticSessionRepositoryPort = {
    start: async (input) =>
      db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        assertInputStrings({
          participantId: input.participantId,
          scopeId: input.scopeId,
          idempotencyKey: input.idempotencyKey,
          fingerprint: input.fingerprint,
        });
        const catalog = input.catalog;
        if (catalog === undefined) {
          throw new DiagnosticSessionPersistenceError(
            "diagnostic catalog snapshot is required",
          );
        }
        await setDatabaseSecurityContext(executor, {
          participantId: input.participantId,
          scopeId: input.scopeId,
        });
        await lock(
          executor,
          `diagnostic-session:${input.participantId}:${input.scopeId}`,
        );
        const existingIdempotency = await findIdempotency(
          executor,
          input.participantId,
          input.scopeId,
          "START",
          input.idempotencyKey,
        );
        if (existingIdempotency !== undefined) {
          idempotencyResponse(existingIdempotency, "START", input.fingerprint);
          return aggregateFromStored(existingIdempotency.response);
        }
        const existing = await currentSessionRow(
          executor,
          input.participantId,
          input.scopeId,
        );
        let aggregate: DiagnosticSessionAggregate;
        let created = false;
        if (existing !== undefined) {
          // START shares the participant/scope lock with other starts, but a
          // checkpoint/finalization only takes the session lock. Refresh the
          // aggregate under that lock before making a replayable response so
          // START cannot persist a snapshot older than a concurrent command.
          await lock(executor, `diagnostic-session:${existing.id}`);
          const lockedExisting = await findSessionRow(
            executor,
            existing.id,
            input.participantId,
            input.scopeId,
          );
          if (lockedExisting === undefined) {
            throw new DiagnosticSessionNotFoundError();
          }
          aggregate = await loadAggregate(executor, lockedExisting);
        } else {
          const sessionId = idFactory();
          const startedAt = new Date(input.startedAt);
          if (Number.isNaN(startedAt.getTime())) {
            throw new DiagnosticSessionPersistenceError("startedAt is invalid");
          }
          const session = createDiagnosticSession({
            sessionId,
            participantId: input.participantId,
            scopeId: input.scopeId,
            diagnosticId: "B07-DIAGNOSTIC-V1",
            diagnosticVersion: "0.1.0",
            startedAt: startedAt.toISOString(),
          });
          await executor.insert(diagnosticSessions).values({
            id: session.sessionId,
            participantId: session.participantId,
            scopeId: session.scopeId,
            diagnosticId: session.diagnosticId,
            diagnosticVersion: session.diagnosticVersion,
            status: session.status,
            version: session.version,
            catalogSnapshot:
              catalog as unknown as PersistedDiagnosticSessionCatalogSnapshot,
            startedAt,
            lastCheckpointAt: null,
            finalizedAt: null,
            diagnosticResultId: null,
            createdAt: startedAt,
            updatedAt: startedAt,
          });
          aggregate = Object.freeze({
            session,
            catalog,
            answers: Object.freeze([]),
          });
          created = true;
        }
        const occurredAt = new Date(input.startedAt);
        await saveIdempotency(executor, {
          participantId: input.participantId,
          scopeId: input.scopeId,
          idempotencyKey: input.idempotencyKey,
          operation: "START",
          fingerprint: input.fingerprint,
          sessionId: aggregate.session.sessionId,
          response: aggregateResponse(aggregate),
          createdAt: occurredAt,
        });
        if (created) {
          await appendEvents(executor, idFactory, {
            participantId: input.participantId,
            scopeId: input.scopeId,
            sessionId: aggregate.session.sessionId,
            correlationId: input.correlationId,
            occurredAt,
            action: "diagnostic_session_started",
            eventType: "DIAGNOSTIC_SESSION_STARTED",
            payload: {
              sessionId: aggregate.session.sessionId,
              diagnosticId: aggregate.session.diagnosticId,
              diagnosticVersion: aggregate.session.diagnosticVersion,
              version: aggregate.session.version,
            },
          });
        }
        return aggregate;
      }),

    findCurrent: async (participantId, scopeId) =>
      db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSecurityContext(executor, { participantId, scopeId });
        const row = await currentSessionRow(executor, participantId, scopeId);
        return row === undefined ? null : loadAggregate(executor, row);
      }),

    findById: async (sessionId, participantId, scopeId) =>
      db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSecurityContext(executor, { participantId, scopeId });
        const row = await findSessionRow(
          executor,
          sessionId,
          participantId,
          scopeId,
        );
        return row === undefined ? null : loadAggregate(executor, row);
      }),

    saveAnswer: async (input) =>
      db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        assertInputStrings({
          participantId: input.participantId,
          scopeId: input.scopeId,
          sessionId: input.sessionId,
          canonicalItemId: input.canonicalItemId,
          idempotencyKey: input.idempotencyKey,
          fingerprint: input.fingerprint,
        });
        await setDatabaseSecurityContext(executor, {
          participantId: input.participantId,
          scopeId: input.scopeId,
        });
        await lock(executor, `diagnostic-session:${input.sessionId}`);
        const existingIdempotency = await findIdempotency(
          executor,
          input.participantId,
          input.scopeId,
          "SAVE_ANSWER",
          input.idempotencyKey,
        );
        if (existingIdempotency !== undefined) {
          idempotencyResponse(
            existingIdempotency,
            "SAVE_ANSWER",
            input.fingerprint,
          );
          return aggregateFromStored(existingIdempotency.response);
        }
        const row = await findSessionRow(
          executor,
          input.sessionId,
          input.participantId,
          input.scopeId,
        );
        if (row === undefined) throw new DiagnosticSessionNotFoundError();
        const session = sessionFromRow(row);
        if (session.status === "FINALIZADA") {
          throw new DiagnosticSessionConflictError(
            "finalized diagnostic session cannot accept answers",
          );
        }
        if (session.version !== input.expectedVersion) {
          throw new DiagnosticSessionConflictError(
            "diagnostic session version is stale",
          );
        }
        const catalog = diagnosticSessionCatalogFromSnapshot(
          row.catalogSnapshot,
        );
        assertAnswerAgainstCatalog(
          catalog,
          input.canonicalItemId,
          input.selectedChoiceIds,
        );
        const savedAt = new Date(input.savedAt);
        if (Number.isNaN(savedAt.getTime())) {
          throw new DiagnosticSessionPersistenceError("savedAt is invalid");
        }
        const updated = await executor
          .update(diagnosticSessions)
          .set({
            version: session.version + 1,
            lastCheckpointAt: savedAt,
            updatedAt: savedAt,
          })
          .where(
            and(
              eq(diagnosticSessions.id, input.sessionId),
              eq(diagnosticSessions.participantId, input.participantId),
              eq(diagnosticSessions.scopeId, input.scopeId),
              eq(diagnosticSessions.status, "EM_ANDAMENTO"),
              eq(diagnosticSessions.version, input.expectedVersion),
            ),
          )
          .returning({ id: diagnosticSessions.id });
        if (updated.length === 0) {
          throw new DiagnosticSessionConflictError(
            "diagnostic session update lost the compare-and-set",
          );
        }
        if (input.selectedChoiceIds.length === 0) {
          await executor
            .delete(diagnosticSessionAnswers)
            .where(
              and(
                eq(diagnosticSessionAnswers.sessionId, input.sessionId),
                eq(
                  diagnosticSessionAnswers.canonicalItemId,
                  input.canonicalItemId,
                ),
              ),
            );
        } else {
          await executor
            .insert(diagnosticSessionAnswers)
            .values({
              id: idFactory(),
              sessionId: input.sessionId,
              canonicalItemId: input.canonicalItemId,
              selectedChoiceIds: input.selectedChoiceIds,
              savedAt,
              createdAt: savedAt,
              updatedAt: savedAt,
            })
            .onConflictDoUpdate({
              target: [
                diagnosticSessionAnswers.sessionId,
                diagnosticSessionAnswers.canonicalItemId,
              ],
              set: {
                selectedChoiceIds: input.selectedChoiceIds,
                savedAt,
                updatedAt: savedAt,
              },
            });
        }
        const aggregate = await loadAggregate(executor, {
          ...row,
          version: session.version + 1,
          lastCheckpointAt: savedAt,
          updatedAt: savedAt,
        });
        await saveIdempotency(executor, {
          participantId: input.participantId,
          scopeId: input.scopeId,
          idempotencyKey: input.idempotencyKey,
          operation: "SAVE_ANSWER",
          fingerprint: input.fingerprint,
          sessionId: input.sessionId,
          response: aggregateResponse(aggregate),
          createdAt: savedAt,
        });
        await appendEvents(executor, idFactory, {
          participantId: input.participantId,
          scopeId: input.scopeId,
          sessionId: input.sessionId,
          correlationId: input.correlationId,
          occurredAt: savedAt,
          action: "diagnostic_answer_saved",
          eventType: "DIAGNOSTIC_SESSION_CHECKPOINTED",
          payload: {
            sessionId: input.sessionId,
            version: aggregate.session.version,
            answeredItemCount: aggregate.answers.length,
          },
        });
        return aggregate;
      }),

    finalize: async (input) =>
      db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        assertInputStrings({
          participantId: input.participantId,
          scopeId: input.scopeId,
          sessionId: input.sessionId,
          idempotencyKey: input.idempotencyKey,
          fingerprint: input.fingerprint,
        });
        await setDatabaseSecurityContext(executor, {
          participantId: input.participantId,
          scopeId: input.scopeId,
        });
        await lock(executor, `diagnostic-session:${input.sessionId}`);
        const existingIdempotency = await findIdempotency(
          executor,
          input.participantId,
          input.scopeId,
          "FINALIZE",
          input.idempotencyKey,
        );
        if (existingIdempotency !== undefined) {
          idempotencyResponse(
            existingIdempotency,
            "FINALIZE",
            input.fingerprint,
          );
          return finalizationFromStored(existingIdempotency.response);
        }
        const row = await findSessionRow(
          executor,
          input.sessionId,
          input.participantId,
          input.scopeId,
        );
        if (row === undefined) throw new DiagnosticSessionNotFoundError();
        const session = sessionFromRow(row);
        if (session.status === "FINALIZADA") {
          throw new DiagnosticSessionConflictError(
            "diagnostic session is already finalized",
          );
        }
        if (session.version !== input.expectedVersion) {
          throw new DiagnosticSessionConflictError(
            "diagnostic session version is stale",
          );
        }
        const catalog = diagnosticSessionCatalogFromSnapshot(
          row.catalogSnapshot,
        );
        const answerRows = await executor
          .select()
          .from(diagnosticSessionAnswers)
          .where(eq(diagnosticSessionAnswers.sessionId, input.sessionId))
          .orderBy(asc(diagnosticSessionAnswers.canonicalItemId));
        const answers = Object.freeze(
          answerRows.map((answer) => answerFromRow(answer, catalog)),
        );
        const evaluation = input.evaluate(moduleAnswers(answers), catalog);
        const completedAt = new Date(input.completedAt);
        if (Number.isNaN(completedAt.getTime())) {
          throw new DiagnosticSessionPersistenceError("completedAt is invalid");
        }
        const resultId = idFactory();
        const resultRow = diagnosticResultStateToRow(
          {
            participantId: input.participantId,
            scopeId: input.scopeId,
            completedAt: completedAt.toISOString(),
            result: evaluation.result,
          },
          resultId,
        );
        await executor.insert(diagnosticResults).values({
          ...resultRow,
          sessionId: input.sessionId,
        });
        const assignments = await materializeCurriculumAssignmentsInTransaction(
          executor,
          {
            diagnosticResultId: resultId,
            participantId: input.participantId,
            scopeId: input.scopeId,
            moduleIds: evaluation.moduleIds,
          } satisfies MaterializeCurriculumAssignmentsInput,
          idFactory,
        );
        const updated = await executor
          .update(diagnosticSessions)
          .set({
            status: "FINALIZADA",
            version: session.version + 1,
            finalizedAt: completedAt,
            diagnosticResultId: resultId,
            updatedAt: completedAt,
          })
          .where(
            and(
              eq(diagnosticSessions.id, input.sessionId),
              eq(diagnosticSessions.participantId, input.participantId),
              eq(diagnosticSessions.scopeId, input.scopeId),
              eq(diagnosticSessions.status, "EM_ANDAMENTO"),
              eq(diagnosticSessions.version, input.expectedVersion),
            ),
          )
          .returning({ id: diagnosticSessions.id });
        if (updated.length === 0) {
          throw new DiagnosticSessionConflictError(
            "diagnostic session finalization lost the compare-and-set",
          );
        }
        const finalAggregate = await loadAggregate(executor, {
          ...row,
          status: "FINALIZADA",
          version: session.version + 1,
          finalizedAt: completedAt,
          diagnosticResultId: resultId,
          updatedAt: completedAt,
        });
        const finalization = Object.freeze({
          aggregate: finalAggregate,
          assignments,
        });
        await saveIdempotency(executor, {
          participantId: input.participantId,
          scopeId: input.scopeId,
          idempotencyKey: input.idempotencyKey,
          operation: "FINALIZE",
          fingerprint: input.fingerprint,
          sessionId: input.sessionId,
          response: finalizationResponse(finalization),
          createdAt: completedAt,
        });
        await appendEvents(executor, idFactory, {
          participantId: input.participantId,
          scopeId: input.scopeId,
          sessionId: input.sessionId,
          correlationId: input.correlationId,
          occurredAt: completedAt,
          action: "diagnostic_session_finalized",
          eventType: "DIAGNOSTIC_SESSION_FINALIZED",
          payload: {
            sessionId: input.sessionId,
            diagnosticResultId: resultId,
            version: finalAggregate.session.version,
            answeredItemCount: finalAggregate.answers.length,
            assignmentCount: assignments.assignments.length,
          },
        });
        return finalization;
      }),
  };
  return Object.freeze(repository);
}
