import { describe, expect, it } from "vitest";

import { parseParticipantReflection } from "./reflection.js";

const answer = {
  itemId: "11111111-1111-4111-8111-111111111111",
  response: "Resposta própria e sintética.",
  savedAt: "2026-08-23T20:00:00.000Z",
} as const;

describe("participant reflection contract", () => {
  it("publishes resumable digital reflection state with own answers only", () => {
    const projection = {
      status: "EM_ANDAMENTO",
      nextAction: "RETOMAR_REFLEXAO",
      itemCount: 2,
      answeredItemCount: 1,
      answers: [answer],
      evidence: "REFLEXAO_DIGITAL",
      practicalCompetenceClaim: "PROIBIDO_MVP",
    } as const;

    expect(parseParticipantReflection(projection)).toEqual(projection);
  });

  it("rejects scores, duplicate answers, and inconsistent completion", () => {
    expect(() =>
      parseParticipantReflection({
        status: "CONCLUIDA",
        nextAction: "PROXIMA_ACAO",
        itemCount: 2,
        answeredItemCount: 1,
        answers: [answer],
        evidence: "REFLEXAO_DIGITAL",
        practicalCompetenceClaim: "PROIBIDO_MVP",
        score: 100,
      }),
    ).toThrow();
    expect(() =>
      parseParticipantReflection({
        status: "EM_ANDAMENTO",
        nextAction: "RETOMAR_REFLEXAO",
        itemCount: 2,
        answeredItemCount: 2,
        answers: [answer, answer],
        evidence: "REFLEXAO_DIGITAL",
        practicalCompetenceClaim: "PROIBIDO_MVP",
      }),
    ).toThrow();
    expect(() =>
      parseParticipantReflection({
        status: "NAO_INICIADA",
        nextAction: "INICIAR_REFLEXAO",
        itemCount: 2,
        answeredItemCount: 1,
        answers: [answer],
        evidence: "REFLEXAO_DIGITAL",
        practicalCompetenceClaim: "PROIBIDO_MVP",
      }),
    ).toThrow();
  });
});
