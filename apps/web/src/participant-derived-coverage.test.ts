import { describe, expect, it } from "vitest";

import { deriveParticipantState } from "../app/participant-derived.js";
import type {
  ActivityProjection,
  AttemptProjection,
} from "../app/participant-model.js";

const activity = {
  activityId: "activity-derived",
  slug: "m01-derived",
  title: "Atividade sintética",
  items: [
    {
      itemId: "text",
      ordinal: 1,
      kind: "QUESTAO",
      title: "Texto",
      text: "Explique.",
      responseMode: "TEXT",
    },
    {
      itemId: "info",
      ordinal: 2,
      kind: "INFO",
      title: "Informação",
      text: "Leia.",
      responseMode: "NONE",
    },
    {
      itemId: "choice",
      ordinal: 3,
      kind: "QUESTAO",
      title: "Escolha",
      text: "Selecione.",
      responseMode: "CHOICE",
      choices: [
        { id: "a", label: "A", text: "Primeira" },
        { id: "b", label: "B", text: "Segunda" },
      ],
      selectionMode: "SINGLE",
    },
    {
      itemId: "second-text",
      ordinal: 4,
      kind: "QUESTAO",
      title: "Segundo texto",
      text: "Continue.",
      responseMode: "TEXT",
    },
  ],
} as const satisfies ActivityProjection;

const attempt = {
  attemptId: "attempt-derived",
  activityId: "activity-derived",
  status: "EM_ANDAMENTO",
  version: 1,
  answers: [],
} as const satisfies AttemptProjection;

describe("participant derived state", () => {
  it("handles empty previews and an activity without an attempt", () => {
    expect(deriveParticipantState(null, null, {}, 0, "idle")).toMatchObject({
      answerableItems: [],
      progressPercent: 0,
      totalBlocks: 0,
      visibleItems: [],
      blockStartOrdinal: 0,
      blockEndOrdinal: 0,
      hasNextPage: false,
    });

    const preview = deriveParticipantState(
      activity,
      null,
      { text: "Resposta" },
      0,
      "saved",
    );
    expect(preview).toMatchObject({
      answeredItemCount: 1,
      progressPercent: 33,
      totalBlocks: 2,
      visibleItems: activity.items.slice(0, 3),
      currentBlockAnswerableItems: [activity.items[0], activity.items[2]],
      currentBlockAnsweredCount: 1,
      blockStartOrdinal: 1,
      blockEndOrdinal: 3,
      hasNextPage: true,
      pageSaveState: "saved",
    });
  });

  it("derives paginated answered progress for an active attempt", () => {
    const state = deriveParticipantState(
      activity,
      attempt,
      { text: "Resposta", choice: "a", "second-text": "Outra resposta" },
      1,
      "saving",
    );
    expect(state.answerableItems).toHaveLength(3);
    expect(state.answeredItemCount).toBe(3);
    expect(state.progressPercent).toBe(100);
    expect(state.visibleItems).toEqual([activity.items[3]]);
    expect(state.currentBlockAnswerableItems).toEqual([activity.items[3]]);
    expect(state.currentBlockAnsweredCount).toBe(1);
    expect(state.blockStartOrdinal).toBe(4);
    expect(state.blockEndOrdinal).toBe(4);
    expect(state.hasNextPage).toBe(false);
  });
});
