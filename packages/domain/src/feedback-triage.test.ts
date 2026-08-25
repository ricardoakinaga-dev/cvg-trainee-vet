import { describe, expect, it } from "vitest";

import {
  createFeedbackTicket,
  setFeedbackTicketTriage,
  transitionFeedbackTicket,
} from "./learning-state.js";

describe("feedback triage metadata", () => {
  it("changes priority and self-assignee without changing the ticket status", () => {
    const created = createFeedbackTicket({
      ticketId: "33333333-3333-4333-8333-333333333333",
      participantId: "44444444-4444-4444-8444-444444444444",
      type: "BUG_TECNICO",
      description: "Relato sintético.",
      createdAt: "2026-08-24T12:00:00.000Z",
    });
    const updated = setFeedbackTicketTriage(created, {
      priority: "ALTA",
      assigneeId: "55555555-5555-4555-8555-555555555555",
    });

    expect(updated).toMatchObject({
      status: "NOVO",
      version: 1,
      priority: "ALTA",
      assigneeId: "55555555-5555-4555-8555-555555555555",
    });
    expect(Object.isFrozen(updated)).toBe(true);
  });

  it("supports explicit release and rejects malformed metadata", () => {
    const created = createFeedbackTicket({
      ticketId: "33333333-3333-4333-8333-333333333333",
      participantId: "44444444-4444-4444-8444-444444444444",
      type: "MELHORIA",
      description: "Relato sintético.",
      createdAt: "2026-08-24T12:00:00.000Z",
    });
    const released = setFeedbackTicketTriage(created, {
      priority: "NORMAL",
      assigneeId: null,
    });

    expect(released).not.toHaveProperty("assigneeId");
    expect(() =>
      setFeedbackTicketTriage(created, {
        priority: "CRITICA" as never,
        assigneeId: null,
      }),
    ).toThrow();
    expect(() =>
      setFeedbackTicketTriage(created, {
        priority: "ALTA",
        assigneeId: "not-a-uuid",
      }),
    ).toThrow();
  });

  it("preserves an existing status and validates its current metadata", () => {
    const created = createFeedbackTicket({
      ticketId: "33333333-3333-4333-8333-333333333333",
      participantId: "44444444-4444-4444-8444-444444444444",
      type: "ERRO_CONTEUDO",
      description: "Relato sintético.",
      createdAt: "2026-08-24T12:00:00.000Z",
    });
    const triaged = transitionFeedbackTicket(created, { type: "TRIAR" });
    const assigned = setFeedbackTicketTriage(triaged, {
      priority: "URGENTE",
      assigneeId: "55555555-5555-4555-8555-555555555555",
    });

    expect(assigned).toMatchObject({
      status: "TRIADO",
      version: 2,
      priority: "URGENTE",
    });
    expect(() =>
      setFeedbackTicketTriage(
        { ...triaged, assigneeId: "not-a-uuid" },
        { priority: "NORMAL", assigneeId: null },
      ),
    ).toThrow();
  });
});
