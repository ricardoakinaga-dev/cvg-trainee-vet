import { describe, expect, it, vi } from "vitest";

import {
  assessmentRecalculationCandidateRowToCandidate,
  assessmentRecalculationStateToUpdate,
  createAssessmentRecalculationMethods,
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
  it("composes frozen recalculation operations", () => {
    const methods = createAssessmentRecalculationMethods({} as never);

    expect(Object.isFrozen(methods)).toBe(true);
    expect(Object.keys(methods).sort()).toEqual([
      "listAffected",
      "notify",
      "register",
      "save",
    ]);
  });

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
      notificationRequired: true as const,
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

  it("rejects invalid snapshot states and timestamps", () => {
    expect(() =>
      assessmentRecalculationCandidateRowToCandidate({ ...row, id: " " }),
    ).toThrow("id is required");
    expect(() =>
      assessmentRecalculationCandidateRowToCandidate({
        ...row,
        previousOutcome: "UNKNOWN",
      }),
    ).toThrow("previousOutcome is invalid");
    expect(() =>
      assessmentRecalculationCandidateRowToCandidate({
        ...row,
        triggerReason: "UNKNOWN",
      }),
    ).toThrow("triggerReason is invalid");
    expect(() =>
      assessmentRecalculationCandidateRowToCandidate({
        ...row,
        previousVersion: 0,
      }),
    ).toThrow("previous assessment values are invalid");
    expect(() =>
      assessmentRecalculationCandidateRowToCandidate({
        ...row,
        correctCount: 11,
      }),
    ).toThrow("assessment counts are invalid");
    expect(() =>
      assessmentRecalculationStateToUpdate({
        ...assessmentRecalculationCandidateRowToCandidate(row),
        passingScore: 70,
        reason: "ITEM_ANNULLED",
        recalculatedAt: "invalid",
        recalculatedVersion: 3,
        recalculatedScore: 80,
        recalculatedOutcome: "APROVADO",
        notificationRequired: true,
        automaticDecision: "NONE",
      }),
    ).toThrow("recalculatedAt is invalid");
  });

  it("executes register, list, save and notification transitions in scoped transactions", async () => {
    const candidate = assessmentRecalculationCandidateRowToCandidate(row);
    const state = {
      ...candidate,
      passingScore: 70,
      reason: "ITEM_ANNULLED" as const,
      recalculatedAt: "2026-08-14T12:00:00.000Z",
      recalculatedVersion: 3,
      recalculatedScore: 80,
      recalculatedOutcome: "APROVADO" as const,
      notificationRequired: true as const,
      automaticDecision: "NONE" as const,
    };
    const notification = {
      notificationId: "00000000-0000-4000-8000-000000000006",
      notificationType: "ASSESSMENT_RECALCULATED" as const,
      candidateId: candidate.candidateId,
      participantId: candidate.participantId,
      scopeId: candidate.scopeId,
      attemptId: candidate.attemptId,
      itemId: candidate.itemId,
      recalculatedVersion: 3,
      occurredAt: "2026-08-14T12:00:00.000Z",
    };
    const selectResult = [row];
    const tx = {
      execute: vi.fn(async () => undefined),
      insert: vi.fn(() => ({ values: vi.fn(async () => undefined) })),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(async () => selectResult),
          })),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(async () => [{ id: candidate.candidateId }]),
          })),
        })),
      })),
    };
    const db = {
      transaction: vi.fn(async (work: (executor: typeof tx) => unknown) =>
        work(tx),
      ),
    };
    const methods = createAssessmentRecalculationMethods(db as never);

    await methods.register(candidate, "ITEM_ANNULLED");
    await expect(
      methods.listAffected(
        candidate.scopeId,
        candidate.itemId,
        "ITEM_ANNULLED",
      ),
    ).resolves.toEqual([candidate]);
    await methods.save(state);
    await methods.notify(notification);

    expect(db.transaction).toHaveBeenCalledTimes(4);
    expect(tx.execute).toHaveBeenCalledTimes(8);
    expect(tx.insert).toHaveBeenCalledTimes(2);
    expect(tx.update).toHaveBeenCalledTimes(2);
  });

  it("fails closed when save or notification loses the optimistic row", async () => {
    const candidate = assessmentRecalculationCandidateRowToCandidate(row);
    const state = {
      ...candidate,
      passingScore: 70,
      reason: "ITEM_ANNULLED" as const,
      recalculatedAt: "2026-08-14T12:00:00.000Z",
      recalculatedVersion: 3,
      recalculatedScore: 80,
      recalculatedOutcome: "APROVADO" as const,
      notificationRequired: true as const,
      automaticDecision: "NONE" as const,
    };
    const tx = {
      execute: vi.fn(async () => undefined),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({ returning: vi.fn(async () => []) })),
        })),
      })),
      insert: vi.fn(() => ({ values: vi.fn(async () => undefined) })),
    };
    const db = {
      transaction: vi.fn(async (work: (executor: typeof tx) => unknown) =>
        work(tx),
      ),
    };
    const methods = createAssessmentRecalculationMethods(db as never);

    await expect(methods.save(state)).rejects.toThrow("changed concurrently");
    await expect(
      methods.notify({
        notificationId: "notification",
        notificationType: "ASSESSMENT_RECALCULATED",
        candidateId: candidate.candidateId,
        participantId: candidate.participantId,
        scopeId: candidate.scopeId,
        attemptId: candidate.attemptId,
        itemId: candidate.itemId,
        recalculatedVersion: 3,
        occurredAt: "2026-08-14T12:00:00.000Z",
      }),
    ).rejects.toThrow("notification state changed concurrently");
  });
});
