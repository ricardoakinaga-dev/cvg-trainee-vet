import type { CurriculumDraftPack } from "./draft-contracts.js";
import type { InternalSourceRef } from "./types.js";

export type ModuleAnswer = Readonly<{
  readonly itemId: string;
  readonly selectedChoiceIds?: readonly string[];
  readonly text?: string;
}>;

export type ModuleEvaluationMode = "FORMATIVE_CHOICE" | "MODULE_COMPLETION";

export type ModuleEvaluationCatalog = Pick<
  CurriculumDraftPack,
  "moduleId" | "items"
>;

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
  "DOMINIO_DIGITAL" | "EM_REMEDIACAO" | "AGUARDA_CORRECAO_HUMANA";

export type ModuleNextAction =
  "REVISAR_RETENCAO" | "EXECUTAR_REMEDIACAO" | "AGUARDAR_CORRECAO_HUMANA";

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
  readonly activityProgress?:
    "ATIVIDADES_PENDENTES" | "AGUARDA_CORRECAO_HUMANA";
  readonly unansweredMandatoryItemIds?: readonly string[];
  readonly evaluationAnchor?: Readonly<{
    readonly attemptId: string;
    readonly attemptVersion: number;
    readonly formId: string;
    readonly formVersion: number;
    readonly blueprintId: string;
    readonly blueprintVersion: number;
    readonly publicationDecisionId: string;
    readonly blueprintApprovalDecisionId: string;
    readonly publishedAt: string;
    readonly contentVersions: readonly Readonly<{
      readonly itemId: string;
      readonly contentVersionId: string;
      readonly version: number;
      readonly sourceRefs: readonly InternalSourceRef[];
    }>[];
  }>;
}>;
