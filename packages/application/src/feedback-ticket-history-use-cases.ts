import { canAccess, type AccountStatus, type Role } from "./authorization.js";
import { ApplicationError } from "./errors.js";

export type FeedbackTicketHistoryEvent = Readonly<{
  readonly historyId: string;
  readonly ticketId: string;
  readonly ticketVersion: number;
  readonly eventType: "CRIADO" | "STATUS_ALTERADO" | "METADATA_ALTERADO";
  readonly fromStatus?:
    | "NOVO"
    | "TRIADO"
    | "EM_TRATAMENTO"
    | "AGUARDA_USUARIO"
    | "RESOLVIDO"
    | "DUPLICADO"
    | "NAO_REPRODUZIDO"
    | "NAO_PLANEJADO";
  readonly toStatus:
    | "NOVO"
    | "TRIADO"
    | "EM_TRATAMENTO"
    | "AGUARDA_USUARIO"
    | "RESOLVIDO"
    | "DUPLICADO"
    | "NAO_REPRODUZIDO"
    | "NAO_PLANEJADO";
  readonly fromPriority?: "BAIXA" | "NORMAL" | "ALTA" | "URGENTE";
  readonly toPriority?: "BAIXA" | "NORMAL" | "ALTA" | "URGENTE";
  readonly fromAssigneeId?: string | null;
  readonly toAssigneeId?: string | null;
  readonly createdAt: string;
}>;

export type FeedbackTicketHistoryReadResult = Readonly<{
  readonly ticketExists: boolean;
  readonly scopeId: string;
  readonly events: readonly FeedbackTicketHistoryEvent[];
}>;

export type FeedbackTicketHistoryState = Readonly<{
  readonly ticketId: string;
  readonly scopeId: string;
  readonly events: readonly FeedbackTicketHistoryEvent[];
}>;

export type GetFeedbackTicketHistoryCommand = Readonly<{
  readonly principalId: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly approvedClinicalApproverId?: string;
  readonly ticketId: string;
  readonly limit?: number;
}>;

export interface FeedbackTicketHistoryReadPort {
  readonly getFeedbackTicketHistory: (
    ticketId: string,
    scopeIds: readonly string[],
    limit: number,
  ) => Promise<FeedbackTicketHistoryReadResult>;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const statuses: readonly NonNullable<FeedbackTicketHistoryEvent["toStatus"]>[] =
  [
    "NOVO",
    "TRIADO",
    "EM_TRATAMENTO",
    "AGUARDA_USUARIO",
    "RESOLVIDO",
    "DUPLICADO",
    "NAO_REPRODUZIDO",
    "NAO_PLANEJADO",
  ];
const priorities: readonly NonNullable<
  FeedbackTicketHistoryEvent["toPriority"]
>[] = ["BAIXA", "NORMAL", "ALTA", "URGENTE"];

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function normalizeCommand(command: GetFeedbackTicketHistoryCommand): Readonly<{
  readonly ticketId: string;
  readonly scopes: readonly string[];
  readonly limit: number;
}> {
  assertNonEmpty(command.principalId, "principalId");
  assertNonEmpty(command.ticketId, "ticketId");
  const ticketId = command.ticketId.trim();
  if (!uuidPattern.test(ticketId)) {
    throw new ApplicationError("validation_error", "ticketId is invalid");
  }
  if (!Array.isArray(command.scopes) || command.scopes.length > 100) {
    throw new ApplicationError("validation_error", "scopes are invalid");
  }
  const scopes = [...new Set(command.scopes.map((scopeId) => scopeId.trim()))];
  if (scopes.some((scopeId) => !uuidPattern.test(scopeId))) {
    throw new ApplicationError("validation_error", "scopes are invalid");
  }
  const limit = command.limit ?? 100;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ApplicationError("validation_error", "limit is invalid");
  }
  return Object.freeze({ ticketId, scopes: Object.freeze(scopes), limit });
}

function validateEvents(
  result: FeedbackTicketHistoryReadResult,
  ticketId: string,
  scopes: readonly string[],
  limit: number,
): readonly FeedbackTicketHistoryEvent[] {
  if (!result.ticketExists) return Object.freeze([]);
  if (!scopes.includes(result.scopeId)) {
    throw new ApplicationError(
      "internal_error",
      "Feedback history returned an unauthorized scope",
    );
  }
  if (result.events.length > limit) {
    throw new ApplicationError(
      "internal_error",
      "Feedback history exceeded the requested limit",
    );
  }
  const versions = new Set<number>();
  for (const event of result.events) {
    if (
      event.ticketId !== ticketId ||
      versions.has(event.ticketVersion) ||
      !uuidPattern.test(event.historyId) ||
      !Number.isInteger(event.ticketVersion) ||
      event.ticketVersion < 0 ||
      !["CRIADO", "STATUS_ALTERADO", "METADATA_ALTERADO"].includes(
        event.eventType,
      ) ||
      (event.fromStatus !== undefined &&
        !statuses.includes(event.fromStatus)) ||
      !statuses.includes(event.toStatus) ||
      (event.eventType === "CRIADO" && event.fromStatus !== undefined) ||
      (event.eventType === "STATUS_ALTERADO" &&
        event.fromStatus === undefined) ||
      (event.eventType === "METADATA_ALTERADO" &&
        (event.fromStatus === undefined ||
          event.fromStatus !== event.toStatus ||
          event.fromPriority === undefined ||
          event.toPriority === undefined ||
          !priorities.includes(event.fromPriority) ||
          !priorities.includes(event.toPriority))) ||
      (event.fromPriority !== undefined &&
        !priorities.includes(event.fromPriority)) ||
      (event.toPriority !== undefined &&
        !priorities.includes(event.toPriority)) ||
      (event.fromAssigneeId !== undefined &&
        event.fromAssigneeId !== null &&
        !uuidPattern.test(event.fromAssigneeId)) ||
      (event.toAssigneeId !== undefined &&
        event.toAssigneeId !== null &&
        !uuidPattern.test(event.toAssigneeId)) ||
      Number.isNaN(new Date(event.createdAt).getTime())
    ) {
      throw new ApplicationError(
        "internal_error",
        "Feedback history returned an invalid event",
      );
    }
    versions.add(event.ticketVersion);
  }
  return Object.freeze(
    [...result.events].sort((left, right) => {
      const versionOrder = left.ticketVersion - right.ticketVersion;
      if (versionOrder !== 0) return versionOrder;
      const createdAtOrder = left.createdAt.localeCompare(right.createdAt);
      return createdAtOrder === 0
        ? left.historyId.localeCompare(right.historyId)
        : createdAtOrder;
    }),
  );
}

export async function getFeedbackTicketHistory(
  command: GetFeedbackTicketHistoryCommand,
  port: FeedbackTicketHistoryReadPort,
): Promise<FeedbackTicketHistoryState | null> {
  const normalized = normalizeCommand(command);
  const authorizedScopes = normalized.scopes.filter((scopeId) =>
    canAccess({
      principalId: command.principalId,
      accountStatus: command.accountStatus,
      roles: command.roles,
      capability: "VIEW_FEEDBACK_QUEUE",
      resource: { scopeId },
      scopes: normalized.scopes,
      ...(command.approvedClinicalApproverId === undefined
        ? {}
        : { approvedClinicalApproverId: command.approvedClinicalApproverId }),
    }),
  );
  if (authorizedScopes.length === 0) {
    throw new ApplicationError(
      "forbidden",
      "Feedback history is not authorized",
    );
  }

  const result = await port.getFeedbackTicketHistory(
    normalized.ticketId,
    authorizedScopes,
    normalized.limit,
  );
  if (!result.ticketExists) return null;
  const events = validateEvents(
    result,
    normalized.ticketId,
    authorizedScopes,
    normalized.limit,
  );
  return Object.freeze({
    ticketId: normalized.ticketId,
    scopeId: result.scopeId,
    events,
  });
}
