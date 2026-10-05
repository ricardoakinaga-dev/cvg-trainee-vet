import { expect, it, vi } from "vitest";
import { getParticipantAttempt } from "./participant-attempt-read.js";
import type { ParticipantAttemptSnapshot } from "./participant-attempt-read.js";

const snapshot: ParticipantAttemptSnapshot = {
  attempt: {
    attemptId: "attempt-own",
    participantId: "participant-own",
    activityId: "activity-own",
    status: "SALVA",
    version: 2,
  },
  answers: [
    {
      answerId: "answer-own",
      attemptId: "attempt-own",
      itemId: "item-own",
      response: "synthetic",
      savedAt: "2026-10-03T12:00:00.000Z",
    },
  ],
};
it("returns the immutable authorized snapshot", async () => {
  const findOwnAttempt = vi.fn(async () => snapshot);
  const result = await getParticipantAttempt("participant-own", "attempt-own", {
    findOwnAttempt,
  });
  expect(result).toEqual(snapshot);
  expect(Object.isFrozen(result.answers)).toBe(true);
  expect(findOwnAttempt).toHaveBeenCalledWith("participant-own", "attempt-own");
});
it.each([
  null,
  { ...snapshot, attempt: { ...snapshot.attempt, participantId: "foreign" } },
  { ...snapshot, attempt: { ...snapshot.attempt, attemptId: "foreign" } },
])("denies unavailable or foreign attempts", async (value) => {
  await expect(
    getParticipantAttempt("participant-own", "attempt-own", {
      findOwnAttempt: async () => value,
    }),
  ).rejects.toMatchObject({ code: "not_found" });
});
it("rejects cross-attempt answers from a broken adapter", async () => {
  await expect(
    getParticipantAttempt("participant-own", "attempt-own", {
      findOwnAttempt: async () => ({
        ...snapshot,
        answers: [{ ...snapshot.answers[0]!, attemptId: "foreign" }],
      }),
    }),
  ).rejects.toMatchObject({ code: "internal_error" });
});
