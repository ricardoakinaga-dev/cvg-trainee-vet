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

  it("validates identity, timestamps, state prerequisites and terminal transitions", () => {
    for (const field of [
      "appealId",
      "participantId",
      "attemptId",
      "itemId",
    ] as const) {
      expect(() => createAppeal({ ...input, [field]: " " })).toThrow(field);
    }
    expect(() =>
      createAppeal({ ...input, justification: "x".repeat(10_001) }),
    ).toThrow("plain text");
    expect(() =>
      createAppeal({ ...input, createdAt: "not-a-timestamp" }),
    ).toThrow("createdAt");

    expect(() => transitionAppeal(null as never, {} as never)).toThrow(
      "state must be an object",
    );
    expect(() =>
      transitionAppeal({ ...createAppeal(input), status: "UNKNOWN" } as never, {
        type: "ATRIBUIR_REVISOR",
        reviewerId: "reviewer-1",
      }),
    ).toThrow("status is not supported");
    expect(() =>
      transitionAppeal(
        { ...createAppeal(input), status: "EM_REVISAO" } as never,
        { type: "ATRIBUIR_REVISOR", reviewerId: "reviewer-1" },
      ),
    ).toThrow("independent reviewer");
    expect(() =>
      transitionAppeal(
        {
          ...createAppeal(input),
          status: "DECIDIDA",
          reviewerId: "reviewer-1",
        } as never,
        { type: "ENCERRAR" },
      ),
    ).toThrow("decision is required");

    const opened = createAppeal(input);
    const review = transitionAppeal(opened, {
      type: "ATRIBUIR_REVISOR",
      reviewerId: "reviewer-1",
    });
    expect(() =>
      transitionAppeal(review, {
        type: "DECIDIR",
        decision: "UNKNOWN" as never,
      }),
    ).toThrow("decision is not supported");
    const decided = transitionAppeal(review, {
      type: "DECIDIR",
      decision: "MANTER_RESULTADO",
    });
    expect(transitionAppeal(decided, { type: "ENCERRAR" }).status).toBe(
      "ENCERRADA",
    );
    expect(() =>
      transitionAppeal(transitionAppeal(decided, { type: "ENCERRAR" }), {
        type: "ENCERRAR",
      }),
    ).toThrow("not allowed");

    const valid = createAppeal(input);
    expect(() =>
      transitionAppeal(
        { ...valid, createdAt: "invalid" },
        { type: "ATRIBUIR_REVISOR", reviewerId: "reviewer-1" },
      ),
    ).toThrow("createdAt");
    expect(() =>
      transitionAppeal(
        { ...valid, dueAt: "invalid" },
        { type: "ATRIBUIR_REVISOR", reviewerId: "reviewer-1" },
      ),
    ).toThrow("dueAt");
    expect(() =>
      transitionAppeal(
        { ...valid, version: -1 },
        { type: "ATRIBUIR_REVISOR", reviewerId: "reviewer-1" },
      ),
    ).toThrow("version");
  });
});
