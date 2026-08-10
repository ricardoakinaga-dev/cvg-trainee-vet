import { describe, expect, it } from "vitest";

import {
  getParticipantActivity,
  type ActivityReadPort,
  type ParticipantActivityState,
} from "./activity-use-cases.js";

const state: ParticipantActivityState = {
  activityId: "activity-1",
  scopeId: "scope-1",
  slug: "emergencia-v1",
  title: "Emergência",
  items: [
    {
      itemId: "item-1",
      ordinal: 1,
      kind: "LEITURA",
      title: "Prioridades iniciais",
      text: "Conteúdo autoral.",
      responseMode: "TEXT",
    },
  ],
};

function dependencies(
  result: ParticipantActivityState | null = state,
): ActivityReadPort {
  return {
    findParticipantActivity: async () => result,
  };
}

describe("GetParticipantActivity", () => {
  it("returns the assigned published activity", async () => {
    await expect(
      getParticipantActivity(
        { participantId: "participant-1", activityId: "activity-1" },
        dependencies(),
      ),
    ).resolves.toEqual(state);
  });

  it("fails closed for missing or malformed activity access", async () => {
    await expect(
      getParticipantActivity(
        { participantId: "participant-1", activityId: "activity-1" },
        dependencies(null),
      ),
    ).rejects.toMatchObject({ code: "not_found", status: 404 });
    await expect(
      getParticipantActivity(
        { participantId: " ", activityId: "activity-1" },
        dependencies(),
      ),
    ).rejects.toMatchObject({ code: "validation_error", status: 422 });
  });
});
