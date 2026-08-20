import {
  b07Blueprint,
  curriculumV3,
  m02Assessment,
  moduleAssessmentBlueprints,
} from "./catalog.js";
import {
  createDigitalCaseDefinition,
  projectPublicDigitalCaseStage,
  type InternalAssessmentInteraction,
} from "./learning-interactions.js";
import type {
  AssessmentQuestion,
  Choice,
  CurriculumModule,
  InternalSourceRef,
  OpenResponse,
  RubricDimension,
} from "./types.js";
import {
  freeze,
  LearningRuntimeError,
  type CurriculumDraftItem,
  type CurriculumDraftPack,
  type DiagnosticDraftItem,
  type DiagnosticDraftPack,
  type DiagnosticSessionId,
  type DraftItemKind,
  type ModuleLearningLoop,
  type RetentionTemplate,
} from "./learning-runtime-types.js";

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

function genericStructuredFieldsItem(
  module: CurriculumModule,
  sessionId: string,
  ordinal: number,
  sourceRefs: readonly InternalSourceRef[],
): CurriculumDraftItem {
  const objectiveId = objectiveFor(module, ordinal);
  const interaction: InternalAssessmentInteraction = freeze({
    kind: "STRUCTURED_FIELDS",
    fields: freeze([
      freeze({
        id: "priority",
        label: "Prioridade simulada",
        valueType: "TEXT" as const,
        required: true as const,
      }),
      freeze({
        id: "reassessmentMinutes",
        label: "Intervalo de reavaliação",
        valueType: "NUMBER" as const,
        unit: "min",
        required: true as const,
        min: 1,
        max: 240,
      }),
    ]),
    rubric: {
      criteria: freeze([
        freeze({
          fieldId: "priority",
          expectedValue: "IMEDIATA" as const,
          points: 1,
        }),
        freeze({
          fieldId: "reassessmentMinutes",
          expectedValue: 15,
          tolerance: 1,
          points: 1,
        }),
      ]),
      passScore: 2,
    },
  });
  return freeze({
    id: `${module.id}-${sessionId}-SF${String(ordinal).padStart(2, "0")}`,
    moduleId: module.id,
    sessionId,
    ordinal,
    objectiveId,
    kind: "CASO_PROGRESSIVO",
    responseMode: "STRUCTURED_FIELDS",
    title: `${module.id} — campos estruturados de decisão`,
    prompt:
      "No caso fictício, registre a prioridade e o intervalo de reavaliação. Os campos são avaliados automaticamente no exercício.",
    interaction,
    feedback:
      "A atividade compara os campos estruturados com a avaliação automática versionada; não representa competência prática.",
    critical: true,
    remediationTargetObjectiveId: objectiveId,
    sourceRefs: freeze([...sourceRefs]),
  });
}

function genericDoseInfusionItem(
  module: CurriculumModule,
  sessionId: string,
  ordinal: number,
  sourceRefs: readonly InternalSourceRef[],
): CurriculumDraftItem {
  const objectiveId = objectiveFor(module, ordinal);
  const interaction: InternalAssessmentInteraction = freeze({
    kind: "DOSE_INFUSION",
    fields: freeze([
      freeze({
        id: "doseMg",
        label: "Dose calculada",
        valueType: "NUMBER" as const,
        unit: "mg",
        required: true as const,
        min: 0,
        max: 100_000,
      }),
      freeze({
        id: "volumeMl",
        label: "Volume calculado",
        valueType: "NUMBER" as const,
        unit: "mL",
        required: true as const,
        min: 0,
        max: 100_000,
      }),
      freeze({
        id: "rateMlPerHour",
        label: "Velocidade de infusão",
        valueType: "NUMBER" as const,
        unit: "mL/h",
        required: true as const,
        min: 0,
        max: 100_000,
      }),
    ]),
    calculationInputs: freeze({
      weightKg: 10,
      doseMgPerKg: 2,
      concentrationMgPerMl: 4,
      durationHours: 2,
    }),
    formulaLabel:
      "dose = peso × dose/kg; volume = dose ÷ concentração; taxa = volume ÷ tempo",
    tolerance: 0.01,
  });
  return freeze({
    id: `${module.id}-${sessionId}-DI${String(ordinal).padStart(2, "0")}`,
    moduleId: module.id,
    sessionId,
    ordinal,
    objectiveId,
    kind: "SIMULACAO_DIGITAL",
    responseMode: "DOSE_INFUSION",
    title: `${module.id} — cálculo de dose e infusão`,
    prompt:
      "Resolva o cálculo do cenário fictício preenchendo dose, volume e velocidade de infusão. Os valores são educacionais e não autorizam prescrição.",
    interaction,
    feedback:
      "A rubrica automática verifica a aritmética, as unidades declaradas e a tolerância definida no exercício.",
    critical: false,
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
    humanCorrectionOwner: "RICARDO",
    remediationTargetObjectiveId: objectiveId,
    sourceRefs: freeze([...sourceRefs]),
  });
}

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
    responseMode:
      question.interaction?.kind === "STRUCTURED_FIELDS"
        ? "STRUCTURED_FIELDS"
        : question.interaction?.kind === "DOSE_INFUSION"
          ? "DOSE_INFUSION"
          : "CHOICE",
    title: question.title,
    prompt: question.prompt,
    choices: question.choices,
    correctChoiceIds: question.correctChoiceIds,
    ...(question.interaction === undefined
      ? {}
      : { interaction: question.interaction }),
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
    humanCorrectionOwner: response.humanCorrectionOwner ?? "RICARDO",
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
  const interactionQuestions =
    module.id === "M24"
      ? questions.map((item, index) => {
          if (index === 0) {
            return genericStructuredFieldsItem(
              module,
              item.sessionId,
              item.ordinal,
              sourceRefs,
            );
          }
          if (index === 1) {
            return genericDoseInfusionItem(
              module,
              item.sessionId,
              item.ordinal,
              sourceRefs,
            );
          }
          return item;
        })
      : questions;
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
    ...interactionQuestions.map((item, index) =>
      freeze({ ...item, ordinal: index + 1 }),
    ),
    ...openResponses.map((item, index) =>
      freeze({ ...item, ordinal: interactionQuestions.length + index + 1 }),
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
  const digitalCase = createDigitalCaseDefinition({
    caseId: `${module.id}-DIGITAL-CASE-V1`,
    stageItemIds: [
      caseStages[0]!.itemId,
      caseStages[1]!.itemId,
      caseStages[2]!.itemId,
    ],
  });
  const retentionBlueprintId = `${module.id}-RETENTION-BLUEPRINT-V1`;
  const retention = freeze(
    ([30, 60, 90] as const).map((day, index) =>
      freeze({
        day,
        blueprintId: retentionBlueprintId,
        formId: `${module.id}-RETENTION-FORM-${day}`,
        objectiveIds: freeze([firstObjectiveIds[0]!]),
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
    digitalCase,
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
  const rawItems = createItems(module);
  const learningLoop = createLearningLoop(module, rawItems);
  const stageByItemId = new Map(
    learningLoop.digitalCase.stageItemIds.map((itemId, index) => [
      itemId,
      (index + 1) as 1 | 2 | 3,
    ]),
  );
  const items = freeze(
    rawItems.map((item) => {
      const stage = stageByItemId.get(item.id);
      return stage === undefined
        ? item
        : freeze({
            ...item,
            digitalCaseStage: projectPublicDigitalCaseStage(
              learningLoop.digitalCase,
              stage,
            ),
          });
    }),
  );
  return freeze({
    moduleId: module.id,
    version: "1.0.0",
    status: "RASCUNHO",
    publicationAuthorized: false,
    sourceVerification: "VERIFICADO_AUTOMATICAMENTE",
    publicProjectionReady: true,
    clinicalReviewRequired: true,
    items,
    learningLoop,
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
