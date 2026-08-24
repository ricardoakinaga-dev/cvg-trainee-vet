import { describe, expect, it } from "vitest";
import { createAppeal, transitionAppeal } from "@cvg/domain";

import {
  appealRowToState,
  appealStateToRow,
} from "./learning-state-repository.js";

const participantId = "11111111-1111-4111-8111-111111111111";
const reviewerId = "22222222-2222-4222-8222-222222222222";
const scopeId = "33333333-3333-4333-8333-333333333333";
const appealId = "44444444-4444-4444-8444-444444444444";
const attemptId = "55555555-5555-4555-8555-555555555555";
const itemId = "66666666-6666-4666-8666-666666666666";
const correlationId = "77777777-7777-4777-8777-777777777777";
const createdAt = "2026-08-24T12:00:00.000Z";

describe("appeal decision metadata persistence mapping", () => {
  it("round-trips decision rationale and server metadata", () => {
    const opened = createAppeal({
      appealId,
      participantId,
      attemptId,
      itemId,
      justification: "Justificativa sintética de teste.",
      createdAt,
    });
    const assigned = transitionAppeal(opened, {
      type: "ATRIBUIR_REVISOR",
      reviewerId,
    });
    const decided = transitionAppeal(assigned, {
      type: "DECIDIR",
      decision: "MANTER_RESULTADO",
      rationale:
        "A decisão sintética mantém o resultado por evidência suficiente.",
      decidedAt: "2026-08-24T12:01:00.000Z",
      correlationId,
    } as never);

    const row = appealStateToRow({ scopeId, state: decided });

    expect(row).toMatchObject({
      decision: "MANTER_RESULTADO",
      decisionRationale:
        "A decisão sintética mantém o resultado por evidência suficiente.",
      decisionAt: new Date("2026-08-24T12:01:00.000Z"),
      decisionCorrelationId: correlationId,
    });

    expect(
      appealRowToState({
        ...row,
        createdAt: new Date(createdAt),
        dueAt: new Date("2026-09-03T12:00:00.000Z"),
        updatedAt: new Date(createdAt),
      }),
    ).toMatchObject({
      scopeId,
      state: {
        decisionRationale:
          "A decisão sintética mantém o resultado por evidência suficiente.",
        decisionAt: "2026-08-24T12:01:00.000Z",
        decisionCorrelationId: correlationId,
      },
    });
  });
});
