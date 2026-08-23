import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { AuditEntry } from "./audit.js";
import { canAccess, type AccountStatus, type Role } from "./authorization.js";
import { ApplicationError } from "./errors.js";
import type { CreatedInvitation } from "./invitation-use-cases.js";

export type ManagedAccountStatus = Exclude<AccountStatus, "INVITED">;

export type AccountStatusChangeCommand = Readonly<{
  readonly principalId: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly targetAccountId: string;
  readonly scopeId: string;
  readonly expectedStatus: AccountStatus;
  readonly status: ManagedAccountStatus;
  readonly correlationId: string;
  readonly now?: Date;
}>;

export type AccountStatusChangeResult = Readonly<{
  readonly accountId: string;
  readonly status: ManagedAccountStatus;
  readonly revokedSessions: number;
}>;

export type ResendAccountInvitationCommand = Readonly<{
  readonly principalId: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly targetAccountId: string;
  readonly scopeId: string;
  readonly expiresInSeconds: number;
  readonly correlationId: string;
  readonly now?: Date;
  readonly tokenFactory?: () => string;
  readonly invitationIdFactory?: () => string;
}>;

export type ResendAccountInvitationResult = CreatedInvitation;

export type AccountManagementStatusInput = Readonly<{
  readonly targetAccountId: string;
  readonly scopeId: string;
  readonly expectedStatus: AccountStatus;
  readonly status: ManagedAccountStatus;
  readonly principalId: string;
  readonly now: Date;
  readonly audit: AuditEntry;
}>;

export type AccountManagementResendInput = Readonly<{
  readonly targetAccountId: string;
  readonly scopeId: string;
  readonly principalId: string;
  readonly invitationId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly audit: AuditEntry;
}>;

export type AccountManagementResendTarget = Readonly<{
  readonly accountId: string;
  readonly professionalEmail: string;
  readonly expiresAt: Date;
}>;

export type AccountManagementRepositoryPort = Readonly<{
  readonly changeStatus: (
    input: AccountManagementStatusInput,
  ) => Promise<AccountStatusChangeResult | null>;
  readonly resendInvitation: (
    input: AccountManagementResendInput,
  ) => Promise<AccountManagementResendTarget | null>;
}>;

export type AccountManagementUseCaseDependencies = Readonly<{
  readonly repository: AccountManagementRepositoryPort;
  readonly idFactory: () => string;
}>;

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function assertDate(value: Date, field: string): void {
  if (Number.isNaN(value.getTime())) {
    throw new ApplicationError("validation_error", `${field} is invalid`);
  }
}

function assertManagedStatus(
  value: string,
): asserts value is ManagedAccountStatus {
  if (value !== "ACTIVE" && value !== "SUSPENDED" && value !== "DEACTIVATED") {
    throw new ApplicationError("validation_error", "status is invalid");
  }
}

function assertAccountStatus(value: string): asserts value is AccountStatus {
  if (
    value !== "INVITED" &&
    value !== "ACTIVE" &&
    value !== "SUSPENDED" &&
    value !== "DEACTIVATED"
  ) {
    throw new ApplicationError("validation_error", "expectedStatus is invalid");
  }
}

function assertAuthorized(command: {
  readonly principalId: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly scopeId: string;
}): void {
  if (
    !canAccess({
      principalId: command.principalId,
      accountStatus: command.accountStatus,
      roles: command.roles,
      capability: "MANAGE_ACCOUNT_LIFECYCLE",
      resource: { scopeId: command.scopeId },
      scopes: command.scopes,
    })
  ) {
    throw new ApplicationError(
      "forbidden",
      "Account lifecycle action is not authorized",
    );
  }
}

function normalizeRepositoryError(error: unknown): never {
  if (error instanceof ApplicationError) throw error;
  if (error instanceof Error && error.name.includes("Conflict")) {
    throw new ApplicationError("state_conflict", "Account state changed");
  }
  throw new ApplicationError("internal_error", "Account lifecycle failed");
}

export async function changeAccountStatus(
  command: AccountStatusChangeCommand,
  dependencies: AccountManagementUseCaseDependencies,
): Promise<AccountStatusChangeResult> {
  assertNonEmpty(command.principalId, "principalId");
  assertNonEmpty(command.targetAccountId, "targetAccountId");
  assertNonEmpty(command.scopeId, "scopeId");
  assertNonEmpty(command.correlationId, "correlationId");
  assertAccountStatus(command.expectedStatus);
  assertManagedStatus(command.status);
  assertDate(command.now ?? new Date(), "now");
  if (command.principalId === command.targetAccountId) {
    throw new ApplicationError(
      "forbidden",
      "An administrator cannot change their own account through this route",
    );
  }
  assertAuthorized(command);

  const now = command.now ?? new Date();
  try {
    const result = await dependencies.repository.changeStatus({
      targetAccountId: command.targetAccountId,
      scopeId: command.scopeId,
      expectedStatus: command.expectedStatus,
      status: command.status,
      principalId: command.principalId,
      now,
      audit: {
        auditId: dependencies.idFactory(),
        principalId: command.principalId,
        action: "account.status.changed",
        resourceType: "account",
        resourceId: command.targetAccountId,
        scopeId: command.scopeId,
        outcome: "SUCCESS",
        reasonCode: "account_lifecycle_transition",
        requestId: command.correlationId,
        correlationId: command.correlationId,
        occurredAt: now.toISOString(),
      },
    });
    if (result === null) {
      throw new ApplicationError("not_found", "Account is not in this scope");
    }
    return result;
  } catch (error) {
    normalizeRepositoryError(error);
  }
}

function defaultTokenFactory(): string {
  return randomBytes(32).toString("base64url");
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function assertLifetime(seconds: number): void {
  if (!Number.isInteger(seconds) || seconds < 60 || seconds > 604_800) {
    throw new ApplicationError(
      "validation_error",
      "expiresInSeconds is outside the allowed range",
    );
  }
}

function assertToken(token: string): void {
  if (!/^[A-Za-z0-9_-]{32,256}$/u.test(token)) {
    throw new ApplicationError(
      "validation_error",
      "Invitation token is invalid",
    );
  }
}

export async function resendAccountInvitation(
  command: ResendAccountInvitationCommand,
  dependencies: AccountManagementUseCaseDependencies,
): Promise<ResendAccountInvitationResult> {
  assertNonEmpty(command.principalId, "principalId");
  assertNonEmpty(command.targetAccountId, "targetAccountId");
  assertNonEmpty(command.scopeId, "scopeId");
  assertNonEmpty(command.correlationId, "correlationId");
  assertLifetime(command.expiresInSeconds);
  assertAuthorized(command);

  const now = command.now ?? new Date();
  assertDate(now, "now");
  const token = (command.tokenFactory ?? defaultTokenFactory)();
  assertToken(token);
  const invitationId = (command.invitationIdFactory ?? randomUUID)();
  assertNonEmpty(invitationId, "invitationId");
  const expiresAt = new Date(now.getTime() + command.expiresInSeconds * 1_000);
  try {
    const target = await dependencies.repository.resendInvitation({
      targetAccountId: command.targetAccountId,
      scopeId: command.scopeId,
      principalId: command.principalId,
      invitationId,
      tokenHash: tokenHash(token),
      expiresAt,
      createdAt: now,
      audit: {
        auditId: dependencies.idFactory(),
        principalId: command.principalId,
        action: "account.invitation.resent",
        resourceType: "account_invitation",
        resourceId: invitationId,
        scopeId: command.scopeId,
        outcome: "SUCCESS",
        reasonCode: "account_lifecycle_resend",
        requestId: command.correlationId,
        correlationId: command.correlationId,
        occurredAt: now.toISOString(),
      },
    });
    if (target === null) {
      throw new ApplicationError(
        "not_found",
        "Invited account is not in this scope",
      );
    }
    return Object.freeze({
      invitationId,
      accountId: target.accountId,
      professionalEmail: target.professionalEmail,
      token,
      expiresAt: target.expiresAt,
    });
  } catch (error) {
    normalizeRepositoryError(error);
  }
}
