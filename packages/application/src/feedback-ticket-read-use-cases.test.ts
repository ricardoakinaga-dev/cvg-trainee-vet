import { describe, expect, it, vi } from "vitest";

import { getParticipantFeedback } from "./feedback-ticket-read-use-cases.js";

const participantId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";

describe("participant feedback read", () => {
  it("returns only bounded own ticket states from authorized scopes", async () => {
    const listFeedbackTickets = vi.fn(async () => [
      {
        scopeId,
        state: {
          ticketId: "33333333-3333-4333-8333-333333333333",
          participantId,
          type: "MELHORIA" as const,
          description: "Relato sintético.",
          createdAt: "2026-08-24T12:00:00.000Z",
          version: 0,
          status: "NOVO" as const,
          priority: "NORMAL" as const,
        },
      },
    ]);

    const result = await getParticipantFeedback(
      { participantId, scopeIds: [scopeId] },
      { listFeedbackTickets },
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: "MELHORIA", status: "NOVO" });
    expect(listFeedbackTickets).toHaveBeenCalledWith(participantId, [scopeId]);
  });

  it("fails closed when a read port returns another participant or scope", async () => {
    await expect(
      getParticipantFeedback(
        { participantId, scopeIds: [scopeId] },
        {
          listFeedbackTickets: async () => [
            {
              scopeId: "44444444-4444-4444-8444-444444444444",
              state: {
                ticketId: "55555555-5555-4555-8555-555555555555",
                participantId: "66666666-6666-4666-8666-666666666666",
                type: "BUG_TECNICO",
                description: "Relato sintético.",
                createdAt: "2026-08-24T12:00:00.000Z",
                version: 0,
                status: "NOVO",
                priority: "NORMAL",
              },
            },
          ],
        },
      ),
    ).rejects.toMatchObject({ code: "internal_error" });
  });
});
