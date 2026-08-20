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
  assessmentWorkflowRowToState,
  assessmentWorkflowStateToRow,
  createLearningStateRepository,
  feedbackTicketRowToState,
  feedbackTicketStateToRow,
  LearningStateMappingError,
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
  const executions: unknown[] = [];
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
    execute: async (...args: readonly unknown[]) => {
      executions.push(args);
      return [] as const;
    },
    insert: () => createBuilder(),
    update: () => createBuilder(),
    select: () => createSelectBuilder(),
  };
  const transaction = (action: (tx: FakeTransaction) => Promise<unknown>) =>
    action(tx);
  return {
    transaction,
    executions,
  } as unknown as Parameters<typeof createLearningStateRepository>[0] & {
    readonly executions: readonly unknown[];
  };
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
    pauseReason: null,
    resumeAt: null,
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
    priority: "NORMAL",
    assigneeId: null,
    response: null,
    responseAt: null,
    responseBy: null,
    history:
      status === "NOVO"
        ? [{ status: "NOVO", changedAt: now }]
        : [
            { status: "NOVO", changedAt: now },
            { status: status as "TRIADO", changedAt: now },
          ],
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
      pauseReason: null,
      resumeAt: null,
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

  it("round-trips pause accommodation context without collapsing it to status", () => {
    const initial = createLearningAssignment({
      assignmentId: "55555555-5555-4555-8555-555555555555",
      participantId,
      moduleId: "M03",
      availableAt: now,
    });
    const paused = transitionLearningAssignment(
      transitionLearningAssignment(initial, { type: "ATRIBUIR" }),
      {
        type: "PAUSAR",
        reason: "ACOMODACAO",
        resumeAt: "2026-08-12T12:00:00.000Z",
      },
    );
    const row = learningAssignmentStateToRow({ scopeId, state: paused });

    expect(row).toMatchObject({
      status: "PAUSADO",
      pausedFrom: "ATRIBUIDO",
      pauseReason: "ACOMODACAO",
      resumeAt: new Date("2026-08-12T12:00:00.000Z"),
    });
    expect(
      learningAssignmentRowToState({
        ...row,
        availableAt: new Date(row.availableAt),
        createdAt: new Date(now),
        updatedAt: new Date(now),
      }),
    ).toEqual({ scopeId, state: paused });
  });

  it("characterizes the complete immutable assignment row projection", () => {
    const initial = createLearningAssignment({
      assignmentId: "66666666-6666-4666-8666-666666666666",
      participantId,
      moduleId: "M03",
      availableAt: now,
    });
    const paused = transitionLearningAssignment(
      transitionLearningAssignment(initial, { type: "ATRIBUIR" }),
      {
        type: "PAUSAR",
        reason: "ACOMODACAO",
        resumeAt: "2026-08-12T12:00:00.000Z",
      },
    );
    const scoped = { scopeId, state: paused } as const;
    const row = learningAssignmentStateToRow(scoped);

    expect(row).toEqual({
      id: "66666666-6666-4666-8666-666666666666",
      participantId,
      scopeId,
      moduleId: "M03",
      availableAt: new Date(now),
      status: "PAUSADO",
      version: 2,
      blockReason: null,
      pausedFrom: "ATRIBUIDO",
      pauseReason: "ACOMODACAO",
      resumeAt: new Date("2026-08-12T12:00:00.000Z"),
    });
    expect(Object.isFrozen(row)).toBe(true);
    expect(scoped).toEqual({ scopeId, state: paused });
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
        pauseReason: null,
        resumeAt: null,
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

  it("reads feedback through participant and staff RLS contexts with allowlisted filters", async () => {
    const ticketId = "77777777-7777-4777-8777-777777777777";
    const fakeDatabase = createFakeDatabase(
      [[ticketRow(ticketId, "TRIADO", 1)], [ticketRow(ticketId, "TRIADO", 1)]],
      [],
    );
    const repository = createLearningStateRepository(fakeDatabase);

    await expect(
      repository.listFeedbackTickets({
        audience: "PARTICIPANT",
        participantId,
        scopeId,
        status: "TRIADO",
        priority: "NORMAL",
      }),
    ).resolves.toMatchObject([
      { scopeId, state: { ticketId, participantId, status: "TRIADO" } },
    ]);
    await expect(
      repository.listFeedbackTickets({ audience: "STAFF", scopeId }),
    ).resolves.toMatchObject([
      { scopeId, state: { ticketId, participantId, status: "TRIADO" } },
    ]);
    expect(fakeDatabase.executions).toHaveLength(2);
  });

  it("fails closed on invalid assignment, feedback and appeal transition metadata", () => {
    const assignment = createLearningAssignment({
      assignmentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      participantId,
      moduleId: "M03",
      availableAt: now,
    });
    const scopedAssignment = { scopeId, state: assignment };
    const expectMappingError = (operation: () => unknown) => {
      expect(operation).toThrow(LearningStateMappingError);
    };

    expectMappingError(() =>
      learningAssignmentStateToRow({
        scopeId,
        state: { ...assignment, assignmentId: " " } as never,
      }),
    );
    expectMappingError(() =>
      learningAssignmentStateToRow({
        scopeId,
        state: { ...assignment, version: -1 } as never,
      }),
    );
    expectMappingError(() =>
      learningAssignmentStateToRow({
        scopeId,
        state: { ...assignment, availableAt: "invalid" } as never,
      }),
    );
    expectMappingError(() =>
      learningAssignmentStateToRow({
        scopeId,
        state: { ...assignment, status: "UNKNOWN" } as never,
      }),
    );
    expectMappingError(() =>
      learningAssignmentStateToRow({
        scopeId,
        state: { ...assignment, status: "BLOQUEADO", version: 1 } as never,
      }),
    );
    expectMappingError(() =>
      learningAssignmentStateToRow({
        scopeId,
        state: { ...assignment, blockReason: "PRE_REQUISITO" } as never,
      }),
    );
    expectMappingError(() =>
      learningAssignmentStateToRow({
        scopeId,
        state: { ...assignment, status: "PAUSADO", version: 1 } as never,
      }),
    );
    expectMappingError(() =>
      learningAssignmentStateToRow({
        scopeId,
        state: {
          ...assignment,
          status: "PAUSADO",
          version: 1,
          pausedFrom: "ATRIBUIDO",
        } as never,
      }),
    );
    expectMappingError(() =>
      learningAssignmentStateToRow({
        scopeId,
        state: { ...assignment, pauseReason: "ACOMODACAO" } as never,
      }),
    );
    expectMappingError(() =>
      learningAssignmentStateToRow({
        scopeId,
        state: { ...assignment, moduleId: "M99" } as never,
      }),
    );
    expectMappingError(() =>
      learningAssignmentStateToRow({
        scopeId,
        state: { ...assignment, pausedFrom: "ATRIBUIDO" } as never,
      }),
    );

    expectMappingError(() =>
      learningAssignmentRowToState({
        ...assignmentRow("assignment-1", "ATRIBUIDO", 1),
        blockReason: "PRE_REQUISITO",
      } as never),
    );
    expectMappingError(() =>
      learningAssignmentRowToState({
        ...assignmentRow("assignment-1", "PAUSADO", 1),
        pausedFrom: null,
      } as never),
    );
    expectMappingError(() =>
      learningAssignmentRowToState({
        ...assignmentRow("assignment-1", "ATRIBUIDO", 1),
        pausedFrom: "ATRIBUIDO",
      } as never),
    );
    expectMappingError(() =>
      learningAssignmentRowToState({
        ...assignmentRow("assignment-1", "ATRIBUIDO", 1),
        pauseReason: "ACOMODACAO",
      } as never),
    );
    expectMappingError(() =>
      learningAssignmentRowToState({
        ...assignmentRow("assignment-1", "PAUSADO", 1),
        pausedFrom: "ATRIBUIDO",
        pauseReason: null,
      } as never),
    );
    expect(scopedAssignment.scopeId).toBe(scopeId);

    const ticket = createFeedbackTicket({
      ticketId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      participantId,
      type: "BUG_TECNICO",
      description: "Falha sintética controlada.",
      createdAt: now,
    });
    expectMappingError(() =>
      feedbackTicketStateToRow({
        scopeId,
        state: {
          ...ticket,
          technicalContext: { logicalPage: "dashboard", appVersion: "web-1" },
        } as never,
      }),
    );
    expectMappingError(() =>
      feedbackTicketStateToRow({
        scopeId,
        state: {
          ...ticket,
          response: { message: "patientId: synthetic", respondedAt: now },
        } as never,
      }),
    );
    expectMappingError(() =>
      feedbackTicketStateToRow({
        scopeId,
        state: {
          ...ticket,
          technicalContext: { logicalPage: "/feedback", appVersion: " " },
        } as never,
      }),
    );
    expectMappingError(() =>
      feedbackTicketStateToRow({
        scopeId,
        state: {
          ...ticket,
          technicalContext: {
            logicalPage: "/feedback",
            appVersion: "web-1",
            occurredAt: "invalid",
          },
        } as never,
      }),
    );
    expectMappingError(() =>
      feedbackTicketStateToRow({
        scopeId,
        state: {
          ...ticket,
          technicalContext: {
            logicalPage: "/feedback",
            appVersion: "web-1",
            errorCode: "invalid code",
          },
        } as never,
      }),
    );
    expectMappingError(() =>
      feedbackTicketStateToRow({
        scopeId,
        state: { ...ticket, description: "patientId: synthetic" } as never,
      }),
    );
    expectMappingError(() =>
      feedbackTicketStateToRow({
        scopeId,
        state: {
          ...ticket,
          response: { message: "<b>unsafe</b>", respondedAt: now },
        } as never,
      }),
    );
    expectMappingError(() =>
      feedbackTicketStateToRow({
        scopeId,
        state: {
          ...ticket,
          response: { message: "Resposta sintética.", respondedAt: "invalid" },
        } as never,
      }),
    );
    expectMappingError(() =>
      feedbackTicketStateToRow({
        scopeId,
        state: {
          ...ticket,
          response: {
            message: "Resposta sintética.",
            respondedAt: now,
            respondedBy: " ",
          },
        } as never,
      }),
    );
    expectMappingError(() =>
      feedbackTicketStateToRow({
        scopeId,
        state: { ...ticket, history: [] } as never,
      }),
    );
    expectMappingError(() =>
      feedbackTicketStateToRow({
        scopeId,
        state: {
          ...ticket,
          history: Array.from({ length: 101 }, () => ({
            status: "NOVO",
            changedAt: now,
          })),
        } as never,
      }),
    );

    const ticketRowBase = ticketRow("ticket-1", "NOVO", 0);
    expectMappingError(() =>
      feedbackTicketRowToState({
        ...ticketRowBase,
        logicalPage: "/feedback",
        appVersion: null,
        occurredAt: null,
        errorCode: null,
      } as never),
    );
    expectMappingError(() =>
      feedbackTicketRowToState({
        ...ticketRowBase,
        history: Array.from({ length: 101 }, () => ({
          status: "NOVO",
          changedAt: now,
        })),
      } as never),
    );
    expectMappingError(() =>
      feedbackTicketRowToState({ ...ticketRowBase, history: [null] } as never),
    );
    expectMappingError(() =>
      feedbackTicketRowToState({
        ...ticketRowBase,
        response: "Resposta",
        responseAt: null,
      } as never),
    );
    expectMappingError(() =>
      feedbackTicketRowToState({
        ...ticketRowBase,
        response: " ",
        responseAt: new Date(now),
      } as never),
    );
    expect(
      feedbackTicketRowToState({
        ...ticketRowBase,
        assigneeId: reviewerId,
        response: "Resposta sintética.",
        responseAt: new Date(now),
        responseBy: reviewerId,
        history: [{ status: "NOVO", changedAt: now, actorId: reviewerId }],
      } as never),
    ).toMatchObject({
      state: {
        assigneeId: reviewerId,
        response: { respondedBy: reviewerId },
        history: [{ actorId: reviewerId }],
      },
    });
    expectMappingError(() =>
      feedbackTicketRowToState({
        ...ticketRowBase,
        createdAt: new Date("invalid"),
      } as never),
    );

    expectMappingError(() =>
      assessmentWorkflowStateToRow({
        scopeId,
        participantId: " ",
        state: {
          resultId: "workflow-1",
          attemptId: "attempt-1",
          ruleVersion: "v1",
          version: 0,
          status: "RESULTADO_EM_PROCESSAMENTO",
        },
      } as never),
    );

    const appeal = createAppeal({
      appealId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      participantId,
      attemptId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      itemId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      justification: "Justificativa sintética.",
      createdAt: now,
    });
    expectMappingError(() =>
      appealStateToRow({
        scopeId,
        state: { ...appeal, dueAt: "2026-08-01T12:00:00.000Z" } as never,
      }),
    );
    expectMappingError(() =>
      appealStateToRow({
        scopeId,
        state: { ...appeal, reviewerId: participantId } as never,
      }),
    );
    expectMappingError(() =>
      appealStateToRow({
        scopeId,
        state: { ...appeal, status: "EM_REVISAO" } as never,
      }),
    );
    expectMappingError(() =>
      appealStateToRow({
        scopeId,
        state: { ...appeal, status: "DECIDIDA", reviewerId } as never,
      }),
    );
    expectMappingError(() =>
      appealRowToState({
        ...appealRow("appeal-1", "EM_REVISAO", 1, participantId, null),
      } as never),
    );
    expectMappingError(() =>
      appealRowToState({
        ...appealRow("appeal-1", "EM_REVISAO", 1, null, null),
      } as never),
    );
    expectMappingError(() =>
      appealRowToState({
        ...appealRow("appeal-1", "DECIDIDA", 1, reviewerId, null),
      } as never),
    );
    expectMappingError(() =>
      appealRowToState({
        ...appealRow("appeal-1", "ABERTA", 1, null, null),
        dueAt: new Date("2026-08-01T12:00:00.000Z"),
      } as never),
    );
  });
});
