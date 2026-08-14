import { describe, expect, it } from "vitest";

import {
  assessmentRecalculationCandidateRowToCandidate,
  assessmentRecalculationStateToUpdate,
} from "./assessment-recalculation-repository.js";

const row = {
  id: "00000000-0000-4000-8000-000000000001",
  participantId: "00000000-0000-4000-8000-000000000002",
  scopeId: "00000000-0000-4000-8000-000000000003",
  attemptId: "00000000-0000-4000-8000-000000000004",
  itemId: "00000000-0000-4000-8000-000000000005",
  previousVersion: 2,
  previousScore: 50,
  previousOutcome: "REFORCO",
  correctCount: 8,
  eligibleItemCount: 10,
  triggerReason: "ITEM_ANNULLED",
  status: "PENDING",
  createdAt: new Date("2026-08-14T12:00:00.000Z"),
  updatedAt: new Date("2026-08-14T12:00:00.000Z"),
} as const;

describe("assessment recalculation persistence mapping", () => {
  it("maps an approved pending snapshot to a recalculation candidate", () => {
    expect(assessmentRecalculationCandidateRowToCandidate(row)).toEqual({
      candidateId: row.id,
      participantId: row.participantId,
      scopeId: row.scopeId,
      attemptId: row.attemptId,
      itemId: row.itemId,
      previousVersion: 2,
      previousScore: 50,
      previousOutcome: "REFORCO",
      correctCount: 8,
      eligibleItemCount: 10,
    });
  });

  it("creates an immutable update projection for the processed snapshot", async () => {
    const update = assessmentRecalculationStateToUpdate({
      ...assessmentRecalculationCandidateRowToCandidate(row),
      passingScore: 70,
      reason: "ITEM_ANNULLED",
      recalculatedAt: "2026-08-14T12:00:00.000Z",
      recalculatedVersion: 3,
      recalculatedScore: 80,
      recalculatedOutcome: "APROVADO",
      notificationRequired: true,
      automaticDecision: "NONE",
    });
    expect(update).toEqual({
      status: "CALCULATED",
      recalculatedVersion: 3,
      recalculatedScore: 80,
      recalculatedOutcome: "APROVADO",
      recalculatedAt: new Date("2026-08-14T12:00:00.000Z"),
      updatedAt: expect.any(Date),
    });
    expect(Object.isFrozen(update)).toBe(true);
  });

  it("rejects snapshots that are not pending clinical candidates", () => {
    expect(() =>
      assessmentRecalculationCandidateRowToCandidate({
        ...row,
        status: "PROCESSED",
      }),
    ).toThrow("status");
  });
});
