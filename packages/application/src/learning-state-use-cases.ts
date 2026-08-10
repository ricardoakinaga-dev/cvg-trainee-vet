import {
  createAppeal,
  createAssessmentWorkflowResult,
  createFeedbackTicket,
  createLearningAssignment,
  transitionAppeal,
  transitionAssessmentWorkflowResult,
  transitionFeedbackTicket,
  transitionLearningAssignment,
  type AppealEvent,
  type AppealState,
  type AssessmentWorkflowEvent,
  type AssessmentWorkflowState,
  type FeedbackTicketEvent,
  type FeedbackTicketState,
  type LearningAssignmentEvent,
  type LearningAssignmentState,
} from "@cvg/domain";

import { ApplicationError } from "./errors.js";

export type LearningStateContext = Readonly<{
  readonly participantId: string;
  readonly scopeId: string;
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

export interface LearningStateRepositoryPort {
  readonly saveLearningAssignment: (
    context: LearningStateContext,
    state: LearningAssignmentState,
  ) => Promise<ScopedLearningAssignment>;
  readonly findLearningAssignment: (
    context: LearningStateContext,
    assignmentId: string,
  ) => Promise<ScopedLearningAssignment | null>;
  readonly saveAssessmentWorkflow: (
    context: LearningStateContext,
    state: AssessmentWorkflowState,
  ) => Promise<ScopedAssessmentWorkflow>;
  readonly findAssessmentWorkflow: (
    context: LearningStateContext,
    resultId: string,
  ) => Promise<ScopedAssessmentWorkflow | null>;
  readonly saveFeedbackTicket: (
    context: LearningStateContext,
    state: FeedbackTicketState,
  ) => Promise<ScopedFeedbackTicket>;
  readonly findFeedbackTicket: (
    context: LearningStateContext,
    ticketId: string,
  ) => Promise<ScopedFeedbackTicket | null>;
  readonly saveAppeal: (
    context: LearningStateContext,
    state: AppealState,
  ) => Promise<ScopedAppeal>;
  readonly findAppeal: (
    context: LearningStateContext,
    appealId: string,
  ) => Promise<ScopedAppeal | null>;
}

export type AssignmentCreateCommand = Readonly<{
  readonly assignmentId: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly availableAt: string;
}>;

export type AssignmentTransitionCommand = Readonly<{
  readonly assignmentId: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly version: number;
  readonly event: LearningAssignmentEvent;
}>;

export type WorkflowCreateCommand = Readonly<{
  readonly resultId: string;
  readonly attemptId: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly ruleVersion: string;
}>;

export type WorkflowTransitionCommand = Readonly<{
  readonly resultId: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly version: number;
  readonly event: AssessmentWorkflowEvent;
}>;

export type TicketCreateCommand = Readonly<{
  readonly ticketId: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly type: FeedbackTicketState["type"];
  readonly description: string;
  readonly createdAt: string;
}>;

export type TicketTransitionCommand = Readonly<{
  readonly ticketId: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly version: number;
  readonly event: FeedbackTicketEvent;
}>;

export type AppealCreateCommand = Readonly<{
  readonly appealId: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly attemptId: string;
  readonly itemId: string;
  readonly justification: string;
  readonly createdAt: string;
}>;

export type AppealTransitionCommand = Readonly<{
  readonly appealId: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly version: number;
  readonly event: AppealEvent;
}>;

function assertContext(context: LearningStateContext): void {
  if (
    context === null ||
    context.participantId.trim().length === 0 ||
    context.scopeId.trim().length === 0
  ) {
    throw new TypeError("participantId and scopeId are required");
  }
}

function assertVersion(version: number): void {
  if (!Number.isInteger(version) || version < 0) {
    throw new TypeError("version must be a non-negative integer");
  }
}

function mapDomainValidation(error: unknown): never {
  if (error instanceof ApplicationError) throw error;
  if (error instanceof Error && error.name.includes("Conflict")) {
    throw new ApplicationError("state_conflict", "Learning state changed");
  }
  if (error instanceof Error && error.name.endsWith("DomainError")) {
    throw new ApplicationError("validation_error", "Invalid learning state");
  }
  throw error;
}

function mapStateConflict(error: unknown): never {
  if (error instanceof ApplicationError) throw error;
  if (error instanceof Error && error.name.includes("Conflict")) {
    throw new ApplicationError("state_conflict", "Learning state changed");
  }
  throw error;
}

function assertCurrentVersion(actual: number, expected: number): void {
  if (actual !== expected) {
    throw new ApplicationError("state_conflict", "Learning state changed");
  }
}

export async function createLearningAssignmentState(
  command: AssignmentCreateCommand,
  repository: LearningStateRepositoryPort,
): Promise<LearningAssignmentState> {
  const context = {
    participantId: command.participantId,
    scopeId: command.scopeId,
  } as const;
  assertContext(context);
  try {
    const state = createLearningAssignment(command);
    return (await repository.saveLearningAssignment(context, state)).state;
  } catch (error) {
    mapDomainValidation(error);
  }
}

export async function transitionLearningAssignmentState(
  command: AssignmentTransitionCommand,
  repository: LearningStateRepositoryPort,
): Promise<LearningAssignmentState> {
  const context = {
    participantId: command.participantId,
    scopeId: command.scopeId,
  } as const;
  assertContext(context);
  assertVersion(command.version);
  const persisted = await repository.findLearningAssignment(
    context,
    command.assignmentId,
  );
  if (persisted === null) {
    throw new ApplicationError("not_found", "Learning assignment not found");
  }
  assertCurrentVersion(persisted.state.version, command.version);
  try {
    const state = transitionLearningAssignment(persisted.state, command.event);
    return (await repository.saveLearningAssignment(context, state)).state;
  } catch (error) {
    if (error instanceof Error && error.name.endsWith("DomainError")) {
      throw new ApplicationError("state_conflict", "Invalid state transition");
    }
    mapStateConflict(error);
  }
}

export async function createAssessmentWorkflowState(
  command: WorkflowCreateCommand,
  repository: LearningStateRepositoryPort,
): Promise<AssessmentWorkflowState> {
  const context = {
    participantId: command.participantId,
    scopeId: command.scopeId,
  } as const;
  assertContext(context);
  try {
    const state = createAssessmentWorkflowResult(command);
    return (await repository.saveAssessmentWorkflow(context, state)).state;
  } catch (error) {
    mapDomainValidation(error);
  }
}

export async function transitionAssessmentWorkflowState(
  command: WorkflowTransitionCommand,
  repository: LearningStateRepositoryPort,
): Promise<AssessmentWorkflowState> {
  const context = {
    participantId: command.participantId,
    scopeId: command.scopeId,
  } as const;
  assertContext(context);
  assertVersion(command.version);
  const persisted = await repository.findAssessmentWorkflow(
    context,
    command.resultId,
  );
  if (persisted === null) {
    throw new ApplicationError("not_found", "Assessment workflow not found");
  }
  assertCurrentVersion(persisted.state.version, command.version);
  try {
    const state = transitionAssessmentWorkflowResult(
      persisted.state,
      command.event,
    );
    return (await repository.saveAssessmentWorkflow(context, state)).state;
  } catch (error) {
    if (error instanceof Error && error.name.endsWith("DomainError")) {
      throw new ApplicationError("state_conflict", "Invalid state transition");
    }
    mapStateConflict(error);
  }
}

export async function createFeedbackTicketState(
  command: TicketCreateCommand,
  repository: LearningStateRepositoryPort,
): Promise<FeedbackTicketState> {
  const context = {
    participantId: command.participantId,
    scopeId: command.scopeId,
  } as const;
  assertContext(context);
  try {
    const state = createFeedbackTicket(command);
    return (await repository.saveFeedbackTicket(context, state)).state;
  } catch (error) {
    mapDomainValidation(error);
  }
}

export async function transitionFeedbackTicketState(
  command: TicketTransitionCommand,
  repository: LearningStateRepositoryPort,
): Promise<FeedbackTicketState> {
  const context = {
    participantId: command.participantId,
    scopeId: command.scopeId,
  } as const;
  assertContext(context);
  assertVersion(command.version);
  const persisted = await repository.findFeedbackTicket(
    context,
    command.ticketId,
  );
  if (persisted === null) {
    throw new ApplicationError("not_found", "Feedback ticket not found");
  }
  assertCurrentVersion(persisted.state.version, command.version);
  try {
    const state = transitionFeedbackTicket(persisted.state, command.event);
    return (await repository.saveFeedbackTicket(context, state)).state;
  } catch (error) {
    if (error instanceof Error && error.name.endsWith("DomainError")) {
      throw new ApplicationError("state_conflict", "Invalid state transition");
    }
    mapStateConflict(error);
  }
}

export async function createAppealState(
  command: AppealCreateCommand,
  repository: LearningStateRepositoryPort,
): Promise<AppealState> {
  const context = {
    participantId: command.participantId,
    scopeId: command.scopeId,
  } as const;
  assertContext(context);
  try {
    const state = createAppeal(command);
    return (await repository.saveAppeal(context, state)).state;
  } catch (error) {
    mapDomainValidation(error);
  }
}

export async function transitionAppealState(
  command: AppealTransitionCommand,
  repository: LearningStateRepositoryPort,
): Promise<AppealState> {
  const context = {
    participantId: command.participantId,
    scopeId: command.scopeId,
  } as const;
  assertContext(context);
  assertVersion(command.version);
  const persisted = await repository.findAppeal(context, command.appealId);
  if (persisted === null) {
    throw new ApplicationError("not_found", "Appeal not found");
  }
  assertCurrentVersion(persisted.state.version, command.version);
  try {
    const state = transitionAppeal(persisted.state, command.event);
    return (await repository.saveAppeal(context, state)).state;
  } catch (error) {
    if (error instanceof Error && error.name.endsWith("DomainError")) {
      throw new ApplicationError("state_conflict", "Invalid state transition");
    }
    mapStateConflict(error);
  }
}
