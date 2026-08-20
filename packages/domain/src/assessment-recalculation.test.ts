import { describe, expect, it } from "vitest";

import {
  recalculateAssessment,
  type AssessmentRecalculationInput,
} from "./assessment-recalculation.js";

const input: AssessmentRecalculationInput = {
  candidateId: "candidate-1",
  participantId: "participant-1",
  scopeId: "scope-1",
  attemptId: "attempt-1",
  itemId: "item-1",
  previousVersion: 2,
  previousScore: 50,
  previousOutcome: "REFORCO",
  correctCount: 8,
  eligibleItemCount: 10,
  passingScore: 70,
  reason: "ITEM_ANNULLED",
  recalculatedAt: "2026-08-14T12:00:00.000Z",
};

describe("assessment recalculation", () => {
  it("creates a deterministic new version while preserving the previous version", () => {
    const result = recalculateAssessment(input);

    expect(result).toMatchObject({
      candidateId: "candidate-1",
      previousVersion: 2,
      recalculatedVersion: 3,
      recalculatedScore: 80,
      recalculatedOutcome: "APROVADO",
      notificationRequired: true,
      automaticDecision: "NONE",
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("rejects inconsistent counts, versions, and unsupported reasons", () => {
    expect(() => recalculateAssessment({ ...input, correctCount: 11 })).toThrow(
      "correctCount",
    );
    expect(() =>
      recalculateAssessment({ ...input, previousVersion: 0 }),
    ).toThrow("previousVersion");
    expect(() =>
      recalculateAssessment({ ...input, reason: "AUTOMATIC" as never }),
    ).toThrow("reason");
  });

  it("rejects malformed boundary values and preserves a reinforcement outcome", () => {
    for (const field of [
      "candidateId",
      "participantId",
      "scopeId",
      "attemptId",
      "itemId",
    ] as const) {
      expect(() => recalculateAssessment({ ...input, [field]: " " })).toThrow(
        field,
      );
    }
    expect(() =>
      recalculateAssessment({ ...input, previousScore: 101 }),
    ).toThrow("previousScore");
    expect(() =>
      recalculateAssessment({ ...input, previousOutcome: "UNKNOWN" as never }),
    ).toThrow("previousOutcome");
    expect(() =>
      recalculateAssessment({ ...input, eligibleItemCount: 0 }),
    ).toThrow("eligibleItemCount");
    expect(() => recalculateAssessment({ ...input, correctCount: -1 })).toThrow(
      "correctCount",
    );
    expect(() =>
      recalculateAssessment({ ...input, passingScore: 101 }),
    ).toThrow("passingScore");
    expect(() =>
      recalculateAssessment({ ...input, recalculatedAt: "invalid" }),
    ).toThrow("recalculatedAt");

    const result = recalculateAssessment({
      ...input,
      correctCount: 2,
      eligibleItemCount: 10,
      passingScore: 70,
      reason: "ANSWER_KEY_CHANGED",
    });
    expect(result.recalculatedOutcome).toBe("REFORCO");
  });
});
