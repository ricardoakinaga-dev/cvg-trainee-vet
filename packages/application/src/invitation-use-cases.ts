import { createHash, randomBytes, randomUUID } from "node:crypto";

import {
  createSession,
  type CreateSessionInput,
  type CreatedSession,
  type SessionRepositoryPort,
} from "./session.js";
import { createAuditEntry, type AuditPort } from "./audit.js";
import { canAccess, type AccountStatus, type Role } from "./authorization.js";
import { ApplicationError, toApplicationError } from "./errors.js";

export type InvitationRecord = Readonly<{
  readonly invitationId: string;
  readonly accountId: string;
  readonly professionalEmail: string;
  readonly tokenHash: string;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly expiresAt: Date;
  readonly acceptedAt: Date | null;
  readonly createdBy: string;
  readonly createdAt: Date;
}>;

export type CreateInvitationCommand = Readonly<{
  readonly principalId: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly professionalEmail: string;
  readonly invitedRoles: readonly Role[];
  readonly invitedScopes: readonly string[];
  readonly expiresInSeconds: number;
  readonly correlationId: string;
  readonly accountIdFactory?: () => string;
  readonly invitationIdFactory?: () => string;
  readonly tokenFactory?: () => string;
}>;

export type CreatedInvitation = Readonly<{
  readonly invitationId: string;
  readonly accountId: string;
  readonly professionalEmail: string;
  readonly token: string;
  readonly expiresAt: Date;
}>;

export type AcceptInvitationCommand = Readonly<{
  readonly token: string;
  readonly sessionExpiresInSeconds: number;
  readonly correlationId: string;
  readonly now?: Date;
  readonly sessionTokenFactory?: () => string;
  readonly sessionIdFactory?: () => string;
}>;

export type AcceptedInvitation = Readonly<{
  readonly accountId: string;
  readonly session: CreatedSession;
}>;

export interface InvitationAccountPort {
  readonly createInvited: (
    input: Readonly<{
      readonly accountId: string;
      readonly professionalEmail: string;
    }>,
  ) => Promise<void>;
  readonly activate: (accountId: string) => Promise<void>;
}

export interface InvitationPort {
  readonly create: (record: InvitationRecord) => Promise<void>;
  readonly findActive: (
    tokenHash: string,
    now: Date,
  ) => Promise<InvitationRecord | null>;
  readonly accept: (invitationId: string, acceptedAt: Date) => Promise<void>;
}

export interface InvitationTransactionalOperations {
  readonly account: InvitationAccountPort;
  readonly invitation: InvitationPort;
  readonly sessions: SessionRepositoryPort;
  readonly audit: AuditPort;
}

export interface InvitationTransactionPort {
  readonly run: <Result>(
    work: (operations: InvitationTransactionalOperations) => Promise<Result>,
  ) => Promise<Result>;
}

export interface InvitationUseCaseDependencies {
  readonly idFactory: () => string;
  readonly transaction: InvitationTransactionPort;
}

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new ApplicationError(
      "validation_error",
      "professionalEmail is invalid",
    );
  }
  return email;
}

function assertLifetime(seconds: number, field: string): void {
  if (
    !Number.isInteger(seconds) ||
    seconds < 60 ||
    seconds > 7 * 24 * 60 * 60
  ) {
    throw new ApplicationError(
      "validation_error",
      `${field} is outside the allowed range`,
    );
  }
}

function defaultTokenFactory(): string {
  return randomBytes(32).toString("base64url");
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function normalizeInvitationError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) return error;
  return toApplicationError(error);
}

export async function createInvitation(
  command: CreateInvitationCommand,
  dependencies: InvitationUseCaseDependencies,
): Promise<CreatedInvitation> {
  assertNonEmpty(command.principalId, "principalId");
  assertNonEmpty(command.correlationId, "correlationId");
  const professionalEmail = normalizeEmail(command.professionalEmail);
  assertLifetime(command.expiresInSeconds, "expiresInSeconds");
  const invitedScopeId = command.invitedScopes[0];
  if (
    invitedScopeId === undefined ||
    command.invitedScopes.some((scopeId) => !command.scopes.includes(scopeId))
  ) {
    throw new ApplicationError(
      "forbidden",
      "Invitation scopes must be within the administrator scope",
    );
  }
  if (
    !canAccess({
      principalId: command.principalId,
      accountStatus: command.accountStatus,
      roles: command.roles,
      capability: "MANAGE_ACCOUNT_LIFECYCLE",
      resource: { scopeId: invitedScopeId },
      scopes: command.scopes,
    })
  ) {
    throw new ApplicationError("forbidden", "Invitation is not authorized");
  }

  const token = (command.tokenFactory ?? defaultTokenFactory)();
  if (!/^[A-Za-z0-9_-]{32,256}$/u.test(token)) {
    throw new ApplicationError(
      "validation_error",
      "Invitation token is invalid",
    );
  }
  const accountId = (command.accountIdFactory ?? randomUUID)();
  const invitationId = (command.invitationIdFactory ?? randomUUID)();
  assertNonEmpty(accountId, "accountId");
  assertNonEmpty(invitationId, "invitationId");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + command.expiresInSeconds * 1_000);
  const record: InvitationRecord = Object.freeze({
    invitationId,
    accountId,
    professionalEmail,
    tokenHash: tokenHash(token),
    roles: Object.freeze([...command.invitedRoles]),
    scopes: Object.freeze([...command.invitedScopes]),
    expiresAt,
    acceptedAt: null,
    createdBy: command.principalId,
    createdAt: now,
  });

  try {
    await dependencies.transaction.run(async (operations) => {
      await operations.account.createInvited({ accountId, professionalEmail });
      await operations.invitation.create(record);
      await operations.audit.append(
        createAuditEntry({
          auditId: dependencies.idFactory(),
          principalId: command.principalId,
          action: "invitation.created",
          resourceType: "account_invitation",
          resourceId: invitationId,
          scopeId: invitedScopeId,
          outcome: "SUCCESS",
          reasonCode: "internal_admin_invitation",
          requestId: command.correlationId,
          correlationId: command.correlationId,
          occurredAt: now.toISOString(),
        }),
      );
    });
  } catch (error) {
    throw normalizeInvitationError(error);
  }

  return Object.freeze({
    invitationId,
    accountId,
    professionalEmail,
    token,
    expiresAt,
  });
}

export async function acceptInvitation(
  command: AcceptInvitationCommand,
  dependencies: InvitationUseCaseDependencies,
): Promise<AcceptedInvitation> {
  assertNonEmpty(command.token, "token");
  assertNonEmpty(command.correlationId, "correlationId");
  assertLifetime(command.sessionExpiresInSeconds, "sessionExpiresInSeconds");
  const now = command.now ?? new Date();
  if (Number.isNaN(now.getTime())) {
    throw new ApplicationError("validation_error", "now is invalid");
  }
  if (!/^[A-Za-z0-9_-]{32,256}$/u.test(command.token)) {
    throw new ApplicationError("not_found", "Invitation is not available");
  }

  try {
    return await dependencies.transaction.run(async (operations) => {
      const invitation = await operations.invitation.findActive(
        tokenHash(command.token),
        now,
      );
      if (invitation === null) {
        throw new ApplicationError("not_found", "Invitation is not available");
      }
      const invitationScopeId = invitation.scopes[0];
      if (invitationScopeId === undefined) {
        throw new ApplicationError(
          "internal_error",
          "Invitation has no governed scope",
        );
      }

      await operations.account.activate(invitation.accountId);
      await operations.invitation.accept(invitation.invitationId, now);
      const sessionInput: CreateSessionInput = {
        accountId: invitation.accountId,
        accountStatus: "ACTIVE",
        roles: invitation.roles,
        scopes: invitation.scopes,
        expiresInSeconds: command.sessionExpiresInSeconds,
        ...(command.sessionTokenFactory === undefined
          ? {}
          : { tokenFactory: command.sessionTokenFactory }),
        ...(command.sessionIdFactory === undefined
          ? {}
          : { sessionIdFactory: command.sessionIdFactory }),
      };
      const session = await createSession(
        sessionInput,
        operations.sessions,
        now,
      );
      await operations.audit.append(
        createAuditEntry({
          auditId: dependencies.idFactory(),
          principalId: invitation.accountId,
          action: "invitation.accepted",
          resourceType: "account_invitation",
          resourceId: invitation.invitationId,
          scopeId: invitationScopeId,
          outcome: "SUCCESS",
          reasonCode: "one_time_invitation_accepted",
          requestId: command.correlationId,
          correlationId: command.correlationId,
          occurredAt: now.toISOString(),
        }),
      );
      return Object.freeze({ accountId: invitation.accountId, session });
    });
  } catch (error) {
    throw normalizeInvitationError(error);
  }
}
