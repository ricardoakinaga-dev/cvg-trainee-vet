import {
  createAppeal,
  createAssessmentWorkflowResult,
  createFeedbackTicket,
  createLearningAssignment,
  transitionAssessmentWorkflowResult,
  transitionFeedbackTicket,
  transitionLearningAssignment,
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
  readonly actorId?: string;
  readonly requestId?: string;
  readonly correlationId?: string;
}>;

export type LearningStateStaffContext = Readonly<{
  readonly scopeId: string;
  readonly actorId?: string;
  readonly requestId?: string;
  readonly correlationId?: string;
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
  readonly saveFeedbackTicketAsStaff: (
    context: LearningStateStaffContext,
    state: FeedbackTicketState,
  ) => Promise<ScopedFeedbackTicket>;
  readonly findFeedbackTicketAsStaff: (
    context: LearningStateStaffContext,
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
  readonly actorId?: string;
  readonly requestId?: string;
  readonly correlationId?: string;
}>;

export type TicketTransitionCommand = Readonly<{
  readonly ticketId: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly version: number;
  readonly event: FeedbackTicketEvent;
  readonly actorId?: string;
  readonly requestId?: string;
  readonly correlationId?: string;
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

function assertContext(context: LearningStateContext): void {
  if (
    context === null ||
    context.participantId.trim().length === 0 ||
    context.scopeId.trim().length === 0
  ) {
    throw new TypeError("participantId and scopeId are required");
  }
  for (const [field, value] of [
    ["actorId", context.actorId],
    ["requestId", context.requestId],
    ["correlationId", context.correlationId],
  ] as const) {
    if (value !== undefined && value.trim().length === 0) {
      throw new TypeError(`${field} must not be empty when provided`);
    }
  }
}

function assertStaffContext(context: LearningStateStaffContext): void {
  if (context === null || context.scopeId.trim().length === 0) {
    throw new TypeError("scopeId is required");
  }
  for (const [field, value] of [
    ["actorId", context.actorId],
    ["requestId", context.requestId],
    ["correlationId", context.correlationId],
  ] as const) {
    if (value !== undefined && value.trim().length === 0) {
      throw new TypeError(`${field} must not be empty when provided`);
    }
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
    ...(command.actorId === undefined ? {} : { actorId: command.actorId }),
    ...(command.requestId === undefined
      ? {}
      : { requestId: command.requestId }),
    ...(command.correlationId === undefined
      ? {}
      : { correlationId: command.correlationId }),
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
    scopeId: command.scopeId,
    ...(command.actorId === undefined ? {} : { actorId: command.actorId }),
    ...(command.requestId === undefined
      ? {}
      : { requestId: command.requestId }),
    ...(command.correlationId === undefined
      ? {}
      : { correlationId: command.correlationId }),
  } as const;
  assertStaffContext(context);
  assertVersion(command.version);
  const persisted = await repository.findFeedbackTicketAsStaff(
    context,
    command.ticketId,
  );
  if (persisted === null) {
    throw new ApplicationError("not_found", "Feedback ticket not found");
  }
  if (persisted.state.participantId !== command.participantId) {
    throw new ApplicationError("not_found", "Feedback ticket not found");
  }
  assertCurrentVersion(persisted.state.version, command.version);
  try {
    const state = transitionFeedbackTicket(persisted.state, command.event);
    return (await repository.saveFeedbackTicketAsStaff(context, state)).state;
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
