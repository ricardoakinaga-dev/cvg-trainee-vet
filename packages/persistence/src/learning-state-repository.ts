import { randomUUID } from "node:crypto";

import { and, asc, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  AppealDecision,
  AppealState,
  AppealStatus,
  AssessmentWorkflowState,
  AssessmentWorkflowStatus,
  FeedbackTicketPriority,
  FeedbackTicketState,
  FeedbackTicketStatus,
  FeedbackTicketType,
  LearningAssignmentBlockReason,
  LearningAssignmentState,
  LearningAssignmentStatus,
} from "@cvg/domain";

import {
  activityAssignments,
  auditEntries,
  appeals,
  assessmentWorkflows,
  feedbackTicketHistory,
  feedbackTickets,
  learningActivities,
  learningAssignments,
} from "./schema.js";
import type * as schema from "./schema.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;
type DatabaseTransaction = Parameters<
  Parameters<DatabaseExecutor["transaction"]>[0]
>[0];

type PersistedAssignmentStatus = Exclude<
  LearningAssignmentStatus,
  "NAO_ATRIBUIDO"
>;

const syncableActivityStatuses: Readonly<
  Record<PersistedAssignmentStatus, readonly PersistedAssignmentStatus[]>
> = {
  ATRIBUIDO: ["ATRIBUIDO", "BLOQUEADO"],
  DISPONIVEL: ["DISPONIVEL", "ATRIBUIDO", "BLOQUEADO"],
  EM_ANDAMENTO: ["EM_ANDAMENTO", "DISPONIVEL", "PAUSADO"],
  CONCLUIDO: [
    "CONCLUIDO",
    "EM_ANDAMENTO",
    "EM_REFORCO",
    "CONCLUIDO_COM_RETENCAO_PENDENTE",
  ],
  EM_REFORCO: ["EM_REFORCO", "EM_ANDAMENTO", "CONCLUIDO_COM_RETENCAO_PENDENTE"],
  CONCLUIDO_COM_RETENCAO_PENDENTE: [
    "CONCLUIDO_COM_RETENCAO_PENDENTE",
    "CONCLUIDO",
  ],
  PAUSADO: [
    "PAUSADO",
    "ATRIBUIDO",
    "DISPONIVEL",
    "EM_ANDAMENTO",
    "EM_REFORCO",
    "CONCLUIDO_COM_RETENCAO_PENDENTE",
  ],
  BLOQUEADO: [
    "BLOQUEADO",
    "ATRIBUIDO",
    "DISPONIVEL",
    "EM_ANDAMENTO",
    "EM_REFORCO",
    "CONCLUIDO_COM_RETENCAO_PENDENTE",
  ],
};

export class LearningStateMappingError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "LearningStateMappingError";
  }
}

export class LearningStatePersistenceConflictError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "LearningStatePersistenceConflictError";
  }
}

export type PersistenceContext = Readonly<{
  readonly participantId: string;
  readonly scopeId: string;
  readonly actorId?: string;
  readonly requestId?: string;
  readonly correlationId?: string;
}>;

export type ScopedLearningAssignment = Readonly<{
  readonly scopeId: string;
  readonly state: LearningAssignmentState;
}>;

export type ScopedAssessmentWorkflow = Readonly<{
  readonly scopeId: string;
  readonly participantId: string;
  readonly state: AssessmentWorkflowState;
}>;

export type ScopedFeedbackTicket = Readonly<{
  readonly scopeId: string;
  readonly state: FeedbackTicketState;
}>;

export type ScopedAppeal = Readonly<{
  readonly scopeId: string;
  readonly state: AppealState;
}>;

export type LearningAssignmentRowShape = Readonly<{
  readonly id: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly availableAt: Date;
  readonly status: string;
  readonly version: number;
  readonly blockReason: string | null;
  readonly pausedFrom: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}>;

export type LearningAssignmentInsertRow = Readonly<{
  readonly id: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly availableAt: Date;
  readonly status: LearningAssignmentStatus;
  readonly version: number;
  readonly blockReason: LearningAssignmentBlockReason | null;
  readonly pausedFrom: Exclude<LearningAssignmentStatus, "PAUSADO"> | null;
}>;

export type AssessmentWorkflowRowShape = Readonly<{
  readonly resultId: string;
  readonly attemptId: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly ruleVersion: string;
  readonly version: number;
  readonly status: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}>;

export type AssessmentWorkflowInsertRow = Readonly<{
  readonly resultId: string;
  readonly attemptId: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly ruleVersion: string;
  readonly version: number;
  readonly status: AssessmentWorkflowStatus;
}>;

export type FeedbackTicketRowShape = Readonly<{
  readonly id: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly type: string;
  readonly description: string;
  readonly createdAt: Date;
  readonly version: number;
  readonly status: string;
  readonly priority?: string;
  readonly assigneeId?: string | null;
  readonly updatedAt: Date;
}>;

export type FeedbackTicketInsertRow = Readonly<{
  readonly id: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly type: FeedbackTicketType;
  readonly description: string;
  readonly createdAt: Date;
  readonly version: number;
  readonly status: FeedbackTicketStatus;
  readonly priority: FeedbackTicketPriority;
  readonly assigneeId: string | null;
}>;

export type AppealRowShape = Readonly<{
  readonly id: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly attemptId: string;
  readonly itemId: string;
  readonly justification: string;
  readonly createdAt: Date;
  readonly dueAt: Date;
  readonly version: number;
  readonly status: string;
  readonly reviewerId: string | null;
  readonly decision: string | null;
  readonly decisionRationale: string | null;
  readonly decisionAt: Date | null;
  readonly decisionCorrelationId: string | null;
  readonly updatedAt: Date;
}>;

export type AppealInsertRow = Readonly<{
  readonly id: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly attemptId: string;
  readonly itemId: string;
  readonly justification: string;
  readonly createdAt: Date;
  readonly dueAt: Date;
  readonly version: number;
  readonly status: AppealStatus;
  readonly reviewerId: string | null;
  readonly decision: AppealDecision | null;
  readonly decisionRationale: string | null;
  readonly decisionAt: Date | null;
  readonly decisionCorrelationId: string | null;
}>;

const assignmentStatuses: readonly LearningAssignmentStatus[] = [
  "NAO_ATRIBUIDO",
  "ATRIBUIDO",
  "DISPONIVEL",
  "EM_ANDAMENTO",
  "CONCLUIDO",
  "EM_REFORCO",
  "CONCLUIDO_COM_RETENCAO_PENDENTE",
  "PAUSADO",
  "BLOQUEADO",
];
const blockReasons: readonly LearningAssignmentBlockReason[] = [
  "PRE_REQUISITO",
  "CONTEUDO_RETIRADO",
  "OBJETIVO_EM_REMEDIACAO",
];
const pausedFromStatuses: readonly Exclude<
  LearningAssignmentStatus,
  "PAUSADO"
>[] = [
  "NAO_ATRIBUIDO",
  "ATRIBUIDO",
  "DISPONIVEL",
  "EM_ANDAMENTO",
  "CONCLUIDO",
  "EM_REFORCO",
  "CONCLUIDO_COM_RETENCAO_PENDENTE",
  "BLOQUEADO",
];
const workflowStatuses: readonly AssessmentWorkflowStatus[] = [
  "RESULTADO_EM_PROCESSAMENTO",
  "RESULTADO_DISPONIVEL",
  "RESULTADO_EM_REVISAO",
  "RESULTADO_CORRIGIDO",
  "RESULTADO_ANULADO",
];
const ticketTypes: readonly FeedbackTicketType[] = [
  "BUG_TECNICO",
  "USABILIDADE",
  "ERRO_CONTEUDO",
  "MELHORIA",
  "CONTESTACAO",
];
const ticketStatuses: readonly FeedbackTicketStatus[] = [
  "NOVO",
  "TRIADO",
  "EM_TRATAMENTO",
  "AGUARDA_USUARIO",
  "RESOLVIDO",
  "DUPLICADO",
  "NAO_REPRODUZIDO",
  "NAO_PLANEJADO",
];
const ticketPriorities: readonly FeedbackTicketPriority[] = [
  "BAIXA",
  "NORMAL",
  "ALTA",
  "URGENTE",
];
const appealStatuses: readonly AppealStatus[] = [
  "ABERTA",
  "EM_REVISAO",
  "DECIDIDA",
  "RECALCULO_PENDENTE",
  "ENCERRADA",
];
const appealDecisions: readonly AppealDecision[] = [
  "MANTER_RESULTADO",
  "ANULAR_ITEM",
  "ALTERAR_RESULTADO",
];
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function assertNonEmpty(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new LearningStateMappingError(`${field} must not be empty`);
  }
}

function assertVersion(value: number, field = "version"): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new LearningStateMappingError(
      `${field} must be a non-negative integer`,
    );
  }
}

function assertTimestamp(value: string, field: string): Date {
  assertNonEmpty(value, field);
  const date = new Date(value);
  if (
    Number.isNaN(date.getTime()) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/u.test(
      value,
    )
  ) {
    throw new LearningStateMappingError(`${field} must be an ISO timestamp`);
  }
  return date;
}

function dateToIso(value: Date, field: string): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new LearningStateMappingError(`${field} must be a valid timestamp`);
  }
  return value.toISOString();
}

function assertOneOf<T extends string>(
  value: string,
  values: readonly T[],
  field: string,
): asserts value is T {
  if (!values.includes(value as T)) {
    throw new LearningStateMappingError(`${field} is not supported`);
  }
}

function assertPlainText(value: string, field: string): void {
  assertNonEmpty(value, field);
  if (value.length > 10_000 || /<[^>]*>/u.test(value)) {
    throw new LearningStateMappingError(`${field} must be plain text`);
  }
}

function assertContext(context: PersistenceContext): void {
  assertNonEmpty(context.participantId, "participantId");
  assertNonEmpty(context.scopeId, "scopeId");
}

function assertFeedbackAuditContext(
  context: PersistenceContext,
): asserts context is PersistenceContext & {
  readonly actorId: string;
  readonly requestId: string;
  readonly correlationId: string;
} {
  const fields = [
    ["actorId", context.actorId],
    ["requestId", context.requestId],
    ["correlationId", context.correlationId],
  ] as const;
  for (const [field, value] of fields) {
    if (value === undefined || !uuidPattern.test(value)) {
      throw new LearningStateMappingError(
        `${field} is required for feedback audit`,
      );
    }
  }
}

function assertContextMatches(
  context: PersistenceContext,
  participantId: string,
): void {
  assertContext(context);
  assertNonEmpty(participantId, "participantId");
  if (context.participantId !== participantId) {
    throw new LearningStateMappingError(
      "persistence context does not match participant",
    );
  }
}

function assertModuleId(value: string): void {
  if (!/^M(?:0[1-9]|1[0-9]|2[0-4])$/u.test(value)) {
    throw new LearningStateMappingError("moduleId is invalid");
  }
}

export function learningAssignmentStateToRow(
  input: ScopedLearningAssignment,
): LearningAssignmentInsertRow {
  assertContextMatches(
    { participantId: input.state.participantId, scopeId: input.scopeId },
    input.state.participantId,
  );
  assertNonEmpty(input.state.assignmentId, "assignmentId");
  assertModuleId(input.state.moduleId);
  const availableAt = assertTimestamp(input.state.availableAt, "availableAt");
  assertOneOf(input.state.status, assignmentStatuses, "status");
  assertVersion(input.state.version, "assignment version");
  if (
    input.state.status === "BLOQUEADO" &&
    (input.state.blockReason === undefined ||
      !blockReasons.includes(input.state.blockReason))
  ) {
    throw new LearningStateMappingError(
      "blocked assignment requires a supported blockReason",
    );
  }
  if (
    input.state.status !== "BLOQUEADO" &&
    input.state.blockReason !== undefined
  ) {
    throw new LearningStateMappingError(
      "blockReason is only valid for blocked assignments",
    );
  }
  if (
    input.state.status === "PAUSADO" &&
    (input.state.pausedFrom === undefined ||
      !pausedFromStatuses.includes(input.state.pausedFrom))
  ) {
    throw new LearningStateMappingError(
      "paused assignment requires a supported pausedFrom",
    );
  }
  if (
    input.state.status !== "PAUSADO" &&
    input.state.pausedFrom !== undefined
  ) {
    throw new LearningStateMappingError(
      "pausedFrom is only valid for paused assignments",
    );
  }
  return Object.freeze({
    id: input.state.assignmentId,
    participantId: input.state.participantId,
    scopeId: input.scopeId,
    moduleId: input.state.moduleId,
    availableAt,
    status: input.state.status,
    version: input.state.version,
    blockReason: input.state.blockReason ?? null,
    pausedFrom: input.state.pausedFrom ?? null,
  });
}

export function learningAssignmentRowToState(
  row: LearningAssignmentRowShape,
): ScopedLearningAssignment {
  assertNonEmpty(row.id, "id");
  assertNonEmpty(row.participantId, "participantId");
  assertNonEmpty(row.scopeId, "scopeId");
  assertModuleId(row.moduleId);
  assertTimestamp(dateToIso(row.availableAt, "availableAt"), "availableAt");
  assertOneOf(row.status, assignmentStatuses, "status");
  assertVersion(row.version, "assignment version");
  if (row.status === "BLOQUEADO") {
    if (row.blockReason === null) {
      throw new LearningStateMappingError(
        "blocked assignment requires blockReason",
      );
    }
    assertOneOf(row.blockReason, blockReasons, "blockReason");
  } else if (row.blockReason !== null) {
    throw new LearningStateMappingError(
      "blockReason is only valid for blocked assignments",
    );
  }
  if (row.status === "PAUSADO") {
    if (row.pausedFrom === null) {
      throw new LearningStateMappingError(
        "paused assignment requires pausedFrom",
      );
    }
    assertOneOf(row.pausedFrom, pausedFromStatuses, "pausedFrom");
  } else if (row.pausedFrom !== null) {
    throw new LearningStateMappingError(
      "pausedFrom is only valid for paused assignments",
    );
  }
  dateToIso(row.createdAt, "createdAt");
  dateToIso(row.updatedAt, "updatedAt");
  return Object.freeze({
    scopeId: row.scopeId,
    state: Object.freeze({
      assignmentId: row.id,
      participantId: row.participantId,
      moduleId: row.moduleId,
      availableAt: row.availableAt.toISOString(),
      status: row.status,
      version: row.version,
      ...(row.blockReason === null ? {} : { blockReason: row.blockReason }),
      ...(row.pausedFrom === null ? {} : { pausedFrom: row.pausedFrom }),
    }),
  });
}

export function assessmentWorkflowStateToRow(
  input: ScopedAssessmentWorkflow,
): AssessmentWorkflowInsertRow {
  assertContextMatches(input, input.participantId);
  assertNonEmpty(input.state.resultId, "resultId");
  assertNonEmpty(input.state.attemptId, "attemptId");
  assertNonEmpty(input.state.ruleVersion, "ruleVersion");
  assertVersion(input.state.version, "workflow version");
  assertOneOf(input.state.status, workflowStatuses, "status");
  return Object.freeze({
    resultId: input.state.resultId,
    attemptId: input.state.attemptId,
    participantId: input.participantId,
    scopeId: input.scopeId,
    ruleVersion: input.state.ruleVersion,
    version: input.state.version,
    status: input.state.status,
  });
}

export function assessmentWorkflowRowToState(
  row: AssessmentWorkflowRowShape,
): ScopedAssessmentWorkflow {
  assertNonEmpty(row.resultId, "resultId");
  assertNonEmpty(row.attemptId, "attemptId");
  assertNonEmpty(row.participantId, "participantId");
  assertNonEmpty(row.scopeId, "scopeId");
  assertNonEmpty(row.ruleVersion, "ruleVersion");
  assertVersion(row.version, "workflow version");
  assertOneOf(row.status, workflowStatuses, "status");
  dateToIso(row.createdAt, "createdAt");
  dateToIso(row.updatedAt, "updatedAt");
  return Object.freeze({
    scopeId: row.scopeId,
    participantId: row.participantId,
    state: Object.freeze({
      resultId: row.resultId,
      attemptId: row.attemptId,
      ruleVersion: row.ruleVersion,
      version: row.version,
      status: row.status,
    }),
  });
}

export function feedbackTicketStateToRow(
  input: ScopedFeedbackTicket,
): FeedbackTicketInsertRow {
  assertContextMatches(
    { participantId: input.state.participantId, scopeId: input.scopeId },
    input.state.participantId,
  );
  assertNonEmpty(input.state.ticketId, "ticketId");
  assertOneOf(input.state.type, ticketTypes, "type");
  assertPlainText(input.state.description, "description");
  assertTimestamp(input.state.createdAt, "createdAt");
  assertVersion(input.state.version, "ticket version");
  assertOneOf(input.state.status, ticketStatuses, "status");
  assertOneOf(input.state.priority, ticketPriorities, "priority");
  if (input.state.assigneeId !== undefined) {
    assertNonEmpty(input.state.assigneeId, "assigneeId");
  }
  return Object.freeze({
    id: input.state.ticketId,
    participantId: input.state.participantId,
    scopeId: input.scopeId,
    type: input.state.type,
    description: input.state.description,
    createdAt: new Date(input.state.createdAt),
    version: input.state.version,
    status: input.state.status,
    priority: input.state.priority,
    assigneeId: input.state.assigneeId ?? null,
  });
}

export function feedbackTicketRowToState(
  row: FeedbackTicketRowShape,
): ScopedFeedbackTicket {
  assertNonEmpty(row.id, "id");
  assertNonEmpty(row.participantId, "participantId");
  assertNonEmpty(row.scopeId, "scopeId");
  assertOneOf(row.type, ticketTypes, "type");
  assertPlainText(row.description, "description");
  assertTimestamp(dateToIso(row.createdAt, "createdAt"), "createdAt");
  assertVersion(row.version, "ticket version");
  assertOneOf(row.status, ticketStatuses, "status");
  const priority = row.priority ?? "NORMAL";
  assertOneOf(priority, ticketPriorities, "priority");
  if (row.assigneeId !== undefined && row.assigneeId !== null) {
    assertNonEmpty(row.assigneeId, "assigneeId");
  }
  dateToIso(row.updatedAt, "updatedAt");
  return Object.freeze({
    scopeId: row.scopeId,
    state: Object.freeze({
      ticketId: row.id,
      participantId: row.participantId,
      type: row.type,
      description: row.description,
      createdAt: row.createdAt.toISOString(),
      version: row.version,
      status: row.status,
      priority,
      ...(row.assigneeId === undefined || row.assigneeId === null
        ? {}
        : { assigneeId: row.assigneeId }),
    }),
  });
}

export function appealStateToRow(input: ScopedAppeal): AppealInsertRow {
  assertContextMatches(
    { participantId: input.state.participantId, scopeId: input.scopeId },
    input.state.participantId,
  );
  assertNonEmpty(input.state.appealId, "appealId");
  assertNonEmpty(input.state.attemptId, "attemptId");
  assertNonEmpty(input.state.itemId, "itemId");
  assertPlainText(input.state.justification, "justification");
  const createdAt = assertTimestamp(input.state.createdAt, "createdAt");
  const dueAt = assertTimestamp(input.state.dueAt, "dueAt");
  if (dueAt.getTime() < createdAt.getTime()) {
    throw new LearningStateMappingError("dueAt must not precede createdAt");
  }
  assertVersion(input.state.version, "appeal version");
  assertOneOf(input.state.status, appealStatuses, "status");
  if (input.state.reviewerId === input.state.participantId) {
    throw new LearningStateMappingError("appeal reviewer must be independent");
  }
  if (input.state.status !== "ABERTA" && input.state.reviewerId === undefined) {
    throw new LearningStateMappingError("appeal reviewer is required");
  }
  if (
    ["DECIDIDA", "RECALCULO_PENDENTE", "ENCERRADA"].includes(
      input.state.status,
    ) &&
    input.state.decision === undefined
  ) {
    throw new LearningStateMappingError("appeal decision is required");
  }
  const decisionMetadata = [
    input.state.decisionRationale,
    input.state.decisionAt,
    input.state.decisionCorrelationId,
  ];
  const decided = ["DECIDIDA", "RECALCULO_PENDENTE", "ENCERRADA"].includes(
    input.state.status,
  );
  if (decided && decisionMetadata.some((value) => value === undefined)) {
    throw new LearningStateMappingError("appeal decision metadata is required");
  }
  if (!decided && decisionMetadata.some((value) => value !== undefined)) {
    throw new LearningStateMappingError(
      "appeal decision metadata is only valid after deciding",
    );
  }
  if (input.state.decision !== undefined) {
    assertOneOf(input.state.decision, appealDecisions, "decision");
  }
  const decisionRationale = input.state.decisionRationale ?? null;
  if (decisionRationale !== null) {
    assertPlainText(decisionRationale, "decisionRationale");
  }
  const decisionAt =
    input.state.decisionAt === undefined
      ? null
      : assertTimestamp(input.state.decisionAt, "decisionAt");
  const decisionCorrelationId = input.state.decisionCorrelationId ?? null;
  if (decisionCorrelationId !== null) {
    assertNonEmpty(decisionCorrelationId, "decisionCorrelationId");
    if (!uuidPattern.test(decisionCorrelationId)) {
      throw new LearningStateMappingError(
        "decisionCorrelationId must be a UUID",
      );
    }
  }
  return Object.freeze({
    id: input.state.appealId,
    participantId: input.state.participantId,
    scopeId: input.scopeId,
    attemptId: input.state.attemptId,
    itemId: input.state.itemId,
    justification: input.state.justification,
    createdAt,
    dueAt,
    version: input.state.version,
    status: input.state.status,
    reviewerId: input.state.reviewerId ?? null,
    decision: input.state.decision ?? null,
    decisionRationale,
    decisionAt,
    decisionCorrelationId,
  });
}

export function appealRowToState(row: AppealRowShape): ScopedAppeal {
  assertNonEmpty(row.id, "id");
  assertNonEmpty(row.participantId, "participantId");
  assertNonEmpty(row.scopeId, "scopeId");
  assertNonEmpty(row.attemptId, "attemptId");
  assertNonEmpty(row.itemId, "itemId");
  assertPlainText(row.justification, "justification");
  const createdAt = dateToIso(row.createdAt, "createdAt");
  const dueAt = dateToIso(row.dueAt, "dueAt");
  if (Date.parse(dueAt) < Date.parse(createdAt)) {
    throw new LearningStateMappingError("dueAt must not precede createdAt");
  }
  assertVersion(row.version, "appeal version");
  assertOneOf(row.status, appealStatuses, "status");
  if (row.reviewerId === row.participantId) {
    throw new LearningStateMappingError("appeal reviewer must be independent");
  }
  if (row.status !== "ABERTA" && row.reviewerId === null) {
    throw new LearningStateMappingError("appeal reviewer is required");
  }
  if (
    ["DECIDIDA", "RECALCULO_PENDENTE", "ENCERRADA"].includes(row.status) &&
    row.decision === null
  ) {
    throw new LearningStateMappingError("appeal decision is required");
  }
  const decisionMetadata = [
    row.decisionRationale,
    row.decisionAt,
    row.decisionCorrelationId,
  ];
  const decided = ["DECIDIDA", "RECALCULO_PENDENTE", "ENCERRADA"].includes(
    row.status,
  );
  if (decided && decisionMetadata.some((value) => value === null)) {
    throw new LearningStateMappingError("appeal decision metadata is required");
  }
  if (!decided && decisionMetadata.some((value) => value !== null)) {
    throw new LearningStateMappingError(
      "appeal decision metadata is only valid after deciding",
    );
  }
  if (row.decision !== null)
    assertOneOf(row.decision, appealDecisions, "decision");
  const decisionRationale = row.decisionRationale;
  if (decisionRationale !== null) {
    assertPlainText(decisionRationale, "decisionRationale");
  }
  const decisionAt =
    row.decisionAt === null
      ? undefined
      : dateToIso(row.decisionAt, "decisionAt");
  if (row.decisionCorrelationId !== null) {
    assertNonEmpty(row.decisionCorrelationId, "decisionCorrelationId");
    if (!uuidPattern.test(row.decisionCorrelationId)) {
      throw new LearningStateMappingError(
        "decisionCorrelationId must be a UUID",
      );
    }
  }
  dateToIso(row.updatedAt, "updatedAt");
  return Object.freeze({
    scopeId: row.scopeId,
    state: Object.freeze({
      appealId: row.id,
      participantId: row.participantId,
      attemptId: row.attemptId,
      itemId: row.itemId,
      justification: row.justification,
      createdAt,
      dueAt,
      version: row.version,
      status: row.status,
      ...(row.reviewerId === null ? {} : { reviewerId: row.reviewerId }),
      ...(row.decision === null ? {} : { decision: row.decision }),
      ...(decisionRationale === null ? {} : { decisionRationale }),
      ...(decisionAt === undefined ? {} : { decisionAt }),
      ...(row.decisionCorrelationId === null
        ? {}
        : { decisionCorrelationId: row.decisionCorrelationId }),
    }),
  });
}

function assertPersistenceContext(context: PersistenceContext): void {
  assertContext(context);
}

async function withContext<T>(
  db: DatabaseExecutor,
  context: PersistenceContext,
  action: (tx: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  assertPersistenceContext(context);
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('cvg.participant_id', ${context.participantId}, true), set_config('cvg.scope_id', ${context.scopeId}, true)`,
    );
    return action(tx);
  });
}

async function syncBoundActivityAssignmentStatus(
  tx: DatabaseTransaction,
  context: PersistenceContext,
  assignmentId: string,
  moduleId: string,
  status: PersistedAssignmentStatus,
): Promise<void> {
  const inconsistentBinding = await tx
    .select({ activityId: activityAssignments.activityId })
    .from(activityAssignments)
    .innerJoin(
      learningActivities,
      eq(activityAssignments.activityId, learningActivities.id),
    )
    .innerJoin(
      learningAssignments,
      eq(activityAssignments.learningAssignmentId, learningAssignments.id),
    )
    .where(
      and(
        eq(activityAssignments.participantId, context.participantId),
        eq(activityAssignments.learningAssignmentId, assignmentId),
        eq(learningAssignments.participantId, context.participantId),
        eq(learningAssignments.scopeId, context.scopeId),
        eq(learningActivities.scopeId, context.scopeId),
        eq(learningActivities.status, "PUBLISHED"),
        isNotNull(learningActivities.moduleId),
        ne(learningActivities.moduleId, moduleId),
      ),
    )
    .limit(1);
  if (inconsistentBinding[0] !== undefined) {
    conflict("bound activity module does not match learning assignment");
  }

  const publishedActivityIds = tx
    .select({ id: learningActivities.id })
    .from(learningActivities)
    .where(
      and(
        eq(learningActivities.scopeId, context.scopeId),
        eq(learningActivities.status, "PUBLISHED"),
      ),
    );

  await tx
    .update(activityAssignments)
    .set({ status })
    .where(
      and(
        eq(activityAssignments.participantId, context.participantId),
        eq(activityAssignments.learningAssignmentId, assignmentId),
        inArray(activityAssignments.status, syncableActivityStatuses[status]),
        inArray(activityAssignments.activityId, publishedActivityIds),
      ),
    );
}

export type LearningStateRepository = Readonly<{
  saveLearningAssignment: (
    context: PersistenceContext,
    state: LearningAssignmentState,
  ) => Promise<ScopedLearningAssignment>;
  findLearningAssignment: (
    context: PersistenceContext,
    assignmentId: string,
  ) => Promise<ScopedLearningAssignment | null>;
  saveAssessmentWorkflow: (
    context: PersistenceContext,
    state: AssessmentWorkflowState,
  ) => Promise<ScopedAssessmentWorkflow>;
  findAssessmentWorkflow: (
    context: PersistenceContext,
    resultId: string,
  ) => Promise<ScopedAssessmentWorkflow | null>;
  saveFeedbackTicket: (
    context: PersistenceContext,
    state: FeedbackTicketState,
  ) => Promise<ScopedFeedbackTicket>;
  findFeedbackTicket: (
    context: PersistenceContext,
    ticketId: string,
  ) => Promise<ScopedFeedbackTicket | null>;
  saveAppeal: (
    context: PersistenceContext,
    state: AppealState,
  ) => Promise<ScopedAppeal>;
  findAppeal: (
    context: PersistenceContext,
    appealId: string,
  ) => Promise<ScopedAppeal | null>;
}>;

export type AppealReadRepository = Readonly<{
  readonly listAppeals: (
    context: PersistenceContext,
    attemptId: string,
  ) => Promise<readonly ScopedAppeal[]>;
}>;

function conflict(message: string): never {
  throw new LearningStatePersistenceConflictError(message);
}

export function createLearningStateRepository(
  db: DatabaseExecutor,
): LearningStateRepository {
  const saveAssignment = async (
    context: PersistenceContext,
    state: LearningAssignmentState,
  ): Promise<ScopedLearningAssignment> =>
    withContext(db, context, async (tx) => {
      const row = learningAssignmentStateToRow({
        scopeId: context.scopeId,
        state,
      });
      const now = new Date();
      if (row.version === 0) {
        const inserted = await tx
          .insert(learningAssignments)
          .values({ ...row, createdAt: now, updatedAt: now })
          .onConflictDoNothing()
          .returning({ id: learningAssignments.id });
        if (inserted.length === 0)
          conflict("learning assignment already exists");
      } else {
        const updated = await tx
          .update(learningAssignments)
          .set({
            participantId: row.participantId,
            scopeId: row.scopeId,
            moduleId: row.moduleId,
            availableAt: row.availableAt,
            status: row.status,
            version: row.version,
            blockReason: row.blockReason,
            pausedFrom: row.pausedFrom,
            updatedAt: now,
          })
          .where(
            and(
              eq(learningAssignments.id, row.id),
              eq(learningAssignments.participantId, row.participantId),
              eq(learningAssignments.scopeId, row.scopeId),
              eq(learningAssignments.version, row.version - 1),
            ),
          )
          .returning({ id: learningAssignments.id });
        if (updated.length === 0)
          conflict("learning assignment version changed");
      }
      const rows = await tx
        .select()
        .from(learningAssignments)
        .where(eq(learningAssignments.id, row.id))
        .limit(1);
      const saved = rows[0];
      if (saved === undefined)
        conflict("learning assignment was not persisted");
      if (row.status !== "NAO_ATRIBUIDO") {
        await syncBoundActivityAssignmentStatus(
          tx,
          context,
          row.id,
          row.moduleId,
          row.status,
        );
      }
      return learningAssignmentRowToState(saved);
    });

  const findAssignment = async (
    context: PersistenceContext,
    assignmentId: string,
  ): Promise<ScopedLearningAssignment | null> =>
    withContext(db, context, async (tx) => {
      const rows = await tx
        .select()
        .from(learningAssignments)
        .where(
          and(
            eq(learningAssignments.id, assignmentId),
            eq(learningAssignments.participantId, context.participantId),
            eq(learningAssignments.scopeId, context.scopeId),
          ),
        )
        .limit(1);
      const row = rows[0];
      return row === undefined ? null : learningAssignmentRowToState(row);
    });

  const saveWorkflow = async (
    context: PersistenceContext,
    state: AssessmentWorkflowState,
  ): Promise<ScopedAssessmentWorkflow> =>
    withContext(db, context, async (tx) => {
      const row = assessmentWorkflowStateToRow({
        scopeId: context.scopeId,
        participantId: context.participantId,
        state,
      });
      const now = new Date();
      if (row.version === 0) {
        const inserted = await tx
          .insert(assessmentWorkflows)
          .values({ ...row, createdAt: now, updatedAt: now })
          .onConflictDoNothing()
          .returning({ id: assessmentWorkflows.resultId });
        if (inserted.length === 0)
          conflict("assessment workflow already exists");
      } else {
        const updated = await tx
          .update(assessmentWorkflows)
          .set({
            participantId: row.participantId,
            scopeId: row.scopeId,
            attemptId: row.attemptId,
            ruleVersion: row.ruleVersion,
            status: row.status,
            version: row.version,
            updatedAt: now,
          })
          .where(
            and(
              eq(assessmentWorkflows.resultId, row.resultId),
              eq(assessmentWorkflows.participantId, row.participantId),
              eq(assessmentWorkflows.scopeId, row.scopeId),
              eq(assessmentWorkflows.version, row.version - 1),
            ),
          )
          .returning({ id: assessmentWorkflows.resultId });
        if (updated.length === 0)
          conflict("assessment workflow version changed");
      }
      const rows = await tx
        .select()
        .from(assessmentWorkflows)
        .where(eq(assessmentWorkflows.resultId, row.resultId))
        .limit(1);
      const saved = rows[0];
      if (saved === undefined)
        conflict("assessment workflow was not persisted");
      return assessmentWorkflowRowToState(saved);
    });

  const findWorkflow = async (
    context: PersistenceContext,
    resultId: string,
  ): Promise<ScopedAssessmentWorkflow | null> =>
    withContext(db, context, async (tx) => {
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

  const saveTicket = async (
    context: PersistenceContext,
    state: FeedbackTicketState,
  ): Promise<ScopedFeedbackTicket> =>
    withContext(db, context, async (tx) => {
      assertFeedbackAuditContext(context);
      const row = feedbackTicketStateToRow({ scopeId: context.scopeId, state });
      const now = new Date();
      let fromStatus: string | null = null;
      let fromPriority: string | null = null;
      let fromAssigneeId: string | null = null;
      if (row.version > 0) {
        const previousRows = await tx
          .select({
            status: feedbackTickets.status,
            priority: feedbackTickets.priority,
            assigneeId: feedbackTickets.assigneeId,
          })
          .from(feedbackTickets)
          .where(
            and(
              eq(feedbackTickets.id, row.id),
              eq(feedbackTickets.participantId, row.participantId),
              eq(feedbackTickets.scopeId, row.scopeId),
              eq(feedbackTickets.version, row.version - 1),
            ),
          )
          .limit(1);
        const previous = previousRows[0];
        if (previous === undefined) {
          conflict("feedback ticket previous version was not found");
        }
        fromStatus = previous.status;
        fromPriority = previous.priority;
        fromAssigneeId = previous.assigneeId;
      }
      if (row.version === 0) {
        const inserted = await tx
          .insert(feedbackTickets)
          .values({ ...row, updatedAt: now })
          .onConflictDoNothing()
          .returning({ id: feedbackTickets.id });
        if (inserted.length === 0) conflict("feedback ticket already exists");
      } else {
        const updated = await tx
          .update(feedbackTickets)
          .set({
            participantId: row.participantId,
            scopeId: row.scopeId,
            type: row.type,
            description: row.description,
            status: row.status,
            priority: row.priority,
            assigneeId: row.assigneeId,
            version: row.version,
            updatedAt: now,
          })
          .where(
            and(
              eq(feedbackTickets.id, row.id),
              eq(feedbackTickets.participantId, row.participantId),
              eq(feedbackTickets.scopeId, row.scopeId),
              eq(feedbackTickets.version, row.version - 1),
            ),
          )
          .returning({ id: feedbackTickets.id });
        if (updated.length === 0) conflict("feedback ticket version changed");
      }
      const rows = await tx
        .select()
        .from(feedbackTickets)
        .where(eq(feedbackTickets.id, row.id))
        .limit(1);
      const saved = rows[0];
      if (saved === undefined) conflict("feedback ticket was not persisted");
      await tx.insert(feedbackTicketHistory).values({
        ticketId: row.id,
        scopeId: row.scopeId,
        ticketVersion: row.version,
        eventType: row.version === 0 ? "CRIADO" : "STATUS_ALTERADO",
        fromStatus,
        toStatus: row.status,
        fromPriority,
        toPriority: row.priority,
        fromAssigneeId,
        toAssigneeId: row.assigneeId,
        createdAt: now,
      });
      await tx.execute(
        sql`select
          set_config('cvg.audit_write', 'on', true),
          set_config('cvg.audit_read', '', true),
          set_config('cvg.audit_scope_id', ${context.scopeId}, true)`,
      );
      await tx.insert(auditEntries).values({
        id: randomUUID(),
        actorKind: "AUTHENTICATED",
        principalId: context.actorId,
        action:
          row.version === 0
            ? "FEEDBACK_TICKET_CREATED"
            : "FEEDBACK_TICKET_STATUS_CHANGED",
        resourceType: "feedback_ticket",
        resourceId: row.id,
        scopeId: context.scopeId,
        outcome: "SUCCESS",
        reasonCode:
          row.version === 0
            ? "feedback_ticket_created"
            : "feedback_ticket_status_changed",
        requestId: context.requestId,
        correlationId: context.correlationId,
        beforeHash: null,
        afterHash: null,
        occurredAt: now,
      });
      return feedbackTicketRowToState(saved);
    });

  const findTicket = async (
    context: PersistenceContext,
    ticketId: string,
  ): Promise<ScopedFeedbackTicket | null> =>
    withContext(db, context, async (tx) => {
      const rows = await tx
        .select()
        .from(feedbackTickets)
        .where(
          and(
            eq(feedbackTickets.id, ticketId),
            eq(feedbackTickets.participantId, context.participantId),
            eq(feedbackTickets.scopeId, context.scopeId),
          ),
        )
        .limit(1);
      const row = rows[0];
      return row === undefined ? null : feedbackTicketRowToState(row);
    });

  const saveAppealState = async (
    context: PersistenceContext,
    state: AppealState,
  ): Promise<ScopedAppeal> =>
    withContext(db, context, async (tx) => {
      const row = appealStateToRow({ scopeId: context.scopeId, state });
      const now = new Date();
      if (row.version === 0) {
        const inserted = await tx
          .insert(appeals)
          .values({ ...row, updatedAt: now })
          .onConflictDoNothing()
          .returning({ id: appeals.id });
        if (inserted.length === 0) conflict("appeal already exists");
      } else {
        const updated = await tx
          .update(appeals)
          .set({
            participantId: row.participantId,
            scopeId: row.scopeId,
            attemptId: row.attemptId,
            itemId: row.itemId,
            justification: row.justification,
            createdAt: row.createdAt,
            dueAt: row.dueAt,
            status: row.status,
            version: row.version,
            reviewerId: row.reviewerId,
            decision: row.decision,
            decisionRationale: row.decisionRationale,
            decisionAt: row.decisionAt,
            decisionCorrelationId: row.decisionCorrelationId,
            updatedAt: now,
          })
          .where(
            and(
              eq(appeals.id, row.id),
              eq(appeals.participantId, row.participantId),
              eq(appeals.scopeId, row.scopeId),
              eq(appeals.version, row.version - 1),
            ),
          )
          .returning({ id: appeals.id });
        if (updated.length === 0) conflict("appeal version changed");
      }
      const rows = await tx
        .select()
        .from(appeals)
        .where(eq(appeals.id, row.id))
        .limit(1);
      const saved = rows[0];
      if (saved === undefined) conflict("appeal was not persisted");
      return appealRowToState(saved);
    });

  const findAppealState = async (
    context: PersistenceContext,
    appealId: string,
  ): Promise<ScopedAppeal | null> =>
    withContext(db, context, async (tx) => {
      const rows = await tx
        .select()
        .from(appeals)
        .where(
          and(
            eq(appeals.id, appealId),
            eq(appeals.participantId, context.participantId),
            eq(appeals.scopeId, context.scopeId),
          ),
        )
        .limit(1);
      const row = rows[0];
      return row === undefined ? null : appealRowToState(row);
    });

  return Object.freeze({
    saveLearningAssignment: saveAssignment,
    findLearningAssignment: findAssignment,
    saveAssessmentWorkflow: saveWorkflow,
    findAssessmentWorkflow: findWorkflow,
    saveFeedbackTicket: saveTicket,
    findFeedbackTicket: findTicket,
    saveAppeal: saveAppealState,
    findAppeal: findAppealState,
  });
}

export function createAppealReadRepository(
  db: DatabaseExecutor,
): AppealReadRepository {
  return Object.freeze({
    listAppeals: (context: PersistenceContext, attemptId: string) =>
      withContext(db, context, async (tx) => {
        const rows = await tx
          .select()
          .from(appeals)
          .where(
            and(
              eq(appeals.participantId, context.participantId),
              eq(appeals.scopeId, context.scopeId),
              eq(appeals.attemptId, attemptId),
            ),
          )
          .orderBy(asc(appeals.createdAt), asc(appeals.id))
          .limit(100);
        return Object.freeze(rows.map((row) => appealRowToState(row)));
      }),
  });
}

export const learningStateIdFactory = randomUUID;
