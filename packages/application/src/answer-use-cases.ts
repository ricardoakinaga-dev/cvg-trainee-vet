import {
  AnswerDomainError,
  AttemptDomainError,
  createAnswer,
  transitionAttempt,
  type AnswerState,
  type AttemptState,
} from "@cvg/domain";

import { createAuditEntry, type AuditPort } from "./audit.js";
import { ApplicationError, toApplicationError } from "./errors.js";
import type { TransactionSecurityContext } from "./transaction-context.js";

export type SaveAnswerCommand = Readonly<{
  readonly attemptId: string;
  readonly participantId: string;
  readonly activityId: string;
  readonly scopeId: string;
  readonly itemId: string;
  readonly response: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly savedAt: string;
}>;

export type SaveAnswerResult = Readonly<{
  readonly attempt: AttemptState;
  readonly answer: AnswerState;
}>;

export type AnswerIdempotencyRecord = Readonly<{
  readonly fingerprint: string;
  readonly result: SaveAnswerResult;
}>;

export interface AnswerRepositoryPort {
  readonly findByAttemptAndItem: (
    attemptId: string,
    itemId: string,
  ) => Promise<AnswerState | null>;
  readonly save: (answer: AnswerState) => Promise<void>;
}

export interface AnswerIdempotencyPort {
  readonly find: (key: string) => Promise<AnswerIdempotencyRecord | null>;
  readonly store: (
    key: string,
    record: AnswerIdempotencyRecord,
  ) => Promise<void>;
}

export type AnswerSavedEvent = Readonly<{
  readonly eventId: string;
  readonly eventType: "answer.saved.v1";
  readonly aggregateType: "attempt";
  readonly aggregateId: string;
  readonly occurredAt: string;
  readonly schemaVersion: 1;
  readonly correlationId: string;
  readonly payload: Readonly<{
    readonly attempt_id: string;
    readonly item_id: string;
    readonly status: "SALVA";
  }>;
}>;

export interface AnswerEventPublisherPort {
  readonly publish: (event: AnswerSavedEvent) => Promise<void>;
}

export interface AnswerTransactionalOperations {
  readonly hasActivityItem: (
    participantId: string,
    activityId: string,
    scopeId: string,
    itemId: string,
  ) => Promise<boolean>;
  readonly attemptsPort: Readonly<{
    readonly findById: (attemptId: string) => Promise<AttemptState | null>;
    readonly update: (attempt: AttemptState) => Promise<void>;
  }>;
  readonly answersPort: AnswerRepositoryPort;
  readonly idempotency: AnswerIdempotencyPort;
  readonly eventPublisher: AnswerEventPublisherPort;
  readonly audit: AuditPort;
}

export interface AnswerTransactionPort {
  readonly run: <Result>(
    work: (operations: AnswerTransactionalOperations) => Promise<Result>,
    context?: TransactionSecurityContext,
  ) => Promise<Result>;
}

export interface AnswerUseCaseDependencies extends AnswerTransactionalOperations {
  readonly idFactory: () => string;
  readonly transaction: AnswerTransactionPort;
}

function assertCommandText(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function fingerprint(command: SaveAnswerCommand): string {
  return JSON.stringify({
    operation: "save_answer",
    attemptId: command.attemptId,
    participantId: command.participantId,
    activityId: command.activityId,
    scopeId: command.scopeId,
    itemId: command.itemId,
    response: command.response,
    savedAt: command.savedAt,
  });
}

function replayOrThrow(
  record: AnswerIdempotencyRecord | null,
  expectedFingerprint: string,
): SaveAnswerResult | null {
  if (record === null) return null;
  if (record.fingerprint !== expectedFingerprint) {
    throw new ApplicationError(
      "idempotency_conflict",
      "Idempotency key was already used with another command",
    );
  }
  return record.result;
}

function normalizeAnswerError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) return error;
  if (error instanceof AttemptDomainError) {
    return new ApplicationError("state_conflict", "Attempt state conflict");
  }
  if (error instanceof AnswerDomainError) {
    return new ApplicationError("validation_error", "Answer is invalid");
  }
  return toApplicationError(error);
}

export async function saveAnswer(
  command: SaveAnswerCommand,
  dependencies: AnswerUseCaseDependencies,
): Promise<SaveAnswerResult> {
  for (const [value, field] of [
    [command.attemptId, "attemptId"],
    [command.participantId, "participantId"],
    [command.activityId, "activityId"],
    [command.itemId, "itemId"],
    [command.idempotencyKey, "idempotencyKey"],
    [command.correlationId, "correlationId"],
  ] as const) {
    assertCommandText(value, field);
  }

  const expectedFingerprint = fingerprint(command);

  try {
    return await dependencies.transaction.run(
      async (operations) => {
        const replay = replayOrThrow(
          await operations.idempotency.find(command.idempotencyKey),
          expectedFingerprint,
        );
        if (replay !== null) return replay;

        const current = await operations.attemptsPort.findById(
          command.attemptId,
        );
        if (current === null) {
          throw new ApplicationError("not_found", "Attempt was not found");
        }
        if (
          current.participantId !== command.participantId ||
          current.activityId !== command.activityId
        ) {
          throw new ApplicationError(
            "forbidden",
            "Attempt is outside the current scope",
          );
        }

        const itemBelongsToActivity = await operations.hasActivityItem(
          command.participantId,
          current.activityId,
          command.scopeId,
          command.itemId,
        );
        if (!itemBelongsToActivity) {
          throw new ApplicationError(
            "not_found",
            "Answer item was not found in the published activity",
          );
        }

        const existing = await operations.answersPort.findByAttemptAndItem(
          command.attemptId,
          command.itemId,
        );
        const answer = createAnswer({
          answerId: existing?.answerId ?? dependencies.idFactory(),
          attemptId: command.attemptId,
          itemId: command.itemId,
          response: command.response,
          savedAt: command.savedAt,
        });
        const savedAttempt = transitionAttempt(current, { type: "SALVAR" });

        await operations.answersPort.save(answer);
        await operations.attemptsPort.update(savedAttempt);
        await operations.eventPublisher.publish({
          eventId: dependencies.idFactory(),
          eventType: "answer.saved.v1",
          aggregateType: "attempt",
          aggregateId: savedAttempt.attemptId,
          occurredAt: command.savedAt,
          schemaVersion: 1,
          correlationId: command.correlationId,
          payload: {
            attempt_id: savedAttempt.attemptId,
            item_id: answer.itemId,
            status: "SALVA",
          },
        });
        await operations.audit.append(
          createAuditEntry({
            auditId: dependencies.idFactory(),
            principalId: command.participantId,
            action: "ANSWER_SAVED",
            resourceType: "attempt",
            resourceId: savedAttempt.attemptId,
            scopeId: command.scopeId,
            outcome: "SUCCESS",
            reasonCode: "draft_saved",
            requestId: command.correlationId,
            correlationId: command.correlationId,
            occurredAt: command.savedAt,
          }),
        );

        const result = Object.freeze({ attempt: savedAttempt, answer });
        await operations.idempotency.store(command.idempotencyKey, {
          fingerprint: expectedFingerprint,
          result,
        });
        return result;
      },
      { participantId: command.participantId, scopeId: command.scopeId },
    );
  } catch (error) {
    throw normalizeAnswerError(error);
  }
}
