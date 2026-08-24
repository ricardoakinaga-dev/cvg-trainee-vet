import {
  transitionAppeal,
  type AppealDecision,
  type AppealEvent,
  type AppealState,
} from "@cvg/domain";

import { ApplicationError } from "./errors.js";

export type AppealReviewTransitionEvent =
  | { readonly type: "ATRIBUIR_REVISOR" }
  | { readonly type: "DECIDIR"; readonly decision: AppealDecision }
  | { readonly type: "SOLICITAR_RECALCULO" };

export type AppealReviewTransitionCommand = Readonly<{
  readonly appealId: string;
  readonly scopeId: string;
  readonly actorId: string;
  readonly version: number;
  readonly event: AppealReviewTransitionEvent;
}>;

export type AppealReviewTransitionContext = Readonly<{
  readonly scopeId: string;
}>;

export type ScopedAppealReview = Readonly<{
  readonly scopeId: string;
  readonly state: AppealState;
}>;

export interface AppealReviewTransitionRepositoryPort {
  readonly findAppealForReview: (
    context: AppealReviewTransitionContext,
    appealId: string,
  ) => Promise<ScopedAppealReview | null>;
  readonly saveAppealForReview: (
    context: AppealReviewTransitionContext,
    state: AppealState,
  ) => Promise<ScopedAppealReview>;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function assertUuid(value: string, field: string): void {
  if (!uuidPattern.test(value)) {
    throw new ApplicationError("validation_error", `${field} is invalid`);
  }
}

function assertVersion(version: number): void {
  if (!Number.isInteger(version) || version < 0) {
    throw new ApplicationError("validation_error", "version is invalid");
  }
}

function assertCurrentVersion(actual: number, expected: number): void {
  if (actual !== expected) {
    throw new ApplicationError("state_conflict", "Learning state changed");
  }
}

function mapTransitionError(error: unknown): never {
  if (error instanceof ApplicationError) throw error;
  if (error instanceof Error && error.name.includes("Conflict")) {
    throw new ApplicationError("state_conflict", "Learning state changed");
  }
  if (error instanceof Error && error.name.endsWith("DomainError")) {
    throw new ApplicationError("state_conflict", "Invalid appeal transition");
  }
  throw error;
}

function toDomainEvent(
  command: AppealReviewTransitionCommand,
  persisted: AppealState,
): AppealEvent {
  if (command.event.type === "ATRIBUIR_REVISOR") {
    return { type: "ATRIBUIR_REVISOR", reviewerId: command.actorId };
  }
  if (persisted.reviewerId !== command.actorId) {
    throw new ApplicationError(
      "forbidden",
      "Appeal transition requires the assigned reviewer",
    );
  }
  if (command.event.type === "DECIDIR") {
    return { type: "DECIDIR", decision: command.event.decision };
  }
  if (command.event.type === "SOLICITAR_RECALCULO") {
    return { type: "SOLICITAR_RECALCULO" };
  }
  throw new ApplicationError("validation_error", "Appeal action is invalid");
}

export async function transitionAppealReviewState(
  command: AppealReviewTransitionCommand,
  repository: AppealReviewTransitionRepositoryPort,
): Promise<AppealState> {
  assertUuid(command.appealId, "appealId");
  assertUuid(command.scopeId, "scopeId");
  assertUuid(command.actorId, "actorId");
  assertVersion(command.version);

  const context = Object.freeze({ scopeId: command.scopeId });
  const persisted = await repository.findAppealForReview(
    context,
    command.appealId,
  );
  if (persisted === null) {
    throw new ApplicationError("not_found", "Appeal not found");
  }
  assertCurrentVersion(persisted.state.version, command.version);

  try {
    const nextState = transitionAppeal(
      persisted.state,
      toDomainEvent(command, persisted.state),
    );
    return (await repository.saveAppealForReview(context, nextState)).state;
  } catch (error) {
    mapTransitionError(error);
  }
}
