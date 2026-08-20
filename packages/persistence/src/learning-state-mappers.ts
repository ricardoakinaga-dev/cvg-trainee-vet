import type {
  AppealDecision,
  AppealStatus,
  AssessmentWorkflowStatus,
  FeedbackTechnicalContext,
  FeedbackTicketHistoryEntry,
  FeedbackTicketPriority,
  FeedbackTicketResponse,
  FeedbackTicketState,
  FeedbackTicketStatus,
  FeedbackTicketType,
  LearningAssignmentBlockReason,
  LearningAssignmentPauseReason,
  LearningAssignmentStatus,
} from "@cvg/domain";
import { inspectFeedbackContent } from "@cvg/domain";
import type {
  AppealInsertRow,
  AppealRowShape,
  AssessmentWorkflowInsertRow,
  AssessmentWorkflowRowShape,
  FeedbackTicketInsertRow,
  FeedbackTicketRowShape,
  LearningAssignmentInsertRow,
  LearningAssignmentRowShape,
  PersistenceContext,
  ScopedAppeal,
  ScopedAssessmentWorkflow,
  ScopedFeedbackTicket,
  ScopedLearningAssignment,
} from "./learning-state-repository.js";

export class LearningStateMappingError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "LearningStateMappingError";
  }
}

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
const pauseReasons: readonly LearningAssignmentPauseReason[] = [
  "AFASTAMENTO",
  "ACOMODACAO",
  "JANELA_OPERACIONAL",
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

export function assertNonEmpty(
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

function assertFeedbackTechnicalContext(
  context: FeedbackTechnicalContext,
): void {
  if (!/^\/[A-Za-z0-9][A-Za-z0-9/_:-]{0,127}$/u.test(context.logicalPage)) {
    throw new LearningStateMappingError(
      "technicalContext.logicalPage is invalid",
    );
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/u.test(context.appVersion)) {
    throw new LearningStateMappingError(
      "technicalContext.appVersion is invalid",
    );
  }
  if (context.occurredAt !== undefined) {
    assertTimestamp(context.occurredAt, "technicalContext.occurredAt");
  }
  if (
    context.errorCode !== undefined &&
    !/^[A-Z0-9][A-Z0-9_.:-]{0,63}$/u.test(context.errorCode)
  ) {
    throw new LearningStateMappingError(
      "technicalContext.errorCode is invalid",
    );
  }
}

function feedbackTechnicalContextToColumns(
  context: FeedbackTechnicalContext | undefined,
): Pick<
  FeedbackTicketInsertRow,
  "logicalPage" | "appVersion" | "occurredAt" | "errorCode"
> {
  if (context === undefined) {
    return {
      logicalPage: null,
      appVersion: null,
      occurredAt: null,
      errorCode: null,
    };
  }
  assertFeedbackTechnicalContext(context);
  return {
    logicalPage: context.logicalPage,
    appVersion: context.appVersion,
    occurredAt:
      context.occurredAt === undefined ? null : new Date(context.occurredAt),
    errorCode: context.errorCode ?? null,
  };
}

function feedbackTechnicalContextFromRow(
  row: FeedbackTicketRowShape,
): FeedbackTechnicalContext | undefined {
  const logicalPage = row.logicalPage ?? null;
  const appVersion = row.appVersion ?? null;
  const occurredAt = row.occurredAt ?? null;
  const errorCode = row.errorCode ?? null;
  if (
    logicalPage === null &&
    appVersion === null &&
    occurredAt === null &&
    errorCode === null
  ) {
    return undefined;
  }
  if (logicalPage === null || appVersion === null) {
    throw new LearningStateMappingError(
      "technical context requires logicalPage and appVersion",
    );
  }
  const context = {
    logicalPage,
    appVersion,
    ...(occurredAt === null
      ? {}
      : { occurredAt: dateToIso(occurredAt, "technicalContext.occurredAt") }),
    ...(errorCode === null ? {} : { errorCode }),
  } satisfies FeedbackTechnicalContext;
  assertFeedbackTechnicalContext(context);
  return Object.freeze(context);
}

function feedbackTicketHistoryToColumns(
  state: FeedbackTicketState,
): readonly FeedbackTicketHistoryEntry[] {
  const history: readonly FeedbackTicketHistoryEntry[] =
    state.history ??
    Object.freeze([
      Object.freeze({
        status: state.status,
        changedAt: state.createdAt,
      }),
    ]);
  if (history.length === 0 || history.length > 100) {
    throw new LearningStateMappingError(
      "feedback ticket history must contain between 1 and 100 entries",
    );
  }
  return Object.freeze(
    history.map((entry) => {
      assertOneOf(entry.status, ticketStatuses, "history status");
      const changedAt = assertTimestamp(entry.changedAt, "history changedAt");
      if (entry.actorId !== undefined) assertNonEmpty(entry.actorId, "actorId");
      return Object.freeze({
        status: entry.status,
        changedAt: changedAt.toISOString(),
        ...(entry.actorId === undefined ? {} : { actorId: entry.actorId }),
      });
    }),
  );
}

function feedbackTicketHistoryFromRow(
  row: FeedbackTicketRowShape,
): readonly FeedbackTicketHistoryEntry[] {
  const persisted = row.history ?? null;
  if (persisted === null || persisted.length === 0) {
    return Object.freeze([
      Object.freeze({
        status: row.status as FeedbackTicketStatus,
        changedAt: dateToIso(row.updatedAt, "updatedAt"),
      }),
    ]);
  }
  if (persisted.length > 100) {
    throw new LearningStateMappingError(
      "feedback ticket history cannot exceed 100 entries",
    );
  }
  return Object.freeze(
    persisted.map((entry) => {
      if (entry === null || typeof entry !== "object") {
        throw new LearningStateMappingError(
          "feedback ticket history is invalid",
        );
      }
      assertOneOf(entry.status, ticketStatuses, "history status");
      const changedAt = assertTimestamp(entry.changedAt, "history changedAt");
      if (entry.actorId !== undefined) assertNonEmpty(entry.actorId, "actorId");
      return Object.freeze({
        status: entry.status,
        changedAt: changedAt.toISOString(),
        ...(entry.actorId === undefined ? {} : { actorId: entry.actorId }),
      });
    }),
  );
}

function feedbackTicketResponseToColumns(
  response: FeedbackTicketResponse | undefined,
): Pick<FeedbackTicketInsertRow, "response" | "responseAt" | "responseBy"> {
  if (response === undefined) {
    return { response: null, responseAt: null, responseBy: null };
  }
  assertPlainText(response.message, "response");
  if (!inspectFeedbackContent(response.message).safe) {
    throw new LearningStateMappingError("response contains prohibited content");
  }
  const responseAt = assertTimestamp(response.respondedAt, "respondedAt");
  if (response.respondedBy !== undefined) {
    assertNonEmpty(response.respondedBy, "respondedBy");
  }
  return {
    response: response.message,
    responseAt,
    responseBy: response.respondedBy ?? null,
  };
}

function feedbackTicketResponseFromRow(
  row: FeedbackTicketRowShape,
): FeedbackTicketResponse | undefined {
  const response = row.response ?? null;
  const responseAt = row.responseAt ?? null;
  const responseBy = row.responseBy ?? null;
  if (response === null && responseAt === null && responseBy === null) {
    return undefined;
  }
  if (response === null || responseAt === null) {
    throw new LearningStateMappingError(
      "feedback ticket response requires message and respondedAt",
    );
  }
  assertNonEmpty(response, "response");
  const result = {
    message: response,
    respondedAt: dateToIso(responseAt, "respondedAt"),
    ...(responseBy === null ? {} : { respondedBy: responseBy }),
  } satisfies FeedbackTicketResponse;
  if (responseBy !== null) assertNonEmpty(responseBy, "respondedBy");
  return Object.freeze(result);
}

function assertContext(context: PersistenceContext): void {
  assertNonEmpty(context.participantId, "participantId");
  assertNonEmpty(context.scopeId, "scopeId");
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

type LearningAssignmentTransitionColumns = Pick<
  LearningAssignmentInsertRow,
  "blockReason" | "pausedFrom" | "pauseReason" | "resumeAt"
>;

function assertAssignmentBlockContext(
  state: ScopedLearningAssignment["state"],
): void {
  if (
    state.status === "BLOQUEADO" &&
    (state.blockReason === undefined ||
      !blockReasons.includes(state.blockReason))
  ) {
    throw new LearningStateMappingError(
      "blocked assignment requires a supported blockReason",
    );
  }
  if (state.status !== "BLOQUEADO" && state.blockReason !== undefined) {
    throw new LearningStateMappingError(
      "blockReason is only valid for blocked assignments",
    );
  }
}

function assertAssignmentPauseOrigin(
  state: ScopedLearningAssignment["state"],
): void {
  if (
    state.status === "PAUSADO" &&
    (state.pausedFrom === undefined ||
      !pausedFromStatuses.includes(state.pausedFrom))
  ) {
    throw new LearningStateMappingError(
      "paused assignment requires a supported pausedFrom",
    );
  }
  if (state.status !== "PAUSADO" && state.pausedFrom !== undefined) {
    throw new LearningStateMappingError(
      "pausedFrom is only valid for paused assignments",
    );
  }
}

function assignmentPauseContextToColumns(
  state: ScopedLearningAssignment["state"],
): Pick<LearningAssignmentTransitionColumns, "pauseReason" | "resumeAt"> {
  if (state.status === "PAUSADO") {
    if (
      state.pauseReason === undefined ||
      !pauseReasons.includes(state.pauseReason)
    ) {
      throw new LearningStateMappingError(
        "paused assignment requires a supported pauseReason",
      );
    }
    return {
      pauseReason: state.pauseReason,
      resumeAt:
        state.resumeAt === undefined
          ? null
          : assertTimestamp(state.resumeAt, "resumeAt"),
    };
  }
  if (state.pauseReason !== undefined || state.resumeAt !== undefined) {
    throw new LearningStateMappingError(
      "pause context is only valid for paused assignments",
    );
  }
  return { pauseReason: null, resumeAt: null };
}

function assignmentTransitionContextToColumns(
  state: ScopedLearningAssignment["state"],
): LearningAssignmentTransitionColumns {
  assertAssignmentBlockContext(state);
  assertAssignmentPauseOrigin(state);
  return {
    blockReason: state.blockReason ?? null,
    pausedFrom: state.pausedFrom ?? null,
    ...assignmentPauseContextToColumns(state),
  };
}

export function learningAssignmentStateToRow(
  input: ScopedLearningAssignment,
): LearningAssignmentInsertRow {
  const { state } = input;
  assertContextMatches(
    { participantId: state.participantId, scopeId: input.scopeId },
    state.participantId,
  );
  assertNonEmpty(state.assignmentId, "assignmentId");
  assertModuleId(state.moduleId);
  const availableAt = assertTimestamp(state.availableAt, "availableAt");
  assertOneOf(state.status, assignmentStatuses, "status");
  assertVersion(state.version, "assignment version");
  const { blockReason, pausedFrom, pauseReason, resumeAt } =
    assignmentTransitionContextToColumns(state);
  return Object.freeze({
    id: state.assignmentId,
    participantId: state.participantId,
    scopeId: input.scopeId,
    moduleId: state.moduleId,
    availableAt,
    status: state.status,
    version: state.version,
    blockReason,
    pausedFrom,
    pauseReason,
    resumeAt,
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
    if (row.pauseReason === null) {
      throw new LearningStateMappingError(
        "paused assignment requires pauseReason",
      );
    }
    assertOneOf(row.pauseReason, pauseReasons, "pauseReason");
    if (row.resumeAt !== null) dateToIso(row.resumeAt, "resumeAt");
  } else if (row.pausedFrom !== null) {
    throw new LearningStateMappingError(
      "pausedFrom is only valid for paused assignments",
    );
  } else if (row.pauseReason !== null || row.resumeAt !== null) {
    throw new LearningStateMappingError(
      "pause context is only valid for paused assignments",
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
      ...(row.pauseReason === null
        ? {}
        : { pauseReason: row.pauseReason as LearningAssignmentPauseReason }),
      ...(row.resumeAt === null
        ? {}
        : { resumeAt: row.resumeAt.toISOString() }),
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
  if (!inspectFeedbackContent(input.state.description).safe) {
    throw new LearningStateMappingError(
      "description contains prohibited content",
    );
  }
  assertTimestamp(input.state.createdAt, "createdAt");
  assertVersion(input.state.version, "ticket version");
  assertOneOf(input.state.status, ticketStatuses, "status");
  const priority = input.state.priority ?? "NORMAL";
  assertOneOf(priority, ticketPriorities, "priority");
  const technicalContext = feedbackTechnicalContextToColumns(
    input.state.technicalContext,
  );
  const response = feedbackTicketResponseToColumns(input.state.response);
  const history = feedbackTicketHistoryToColumns(input.state);
  return Object.freeze({
    id: input.state.ticketId,
    participantId: input.state.participantId,
    scopeId: input.scopeId,
    type: input.state.type,
    description: input.state.description,
    createdAt: new Date(input.state.createdAt),
    alertedAt:
      input.state.alertedAt === undefined
        ? null
        : new Date(input.state.alertedAt),
    version: input.state.version,
    status: input.state.status,
    priority,
    assigneeId: input.state.assigneeId ?? null,
    ...response,
    history,
    ...technicalContext,
  });
}

export function feedbackTicketRowToState(
  row: FeedbackTicketRowShape,
): ScopedFeedbackTicket {
  assertNonEmpty(row.id, "id");
  assertNonEmpty(row.participantId, "participantId");
  assertNonEmpty(row.scopeId, "scopeId");
  assertOneOf(row.type, ticketTypes, "type");
  assertNonEmpty(row.description, "description");
  assertTimestamp(dateToIso(row.createdAt, "createdAt"), "createdAt");
  assertVersion(row.version, "ticket version");
  assertOneOf(row.status, ticketStatuses, "status");
  const priority = row.priority ?? "NORMAL";
  assertOneOf(priority, ticketPriorities, "priority");
  dateToIso(row.updatedAt, "updatedAt");
  const technicalContext = feedbackTechnicalContextFromRow(row);
  const response = feedbackTicketResponseFromRow(row);
  const history = feedbackTicketHistoryFromRow(row);
  return Object.freeze({
    scopeId: row.scopeId,
    state: Object.freeze({
      ticketId: row.id,
      participantId: row.participantId,
      type: row.type,
      description: row.description,
      createdAt: row.createdAt.toISOString(),
      ...(row.alertedAt === null || row.alertedAt === undefined
        ? {}
        : { alertedAt: row.alertedAt.toISOString() }),
      priority,
      ...(row.assigneeId === null || row.assigneeId === undefined
        ? {}
        : { assigneeId: row.assigneeId }),
      ...(response === undefined ? {} : { response }),
      history,
      version: row.version,
      status: row.status,
      ...(technicalContext === undefined ? {} : { technicalContext }),
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
  if (input.state.decision !== undefined) {
    assertOneOf(input.state.decision, appealDecisions, "decision");
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
  if (row.decision !== null)
    assertOneOf(row.decision, appealDecisions, "decision");
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
    }),
  });
}
