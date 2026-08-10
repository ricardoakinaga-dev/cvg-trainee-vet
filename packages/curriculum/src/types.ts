export type CurriculumPart = "PARTE_1" | "PARTE_2";

export type TrainingAudience =
  "VETERINARIO" | "ENFERMAGEM_TECNICO" | "MULTIPROFISSIONAL";

export type TrainingAssessmentMode =
  | "RECUPERACAO_ATIVA"
  | "RACIOCINIO_CASO"
  | "SIMULACAO_DIGITAL"
  | "DEBRIEFING"
  | "RETENCAO_ESPACADA";

export type HospitalTeamBehavior =
  | "COMUNICACAO_FECHADA"
  | "HANDOFF"
  | "MONITORAMENTO_DA_SITUACAO"
  | "APOIO_MUTUO"
  | "LIDERANCA";

export type TransferMetric = Readonly<{
  readonly id: string;
  readonly label: string;
  readonly cadenceDays: readonly [30, 90];
  readonly collectionMode: "PILOTO_MANUAL" | "FUTURA_INTEGRACAO";
}>;

export type MasteryRule = Readonly<{
  readonly knowledgeMinimumPercent: 70;
  readonly criticalObjectiveMinimumPercent: 80;
  readonly criticalDigitalBehaviorGate: true;
  readonly practicalCompetenceClaim: "PROIBIDO_MVP";
}>;

export type HospitalTrainingDesign = Readonly<{
  readonly audiences: readonly TrainingAudience[];
  readonly hospitalBehaviors: readonly string[];
  readonly teamBehaviors: readonly HospitalTeamBehavior[];
  readonly assessmentModes: readonly TrainingAssessmentMode[];
  readonly spacedReviewDays: readonly [7, 30, 90];
  readonly transferMetric: TransferMetric;
  readonly masteryRule: MasteryRule;
}>;

export type HospitalTrainingBlueprint = Readonly<{
  readonly id: string;
  readonly version: string;
  readonly sequence: readonly [
    "BASELINE",
    "MICROLEARNING",
    "CASO_PROGRESSIVO",
    "SIMULACAO_DIGITAL",
    "DEBRIEFING",
    "RETENCAO_ESPACADA",
    "TRANSFERENCIA_PILOTO",
  ];
  readonly defaultSpacedReviewDays: readonly [7, 30, 90];
  readonly digitalBoundary: "CONHECIMENTO_RACIOCINIO_COMUNICACAO_SIMULADA";
  readonly practicalBoundary: "NAO_COMPROVA_COMPETENCIA_PRATICA";
}>;

export type ModuleAssessmentBlueprint = Readonly<{
  readonly id: string;
  readonly moduleId: string;
  readonly questionCountsBySession: readonly [number, number, number, number];
  readonly questionTotal: number;
  readonly openResponseCount: number;
  readonly objectiveIds: readonly string[];
  readonly assessmentModes: readonly TrainingAssessmentMode[];
  readonly publicProjectionReady: boolean;
  readonly publicationAuthorized: false;
}>;

export type SourceCode =
  | "F-01"
  | "F-02"
  | "F-03"
  | "AAHA-2024"
  | "RECOVER-2024"
  | "WSAVA-2022"
  | "AVHTM-TRACS-2021";

export type InternalSourceRef = Readonly<{
  readonly code: SourceCode;
  readonly locator: string;
  readonly updateRequired: boolean;
}>;

export type CurriculumSession = Readonly<{
  readonly id: string;
  readonly number: 1 | 2 | 3 | 4;
  readonly title: string;
  readonly minutes: number;
  readonly format:
    "ATIVACAO_CASO" | "ESTUDO_GUIADO" | "CASO_PROGRESSIVO" | "DEBRIEF_RETENCAO";
  readonly objectiveIds: readonly string[];
}>;

export type CurriculumModule = Readonly<{
  readonly id: string;
  readonly month: number;
  readonly part: CurriculumPart;
  readonly title: string;
  readonly competence: string;
  readonly objectives: readonly string[];
  readonly sessions: readonly CurriculumSession[];
  readonly caseCount: number;
  readonly minutes: number;
  readonly hospitalTraining: HospitalTrainingDesign;
}>;

export type Curriculum = Readonly<{
  readonly id: string;
  readonly version: string;
  readonly title: string;
  readonly modality: "DIGITAL_ASSINCRONA_CASOS_FICTICIOS";
  readonly species: readonly ["CAES", "GATOS"];
  readonly totalMinutes: number;
  readonly modules: readonly CurriculumModule[];
  readonly hospitalTrainingBlueprintId: string;
}>;

export type Choice = Readonly<{
  readonly id: string;
  readonly label: string;
  readonly text: string;
}>;

export type QuestionKind = "MULTIPLE_CHOICE" | "MULTI_SELECT" | "ORDERING";

export type AssessmentQuestion = Readonly<{
  readonly id: string;
  readonly sessionId: string;
  readonly title: string;
  readonly prompt: string;
  readonly kind: QuestionKind;
  readonly choices: readonly Choice[];
  readonly correctChoiceIds: readonly string[];
  readonly feedback: string;
  readonly critical: boolean;
  readonly sourceRefs: readonly InternalSourceRef[];
}>;

export type RubricDimension = Readonly<{
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly maxPoints: number;
}>;

export type OpenResponse = Readonly<{
  readonly id: string;
  readonly sessionId: string;
  readonly title: string;
  readonly prompt: string;
  readonly rubric: Readonly<{
    readonly dimensions: readonly RubricDimension[];
    readonly passScore: number;
    readonly criticalErrors: readonly string[];
  }>;
  readonly feedback: string;
  readonly sourceRefs: readonly InternalSourceRef[];
}>;

export type Assessment = Readonly<{
  readonly id: string;
  readonly moduleId: string;
  readonly version: string;
  readonly questions: readonly AssessmentQuestion[];
  readonly openResponses: readonly OpenResponse[];
}>;

export type B07BlueprintItem = Readonly<{
  readonly id: string;
  readonly sessionId: "B07-S1" | "B07-S2" | "B07-S3";
  readonly domain: string;
  readonly cognitiveTag:
    | "DECISAO_CLINICA"
    | "CARACTERISTICA_CHAVE"
    | "INTERPRETACAO"
    | "CONHECIMENTO_ESSENCIAL";
  readonly format: "MELHOR_RESPOSTA" | "ASSOCIACAO" | "INTERPRETACAO";
  readonly critical: boolean;
}>;

export type B07Blueprint = Readonly<{
  readonly id: string;
  readonly version: string;
  readonly items: readonly B07BlueprintItem[];
}>;

export type ParticipantActivity = Readonly<{
  readonly activityId: string;
  readonly slug: string;
  readonly title: string;
  readonly items: readonly Readonly<{
    readonly itemId: string;
    readonly ordinal: number;
    readonly kind: "QUESTAO" | "CASO";
    readonly title: string;
    readonly text: string;
    readonly responseMode: "CHOICE" | "TEXT";
    readonly choices?: readonly Choice[];
    readonly selectionMode?: "SINGLE" | "MULTIPLE";
  }>[];
}>;
