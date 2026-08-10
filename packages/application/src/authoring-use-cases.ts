import { canAccess, type AccountStatus, type Role } from "./authorization.js";
import { validateClinicalSourceRefs } from "@cvg/curriculum";
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

export type AuthoringPublicationDependencies = Readonly<{
  readonly repository: AuthoringRepositoryPort;
  readonly transition: (
    command: AdvanceContentCommand,
  ) => Promise<ContentRecord>;
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
  if (record.contentStatus === "PUBLICADO") {
    return Object.freeze({ record: preflightRecord });
  }

  const transitioned = await dependencies.transition({
    principalId: command.principalId,
    accountStatus: command.accountStatus,
    roles: command.roles,
    scopes: command.scopes,
    contentId: command.contentId,
    version: command.version,
    scopeId: command.scopeId,
    event: "PUBLICAR_AUTOMATICAMENTE",
    correlationId: command.correlationId,
  });
  return Object.freeze({
    record: Object.freeze({
      ...preflightRecord,
      contentStatus: transitioned.status,
      preflight,
    }),
  });
}
