import { describe, expect, it } from "vitest";

import {
  parseParticipantAttempt,
  saveAnswerRequestSchema,
  submitAttemptRequestSchema,
} from "./assessment.js";

const ids = {
  attemptId: "11111111-1111-4111-8111-111111111111",
  activityId: "33333333-3333-4333-8333-333333333333",
  itemId: "55555555-5555-4555-8555-555555555555",
};

describe("assessment contracts", () => {
  it("accepts a bounded answer save command", () => {
    expect(
      saveAnswerRequestSchema.parse({
        ...ids,
        response: "Resposta do participante",
        idempotencyKey: "answer-save-2026-08-09-0001",
      }),
    ).toMatchObject({ response: "Resposta do participante" });
  });

  it("rejects empty answers, malformed identifiers, and unknown fields", () => {
    expect(() =>
      saveAnswerRequestSchema.parse({
        ...ids,
        response: "   ",
        idempotencyKey: "short",
      }),
    ).toThrow();

    expect(() =>
      saveAnswerRequestSchema.parse({
        ...ids,
        response: "<script>unsafe</script>",
        idempotencyKey: "answer-save-2026-08-09-0001",
      }),
    ).toThrow();

    expect(() =>
      saveAnswerRequestSchema.parse({
        ...ids,
        attemptId: "not-an-id",
        response: "Resposta válida",
        idempotencyKey: "answer-save-2026-08-09-0001",
      }),
    ).toThrow();

    expect(() =>
      saveAnswerRequestSchema.parse({
        ...ids,
        response: "Resposta válida",
        idempotencyKey: "answer-save-2026-08-09-0001",
        prompt: "não pertence ao comando",
      }),
    ).toThrow();
  });

  it("accepts submit commands only with the request idempotency key", () => {
    expect(
      submitAttemptRequestSchema.parse({
        attemptId: ids.attemptId,
        idempotencyKey: "attempt-submit-2026-08-09-0001",
      }),
    ).toEqual({
      attemptId: ids.attemptId,
      idempotencyKey: "attempt-submit-2026-08-09-0001",
    });
  });

  it("parses participant projection without allowing editorial internals", () => {
    const projection = parseParticipantAttempt({
      attemptId: ids.attemptId,
      activityId: ids.activityId,
      status: "SALVA",
      version: 2,
      answers: [
        {
          itemId: ids.itemId,
          response: "Resposta registrada",
          savedAt: "2026-08-09T17:00:00.000Z",
        },
      ],
      feedback: "Revise o objetivo indicado.",
    });

    expect(projection.answers[0]?.response).toBe("Resposta registrada");
    expect(() =>
      parseParticipantAttempt({
        attemptId: ids.attemptId,
        activityId: ids.activityId,
        status: "SALVA",
        version: 2,
        answers: [],
        source_record_id: "internal-only",
      }),
    ).toThrow();

    expect(() =>
      parseParticipantAttempt({
        attemptId: ids.attemptId,
        activityId: ids.activityId,
        status: "SALVA",
        version: 2,
        answers: [
          {
            itemId: ids.itemId,
            response: "<b>unsafe</b>",
            savedAt: "2026-08-09T17:00:00.000Z",
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects public projections containing answer keys or internal AI fields", () => {
    expect(() =>
      parseParticipantAttempt({
        attemptId: ids.attemptId,
        activityId: ids.activityId,
        status: "SUBMETIDA",
        version: 3,
        answers: [],
        answer_key: "hidden",
      }),
    ).toThrow();

    expect(() =>
      parseParticipantAttempt({
        attemptId: ids.attemptId,
        activityId: ids.activityId,
        status: "SUBMETIDA",
        version: 3,
        answers: [],
        ai_response: "hidden",
      }),
    ).toThrow();
  });
});
