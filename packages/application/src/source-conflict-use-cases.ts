import {
  buildSourceConflictDecision,
  SourceConflictDomainError,
  type SourceConflictDecision,
  type SourceConflictDecisionState,
} from "@cvg/domain";

import { canAccess, type AccountStatus, type Role } from "./authorization.js";
import { ApplicationError } from "./errors.js";

export type RecordSourceConflictDecisionCommand = Readonly<{
  readonly principalId: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly approvedClinicalApproverId?: string;
  readonly conflictId: string;
  readonly contentId: string;
  readonly contentVersion: number;
  readonly scopeId: string;
  readonly sourceCodes: readonly string[];
  readonly description: string;
  readonly decision: SourceConflictDecision;
  readonly rationale: string;
  readonly decidedAt: string;
}>;

export interface SourceConflictDecisionWritePort {
  readonly save: (
    state: SourceConflictDecisionState,
  ) => Promise<SourceConflictDecisionState>;
}

function normalizeError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) return error;
  if (error instanceof SourceConflictDomainError) {
    return new ApplicationError("validation_error", error.message);
  }
  return new ApplicationError(
    "internal_error",
    "Source conflict decision could not be recorded",
  );
}

export async function recordSourceConflictDecision(
  command: RecordSourceConflictDecisionCommand,
  repository: SourceConflictDecisionWritePort,
): Promise<SourceConflictDecisionState> {
  if (
    !canAccess({
      principalId: command.principalId,
      accountStatus: command.accountStatus,
      roles: command.roles,
      capability: "APPROVE_CLINICAL_CONTENT",
      resource: { scopeId: command.scopeId },
      scopes: command.scopes,
      ...(command.approvedClinicalApproverId === undefined
        ? {}
        : { approvedClinicalApproverId: command.approvedClinicalApproverId }),
    })
  ) {
    throw new ApplicationError(
      "forbidden",
      "Source conflict decisions require an approved clinical identity",
    );
  }

  try {
    const state = buildSourceConflictDecision({
      conflictId: command.conflictId,
      contentId: command.contentId,
      contentVersion: command.contentVersion,
      scopeId: command.scopeId,
      sourceCodes: command.sourceCodes,
      description: command.description,
      decision: command.decision,
      rationale: command.rationale,
      decidedBy: command.principalId,
      decidedAt: command.decidedAt,
    });
    return await repository.save(state);
  } catch (error) {
    throw normalizeError(error);
  }
}
