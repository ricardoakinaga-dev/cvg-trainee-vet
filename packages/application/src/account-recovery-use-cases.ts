import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { AuditEntry, AuditPort } from "./audit.js";
import {
  createSession,
  type CreatedSession,
  type SessionRepositoryPort,
} from "./session.js";
import { canAccess, type AccountStatus, type Role } from "./authorization.js";
import { ApplicationError, toApplicationError } from "./errors.js";

export type AccountRecoveryManagedAccount = Readonly<{
  readonly accountId: string;
  readonly professionalEmail: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly scopeId: string;
}>;

export type AccountRecoveryTarget = AccountRecoveryManagedAccount &
  Readonly<{
    readonly recoveryId: string;
  }>;

export type AccountRecoveryIssueRecord = Readonly<{
  readonly recoveryId: string;
  readonly accountId: string;
  readonly scopeId: string;
  readonly tokenHash: string;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly expiresAt: Date;
  readonly createdBy: string;
  readonly createdAt: Date;
}>;

export type AccountRecoveryIssueCommand = Readonly<{
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
  readonly recoveryIdFactory?: () => string;
}>;

export type AccountRecoveryIssueResult = Readonly<{
  readonly recoveryId: string;
  readonly accountId: string;
  readonly professionalEmail: string;
  readonly token: string;
  readonly expiresAt: Date;
  readonly revokedSessions: number;
}>;

export type AccountRecoveryAcceptCommand = Readonly<{
  readonly token: string;
  readonly sessionExpiresInSeconds: number;
  readonly correlationId: string;
  readonly now?: Date;
  readonly sessionTokenFactory?: () => string;
  readonly sessionIdFactory?: () => string;
}>;

export type AccountRecoveryAccepted = Readonly<{
  readonly accountId: string;
  readonly session: CreatedSession;
}>;

export interface AccountRecoveryRepositoryOperations {
  readonly findManaged: (
    targetAccountId: string,
    scopeId: string,
  ) => Promise<AccountRecoveryManagedAccount | null>;
  readonly revokeSessions: (
    accountId: string,
    scopeId: string,
    revokedAt: Date,
  ) => Promise<number>;
  readonly invalidateAndCreate: (
    input: AccountRecoveryIssueRecord,
  ) => Promise<void>;
  readonly findActive: (
    tokenHash: string,
    now: Date,
  ) => Promise<AccountRecoveryTarget | null>;
  readonly consume: (recoveryId: string, consumedAt: Date) => Promise<void>;
}

export interface AccountRecoveryTransactionalOperations {
  readonly recovery: AccountRecoveryRepositoryOperations;
  readonly sessions: SessionRepositoryPort;
  readonly audit: AuditPort;
}

export interface AccountRecoveryTransactionPort {
  readonly run: <Result>(
    work: (
      operations: AccountRecoveryTransactionalOperations,
    ) => Promise<Result>,
  ) => Promise<Result>;
}

export interface AccountRecoveryUseCaseDependencies {
  readonly idFactory: () => string;
  readonly transaction: AccountRecoveryTransactionPort;
}

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

function assertAccountStatus(value: string): asserts value is AccountStatus {
  if (
    value !== "INVITED" &&
    value !== "ACTIVE" &&
    value !== "SUSPENDED" &&
    value !== "DEACTIVATED"
  ) {
    throw new ApplicationError("validation_error", "accountStatus is invalid");
  }
}

function assertAuthorized(command: AccountRecoveryIssueCommand): void {
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
      "Account recovery is not authorized",
    );
  }
}

function assertRecoveryLifetime(seconds: number): void {
  if (!Number.isInteger(seconds) || seconds < 60 || seconds > 1_800) {
    throw new ApplicationError(
      "validation_error",
      "expiresInSeconds is outside the allowed recovery range",
    );
  }
}

function assertSessionLifetime(seconds: number): void {
  if (!Number.isInteger(seconds) || seconds < 60 || seconds > 604_800) {
    throw new ApplicationError(
      "validation_error",
      "sessionExpiresInSeconds is outside the allowed range",
    );
  }
}

function defaultTokenFactory(): string {
  return randomBytes(32).toString("base64url");
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function assertToken(
  token: string,
  code: "validation_error" | "not_found",
): void {
  if (!/^[A-Za-z0-9_-]{32,256}$/u.test(token)) {
    throw new ApplicationError(
      code,
      code === "not_found"
        ? "Recovery is not available"
        : "Recovery token is invalid",
    );
  }
}

function normalizeRecoveryError(error: unknown): never {
  if (error instanceof ApplicationError) throw error;
  if (
    error instanceof Error &&
    error.name.includes("AccountRecoveryConflict")
  ) {
    throw new ApplicationError(
      "state_conflict",
      "Recovery is no longer available",
    );
  }
  throw toApplicationError(error);
}

export async function issueAccountRecovery(
  command: AccountRecoveryIssueCommand,
  dependencies: AccountRecoveryUseCaseDependencies,
): Promise<AccountRecoveryIssueResult> {
  assertNonEmpty(command.principalId, "principalId");
  assertNonEmpty(command.targetAccountId, "targetAccountId");
  assertNonEmpty(command.scopeId, "scopeId");
  assertNonEmpty(command.correlationId, "correlationId");
  assertAccountStatus(command.accountStatus);
  assertRecoveryLifetime(command.expiresInSeconds);
  assertAuthorized(command);
  if (command.principalId === command.targetAccountId) {
    throw new ApplicationError(
      "forbidden",
      "An administrator cannot recover their own account through this route",
    );
  }

  const now = command.now ?? new Date();
  assertDate(now, "now");
  const token = (command.tokenFactory ?? defaultTokenFactory)();
  assertToken(token, "validation_error");
  const recoveryId = (command.recoveryIdFactory ?? randomUUID)();
  assertNonEmpty(recoveryId, "recoveryId");
  const expiresAt = new Date(now.getTime() + command.expiresInSeconds * 1_000);

  try {
    return await dependencies.transaction.run(async (operations) => {
      const target = await operations.recovery.findManaged(
        command.targetAccountId,
        command.scopeId,
      );
      if (target === null) {
        throw new ApplicationError("not_found", "Account is not in this scope");
      }
      if (target.accountStatus !== "ACTIVE") {
        throw new ApplicationError(
          "state_conflict",
          "Account must be active before recovery",
        );
      }
      const revokedSessions = await operations.recovery.revokeSessions(
        target.accountId,
        command.scopeId,
        now,
      );
      await operations.recovery.invalidateAndCreate({
        recoveryId,
        accountId: target.accountId,
        scopeId: command.scopeId,
        tokenHash: tokenHash(token),
        roles: target.roles,
        scopes: target.scopes,
        expiresAt,
        createdBy: command.principalId,
        createdAt: now,
      });
      await operations.audit.append({
        auditId: dependencies.idFactory(),
        principalId: command.principalId,
        action: "account.recovery.issued",
        resourceType: "account_recovery",
        resourceId: recoveryId,
        scopeId: command.scopeId,
        outcome: "SUCCESS",
        reasonCode: "controlled_access_recovery_issued",
        requestId: command.correlationId,
        correlationId: command.correlationId,
        occurredAt: now.toISOString(),
      } satisfies AuditEntry);
      return Object.freeze({
        recoveryId,
        accountId: target.accountId,
        professionalEmail: target.professionalEmail,
        token,
        expiresAt,
        revokedSessions,
      });
    });
  } catch (error) {
    normalizeRecoveryError(error);
  }
}

export async function acceptAccountRecovery(
  command: AccountRecoveryAcceptCommand,
  dependencies: AccountRecoveryUseCaseDependencies,
): Promise<AccountRecoveryAccepted> {
  assertNonEmpty(command.correlationId, "correlationId");
  assertSessionLifetime(command.sessionExpiresInSeconds);
  assertToken(command.token, "not_found");
  const now = command.now ?? new Date();
  assertDate(now, "now");

  try {
    return await dependencies.transaction.run(async (operations) => {
      const target = await operations.recovery.findActive(
        tokenHash(command.token),
        now,
      );
      if (target === null) {
        throw new ApplicationError("not_found", "Recovery is not available");
      }
      await operations.recovery.consume(target.recoveryId, now);
      const session = await createSession(
        {
          accountId: target.accountId,
          accountStatus: "ACTIVE",
          roles: target.roles,
          scopes: target.scopes,
          expiresInSeconds: command.sessionExpiresInSeconds,
          ...(command.sessionTokenFactory === undefined
            ? {}
            : { tokenFactory: command.sessionTokenFactory }),
          ...(command.sessionIdFactory === undefined
            ? {}
            : { sessionIdFactory: command.sessionIdFactory }),
        },
        operations.sessions,
        now,
      );
      await operations.audit.append({
        auditId: dependencies.idFactory(),
        principalId: target.accountId,
        action: "account.recovery.accepted",
        resourceType: "account_recovery",
        resourceId: target.recoveryId,
        scopeId: target.scopeId,
        outcome: "SUCCESS",
        reasonCode: "controlled_access_recovery_accepted",
        requestId: command.correlationId,
        correlationId: command.correlationId,
        occurredAt: now.toISOString(),
      } satisfies AuditEntry);
      return Object.freeze({ accountId: target.accountId, session });
    });
  } catch (error) {
    normalizeRecoveryError(error);
  }
}
