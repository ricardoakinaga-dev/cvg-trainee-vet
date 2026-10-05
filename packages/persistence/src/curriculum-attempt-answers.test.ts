import { expect, it } from "vitest";

import {
  decodeNativeAttemptAnswers,
  type NativeAttemptAnswerBinding,
} from "./curriculum-attempt-answers.js";

const attemptId = "11111111-1111-4111-8111-111111111111";
const choiceVersion = "22222222-2222-4222-8222-222222222222";
const textVersion = "33333333-3333-4333-8333-333333333333";
const bindings = [
  {
    contentVersionId: choiceVersion,
    itemId: "M02-S1-Q01",
    responseMode: "CHOICE",
    selectionMode: "SINGLE",
    choices: [{ id: "frozen-A" }, { id: "frozen-B" }],
  },
  {
    contentVersionId: textVersion,
    itemId: "M02-S4-C01",
    responseMode: "TEXT",
  },
] as const satisfies readonly NativeAttemptAnswerBinding[];

it("maps persisted content-version IDs to frozen canonical item IDs", () => {
  const result = decodeNativeAttemptAnswers(attemptId, bindings, [
    { attemptId, itemId: choiceVersion, response: "frozen-A" },
    { attemptId, itemId: textVersion, response: "Synthetic human response." },
  ]);
  expect(result).toEqual([
    {
      attemptId,
      contentVersionId: choiceVersion,
      answer: { itemId: "M02-S1-Q01", selectedChoiceIds: ["frozen-A"] },
    },
    {
      attemptId,
      contentVersionId: textVersion,
      answer: { itemId: "M02-S4-C01", text: "Synthetic human response." },
    },
  ]);
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result[0])).toBe(true);
});

it("uses the captured MULTIPLE projection even when only one key is correct", () => {
  const item = bindings[0];
  if (item === undefined) throw new Error("Fixture binding required");
  expect(
    decodeNativeAttemptAnswers(
      attemptId,
      [{ ...item, selectionMode: "MULTIPLE" }],
      [
        {
          attemptId,
          itemId: choiceVersion,
          response: '["frozen-A","frozen-B"]',
        },
      ],
    ),
  ).toMatchObject([
    { answer: { selectedChoiceIds: ["frozen-A", "frozen-B"] } },
  ]);
});

it.each(
  [
    [
      {
        attemptId: "foreign-attempt",
        itemId: choiceVersion,
        response: "frozen-A",
      },
    ],
    [{ attemptId, itemId: "M02-S1-Q01", response: "frozen-A" }],
    [
      {
        attemptId,
        itemId: "44444444-4444-4444-8444-444444444444",
        response: "frozen-A",
      },
    ],
    [{ attemptId, itemId: choiceVersion, response: "current-draft-choice" }],
    [
      { attemptId, itemId: choiceVersion, response: "frozen-A" },
      { attemptId, itemId: choiceVersion, response: "frozen-B" },
    ],
  ].map((answers) => ({ answers })),
)(
  "rejects foreign, unmapped, malformed or repeated persisted answers",
  ({ answers }) => {
    expect(() =>
      decodeNativeAttemptAnswers(attemptId, bindings, answers),
    ).toThrow(expect.objectContaining({ code: "state_conflict" }));
  },
);

it.each(
  [
    [bindings[0], bindings[0]],
    [bindings[0], { ...bindings[1], itemId: "M02-S1-Q01" }],
    [
      {
        contentVersionId: choiceVersion,
        itemId: "M02-S1-Q01",
        responseMode: "CHOICE" as const,
        choices: bindings[0].choices,
      },
      bindings[1],
    ],
  ].map((items) => ({ items })),
)("rejects ambiguous frozen binding metadata", ({ items }) => {
  expect(() =>
    decodeNativeAttemptAnswers(attemptId, items, [
      { attemptId, itemId: choiceVersion, response: "frozen-A" },
    ]),
  ).toThrow(expect.objectContaining({ code: "state_conflict" }));
});

it("keeps missing responses absent so mandatory completion remains pending", () => {
  expect(decodeNativeAttemptAnswers(attemptId, bindings, [])).toEqual([]);
});
