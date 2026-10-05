import {
  evaluateModuleAttempt,
  type ModuleAnswer,
  type ModuleEvaluationMode,
  type ModuleEvaluationResult,
} from "@cvg/curriculum";

import { ApplicationError } from "./errors.js";

export type CurriculumRuntimeState = Readonly<{
  readonly participantId: string;
  readonly scopeId: string;
  readonly version: number;
  readonly updatedAt: string;
  readonly evaluation: ModuleEvaluationResult;
}>;

export type CurriculumRuntimeWriteInput = Readonly<{
  readonly participantId: string;
  readonly scopeId: string;
  readonly evaluation: ModuleEvaluationResult;
}>;

export interface CurriculumRuntimeWritePort {
  readonly saveCurriculumRuntime: (
    input: CurriculumRuntimeWriteInput,
  ) => Promise<CurriculumRuntimeState>;
}

export interface CurriculumRuntimeReadPort {
  readonly findCurriculumRuntime: (
    participantId: string,
    moduleId: string,
  ) => Promise<CurriculumRuntimeState | null>;
}

export type EvaluateCurriculumModuleCommand = Readonly<{
  readonly participantId: string;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly attemptId: string;
  readonly attemptVersion: number;
  readonly formVersion: number;
}>;

export type CurriculumEvaluationAttempt = Readonly<{
  readonly attemptId: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly attemptVersion: number;
  readonly status:
    | "SUBMETIDA"
    | "AGUARDA_CORRECAO_HUMANA"
    | "CORRIGIDA_AUTOMATICAMENTE"
    | "CORRIGIDA_HUMANAMENTE";
  readonly submittedAt: string;
  readonly mode: ModuleEvaluationMode;
  readonly form: Readonly<{
    readonly formId: string;
    readonly version: number;
    readonly blueprintId: string;
    readonly status: "PUBLICADO";
    readonly publication: Readonly<{ decisionId: string; publishedAt: string }>;
    readonly blueprint: Readonly<{
      version: number;
      approvalDecisionId: string;
      moduleId: string;
      questionTotal: number;
      openResponseCount: number;
      objectiveIds: readonly string[];
      itemManifest: readonly Readonly<{
        itemId: string;
        objectiveId: string;
        responseMode: "CHOICE" | "TEXT";
        critical: boolean;
        sessionId: string;
      }>[];
    }>;
    readonly catalog: Parameters<typeof evaluateModuleAttempt>[0]["catalog"];
    readonly contentVersions: NonNullable<
      ModuleEvaluationResult["evaluationAnchor"]
    >["contentVersions"];
  }>;
  readonly answers: readonly Readonly<{
    readonly attemptId: string;
    readonly contentVersionId: string;
    readonly answer: ModuleAnswer;
  }>[];
}>;

export interface CurriculumEvaluationAttemptReadPort {
  readonly findEvaluationAttempt: (
    command: EvaluateCurriculumModuleCommand,
  ) => Promise<CurriculumEvaluationAttempt | null>;
}

export type GetParticipantCurriculumRuntimeCommand = Readonly<{
  readonly participantId: string;
  readonly moduleId: string;
}>;

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function assertModuleId(value: string): void {
  assertNonEmpty(value, "moduleId");
  if (!/^M(?:0[1-9]|1[0-9]|2[0-4])$/u.test(value)) {
    throw new ApplicationError("validation_error", "moduleId is invalid");
  }
}

export async function evaluateAndPersistCurriculumModule(
  command: EvaluateCurriculumModuleCommand,
  repository: CurriculumRuntimeWritePort &
    Partial<CurriculumEvaluationAttemptReadPort>,
  attemptReader:
    | CurriculumEvaluationAttemptReadPort
    | undefined = repository.findEvaluationAttempt === undefined
    ? undefined
    : { findEvaluationAttempt: repository.findEvaluationAttempt },
): Promise<CurriculumRuntimeState> {
  assertNonEmpty(command.participantId, "participantId");
  assertNonEmpty(command.scopeId, "scopeId");
  assertModuleId(command.moduleId);
  if (
    "answers" in command ||
    "completedAt" in command ||
    "mode" in command ||
    attemptReader === undefined
  ) {
    throw new ApplicationError(
      "state_conflict",
      "Evaluation requires persisted attempt answers and an immutable published version",
    );
  }
  assertNonEmpty(command.attemptId, "attemptId");
  if (
    !Number.isSafeInteger(command.attemptVersion) ||
    command.attemptVersion < 0 ||
    !Number.isSafeInteger(command.formVersion) ||
    command.formVersion < 1
  ) {
    throw new ApplicationError(
      "validation_error",
      "Attempt and form versions are required",
    );
  }
  const attempt = await attemptReader.findEvaluationAttempt(command);
  if (attempt === null)
    throw new ApplicationError(
      "state_conflict",
      "Published attempt binding was not found",
    );
  assertAttemptEvaluationBinding(command, attempt);
  const { form } = attempt;
  const catalog = form.catalog;
  const evaluation = evaluateModuleAttempt({
    moduleId: command.moduleId,
    catalog,
    answers: attempt.answers.map((entry) => entry.answer),
    completedAt: attempt.submittedAt,
    mode: attempt.mode,
  });
  return repository.saveCurriculumRuntime(
    Object.freeze({
      participantId: command.participantId,
      scopeId: command.scopeId,
      evaluation: Object.freeze({
        ...evaluation,
        evaluationAnchor: Object.freeze({
          attemptId: attempt.attemptId,
          attemptVersion: attempt.attemptVersion,
          formId: form.formId,
          formVersion: form.version,
          blueprintId: form.blueprintId,
          blueprintVersion: form.blueprint.version,
          publicationDecisionId: form.publication.decisionId,
          blueprintApprovalDecisionId: form.blueprint.approvalDecisionId,
          publishedAt: form.publication.publishedAt,
          contentVersions: Object.freeze(
            form.contentVersions.map((binding) =>
              Object.freeze({
                ...binding,
                sourceRefs: Object.freeze(
                  binding.sourceRefs.map((ref) => Object.freeze({ ...ref })),
                ),
              }),
            ),
          ),
        }),
      }),
    }),
  );
}

function assertAttemptEvaluationBinding(
  command: EvaluateCurriculumModuleCommand,
  attempt: CurriculumEvaluationAttempt,
): void {
  if (
    attempt.participantId !== command.participantId ||
    attempt.scopeId !== command.scopeId ||
    attempt.moduleId !== command.moduleId ||
    attempt.attemptId !== command.attemptId
  ) {
    throw new ApplicationError(
      "forbidden",
      "Evaluation attempt is outside the authorized scope",
    );
  }
  const { form } = attempt;
  const versions = new Map(
    form.contentVersions.map((version) => [version.itemId, version]),
  );
  const catalog = form.catalog;
  if (
    attempt.attemptVersion !== command.attemptVersion ||
    form.version !== command.formVersion ||
    form.status !== "PUBLICADO" ||
    catalog.moduleId !== command.moduleId ||
    form.formId.trim().length === 0 ||
    form.blueprintId.trim().length === 0 ||
    versions.size !== catalog.items.length ||
    versions.size !== form.contentVersions.length ||
    new Set(form.contentVersions.map((binding) => binding.contentVersionId))
      .size !== form.contentVersions.length ||
    ![
      "SUBMETIDA",
      "AGUARDA_CORRECAO_HUMANA",
      "CORRIGIDA_AUTOMATICAMENTE",
      "CORRIGIDA_HUMANAMENTE",
    ].includes(attempt.status) ||
    Number.isNaN(Date.parse(attempt.submittedAt))
  ) {
    throw new ApplicationError(
      "state_conflict",
      "Attempt version or published form binding is incompatible",
    );
  }
  assertAuthorizedModuleManifest(form);
  if (
    Date.parse(form.publication.publishedAt) > Date.parse(attempt.submittedAt)
  )
    throw new ApplicationError(
      "state_conflict",
      "Attempt cannot precede its frozen publication",
    );
  for (const item of catalog.items) {
    const binding = versions.get(item.id);
    if (
      binding === undefined ||
      !Number.isSafeInteger(binding.version) ||
      binding.version < 1 ||
      binding.contentVersionId.trim().length === 0 ||
      binding.sourceRefs.length === 0 ||
      item.sourceRefs.length === 0 ||
      JSON.stringify(binding.sourceRefs) !== JSON.stringify(item.sourceRefs) ||
      binding.sourceRefs.some(
        (ref) =>
          ![
            "F-01",
            "F-02",
            "F-03",
            "AAHA-2024",
            "RECOVER-2024",
            "WSAVA-2022",
            "AVHTM-TRACS-2021",
          ].includes(ref.code) ||
          ref.locator.trim().length === 0 ||
          typeof ref.updateRequired !== "boolean",
      )
    ) {
      throw new ApplicationError(
        "state_conflict",
        "Each evaluated item requires its frozen content version and authorized sources",
      );
    }
    if (
      item.responseMode === "CHOICE" &&
      (item.correctChoiceIds === undefined ||
        item.correctChoiceIds.length === 0 ||
        new Set(item.correctChoiceIds).size !== item.correctChoiceIds.length ||
        item.choices === undefined ||
        item.choices.length < 2 ||
        item.correctChoiceIds.some(
          (id) => !item.choices?.some((choice) => choice.id === id),
        ))
    ) {
      throw new ApplicationError(
        "state_conflict",
        "Frozen published choice correction metadata is invalid",
      );
    }
  }
  if (
    new Set(attempt.answers.map((entry) => entry.answer.itemId)).size !==
      attempt.answers.length ||
    attempt.answers.some(
      (entry) =>
        entry.attemptId !== attempt.attemptId ||
        versions.get(entry.answer.itemId)?.contentVersionId !==
          entry.contentVersionId,
    )
  ) {
    throw new ApplicationError(
      "state_conflict",
      "Persisted answers do not match the attempt binding",
    );
  }
}

function assertAuthorizedModuleManifest(
  form: CurriculumEvaluationAttempt["form"],
): void {
  const { blueprint, publication, catalog } = form;
  if (blueprint === undefined || publication === undefined)
    throw new ApplicationError(
      "state_conflict",
      "Authorized published form metadata is required",
    );
  const manifest = new Map(
    blueprint.itemManifest.map((item) => [item.itemId, item]),
  );
  const objectives = new Set(blueprint.objectiveIds);
  const choices = catalog.items.filter(
    (item) => item.responseMode === "CHOICE",
  );
  const texts = catalog.items.filter((item) => item.responseMode === "TEXT");
  const valid =
    publication.decisionId.trim().length > 0 &&
    Number.isFinite(Date.parse(publication.publishedAt)) &&
    blueprint.approvalDecisionId.trim().length > 0 &&
    Number.isSafeInteger(blueprint.version) &&
    blueprint.version >= 1 &&
    blueprint.moduleId === catalog.moduleId &&
    Number.isSafeInteger(blueprint.questionTotal) &&
    blueprint.questionTotal > 0 &&
    Number.isSafeInteger(blueprint.openResponseCount) &&
    blueprint.openResponseCount > 0 &&
    choices.length === blueprint.questionTotal &&
    texts.length === blueprint.openResponseCount &&
    manifest.size === blueprint.itemManifest.length &&
    manifest.size === catalog.items.length &&
    objectives.size > 0 &&
    objectives.size === blueprint.objectiveIds.length &&
    [...objectives].every((id) =>
      catalog.items.some((item) => item.objectiveId === id),
    ) &&
    catalog.items.every((item) => {
      const expected = manifest.get(item.id);
      return (
        item.moduleId === catalog.moduleId &&
        objectives.has(item.objectiveId) &&
        expected?.objectiveId === item.objectiveId &&
        expected.responseMode === item.responseMode &&
        expected.critical === item.critical &&
        expected.sessionId === item.sessionId
      );
    });
  if (!valid)
    throw new ApplicationError(
      "state_conflict",
      "Catalog does not cover the authorized module blueprint manifest",
    );
}

export async function getParticipantCurriculumRuntime(
  command: GetParticipantCurriculumRuntimeCommand,
  repository: CurriculumRuntimeReadPort,
): Promise<CurriculumRuntimeState> {
  assertNonEmpty(command.participantId, "participantId");
  assertModuleId(command.moduleId);
  const state = await repository.findCurriculumRuntime(
    command.participantId,
    command.moduleId,
  );
  if (state === null) {
    throw new ApplicationError(
      "not_found",
      "Curriculum runtime state was not found in the current scope",
    );
  }
  if (
    state.participantId !== command.participantId ||
    state.evaluation.moduleId !== command.moduleId
  ) {
    throw new ApplicationError(
      "forbidden",
      "Curriculum runtime state is outside the current scope",
    );
  }
  return Object.freeze({
    ...state,
    evaluation: Object.freeze({
      ...state.evaluation,
      ...(state.evaluation.unansweredMandatoryItemIds === undefined
        ? {}
        : {
            unansweredMandatoryItemIds: Object.freeze([
              ...state.evaluation.unansweredMandatoryItemIds,
            ]),
          }),
      ...(state.evaluation.evaluationAnchor === undefined
        ? {}
        : {
            evaluationAnchor: Object.freeze({
              ...state.evaluation.evaluationAnchor,
              contentVersions: Object.freeze(
                state.evaluation.evaluationAnchor.contentVersions.map(
                  (binding) =>
                    Object.freeze({
                      ...binding,
                      sourceRefs: Object.freeze(
                        binding.sourceRefs.map((source) =>
                          Object.freeze({ ...source }),
                        ),
                      ),
                    }),
                ),
              ),
            }),
          }),
      objectiveResults: Object.freeze([...state.evaluation.objectiveResults]),
      remediationObjectiveIds: Object.freeze([
        ...state.evaluation.remediationObjectiveIds,
      ]),
      criticalErrorItemIds: Object.freeze([
        ...state.evaluation.criticalErrorItemIds,
      ]),
      invalidAnswerItemIds: Object.freeze([
        ...state.evaluation.invalidAnswerItemIds,
      ]),
      unansweredChoiceItemIds: Object.freeze([
        ...state.evaluation.unansweredChoiceItemIds,
      ]),
      openResponseItemIds: Object.freeze([
        ...state.evaluation.openResponseItemIds,
      ]),
      retentionReviews: Object.freeze([...state.evaluation.retentionReviews]),
    }),
  });
}
