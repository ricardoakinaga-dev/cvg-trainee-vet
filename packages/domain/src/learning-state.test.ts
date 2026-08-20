import { describe, expect, it } from "vitest";

import {
  createAssessmentWorkflowResult,
  createFeedbackTicket,
  createLearningAssignment,
  transitionAssessmentWorkflowResult,
  transitionFeedbackTicket,
  transitionLearningAssignment,
} from "./learning-state.js";

const assignmentInput = {
  assignmentId: "assignment-1",
  participantId: "participant-1",
  moduleId: "M02",
  availableAt: "2026-08-10T17:00:00.000Z",
} as const;

describe("learning assignment state machine", () => {
  it("keeps future assignments ineligible until their availability time", () => {
    const attributed = transitionLearningAssignment(
      createLearningAssignment(assignmentInput),
      { type: "ATRIBUIR" },
    );

    expect(attributed.status).toBe("ATRIBUIDO");
    expect(() =>
      transitionLearningAssignment(attributed, {
        type: "DISPONIBILIZAR",
        now: "2026-08-10T16:59:59.000Z",
      }),
    ).toThrow("available");
  });

  it("supports pause/resume, remediation, and retention without mutating prior states", () => {
    const assigned = transitionLearningAssignment(
      createLearningAssignment(assignmentInput),
      { type: "ATRIBUIR" },
    );
    const available = transitionLearningAssignment(assigned, {
      type: "DISPONIBILIZAR",
      now: "2026-08-10T17:00:00.000Z",
    });
    const started = transitionLearningAssignment(available, {
      type: "INICIAR",
    });
    const paused = transitionLearningAssignment(started, {
      type: "PAUSAR",
      reason: "ACOMODACAO",
      resumeAt: "2026-08-11T17:00:00.000Z",
    });
    const resumed = transitionLearningAssignment(paused, {
      type: "RETOMAR",
      now: "2026-08-11T17:00:00.000Z",
    });
    const reinforcement = transitionLearningAssignment(resumed, {
      type: "INICIAR_REFORCO",
    });
    const concluded = transitionLearningAssignment(reinforcement, {
      type: "CONCLUIR_REFORCO",
    });
    const retentionPending = transitionLearningAssignment(concluded, {
      type: "AGENDAR_RETENCAO",
    });

    expect(Object.isFrozen(retentionPending)).toBe(true);
    expect(retentionPending.status).toBe("CONCLUIDO_COM_RETENCAO_PENDENTE");
    expect(started.status).toBe("EM_ANDAMENTO");
    expect(paused.status).toBe("PAUSADO");
    expect(resumed.status).toBe("EM_ANDAMENTO");
  });

  it("requires an explicit pause context and never resumes before the accommodation window", () => {
    const assigned = transitionLearningAssignment(
      createLearningAssignment(assignmentInput),
      { type: "ATRIBUIR" },
    );
    const available = transitionLearningAssignment(assigned, {
      type: "DISPONIBILIZAR",
      now: "2026-08-10T17:00:00.000Z",
    });
    const started = transitionLearningAssignment(available, {
      type: "INICIAR",
    });

    expect(() =>
      transitionLearningAssignment(started, {
        type: "PAUSAR",
        reason: undefined as never,
      }),
    ).toThrow("pause reason");

    const paused = transitionLearningAssignment(started, {
      type: "PAUSAR",
      reason: "AFASTAMENTO",
      resumeAt: "2026-08-12T17:00:00.000Z",
    });
    expect(paused).toMatchObject({
      status: "PAUSADO",
      pausedFrom: "EM_ANDAMENTO",
      pauseReason: "AFASTAMENTO",
      resumeAt: "2026-08-12T17:00:00.000Z",
    });
    expect(() =>
      transitionLearningAssignment(paused, {
        type: "RETOMAR",
        now: "2026-08-12T16:59:59.000Z",
      }),
    ).toThrow("resume window");

    const resumed = transitionLearningAssignment(paused, {
      type: "RETOMAR",
      now: "2026-08-12T17:00:00.000Z",
    });
    expect(resumed).toMatchObject({ status: "EM_ANDAMENTO" });
    expect(resumed).not.toHaveProperty("pauseReason");
    expect(resumed).not.toHaveProperty("resumeAt");

    expect(() =>
      transitionLearningAssignment(
        { ...paused, pauseReason: "OUTRO" as never },
        { type: "RETOMAR", now: "2026-08-12T17:00:00.000Z" },
      ),
    ).toThrow("pause reason");
  });

  it("blocks only the affected assignment and requires an explicit destination to unblock", () => {
    const available = transitionLearningAssignment(
      transitionLearningAssignment(createLearningAssignment(assignmentInput), {
        type: "ATRIBUIR",
      }),
      { type: "DISPONIBILIZAR", now: "2026-08-10T17:00:00.000Z" },
    );
    const blocked = transitionLearningAssignment(available, {
      type: "BLOQUEAR",
      reason: "OBJETIVO_EM_REMEDIACAO",
    });

    expect(blocked.status).toBe("BLOQUEADO");
    expect(blocked.blockReason).toBe("OBJETIVO_EM_REMEDIACAO");
    expect(() =>
      transitionLearningAssignment(blocked, { type: "INICIAR" }),
    ).toThrow();
    expect(
      transitionLearningAssignment(blocked, {
        type: "DESBLOQUEAR",
        to: "DISPONIVEL",
      }).status,
    ).toBe("DISPONIVEL");
  });

  it("uses an explicit status allowlist at the runtime boundary", () => {
    const assigned = transitionLearningAssignment(
      createLearningAssignment(assignmentInput),
      { type: "ATRIBUIR" },
    );

    expect(() =>
      transitionLearningAssignment(
        { ...assigned, status: "toString" as never },
        { type: "INICIAR" },
      ),
    ).toThrow("supported");
  });

  it("covers fail-closed assignment validation and every critical state branch", () => {
    expect(() =>
      transitionLearningAssignment(null as never, { type: "INICIAR" }),
    ).toThrow("object");
    expect(() =>
      createLearningAssignment({ ...assignmentInput, assignmentId: "" }),
    ).toThrow("assignmentId");
    expect(() =>
      createLearningAssignment({ ...assignmentInput, participantId: "" }),
    ).toThrow("participantId");
    expect(() =>
      createLearningAssignment({ ...assignmentInput, moduleId: "M00" }),
    ).toThrow("moduleId");
    expect(() =>
      createLearningAssignment({ ...assignmentInput, availableAt: "invalid" }),
    ).toThrow("availableAt");

    const assigned = transitionLearningAssignment(
      createLearningAssignment(assignmentInput),
      { type: "ATRIBUIR" },
    );
    const available = transitionLearningAssignment(assigned, {
      type: "DISPONIBILIZAR",
      now: "2026-08-10T17:00:00.000Z",
    });
    const started = transitionLearningAssignment(available, {
      type: "INICIAR",
    });

    expect(() =>
      transitionLearningAssignment(
        { ...assigned, moduleId: "M00" as never },
        { type: "INICIAR" },
      ),
    ).toThrow("moduleId");
    expect(() =>
      transitionLearningAssignment(
        { ...assigned, availableAt: "invalid" as never },
        { type: "INICIAR" },
      ),
    ).toThrow("availableAt");
    expect(() =>
      transitionLearningAssignment(
        { ...assigned, version: -1 },
        { type: "INICIAR" },
      ),
    ).toThrow("version");
    expect(() =>
      transitionLearningAssignment(
        { ...assigned, pausedFrom: "EM_ANDAMENTO" },
        { type: "INICIAR" },
      ),
    ).toThrow("pausedFrom");
    expect(() =>
      transitionLearningAssignment(
        { ...assigned, pauseReason: "ACOMODACAO" },
        { type: "INICIAR" },
      ),
    ).toThrow("pauseReason");
    expect(() =>
      transitionLearningAssignment(
        { ...assigned, resumeAt: "2026-08-12T17:00:00.000Z" },
        { type: "INICIAR" },
      ),
    ).toThrow("resumeAt");
    expect(() =>
      transitionLearningAssignment(
        { ...assigned, status: "BLOQUEADO" },
        { type: "INICIAR" },
      ),
    ).toThrow("blocked assignment");
    expect(() =>
      transitionLearningAssignment(
        { ...assigned, blockReason: "PRE_REQUISITO" },
        { type: "INICIAR" },
      ),
    ).toThrow("blockReason");

    const paused = transitionLearningAssignment(started, {
      type: "PAUSAR",
      reason: "ACOMODACAO",
      resumeAt: "2026-08-12T17:00:00.000Z",
    });
    expect(() =>
      transitionLearningAssignment(
        { ...paused, pausedFrom: undefined as never },
        { type: "RETOMAR", now: "2026-08-12T17:00:00.000Z" },
      ),
    ).toThrow("previous state");
    expect(() =>
      transitionLearningAssignment(
        { ...paused, pauseReason: undefined as never },
        { type: "RETOMAR", now: "2026-08-12T17:00:00.000Z" },
      ),
    ).toThrow("pause reason");
    expect(() =>
      transitionLearningAssignment(
        { ...paused, resumeAt: "invalid" as never },
        { type: "RETOMAR", now: "2026-08-12T17:00:00.000Z" },
      ),
    ).toThrow("resumeAt");
    expect(() =>
      transitionLearningAssignment(paused, {
        type: "RETOMAR",
        now: "invalid",
      }),
    ).toThrow("now");
    expect(() =>
      transitionLearningAssignment(started, {
        type: "PAUSAR",
        reason: "JANELA_OPERACIONAL",
        resumeAt: "invalid",
      }),
    ).toThrow("resumeAt");
    expect(
      transitionLearningAssignment(
        transitionLearningAssignment(started, {
          type: "PAUSAR",
          reason: "JANELA_OPERACIONAL",
        }),
        { type: "RETOMAR", now: "2026-08-12T17:00:00.000Z" },
      ).status,
    ).toBe("EM_ANDAMENTO");
    expect(() =>
      transitionLearningAssignment(assigned, {
        type: "DISPONIBILIZAR",
        now: "invalid",
      }),
    ).toThrow("now");

    expect(
      transitionLearningAssignment(
        transitionLearningAssignment(assigned, {
          type: "BLOQUEAR",
          reason: "PRE_REQUISITO",
        }),
        { type: "DESBLOQUEAR", to: "ATRIBUIDO" },
      ).status,
    ).toBe("ATRIBUIDO");
    expect(
      transitionLearningAssignment(
        transitionLearningAssignment(available, {
          type: "BLOQUEAR",
          reason: "CONTEUDO_RETIRADO",
        }),
        { type: "DESBLOQUEAR", to: "DISPONIVEL" },
      ).status,
    ).toBe("DISPONIVEL");

    const reinforcement = transitionLearningAssignment(started, {
      type: "INICIAR_REFORCO",
    });
    expect(
      transitionLearningAssignment(reinforcement, {
        type: "CONCLUIR_REFORCO",
      }).status,
    ).toBe("CONCLUIDO");
    const concluded = transitionLearningAssignment(started, {
      type: "CONCLUIR",
    });
    const pending = transitionLearningAssignment(concluded, {
      type: "AGENDAR_RETENCAO",
    });
    expect(
      transitionLearningAssignment(pending, {
        type: "RETENCAO_APROVADA",
      }).status,
    ).toBe("CONCLUIDO");
    expect(
      transitionLearningAssignment(pending, {
        type: "RETENCAO_REFORCO",
      }).status,
    ).toBe("EM_REFORCO");
    expect(
      transitionLearningAssignment(
        transitionLearningAssignment(pending, {
          type: "RETENCAO_REFORCO",
        }),
        { type: "CONCLUIR_REFORCO" },
      ).status,
    ).toBe("CONCLUIDO");
    expect(
      transitionLearningAssignment(
        transitionLearningAssignment(pending, {
          type: "PAUSAR",
          reason: "AFASTAMENTO",
        }),
        { type: "RETOMAR", now: "2026-08-12T17:00:00.000Z" },
      ).status,
    ).toBe("CONCLUIDO_COM_RETENCAO_PENDENTE");
  });
});

describe("assessment result workflow", () => {
  it("requires processing before availability, review, correction, or annulment", () => {
    const processing = createAssessmentWorkflowResult({
      resultId: "result-1",
      attemptId: "attempt-1",
      ruleVersion: "rule-v1",
    });

    expect(() =>
      transitionAssessmentWorkflowResult(processing, { type: "CORRIGIR" }),
    ).toThrow();
    const available = transitionAssessmentWorkflowResult(processing, {
      type: "DISPONIBILIZAR",
    });
    const review = transitionAssessmentWorkflowResult(available, {
      type: "INICIAR_REVISAO",
    });
    const corrected = transitionAssessmentWorkflowResult(review, {
      type: "CORRIGIR",
    });

    expect(corrected.status).toBe("RESULTADO_CORRIGIDO");
    expect(corrected.version).toBe(3);
    expect(Object.isFrozen(corrected)).toBe(true);
  });

  it("covers invalid workflow states and both annulment branches", () => {
    const processing = createAssessmentWorkflowResult({
      resultId: "result-2",
      attemptId: "attempt-2",
      ruleVersion: "rule-v1",
    });
    expect(() =>
      transitionAssessmentWorkflowResult(null as never, {
        type: "DISPONIBILIZAR",
      }),
    ).toThrow("object");
    expect(() =>
      transitionAssessmentWorkflowResult(
        { ...processing, version: -1 },
        { type: "DISPONIBILIZAR" },
      ),
    ).toThrow("version");
    expect(() =>
      transitionAssessmentWorkflowResult(
        { ...processing, status: "UNKNOWN" as never },
        { type: "DISPONIBILIZAR" },
      ),
    ).toThrow("status");
    expect(() =>
      createAssessmentWorkflowResult({
        resultId: "",
        attemptId: "attempt-2",
        ruleVersion: "rule-v1",
      }),
    ).toThrow("resultId");

    const available = transitionAssessmentWorkflowResult(processing, {
      type: "DISPONIBILIZAR",
    });
    expect(
      transitionAssessmentWorkflowResult(available, { type: "ANULAR" }).status,
    ).toBe("RESULTADO_ANULADO");
    const review = transitionAssessmentWorkflowResult(available, {
      type: "INICIAR_REVISAO",
    });
    expect(
      transitionAssessmentWorkflowResult(review, { type: "ANULAR" }).status,
    ).toBe("RESULTADO_ANULADO");
    const corrected = transitionAssessmentWorkflowResult(review, {
      type: "CORRIGIR",
    });
    expect(
      transitionAssessmentWorkflowResult(corrected, {
        type: "INICIAR_REVISAO",
      }).status,
    ).toBe("RESULTADO_EM_REVISAO");
  });
});

describe("feedback ticket state machine", () => {
  it("keeps reports text-only and follows the triage workflow", () => {
    const created = createFeedbackTicket({
      ticketId: "ticket-1",
      participantId: "participant-1",
      type: "ERRO_CONTEUDO",
      description: "A instrução do caso precisa de revisão.",
      createdAt: "2026-08-10T17:00:00.000Z",
    });
    const triaged = transitionFeedbackTicket(created, { type: "TRIAR" });
    const treatment = transitionFeedbackTicket(triaged, {
      type: "INICIAR_TRATAMENTO",
    });
    const resolved = transitionFeedbackTicket(treatment, {
      type: "RESOLVER",
    });

    expect(resolved.status).toBe("RESOLVIDO");
    expect(Object.isFrozen(resolved)).toBe(true);
    expect(() =>
      createFeedbackTicket({
        ticketId: "ticket-2",
        participantId: "participant-1",
        type: "MELHORIA",
        description: "<script>unsafe</script>",
        createdAt: "2026-08-10T17:00:00.000Z",
      }),
    ).toThrow();
  });

  it("covers feedback terminal outcomes, resume, and invalid state boundaries", () => {
    const created = createFeedbackTicket({
      ticketId: "ticket-3",
      participantId: "participant-1",
      type: "BUG_TECNICO",
      description: "Falha sintética de teste.",
      createdAt: "2026-08-10T17:00:00.000Z",
    });
    expect(() =>
      transitionFeedbackTicket(null as never, { type: "TRIAR" }),
    ).toThrow("object");
    expect(() =>
      createFeedbackTicket({
        ticketId: "ticket-4",
        participantId: "participant-1",
        type: "UNKNOWN" as never,
        description: "Falha sintética de teste.",
        createdAt: "2026-08-10T17:00:00.000Z",
      }),
    ).toThrow("type");
    expect(() =>
      createFeedbackTicket({
        ticketId: "ticket-5",
        participantId: "participant-1",
        type: "BUG_TECNICO",
        description: "invalid",
        createdAt: "invalid",
      }),
    ).toThrow("createdAt");
    expect(() =>
      createFeedbackTicket({
        ticketId: "ticket-6",
        participantId: "participant-1",
        type: "MELHORIA",
        description: "x".repeat(2_001),
        createdAt: "2026-08-10T17:00:00.000Z",
      }),
    ).toThrow("maximum length");
    expect(() =>
      createFeedbackTicket({
        ticketId: "ticket-7",
        participantId: "participant-1",
        type: "MELHORIA",
        description: "<b>texto sintético</b>",
        createdAt: "2026-08-10T17:00:00.000Z",
      }),
    ).toThrow("prohibited content");
    expect(() =>
      createFeedbackTicket({
        ticketId: "ticket-8",
        participantId: "participant-1",
        type: "MELHORIA",
        description: "Falha sintética de teste.",
        createdAt: "2026-08-10T17:00:00.000Z",
        technicalContext: {
          logicalPage: "/feedback",
          appVersion: "test-1",
          occurredAt: "2026-08-10T17:00:00.000Z",
          errorCode: "CLIENT_ERROR",
        },
      }),
    ).not.toThrow();
    expect(() =>
      createFeedbackTicket({
        ticketId: "ticket-9",
        participantId: "participant-1",
        type: "MELHORIA",
        description: "Contexto sem campos opcionais.",
        createdAt: "2026-08-10T17:00:00.000Z",
        technicalContext: {
          logicalPage: "/feedback",
          appVersion: "test-1",
        },
      }),
    ).not.toThrow();
    expect(() =>
      transitionFeedbackTicket(
        { ...created, status: "UNKNOWN" as never },
        { type: "TRIAR" },
      ),
    ).toThrow("status");
    expect(() =>
      transitionFeedbackTicket(
        { ...created, createdAt: "invalid" },
        { type: "TRIAR" },
      ),
    ).toThrow("createdAt");
    expect(() =>
      transitionFeedbackTicket(
        { ...created, alertedAt: "invalid" },
        { type: "TRIAR" },
      ),
    ).toThrow("alertedAt");
    expect(() =>
      transitionFeedbackTicket({ ...created, version: -1 }, { type: "TRIAR" }),
    ).toThrow("version");

    const triaged = transitionFeedbackTicket(created, { type: "TRIAR" });
    const treatment = transitionFeedbackTicket(triaged, {
      type: "INICIAR_TRATAMENTO",
    });
    expect(
      transitionFeedbackTicket(treatment, { type: "AGUARDAR_USUARIO" }).status,
    ).toBe("AGUARDA_USUARIO");
    expect(
      transitionFeedbackTicket(
        transitionFeedbackTicket(treatment, { type: "AGUARDAR_USUARIO" }),
        { type: "RETOMAR_TRATAMENTO" },
      ).status,
    ).toBe("EM_TRATAMENTO");
    expect(
      transitionFeedbackTicket(treatment, { type: "MARCAR_DUPLICADO" }).status,
    ).toBe("DUPLICADO");
    expect(
      transitionFeedbackTicket(treatment, {
        type: "MARCAR_NAO_REPRODUZIDO",
      }).status,
    ).toBe("NAO_REPRODUZIDO");
    expect(
      transitionFeedbackTicket(treatment, {
        type: "MARCAR_NAO_PLANEJADO",
      }).status,
    ).toBe("NAO_PLANEJADO");
  });
});
