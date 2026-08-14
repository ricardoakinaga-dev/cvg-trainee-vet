import { describe, expect, it } from "vitest";

import {
  createFeedbackTicket,
  transitionFeedbackTicket,
  type FeedbackTicketState,
} from "./learning-state.js";

const technicalContext = {
  logicalPage: "/dashboard",
  appVersion: "web-0.1.0",
  occurredAt: "2026-08-14T08:00:00.000Z",
  errorCode: "FEEDBACK_TIMEOUT",
} as const;

describe("feedback technical context", () => {
  it("keeps the allowlisted diagnostic context immutable and separate from report text", () => {
    const ticket = createFeedbackTicket({
      ticketId: "ticket-technical-context",
      participantId: "participant-1",
      type: "BUG_TECNICO",
      description: "Falha sintética de teste.",
      createdAt: "2026-08-14T08:00:00.000Z",
      technicalContext,
    });

    expect(ticket.technicalContext).toEqual(technicalContext);
    expect(Object.isFrozen(ticket.technicalContext)).toBe(true);
  });

  it("records priority, assignment, response, and immutable state history", () => {
    const ticket = createFeedbackTicket({
      ticketId: "ticket-history",
      participantId: "participant-1",
      type: "BUG_TECNICO",
      description: "Falha sintética de teste.",
      createdAt: "2026-08-14T08:00:00.000Z",
    });

    expect(ticket.priority).toBe("NORMAL");
    expect(ticket.history).toEqual([
      { status: "NOVO", changedAt: "2026-08-14T08:00:00.000Z" },
    ]);

    const triaged = transitionFeedbackTicket(ticket, {
      type: "TRIAR",
      now: "2026-08-14T08:01:00.000Z",
      actorId: "moderator-1",
    });
    const prioritized = transitionFeedbackTicket(triaged, {
      type: "PRIORIZAR",
      priority: "URGENTE",
      now: "2026-08-14T08:02:00.000Z",
      actorId: "moderator-1",
    });
    const assigned = transitionFeedbackTicket(prioritized, {
      type: "ATRIBUIR",
      assigneeId: "moderator-2",
      now: "2026-08-14T08:03:00.000Z",
      actorId: "moderator-1",
    });
    const treated = transitionFeedbackTicket(assigned, {
      type: "INICIAR_TRATAMENTO",
      now: "2026-08-14T08:04:00.000Z",
      actorId: "moderator-2",
    });
    const responded = transitionFeedbackTicket(treated, {
      type: "RESPONDER",
      response: "Recebemos o relato e iniciamos a análise.",
      now: "2026-08-14T08:05:00.000Z",
      actorId: "moderator-2",
    });

    expect(responded.priority).toBe("URGENTE");
    expect(responded.assigneeId).toBe("moderator-2");
    expect(responded.response).toEqual({
      message: "Recebemos o relato e iniciamos a análise.",
      respondedAt: "2026-08-14T08:05:00.000Z",
      respondedBy: "moderator-2",
    });
    expect(responded.history).toHaveLength(6);
    expect(responded.history?.at(-1)).toEqual({
      status: "EM_TRATAMENTO",
      changedAt: "2026-08-14T08:05:00.000Z",
      actorId: "moderator-2",
    });
    expect(Object.isFrozen(responded.history)).toBe(true);
  });

  it("rejects URLs, sensitive query fragments, and arbitrary context fields", () => {
    expect(() =>
      createFeedbackTicket({
        ticketId: "ticket-unsafe-page",
        participantId: "participant-1",
        type: "BUG_TECNICO",
        description: "Falha sintética de teste.",
        createdAt: "2026-08-14T08:00:00.000Z",
        technicalContext: {
          ...technicalContext,
          logicalPage: "/dashboard?token=secret",
        },
      }),
    ).toThrow("logicalPage");

    expect(() =>
      createFeedbackTicket({
        ticketId: "ticket-unsafe-field",
        participantId: "participant-1",
        type: "BUG_TECNICO",
        description: "Falha sintética de teste.",
        createdAt: "2026-08-14T08:00:00.000Z",
        technicalContext: {
          ...technicalContext,
          patientId: "patient-forbidden",
        } as never,
      }),
    ).toThrow("technicalContext");
  });

  it("marks content errors as urgent alerts and blocks prohibited report content", () => {
    const contentError = createFeedbackTicket({
      ticketId: "ticket-content-error",
      participantId: "participant-1",
      type: "ERRO_CONTEUDO",
      description: "O conteúdo sintético apresenta uma regra inconsistente.",
      createdAt: "2026-08-14T08:00:00.000Z",
    });

    expect(contentError).toMatchObject({
      priority: "URGENTE",
      alertedAt: "2026-08-14T08:00:00.000Z",
    });

    expect(() =>
      createFeedbackTicket({
        ticketId: "ticket-sensitive-description",
        participantId: "participant-1",
        type: "BUG_TECNICO",
        description: "prontuário: synthetic-001",
        createdAt: "2026-08-14T08:00:00.000Z",
      }),
    ).toThrow("prohibited");

    const triaged = transitionFeedbackTicket(
      transitionFeedbackTicket(
        createFeedbackTicket({
          ticketId: "ticket-sensitive-response",
          participantId: "participant-1",
          type: "BUG_TECNICO",
          description: "Falha sintética de teste.",
          createdAt: "2026-08-14T08:00:00.000Z",
        }),
        { type: "TRIAR" },
      ),
      { type: "INICIAR_TRATAMENTO" },
    );

    expect(() =>
      transitionFeedbackTicket(triaged, {
        type: "RESPONDER",
        response: "patientId: synthetic-id",
      }),
    ).toThrow("prohibited");
  });

  it("covers feedback workflow validation boundaries and legacy history", () => {
    const created = createFeedbackTicket({
      ticketId: "ticket-boundaries",
      participantId: "participant-1",
      type: "BUG_TECNICO",
      description: "Falha sintética de teste.",
      createdAt: "2026-08-14T08:00:00.000Z",
    });
    const triaged = transitionFeedbackTicket(created, { type: "TRIAR" });
    const treatment = transitionFeedbackTicket(triaged, {
      type: "INICIAR_TRATAMENTO",
    });
    const respondedWithoutActor = transitionFeedbackTicket(treatment, {
      type: "RESPONDER",
      response: "Resposta sintética.",
    });
    expect(respondedWithoutActor.response).toEqual({
      message: "Resposta sintética.",
      respondedAt: created.createdAt,
    });
    expect(
      transitionFeedbackTicket(respondedWithoutActor, {
        type: "PRIORIZAR",
        priority: "ALTA",
      }).priority,
    ).toBe("ALTA");

    const legacy: FeedbackTicketState = {
      ticketId: created.ticketId,
      participantId: created.participantId,
      type: created.type,
      description: created.description,
      createdAt: created.createdAt,
      version: created.version,
      status: created.status,
    };
    expect(transitionFeedbackTicket(legacy, { type: "TRIAR" }).history).toEqual(
      [
        { status: "NOVO", changedAt: created.createdAt },
        { status: "TRIADO", changedAt: created.createdAt },
      ],
    );

    expect(() =>
      createFeedbackTicket({
        ...created,
        ticketId: "ticket-null-context",
        technicalContext: null as never,
      }),
    ).toThrow("technicalContext must be an object");
    expect(() =>
      createFeedbackTicket({
        ...created,
        ticketId: "ticket-array-context",
        technicalContext: [] as never,
      }),
    ).toThrow("technicalContext must be an object");
    expect(() =>
      createFeedbackTicket({
        ...created,
        ticketId: "ticket-version-context",
        technicalContext: { ...technicalContext, appVersion: "" },
      }),
    ).toThrow("appVersion");
    expect(() =>
      createFeedbackTicket({
        ...created,
        ticketId: "ticket-time-context",
        technicalContext: {
          ...technicalContext,
          occurredAt: "invalid",
        },
      }),
    ).toThrow("occurredAt");
    expect(() =>
      createFeedbackTicket({
        ...created,
        ticketId: "ticket-code-context",
        technicalContext: { ...technicalContext, errorCode: "invalid" },
      }),
    ).toThrow("errorCode");

    expect(() =>
      transitionFeedbackTicket(
        { ...created, priority: "INVALID" as never },
        { type: "TRIAR" },
      ),
    ).toThrow("priority");
    expect(() =>
      transitionFeedbackTicket(
        { ...created, assigneeId: "" },
        { type: "TRIAR" },
      ),
    ).toThrow("assigneeId");
    expect(() =>
      transitionFeedbackTicket(
        {
          ...respondedWithoutActor,
          response: {
            ...respondedWithoutActor.response!,
            respondedAt: "invalid",
          },
        },
        { type: "PRIORIZAR", priority: "ALTA" },
      ),
    ).toThrow("respondedAt");
    expect(() =>
      transitionFeedbackTicket(
        {
          ...respondedWithoutActor,
          response: {
            ...respondedWithoutActor.response!,
            respondedBy: "",
          },
        },
        { type: "PRIORIZAR", priority: "ALTA" },
      ),
    ).toThrow("respondedBy");

    expect(() => transitionFeedbackTicket(created, null as never)).toThrow(
      "event",
    );
    expect(() =>
      transitionFeedbackTicket(created, {
        type: "TRIAR",
        now: "invalid",
      }),
    ).toThrow("event now");
    expect(() =>
      transitionFeedbackTicket(created, { type: "TRIAR", actorId: "" }),
    ).toThrow("actorId");
    expect(() =>
      transitionFeedbackTicket(triaged, {
        type: "PRIORIZAR",
        priority: "INVALID" as never,
      }),
    ).toThrow("priority");
    expect(() =>
      transitionFeedbackTicket(triaged, {
        type: "ATRIBUIR",
        assigneeId: "",
      }),
    ).toThrow("assigneeId");
    expect(() =>
      transitionFeedbackTicket(treatment, {
        type: "RESPONDER",
        response: "",
      }),
    ).toThrow("response");

    expect(() =>
      transitionFeedbackTicket({ ...created, history: [] }, { type: "TRIAR" }),
    ).toThrow("between 1 and 100");
    expect(() =>
      transitionFeedbackTicket(
        {
          ...created,
          history: Array.from({ length: 101 }, () => ({
            status: "NOVO" as const,
            changedAt: created.createdAt,
          })),
        },
        { type: "TRIAR" },
      ),
    ).toThrow("between 1 and 100");
    expect(() =>
      transitionFeedbackTicket(
        {
          ...created,
          history: [
            { status: "INVALID" as never, changedAt: created.createdAt },
          ],
        },
        { type: "TRIAR" },
      ),
    ).toThrow("history status");
    expect(() =>
      transitionFeedbackTicket(
        {
          ...created,
          history: [{ status: "NOVO", changedAt: "invalid" }],
        },
        { type: "TRIAR" },
      ),
    ).toThrow("history changedAt");
    expect(() =>
      transitionFeedbackTicket(
        {
          ...created,
          history: [
            { status: "NOVO", changedAt: created.createdAt, actorId: "" },
          ],
        },
        { type: "TRIAR" },
      ),
    ).toThrow("actorId");
    expect(() =>
      transitionFeedbackTicket(
        {
          ...created,
          history: Array.from({ length: 100 }, () => ({
            status: "NOVO" as const,
            changedAt: created.createdAt,
          })),
        },
        { type: "TRIAR" },
      ),
    ).toThrow("cannot exceed 100");

    const resolved = transitionFeedbackTicket(treatment, { type: "RESOLVER" });
    expect(() => transitionFeedbackTicket(resolved, { type: "TRIAR" })).toThrow(
      "not allowed",
    );
  });
});
