import type { LearningAssignmentState } from "@cvg/domain";

export function isAssignmentOperationallyAvailable(
  assignment: LearningAssignmentState,
): boolean {
  if (["ATRIBUIDO", "DISPONIVEL"].includes(assignment.status)) {
    return isUnstartedAssignmentAvailable(assignment);
  }
  return [
    "EM_ANDAMENTO",
    "EM_REFORCO",
    "CONCLUIDO",
    "CONCLUIDO_COM_RETENCAO_PENDENTE",
  ].includes(assignment.status);
}

export function isUnstartedAssignmentAvailable(
  assignment: LearningAssignmentState,
  nowMilliseconds: number = Date.now(),
): boolean {
  if (!["ATRIBUIDO", "DISPONIVEL"].includes(assignment.status)) return false;
  const availableAt = Date.parse(assignment.availableAt);
  return (
    Number.isFinite(nowMilliseconds) &&
    Number.isFinite(availableAt) &&
    availableAt <= nowMilliseconds
  );
}
