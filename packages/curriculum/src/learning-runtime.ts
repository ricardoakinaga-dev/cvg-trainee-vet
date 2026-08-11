import {
  b07Blueprint,
  curriculumV3,
  m02Assessment,
  moduleAssessmentBlueprints,
} from "./catalog.js";
import {
  toParticipantActivityFromDiagnosticDraft,
  toParticipantActivityFromDraft,
} from "./projection.js";
import { validateClinicalSourceRefs } from "./source-registry.js";
import type {
  AssessmentQuestion,
  Choice,
  CurriculumModule,
  InternalSourceRef,
  OpenResponse,
  RubricDimension,
  TrainingAssessmentMode,
} from "./types.js";

export type DraftContentStatus =
  | "RASCUNHO"
  | "AUTOVERIFICADO"
  | "PROJECAO_VERIFICADA"
  | "AUTORIZADO_PARA_PUBLICACAO"
  | "PUBLICADO"
  | "RETIRADO"
  | "VENCIDO";

export type DraftItemKind =
  | "RECUPERACAO_ATIVA"
  | "CASO_PROGRESSIVO"
  | "SIMULACAO_DIGITAL"
  | "DEBRIEFING"
  | "RETENCAO_ESPACADA";

export type DraftResponseMode = "CHOICE" | "TEXT";

export type DiagnosticSessionId = "B07-S1" | "B07-S2" | "B07-S3";

export type DraftRubric = Readonly<{
  readonly dimensions: readonly RubricDimension[];
  readonly passScore: number;
  readonly criticalErrors: readonly string[];
}>;

export type CurriculumDraftItem = Readonly<{
  readonly id: string;
  readonly moduleId: string;
  readonly sessionId: string;
  readonly ordinal: number;
  readonly objectiveId: string;
  readonly kind: DraftItemKind;
  readonly responseMode: DraftResponseMode;
  readonly title: string;
  readonly prompt: string;
  readonly choices?: readonly Choice[];
  readonly correctChoiceIds?: readonly string[];
  readonly rubric?: DraftRubric;
  readonly feedback: string;
  readonly critical: boolean;
  readonly remediationTargetObjectiveId: string;
  readonly sourceRefs: readonly InternalSourceRef[];
}>;

export type RetentionTemplate = Readonly<{
  readonly day: 7 | 30 | 90;
  readonly objectiveIds: readonly string[];
  readonly itemIds: readonly string[];
  readonly equivalentForm: true;
}>;

export type ModuleLearningLoop = Readonly<{
  readonly assessmentModes: readonly TrainingAssessmentMode[];
  readonly baselineItemIds: readonly string[];
  readonly microlearningObjectiveIds: readonly string[];
  readonly caseStages: readonly Readonly<{
    readonly stage: 1 | 2 | 3;
    readonly itemId: string;
    readonly consequence: string;
  }>[];
  readonly simulation: Readonly<{
    readonly itemIds: readonly string[];
    readonly criticalBehaviorIds: readonly string[];
    readonly practicalCompetenceClaim: "PROIBIDO_MVP";
  }>;
  readonly debriefPrompts: readonly string[];
  readonly retention: readonly [
    RetentionTemplate,
    RetentionTemplate,
    RetentionTemplate,
  ];
  readonly transferMetricId: string;
}>;

export type CurriculumDraftPack = Readonly<{
  readonly moduleId: string;
  readonly version: "1.0.0";
  readonly status: DraftContentStatus;
  readonly publicationAuthorized: false;
  readonly sourceVerification: "VERIFICADO_AUTOMATICAMENTE";
  readonly publicProjectionReady: true;
  readonly clinicalReviewRequired: true;
  readonly items: readonly CurriculumDraftItem[];
  readonly learningLoop: ModuleLearningLoop;
}>;

export type DiagnosticDraftItem = Readonly<
  CurriculumDraftItem & {
    readonly blueprintItemId: string;
    readonly diagnosticSessionId: DiagnosticSessionId;
    readonly diagnosticFormat:
      "MELHOR_RESPOSTA" | "ASSOCIACAO" | "INTERPRETACAO";
  }
>;

export type DiagnosticDraftPack = Readonly<{
  readonly diagnosticId: "B07-DIAGNOSTIC-V1";
  readonly blueprintId: "B07-BLUEPRINT-V1";
  readonly version: "0.1.0";
  readonly status: "RASCUNHO";
  readonly publicationAuthorized: false;
  readonly sourceVerification: "VERIFICADO_AUTOMATICAMENTE";
  readonly publicProjectionReady: true;
  readonly clinicalReviewRequired: true;
  readonly items: readonly DiagnosticDraftItem[];
}>;

export type DiagnosticThemeResult = Readonly<{
  readonly themeId: DiagnosticSessionId;
  readonly itemCount: number;
  readonly answeredItemCount: number;
  readonly earnedPoints: number;
  readonly possiblePoints: number;
  readonly percent: number;
  readonly recommendedModuleIds: readonly string[];
}>;

export type CurriculumDiagnosticResult = Readonly<{
  readonly diagnosticId: "B07-DIAGNOSTIC-V1";
  readonly version: "0.1.0";
  readonly notPunitive: true;
  readonly noGlobalPassFail: true;
  readonly totalItemCount: number;
  readonly answeredItemCount: number;
  readonly themeResults: readonly DiagnosticThemeResult[];
  readonly recommendedModuleIds: readonly string[];
  readonly remediationObjectiveIds: readonly string[];
  readonly globalScorePercent?: undefined;
}>;

export type ModuleAnswer = Readonly<{
  readonly itemId: string;
  readonly selectedChoiceIds?: readonly string[];
  readonly text?: string;
}>;

export type ModuleEvaluationMode = "FORMATIVE_CHOICE" | "MODULE_COMPLETION";

export type ObjectiveRuntimeResult = Readonly<{
  readonly objectiveId: string;
  readonly earnedPoints: number;
  readonly possiblePoints: number;
  readonly percent: number;
  readonly critical: boolean;
  readonly requiredPercent: 70 | 80;
}>;

export type RetentionReviewResult = Readonly<{
  readonly day: 7 | 30 | 90;
  readonly dueAt: string;
  readonly status: "PENDENTE";
}>;

export type ModuleEvaluationStatus =
  "PENDENTE" | "DOMINIO_DIGITAL" | "EM_REMEDIACAO" | "AGUARDA_CORRECAO_HUMANA";

export type ModuleNextAction =
  | "INICIAR_BASELINE"
  | "REVISAR_RETENCAO"
  | "EXECUTAR_REMEDIACAO"
  | "AGUARDAR_CORRECAO_HUMANA";

export type ModuleEvaluationResult = Readonly<{
  readonly moduleId: string;
  readonly status: ModuleEvaluationStatus;
  readonly nextAction: ModuleNextAction;
  readonly objectiveResults: readonly ObjectiveRuntimeResult[];
  readonly remediationObjectiveIds: readonly string[];
  readonly criticalErrorItemIds: readonly string[];
  readonly invalidAnswerItemIds: readonly string[];
  readonly unansweredChoiceItemIds: readonly string[];
  readonly openResponseItemIds: readonly string[];
  readonly retentionReviews: readonly RetentionReviewResult[];
  readonly practicalCompetenceClaim: "PROIBIDO_MVP";
  readonly scorePercent?: number;
}>;

export type PersonalizedPathInput = Readonly<{
  readonly masteredModuleIds: readonly string[];
  readonly remediationModuleIds: readonly string[];
  readonly retentionDueModuleIds: readonly string[];
}>;

export type PersonalizedPathItem = Readonly<{
  readonly moduleId: string;
  readonly month: number;
  readonly status:
    | "DISPONIVEL"
    | "BLOQUEADO_PRE_REQUISITO"
    | "EM_REMEDIACAO"
    | "RETENCAO_PENDENTE"
    | "CONCLUIDO";
  readonly nextAction:
    | "INICIAR_BASELINE"
    | "CONCLUIR_PRE_REQUISITO"
    | "EXECUTAR_REMEDIACAO"
    | "EXECUTAR_RETENCAO"
    | "REVISAR_PROXIMO_MODULO";
}>;

export type DraftPreflightModuleResult = Readonly<{
  readonly moduleId: string;
  readonly technicalChecksPassed: boolean;
  readonly questionCount: number;
  readonly openResponseCount: number;
  readonly checks: Readonly<{
    readonly blueprintCount: boolean;
    readonly requiredFields: boolean;
    readonly correctionMetadata: boolean;
    readonly publicBoundary: boolean;
    readonly publicationBlocked: boolean;
  }>;
}>;

export type DraftPreflightDiagnosticResult = Readonly<{
  readonly diagnosticId: "B07-DIAGNOSTIC-V1";
  readonly technicalChecksPassed: boolean;
  readonly itemCount: number;
  readonly itemsBySession: readonly [number, number, number];
  readonly checks: Readonly<{
    readonly blueprintCount: boolean;
    readonly requiredFields: boolean;
    readonly correctionMetadata: boolean;
    readonly publicBoundary: boolean;
    readonly publicationBlocked: boolean;
  }>;
}>;

export type DraftPreflightReport = Readonly<{
  readonly version: "1.0.0";
  readonly modules: readonly DraftPreflightModuleResult[];
  readonly diagnostic: DraftPreflightDiagnosticResult;
  readonly allTechnicalChecksPassed: boolean;
  readonly clinicalApprovalPending: true;
  readonly readyForPublication: false;
}>;

export class LearningRuntimeError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "LearningRuntimeError";
  }
}

function freeze<T>(value: T): Readonly<T> {
  return Object.freeze(value);
}

export function createInitialModuleEvaluation(
  moduleId: string,
): ModuleEvaluationResult {
  if (!/^M(?:0[1-9]|1[0-9]|2[0-4])$/u.test(moduleId)) {
    throw new LearningRuntimeError("moduleId is invalid");
  }
  return freeze({
    moduleId,
    status: "PENDENTE",
    nextAction: "INICIAR_BASELINE",
    objectiveResults: freeze([]),
    remediationObjectiveIds: freeze([]),
    criticalErrorItemIds: freeze([]),
    invalidAnswerItemIds: freeze([]),
    unansweredChoiceItemIds: freeze([]),
    openResponseItemIds: freeze([]),
    retentionReviews: freeze([]),
    practicalCompetenceClaim: "PROIBIDO_MVP",
  });
}

function unique<T>(values: readonly T[]): readonly T[] {
  return freeze([...new Set(values)]);
}

function sourceForModule(module: CurriculumModule): InternalSourceRef {
  if (module.month >= 13) {
    return freeze({
      code: "BOOK_FOSSUM_4E",
      locator: `capítulos de cirurgia e perioperatório aplicáveis ao ${module.id}`,
      updateRequired: false,
    });
  }
  if (module.month === 9 || module.month === 22) {
    return freeze({
      code: "BOOK_JERICO_CAES_GATOS",
      locator: `seções de medicina interna e prevenção aplicáveis ao ${module.id}`,
      updateRequired: false,
    });
  }
  return freeze({
    code: "BOOK_ETTINGER_9E",
    locator: `capítulos de medicina interna aplicáveis ao ${module.id}`,
    updateRequired: false,
  });
}

function objectiveFor(module: CurriculumModule, ordinal: number): string {
  const objectiveIndex = (ordinal - 1) % module.objectives.length;
  const objective = module.objectives[objectiveIndex];
  if (objective === undefined) {
    throw new LearningRuntimeError(`module ${module.id} has no objectives`);
  }
  return `${module.id}-OBJ-${String(objectiveIndex + 1).padStart(2, "0")}`;
}

function genericChoices(): readonly Choice[] {
  const values: readonly [string, string][] = [
    [
      "a",
      "organizar os dados disponíveis, priorizar o risco e declarar a próxima reavaliação",
    ],
    [
      "b",
      "confirmar a resposta da equipe e definir um gatilho explícito de escalonamento",
    ],
    [
      "c",
      "adiar toda decisão até obter um diagnóstico definitivo, sem suporte inicial",
    ],
    [
      "d",
      "repetir uma intervenção fixa sem meta, limite ou registro de resposta",
    ],
  ];
  return freeze(
    values.map(([id, text]) => freeze({ id, label: id.toUpperCase(), text })),
  );
}

function genericQuestion(
  module: CurriculumModule,
  sessionId: string,
  ordinal: number,
  sourceRefs: readonly InternalSourceRef[],
): CurriculumDraftItem {
  const objectiveId = objectiveFor(module, ordinal);
  const multiSelect = ordinal % 5 === 0;
  const kind: DraftItemKind =
    ordinal % 5 === 0
      ? "SIMULACAO_DIGITAL"
      : ordinal % 3 === 0
        ? "CASO_PROGRESSIVO"
        : "RECUPERACAO_ATIVA";
  const choices = genericChoices();
  return freeze({
    id: `${module.id}-${sessionId}-Q${String(ordinal).padStart(2, "0")}`,
    moduleId: module.id,
    sessionId,
    ordinal,
    objectiveId,
    kind,
    responseMode: "CHOICE",
    title: `${module.id} — decisão segura ${String(ordinal).padStart(2, "0")}`,
    prompt: `Em um caso fictício de ${module.title.toLowerCase()}, qual decisão melhor demonstra o objetivo “${module.objectives[(ordinal - 1) % module.objectives.length]}”?`,
    choices,
    correctChoiceIds: freeze(multiSelect ? ["a", "b"] : ["a"]),
    feedback:
      "A resposta esperada organiza o risco, explicita a meta, registra a decisão e prevê reavaliação; o caso não autoriza competência prática.",
    critical: ordinal % 4 === 0,
    remediationTargetObjectiveId: objectiveId,
    sourceRefs: freeze([...sourceRefs]),
  });
}

function genericOpenResponse(
  module: CurriculumModule,
  sessionId: string,
  ordinal: number,
  sourceRefs: readonly InternalSourceRef[],
): CurriculumDraftItem {
  const objectiveId = objectiveFor(module, ordinal);
  const dimensions: readonly RubricDimension[] = freeze([
    freeze({
      id: "priority",
      label: "prioridade",
      description: "Explicita a ameaça, a prioridade e a informação faltante.",
      maxPoints: 2,
    }),
    freeze({
      id: "reassessment",
      label: "reavaliação",
      description: "Define meta, tendência, prazo e gatilho de escalonamento.",
      maxPoints: 2,
    }),
    freeze({
      id: "communication",
      label: "comunicação",
      description: "Comunica fatos, incerteza, função e próxima ação.",
      maxPoints: 2,
    }),
  ]);
  return freeze({
    id: `${module.id}-${sessionId}-RA${String(ordinal).padStart(2, "0")}`,
    moduleId: module.id,
    sessionId,
    ordinal,
    objectiveId,
    kind: "DEBRIEFING",
    responseMode: "TEXT",
    title: `${module.id} — debriefing e plano ${String(ordinal).padStart(2, "0")}`,
    prompt: `Em um caso fictício de ${module.title.toLowerCase()}, descreva um plano digital para o objetivo “${module.objectives[(ordinal - 1) % module.objectives.length]}”, incluindo prioridade, meta, reavaliação, comunicação e gatilho de escalonamento.`,
    rubric: freeze({
      dimensions,
      passScore: 5,
      criticalErrors: freeze([
        "omitir a ameaça prioritária",
        "propor intervenção sem meta ou reavaliação",
        "apresentar hipótese como certeza ou competência prática",
      ]),
    }),
    feedback:
      "A correção humana deve procurar prioridade, meta, reavaliação, comunicação e escalonamento — não estilo ou citação bibliográfica.",
    critical: true,
    remediationTargetObjectiveId: objectiveId,
    sourceRefs: freeze([...sourceRefs]),
  });
}

const diagnosticThemeRecommendations: Readonly<
  Record<DiagnosticSessionId, readonly string[]>
> = freeze({
  "B07-S1": freeze(["M01", "M11", "M12"]),
  "B07-S2": freeze(["M02", "M04", "M10"]),
  "B07-S3": freeze(["M11", "M12"]),
});

function diagnosticSourceRefs(): readonly InternalSourceRef[] {
  return freeze([
    freeze({
      code: "BOOK_JERICO_CAES_GATOS",
      locator: "seções de medicina interna de cães e gatos aplicáveis ao B-07",
      updateRequired: false,
    }),
    freeze({
      code: "BOOK_ETTINGER_9E",
      locator: "capítulos de raciocínio e medicina interna aplicáveis ao B-07",
      updateRequired: false,
    }),
    freeze({
      code: "BOOK_FOSSUM_4E",
      locator: "capítulos de segurança e perioperatório aplicáveis ao B-07",
      updateRequired: false,
    }),
  ]);
}

function createDiagnosticItem(
  blueprintItem: {
    readonly id: string;
    readonly sessionId: DiagnosticSessionId;
    readonly domain: string;
    readonly cognitiveTag: string;
    readonly format: "MELHOR_RESPOSTA" | "ASSOCIACAO" | "INTERPRETACAO";
    readonly critical: boolean;
  },
  ordinal: number,
): DiagnosticDraftItem {
  const objectiveId = `M01-OBJ-${String(((ordinal - 1) % 3) + 1).padStart(2, "0")}`;
  const correctChoiceIds =
    blueprintItem.format === "ASSOCIACAO" ? ["a", "b"] : ["a"];
  const kind: DraftItemKind =
    blueprintItem.format === "INTERPRETACAO"
      ? "SIMULACAO_DIGITAL"
      : blueprintItem.format === "ASSOCIACAO"
        ? "CASO_PROGRESSIVO"
        : "RECUPERACAO_ATIVA";
  return freeze({
    id: blueprintItem.id,
    blueprintItemId: blueprintItem.id,
    moduleId: "M01",
    sessionId: blueprintItem.sessionId,
    diagnosticSessionId: blueprintItem.sessionId,
    ordinal,
    objectiveId,
    kind,
    diagnosticFormat: blueprintItem.format,
    responseMode: "CHOICE",
    title: `B-07 — ${blueprintItem.domain} ${String(ordinal).padStart(3, "0")}`,
    prompt: `Em um caso fictício do domínio “${blueprintItem.domain}”, qual resposta melhor demonstra ${blueprintItem.cognitiveTag.toLowerCase()} e mantém a próxima reavaliação explícita?`,
    choices: genericChoices(),
    correctChoiceIds: freeze(correctChoiceIds),
    feedback:
      "A resposta deve organizar dados, risco, comunicação e reavaliação. O diagnóstico é formativo e não autoriza competência prática.",
    critical: blueprintItem.critical,
    remediationTargetObjectiveId: objectiveId,
    sourceRefs: diagnosticSourceRefs(),
  });
}

export const b07DiagnosticDraftPack: DiagnosticDraftPack = freeze({
  diagnosticId: "B07-DIAGNOSTIC-V1",
  blueprintId: "B07-BLUEPRINT-V1",
  version: "0.1.0",
  status: "RASCUNHO",
  publicationAuthorized: false,
  sourceVerification: "VERIFICADO_AUTOMATICAMENTE",
  publicProjectionReady: true,
  clinicalReviewRequired: true,
  items: freeze(
    b07Blueprint.items.map((item, index) =>
      createDiagnosticItem(item, index + 1),
    ),
  ),
});

function fromAuthoredQuestion(
  module: CurriculumModule,
  question: AssessmentQuestion,
  ordinal: number,
): CurriculumDraftItem {
  const objectiveId = objectiveFor(module, ordinal);
  const kind: DraftItemKind =
    question.kind === "MULTI_SELECT"
      ? "CASO_PROGRESSIVO"
      : question.sessionId.endsWith("S3")
        ? "SIMULACAO_DIGITAL"
        : "RECUPERACAO_ATIVA";
  return freeze({
    id: question.id,
    moduleId: module.id,
    sessionId: question.sessionId,
    ordinal,
    objectiveId,
    kind,
    responseMode: "CHOICE",
    title: question.title,
    prompt: question.prompt,
    choices: question.choices,
    correctChoiceIds: question.correctChoiceIds,
    feedback: question.feedback,
    critical: question.critical,
    remediationTargetObjectiveId: objectiveId,
    sourceRefs: question.sourceRefs,
  });
}

function fromAuthoredOpenResponse(
  module: CurriculumModule,
  response: OpenResponse,
  ordinal: number,
): CurriculumDraftItem {
  const objectiveId = objectiveFor(module, ordinal);
  return freeze({
    id: response.id,
    moduleId: module.id,
    sessionId: response.sessionId,
    ordinal,
    objectiveId,
    kind: "DEBRIEFING",
    responseMode: "TEXT",
    title: response.title,
    prompt: response.prompt,
    rubric: response.rubric,
    feedback: response.feedback,
    critical: true,
    remediationTargetObjectiveId: objectiveId,
    sourceRefs: response.sourceRefs,
  });
}

function createItems(module: CurriculumModule): readonly CurriculumDraftItem[] {
  const sourceRefs = freeze([sourceForModule(module)]);
  if (module.id === "M02") {
    const questions = m02Assessment.questions.map((item, index) =>
      fromAuthoredQuestion(module, item, index + 1),
    );
    const openResponses = m02Assessment.openResponses.map((item, index) =>
      fromAuthoredOpenResponse(module, item, questions.length + index + 1),
    );
    return freeze([...questions, ...openResponses]);
  }

  const blueprint = moduleAssessmentBlueprints.find(
    (item) => item.moduleId === module.id,
  );
  if (blueprint === undefined) {
    throw new LearningRuntimeError(
      `assessment blueprint missing for ${module.id}`,
    );
  }
  const questions = module.sessions.flatMap((session, sessionIndex) => {
    const count = blueprint.questionCountsBySession[sessionIndex] ?? 0;
    return Array.from({ length: count }, (_, index) =>
      genericQuestion(module, session.id, index + 1, sourceRefs),
    );
  });
  const openResponses = Array.from(
    { length: blueprint.openResponseCount },
    (_, index) =>
      genericOpenResponse(
        module,
        module.sessions[3]?.id ?? `${module.id}-S4`,
        index + 1,
        sourceRefs,
      ),
  );
  return freeze([
    ...questions.map((item, index) => freeze({ ...item, ordinal: index + 1 })),
    ...openResponses.map((item, index) =>
      freeze({ ...item, ordinal: questions.length + index + 1 }),
    ),
  ]);
}

function createLearningLoop(
  module: CurriculumModule,
  items: readonly CurriculumDraftItem[],
): ModuleLearningLoop {
  const choiceItems = items.filter((item) => item.responseMode === "CHOICE");
  const simulationItems = items.filter(
    (item) => item.kind === "SIMULACAO_DIGITAL",
  );
  const caseItems = items.filter((item) => item.kind === "CASO_PROGRESSIVO");
  const firstObjectiveIds = module.objectives.map(
    (_, index) => `${module.id}-OBJ-${String(index + 1).padStart(2, "0")}`,
  );
  const caseStages = freeze(
    ([1, 2, 3] as const).map((stage, index) => {
      const item = caseItems[index] ?? choiceItems[index];
      if (item === undefined) {
        throw new LearningRuntimeError(
          `case stage ${stage} missing for ${module.id}`,
        );
      }
      return freeze({
        stage,
        itemId: item.id,
        consequence:
          "A consequência é simulada e orienta a próxima informação, sem autorizar conduta prática.",
      });
    }),
  );
  const retention = freeze(
    ([7, 30, 90] as const).map((day, index) =>
      freeze({
        day,
        objectiveIds: freeze([
          firstObjectiveIds[index % firstObjectiveIds.length] ??
            firstObjectiveIds[0]!,
        ]),
        itemIds: freeze([
          choiceItems[index % choiceItems.length]?.id ?? choiceItems[0]!.id,
        ]),
        equivalentForm: true as const,
      }),
    ),
  ) as readonly [RetentionTemplate, RetentionTemplate, RetentionTemplate];
  return freeze({
    assessmentModes: module.hospitalTraining.assessmentModes,
    baselineItemIds: freeze(choiceItems.slice(0, 3).map((item) => item.id)),
    microlearningObjectiveIds: freeze([...firstObjectiveIds]),
    caseStages,
    simulation: freeze({
      itemIds: freeze(simulationItems.map((item) => item.id)),
      criticalBehaviorIds: freeze([
        ...module.hospitalTraining.hospitalBehaviors,
      ]),
      practicalCompetenceClaim: "PROIBIDO_MVP",
    }),
    debriefPrompts: freeze([
      "O que você observou e qual dado mudou a prioridade?",
      "Qual meta e qual gatilho de reavaliação você declararia?",
      "Como a equipe comunicaria a próxima ação sem prometer competência prática?",
    ]),
    retention,
    transferMetricId: module.hospitalTraining.transferMetric.id,
  });
}

function createDraftPack(module: CurriculumModule): CurriculumDraftPack {
  const items = createItems(module);
  return freeze({
    moduleId: module.id,
    version: "1.0.0",
    status: "RASCUNHO",
    publicationAuthorized: false,
    sourceVerification: "VERIFICADO_AUTOMATICAMENTE",
    publicProjectionReady: true,
    clinicalReviewRequired: true,
    items,
    learningLoop: createLearningLoop(module, items),
  });
}

export const curriculumDraftPacks: readonly CurriculumDraftPack[] = freeze(
  curriculumV3.modules.map(createDraftPack),
);

export function getModuleDraftPack(moduleId: string): CurriculumDraftPack {
  const pack = curriculumDraftPacks.find((item) => item.moduleId === moduleId);
  if (pack === undefined) {
    throw new LearningRuntimeError("curriculum module draft was not found");
  }
  return pack;
}

export function evaluateDiagnosticAttempt(
  input: Readonly<{ readonly answers: readonly ModuleAnswer[] }>,
): CurriculumDiagnosticResult {
  assertUniqueAnswers(input.answers);
  const itemById = new Map(
    b07DiagnosticDraftPack.items.map((item) => [item.id, item]),
  );
  for (const answer of input.answers) {
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

  const answerByItem = new Map(
    input.answers.map((answer) => [answer.itemId, answer]),
  );
  const themeResults = (["B07-S1", "B07-S2", "B07-S3"] as const).map(
    (themeId) => {
      const themeItems = b07DiagnosticDraftPack.items.filter(
        (item) => item.diagnosticSessionId === themeId,
      );
      const answeredItems = themeItems.filter((item) =>
        answerByItem.has(item.id),
      );
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
    },
  );
  const remediationObjectiveIds = unique(
    themeResults.flatMap((theme) =>
      theme.percent < 70 || theme.answeredItemCount < theme.itemCount
        ? b07DiagnosticDraftPack.items
            .filter((item) => item.diagnosticSessionId === theme.themeId)
            .map((item) => item.objectiveId)
        : [],
    ),
  );
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

export function evaluateModuleAttempt(
  input: Readonly<{
    readonly moduleId: string;
    readonly answers: readonly ModuleAnswer[];
    readonly completedAt: string;
    readonly mode?: ModuleEvaluationMode;
  }>,
): ModuleEvaluationResult {
  const pack = getModuleDraftPack(input.moduleId);
  const completedAt = parseCompletedAt(input.completedAt);
  assertUniqueAnswers(input.answers);
  const answerByItem = new Map(
    input.answers.map((answer) => [answer.itemId, answer]),
  );
  const packItemIds = new Set(pack.items.map((item) => item.id));
  const invalidAnswerItemIds = input.answers
    .filter((answer) => !packItemIds.has(answer.itemId))
    .map((answer) => answer.itemId);
  if (invalidAnswerItemIds.length > 0) {
    throw new LearningRuntimeError(
      "answer contains an unknown curriculum item",
    );
  }

  const choiceItems = pack.items.filter(
    (item) => item.responseMode === "CHOICE",
  );
  const openResponseItems = pack.items.filter(
    (item) => item.responseMode === "TEXT",
  );
  for (const answer of input.answers) {
    if (answer.text !== undefined) assertPlainTextResponse(answer.text);
    const item = pack.items.find((candidate) => candidate.id === answer.itemId);
    if (
      item?.responseMode !== "CHOICE" ||
      answer.selectedChoiceIds === undefined
    )
      continue;
    const allowedChoiceIds = new Set(
      (item.choices ?? []).map((choice) => choice.id),
    );
    if (answer.selectedChoiceIds.some((id) => !allowedChoiceIds.has(id))) {
      throw new LearningRuntimeError("answer contains an unknown choice");
    }
  }
  const unansweredChoiceItemIds = choiceItems
    .filter(
      (item) => answerByItem.get(item.id)?.selectedChoiceIds === undefined,
    )
    .map((item) => item.id);
  const openResponseItemIds =
    input.mode === "FORMATIVE_CHOICE"
      ? []
      : openResponseItems.map((item) => item.id);
  const criticalErrorItemIds = choiceItems
    .filter((item) => {
      const selected = answerByItem.get(item.id)?.selectedChoiceIds;
      return (
        item.critical &&
        selected !== undefined &&
        !sameChoiceSet(selected, item.correctChoiceIds ?? [])
      );
    })
    .map((item) => item.id);

  const objectiveResultsUnsorted = pack.items.reduce<
    readonly ObjectiveRuntimeResult[]
  >((results, item) => {
    const existing = results.find(
      (result) => result.objectiveId === item.objectiveId,
    );
    const itemIsChoice = item.responseMode === "CHOICE";
    const itemAnswer = answerByItem.get(item.id)?.selectedChoiceIds;
    const earned =
      itemIsChoice &&
      itemAnswer !== undefined &&
      sameChoiceSet(itemAnswer, item.correctChoiceIds ?? [])
        ? 1
        : 0;
    if (existing === undefined) {
      return [
        ...results,
        freeze({
          objectiveId: item.objectiveId,
          earnedPoints: earned,
          possiblePoints: itemIsChoice ? 1 : 0,
          percent: itemIsChoice ? earned * 100 : 0,
          critical: item.critical,
          requiredPercent: item.critical ? 80 : 70,
        }),
      ];
    }
    const possiblePoints = existing.possiblePoints + (itemIsChoice ? 1 : 0);
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
  }, []);
  const objectiveResults = freeze(
    [...objectiveResultsUnsorted].sort((left, right) =>
      left.objectiveId.localeCompare(right.objectiveId),
    ),
  );

  const remediationObjectiveIds = unique<string>(
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
  const scorePossible = objectiveResults.reduce(
    (total, result) => total + result.possiblePoints,
    0,
  );
  const scoreEarned = objectiveResults.reduce(
    (total, result) => total + result.earnedPoints,
    0,
  );
  const hasHumanReview = openResponseItemIds.length > 0;
  if (hasHumanReview) {
    return freeze({
      moduleId: pack.moduleId,
      status: "AGUARDA_CORRECAO_HUMANA",
      nextAction: "AGUARDAR_CORRECAO_HUMANA",
      objectiveResults,
      remediationObjectiveIds,
      criticalErrorItemIds,
      invalidAnswerItemIds: freeze(invalidAnswerItemIds),
      unansweredChoiceItemIds: freeze(unansweredChoiceItemIds),
      openResponseItemIds: freeze(openResponseItemIds),
      retentionReviews: freeze([]),
      practicalCompetenceClaim: "PROIBIDO_MVP",
    });
  }

  const scorePercent =
    scorePossible === 0 ? 0 : Math.round((scoreEarned / scorePossible) * 100);
  const mastered =
    unansweredChoiceItemIds.length === 0 &&
    scorePercent >= 70 &&
    remediationObjectiveIds.length === 0;
  const retentionReviews = mastered
    ? freeze(
        ([7, 30, 90] as const).map((day) =>
          freeze({
            day,
            dueAt: datePlusDays(completedAt, day),
            status: "PENDENTE" as const,
          }),
        ),
      )
    : freeze([]);
  return freeze({
    moduleId: pack.moduleId,
    status: mastered ? "DOMINIO_DIGITAL" : "EM_REMEDIACAO",
    nextAction: mastered ? "REVISAR_RETENCAO" : "EXECUTAR_REMEDIACAO",
    objectiveResults,
    remediationObjectiveIds: freeze([...remediationObjectiveIds]),
    criticalErrorItemIds: freeze(criticalErrorItemIds),
    invalidAnswerItemIds: freeze(invalidAnswerItemIds),
    unansweredChoiceItemIds: freeze(unansweredChoiceItemIds),
    openResponseItemIds: freeze(openResponseItemIds),
    retentionReviews,
    practicalCompetenceClaim: "PROIBIDO_MVP",
    scorePercent,
  });
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
      if (previousModule !== undefined && !mastered.has(previousModule.id)) {
        return freeze({
          moduleId: module.id,
          month: module.month,
          status: "BLOQUEADO_PRE_REQUISITO" as const,
          nextAction: "CONCLUIR_PRE_REQUISITO" as const,
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

export const curriculumDraftCounts = freeze(
  curriculumDraftPacks.map((pack) => ({
    moduleId: pack.moduleId,
    itemCount: pack.items.length,
    questionCount: pack.items.filter((item) => item.responseMode === "CHOICE")
      .length,
    openResponseCount: pack.items.filter((item) => item.responseMode === "TEXT")
      .length,
    b07BlueprintItemCount:
      pack.moduleId === "M01" ? b07Blueprint.items.length : 0,
  })),
);

function publicBoundaryIsClean(pack: CurriculumDraftPack): boolean {
  const projection = toParticipantActivityFromDraft(pack);
  const serialized = JSON.stringify(projection);
  return (
    !/source|chapter|page|answer|rubric|critical|pdf/iu.test(serialized) &&
    projection.items.every((item) =>
      item.responseMode === "TEXT"
        ? item.choices === undefined && item.selectionMode === undefined
        : item.choices !== undefined && item.selectionMode !== undefined,
    )
  );
}

function publicDiagnosticBoundaryIsClean(pack: DiagnosticDraftPack): boolean {
  const projection = toParticipantActivityFromDiagnosticDraft(pack);
  const serialized = JSON.stringify(projection);
  return (
    !/source|chapter|page|answer|rubric|critical|blueprint|pdf/iu.test(
      serialized,
    ) &&
    projection.items.length === 120 &&
    projection.items.every(
      (item) =>
        item.responseMode === "CHOICE" &&
        item.choices !== undefined &&
        item.selectionMode !== undefined,
    )
  );
}

export function preflightCurriculumDrafts(
  packs: readonly CurriculumDraftPack[] = curriculumDraftPacks,
): DraftPreflightReport {
  const modules = packs.map((pack) => {
    const blueprint = moduleAssessmentBlueprints.find(
      (item) => item.moduleId === pack.moduleId,
    );
    const questionCount = pack.items.filter(
      (item) => item.responseMode === "CHOICE",
    ).length;
    const openResponseCount = pack.items.filter(
      (item) => item.responseMode === "TEXT",
    ).length;
    const blueprintCount =
      blueprint !== undefined &&
      blueprint.questionTotal === questionCount &&
      blueprint.openResponseCount === openResponseCount;
    const requiredFields = pack.items.every(
      (item) =>
        item.moduleId === pack.moduleId &&
        item.sessionId.length > 0 &&
        item.objectiveId.length > 0 &&
        item.prompt.trim().length > 0 &&
        item.feedback.trim().length > 0 &&
        !/<[^>]*>/u.test(item.prompt) &&
        !/<[^>]*>/u.test(item.feedback) &&
        validateClinicalSourceRefs(item.sourceRefs).valid &&
        item.remediationTargetObjectiveId.length > 0,
    );
    const correctionMetadata = pack.items.every((item) =>
      item.responseMode === "CHOICE"
        ? item.choices !== undefined &&
          item.choices.length >= 2 &&
          item.correctChoiceIds !== undefined &&
          item.correctChoiceIds.length > 0 &&
          item.correctChoiceIds.every((id) =>
            item.choices?.some((choice) => choice.id === id),
          )
        : item.rubric !== undefined && item.rubric.passScore > 0,
    );
    const publicationBlocked =
      !pack.publicationAuthorized ||
      !pack.publicProjectionReady ||
      pack.sourceVerification !== "VERIFICADO_AUTOMATICAMENTE";
    const checks = freeze({
      blueprintCount,
      requiredFields,
      correctionMetadata,
      publicBoundary: publicBoundaryIsClean(pack),
      publicationBlocked,
    });
    return freeze({
      moduleId: pack.moduleId,
      technicalChecksPassed:
        checks.blueprintCount &&
        checks.requiredFields &&
        checks.correctionMetadata &&
        checks.publicBoundary,
      questionCount,
      openResponseCount,
      checks,
    });
  });
  const diagnosticItems = b07DiagnosticDraftPack.items;
  const diagnosticItemsBySession = ["B07-S1", "B07-S2", "B07-S3"].map(
    (sessionId) =>
      diagnosticItems.filter((item) => item.diagnosticSessionId === sessionId)
        .length,
  ) as [number, number, number];
  const diagnosticChecks = freeze({
    blueprintCount:
      diagnosticItems.length === b07Blueprint.items.length &&
      diagnosticItems.every(
        (item, index) => item.id === b07Blueprint.items[index]?.id,
      ),
    requiredFields: diagnosticItems.every(
      (item) =>
        item.moduleId === "M01" &&
        item.sessionId.length > 0 &&
        item.objectiveId.length > 0 &&
        item.prompt.trim().length > 0 &&
        item.feedback.trim().length > 0 &&
        !/<[^>]*>/u.test(item.prompt) &&
        !/<[^>]*>/u.test(item.feedback) &&
        validateClinicalSourceRefs(item.sourceRefs).valid &&
        item.remediationTargetObjectiveId.length > 0,
    ),
    correctionMetadata: diagnosticItems.every(
      (item) =>
        item.choices !== undefined &&
        item.choices.length >= 2 &&
        item.correctChoiceIds !== undefined &&
        item.correctChoiceIds.length > 0 &&
        item.correctChoiceIds.every((id) =>
          item.choices?.some((choice) => choice.id === id),
        ),
    ),
    publicBoundary: publicDiagnosticBoundaryIsClean(b07DiagnosticDraftPack),
    publicationBlocked:
      !b07DiagnosticDraftPack.publicationAuthorized ||
      !b07DiagnosticDraftPack.publicProjectionReady ||
      b07DiagnosticDraftPack.sourceVerification !==
        "VERIFICADO_AUTOMATICAMENTE",
  });
  const diagnostic = freeze({
    diagnosticId: b07DiagnosticDraftPack.diagnosticId,
    technicalChecksPassed:
      diagnosticChecks.blueprintCount &&
      diagnosticChecks.requiredFields &&
      diagnosticChecks.correctionMetadata &&
      diagnosticChecks.publicBoundary,
    itemCount: diagnosticItems.length,
    itemsBySession: diagnosticItemsBySession,
    checks: diagnosticChecks,
  });
  return freeze({
    version: "1.0.0",
    modules: freeze(modules),
    diagnostic,
    allTechnicalChecksPassed:
      modules.every((module) => module.technicalChecksPassed) &&
      diagnostic.technicalChecksPassed,
    clinicalApprovalPending: true,
    readyForPublication: false,
  });
}
