import { describe, expect, it } from "vitest";

import { appealReviewTransitionRequestSchema } from "./learning-state.js";

const appealId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";

describe("appeal review transition contract", () => {
  it("accepts only the bounded reviewer actions", () => {
    expect(
      appealReviewTransitionRequestSchema.parse({
        appealId,
        scopeId,
        version: 1,
        event: "DECIDIR",
        decision: "MANTER_RESULTADO",
        decisionRationale: "Decisão sintética.",
      }),
    ).toEqual({
      appealId,
      scopeId,
      version: 1,
      event: "DECIDIR",
      decision: "MANTER_RESULTADO",
      decisionRationale: "Decisão sintética.",
    });
    expect(
      appealReviewTransitionRequestSchema.parse({
        appealId,
        scopeId,
        version: 0,
        event: "ATRIBUIR_REVISOR",
      }),
    ).toMatchObject({ event: "ATRIBUIR_REVISOR" });
    expect(
      appealReviewTransitionRequestSchema.parse({
        appealId,
        scopeId,
        version: 2,
        event: "SOLICITAR_RECALCULO",
      }),
    ).toMatchObject({ event: "SOLICITAR_RECALCULO" });
  });

  it("rejects client-selected identities, incomplete decisions and close actions", () => {
    expect(() =>
      appealReviewTransitionRequestSchema.parse({
        appealId,
        scopeId,
        version: 0,
        event: "ATRIBUIR_REVISOR",
        participantId: "33333333-3333-4333-8333-333333333333",
      }),
    ).toThrow();
    expect(() =>
      appealReviewTransitionRequestSchema.parse({
        appealId,
        scopeId,
        version: 0,
        event: "ATRIBUIR_REVISOR",
        reviewerId: "44444444-4444-4444-8444-444444444444",
      }),
    ).toThrow();
    expect(() =>
      appealReviewTransitionRequestSchema.parse({
        appealId,
        scopeId,
        version: 1,
        event: "DECIDIR",
      }),
    ).toThrow();
    expect(() =>
      appealReviewTransitionRequestSchema.parse({
        appealId,
        scopeId,
        version: 1,
        event: "ENCERRAR",
      }),
    ).toThrow();
    expect(() =>
      appealReviewTransitionRequestSchema.parse({
        appealId,
        scopeId,
        version: 1,
        event: "CONCLUIR_RECALCULO",
      }),
    ).toThrow();
  });
});
