import {
  AssessmentRecalculationDomainError,
  recalculateAssessment,
  type AssessmentRecalculationInput,
  type AssessmentRecalculationReason,
  type AssessmentRecalculationState,
} from "@cvg/domain";

import { canAccess, type AccountStatus, type Role } from "./authorization.js";
import { ApplicationError } from "./errors.js";
import type { ClinicalApproverPort } from "./authoring-use-cases.js";

export type AssessmentRecalculationCandidate = Omit<
  AssessmentRecalculationInput,
  "reason" | "recalculatedAt" | "passingScore"
>;

export type AssessmentRecalculationNotification = Readonly<{
  readonly notificationId: string;
  readonly notificationType: "ASSESSMENT_RECALCULATED";
  readonly candidateId: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly attemptId: string;
  readonly itemId: string;
  readonly recalculatedVersion: number;
  readonly occurredAt: string;
}>;

export type RecalculateAffectedAssessmentsCommand = Readonly<{
  readonly principalId: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly approvedClinicalApproverId?: string;
  readonly scopeId: string;
  readonly itemId: string;
  readonly reason: AssessmentRecalculationReason;
  readonly passingScore: number;
  readonly recalculatedAt: string;
}>;

export type RecalculateAffectedAssessmentsResult = Readonly<{
  readonly processedCount: number;
  readonly notificationsQueued: number;
  readonly results: readonly AssessmentRecalculationState[];
}>;

export interface AssessmentRecalculationPort {
  readonly listAffected: (
    scopeId: string,
    itemId: string,
    reason?: AssessmentRecalculationReason,
  ) => Promise<readonly AssessmentRecalculationCandidate[]>;
  readonly save: (state: AssessmentRecalculationState) => Promise<void>;
  readonly notify: (
    notification: AssessmentRecalculationNotification,
  ) => Promise<void>;
}

export interface AssessmentRecalculationCandidateWritePort {
  readonly register: (
    candidate: AssessmentRecalculationCandidate,
    reason: AssessmentRecalculationReason,
  ) => Promise<void>;
}

export type RegisterAssessmentRecalculationCandidatesCommand =
  RecalculateAffectedAssessmentsCommand &
    Readonly<{
      readonly candidates: readonly AssessmentRecalculationCandidate[];
    }>;

function normalizeError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) return error;
  if (error instanceof AssessmentRecalculationDomainError) {
    return new ApplicationError("validation_error", error.message);
  }
  return new ApplicationError(
    "internal_error",
    "Affected assessments could not be recalculated",
  );
}

function assertApprovedRecalculationAccess(
  command: RecalculateAffectedAssessmentsCommand,
): void {
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
      "Recalculation requires an approved clinical identity",
    );
  }
}

async function assertCurrentClinicalApproverIdentity(
  command: RecalculateAffectedAssessmentsCommand,
  approver: ClinicalApproverPort,
): Promise<void> {
  const current = await approver.findById(command.principalId);
  if (
    current === null ||
    current.accountStatus !== "ACTIVE" ||
    !current.scopes.includes(command.scopeId)
  ) {
    throw new ApplicationError(
      "forbidden",
      "Current clinical approver is not active in the requested scope",
    );
  }
}

export async function registerAssessmentRecalculationCandidates(
  command: RegisterAssessmentRecalculationCandidatesCommand,
  repository: AssessmentRecalculationCandidateWritePort,
  approver: ClinicalApproverPort,
): Promise<Readonly<{ readonly registeredCount: number }>> {
  assertApprovedRecalculationAccess(command);
  await assertCurrentClinicalApproverIdentity(command, approver);
  try {
    for (const candidate of command.candidates) {
      if (
        candidate.scopeId !== command.scopeId ||
        candidate.itemId !== command.itemId
      ) {
        throw new ApplicationError(
          "state_conflict",
          "Candidate crossed the requested scope or item",
        );
      }
      recalculateAssessment({
        ...candidate,
        reason: command.reason,
        passingScore: command.passingScore,
        recalculatedAt: command.recalculatedAt,
      });
      await repository.register(candidate, command.reason);
    }
    return Object.freeze({ registeredCount: command.candidates.length });
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function recalculateAffectedAssessments(
  command: RecalculateAffectedAssessmentsCommand,
  repository: AssessmentRecalculationPort,
  approver: ClinicalApproverPort,
): Promise<RecalculateAffectedAssessmentsResult> {
  assertApprovedRecalculationAccess(command);
  await assertCurrentClinicalApproverIdentity(command, approver);

  try {
    const candidates = await repository.listAffected(
      command.scopeId,
      command.itemId,
      command.reason,
    );
    const results: AssessmentRecalculationState[] = [];
    for (const candidate of candidates) {
      if (
        candidate.scopeId !== command.scopeId ||
        candidate.itemId !== command.itemId
      ) {
        throw new ApplicationError(
          "state_conflict",
          "Affected assessment crossed the requested scope or item",
        );
      }
      const state = recalculateAssessment({
        ...candidate,
        reason: command.reason,
        passingScore: command.passingScore,
        recalculatedAt: command.recalculatedAt,
      });
      await repository.save(state);
      await repository.notify({
        notificationId: `assessment-recalculated:${state.candidateId}:${state.recalculatedVersion}`,
        notificationType: "ASSESSMENT_RECALCULATED",
        candidateId: state.candidateId,
        participantId: state.participantId,
        scopeId: state.scopeId,
        attemptId: state.attemptId,
        itemId: state.itemId,
        recalculatedVersion: state.recalculatedVersion,
        occurredAt: state.recalculatedAt,
      });
      results.push(state);
    }
    return Object.freeze({
      processedCount: results.length,
      notificationsQueued: results.length,
      results: Object.freeze(results),
    });
  } catch (error) {
    throw normalizeError(error);
  }
}
