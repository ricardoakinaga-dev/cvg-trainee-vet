import { describe, expect, it, vi } from "vitest";

import { getAttemptFeedback } from "./feedback-use-cases.js";

describe("participant feedback query", () => {
  it("reads only the correction associated with the participant attempt", async () => {
    const repository = {
      findByParticipantAndAttempt: vi.fn(async () => null),
    };

    await expect(
      getAttemptFeedback(
        { participantId: "participant-1", attemptId: "attempt-1" },
        repository,
      ),
    ).resolves.toBeNull();
    expect(repository.findByParticipantAndAttempt).toHaveBeenCalledWith(
      "participant-1",
      "attempt-1",
    );
  });

  it("rejects empty identity at the application boundary", async () => {
    const repository = { findByParticipantAndAttempt: vi.fn() };

    await expect(
      getAttemptFeedback(
        { participantId: " ", attemptId: "attempt-1" },
        repository,
      ),
    ).rejects.toThrow("participantId");
    await expect(
      getAttemptFeedback(
        { participantId: "participant-1", attemptId: " " },
        repository,
      ),
    ).rejects.toThrow("attemptId");
  });
});
