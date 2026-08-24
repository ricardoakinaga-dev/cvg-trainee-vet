import { describe, expect, it } from "vitest";

import {
  getFeedbackTriageQueue,
  type FeedbackTriageQueueReadPort,
  type FeedbackTriageQueueState,
} from "./feedback-triage-queue-use-cases.js";

const scopeId = "11111111-1111-4111-8111-111111111111";
const principalId = "22222222-2222-4222-8222-222222222222";
const participantId = "33333333-3333-4333-8333-333333333333";
const ticketId = "44444444-4444-4444-8444-444444444444";

const state: FeedbackTriageQueueState = {
  kind: "feedback_triage_queue",
  scopeId,
  generatedAt: "2026-08-24T12:00:00.000Z",
  filters: { scopeId, limit: 50 },
  items: [],
};

const item: FeedbackTriageQueueState["items"][number] = {
  ticketId,
  participantId,
  type: "BUG_TECNICO",
  description: "Relato sintético para triagem.",
  createdAt: "2026-08-24T11:00:00.000Z",
  status: "NOVO",
  version: 0,
};

function repository(
  value: FeedbackTriageQueueState,
): FeedbackTriageQueueReadPort {
  return {
    listFeedbackTickets: async () => value,
  };
}

describe("feedback triage queue use case", () => {
  it("allows an active scoped staff member and freezes the result", async () => {
    const result = await getFeedbackTriageQueue(
      {
        principalId,
        accountStatus: "ACTIVE",
        roles: ["MODERATOR"],
        scopes: [scopeId],
        query: { scopeId, status: "NOVO", limit: 25 },
      },
      repository({
        ...state,
        filters: { scopeId, status: "NOVO", limit: 25 },
        items: [item],
      }),
    );

    expect(result.items).toEqual([item]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.filters)).toBe(true);
    expect(Object.isFrozen(result.items)).toBe(true);
    expect(Object.isFrozen(result.items[0])).toBe(true);
  });

  it("fails closed for participants, cross-scope results and invalid bounds", async () => {
    await expect(
      getFeedbackTriageQueue(
        {
          principalId,
          accountStatus: "ACTIVE",
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
          query: { scopeId },
        },
        repository(state),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });

    await expect(
      getFeedbackTriageQueue(
        {
          principalId,
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
          query: { scopeId, limit: 101 },
        },
        repository({
          ...state,
          scopeId: "55555555-5555-4555-8555-555555555555",
        }),
      ),
    ).rejects.toMatchObject({ code: "validation_error" });

    await expect(
      getFeedbackTriageQueue(
        {
          principalId,
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
          query: { scopeId },
        },
        repository({
          ...state,
          scopeId: "55555555-5555-4555-8555-555555555555",
        }),
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});
