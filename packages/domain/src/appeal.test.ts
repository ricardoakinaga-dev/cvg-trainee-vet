import { describe, expect, it } from "vitest";

import { createAppeal, transitionAppeal } from "./appeal.js";

const input = {
  appealId: "appeal-1",
  participantId: "participant-1",
  attemptId: "attempt-1",
  itemId: "item-1",
  justification: "A questão não contempla a informação apresentada.",
  createdAt: "2026-08-07T17:00:00.000Z",
} as const;

describe("appeal workflow", () => {
  it("creates a protocol with a seven-business-day deadline", () => {
    const appeal = createAppeal(input);

    expect(appeal).toMatchObject({
      status: "ABERTA",
      version: 0,
      dueAt: "2026-08-18T17:00:00.000Z",
    });
    expect(Object.isFrozen(appeal)).toBe(true);
  });

  it("requires an independent reviewer and preserves the decision path", () => {
    const opened = createAppeal(input);

    expect(() =>
      transitionAppeal(opened, {
        type: "ATRIBUIR_REVISOR",
        reviewerId: input.participantId,
      }),
    ).toThrow("independent");
    const review = transitionAppeal(opened, {
      type: "ATRIBUIR_REVISOR",
      reviewerId: "reviewer-1",
    });
    const decided = transitionAppeal(review, {
      type: "DECIDIR",
      decision: "ANULAR_ITEM",
    });
    const pendingRecalculation = transitionAppeal(decided, {
      type: "SOLICITAR_RECALCULO",
    });
    const closed = transitionAppeal(pendingRecalculation, {
      type: "CONCLUIR_RECALCULO",
    });

    expect(closed.status).toBe("ENCERRADA");
    expect(closed.decision).toBe("ANULAR_ITEM");
    expect(closed.version).toBe(4);
    expect(review.status).toBe("EM_REVISAO");
  });

  it("rejects unsafe justification and deciding before assignment", () => {
    expect(() =>
      createAppeal({ ...input, justification: "<script>x</script>" }),
    ).toThrow();
    expect(() =>
      transitionAppeal(createAppeal(input), {
        type: "DECIDIR",
        decision: "MANTER_RESULTADO",
      }),
    ).toThrow();
  });

  it("never closes a decided appeal before recalculation completes", () => {
    const review = transitionAppeal(createAppeal(input), {
      type: "ATRIBUIR_REVISOR",
      reviewerId: "reviewer-1",
    });
    const decided = transitionAppeal(review, {
      type: "DECIDIR",
      decision: "MANTER_RESULTADO",
    });

    expect(() =>
      transitionAppeal(decided, { type: "ENCERRAR" } as never),
    ).toThrow("not allowed");
  });
});
