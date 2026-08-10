import {
  canAccess,
  type AccountStatus,
  type Capability,
  type Role,
} from "./authorization.js";
import { ApplicationError } from "./errors.js";
import type {
  AdvanceContentCommand,
  ContentRecord,
} from "./content-use-cases.js";

export type AuthoringChoice = Readonly<{
  readonly id: string;
  readonly label: string;
  readonly text: string;
}>;

export type AuthoringSourceRef = Readonly<{
  readonly code: string;
  readonly locator: string;
  readonly updateRequired: boolean;
}>;

export type AuthoringRubric = Readonly<{
  readonly dimensions: readonly Readonly<{
    readonly id: string;
    readonly label: string;
    readonly description: string;
    readonly maxPoints: number;
  }>[];
  readonly passScore: number;
  readonly criticalErrors: readonly string[];
}>;

export type AuthoringParticipantItem = Readonly<{
  readonly id: string;
  readonly ordinal: number;
  readonly kind: "QUESTAO" | "CASO";
  readonly title: string;
  readonly prompt: string;
  readonly responseMode: "CHOICE" | "TEXT";
  readonly choices?: readonly AuthoringChoice[];
  readonly selectionMode?: "SINGLE" | "MULTIPLE";
}>;

export type AuthoringPreflight = Readonly<{
  readonly ruleVersion: "authoring-preflight-v1";
  readonly technicalChecksPassed: boolean;
  readonly readyForClinicalReview?: boolean;
  readonly readyForPublication?: boolean;
  readonly checks: Readonly<{
    readonly requiredFields: boolean;
    readonly correctionMetadata: boolean;
    readonly publicBoundary: boolean;
    readonly sourceTraceability: boolean;
    readonly publicationBlocked: boolean;
  }>;
  readonly checkedAt: string;
}>;

export type AuthoringReviewDecision =
  "APROVAR_CLINICAMENTE" | "SOLICITAR_AJUSTES";

export type AuthoringReview = Readonly<{
  readonly reviewerId: string;
  readonly decision: AuthoringReviewDecision;
  readonly rationale: string;
  readonly reviewedAt: string;
  readonly correlationId: string;
}>;

export type AuthoringRecord = Readonly<{
  readonly editorialRecordId: string;
  readonly contentId: string;
  readonly version: number;
  readonly contentVersionId: string;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly sessionId: string;
  readonly objectiveId: string;
  readonly authorId: string;
  readonly title: string;
  readonly prompt: string;
  readonly responseMode: "CHOICE" | "TEXT" | "NONE";
  readonly choices?: readonly AuthoringChoice[];
  readonly correctChoiceIds?: readonly string[];
  readonly rubric?: AuthoringRubric;
  readonly feedback: string;
  readonly critical: boolean;
  readonly remediationTargetObjectiveId: string;
  readonly sourceRefs: readonly AuthoringSourceRef[];
  readonly participant: AuthoringParticipantItem;
  readonly contentStatus: ContentRecord["status"];
  readonly preflight: AuthoringPreflight;
  readonly latestReview?: AuthoringReview;
}>;

export interface AuthoringRepositoryPort {
  readonly find: (
    contentId: string,
    version: number,
  ) => Promise<AuthoringRecord | null>;
  readonly savePreflight: (
    record: AuthoringRecord,
    preflight: AuthoringPreflight,
  ) => Promise<AuthoringRecord>;
  readonly saveReview: (
    record: AuthoringRecord,
    review: AuthoringReview,
  ) => Promise<AuthoringRecord>;
}

export type ReviewAuthoringCommand = Readonly<{
  readonly principalId: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly approvedClinicalApproverId?: string;
  readonly contentId: string;
  readonly version: number;
  readonly scopeId: string;
  readonly decision: AuthoringReviewDecision;
  readonly rationale: string;
  readonly correlationId: string;
}>;

export type AuthoringWorkflowDependencies = Readonly<{
  readonly repository: AuthoringRepositoryPort;
  readonly transition: (
    command: AdvanceContentCommand,
  ) => Promise<ContentRecord>;
}>;

export type AuthoringPreflightResult = AuthoringPreflight &
  Readonly<{
    readonly readyForClinicalReview: boolean;
    readonly readyForPublication: false;
  }>;

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function isText(value: string): boolean {
  return value.trim().length > 0 && !/<[^>]*>/u.test(value);
}

function hasCorrectionMetadata(record: AuthoringRecord): boolean {
  if (record.responseMode === "CHOICE") {
    if (
      record.choices === undefined ||
      record.choices.length < 2 ||
      record.correctChoiceIds === undefined ||
      record.correctChoiceIds.length === 0
    ) {
      return false;
    }
    const choiceIds = new Set(record.choices.map((choice) => choice.id));
    return record.correctChoiceIds.every((choiceId) => choiceIds.has(choiceId));
  }

  if (record.responseMode === "TEXT") {
    return (
      record.rubric !== undefined &&
      record.rubric.dimensions.length > 0 &&
      record.rubric.passScore > 0 &&
      record.rubric.criticalErrors.length > 0
    );
  }

  return true;
}

function hasPublicBoundary(record: AuthoringRecord): boolean {
  const publicKeys = new Set([
    "id",
    "ordinal",
    "kind",
    "title",
    "prompt",
    "responseMode",
    "choices",
    "selectionMode",
  ]);
  return Object.keys(record.participant).every((key) => publicKeys.has(key));
}

export function runAuthoringPreflight(
  record: AuthoringRecord,
  checkedAt = new Date().toISOString(),
): AuthoringPreflightResult {
  const requiredFields = [
    record.contentId,
    record.contentVersionId,
    record.scopeId,
    record.moduleId,
    record.sessionId,
    record.objectiveId,
    record.authorId,
    record.title,
    record.prompt,
    record.feedback,
    record.remediationTargetObjectiveId,
  ].every(isText);
  const correctionMetadata = hasCorrectionMetadata(record);
  const publicBoundary = hasPublicBoundary(record);
  const sourceTraceability =
    record.sourceRefs.length > 0 &&
    record.sourceRefs.every(
      (source) => isText(source.code) && isText(source.locator),
    );
  const technicalChecksPassed =
    requiredFields &&
    correctionMetadata &&
    publicBoundary &&
    sourceTraceability;

  return Object.freeze({
    ruleVersion: "authoring-preflight-v1" as const,
    technicalChecksPassed,
    readyForClinicalReview: technicalChecksPassed,
    readyForPublication: false as const,
    checks: Object.freeze({
      requiredFields,
      correctionMetadata,
      publicBoundary,
      sourceTraceability,
      publicationBlocked: true as const,
    }),
    checkedAt,
  });
}

function capabilityForDecision(decision: AuthoringReviewDecision): Capability {
  return decision === "APROVAR_CLINICAMENTE"
    ? "APPROVE_CLINICAL_CONTENT"
    : "MODERATE_CONTENT";
}

export async function reviewAuthoringContent(
  command: ReviewAuthoringCommand,
  dependencies: AuthoringWorkflowDependencies,
): Promise<Readonly<{ record: AuthoringRecord; review: AuthoringReview }>> {
  for (const [value, field] of [
    [command.principalId, "principalId"],
    [command.contentId, "contentId"],
    [command.scopeId, "scopeId"],
    [command.rationale, "rationale"],
    [command.correlationId, "correlationId"],
  ] as const) {
    assertNonEmpty(value, field);
  }
  if (!Number.isInteger(command.version) || command.version < 1) {
    throw new ApplicationError("validation_error", "version is invalid");
  }
  if (
    !canAccess({
      principalId: command.principalId,
      accountStatus: command.accountStatus,
      roles: command.roles,
      capability: capabilityForDecision(command.decision),
      resource: { scopeId: command.scopeId },
      scopes: command.scopes,
      ...(command.decision === "APROVAR_CLINICAMENTE"
        ? {
            approvedClinicalApproverId:
              command.approvedClinicalApproverId ?? command.principalId,
          }
        : {}),
    })
  ) {
    throw new ApplicationError("forbidden", "Reviewer is outside the scope");
  }

  const record = await dependencies.repository.find(
    command.contentId,
    command.version,
  );
  if (record === null) {
    throw new ApplicationError("not_found", "Authoring record not found");
  }
  if (
    record.scopeId !== command.scopeId ||
    record.contentStatus !== "EM_REVISAO_CLINICA"
  ) {
    throw new ApplicationError(
      "state_conflict",
      "Authoring record is not reviewable in the requested scope",
    );
  }
  if (record.authorId === command.principalId) {
    throw new ApplicationError(
      "forbidden",
      "Author cannot approve the authored content",
    );
  }

  const preflight = runAuthoringPreflight(record);
  const preflightRecord = await dependencies.repository.savePreflight(
    record,
    preflight,
  );
  if (
    command.decision === "APROVAR_CLINICAMENTE" &&
    !preflight.readyForClinicalReview
  ) {
    throw new ApplicationError(
      "state_conflict",
      "Authoring preflight is incomplete",
    );
  }

  const review = Object.freeze({
    reviewerId: command.principalId,
    decision: command.decision,
    rationale: command.rationale,
    reviewedAt: new Date().toISOString(),
    correlationId: command.correlationId,
  });
  const savedRecord = await dependencies.repository.saveReview(
    preflightRecord,
    review,
  );
  const transitionCommand: AdvanceContentCommand = {
    principalId: command.principalId,
    accountStatus: command.accountStatus,
    roles: command.roles,
    scopes: command.scopes,
    contentId: command.contentId,
    version: command.version,
    scopeId: command.scopeId,
    event: command.decision,
    correlationId: command.correlationId,
    ...(command.decision === "APROVAR_CLINICAMENTE"
      ? {
          approvedClinicalApproverId:
            command.approvedClinicalApproverId ?? command.principalId,
        }
      : {}),
  };
  const transitioned = await dependencies.transition(transitionCommand);

  return Object.freeze({
    review,
    record: Object.freeze({
      ...savedRecord,
      contentStatus: transitioned.status,
      preflight,
      latestReview: review,
    }),
  });
}
