import { describe, expect, it } from "vitest";

import {
  appealCreateRequestSchema,
  adaptiveCurriculumAssignmentProjectionSchema,
  appealQuerySchema,
  assessmentWorkflowCreateRequestSchema,
  assessmentWorkflowTransitionRequestSchema,
  feedbackTicketCreateRequestSchema,
  feedbackTicketInternalTransitionRequestSchema,
  feedbackTicketParticipantCreateRequestSchema,
  feedbackTicketTransitionRequestSchema,
  assignCurriculumFromDiagnosticRequestSchema,
  learningAssignmentCreateRequestSchema,
  learningAssignmentTransitionRequestSchema,
  participantAppealProjectionSchema,
  participantAppealsProjectionSchema,
  participantAssessmentWorkflowProjectionSchema,
  participantFeedbackTicketProjectionSchema,
  participantFeedbackTicketsProjectionSchema,
  participantLearningAssignmentProjectionSchema,
} from "./learning-state.js";

const ids = {
  assignmentId: "11111111-1111-4111-8111-111111111111",
  resultId: "22222222-2222-4222-8222-222222222222",
  ticketId: "33333333-3333-4333-8333-333333333333",
};

describe("learning state contracts", () => {
  it("validates event-specific assignment payloads", () => {
    expect(
      learningAssignmentTransitionRequestSchema.parse({
        assignmentId: ids.assignmentId,
        version: 2,
        event: "DISPONIBILIZAR",
        now: "2026-08-10T17:00:00.000Z",
      }),
    ).toMatchObject({ event: "DISPONIBILIZAR" });
    expect(
      learningAssignmentTransitionRequestSchema.parse({
        assignmentId: ids.assignmentId,
        version: 3,
        event: "BLOQUEAR",
        reason: "OBJETIVO_EM_REMEDIACAO",
      }),
    ).toMatchObject({ reason: "OBJETIVO_EM_REMEDIACAO" });
  });

  it("validates internal creation commands and redacted participant projections", () => {
    expect(
      assignCurriculumFromDiagnosticRequestSchema.parse({
        scopeId: ids.resultId,
      }),
    ).toEqual({ scopeId: ids.resultId });
    expect(() =>
      assignCurriculumFromDiagnosticRequestSchema.parse({
        scopeId: ids.resultId,
        participantId: ids.ticketId,
      }),
    ).toThrow();
    expect(
      learningAssignmentCreateRequestSchema.parse({
        assignmentId: ids.assignmentId,
        participantId: ids.resultId,
        scopeId: ids.resultId,
        moduleId: "M03",
        availableAt: "2026-08-10T17:00:00.000Z",
      }),
    ).toMatchObject({ moduleId: "M03" });
    expect(
      assessmentWorkflowCreateRequestSchema.parse({
        resultId: ids.resultId,
        attemptId: ids.resultId,
        participantId: ids.resultId,
        scopeId: ids.resultId,
        ruleVersion: "summative-v1",
      }),
    ).toMatchObject({ ruleVersion: "summative-v1" });
    expect(
      feedbackTicketParticipantCreateRequestSchema.parse({
        scopeId: ids.resultId,
        type: "ERRO_CONTEUDO",
        description: "Relato sintético.",
      }),
    ).toMatchObject({ type: "ERRO_CONTEUDO" });

    expect(
      participantLearningAssignmentProjectionSchema.parse({
        assignmentId: ids.assignmentId,
        moduleId: "M03",
        availableAt: "2026-08-10T17:00:00.000Z",
        status: "ATRIBUIDO",
        version: 1,
      }),
    ).toMatchObject({ assignmentId: ids.assignmentId });
    expect(
      adaptiveCurriculumAssignmentProjectionSchema.parse({
        diagnosticResultId: ids.resultId,
        assignments: [
          {
            assignmentId: ids.assignmentId,
            moduleId: "M03",
            availableAt: "2026-08-10T17:00:00.000Z",
            status: "ATRIBUIDO",
            version: 1,
          },
        ],
      }),
    ).toMatchObject({ diagnosticResultId: ids.resultId });
    expect(
      participantAssessmentWorkflowProjectionSchema.parse({
        resultId: ids.resultId,
        status: "RESULTADO_DISPONIVEL",
        version: 1,
      }),
    ).toMatchObject({ status: "RESULTADO_DISPONIVEL" });
    expect(
      participantFeedbackTicketProjectionSchema.parse({
        ticketId: ids.ticketId,
        type: "ERRO_CONTEUDO",
        description: "Relato sintético.",
        createdAt: "2026-08-10T17:00:00.000Z",
        status: "NOVO",
        version: 0,
      }),
    ).toMatchObject({ ticketId: ids.ticketId });
    expect(
      feedbackTicketParticipantCreateRequestSchema.parse({
        type: "MELHORIA",
        description: "Relato sem escopo confiado ao cliente.",
      }),
    ).toMatchObject({ type: "MELHORIA" });
    expect(
      participantFeedbackTicketsProjectionSchema.parse({
        tickets: [
          {
            ticketId: ids.ticketId,
            type: "ERRO_CONTEUDO",
            description: "Relato sintético.",
            createdAt: "2026-08-10T17:00:00.000Z",
            status: "NOVO",
            version: 0,
          },
        ],
      }),
    ).toMatchObject({ tickets: [{ ticketId: ids.ticketId }] });
    expect(
      participantAppealProjectionSchema.parse({
        appealId: ids.resultId,
        attemptId: ids.resultId,
        itemId: ids.ticketId,
        createdAt: "2026-08-10T17:00:00.000Z",
        dueAt: "2026-08-19T17:00:00.000Z",
        status: "ABERTA",
        version: 0,
      }),
    ).toMatchObject({ status: "ABERTA" });
    expect(
      participantAppealsProjectionSchema.parse({
        appeals: [
          {
            appealId: ids.resultId,
            attemptId: ids.resultId,
            itemId: ids.ticketId,
            createdAt: "2026-08-10T17:00:00.000Z",
            dueAt: "2026-08-19T17:00:00.000Z",
            status: "ABERTA",
            version: 0,
          },
        ],
      }),
    ).toMatchObject({ appeals: [{ status: "ABERTA" }] });
  });

  it("rejects participant projections containing internal context or authoring fields", () => {
    expect(() =>
      participantFeedbackTicketProjectionSchema.parse({
        ticketId: ids.ticketId,
        type: "ERRO_CONTEUDO",
        description: "Relato sintético.",
        createdAt: "2026-08-10T17:00:00.000Z",
        status: "NOVO",
        version: 0,
        participantId: ids.resultId,
      }),
    ).toThrow();
    expect(() =>
      participantAppealProjectionSchema.parse({
        appealId: ids.resultId,
        attemptId: ids.resultId,
        itemId: ids.ticketId,
        createdAt: "2026-08-10T17:00:00.000Z",
        dueAt: "2026-08-19T17:00:00.000Z",
        status: "ABERTA",
        version: 0,
        reviewerId: ids.resultId,
      }),
    ).toThrow();
  });

  it("rejects missing event payloads and arbitrary attachment/source fields", () => {
    expect(() =>
      learningAssignmentTransitionRequestSchema.parse({
        assignmentId: ids.assignmentId,
        version: 2,
        event: "DISPONIBILIZAR",
      }),
    ).toThrow();
    expect(() =>
      feedbackTicketCreateRequestSchema.parse({
        ticketId: ids.ticketId,
        type: "ERRO_CONTEUDO",
        description: "Relato sintético.",
        createdAt: "2026-08-10T17:00:00.000Z",
        attachment: "forbidden",
      }),
    ).toThrow();
  });

  it("keeps result and ticket transitions versioned and bounded", () => {
    expect(
      assessmentWorkflowTransitionRequestSchema.parse({
        resultId: ids.resultId,
        version: 1,
        event: "INICIAR_REVISAO",
      }),
    ).toMatchObject({ event: "INICIAR_REVISAO" });
    expect(
      feedbackTicketTransitionRequestSchema.parse({
        ticketId: ids.ticketId,
        version: 1,
        event: "RESOLVER",
      }),
    ).toMatchObject({ event: "RESOLVER" });
    expect(
      feedbackTicketInternalTransitionRequestSchema.parse({
        ticketId: ids.ticketId,
        scopeId: ids.resultId,
        version: 1,
        event: "TRIAR",
      }),
    ).toMatchObject({ scopeId: ids.resultId });
    expect(() =>
      feedbackTicketInternalTransitionRequestSchema.parse({
        ticketId: ids.ticketId,
        scopeId: ids.resultId,
        participantId: ids.resultId,
        version: 1,
        event: "TRIAR",
      }),
    ).toThrow();
    expect(() =>
      feedbackTicketTransitionRequestSchema.parse({
        ticketId: ids.ticketId,
        version: -1,
        event: "RESOLVER",
      }),
    ).toThrow();
  });

  it("validates contestation inputs without accepting source or answer internals", () => {
    expect(appealQuerySchema.parse({ attemptId: ids.resultId })).toMatchObject({
      attemptId: ids.resultId,
    });
    expect(() =>
      appealQuerySchema.parse({
        attemptId: ids.resultId,
        scopeId: ids.ticketId,
      }),
    ).toThrow();
    expect(
      appealCreateRequestSchema.parse({
        attemptId: ids.resultId,
        itemId: ids.ticketId,
        justification: "A justificativa sintética deve ser revisada.",
      }),
    ).toMatchObject({ attemptId: ids.resultId });
    expect(() =>
      appealCreateRequestSchema.parse({
        attemptId: ids.resultId,
        itemId: ids.ticketId,
        justification: "ok",
        source_record_id: "internal",
      }),
    ).toThrow();
  });
});
