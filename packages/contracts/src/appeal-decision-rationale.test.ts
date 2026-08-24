import { describe, expect, it } from "vitest";

import { appealReviewTransitionRequestSchema } from "./learning-state.js";

const appealId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";

describe("appeal decision rationale contract", () => {
  it("requires a bounded internal rationale for DECIDIR", () => {
    expect(() =>
      appealReviewTransitionRequestSchema.parse({
        appealId,
        scopeId,
        version: 1,
        event: "DECIDIR",
        decision: "MANTER_RESULTADO",
      }),
    ).toThrow();
  });

  it("accepts rationale only on a decision action", () => {
    const parsed = appealReviewTransitionRequestSchema.parse({
      appealId,
      scopeId,
      version: 1,
      event: "DECIDIR",
      decision: "ANULAR_ITEM",
      decisionRationale: "A revisão sintética sustenta a anulação do item.",
    });

    expect(parsed).toMatchObject({
      event: "DECIDIR",
      decision: "ANULAR_ITEM",
      decisionRationale: "A revisão sintética sustenta a anulação do item.",
    });

    expect(() =>
      appealReviewTransitionRequestSchema.parse({
        appealId,
        scopeId,
        version: 1,
        event: "ATRIBUIR_REVISOR",
        decisionRationale: "não pertence a esta ação",
      }),
    ).toThrow();
  });
});
