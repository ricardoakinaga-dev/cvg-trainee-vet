import { isValidIsoTimestamp } from "./timestamp.js";

export type AppealStatus =
  "ABERTA" | "EM_REVISAO" | "DECIDIDA" | "RECALCULO_PENDENTE" | "ENCERRADA";

export type AppealDecision =
  "MANTER_RESULTADO" | "ANULAR_ITEM" | "ALTERAR_RESULTADO";

export interface AppealState {
  readonly appealId: string;
  readonly participantId: string;
  readonly attemptId: string;
  readonly itemId: string;
  readonly justification: string;
  readonly createdAt: string;
  readonly dueAt: string;
  readonly version: number;
  readonly status: AppealStatus;
  readonly reviewerId?: string;
  readonly decision?: AppealDecision;
}

export type AppealEvent =
  | { readonly type: "ATRIBUIR_REVISOR"; readonly reviewerId: string }
  | { readonly type: "DECIDIR"; readonly decision: AppealDecision }
  | { readonly type: "SOLICITAR_RECALCULO" }
  | { readonly type: "CONCLUIR_RECALCULO" };

export class AppealDomainError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AppealDomainError";
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
    throw new AppealDomainError(`${field} must not be empty`);
  }
}

function assertPlainText(
  value: unknown,
  field: string,
): asserts value is string {
  assertNonEmpty(value, field);
  if (value.length > 10_000 || /<[^>]*>/u.test(value)) {
    throw new AppealDomainError(`${field} must be plain text`);
  }
}

function addBusinessDays(value: string, days: number): string {
  const date = new Date(value);
  let added = 0;
  while (added < days) {
    date.setUTCDate(date.getUTCDate() + 1);
    const weekday = date.getUTCDay();
    if (weekday !== 0 && weekday !== 6) added += 1;
  }
  return date.toISOString();
}

function assertValidState(state: AppealState): void {
  if (state === null || typeof state !== "object") {
    throw new AppealDomainError("appeal state must be an object");
  }
  assertNonEmpty(state.appealId, "appealId");
  assertNonEmpty(state.participantId, "participantId");
  assertNonEmpty(state.attemptId, "attemptId");
  assertNonEmpty(state.itemId, "itemId");
  assertPlainText(state.justification, "justification");
  if (!isValidIsoTimestamp(state.createdAt)) {
    throw new AppealDomainError("createdAt must be a valid timestamp");
  }
  if (!isValidIsoTimestamp(state.dueAt)) {
    throw new AppealDomainError("dueAt must be a valid timestamp");
  }
  if (!Number.isInteger(state.version) || state.version < 0) {
    throw new AppealDomainError("appeal version must be non-negative");
  }
  if (!Object.prototype.hasOwnProperty.call(transitions, state.status)) {
    throw new AppealDomainError("appeal status is not supported");
  }
  if (
    (state.status === "EM_REVISAO" ||
      state.status === "DECIDIDA" ||
      state.status === "RECALCULO_PENDENTE" ||
      state.status === "ENCERRADA") &&
    state.reviewerId === undefined
  ) {
    throw new AppealDomainError("appeal requires an independent reviewer");
  }
  if (
    (state.status === "DECIDIDA" ||
      state.status === "RECALCULO_PENDENTE" ||
      state.status === "ENCERRADA") &&
    state.decision === undefined
  ) {
    throw new AppealDomainError("appeal decision is required");
  }
}

const transitions: Readonly<
  Record<
    AppealStatus,
    Readonly<Partial<Record<AppealEvent["type"], AppealStatus>>>
  >
> = {
  ABERTA: { ATRIBUIR_REVISOR: "EM_REVISAO" },
  EM_REVISAO: { DECIDIR: "DECIDIDA" },
  DECIDIDA: { SOLICITAR_RECALCULO: "RECALCULO_PENDENTE" },
  RECALCULO_PENDENTE: { CONCLUIR_RECALCULO: "ENCERRADA" },
  ENCERRADA: {},
};

export function createAppeal(
  input: Readonly<{
    readonly appealId: string;
    readonly participantId: string;
    readonly attemptId: string;
    readonly itemId: string;
    readonly justification: string;
    readonly createdAt: string;
  }>,
): AppealState {
  assertNonEmpty(input.appealId, "appealId");
  assertNonEmpty(input.participantId, "participantId");
  assertNonEmpty(input.attemptId, "attemptId");
  assertNonEmpty(input.itemId, "itemId");
  assertPlainText(input.justification, "justification");
  if (!isValidIsoTimestamp(input.createdAt)) {
    throw new AppealDomainError("createdAt must be a valid timestamp");
  }
  return freeze({
    ...input,
    dueAt: addBusinessDays(input.createdAt, 7),
    version: 0,
    status: "ABERTA" as const,
  });
}

export function transitionAppeal(
  state: AppealState,
  event: AppealEvent,
): AppealState {
  assertValidState(state);
  if (event.type === "ATRIBUIR_REVISOR") {
    assertNonEmpty(event.reviewerId, "reviewerId");
    if (event.reviewerId === state.participantId) {
      throw new AppealDomainError("reviewer must be independent");
    }
  }
  if (
    event.type === "DECIDIR" &&
    !Object.values<AppealDecision>({
      MANTER_RESULTADO: "MANTER_RESULTADO",
      ANULAR_ITEM: "ANULAR_ITEM",
      ALTERAR_RESULTADO: "ALTERAR_RESULTADO",
    }).includes(event.decision)
  ) {
    throw new AppealDomainError("appeal decision is not supported");
  }
  const nextStatus = transitions[state.status][event.type];
  if (nextStatus === undefined) {
    throw new AppealDomainError(
      `Event ${event.type} is not allowed from state ${state.status}`,
    );
  }
  return freeze({
    ...state,
    status: nextStatus,
    version: state.version + 1,
    ...(event.type === "ATRIBUIR_REVISOR"
      ? { reviewerId: event.reviewerId }
      : {}),
    ...(event.type === "DECIDIR" ? { decision: event.decision } : {}),
  });
}
