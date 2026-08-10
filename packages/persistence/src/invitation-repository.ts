import { and, eq, gt, isNull } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  InvitationRecord,
  InvitationUseCaseDependencies,
  Role,
} from "@cvg/application";

import {
  PersistenceConflictError,
  PersistenceMappingError,
} from "./attempt-repository.js";
import { createSessionRepository } from "./session-repository.js";
import { createAuditRepository } from "./audit-repository.js";
import { accountInvitations, accounts } from "./schema.js";
import type * as schema from "./schema.js";

const roles: readonly Role[] = [
  "PARTICIPANT",
  "MODERATOR",
  "ADMIN",
  "CLINICAL_APPROVER",
  "AUDITOR",
  "AUTHOR",
];

export type InvitationRowShape = Readonly<{
  readonly invitationId: string;
  readonly accountId: string;
  readonly professionalEmail: string;
  readonly tokenHash: string;
  readonly roles: unknown;
  readonly scopes: unknown;
  readonly expiresAt: Date | string;
  readonly acceptedAt: Date | string | null;
  readonly createdBy: string;
  readonly createdAt: Date | string;
}>;

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

function toDate(value: Date | string, field: string): Date {
  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(value);
  assertDate(date, field);
  return date;
}

function parseRoles(value: unknown): readonly Role[] {
  if (
    !Array.isArray(value) ||
    value.some(
      (item) => typeof item !== "string" || !roles.includes(item as Role),
    )
  ) {
    throw new PersistenceMappingError("invitation roles are not supported");
  }
  return Object.freeze(value.map((item) => item as Role));
}

function parseScopes(value: unknown): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || item.trim().length === 0)
  ) {
    throw new PersistenceMappingError("invitation scopes are invalid");
  }
  return Object.freeze(value.map((item) => item as string));
}

export function invitationRecordToRow(record: InvitationRecord) {
  assertNonEmpty(record.invitationId, "invitationId");
  assertNonEmpty(record.accountId, "accountId");
  assertNonEmpty(record.createdBy, "createdBy");
  if (!/^[a-f0-9]{64}$/u.test(record.tokenHash)) {
    throw new PersistenceMappingError("tokenHash must be a SHA-256 hex digest");
  }
  assertNonEmpty(record.professionalEmail, "professionalEmail");
  const parsedRoles = parseRoles(record.roles);
  const parsedScopes = parseScopes(record.scopes);
  const expiresAt = toDate(record.expiresAt, "expiresAt");
  const createdAt = toDate(record.createdAt, "createdAt");
  if (expiresAt <= createdAt) {
    throw new PersistenceMappingError("expiresAt must be after createdAt");
  }
  if (record.acceptedAt !== null) assertDate(record.acceptedAt, "acceptedAt");

  return {
    id: record.invitationId,
    accountId: record.accountId,
    tokenHash: record.tokenHash,
    roles: parsedRoles,
    scopes: parsedScopes,
    expiresAt,
    acceptedAt:
      record.acceptedAt === null ? null : new Date(record.acceptedAt.getTime()),
    createdBy: record.createdBy,
    createdAt,
  } satisfies typeof accountInvitations.$inferInsert;
}

export function invitationRowToRecord(
  row: InvitationRowShape,
): InvitationRecord {
  assertNonEmpty(row.invitationId, "invitationId");
  assertNonEmpty(row.accountId, "accountId");
  assertNonEmpty(row.professionalEmail, "professionalEmail");
  assertNonEmpty(row.createdBy, "createdBy");
  if (!/^[a-f0-9]{64}$/u.test(row.tokenHash)) {
    throw new PersistenceMappingError("tokenHash must be a SHA-256 hex digest");
  }
  return Object.freeze({
    invitationId: row.invitationId,
    accountId: row.accountId,
    professionalEmail: row.professionalEmail,
    tokenHash: row.tokenHash,
    roles: parseRoles(row.roles),
    scopes: parseScopes(row.scopes),
    expiresAt: toDate(row.expiresAt, "expiresAt"),
    acceptedAt:
      row.acceptedAt === null ? null : toDate(row.acceptedAt, "acceptedAt"),
    createdBy: row.createdBy,
    createdAt: toDate(row.createdAt, "createdAt"),
  });
}

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (
    normalized.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalized)
  ) {
    throw new PersistenceMappingError("professionalEmail is invalid");
  }
  return normalized;
}

export function createInvitationUseCaseDependencies(
  db: DatabaseExecutor,
  idFactory: () => string,
): InvitationUseCaseDependencies {
  const operations = (executor: DatabaseExecutor) => ({
    account: {
      createInvited: async (input: {
        readonly accountId: string;
        readonly professionalEmail: string;
      }): Promise<void> => {
        assertNonEmpty(input.accountId, "accountId");
        const professionalEmail = normalizeEmail(input.professionalEmail);
        await executor.insert(accounts).values({
          id: input.accountId,
          professionalEmail,
          status: "INVITED",
        });
      },
      activate: async (accountId: string): Promise<void> => {
        assertNonEmpty(accountId, "accountId");
        const updated = await executor
          .update(accounts)
          .set({ status: "ACTIVE", updatedAt: new Date() })
          .where(
            and(eq(accounts.id, accountId), eq(accounts.status, "INVITED")),
          )
          .returning({ id: accounts.id });
        if (updated.length === 0) {
          throw new PersistenceConflictError(
            "invited account was already activated or is unavailable",
          );
        }
      },
    },
    invitation: {
      create: async (record: InvitationRecord): Promise<void> => {
        await executor
          .insert(accountInvitations)
          .values(invitationRecordToRow(record));
      },
      findActive: async (
        tokenHash: string,
        now: Date,
      ): Promise<InvitationRecord | null> => {
        if (!/^[a-f0-9]{64}$/u.test(tokenHash)) {
          throw new PersistenceMappingError(
            "tokenHash must be a SHA-256 hex digest",
          );
        }
        assertDate(now, "now");
        const rows = await executor
          .select({
            invitationId: accountInvitations.id,
            accountId: accountInvitations.accountId,
            professionalEmail: accounts.professionalEmail,
            tokenHash: accountInvitations.tokenHash,
            roles: accountInvitations.roles,
            scopes: accountInvitations.scopes,
            expiresAt: accountInvitations.expiresAt,
            acceptedAt: accountInvitations.acceptedAt,
            createdBy: accountInvitations.createdBy,
            createdAt: accountInvitations.createdAt,
          })
          .from(accountInvitations)
          .innerJoin(accounts, eq(accountInvitations.accountId, accounts.id))
          .where(
            and(
              eq(accountInvitations.tokenHash, tokenHash),
              isNull(accountInvitations.acceptedAt),
              gt(accountInvitations.expiresAt, now),
              eq(accounts.status, "INVITED"),
            ),
          )
          .limit(1);
        const row = rows[0];
        return row === undefined ? null : invitationRowToRecord(row);
      },
      accept: async (invitationId: string, acceptedAt: Date): Promise<void> => {
        assertNonEmpty(invitationId, "invitationId");
        assertDate(acceptedAt, "acceptedAt");
        const accepted = await executor
          .update(accountInvitations)
          .set({ acceptedAt })
          .where(
            and(
              eq(accountInvitations.id, invitationId),
              isNull(accountInvitations.acceptedAt),
            ),
          )
          .returning({ id: accountInvitations.id });
        if (accepted.length === 0) {
          throw new PersistenceConflictError("invitation was already accepted");
        }
      },
    },
    sessions: createSessionRepository(executor),
    audit: createAuditRepository(executor),
  });

  return Object.freeze({
    idFactory,
    ...operations(db),
    transaction: {
      run: async <Result>(
        work: (current: ReturnType<typeof operations>) => Promise<Result>,
      ): Promise<Result> =>
        db.transaction(async (transaction) =>
          work(operations(transaction as unknown as DatabaseExecutor)),
        ),
    },
  });
}

export { PersistenceConflictError, PersistenceMappingError };
