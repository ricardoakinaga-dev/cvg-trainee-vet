import { describe, expect, it } from "vitest";

import type { AssessmentResultState, AttemptState } from "@cvg/domain";

import {
  AssessmentMappingError,
  assessmentIdempotencyRowToRecord,
  assessmentResultRowToState,
  assessmentResultStateToRow,
} from "./correction-repository.js";
import { assessmentIdempotency, assessmentResults } from "./schema.js";

const result: AssessmentResultState = {
  resultId: "11111111-1111-4111-8111-111111111111",
  attemptId: "22222222-2222-4222-8222-222222222222",
  version: 1,
  kind: "HUMANA",
  score: 82,
  outcome: "APROVADO",
  feedback: "Feedback interno de teste.",
  ruleVersion: "rubrica-v1",
  correctedBy: "33333333-3333-4333-8333-333333333333",
  correctedAt: "2026-08-09T17:00:00.000Z",
};

const attempt: AttemptState = {
  attemptId: result.attemptId,
  participantId: "44444444-4444-4444-8444-444444444444",
  activityId: "55555555-5555-4555-8555-555555555555",
  status: "CORRIGIDA_HUMANAMENTE",
  version: 5,
};

describe("assessment persistence mapping", () => {
  it("maps a versioned correction without putting feedback in an event row", () => {
    const row = assessmentResultStateToRow(result);

    expect(row).toMatchObject({
      id: result.resultId,
      attemptId: result.attemptId,
      version: result.version,
      score: result.score,
      outcome: result.outcome,
    });
    expect(row.feedback).toBe(result.feedback);
    expect(row).not.toHaveProperty("source");
    expect(row).not.toHaveProperty("photo");
  });

  it("round-trips a database correction and rejects unsafe values", () => {
    expect(
      assessmentResultRowToState({
        id: result.resultId,
        attemptId: result.attemptId,
        version: result.version,
        kind: result.kind,
        score: result.score,
        outcome: result.outcome,
        feedback: result.feedback,
        ruleVersion: result.ruleVersion,
        correctedBy: result.correctedBy,
        correctedAt: new Date(result.correctedAt),
      }),
    ).toEqual(result);
    expect(() =>
      assessmentResultRowToState({
        id: result.resultId,
        attemptId: result.attemptId,
        version: 0,
        kind: result.kind,
        score: 101,
        outcome: result.outcome,
        feedback: "<b>unsafe</b>",
        ruleVersion: result.ruleVersion,
        correctedBy: result.correctedBy,
        correctedAt: new Date("invalid"),
      }),
    ).toThrow(AssessmentMappingError);
  });

  it("round-trips an idempotency snapshot and keeps table contracts explicit", () => {
    expect(
      assessmentIdempotencyRowToRecord({
        fingerprint: "fingerprint-1",
        response: { attempt, result },
      }),
    ).toEqual({ fingerprint: "fingerprint-1", result: { attempt, result } });
    expect(() =>
      assessmentIdempotencyRowToRecord({ fingerprint: "", response: {} }),
    ).toThrow(AssessmentMappingError);
    expect(assessmentResults).toBeDefined();
    expect(assessmentIdempotency).toBeDefined();
  });
});
