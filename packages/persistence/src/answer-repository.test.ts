import { describe, expect, it } from "vitest";

import type { AnswerState, AttemptState } from "@cvg/domain";

import {
  PersistenceMappingError,
  answerIdempotencyRowToRecord,
  answerRowToState,
  answerStateToRow,
} from "./answer-repository.js";
import { answerIdempotency, answers } from "./schema.js";

const answer: AnswerState = {
  answerId: "66666666-6666-4666-8666-666666666666",
  attemptId: "11111111-1111-4111-8111-111111111111",
  itemId: "33333333-3333-4333-8333-333333333333",
  response: "resposta interna do participante",
  savedAt: "2026-08-09T17:00:00.000Z",
};

const attempt: AttemptState = {
  attemptId: answer.attemptId,
  participantId: "22222222-2222-4222-8222-222222222222",
  activityId: "44444444-4444-4444-8444-444444444444",
  status: "SALVA",
  version: 2,
};

describe("PostgreSQL answer mapping", () => {
  it("maps a plain-text answer to a row without exposing event metadata", () => {
    const row = answerStateToRow(answer);

    expect(row).toMatchObject({
      id: answer.answerId,
      attemptId: answer.attemptId,
      itemId: answer.itemId,
      response: answer.response,
      savedAt: new Date(answer.savedAt),
    });
    expect(row).not.toHaveProperty("source");
    expect(row).not.toHaveProperty("photo");
  });

  it("maps a database answer back to an immutable domain state", () => {
    expect(
      answerRowToState({
        id: answer.answerId,
        attemptId: answer.attemptId,
        itemId: answer.itemId,
        response: answer.response,
        savedAt: new Date(answer.savedAt),
      }),
    ).toEqual(answer);
  });

  it("rejects malformed database answers", () => {
    expect(() =>
      answerRowToState({
        id: answer.answerId,
        attemptId: answer.attemptId,
        itemId: answer.itemId,
        response: "<img src=x>",
        savedAt: new Date(answer.savedAt),
      }),
    ).toThrow(PersistenceMappingError);
    expect(() =>
      answerRowToState({
        id: answer.answerId,
        attemptId: answer.attemptId,
        itemId: answer.itemId,
        response: answer.response,
        savedAt: new Date("invalid"),
      }),
    ).toThrow("savedAt");
  });

  it("keeps answer and idempotency tables explicit", () => {
    expect(answers).toBeDefined();
    expect(answerIdempotency).toBeDefined();
  });
});

describe("answer idempotency mapping", () => {
  it("round-trips a replay snapshot without dropping the response", () => {
    const record = answerIdempotencyRowToRecord({
      fingerprint: "answer-fingerprint-1",
      response: { attempt, answer },
    });

    expect(record).toEqual({
      fingerprint: "answer-fingerprint-1",
      result: { attempt, answer },
    });
  });

  it("rejects malformed replay snapshots", () => {
    expect(() =>
      answerIdempotencyRowToRecord({ fingerprint: "", response: {} }),
    ).toThrow(PersistenceMappingError);
  });
});
