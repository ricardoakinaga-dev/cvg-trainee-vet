import { describe, expect, it } from "vitest";

import type { FeedbackTicketState } from "@cvg/domain";

import {
  listFeedbackTicketStates,
  type FeedbackTicketReadPort,
} from "./feedback-list.js";

const state = {
  ticketId: "33333333-3333-4333-8333-333333333333",
  participantId: "11111111-1111-4111-8111-111111111111",
  type: "BUG_TECNICO",
  description: "Falha sintética de teste.",
  createdAt: "2026-08-14T08:00:00.000Z",
  status: "NOVO",
  version: 0,
} as const satisfies FeedbackTicketState;

describe("feedback list use case", () => {
  it("passes the audience and scope boundary to the read port and freezes results", async () => {
    const scoped = {
      scopeId: "22222222-2222-4222-8222-222222222222",
      state,
    } as const;
    const list = async () => [scoped] as const;
    const port: FeedbackTicketReadPort = { list };

    const result = await listFeedbackTicketStates(
      {
        audience: "PARTICIPANT",
        participantId: state.participantId,
        scopeId: "22222222-2222-4222-8222-222222222222",
      },
      port,
    );

    expect(result).toEqual([scoped]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result[0])).toBe(true);
    expect(Object.isFrozen(result[0]?.state)).toBe(true);
  });

  it("rejects a participant read without an owner", async () => {
    const port: FeedbackTicketReadPort = { list: async () => [] };

    await expect(
      listFeedbackTicketStates(
        {
          audience: "PARTICIPANT",
          scopeId: "22222222-2222-4222-8222-222222222222",
        },
        port,
      ),
    ).rejects.toThrow("participantId");
  });
});
