import {
  buildSourceConflictDecision,
  SourceConflictDomainError,
  type SourceConflictDecision,
  type SourceConflictDecisionState,
} from "@cvg/domain";

import { canAccess, type AccountStatus, type Role } from "./authorization.js";
import { ApplicationError } from "./errors.js";
import type { ClinicalApproverPort } from "./authoring-use-cases.js";

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

export type SourceConflictDecisionDependencies = Readonly<{
  readonly save: SourceConflictDecisionWritePort["save"];
  readonly approver: ClinicalApproverPort;
}>;

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

async function assertCurrentClinicalApprover(
  command: RecordSourceConflictDecisionCommand,
  approver: ClinicalApproverPort,
): Promise<void> {
  const current = await approver.findById(command.principalId);
  if (
    current === null ||
    current.accountStatus !== "ACTIVE" ||
    !current.roles.includes("CLINICAL_APPROVER") ||
    !current.scopes.includes(command.scopeId)
  ) {
    throw new ApplicationError(
      "forbidden",
      "Current clinical approver is not active in the requested scope",
    );
  }
}

export async function recordSourceConflictDecision(
  command: RecordSourceConflictDecisionCommand,
  dependencies: SourceConflictDecisionDependencies,
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

  // The static approvedClinicalApproverId is a hint, not proof: revalidate the
  // current persisted identity so suspension/role/scope revocation is honored.
  await assertCurrentClinicalApprover(command, dependencies.approver);

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
    return await dependencies.save(state);
  } catch (error) {
    throw normalizeError(error);
  }
}
