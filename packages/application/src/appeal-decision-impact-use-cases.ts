import type {
  AppealState,
  AppealStatus,
  AttemptState,
  AttemptStatus,
} from "@cvg/domain";

import { canAccess, type AccountStatus, type Role } from "./authorization.js";
import { ApplicationError } from "./errors.js";

export type AppealDecisionImpactDecision = "ANULAR_ITEM";

export type AppealDecisionImpactReadResult = Readonly<{
  readonly appealExists: boolean;
  readonly scopeId: string;
  readonly appeal: AppealState | null;
  readonly attempt: AttemptState | null;
  readonly latestResult: Readonly<{
    readonly resultId: string;
    readonly attemptId: string;
    readonly version: number;
  }> | null;
}>;

export interface AppealDecisionImpactReadPort {
  readonly getAppealDecisionImpact: (
    appealId: string,
    scopeIds: readonly string[],
    decision: AppealDecisionImpactDecision,
  ) => Promise<AppealDecisionImpactReadResult>;
}

export type GetAppealDecisionImpactPreviewCommand = Readonly<{
  readonly principalId: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly approvedClinicalApproverId?: string;
  readonly appealId: string;
  readonly decision: AppealDecisionImpactDecision;
}>;

export type AppealDecisionImpactPreviewState = Readonly<{
  readonly kind: "appeal_decision_impact_preview";
  readonly appealId: string;
  readonly decision: AppealDecisionImpactDecision;
  readonly appeal: Readonly<{
    readonly status: AppealStatus;
    readonly version: number;
  }>;
  readonly target: Readonly<{
    readonly attemptId: string;
    readonly itemId: string;
    readonly attemptStatus: AttemptStatus;
    readonly attemptVersion: number;
  }>;
  readonly latestResult: Readonly<{
    readonly availability: "AVAILABLE" | "NOT_AVAILABLE";
    readonly version?: number;
  }>;
  readonly impact: Readonly<{
    readonly scoreImpact: "NOT_COMPUTED";
    readonly recalculation: "NOT_AVAILABLE_IN_THIS_SLICE";
    readonly automaticMutation: "NONE";
    readonly publication: "NOT_PERFORMED";
  }>;
}>;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const appealStatuses: readonly AppealStatus[] = [
  "ABERTA",
  "EM_REVISAO",
  "DECIDIDA",
  "RECALCULO_PENDENTE",
  "ENCERRADA",
];

const attemptStatuses: readonly AttemptStatus[] = [
  "CRIADA",
  "EM_ANDAMENTO",
  "SALVA",
  "SUBMETIDA",
  "CORRIGIDA_AUTOMATICAMENTE",
  "AGUARDA_CORRECAO_HUMANA",
  "CORRIGIDA_HUMANAMENTE",
  "ANULADA",
];

function assertNonEmpty(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function normalizeCommand(
  command: GetAppealDecisionImpactPreviewCommand,
): Readonly<{
  readonly appealId: string;
  readonly scopes: readonly string[];
}> {
  assertNonEmpty(command.principalId, "principalId");
  assertNonEmpty(command.appealId, "appealId");
  if (command.decision !== "ANULAR_ITEM") {
    throw new ApplicationError("validation_error", "decision is invalid");
  }
  const appealId = command.appealId.trim();
  if (!uuidPattern.test(appealId)) {
    throw new ApplicationError("validation_error", "appealId is invalid");
  }
  if (!Array.isArray(command.scopes) || command.scopes.length > 100) {
    throw new ApplicationError("validation_error", "scopes are invalid");
  }
  const scopes = [
    ...new Set(
      command.scopes.map((scopeId) => {
        assertNonEmpty(scopeId, "scopeId");
        return scopeId.trim();
      }),
    ),
  ];
  if (scopes.some((scopeId) => !uuidPattern.test(scopeId))) {
    throw new ApplicationError("validation_error", "scopes are invalid");
  }
  return Object.freeze({ appealId, scopes: Object.freeze(scopes) });
}

function isIsoTimestamp(value: string | undefined): boolean {
  return (
    value !== undefined &&
    typeof value === "string" &&
    !Number.isNaN(Date.parse(value))
  );
}

function validateReadResult(
  result: AppealDecisionImpactReadResult,
  appealId: string,
  authorizedScopes: readonly string[],
): asserts result is AppealDecisionImpactReadResult & {
  readonly appealExists: true;
  readonly appeal: AppealState;
  readonly attempt: AttemptState;
} {
  if (
    !uuidPattern.test(result.scopeId) ||
    !authorizedScopes.includes(result.scopeId) ||
    result.appeal === null ||
    result.attempt === null ||
    result.appeal.appealId !== appealId ||
    result.attempt.attemptId !== result.appeal.attemptId ||
    result.attempt.participantId !== result.appeal.participantId ||
    !uuidPattern.test(result.appeal.appealId) ||
    !uuidPattern.test(result.appeal.participantId) ||
    !uuidPattern.test(result.appeal.attemptId) ||
    !uuidPattern.test(result.appeal.itemId) ||
    !appealStatuses.includes(result.appeal.status) ||
    !Number.isInteger(result.appeal.version) ||
    result.appeal.version < 0 ||
    !uuidPattern.test(result.attempt.attemptId) ||
    !uuidPattern.test(result.attempt.participantId) ||
    !uuidPattern.test(result.attempt.activityId) ||
    !attemptStatuses.includes(result.attempt.status) ||
    !Number.isInteger(result.attempt.version) ||
    result.attempt.version < 0 ||
    (result.attempt.submittedAt !== undefined &&
      !isIsoTimestamp(result.attempt.submittedAt))
  ) {
    throw new ApplicationError(
      "internal_error",
      "Appeal decision impact returned an invalid target",
    );
  }

  if (result.latestResult !== null) {
    if (
      !uuidPattern.test(result.latestResult.resultId) ||
      result.latestResult.attemptId !== result.attempt.attemptId ||
      !Number.isInteger(result.latestResult.version) ||
      result.latestResult.version < 1
    ) {
      throw new ApplicationError(
        "internal_error",
        "Appeal decision impact returned an invalid result",
      );
    }
  }

  if (
    result.appeal.status !== "ABERTA" &&
    result.appeal.status !== "EM_REVISAO"
  ) {
    throw new ApplicationError(
      "state_conflict",
      "Appeal decision impact is only available before a decision",
    );
  }
}

export async function getAppealDecisionImpactPreview(
  command: GetAppealDecisionImpactPreviewCommand,
  port: AppealDecisionImpactReadPort,
): Promise<AppealDecisionImpactPreviewState | null> {
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
    throw new ApplicationError(
      "forbidden",
      "Appeal decision impact is not authorized",
    );
  }

  const result = await port.getAppealDecisionImpact(
    normalized.appealId,
    authorizedScopes,
    "ANULAR_ITEM",
  );
  if (!result.appealExists) return null;
  validateReadResult(result, normalized.appealId, authorizedScopes);

  const latestResult =
    result.latestResult === null
      ? Object.freeze({ availability: "NOT_AVAILABLE" as const })
      : Object.freeze({
          availability: "AVAILABLE" as const,
          version: result.latestResult.version,
        });

  return Object.freeze({
    kind: "appeal_decision_impact_preview" as const,
    appealId: normalized.appealId,
    decision: "ANULAR_ITEM" as const,
    appeal: Object.freeze({
      status: result.appeal.status,
      version: result.appeal.version,
    }),
    target: Object.freeze({
      attemptId: result.appeal.attemptId,
      itemId: result.appeal.itemId,
      attemptStatus: result.attempt.status,
      attemptVersion: result.attempt.version,
    }),
    latestResult,
    impact: Object.freeze({
      scoreImpact: "NOT_COMPUTED" as const,
      recalculation: "NOT_AVAILABLE_IN_THIS_SLICE" as const,
      automaticMutation: "NONE" as const,
      publication: "NOT_PERFORMED" as const,
    }),
  });
}
