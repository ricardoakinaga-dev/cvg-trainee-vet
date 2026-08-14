"use client";

import { useEffect, useState, type FormEvent } from "react";

type Operations = Readonly<{
  readonly dependencyStatus: string;
  readonly dependencies: Readonly<Record<string, string>>;
  readonly metrics: Readonly<{
    readonly requestsTotal: number;
    readonly errorsTotal: number;
    readonly p95DurationMs: number | null;
  }>;
  readonly evidence: Readonly<Record<string, string>>;
}>;

type AdminDashboardParticipant = Readonly<{
  readonly participantId: string;
  readonly professionalEmail: string;
  readonly accountStatus: "INVITED" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  readonly scopeIds: readonly string[];
  readonly assignedModules: number;
  readonly completedModules: number;
  readonly progressPercent: number;
  readonly activeModuleId?: string;
  readonly activeModuleTitle?: string;
  readonly nextAction: string;
}>;

type AdminDashboard = Readonly<{
  readonly curriculumId: string;
  readonly curriculumVersion: string;
  readonly summary: Readonly<{
    readonly participantsTotal: number;
    readonly activeParticipants: number;
    readonly invitedParticipants: number;
    readonly participantsInProgress: number;
    readonly averageProgressPercent: number;
    readonly assignedModules: number;
    readonly completedModules: number;
  }>;
  readonly participants: readonly AdminDashboardParticipant[];
  readonly trainingCatalog: readonly Readonly<{
    readonly moduleId: string;
    readonly month: number;
    readonly title: string;
    readonly competence: string;
    readonly assignedParticipants: number;
    readonly activeParticipants: number;
    readonly completedParticipants: number;
  }>[];
}>;

type AdminOperationsDashboard = Readonly<{
  readonly dashboard: AdminDashboard;
  readonly operations: Readonly<{
    readonly accounts: Readonly<{
      readonly invited: number;
      readonly active: number;
      readonly suspended: number;
      readonly deactivated: number;
      readonly inactiveOver14Days: number;
    }>;
    readonly corrections: Readonly<{
      readonly open: number;
      readonly overdue: number;
      readonly slaBreaches: number;
    }>;
    readonly remediation: Readonly<{
      readonly participants: number;
      readonly objectives: number;
    }>;
    readonly contentValidity: Readonly<{
      readonly valid: number;
      readonly dueForReview: number;
      readonly expired: number;
      readonly withdrawn: number;
    }>;
    readonly feedback: Readonly<{
      readonly open: number;
      readonly technicalFailures: number;
    }>;
  }>;
}>;

type InviteRole =
  "PARTICIPANT" | "MODERATOR" | "CLINICAL_APPROVER" | "AUDITOR" | "AUTHOR";

type Invitation = Readonly<{
  readonly professionalEmail: string;
  readonly token: string;
  readonly expiresAt: string;
}>;

type ManagedAccount = Readonly<{
  readonly accountId: string;
  readonly professionalEmail: string;
  readonly accountStatus: "INVITED" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  readonly roles: readonly string[];
  readonly scopes: readonly string[];
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}>;

type ManagedAccountPage = Readonly<{
  readonly accounts: readonly ManagedAccount[];
  readonly nextCursor: string | null;
}>;

type ApiRecord = Readonly<Record<string, unknown>>;
const apiBase = process.env.NEXT_PUBLIC_CVG_API_BASE_URL ?? "";
const invitationQueryParameter = "token";

const inviteRoleOptions: readonly Readonly<{
  readonly value: InviteRole;
  readonly label: string;
}>[] = [
  { value: "PARTICIPANT", label: "Participante — trilha de treinamento" },
  { value: "MODERATOR", label: "Operação — acompanhamento" },
  { value: "AUTHOR", label: "Autor — criação de conteúdo" },
  { value: "CLINICAL_APPROVER", label: "Revisor clínico" },
  { value: "AUDITOR", label: "Auditoria" },
];

function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isOperations(value: unknown): value is Operations {
  if (
    !isRecord(value) ||
    !isRecord(value.dependencies) ||
    !isRecord(value.metrics)
  ) {
    return false;
  }
  return (
    typeof value.dependencyStatus === "string" &&
    Object.values(value.dependencies).every(
      (item) => typeof item === "string",
    ) &&
    typeof value.metrics.requestsTotal === "number" &&
    typeof value.metrics.errorsTotal === "number" &&
    (value.metrics.p95DurationMs === null ||
      typeof value.metrics.p95DurationMs === "number") &&
    isRecord(value.evidence) &&
    Object.values(value.evidence).every((item) => typeof item === "string")
  );
}

function isAdminDashboard(value: unknown): value is AdminDashboard {
  if (!isRecord(value)) {
    return false;
  }
  const summary = value.summary;
  const participants = value.participants;
  const trainingCatalog = value.trainingCatalog;
  if (
    !isRecord(summary) ||
    !Array.isArray(participants) ||
    !Array.isArray(trainingCatalog)
  ) {
    return false;
  }
  const summaryFields = [
    "participantsTotal",
    "activeParticipants",
    "invitedParticipants",
    "participantsInProgress",
    "averageProgressPercent",
    "assignedModules",
    "completedModules",
  ] as const;
  return (
    typeof value.curriculumId === "string" &&
    typeof value.curriculumVersion === "string" &&
    summaryFields.every((field) => typeof summary[field] === "number") &&
    participants.every(
      (participant) =>
        isRecord(participant) &&
        typeof participant.participantId === "string" &&
        typeof participant.professionalEmail === "string" &&
        typeof participant.accountStatus === "string" &&
        Array.isArray(participant.scopeIds) &&
        participant.scopeIds.every((scope) => typeof scope === "string") &&
        typeof participant.assignedModules === "number" &&
        typeof participant.completedModules === "number" &&
        typeof participant.progressPercent === "number" &&
        typeof participant.nextAction === "string",
    ) &&
    trainingCatalog.length === 24 &&
    trainingCatalog.every(
      (module) =>
        isRecord(module) &&
        typeof module.moduleId === "string" &&
        typeof module.month === "number" &&
        typeof module.title === "string" &&
        typeof module.competence === "string" &&
        typeof module.assignedParticipants === "number" &&
        typeof module.activeParticipants === "number" &&
        typeof module.completedParticipants === "number",
    )
  );
}

function isAdminOperationsDashboard(
  value: unknown,
): value is AdminOperationsDashboard {
  if (!isRecord(value) || !isAdminDashboard(value.dashboard)) return false;
  const operations = value.operations;
  if (
    !isRecord(operations) ||
    !isRecord(operations.accounts) ||
    !isRecord(operations.corrections) ||
    !isRecord(operations.remediation) ||
    !isRecord(operations.contentValidity) ||
    !isRecord(operations.feedback)
  ) {
    return false;
  }
  const groups = [
    operations.accounts,
    operations.corrections,
    operations.remediation,
    operations.contentValidity,
    operations.feedback,
  ];
  return groups.every((group) =>
    Object.values(group).every(
      (counter) =>
        typeof counter === "number" &&
        Number.isInteger(counter) &&
        counter >= 0,
    ),
  );
}

function isInvitation(value: unknown): value is Invitation {
  return (
    isRecord(value) &&
    typeof value.professionalEmail === "string" &&
    /^[A-Za-z0-9_-]{32,256}$/u.test(
      typeof value.token === "string" ? value.token : "",
    ) &&
    typeof value.expiresAt === "string"
  );
}

function isManagedAccount(value: unknown): value is ManagedAccount {
  return (
    isRecord(value) &&
    typeof value.accountId === "string" &&
    typeof value.professionalEmail === "string" &&
    typeof value.accountStatus === "string" &&
    Array.isArray(value.roles) &&
    value.roles.every((role) => typeof role === "string") &&
    Array.isArray(value.scopes) &&
    value.scopes.every((scope) => typeof scope === "string") &&
    typeof value.version === "number" &&
    Number.isInteger(value.version) &&
    value.version >= 0 &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isManagedAccountPage(value: unknown): value is ManagedAccountPage {
  return (
    isRecord(value) &&
    Array.isArray(value.accounts) &&
    value.accounts.every(isManagedAccount) &&
    (value.nextCursor === null || typeof value.nextCursor === "string")
  );
}

function formatExpiration(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function formatAccountStatus(
  value: AdminDashboardParticipant["accountStatus"],
): string {
  switch (value) {
    case "ACTIVE":
      return "Ativo";
    case "INVITED":
      return "Convite pendente";
    case "SUSPENDED":
      return "Suspenso";
    case "DEACTIVATED":
      return "Desativado";
  }
}

export default function AdminPage() {
  const [operations, setOperations] = useState<Operations | null>(null);
  const [adminDashboard, setAdminDashboard] = useState<AdminDashboard | null>(
    null,
  );
  const [adminOperations, setAdminOperations] =
    useState<AdminOperationsDashboard | null>(null);
  const [managedAccounts, setManagedAccounts] = useState<ManagedAccount[]>([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("PARTICIPANT");
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(): Promise<void> {
    setError(null);
    try {
      const response = await fetch(apiBase + "/api/v1/internal/dashboard", {
        credentials: "include",
        cache: "no-store",
      });
      const payload: unknown = await response.json().catch(() => null);
      if (
        !response.ok ||
        !isRecord(payload) ||
        payload.success !== true ||
        !isOperations(payload.data)
      ) {
        throw new Error("admin dashboard unavailable");
      }
      setOperations(payload.data);
    } catch {
      setError("Área disponível apenas para o superadmin.");
      return;
    }

    try {
      const response = await fetch(
        apiBase + "/api/v1/internal/admin/dashboard",
        {
          credentials: "include",
          cache: "no-store",
        },
      );
      const payload: unknown = await response.json().catch(() => null);
      if (
        !response.ok ||
        !isRecord(payload) ||
        payload.success !== true ||
        !isAdminDashboard(payload.data)
      ) {
        throw new Error("training dashboard unavailable");
      }
      setAdminDashboard(payload.data);
      setSelectedParticipantId(
        payload.data.participants[0]?.participantId ?? "",
      );
      setSelectedModuleId(payload.data.trainingCatalog[0]?.moduleId ?? "");
    } catch {
      setError("Não foi possível carregar o acompanhamento dos treinamentos.");
    }
    try {
      const response = await fetch(
        apiBase + "/api/v1/internal/admin/operations",
        { credentials: "include", cache: "no-store" },
      );
      const payload: unknown = await response.json().catch(() => null);
      if (
        !response.ok ||
        !isRecord(payload) ||
        payload.success !== true ||
        !isAdminOperationsDashboard(payload.data)
      ) {
        throw new Error("admin operations unavailable");
      }
      setAdminOperations(payload.data);
    } catch {
      setAdminOperations(null);
      setError("Não foi possível carregar os controles operacionais.");
    }
    await loadManagedAccounts();
  }

  async function loadManagedAccounts(): Promise<void> {
    try {
      const response = await fetch(
        apiBase + "/api/v1/internal/accounts?limit=200",
        { credentials: "include", cache: "no-store" },
      );
      const payload: unknown = await response.json().catch(() => null);
      if (
        !response.ok ||
        !isRecord(payload) ||
        payload.success !== true ||
        !isManagedAccountPage(payload.data)
      ) {
        return;
      }
      setManagedAccounts([...payload.data.accounts]);
    } catch {
      // The training dashboard remains usable when the optional account list is unavailable.
    }
  }

  async function updateManagedAccountStatus(
    account: ManagedAccount,
    status: ManagedAccount["accountStatus"],
  ): Promise<void> {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        apiBase +
          "/api/v1/internal/accounts/" +
          encodeURIComponent(account.accountId),
        {
          method: "PATCH",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ expectedVersion: account.version, status }),
        },
      );
      const payload: unknown = await response.json().catch(() => null);
      if (
        !response.ok ||
        !isRecord(payload) ||
        payload.success !== true ||
        !isManagedAccount(payload.data)
      ) {
        throw new Error("account update unavailable");
      }
      const updatedAccount = payload.data;
      setManagedAccounts((current) =>
        current.map((candidate) =>
          candidate.accountId === updatedAccount.accountId
            ? updatedAccount
            : candidate,
        ),
      );
      setNotice("Status da conta atualizado.");
    } catch {
      setError("Não foi possível atualizar o status da conta.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeManagedAccountSessions(
    account: ManagedAccount,
  ): Promise<void> {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        apiBase +
          "/api/v1/internal/accounts/" +
          encodeURIComponent(account.accountId) +
          "/sessions/revoke",
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: "{}",
        },
      );
      const payload: unknown = await response.json().catch(() => null);
      if (
        !response.ok ||
        !isRecord(payload) ||
        payload.success !== true ||
        !isRecord(payload.data) ||
        typeof payload.data.revokedCount !== "number"
      ) {
        throw new Error("session revoke unavailable");
      }
      setNotice(
        `${payload.data.revokedCount} sessão(ões) revogada(s) para ${account.professionalEmail}.`,
      );
    } catch {
      setError("Não foi possível revogar as sessões da conta.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateInvitation(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    setInvitation(null);
    try {
      const response = await fetch(apiBase + "/api/v1/internal/invitations", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          professionalEmail: email,
          invitedRoles: [role],
          invitedScopes: [],
          expiresInSeconds: 604_800,
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (
        !response.ok ||
        !isRecord(payload) ||
        payload.success !== true ||
        !isInvitation(payload.data)
      ) {
        throw new Error("invitation unavailable");
      }
      setInvitation(payload.data);
      setEmail("");
      setNotice("Acesso criado. Envie o link de primeiro acesso ao usuário.");
    } catch {
      setError(
        "Não foi possível criar o acesso. Verifique a permissão e o e-mail.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleAssignModule(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    const participant = adminDashboard?.participants.find(
      ({ participantId }) => participantId === selectedParticipantId,
    );
    const scopeId = participant?.scopeIds[0];
    if (
      participant === undefined ||
      scopeId === undefined ||
      selectedModuleId === ""
    ) {
      setError("Selecione um veterinário e um módulo para continuar.");
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    const assignmentId = globalThis.crypto.randomUUID();
    const availableAt = new Date().toISOString();
    try {
      const createResponse = await fetch(
        apiBase + "/api/v1/internal/learning-assignments",
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            assignmentId,
            participantId: participant.participantId,
            scopeId,
            moduleId: selectedModuleId,
            availableAt,
          }),
        },
      );
      const createPayload: unknown = await createResponse
        .json()
        .catch(() => null);
      if (
        !createResponse.ok ||
        !isRecord(createPayload) ||
        createPayload.success !== true ||
        !isRecord(createPayload.data) ||
        typeof createPayload.data.version !== "number"
      ) {
        throw new Error("assignment creation unavailable");
      }

      const transition = async (
        version: number,
        eventName: "ATRIBUIR" | "DISPONIBILIZAR",
        now?: string,
      ): Promise<number> => {
        const response = await fetch(
          apiBase +
            "/api/v1/internal/learning-assignments/" +
            encodeURIComponent(assignmentId) +
            "/transition",
          {
            method: "POST",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              assignmentId,
              participantId: participant.participantId,
              scopeId,
              version,
              event: eventName,
              ...(now === undefined ? {} : { now }),
            }),
          },
        );
        const payload: unknown = await response.json().catch(() => null);
        if (
          !response.ok ||
          !isRecord(payload) ||
          payload.success !== true ||
          !isRecord(payload.data) ||
          typeof payload.data.version !== "number"
        ) {
          throw new Error("assignment transition unavailable");
        }
        return payload.data.version;
      };

      const assignedVersion = await transition(
        createPayload.data.version,
        "ATRIBUIR",
      );
      await transition(assignedVersion, "DISPONIBILIZAR", availableAt);
      await load();
      setNotice("Treinamento atribuído e disponibilizado.");
    } catch {
      setError("Não foi possível atribuir o treinamento ao veterinário.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const invitationPath =
    invitation === null
      ? null
      : "/invite?" +
        invitationQueryParameter +
        "=" +
        encodeURIComponent(invitation.token);

  return (
    <main className="shell" id="main-content" tabIndex={-1} aria-busy={busy}>
      <header className="topbar" aria-label="Administração">
        <div>
          <p className="eyebrow">CVG · superadmin</p>
          <span className="brand">Centro de controle</span>
        </div>
        <span className="status-pill">Acesso restrito</span>
      </header>

      {operations === null ? (
        error !== null ? (
          <section className="hero-card error-panel" role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => void load()} disabled={busy}>
              Tentar novamente
            </button>
          </section>
        ) : (
          <section className="hero-card" role="status">
            Carregando centro de controle…
          </section>
        )
      ) : (
        <>
          <section className="hero-card" aria-labelledby="admin-title">
            <p className="eyebrow">Acompanhamento administrativo</p>
            <h1 id="admin-title">Dashboard de treinamento</h1>
            <p>
              Acompanhe quem está em treinamento, veja o avanço da trilha e
              disponibilize módulos para cada veterinário. O cadastro público
              permanece fechado.
            </p>
            <dl className="dependency-list">
              {Object.entries(operations.dependencies).map(([name, value]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {adminDashboard === null ? (
            error !== null ? (
              <section
                className="admin-dashboard-card error-panel"
                role="alert"
              >
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={busy}
                >
                  Tentar novamente
                </button>
              </section>
            ) : (
              <section className="admin-dashboard-card" role="status">
                Carregando acompanhamento dos treinamentos…
              </section>
            )
          ) : (
            <>
              {adminOperations !== null ? (
                <section
                  className="admin-dashboard-card"
                  aria-labelledby="admin-operations-title"
                >
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">Controles operacionais</p>
                      <h2 id="admin-operations-title">Risco, SLA e validade</h2>
                    </div>
                    <span className="status-pill">Dados internos</span>
                  </div>
                  <div className="admin-summary-grid">
                    <div>
                      <span>Contas ativas</span>
                      <strong>
                        {adminOperations.operations.accounts.active}
                      </strong>
                      <small>
                        {adminOperations.operations.accounts.inactiveOver14Days}{" "}
                        inativas há mais de 14 dias
                      </small>
                    </div>
                    <div>
                      <span>Correções abertas</span>
                      <strong>
                        {adminOperations.operations.corrections.open}
                      </strong>
                      <small>
                        {adminOperations.operations.corrections.slaBreaches}{" "}
                        quebra(s) de SLA
                      </small>
                    </div>
                    <div>
                      <span>Remediação digital</span>
                      <strong>
                        {adminOperations.operations.remediation.objectives}
                      </strong>
                      <small>
                        objetivos em{" "}
                        {adminOperations.operations.remediation.participants}{" "}
                        participante(s)
                      </small>
                    </div>
                    <div>
                      <span>Feedback técnico</span>
                      <strong>
                        {adminOperations.operations.feedback.technicalFailures}
                      </strong>
                      <small>
                        de {adminOperations.operations.feedback.open}{" "}
                        feedback(s) aberto(s)
                      </small>
                    </div>
                  </div>
                  <dl className="dependency-list">
                    <div>
                      <dt>Conteúdo válido</dt>
                      <dd>
                        {adminOperations.operations.contentValidity.valid}
                      </dd>
                    </div>
                    <div>
                      <dt>Próximo de revisão</dt>
                      <dd>
                        {
                          adminOperations.operations.contentValidity
                            .dueForReview
                        }
                      </dd>
                    </div>
                    <div>
                      <dt>Expirado</dt>
                      <dd>
                        {adminOperations.operations.contentValidity.expired}
                      </dd>
                    </div>
                    <div>
                      <dt>Retirado</dt>
                      <dd>
                        {adminOperations.operations.contentValidity.withdrawn}
                      </dd>
                    </div>
                  </dl>
                </section>
              ) : null}

              <section
                className="admin-management-card"
                aria-labelledby="account-lifecycle-title"
              >
                <div className="admin-management-copy">
                  <p className="eyebrow">Identidade e acesso</p>
                  <h2 id="account-lifecycle-title">Lifecycle de contas</h2>
                  <p>
                    Suspenda, reative ou desative acessos dentro dos escopos
                    permitidos. A autorização é validada no servidor e não
                    permite conceder o perfil administrativo.
                  </p>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th scope="col">Conta</th>
                        <th scope="col">Perfil</th>
                        <th scope="col">Status</th>
                        <th scope="col">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {managedAccounts.length === 0 ? (
                        <tr>
                          <td colSpan={4}>
                            Nenhuma conta administrável no escopo atual.
                          </td>
                        </tr>
                      ) : (
                        managedAccounts.map((account) => (
                          <tr key={account.accountId}>
                            <td>
                              <strong>{account.professionalEmail}</strong>
                              <small>Versão {account.version}</small>
                            </td>
                            <td>{account.roles.join(", ")}</td>
                            <td>
                              <span className="admin-status">
                                {formatAccountStatus(account.accountStatus)}
                              </span>
                            </td>
                            <td>
                              <div className="admin-action-group">
                                {account.accountStatus === "ACTIVE" ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void updateManagedAccountStatus(
                                        account,
                                        "SUSPENDED",
                                      )
                                    }
                                    disabled={busy}
                                  >
                                    Suspender
                                  </button>
                                ) : null}
                                {account.accountStatus === "SUSPENDED" ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void updateManagedAccountStatus(
                                        account,
                                        "ACTIVE",
                                      )
                                    }
                                    disabled={busy}
                                  >
                                    Reativar
                                  </button>
                                ) : null}
                                {account.accountStatus !== "DEACTIVATED" ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void updateManagedAccountStatus(
                                        account,
                                        "DEACTIVATED",
                                      )
                                    }
                                    disabled={busy}
                                  >
                                    Desativar
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() =>
                                    void revokeManagedAccountSessions(account)
                                  }
                                  disabled={busy}
                                >
                                  Revogar sessões
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section
                className="admin-dashboard-card"
                aria-labelledby="training-summary-title"
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Trilha clínica digital</p>
                    <h2 id="training-summary-title">Visão dos veterinários</h2>
                  </div>
                  <span className="status-pill">
                    Currículo {adminDashboard.curriculumVersion}
                  </span>
                </div>
                <div className="admin-summary-grid">
                  <div>
                    <span>Em treinamento</span>
                    <strong>{adminDashboard.summary.activeParticipants}</strong>
                    <small>
                      {adminDashboard.summary.participantsInProgress} em avanço
                    </small>
                  </div>
                  <div>
                    <span>Convites pendentes</span>
                    <strong>
                      {adminDashboard.summary.invitedParticipants}
                    </strong>
                    <small>Primeiros acessos ainda não ativados</small>
                  </div>
                  <div>
                    <span>Média de progresso</span>
                    <strong>
                      {adminDashboard.summary.averageProgressPercent}%
                    </strong>
                    <small>Conclusão digital da trilha</small>
                  </div>
                  <div>
                    <span>Módulos concluídos</span>
                    <strong>{adminDashboard.summary.completedModules}</strong>
                    <small>
                      {adminDashboard.summary.assignedModules} atribuições no
                      total
                    </small>
                  </div>
                </div>
              </section>

              <section
                className="admin-dashboard-card"
                aria-labelledby="participants-title"
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Acompanhamento individual</p>
                    <h2 id="participants-title">Veterinários em treinamento</h2>
                  </div>
                  <span className="admin-section-count">
                    {adminDashboard.summary.participantsTotal} usuários
                  </span>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th scope="col">Veterinário</th>
                        <th scope="col">Status</th>
                        <th scope="col">Progresso</th>
                        <th scope="col">Próximo passo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminDashboard.participants.length === 0 ? (
                        <tr>
                          <td colSpan={4}>
                            Nenhum veterinário no escopo do admin.
                          </td>
                        </tr>
                      ) : (
                        adminDashboard.participants.map((participant) => (
                          <tr key={participant.participantId}>
                            <td>
                              <strong>{participant.professionalEmail}</strong>
                              <small>
                                {participant.assignedModules} módulos atribuídos
                              </small>
                            </td>
                            <td>
                              <span className="admin-status">
                                {formatAccountStatus(participant.accountStatus)}
                              </span>
                            </td>
                            <td>
                              <strong>
                                {participant.progressPercent}% concluído
                              </strong>
                              <small>
                                {participant.completedModules} módulos
                                concluídos
                              </small>
                            </td>
                            <td>
                              <strong>
                                {participant.activeModuleTitle ??
                                  "Ainda não iniciado"}
                              </strong>
                              <small>{participant.nextAction}</small>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section
                className="admin-management-card"
                aria-labelledby="training-customization-title"
              >
                <div className="admin-management-copy">
                  <p className="eyebrow">Customização controlada</p>
                  <h2 id="training-customization-title">Customizar trilha</h2>
                  <p>
                    Atribua e disponibilize um módulo existente para um
                    veterinário dentro dos escopos permitidos. O conteúdo
                    clínico continua sendo alterado somente pelo fluxo
                    editorial.
                  </p>
                </div>
                <form
                  className="admin-training-form"
                  onSubmit={handleAssignModule}
                >
                  <label htmlFor="training-participant">Veterinário</label>
                  <select
                    id="training-participant"
                    required
                    value={selectedParticipantId}
                    onChange={(event) =>
                      setSelectedParticipantId(event.target.value)
                    }
                  >
                    {adminDashboard.participants.length === 0 ? (
                      <option value="">Nenhum usuário disponível</option>
                    ) : null}
                    {adminDashboard.participants.map((participant) => (
                      <option
                        value={participant.participantId}
                        key={participant.participantId}
                      >
                        {participant.professionalEmail}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="training-module">Módulo</label>
                  <select
                    id="training-module"
                    required
                    value={selectedModuleId}
                    onChange={(event) =>
                      setSelectedModuleId(event.target.value)
                    }
                  >
                    {adminDashboard.trainingCatalog.map((module) => (
                      <option value={module.moduleId} key={module.moduleId}>
                        {module.moduleId} · {module.title}
                      </option>
                    ))}
                  </select>
                  <p className="field-help">
                    Esta ação cria uma nova atribuição; não altera respostas,
                    notas ou publicação clínica.
                  </p>
                  <button
                    type="submit"
                    disabled={busy || adminDashboard.participants.length === 0}
                  >
                    {busy ? "Atribuindo módulo…" : "Atribuir módulo"}
                  </button>
                </form>
              </section>

              <section
                className="admin-dashboard-card"
                aria-labelledby="training-catalog-title"
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Planejamento</p>
                    <h2 id="training-catalog-title">
                      Catálogo de treinamentos
                    </h2>
                  </div>
                  <span className="admin-section-count">24 módulos</span>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table admin-catalog-table">
                    <thead>
                      <tr>
                        <th scope="col">Módulo</th>
                        <th scope="col">Competência</th>
                        <th scope="col">Atribuídos</th>
                        <th scope="col">Ativos</th>
                        <th scope="col">Concluídos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminDashboard.trainingCatalog.map((module) => (
                        <tr key={module.moduleId}>
                          <td>
                            <strong>
                              {module.moduleId} · {module.title}
                            </strong>
                            <small>Mês {module.month}</small>
                          </td>
                          <td>{module.competence}</td>
                          <td>{module.assignedParticipants}</td>
                          <td>{module.activeParticipants}</td>
                          <td>{module.completedParticipants}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          <section
            className="admin-management-card"
            aria-labelledby="user-management-title"
          >
            <div className="admin-management-copy">
              <p className="eyebrow">Primeiro acesso</p>
              <h2 id="user-management-title">Gestão de usuários</h2>
              <p>
                Somente o superadmin pode criar novos acessos. O usuário recebe
                um link de uso único e define a própria senha.
              </p>
            </div>
            <form className="admin-user-form" onSubmit={handleCreateInvitation}>
              <label htmlFor="new-user-email">
                E-mail profissional do novo usuário
              </label>
              <input
                id="new-user-email"
                type="email"
                autoComplete="off"
                maxLength={320}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <label htmlFor="invite-role">Perfil de acesso</label>
              <select
                id="invite-role"
                value={role}
                onChange={(event) => setRole(event.target.value as InviteRole)}
              >
                {inviteRoleOptions.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="field-help">
                O acesso fica limitado aos escopos do superadmin. O perfil
                administrativo não pode ser criado por convite.
              </p>
              <button type="submit" disabled={busy}>
                {busy ? "Criando acesso…" : "Criar acesso"}
              </button>
            </form>
          </section>

          {invitation !== null && invitationPath !== null ? (
            <section className="invite-result" aria-labelledby="invite-title">
              <p className="eyebrow">Convite criado</p>
              <h2 id="invite-title">Envie o primeiro acesso</h2>
              <p>
                O link é de uso único e expira em{" "}
                {formatExpiration(invitation.expiresAt)}. Ele não será exibido
                novamente depois desta tela.
              </p>
              <a href={invitationPath}>Abrir primeiro acesso</a>
              <small>{invitation.professionalEmail}</small>
            </section>
          ) : null}

          <section className="journey-list" aria-labelledby="kpi-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Métricas redigidas</p>
                <h2 id="kpi-title">KPIs</h2>
              </div>
            </div>
            <div className="dependency-list">
              <div>
                <dt>Requisições</dt>
                <dd>{operations.metrics.requestsTotal}</dd>
              </div>
              <div>
                <dt>Erros de servidor</dt>
                <dd>{operations.metrics.errorsTotal}</dd>
              </div>
              <div>
                <dt>P95</dt>
                <dd>{operations.metrics.p95DurationMs ?? "Sem dados"}</dd>
              </div>
            </div>
            <h2>Evidências de operação</h2>
            {Object.entries(operations.evidence).map(([name, value]) => (
              <p className="journey-item" key={name}>
                <strong>{name}</strong> · {value}
              </p>
            ))}
          </section>
        </>
      )}

      {error !== null && operations !== null ? (
        <p className="feedback error" role="alert">
          {error}
        </p>
      ) : null}
      {notice !== null ? (
        <p className="feedback success" role="status">
          {notice}
        </p>
      ) : null}
    </main>
  );
}
