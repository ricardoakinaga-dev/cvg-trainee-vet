import {
  canAccess,
  type AccountStatus,
  type Capability,
  type Role,
} from "./authorization.js";
import { createAuditEntry, type AuditEntry } from "./audit.js";
import { ApplicationError } from "./errors.js";
import type {
  AdvanceContentCommand,
  ContentRecord,
} from "./content-use-cases.js";
import { curriculumV3 } from "@cvg/curriculum";

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

export type AuthoringDraftContentInput = Readonly<{
  readonly scopeId: string;
  readonly moduleId: string;
  readonly sessionId: string;
  readonly objectiveId: string;
  readonly ordinal: number;
  readonly title: string;
  readonly prompt: string;
  readonly responseMode: "CHOICE" | "TEXT";
  readonly choices?: readonly AuthoringChoice[];
  readonly correctChoiceIds?: readonly string[];
  readonly rubric?: AuthoringRubric;
  readonly feedback: string;
  readonly critical: boolean;
  readonly remediationTargetObjectiveId: string;
  readonly sourceRefs: readonly AuthoringSourceRef[];
}>;

export type CreateAuthoringDraftCommand = AuthoringDraftContentInput &
  Readonly<{
    readonly principalId: string;
    readonly accountStatus: AccountStatus;
    readonly roles: readonly Role[];
    readonly scopes: readonly string[];
    readonly idempotencyKey: string;
    readonly correlationId: string;
  }>;

export type AuthoringDraftCreateOptions = Readonly<{
  readonly idempotencyKey: string;
  readonly fingerprint: string;
  readonly audit: AuditEntry;
}>;

export interface AuthoringRepositoryPort {
  readonly createDraft: (
    record: AuthoringRecord,
    options: AuthoringDraftCreateOptions,
  ) => Promise<AuthoringRecord>;
  readonly find: (
    contentId: string,
    version: number,
    scopeId: string,
  ) => Promise<AuthoringRecord | null>;
  readonly savePreflight: (
    record: AuthoringRecord,
    preflight: AuthoringPreflight,
  ) => Promise<AuthoringRecord>;
  readonly saveReview: (
    record: AuthoringRecord,
    review: AuthoringReview,
  ) => Promise<AuthoringRecord>;
  readonly rollbackReview: (
    record: AuthoringRecord,
    preflight: AuthoringPreflight,
    review: AuthoringReview,
  ) => Promise<void>;
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

export type AuthoringDraftWorkflowDependencies = Readonly<{
  readonly repository: AuthoringRepositoryPort;
  readonly idFactory: () => string;
  readonly now?: () => string;
}>;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const sourceCodes = new Set([
  "F-01",
  "F-02",
  "F-03",
  "AAHA-2024",
  "RECOVER-2024",
  "WSAVA-2022",
  "AVHTM-TRACS-2021",
]);

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function isText(value: string): boolean {
  return value.trim().length > 0 && !/<[^>]*>/u.test(value);
}

function normalizedText(value: string, field: string): string {
  if (!isText(value)) {
    throw new ApplicationError("validation_error", `${field} is invalid`);
  }
  return value.trim();
}

function assertUuid(value: string, field: string): void {
  if (!uuidPattern.test(value)) {
    throw new ApplicationError("validation_error", `${field} is invalid`);
  }
}

function assertCurriculumBinding(command: CreateAuthoringDraftCommand): void {
  const module = curriculumV3.modules.find(
    (candidate) => candidate.id === command.moduleId,
  );
  const session = module?.sessions.find(
    (candidate) => candidate.id === command.sessionId,
  );
  if (module === undefined || session === undefined) {
    throw new ApplicationError(
      "validation_error",
      "moduleId and sessionId are not a supported curriculum binding",
    );
  }
  if (!session.objectiveIds.includes(command.objectiveId)) {
    throw new ApplicationError(
      "validation_error",
      "objectiveId is not part of the requested curriculum session",
    );
  }
  if (!session.objectiveIds.includes(command.remediationTargetObjectiveId)) {
    throw new ApplicationError(
      "validation_error",
      "remediationTargetObjectiveId is not part of the requested curriculum session",
    );
  }
}

function normalizeDraftInput(
  command: CreateAuthoringDraftCommand,
): AuthoringDraftContentInput {
  if (
    !Number.isInteger(command.ordinal) ||
    command.ordinal < 1 ||
    command.ordinal > 100
  ) {
    throw new ApplicationError("validation_error", "ordinal is invalid");
  }
  const title = normalizedText(command.title, "title");
  const prompt = normalizedText(command.prompt, "prompt");
  const feedback = normalizedText(command.feedback, "feedback");
  const remediationTargetObjectiveId = normalizedText(
    command.remediationTargetObjectiveId,
    "remediationTargetObjectiveId",
  );
  const sourceRefs = command.sourceRefs.map((source, index) => {
    if (!sourceCodes.has(source.code)) {
      throw new ApplicationError(
        "validation_error",
        `sourceRefs[${index}].code is not supported`,
      );
    }
    return Object.freeze({
      code: source.code,
      locator: normalizedText(source.locator, `sourceRefs[${index}].locator`),
      updateRequired: source.updateRequired,
    });
  });
  if (sourceRefs.length === 0 || sourceRefs.length > 20) {
    throw new ApplicationError("validation_error", "sourceRefs are invalid");
  }

  let choices: readonly AuthoringChoice[] | undefined;
  if (command.choices !== undefined) {
    const choiceIds = new Set<string>();
    choices = Object.freeze(
      command.choices.map((choice, index) => {
        const id = normalizedText(choice.id, `choices[${index}].id`);
        if (choiceIds.has(id)) {
          throw new ApplicationError(
            "validation_error",
            "choice ids must be unique",
          );
        }
        choiceIds.add(id);
        return Object.freeze({
          id,
          label: normalizedText(choice.label, `choices[${index}].label`),
          text: normalizedText(choice.text, `choices[${index}].text`),
        });
      }),
    );
    if (choices.length < 2 || choices.length > 12) {
      throw new ApplicationError("validation_error", "choices are invalid");
    }
  }

  let correctChoiceIds: readonly string[] | undefined;
  if (command.correctChoiceIds !== undefined) {
    const choiceIds = new Set(choices?.map((choice) => choice.id));
    const seen = new Set<string>();
    correctChoiceIds = Object.freeze(
      command.correctChoiceIds.map((choiceId) => {
        const normalized = normalizedText(choiceId, "correctChoiceIds");
        if (seen.has(normalized) || !choiceIds.has(normalized)) {
          throw new ApplicationError(
            "validation_error",
            "correctChoiceIds must be unique choices",
          );
        }
        seen.add(normalized);
        return normalized;
      }),
    );
    if (correctChoiceIds.length === 0 || correctChoiceIds.length > 12) {
      throw new ApplicationError(
        "validation_error",
        "correctChoiceIds are invalid",
      );
    }
  }
  if (command.responseMode === "CHOICE" && command.rubric !== undefined) {
    throw new ApplicationError(
      "validation_error",
      "choice drafts cannot contain a text rubric",
    );
  }
  if (
    command.responseMode === "TEXT" &&
    (choices !== undefined || correctChoiceIds !== undefined)
  ) {
    throw new ApplicationError(
      "validation_error",
      "text drafts cannot contain choices",
    );
  }

  return Object.freeze({
    scopeId: command.scopeId,
    moduleId: command.moduleId,
    sessionId: command.sessionId,
    objectiveId: command.objectiveId,
    ordinal: command.ordinal,
    title,
    prompt,
    responseMode: command.responseMode,
    ...(choices === undefined ? {} : { choices }),
    ...(correctChoiceIds === undefined ? {} : { correctChoiceIds }),
    ...(command.rubric === undefined ? {} : { rubric: command.rubric }),
    feedback,
    critical: command.critical,
    remediationTargetObjectiveId,
    sourceRefs: Object.freeze(sourceRefs),
  });
}

function draftFingerprint(
  command: CreateAuthoringDraftCommand,
  input: AuthoringDraftContentInput,
): string {
  return JSON.stringify({
    operation: "create_authoring_draft",
    principalId: command.principalId,
    ...input,
  });
}

function normalizeAuthoringDraftError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) return error;
  if (error instanceof Error && error.name === "PersistenceConflictError") {
    return new ApplicationError(
      "idempotency_conflict",
      "Idempotency key was already used with another command",
    );
  }
  return new ApplicationError(
    "internal_error",
    "Unable to create authoring draft",
  );
}

export async function createAuthoringDraft(
  command: CreateAuthoringDraftCommand,
  dependencies: AuthoringDraftWorkflowDependencies,
): Promise<AuthoringRecord> {
  for (const [value, field] of [
    [command.principalId, "principalId"],
    [command.scopeId, "scopeId"],
    [command.correlationId, "correlationId"],
    [command.idempotencyKey, "idempotencyKey"],
  ] as const) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new ApplicationError("validation_error", `${field} is required`);
    }
  }
  assertUuid(command.principalId, "principalId");
  assertUuid(command.scopeId, "scopeId");
  assertUuid(command.correlationId, "correlationId");
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]{7,127}$/u.test(command.idempotencyKey)) {
    throw new ApplicationError("validation_error", "idempotencyKey is invalid");
  }
  if (
    !canAccess({
      principalId: command.principalId,
      accountStatus: command.accountStatus,
      roles: command.roles,
      capability: "AUTHOR_CONTENT",
      resource: { scopeId: command.scopeId },
      scopes: command.scopes,
    })
  ) {
    throw new ApplicationError("forbidden", "Author is outside the scope");
  }
  assertCurriculumBinding(command);
  const input = normalizeDraftInput(command);
  const contentId = dependencies.idFactory();
  const contentVersionId = dependencies.idFactory();
  const editorialRecordId = dependencies.idFactory();
  const auditId = dependencies.idFactory();
  for (const [value, field] of [
    [contentId, "contentId"],
    [contentVersionId, "contentVersionId"],
    [editorialRecordId, "editorialRecordId"],
    [auditId, "auditId"],
  ] as const) {
    assertUuid(value, field);
  }
  if (
    new Set([contentId, contentVersionId, editorialRecordId, auditId]).size !==
    4
  ) {
    throw new ApplicationError(
      "internal_error",
      "Generated authoring ids must be unique",
    );
  }
  const now = dependencies.now?.() ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(now))) {
    throw new ApplicationError("internal_error", "Authoring clock is invalid");
  }
  const participant = Object.freeze({
    id: contentId,
    ordinal: input.ordinal,
    kind:
      input.responseMode === "TEXT" ? ("CASO" as const) : ("QUESTAO" as const),
    title: input.title,
    prompt: input.prompt,
    responseMode: input.responseMode,
    ...(input.choices === undefined
      ? {}
      : {
          choices: input.choices,
          selectionMode:
            input.correctChoiceIds !== undefined &&
            input.correctChoiceIds.length > 1
              ? ("MULTIPLE" as const)
              : ("SINGLE" as const),
        }),
  });
  const draft = Object.freeze({
    editorialRecordId,
    contentId,
    version: 1,
    contentVersionId,
    scopeId: input.scopeId,
    moduleId: input.moduleId,
    sessionId: input.sessionId,
    objectiveId: input.objectiveId,
    authorId: command.principalId,
    title: input.title,
    prompt: input.prompt,
    responseMode: input.responseMode,
    ...(input.choices === undefined ? {} : { choices: input.choices }),
    ...(input.correctChoiceIds === undefined
      ? {}
      : { correctChoiceIds: input.correctChoiceIds }),
    ...(input.rubric === undefined ? {} : { rubric: input.rubric }),
    feedback: input.feedback,
    critical: input.critical,
    remediationTargetObjectiveId: input.remediationTargetObjectiveId,
    sourceRefs: input.sourceRefs,
    participant,
    contentStatus: "RASCUNHO" as const,
    preflight: runAuthoringPreflight(
      {
        editorialRecordId,
        contentId,
        version: 1,
        contentVersionId,
        scopeId: input.scopeId,
        moduleId: input.moduleId,
        sessionId: input.sessionId,
        objectiveId: input.objectiveId,
        authorId: command.principalId,
        title: input.title,
        prompt: input.prompt,
        responseMode: input.responseMode,
        ...(input.choices === undefined ? {} : { choices: input.choices }),
        ...(input.correctChoiceIds === undefined
          ? {}
          : { correctChoiceIds: input.correctChoiceIds }),
        ...(input.rubric === undefined ? {} : { rubric: input.rubric }),
        feedback: input.feedback,
        critical: input.critical,
        remediationTargetObjectiveId: input.remediationTargetObjectiveId,
        sourceRefs: input.sourceRefs,
        participant,
        contentStatus: "RASCUNHO" as const,
        preflight: {
          ruleVersion: "authoring-preflight-v1",
          technicalChecksPassed: false,
          checks: {
            requiredFields: false,
            correctionMetadata: false,
            publicBoundary: false,
            sourceTraceability: false,
            publicationBlocked: true,
          },
          checkedAt: now,
        },
      },
      now,
    ),
  });
  try {
    return await dependencies.repository.createDraft(draft, {
      idempotencyKey: command.idempotencyKey,
      fingerprint: draftFingerprint(command, input),
      audit: createAuditEntry({
        auditId,
        principalId: command.principalId,
        action: "CONTENT_DRAFT_CREATED",
        resourceType: "content_version",
        resourceId: contentId,
        scopeId: input.scopeId,
        outcome: "SUCCESS",
        reasonCode: "content_draft_created",
        requestId: command.correlationId,
        correlationId: command.correlationId,
        occurredAt: now,
      }),
    });
  } catch (error) {
    throw normalizeAuthoringDraftError(error);
  }
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
    command.scopeId,
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
  let transitioned: ContentRecord;
  try {
    transitioned = await dependencies.transition(transitionCommand);
  } catch (error) {
    await dependencies.repository.rollbackReview(
      record,
      record.preflight,
      review,
    );
    throw error;
  }

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
