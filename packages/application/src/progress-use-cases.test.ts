import { describe, expect, it } from "vitest";

import {
  getParticipantProgress,
  type ParticipantProgressState,
  type ProgressReadPort,
} from "./progress-use-cases.js";

const base: ParticipantProgressState = {
  participantId: "11111111-1111-4111-8111-111111111111",
  activityId: "22222222-2222-4222-8222-222222222222",
  scopeId: "33333333-3333-4333-8333-333333333333",
  assignmentStatus: "EM_ANDAMENTO",
  attemptId: "44444444-4444-4444-8444-444444444444",
  attemptStatus: "SALVA",
  attemptVersion: 2,
  nextAction: "RETOMAR_ATIVIDADE",
};

function repository(state: ParticipantProgressState | null): ProgressReadPort {
  return { findParticipantProgress: async () => state };
}

describe("participant progress use case", () => {
  it("returns an immutable resumable state without changing the source", async () => {
    const result = await getParticipantProgress(
      {
        participantId: base.participantId,
        activityId: base.activityId,
      },
      repository(base),
    );

    expect(result).toEqual(base);
    expect(Object.isFrozen(result)).toBe(true);
    expect(result).not.toHaveProperty("answer");
  });

  it("preserves waiting and completion next actions", async () => {
    await expect(
      getParticipantProgress(
        { participantId: base.participantId, activityId: base.activityId },
        repository({
          ...base,
          assignmentStatus: "CONCLUIDO_COM_RETENCAO_PENDENTE",
          attemptStatus: "AGUARDA_CORRECAO_HUMANA",
          nextAction: "AGUARDAR_CORRECAO",
        }),
      ),
    ).resolves.toMatchObject({ nextAction: "AGUARDAR_CORRECAO" });
    await expect(
      getParticipantProgress(
        { participantId: base.participantId, activityId: base.activityId },
        repository({
          ...base,
          assignmentStatus: "CONCLUIDO",
          attemptStatus: "CORRIGIDA_HUMANAMENTE",
          nextAction: "REVISAR_PROXIMO_CONTEUDO",
        }),
      ),
    ).resolves.toMatchObject({ nextAction: "REVISAR_PROXIMO_CONTEUDO" });
  });

  it("makes an assigned reinforcement activity startable when it has no open attempt", async () => {
    await expect(
      getParticipantProgress(
        { participantId: base.participantId, activityId: base.activityId },
        repository({
          participantId: base.participantId,
          activityId: base.activityId,
          scopeId: base.scopeId,
          assignmentStatus: "EM_REFORCO",
          nextAction: "INICIAR_ATIVIDADE",
        }),
      ),
    ).resolves.toMatchObject({ nextAction: "INICIAR_ATIVIDADE" });
  });

  it("returns not found and rejects missing identity", async () => {
    await expect(
      getParticipantProgress(
        { participantId: base.participantId, activityId: base.activityId },
        repository(null),
      ),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      getParticipantProgress(
        { participantId: " ", activityId: base.activityId },
        repository(base),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });
  });
});
