import { and, desc, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  AccountRecoveryIssueRecord,
  AccountRecoveryManagedAccount,
  AccountRecoveryRepositoryOperations,
  AccountRecoveryTarget,
  AccountRecoveryTransactionPort,
  AccountRecoveryTransactionalOperations,
  AccountStatus,
  Role,
} from "@cvg/application";

import { createAuditRepository } from "./audit-repository.js";
import { PersistenceMappingError } from "./attempt-repository.js";
import {
  accountInvitations,
  accountRecoveryRequests,
  accounts,
  sessions,
} from "./schema.js";
import type * as schema from "./schema.js";
import {
  setDatabaseSecurityContext,
  setDatabaseTokenSecurityContext,
} from "./security-context.js";
import { createSessionRepository } from "./session-repository.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

const participantRoleJson = JSON.stringify(["PARTICIPANT"]);
const supportedRoles: readonly Role[] = [
  "PARTICIPANT",
  "MODERATOR",
  "ADMIN",
  "CLINICAL_APPROVER",
  "AUDITOR",
  "AUTHOR",
];

export class AccountRecoveryConflictError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AccountRecoveryConflict";
  }
}

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new PersistenceMappingError(`${field} must not be empty`);
  }
}

function assertDate(value: Date, field: string): void {
  if (Number.isNaN(value.getTime())) {
    throw new PersistenceMappingError(`${field} must be a valid timestamp`);
  }
}

function parseStatus(value: unknown): AccountStatus {
  if (
    value !== "INVITED" &&
    value !== "ACTIVE" &&
    value !== "SUSPENDED" &&
    value !== "DEACTIVATED"
  ) {
    throw new PersistenceMappingError("account status is not supported");
  }
  return value;
}

function parseRoles(value: unknown): readonly Role[] {
  if (
    !Array.isArray(value) ||
    value.some(
      (item) =>
        typeof item !== "string" || !supportedRoles.includes(item as Role),
    )
  ) {
    throw new PersistenceMappingError("recovery roles are not supported");
  }
  return Object.freeze(value.map((item) => item as Role));
}

function parseScopes(value: unknown): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== "string" || item.trim().length === 0)
  ) {
    throw new PersistenceMappingError("recovery scopes are invalid");
  }
  return Object.freeze(value.map((item) => item as string));
}

function assertTokenHash(value: string): void {
  if (!/^[a-f0-9]{64}$/u.test(value)) {
    throw new PersistenceMappingError("tokenHash must be a SHA-256 hex digest");
  }
}

function operations(
  executor: DatabaseExecutor,
): AccountRecoveryTransactionalOperations {
  const recovery: AccountRecoveryRepositoryOperations = {
    findManaged: async (
      targetAccountId: string,
      scopeId: string,
    ): Promise<AccountRecoveryManagedAccount | null> => {
      assertNonEmpty(targetAccountId, "targetAccountId");
      assertNonEmpty(scopeId, "scopeId");
      await setDatabaseSecurityContext(executor, { scopeId });
      const rows = await executor
        .select({
          accountId: accounts.id,
          professionalEmail: accounts.professionalEmail,
          accountStatus: accounts.status,
          roles: accountInvitations.roles,
          scopes: accountInvitations.scopes,
        })
        .from(accounts)
        .innerJoin(
          accountInvitations,
          eq(accountInvitations.accountId, accounts.id),
        )
        .where(
          and(
            eq(accounts.id, targetAccountId),
            sql`${accountInvitations.roles} @> ${participantRoleJson}::jsonb`,
            sql`${accountInvitations.scopes} @> ${JSON.stringify([scopeId])}::jsonb`,
            isNotNull(accountInvitations.acceptedAt),
          ),
        )
        .orderBy(desc(accountInvitations.createdAt))
        .limit(1);
      const row = rows[0];
      if (row === undefined) return null;
      return Object.freeze({
        accountId: row.accountId,
        professionalEmail: row.professionalEmail,
        accountStatus: parseStatus(row.accountStatus),
        roles: parseRoles(row.roles),
        scopes: parseScopes(row.scopes),
        scopeId,
      });
    },
    revokeSessions: async (
      accountId: string,
      scopeId: string,
      revokedAt: Date,
    ): Promise<number> => {
      assertNonEmpty(accountId, "accountId");
      assertNonEmpty(scopeId, "scopeId");
      assertDate(revokedAt, "revokedAt");
      await setDatabaseSecurityContext(executor, { scopeId });
      const revoked = await executor
        .update(sessions)
        .set({ revokedAt })
        .where(
          and(eq(sessions.accountId, accountId), isNull(sessions.revokedAt)),
        )
        .returning({ id: sessions.id });
      return revoked.length;
    },
    invalidateAndCreate: async (
      input: AccountRecoveryIssueRecord,
    ): Promise<void> => {
      assertNonEmpty(input.recoveryId, "recoveryId");
      assertNonEmpty(input.accountId, "accountId");
      assertNonEmpty(input.scopeId, "scopeId");
      assertNonEmpty(input.createdBy, "createdBy");
      assertTokenHash(input.tokenHash);
      assertDate(input.expiresAt, "expiresAt");
      assertDate(input.createdAt, "createdAt");
      if (input.expiresAt <= input.createdAt) {
        throw new PersistenceMappingError("expiresAt must be after createdAt");
      }
      await setDatabaseSecurityContext(executor, { scopeId: input.scopeId });
      await executor
        .update(accountRecoveryRequests)
        .set({ revokedAt: input.createdAt })
        .where(
          and(
            eq(accountRecoveryRequests.accountId, input.accountId),
            eq(accountRecoveryRequests.scopeId, input.scopeId),
            isNull(accountRecoveryRequests.consumedAt),
            isNull(accountRecoveryRequests.revokedAt),
          ),
        );
      await executor.insert(accountRecoveryRequests).values({
        id: input.recoveryId,
        accountId: input.accountId,
        scopeId: input.scopeId,
        tokenHash: input.tokenHash,
        roles: input.roles,
        scopes: input.scopes,
        expiresAt: input.expiresAt,
        consumedAt: null,
        revokedAt: null,
        createdBy: input.createdBy,
        createdAt: input.createdAt,
      });
    },
    findActive: async (
      tokenHash: string,
      now: Date,
    ): Promise<AccountRecoveryTarget | null> => {
      assertTokenHash(tokenHash);
      assertDate(now, "now");
      await setDatabaseTokenSecurityContext(executor, {
        kind: "recovery",
        tokenHash,
      });
      const rows = await executor
        .select({
          recoveryId: accountRecoveryRequests.id,
          accountId: accountRecoveryRequests.accountId,
          scopeId: accountRecoveryRequests.scopeId,
          professionalEmail: accounts.professionalEmail,
          accountStatus: accounts.status,
          roles: accountRecoveryRequests.roles,
          scopes: accountRecoveryRequests.scopes,
        })
        .from(accountRecoveryRequests)
        .innerJoin(accounts, eq(accountRecoveryRequests.accountId, accounts.id))
        .where(
          and(
            eq(accountRecoveryRequests.tokenHash, tokenHash),
            isNull(accountRecoveryRequests.consumedAt),
            isNull(accountRecoveryRequests.revokedAt),
            gt(accountRecoveryRequests.expiresAt, now),
            eq(accounts.status, "ACTIVE"),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (row === undefined) return null;
      return Object.freeze({
        recoveryId: row.recoveryId,
        accountId: row.accountId,
        professionalEmail: row.professionalEmail,
        accountStatus: parseStatus(row.accountStatus),
        roles: parseRoles(row.roles),
        scopes: parseScopes(row.scopes),
        scopeId: row.scopeId,
      });
    },
    consume: async (recoveryId: string, consumedAt: Date): Promise<void> => {
      assertNonEmpty(recoveryId, "recoveryId");
      assertDate(consumedAt, "consumedAt");
      const consumed = await executor
        .update(accountRecoveryRequests)
        .set({ consumedAt })
        .where(
          and(
            eq(accountRecoveryRequests.id, recoveryId),
            isNull(accountRecoveryRequests.consumedAt),
            isNull(accountRecoveryRequests.revokedAt),
            gt(accountRecoveryRequests.expiresAt, consumedAt),
          ),
        )
        .returning({ id: accountRecoveryRequests.id });
      if (consumed.length === 0) {
        throw new AccountRecoveryConflictError("recovery was already consumed");
      }
    },
  };
  return Object.freeze({
    recovery,
    sessions: createSessionRepository(executor),
    audit: createAuditRepository(executor),
  });
}

export function createAccountRecoveryTransaction(
  db: DatabaseExecutor,
): AccountRecoveryTransactionPort {
  return Object.freeze({
    run: async <Result>(
      work: (
        current: AccountRecoveryTransactionalOperations,
      ) => Promise<Result>,
    ): Promise<Result> =>
      db.transaction(async (transaction) =>
        work(operations(transaction as unknown as DatabaseExecutor)),
      ),
  });
}

export { PersistenceMappingError } from "./attempt-repository.js";
