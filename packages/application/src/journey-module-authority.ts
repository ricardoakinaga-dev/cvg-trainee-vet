import type { AttemptStatus, LearningAssignmentStatus } from "@cvg/domain";
import type { ScopedLearningAssignment } from "./learning-state-use-cases.js";

/**
 * Minimal completion fact read from the trusted receipt store. It carries no
 * approval, audit, request, hash or witness internal; only the identity a
 * prerequisite decision is allowed to compare.
 */
export type ModuleCompletionReceiptFact = Readonly<{
  participantId: string;
  scopeId: string;
  moduleId: string;
  assignmentId: string;
  completedAt: string;
  completedAssignmentVersion: number;
}>;

export type ModuleAuthorityFacts = Readonly<{
  participantId: string;
  assignments: readonly ScopedLearningAssignment[];
  activities: readonly Readonly<{
    scopeId: string;
    moduleId?: string;
    learningAssignmentId?: string;
    status: LearningAssignmentStatus;
    nextAction: string;
    attemptStatus?: AttemptStatus;
    attemptId?: string;
  }>[];
  completionReceipts?: readonly ModuleCompletionReceiptFact[];
  boundAssignmentIds?: readonly string[];
}>;

const concludedStatuses: readonly LearningAssignmentStatus[] = [
  "CONCLUIDO",
  "CONCLUIDO_COM_RETENCAO_PENDENTE",
];
const concludedNextActions: readonly string[] = [
  "REVISAR_PROXIMO_CONTEUDO",
  "CONSULTAR_PROXIMO_PASSO",
];
const correctedAttemptStatuses: readonly string[] = [
  "CORRIGIDA_AUTOMATICAMENTE",
  "CORRIGIDA_HUMANAMENTE",
];

/**
 * Completion authority is receipt-backed once an obligation inventory has been
 * bound to the assignment: a stored receipt addressed to this participant,
 * scope, module and to the assignment version it was recorded for is the only
 * proof, so a later pending attempt or a low retention review can neither
 * create nor revoke the completed prerequisite (RN-032); a bound assignment
 * without a receipt is denied whatever its status says. While no inventory is
 * bound — the transitional state in which no native producer has published one
 * yet — the pre-receipt status authority still decides, so the journey is not
 * locked ahead of the producer chain (RN-015); that fallback is recorded as
 * debt and disappears the moment a binding exists.
 */
export function hasCoherentModuleCompletion(
  state: ModuleAuthorityFacts,
  scopeId: string,
  moduleId: string,
): boolean {
  const assignments = state.assignments.filter(
    (assignment) =>
      assignment.scopeId === scopeId &&
      assignment.state.participantId === state.participantId &&
      assignment.state.moduleId === moduleId,
  );
  if (assignments.length === 0) return false;
  if (matchesCompletionReceipt(state, assignments, scopeId, moduleId))
    return true;
  if (isObligationBound(state, assignments)) return false;
  return matchesConcludedStatus(state, assignments, scopeId, moduleId);
}

function matchesCompletionReceipt(
  state: ModuleAuthorityFacts,
  assignments: readonly ScopedLearningAssignment[],
  scopeId: string,
  moduleId: string,
): boolean {
  return (state.completionReceipts ?? []).some(
    (receipt) =>
      receipt.participantId === state.participantId &&
      receipt.scopeId === scopeId &&
      receipt.moduleId === moduleId &&
      Number.isFinite(Date.parse(receipt.completedAt)) &&
      Number.isInteger(receipt.completedAssignmentVersion) &&
      receipt.completedAssignmentVersion >= 0 &&
      assignments.some(
        ({ state: assignment }) =>
          assignment.assignmentId === receipt.assignmentId &&
          assignment.version === receipt.completedAssignmentVersion,
      ),
  );
}

function isObligationBound(
  state: ModuleAuthorityFacts,
  assignments: readonly ScopedLearningAssignment[],
): boolean {
  const bound = new Set(state.boundAssignmentIds ?? []);
  return assignments.some(({ state: assignment }) =>
    bound.has(assignment.assignmentId),
  );
}

function matchesConcludedStatus(
  state: ModuleAuthorityFacts,
  assignments: readonly ScopedLearningAssignment[],
  scopeId: string,
  moduleId: string,
): boolean {
  if (
    assignments.some(
      ({ state: assignment }) => !concludedStatuses.includes(assignment.status),
    )
  )
    return false;
  const assignmentIds = new Set(
    assignments.map(({ state: assignment }) => assignment.assignmentId),
  );
  return state.activities
    .filter(
      (activity) =>
        activity.scopeId === scopeId && activity.moduleId === moduleId,
    )
    .every(
      (activity) =>
        activity.learningAssignmentId !== undefined &&
        assignmentIds.has(activity.learningAssignmentId) &&
        concludedStatuses.includes(activity.status) &&
        concludedNextActions.includes(activity.nextAction) &&
        ((activity.attemptStatus === undefined &&
          activity.attemptId === undefined) ||
          correctedAttemptStatuses.includes(activity.attemptStatus ?? "")),
    );
}
