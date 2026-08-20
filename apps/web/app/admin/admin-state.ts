"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type {
  AdminDashboard,
  AdminOperationsDashboard,
  AssignmentOperation,
  InviteRole,
  Invitation,
  ManagedAccount,
  Operations,
} from "./admin-model";

export type AdminPageState = Readonly<{
  readonly operations: Operations | null;
  readonly adminDashboard: AdminDashboard | null;
  readonly adminOperations: AdminOperationsDashboard | null;
  readonly managedAccounts: readonly ManagedAccount[];
  readonly selectedParticipantId: string;
  readonly selectedModuleId: string;
  readonly email: string;
  readonly role: InviteRole;
  readonly invitation: Invitation | null;
  readonly assignmentOperation: AssignmentOperation | null;
  readonly busy: boolean;
  readonly error: string | null;
  readonly notice: string | null;
  readonly setOperations: Dispatch<SetStateAction<Operations | null>>;
  readonly setAdminDashboard: Dispatch<SetStateAction<AdminDashboard | null>>;
  readonly setAdminOperations: Dispatch<
    SetStateAction<AdminOperationsDashboard | null>
  >;
  readonly setManagedAccounts: Dispatch<
    SetStateAction<readonly ManagedAccount[]>
  >;
  readonly setSelectedParticipantId: Dispatch<SetStateAction<string>>;
  readonly setSelectedModuleId: Dispatch<SetStateAction<string>>;
  readonly setEmail: Dispatch<SetStateAction<string>>;
  readonly setRole: Dispatch<SetStateAction<InviteRole>>;
  readonly setInvitation: Dispatch<SetStateAction<Invitation | null>>;
  readonly setAssignmentOperation: Dispatch<
    SetStateAction<AssignmentOperation | null>
  >;
  readonly setBusy: Dispatch<SetStateAction<boolean>>;
  readonly setError: Dispatch<SetStateAction<string | null>>;
  readonly setNotice: Dispatch<SetStateAction<string | null>>;
}>;

export function useAdminPageState(): AdminPageState {
  const [operations, setOperations] = useState<Operations | null>(null);
  const [adminDashboard, setAdminDashboard] = useState<AdminDashboard | null>(
    null,
  );
  const [adminOperations, setAdminOperations] =
    useState<AdminOperationsDashboard | null>(null);
  const [managedAccounts, setManagedAccounts] = useState<
    readonly ManagedAccount[]
  >([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("PARTICIPANT");
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [assignmentOperation, setAssignmentOperation] =
    useState<AssignmentOperation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  return {
    operations,
    adminDashboard,
    adminOperations,
    managedAccounts,
    selectedParticipantId,
    selectedModuleId,
    email,
    role,
    invitation,
    assignmentOperation,
    busy,
    error,
    notice,
    setOperations,
    setAdminDashboard,
    setAdminOperations,
    setManagedAccounts,
    setSelectedParticipantId,
    setSelectedModuleId,
    setEmail,
    setRole,
    setInvitation,
    setAssignmentOperation,
    setBusy,
    setError,
    setNotice,
  };
}
