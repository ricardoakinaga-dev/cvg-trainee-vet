import type {
  AppealDecision,
  AppealState,
  AppealStatus,
  AssessmentWorkflowState,
  AssessmentWorkflowStatus,
  FeedbackTicketPriority,
  FeedbackTicketState,
  FeedbackTicketStatus,
  FeedbackTicketType,
  LearningAssignmentBlockReason,
  LearningAssignmentState,
  LearningAssignmentStatus,
} from "@cvg/domain";

export type ScopedLearningAssignment = Readonly<{
  readonly scopeId: string;
  readonly state: LearningAssignmentState;
}>;

export type ScopedAssessmentWorkflow = Readonly<{
  readonly scopeId: string;
  readonly participantId: string;
  readonly state: AssessmentWorkflowState;
}>;

export type ScopedFeedbackTicket = Readonly<{
  readonly scopeId: string;
  readonly state: FeedbackTicketState;
}>;

export type ScopedAppeal = Readonly<{
  readonly scopeId: string;
  readonly state: AppealState;
}>;

export type LearningAssignmentRowShape = Readonly<{
  readonly id: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly availableAt: Date;
  readonly status: string;
  readonly version: number;
  readonly blockReason: string | null;
  readonly pausedFrom: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}>;

export type LearningAssignmentInsertRow = Readonly<{
  readonly id: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly availableAt: Date;
  readonly status: LearningAssignmentStatus;
  readonly version: number;
  readonly blockReason: LearningAssignmentBlockReason | null;
  readonly pausedFrom: Exclude<LearningAssignmentStatus, "PAUSADO"> | null;
}>;

export type AssessmentWorkflowRowShape = Readonly<{
  readonly resultId: string;
  readonly attemptId: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly ruleVersion: string;
  readonly version: number;
  readonly status: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}>;

export type AssessmentWorkflowInsertRow = Readonly<{
  readonly resultId: string;
  readonly attemptId: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly ruleVersion: string;
  readonly version: number;
  readonly status: AssessmentWorkflowStatus;
}>;

export type FeedbackTicketRowShape = Readonly<{
  readonly id: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly type: string;
  readonly description: string;
  readonly createdAt: Date;
  readonly version: number;
  readonly status: string;
  readonly priority?: string;
  readonly assigneeId?: string | null;
  readonly updatedAt: Date;
}>;

export type FeedbackTicketInsertRow = Readonly<{
  readonly id: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly type: FeedbackTicketType;
  readonly description: string;
  readonly createdAt: Date;
  readonly version: number;
  readonly status: FeedbackTicketStatus;
  readonly priority: FeedbackTicketPriority;
  readonly assigneeId: string | null;
}>;

export type AppealRowShape = Readonly<{
  readonly id: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly attemptId: string;
  readonly itemId: string;
  readonly justification: string;
  readonly createdAt: Date;
  readonly dueAt: Date;
  readonly version: number;
  readonly status: string;
  readonly reviewerId: string | null;
  readonly decision: string | null;
  readonly decisionRationale: string | null;
  readonly decisionAt: Date | null;
  readonly decisionCorrelationId: string | null;
  readonly updatedAt: Date;
}>;

export type AppealInsertRow = Readonly<{
  readonly id: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly attemptId: string;
  readonly itemId: string;
  readonly justification: string;
  readonly createdAt: Date;
  readonly dueAt: Date;
  readonly version: number;
  readonly status: AppealStatus;
  readonly reviewerId: string | null;
  readonly decision: AppealDecision | null;
  readonly decisionRationale: string | null;
  readonly decisionAt: Date | null;
  readonly decisionCorrelationId: string | null;
}>;
