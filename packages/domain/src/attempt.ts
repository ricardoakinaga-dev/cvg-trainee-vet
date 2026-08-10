export type AttemptStatus =
  | "CRIADA"
  | "EM_ANDAMENTO"
  | "SALVA"
  | "SUBMETIDA"
  | "CORRIGIDA_AUTOMATICAMENTE"
  | "AGUARDA_CORRECAO_HUMANA"
  | "CORRIGIDA_HUMANAMENTE"
  | "ANULADA";

export interface AttemptIdentity {
  readonly attemptId: string;
  readonly participantId: string;
  readonly activityId: string;
}

export interface AttemptState extends AttemptIdentity {
  readonly status: AttemptStatus;
  readonly version: number;
  readonly submittedAt?: string;
}

export type AttemptEvent =
  | { readonly type: "INICIAR" }
  | { readonly type: "SALVAR" }
  | { readonly type: "RETOMAR" }
  | { readonly type: "SUBMETER"; readonly submittedAt: string }
  | { readonly type: "CORRIGIR_AUTOMATICAMENTE" }
  | { readonly type: "AGUARDAR_CORRECAO_HUMANA" }
  | { readonly type: "CORRIGIR_HUMANAMENTE" }
  | { readonly type: "ANULAR" };

import { isValidIsoTimestamp } from "./timestamp.js";

export class AttemptDomainError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AttemptDomainError";
  }
}

const transitions: Readonly<
  Record<
    AttemptStatus,
    Readonly<Partial<Record<AttemptEvent["type"], AttemptStatus>>>
  >
> = {
  CRIADA: { INICIAR: "EM_ANDAMENTO" },
  EM_ANDAMENTO: { SALVAR: "SALVA" },
  SALVA: { SALVAR: "SALVA", RETOMAR: "EM_ANDAMENTO", SUBMETER: "SUBMETIDA" },
  SUBMETIDA: {
    CORRIGIR_AUTOMATICAMENTE: "CORRIGIDA_AUTOMATICAMENTE",
    AGUARDAR_CORRECAO_HUMANA: "AGUARDA_CORRECAO_HUMANA",
    ANULAR: "ANULADA",
  },
  CORRIGIDA_AUTOMATICAMENTE: {},
  AGUARDA_CORRECAO_HUMANA: { CORRIGIR_HUMANAMENTE: "CORRIGIDA_HUMANAMENTE" },
  CORRIGIDA_HUMANAMENTE: {},
  ANULADA: {},
};

function assertNonEmpty(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AttemptDomainError(`${field} must not be empty`);
  }
}

function assertSubmittedAt(value: string): void {
  if (!isValidIsoTimestamp(value)) {
    throw new AttemptDomainError("submittedAt must be a valid timestamp");
  }
}

function assertValidState(state: AttemptState): void {
  if (state === null || typeof state !== "object") {
    throw new AttemptDomainError("attempt state must be an object");
  }
  assertNonEmpty(state.attemptId, "attemptId");
  assertNonEmpty(state.participantId, "participantId");
  assertNonEmpty(state.activityId, "activityId");
  if (!Number.isInteger(state.version) || state.version < 0) {
    throw new AttemptDomainError(
      "attempt version must be a non-negative integer",
    );
  }
  if (!Object.prototype.hasOwnProperty.call(transitions, state.status)) {
    throw new AttemptDomainError("attempt status is not supported");
  }
  if (state.submittedAt !== undefined) assertSubmittedAt(state.submittedAt);
}

export function createAttempt(identity: AttemptIdentity): AttemptState {
  assertNonEmpty(identity.attemptId, "attemptId");
  assertNonEmpty(identity.participantId, "participantId");
  assertNonEmpty(identity.activityId, "activityId");

  return Object.freeze({
    ...identity,
    status: "CRIADA",
    version: 0,
  });
}

export function transitionAttempt(
  state: AttemptState,
  event: AttemptEvent,
): AttemptState {
  assertValidState(state);
  const nextStatus = transitions[state.status][event.type];

  if (nextStatus === undefined) {
    throw new AttemptDomainError(
      `Event ${event.type} is not allowed from state ${state.status}`,
    );
  }

  if (event.type === "SUBMETER") assertSubmittedAt(event.submittedAt);

  return Object.freeze({
    ...state,
    status: nextStatus,
    version: state.version + 1,
    ...(event.type === "SUBMETER" ? { submittedAt: event.submittedAt } : {}),
  });
}
