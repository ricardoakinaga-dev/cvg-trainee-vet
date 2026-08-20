import { curriculumV3 } from "./catalog.js";
import {
  evaluateDoseInfusion,
  evaluateStructuredFields,
} from "./learning-interactions.js";
import {
  b07DiagnosticDraftPack,
  getModuleDraftPack,
} from "./learning-runtime-content.js";
import type {
  CurriculumDiagnosticResult,
  CurriculumDraftPack,
  CurriculumDraftItem,
  ModuleAnswer,
  ModuleEvaluationMode,
  ModuleEvaluationResult,
  ObjectiveRuntimeResult,
  PersonalizedPathInput,
  PersonalizedPathItem,
} from "./learning-runtime-types.js";
import { freeze, LearningRuntimeError } from "./learning-runtime-types.js";

const diagnosticThemeRecommendations: Readonly<
  Record<"B07-S1" | "B07-S2" | "B07-S3", readonly string[]>
> = freeze({
  "B07-S1": freeze(["M01", "M11", "M12"]),
  "B07-S2": freeze(["M02", "M04", "M10"]),
  "B07-S3": freeze(["M11", "M12"]),
});

function unique<T>(values: readonly T[]): readonly T[] {
  return freeze([...new Set(values)]);
}

const diagnosticThemeIds = ["B07-S1", "B07-S2", "B07-S3"] as const;

function validateDiagnosticAnswers(
  answers: readonly ModuleAnswer[],
  itemById: ReadonlyMap<string, CurriculumDraftItem>,
): void {
  for (const answer of answers) {
    const item = itemById.get(answer.itemId);
    if (item === undefined) {
      throw new LearningRuntimeError(
        "answer contains an unknown diagnostic item",
      );
    }
    if (answer.text !== undefined) {
      throw new LearningRuntimeError(
        "diagnostic answers must use the choice response mode",
      );
    }
    const allowedChoiceIds = new Set(
      (item.choices ?? []).map((choice) => choice.id),
    );
    if (
      answer.selectedChoiceIds === undefined ||
      answer.selectedChoiceIds.some((id) => !allowedChoiceIds.has(id))
    ) {
      throw new LearningRuntimeError(
        "diagnostic answer contains an unknown choice",
      );
    }
  }
}

function diagnosticItemsForTheme(
  themeId: (typeof diagnosticThemeIds)[number],
): readonly CurriculumDraftItem[] {
  return b07DiagnosticDraftPack.items.filter(
    (item) => item.diagnosticSessionId === themeId,
  );
}

function evaluateDiagnosticTheme(
  themeId: (typeof diagnosticThemeIds)[number],
  answerByItem: ReadonlyMap<string, ModuleAnswer>,
) {
  const themeItems = diagnosticItemsForTheme(themeId);
  const answeredItems = themeItems.filter((item) => answerByItem.has(item.id));
  const earnedPoints = answeredItems.filter((item) =>
    sameChoiceSet(
      answerByItem.get(item.id)?.selectedChoiceIds ?? [],
      item.correctChoiceIds ?? [],
    ),
  ).length;
  const possiblePoints = answeredItems.length;
  const percent =
    possiblePoints === 0
      ? 0
      : Math.round((earnedPoints / possiblePoints) * 100);
  const recommendations = diagnosticThemeRecommendations[themeId];
  const recommendedModuleIds =
    percent < 70 || answeredItems.length < themeItems.length
      ? recommendations
      : recommendations.slice(0, 1);
  return freeze({
    themeId,
    itemCount: themeItems.length,
    answeredItemCount: answeredItems.length,
    earnedPoints,
    possiblePoints,
    percent,
    recommendedModuleIds: freeze([...recommendedModuleIds]),
  });
}

function diagnosticRemediationObjectives(
  themeResults: readonly ReturnType<typeof evaluateDiagnosticTheme>[],
): readonly string[] {
  return unique(
    themeResults.flatMap((theme) =>
      theme.percent < 70 || theme.answeredItemCount < theme.itemCount
        ? diagnosticItemsForTheme(theme.themeId).map((item) => item.objectiveId)
        : [],
    ),
  );
}

export function evaluateDiagnosticAttempt(
  input: Readonly<{ readonly answers: readonly ModuleAnswer[] }>,
): CurriculumDiagnosticResult {
  assertUniqueAnswers(input.answers);
  const itemById = new Map(
    b07DiagnosticDraftPack.items.map((item) => [item.id, item]),
  );
  validateDiagnosticAnswers(input.answers, itemById);

  const answerByItem = new Map(
    input.answers.map((answer) => [answer.itemId, answer]),
  );
  const themeResults = diagnosticThemeIds.map((themeId) =>
    evaluateDiagnosticTheme(themeId, answerByItem),
  );
  const remediationObjectiveIds = diagnosticRemediationObjectives(themeResults);
  return freeze({
    diagnosticId: "B07-DIAGNOSTIC-V1",
    version: "0.1.0",
    notPunitive: true,
    noGlobalPassFail: true,
    totalItemCount: b07DiagnosticDraftPack.items.length,
    answeredItemCount: input.answers.length,
    themeResults: freeze(themeResults),
    recommendedModuleIds: unique(
      themeResults.flatMap((theme) => theme.recommendedModuleIds),
    ),
    remediationObjectiveIds,
  });
}

function parseCompletedAt(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new LearningRuntimeError("completedAt must be a valid timestamp");
  }
  return date;
}

function datePlusDays(completedAt: Date, days: number): string {
  const date = new Date(completedAt.getTime());
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function sameChoiceSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return (
    leftSet.size === rightSet.size &&
    [...leftSet].every((value) => rightSet.has(value))
  );
}

function assertUniqueAnswers(answers: readonly ModuleAnswer[]): void {
  if (new Set(answers.map((answer) => answer.itemId)).size !== answers.length) {
    throw new LearningRuntimeError("an item cannot receive duplicate answers");
  }
}

function assertPlainTextResponse(value: string): void {
  if (value.length > 10_000 || /<[^>]*>/u.test(value)) {
    throw new LearningRuntimeError("text response must be plain text");
  }
}

type AutomaticItemEvaluation = Readonly<{
  readonly answered: boolean;
  readonly passed: boolean;
  readonly invalid: boolean;
}>;

type ModuleAttemptInput = Readonly<{
  readonly moduleId: string;
  readonly answers: readonly ModuleAnswer[];
  readonly completedAt: string;
  readonly mode?: ModuleEvaluationMode;
}>;

type ModuleItemGroups = Readonly<{
  readonly choiceItems: readonly CurriculumDraftItem[];
  readonly automaticItems: readonly CurriculumDraftItem[];
  readonly openResponseItems: readonly CurriculumDraftItem[];
}>;

type ModuleAttemptEvaluationMethods = Readonly<{
  readonly classifyItems: (pack: CurriculumDraftPack) => ModuleItemGroups;
  readonly validateAnswers: (
    pack: CurriculumDraftPack,
    answers: readonly ModuleAnswer[],
  ) => ReadonlyMap<string, ModuleAnswer>;
  readonly evaluateAutomaticItems: (
    items: readonly CurriculumDraftItem[],
    answerByItem: ReadonlyMap<string, ModuleAnswer>,
  ) => ReadonlyMap<string, AutomaticItemEvaluation>;
}>;

function classifyItems(pack: CurriculumDraftPack): ModuleItemGroups {
  return freeze({
    choiceItems: freeze(
      pack.items.filter((item) => item.responseMode === "CHOICE"),
    ),
    automaticItems: freeze(
      pack.items.filter((item) => item.responseMode !== "TEXT"),
    ),
    openResponseItems: freeze(
      pack.items.filter((item) => item.responseMode === "TEXT"),
    ),
  });
}

function validateAnswers(
  pack: CurriculumDraftPack,
  answers: readonly ModuleAnswer[],
): ReadonlyMap<string, ModuleAnswer> {
  const answerByItem = new Map(
    answers.map((answer) => [answer.itemId, answer]),
  );
  const itemById = new Map(pack.items.map((item) => [item.id, item]));
  const invalidAnswerItemIds = answers
    .filter((answer) => !itemById.has(answer.itemId))
    .map((answer) => answer.itemId);
  if (invalidAnswerItemIds.length > 0) {
    throw new LearningRuntimeError(
      "answer contains an unknown curriculum item",
    );
  }

  for (const answer of answers) {
    const item = itemById.get(answer.itemId);
    if (item === undefined) continue;
    if (answer.text !== undefined) {
      if (item.responseMode !== "TEXT") {
        throw new LearningRuntimeError(
          "text answer does not match the item response mode",
        );
      }
      assertPlainTextResponse(answer.text);
    }
    if (answer.selectedChoiceIds !== undefined) {
      if (item.responseMode !== "CHOICE") {
        throw new LearningRuntimeError(
          "choice answer does not match the item response mode",
        );
      }
      const allowedChoiceIds = new Set(
        (item.choices ?? []).map((choice) => choice.id),
      );
      if (answer.selectedChoiceIds.some((id) => !allowedChoiceIds.has(id))) {
        throw new LearningRuntimeError("answer contains an unknown choice");
      }
    }
    if (answer.structuredValues !== undefined) {
      if (
        item.responseMode !== "STRUCTURED_FIELDS" &&
        item.responseMode !== "DOSE_INFUSION"
      ) {
        throw new LearningRuntimeError(
          "structured answer does not match the item response mode",
        );
      }
    }
  }
  return answerByItem;
}

function evaluateAutomaticItems(
  items: readonly CurriculumDraftItem[],
  answerByItem: ReadonlyMap<string, ModuleAnswer>,
): ReadonlyMap<string, AutomaticItemEvaluation> {
  return new Map(
    items.map((item) => [
      item.id,
      evaluateAutomaticItem(item, answerByItem.get(item.id)),
    ]),
  );
}

export function createModuleAttemptEvaluationMethods(): ModuleAttemptEvaluationMethods {
  return Object.freeze({
    classifyItems,
    validateAnswers,
    evaluateAutomaticItems,
  });
}

const moduleAttemptEvaluationMethods = createModuleAttemptEvaluationMethods();

function evaluateAutomaticItem(
  item: CurriculumDraftItem,
  answer: ModuleAnswer | undefined,
): AutomaticItemEvaluation {
  if (item.responseMode === "CHOICE") {
    const selected = answer?.selectedChoiceIds;
    return freeze({
      answered: selected !== undefined,
      passed:
        selected !== undefined &&
        sameChoiceSet(selected, item.correctChoiceIds ?? []),
      invalid: false,
    });
  }
  if (
    item.responseMode !== "STRUCTURED_FIELDS" &&
    item.responseMode !== "DOSE_INFUSION"
  ) {
    return freeze({ answered: false, passed: false, invalid: false });
  }
  const values = answer?.structuredValues;
  if (values === undefined || item.interaction === undefined) {
    return freeze({ answered: false, passed: false, invalid: false });
  }
  if (item.interaction.kind !== item.responseMode) {
    return freeze({ answered: true, passed: false, invalid: true });
  }
  const result =
    item.interaction.kind === "STRUCTURED_FIELDS"
      ? evaluateStructuredFields(item.interaction, values)
      : evaluateDoseInfusion(item.interaction, values);
  return freeze({
    answered: true,
    passed: result.passed,
    invalid:
      result.missingFieldIds.length > 0 || result.invalidFieldIds.length > 0,
  });
}

type ModuleAttemptSignals = Readonly<{
  readonly objectiveResults: readonly ObjectiveRuntimeResult[];
  readonly remediationObjectiveIds: readonly string[];
  readonly criticalErrorItemIds: readonly string[];
  readonly invalidAnswerItemIds: readonly string[];
  readonly unansweredChoiceItemIds: readonly string[];
  readonly openResponseItemIds: readonly string[];
  readonly unansweredAutomaticItemIds: readonly string[];
}>;

function buildObjectiveResults(
  items: readonly CurriculumDraftItem[],
  automaticEvaluationByItemId: ReadonlyMap<string, AutomaticItemEvaluation>,
): readonly ObjectiveRuntimeResult[] {
  const objectiveResults = items.reduce<readonly ObjectiveRuntimeResult[]>(
    (results, item) => {
      const existing = results.find(
        (result) => result.objectiveId === item.objectiveId,
      );
      const itemIsAutomatic = item.responseMode !== "TEXT";
      const itemEvaluation = automaticEvaluationByItemId.get(item.id);
      const earned = itemEvaluation?.passed ? 1 : 0;
      if (existing === undefined) {
        return [
          ...results,
          freeze({
            objectiveId: item.objectiveId,
            earnedPoints: earned,
            possiblePoints: itemIsAutomatic ? 1 : 0,
            percent: itemIsAutomatic ? earned * 100 : 0,
            critical: item.critical,
            requiredPercent: item.critical ? 80 : 70,
          }),
        ];
      }
      const possiblePoints =
        existing.possiblePoints + (itemIsAutomatic ? 1 : 0);
      const earnedPoints = existing.earnedPoints + earned;
      return [
        ...results.filter((result) => result !== existing),
        freeze({
          ...existing,
          earnedPoints,
          possiblePoints,
          percent:
            possiblePoints === 0
              ? 0
              : Math.round((earnedPoints / possiblePoints) * 100),
          critical: existing.critical || item.critical,
          requiredPercent: existing.critical || item.critical ? 80 : 70,
        }),
      ];
    },
    [],
  );
  return freeze(
    [...objectiveResults].sort((left, right) =>
      left.objectiveId.localeCompare(right.objectiveId),
    ),
  );
}

function buildRemediationObjectiveIds(
  pack: CurriculumDraftPack,
  objectiveResults: readonly ObjectiveRuntimeResult[],
  criticalErrorItemIds: readonly string[],
): readonly string[] {
  return unique(
    objectiveResults
      .filter(
        (result) =>
          result.possiblePoints === 0 ||
          result.percent < result.requiredPercent,
      )
      .map((result) => result.objectiveId)
      .concat(
        criticalErrorItemIds.flatMap((itemId) => {
          const item = pack.items.find((candidate) => candidate.id === itemId);
          return item === undefined ? [] : [item.remediationTargetObjectiveId];
        }),
      ),
  );
}

function buildAttemptSignals(
  pack: CurriculumDraftPack,
  input: ModuleAttemptInput,
  itemGroups: ModuleItemGroups,
  answerByItem: ReadonlyMap<string, ModuleAnswer>,
): ModuleAttemptSignals {
  const automaticEvaluationByItemId =
    moduleAttemptEvaluationMethods.evaluateAutomaticItems(
      itemGroups.automaticItems,
      answerByItem,
    );
  const criticalErrorItemIds = itemGroups.automaticItems
    .filter((item) => {
      const evaluation = automaticEvaluationByItemId.get(item.id);
      return item.critical && evaluation?.answered && !evaluation.passed;
    })
    .map((item) => item.id);
  const objectiveResults = buildObjectiveResults(
    pack.items,
    automaticEvaluationByItemId,
  );
  return freeze({
    objectiveResults,
    remediationObjectiveIds: buildRemediationObjectiveIds(
      pack,
      objectiveResults,
      criticalErrorItemIds,
    ),
    criticalErrorItemIds: freeze(criticalErrorItemIds),
    invalidAnswerItemIds: freeze(
      itemGroups.automaticItems
        .filter((item) => automaticEvaluationByItemId.get(item.id)?.invalid)
        .map((item) => item.id),
    ),
    unansweredChoiceItemIds: freeze(
      itemGroups.choiceItems
        .filter(
          (item) => answerByItem.get(item.id)?.selectedChoiceIds === undefined,
        )
        .map((item) => item.id),
    ),
    openResponseItemIds: freeze(
      input.mode === "FORMATIVE_CHOICE"
        ? []
        : itemGroups.openResponseItems.map((item) => item.id),
    ),
    unansweredAutomaticItemIds: freeze(
      itemGroups.automaticItems
        .filter((item) => !automaticEvaluationByItemId.get(item.id)?.answered)
        .map((item) => item.id),
    ),
  });
}

function buildRetentionReviews(completedAt: Date) {
  return freeze(
    ([30, 60, 90] as const).map((day) =>
      freeze({
        day,
        dueAt: datePlusDays(completedAt, day),
        status: "PENDENTE" as const,
      }),
    ),
  );
}

function buildModuleEvaluationResult(
  pack: CurriculumDraftPack,
  completedAt: Date,
  signals: ModuleAttemptSignals,
): ModuleEvaluationResult {
  if (signals.openResponseItemIds.length > 0) {
    return freeze({
      moduleId: pack.moduleId,
      status: "AGUARDA_CORRECAO_HUMANA",
      nextAction: "AGUARDAR_CORRECAO_HUMANA",
      objectiveResults: signals.objectiveResults,
      remediationObjectiveIds: signals.remediationObjectiveIds,
      criticalErrorItemIds: signals.criticalErrorItemIds,
      invalidAnswerItemIds: signals.invalidAnswerItemIds,
      unansweredChoiceItemIds: signals.unansweredChoiceItemIds,
      openResponseItemIds: signals.openResponseItemIds,
      retentionReviews: freeze([]),
      practicalCompetenceClaim: "PROIBIDO_MVP",
    });
  }

  const scorePossible = signals.objectiveResults.reduce(
    (total, result) => total + result.possiblePoints,
    0,
  );
  const scoreEarned = signals.objectiveResults.reduce(
    (total, result) => total + result.earnedPoints,
    0,
  );
  const scorePercent =
    scorePossible === 0 ? 0 : Math.round((scoreEarned / scorePossible) * 100);
  const mastered =
    signals.unansweredAutomaticItemIds.length === 0 &&
    scorePercent >= 70 &&
    signals.remediationObjectiveIds.length === 0;
  return freeze({
    moduleId: pack.moduleId,
    status: mastered ? "DOMINIO_DIGITAL" : "EM_REMEDIACAO",
    nextAction: mastered ? "REVISAR_RETENCAO" : "EXECUTAR_REMEDIACAO",
    objectiveResults: signals.objectiveResults,
    remediationObjectiveIds: freeze([...signals.remediationObjectiveIds]),
    criticalErrorItemIds: signals.criticalErrorItemIds,
    invalidAnswerItemIds: signals.invalidAnswerItemIds,
    unansweredChoiceItemIds: signals.unansweredChoiceItemIds,
    openResponseItemIds: signals.openResponseItemIds,
    retentionReviews: mastered
      ? buildRetentionReviews(completedAt)
      : freeze([]),
    practicalCompetenceClaim: "PROIBIDO_MVP",
    scorePercent,
  });
}

export function evaluateModuleAttempt(
  input: ModuleAttemptInput,
): ModuleEvaluationResult {
  const pack = getModuleDraftPack(input.moduleId);
  const completedAt = parseCompletedAt(input.completedAt);
  assertUniqueAnswers(input.answers);
  const answerByItem = moduleAttemptEvaluationMethods.validateAnswers(
    pack,
    input.answers,
  );
  const itemGroups = moduleAttemptEvaluationMethods.classifyItems(pack);
  const signals = buildAttemptSignals(pack, input, itemGroups, answerByItem);
  return buildModuleEvaluationResult(pack, completedAt, signals);
}

export function buildPersonalizedCurriculumPath(
  input: PersonalizedPathInput,
): readonly PersonalizedPathItem[] {
  const mastered = new Set(input.masteredModuleIds);
  const remediation = new Set(input.remediationModuleIds);
  const retentionDue = new Set(input.retentionDueModuleIds);
  return freeze(
    curriculumV3.modules.map((module, index) => {
      const previousModule = curriculumV3.modules[index - 1];
      if (previousModule !== undefined && !mastered.has(previousModule.id)) {
        return freeze({
          moduleId: module.id,
          month: module.month,
          status: "BLOQUEADO_PRE_REQUISITO" as const,
          nextAction: "CONCLUIR_PRE_REQUISITO" as const,
        });
      }
      if (remediation.has(module.id)) {
        return freeze({
          moduleId: module.id,
          month: module.month,
          status: "EM_REMEDIACAO" as const,
          nextAction: "EXECUTAR_REMEDIACAO" as const,
        });
      }
      if (retentionDue.has(module.id)) {
        return freeze({
          moduleId: module.id,
          month: module.month,
          status: "RETENCAO_PENDENTE" as const,
          nextAction: "EXECUTAR_RETENCAO" as const,
        });
      }
      if (mastered.has(module.id)) {
        return freeze({
          moduleId: module.id,
          month: module.month,
          status: "CONCLUIDO" as const,
          nextAction: "REVISAR_PROXIMO_MODULO" as const,
        });
      }
      return freeze({
        moduleId: module.id,
        month: module.month,
        status: "DISPONIVEL" as const,
        nextAction: "INICIAR_BASELINE" as const,
      });
    }),
  );
}
