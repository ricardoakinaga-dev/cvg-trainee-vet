import { describe, expect, it } from "vitest";

import { AssessmentDomainError, createAssessmentResult } from "./assessment.js";

const input = {
  resultId: "11111111-1111-4111-8111-111111111111",
  attemptId: "22222222-2222-4222-8222-222222222222",
  version: 1,
  kind: "HUMANA" as const,
  score: 80,
  outcome: "APROVADO" as const,
  feedback: "Feedback formativo interno.",
  ruleVersion: "rubrica-v1",
  correctedBy: "33333333-3333-4333-8333-333333333333",
  correctedAt: "2026-08-09T17:00:00.000Z",
};

describe("assessment result domain", () => {
  it("creates an immutable, versioned result", () => {
    const result = createAssessmentResult(input);

    expect(result).toEqual(input);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("rejects invalid score, feedback, kind, outcome, version, and timestamp", () => {
    expect(() => createAssessmentResult({ ...input, score: -1 })).toThrow(
      AssessmentDomainError,
    );
    expect(() => createAssessmentResult({ ...input, score: 101 })).toThrow(
      "score",
    );
    expect(() =>
      createAssessmentResult({ ...input, feedback: "<b>x</b>" }),
    ).toThrow("plain text");
    expect(() =>
      createAssessmentResult({ ...input, kind: "OTHER" as never }),
    ).toThrow("kind");
    expect(() =>
      createAssessmentResult({ ...input, outcome: "OTHER" as never }),
    ).toThrow("outcome");
    expect(() => createAssessmentResult({ ...input, version: 0 })).toThrow(
      "version",
    );
    expect(() =>
      createAssessmentResult({ ...input, correctedAt: "invalid" }),
    ).toThrow("correctedAt");
    expect(() =>
      createAssessmentResult({ ...input, correctedAt: "2026-08-10" }),
    ).toThrow("correctedAt");
  });
});
