import type {
  DigitalCaseRuntimeState,
  ModuleEvaluationResult,
} from "@cvg/curriculum";
import type {
  AuthoringChoice,
  AuthoringParticipantItem,
  AuthoringRubric,
  AuthoringSourceRef,
} from "@cvg/application";

export type InternalKnowledgeMetadata = Readonly<{
  curriculumArea: string;
  protocolVersion: string;
  contentHash: string;
}>;

export type PublicChoiceMetadata = Readonly<{
  readonly id: string;
  readonly label: string;
  readonly text: string;
}>;

export type PersistedAttemptSnapshot = Readonly<{
  attemptId: string;
  participantId: string;
  activityId: string;
  status: string;
  version: number;
  submittedAt?: string;
}>;

export type PersistedAnswerSnapshot = Readonly<{
  readonly attempt: PersistedAttemptSnapshot;
  readonly answer: Readonly<{
    readonly answerId: string;
    readonly attemptId: string;
    readonly itemId: string;
    readonly response: string;
    readonly savedAt: string;
  }>;
}>;

export type PersistedCorrectionSnapshot = Readonly<{
  readonly attempt: PersistedAttemptSnapshot;
  readonly result: Readonly<{
    readonly resultId: string;
    readonly attemptId: string;
    readonly version: number;
    readonly kind: string;
    readonly score: number;
    readonly outcome: string;
    readonly feedback: string;
    readonly ruleVersion: string;
    readonly correctedBy: string;
    readonly correctedAt: string;
  }>;
}>;

export type PersistedCurriculumRuntimeState = ModuleEvaluationResult;
export type PersistedDigitalCaseRuntimeState = DigitalCaseRuntimeState;

export type PersistedAuthoringItem = Readonly<{
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
}>;

export type PersistedContentReviewDecision = Readonly<{
  readonly reviewerId: string;
  readonly decision: "APROVAR_CLINICAMENTE" | "SOLICITAR_AJUSTES";
  readonly rationale: string;
  readonly reviewedAt: string;
  readonly correlationId: string;
}>;
