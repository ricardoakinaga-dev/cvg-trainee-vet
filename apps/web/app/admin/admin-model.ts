import {
  adminDashboardProjectionSchema,
  adminOperationsDashboardProjectionSchema,
  managedAccountPageProjectionSchema,
  operationsDashboardProjectionSchema,
} from "@cvg/contracts";
import type {
  AdminDashboardProjection,
  AdminOperationsDashboardProjection,
  ManagedAccountPageProjection,
  ManagedAccountProjection,
  OperationsDashboardProjection,
} from "@cvg/contracts";

export type Operations = OperationsDashboardProjection;
export type AdminDashboard = AdminDashboardProjection;
export type AdminDashboardParticipant = AdminDashboard["participants"][number];
export type AdminOperationsDashboard = AdminOperationsDashboardProjection;

export type InviteRole =
  "PARTICIPANT" | "MODERATOR" | "CLINICAL_APPROVER" | "AUDITOR" | "AUTHOR";

export type Invitation = Readonly<{
  readonly professionalEmail: string;
  readonly token: string;
  readonly expiresAt: string;
}>;

export type AssignmentOperation = Readonly<{
  readonly assignmentId: string;
  readonly participantId: string;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly availableAt: string;
  readonly version: number;
  readonly nextEvent: "ATRIBUIR" | "DISPONIBILIZAR";
}>;

export type ManagedAccount = ManagedAccountProjection;
export type ManagedAccountPage = ManagedAccountPageProjection;

export type ApiRecord = Readonly<Record<string, unknown>>;
export const apiBase = process.env.NEXT_PUBLIC_CVG_API_BASE_URL ?? "";
export const invitationQueryParameter = "token";

export const inviteRoleOptions: readonly Readonly<{
  readonly value: InviteRole;
  readonly label: string;
}>[] = [
  { value: "PARTICIPANT", label: "Participante — trilha de treinamento" },
  { value: "MODERATOR", label: "Operação — acompanhamento" },
  { value: "AUTHOR", label: "Autor — criação de conteúdo" },
  { value: "CLINICAL_APPROVER", label: "Revisor clínico" },
  { value: "AUDITOR", label: "Auditoria" },
];

export function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isOperations(value: unknown): value is Operations {
  return operationsDashboardProjectionSchema.safeParse(value).success;
}

export function isAdminDashboard(value: unknown): value is AdminDashboard {
  return adminDashboardProjectionSchema.safeParse(value).success;
}

export function isAdminOperationsDashboard(
  value: unknown,
): value is AdminOperationsDashboard {
  return adminOperationsDashboardProjectionSchema.safeParse(value).success;
}

export function isInvitation(value: unknown): value is Invitation {
  return (
    isRecord(value) &&
    typeof value.professionalEmail === "string" &&
    /^[A-Za-z0-9_-]{32,256}$/u.test(
      typeof value.token === "string" ? value.token : "",
    ) &&
    typeof value.expiresAt === "string"
  );
}

export function isManagedAccount(value: unknown): value is ManagedAccount {
  return managedAccountPageProjectionSchema.safeParse({
    accounts: [value],
    nextCursor: null,
  }).success;
}

export function isManagedAccountPage(
  value: unknown,
): value is ManagedAccountPage {
  return managedAccountPageProjectionSchema.safeParse(value).success;
}

export function formatExpiration(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

export function formatAccountStatus(
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
