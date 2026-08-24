import {
  transitionAppeal,
  type AppealDecision,
  type AppealEvent,
  type AppealState,
} from "@cvg/domain";

import { ApplicationError } from "./errors.js";

export type AppealReviewTransitionEvent =
  | { readonly type: "ATRIBUIR_REVISOR" }
  | {
      readonly type: "DECIDIR";
      readonly decision: AppealDecision;
      readonly decisionRationale: string;
    }
  | { readonly type: "SOLICITAR_RECALCULO" };

export type AppealReviewTransitionCommand = Readonly<{
  readonly appealId: string;
  readonly scopeId: string;
  readonly actorId: string;
  readonly version: number;
  readonly correlationId: string;
  readonly event: AppealReviewTransitionEvent;
}>;

export type AppealReviewTransitionOptions = Readonly<{
  readonly now?: () => string;
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

function assertPlainText(
  value: unknown,
  field: string,
): asserts value is string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > 10_000 ||
    /<[^>]*>/u.test(value)
  ) {
    throw new ApplicationError("validation_error", `${field} is invalid`);
  }
}

function decisionTimestamp(options: AppealReviewTransitionOptions): string {
  const value = (options.now ?? (() => new Date().toISOString()))();
  if (
    typeof value !== "string" ||
    Number.isNaN(Date.parse(value)) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/u.test(
      value,
    )
  ) {
    throw new ApplicationError("validation_error", "decisionAt is invalid");
  }
  return value;
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
  decidedAt: string | undefined,
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
    if (decidedAt === undefined) {
      throw new ApplicationError("validation_error", "decisionAt is required");
    }
    return {
      type: "DECIDIR",
      decision: command.event.decision,
      rationale: command.event.decisionRationale,
      decidedAt,
      correlationId: command.correlationId,
    };
  }
  if (command.event.type === "SOLICITAR_RECALCULO") {
    return { type: "SOLICITAR_RECALCULO" };
  }
  throw new ApplicationError("validation_error", "Appeal action is invalid");
}

export async function transitionAppealReviewState(
  command: AppealReviewTransitionCommand,
  repository: AppealReviewTransitionRepositoryPort,
  options: AppealReviewTransitionOptions = {},
): Promise<AppealState> {
  assertUuid(command.appealId, "appealId");
  assertUuid(command.scopeId, "scopeId");
  assertUuid(command.actorId, "actorId");
  assertUuid(command.correlationId, "correlationId");
  assertVersion(command.version);
  if (command.event.type === "DECIDIR") {
    assertPlainText(command.event.decisionRationale, "decisionRationale");
  }

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
    const decidedAt =
      command.event.type === "DECIDIR" ? decisionTimestamp(options) : undefined;
    const nextState = transitionAppeal(
      persisted.state,
      toDomainEvent(command, persisted.state, decidedAt),
    );
    return (await repository.saveAppealForReview(context, nextState)).state;
  } catch (error) {
    mapTransitionError(error);
  }
}
