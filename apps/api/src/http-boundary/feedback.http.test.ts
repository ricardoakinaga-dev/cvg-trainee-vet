import { describe, expect, it, vi } from "vitest";

import type { FeedbackTicketState } from "@cvg/domain";
import { ApplicationError } from "@cvg/application";

import { handleApiRequest } from "../http.js";
import {
  attempt,
  dependencies,
  feedbackTicketHistory,
  feedbackTriageQueue,
} from "./fixtures.js";

describe("API HTTP boundary — feedback boundary", () => {
  it("returns the bounded internal feedback queue and denies participant access", async () => {
    const getFeedbackTriageQueue = vi.fn(async () => feedbackTriageQueue);
    const scopeId = feedbackTriageQueue.scopeId;
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/feedback",
        query: {
          scopeId,
          status: "NOVO",
          limit: "25",
          cursor: "cursor-page-2",
        },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "44444444-4444-4444-8444-444444444444",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
        }),
        getFeedbackTriageQueue,
      }),
    );

    expect(response.status).toBe(200);
    expect(getFeedbackTriageQueue).toHaveBeenCalledWith({
      principalId: "44444444-4444-4444-8444-444444444444",
      accountStatus: "ACTIVE",
      roles: ["MODERATOR"],
      scopes: [scopeId],
      query: {
        scopeId,
        status: "NOVO",
        limit: 25,
        cursor: "cursor-page-2",
      },
    });
    expect(response.body).toMatchObject({
      success: true,
      data: {
        kind: "feedback_triage_queue",
        items: [{ type: "ERRO_CONTEUDO", status: "NOVO" }],
      },
      meta: {
        has_next: true,
        next_cursor: "cursor-page-2",
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("participantId");

    const clinicalResponse = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/feedback",
        query: { scopeId, status: "NOVO", limit: "25" },
        body: undefined,
      },
      dependencies({
        approvedClinicalApproverId: "44444444-4444-4444-8444-444444444444",
        authenticate: async () => ({
          principalId: "44444444-4444-4444-8444-444444444444",
          accountStatus: "ACTIVE",
          roles: ["CLINICAL_APPROVER"],
          scopes: [scopeId],
        }),
        getFeedbackTriageQueue,
      }),
    );
    expect(clinicalResponse.status).toBe(200);
    expect(getFeedbackTriageQueue).toHaveBeenLastCalledWith(
      expect.objectContaining({
        approvedClinicalApproverId: "44444444-4444-4444-8444-444444444444",
      }),
    );

    const participant = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/feedback",
        query: { scopeId },
        body: undefined,
      },
      dependencies({ getFeedbackTriageQueue }),
    );
    expect(participant.status).toBe(403);
    expect(getFeedbackTriageQueue).toHaveBeenCalledTimes(2);

    const invalid = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/feedback",
        query: { scopeId, participantId: attempt.participantId },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "44444444-4444-4444-8444-444444444444",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
        }),
        getFeedbackTriageQueue,
      }),
    );
    expect(invalid.status).toBe(422);
    expect(getFeedbackTriageQueue).toHaveBeenCalledTimes(2);
  });
  it("returns a scoped read-only feedback history without queue or participant fields", async () => {
    const getFeedbackTicketHistory = vi.fn(async () => feedbackTicketHistory);
    const principalId = "55555555-5555-4555-8555-555555555555";
    const response = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/internal/feedback/${feedbackTicketHistory.ticketId}/history`,
        query: { limit: "25" },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId,
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [feedbackTicketHistory.scopeId],
        }),
        getFeedbackTicketHistory,
      }),
    );

    expect(response.status).toBe(200);
    expect(getFeedbackTicketHistory).toHaveBeenCalledWith({
      principalId,
      accountStatus: "ACTIVE",
      roles: ["MODERATOR"],
      scopes: [feedbackTicketHistory.scopeId],
      ticketId: feedbackTicketHistory.ticketId,
      limit: 25,
    });
    expect(response.body).toMatchObject({
      success: true,
      data: {
        ticketId: feedbackTicketHistory.ticketId,
        events: [
          { eventType: "CRIADO", ticketVersion: 0, toStatus: "NOVO" },
          {
            eventType: "STATUS_ALTERADO",
            ticketVersion: 1,
            fromStatus: "NOVO",
            toStatus: "TRIADO",
          },
        ],
      },
    });
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain("scopeId");
    expect(serialized).not.toContain("participantId");
    expect(serialized).not.toContain("description");

    const participantResponse = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/internal/feedback/${feedbackTicketHistory.ticketId}/history`,
        query: {},
        body: undefined,
      },
      dependencies({ getFeedbackTicketHistory }),
    );
    expect(participantResponse.status).toBe(403);
    expect(getFeedbackTicketHistory).toHaveBeenCalledTimes(1);

    const invalidPathResponse = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/feedback/not-an-id/history",
        query: {},
        body: undefined,
      },
      dependencies({ getFeedbackTicketHistory }),
    );
    expect(invalidPathResponse.status).toBe(422);

    const invalidQueryResponse = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/internal/feedback/${feedbackTicketHistory.ticketId}/history`,
        query: { limit: "101" },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId,
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [feedbackTicketHistory.scopeId],
        }),
        getFeedbackTicketHistory,
      }),
    );
    expect(invalidQueryResponse.status).toBe(422);
    expect(getFeedbackTicketHistory).toHaveBeenCalledTimes(1);

    const missingResponse = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/internal/feedback/${feedbackTicketHistory.ticketId}/history`,
        query: {},
        body: undefined,
      },
      dependencies({
        getFeedbackTicketHistory: async () => null,
        authenticate: async () => ({
          principalId,
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [feedbackTicketHistory.scopeId],
        }),
      }),
    );
    expect(missingResponse.status).toBe(404);
  });
  it("keeps feedback triage metadata scoped, strict and server-assigned", async () => {
    const ticketId = "55555555-5555-4555-8555-555555555555";
    const scopeId = "11111111-1111-4111-8111-111111111111";
    const moderatorId = "88888888-8888-4888-8888-888888888888";
    const updateFeedbackTriageMetadata = vi.fn(async (command) => ({
      ticketId: command.ticketId,
      scopeId,
      status: "NOVO" as const,
      version: command.expectedVersion + 1,
      priority: command.priority,
      assigneeId:
        command.assignment === "ASSUMIR" ? command.principalId : undefined,
    }));
    const staff = {
      principalId: moderatorId,
      accountStatus: "ACTIVE" as const,
      roles: ["MODERATOR"] as const,
      scopes: [scopeId] as const,
    };

    const response = await handleApiRequest(
      {
        method: "PATCH",
        path: `/api/v1/internal/feedback/${ticketId}/triage-metadata`,
        body: {
          expectedVersion: 0,
          priority: "ALTA",
          assignment: "ASSUMIR",
        },
      },
      dependencies({
        authenticate: async () => staff,
        updateFeedbackTriageMetadata,
      }),
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        ticketId,
        scopeId,
        priority: "ALTA",
        assigneeId: moderatorId,
      },
    });
    expect(updateFeedbackTriageMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId,
        expectedVersion: 0,
        priority: "ALTA",
        assignment: "ASSUMIR",
        scopes: [scopeId],
      }),
    );
    expect(updateFeedbackTriageMetadata.mock.calls[0]?.[0]).not.toHaveProperty(
      "scopeId",
    );
    expect(JSON.stringify(response.body)).not.toContain("participantId");

    const extraField = await handleApiRequest(
      {
        method: "PATCH",
        path: `/api/v1/internal/feedback/${ticketId}/triage-metadata`,
        body: {
          expectedVersion: 0,
          priority: "ALTA",
          assignment: "ASSUMIR",
          scopeId,
        },
      },
      dependencies({
        authenticate: async () => staff,
        updateFeedbackTriageMetadata,
      }),
    );
    expect(extraField.status).toBe(422);
    expect(updateFeedbackTriageMetadata).toHaveBeenCalledOnce();

    const participant = await handleApiRequest(
      {
        method: "PATCH",
        path: `/api/v1/internal/feedback/${ticketId}/triage-metadata`,
        body: {
          expectedVersion: 0,
          priority: "ALTA",
          assignment: "ASSUMIR",
        },
      },
      dependencies({
        updateFeedbackTriageMetadata,
        authenticate: async () => ({
          principalId: "22222222-2222-4222-8222-222222222222",
          accountStatus: "ACTIVE",
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
        }),
      }),
    );
    expect(participant.status).toBe(403);
    expect(updateFeedbackTriageMetadata).toHaveBeenCalledOnce();
  });
  it("derives feedback transition identity server-side and allows only approved clinical staff", async () => {
    const scopeId = "11111111-1111-4111-8111-111111111111";
    const ticketId = "55555555-5555-4555-8555-555555555555";
    const participantId = "22222222-2222-4222-8222-222222222222";
    const reviewerId = "88888888-8888-4888-8888-888888888888";
    const ticket: FeedbackTicketState = {
      ticketId,
      participantId,
      type: "BUG_TECNICO",
      description: "Relato sintético.",
      createdAt: "2026-08-10T17:00:00.000Z",
      status: "TRIADO",
      version: 1,
      priority: "NORMAL",
    };
    const transitionFeedbackTicket = vi.fn(async () => ticket);
    const resolveFeedbackTicketParticipant = vi.fn(async () => participantId);
    const staff = {
      principalId: reviewerId,
      accountStatus: "ACTIVE" as const,
      roles: ["MODERATOR"] as const,
      scopes: [scopeId] as const,
    };

    const forged = await handleApiRequest(
      {
        method: "PATCH",
        path: `/api/v1/internal/feedback/${ticketId}`,
        body: {
          ticketId,
          participantId,
          scopeId,
          version: 0,
          event: "TRIAR",
        },
      },
      dependencies({
        transitionFeedbackTicket,
        resolveFeedbackTicketParticipant,
        authenticate: async () => staff,
      }),
    );
    expect(forged.status).toBe(422);
    expect(resolveFeedbackTicketParticipant).not.toHaveBeenCalled();
    expect(transitionFeedbackTicket).not.toHaveBeenCalled();

    const clinical = {
      principalId: reviewerId,
      accountStatus: "ACTIVE" as const,
      roles: ["CLINICAL_APPROVER"] as const,
      scopes: [scopeId] as const,
    };
    const allowed = await handleApiRequest(
      {
        method: "PATCH",
        path: `/api/v1/internal/feedback/${ticketId}`,
        body: { ticketId, scopeId, version: 0, event: "TRIAR" },
      },
      dependencies({
        approvedClinicalApproverId: reviewerId,
        transitionFeedbackTicket,
        resolveFeedbackTicketParticipant,
        authenticate: async () => clinical,
      }),
    );
    expect(allowed.status).toBe(200);
    expect(resolveFeedbackTicketParticipant).toHaveBeenCalledWith(
      ticketId,
      scopeId,
    );
    expect(transitionFeedbackTicket).toHaveBeenCalledWith({
      ticketId,
      participantId,
      scopeId,
      version: 0,
      event: { type: "TRIAR" },
      actorId: clinical.principalId,
      requestId: "request-123",
      correlationId: "request-123",
    });
  });
  it("rejects client-controlled identities, direct closure, and transition conflicts", async () => {
    const scopeId = "11111111-1111-4111-8111-111111111111";
    const appealId = "66666666-6666-4666-8666-666666666666";
    const reviewerId = "88888888-8888-4888-8888-888888888888";
    const staff = {
      principalId: reviewerId,
      accountStatus: "ACTIVE" as const,
      roles: ["MODERATOR"] as const,
      scopes: [scopeId] as const,
    };
    const transitionAppealReview = vi.fn(async () => ({
      appealId,
      participantId: "22222222-2222-4222-8222-222222222222",
      attemptId: "44444444-4444-4444-8444-444444444444",
      itemId: "77777777-7777-4777-8777-777777777777",
      justification: "Justificativa sintética.",
      createdAt: "2026-08-10T17:00:00.000Z",
      dueAt: "2026-08-19T17:00:00.000Z",
      status: "EM_REVISAO" as const,
      version: 1,
      reviewerId,
    }));

    const identityInjection = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/appeals/${appealId}/transition`,
        body: {
          appealId,
          scopeId,
          version: 0,
          event: "ATRIBUIR_REVISOR",
          participantId: "22222222-2222-4222-8222-222222222222",
          reviewerId: "99999999-9999-4999-8999-999999999999",
        },
      },
      dependencies({
        transitionAppealReview,
        authenticate: async () => staff,
      }),
    );
    expect(identityInjection.status).toBe(422);
    expect(transitionAppealReview).not.toHaveBeenCalled();

    const directClosure = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/appeals/${appealId}/transition`,
        body: {
          appealId,
          scopeId,
          version: 2,
          event: "ENCERRAR",
        },
      },
      dependencies({
        transitionAppealReview,
        authenticate: async () => staff,
      }),
    );
    expect(directClosure.status).toBe(422);
    expect(transitionAppealReview).not.toHaveBeenCalled();

    const clientMetadata = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/appeals/${appealId}/transition`,
        body: {
          appealId,
          scopeId,
          version: 1,
          event: "DECIDIR",
          decision: "MANTER_RESULTADO",
          decisionRationale: "A decisão sintética mantém o resultado.",
          decisionAt: "2026-08-24T12:01:00.000Z",
          decisionCorrelationId: "99999999-9999-4999-8999-999999999999",
        },
      },
      dependencies({
        transitionAppealReview,
        authenticate: async () => staff,
      }),
    );
    expect(clientMetadata.status).toBe(422);
    expect(transitionAppealReview).not.toHaveBeenCalled();

    const forbiddenTransition = vi.fn(async () => {
      throw new ApplicationError(
        "forbidden",
        "Appeal transition requires the assigned reviewer",
      );
    });
    const forbidden = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/appeals/${appealId}/transition`,
        body: {
          appealId,
          scopeId,
          version: 1,
          event: "DECIDIR",
          decision: "MANTER_RESULTADO",
          decisionRationale: "A decisão sintética mantém o resultado.",
        },
      },
      dependencies({
        transitionAppealReview: forbiddenTransition,
        authenticate: async () => staff,
      }),
    );
    expect(forbidden.status).toBe(403);
    expect(forbiddenTransition).toHaveBeenCalledWith({
      appealId,
      scopeId,
      version: 1,
      actorId: reviewerId,
      correlationId: "request-123",
      event: {
        type: "DECIDIR",
        decision: "MANTER_RESULTADO",
        decisionRationale: "A decisão sintética mantém o resultado.",
      },
    });

    const staleTransition = vi.fn(async () => {
      throw new ApplicationError("state_conflict", "Learning state changed");
    });
    const stale = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/appeals/${appealId}/transition`,
        body: {
          appealId,
          scopeId,
          version: 0,
          event: "ATRIBUIR_REVISOR",
        },
      },
      dependencies({
        transitionAppealReview: staleTransition,
        authenticate: async () => staff,
      }),
    );
    expect(stale.status).toBe(409);
  });
  it("accepts internal decision rationale, binds request correlation, and keeps it out of the public projection", async () => {
    const scopeId = "11111111-1111-4111-8111-111111111111";
    const appealId = "66666666-6666-4666-8666-666666666666";
    const reviewerId = "88888888-8888-4888-8888-888888888888";
    const correlationId = "99999999-9999-4999-8999-999999999999";
    const decisionRationale = "A revisão sintética fundamenta a decisão.";
    const transitionAppealReview = vi.fn(async () => ({
      appealId,
      participantId: "22222222-2222-4222-8222-222222222222",
      attemptId: "44444444-4444-4444-8444-444444444444",
      itemId: "77777777-7777-4777-8777-777777777777",
      justification: "Justificativa sintética.",
      createdAt: "2026-08-10T17:00:00.000Z",
      dueAt: "2026-08-19T17:00:00.000Z",
      status: "DECIDIDA" as const,
      version: 2,
      reviewerId,
      decision: "ANULAR_ITEM" as const,
      decisionRationale,
      decisionAt: "2026-08-24T12:01:00.000Z",
      decisionCorrelationId: correlationId,
    }));
    const response = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/appeals/${appealId}/transition`,
        body: {
          appealId,
          scopeId,
          version: 1,
          event: "DECIDIR",
          decision: "ANULAR_ITEM",
          decisionRationale,
        },
      },
      dependencies({
        requestIdFactory: () => correlationId,
        transitionAppealReview,
        authenticate: async () => ({
          principalId: reviewerId,
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(transitionAppealReview).toHaveBeenCalledWith({
      appealId,
      scopeId,
      version: 1,
      actorId: reviewerId,
      correlationId,
      event: {
        type: "DECIDIR",
        decision: "ANULAR_ITEM",
        decisionRationale,
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("decisionRationale");
    expect(
      JSON.stringify((response.body as { data?: unknown }).data),
    ).not.toContain(correlationId);
  });
});
