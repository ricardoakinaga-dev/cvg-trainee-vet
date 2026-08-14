import { describe, expect, it } from "vitest";

import {
  assessmentRecalculationBatchRequestSchema,
  assessmentRecalculationRequestSchema,
  parseAssessmentRecalculationResult,
} from "./assessment-recalculation.js";

const request = {
  scopeId: "scope-1",
  itemId: "item-1",
  reason: "ITEM_ANNULLED",
  passingScore: 70,
  recalculatedAt: "2026-08-14T12:00:00.000Z",
};

const candidate = {
  candidateId: "00000000-0000-4000-8000-000000000001",
  participantId: "00000000-0000-4000-8000-000000000002",
  scopeId: "00000000-0000-4000-8000-000000000003",
  attemptId: "00000000-0000-4000-8000-000000000004",
  itemId: "00000000-0000-4000-8000-000000000005",
  previousVersion: 2,
  previousScore: 50,
  previousOutcome: "REFORCO",
  correctCount: 8,
  eligibleItemCount: 10,
} as const;

describe("assessment recalculation contracts", () => {
  it("accepts the internal command and returns version-preserving results", () => {
    expect(assessmentRecalculationRequestSchema.parse(request)).toEqual(
      request,
    );
    expect(
      assessmentRecalculationBatchRequestSchema.parse({
        ...request,
        candidates: [candidate],
      }),
    ).toMatchObject({ candidates: [candidate] });
    expect(
      parseAssessmentRecalculationResult({
        processedCount: 1,
        notificationsQueued: 1,
        results: [
          {
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
            recalculatedAt: request.recalculatedAt,
            recalculatedVersion: 3,
            recalculatedScore: 80,
            recalculatedOutcome: "APROVADO",
            notificationRequired: true,
            automaticDecision: "NONE",
          },
        ],
      }),
    ).toMatchObject({ processedCount: 1, notificationsQueued: 1 });
  });

  it("rejects participant-facing or automatic decision fields", () => {
    expect(() =>
      assessmentRecalculationRequestSchema.parse({
        ...request,
        participantId: "participant-1",
      }),
    ).toThrow();
    expect(() =>
      assessmentRecalculationBatchRequestSchema.parse({
        ...request,
        candidates: [{ ...candidate, correctCount: 11 }],
      }),
    ).toThrow();
    expect(() =>
      parseAssessmentRecalculationResult({
        processedCount: 0,
        notificationsQueued: 0,
        results: [],
        automaticDecision: "RECALCULATE",
      }),
    ).toThrow();
  });
});
