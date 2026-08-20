import { ITEMS_PER_BLOCK, isAnswerComplete } from "./participant-model";
import type {
  ActivityItem,
  ActivityProjection,
  AttemptProjection,
  PageSaveState,
} from "./participant-model";

export type ParticipantDerivedState = Readonly<{
  readonly answerableItems: readonly ActivityItem[];
  readonly answeredItemCount: number;
  readonly progressPercent: number;
  readonly pageSaveState: PageSaveState;
  readonly totalBlocks: number;
  readonly visibleItems: readonly ActivityItem[];
  readonly currentBlockAnswerableItems: readonly ActivityItem[];
  readonly currentBlockAnsweredCount: number;
  readonly blockStartOrdinal: number;
  readonly blockEndOrdinal: number;
  readonly hasNextPage: boolean;
}>;

export function deriveParticipantState(
  activity: ActivityProjection | null,
  attempt: AttemptProjection | null,
  answers: Readonly<Record<string, string>>,
  questionPage: number,
  pageSaveState: PageSaveState,
): ParticipantDerivedState {
  const answerableItems =
    activity?.items.filter((item) => item.responseMode !== "NONE") ?? [];
  const answeredItemCount = answerableItems.filter((item) =>
    isAnswerComplete(item, answers[item.itemId]),
  ).length;
  const progressPercent =
    answerableItems.length === 0
      ? 0
      : Math.round((answeredItemCount / answerableItems.length) * 100);
  const totalBlocks =
    activity === null
      ? 0
      : Math.max(1, Math.ceil(activity.items.length / ITEMS_PER_BLOCK));
  const activityItems = activity?.items ?? [];
  const visibleItems =
    attempt === null
      ? activityItems.slice(0, ITEMS_PER_BLOCK)
      : activityItems.slice(
          questionPage * ITEMS_PER_BLOCK,
          questionPage * ITEMS_PER_BLOCK + ITEMS_PER_BLOCK,
        );
  const currentBlockAnswerableItems = visibleItems.filter(
    (item) => item.responseMode !== "NONE",
  );
  const currentBlockAnsweredCount = currentBlockAnswerableItems.filter((item) =>
    isAnswerComplete(item, answers[item.itemId]),
  ).length;
  return {
    answerableItems,
    answeredItemCount,
    progressPercent,
    pageSaveState,
    totalBlocks,
    visibleItems,
    currentBlockAnswerableItems,
    currentBlockAnsweredCount,
    blockStartOrdinal: visibleItems[0]?.ordinal ?? 0,
    blockEndOrdinal: visibleItems[visibleItems.length - 1]?.ordinal ?? 0,
    hasNextPage: questionPage < totalBlocks - 1,
  };
}
