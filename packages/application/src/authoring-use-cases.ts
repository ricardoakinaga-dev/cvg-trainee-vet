import { canAccess, type AccountStatus, type Role } from "./authorization.js";
import {
  validateClinicalSourceRefs,
  type InternalAssessmentInteraction,
  type PublicAssessmentInteraction,
  type PublicDigitalCaseStage,
} from "@cvg/curriculum";
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
  readonly responseMode:
    "CHOICE" | "TEXT" | "STRUCTURED_FIELDS" | "DOSE_INFUSION";
  readonly choices?: readonly AuthoringChoice[];
  readonly selectionMode?: "SINGLE" | "MULTIPLE";
  readonly interaction?: PublicAssessmentInteraction;
  readonly digitalCaseStage?: PublicDigitalCaseStage;
}>;

export type AuthoringPreflight = Readonly<{
  readonly ruleVersion: "authoring-preflight-v1";
  readonly technicalChecksPassed: boolean;
  readonly sourceVerification?: "VERIFICADO_AUTOMATICAMENTE" | "INVALIDO";
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
  readonly responseMode:
    "CHOICE" | "TEXT" | "STRUCTURED_FIELDS" | "DOSE_INFUSION" | "NONE";
  readonly choices?: readonly AuthoringChoice[];
  readonly correctChoiceIds?: readonly string[];
  readonly rubric?: AuthoringRubric;
  readonly interaction?: InternalAssessmentInteraction;
  readonly humanCorrectionOwner?: "RICARDO";
  readonly digitalCaseStage?: PublicDigitalCaseStage;
  readonly feedback: string;
  readonly critical: boolean;
  readonly remediationTargetObjectiveId: string;
  readonly sourceRefs: readonly AuthoringSourceRef[];
  readonly participant: AuthoringParticipantItem;
  readonly contentStatus: ContentRecord["status"];
  readonly preflight: AuthoringPreflight;
}>;

export type ClinicalReviewDecision =
  "APROVAR_CLINICAMENTE" | "SOLICITAR_AJUSTES";

export type ClinicalReviewRecord = Readonly<{
  readonly reviewId: string;
  readonly contentId: string;
  readonly version: number;
  readonly contentEditorialRecordId: string;
  readonly contentVersionId: string;
  readonly scopeId: string;
  readonly reviewerId: string;
  readonly decision: ClinicalReviewDecision;
  readonly rationale: string;
  readonly correlationId: string;
  readonly reviewedAt: string;
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
  readonly findLatestClinicalReview: (
    contentId: string,
    version: number,
  ) => Promise<ClinicalReviewRecord | null>;
  readonly saveClinicalReview: (review: ClinicalReviewRecord) => Promise<void>;
}

export type PublishAuthoringCommand = Readonly<{
  readonly principalId: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly contentId: string;
  readonly version: number;
  readonly scopeId: string;
  readonly correlationId: string;
}>;

export type ReviewAuthoringCommand = Readonly<{
  readonly principalId: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly contentId: string;
  readonly version: number;
  readonly scopeId: string;
  readonly decision: ClinicalReviewDecision;
  readonly rationale: string;
  readonly correlationId: string;
}>;

export type AuthoringPublicationDependencies = Readonly<{
  readonly repository: AuthoringRepositoryPort;
  readonly transition: (
    command: AdvanceContentCommand,
  ) => Promise<ContentRecord>;
}>;

export type AuthoringReviewDependencies = Readonly<{
  readonly repository: AuthoringRepositoryPort;
  readonly transition: AuthoringPublicationDependencies["transition"];
  readonly idFactory: () => string;
}>;

export type AuthoringPreflightResult = AuthoringPreflight &
  Readonly<{
    readonly readyForPublication: boolean;
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
  if (
    record.responseMode === "STRUCTURED_FIELDS" ||
    record.responseMode === "DOSE_INFUSION"
  ) {
    return record.interaction !== undefined;
  }
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
    "interaction",
    "digitalCaseStage",
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
    record.sourceRefs.every(
      (source) => isText(source.code) && isText(source.locator),
    ) && validateClinicalSourceRefs(record.sourceRefs).valid;
  const technicalChecksPassed =
    requiredFields &&
    correctionMetadata &&
    publicBoundary &&
    sourceTraceability;

  return Object.freeze({
    ruleVersion: "authoring-preflight-v1" as const,
    technicalChecksPassed,
    sourceVerification: technicalChecksPassed
      ? ("VERIFICADO_AUTOMATICAMENTE" as const)
      : ("INVALIDO" as const),
    readyForPublication: technicalChecksPassed,
    checks: Object.freeze({
      requiredFields,
      correctionMetadata,
      publicBoundary,
      sourceTraceability,
      publicationBlocked: !technicalChecksPassed,
    }),
    checkedAt,
  });
}

export async function publishAuthoringContent(
  command: PublishAuthoringCommand,
  dependencies: AuthoringPublicationDependencies,
): Promise<Readonly<{ record: AuthoringRecord }>> {
  for (const [value, field] of [
    [command.principalId, "principalId"],
    [command.contentId, "contentId"],
    [command.scopeId, "scopeId"],
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
      capability: "PUBLISH_CONTENT",
      resource: { scopeId: command.scopeId },
      scopes: command.scopes,
    })
  ) {
    throw new ApplicationError("forbidden", "Publisher is outside the scope");
  }

  const record = await dependencies.repository.find(
    command.contentId,
    command.version,
  );
  if (record === null) {
    throw new ApplicationError("not_found", "Authoring record not found");
  }
  if (record.scopeId !== command.scopeId) {
    throw new ApplicationError("forbidden", "Content is outside the scope");
  }

  const latestReview = await dependencies.repository.findLatestClinicalReview(
    command.contentId,
    command.version,
  );
  if (
    record.contentStatus !== "APROVADO_CLINICAMENTE" ||
    latestReview?.decision !== "APROVAR_CLINICAMENTE" ||
    latestReview.reviewerId === record.authorId
  ) {
    throw new ApplicationError(
      "state_conflict",
      "Clinical approval is required before publication",
    );
  }

  const preflight = runAuthoringPreflight(record);
  const preflightRecord = await dependencies.repository.savePreflight(
    record,
    preflight,
  );
  if (!preflight.readyForPublication) {
    throw new ApplicationError(
      "state_conflict",
      "Automatic source preflight is incomplete",
    );
  }
  await dependencies.transition({
    principalId: command.principalId,
    accountStatus: command.accountStatus,
    roles: command.roles,
    scopes: command.scopes,
    contentId: command.contentId,
    version: command.version,
    scopeId: command.scopeId,
    event: "AUTORIZAR_PUBLICACAO",
    correlationId: command.correlationId,
    approvedClinicalReviewerId: latestReview.reviewerId,
  });
  const transitioned = await dependencies.transition({
    principalId: command.principalId,
    accountStatus: command.accountStatus,
    roles: command.roles,
    scopes: command.scopes,
    contentId: command.contentId,
    version: command.version,
    scopeId: command.scopeId,
    event: "PUBLICAR",
    correlationId: command.correlationId,
    approvedClinicalReviewerId: latestReview.reviewerId,
  });
  return Object.freeze({
    record: Object.freeze({
      ...preflightRecord,
      contentStatus: transitioned.status,
      preflight,
    }),
  });
}

export async function reviewAuthoringContent(
  command: ReviewAuthoringCommand,
  dependencies: AuthoringReviewDependencies,
): Promise<
  Readonly<{ record: AuthoringRecord; review: ClinicalReviewRecord }>
> {
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
  if (command.rationale.length > 10_000 || /<[^>]*>/u.test(command.rationale)) {
    throw new ApplicationError(
      "validation_error",
      "rationale must be plain text",
    );
  }
  const capability =
    command.decision === "APROVAR_CLINICAMENTE"
      ? ("APPROVE_CLINICAL_CONTENT" as const)
      : ("MODERATE_CONTENT" as const);
  if (
    !canAccess({
      principalId: command.principalId,
      accountStatus: command.accountStatus,
      roles: command.roles,
      capability,
      resource: { scopeId: command.scopeId },
      scopes: command.scopes,
      approvedClinicalApproverId: command.principalId,
    })
  ) {
    throw new ApplicationError(
      "forbidden",
      "Clinical review is outside the scope",
    );
  }

  const record = await dependencies.repository.find(
    command.contentId,
    command.version,
  );
  if (record === null) {
    throw new ApplicationError("not_found", "Authoring record not found");
  }
  if (record.scopeId !== command.scopeId) {
    throw new ApplicationError("forbidden", "Content is outside the scope");
  }
  if (record.authorId === command.principalId) {
    throw new ApplicationError("forbidden", "Author cannot review own content");
  }

  const preflight = runAuthoringPreflight(record);
  if (!preflight.technicalChecksPassed) {
    throw new ApplicationError(
      "state_conflict",
      "Technical preflight must pass before clinical review",
    );
  }
  const preflightRecord = await dependencies.repository.savePreflight(
    record,
    preflight,
  );
  let reviewedStatus = record.contentStatus;
  if (
    reviewedStatus === "AUTOVERIFICADO" ||
    reviewedStatus === "PROJECAO_VERIFICADA"
  ) {
    const submitted = await dependencies.transition({
      principalId: command.principalId,
      accountStatus: command.accountStatus,
      roles: command.roles,
      scopes: command.scopes,
      contentId: command.contentId,
      version: command.version,
      scopeId: command.scopeId,
      event: "ENVIAR_PARA_REVISAO_CLINICA",
      correlationId: command.correlationId,
      approvedClinicalApproverId: command.principalId,
    });
    reviewedStatus = submitted.status;
  }
  if (reviewedStatus !== "EM_REVISAO_CLINICA") {
    throw new ApplicationError(
      "state_conflict",
      "Content is not awaiting clinical review",
    );
  }
  const transition = await dependencies.transition({
    principalId: command.principalId,
    accountStatus: command.accountStatus,
    roles: command.roles,
    scopes: command.scopes,
    contentId: command.contentId,
    version: command.version,
    scopeId: command.scopeId,
    event: command.decision,
    correlationId: command.correlationId,
    approvedClinicalApproverId: command.principalId,
  });
  const review = Object.freeze({
    reviewId: dependencies.idFactory(),
    contentId: record.contentId,
    version: record.version,
    contentEditorialRecordId: record.editorialRecordId,
    contentVersionId: record.contentVersionId,
    scopeId: record.scopeId,
    reviewerId: command.principalId,
    decision: command.decision,
    rationale: command.rationale,
    correlationId: command.correlationId,
    reviewedAt: new Date().toISOString(),
  });
  await dependencies.repository.saveClinicalReview(review);
  return Object.freeze({
    record: Object.freeze({
      ...preflightRecord,
      contentStatus: transition.status,
      preflight,
    }),
    review,
  });
}
