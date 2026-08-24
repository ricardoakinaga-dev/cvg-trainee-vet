import { randomUUID } from "node:crypto";

import {
  createAssessmentResult,
  transitionAppeal,
  type AppealState,
  type AssessmentResultState,
} from "@cvg/domain";

import { ApplicationError } from "./errors.js";

export const APPEAL_RECALCULATION_RULE_VERSION =
  "appeal-recalculation-v1" as const;

export type AppealRecalculationCommand = Readonly<{
  readonly appealId: string;
  readonly scopeId: string;
  readonly attemptId: string;
  readonly appealVersion: number;
  readonly correlationId: string;
  readonly now?: string;
}>;

export type AppealRecalculationTransactionContext = Readonly<{
  readonly scopeId: string;
}>;

export interface AppealRecalculationTransactionalOperations {
  readonly findAppeal: (
    context: AppealRecalculationTransactionContext,
    appealId: string,
  ) => Promise<AppealState | null>;
  readonly findLatestResult: (
    attemptId: string,
  ) => Promise<AssessmentResultState | null>;
  readonly insertResult: (result: AssessmentResultState) => Promise<void>;
  readonly saveAppeal: (
    context: AppealRecalculationTransactionContext,
    state: AppealState,
  ) => Promise<AppealState>;
}

export interface AppealRecalculationTransactionPort {
  readonly run: <Result>(
    work: (
      operations: AppealRecalculationTransactionalOperations,
    ) => Promise<Result>,
  ) => Promise<Result>;
}

export type AppealRecalculationResult = Readonly<{
  readonly status: "COMPLETED" | "ALREADY_COMPLETED";
  readonly appeal: AppealState;
  readonly result: AssessmentResultState;
}>;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function assertUuid(value: string, field: string): void {
  if (!uuidPattern.test(value)) {
    throw new ApplicationError("validation_error", `${field} is invalid`);
  }
}

function assertVersion(value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new ApplicationError("validation_error", "appealVersion is invalid");
  }
}

function boundedTimestamp(value: string | undefined): string {
  const timestamp = value ?? new Date().toISOString();
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/u.test(
      timestamp,
    ) ||
    Number.isNaN(Date.parse(timestamp))
  ) {
    throw new ApplicationError(
      "validation_error",
      "recalculation time is invalid",
    );
  }
  return timestamp;
}

function stateConflict(message: string): ApplicationError {
  return new ApplicationError("state_conflict", message);
}

function mapRecalculationError(error: unknown): never {
  if (error instanceof ApplicationError) throw error;
  if (error instanceof Error && error.name.includes("Conflict")) {
    throw stateConflict("Appeal recalculation state changed");
  }
  if (error instanceof Error && error.name.endsWith("DomainError")) {
    throw stateConflict("Appeal recalculation transition is invalid");
  }
  throw error;
}

export async function recalculateAppealResult(
  command: AppealRecalculationCommand,
  transaction: AppealRecalculationTransactionPort,
  options: Readonly<{ readonly idFactory?: () => string }> = {},
): Promise<AppealRecalculationResult> {
  assertUuid(command.appealId, "appealId");
  assertUuid(command.scopeId, "scopeId");
  assertUuid(command.attemptId, "attemptId");
  assertUuid(command.correlationId, "correlationId");
  assertVersion(command.appealVersion);
  const correctedAt = boundedTimestamp(command.now);
  const idFactory = options.idFactory ?? randomUUID;

  try {
    return await transaction.run(async (operations) => {
      const context = Object.freeze({ scopeId: command.scopeId });
      const current = await operations.findAppeal(context, command.appealId);
      if (current === null) {
        throw new ApplicationError("not_found", "Appeal not found");
      }
      if (current.attemptId !== command.attemptId) {
        throw stateConflict("Appeal attempt does not match recalculation");
      }

      const latest = await operations.findLatestResult(current.attemptId);
      if (latest === null) {
        throw stateConflict("Appeal recalculation requires an existing result");
      }

      if (current.status === "ENCERRADA") {
        return Object.freeze({
          status: "ALREADY_COMPLETED" as const,
          appeal: current,
          result: latest,
        });
      }
      if (current.status !== "RECALCULO_PENDENTE") {
        throw stateConflict("Appeal is not awaiting recalculation");
      }
      if (current.version !== command.appealVersion) {
        throw stateConflict("Appeal version does not match recalculation");
      }
      if (current.decision !== "MANTER_RESULTADO") {
        throw stateConflict(
          "bounded appeal recalculation requires MANTER_RESULTADO",
        );
      }

      // The transaction is the idempotency boundary: a failed recalculation
      // rolls back both the new immutable result and the appeal transition.
      // Once committed, replay observes ENCERRADA above. Do not use the
      // ruleVersion as a cross-appeal marker because results belong to an
      // attempt and two different item appeals can share that attempt.
      const recalculated = createAssessmentResult({
        resultId: idFactory(),
        attemptId: current.attemptId,
        version: latest.version + 1,
        kind: "AUTOMATICA",
        score: latest.score,
        outcome: latest.outcome,
        feedback: latest.feedback,
        ruleVersion: APPEAL_RECALCULATION_RULE_VERSION,
        correctedBy: current.reviewerId ?? "",
        correctedAt,
      });

      await operations.insertResult(recalculated);
      const closed = transitionAppeal(current, {
        type: "CONCLUIR_RECALCULO",
      });
      const savedAppeal = await operations.saveAppeal(context, closed);
      return Object.freeze({
        status: "COMPLETED" as const,
        appeal: savedAppeal,
        result: recalculated,
      });
    });
  } catch (error) {
    mapRecalculationError(error);
  }
}
