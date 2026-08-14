import { describe, expect, it } from "vitest";

import { createFeedbackTicket } from "@cvg/domain";

import {
  feedbackTicketRowToState,
  feedbackTicketStateToRow,
} from "./learning-state-repository.js";

const context = {
  logicalPage: "/dashboard",
  appVersion: "web-0.1.0",
  occurredAt: "2026-08-14T08:00:00.000Z",
  errorCode: "FEEDBACK_TIMEOUT",
} as const;

describe("feedback technical context persistence", () => {
  it("round-trips only the allowlisted diagnostic columns", () => {
    const state = createFeedbackTicket({
      ticketId: "33333333-3333-4333-8333-333333333333",
      participantId: "11111111-1111-4111-8111-111111111111",
      type: "BUG_TECNICO",
      description: "Falha sintética de teste.",
      createdAt: "2026-08-14T08:00:00.000Z",
      technicalContext: context,
    });
    const row = feedbackTicketStateToRow({
      scopeId: "22222222-2222-4222-8222-222222222222",
      state,
    });

    expect(row).toMatchObject({
      logicalPage: "/dashboard",
      appVersion: "web-0.1.0",
      occurredAt: new Date(context.occurredAt),
      errorCode: "FEEDBACK_TIMEOUT",
    });
    expect(
      feedbackTicketRowToState({
        ...row,
        createdAt: new Date("2026-08-14T08:00:00.000Z"),
        updatedAt: new Date("2026-08-14T08:00:00.000Z"),
      }).state.technicalContext,
    ).toEqual(context);
  });

  it("persists the urgent content-error alert without widening the row", () => {
    const state = createFeedbackTicket({
      ticketId: "44444444-4444-4444-8444-444444444444",
      participantId: "11111111-1111-4111-8111-111111111111",
      type: "ERRO_CONTEUDO",
      description: "O conteúdo sintético precisa ser retirado.",
      createdAt: "2026-08-14T08:00:00.000Z",
    });
    const row = feedbackTicketStateToRow({
      scopeId: "22222222-2222-4222-8222-222222222222",
      state,
    });

    expect(row).toMatchObject({
      priority: "URGENTE",
      alertedAt: new Date("2026-08-14T08:00:00.000Z"),
    });
    expect(
      feedbackTicketRowToState({
        ...row,
        createdAt: new Date("2026-08-14T08:00:00.000Z"),
        updatedAt: new Date("2026-08-14T08:00:00.000Z"),
      }).state,
    ).toMatchObject({
      type: "ERRO_CONTEUDO",
      priority: "URGENTE",
      alertedAt: "2026-08-14T08:00:00.000Z",
    });
  });

  it("keeps legacy unsafe text available for the API redaction boundary", () => {
    const state = feedbackTicketRowToState({
      id: "55555555-5555-4555-8555-555555555555",
      participantId: "11111111-1111-4111-8111-111111111111",
      scopeId: "22222222-2222-4222-8222-222222222222",
      type: "BUG_TECNICO",
      description: "patientId: synthetic-legacy",
      createdAt: new Date("2026-08-14T08:00:00.000Z"),
      version: 0,
      status: "NOVO",
      priority: "NORMAL",
      assigneeId: null,
      response: null,
      responseAt: null,
      responseBy: null,
      history: null,
      logicalPage: "/feedback",
      appVersion: "api-0.1.0",
      occurredAt: null,
      errorCode: null,
      alertedAt: null,
      updatedAt: new Date("2026-08-14T08:00:00.000Z"),
    });

    expect(state.state.description).toBe("patientId: synthetic-legacy");
  });
});
