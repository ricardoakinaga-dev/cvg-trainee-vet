"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { AdminContent } from "./admin-sections";
import type {
  AdminDashboard,
  AdminOperationsDashboard,
  InviteRole,
  Invitation,
  ManagedAccount,
  Operations,
} from "./admin-model";

type AdminViewProps = Readonly<{
  readonly operations: Operations | null;
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
  readonly error: string | null;
  readonly notice: string | null;
  readonly setSelectedParticipantId: Dispatch<SetStateAction<string>>;
  readonly setSelectedModuleId: Dispatch<SetStateAction<string>>;
  readonly setEmail: Dispatch<SetStateAction<string>>;
  readonly setRole: Dispatch<SetStateAction<InviteRole>>;
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

function AdminHeader() {
  return (
    <header className="topbar" aria-label="Administração">
      <div>
        <p className="eyebrow">CVG · superadmin</p>
        <span className="brand">Centro de controle</span>
      </div>
      <span className="status-pill">Acesso restrito</span>
    </header>
  );
}

function AdminUnavailable({
  error,
  busy,
  load,
}: Pick<AdminViewProps, "error" | "busy" | "load">) {
  return error !== null ? (
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
  );
}

function AdminFeedback({
  operations,
  error,
  notice,
}: Pick<AdminViewProps, "operations" | "error" | "notice">) {
  return (
    <>
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
    </>
  );
}

export function AdminView(props: AdminViewProps) {
  return (
    <main
      className="shell"
      id="main-content"
      tabIndex={-1}
      aria-busy={props.busy}
    >
      <AdminHeader />
      {props.operations === null ? (
        <AdminUnavailable {...props} />
      ) : (
        <AdminContent {...props} operations={props.operations} />
      )}
      <AdminFeedback {...props} />
    </main>
  );
}
