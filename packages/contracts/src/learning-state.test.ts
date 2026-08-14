import { describe, expect, it } from "vitest";

import {
  appealCreateRequestSchema,
  appealTransitionRequestSchema,
  assessmentWorkflowCreateRequestSchema,
  assessmentWorkflowTransitionRequestSchema,
  feedbackTicketCreateRequestSchema,
  feedbackTicketParticipantCreateRequestSchema,
  feedbackTicketTransitionRequestSchema,
  learningAssignmentCreateRequestSchema,
  learningAssignmentTransitionRequestSchema,
  participantAppealProjectionSchema,
  participantAssessmentWorkflowProjectionSchema,
  participantFeedbackTicketProjectionSchema,
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
    expect(
      learningAssignmentTransitionRequestSchema.parse({
        assignmentId: ids.assignmentId,
        version: 4,
        event: "PAUSAR",
        reason: "ACOMODACAO",
        resumeAt: "2026-08-12T12:00:00.000Z",
      }),
    ).toMatchObject({ event: "PAUSAR", reason: "ACOMODACAO" });
    expect(
      learningAssignmentTransitionRequestSchema.parse({
        assignmentId: ids.assignmentId,
        version: 5,
        event: "RETOMAR",
        now: "2026-08-12T12:00:00.000Z",
      }),
    ).toMatchObject({ event: "RETOMAR" });
  });

  it("validates internal creation commands and redacted participant projections", () => {
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
        resumeAt: undefined,
      }),
    ).toMatchObject({ assignmentId: ids.assignmentId });
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
      participantAppealProjectionSchema.parse({
        appealId: ids.resultId,
        attemptId: ids.resultId,
        itemId: ids.ticketId,
        status: "ABERTA",
        version: 0,
      }),
    ).toMatchObject({ status: "ABERTA" });
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
      learningAssignmentTransitionRequestSchema.parse({
        assignmentId: ids.assignmentId,
        version: 2,
        event: "PAUSAR",
      }),
    ).toThrow();
    expect(() =>
      learningAssignmentTransitionRequestSchema.parse({
        assignmentId: ids.assignmentId,
        version: 2,
        event: "RETOMAR",
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

  it("bounds feedback text and rejects attachment-shaped fields", () => {
    expect(() =>
      feedbackTicketParticipantCreateRequestSchema.parse({
        type: "BUG_TECNICO",
        description: "x".repeat(2_001),
      }),
    ).toThrow();
    expect(() =>
      feedbackTicketParticipantCreateRequestSchema.parse({
        type: "BUG_TECNICO",
        description: "Relato sintético.",
        attachment: "synthetic-file",
      }),
    ).toThrow();
  });

  it("covers every cross-field transition decision at the contract boundary", () => {
    const base = {
      assignmentId: ids.assignmentId,
      version: 2,
    } as const;

    expect(() =>
      learningAssignmentTransitionRequestSchema.parse({
        ...base,
        event: "ATRIBUIR",
        now: "2026-08-10T17:00:00.000Z",
      }),
    ).toThrow("now");
    expect(() =>
      learningAssignmentTransitionRequestSchema.parse({
        ...base,
        event: "INICIAR",
        reason: "PRE_REQUISITO",
      }),
    ).toThrow("reason");
    expect(() =>
      learningAssignmentTransitionRequestSchema.parse({
        ...base,
        event: "INICIAR",
        resumeAt: "2026-08-12T17:00:00.000Z",
      }),
    ).toThrow("resumeAt");
    expect(() =>
      learningAssignmentTransitionRequestSchema.parse({
        ...base,
        event: "DESBLOQUEAR",
      }),
    ).toThrow("destination");
    expect(() =>
      learningAssignmentTransitionRequestSchema.parse({
        ...base,
        event: "INICIAR",
        to: "DISPONIVEL",
      }),
    ).toThrow("unblocking");
    expect(() =>
      learningAssignmentTransitionRequestSchema.parse({
        ...base,
        event: "BLOQUEAR",
        reason: "AFASTAMENTO",
      }),
    ).toThrow("blocking reason");
    expect(() =>
      learningAssignmentTransitionRequestSchema.parse({
        ...base,
        event: "PAUSAR",
        reason: "PRE_REQUISITO",
      }),
    ).toThrow("pause reason");
    expect(
      learningAssignmentTransitionRequestSchema.parse({
        ...base,
        event: "DESBLOQUEAR",
        to: "DISPONIVEL",
      }),
    ).toMatchObject({ event: "DESBLOQUEAR", to: "DISPONIVEL" });
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
    expect(() =>
      feedbackTicketTransitionRequestSchema.parse({
        ticketId: ids.ticketId,
        version: -1,
        event: "RESOLVER",
      }),
    ).toThrow();
  });

  it("covers feedback and appeal workflow cross-field rules", () => {
    const ticketBase = {
      ticketId: ids.ticketId,
      version: 1,
    } as const;
    expect(() =>
      feedbackTicketTransitionRequestSchema.parse({
        ...ticketBase,
        event: "PRIORIZAR",
      }),
    ).toThrow("priority is required");
    expect(
      feedbackTicketTransitionRequestSchema.parse({
        ...ticketBase,
        event: "PRIORIZAR",
        priority: "ALTA",
      }),
    ).toMatchObject({ priority: "ALTA" });
    expect(() =>
      feedbackTicketTransitionRequestSchema.parse({
        ...ticketBase,
        event: "TRIAR",
        priority: "ALTA",
      }),
    ).toThrow("priority is only valid");
    expect(() =>
      feedbackTicketTransitionRequestSchema.parse({
        ...ticketBase,
        event: "ATRIBUIR",
      }),
    ).toThrow("assigneeId is required");
    expect(
      feedbackTicketTransitionRequestSchema.parse({
        ...ticketBase,
        event: "ATRIBUIR",
        assigneeId: ids.resultId,
      }),
    ).toMatchObject({ assigneeId: ids.resultId });
    expect(() =>
      feedbackTicketTransitionRequestSchema.parse({
        ...ticketBase,
        event: "TRIAR",
        assigneeId: ids.resultId,
      }),
    ).toThrow("assigneeId is only valid");
    expect(() =>
      feedbackTicketTransitionRequestSchema.parse({
        ...ticketBase,
        event: "RESPONDER",
      }),
    ).toThrow("response is required");
    expect(
      feedbackTicketTransitionRequestSchema.parse({
        ...ticketBase,
        event: "RESPONDER",
        response: "Resposta sintética.",
      }),
    ).toMatchObject({ response: "Resposta sintética." });
    expect(() =>
      feedbackTicketTransitionRequestSchema.parse({
        ...ticketBase,
        event: "TRIAR",
        response: "Resposta sintética.",
      }),
    ).toThrow("response is only valid");

    const appealBase = {
      appealId: ids.resultId,
      version: 1,
    } as const;
    expect(() =>
      appealTransitionRequestSchema.parse({
        ...appealBase,
        event: "ATRIBUIR_REVISOR",
      }),
    ).toThrow("reviewer assignment requires");
    expect(() =>
      appealTransitionRequestSchema.parse({
        ...appealBase,
        event: "DECIDIR",
        reviewerId: ids.ticketId,
      }),
    ).toThrow("reviewerId is only valid");
    expect(() =>
      appealTransitionRequestSchema.parse({
        ...appealBase,
        event: "DECIDIR",
      }),
    ).toThrow("decision is required");
    expect(() =>
      appealTransitionRequestSchema.parse({
        ...appealBase,
        event: "ENCERRAR",
        decision: "MANTER_RESULTADO",
      }),
    ).toThrow("decision is only valid");
  });

  it("validates contestation inputs without accepting source or answer internals", () => {
    expect(
      appealCreateRequestSchema.parse({
        attemptId: ids.resultId,
        itemId: ids.ticketId,
        justification: "A justificativa sintética deve ser revisada.",
      }),
    ).toMatchObject({ attemptId: ids.resultId });
    expect(
      appealTransitionRequestSchema.parse({
        appealId: ids.resultId,
        version: 1,
        event: "ATRIBUIR_REVISOR",
        reviewerId: ids.ticketId,
      }),
    ).toMatchObject({ event: "ATRIBUIR_REVISOR" });
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
