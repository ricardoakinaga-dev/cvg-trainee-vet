import { canAccess, type AccountStatus, type Role } from "./authorization.js";
import { ApplicationError } from "./errors.js";

export type FeedbackTriageMetadataPriority =
  "BAIXA" | "NORMAL" | "ALTA" | "URGENTE";

export type FeedbackTriageMetadataAssignment = "MANTER" | "ASSUMIR" | "LIBERAR";

export type FeedbackTriageMetadataStatus =
  | "NOVO"
  | "TRIADO"
  | "EM_TRATAMENTO"
  | "AGUARDA_USUARIO"
  | "RESOLVIDO"
  | "DUPLICADO"
  | "NAO_REPRODUZIDO"
  | "NAO_PLANEJADO";

export type FeedbackTriageMetadataState = Readonly<{
  readonly ticketId: string;
  readonly scopeId: string;
  readonly status: FeedbackTriageMetadataStatus;
  readonly version: number;
  readonly priority: FeedbackTriageMetadataPriority;
  readonly assigneeId?: string;
}>;

export type UpdateFeedbackTriageMetadataCommand = Readonly<{
  readonly principalId: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly approvedClinicalApproverId?: string;
  readonly ticketId: string;
  readonly expectedVersion: number;
  readonly priority: FeedbackTriageMetadataPriority;
  readonly assignment: FeedbackTriageMetadataAssignment;
  readonly requestId: string;
  readonly correlationId: string;
}>;

export type FeedbackTriageMetadataUpdateInput = Readonly<{
  readonly ticketId: string;
  readonly scopeIds: readonly string[];
  readonly expectedVersion: number;
  readonly priority: FeedbackTriageMetadataPriority;
  readonly assignment: FeedbackTriageMetadataAssignment;
  readonly actorId: string;
  readonly requestId: string;
  readonly correlationId: string;
}>;

export class FeedbackTriageMetadataConflictError extends Error {
  public constructor(message = "feedback triage metadata changed") {
    super(message);
    this.name = "FeedbackTriageMetadataConflictError";
  }
}

export class FeedbackTriageMetadataEligibilityError extends Error {
  public constructor(message = "feedback triage actor is not eligible") {
    super(message);
    this.name = "FeedbackTriageMetadataEligibilityError";
  }
}

export interface FeedbackTriageMetadataReadPort {
  readonly update: (
    input: FeedbackTriageMetadataUpdateInput,
  ) => Promise<FeedbackTriageMetadataState | null>;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const priorities: readonly FeedbackTriageMetadataPriority[] = [
  "BAIXA",
  "NORMAL",
  "ALTA",
  "URGENTE",
];
const assignments: readonly FeedbackTriageMetadataAssignment[] = [
  "MANTER",
  "ASSUMIR",
  "LIBERAR",
];
const statuses: readonly FeedbackTriageMetadataStatus[] = [
  "NOVO",
  "TRIADO",
  "EM_TRATAMENTO",
  "AGUARDA_USUARIO",
  "RESOLVIDO",
  "DUPLICADO",
  "NAO_REPRODUZIDO",
  "NAO_PLANEJADO",
];

function assertUuid(value: string, field: string): void {
  if (!uuidPattern.test(value)) {
    throw new ApplicationError("validation_error", `${field} is invalid`);
  }
}

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function assertState(
  state: FeedbackTriageMetadataState,
  command: UpdateFeedbackTriageMetadataCommand,
): FeedbackTriageMetadataState {
  if (
    state.ticketId !== command.ticketId ||
    !command.scopes.includes(state.scopeId) ||
    !statuses.includes(state.status) ||
    !Number.isInteger(state.version) ||
    state.version <= command.expectedVersion ||
    !priorities.includes(state.priority) ||
    (state.assigneeId !== undefined && !uuidPattern.test(state.assigneeId))
  ) {
    throw new ApplicationError(
      "internal_error",
      "Feedback triage metadata returned an invalid state",
    );
  }
  if (
    command.assignment === "ASSUMIR" &&
    state.assigneeId !== command.principalId
  ) {
    throw new ApplicationError(
      "internal_error",
      "Feedback triage metadata did not assign the authenticated principal",
    );
  }
  if (command.assignment === "LIBERAR" && state.assigneeId !== undefined) {
    throw new ApplicationError(
      "internal_error",
      "Feedback triage metadata did not release the assignment",
    );
  }
  return Object.freeze({ ...state });
}

export async function updateFeedbackTriageMetadata(
  command: UpdateFeedbackTriageMetadataCommand,
  repository: FeedbackTriageMetadataReadPort,
): Promise<FeedbackTriageMetadataState> {
  assertNonEmpty(command.principalId, "principalId");
  assertNonEmpty(command.ticketId, "ticketId");
  assertUuid(command.principalId, "principalId");
  assertUuid(command.ticketId, "ticketId");
  assertUuid(command.requestId, "requestId");
  assertUuid(command.correlationId, "correlationId");
  if (!Array.isArray(command.scopes) || command.scopes.length === 0) {
    throw new ApplicationError(
      "forbidden",
      "Feedback scopes are not authorized",
    );
  }
  const scopeIds = [...new Set(command.scopes)];
  if (scopeIds.some((scopeId) => !uuidPattern.test(scopeId))) {
    throw new ApplicationError("validation_error", "scopes are invalid");
  }
  if (
    !Number.isInteger(command.expectedVersion) ||
    command.expectedVersion < 0
  ) {
    throw new ApplicationError(
      "validation_error",
      "expectedVersion is invalid",
    );
  }
  if (!priorities.includes(command.priority)) {
    throw new ApplicationError("validation_error", "priority is invalid");
  }
  if (!assignments.includes(command.assignment)) {
    throw new ApplicationError("validation_error", "assignment is invalid");
  }
  const authorizedScopeIds = scopeIds.filter((scopeId) =>
    canAccess({
      principalId: command.principalId,
      accountStatus: command.accountStatus,
      roles: command.roles,
      capability: "MANAGE_FEEDBACK_METADATA",
      resource: { scopeId },
      scopes: scopeIds,
      ...(command.approvedClinicalApproverId === undefined
        ? {}
        : { approvedClinicalApproverId: command.approvedClinicalApproverId }),
    }),
  );
  if (authorizedScopeIds.length === 0) {
    throw new ApplicationError(
      "forbidden",
      "Feedback triage metadata is not authorized",
    );
  }

  let state: FeedbackTriageMetadataState | null;
  try {
    state = await repository.update({
      ticketId: command.ticketId,
      scopeIds: authorizedScopeIds,
      expectedVersion: command.expectedVersion,
      priority: command.priority,
      assignment: command.assignment,
      actorId: command.principalId,
      requestId: command.requestId,
      correlationId: command.correlationId,
    });
  } catch (error) {
    if (error instanceof FeedbackTriageMetadataConflictError) {
      throw new ApplicationError("state_conflict", "Feedback ticket changed");
    }
    if (error instanceof FeedbackTriageMetadataEligibilityError) {
      throw new ApplicationError(
        "forbidden",
        "Feedback triage metadata is not authorized",
      );
    }
    throw error;
  }
  if (state === null) {
    throw new ApplicationError("not_found", "Feedback ticket not found");
  }
  return assertState(state, command);
}
