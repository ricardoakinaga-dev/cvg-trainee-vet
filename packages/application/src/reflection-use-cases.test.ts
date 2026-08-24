import { describe, expect, it } from "vitest";

import { deriveReflectionState } from "./reflection-use-cases.js";

const itemIds = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
] as const;

describe("digital reflection state", () => {
  it("starts without an attempt and exposes only aggregate status", () => {
    expect(
      deriveReflectionState({ itemIds, attemptStatus: undefined, answers: [] }),
    ).toEqual({
      status: "NAO_INICIADA",
      nextAction: "INICIAR_REFLEXAO",
      itemCount: 2,
      answeredItemCount: 0,
      answers: [],
      evidence: "REFLEXAO_DIGITAL",
      practicalCompetenceClaim: "PROIBIDO_MVP",
    });
  });

  it("keeps a partial draft resumable and does not calculate a score", () => {
    expect(
      deriveReflectionState({
        itemIds,
        attemptStatus: "SALVA",
        answers: [
          {
            itemId: itemIds[0],
            response: "Uma resposta própria.",
            savedAt: "2026-08-23T20:00:00.000Z",
          },
        ],
      }),
    ).toMatchObject({
      status: "EM_ANDAMENTO",
      nextAction: "RETOMAR_REFLEXAO",
      itemCount: 2,
      answeredItemCount: 1,
      evidence: "REFLEXAO_DIGITAL",
      practicalCompetenceClaim: "PROIBIDO_MVP",
    });
  });

  it("requires submission after all answers and closes only a submitted reflection", () => {
    const draft = deriveReflectionState({
      itemIds,
      attemptStatus: "SALVA",
      answers: itemIds.map((itemId, index) => ({
        itemId,
        response: `Resposta ${index + 1}.`,
        savedAt: "2026-08-23T20:00:00.000Z",
      })),
    });
    const submitted = deriveReflectionState({
      itemIds,
      attemptStatus: "SUBMETIDA",
      answers: draft.answers,
    });

    expect(draft).toMatchObject({
      status: "EM_ANDAMENTO",
      nextAction: "ENVIAR_REFLEXAO",
      answeredItemCount: 2,
    });
    expect(submitted).toMatchObject({
      status: "CONCLUIDA",
      nextAction: "PROXIMA_ACAO",
      answeredItemCount: 2,
    });
    expect(JSON.stringify(submitted)).not.toMatch(
      /score|nota|competencia_pratica|gabarito/iu,
    );
  });

  it("rejects answers that do not belong to an attempt", () => {
    expect(() =>
      deriveReflectionState({
        itemIds,
        attemptStatus: undefined,
        answers: [
          {
            itemId: itemIds[0],
            response: "Resposta sem tentativa.",
            savedAt: "2026-08-23T20:00:00.000Z",
          },
        ],
      }),
    ).toThrow(/require an attempt/iu);
  });
});
