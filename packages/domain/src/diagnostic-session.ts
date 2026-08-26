import { isValidIsoTimestamp } from "./timestamp.js";

export type DiagnosticSessionStatus = "EM_ANDAMENTO" | "FINALIZADA";

export type DiagnosticSessionIdentity = Readonly<{
  readonly sessionId: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly diagnosticId: "B07-DIAGNOSTIC-V1";
  readonly diagnosticVersion: "0.1.0";
  readonly startedAt: string;
}>;

export type DiagnosticSessionState = DiagnosticSessionIdentity &
  Readonly<{
    readonly status: DiagnosticSessionStatus;
    readonly version: number;
    readonly lastCheckpointAt?: string;
    readonly finalizedAt?: string;
  }>;

export type DiagnosticSessionEvent =
  | Readonly<{ readonly type: "CHECKPOINT"; readonly occurredAt: string }>
  | Readonly<{ readonly type: "FINALIZAR"; readonly finalizedAt: string }>;

export class DiagnosticSessionDomainError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "DiagnosticSessionDomainError";
  }
}

function assertNonEmpty(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new DiagnosticSessionDomainError(`${field} must not be empty`);
  }
}

function assertTimestamp(value: string, field: string): void {
  if (!isValidIsoTimestamp(value)) {
    throw new DiagnosticSessionDomainError(
      `${field} must be a valid timestamp`,
    );
  }
}

function assertState(state: DiagnosticSessionState): void {
  if (state === null || typeof state !== "object") {
    throw new DiagnosticSessionDomainError(
      "diagnostic session state is invalid",
    );
  }
  assertNonEmpty(state.sessionId, "sessionId");
  assertNonEmpty(state.participantId, "participantId");
  assertNonEmpty(state.scopeId, "scopeId");
  assertTimestamp(state.startedAt, "startedAt");
  if (state.diagnosticId !== "B07-DIAGNOSTIC-V1") {
    throw new DiagnosticSessionDomainError("diagnostic id is invalid");
  }
  if (state.diagnosticVersion !== "0.1.0") {
    throw new DiagnosticSessionDomainError("diagnostic version is invalid");
  }
  if (
    (state.status !== "EM_ANDAMENTO" && state.status !== "FINALIZADA") ||
    !Number.isInteger(state.version) ||
    state.version < 0
  ) {
    throw new DiagnosticSessionDomainError(
      "diagnostic session state is invalid",
    );
  }
  if (state.lastCheckpointAt !== undefined) {
    assertTimestamp(state.lastCheckpointAt, "lastCheckpointAt");
  }
  if (state.finalizedAt !== undefined) {
    assertTimestamp(state.finalizedAt, "finalizedAt");
  }
  if (state.status === "EM_ANDAMENTO" && state.finalizedAt !== undefined) {
    throw new DiagnosticSessionDomainError(
      "in-progress diagnostic session cannot be finalized",
    );
  }
  if (state.status === "FINALIZADA" && state.finalizedAt === undefined) {
    throw new DiagnosticSessionDomainError(
      "finalized diagnostic session requires finalizedAt",
    );
  }
}

export function createDiagnosticSession(
  identity: DiagnosticSessionIdentity,
): DiagnosticSessionState {
  assertNonEmpty(identity.sessionId, "sessionId");
  assertNonEmpty(identity.participantId, "participantId");
  assertNonEmpty(identity.scopeId, "scopeId");
  assertTimestamp(identity.startedAt, "startedAt");
  if (identity.diagnosticId !== "B07-DIAGNOSTIC-V1") {
    throw new DiagnosticSessionDomainError("diagnostic id is invalid");
  }
  if (identity.diagnosticVersion !== "0.1.0") {
    throw new DiagnosticSessionDomainError("diagnostic version is invalid");
  }
  return Object.freeze({
    ...identity,
    status: "EM_ANDAMENTO" as const,
    version: 0,
  });
}

export function transitionDiagnosticSession(
  state: DiagnosticSessionState,
  event: DiagnosticSessionEvent,
): DiagnosticSessionState {
  assertState(state);
  if (state.status === "FINALIZADA") {
    throw new DiagnosticSessionDomainError(
      "finalized diagnostic session cannot be changed",
    );
  }
  if (event.type === "CHECKPOINT") {
    assertTimestamp(event.occurredAt, "occurredAt");
    return Object.freeze({
      ...state,
      version: state.version + 1,
      lastCheckpointAt: event.occurredAt,
    });
  }
  assertTimestamp(event.finalizedAt, "finalizedAt");
  return Object.freeze({
    ...state,
    status: "FINALIZADA" as const,
    version: state.version + 1,
    finalizedAt: event.finalizedAt,
  });
}
