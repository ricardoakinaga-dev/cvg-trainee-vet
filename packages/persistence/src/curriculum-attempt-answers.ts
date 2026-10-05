import {
  ApplicationError,
  type CurriculumEvaluationAttempt,
} from "@cvg/application";
import {
  decodePersistedModuleAnswer,
  type PersistedModuleAnswerItem,
} from "@cvg/curriculum";

export type NativeAttemptAnswerBinding = Readonly<
  PersistedModuleAnswerItem & { contentVersionId: string }
>;

export type NativePersistedAnswer = Readonly<{
  attemptId: string;
  itemId: string;
  response: string;
}>;

export function decodeNativeAttemptAnswers(
  attemptId: string,
  bindings: readonly NativeAttemptAnswerBinding[],
  answers: readonly NativePersistedAnswer[],
): CurriculumEvaluationAttempt["answers"] {
  const versions = new Map(
    bindings.map((item) => [item.contentVersionId, item]),
  );
  if (
    attemptId.trim().length === 0 ||
    versions.size !== bindings.length ||
    new Set(bindings.map((item) => item.itemId)).size !== bindings.length ||
    bindings.some(
      (item) =>
        item.itemId.trim().length === 0 ||
        item.contentVersionId.trim().length === 0,
    ) ||
    new Set(answers.map((answer) => answer.itemId)).size !== answers.length
  ) {
    throw new ApplicationError(
      "state_conflict",
      "Frozen attempt answer bindings are ambiguous",
    );
  }
  return Object.freeze(
    answers.map((row) => {
      const item = versions.get(row.itemId);
      if (row.attemptId !== attemptId || item === undefined) {
        throw new ApplicationError(
          "state_conflict",
          "Persisted answer is outside its frozen attempt binding",
        );
      }
      try {
        return Object.freeze({
          attemptId,
          contentVersionId: item.contentVersionId,
          answer: decodePersistedModuleAnswer(item, row.response),
        });
      } catch {
        throw new ApplicationError(
          "state_conflict",
          "Persisted answer cannot be decoded from its frozen projection",
        );
      }
    }),
  );
}
