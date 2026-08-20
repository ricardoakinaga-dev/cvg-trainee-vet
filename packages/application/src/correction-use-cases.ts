import {
  AssessmentDomainError,
  createAssessmentResult,
  transitionAttempt,
  type AssessmentOutcome,
  type AssessmentResultState,
  AttemptDomainError,
  type AttemptState,
} from "@cvg/domain";

import { canAccess, type AccountStatus, type Role } from "./authorization.js";
import { createAuditEntry, type AuditPort } from "./audit.js";
import { ApplicationError, toApplicationError } from "./errors.js";
import type { TransactionSecurityContext } from "./transaction-context.js";
import type { ClinicalApproverPort } from "./authoring-use-cases.js";

export type CorrectOpenResponseCommand = Readonly<{
  readonly principalId: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly approvedClinicalApproverId?: string;
  readonly scopeId: string;
  readonly attemptId: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly score: number;
  readonly outcome: AssessmentOutcome;
  readonly feedback: string;
  readonly ruleVersion: string;
}>;

export type CorrectionResult = Readonly<{
  readonly attempt: AttemptState;
  readonly result: AssessmentResultState;
}>;

export type CorrectionIdempotencyRecord = Readonly<{
  readonly fingerprint: string;
  readonly result: CorrectionResult;
}>;

export interface CorrectionAttemptsPort {
  readonly findById: (attemptId: string) => Promise<AttemptState | null>;
  readonly update: (attempt: AttemptState) => Promise<void>;
}

export interface CorrectionResultsPort {
  readonly findLatest: (
    attemptId: string,
  ) => Promise<AssessmentResultState | null>;
  readonly insert: (result: AssessmentResultState) => Promise<void>;
}

export interface CorrectionIdempotencyPort {
  readonly find: (key: string) => Promise<CorrectionIdempotencyRecord | null>;
  readonly store: (
    key: string,
    record: CorrectionIdempotencyRecord,
  ) => Promise<void>;
}

export type AssessmentCorrectedEvent = Readonly<{
  readonly eventId: string;
  readonly eventType: "assessment.corrected.v1";
  readonly aggregateType: "attempt";
  readonly aggregateId: string;
  readonly occurredAt: string;
  readonly schemaVersion: 1;
  readonly correlationId: string;
  readonly payload: Readonly<Record<string, string>>;
}>;

export interface CorrectionEventPublisherPort {
  readonly publish: (event: AssessmentCorrectedEvent) => Promise<void>;
}

export interface CorrectionTransactionalOperations {
  readonly attempts: CorrectionAttemptsPort;
  readonly results: CorrectionResultsPort;
  readonly idempotency: CorrectionIdempotencyPort;
  readonly eventPublisher: CorrectionEventPublisherPort;
  readonly audit: AuditPort;
  readonly approver: ClinicalApproverPort;
}

export interface CorrectionTransactionPort {
  readonly run: <Result>(
    work: (operations: CorrectionTransactionalOperations) => Promise<Result>,
    context?: TransactionSecurityContext,
  ) => Promise<Result>;
}

export interface CorrectionUseCaseDependencies extends CorrectionTransactionalOperations {
  readonly idFactory: () => string;
  readonly transaction: CorrectionTransactionPort;
}

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function fingerprint(command: CorrectOpenResponseCommand): string {
  return JSON.stringify({
    operation: "correct_open_response",
    attemptId: command.attemptId,
    principalId: command.principalId,
    score: command.score,
    outcome: command.outcome,
    feedback: command.feedback,
    ruleVersion: command.ruleVersion,
  });
}

function replayOrThrow(
  record: CorrectionIdempotencyRecord | null,
  expectedFingerprint: string,
): CorrectionResult | null {
  if (record === null) return null;
  if (record.fingerprint !== expectedFingerprint) {
    throw new ApplicationError(
      "idempotency_conflict",
      "Idempotency key was already used with another command",
    );
  }
  return record.result;
}

function normalizeCorrectionError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) return error;
  if (error instanceof AssessmentDomainError) {
    return new ApplicationError("state_conflict", "Correction state conflict");
  }
  if (error instanceof AttemptDomainError) {
    return new ApplicationError("state_conflict", "Correction state conflict");
  }
  return toApplicationError(error);
}

function validateCorrectionCommand(command: CorrectOpenResponseCommand): void {
  for (const [value, field] of [
    [command.principalId, "principalId"],
    [command.scopeId, "scopeId"],
    [command.attemptId, "attemptId"],
    [command.idempotencyKey, "idempotencyKey"],
    [command.correlationId, "correlationId"],
    [command.ruleVersion, "ruleVersion"],
  ] as const) {
    assertNonEmpty(value, field);
  }
}

function assertCorrectionAccess(command: CorrectOpenResponseCommand): void {
  if (
    !canAccess({
      principalId: command.principalId,
      accountStatus: command.accountStatus,
      roles: command.roles,
      capability: "CORRECT_ATTEMPT",
      resource: { scopeId: command.scopeId },
      scopes: command.scopes,
      ...(command.approvedClinicalApproverId === undefined
        ? {}
        : { approvedClinicalApproverId: command.approvedClinicalApproverId }),
    })
  ) {
    throw new ApplicationError(
      "forbidden",
      "Correction is outside the current authorization scope",
    );
  }
}

async function findCorrectionAttempt(
  operations: CorrectionTransactionalOperations,
  attemptId: string,
): Promise<AttemptState> {
  const current = await operations.attempts.findById(attemptId);
  if (current === null) {
    throw new ApplicationError("not_found", "Attempt was not found");
  }
  return current;
}

function prepareCorrectionAttempt(current: AttemptState): Readonly<{
  readonly waiting: AttemptState;
  readonly corrected: AttemptState;
}> {
  const waiting =
    current.status === "SUBMETIDA"
      ? transitionAttempt(current, { type: "AGUARDAR_CORRECAO_HUMANA" })
      : current;
  return Object.freeze({
    waiting,
    corrected: transitionAttempt(waiting, { type: "CORRIGIR_HUMANAMENTE" }),
  });
}

function buildCorrectionResult(
  command: CorrectOpenResponseCommand,
  dependencies: CorrectionUseCaseDependencies,
  corrected: AttemptState,
  latest: AssessmentResultState | null,
  correctedAt: string,
): AssessmentResultState {
  return createAssessmentResult({
    resultId: dependencies.idFactory(),
    attemptId: corrected.attemptId,
    version: (latest?.version ?? 0) + 1,
    kind: "HUMANA",
    score: command.score,
    outcome: command.outcome,
    feedback: command.feedback,
    ruleVersion: command.ruleVersion,
    correctedBy: command.principalId,
    correctedAt,
  });
}

function buildCorrectionEvent(
  command: CorrectOpenResponseCommand,
  corrected: AttemptState,
  result: AssessmentResultState,
  occurredAt: string,
  idFactory: () => string,
): AssessmentCorrectedEvent {
  return {
    eventId: idFactory(),
    eventType: "assessment.corrected.v1",
    aggregateType: "attempt",
    aggregateId: corrected.attemptId,
    occurredAt,
    schemaVersion: 1,
    correlationId: command.correlationId,
    payload: {
      attempt_id: corrected.attemptId,
      result_id: result.resultId,
      status: corrected.status,
      score: String(result.score),
      outcome: result.outcome,
      result_version: String(result.version),
      rule_version: result.ruleVersion,
    },
  };
}

function buildCorrectionAudit(
  command: CorrectOpenResponseCommand,
  corrected: AttemptState,
  occurredAt: string,
  idFactory: () => string,
) {
  return createAuditEntry({
    auditId: idFactory(),
    principalId: command.principalId,
    action: "ATTEMPT_CORRECTED",
    resourceType: "attempt",
    resourceId: corrected.attemptId,
    scopeId: command.scopeId,
    outcome: "SUCCESS",
    reasonCode: "human_correction_saved",
    requestId: command.correlationId,
    correlationId: command.correlationId,
    occurredAt,
  });
}

async function assertCurrentCorrectorIdentity(
  command: CorrectOpenResponseCommand,
  operations: CorrectionTransactionalOperations,
): Promise<void> {
  const current = await operations.approver.findById(command.principalId);
  if (
    current === null ||
    current.accountStatus !== "ACTIVE" ||
    !current.scopes.includes(command.scopeId)
  ) {
    throw new ApplicationError(
      "forbidden",
      "Current corrector identity is not active in the requested scope",
    );
  }
}

async function applyCorrection(
  command: CorrectOpenResponseCommand,
  dependencies: CorrectionUseCaseDependencies,
  operations: CorrectionTransactionalOperations,
  expectedFingerprint: string,
): Promise<CorrectionResult> {
  const replay = replayOrThrow(
    await operations.idempotency.find(command.idempotencyKey),
    expectedFingerprint,
  );
  if (replay !== null) return replay;

  // Revalidate the persisted current identity: suspension or scope/role change
  // must be honored even when the static approvedClinicalApproverId is present.
  await assertCurrentCorrectorIdentity(command, operations);

  const current = await findCorrectionAttempt(operations, command.attemptId);
  const { waiting, corrected } = prepareCorrectionAttempt(current);
  if (waiting !== current) await operations.attempts.update(waiting);

  const latest = await operations.results.findLatest(current.attemptId);
  const correctedAt = new Date().toISOString();
  const result = buildCorrectionResult(
    command,
    dependencies,
    corrected,
    latest,
    correctedAt,
  );

  await operations.attempts.update(corrected);
  await operations.results.insert(result);
  await operations.eventPublisher.publish(
    buildCorrectionEvent(
      command,
      corrected,
      result,
      correctedAt,
      dependencies.idFactory,
    ),
  );
  await operations.audit.append(
    buildCorrectionAudit(
      command,
      corrected,
      correctedAt,
      dependencies.idFactory,
    ),
  );

  const response = Object.freeze({ attempt: corrected, result });
  await operations.idempotency.store(command.idempotencyKey, {
    fingerprint: expectedFingerprint,
    result: response,
  });
  return response;
}

export async function correctOpenResponse(
  command: CorrectOpenResponseCommand,
  dependencies: CorrectionUseCaseDependencies,
): Promise<CorrectionResult> {
  validateCorrectionCommand(command);
  assertCorrectionAccess(command);
  const expectedFingerprint = fingerprint(command);

  try {
    return await dependencies.transaction.run(
      (operations) =>
        applyCorrection(command, dependencies, operations, expectedFingerprint),
      { scopeId: command.scopeId },
    );
  } catch (error) {
    throw normalizeCorrectionError(error);
  }
}
