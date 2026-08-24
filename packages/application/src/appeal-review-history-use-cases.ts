import type { AccountStatus, Role } from "./authorization.js";
import { canAccess } from "./authorization.js";
import { ApplicationError } from "./errors.js";

export type AppealReviewHistoryEvent = Readonly<{
  readonly historyId: string;
  readonly appealId: string;
  readonly appealVersion: number;
  readonly eventType:
    | "ATRIBUIR_REVISOR"
    | "DECIDIR"
    | "SOLICITAR_RECALCULO"
    | "CONCLUIR_RECALCULO";
  readonly fromStatus:
    "ABERTA" | "EM_REVISAO" | "DECIDIDA" | "RECALCULO_PENDENTE";
  readonly toStatus:
    "EM_REVISAO" | "DECIDIDA" | "RECALCULO_PENDENTE" | "ENCERRADA";
  readonly reviewerId?: string;
  readonly decision?: "MANTER_RESULTADO" | "ANULAR_ITEM" | "ALTERAR_RESULTADO";
  readonly decisionRationale?: string;
  readonly decisionAt?: string;
  readonly decisionCorrelationId?: string;
  readonly createdAt: string;
}>;

export type AppealReviewHistoryReadResult = Readonly<{
  readonly appealExists: boolean;
  readonly scopeId: string;
  readonly events: readonly AppealReviewHistoryEvent[];
}>;

export type AppealReviewHistoryState = Readonly<{
  readonly appealId: string;
  readonly scopeId: string;
  readonly events: readonly AppealReviewHistoryEvent[];
}>;

export type GetAppealReviewHistoryCommand = Readonly<{
  readonly principalId: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly approvedClinicalApproverId?: string;
  readonly appealId: string;
  readonly limit?: number;
}>;

export interface AppealReviewHistoryReadPort {
  readonly getAppealReviewHistory: (
    appealId: string,
    scopeIds: readonly string[],
    limit: number,
  ) => Promise<AppealReviewHistoryReadResult>;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const eventTypes: readonly AppealReviewHistoryEvent["eventType"][] = [
  "ATRIBUIR_REVISOR",
  "DECIDIR",
  "SOLICITAR_RECALCULO",
  "CONCLUIR_RECALCULO",
];
const fromStatuses: readonly AppealReviewHistoryEvent["fromStatus"][] = [
  "ABERTA",
  "EM_REVISAO",
  "DECIDIDA",
  "RECALCULO_PENDENTE",
];
const toStatuses: readonly AppealReviewHistoryEvent["toStatus"][] = [
  "EM_REVISAO",
  "DECIDIDA",
  "RECALCULO_PENDENTE",
  "ENCERRADA",
];
const decisions: readonly NonNullable<AppealReviewHistoryEvent["decision"]>[] =
  ["MANTER_RESULTADO", "ANULAR_ITEM", "ALTERAR_RESULTADO"];

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function normalizeCommand(command: GetAppealReviewHistoryCommand): Readonly<{
  readonly appealId: string;
  readonly scopes: readonly string[];
  readonly limit: number;
}> {
  assertNonEmpty(command.principalId, "principalId");
  assertNonEmpty(command.appealId, "appealId");
  const appealId = command.appealId.trim();
  if (!uuidPattern.test(appealId)) {
    throw new ApplicationError("validation_error", "appealId is invalid");
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
  return Object.freeze({ appealId, scopes: Object.freeze(scopes), limit });
}

function validateHistory(
  result: AppealReviewHistoryReadResult,
  appealId: string,
  scopes: readonly string[],
  limit: number,
): readonly AppealReviewHistoryEvent[] {
  if (!result.appealExists) return Object.freeze([]);
  if (!scopes.includes(result.scopeId)) {
    throw new ApplicationError(
      "internal_error",
      "Appeal history returned an unauthorized scope",
    );
  }
  if (result.events.length > limit) {
    throw new ApplicationError(
      "internal_error",
      "Appeal history exceeded the requested limit",
    );
  }
  const versions = new Set<number>();
  for (const event of result.events) {
    if (
      event.appealId !== appealId ||
      versions.has(event.appealVersion) ||
      !uuidPattern.test(event.historyId) ||
      event.appealVersion < 1 ||
      !Number.isInteger(event.appealVersion) ||
      !eventTypes.includes(event.eventType) ||
      !fromStatuses.includes(event.fromStatus) ||
      !toStatuses.includes(event.toStatus) ||
      (event.reviewerId !== undefined && !uuidPattern.test(event.reviewerId)) ||
      (event.decision !== undefined && !decisions.includes(event.decision)) ||
      (event.decisionRationale !== undefined &&
        (event.decisionRationale.trim().length === 0 ||
          event.decisionRationale.length > 10_000 ||
          /<[^>]*>/u.test(event.decisionRationale))) ||
      (event.decisionAt !== undefined &&
        Number.isNaN(new Date(event.decisionAt).getTime())) ||
      (event.decisionCorrelationId !== undefined &&
        !uuidPattern.test(event.decisionCorrelationId)) ||
      Number.isNaN(new Date(event.createdAt).getTime())
    ) {
      throw new ApplicationError(
        "internal_error",
        "Appeal history returned an invalid event",
      );
    }
    versions.add(event.appealVersion);
  }
  return Object.freeze(
    [...result.events].sort((left, right) => {
      const versionOrder = left.appealVersion - right.appealVersion;
      if (versionOrder !== 0) return versionOrder;
      const createdAtOrder = left.createdAt.localeCompare(right.createdAt);
      return createdAtOrder === 0
        ? left.historyId.localeCompare(right.historyId)
        : createdAtOrder;
    }),
  );
}

export async function getAppealReviewHistory(
  command: GetAppealReviewHistoryCommand,
  port: AppealReviewHistoryReadPort,
): Promise<AppealReviewHistoryState | null> {
  const normalized = normalizeCommand(command);
  const authorizedScopes = normalized.scopes.filter((scopeId) =>
    canAccess({
      principalId: command.principalId,
      accountStatus: command.accountStatus,
      roles: command.roles,
      capability: "REVIEW_APPEAL",
      resource: { scopeId },
      scopes: normalized.scopes,
      ...(command.approvedClinicalApproverId === undefined
        ? {}
        : { approvedClinicalApproverId: command.approvedClinicalApproverId }),
    }),
  );
  if (authorizedScopes.length === 0) {
    throw new ApplicationError("forbidden", "Appeal history is not authorized");
  }

  const result = await port.getAppealReviewHistory(
    normalized.appealId,
    authorizedScopes,
    normalized.limit,
  );
  if (!result.appealExists) return null;
  const events = validateHistory(
    result,
    normalized.appealId,
    authorizedScopes,
    normalized.limit,
  );
  return Object.freeze({
    appealId: normalized.appealId,
    scopeId: result.scopeId,
    events,
  });
}
