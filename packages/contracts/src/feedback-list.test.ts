import { describe, expect, it } from "vitest";

import {
  feedbackTicketListQuerySchema,
  feedbackTicketListProjectionSchema,
  internalFeedbackTicketProjectionSchema,
  participantFeedbackTicketProjectionSchema,
} from "./learning-state.js";

const ids = {
  ticketId: "33333333-3333-4333-8333-333333333333",
  participantId: "11111111-1111-4111-8111-111111111111",
  scopeId: "22222222-2222-4222-8222-222222222222",
  assigneeId: "44444444-4444-4444-8444-444444444444",
};

describe("feedback list contract", () => {
  it("accepts participant and internal projections with response and history", () => {
    const participant = participantFeedbackTicketProjectionSchema.parse({
      ticketId: ids.ticketId,
      type: "BUG_TECNICO",
      description: "Falha sintética de teste.",
      createdAt: "2026-08-14T08:00:00.000Z",
      status: "EM_TRATAMENTO",
      version: 3,
      priority: "URGENTE",
      response: {
        message: "Recebemos o relato.",
        respondedAt: "2026-08-14T08:05:00.000Z",
      },
      history: [
        { status: "NOVO", changedAt: "2026-08-14T08:00:00.000Z" },
        { status: "EM_TRATAMENTO", changedAt: "2026-08-14T08:04:00.000Z" },
      ],
    });
    const internal = internalFeedbackTicketProjectionSchema.parse({
      ...participant,
      participantId: ids.participantId,
      scopeId: ids.scopeId,
      assigneeId: ids.assigneeId,
      response: {
        ...participant.response,
        respondedBy: ids.assigneeId,
      },
      history: [
        ...(participant.history ?? []),
        {
          status: "EM_TRATAMENTO",
          changedAt: "2026-08-14T08:05:00.000Z",
          actorId: ids.assigneeId,
        },
      ],
    });

    expect(
      feedbackTicketListProjectionSchema.parse({ tickets: [participant] }),
    ).toEqual({
      tickets: [participant],
    });
    expect(internal).toMatchObject({ participantId: ids.participantId });
  });

  it("whitelists scope and status filters and rejects arbitrary query fields", () => {
    expect(
      feedbackTicketListQuerySchema.parse({
        scopeId: ids.scopeId,
        status: "EM_TRATAMENTO",
        priority: "URGENTE",
      }),
    ).toMatchObject({ scopeId: ids.scopeId, priority: "URGENTE" });
    expect(() =>
      feedbackTicketListQuerySchema.parse({ sql: "select *" }),
    ).toThrow();
  });
});
