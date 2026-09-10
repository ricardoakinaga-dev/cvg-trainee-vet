import { describe, expect, it } from "vitest";

import {
  LearningAssignmentDomainError,
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
    const paused = transitionLearningAssignment(started, { type: "PAUSAR" });
    const resumed = transitionLearningAssignment(paused, { type: "RETOMAR" });
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
});

describe("learning assignment domain validation", () => {
  const assignmentInput = {
    assignmentId: "11111111-1111-4111-8111-111111111111",
    participantId: "22222222-2222-4222-8222-222222222222",
    moduleId: "M02",
    availableAt: "2026-08-10T17:00:00.000Z",
  };

  it("rejects malformed creation inputs", () => {
    expect(() =>
      createLearningAssignment({ ...assignmentInput, assignmentId: "" }),
    ).toThrow(LearningAssignmentDomainError);
    expect(() =>
      createLearningAssignment({ ...assignmentInput, participantId: " " }),
    ).toThrow(LearningAssignmentDomainError);
    expect(() =>
      createLearningAssignment({ ...assignmentInput, moduleId: "M99" }),
    ).toThrow(LearningAssignmentDomainError);
    expect(() =>
      createLearningAssignment({
        ...assignmentInput,
        availableAt: "not-a-date",
      }),
    ).toThrow(LearningAssignmentDomainError);
  });

  it("rejects invalid states and transitions", () => {
    const attributed = transitionLearningAssignment(
      createLearningAssignment(assignmentInput),
      { type: "ATRIBUIR" },
    );
    expect(() =>
      transitionLearningAssignment(attributed, { type: "INICIAR" }),
    ).toThrow(LearningAssignmentDomainError);
    expect(() =>
      transitionLearningAssignment(
        { ...attributed, status: "INEXISTENTE" } as never,
        { type: "ATRIBUIR" },
      ),
    ).toThrow(LearningAssignmentDomainError);
    expect(() =>
      transitionLearningAssignment(
        { ...attributed, version: -1 },
        { type: "ATRIBUIR" },
      ),
    ).toThrow(LearningAssignmentDomainError);
    expect(() =>
      transitionLearningAssignment(
        { ...attributed, availableAt: "bad" },
        { type: "ATRIBUIR" },
      ),
    ).toThrow(LearningAssignmentDomainError);
    expect(() =>
      transitionLearningAssignment(
        { ...attributed, moduleId: "M99" },
        { type: "ATRIBUIR" },
      ),
    ).toThrow(LearningAssignmentDomainError);
  });

  it("rejects invalid availability and pause invariants", () => {
    const attributed = transitionLearningAssignment(
      createLearningAssignment(assignmentInput),
      { type: "ATRIBUIR" },
    );
    expect(() =>
      transitionLearningAssignment(attributed, {
        type: "DISPONIBILIZAR",
        now: "2026-08-09T17:00:00.000Z",
      }),
    ).toThrow(LearningAssignmentDomainError);
    expect(() =>
      transitionLearningAssignment(attributed, {
        type: "DISPONIBILIZAR",
        now: "bad",
      }),
    ).toThrow(LearningAssignmentDomainError);
    expect(() =>
      transitionLearningAssignment(
        { ...attributed, status: "PAUSADO" },
        { type: "RETOMAR" },
      ),
    ).toThrow(LearningAssignmentDomainError);
    expect(
      transitionLearningAssignment(
        { ...attributed, status: "PAUSADO", pausedFrom: "EM_ANDAMENTO" },
        { type: "RETOMAR" },
      ).status,
    ).toBe("EM_ANDAMENTO");
    expect(() =>
      transitionLearningAssignment(
        { ...attributed, pausedFrom: "EM_ANDAMENTO" },
        { type: "ATRIBUIR" },
      ),
    ).toThrow(LearningAssignmentDomainError);
    expect(() =>
      transitionLearningAssignment(
        { ...attributed, status: "BLOQUEADO" },
        { type: "DESBLOQUEAR", to: "DISPONIVEL" },
      ),
    ).toThrow(LearningAssignmentDomainError);
    expect(() =>
      transitionLearningAssignment(
        { ...attributed, blockReason: "PRE_REQUISITO" },
        { type: "ATRIBUIR" },
      ),
    ).toThrow(LearningAssignmentDomainError);
  });

  it("unblocks to the requested state", () => {
    const available = transitionLearningAssignment(
      transitionLearningAssignment(
        createLearningAssignment(assignmentInput),
        { type: "ATRIBUIR" },
      ),
      { type: "DISPONIBILIZAR", now: "2026-08-10T17:00:00.000Z" },
    );
    const blocked = transitionLearningAssignment(available, {
      type: "BLOQUEAR",
      reason: "OBJETIVO_EM_REMEDIACAO",
    });
    const unblocked = transitionLearningAssignment(blocked, {
      type: "DESBLOQUEAR",
      to: "DISPONIVEL",
    });
    expect(unblocked.status).toBe("DISPONIVEL");
  });
});

describe("assessment workflow domain validation", () => {
  const workflowInput = {
    resultId: "11111111-1111-4111-8111-111111111111",
    attemptId: "22222222-2222-4222-8222-222222222222",
    ruleVersion: "summative-v1",
  };

  it("rejects malformed creation and invalid transitions", () => {
    expect(() =>
      createAssessmentWorkflowResult({ ...workflowInput, resultId: "" }),
    ).toThrow(LearningAssignmentDomainError);
    expect(() =>
      createAssessmentWorkflowResult({ ...workflowInput, attemptId: " " }),
    ).toThrow(LearningAssignmentDomainError);
    expect(() =>
      createAssessmentWorkflowResult({ ...workflowInput, ruleVersion: " " }),
    ).toThrow(LearningAssignmentDomainError);
    const created = createAssessmentWorkflowResult(workflowInput);
    expect(() =>
      transitionAssessmentWorkflowResult(created, { type: "CORRIGIR" }),
    ).toThrow(LearningAssignmentDomainError);
    expect(() =>
      transitionAssessmentWorkflowResult(
        { ...created, status: "INVALIDO" } as never,
        { type: "DISPONIBILIZAR" },
      ),
    ).toThrow(LearningAssignmentDomainError);
    expect(() =>
      transitionAssessmentWorkflowResult(
        { ...created, version: -1 },
        { type: "DISPONIBILIZAR" },
      ),
    ).toThrow(LearningAssignmentDomainError);
  });

  it("walks the supported review cycle", () => {
    const created = createAssessmentWorkflowResult(workflowInput);
    const available = transitionAssessmentWorkflowResult(created, {
      type: "DISPONIBILIZAR",
    });
    const reviewing = transitionAssessmentWorkflowResult(available, {
      type: "INICIAR_REVISAO",
    });
    const corrected = transitionAssessmentWorkflowResult(reviewing, {
      type: "CORRIGIR",
    });
    const reReviewed = transitionAssessmentWorkflowResult(corrected, {
      type: "INICIAR_REVISAO",
    });
    expect(reReviewed.status).toBe("RESULTADO_EM_REVISAO");
    const anulled = transitionAssessmentWorkflowResult(available, {
      type: "ANULAR",
    });
    expect(anulled.status).toBe("RESULTADO_ANULADO");
  });
});
