import {
  AttemptDomainError,
  createAttempt,
  transitionAttempt,
  type AttemptState,
} from "@cvg/domain";

import { createAuditEntry, type AuditPort } from "./audit.js";
import { ApplicationError, toApplicationError } from "./errors.js";
import type { TransactionSecurityContext } from "./transaction-context.js";

export type StartAttemptCommand = Readonly<{
  readonly participantId: string;
  readonly activityId: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
}>;

export type SubmitAttemptCommand = Readonly<{
  readonly attemptId: string;
  readonly participantId: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly submittedAt: string;
}>;

export type IdempotencyRecord = Readonly<{
  readonly fingerprint: string;
  readonly attempt: AttemptState;
}>;

export interface AttemptActivityPort {
  readonly isAvailable: (
    participantId: string,
    activityId: string,
  ) => Promise<boolean>;
}

export interface AttemptRepositoryPort {
  readonly findOpenByParticipantAndActivity: (
    participantId: string,
    activityId: string,
  ) => Promise<AttemptState | null>;
  readonly findById: (attemptId: string) => Promise<AttemptState | null>;
  readonly insert: (attempt: AttemptState) => Promise<void>;
  readonly update: (attempt: AttemptState) => Promise<void>;
}

export interface AttemptIdempotencyPort {
  readonly find: (key: string) => Promise<IdempotencyRecord | null>;
  readonly store: (key: string, record: IdempotencyRecord) => Promise<void>;
}

export type AttemptSubmittedEvent = Readonly<{
  readonly eventId: string;
  readonly eventType: "attempt.submitted.v1";
  readonly aggregateType: "attempt";
  readonly aggregateId: string;
  readonly occurredAt: string;
  readonly schemaVersion: 1;
  readonly correlationId: string;
  readonly payload: Readonly<Record<string, string>>;
}>;

export interface AttemptEventPublisherPort {
  readonly publish: (event: AttemptSubmittedEvent) => Promise<void>;
}

export interface AttemptTransactionalOperations {
  readonly activity: AttemptActivityPort;
  readonly attemptsPort: AttemptRepositoryPort;
  readonly idempotency: AttemptIdempotencyPort;
  readonly eventPublisher: AttemptEventPublisherPort;
  readonly audit: AuditPort;
}

export interface AttemptTransactionPort {
  readonly run: <Result>(
    work: (operations: AttemptTransactionalOperations) => Promise<Result>,
    context?: TransactionSecurityContext,
  ) => Promise<Result>;
}

export interface AttemptUseCaseDependencies extends AttemptTransactionalOperations {
  readonly idFactory: () => string;
  readonly activity: AttemptActivityPort;
  readonly attemptsPort: AttemptRepositoryPort;
  readonly idempotency: AttemptIdempotencyPort;
  readonly transaction: AttemptTransactionPort;
}

function fingerprint(
  operation: string,
  input: Readonly<Record<string, string>>,
): string {
  return JSON.stringify({ operation, ...input });
}

function replayOrThrow(
  record: IdempotencyRecord | null,
  expectedFingerprint: string,
): AttemptState | null {
  if (record === null) return null;
  if (record.fingerprint !== expectedFingerprint) {
    throw new ApplicationError(
      "idempotency_conflict",
      "Idempotency key was already used with another command",
    );
  }
  return record.attempt;
}

function normalizeAttemptError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) return error;
  const crossPackageConflict =
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "PersistenceConflictError" &&
    "code" in error &&
    error.code === "state_conflict" &&
    "status" in error &&
    error.status === 409;
  if (error instanceof AttemptDomainError || crossPackageConflict) {
    return new ApplicationError("state_conflict", "Attempt state conflict");
  }
  return toApplicationError(error);
}

async function createStartedAttempt(
  command: StartAttemptCommand,
  operations: AttemptTransactionalOperations,
  idFactory: () => string,
): Promise<AttemptState> {
  const available = await operations.activity.isAvailable(
    command.participantId,
    command.activityId,
  );
  if (!available) {
    throw new ApplicationError(
      "not_found",
      "Activity is not available in the current scope",
    );
  }

  const existing =
    await operations.attemptsPort.findOpenByParticipantAndActivity(
      command.participantId,
      command.activityId,
    );
  if (existing !== null) {
    throw new ApplicationError(
      "state_conflict",
      "An open attempt already exists for this activity",
    );
  }

  return transitionAttempt(
    createAttempt({
      attemptId: idFactory(),
      participantId: command.participantId,
      activityId: command.activityId,
    }),
    { type: "INICIAR" },
  );
}

async function persistStartedAttempt(
  command: StartAttemptCommand,
  expectedFingerprint: string,
  started: AttemptState,
  operations: AttemptTransactionalOperations,
  idFactory: () => string,
): Promise<AttemptState> {
  await operations.attemptsPort.insert(started);
  await operations.audit.append(
    createAuditEntry({
      auditId: idFactory(),
      principalId: command.participantId,
      action: "ATTEMPT_STARTED",
      resourceType: "attempt",
      resourceId: started.attemptId,
      outcome: "SUCCESS",
      reasonCode: "attempt_started",
      requestId: command.correlationId,
      correlationId: command.correlationId,
      occurredAt: new Date().toISOString(),
    }),
  );
  await operations.idempotency.store(command.idempotencyKey, {
    fingerprint: expectedFingerprint,
    attempt: started,
  });
  return started;
}

async function runStartAttempt(
  command: StartAttemptCommand,
  expectedFingerprint: string,
  operations: AttemptTransactionalOperations,
  idFactory: () => string,
): Promise<AttemptState> {
  const replay = replayOrThrow(
    await operations.idempotency.find(command.idempotencyKey),
    expectedFingerprint,
  );
  if (replay !== null) return replay;

  const started = await createStartedAttempt(command, operations, idFactory);
  return persistStartedAttempt(
    command,
    expectedFingerprint,
    started,
    operations,
    idFactory,
  );
}

async function findSubmittableAttempt(
  command: SubmitAttemptCommand,
  operations: AttemptTransactionalOperations,
): Promise<AttemptState> {
  const current = await operations.attemptsPort.findById(command.attemptId);
  if (current === null) {
    throw new ApplicationError("not_found", "Attempt was not found");
  }
  if (current.participantId !== command.participantId) {
    throw new ApplicationError(
      "forbidden",
      "Attempt is outside the current scope",
    );
  }
  return current;
}

async function persistSubmittedAttempt(
  command: SubmitAttemptCommand,
  expectedFingerprint: string,
  current: AttemptState,
  operations: AttemptTransactionalOperations,
  idFactory: () => string,
): Promise<AttemptState> {
  const submitted = transitionAttempt(current, {
    type: "SUBMETER",
    submittedAt: command.submittedAt,
  });
  await operations.attemptsPort.update(submitted);
  await operations.eventPublisher.publish({
    eventId: idFactory(),
    eventType: "attempt.submitted.v1",
    aggregateType: "attempt",
    aggregateId: submitted.attemptId,
    occurredAt: command.submittedAt,
    schemaVersion: 1,
    correlationId: command.correlationId,
    payload: {
      attempt_id: submitted.attemptId,
      status: submitted.status,
    },
  });
  await operations.audit.append(
    createAuditEntry({
      auditId: idFactory(),
      principalId: command.participantId,
      action: "ATTEMPT_SUBMITTED",
      resourceType: "attempt",
      resourceId: submitted.attemptId,
      outcome: "SUCCESS",
      reasonCode: "attempt_submitted",
      requestId: command.correlationId,
      correlationId: command.correlationId,
      occurredAt: command.submittedAt,
    }),
  );
  await operations.idempotency.store(command.idempotencyKey, {
    fingerprint: expectedFingerprint,
    attempt: submitted,
  });
  return submitted;
}

async function runSubmitAttempt(
  command: SubmitAttemptCommand,
  expectedFingerprint: string,
  operations: AttemptTransactionalOperations,
  idFactory: () => string,
): Promise<AttemptState> {
  const replay = replayOrThrow(
    await operations.idempotency.find(command.idempotencyKey),
    expectedFingerprint,
  );
  if (replay !== null) return replay;

  const current = await findSubmittableAttempt(command, operations);
  return persistSubmittedAttempt(
    command,
    expectedFingerprint,
    current,
    operations,
    idFactory,
  );
}

export async function startAttempt(
  command: StartAttemptCommand,
  dependencies: AttemptUseCaseDependencies,
): Promise<AttemptState> {
  const expectedFingerprint = fingerprint("start_attempt", {
    participantId: command.participantId,
    activityId: command.activityId,
  });

  try {
    return await dependencies.transaction.run(
      (operations) =>
        runStartAttempt(
          command,
          expectedFingerprint,
          operations,
          dependencies.idFactory,
        ),
      { participantId: command.participantId },
    );
  } catch (error) {
    throw normalizeAttemptError(error);
  }
}

export async function submitAttempt(
  command: SubmitAttemptCommand,
  dependencies: AttemptUseCaseDependencies,
): Promise<AttemptState> {
  const expectedFingerprint = fingerprint("submit_attempt", {
    attemptId: command.attemptId,
    participantId: command.participantId,
    submittedAt: command.submittedAt,
  });

  try {
    return await dependencies.transaction.run(
      (operations) =>
        runSubmitAttempt(
          command,
          expectedFingerprint,
          operations,
          dependencies.idFactory,
        ),
      { participantId: command.participantId },
    );
  } catch (error) {
    throw normalizeAttemptError(error);
  }
}
