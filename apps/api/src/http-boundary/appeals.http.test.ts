import { describe, expect, it, vi } from "vitest";

import type {
  AppealState,
  AssessmentWorkflowState,
  FeedbackTicketState,
} from "@cvg/domain";

import { handleApiRequest } from "../http.js";
import {
  activity,
  answer,
  appealDecisionImpact,
  appealReviewHistory,
  appealReviewQueue,
  attempt,
  dependencies,
} from "./fixtures.js";

describe("API HTTP boundary — appeals boundary", () => {
  it("returns the scoped appeal review queue without mutation or public fields", async () => {
    const getAppealReviewQueue = vi.fn(async () => appealReviewQueue);
    const scopeId = appealReviewQueue.scopeId;
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/appeals/review-queue",
        query: { scopeId, status: "ABERTA", limit: "25" },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "66666666-6666-4666-8666-666666666666",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
        }),
        getAppealReviewQueue,
      }),
    );

    expect(response.status).toBe(200);
    expect(getAppealReviewQueue).toHaveBeenCalledWith({
      principalId: "66666666-6666-4666-8666-666666666666",
      accountStatus: "ACTIVE",
      roles: ["MODERATOR"],
      scopes: [scopeId],
      query: { scopeId, status: "ABERTA", limit: 25 },
    });
    expect(response.body).toMatchObject({
      success: true,
      data: {
        kind: "appeal_review_queue",
        items: [{ justification: "Solicito revisão do resultado sintético." }],
      },
    });
    const item = (
      response.body as {
        readonly data: { readonly items: readonly Record<string, unknown>[] };
      }
    ).data.items[0];
    expect(item).not.toHaveProperty("response");
    expect(item).not.toHaveProperty("score");
    expect(item).not.toHaveProperty("answerKey");
  });
  it("denies participant access and rejects unknown queue filters", async () => {
    const getAppealReviewQueue = vi.fn(async () => appealReviewQueue);
    const scopeId = appealReviewQueue.scopeId;
    const participant = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/appeals/review-queue",
        query: { scopeId },
        body: undefined,
      },
      dependencies({ getAppealReviewQueue }),
    );
    expect(participant.status).toBe(403);
    expect(getAppealReviewQueue).not.toHaveBeenCalled();

    const invalid = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/appeals/review-queue",
        query: { scopeId, participantId: attempt.participantId },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "66666666-6666-4666-8666-666666666666",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
        }),
        getAppealReviewQueue,
      }),
    );
    expect(invalid.status).toBe(422);
    expect(getAppealReviewQueue).not.toHaveBeenCalled();
  });
  it("returns an authorized internal appeal history and rejects unsafe variants", async () => {
    const getAppealReviewHistory = vi.fn(async () => appealReviewHistory);
    const principalId = "88888888-8888-4888-8888-888888888888";
    const response = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/internal/appeals/${appealReviewHistory.appealId}/history`,
        query: { limit: "25" },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId,
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [appealReviewHistory.scopeId],
        }),
        getAppealReviewHistory,
      }),
    );

    expect(response.status).toBe(200);
    expect(getAppealReviewHistory).toHaveBeenCalledWith({
      principalId,
      accountStatus: "ACTIVE",
      roles: ["MODERATOR"],
      scopes: [appealReviewHistory.scopeId],
      appealId: appealReviewHistory.appealId,
      limit: 25,
    });
    expect(response.body).toMatchObject({
      success: true,
      data: {
        appealId: appealReviewHistory.appealId,
        events: [
          {
            eventType: "DECIDIR",
            decisionRationale: "Rationale interno sintético.",
          },
        ],
      },
    });
    expect(JSON.stringify(response.body)).toContain("decisionCorrelationId");

    const participantResponse = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/internal/appeals/${appealReviewHistory.appealId}/history`,
        query: {},
        body: undefined,
      },
      dependencies({ getAppealReviewHistory }),
    );
    expect(participantResponse.status).toBe(403);
    expect(getAppealReviewHistory).toHaveBeenCalledTimes(1);

    const unauthenticatedResponse = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/internal/appeals/${appealReviewHistory.appealId}/history`,
        query: {},
        body: undefined,
      },
      dependencies({
        getAppealReviewHistory,
        authenticate: async () => null,
      }),
    );
    expect(unauthenticatedResponse.status).toBe(401);
    expect(getAppealReviewHistory).toHaveBeenCalledTimes(1);

    const invalidResponse = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/appeals/not-an-id/history",
        query: {},
        body: undefined,
      },
      dependencies({ getAppealReviewHistory }),
    );
    expect(invalidResponse.status).toBe(422);

    const invalidQueryResponse = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/internal/appeals/${appealReviewHistory.appealId}/history`,
        query: { limit: "101" },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId,
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [appealReviewHistory.scopeId],
        }),
        getAppealReviewHistory,
      }),
    );
    expect(invalidQueryResponse.status).toBe(422);
    expect(getAppealReviewHistory).toHaveBeenCalledTimes(1);

    const missingResponse = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/internal/appeals/${appealReviewHistory.appealId}/history`,
        query: {},
        body: undefined,
      },
      dependencies({
        getAppealReviewHistory: async () => null,
        authenticate: async () => ({
          principalId,
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [appealReviewHistory.scopeId],
        }),
      }),
    );
    expect(missingResponse.status).toBe(404);
  });
  it("fails closed when the appeal review queue dependency is unavailable", async () => {
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/internal/appeals/review-queue",
        query: { scopeId: appealReviewQueue.scopeId },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId: "66666666-6666-4666-8666-666666666666",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [appealReviewQueue.scopeId],
        }),
      }),
    );
    expect(response.status).toBe(500);
  });
  it("returns a scoped, non-mutating ANULAR_ITEM impact preview", async () => {
    const getAppealDecisionImpactPreview = vi.fn(
      async () => appealDecisionImpact,
    );
    const principalId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const scopeId = appealReviewHistory.scopeId;
    const response = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/internal/appeals/${appealDecisionImpact.appealId}/impact-preview`,
        query: { decision: "ANULAR_ITEM" },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId,
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
        }),
        getAppealDecisionImpactPreview,
      }),
    );

    expect(response.status).toBe(200);
    expect(getAppealDecisionImpactPreview).toHaveBeenCalledWith({
      principalId,
      accountStatus: "ACTIVE",
      roles: ["MODERATOR"],
      scopes: [scopeId],
      appealId: appealDecisionImpact.appealId,
      decision: "ANULAR_ITEM",
    });
    expect(response.body).toMatchObject({
      success: true,
      data: {
        decision: "ANULAR_ITEM",
        impact: {
          scoreImpact: "NOT_COMPUTED",
          automaticMutation: "NONE",
          publication: "NOT_PERFORMED",
        },
      },
    });
    expect(JSON.stringify(response.body)).not.toContain('"participantId":');
    expect(JSON.stringify(response.body)).not.toContain('"score":');

    const invalidDecision = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/internal/appeals/${appealDecisionImpact.appealId}/impact-preview`,
        query: { decision: "MANTER_RESULTADO" },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId,
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
        }),
        getAppealDecisionImpactPreview,
      }),
    );
    expect(invalidDecision.status).toBe(422);
    expect(getAppealDecisionImpactPreview).toHaveBeenCalledTimes(1);

    const duplicateDecision = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/internal/appeals/${appealDecisionImpact.appealId}/impact-preview`,
        query: { decision: "ANULAR_ITEM" },
        queryDuplicateKeys: ["decision"],
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId,
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
        }),
        getAppealDecisionImpactPreview,
      }),
    );
    expect(duplicateDecision.status).toBe(422);
    expect(getAppealDecisionImpactPreview).toHaveBeenCalledTimes(1);

    const participant = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/internal/appeals/${appealDecisionImpact.appealId}/impact-preview`,
        query: { decision: "ANULAR_ITEM" },
        body: undefined,
      },
      dependencies({ getAppealDecisionImpactPreview }),
    );
    expect(participant.status).toBe(403);
    expect(getAppealDecisionImpactPreview).toHaveBeenCalledTimes(1);

    const malformedBody = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/internal/appeals/${appealDecisionImpact.appealId}/impact-preview`,
        query: { decision: "ANULAR_ITEM" },
        body: { scopeId },
      },
      dependencies({
        authenticate: async () => ({
          principalId,
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
        }),
        getAppealDecisionImpactPreview,
      }),
    );
    expect(malformedBody.status).toBe(422);
    expect(getAppealDecisionImpactPreview).toHaveBeenCalledTimes(1);

    const missing = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/internal/appeals/${appealDecisionImpact.appealId}/impact-preview`,
        query: { decision: "ANULAR_ITEM" },
        body: undefined,
      },
      dependencies({
        authenticate: async () => ({
          principalId,
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
        }),
        getAppealDecisionImpactPreview: async () => null,
      }),
    );
    expect(missing.status).toBe(404);
  });
  it("routes workflow, ticket and appeal transitions through scoped staff contracts", async () => {
    const scopeId = "11111111-1111-4111-8111-111111111111";
    const participantId = "22222222-2222-4222-8222-222222222222";
    const resultId = "33333333-3333-4333-8333-333333333333";
    const attemptId = "44444444-4444-4444-8444-444444444444";
    const ticketId = "55555555-5555-4555-8555-555555555555";
    const appealId = "66666666-6666-4666-8666-666666666666";
    const itemId = "77777777-7777-4777-8777-777777777777";
    const reviewerId = "88888888-8888-4888-8888-888888888888";
    const workflow: AssessmentWorkflowState = {
      resultId,
      attemptId,
      ruleVersion: "summative-v1",
      status: "RESULTADO_EM_PROCESSAMENTO",
      version: 0,
    };
    const ticket: FeedbackTicketState = {
      ticketId,
      participantId,
      type: "CONTESTACAO",
      description: "Relato sintético.",
      createdAt: "2026-08-10T17:00:00.000Z",
      status: "NOVO",
      version: 0,
      priority: "NORMAL",
    };
    const appeal: AppealState = {
      appealId,
      participantId,
      attemptId,
      itemId,
      justification: "Justificativa sintética.",
      createdAt: "2026-08-10T17:00:00.000Z",
      dueAt: "2026-08-19T17:00:00.000Z",
      status: "ABERTA",
      version: 0,
    };
    const staff = {
      principalId: reviewerId,
      accountStatus: "ACTIVE" as const,
      roles: ["MODERATOR"] as const,
      scopes: [scopeId] as const,
    };
    const createAssessmentWorkflow = vi.fn(async () => workflow);
    const transitionAssessmentWorkflow = vi.fn(async () => ({
      ...workflow,
      status: "RESULTADO_DISPONIVEL" as const,
      version: 1,
    }));
    const transitionFeedbackTicket = vi.fn(async () => ({
      ...ticket,
      status: "TRIADO" as const,
      version: 1,
    }));
    const transitionAppealReview = vi.fn(async () => ({
      ...appeal,
      status: "EM_REVISAO" as const,
      reviewerId,
      version: 1,
    }));

    const createdWorkflow = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/internal/assessment-workflows",
        body: {
          resultId,
          attemptId,
          participantId,
          scopeId,
          ruleVersion: "summative-v1",
        },
      },
      dependencies({
        createAssessmentWorkflow,
        authenticate: async () => staff,
      }),
    );
    expect(createdWorkflow.status).toBe(201);

    const transitionedWorkflow = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/assessment-workflows/${resultId}/transition`,
        body: {
          resultId,
          participantId,
          scopeId,
          version: 0,
          event: "DISPONIBILIZAR",
        },
      },
      dependencies({
        transitionAssessmentWorkflow,
        authenticate: async () => staff,
      }),
    );
    expect(transitionedWorkflow.status).toBe(200);
    expect(transitionAssessmentWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        resultId,
        event: { type: "DISPONIBILIZAR" },
      }),
    );

    const transitionedTicket = await handleApiRequest(
      {
        method: "PATCH",
        path: `/api/v1/internal/feedback/${ticketId}`,
        headers: {
          "x-correlation-id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        },
        body: {
          ticketId,
          scopeId,
          version: 0,
          event: "TRIAR",
        },
      },
      dependencies({
        transitionFeedbackTicket,
        resolveFeedbackTicketParticipant: async () => participantId,
        authenticate: async () => staff,
      }),
    );
    expect(transitionedTicket.status).toBe(200);
    expect(transitionFeedbackTicket).toHaveBeenCalledWith({
      ticketId,
      participantId,
      scopeId,
      version: 0,
      event: { type: "TRIAR" },
      actorId: staff.principalId,
      requestId: "request-123",
      correlationId: "request-123",
    });

    const transitionedAppeal = await handleApiRequest(
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
        transitionAppealReview,
        authenticate: async () => staff,
      }),
    );
    expect(transitionedAppeal.status).toBe(200);
    expect(JSON.stringify(transitionedAppeal.body)).not.toContain("reviewerId");

    const invalidWorkflow = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/internal/assessment-workflows",
        body: { resultId },
      },
      dependencies({
        createAssessmentWorkflow,
        authenticate: async () => staff,
      }),
    );
    expect(invalidWorkflow.status).toBe(422);

    const forbiddenWorkflow = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/assessment-workflows/${resultId}/transition`,
        body: {
          resultId,
          participantId,
          scopeId,
          version: 0,
          event: "DISPONIBILIZAR",
        },
      },
      dependencies({
        transitionAssessmentWorkflow,
        authenticate: async () => ({
          principalId: participantId,
          accountStatus: "ACTIVE",
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
        }),
      }),
    );
    expect(forbiddenWorkflow.status).toBe(403);

    const missingDependency = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/internal/assessment-workflows",
        body: {
          resultId,
          attemptId,
          participantId,
          scopeId,
          ruleVersion: "summative-v1",
        },
      },
      dependencies({ authenticate: async () => staff }),
    );
    expect(missingDependency.status).toBe(500);
  });
  it("binds internal appeal transition identity to the authenticated reviewer", async () => {
    const scopeId = "11111111-1111-4111-8111-111111111111";
    const appealId = "66666666-6666-4666-8666-666666666666";
    const reviewerId = "88888888-8888-4888-8888-888888888888";
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
    const staff = {
      principalId: reviewerId,
      accountStatus: "ACTIVE" as const,
      roles: ["MODERATOR"] as const,
      scopes: [scopeId] as const,
    };

    const response = await handleApiRequest(
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
        transitionAppealReview,
        authenticate: async () => staff,
      }),
    );

    expect(response.status).toBe(200);
    expect(transitionAppealReview).toHaveBeenCalledWith({
      appealId,
      scopeId,
      version: 0,
      actorId: reviewerId,
      correlationId: "request-123",
      event: { type: "ATRIBUIR_REVISOR" },
    });
    expect(JSON.stringify(response.body)).not.toContain("reviewerId");
  });
  it("lists only the participant's redacted appeal protocol", async () => {
    const appeal: AppealState = {
      appealId: "66666666-6666-4666-8666-666666666666",
      participantId: attempt.participantId,
      attemptId: attempt.attemptId,
      itemId: answer.itemId,
      justification: "Não expor esta justificativa na projeção.",
      createdAt: "2026-08-10T17:00:00.000Z",
      dueAt: "2026-08-19T17:00:00.000Z",
      version: 0,
      status: "ABERTA",
      reviewerId: "77777777-7777-4777-8777-777777777777",
    };
    const getParticipantAppeals = vi.fn(async () => [appeal]);
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/appeals",
        query: { attemptId: attempt.attemptId },
        body: undefined,
      },
      dependencies({ getParticipantAppeals }),
    );
    expect(response.status).toBe(200);
    expect(getParticipantAppeals).toHaveBeenCalledWith({
      participantId: attempt.participantId,
      scopeId: activity.scopeId,
      attemptId: attempt.attemptId,
    });
    expect(response.body).toMatchObject({
      success: true,
      data: {
        appeals: [
          {
            appealId: appeal.appealId,
            attemptId: appeal.attemptId,
            itemId: appeal.itemId,
            createdAt: appeal.createdAt,
            dueAt: appeal.dueAt,
            status: "ABERTA",
            version: 0,
          },
        ],
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("justificativa");
    expect(JSON.stringify(response.body)).not.toContain("reviewerId");
  });
  it("does not create an appeal for an item outside the owned activity", async () => {
    const createAppeal = vi.fn(async () => {
      throw new Error("must not be called");
    });
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/appeals",
        body: {
          attemptId: attempt.attemptId,
          itemId: "88888888-8888-4888-8888-888888888888",
          justification: "Item sintético não pertence à atividade.",
        },
      },
      dependencies({
        createAppeal,
        resolveAttempt: async () => ({
          ...attempt,
          status: "CORRIGIDA_AUTOMATICAMENTE",
        }),
        hasParticipantActivityItem: async () => false,
      }),
    );

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "not_found" },
    });
    expect(createAppeal).not.toHaveBeenCalled();
  });
  it("does not create an appeal for a non-answerable activity item", async () => {
    const createAppeal = vi.fn(async () => {
      throw new Error("must not be called");
    });
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/appeals",
        body: {
          attemptId: attempt.attemptId,
          itemId: answer.itemId,
          justification: "Item de leitura não deve gerar contestação.",
        },
      },
      dependencies({
        createAppeal,
        resolveAttempt: async () => ({
          ...attempt,
          status: "CORRIGIDA_AUTOMATICAMENTE",
        }),
        getParticipantActivity: async () => ({
          ...activity,
          items: activity.items.map((item) => ({
            ...item,
            kind: "LEITURA",
          })),
        }),
      }),
    );

    expect(response.status).toBe(404);
    expect(createAppeal).not.toHaveBeenCalled();
  });
  it("rejects unexpected appeal query fields at the HTTP boundary", async () => {
    const getParticipantAppeals = vi.fn(async () => []);
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/appeals",
        query: { attemptId: attempt.attemptId, scopeId: "scope-1" },
        body: undefined,
      },
      dependencies({ getParticipantAppeals }),
    );

    expect(response.status).toBe(422);
    expect(getParticipantAppeals).not.toHaveBeenCalled();
  });
});
