import { describe, expect, it } from "vitest";

import { createAppeal, transitionAppeal } from "./appeal.js";

const input = {
  appealId: "11111111-1111-4111-8111-111111111111",
  participantId: "22222222-2222-4222-8222-222222222222",
  attemptId: "33333333-3333-4333-8333-333333333333",
  itemId: "44444444-4444-4444-8444-444444444444",
  justification: "Justificativa sintética de teste.",
  createdAt: "2026-08-24T12:00:00.000Z",
} as const;

const review = () =>
  transitionAppeal(createAppeal(input), {
    type: "ATRIBUIR_REVISOR",
    reviewerId: "55555555-5555-4555-8555-555555555555",
  });

const decisionEvent = {
  type: "DECIDIR",
  decision: "ANULAR_ITEM",
  rationale: "A análise sintética demonstra inconsistência no item.",
  decidedAt: "2026-08-24T12:01:00.000Z",
  correlationId: "66666666-6666-4666-8666-666666666666",
} as const;

describe("appeal decision rationale domain invariant", () => {
  it("persists rationale, decision time and correlation on DECIDIR", () => {
    const decided = transitionAppeal(review(), decisionEvent);

    expect(decided).toMatchObject({
      status: "DECIDIDA",
      decision: "ANULAR_ITEM",
      decisionRationale: decisionEvent.rationale,
      decisionAt: decisionEvent.decidedAt,
      decisionCorrelationId: decisionEvent.correlationId,
    });
  });

  it("rejects a decision without rationale", () => {
    expect(() =>
      transitionAppeal(review(), {
        type: "DECIDIR",
        decision: "MANTER_RESULTADO",
      } as never),
    ).toThrow("decisionRationale");
  });
});
