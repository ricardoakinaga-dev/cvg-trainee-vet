import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  AccountManagementAccountPort,
  AccountManagementSessionPort,
  AccountManagementUpdateInput,
  ManagedAccount,
  AccountManagementUseCaseDependencies,
} from "@cvg/application";
import type { AccountStatus, Role } from "@cvg/application";

import { PersistenceMappingError } from "./attempt-repository.js";
import { createAuditRepository } from "./audit-repository.js";
import { accounts, sessions } from "./schema.js";
import type * as schema from "./schema.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

const accountStatuses: readonly AccountStatus[] = [
  "INVITED",
  "ACTIVE",
  "SUSPENDED",
  "DEACTIVATED",
];
const roles: readonly Role[] = [
  "PARTICIPANT",
  "MODERATOR",
  "ADMIN",
  "CLINICAL_APPROVER",
  "AUDITOR",
  "AUTHOR",
];

export type ManagedAccountRowShape = Readonly<{
  readonly accountId: string;
  readonly professionalEmail: string;
  readonly accountStatus: unknown;
  readonly roles: unknown;
  readonly scopes: unknown;
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}>;

function assertNonEmpty(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new PersistenceMappingError(`${field} must not be empty`);
  }
}

function parseStatus(value: unknown): AccountStatus {
  if (
    typeof value !== "string" ||
    !accountStatuses.includes(value as AccountStatus)
  ) {
    throw new PersistenceMappingError("account status is invalid");
  }
  return value as AccountStatus;
}

function parseStringArray(value: unknown, field: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || item.trim().length === 0)
  ) {
    throw new PersistenceMappingError(`${field} is invalid`);
  }
  return Object.freeze(value.map((item) => item as string));
}

function parseRoles(value: unknown): readonly Role[] {
  const values = parseStringArray(value, "roles");
  if (values.some((role) => !roles.includes(role as Role))) {
    throw new PersistenceMappingError("role is invalid");
  }
  return Object.freeze(values.map((role) => role as Role));
}

function parseDate(value: unknown, field: string): Date {
  const result =
    value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
  if (Number.isNaN(result.getTime())) {
    throw new PersistenceMappingError(`${field} is invalid`);
  }
  return result;
}

export function managedAccountRowToRecord(
  row: ManagedAccountRowShape,
): ManagedAccount {
  assertNonEmpty(row.accountId, "accountId");
  assertNonEmpty(row.professionalEmail, "professionalEmail");
  if (!Number.isInteger(row.version) || row.version < 0) {
    throw new PersistenceMappingError("version is invalid");
  }
  return Object.freeze({
    accountId: row.accountId,
    professionalEmail: row.professionalEmail,
    accountStatus: parseStatus(row.accountStatus),
    roles: parseRoles(row.roles),
    scopes: parseStringArray(row.scopes, "scopes"),
    version: row.version,
    createdAt: parseDate(row.createdAt, "createdAt"),
    updatedAt: parseDate(row.updatedAt, "updatedAt"),
  });
}

function accountSelection(executor: DatabaseExecutor) {
  return executor
    .select({
      accountId: accounts.id,
      professionalEmail: accounts.professionalEmail,
      accountStatus: accounts.status,
      roles: accounts.roles,
      scopes: accounts.scopes,
      version: accounts.version,
      createdAt: accounts.createdAt,
      updatedAt: accounts.updatedAt,
    })
    .from(accounts);
}

function scopePredicate(scopeId: string | undefined) {
  if (scopeId === undefined) return undefined;
  return sql`${accounts.scopes} ?| ARRAY[${scopeId}]`;
}

export function createAccountManagementRepositories(
  executor: DatabaseExecutor,
): Readonly<{
  readonly accounts: AccountManagementAccountPort;
  readonly sessions: AccountManagementSessionPort;
}> {
  const accountRepository: AccountManagementAccountPort = {
    list: async (query) => {
      const conditions = [
        scopePredicate(query.scopeId),
        query.status === undefined
          ? undefined
          : eq(accounts.status, query.status),
      ].filter(
        (condition): condition is NonNullable<typeof condition> =>
          condition !== undefined,
      );
      const rows = await accountSelection(executor)
        .where(conditions.length === 0 ? undefined : and(...conditions))
        .orderBy(asc(accounts.professionalEmail))
        .limit(query.limit + 1);
      const pageRows = rows.slice(0, query.limit);
      return Object.freeze({
        accounts: Object.freeze(pageRows.map(managedAccountRowToRecord)),
        nextCursor:
          rows.length > query.limit
            ? (pageRows.at(-1)?.professionalEmail ?? null)
            : null,
      });
    },
    findById: async (accountId) => {
      assertNonEmpty(accountId, "accountId");
      const rows = await accountSelection(executor)
        .where(eq(accounts.id, accountId))
        .limit(1);
      const row = rows[0];
      return row === undefined ? null : managedAccountRowToRecord(row);
    },
    update: async (input: AccountManagementUpdateInput) => {
      assertNonEmpty(input.accountId, "accountId");
      if (
        !Number.isInteger(input.expectedVersion) ||
        input.expectedVersion < 0
      ) {
        throw new PersistenceMappingError("expectedVersion is invalid");
      }
      const values = {
        ...(input.status === undefined ? {} : { status: input.status }),
        ...(input.roles === undefined ? {} : { roles: input.roles }),
        ...(input.scopes === undefined ? {} : { scopes: input.scopes }),
        version: sql`${accounts.version} + 1`,
        updatedAt: new Date(),
      };
      const rows = await executor
        .update(accounts)
        .set(values)
        .where(
          and(
            eq(accounts.id, input.accountId),
            eq(accounts.version, input.expectedVersion),
          ),
        )
        .returning({
          accountId: accounts.id,
          professionalEmail: accounts.professionalEmail,
          accountStatus: accounts.status,
          roles: accounts.roles,
          scopes: accounts.scopes,
          version: accounts.version,
          createdAt: accounts.createdAt,
          updatedAt: accounts.updatedAt,
        });
      const row = rows[0];
      return row === undefined ? null : managedAccountRowToRecord(row);
    },
  };

  const sessionRepository: AccountManagementSessionPort = {
    revokeAll: async (accountId, revokedAt) => {
      assertNonEmpty(accountId, "accountId");
      if (Number.isNaN(revokedAt.getTime())) {
        throw new PersistenceMappingError("revokedAt is invalid");
      }
      const rows = await executor
        .update(sessions)
        .set({ revokedAt })
        .where(
          and(eq(sessions.accountId, accountId), isNull(sessions.revokedAt)),
        )
        .returning({ id: sessions.id });
      return rows.length;
    },
  };

  return Object.freeze({
    accounts: accountRepository,
    sessions: sessionRepository,
  });
}

export function createAccountManagementUseCaseDependencies(
  db: DatabaseExecutor,
  idFactory: () => string,
): AccountManagementUseCaseDependencies {
  return Object.freeze({
    idFactory,
    transaction: {
      run: async <Result>(
        work: (operations: {
          readonly accounts: AccountManagementAccountPort;
          readonly sessions: AccountManagementSessionPort;
          readonly audit: ReturnType<typeof createAuditRepository>;
        }) => Promise<Result>,
      ): Promise<Result> =>
        db.transaction(async (transaction) => {
          const repositories = createAccountManagementRepositories(
            transaction as unknown as DatabaseExecutor,
          );
          return work({
            ...repositories,
            audit: createAuditRepository(
              transaction as unknown as DatabaseExecutor,
            ),
          });
        }),
    },
  });
}

export type { DatabaseExecutor };
