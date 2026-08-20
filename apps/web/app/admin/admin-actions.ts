"use client";

import type { FormEvent } from "react";
import {
  apiBase,
  isAdminDashboard,
  isAdminOperationsDashboard,
  isInvitation,
  isManagedAccount,
  isManagedAccountPage,
  isOperations,
  isRecord,
} from "./admin-model";
import type {
  AdminDashboard,
  AssignmentOperation,
  ManagedAccount,
} from "./admin-model";
import type { AdminPageState } from "./admin-state";

type AdminTarget = Readonly<{
  readonly participant: AdminDashboard["participants"][number];
  readonly scopeId: string;
}>;

export type AdminActions = Readonly<{
  readonly load: () => Promise<void>;
  readonly updateManagedAccountStatus: (
    account: ManagedAccount,
    status: ManagedAccount["accountStatus"],
  ) => Promise<void>;
  readonly revokeManagedAccountSessions: (
    account: ManagedAccount,
  ) => Promise<void>;
  readonly handleCreateInvitation: (
    event: FormEvent<HTMLFormElement>,
  ) => Promise<void>;
  readonly handleAssignModule: (
    event: FormEvent<HTMLFormElement>,
  ) => Promise<void>;
}>;

async function fetchPayload(
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const response = await fetch(apiBase + path, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });
  return { response, payload: await response.json().catch(() => null) };
}

async function loadOperations(context: AdminPageState): Promise<boolean> {
  try {
    const result = await fetchPayload("/api/v1/internal/dashboard");
    if (!(result instanceof Object) || !isRecord(result))
      throw new Error("operations unavailable");
    const { response, payload } = result as {
      response: Response;
      payload: unknown;
    };
    if (
      !response.ok ||
      !isRecord(payload) ||
      payload.success !== true ||
      !isOperations(payload.data)
    )
      throw new Error("operations unavailable");
    context.setOperations(payload.data);
    return true;
  } catch {
    context.setError("Área disponível apenas para o superadmin.");
    return false;
  }
}

async function loadTrainingDashboard(context: AdminPageState): Promise<void> {
  try {
    const result = await fetchPayload("/api/v1/internal/admin/dashboard");
    if (!isRecord(result)) throw new Error("dashboard unavailable");
    const { response, payload } = result as {
      response: Response;
      payload: unknown;
    };
    if (
      !response.ok ||
      !isRecord(payload) ||
      payload.success !== true ||
      !isAdminDashboard(payload.data)
    )
      throw new Error("dashboard unavailable");
    context.setAdminDashboard(payload.data);
    context.setSelectedParticipantId(
      payload.data.participants[0]?.participantId ?? "",
    );
    context.setSelectedModuleId(
      payload.data.trainingCatalog[0]?.moduleId ?? "",
    );
  } catch {
    context.setError(
      "Não foi possível carregar o acompanhamento dos treinamentos.",
    );
  }
}

async function loadAdminOperations(context: AdminPageState): Promise<void> {
  try {
    const result = await fetchPayload("/api/v1/internal/admin/operations");
    if (!isRecord(result)) throw new Error("admin operations unavailable");
    const { response, payload } = result as {
      response: Response;
      payload: unknown;
    };
    if (
      !response.ok ||
      !isRecord(payload) ||
      payload.success !== true ||
      !isAdminOperationsDashboard(payload.data)
    )
      throw new Error("admin operations unavailable");
    context.setAdminOperations(payload.data);
  } catch {
    context.setAdminOperations(null);
    context.setError("Não foi possível carregar os controles operacionais.");
  }
}

async function loadManagedAccounts(context: AdminPageState): Promise<void> {
  try {
    const result = await fetchPayload("/api/v1/internal/accounts?limit=200");
    if (!isRecord(result)) return;
    const { response, payload } = result as {
      response: Response;
      payload: unknown;
    };
    if (
      response.ok &&
      isRecord(payload) &&
      payload.success === true &&
      isManagedAccountPage(payload.data)
    )
      context.setManagedAccounts([...payload.data.accounts]);
  } catch {
    // Optional account data must not hide the training dashboard.
  }
}

async function loadAdminPage(context: AdminPageState): Promise<void> {
  context.setError(null);
  if (!(await loadOperations(context))) return;
  await loadTrainingDashboard(context);
  await loadAdminOperations(context);
  await loadManagedAccounts(context);
}

async function updateManagedAccount(
  context: AdminPageState,
  account: ManagedAccount,
  status: ManagedAccount["accountStatus"],
): Promise<void> {
  context.setBusy(true);
  context.setError(null);
  context.setNotice(null);
  try {
    const result = await fetchPayload(
      `/api/v1/internal/accounts/${encodeURIComponent(account.accountId)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedVersion: account.version, status }),
      },
    );
    if (!isRecord(result)) throw new Error("account update unavailable");
    const { response, payload } = result as {
      response: Response;
      payload: unknown;
    };
    if (
      !response.ok ||
      !isRecord(payload) ||
      payload.success !== true ||
      !isManagedAccount(payload.data)
    )
      throw new Error("account update unavailable");
    const updatedAccount = payload.data;
    context.setManagedAccounts((current) =>
      current.map((candidate) =>
        candidate.accountId === updatedAccount.accountId
          ? updatedAccount
          : candidate,
      ),
    );
    context.setNotice("Status da conta atualizado.");
  } catch {
    context.setError("Não foi possível atualizar o status da conta.");
  } finally {
    context.setBusy(false);
  }
}

async function revokeAccountSessions(
  context: AdminPageState,
  account: ManagedAccount,
): Promise<void> {
  context.setBusy(true);
  context.setError(null);
  context.setNotice(null);
  try {
    const result = await fetchPayload(
      `/api/v1/internal/accounts/${encodeURIComponent(account.accountId)}/sessions/revoke`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      },
    );
    if (!isRecord(result)) throw new Error("session revoke unavailable");
    const { response, payload } = result as {
      response: Response;
      payload: unknown;
    };
    if (
      !response.ok ||
      !isRecord(payload) ||
      payload.success !== true ||
      !isRecord(payload.data) ||
      typeof payload.data.revokedCount !== "number"
    )
      throw new Error("session revoke unavailable");
    context.setNotice(
      `${payload.data.revokedCount} sessão(ões) revogada(s) para ${account.professionalEmail}.`,
    );
  } catch {
    context.setError("Não foi possível revogar as sessões da conta.");
  } finally {
    context.setBusy(false);
  }
}

async function createInvitation(
  context: AdminPageState,
  event: FormEvent<HTMLFormElement>,
): Promise<void> {
  event.preventDefault();
  context.setBusy(true);
  context.setError(null);
  context.setNotice(null);
  context.setInvitation(null);
  try {
    const result = await fetchPayload("/api/v1/internal/invitations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        professionalEmail: context.email,
        invitedRoles: [context.role],
        invitedScopes: [],
        expiresInSeconds: 604_800,
      }),
    });
    if (!isRecord(result)) throw new Error("invitation unavailable");
    const { response, payload } = result as {
      response: Response;
      payload: unknown;
    };
    if (
      !response.ok ||
      !isRecord(payload) ||
      payload.success !== true ||
      !isInvitation(payload.data)
    )
      throw new Error("invitation unavailable");
    context.setInvitation(payload.data);
    context.setEmail("");
    context.setNotice(
      "Acesso criado. Envie o link de primeiro acesso ao usuário.",
    );
  } catch {
    context.setError(
      "Não foi possível criar o acesso. Verifique a permissão e o e-mail.",
    );
  } finally {
    context.setBusy(false);
  }
}

function selectedAdminTarget(context: AdminPageState): AdminTarget | null {
  const participant = context.adminDashboard?.participants.find(
    ({ participantId }) => participantId === context.selectedParticipantId,
  );
  const scopeId = participant?.scopeIds[0];
  return participant === undefined ||
    scopeId === undefined ||
    context.selectedModuleId === ""
    ? null
    : { participant, scopeId };
}

async function createAssignment(
  context: AdminPageState,
  target: AdminTarget,
): Promise<AssignmentOperation> {
  const assignmentId = globalThis.crypto.randomUUID();
  const availableAt = new Date().toISOString();
  const result = await fetchPayload("/api/v1/internal/learning-assignments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      assignmentId,
      participantId: target.participant.participantId,
      scopeId: target.scopeId,
      moduleId: context.selectedModuleId,
      availableAt,
    }),
  });
  if (!isRecord(result)) throw new Error("assignment creation unavailable");
  const { response, payload } = result as {
    response: Response;
    payload: unknown;
  };
  if (
    !response.ok ||
    !isRecord(payload) ||
    payload.success !== true ||
    !isRecord(payload.data) ||
    typeof payload.data.version !== "number"
  )
    throw new Error("assignment creation unavailable");
  return Object.freeze({
    assignmentId,
    participantId: target.participant.participantId,
    scopeId: target.scopeId,
    moduleId: context.selectedModuleId,
    availableAt,
    version: payload.data.version,
    nextEvent: "ATRIBUIR" as const,
  });
}

async function transitionAssignment(
  current: AssignmentOperation,
  version: number,
  event: AssignmentOperation["nextEvent"],
  now?: string,
): Promise<number> {
  const result = await fetchPayload(
    `/api/v1/internal/learning-assignments/${encodeURIComponent(current.assignmentId)}/transition`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        assignmentId: current.assignmentId,
        participantId: current.participantId,
        scopeId: current.scopeId,
        version,
        event,
        ...(now === undefined ? {} : { now }),
      }),
    },
  );
  if (!isRecord(result)) throw new Error("assignment transition unavailable");
  const { response, payload } = result as {
    response: Response;
    payload: unknown;
  };
  if (
    !response.ok ||
    !isRecord(payload) ||
    payload.success !== true ||
    !isRecord(payload.data) ||
    typeof payload.data.version !== "number"
  )
    throw new Error("assignment transition unavailable");
  return payload.data.version;
}

async function assignModule(
  context: AdminPageState,
  actions: AdminActions,
  event: FormEvent<HTMLFormElement>,
): Promise<void> {
  event.preventDefault();
  const target = selectedAdminTarget(context);
  if (target === null) {
    context.setError("Selecione um veterinário e um módulo para continuar.");
    return;
  }
  context.setBusy(true);
  context.setError(null);
  context.setNotice(null);
  try {
    let operation = context.assignmentOperation;
    if (
      operation === null ||
      operation.participantId !== target.participant.participantId ||
      operation.scopeId !== target.scopeId ||
      operation.moduleId !== context.selectedModuleId
    )
      operation = await createAssignment(context, target);
    context.setAssignmentOperation(operation);
    if (operation.nextEvent === "ATRIBUIR") {
      const version = await transitionAssignment(
        operation,
        operation.version,
        "ATRIBUIR",
      );
      operation = Object.freeze({
        ...operation,
        version,
        nextEvent: "DISPONIBILIZAR" as const,
      });
      context.setAssignmentOperation(operation);
    }
    await transitionAssignment(
      operation,
      operation.version,
      "DISPONIBILIZAR",
      operation.availableAt,
    );
    context.setAssignmentOperation(null);
    await actions.load();
    context.setNotice("Treinamento atribuído e disponibilizado.");
  } catch {
    context.setError("Não foi possível atribuir o treinamento ao veterinário.");
  } finally {
    context.setBusy(false);
  }
}

export function createAdminActions(context: AdminPageState): AdminActions {
  const actions: AdminActions = {
    load: () => loadAdminPage(context),
    updateManagedAccountStatus: (
      account: ManagedAccount,
      status: ManagedAccount["accountStatus"],
    ) => updateManagedAccount(context, account, status),
    revokeManagedAccountSessions: (account: ManagedAccount) =>
      revokeAccountSessions(context, account),
    handleCreateInvitation: (event: FormEvent<HTMLFormElement>) =>
      createInvitation(context, event),
    handleAssignModule: (event: FormEvent<HTMLFormElement>) =>
      assignModule(context, actions, event),
  } satisfies AdminActions;
  return actions;
}
