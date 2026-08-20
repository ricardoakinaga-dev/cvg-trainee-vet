"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  formatAccountStatus,
  formatExpiration,
  inviteRoleOptions,
} from "./admin-model";
import type {
  AdminDashboard,
  AdminOperationsDashboard,
  InviteRole,
  Invitation,
  ManagedAccount,
  Operations,
} from "./admin-model";

export type AdminContentProps = Readonly<{
  readonly operations: Operations;
  readonly adminDashboard: AdminDashboard | null;
  readonly adminOperations: AdminOperationsDashboard | null;
  readonly managedAccounts: readonly ManagedAccount[];
  readonly selectedParticipantId: string;
  readonly selectedModuleId: string;
  readonly email: string;
  readonly role: InviteRole;
  readonly invitation: Invitation | null;
  readonly invitationPath: string | null;
  readonly busy: boolean;
  readonly setSelectedParticipantId: Dispatch<SetStateAction<string>>;
  readonly setSelectedModuleId: Dispatch<SetStateAction<string>>;
  readonly setEmail: Dispatch<SetStateAction<string>>;
  readonly setRole: Dispatch<SetStateAction<InviteRole>>;
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

function OperationsOverview({
  operations,
}: Pick<AdminContentProps, "operations">) {
  return (
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
  );
}

function OperationsHealthMetrics({
  dashboard,
}: Readonly<{ readonly dashboard: AdminOperationsDashboard }>) {
  const { operations } = dashboard;
  return (
    <div className="admin-summary-grid">
      <div>
        <span>Contas ativas</span>
        <strong>{operations.accounts.active}</strong>
        <small>
          {operations.accounts.inactiveOver14Days} inativas há mais de 14 dias
        </small>
      </div>
      <div>
        <span>Correções abertas</span>
        <strong>{operations.corrections.open}</strong>
        <small>{operations.corrections.slaBreaches} quebra(s) de SLA</small>
      </div>
      <div>
        <span>Remediação digital</span>
        <strong>{operations.remediation.objectives}</strong>
        <small>
          objetivos em {operations.remediation.participants} participante(s)
        </small>
      </div>
      <div>
        <span>Feedback técnico</span>
        <strong>{operations.feedback.technicalFailures}</strong>
        <small>de {operations.feedback.open} feedback(s) aberto(s)</small>
      </div>
    </div>
  );
}

function OperationsHealthValidity({
  dashboard,
}: Readonly<{ readonly dashboard: AdminOperationsDashboard }>) {
  const { contentValidity } = dashboard.operations;
  return (
    <dl className="dependency-list">
      <div>
        <dt>Conteúdo válido</dt>
        <dd>{contentValidity.valid}</dd>
      </div>
      <div>
        <dt>Próximo de revisão</dt>
        <dd>{contentValidity.dueForReview}</dd>
      </div>
      <div>
        <dt>Expirado</dt>
        <dd>{contentValidity.expired}</dd>
      </div>
      <div>
        <dt>Retirado</dt>
        <dd>{contentValidity.withdrawn}</dd>
      </div>
    </dl>
  );
}

function OperationsHealthSection({
  dashboard,
}: Readonly<{ readonly dashboard: AdminOperationsDashboard }>) {
  return (
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
      <OperationsHealthMetrics dashboard={dashboard} />
      <OperationsHealthValidity dashboard={dashboard} />
    </section>
  );
}

function ManagedAccountActions({
  account,
  busy,
  update,
  revoke,
}: Readonly<{
  readonly account: ManagedAccount;
  readonly busy: boolean;
  readonly update: AdminContentProps["updateManagedAccountStatus"];
  readonly revoke: AdminContentProps["revokeManagedAccountSessions"];
}>) {
  return (
    <div className="admin-action-group">
      {account.accountStatus === "ACTIVE" ? (
        <button
          type="button"
          onClick={() => void update(account, "SUSPENDED")}
          disabled={busy}
        >
          Suspender
        </button>
      ) : null}
      {account.accountStatus === "SUSPENDED" ? (
        <button
          type="button"
          onClick={() => void update(account, "ACTIVE")}
          disabled={busy}
        >
          Reativar
        </button>
      ) : null}
      {account.accountStatus !== "DEACTIVATED" ? (
        <button
          type="button"
          onClick={() => void update(account, "DEACTIVATED")}
          disabled={busy}
        >
          Desativar
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => void revoke(account)}
        disabled={busy}
      >
        Revogar sessões
      </button>
    </div>
  );
}

function ManagedAccountRow({
  account,
  busy,
  update,
  revoke,
}: Readonly<{
  readonly account: ManagedAccount;
  readonly busy: boolean;
  readonly update: AdminContentProps["updateManagedAccountStatus"];
  readonly revoke: AdminContentProps["revokeManagedAccountSessions"];
}>) {
  return (
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
        <ManagedAccountActions
          account={account}
          busy={busy}
          update={update}
          revoke={revoke}
        />
      </td>
    </tr>
  );
}

function ManagedAccountTable({
  accounts,
  busy,
  update,
  revoke,
}: Readonly<{
  readonly accounts: readonly ManagedAccount[];
  readonly busy: boolean;
  readonly update: AdminContentProps["updateManagedAccountStatus"];
  readonly revoke: AdminContentProps["revokeManagedAccountSessions"];
}>) {
  return (
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
          {accounts.length === 0 ? (
            <tr>
              <td colSpan={4}>Nenhuma conta administrável no escopo atual.</td>
            </tr>
          ) : (
            accounts.map((account) => (
              <ManagedAccountRow
                key={account.accountId}
                account={account}
                busy={busy}
                update={update}
                revoke={revoke}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ManagedAccountsSection({
  managedAccounts,
  busy,
  updateManagedAccountStatus,
  revokeManagedAccountSessions,
}: Pick<
  AdminContentProps,
  | "managedAccounts"
  | "busy"
  | "updateManagedAccountStatus"
  | "revokeManagedAccountSessions"
>) {
  return (
    <section
      className="admin-management-card"
      aria-labelledby="account-lifecycle-title"
    >
      <div className="admin-management-copy">
        <p className="eyebrow">Identidade e acesso</p>
        <h2 id="account-lifecycle-title">Lifecycle de contas</h2>
        <p>
          Suspenda, reactive ou desative acessos dentro dos escopos permitidos.
          A autorização é validada no servidor e não permite conceder o perfil
          administrativo.
        </p>
      </div>
      <ManagedAccountTable
        accounts={managedAccounts}
        busy={busy}
        update={updateManagedAccountStatus}
        revoke={revokeManagedAccountSessions}
      />
    </section>
  );
}

function TrainingSummary({
  dashboard,
}: Readonly<{ readonly dashboard: AdminDashboard }>) {
  const { summary } = dashboard;
  return (
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
          Currículo {dashboard.curriculumVersion}
        </span>
      </div>
      <div className="admin-summary-grid">
        <div>
          <span>Em treinamento</span>
          <strong>{summary.activeParticipants}</strong>
          <small>{summary.participantsInProgress} em avanço</small>
        </div>
        <div>
          <span>Convites pendentes</span>
          <strong>{summary.invitedParticipants}</strong>
          <small>Primeiros acessos ainda não ativados</small>
        </div>
        <div>
          <span>Média de progresso</span>
          <strong>{summary.averageProgressPercent}%</strong>
          <small>Conclusão digital da trilha</small>
        </div>
        <div>
          <span>Módulos concluídos</span>
          <strong>{summary.completedModules}</strong>
          <small>{summary.assignedModules} atribuições no total</small>
        </div>
      </div>
    </section>
  );
}

function ParticipantRow({
  participant,
}: Readonly<{ readonly participant: AdminDashboard["participants"][number] }>) {
  return (
    <tr key={participant.participantId}>
      <td>
        <strong>{participant.professionalEmail}</strong>
        <small>{participant.assignedModules} módulos atribuídos</small>
      </td>
      <td>
        <span className="admin-status">
          {formatAccountStatus(participant.accountStatus)}
        </span>
      </td>
      <td>
        <strong>{participant.progressPercent}% concluído</strong>
        <small>{participant.completedModules} módulos concluídos</small>
      </td>
      <td>
        <strong>{participant.activeModuleTitle ?? "Ainda não iniciado"}</strong>
        <small>{participant.nextAction}</small>
      </td>
    </tr>
  );
}

function ParticipantsSection({
  dashboard,
}: Readonly<{ readonly dashboard: AdminDashboard }>) {
  return (
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
          {dashboard.summary.participantsTotal} usuários
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
            {dashboard.participants.length === 0 ? (
              <tr>
                <td colSpan={4}>Nenhum veterinário no escopo do admin.</td>
              </tr>
            ) : (
              dashboard.participants.map((participant) => (
                <ParticipantRow
                  key={participant.participantId}
                  participant={participant}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TrainingForm({
  adminDashboard: dashboard,
  selectedParticipantId,
  selectedModuleId,
  setSelectedParticipantId,
  setSelectedModuleId,
  busy,
  handleAssignModule,
}: Pick<
  AdminContentProps,
  | "adminDashboard"
  | "selectedParticipantId"
  | "selectedModuleId"
  | "setSelectedParticipantId"
  | "setSelectedModuleId"
  | "busy"
  | "handleAssignModule"
>) {
  if (dashboard === null) return null;
  return (
    <form className="admin-training-form" onSubmit={handleAssignModule}>
      <label htmlFor="training-participant">Veterinário</label>
      <select
        id="training-participant"
        required
        value={selectedParticipantId}
        onChange={(event) => setSelectedParticipantId(event.target.value)}
      >
        {dashboard.participants.length === 0 ? (
          <option value="">Nenhum usuário disponível</option>
        ) : null}
        {dashboard.participants.map((participant) => (
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
        onChange={(event) => setSelectedModuleId(event.target.value)}
      >
        {dashboard.trainingCatalog.map((module) => (
          <option value={module.moduleId} key={module.moduleId}>
            {module.moduleId} · {module.title}
          </option>
        ))}
      </select>
      <p className="field-help">
        Esta ação cria uma nova atribuição; não altera respostas, notas ou
        publicação clínica.
      </p>
      <button
        type="submit"
        disabled={busy || dashboard.participants.length === 0}
      >
        {busy ? "Atribuindo módulo…" : "Atribuir módulo"}
      </button>
    </form>
  );
}

function TrainingCustomization({
  adminDashboard: dashboard,
  ...props
}: Pick<
  AdminContentProps,
  | "adminDashboard"
  | "selectedParticipantId"
  | "selectedModuleId"
  | "setSelectedParticipantId"
  | "setSelectedModuleId"
  | "busy"
  | "handleAssignModule"
>) {
  if (dashboard === null) return null;
  return (
    <section
      className="admin-management-card"
      aria-labelledby="training-customization-title"
    >
      <div className="admin-management-copy">
        <p className="eyebrow">Customização controlada</p>
        <h2 id="training-customization-title">Customizar trilha</h2>
        <p>
          Atribua e disponibilize um módulo existente para um veterinário dentro
          dos escopos permitidos. O conteúdo clínico continua sendo alterado
          somente pelo fluxo editorial.
        </p>
      </div>
      <TrainingForm adminDashboard={dashboard} {...props} />
    </section>
  );
}

function TrainingCatalog({
  dashboard,
}: Readonly<{ readonly dashboard: AdminDashboard }>) {
  return (
    <section
      className="admin-dashboard-card"
      aria-labelledby="training-catalog-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">Planejamento</p>
          <h2 id="training-catalog-title">Catálogo de treinamentos</h2>
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
            {dashboard.trainingCatalog.map((module) => (
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
  );
}

function InvitationForm({
  email,
  role,
  busy,
  setEmail,
  setRole,
  handleCreateInvitation,
}: Pick<
  AdminContentProps,
  "email" | "role" | "busy" | "setEmail" | "setRole" | "handleCreateInvitation"
>) {
  return (
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
  );
}

function InvitationResult({
  invitation,
  invitationPath,
}: Pick<AdminContentProps, "invitation" | "invitationPath">) {
  if (invitation === null || invitationPath === null) return null;
  return (
    <section className="invite-result" aria-labelledby="invite-title">
      <p className="eyebrow">Convite criado</p>
      <h2 id="invite-title">Envie o primeiro acesso</h2>
      <p>
        O link é de uso único e expira em{" "}
        {formatExpiration(invitation.expiresAt)}. Ele não será exibido novamente
        depois desta tela.
      </p>
      <a href={invitationPath}>Abrir primeiro acesso</a>
      <small>{invitation.professionalEmail}</small>
    </section>
  );
}

function InvitationSection(
  props: Pick<
    AdminContentProps,
    | "email"
    | "role"
    | "invitation"
    | "invitationPath"
    | "busy"
    | "setEmail"
    | "setRole"
    | "handleCreateInvitation"
  >,
) {
  return (
    <>
      <section
        className="admin-management-card"
        aria-labelledby="user-management-title"
      >
        <div className="admin-management-copy">
          <p className="eyebrow">Primeiro acesso</p>
          <h2 id="user-management-title">Gestão de usuários</h2>
          <p>
            Somente o superadmin pode criar novos acessos. O usuário recebe um
            link de uso único e define a própria senha.
          </p>
        </div>
        <InvitationForm {...props} />
      </section>
      <InvitationResult {...props} />
    </>
  );
}

function OperationsKpis({ operations }: Pick<AdminContentProps, "operations">) {
  return (
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
  );
}

export function AdminContent(props: AdminContentProps) {
  const dashboard = props.adminDashboard;
  return (
    <>
      <OperationsOverview operations={props.operations} />
      {dashboard === null ? null : (
        <>
          <>
            {props.adminOperations === null ? null : (
              <OperationsHealthSection dashboard={props.adminOperations} />
            )}
          </>
          <ManagedAccountsSection {...props} />
          <TrainingSummary dashboard={dashboard} />
          <ParticipantsSection dashboard={dashboard} />
          <TrainingCustomization {...props} />
          <TrainingCatalog dashboard={dashboard} />
        </>
      )}
      <InvitationSection {...props} />
      <OperationsKpis operations={props.operations} />
    </>
  );
}
