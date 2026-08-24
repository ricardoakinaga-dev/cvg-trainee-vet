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
  otherReviewerId: "77777777-7777-4777-8777-777777777777",
} as const;

function appealState(): AppealState {
  return createAppeal({
    appealId: ids.appealId,
    participantId: ids.participantId,
    attemptId: ids.attemptId,
    itemId: ids.itemId,
    justification: "Justificativa sintética de teste.",
    createdAt: "2026-08-24T12:00:00.000Z",
  });
}

function repository(
  state: AppealState | null,
): AppealReviewTransitionRepositoryPort & {
  readonly findAppealForReview: ReturnType<typeof vi.fn>;
  readonly saveAppealForReview: ReturnType<typeof vi.fn>;
} {
  const findAppealForReview = vi.fn(async () =>
    state === null ? null : { scopeId: ids.scopeId, state },
  );
  const saveAppealForReview = vi.fn(async (_context, nextState: AppealState) =>
    Object.freeze({ scopeId: ids.scopeId, state: nextState }),
  );
  return { findAppealForReview, saveAppealForReview };
}

describe("appeal review transition use case", () => {
  it("binds self-assignment to the authenticated actor, never a request identity", async () => {
    const port = repository(appealState());

    const result = await transitionAppealReviewState(
      {
        appealId: ids.appealId,
        scopeId: ids.scopeId,
        actorId: ids.reviewerId,
        version: 0,
        event: { type: "ATRIBUIR_REVISOR" },
      },
      port,
    );

    expect(result).toMatchObject({
      status: "EM_REVISAO",
      reviewerId: ids.reviewerId,
    });
    expect(port.saveAppealForReview).toHaveBeenCalledWith(
      { scopeId: ids.scopeId },
      expect.objectContaining({ reviewerId: ids.reviewerId }),
    );
  });

  it("allows the assigned reviewer to decide and request recalculation", async () => {
    const assigned = transitionAppeal(appealState(), {
      type: "ATRIBUIR_REVISOR",
      reviewerId: ids.reviewerId,
    });
    const decisionPort = repository(assigned);

    const decided = await transitionAppealReviewState(
      {
        appealId: ids.appealId,
        scopeId: ids.scopeId,
        actorId: ids.reviewerId,
        version: 1,
        event: { type: "DECIDIR", decision: "ALTERAR_RESULTADO" },
      },
      decisionPort,
    );
    expect(decided).toMatchObject({
      status: "DECIDIDA",
      decision: "ALTERAR_RESULTADO",
      version: 2,
    });

    const recalcPort = repository(decided);
    const pending = await transitionAppealReviewState(
      {
        appealId: ids.appealId,
        scopeId: ids.scopeId,
        actorId: ids.reviewerId,
        version: 2,
        event: { type: "SOLICITAR_RECALCULO" },
      },
      recalcPort,
    );
    expect(pending).toMatchObject({ status: "RECALCULO_PENDENTE", version: 3 });
  });

  it("denies a non-assigned actor before mutation and rejects stale versions", async () => {
    const assigned = transitionAppeal(appealState(), {
      type: "ATRIBUIR_REVISOR",
      reviewerId: ids.reviewerId,
    });
    const forbiddenPort = repository(assigned);
    await expect(
      transitionAppealReviewState(
        {
          appealId: ids.appealId,
          scopeId: ids.scopeId,
          actorId: ids.otherReviewerId,
          version: 1,
          event: { type: "DECIDIR", decision: "MANTER_RESULTADO" },
        },
        forbiddenPort,
      ),
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });
    expect(forbiddenPort.saveAppealForReview).not.toHaveBeenCalled();

    await expect(
      transitionAppealReviewState(
        {
          appealId: ids.appealId,
          scopeId: ids.scopeId,
          actorId: ids.reviewerId,
          version: 0,
          event: { type: "DECIDIR", decision: "MANTER_RESULTADO" },
        },
        repository(assigned),
      ),
    ).rejects.toMatchObject({ code: "state_conflict", status: 409 });
  });

  it("fails closed when the appeal is not visible in the requested scope", async () => {
    const port = repository(null);
    await expect(
      transitionAppealReviewState(
        {
          appealId: ids.appealId,
          scopeId: ids.scopeId,
          actorId: ids.reviewerId,
          version: 0,
          event: { type: "ATRIBUIR_REVISOR" },
        },
        port,
      ),
    ).rejects.toMatchObject({ code: "not_found", status: 404 });
  });

  it("validates direct callers and maps invalid domain or persistence transitions", async () => {
    const port = repository(appealState());
    await expect(
      transitionAppealReviewState(
        {
          appealId: "invalid",
          scopeId: ids.scopeId,
          actorId: ids.reviewerId,
          version: 0,
          event: { type: "ATRIBUIR_REVISOR" },
        },
        port,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      transitionAppealReviewState(
        {
          appealId: ids.appealId,
          scopeId: ids.scopeId,
          actorId: "invalid",
          version: 0,
          event: { type: "ATRIBUIR_REVISOR" },
        },
        port,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
    await expect(
      transitionAppealReviewState(
        {
          appealId: ids.appealId,
          scopeId: ids.scopeId,
          actorId: ids.reviewerId,
          version: -1,
          event: { type: "ATRIBUIR_REVISOR" },
        },
        port,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });

    const assigned = transitionAppeal(appealState(), {
      type: "ATRIBUIR_REVISOR",
      reviewerId: ids.reviewerId,
    });
    await expect(
      transitionAppealReviewState(
        {
          appealId: ids.appealId,
          scopeId: ids.scopeId,
          actorId: ids.reviewerId,
          version: 1,
          event: { type: "SOLICITAR_RECALCULO" },
        },
        repository(assigned),
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });

    const unknownPort = repository(assigned);
    await expect(
      transitionAppealReviewState(
        {
          appealId: ids.appealId,
          scopeId: ids.scopeId,
          actorId: ids.reviewerId,
          version: 1,
          event: { type: "UNKNOWN" } as never,
        },
        unknownPort,
      ),
    ).rejects.toMatchObject({ code: "validation_error" });

    const conflictPort = repository(appealState());
    const persistenceConflict = new Error("synthetic persistence conflict");
    persistenceConflict.name = "PersistenceConflict";
    conflictPort.saveAppealForReview.mockRejectedValue(persistenceConflict);
    await expect(
      transitionAppealReviewState(
        {
          appealId: ids.appealId,
          scopeId: ids.scopeId,
          actorId: ids.reviewerId,
          version: 0,
          event: { type: "ATRIBUIR_REVISOR" },
        },
        conflictPort,
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });
  });
});
