import { eq } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  AccountStatus,
  PasswordAccountRecord,
  PasswordAuthUseCaseDependencies,
  Role,
} from "@cvg/application";

import { createAuditRepository } from "./audit-repository.js";
import { PersistenceMappingError } from "./attempt-repository.js";
import { createSessionRepository } from "./session-repository.js";
import { accounts } from "./schema.js";
import type * as schema from "./schema.js";

export { PersistenceMappingError } from "./attempt-repository.js";

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

function assertNonEmpty(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new PersistenceMappingError(`${field} must not be empty`);
  }
}

function normalizeEmail(value: string): string {
  assertNonEmpty(value, "login");
  const normalized = value.trim().toLowerCase();
  if (
    normalized.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalized)
  ) {
    throw new PersistenceMappingError("login is invalid");
  }
  return normalized;
}

function parseStatus(value: unknown): AccountStatus {
  if (
    typeof value !== "string" ||
    !accountStatuses.includes(value as AccountStatus)
  ) {
    throw new PersistenceMappingError("account status is not supported");
  }
  return value as AccountStatus;
}

function parseStringArray(value: unknown, field: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || item.trim().length === 0)
  ) {
    throw new PersistenceMappingError(`${field} must be an array of strings`);
  }
  return Object.freeze(value.map((item) => item as string));
}

function parseRoles(value: unknown): readonly Role[] {
  const values = parseStringArray(value, "roles");
  if (values.some((value) => !roles.includes(value as Role))) {
    throw new PersistenceMappingError("role is not supported");
  }
  return Object.freeze(values.map((value) => value as Role));
}

function assertPasswordHash(value: string): void {
  assertNonEmpty(value, "passwordHash");
  if (!/^scrypt\$\d+\$\d+\$\d+\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/u.test(value)) {
    throw new PersistenceMappingError("passwordHash format is invalid");
  }
}

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

function operations(executor: DatabaseExecutor) {
  return {
    account: {
      findByLogin: async (
        login: string,
      ): Promise<PasswordAccountRecord | null> => {
        const normalizedLogin = normalizeEmail(login);
        const rows = await executor
          .select({
            accountId: accounts.id,
            accountStatus: accounts.status,
            roles: accounts.roles,
            scopes: accounts.scopes,
            passwordHash: accounts.passwordHash,
          })
          .from(accounts)
          .where(eq(accounts.professionalEmail, normalizedLogin))
          .limit(1);
        const row = rows[0];
        if (row === undefined) return null;
        return Object.freeze({
          accountId: row.accountId,
          accountStatus: parseStatus(row.accountStatus),
          roles: parseRoles(row.roles),
          scopes: parseStringArray(row.scopes, "scopes"),
          passwordHash: row.passwordHash,
        });
      },
      setPassword: async (
        accountId: string,
        passwordHash: string,
      ): Promise<void> => {
        assertNonEmpty(accountId, "accountId");
        assertPasswordHash(passwordHash);
        const updated = await executor
          .update(accounts)
          .set({ passwordHash, updatedAt: new Date() })
          .where(eq(accounts.id, accountId))
          .returning({ id: accounts.id });
        if (updated.length === 0) {
          throw new PersistenceMappingError("account is not available");
        }
      },
    },
    sessions: createSessionRepository(executor),
    audit: createAuditRepository(executor),
  };
}

export function createPasswordAuthUseCaseDependencies(
  db: DatabaseExecutor,
  idFactory: () => string,
): PasswordAuthUseCaseDependencies {
  return Object.freeze({
    idFactory,
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
