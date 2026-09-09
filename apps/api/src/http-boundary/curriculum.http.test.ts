import { describe, expect, it, vi } from "vitest";

import type {
  AppealState,
  AssessmentWorkflowState,
  FeedbackTicketState,
  LearningAssignmentState,
} from "@cvg/domain";
import {
  ApplicationError,
  type ParticipantActivityState,
  type ParticipantLearningJourneyState,
} from "@cvg/application";

import { handleApiRequest } from "../http.js";
import {
  activity,
  answer,
  attempt,
  curriculumRuntime,
  dependencies,
  reflection,
  staffDashboard,
} from "./fixtures.js";

describe("API HTTP boundary — curriculum boundary", () => {
  it("publishes the participant reflection state without internal or scoring fields", async () => {
    const baseItem = activity.items[0];
    if (baseItem === undefined)
      throw new Error("synthetic activity item missing");
    const reflectionActivity: ParticipantActivityState = {
      ...activity,
      items: [
        {
          ...baseItem,
          kind: "REFLEXAO",
          responseMode: "TEXT",
        },
      ],
      reflection,
    };
    const response = await handleApiRequest(
      {
        method: "GET",
        path: `/api/v1/activities/${activity.activityId}`,
        body: undefined,
      },
      dependencies({ getParticipantActivity: async () => reflectionActivity }),
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        reflection: {
          status: "EM_ANDAMENTO",
          nextAction: "RETOMAR_REFLEXAO",
          answeredItemCount: 1,
          answers: [
            { itemId: answer.itemId, response: "Próxima ação própria." },
          ],
          practicalCompetenceClaim: "PROIBIDO_MVP",
        },
      },
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /score|gabarito|competencia_pratica|scopeId/iu,
    );
  });
  it("returns the participant learning path as one scoped public projection", async () => {
    const getParticipantLearningJourney = vi.fn(
      async (): Promise<ParticipantLearningJourneyState> => ({
        participantId: attempt.participantId,
        assignments: [],
        activities: [
          {
            scopeId: "scope-1",
            activityId: activity.activityId,
            moduleId: "M02",
            learningAssignmentId: "assignment-1",
            slug: activity.slug,
            title: activity.title,
            status: "EM_ANDAMENTO",
            attemptId: attempt.attemptId,
            attemptStatus: "SALVA",
            attemptVersion: 2,
            nextAction: "RETOMAR_ATIVIDADE",
          },
        ],
        results: [],
        runtimes: [
          {
            participantId: attempt.participantId,
            scopeId: "scope-1",
            version: 1,
            updatedAt: "2026-08-24T12:00:00.000Z",
            evaluation: {
              moduleId: "M02",
              status: "EM_REMEDIACAO",
              nextAction: "EXECUTAR_REMEDIACAO",
              objectiveResults: [],
              remediationObjectiveIds: ["M02-OBJ-01"],
              criticalErrorItemIds: [],
              invalidAnswerItemIds: [],
              unansweredChoiceItemIds: [],
              openResponseItemIds: [],
              retentionReviews: [],
              practicalCompetenceClaim: "PROIBIDO_MVP",
            },
          },
        ],
        nextActionTarget: {
          kind: "ACTIVITY",
          activityId: activity.activityId,
        },
        nextAction: "EXECUTAR_REMEDIACAO",
      }),
    );
    const response = await handleApiRequest(
      { method: "GET", path: "/api/v1/learning-path", body: undefined },
      dependencies({ getParticipantLearningJourney }),
    );

    expect(response.status).toBe(200);
    expect(getParticipantLearningJourney).toHaveBeenCalledWith(
      attempt.participantId,
      ["scope-1"],
    );
    expect(response.body).toMatchObject({
      success: true,
      data: {
        activities: [
          {
            activityId: activity.activityId,
            nextAction: "RETOMAR_ATIVIDADE",
          },
        ],
        nextActionTarget: {
          kind: "ACTIVITY",
          activityId: activity.activityId,
        },
        nextAction: "EXECUTAR_REMEDIACAO",
        runtimes: [{ moduleId: "M02", nextAction: "EXECUTAR_REMEDIACAO" }],
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("scopeId");
    expect(JSON.stringify(response.body)).not.toContain("participantId");
    expect(
      (response.body as { readonly data?: { readonly activities?: unknown[] } })
        .data?.activities?.[0],
    ).not.toHaveProperty("moduleId");
    expect(
      (response.body as { readonly data?: { readonly activities?: unknown[] } })
        .data?.activities?.[0],
    ).not.toHaveProperty("learningAssignmentId");
  });
  it("re-derives remediation targets before exposing the public journey", async () => {
    const getParticipantLearningJourney = vi.fn(
      async (): Promise<ParticipantLearningJourneyState> => ({
        participantId: attempt.participantId,
        assignments: [],
        activities: [
          {
            scopeId: "scope-1",
            activityId: activity.activityId,
            moduleId: "M02",
            slug: activity.slug,
            title: activity.title,
            status: "EM_REFORCO",
            attemptId: attempt.attemptId,
            attemptStatus: "CORRIGIDA_AUTOMATICAMENTE",
            attemptVersion: 3,
            nextAction: "INICIAR_ATIVIDADE",
          },
        ],
        results: [],
        runtimes: [
          {
            participantId: attempt.participantId,
            scopeId: "scope-1",
            version: 1,
            updatedAt: "2026-08-24T12:00:00.000Z",
            evaluation: {
              moduleId: "M02",
              status: "EM_REMEDIACAO",
              nextAction: "EXECUTAR_REMEDIACAO",
              objectiveResults: [],
              remediationObjectiveIds: ["M02-OBJ-01"],
              criticalErrorItemIds: [],
              invalidAnswerItemIds: [],
              unansweredChoiceItemIds: [],
              openResponseItemIds: [],
              retentionReviews: [],
              practicalCompetenceClaim: "PROIBIDO_MVP",
            },
          },
        ],
        nextAction: "CONSULTAR_PROXIMO_PASSO",
        nextActionTarget: {
          kind: "ACTIVITY",
          activityId: "99999999-9999-4999-8999-999999999999",
        },
      }),
    );
    const response = await handleApiRequest(
      { method: "GET", path: "/api/v1/learning-path", body: undefined },
      dependencies({ getParticipantLearningJourney }),
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        nextAction: "EXECUTAR_REMEDIACAO",
      },
    });
    expect(
      (
        response.body as {
          readonly data?: { readonly nextActionTarget?: unknown };
        }
      ).data?.nextActionTarget,
    ).toBeUndefined();
  });
  it("returns the participant dashboard without internal identity or scope data", async () => {
    const getParticipantLearningJourney = vi.fn(
      async (): Promise<ParticipantLearningJourneyState> => ({
        participantId: attempt.participantId,
        assignments: [],
        activities: [
          {
            scopeId: "scope-1",
            activityId: activity.activityId,
            slug: activity.slug,
            title: activity.title,
            status: "CONCLUIDO",
            nextAction: "CONSULTAR_PROXIMO_PASSO",
          },
        ],
        results: [],
        runtimes: [],
      }),
    );

    const response = await handleApiRequest(
      { method: "GET", path: "/api/v1/dashboard", body: undefined },
      dependencies({ getParticipantLearningJourney }),
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        kind: "participant",
        nextAction: "CONSULTAR_PROXIMO_PASSO",
        progress: {
          assignedActivities: 1,
          completedActivities: 1,
          progressPercent: 100,
        },
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("participantId");
    expect(JSON.stringify(response.body)).not.toContain("scopeId");
  });
  it("returns a scoped staff dashboard only to an active moderator", async () => {
    const getStaffDashboard = vi.fn(async () => staffDashboard);
    const response = await handleApiRequest(
      { method: "GET", path: "/api/v1/dashboard", body: undefined },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: ["scope-1"],
        }),
        getStaffDashboard,
      }),
    );

    expect(response.status).toBe(200);
    expect(getStaffDashboard).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      ["scope-1"],
    );
    expect(response.body).toMatchObject({
      success: true,
      data: {
        kind: "staff",
        scopes: ["scope-1"],
        metrics: { activeParticipants: 1 },
        participants: [
          {
            professionalEmail: "vet@example.invalid",
            diagnosticProfile: expect.arrayContaining([
              expect.objectContaining({
                themeId: "B07-S1",
                scorePercent: 75,
              }),
            ]),
          },
        ],
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("M01-OBJ-01");
  });
  it("fails closed when staff dashboard access is not scoped", async () => {
    const getStaffDashboard = vi.fn(async () => staffDashboard);
    const response = await handleApiRequest(
      { method: "GET", path: "/api/v1/dashboard", body: undefined },
      dependencies({
        authenticate: async () => ({
          principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          accountStatus: "SUSPENDED",
          roles: ["ADMIN"],
          scopes: ["scope-1"],
        }),
        getStaffDashboard,
      }),
    );

    expect(response.status).toBe(403);
    expect(getStaffDashboard).not.toHaveBeenCalled();
  });
  it("reads only the public curriculum runtime projection", async () => {
    const getParticipantCurriculumRuntime = vi.fn(
      async () => curriculumRuntime,
    );
    const response = await handleApiRequest(
      {
        method: "GET",
        path: "/api/v1/curriculum/modules/M03/runtime",
        body: undefined,
      },
      dependencies({ getParticipantCurriculumRuntime }),
    );

    expect(response.status).toBe(200);
    expect(getParticipantCurriculumRuntime).toHaveBeenCalledWith(
      attempt.participantId,
      "M03",
    );
    expect(response.body).toMatchObject({
      success: true,
      data: {
        moduleId: "M03",
        version: 2,
        status: "DOMINIO_DIGITAL",
        nextAction: "REVISAR_RETENCAO",
        remediationCount: 0,
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("participantId");
    expect(JSON.stringify(response.body)).not.toContain("objectiveResults");
    expect(JSON.stringify(response.body)).not.toContain("scopeId");
  });
  it("allows only a scoped moderator to evaluate and persist a curriculum module", async () => {
    const evaluateCurriculumRuntime = vi.fn(async () => curriculumRuntime);
    const isParticipantInScope = vi.fn(async () => true);
    const runtimeScope = "22222222-2222-4222-8222-222222222222";
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/internal/curriculum/modules/M03/evaluate",
        body: {
          participantId: attempt.participantId,
          scopeId: runtimeScope,
          answers: [{ itemId: "M03-S1-Q01", selectedChoiceIds: ["a"] }],
          completedAt: "2026-08-10T01:00:00.000Z",
          mode: "FORMATIVE_CHOICE",
        },
      },
      dependencies({
        authenticate: async () => ({
          principalId: "99999999-9999-4999-8999-999999999999",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [runtimeScope],
        }),
        isParticipantInScope,
        evaluateCurriculumRuntime,
      }),
    );

    expect(response.status).toBe(200);
    expect(isParticipantInScope).toHaveBeenCalledWith(
      attempt.participantId,
      runtimeScope,
    );
    expect(evaluateCurriculumRuntime).toHaveBeenCalledWith({
      participantId: attempt.participantId,
      scopeId: runtimeScope,
      answers: [{ itemId: "M03-S1-Q01", selectedChoiceIds: ["a"] }],
      completedAt: "2026-08-10T01:00:00.000Z",
      mode: "FORMATIVE_CHOICE",
      moduleId: "M03",
    });
    expect(JSON.stringify(response.body)).not.toContain("objectiveResults");

    const forbidden = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/internal/curriculum/modules/M03/evaluate",
        body: {
          participantId: attempt.participantId,
          scopeId: runtimeScope,
          answers: [{ itemId: "M03-S1-Q01", selectedChoiceIds: ["a"] }],
          completedAt: "2026-08-10T01:00:00.000Z",
        },
      },
      dependencies({
        evaluateCurriculumRuntime,
        authenticate: async () => ({
          principalId: attempt.participantId,
          accountStatus: "ACTIVE",
          roles: ["PARTICIPANT"],
          scopes: [runtimeScope],
        }),
      }),
    );
    expect(forbidden.status).toBe(403);
  });
  it("rejects curriculum evaluation for a participant outside the requested scope", async () => {
    const evaluateCurriculumRuntime = vi.fn(async () => curriculumRuntime);
    const runtimeScope = "22222222-2222-4222-8222-222222222222";
    const response = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/internal/curriculum/modules/M03/evaluate",
        body: {
          participantId: attempt.participantId,
          scopeId: runtimeScope,
          answers: [{ itemId: "M03-S1-Q01", selectedChoiceIds: ["a"] }],
          completedAt: "2026-08-10T01:00:00.000Z",
        },
      },
      dependencies({
        authenticate: async () => ({
          principalId: "99999999-9999-4999-8999-999999999999",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [runtimeScope],
        }),
        isParticipantInScope: async () => false,
        evaluateCurriculumRuntime,
      }),
    );

    expect(response.status).toBe(403);
    expect(evaluateCurriculumRuntime).not.toHaveBeenCalled();
  });
  it("protects learning-state routes by capability, scope, version and public projection", async () => {
    const scopeId = "11111111-1111-4111-8111-111111111111";
    const participantId = "22222222-2222-4222-8222-222222222222";
    const assignment: LearningAssignmentState = {
      assignmentId: "33333333-3333-4333-8333-333333333333",
      participantId,
      moduleId: "M03",
      availableAt: "2026-08-10T17:00:00.000Z",
      status: "ATRIBUIDO",
      version: 1,
    };
    const workflow: AssessmentWorkflowState = {
      resultId: "44444444-4444-4444-8444-444444444444",
      attemptId: "55555555-5555-4555-8555-555555555555",
      ruleVersion: "summative-v1",
      status: "RESULTADO_DISPONIVEL",
      version: 1,
    };
    const ticket: FeedbackTicketState = {
      ticketId: "66666666-6666-4666-8666-666666666666",
      participantId,
      type: "ERRO_CONTEUDO",
      description: "Relato sintético.",
      createdAt: "2026-08-10T17:00:00.000Z",
      status: "NOVO",
      version: 0,
      priority: "NORMAL",
    };
    const appeal: AppealState = {
      appealId: "77777777-7777-4777-8777-777777777777",
      participantId,
      attemptId: workflow.attemptId,
      itemId: answer.itemId,
      justification: "Justificativa sintética.",
      createdAt: "2026-08-10T17:00:00.000Z",
      dueAt: "2026-08-19T17:00:00.000Z",
      status: "ABERTA",
      version: 0,
    };
    const createLearningAssignment = vi.fn(async () => assignment);
    const transitionLearningAssignment = vi.fn(async () => ({
      ...assignment,
      status: "DISPONIVEL" as const,
      version: 2,
    }));
    const createFeedbackTicket = vi.fn(async () => ticket);
    const getParticipantFeedback = vi.fn(async () => [ticket]);
    const createAppeal = vi.fn(async () => appeal);

    const participantResponse = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/internal/learning-assignments",
        body: {
          assignmentId: assignment.assignmentId,
          participantId,
          scopeId,
          moduleId: "M03",
          availableAt: assignment.availableAt,
        },
      },
      dependencies({
        createLearningAssignment,
        authenticate: async () => ({
          principalId: participantId,
          accountStatus: "ACTIVE",
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
        }),
      }),
    );
    expect(participantResponse.status).toBe(403);
    expect(createLearningAssignment).not.toHaveBeenCalled();

    const staffResponse = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/internal/learning-assignments",
        body: {
          assignmentId: assignment.assignmentId,
          participantId,
          scopeId,
          moduleId: "M03",
          availableAt: assignment.availableAt,
        },
      },
      dependencies({
        createLearningAssignment,
        authenticate: async () => ({
          principalId: "99999999-9999-4999-8999-999999999999",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
        }),
      }),
    );
    expect(staffResponse.status).toBe(201);
    expect(staffResponse.body).toMatchObject({
      success: true,
      data: { assignmentId: assignment.assignmentId, version: 1 },
    });
    expect(JSON.stringify(staffResponse.body)).not.toContain("participantId");

    const transitionResponse = await handleApiRequest(
      {
        method: "POST",
        path: `/api/v1/internal/learning-assignments/${assignment.assignmentId}/transition`,
        body: {
          assignmentId: assignment.assignmentId,
          participantId,
          scopeId,
          version: 1,
          event: "DISPONIBILIZAR",
          now: assignment.availableAt,
        },
      },
      dependencies({
        transitionLearningAssignment,
        authenticate: async () => ({
          principalId: "99999999-9999-4999-8999-999999999999",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
        }),
      }),
    );
    expect(transitionResponse.status).toBe(200);
    expect(transitionLearningAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        assignmentId: assignment.assignmentId,
        participantId,
        scopeId,
        version: 1,
        event: { type: "DISPONIBILIZAR", now: assignment.availableAt },
      }),
    );

    const feedbackResponse = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/feedback",
        body: {
          scopeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          type: "ERRO_CONTEUDO",
          description: "Relato sintético.",
        },
      },
      dependencies({
        createFeedbackTicket,
        authenticate: async () => ({
          principalId: participantId,
          accountStatus: "ACTIVE",
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
        }),
      }),
    );
    expect(feedbackResponse.status).toBe(201);
    expect(createFeedbackTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        participantId,
        scopeId,
        actorId: participantId,
        requestId: "request-123",
        correlationId: "request-123",
      }),
    );
    expect(JSON.stringify(feedbackResponse.body)).not.toContain(
      "participantId",
    );

    const feedbackListResponse = await handleApiRequest(
      { method: "GET", path: "/api/v1/feedback", body: {} },
      dependencies({
        getParticipantFeedback,
        authenticate: async () => ({
          principalId: participantId,
          accountStatus: "ACTIVE",
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
        }),
      }),
    );
    expect(feedbackListResponse.status).toBe(200);
    expect(feedbackListResponse.body).toMatchObject({
      success: true,
      data: { tickets: [{ ticketId: ticket.ticketId, status: "NOVO" }] },
    });
    expect(getParticipantFeedback).toHaveBeenCalledWith({
      participantId,
      scopeIds: [scopeId],
    });
    expect(JSON.stringify(feedbackListResponse.body)).not.toContain(
      "participantId",
    );

    const staffFeedbackListResponse = await handleApiRequest(
      { method: "GET", path: "/api/v1/feedback", body: {} },
      dependencies({
        getParticipantFeedback,
        authenticate: async () => ({
          principalId: "99999999-9999-4999-8999-999999999999",
          accountStatus: "ACTIVE",
          roles: ["MODERATOR"],
          scopes: [scopeId],
        }),
      }),
    );
    expect(staffFeedbackListResponse.status).toBe(403);
    expect(getParticipantFeedback).toHaveBeenCalledTimes(1);

    const appealResponse = await handleApiRequest(
      {
        method: "POST",
        path: "/api/v1/appeals",
        body: {
          attemptId: workflow.attemptId,
          itemId: appeal.itemId,
          justification: appeal.justification,
        },
      },
      dependencies({
        createAppeal,
        resolveAttempt: async () => ({
          ...attempt,
          participantId,
          activityId: attempt.activityId,
          status: "CORRIGIDA_AUTOMATICAMENTE",
        }),
        hasParticipantActivityItem: async () => true,
        resolveActivityScope: async () => scopeId,
        authenticate: async () => ({
          principalId: participantId,
          accountStatus: "ACTIVE",
          roles: ["PARTICIPANT"],
          scopes: [scopeId],
        }),
      }),
    );
    expect(appealResponse.status).toBe(201);
    expect(createAppeal).toHaveBeenCalledWith(
      expect.objectContaining({ participantId, scopeId }),
    );
    expect(JSON.stringify(appealResponse.body)).not.toContain("reviewerId");

    expect(
      handleApiRequest(
        {
          method: "POST",
          path: `/api/v1/internal/learning-assignments/${assignment.assignmentId}/transition`,
          body: {
            assignmentId: assignment.assignmentId,
            participantId,
            scopeId,
            version: 1,
            event: "DISPONIBILIZAR",
            now: assignment.availableAt,
          },
        },
        dependencies({
          transitionLearningAssignment: vi.fn(async () => {
            throw new ApplicationError("state_conflict", "stale");
          }),
          authenticate: async () => ({
            principalId: "99999999-9999-4999-8999-999999999999",
            accountStatus: "ACTIVE",
            roles: ["MODERATOR"],
            scopes: [scopeId],
          }),
        }),
      ),
    ).resolves.toMatchObject({
      status: 409,
      body: { success: false, error: { code: "state_conflict" } },
    });
  });
});
