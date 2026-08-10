import { describe, expect, it } from "vitest";

import { parseParticipantProgress } from "./progress.js";

describe("participant progress projection", () => {
  it("accepts resumable progress without identity or scope internals", () => {
    const projection = parseParticipantProgress({
      activityId: "22222222-2222-4222-8222-222222222222",
      assignmentStatus: "EM_ANDAMENTO",
      attemptStatus: "SALVA",
      attemptVersion: 2,
      nextAction: "RETOMAR_ATIVIDADE",
    });

    expect(projection.nextAction).toBe("RETOMAR_ATIVIDADE");
  });

  it("rejects participant and scope internals", () => {
    expect(() =>
      parseParticipantProgress({
        activityId: "22222222-2222-4222-8222-222222222222",
        assignmentStatus: "DISPONIVEL",
        nextAction: "INICIAR_ATIVIDADE",
        participantId: "11111111-1111-4111-8111-111111111111",
        scopeId: "33333333-3333-4333-8333-333333333333",
      }),
    ).toThrow();
  });
});
