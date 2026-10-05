import type {
  Choice,
  InternalSourceRef,
  RubricDimension,
  TrainingAssessmentMode,
} from "./types.js";

export type DraftContentStatus =
  | "RASCUNHO"
  | "AUTOVERIFICADO"
  | "EM_REVISAO_CLINICA"
  | "AJUSTES_SOLICITADOS"
  | "APROVADO_CLINICAMENTE"
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
  readonly day: 30 | 60 | 90;
  readonly objectiveIds: readonly string[];
  readonly itemIds: readonly string[];
  readonly equivalentForm: boolean;
  readonly status: "RASCUNHO" | "VERIFICADA";
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
  readonly clinicalReview: "PENDENTE";
  readonly publicProjectionReady: boolean;
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
  readonly clinicalReview: "PENDENTE";
  readonly publicProjectionReady: false;
  readonly clinicalReviewRequired: true;
  readonly items: readonly DiagnosticDraftItem[];
}>;
