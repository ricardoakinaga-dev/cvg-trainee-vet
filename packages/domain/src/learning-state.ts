import { isValidIsoTimestamp } from "./timestamp.js";

export type LearningAssignmentStatus =
  | "NAO_ATRIBUIDO"
  | "ATRIBUIDO"
  | "DISPONIVEL"
  | "EM_ANDAMENTO"
  | "CONCLUIDO"
  | "EM_REFORCO"
  | "CONCLUIDO_COM_RETENCAO_PENDENTE"
  | "PAUSADO"
  | "BLOQUEADO";

export type LearningAssignmentBlockReason =
  "PRE_REQUISITO" | "CONTEUDO_RETIRADO" | "OBJETIVO_EM_REMEDIACAO";

export type LearningAssignmentState = Readonly<{
  readonly assignmentId: string;
  readonly participantId: string;
  readonly moduleId: string;
  readonly availableAt: string;
  readonly status: LearningAssignmentStatus;
  readonly version: number;
  readonly blockReason?: LearningAssignmentBlockReason;
  readonly pausedFrom?: Exclude<LearningAssignmentStatus, "PAUSADO">;
}>;

export type LearningAssignmentEvent =
  | { readonly type: "ATRIBUIR" }
  | { readonly type: "DISPONIBILIZAR"; readonly now: string }
  | { readonly type: "INICIAR" }
  | { readonly type: "CONCLUIR" }
  | { readonly type: "INICIAR_REFORCO" }
  | { readonly type: "CONCLUIR_REFORCO" }
  | { readonly type: "AGENDAR_RETENCAO" }
  | { readonly type: "RETENCAO_APROVADA" }
  | { readonly type: "RETENCAO_REFORCO" }
  | { readonly type: "PAUSAR" }
  | { readonly type: "RETOMAR" }
  | {
      readonly type: "BLOQUEAR";
      readonly reason: LearningAssignmentBlockReason;
    }
  | {
      readonly type: "DESBLOQUEAR";
      readonly to: "ATRIBUIDO" | "DISPONIVEL";
    };

export class LearningAssignmentDomainError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "LearningAssignmentDomainError";
  }
}

function freeze<T>(value: T): Readonly<T> {
  return Object.freeze(value);
}

function assertNonEmpty(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new LearningAssignmentDomainError(`${field} must not be empty`);
  }
}

function assertValidState(state: LearningAssignmentState): void {
  if (state === null || typeof state !== "object") {
    throw new LearningAssignmentDomainError(
      "assignment state must be an object",
    );
  }
  assertNonEmpty(state.assignmentId, "assignmentId");
  assertNonEmpty(state.participantId, "participantId");
  if (!/^M(?:0[1-9]|1[0-9]|2[0-4])$/u.test(state.moduleId)) {
    throw new LearningAssignmentDomainError("moduleId is invalid");
  }
  if (!isValidIsoTimestamp(state.availableAt)) {
    throw new LearningAssignmentDomainError(
      "availableAt must be a valid timestamp",
    );
  }
  if (!Number.isInteger(state.version) || state.version < 0) {
    throw new LearningAssignmentDomainError(
      "assignment version must be a non-negative integer",
    );
  }
  if (
    !Object.prototype.hasOwnProperty.call(assignmentTransitions, state.status)
  ) {
    throw new LearningAssignmentDomainError(
      "assignment state is not supported",
    );
  }
  if (state.status === "PAUSADO" && state.pausedFrom === undefined) {
    throw new LearningAssignmentDomainError(
      "paused assignment must preserve its previous state",
    );
  }
  if (state.status !== "PAUSADO" && state.pausedFrom !== undefined) {
    throw new LearningAssignmentDomainError(
      "pausedFrom is only allowed for paused assignments",
    );
  }
  if (state.status === "BLOQUEADO" && state.blockReason === undefined) {
    throw new LearningAssignmentDomainError(
      "blocked assignment must declare a reason",
    );
  }
  if (state.status !== "BLOQUEADO" && state.blockReason !== undefined) {
    throw new LearningAssignmentDomainError(
      "blockReason is only allowed for blocked assignments",
    );
  }
}

const assignmentTransitions: Readonly<
  Record<
    LearningAssignmentStatus,
    Readonly<
      Partial<Record<LearningAssignmentEvent["type"], LearningAssignmentStatus>>
    >
  >
> = {
  NAO_ATRIBUIDO: { ATRIBUIR: "ATRIBUIDO" },
  ATRIBUIDO: {
    DISPONIBILIZAR: "DISPONIVEL",
    PAUSAR: "PAUSADO",
    BLOQUEAR: "BLOQUEADO",
  },
  DISPONIVEL: {
    INICIAR: "EM_ANDAMENTO",
    PAUSAR: "PAUSADO",
    BLOQUEAR: "BLOQUEADO",
  },
  EM_ANDAMENTO: {
    CONCLUIR: "CONCLUIDO",
    INICIAR_REFORCO: "EM_REFORCO",
    PAUSAR: "PAUSADO",
    BLOQUEAR: "BLOQUEADO",
  },
  CONCLUIDO: { AGENDAR_RETENCAO: "CONCLUIDO_COM_RETENCAO_PENDENTE" },
  EM_REFORCO: {
    CONCLUIR_REFORCO: "CONCLUIDO",
    PAUSAR: "PAUSADO",
    BLOQUEAR: "BLOQUEADO",
  },
  CONCLUIDO_COM_RETENCAO_PENDENTE: {
    RETENCAO_APROVADA: "CONCLUIDO",
    RETENCAO_REFORCO: "EM_REFORCO",
    PAUSAR: "PAUSADO",
    BLOQUEAR: "BLOQUEADO",
  },
  PAUSADO: { RETOMAR: "EM_ANDAMENTO" },
  BLOQUEADO: { DESBLOQUEAR: "DISPONIVEL" },
};

function assertTransition(
  state: LearningAssignmentState,
  event: LearningAssignmentEvent,
): LearningAssignmentStatus {
  if (event.type === "RETOMAR" && state.status === "PAUSADO") {
    if (state.pausedFrom === undefined) {
      throw new LearningAssignmentDomainError("paused state is incomplete");
    }
    return state.pausedFrom;
  }
  if (event.type === "DESBLOQUEAR" && state.status === "BLOQUEADO") {
    return event.to;
  }
  const nextStatus = assignmentTransitions[state.status][event.type];
  if (nextStatus === undefined) {
    throw new LearningAssignmentDomainError(
      `Event ${event.type} is not allowed from state ${state.status}`,
    );
  }
  return nextStatus;
}

function stableAssignmentFields(
  state: LearningAssignmentState,
): Omit<
  LearningAssignmentState,
  "status" | "version" | "blockReason" | "pausedFrom"
> {
  return {
    assignmentId: state.assignmentId,
    participantId: state.participantId,
    moduleId: state.moduleId,
    availableAt: state.availableAt,
  };
}

export function createLearningAssignment(
  input: Readonly<{
    readonly assignmentId: string;
    readonly participantId: string;
    readonly moduleId: string;
    readonly availableAt: string;
  }>,
): LearningAssignmentState {
  assertNonEmpty(input.assignmentId, "assignmentId");
  assertNonEmpty(input.participantId, "participantId");
  if (!/^M(?:0[1-9]|1[0-9]|2[0-4])$/u.test(input.moduleId)) {
    throw new LearningAssignmentDomainError("moduleId is invalid");
  }
  if (!isValidIsoTimestamp(input.availableAt)) {
    throw new LearningAssignmentDomainError(
      "availableAt must be a valid timestamp",
    );
  }
  return freeze({
    ...input,
    status: "NAO_ATRIBUIDO" as const,
    version: 0,
  });
}

export function transitionLearningAssignment(
  state: LearningAssignmentState,
  event: LearningAssignmentEvent,
): LearningAssignmentState {
  assertValidState(state);
  const nextStatus = assertTransition(state, event);
  if (event.type === "DISPONIBILIZAR") {
    if (!isValidIsoTimestamp(event.now)) {
      throw new LearningAssignmentDomainError("now must be a valid timestamp");
    }
    if (Date.parse(event.now) < Date.parse(state.availableAt)) {
      throw new LearningAssignmentDomainError(
        "assignment is not available at the requested time",
      );
    }
  }

  const stableState = stableAssignmentFields(state);
  const next = {
    ...stableState,
    status: nextStatus,
    version: state.version + 1,
    ...(event.type === "BLOQUEAR" ? { blockReason: event.reason } : {}),
    ...(event.type === "PAUSAR"
      ? {
          pausedFrom: state.status as Exclude<
            LearningAssignmentStatus,
            "PAUSADO"
          >,
        }
      : {}),
  };
  return freeze(next);
}

export type AssessmentWorkflowStatus =
  | "RESULTADO_EM_PROCESSAMENTO"
  | "RESULTADO_DISPONIVEL"
  | "RESULTADO_EM_REVISAO"
  | "RESULTADO_CORRIGIDO"
  | "RESULTADO_ANULADO";

export interface AssessmentWorkflowState {
  readonly resultId: string;
  readonly attemptId: string;
  readonly ruleVersion: string;
  readonly version: number;
  readonly status: AssessmentWorkflowStatus;
}

export type AssessmentWorkflowEvent =
  | { readonly type: "DISPONIBILIZAR" }
  | { readonly type: "INICIAR_REVISAO" }
  | { readonly type: "CORRIGIR" }
  | { readonly type: "ANULAR" };

const assessmentWorkflowTransitions: Readonly<
  Record<
    AssessmentWorkflowStatus,
    Readonly<
      Partial<Record<AssessmentWorkflowEvent["type"], AssessmentWorkflowStatus>>
    >
  >
> = {
  RESULTADO_EM_PROCESSAMENTO: { DISPONIBILIZAR: "RESULTADO_DISPONIVEL" },
  RESULTADO_DISPONIVEL: {
    INICIAR_REVISAO: "RESULTADO_EM_REVISAO",
    ANULAR: "RESULTADO_ANULADO",
  },
  RESULTADO_EM_REVISAO: {
    CORRIGIR: "RESULTADO_CORRIGIDO",
    ANULAR: "RESULTADO_ANULADO",
  },
  RESULTADO_CORRIGIDO: { INICIAR_REVISAO: "RESULTADO_EM_REVISAO" },
  RESULTADO_ANULADO: {},
};

function assertAssessmentWorkflowState(state: AssessmentWorkflowState): void {
  if (state === null || typeof state !== "object") {
    throw new LearningAssignmentDomainError(
      "assessment workflow must be an object",
    );
  }
  assertNonEmpty(state.resultId, "resultId");
  assertNonEmpty(state.attemptId, "attemptId");
  assertNonEmpty(state.ruleVersion, "ruleVersion");
  if (!Number.isInteger(state.version) || state.version < 0) {
    throw new LearningAssignmentDomainError(
      "assessment workflow version must be non-negative",
    );
  }
  if (
    !Object.prototype.hasOwnProperty.call(
      assessmentWorkflowTransitions,
      state.status,
    )
  ) {
    throw new LearningAssignmentDomainError(
      "assessment workflow status is not supported",
    );
  }
}

export function createAssessmentWorkflowResult(
  input: Readonly<{
    readonly resultId: string;
    readonly attemptId: string;
    readonly ruleVersion: string;
  }>,
): AssessmentWorkflowState {
  assertNonEmpty(input.resultId, "resultId");
  assertNonEmpty(input.attemptId, "attemptId");
  assertNonEmpty(input.ruleVersion, "ruleVersion");
  return freeze({
    ...input,
    version: 0,
    status: "RESULTADO_EM_PROCESSAMENTO" as const,
  });
}

export function transitionAssessmentWorkflowResult(
  state: AssessmentWorkflowState,
  event: AssessmentWorkflowEvent,
): AssessmentWorkflowState {
  assertAssessmentWorkflowState(state);
  const nextStatus = assessmentWorkflowTransitions[state.status][event.type];
  if (nextStatus === undefined) {
    throw new LearningAssignmentDomainError(
      `Event ${event.type} is not allowed from state ${state.status}`,
    );
  }
  return freeze({ ...state, status: nextStatus, version: state.version + 1 });
}

export type FeedbackTicketType =
  "BUG_TECNICO" | "USABILIDADE" | "ERRO_CONTEUDO" | "MELHORIA" | "CONTESTACAO";

export type FeedbackTicketPriority = "BAIXA" | "NORMAL" | "ALTA" | "URGENTE";

export type FeedbackTicketStatus =
  | "NOVO"
  | "TRIADO"
  | "EM_TRATAMENTO"
  | "AGUARDA_USUARIO"
  | "RESOLVIDO"
  | "DUPLICADO"
  | "NAO_REPRODUZIDO"
  | "NAO_PLANEJADO";

export interface FeedbackTicketState {
  readonly ticketId: string;
  readonly participantId: string;
  readonly type: FeedbackTicketType;
  readonly description: string;
  readonly createdAt: string;
  readonly version: number;
  readonly status: FeedbackTicketStatus;
  readonly priority: FeedbackTicketPriority;
  readonly assigneeId?: string;
}

const feedbackTicketTypes: readonly FeedbackTicketType[] = [
  "BUG_TECNICO",
  "USABILIDADE",
  "ERRO_CONTEUDO",
  "MELHORIA",
  "CONTESTACAO",
];
const feedbackTicketPriorities: readonly FeedbackTicketPriority[] = [
  "BAIXA",
  "NORMAL",
  "ALTA",
  "URGENTE",
];

export type FeedbackTicketEvent =
  | { readonly type: "TRIAR" }
  | { readonly type: "INICIAR_TRATAMENTO" }
  | { readonly type: "AGUARDAR_USUARIO" }
  | { readonly type: "RESOLVER" }
  | { readonly type: "MARCAR_DUPLICADO" }
  | { readonly type: "MARCAR_NAO_REPRODUZIDO" }
  | { readonly type: "MARCAR_NAO_PLANEJADO" }
  | { readonly type: "RETOMAR_TRATAMENTO" };

const feedbackTransitions: Readonly<
  Record<
    FeedbackTicketStatus,
    Readonly<Partial<Record<FeedbackTicketEvent["type"], FeedbackTicketStatus>>>
  >
> = {
  NOVO: { TRIAR: "TRIADO" },
  TRIADO: { INICIAR_TRATAMENTO: "EM_TRATAMENTO" },
  EM_TRATAMENTO: {
    AGUARDAR_USUARIO: "AGUARDA_USUARIO",
    RESOLVER: "RESOLVIDO",
    MARCAR_DUPLICADO: "DUPLICADO",
    MARCAR_NAO_REPRODUZIDO: "NAO_REPRODUZIDO",
    MARCAR_NAO_PLANEJADO: "NAO_PLANEJADO",
  },
  AGUARDA_USUARIO: { RETOMAR_TRATAMENTO: "EM_TRATAMENTO" },
  RESOLVIDO: {},
  DUPLICADO: {},
  NAO_REPRODUZIDO: {},
  NAO_PLANEJADO: {},
};

function assertPlainText(
  value: unknown,
  field: string,
): asserts value is string {
  assertNonEmpty(value, field);
  if (value.length > 10_000 || /<[^>]*>/u.test(value)) {
    throw new LearningAssignmentDomainError(`${field} must be plain text`);
  }
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function assertFeedbackTicketPriority(
  value: unknown,
): asserts value is FeedbackTicketPriority {
  if (!feedbackTicketPriorities.includes(value as FeedbackTicketPriority)) {
    throw new LearningAssignmentDomainError(
      "feedback ticket priority is not supported",
    );
  }
}

function assertFeedbackTicketAssignee(value: string | null): void {
  if (value !== null && !uuidPattern.test(value)) {
    throw new LearningAssignmentDomainError(
      "feedback ticket assignee is invalid",
    );
  }
}

export function createFeedbackTicket(
  input: Readonly<{
    readonly ticketId: string;
    readonly participantId: string;
    readonly type: FeedbackTicketType;
    readonly description: string;
    readonly createdAt: string;
  }>,
): FeedbackTicketState {
  assertNonEmpty(input.ticketId, "ticketId");
  assertNonEmpty(input.participantId, "participantId");
  assertPlainText(input.description, "description");
  if (!isValidIsoTimestamp(input.createdAt)) {
    throw new LearningAssignmentDomainError(
      "createdAt must be a valid timestamp",
    );
  }
  if (!feedbackTicketTypes.includes(input.type)) {
    throw new LearningAssignmentDomainError("ticket type is not supported");
  }
  return freeze({
    ...input,
    status: "NOVO" as const,
    version: 0,
    priority: "NORMAL" as const,
  });
}

export function setFeedbackTicketTriage(
  state: FeedbackTicketState,
  input: Readonly<{
    readonly priority: FeedbackTicketPriority;
    readonly assigneeId: string | null;
  }>,
): FeedbackTicketState {
  if (state === null || typeof state !== "object") {
    throw new LearningAssignmentDomainError("ticket state must be an object");
  }
  assertNonEmpty(state.ticketId, "ticketId");
  assertNonEmpty(state.participantId, "participantId");
  assertPlainText(state.description, "description");
  if (!isValidIsoTimestamp(state.createdAt)) {
    throw new LearningAssignmentDomainError(
      "createdAt must be a valid timestamp",
    );
  }
  if (!Number.isInteger(state.version) || state.version < 0) {
    throw new LearningAssignmentDomainError(
      "ticket version must be non-negative",
    );
  }
  if (!feedbackTransitions[state.status]) {
    throw new LearningAssignmentDomainError("ticket status is not supported");
  }
  if (!feedbackTicketTypes.includes(state.type)) {
    throw new LearningAssignmentDomainError("ticket type is not supported");
  }
  assertFeedbackTicketPriority(state.priority);
  if (state.assigneeId !== undefined) {
    assertFeedbackTicketAssignee(state.assigneeId);
  }
  assertFeedbackTicketPriority(input.priority);
  assertFeedbackTicketAssignee(input.assigneeId);
  return freeze({
    ticketId: state.ticketId,
    participantId: state.participantId,
    type: state.type,
    description: state.description,
    createdAt: state.createdAt,
    status: state.status,
    priority: input.priority,
    version: state.version + 1,
    ...(input.assigneeId === null ? {} : { assigneeId: input.assigneeId }),
  });
}

export function transitionFeedbackTicket(
  state: FeedbackTicketState,
  event: FeedbackTicketEvent,
): FeedbackTicketState {
  if (state === null || typeof state !== "object") {
    throw new LearningAssignmentDomainError("ticket state must be an object");
  }
  assertNonEmpty(state.ticketId, "ticketId");
  assertNonEmpty(state.participantId, "participantId");
  assertPlainText(state.description, "description");
  if (!isValidIsoTimestamp(state.createdAt)) {
    throw new LearningAssignmentDomainError(
      "createdAt must be a valid timestamp",
    );
  }
  if (!Number.isInteger(state.version) || state.version < 0) {
    throw new LearningAssignmentDomainError(
      "ticket version must be non-negative",
    );
  }
  assertFeedbackTicketPriority(state.priority);
  if (state.assigneeId !== undefined) {
    assertFeedbackTicketAssignee(state.assigneeId);
  }
  if (
    !Object.prototype.hasOwnProperty.call(feedbackTransitions, state.status)
  ) {
    throw new LearningAssignmentDomainError("ticket status is not supported");
  }
  const nextStatus = feedbackTransitions[state.status][event.type];
  if (nextStatus === undefined) {
    throw new LearningAssignmentDomainError(
      `Event ${event.type} is not allowed from state ${state.status}`,
    );
  }
  return freeze({ ...state, status: nextStatus, version: state.version + 1 });
}
