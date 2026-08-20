import type {
  Choice,
  InternalSourceRef,
  RubricDimension,
  TrainingAssessmentMode,
} from "./types.js";
import type {
  DigitalCaseDefinition,
  InternalAssessmentInteraction,
  PublicDigitalCaseStage,
  StructuredFieldValues,
} from "./learning-interactions.js";

export function freeze<T>(value: T): Readonly<T> {
  return Object.freeze(value);
}

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

export type DraftResponseMode =
  "CHOICE" | "TEXT" | "STRUCTURED_FIELDS" | "DOSE_INFUSION";

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
  readonly interaction?: InternalAssessmentInteraction;
  readonly humanCorrectionOwner?: "RICARDO";
  readonly digitalCaseStage?: PublicDigitalCaseStage;
  readonly feedback: string;
  readonly critical: boolean;
  readonly remediationTargetObjectiveId: string;
  readonly sourceRefs: readonly InternalSourceRef[];
}>;

export type RetentionTemplate = Readonly<{
  readonly day: 30 | 60 | 90;
  readonly blueprintId: string;
  readonly formId: string;
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
  readonly digitalCase: DigitalCaseDefinition;
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
  readonly structuredValues?: StructuredFieldValues;
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
  readonly day: 30 | 60 | 90;
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
    readonly equivalentRetentionForms: boolean;
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
