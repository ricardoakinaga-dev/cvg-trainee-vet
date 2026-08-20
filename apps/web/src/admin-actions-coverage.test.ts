import { describe, expect, it, vi } from "vitest";

import { createAdminActions } from "../app/admin/admin-actions.js";
import type { AdminPageState } from "../app/admin/admin-state.js";

const participantId = "11111111-1111-4111-8111-111111111111";
const accountId = "22222222-2222-4222-8222-222222222222";
const invitationFixtureToken = [
  "fixture",
  "invitation",
  "value",
  "1234567890",
].join("-");

const dashboard = {
  curriculumId: "CVG-CURRICULUM-24M",
  curriculumVersion: "3.0.0",
  summary: {
    participantsTotal: 1,
    activeParticipants: 1,
    invitedParticipants: 0,
    participantsInProgress: 1,
    averageProgressPercent: 10,
    assignedModules: 1,
    completedModules: 0,
  },
  participants: [
    {
      participantId,
      professionalEmail: "participant@example.test",
      accountStatus: "ACTIVE",
      scopeIds: ["scope-1"],
      assignedModules: 1,
      completedModules: 0,
      progressPercent: 10,
      activeModuleId: "M01",
      activeModuleTitle: "Módulo 1",
      nextAction: "INICIAR_ATIVIDADE",
    },
  ],
  trainingCatalog: Array.from({ length: 24 }, (_, index) => ({
    moduleId: `M${String(index + 1).padStart(2, "0")}`,
    month: index + 1,
    title: `Módulo ${index + 1}`,
    competence: "Raciocínio clínico digital seguro.",
    assignedParticipants: index === 0 ? 1 : 0,
    activeParticipants: index === 0 ? 1 : 0,
    completedParticipants: 0,
  })),
} as const;

const operations = {
  accounts: {
    invited: 0,
    active: 1,
    suspended: 0,
    deactivated: 0,
    inactiveOver14Days: 0,
  },
  corrections: { open: 0, overdue: 0, slaBreaches: 0 },
  remediation: { participants: 0, objectives: 0 },
  contentValidity: { valid: 24, dueForReview: 0, expired: 0, withdrawn: 0 },
  feedback: { open: 0, technicalFailures: 0 },
} as const;

const operationsDashboard = {
  dependencyStatus: "READY",
  dependencies: { postgres: "UP", qdrant: "DISABLED", ai: "DISABLED" },
  metrics: { requestsTotal: 1, errorsTotal: 0, p95DurationMs: 12 },
  evidence: {
    collector: "VERIFIED",
    retention: "NOT_CONFIGURED",
    traces: "NOT_EXECUTED",
    load: "NOT_EXECUTED",
    failover: "NOT_EXECUTED",
    replicas: "NOT_EXECUTED",
  },
} as const;

const adminOperations = { dashboard, operations } as const;

const account = {
  accountId,
  professionalEmail: "participant@example.test",
  accountStatus: "ACTIVE",
  roles: ["PARTICIPANT"],
  scopes: ["scope-1"],
  version: 1,
  createdAt: "2026-08-16T12:00:00.000Z",
  updatedAt: "2026-08-16T12:00:00.000Z",
} as const;

const accountPage = { accounts: [account], nextCursor: null } as const;

const invitation = {
  professionalEmail: "new@example.test",
  token: invitationFixtureToken,
  expiresAt: "2026-08-17T12:00:00.000Z",
} as const;

function response(payload: unknown, ok = true): Response {
  return { ok, json: async () => payload } as Response;
}

function event() {
  return { preventDefault: vi.fn() } as never;
}

function context(overrides: Partial<AdminPageState> = {}) {
  return {
    operations: null,
    adminDashboard: dashboard,
    adminOperations: null,
    managedAccounts: [account],
    selectedParticipantId: participantId,
    selectedModuleId: "M01",
    email: "new@example.test",
    role: "PARTICIPANT",
    invitation: null,
    assignmentOperation: null,
    busy: false,
    error: null,
    notice: null,
    setOperations: vi.fn(),
    setAdminDashboard: vi.fn(),
    setAdminOperations: vi.fn(),
    setManagedAccounts: vi.fn(),
    setSelectedParticipantId: vi.fn(),
    setSelectedModuleId: vi.fn(),
    setEmail: vi.fn(),
    setRole: vi.fn(),
    setInvitation: vi.fn(),
    setAssignmentOperation: vi.fn(),
    setBusy: vi.fn(),
    setError: vi.fn(),
    setNotice: vi.fn(),
    ...overrides,
  } as unknown as AdminPageState;
}

function loadResponses() {
  return [
    response({ success: true, data: operationsDashboard }),
    response({ success: true, data: dashboard }),
    response({ success: true, data: adminOperations }),
    response({ success: true, data: accountPage }),
  ];
}

describe("admin actions production coverage", () => {
  it("loads all bounded projections and stops when superadmin access fails", async () => {
    const state = context();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementationOnce(async () =>
          response({ success: true, data: operationsDashboard }),
        )
        .mockImplementationOnce(async () =>
          response({ success: true, data: dashboard }),
        )
        .mockImplementationOnce(async () =>
          response({ success: true, data: adminOperations }),
        )
        .mockImplementationOnce(async () =>
          response({ success: true, data: accountPage }),
        ),
    );
    await createAdminActions(state).load();
    expect(state.setOperations).toHaveBeenCalledWith(operationsDashboard);
    expect(state.setAdminDashboard).toHaveBeenCalledWith(dashboard);
    expect(state.setAdminOperations).toHaveBeenCalledWith(adminOperations);
    expect(state.setManagedAccounts).toHaveBeenCalledWith([account]);
    expect(state.setSelectedParticipantId).toHaveBeenCalledWith(participantId);
    expect(state.setSelectedModuleId).toHaveBeenCalledWith("M01");

    const deniedState = context();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ success: false }, false)),
    );
    await createAdminActions(deniedState).load();
    expect(deniedState.setError).toHaveBeenCalledWith(
      "Área disponível apenas para o superadmin.",
    );
  });

  it("keeps optional account loading bounded and reports dashboard failures", async () => {
    const trainingFailureState = context();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          response({ success: true, data: operationsDashboard }),
        )
        .mockResolvedValueOnce(response({ success: false }, false))
        .mockResolvedValueOnce(
          response({ success: true, data: adminOperations }),
        )
        .mockResolvedValueOnce(response({ success: false }, false)),
    );
    await createAdminActions(trainingFailureState).load();
    expect(trainingFailureState.setError).toHaveBeenCalledWith(
      "Não foi possível carregar o acompanhamento dos treinamentos.",
    );
    expect(trainingFailureState.setAdminOperations).toHaveBeenCalledWith(
      adminOperations,
    );
    expect(trainingFailureState.setManagedAccounts).not.toHaveBeenCalled();

    const optionalFailureState = context();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          response({ success: true, data: operationsDashboard }),
        )
        .mockResolvedValueOnce(response({ success: true, data: dashboard }))
        .mockResolvedValueOnce(response({ success: false }, false))
        .mockRejectedValueOnce(new Error("optional endpoint unavailable")),
    );
    await createAdminActions(optionalFailureState).load();
    expect(optionalFailureState.setAdminOperations).toHaveBeenCalledWith(null);
    expect(optionalFailureState.setError).toHaveBeenCalledWith(
      "Não foi possível carregar os controles operacionais.",
    );
  });

  it("updates accounts, revokes sessions and creates invitations", async () => {
    const state = context();
    const updated = {
      ...account,
      accountStatus: "SUSPENDED",
      version: 2,
    } as const;
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(response({ success: true, data: updated }))
        .mockResolvedValueOnce(
          response({ success: true, data: { revokedCount: 2 } }),
        )
        .mockResolvedValueOnce(response({ success: true, data: invitation })),
    );
    const actions = createAdminActions(state);
    await actions.updateManagedAccountStatus(account, "SUSPENDED");
    await actions.revokeManagedAccountSessions(account);
    await actions.handleCreateInvitation(event());
    expect(state.setManagedAccounts).toHaveBeenCalled();
    expect(state.setNotice).toHaveBeenCalledWith(
      "2 sessão(ões) revogada(s) para participant@example.test.",
    );
    expect(state.setInvitation).toHaveBeenCalledWith(invitation);
    expect(state.setEmail).toHaveBeenCalledWith("");

    const failureState = context();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(response({ success: false }, false))
        .mockResolvedValueOnce(response({ success: false }, false))
        .mockResolvedValueOnce(response({ success: false }, false)),
    );
    const failureActions = createAdminActions(failureState);
    await failureActions.updateManagedAccountStatus(account, "DEACTIVATED");
    await failureActions.revokeManagedAccountSessions(account);
    await failureActions.handleCreateInvitation(event());
    expect(failureState.setError).toHaveBeenCalledWith(
      "Não foi possível criar o acesso. Verifique a permissão e o e-mail.",
    );
  });

  it("validates assignment targets and completes create-transition-load", async () => {
    const missingTarget = context({ selectedParticipantId: "missing" });
    await createAdminActions(missingTarget).handleAssignModule(event());
    expect(missingTarget.setError).toHaveBeenCalledWith(
      "Selecione um veterinário e um módulo para continuar.",
    );

    const state = context();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          response({ success: true, data: { version: 1 } }),
        )
        .mockResolvedValueOnce(
          response({ success: true, data: { version: 2 } }),
        )
        .mockResolvedValueOnce(
          response({ success: true, data: { version: 3 } }),
        )
        .mockResolvedValueOnce(loadResponses()[0])
        .mockResolvedValueOnce(loadResponses()[1])
        .mockResolvedValueOnce(loadResponses()[2])
        .mockResolvedValueOnce(loadResponses()[3]),
    );
    await createAdminActions(state).handleAssignModule(event());
    expect(state.setAssignmentOperation).toHaveBeenCalledWith(null);
    expect(state.setNotice).toHaveBeenCalledWith(
      "Treinamento atribuído e disponibilizado.",
    );

    const existingOperation = {
      assignmentId: "assignment-1",
      participantId,
      scopeId: "scope-1",
      moduleId: "M01",
      availableAt: "2026-08-16T12:00:00.000Z",
      version: 4,
      nextEvent: "DISPONIBILIZAR",
    } as const;
    const existingState = context({ assignmentOperation: existingOperation });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          response({ success: true, data: { version: 5 } }),
        )
        .mockResolvedValueOnce(loadResponses()[0])
        .mockResolvedValueOnce(loadResponses()[1])
        .mockResolvedValueOnce(loadResponses()[2])
        .mockResolvedValueOnce(loadResponses()[3]),
    );
    await createAdminActions(existingState).handleAssignModule(event());
    expect(existingState.setNotice).toHaveBeenCalledWith(
      "Treinamento atribuído e disponibilizado.",
    );

    const failureState = context();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ success: false }, false)),
    );
    await createAdminActions(failureState).handleAssignModule(event());
    expect(failureState.setError).toHaveBeenCalledWith(
      "Não foi possível atribuir o treinamento ao veterinário.",
    );
  });
});
