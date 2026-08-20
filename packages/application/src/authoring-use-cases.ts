import { type AccountStatus, type Role } from "./authorization.js";
import {
  validateClinicalSourceRefs,
  type InternalAssessmentInteraction,
  type PublicAssessmentInteraction,
  type PublicDigitalCaseStage,
} from "@cvg/curriculum";
import { createAuthoringPublicationMethods } from "./authoring-publication.js";
import { createAuthoringReviewMethods } from "./authoring-review.js";
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

export type AuthoringReviewResult = Readonly<{
  readonly record: AuthoringRecord;
  readonly review: ClinicalReviewRecord;
}>;

export type AuthoringPublicationResult = Readonly<{
  readonly record: AuthoringRecord;
}>;

export type AuthoringWorkflowOperation = "clinical_review" | "publication";

export type AuthoringIdempotencyRecord =
  | Readonly<{
      readonly operation: "clinical_review";
      readonly fingerprint: string;
      readonly result: AuthoringReviewResult;
    }>
  | Readonly<{
      readonly operation: "publication";
      readonly fingerprint: string;
      readonly result: AuthoringPublicationResult;
    }>;

export interface AuthoringIdempotencyPort {
  readonly find: (key: string) => Promise<AuthoringIdempotencyRecord | null>;
  readonly store: (
    key: string,
    record: AuthoringIdempotencyRecord,
  ) => Promise<void>;
}

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

export type ClinicalApproverRecord = Readonly<{
  readonly accountId: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
}>;

export interface ClinicalApproverPort {
  readonly findById: (
    accountId: string,
  ) => Promise<ClinicalApproverRecord | null>;
}

export interface AuthoringTransactionalOperations {
  readonly repository: AuthoringRepositoryPort;
  readonly approver: ClinicalApproverPort;
  readonly transition: (
    command: AdvanceContentCommand,
  ) => Promise<ContentRecord>;
  readonly idFactory: () => string;
  readonly idempotency: AuthoringIdempotencyPort;
}

export interface AuthoringTransactionPort {
  readonly run: <Result>(
    work: (operations: AuthoringTransactionalOperations) => Promise<Result>,
  ) => Promise<Result>;
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
  readonly idempotencyKey: string;
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
  readonly idempotencyKey: string;
  readonly approvedClinicalApproverId?: string;
}>;

export type AuthoringPublicationDependencies = Readonly<{
  readonly repository: AuthoringRepositoryPort;
  readonly transition: (
    command: AdvanceContentCommand,
  ) => Promise<ContentRecord>;
  readonly transaction: AuthoringTransactionPort;
}>;

export type AuthoringReviewDependencies = Readonly<{
  readonly repository: AuthoringRepositoryPort;
  readonly transition: AuthoringPublicationDependencies["transition"];
  readonly idFactory: () => string;
  readonly transaction: AuthoringTransactionPort;
}>;

export type AuthoringPreflightResult = AuthoringPreflight &
  Readonly<{
    readonly readyForPublication: boolean;
  }>;

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

const authoringReviewMethods = createAuthoringReviewMethods({
  runPreflight: runAuthoringPreflight,
});

const authoringPublicationMethods = createAuthoringPublicationMethods({
  runPreflight: runAuthoringPreflight,
});

export async function publishAuthoringContent(
  command: PublishAuthoringCommand,
  dependencies: AuthoringPublicationDependencies,
): Promise<Readonly<{ record: AuthoringRecord }>> {
  return authoringPublicationMethods.publish(command, dependencies);
}

export async function reviewAuthoringContent(
  command: ReviewAuthoringCommand,
  dependencies: AuthoringReviewDependencies,
): Promise<
  Readonly<{ record: AuthoringRecord; review: ClinicalReviewRecord }>
> {
  return authoringReviewMethods.review(command, dependencies);
}
