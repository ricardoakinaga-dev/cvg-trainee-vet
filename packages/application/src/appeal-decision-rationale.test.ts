import { describe, expect, it, vi } from "vitest";
import { createAppeal, transitionAppeal, type AppealState } from "@cvg/domain";

import {
  transitionAppealReviewState,
  type AppealReviewTransitionRepositoryPort,
} from "./appeal-review-transition-use-cases.js";

const ids = {
  appealId: "11111111-1111-4111-8111-111111111111",
  participantId: "22222222-2222-4222-8222-222222222222",
  scopeId: "33333333-3333-4333-8333-333333333333",
  attemptId: "44444444-4444-4444-8444-444444444444",
  itemId: "55555555-5555-4555-8555-555555555555",
  reviewerId: "66666666-6666-4666-8666-666666666666",
  correlationId: "77777777-7777-4777-8777-777777777777",
} as const;

function openAppeal(): AppealState {
  return createAppeal({
    appealId: ids.appealId,
    participantId: ids.participantId,
    attemptId: ids.attemptId,
    itemId: ids.itemId,
    justification: "Justificativa sintética de teste.",
    createdAt: "2026-08-24T12:00:00.000Z",
  });
}

function repository(state: AppealState): AppealReviewTransitionRepositoryPort {
  return {
    findAppealForReview: vi.fn(async () => ({ scopeId: ids.scopeId, state })),
    saveAppealForReview: vi.fn(async (_context, nextState: AppealState) => ({
      scopeId: ids.scopeId,
      state: nextState,
    })),
  };
}

describe("appeal decision rationale application boundary", () => {
  it("binds rationale to the reviewer decision and generates server metadata", async () => {
    const assigned = transitionAppeal(openAppeal(), {
      type: "ATRIBUIR_REVISOR",
      reviewerId: ids.reviewerId,
    });

    const result = await transitionAppealReviewState(
      {
        appealId: ids.appealId,
        scopeId: ids.scopeId,
        actorId: ids.reviewerId,
        version: 1,
        correlationId: ids.correlationId,
        event: {
          type: "DECIDIR",
          decision: "ANULAR_ITEM",
          decisionRationale: "A revisão sintética fundamenta a anulação.",
        },
      } as never,
      repository(assigned),
    );

    expect(result).toMatchObject({
      status: "DECIDIDA",
      decision: "ANULAR_ITEM",
      decisionRationale: "A revisão sintética fundamenta a anulação.",
      decisionAt: expect.any(String),
      decisionCorrelationId: ids.correlationId,
    });
  });

  it("rejects direct decisions without rationale before mutation", async () => {
    const assigned = transitionAppeal(openAppeal(), {
      type: "ATRIBUIR_REVISOR",
      reviewerId: ids.reviewerId,
    });
    const port = repository(assigned);

    await expect(
      transitionAppealReviewState(
        {
          appealId: ids.appealId,
          scopeId: ids.scopeId,
          actorId: ids.reviewerId,
          version: 1,
          correlationId: ids.correlationId,
          event: {
            type: "DECIDIR",
            decision: "MANTER_RESULTADO",
          },
        } as never,
        port,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    expect(
      (port.saveAppealForReview as ReturnType<typeof vi.fn>).mock.calls,
    ).toHaveLength(0);
  });

  it("rejects a caller-supplied non-UUID correlation before reading", async () => {
    const port = repository(
      transitionAppeal(openAppeal(), {
        type: "ATRIBUIR_REVISOR",
        reviewerId: ids.reviewerId,
      }),
    );

    await expect(
      transitionAppealReviewState(
        {
          appealId: ids.appealId,
          scopeId: ids.scopeId,
          actorId: ids.reviewerId,
          version: 1,
          correlationId: "not-a-uuid",
          event: {
            type: "DECIDIR",
            decision: "MANTER_RESULTADO",
            decisionRationale: "A decisão sintética mantém o resultado.",
          },
        } as never,
        port,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    expect(
      (port.findAppealForReview as ReturnType<typeof vi.fn>).mock.calls,
    ).toHaveLength(0);
  });
});
