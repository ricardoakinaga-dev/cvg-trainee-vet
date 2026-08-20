import { describe, it } from "vitest";

import {
  clinicalReviewQueueProjection,
  internalFeedbackTicketProjection,
  publicAppealProjection,
  publicAssessmentWorkflowProjection,
  publicAttemptProjection,
  publicActivityProjection,
  publicCorrectionProjection,
  publicCurriculumRuntimeProjection,
  publicFeedbackTicketProjection,
  publicLearningAssignmentProjection,
  publicLearningJourneyProjection,
  publicProgressProjection,
} from "./http-projections.js";

const participantId = "11111111-1111-4111-8111-111111111111";
const scopeId = "22222222-2222-4222-8222-222222222222";
const activityId = "33333333-3333-4333-8333-333333333333";
const attemptId = "44444444-4444-4444-8444-444444444444";
const itemId = "55555555-5555-4555-8555-555555555555";
const ticketId = "66666666-6666-4666-8666-666666666666";
const assignmentId = "77777777-7777-4777-8777-777777777777";
const resultId = "88888888-8888-4888-8888-888888888888";
const appealId = "99999999-9999-4999-8999-999999999999";
const timestamp = "2026-08-16T00:00:00.000Z";

const runtimeEvaluation = {
  moduleId: "M03",
  status: "DOMINIO_DIGITAL",
  nextAction: "REVISAR_RETENCAO",
  objectiveResults: [],
  remediationObjectiveIds: [],
  criticalErrorItemIds: [],
  invalidAnswerItemIds: [],
  unansweredChoiceItemIds: [],
  openResponseItemIds: [],
  retentionReviews: [],
  practicalCompetenceClaim: "PROIBIDO_MVP",
} as const;

describe("API public projection coverage", () => {
  it("covers optional participant state branches with synthetic data", () => {
    publicAttemptProjection(
      {
        attemptId,
        participantId,
        activityId,
        status: "SALVA",
        version: 1,
      } as never,
      [
        {
          answerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          attemptId,
          itemId,
          response: "resposta sintética",
          savedAt: timestamp,
        },
      ] as never,
    );
    publicActivityProjection({
      activityId,
      slug: "atividade-sintetica",
      title: "Atividade sintética",
      items: [],
    } as never);

    publicProgressProjection({
      activityId,
      assignmentStatus: "DISPONIVEL",
      nextAction: "INICIAR_ATIVIDADE",
    } as never);
    publicProgressProjection({
      activityId,
      assignmentStatus: "EM_ANDAMENTO",
      attemptStatus: "SALVA",
      attemptVersion: 2,
      nextAction: "RETOMAR_ATIVIDADE",
    } as never);

    publicCurriculumRuntimeProjection({
      participantId,
      scopeId,
      version: 1,
      updatedAt: timestamp,
      evaluation: runtimeEvaluation,
    } as never);
    publicCurriculumRuntimeProjection({
      participantId,
      scopeId,
      version: 2,
      updatedAt: timestamp,
      evaluation: { ...runtimeEvaluation, scorePercent: 100 },
    } as never);

    publicCorrectionProjection({
      attempt: {
        attemptId,
        participantId,
        activityId,
        status: "CORRIGIDA_HUMANAMENTE",
        version: 2,
      },
      result: {
        resultId,
        attemptId,
        version: 1,
        kind: "HUMANA",
        score: 90,
        outcome: "APROVADO",
        feedback: "Feedback sintético",
        ruleVersion: "v1",
        correctedBy: "reviewer",
        correctedAt: timestamp,
      },
    } as never);

    publicLearningAssignmentProjection({
      assignmentId,
      moduleId: "M03",
      availableAt: timestamp,
      status: "ATRIBUIDO",
      version: 1,
    } as never);
    publicLearningAssignmentProjection({
      assignmentId,
      moduleId: "M03",
      availableAt: timestamp,
      status: "BLOQUEADO",
      version: 2,
      blockReason: "PRE_REQUISITO",
      resumeAt: timestamp,
    } as never);
    publicAssessmentWorkflowProjection({
      resultId,
      status: "RESULTADO_DISPONIVEL",
      version: 1,
    } as never);
    publicAppealProjection({
      appealId,
      attemptId,
      itemId,
      status: "ABERTA",
      version: 1,
    } as never);
    publicAppealProjection({
      appealId,
      attemptId,
      itemId,
      status: "DECIDIDA",
      version: 2,
      decision: "MANTER_RESULTADO",
    } as never);
  });

  it("covers feedback, journey and review queue optional branches", () => {
    publicFeedbackTicketProjection({
      ticketId,
      participantId,
      type: "BUG_TECNICO",
      description: "Descrição sintética",
      createdAt: timestamp,
      status: "NOVO",
      version: 1,
    } as never);
    publicFeedbackTicketProjection({
      ticketId,
      participantId,
      type: "BUG_TECNICO",
      description: "Descrição sintética",
      createdAt: timestamp,
      alertedAt: timestamp,
      status: "RESOLVIDO",
      version: 2,
      priority: "ALTA",
      history: [{ status: "NOVO", changedAt: timestamp }],
      technicalContext: {
        logicalPage: "/dashboard",
        appVersion: "test-1",
        occurredAt: timestamp,
        errorCode: "SYNTHETIC_ERROR",
      },
      response: { message: "Resposta sintética", respondedAt: timestamp },
    } as never);

    internalFeedbackTicketProjection({
      scopeId,
      state: {
        ticketId,
        participantId,
        type: "MELHORIA",
        description: "Descrição interna sintética",
        createdAt: timestamp,
        status: "TRIADO",
        version: 1,
      },
    } as never);
    internalFeedbackTicketProjection({
      scopeId,
      state: {
        ticketId,
        participantId,
        type: "MELHORIA",
        description: "Descrição interna sintética",
        createdAt: timestamp,
        alertedAt: timestamp,
        status: "RESOLVIDO",
        version: 2,
        priority: "URGENTE",
        assigneeId: participantId,
        history: [
          { status: "TRIADO", changedAt: timestamp, actorId: participantId },
        ],
        technicalContext: { logicalPage: "/admin", appVersion: "test-1" },
        response: {
          message: "Resposta interna",
          respondedAt: timestamp,
          respondedBy: participantId,
        },
      },
    } as never);

    publicLearningJourneyProjection({
      assignments: [],
      activities: [],
      results: [],
      runtimes: [],
    } as never);
    publicLearningJourneyProjection({
      assignments: [
        {
          scopeId,
          state: {
            assignmentId,
            participantId,
            moduleId: "M03",
            availableAt: timestamp,
            status: "ATRIBUIDO",
            version: 1,
          },
        },
      ],
      activities: [
        {
          scopeId,
          activityId,
          slug: "atividade",
          title: "Atividade",
          status: "EM_ANDAMENTO",
          attemptId,
          attemptStatus: "SALVA",
          attemptVersion: 1,
          nextAction: "RETOMAR_ATIVIDADE",
        },
      ],
      results: [
        {
          scopeId,
          participantId,
          state: {
            resultId,
            attemptId,
            ruleVersion: "v1",
            version: 1,
            status: "RESULTADO_DISPONIVEL",
          },
        },
      ],
      runtimes: [
        {
          participantId,
          scopeId,
          version: 1,
          updatedAt: timestamp,
          evaluation: runtimeEvaluation,
        },
      ],
      nextAction: "REVISAR_RETENCAO",
    } as never);

    clinicalReviewQueueProjection({
      items: [
        {
          contentId: itemId,
          version: 1,
          scopeId,
          moduleId: "M03",
          sessionId: "S1",
          objectiveId: "O1",
          authorId: participantId,
          contentStatus: "EM_REVISAO_CLINICA",
          reviewStatus: "PENDING",
          technicalChecksPassed: true,
          latestReview: null,
        },
        {
          contentId: ticketId,
          version: 2,
          scopeId,
          moduleId: "M03",
          sessionId: "S2",
          objectiveId: "O2",
          authorId: participantId,
          contentStatus: "APROVADO_CLINICAMENTE",
          reviewStatus: "APPROVED",
          technicalChecksPassed: true,
          latestReview: {
            decision: "APROVAR_CLINICAMENTE",
            reviewedAt: timestamp,
          },
        },
      ],
      page: 1,
      perPage: 20,
      total: 2,
    } as never);
  });
});
