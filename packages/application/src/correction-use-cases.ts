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

export async function correctOpenResponse(
  command: CorrectOpenResponseCommand,
  dependencies: CorrectionUseCaseDependencies,
): Promise<CorrectionResult> {
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

  const expectedFingerprint = fingerprint(command);

  try {
    return await dependencies.transaction.run(
      async (operations) => {
        const replay = replayOrThrow(
          await operations.idempotency.find(command.idempotencyKey),
          expectedFingerprint,
        );
        if (replay !== null) return replay;

        const current = await operations.attempts.findById(command.attemptId);
        if (current === null) {
          throw new ApplicationError("not_found", "Attempt was not found");
        }

        const waiting =
          current.status === "SUBMETIDA"
            ? transitionAttempt(current, { type: "AGUARDAR_CORRECAO_HUMANA" })
            : current;
        if (waiting !== current) {
          await operations.attempts.update(waiting);
        }
        const corrected = transitionAttempt(waiting, {
          type: "CORRIGIR_HUMANAMENTE",
        });
        const latest = await operations.results.findLatest(current.attemptId);
        const correctedAt = new Date().toISOString();
        const result = createAssessmentResult({
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

        await operations.attempts.update(corrected);
        await operations.results.insert(result);
        await operations.eventPublisher.publish({
          eventId: dependencies.idFactory(),
          eventType: "assessment.corrected.v1",
          aggregateType: "attempt",
          aggregateId: corrected.attemptId,
          occurredAt: correctedAt,
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
        });
        await operations.audit.append(
          createAuditEntry({
            auditId: dependencies.idFactory(),
            principalId: command.principalId,
            action: "ATTEMPT_CORRECTED",
            resourceType: "attempt",
            resourceId: corrected.attemptId,
            scopeId: command.scopeId,
            outcome: "SUCCESS",
            reasonCode: "human_correction_saved",
            requestId: command.correlationId,
            correlationId: command.correlationId,
            occurredAt: correctedAt,
          }),
        );

        const response = Object.freeze({ attempt: corrected, result });
        await operations.idempotency.store(command.idempotencyKey, {
          fingerprint: expectedFingerprint,
          result: response,
        });
        return response;
      },
      { scopeId: command.scopeId },
    );
  } catch (error) {
    throw normalizeCorrectionError(error);
  }
}
