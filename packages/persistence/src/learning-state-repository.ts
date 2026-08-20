import { randomUUID } from "node:crypto";

import type {
  AppealDecision,
  AppealState,
  AppealStatus,
  AssessmentWorkflowState,
  AssessmentWorkflowStatus,
  FeedbackTicketHistoryEntry,
  FeedbackTicketPriority,
  FeedbackTicketState,
  FeedbackTicketStatus,
  FeedbackTicketType,
  LearningAssignmentBlockReason,
  LearningAssignmentPauseReason,
  LearningAssignmentState,
  LearningAssignmentStatus,
} from "@cvg/domain";
import { createAppealPersistence } from "./appeal-persistence.js";
import { createAssessmentWorkflowPersistence } from "./assessment-workflow-persistence.js";
import { createFeedbackTicketPersistence } from "./feedback-ticket-persistence.js";
import { createLearningAssignmentPersistence } from "./learning-assignment-persistence.js";
import type {
  DatabaseExecutor,
  PersistenceContext,
} from "./learning-state-repository-support.js";

export {
  appealRowToState,
  appealStateToRow,
  assessmentWorkflowRowToState,
  assessmentWorkflowStateToRow,
  feedbackTicketRowToState,
  feedbackTicketStateToRow,
  learningAssignmentRowToState,
  learningAssignmentStateToRow,
} from "./learning-state-mappers.js";
export { LearningStatePersistenceConflictError } from "./learning-state-repository-support.js";
export type { PersistenceContext } from "./learning-state-repository-support.js";

export type FeedbackTicketListContext = Readonly<{
  readonly audience: "PARTICIPANT" | "STAFF";
  readonly participantId?: string;
  readonly scopeId: string;
  readonly status?: FeedbackTicketStatus;
  readonly priority?: FeedbackTicketPriority;
}>;

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
  readonly pauseReason: string | null;
  readonly resumeAt: Date | null;
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
  readonly pauseReason: LearningAssignmentPauseReason | null;
  readonly resumeAt: Date | null;
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
  readonly alertedAt?: Date | null;
  readonly version: number;
  readonly status: string;
  readonly priority?: string | null;
  readonly assigneeId?: string | null;
  readonly response?: string | null;
  readonly responseAt?: Date | null;
  readonly responseBy?: string | null;
  readonly history?: readonly FeedbackTicketHistoryEntry[] | null;
  readonly logicalPage?: string | null;
  readonly appVersion?: string | null;
  readonly occurredAt?: Date | null;
  readonly errorCode?: string | null;
  readonly updatedAt: Date;
}>;

export type FeedbackTicketInsertRow = Readonly<{
  readonly id: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly type: FeedbackTicketType;
  readonly description: string;
  readonly createdAt: Date;
  readonly alertedAt: Date | null;
  readonly version: number;
  readonly status: FeedbackTicketStatus;
  readonly priority: FeedbackTicketPriority;
  readonly assigneeId: string | null;
  readonly response: string | null;
  readonly responseAt: Date | null;
  readonly responseBy: string | null;
  readonly history: readonly FeedbackTicketHistoryEntry[];
  readonly logicalPage: string | null;
  readonly appVersion: string | null;
  readonly occurredAt: Date | null;
  readonly errorCode: string | null;
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
}>;

export { LearningStateMappingError } from "./learning-state-mappers.js";

export type LearningStateRepository = Readonly<{
  readonly saveLearningAssignment: (
    context: PersistenceContext,
    state: LearningAssignmentState,
  ) => Promise<ScopedLearningAssignment>;
  readonly findLearningAssignment: (
    context: PersistenceContext,
    assignmentId: string,
  ) => Promise<ScopedLearningAssignment | null>;
  readonly saveAssessmentWorkflow: (
    context: PersistenceContext,
    state: AssessmentWorkflowState,
  ) => Promise<ScopedAssessmentWorkflow>;
  readonly findAssessmentWorkflow: (
    context: PersistenceContext,
    resultId: string,
  ) => Promise<ScopedAssessmentWorkflow | null>;
  readonly saveFeedbackTicket: (
    context: PersistenceContext,
    state: FeedbackTicketState,
  ) => Promise<ScopedFeedbackTicket>;
  readonly findFeedbackTicket: (
    context: PersistenceContext,
    ticketId: string,
  ) => Promise<ScopedFeedbackTicket | null>;
  readonly listFeedbackTickets: (
    context: FeedbackTicketListContext,
  ) => Promise<readonly ScopedFeedbackTicket[]>;
  readonly saveAppeal: (
    context: PersistenceContext,
    state: AppealState,
  ) => Promise<ScopedAppeal>;
  readonly findAppeal: (
    context: PersistenceContext,
    appealId: string,
  ) => Promise<ScopedAppeal | null>;
}>;

export function createLearningStateRepository(
  db: DatabaseExecutor,
): LearningStateRepository {
  const assignments = createLearningAssignmentPersistence(db);
  const workflows = createAssessmentWorkflowPersistence(db);
  const tickets = createFeedbackTicketPersistence(db);
  const appeals = createAppealPersistence(db);
  return Object.freeze({
    saveLearningAssignment: assignments.saveAssignment,
    findLearningAssignment: assignments.findAssignment,
    saveAssessmentWorkflow: workflows.saveWorkflow,
    findAssessmentWorkflow: workflows.findWorkflow,
    saveFeedbackTicket: tickets.saveTicket,
    findFeedbackTicket: tickets.findTicket,
    listFeedbackTickets: tickets.listFeedbackTickets,
    saveAppeal: appeals.saveAppealState,
    findAppeal: appeals.findAppealState,
  });
}

export const learningStateIdFactory = randomUUID;
