import type { AttemptStatus } from "@cvg/domain";

import { ApplicationError } from "./errors.js";

export type ReflectionStatus = "NAO_INICIADA" | "EM_ANDAMENTO" | "CONCLUIDA";

export type ReflectionNextAction =
  "INICIAR_REFLEXAO" | "RETOMAR_REFLEXAO" | "ENVIAR_REFLEXAO" | "PROXIMA_ACAO";

export type ParticipantReflectionAnswer = Readonly<{
  readonly itemId: string;
  readonly response: string;
  readonly savedAt: string;
}>;

export type DeriveReflectionStateCommand = Readonly<{
  readonly itemIds: readonly string[];
  readonly attemptStatus: AttemptStatus | undefined;
  readonly answers: readonly ParticipantReflectionAnswer[];
}>;

export type ParticipantReflectionState = Readonly<{
  readonly status: ReflectionStatus;
  readonly nextAction: ReflectionNextAction;
  readonly itemCount: number;
  readonly answeredItemCount: number;
  readonly answers: readonly ParticipantReflectionAnswer[];
  readonly evidence: "REFLEXAO_DIGITAL";
  readonly practicalCompetenceClaim: "PROIBIDO_MVP";
}>;

const submittedAttemptStatuses: readonly AttemptStatus[] = [
  "SUBMETIDA",
  "CORRIGIDA_AUTOMATICAMENTE",
  "AGUARDA_CORRECAO_HUMANA",
  "CORRIGIDA_HUMANAMENTE",
];

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function normalizeItemIds(itemIds: readonly string[]): readonly string[] {
  if (itemIds.length === 0 || itemIds.length > 100) {
    throw new ApplicationError(
      "validation_error",
      "reflection item count is invalid",
    );
  }
  const normalized = itemIds.map((itemId) => {
    assertNonEmpty(itemId, "itemId");
    return itemId.trim();
  });
  if (new Set(normalized).size !== normalized.length) {
    throw new ApplicationError(
      "validation_error",
      "reflection item ids must be unique",
    );
  }
  return Object.freeze(normalized);
}

function normalizeAnswers(
  answers: readonly ParticipantReflectionAnswer[],
  itemIds: readonly string[],
): readonly ParticipantReflectionAnswer[] {
  const itemSet = new Set(itemIds);
  const seen = new Set<string>();
  const normalized = answers.map((answer) => {
    assertNonEmpty(answer.itemId, "answer.itemId");
    assertNonEmpty(answer.response, "answer.response");
    assertNonEmpty(answer.savedAt, "answer.savedAt");
    const itemId = answer.itemId.trim();
    if (!itemSet.has(itemId)) {
      throw new ApplicationError(
        "forbidden",
        "reflection answer is outside the current activity",
      );
    }
    if (seen.has(itemId)) {
      throw new ApplicationError(
        "validation_error",
        "reflection answers must be unique by item",
      );
    }
    seen.add(itemId);
    return Object.freeze({
      itemId,
      response: answer.response.trim(),
      savedAt: answer.savedAt,
    });
  });
  return Object.freeze(
    [...normalized].sort(
      (left, right) =>
        itemIds.indexOf(left.itemId) - itemIds.indexOf(right.itemId),
    ),
  );
}

export function deriveReflectionState(
  command: DeriveReflectionStateCommand,
): ParticipantReflectionState {
  const itemIds = normalizeItemIds(command.itemIds);
  const answers = normalizeAnswers(command.answers, itemIds);
  const itemCount = itemIds.length;
  const answeredItemCount = answers.length;
  const allItemsAnswered = answeredItemCount === itemCount;
  const hasAttempt = command.attemptStatus !== undefined;
  if (!hasAttempt && answeredItemCount > 0) {
    throw new ApplicationError(
      "validation_error",
      "reflection answers require an attempt",
    );
  }
  const submitted =
    command.attemptStatus !== undefined &&
    submittedAttemptStatuses.includes(command.attemptStatus);
  const status: ReflectionStatus =
    allItemsAnswered && submitted
      ? "CONCLUIDA"
      : hasAttempt
        ? "EM_ANDAMENTO"
        : "NAO_INICIADA";
  const nextAction: ReflectionNextAction =
    status === "CONCLUIDA"
      ? "PROXIMA_ACAO"
      : !hasAttempt
        ? "INICIAR_REFLEXAO"
        : allItemsAnswered
          ? "ENVIAR_REFLEXAO"
          : "RETOMAR_REFLEXAO";

  return Object.freeze({
    status,
    nextAction,
    itemCount,
    answeredItemCount,
    answers,
    evidence: "REFLEXAO_DIGITAL" as const,
    practicalCompetenceClaim: "PROIBIDO_MVP" as const,
  });
}
