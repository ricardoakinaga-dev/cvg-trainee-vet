import { describe, expect, it, vi } from "vitest";
import { createAppeal, transitionAppeal, type AppealState } from "@cvg/domain";

import {
  transitionAppealReviewState,
  type AppealReviewTransitionRepositoryPort,
} from "./appeal-review-transition-use-cases.js";

/**
 * AAA-FINAL-003 — Coverage margin hardening (appeal transition guards).
 *
 * Risco: transição inválida (texto malformado, decisão sem timestamp).
 * Branches: assertPlainText OR-chain, DECIDIR sem decidedAt.
 */
const ids = {
  appealId: "11111111-1111-4111-8111-111111111111",
  participantId: "22222222-2222-4222-8222-222222222222",
  scopeId: "33333333-3333-4333-8333-333333333333",
  attemptId: "44444444-4444-4444-8444-444444444444",
  itemId: "55555555-5555-4555-8555-555555555555",
  reviewerId: "66666666-6666-4666-8666-666666666666",
  correlationId: "88888888-8888-4888-8888-888888888888",
} as const;

function repository(state: AppealState | null) {
  return {
    findAppealForReview: vi.fn(async () =>
      state === null ? null : { scopeId: ids.scopeId, state },
    ),
    saveAppealForReview: vi.fn(
      async (_context: unknown, nextState: AppealState) =>
        Object.freeze({ scopeId: ids.scopeId, state: nextState }),
    ),
  } satisfies AppealReviewTransitionRepositoryPort;
}

describe("appeal transition branch closure", () => {
  it("rejects DECIDIR with an invalid decision timestamp", async () => {
    const assigned = transitionAppeal(
      createAppeal({
        appealId: ids.appealId,
        participantId: ids.participantId,
        attemptId: ids.attemptId,
        itemId: ids.itemId,
        justification: "Justificativa sintética.",
        createdAt: "2026-08-24T12:00:00.000Z",
      }),
      { type: "ATRIBUIR_REVISOR", reviewerId: ids.reviewerId },
    );
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
            decisionRationale: "Rationale sintético.",
          },
        },
        port,
        { now: () => "not-a-timestamp" },
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    expect(port.saveAppealForReview).not.toHaveBeenCalled();
  });

  it("rejects malformed rationale text", async () => {
    const assigned = transitionAppeal(
      createAppeal({
        appealId: ids.appealId,
        participantId: ids.participantId,
        attemptId: ids.attemptId,
        itemId: ids.itemId,
        justification: "Justificativa sintética.",
        createdAt: "2026-08-24T12:00:00.000Z",
      }),
      { type: "ATRIBUIR_REVISOR", reviewerId: ids.reviewerId },
    );
    const port = repository(assigned);
    const base = {
      appealId: ids.appealId,
      scopeId: ids.scopeId,
      actorId: ids.reviewerId,
      version: 1,
      correlationId: ids.correlationId,
    };
    for (const decisionRationale of [
      "   ",
      "x".repeat(10_001),
      "<b>html</b>",
      42,
    ]) {
      await expect(
        transitionAppealReviewState(
          {
            ...base,
            event: {
              type: "DECIDIR",
              decision: "MANTER_RESULTADO",
              decisionRationale,
            },
          },
          port,
          { now: () => "2026-08-24T12:00:00.000Z" },
        ),
      ).rejects.toMatchObject({ code: "validation_error" });
    }
    expect(port.saveAppealForReview).not.toHaveBeenCalled();
  });
});
