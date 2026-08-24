import { describe, expect, it } from "vitest";
import { createAppeal, transitionAppeal } from "@cvg/domain";

import { appeals } from "./schema.js";
import { createAppealReviewTransitionRepository } from "./appeal-review-transition-repository.js";

const scopeId = "11111111-1111-4111-8111-111111111111";
const participantId = "22222222-2222-4222-8222-222222222222";
const appealId = "33333333-3333-4333-8333-333333333333";
const attemptId = "44444444-4444-4444-8444-444444444444";
const itemId = "55555555-5555-4555-8555-555555555555";
const reviewerId = "66666666-6666-4666-8666-666666666666";
const now = "2026-08-24T12:00:00.000Z";

function row(status: string, version: number, assignedReviewer: string | null) {
  return {
    id: appealId,
    participantId,
    scopeId,
    attemptId,
    itemId,
    justification: "Justificativa sintética de teste.",
    createdAt: new Date(now),
    dueAt: new Date("2026-09-03T12:00:00.000Z"),
    version,
    status,
    reviewerId: assignedReviewer,
    decision: null,
    updatedAt: new Date(now),
  };
}

describe("appeal review transition persistence", () => {
  it("sets reviewer context and reads only the scoped protocol", async () => {
    const calls: string[] = [];
    const executor = {
      execute: async () => {
        calls.push("reviewer-context");
        return [];
      },
      select: () => {
        let table: object | undefined;
        const builder = {
          from(source: object) {
            table = source;
            return builder;
          },
          where() {
            return builder;
          },
          limit: async () => {
            calls.push(table === appeals ? "appeal-query" : "unexpected");
            return [row("ABERTA", 0, null)];
          },
        };
        return builder;
      },
      transaction: async (work: (current: unknown) => Promise<unknown>) =>
        work(executor),
    };

    const repository = createAppealReviewTransitionRepository(
      executor as never,
    );
    const result = await repository.findAppealForReview({ scopeId }, appealId);

    expect(result).toMatchObject({
      scopeId,
      state: { appealId, participantId, status: "ABERTA", version: 0 },
    });
    expect(calls).toEqual(["reviewer-context", "appeal-query"]);
  });

  it("updates only transition columns under optimistic version control", async () => {
    const assigned = transitionAppeal(
      createAppeal({
        appealId,
        participantId,
        attemptId,
        itemId,
        justification: "Justificativa sintética de teste.",
        createdAt: now,
      }),
      { type: "ATRIBUIR_REVISOR", reviewerId },
    );
    let updateValues: Record<string, unknown> | undefined;
    const executor = {
      execute: async () => [],
      update: () => {
        const builder = {
          set(values: Record<string, unknown>) {
            updateValues = values;
            return builder;
          },
          where() {
            return builder;
          },
          returning: async () => [{ id: appealId }],
        };
        return builder;
      },
      select: () => {
        const builder = {
          from: () => builder,
          where: () => builder,
          limit: async () => [row("EM_REVISAO", 1, reviewerId)],
        };
        return builder;
      },
      transaction: async (work: (current: unknown) => Promise<unknown>) =>
        work(executor),
    };

    const repository = createAppealReviewTransitionRepository(
      executor as never,
    );
    await expect(
      repository.saveAppealForReview({ scopeId }, assigned),
    ).resolves.toMatchObject({ state: { status: "EM_REVISAO", version: 1 } });

    expect(updateValues).toMatchObject({
      status: "EM_REVISAO",
      version: 1,
      reviewerId,
      decision: null,
    });
    expect(updateValues).not.toHaveProperty("participantId");
    expect(updateValues).not.toHaveProperty("attemptId");
    expect(updateValues).not.toHaveProperty("itemId");
    expect(updateValues).not.toHaveProperty("justification");
    expect(updateValues).not.toHaveProperty("createdAt");
    expect(updateValues).not.toHaveProperty("dueAt");
  });

  it("rejects a version-zero mutation and invalid scope before SQL", async () => {
    const repository = createAppealReviewTransitionRepository({
      transaction: async () => [],
    } as never);
    const initial = createAppeal({
      appealId,
      participantId,
      attemptId,
      itemId,
      justification: "Justificativa sintética de teste.",
      createdAt: now,
    });
    await expect(
      repository.saveAppealForReview({ scopeId }, initial),
    ).rejects.toThrow("version");
    await expect(
      repository.findAppealForReview({ scopeId: " " }, appealId),
    ).rejects.toThrow("scopeId");
    await expect(
      repository.findAppealForReview({ scopeId }, " "),
    ).rejects.toThrow("appealId");
  });

  it("returns null for an invisible row and maps an optimistic update miss", async () => {
    const noRowRepository = createAppealReviewTransitionRepository({
      transaction: async (work: (executor: unknown) => Promise<unknown>) =>
        work({
          execute: async () => [],
          select: () => {
            const builder = {
              from: () => builder,
              where: () => builder,
              limit: async () => [],
            };
            return builder;
          },
        }),
    } as never);
    await expect(
      noRowRepository.findAppealForReview({ scopeId }, appealId),
    ).resolves.toBeNull();

    const assigned = transitionAppeal(
      createAppeal({
        appealId,
        participantId,
        attemptId,
        itemId,
        justification: "Justificativa sintética de teste.",
        createdAt: now,
      }),
      { type: "ATRIBUIR_REVISOR", reviewerId },
    );
    const conflictRepository = createAppealReviewTransitionRepository({
      transaction: async (work: (executor: unknown) => Promise<unknown>) =>
        work({
          execute: async () => [],
          update: () => {
            const builder = {
              set: () => builder,
              where: () => builder,
              returning: async () => [],
            };
            return builder;
          },
          select: () => {
            const builder = {
              from: () => builder,
              where: () => builder,
              limit: async () => [],
            };
            return builder;
          },
        }),
    } as never);
    await expect(
      conflictRepository.saveAppealForReview({ scopeId }, assigned),
    ).rejects.toMatchObject({ name: "LearningStatePersistenceConflictError" });
  });
});
