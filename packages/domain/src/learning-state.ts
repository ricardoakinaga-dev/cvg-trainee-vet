import { isValidIsoTimestamp } from "./timestamp.js";
import {
  FEEDBACK_TEXT_MAX_LENGTH,
  inspectFeedbackContent,
} from "./feedback-safety.js";
import { normalizeFeedbackTicketHistory } from "./feedback-ticket-history.js";
import { LearningAssignmentDomainError } from "./learning-state-error.js";

export { LearningAssignmentDomainError } from "./learning-state-error.js";

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

export type LearningAssignmentPauseReason =
  "AFASTAMENTO" | "ACOMODACAO" | "JANELA_OPERACIONAL";

export type LearningAssignmentState = Readonly<{
  readonly assignmentId: string;
  readonly participantId: string;
  readonly moduleId: string;
  readonly availableAt: string;
  readonly status: LearningAssignmentStatus;
  readonly version: number;
  readonly blockReason?: LearningAssignmentBlockReason;
  readonly pausedFrom?: Exclude<LearningAssignmentStatus, "PAUSADO">;
  readonly pauseReason?: LearningAssignmentPauseReason;
  readonly resumeAt?: string;
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
  | {
      readonly type: "PAUSAR";
      readonly reason: LearningAssignmentPauseReason;
      readonly resumeAt?: string;
    }
  | { readonly type: "RETOMAR"; readonly now: string }
  | {
      readonly type: "BLOQUEAR";
      readonly reason: LearningAssignmentBlockReason;
    }
  | {
      readonly type: "DESBLOQUEAR";
      readonly to: "ATRIBUIDO" | "DISPONIVEL";
    };

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

const assignmentPauseReasons = [
  "AFASTAMENTO",
  "ACOMODACAO",
  "JANELA_OPERACIONAL",
] as const;

function assertAssignmentIdentity(state: LearningAssignmentState): void {
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
}

function assertPauseState(state: LearningAssignmentState): void {
  if (state.status === "PAUSADO" && state.pausedFrom === undefined) {
    throw new LearningAssignmentDomainError(
      "paused assignment must preserve its previous state",
    );
  }
  if (state.status === "PAUSADO") {
    if (state.pauseReason === undefined) {
      throw new LearningAssignmentDomainError(
        "paused assignment must declare a pause reason",
      );
    }
    if (!assignmentPauseReasons.includes(state.pauseReason)) {
      throw new LearningAssignmentDomainError(
        "paused assignment pause reason is not supported",
      );
    }
    if (state.resumeAt !== undefined && !isValidIsoTimestamp(state.resumeAt)) {
      throw new LearningAssignmentDomainError(
        "resumeAt must be a valid timestamp",
      );
    }
    return;
  }
  if (state.pausedFrom !== undefined) {
    throw new LearningAssignmentDomainError(
      "pausedFrom is only allowed for paused assignments",
    );
  }
  if (state.pauseReason !== undefined) {
    throw new LearningAssignmentDomainError(
      "pauseReason is only allowed for paused assignments",
    );
  }
  if (state.resumeAt !== undefined) {
    throw new LearningAssignmentDomainError(
      "resumeAt is only allowed for paused assignments",
    );
  }
}

function assertBlockState(state: LearningAssignmentState): void {
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

function assertValidState(state: LearningAssignmentState): void {
  assertAssignmentIdentity(state);
  if (
    !Object.prototype.hasOwnProperty.call(assignmentTransitions, state.status)
  ) {
    throw new LearningAssignmentDomainError(
      "assignment state is not supported",
    );
  }
  assertPauseState(state);
  assertBlockState(state);
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
  if (event.type === "PAUSAR") {
    if (!assignmentPauseReasons.includes(event.reason)) {
      throw new LearningAssignmentDomainError("pause reason is not supported");
    }
    if (event.resumeAt !== undefined && !isValidIsoTimestamp(event.resumeAt)) {
      throw new LearningAssignmentDomainError(
        "resumeAt must be a valid timestamp",
      );
    }
  }
  if (event.type === "RETOMAR" && state.status === "PAUSADO") {
    if (!isValidIsoTimestamp(event.now)) {
      throw new LearningAssignmentDomainError("now must be a valid timestamp");
    }
    if (
      state.resumeAt !== undefined &&
      Date.parse(event.now) < Date.parse(state.resumeAt)
    ) {
      throw new LearningAssignmentDomainError(
        "assignment cannot resume before the resume window",
      );
    }
    return state.pausedFrom as Exclude<LearningAssignmentStatus, "PAUSADO">;
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
  | "status"
  | "version"
  | "blockReason"
  | "pausedFrom"
  | "pauseReason"
  | "resumeAt"
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
          pauseReason: event.reason,
          ...(event.resumeAt === undefined ? {} : { resumeAt: event.resumeAt }),
        }
      : {}),
  };
  return freeze(next);
}

export {
  createAssessmentWorkflowResult,
  transitionAssessmentWorkflowResult,
} from "./assessment-workflow-state.js";
export type {
  AssessmentWorkflowEvent,
  AssessmentWorkflowState,
  AssessmentWorkflowStatus,
} from "./assessment-workflow-state.js";

export type FeedbackTicketType =
  "BUG_TECNICO" | "USABILIDADE" | "ERRO_CONTEUDO" | "MELHORIA" | "CONTESTACAO";

export type FeedbackTicketStatus =
  | "NOVO"
  | "TRIADO"
  | "EM_TRATAMENTO"
  | "AGUARDA_USUARIO"
  | "RESOLVIDO"
  | "DUPLICADO"
  | "NAO_REPRODUZIDO"
  | "NAO_PLANEJADO";

export type FeedbackTechnicalContext = Readonly<{
  readonly logicalPage: string;
  readonly appVersion: string;
  readonly occurredAt?: string;
  readonly errorCode?: string;
}>;

export type FeedbackTicketPriority = "BAIXA" | "NORMAL" | "ALTA" | "URGENTE";

export type FeedbackTicketHistoryEntry = Readonly<{
  readonly status: FeedbackTicketStatus;
  readonly changedAt: string;
  readonly actorId?: string;
}>;

export type FeedbackTicketResponse = Readonly<{
  readonly message: string;
  readonly respondedAt: string;
  readonly respondedBy?: string;
}>;

export interface FeedbackTicketState {
  readonly ticketId: string;
  readonly participantId: string;
  readonly type: FeedbackTicketType;
  readonly description: string;
  readonly createdAt: string;
  readonly alertedAt?: string;
  readonly technicalContext?: FeedbackTechnicalContext;
  readonly priority?: FeedbackTicketPriority;
  readonly assigneeId?: string;
  readonly response?: FeedbackTicketResponse;
  readonly history?: readonly FeedbackTicketHistoryEntry[];
  readonly version: number;
  readonly status: FeedbackTicketStatus;
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
  | {
      readonly type: "TRIAR";
      readonly now?: string;
      readonly actorId?: string;
    }
  | {
      readonly type: "INICIAR_TRATAMENTO";
      readonly now?: string;
      readonly actorId?: string;
    }
  | {
      readonly type: "AGUARDAR_USUARIO";
      readonly now?: string;
      readonly actorId?: string;
    }
  | {
      readonly type: "RESOLVER";
      readonly now?: string;
      readonly actorId?: string;
    }
  | {
      readonly type: "MARCAR_DUPLICADO";
      readonly now?: string;
      readonly actorId?: string;
    }
  | {
      readonly type: "MARCAR_NAO_REPRODUZIDO";
      readonly now?: string;
      readonly actorId?: string;
    }
  | {
      readonly type: "MARCAR_NAO_PLANEJADO";
      readonly now?: string;
      readonly actorId?: string;
    }
  | {
      readonly type: "RETOMAR_TRATAMENTO";
      readonly now?: string;
      readonly actorId?: string;
    }
  | {
      readonly type: "PRIORIZAR";
      readonly priority: FeedbackTicketPriority;
      readonly now?: string;
      readonly actorId?: string;
    }
  | {
      readonly type: "ATRIBUIR";
      readonly assigneeId: string;
      readonly now?: string;
      readonly actorId?: string;
    }
  | {
      readonly type: "RESPONDER";
      readonly response: string;
      readonly now?: string;
      readonly actorId?: string;
    };

const feedbackTransitions: Readonly<
  Record<
    FeedbackTicketStatus,
    Readonly<Partial<Record<FeedbackTicketEvent["type"], FeedbackTicketStatus>>>
  >
> = {
  NOVO: { TRIAR: "TRIADO" },
  TRIADO: {
    INICIAR_TRATAMENTO: "EM_TRATAMENTO",
    PRIORIZAR: "TRIADO",
    ATRIBUIR: "TRIADO",
  },
  EM_TRATAMENTO: {
    AGUARDAR_USUARIO: "AGUARDA_USUARIO",
    RESOLVER: "RESOLVIDO",
    MARCAR_DUPLICADO: "DUPLICADO",
    MARCAR_NAO_REPRODUZIDO: "NAO_REPRODUZIDO",
    MARCAR_NAO_PLANEJADO: "NAO_PLANEJADO",
    PRIORIZAR: "EM_TRATAMENTO",
    ATRIBUIR: "EM_TRATAMENTO",
    RESPONDER: "EM_TRATAMENTO",
  },
  AGUARDA_USUARIO: {
    RETOMAR_TRATAMENTO: "EM_TRATAMENTO",
    PRIORIZAR: "AGUARDA_USUARIO",
    ATRIBUIR: "AGUARDA_USUARIO",
    RESPONDER: "AGUARDA_USUARIO",
  },
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
  if (value.length > FEEDBACK_TEXT_MAX_LENGTH) {
    throw new LearningAssignmentDomainError(
      `${field} exceeds the maximum length`,
    );
  }
  if (!inspectFeedbackContent(value).safe) {
    throw new LearningAssignmentDomainError(
      `${field} contains prohibited content`,
    );
  }
}

const feedbackTechnicalContextKeys = new Set([
  "logicalPage",
  "appVersion",
  "occurredAt",
  "errorCode",
]);

function assertFeedbackTechnicalContext(
  value: unknown,
): asserts value is FeedbackTechnicalContext {
  if (value === undefined) return;
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new LearningAssignmentDomainError(
      "technicalContext must be an object",
    );
  }
  for (const key of Object.keys(value)) {
    if (!feedbackTechnicalContextKeys.has(key)) {
      throw new LearningAssignmentDomainError(
        "technicalContext contains an unsupported field",
      );
    }
  }
  const context = value as Record<string, unknown>;
  if (
    typeof context.logicalPage !== "string" ||
    !/^\/[A-Za-z0-9][A-Za-z0-9/_:-]{0,127}$/u.test(context.logicalPage)
  ) {
    throw new LearningAssignmentDomainError(
      "technicalContext.logicalPage is invalid",
    );
  }
  if (
    typeof context.appVersion !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/u.test(context.appVersion)
  ) {
    throw new LearningAssignmentDomainError(
      "technicalContext.appVersion is invalid",
    );
  }
  if (
    context.occurredAt !== undefined &&
    (typeof context.occurredAt !== "string" ||
      !isValidIsoTimestamp(context.occurredAt))
  ) {
    throw new LearningAssignmentDomainError(
      "technicalContext.occurredAt is invalid",
    );
  }
  if (
    context.errorCode !== undefined &&
    (typeof context.errorCode !== "string" ||
      !/^[A-Z0-9][A-Z0-9_.:-]{0,63}$/u.test(context.errorCode))
  ) {
    throw new LearningAssignmentDomainError(
      "technicalContext.errorCode is invalid",
    );
  }
}

function freezeFeedbackTechnicalContext(
  value: FeedbackTechnicalContext | undefined,
): FeedbackTechnicalContext | undefined {
  if (value === undefined) return undefined;
  return freeze({
    logicalPage: value.logicalPage,
    appVersion: value.appVersion,
    ...(value.occurredAt === undefined ? {} : { occurredAt: value.occurredAt }),
    ...(value.errorCode === undefined ? {} : { errorCode: value.errorCode }),
  });
}

function assertFeedbackTicketPriority(
  value: unknown,
): asserts value is FeedbackTicketPriority {
  if (!feedbackTicketPriorities.includes(value as FeedbackTicketPriority)) {
    throw new LearningAssignmentDomainError(
      "feedback ticket priority is not supported",
    );
  }
}

function assertFeedbackTicketResponse(
  value: FeedbackTicketResponse | undefined,
): void {
  if (value === undefined) return;
  assertPlainText(value.message, "response");
  if (!isValidIsoTimestamp(value.respondedAt)) {
    throw new LearningAssignmentDomainError(
      "response respondedAt must be a valid timestamp",
    );
  }
  if (value.respondedBy !== undefined) {
    assertNonEmpty(value.respondedBy, "response respondedBy");
  }
}

export function createFeedbackTicket(
  input: Readonly<{
    readonly ticketId: string;
    readonly participantId: string;
    readonly type: FeedbackTicketType;
    readonly description: string;
    readonly createdAt: string;
    readonly technicalContext?: FeedbackTechnicalContext;
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
  assertFeedbackTechnicalContext(input.technicalContext);
  const technicalContext = freezeFeedbackTechnicalContext(
    input.technicalContext,
  );
  const history = freeze([
    freeze({ status: "NOVO" as const, changedAt: input.createdAt }),
  ]);
  return freeze({
    ticketId: input.ticketId,
    participantId: input.participantId,
    type: input.type,
    description: input.description,
    createdAt: input.createdAt,
    ...(technicalContext === undefined ? {} : { technicalContext }),
    priority:
      input.type === "ERRO_CONTEUDO"
        ? ("URGENTE" as const)
        : ("NORMAL" as const),
    ...(input.type === "ERRO_CONTEUDO" ? { alertedAt: input.createdAt } : {}),
    history,
    status: "NOVO" as const,
    version: 0,
  });
}

type FeedbackStateValidation = Readonly<{
  readonly priority: FeedbackTicketPriority;
  readonly history: readonly FeedbackTicketHistoryEntry[];
}>;

function validateFeedbackState(
  state: FeedbackTicketState,
): FeedbackStateValidation {
  if (state === null || typeof state !== "object") {
    throw new LearningAssignmentDomainError("ticket state must be an object");
  }
  assertNonEmpty(state.ticketId, "ticketId");
  assertNonEmpty(state.participantId, "participantId");
  assertPlainText(state.description, "description");
  assertFeedbackTechnicalContext(state.technicalContext);
  const priority = state.priority ?? "NORMAL";
  assertFeedbackTicketPriority(priority);
  if (state.assigneeId !== undefined) {
    assertNonEmpty(state.assigneeId, "assigneeId");
  }
  assertFeedbackTicketResponse(state.response);
  const history = normalizeFeedbackTicketHistory(state);
  if (!isValidIsoTimestamp(state.createdAt)) {
    throw new LearningAssignmentDomainError(
      "createdAt must be a valid timestamp",
    );
  }
  if (state.alertedAt !== undefined && !isValidIsoTimestamp(state.alertedAt)) {
    throw new LearningAssignmentDomainError(
      "alertedAt must be a valid timestamp",
    );
  }
  if (!Number.isInteger(state.version) || state.version < 0) {
    throw new LearningAssignmentDomainError(
      "ticket version must be non-negative",
    );
  }
  if (
    !Object.prototype.hasOwnProperty.call(feedbackTransitions, state.status)
  ) {
    throw new LearningAssignmentDomainError("ticket status is not supported");
  }
  return Object.freeze({ priority, history });
}

type FeedbackEventValidation = Readonly<{
  readonly now: string;
  readonly nextStatus: FeedbackTicketState["status"];
}>;

function validateFeedbackEvent(
  state: FeedbackTicketState,
  event: FeedbackTicketEvent,
): FeedbackEventValidation {
  if (event === null || typeof event !== "object") {
    throw new LearningAssignmentDomainError("ticket event must be an object");
  }
  if (event.actorId !== undefined) assertNonEmpty(event.actorId, "actorId");
  const now = event.now ?? state.createdAt;
  if (!isValidIsoTimestamp(now)) {
    throw new LearningAssignmentDomainError(
      "event now must be a valid timestamp",
    );
  }
  if (event.type === "PRIORIZAR") assertFeedbackTicketPriority(event.priority);
  if (event.type === "ATRIBUIR") {
    assertNonEmpty(event.assigneeId, "assigneeId");
  }
  if (event.type === "RESPONDER") assertPlainText(event.response, "response");
  const nextStatus = feedbackTransitions[state.status][event.type];
  if (nextStatus === undefined) {
    throw new LearningAssignmentDomainError(
      `Event ${event.type} is not allowed from state ${state.status}`,
    );
  }
  return Object.freeze({ now, nextStatus });
}

function buildFeedbackTransition(
  state: FeedbackTicketState,
  event: FeedbackTicketEvent,
  validation: FeedbackStateValidation,
  eventValidation: FeedbackEventValidation,
): FeedbackTicketState {
  const { priority, history } = validation;
  const { now, nextStatus } = eventValidation;
  const nextResponse =
    event.type === "RESPONDER"
      ? freeze({
          message: event.response,
          respondedAt: now,
          ...(event.actorId === undefined
            ? {}
            : { respondedBy: event.actorId }),
        })
      : state.response;
  const nextHistoryEntry = freeze({
    status: nextStatus,
    changedAt: now,
    ...(event.actorId === undefined ? {} : { actorId: event.actorId }),
  });
  const nextHistory = freeze([...history, nextHistoryEntry]);
  if (nextHistory.length > 100) {
    throw new LearningAssignmentDomainError(
      "feedback ticket history cannot exceed 100 entries",
    );
  }
  return freeze({
    ...state,
    priority: event.type === "PRIORIZAR" ? event.priority : priority,
    ...(event.type === "ATRIBUIR"
      ? { assigneeId: event.assigneeId }
      : state.assigneeId === undefined
        ? {}
        : { assigneeId: state.assigneeId }),
    ...(nextResponse === undefined ? {} : { response: nextResponse }),
    history: nextHistory,
    status: nextStatus,
    version: state.version + 1,
  });
}

export function transitionFeedbackTicket(
  state: FeedbackTicketState,
  event: FeedbackTicketEvent,
): FeedbackTicketState {
  const stateValidation = validateFeedbackState(state);
  const eventValidation = validateFeedbackEvent(state, event);
  return buildFeedbackTransition(
    state,
    event,
    stateValidation,
    eventValidation,
  );
}
