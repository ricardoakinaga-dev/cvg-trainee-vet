import { describe, expect, it } from "vitest";
import {
  createAppeal,
  createAssessmentWorkflowResult,
  createFeedbackTicket,
  createLearningAssignment,
  transitionAppeal,
  transitionAssessmentWorkflowResult,
  transitionFeedbackTicket,
  transitionLearningAssignment,
} from "@cvg/domain";

import {
  appealRowToState,
  appealStateToRow,
  createAppealReadRepository,
  assessmentWorkflowRowToState,
  assessmentWorkflowStateToRow,
  createLearningStateRepository,
  feedbackTicketRowToState,
  feedbackTicketStateToRow,
  LearningStatePersistenceConflictError,
  learningAssignmentRowToState,
  learningAssignmentStateToRow,
} from "./learning-state-repository.js";

const participantId = "11111111-1111-4111-8111-111111111111";
const reviewerId = "22222222-2222-4222-8222-222222222222";
const scopeId = "33333333-3333-4333-8333-333333333333";
const now = "2026-08-10T12:00:00.000Z";

type FakeBuilder = {
  values: () => FakeBuilder;
  onConflictDoNothing: () => FakeBuilder;
  set: () => FakeBuilder;
  where: () => FakeBuilder;
  returning: () => Promise<readonly unknown[]>;
};

type FakeSelectBuilder = {
  from: () => FakeSelectBuilder;
  where: () => FakeSelectBuilder;
  orderBy: () => FakeSelectBuilder;
  limit: () => Promise<readonly unknown[]>;
};

type FakeTransaction = {
  execute: () => Promise<readonly []>;
  insert: () => FakeBuilder;
  update: () => FakeBuilder;
  select: () => FakeSelectBuilder;
};

function createFakeDatabase(
  selectRows: readonly (readonly unknown[])[],
  returningRows: readonly (readonly unknown[])[],
) {
  const selectQueue = [...selectRows];
  const returningQueue = [...returningRows];
  const createBuilder = (): FakeBuilder => {
    const builder: FakeBuilder = {
      values: () => builder,
      onConflictDoNothing: () => builder,
      set: () => builder,
      where: () => builder,
      returning: async () => returningQueue.shift() ?? [],
    };
    return builder;
  };
  const createSelectBuilder = (): FakeSelectBuilder => {
    const builder: FakeSelectBuilder = {
      from: () => builder,
      where: () => builder,
      orderBy: () => builder,
      limit: async () => selectQueue.shift() ?? [],
    };
    return builder;
  };
  const tx: FakeTransaction = {
    execute: async () => [] as const,
    insert: () => createBuilder(),
    update: () => createBuilder(),
    select: () => createSelectBuilder(),
  };
  const transaction = (action: (tx: FakeTransaction) => Promise<unknown>) =>
    action(tx);
  return {
    transaction,
  } as unknown as Parameters<typeof createLearningStateRepository>[0];
}

function assignmentRow(
  assignmentId: string,
  status: string,
  version: number,
): Record<string, unknown> {
  return {
    id: assignmentId,
    participantId,
    scopeId,
    moduleId: "M03",
    availableAt: new Date(now),
    status,
    version,
    blockReason: null,
    pausedFrom: null,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

function workflowRow(
  resultId: string,
  status: string,
  version: number,
): Record<string, unknown> {
  return {
    resultId,
    attemptId: "66666666-6666-4666-8666-666666666666",
    participantId,
    scopeId,
    ruleVersion: "summative-v1",
    status,
    version,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

function ticketRow(
  ticketId: string,
  status: string,
  version: number,
): Record<string, unknown> {
  return {
    id: ticketId,
    participantId,
    scopeId,
    type: "CONTESTACAO",
    description: "Solicitação sintética de revisão.",
    createdAt: new Date(now),
    status,
    version,
    updatedAt: new Date(now),
  };
}

function appealRow(
  appealId: string,
  status: string,
  version: number,
  reviewerId: string | null,
  decision: string | null,
): Record<string, unknown> {
  return {
    id: appealId,
    participantId,
    scopeId,
    attemptId: "66666666-6666-4666-8666-666666666666",
    itemId: "99999999-9999-4999-8999-999999999999",
    justification: "Solicito revisão do item sintético.",
    createdAt: new Date(now),
    dueAt: new Date("2026-08-19T12:00:00.000Z"),
    status,
    version,
    reviewerId,
    decision,
    updatedAt: new Date(now),
  };
}

describe("learning state persistence mappings", () => {
  it("lists appeals only in the participant and scope context", async () => {
    const attemptId = "66666666-6666-4666-8666-666666666666";
    const appealId = "88888888-8888-4888-8888-888888888888";
    const repository = createAppealReadRepository(
      createFakeDatabase([[appealRow(appealId, "ABERTA", 0, null, null)]], []),
    );

    await expect(
      repository.listAppeals({ participantId, scopeId }, attemptId),
    ).resolves.toMatchObject([
      {
        scopeId,
        state: { appealId, attemptId, status: "ABERTA" },
      },
    ]);
  });

  it("round-trips assignment state and keeps nullable transition context explicit", () => {
    const initial = createLearningAssignment({
      assignmentId: "44444444-4444-4444-8444-444444444444",
      participantId,
      moduleId: "M03",
      availableAt: now,
    });
    const assigned = transitionLearningAssignment(initial, {
      type: "ATRIBUIR",
    });
    const blocked = transitionLearningAssignment(assigned, {
      type: "BLOQUEAR",
      reason: "PRE_REQUISITO",
    });
    const row = learningAssignmentStateToRow({ scopeId, state: blocked });

    expect(row).toMatchObject({
      id: blocked.assignmentId,
      participantId,
      scopeId,
      moduleId: "M03",
      status: "BLOQUEADO",
      version: 2,
      blockReason: "PRE_REQUISITO",
      pausedFrom: null,
    });
    expect(
      learningAssignmentRowToState({
        ...row,
        availableAt: new Date(row.availableAt),
        createdAt: new Date(now),
        updatedAt: new Date(now),
      }),
    ).toEqual({ scopeId, state: blocked });
  });

  it("rejects malformed persisted assignment context before it reaches SQL", () => {
    expect(() =>
      learningAssignmentRowToState({
        id: "44444444-4444-4444-8444-444444444444",
        participantId,
        scopeId,
        moduleId: "M03",
        availableAt: new Date(now),
        status: "BLOQUEADO",
        version: 1,
        blockReason: null,
        pausedFrom: null,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      }),
    ).toThrow("blockReason");
  });

  it("round-trips workflow and feedback ticket state with versions", () => {
    const workflow = transitionAssessmentWorkflowResult(
      createAssessmentWorkflowResult({
        resultId: "55555555-5555-4555-8555-555555555555",
        attemptId: "66666666-6666-4666-8666-666666666666",
        ruleVersion: "summative-v1",
      }),
      { type: "DISPONIBILIZAR" },
    );
    const ticket = transitionFeedbackTicket(
      createFeedbackTicket({
        ticketId: "77777777-7777-4777-8777-777777777777",
        participantId,
        type: "CONTESTACAO",
        description: "A questão precisa de revisão operacional.",
        createdAt: now,
      }),
      { type: "TRIAR" },
    );

    const workflowRow = assessmentWorkflowStateToRow({
      scopeId,
      participantId,
      state: workflow,
    });
    const ticketRow = feedbackTicketStateToRow({ scopeId, state: ticket });

    expect(
      assessmentWorkflowRowToState({
        ...workflowRow,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      }),
    ).toEqual({ scopeId, participantId, state: workflow });
    expect(
      feedbackTicketRowToState({
        ...ticketRow,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      }),
    ).toEqual({ scopeId, state: ticket });
  });

  it("round-trips an appeal only after independent-review metadata is persisted", () => {
    const decided = transitionAppeal(
      transitionAppeal(
        createAppeal({
          appealId: "88888888-8888-4888-8888-888888888888",
          participantId,
          attemptId: "66666666-6666-4666-8666-666666666666",
          itemId: "99999999-9999-4999-8999-999999999999",
          justification: "Solicito revisão da decisão apresentada.",
          createdAt: now,
        }),
        { type: "ATRIBUIR_REVISOR", reviewerId },
      ),
      { type: "DECIDIR", decision: "MANTER_RESULTADO" },
    );
    const row = appealStateToRow({ scopeId, state: decided });

    expect(row).toMatchObject({ reviewerId, decision: "MANTER_RESULTADO" });
    expect(
      appealRowToState({
        ...row,
        createdAt: new Date(now),
        dueAt: new Date("2026-08-19T12:00:00.000Z"),
        updatedAt: new Date(now),
      }),
    ).toEqual({ scopeId, state: decided });
  });

  it("executes transactional create, optimistic update, read and conflict paths", async () => {
    const assignmentId = "44444444-4444-4444-8444-444444444444";
    const resultId = "55555555-5555-4555-8555-555555555555";
    const attemptId = "66666666-6666-4666-8666-666666666666";
    const ticketId = "77777777-7777-4777-8777-777777777777";
    const appealId = "88888888-8888-4888-8888-888888888888";
    const itemId = "99999999-9999-4999-8999-999999999999";
    const context = { participantId, scopeId };
    const initialAssignment = createLearningAssignment({
      assignmentId,
      participantId,
      moduleId: "M03",
      availableAt: now,
    });
    const assigned = transitionLearningAssignment(initialAssignment, {
      type: "ATRIBUIR",
    });
    const initialWorkflow = createAssessmentWorkflowResult({
      resultId,
      attemptId,
      ruleVersion: "summative-v1",
    });
    const availableWorkflow = transitionAssessmentWorkflowResult(
      initialWorkflow,
      { type: "DISPONIBILIZAR" },
    );
    const initialTicket = createFeedbackTicket({
      ticketId,
      participantId,
      type: "CONTESTACAO",
      description: "Solicitação sintética de revisão.",
      createdAt: now,
    });
    const triagedTicket = transitionFeedbackTicket(initialTicket, {
      type: "TRIAR",
    });
    const initialAppeal = createAppeal({
      appealId,
      participantId,
      attemptId,
      itemId,
      justification: "Solicito revisão do item sintético.",
      createdAt: now,
    });
    const assignedAppeal = transitionAppeal(initialAppeal, {
      type: "ATRIBUIR_REVISOR",
      reviewerId,
    });

    const fakeDatabase = createFakeDatabase(
      [
        [assignmentRow(assignmentId, "NAO_ATRIBUIDO", 0)],
        [assignmentRow(assignmentId, "ATRIBUIDO", 1)],
        [workflowRow(resultId, "RESULTADO_EM_PROCESSAMENTO", 0)],
        [workflowRow(resultId, "RESULTADO_DISPONIVEL", 1)],
        [ticketRow(ticketId, "NOVO", 0)],
        [ticketRow(ticketId, "TRIADO", 1)],
        [appealRow(appealId, "ABERTA", 0, null, null)],
        [appealRow(appealId, "EM_REVISAO", 1, reviewerId, null)],
        [assignmentRow(assignmentId, "ATRIBUIDO", 1)],
        [workflowRow(resultId, "RESULTADO_DISPONIVEL", 1)],
        [ticketRow(ticketId, "TRIADO", 1)],
        [appealRow(appealId, "EM_REVISAO", 1, reviewerId, null)],
        [],
      ],
      [
        [{ id: assignmentId }],
        [{ id: assignmentId }],
        [{ id: resultId }],
        [{ id: resultId }],
        [{ id: ticketId }],
        [{ id: ticketId }],
        [{ id: appealId }],
        [{ id: appealId }],
        [],
      ],
    );
    const repository = createLearningStateRepository(fakeDatabase);

    await expect(
      repository.saveLearningAssignment(context, initialAssignment),
    ).resolves.toMatchObject({ state: initialAssignment });
    await expect(
      repository.saveLearningAssignment(context, assigned),
    ).resolves.toMatchObject({ state: assigned });
    await expect(
      repository.saveAssessmentWorkflow(context, initialWorkflow),
    ).resolves.toMatchObject({ state: initialWorkflow });
    await expect(
      repository.saveAssessmentWorkflow(context, availableWorkflow),
    ).resolves.toMatchObject({ state: availableWorkflow });
    await expect(
      repository.saveFeedbackTicket(context, initialTicket),
    ).resolves.toMatchObject({ state: initialTicket });
    await expect(
      repository.saveFeedbackTicket(context, triagedTicket),
    ).resolves.toMatchObject({ state: triagedTicket });
    await expect(
      repository.saveAppeal(context, initialAppeal),
    ).resolves.toMatchObject({ state: initialAppeal });
    await expect(
      repository.saveAppeal(context, assignedAppeal),
    ).resolves.toMatchObject({ state: assignedAppeal });

    await expect(
      repository.findLearningAssignment(context, assignmentId),
    ).resolves.toMatchObject({ state: assigned });
    await expect(
      repository.findAssessmentWorkflow(context, resultId),
    ).resolves.toMatchObject({ state: availableWorkflow });
    await expect(
      repository.findFeedbackTicket(context, ticketId),
    ).resolves.toMatchObject({
      state: triagedTicket,
    });
    await expect(
      repository.findAppeal(context, appealId),
    ).resolves.toMatchObject({
      state: assignedAppeal,
    });
    await expect(
      repository.findLearningAssignment(
        context,
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      ),
    ).resolves.toBeNull();
    await expect(
      repository.saveLearningAssignment(context, assigned),
    ).rejects.toBeInstanceOf(LearningStatePersistenceConflictError);
  });

  it("surfaces insert, optimistic-update and read persistence conflicts", async () => {
    const context = { participantId, scopeId };
    const workflow = createAssessmentWorkflowResult({
      resultId: "55555555-5555-4555-8555-555555555555",
      attemptId: "66666666-6666-4666-8666-666666666666",
      ruleVersion: "summative-v1",
    });
    const workflowUpdate = transitionAssessmentWorkflowResult(workflow, {
      type: "DISPONIBILIZAR",
    });
    const ticket = createFeedbackTicket({
      ticketId: "77777777-7777-4777-8777-777777777777",
      participantId,
      type: "CONTESTACAO",
      description: "Solicitação sintética de revisão.",
      createdAt: now,
    });
    const ticketUpdate = transitionFeedbackTicket(ticket, { type: "TRIAR" });
    const appeal = createAppeal({
      appealId: "88888888-8888-4888-8888-888888888888",
      participantId,
      attemptId: "66666666-6666-4666-8666-666666666666",
      itemId: "99999999-9999-4999-8999-999999999999",
      justification: "Solicito revisão do item sintético.",
      createdAt: now,
    });
    const appealUpdate = transitionAppeal(appeal, {
      type: "ATRIBUIR_REVISOR",
      reviewerId,
    });

    await expect(
      createLearningStateRepository(
        createFakeDatabase([], [[]]),
      ).saveAssessmentWorkflow(context, workflow),
    ).rejects.toBeInstanceOf(LearningStatePersistenceConflictError);
    await expect(
      createLearningStateRepository(
        createFakeDatabase([], [[]]),
      ).saveFeedbackTicket(context, ticket),
    ).rejects.toBeInstanceOf(LearningStatePersistenceConflictError);
    await expect(
      createLearningStateRepository(createFakeDatabase([], [[]])).saveAppeal(
        context,
        appeal,
      ),
    ).rejects.toBeInstanceOf(LearningStatePersistenceConflictError);

    await expect(
      createLearningStateRepository(
        createFakeDatabase([], [[]]),
      ).saveAssessmentWorkflow(context, workflowUpdate),
    ).rejects.toBeInstanceOf(LearningStatePersistenceConflictError);
    await expect(
      createLearningStateRepository(
        createFakeDatabase([], [[]]),
      ).saveFeedbackTicket(context, ticketUpdate),
    ).rejects.toBeInstanceOf(LearningStatePersistenceConflictError);
    await expect(
      createLearningStateRepository(createFakeDatabase([], [[]])).saveAppeal(
        context,
        appealUpdate,
      ),
    ).rejects.toBeInstanceOf(LearningStatePersistenceConflictError);

    await expect(
      createLearningStateRepository(
        createFakeDatabase([[]], [[{ id: workflow.resultId }]]),
      ).saveAssessmentWorkflow(context, workflow),
    ).rejects.toBeInstanceOf(LearningStatePersistenceConflictError);
    await expect(
      createLearningStateRepository(
        createFakeDatabase([[]], [[{ id: ticket.ticketId }]]),
      ).saveFeedbackTicket(context, ticket),
    ).rejects.toBeInstanceOf(LearningStatePersistenceConflictError);
    await expect(
      createLearningStateRepository(
        createFakeDatabase([[]], [[{ id: appeal.appealId }]]),
      ).saveAppeal(context, appeal),
    ).rejects.toBeInstanceOf(LearningStatePersistenceConflictError);
  });
});
