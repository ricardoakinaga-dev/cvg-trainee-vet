import type { AttemptStatus } from "@cvg/domain";

import { ApplicationError } from "./errors.js";

export type AssignmentStatus =
  | "ATRIBUIDO"
  | "DISPONIVEL"
  | "EM_ANDAMENTO"
  | "CONCLUIDO"
  | "EM_REFORCO"
  | "CONCLUIDO_COM_RETENCAO_PENDENTE"
  | "PAUSADO"
  | "BLOQUEADO";

export type ProgressNextAction =
  | "INICIAR_ATIVIDADE"
  | "RETOMAR_ATIVIDADE"
  | "AGUARDAR_CORRECAO"
  | "REVISAR_PROXIMO_CONTEUDO"
  | "CONSULTAR_PROXIMO_PASSO";

export type ParticipantProgressState = Readonly<{
  readonly participantId: string;
  readonly activityId: string;
  readonly scopeId: string;
  readonly assignmentStatus: AssignmentStatus;
  readonly attemptId?: string;
  readonly attemptStatus?: AttemptStatus;
  readonly attemptVersion?: number;
  readonly nextAction: ProgressNextAction;
}>;

export type GetParticipantProgressCommand = Readonly<{
  readonly participantId: string;
  readonly activityId: string;
}>;

export interface ProgressReadPort {
  readonly findParticipantProgress: (
    participantId: string,
    activityId: string,
  ) => Promise<ParticipantProgressState | null>;
}

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

export function deriveProgressNextAction(
  assignmentStatus: AssignmentStatus,
  attemptStatus: AttemptStatus | undefined,
): ProgressNextAction {
  if (
    attemptStatus === "SUBMETIDA" ||
    attemptStatus === "AGUARDA_CORRECAO_HUMANA"
  ) {
    return "AGUARDAR_CORRECAO";
  }
  if (
    attemptStatus === "CORRIGIDA_AUTOMATICAMENTE" ||
    attemptStatus === "CORRIGIDA_HUMANAMENTE"
  ) {
    return "REVISAR_PROXIMO_CONTEUDO";
  }
  if (
    attemptStatus === "CRIADA" ||
    attemptStatus === "EM_ANDAMENTO" ||
    attemptStatus === "SALVA"
  ) {
    return "RETOMAR_ATIVIDADE";
  }
  if (assignmentStatus === "DISPONIVEL" || assignmentStatus === "ATRIBUIDO") {
    return "INICIAR_ATIVIDADE";
  }
  if (assignmentStatus === "EM_REFORCO") {
    return "INICIAR_ATIVIDADE";
  }
  if (assignmentStatus === "CONCLUIDO") {
    return "REVISAR_PROXIMO_CONTEUDO";
  }
  return "CONSULTAR_PROXIMO_PASSO";
}

export async function getParticipantProgress(
  command: GetParticipantProgressCommand,
  repository: ProgressReadPort,
): Promise<ParticipantProgressState> {
  assertNonEmpty(command.participantId, "participantId");
  assertNonEmpty(command.activityId, "activityId");

  const progress = await repository.findParticipantProgress(
    command.participantId,
    command.activityId,
  );
  if (progress === null) {
    throw new ApplicationError(
      "not_found",
      "Activity progress was not found in the current scope",
    );
  }
  if (
    progress.participantId !== command.participantId ||
    progress.activityId !== command.activityId
  ) {
    throw new ApplicationError(
      "forbidden",
      "Activity progress is outside the current scope",
    );
  }

  return Object.freeze({
    ...progress,
    nextAction: deriveProgressNextAction(
      progress.assignmentStatus,
      progress.attemptStatus,
    ),
  });
}
