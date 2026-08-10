import { describe, expect, it } from "vitest";
import type {
  AppealState,
  AssessmentWorkflowState,
  FeedbackTicketState,
  LearningAssignmentState,
} from "@cvg/domain";

import {
  createAppealState,
  createAssessmentWorkflowState,
  createFeedbackTicketState,
  createLearningAssignmentState,
  transitionAppealState,
  transitionAssessmentWorkflowState,
  transitionFeedbackTicketState,
  transitionLearningAssignmentState,
  type LearningStateRepositoryPort,
} from "./learning-state-use-cases.js";
import { ApplicationError } from "./errors.js";

const ids = {
  participantId: "11111111-1111-4111-8111-111111111111",
  scopeId: "22222222-2222-4222-8222-222222222222",
  assignmentId: "33333333-3333-4333-8333-333333333333",
  resultId: "44444444-4444-4444-8444-444444444444",
  attemptId: "55555555-5555-4555-8555-555555555555",
  ticketId: "66666666-6666-4666-8666-666666666666",
  appealId: "77777777-7777-4777-8777-777777777777",
  itemId: "88888888-8888-4888-8888-888888888888",
  reviewerId: "99999999-9999-4999-8999-999999999999",
};

type Stored = {
  assignments: Map<string, LearningAssignmentState>;
  workflows: Map<string, AssessmentWorkflowState>;
  tickets: Map<string, FeedbackTicketState>;
  appeals: Map<string, AppealState>;
};

function repository(seed: Partial<Stored> = {}): LearningStateRepositoryPort {
  const stored: Stored = {
    assignments: seed.assignments ?? new Map(),
    workflows: seed.workflows ?? new Map(),
    tickets: seed.tickets ?? new Map(),
    appeals: seed.appeals ?? new Map(),
  };
  return {
    async saveLearningAssignment(_context, state) {
      stored.assignments.set(state.assignmentId, state);
      return { scopeId: ids.scopeId, state };
    },
    async findLearningAssignment(_context, assignmentId) {
      const state = stored.assignments.get(assignmentId);
      return state === undefined ? null : { scopeId: ids.scopeId, state };
    },
    async saveAssessmentWorkflow(_context, state) {
      stored.workflows.set(state.resultId, state);
      return {
        scopeId: ids.scopeId,
        participantId: ids.participantId,
        state,
      };
    },
    async findAssessmentWorkflow(_context, resultId) {
      const state = stored.workflows.get(resultId);
      return state === undefined
        ? null
        : {
            scopeId: ids.scopeId,
            participantId: ids.participantId,
            state,
          };
    },
    async saveFeedbackTicket(_context, state) {
      stored.tickets.set(state.ticketId, state);
      return { scopeId: ids.scopeId, state };
    },
    async findFeedbackTicket(_context, ticketId) {
      const state = stored.tickets.get(ticketId);
      return state === undefined ? null : { scopeId: ids.scopeId, state };
    },
    async saveAppeal(_context, state) {
      stored.appeals.set(state.appealId, state);
      return { scopeId: ids.scopeId, state };
    },
    async findAppeal(_context, appealId) {
      const state = stored.appeals.get(appealId);
      return state === undefined ? null : { scopeId: ids.scopeId, state };
    },
  };
}

describe("learning state application use cases", () => {
  it("creates and transitions an assignment through the repository port", async () => {
    const port = repository();
    const initial = await createLearningAssignmentState(
      {
        assignmentId: ids.assignmentId,
        participantId: ids.participantId,
        scopeId: ids.scopeId,
        moduleId: "M03",
        availableAt: "2026-08-10T17:00:00.000Z",
      },
      port,
    );
    const assigned = await transitionLearningAssignmentState(
      {
        assignmentId: ids.assignmentId,
        participantId: ids.participantId,
        scopeId: ids.scopeId,
        version: initial.version,
        event: { type: "ATRIBUIR" },
      },
      port,
    );

    expect(initial).toMatchObject({ status: "NAO_ATRIBUIDO", version: 0 });
    expect(assigned).toMatchObject({ status: "ATRIBUIDO", version: 1 });
  });

  it("turns a stale version into a public state conflict", async () => {
    const port = repository();
    await createLearningAssignmentState(
      {
        assignmentId: ids.assignmentId,
        participantId: ids.participantId,
        scopeId: ids.scopeId,
        moduleId: "M03",
        availableAt: "2026-08-10T17:00:00.000Z",
      },
      port,
    );
    await expect(
      transitionLearningAssignmentState(
        {
          assignmentId: ids.assignmentId,
          participantId: ids.participantId,
          scopeId: ids.scopeId,
          version: 4,
          event: { type: "ATRIBUIR" },
        },
        port,
      ),
    ).rejects.toMatchObject({ code: "state_conflict", status: 409 });
  });

  it("creates and transitions workflow, ticket, and appeal states", async () => {
    const port = repository();
    const workflow = await createAssessmentWorkflowState(
      {
        resultId: ids.resultId,
        attemptId: ids.attemptId,
        participantId: ids.participantId,
        scopeId: ids.scopeId,
        ruleVersion: "summative-v1",
      },
      port,
    );
    const available = await transitionAssessmentWorkflowState(
      {
        resultId: ids.resultId,
        participantId: ids.participantId,
        scopeId: ids.scopeId,
        version: workflow.version,
        event: { type: "DISPONIBILIZAR" },
      },
      port,
    );
    const ticket = await createFeedbackTicketState(
      {
        ticketId: ids.ticketId,
        participantId: ids.participantId,
        scopeId: ids.scopeId,
        type: "CONTESTACAO",
        description: "Relato sintético de teste.",
        createdAt: "2026-08-10T17:00:00.000Z",
      },
      port,
    );
    const triaged = await transitionFeedbackTicketState(
      {
        ticketId: ids.ticketId,
        participantId: ids.participantId,
        scopeId: ids.scopeId,
        version: ticket.version,
        event: { type: "TRIAR" },
      },
      port,
    );
    const appeal = await createAppealState(
      {
        appealId: ids.appealId,
        participantId: ids.participantId,
        scopeId: ids.scopeId,
        attemptId: ids.attemptId,
        itemId: ids.itemId,
        justification: "Justificativa sintética de teste.",
        createdAt: "2026-08-10T17:00:00.000Z",
      },
      port,
    );
    const reviewed = await transitionAppealState(
      {
        appealId: ids.appealId,
        participantId: ids.participantId,
        scopeId: ids.scopeId,
        version: appeal.version,
        event: { type: "ATRIBUIR_REVISOR", reviewerId: ids.reviewerId },
      },
      port,
    );

    expect(available).toMatchObject({
      status: "RESULTADO_DISPONIVEL",
      version: 1,
    });
    expect(triaged).toMatchObject({ status: "TRIADO", version: 1 });
    expect(reviewed).toMatchObject({
      status: "EM_REVISAO",
      reviewerId: ids.reviewerId,
      version: 1,
    });
  });

  it("rejects missing persisted resources before attempting a transition", async () => {
    const port = repository();
    await expect(
      transitionFeedbackTicketState(
        {
          ticketId: ids.ticketId,
          participantId: ids.participantId,
          scopeId: ids.scopeId,
          version: 0,
          event: { type: "TRIAR" },
        },
        port,
      ),
    ).rejects.toMatchObject({ code: "not_found", status: 404 });
  });

  it("maps invalid context, invalid input, illegal transitions and persistence errors", async () => {
    const port = repository();
    await expect(
      createLearningAssignmentState(
        {
          assignmentId: ids.assignmentId,
          participantId: "",
          scopeId: ids.scopeId,
          moduleId: "M03",
          availableAt: "2026-08-10T17:00:00.000Z",
        },
        port,
      ),
    ).rejects.toThrow(TypeError);
    await expect(
      createLearningAssignmentState(
        {
          assignmentId: ids.assignmentId,
          participantId: ids.participantId,
          scopeId: ids.scopeId,
          moduleId: "M99",
          availableAt: "2026-08-10T17:00:00.000Z",
        },
        port,
      ),
    ).rejects.toMatchObject({ code: "validation_error", status: 422 });
    await expect(
      transitionLearningAssignmentState(
        {
          assignmentId: ids.assignmentId,
          participantId: ids.participantId,
          scopeId: ids.scopeId,
          version: -1,
          event: { type: "ATRIBUIR" },
        },
        port,
      ),
    ).rejects.toThrow(TypeError);

    await createLearningAssignmentState(
      {
        assignmentId: ids.assignmentId,
        participantId: ids.participantId,
        scopeId: ids.scopeId,
        moduleId: "M03",
        availableAt: "2026-08-10T17:00:00.000Z",
      },
      port,
    );
    await expect(
      transitionLearningAssignmentState(
        {
          assignmentId: ids.assignmentId,
          participantId: ids.participantId,
          scopeId: ids.scopeId,
          version: 0,
          event: { type: "DISPONIBILIZAR", now: "2026-08-10T17:00:00.000Z" },
        },
        port,
      ),
    ).rejects.toMatchObject({ code: "state_conflict", status: 409 });

    const workflowPort = repository();
    await createAssessmentWorkflowState(
      {
        resultId: ids.resultId,
        attemptId: ids.attemptId,
        participantId: ids.participantId,
        scopeId: ids.scopeId,
        ruleVersion: "summative-v1",
      },
      workflowPort,
    );
    await expect(
      transitionAssessmentWorkflowState(
        {
          resultId: ids.resultId,
          participantId: ids.participantId,
          scopeId: ids.scopeId,
          version: 0,
          event: { type: "INICIAR_REVISAO" },
        },
        workflowPort,
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });

    const ticketPort = repository();
    await createFeedbackTicketState(
      {
        ticketId: ids.ticketId,
        participantId: ids.participantId,
        scopeId: ids.scopeId,
        type: "CONTESTACAO",
        description: "Relato sintético.",
        createdAt: "2026-08-10T17:00:00.000Z",
      },
      ticketPort,
    );
    await expect(
      transitionFeedbackTicketState(
        {
          ticketId: ids.ticketId,
          participantId: ids.participantId,
          scopeId: ids.scopeId,
          version: 0,
          event: { type: "RESOLVER" },
        },
        ticketPort,
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });

    const appealPort = repository();
    await createAppealState(
      {
        appealId: ids.appealId,
        participantId: ids.participantId,
        scopeId: ids.scopeId,
        attemptId: ids.attemptId,
        itemId: ids.itemId,
        justification: "Justificativa sintética.",
        createdAt: "2026-08-10T17:00:00.000Z",
      },
      appealPort,
    );
    await expect(
      transitionAppealState(
        {
          appealId: ids.appealId,
          participantId: ids.participantId,
          scopeId: ids.scopeId,
          version: 0,
          event: { type: "DECIDIR", decision: "MANTER_RESULTADO" },
        },
        appealPort,
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });

    const applicationFailure: LearningStateRepositoryPort = {
      ...repository(),
      saveLearningAssignment: async () => {
        throw new ApplicationError("state_conflict", "synthetic");
      },
    };
    await expect(
      createLearningAssignmentState(
        {
          assignmentId: ids.assignmentId,
          participantId: ids.participantId,
          scopeId: ids.scopeId,
          moduleId: "M03",
          availableAt: "2026-08-10T17:00:00.000Z",
        },
        applicationFailure,
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });

    const persistenceFailure: LearningStateRepositoryPort = {
      ...repository(),
      saveLearningAssignment: async () => {
        const error = new Error("synthetic conflict");
        error.name = "LearningStatePersistenceConflictError";
        throw error;
      },
    };
    await expect(
      createLearningAssignmentState(
        {
          assignmentId: ids.assignmentId,
          participantId: ids.participantId,
          scopeId: ids.scopeId,
          moduleId: "M03",
          availableAt: "2026-08-10T17:00:00.000Z",
        },
        persistenceFailure,
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });

    const genericCreateFailure: LearningStateRepositoryPort = {
      ...repository(),
      saveLearningAssignment: async () => {
        throw new Error("synthetic persistence failure");
      },
    };
    await expect(
      createLearningAssignmentState(
        {
          assignmentId: ids.assignmentId,
          participantId: ids.participantId,
          scopeId: ids.scopeId,
          moduleId: "M03",
          availableAt: "2026-08-10T17:00:00.000Z",
        },
        genericCreateFailure,
      ),
    ).rejects.toThrow("synthetic persistence failure");

    const assignmentStore = new Map<string, LearningAssignmentState>();
    const assignmentPort = repository({ assignments: assignmentStore });
    await createLearningAssignmentState(
      {
        assignmentId: ids.assignmentId,
        participantId: ids.participantId,
        scopeId: ids.scopeId,
        moduleId: "M03",
        availableAt: "2026-08-10T17:00:00.000Z",
      },
      assignmentPort,
    );
    const assignmentApplicationFailure: LearningStateRepositoryPort = {
      ...assignmentPort,
      saveLearningAssignment: async () => {
        throw new ApplicationError("state_conflict", "synthetic");
      },
    };
    await expect(
      transitionLearningAssignmentState(
        {
          assignmentId: ids.assignmentId,
          participantId: ids.participantId,
          scopeId: ids.scopeId,
          version: 0,
          event: { type: "ATRIBUIR" },
        },
        assignmentApplicationFailure,
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });

    const workflowStore = new Map<string, AssessmentWorkflowState>();
    const workflowBase = repository({ workflows: workflowStore });
    await createAssessmentWorkflowState(
      {
        resultId: ids.resultId,
        attemptId: ids.attemptId,
        participantId: ids.participantId,
        scopeId: ids.scopeId,
        ruleVersion: "summative-v1",
      },
      workflowBase,
    );
    const workflowConflict: LearningStateRepositoryPort = {
      ...workflowBase,
      saveAssessmentWorkflow: async () => {
        const error = new Error("synthetic conflict");
        error.name = "LearningStatePersistenceConflictError";
        throw error;
      },
    };
    await expect(
      transitionAssessmentWorkflowState(
        {
          resultId: ids.resultId,
          participantId: ids.participantId,
          scopeId: ids.scopeId,
          version: 0,
          event: { type: "DISPONIBILIZAR" },
        },
        workflowConflict,
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });

    const ticketStore = new Map<string, FeedbackTicketState>();
    const ticketBase = repository({ tickets: ticketStore });
    await createFeedbackTicketState(
      {
        ticketId: ids.ticketId,
        participantId: ids.participantId,
        scopeId: ids.scopeId,
        type: "CONTESTACAO",
        description: "Relato sintético.",
        createdAt: "2026-08-10T17:00:00.000Z",
      },
      ticketBase,
    );
    const ticketGenericFailure: LearningStateRepositoryPort = {
      ...ticketBase,
      saveFeedbackTicket: async () => {
        throw new Error("synthetic persistence failure");
      },
    };
    await expect(
      transitionFeedbackTicketState(
        {
          ticketId: ids.ticketId,
          participantId: ids.participantId,
          scopeId: ids.scopeId,
          version: 0,
          event: { type: "TRIAR" },
        },
        ticketGenericFailure,
      ),
    ).rejects.toThrow("synthetic persistence failure");

    const appealStore = new Map<string, AppealState>();
    const appealBase = repository({ appeals: appealStore });
    await createAppealState(
      {
        appealId: ids.appealId,
        participantId: ids.participantId,
        scopeId: ids.scopeId,
        attemptId: ids.attemptId,
        itemId: ids.itemId,
        justification: "Justificativa sintética.",
        createdAt: "2026-08-10T17:00:00.000Z",
      },
      appealBase,
    );
    const appealApplicationFailure: LearningStateRepositoryPort = {
      ...appealBase,
      saveAppeal: async () => {
        throw new ApplicationError("state_conflict", "synthetic");
      },
    };
    await expect(
      transitionAppealState(
        {
          appealId: ids.appealId,
          participantId: ids.participantId,
          scopeId: ids.scopeId,
          version: 0,
          event: { type: "ATRIBUIR_REVISOR", reviewerId: ids.reviewerId },
        },
        appealApplicationFailure,
      ),
    ).rejects.toMatchObject({ code: "state_conflict" });
  });
});
