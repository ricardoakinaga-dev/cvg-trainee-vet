import { createHash } from "node:crypto";

import { createAuditEntry, type AuditPort } from "./audit.js";
import { ApplicationError } from "./errors.js";
import { canAccess, type AccountStatus, type Role } from "./authorization.js";

const accountStatuses: readonly AccountStatus[] = [
  "INVITED",
  "ACTIVE",
  "SUSPENDED",
  "DEACTIVATED",
];
const manageableRoles: readonly Role[] = [
  "PARTICIPANT",
  "MODERATOR",
  "CLINICAL_APPROVER",
  "AUDITOR",
  "AUTHOR",
];
const maxAccountPageSize = 200;

export type ManagedAccount = Readonly<{
  readonly accountId: string;
  readonly professionalEmail: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}>;

export type AccountManagementListQuery = Readonly<{
  readonly status?: AccountStatus;
  readonly scopeId?: string;
  readonly limit: number;
}>;

export type AccountManagementListResult = Readonly<{
  readonly accounts: readonly ManagedAccount[];
  readonly nextCursor: string | null;
}>;

export type AccountManagementUpdateInput = Readonly<{
  readonly accountId: string;
  readonly expectedVersion: number;
  readonly status?: AccountStatus;
  readonly roles?: readonly Role[];
  readonly scopes?: readonly string[];
}>;

export interface AccountManagementAccountPort {
  readonly list: (
    query: AccountManagementListQuery,
  ) => Promise<AccountManagementListResult>;
  readonly findById: (accountId: string) => Promise<ManagedAccount | null>;
  readonly update: (
    input: AccountManagementUpdateInput,
  ) => Promise<ManagedAccount | null>;
}

export interface AccountManagementSessionPort {
  readonly revokeAll: (accountId: string, revokedAt: Date) => Promise<number>;
}

export interface AccountManagementTransactionalOperations {
  readonly accounts: AccountManagementAccountPort;
  readonly sessions: AccountManagementSessionPort;
  readonly audit: AuditPort;
}

export interface AccountManagementTransactionPort {
  readonly run: <Result>(
    work: (
      operations: AccountManagementTransactionalOperations,
    ) => Promise<Result>,
  ) => Promise<Result>;
}

export interface AccountManagementUseCaseDependencies {
  readonly idFactory: () => string;
  readonly transaction: AccountManagementTransactionPort;
}

export type AccountManagementPrincipal = Readonly<{
  readonly principalId: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
}>;

export type ListManagedAccountsCommand = AccountManagementPrincipal &
  Readonly<{
    readonly limit: number;
    readonly status?: AccountStatus;
    readonly scopeId?: string;
    readonly correlationId: string;
  }>;

export type UpdateManagedAccountCommand = AccountManagementPrincipal &
  Readonly<{
    readonly targetAccountId: string;
    readonly expectedVersion: number;
    readonly nextStatus?: AccountStatus;
    readonly nextRoles?: readonly Role[];
    readonly nextScopes?: readonly string[];
    readonly correlationId: string;
    readonly now?: Date;
  }>;

export type RevokeManagedAccountSessionsCommand = AccountManagementPrincipal &
  Readonly<{
    readonly targetAccountId: string;
    readonly correlationId: string;
    readonly now?: Date;
  }>;

export type RevokedManagedAccountSessions = Readonly<{
  readonly accountId: string;
  readonly revokedCount: number;
}>;

function assertNonEmpty(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function containsControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) as number;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}

function assertCorrelationId(value: string): void {
  assertNonEmpty(value, "correlationId");
  if (value.length > 256 || containsControlCharacter(value)) {
    throw new ApplicationError("validation_error", "correlationId is invalid");
  }
}

function assertDate(value: Date, field: string): void {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new ApplicationError("validation_error", `${field} is invalid`);
  }
}

function assertAccountStatus(
  value: AccountStatus | undefined,
  field: string,
): void {
  if (value !== undefined && !accountStatuses.includes(value)) {
    throw new ApplicationError("validation_error", `${field} is invalid`);
  }
}

function normalizeStringArray(
  values: readonly string[] | undefined,
  field: string,
  max: number,
): readonly string[] | undefined {
  if (values === undefined) return undefined;
  if (
    values.length > max ||
    values.some(
      (value) =>
        typeof value !== "string" ||
        value.trim().length === 0 ||
        value.length > 128 ||
        containsControlCharacter(value),
    )
  ) {
    throw new ApplicationError("validation_error", `${field} is invalid`);
  }
  return Object.freeze([...new Set(values.map((value) => value.trim()))]);
}

function normalizeRoles(
  values: readonly Role[] | undefined,
): readonly Role[] | undefined {
  const normalized = normalizeStringArray(
    values,
    "roles",
    manageableRoles.length,
  );
  if (normalized === undefined) return undefined;
  if (normalized.some((role) => !manageableRoles.includes(role as Role))) {
    throw new ApplicationError(
      "forbidden",
      "ADMIN role is provisioned out of band",
    );
  }
  return Object.freeze(normalized as readonly Role[]);
}

function normalizeScopes(
  values: readonly string[] | undefined,
): readonly string[] | undefined {
  return normalizeStringArray(values, "scopes", 32);
}

function assertManageAccounts(principal: AccountManagementPrincipal): void {
  assertNonEmpty(principal.principalId, "principalId");
  if (
    !canAccess({
      principalId: principal.principalId,
      accountStatus: principal.accountStatus,
      roles: principal.roles,
      capability: "MANAGE_ACCOUNTS",
      scopes: principal.scopes,
    })
  ) {
    throw new ApplicationError(
      "forbidden",
      "Account management is not authorized",
    );
  }
}

function assertPrincipalScopes(
  principalScopes: readonly string[],
): readonly string[] {
  const scopes = normalizeScopes(principalScopes);
  if (scopes === undefined || scopes.length === 0) {
    throw new ApplicationError(
      "forbidden",
      "Account management scope is empty",
    );
  }
  return scopes;
}

function assertTargetInScope(
  target: ManagedAccount,
  principal: AccountManagementPrincipal,
  requestedScopes?: readonly string[],
): void {
  const principalScopes = assertPrincipalScopes(principal.scopes);
  if (!target.scopes.some((scope) => principalScopes.includes(scope))) {
    throw new ApplicationError(
      "forbidden",
      "Account is outside the administrator scope",
    );
  }
  if (
    requestedScopes !== undefined &&
    requestedScopes.some((scope) => !principalScopes.includes(scope))
  ) {
    throw new ApplicationError(
      "forbidden",
      "Account scope is outside the administrator scope",
    );
  }
}

function assertMutableTarget(
  target: ManagedAccount,
  principal: AccountManagementPrincipal,
): void {
  if (target.accountId === principal.principalId) {
    throw new ApplicationError(
      "forbidden",
      "An administrator cannot mutate their own account",
    );
  }
  if (target.roles.includes("ADMIN")) {
    throw new ApplicationError(
      "forbidden",
      "ADMIN accounts are managed out of band",
    );
  }
}

function accountHash(account: ManagedAccount): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        accountId: account.accountId,
        professionalEmail: account.professionalEmail,
        accountStatus: account.accountStatus,
        roles: [...account.roles].sort(),
        scopes: [...account.scopes].sort(),
        version: account.version,
      }),
      "utf8",
    )
    .digest("hex");
}

async function findScopedTarget(
  targetAccountId: string,
  principal: AccountManagementPrincipal,
  operations: AccountManagementTransactionalOperations,
): Promise<ManagedAccount> {
  assertNonEmpty(targetAccountId, "targetAccountId");
  const target = await operations.accounts.findById(targetAccountId);
  if (target === null)
    throw new ApplicationError("not_found", "Account is not available");
  assertTargetInScope(target, principal);
  return target;
}

export async function listManagedAccounts(
  command: ListManagedAccountsCommand,
  dependencies: AccountManagementUseCaseDependencies,
): Promise<AccountManagementListResult> {
  assertManageAccounts(command);
  assertCorrelationId(command.correlationId);
  if (
    !Number.isInteger(command.limit) ||
    command.limit < 1 ||
    command.limit > maxAccountPageSize
  ) {
    throw new ApplicationError(
      "validation_error",
      "limit is outside the allowed range",
    );
  }
  assertAccountStatus(command.status, "status");
  const principalScopes = assertPrincipalScopes(command.scopes);
  const scopeId = command.scopeId?.trim();
  if (scopeId !== undefined && !principalScopes.includes(scopeId)) {
    throw new ApplicationError(
      "forbidden",
      "Requested scope is outside the administrator scope",
    );
  }
  return dependencies.transaction.run(async (operations) => {
    const result = await operations.accounts.list({
      limit: command.limit,
      ...(command.status === undefined ? {} : { status: command.status }),
      ...(scopeId === undefined ? {} : { scopeId }),
    });
    const accounts = result.accounts.filter((account) =>
      account.scopes.some((scope) => principalScopes.includes(scope)),
    );
    return Object.freeze({
      accounts: Object.freeze([...accounts]),
      nextCursor: result.nextCursor,
    });
  });
}

export async function updateManagedAccount(
  command: UpdateManagedAccountCommand,
  dependencies: AccountManagementUseCaseDependencies,
): Promise<ManagedAccount> {
  assertManageAccounts(command);
  assertCorrelationId(command.correlationId);
  if (
    !Number.isInteger(command.expectedVersion) ||
    command.expectedVersion < 0
  ) {
    throw new ApplicationError(
      "validation_error",
      "expectedVersion is invalid",
    );
  }
  assertAccountStatus(command.nextStatus, "status");
  const roles = normalizeRoles(command.nextRoles);
  const scopes = normalizeScopes(command.nextScopes);
  if (
    command.nextStatus === undefined &&
    roles === undefined &&
    scopes === undefined
  ) {
    throw new ApplicationError(
      "validation_error",
      "at least one account field is required",
    );
  }
  const now = command.now ?? new Date();
  assertDate(now, "now");

  return dependencies.transaction.run(async (operations) => {
    const target = await findScopedTarget(
      command.targetAccountId,
      command,
      operations,
    );
    assertMutableTarget(target, command);
    assertTargetInScope(target, command, scopes);
    const updated = await operations.accounts.update({
      accountId: target.accountId,
      expectedVersion: command.expectedVersion,
      ...(command.nextStatus === undefined
        ? {}
        : { status: command.nextStatus }),
      ...(roles === undefined ? {} : { roles }),
      ...(scopes === undefined ? {} : { scopes }),
    });
    if (updated === null) {
      throw new ApplicationError(
        "state_conflict",
        "Account was changed by another operation",
      );
    }
    if (updated.accountStatus !== "ACTIVE") {
      await operations.sessions.revokeAll(updated.accountId, now);
    }
    const auditScopeId = updated.scopes.find((scope) =>
      command.scopes.includes(scope),
    );
    await operations.audit.append(
      createAuditEntry({
        auditId: dependencies.idFactory(),
        principalId: command.principalId,
        action: "account.updated",
        resourceType: "account",
        resourceId: updated.accountId,
        ...(auditScopeId === undefined ? {} : { scopeId: auditScopeId }),
        outcome: "SUCCESS",
        reasonCode: "admin_account_lifecycle",
        requestId: command.correlationId,
        correlationId: command.correlationId,
        beforeHash: accountHash(target),
        afterHash: accountHash(updated),
        occurredAt: now.toISOString(),
      }),
    );
    return updated;
  });
}

export async function revokeManagedAccountSessions(
  command: RevokeManagedAccountSessionsCommand,
  dependencies: AccountManagementUseCaseDependencies,
): Promise<RevokedManagedAccountSessions> {
  assertManageAccounts(command);
  assertCorrelationId(command.correlationId);
  const now = command.now ?? new Date();
  assertDate(now, "now");
  return dependencies.transaction.run(async (operations) => {
    const target = await findScopedTarget(
      command.targetAccountId,
      command,
      operations,
    );
    const revokedCount = await operations.sessions.revokeAll(
      target.accountId,
      now,
    );
    const auditScopeId = target.scopes.find((scope) =>
      command.scopes.includes(scope),
    );
    await operations.audit.append(
      createAuditEntry({
        auditId: dependencies.idFactory(),
        principalId: command.principalId,
        action: "account.sessions_revoked",
        resourceType: "account",
        resourceId: target.accountId,
        ...(auditScopeId === undefined ? {} : { scopeId: auditScopeId }),
        outcome: "SUCCESS",
        reasonCode: "admin_session_revocation",
        requestId: command.correlationId,
        correlationId: command.correlationId,
        occurredAt: now.toISOString(),
      }),
    );
    return Object.freeze({ accountId: target.accountId, revokedCount });
  });
}
