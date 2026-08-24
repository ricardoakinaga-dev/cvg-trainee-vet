import { describe, expect, it, vi } from "vitest";

import type { AppealState } from "@cvg/domain";

import {
  getParticipantAppeals,
  type ParticipantAppealReadPort,
} from "./appeal-use-cases.js";

const context = {
  participantId: "22222222-2222-4222-8222-222222222222",
  scopeId: "11111111-1111-4111-8111-111111111111",
} as const;

const appeal: AppealState = {
  appealId: "33333333-3333-4333-8333-333333333333",
  participantId: context.participantId,
  attemptId: "44444444-4444-4444-8444-444444444444",
  itemId: "55555555-5555-4555-8555-555555555555",
  justification: "Justificativa sintética.",
  createdAt: "2026-08-10T17:00:00.000Z",
  dueAt: "2026-08-19T17:00:00.000Z",
  version: 0,
  status: "ABERTA",
};

describe("participant appeal read use case", () => {
  it("returns only own appeals for the requested attempt and freezes the result", async () => {
    const port: ParticipantAppealReadPort = {
      listAppeals: async () => [{ scopeId: context.scopeId, state: appeal }],
    };

    const result = await getParticipantAppeals(
      { ...context, attemptId: appeal.attemptId },
      port,
    );

    expect(result).toEqual([appeal]);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("rejects an empty attempt identifier before touching persistence", async () => {
    const listAppeals = vi.fn(async () => []);
    const port: ParticipantAppealReadPort = { listAppeals };

    await expect(
      getParticipantAppeals({ ...context, attemptId: " " }, port),
    ).rejects.toMatchObject({ code: "validation_error" });
    expect(listAppeals).not.toHaveBeenCalled();
  });
});
