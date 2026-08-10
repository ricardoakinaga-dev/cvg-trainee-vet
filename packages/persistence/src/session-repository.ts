import { and, eq, gt, isNull } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  SessionPrincipal,
  SessionRecord,
  SessionRepositoryPort,
} from "@cvg/application";
import type { AccountStatus, Role } from "@cvg/application";

import { PersistenceMappingError } from "./attempt-repository.js";
import { accounts, sessions } from "./schema.js";
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
    typeof value !== "string" ||
    !accountStatuses.includes(value as AccountStatus)
  ) {
    throw new PersistenceMappingError("account status is not supported");
  }
  return value as AccountStatus;
}

function parseStringArray(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
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

export type SessionInsertRow = Readonly<{
  readonly id: string;
  readonly accountId: string;
  readonly tokenHash: string;
  readonly roles: readonly string[];
  readonly scopes: readonly string[];
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly createdAt: Date;
  readonly lastSeenAt: Date;
}>;

export function sessionRecordToRow(record: SessionRecord): SessionInsertRow {
  assertNonEmpty(record.sessionId, "sessionId");
  assertNonEmpty(record.accountId, "accountId");
  if (!/^[a-f0-9]{64}$/u.test(record.tokenHash)) {
    throw new PersistenceMappingError("tokenHash must be a SHA-256 hex digest");
  }
  parseStatus(record.accountStatus);
  const parsedRoles = parseRoles(record.roles);
  const scopes = parseStringArray(record.scopes, "scopes");
  assertDate(record.expiresAt, "expiresAt");
  assertDate(record.createdAt, "createdAt");
  assertDate(record.lastSeenAt, "lastSeenAt");
  if (record.revokedAt !== null) assertDate(record.revokedAt, "revokedAt");

  return {
    id: record.sessionId,
    accountId: record.accountId,
    tokenHash: record.tokenHash,
    roles: parsedRoles,
    scopes,
    expiresAt: new Date(record.expiresAt.getTime()),
    revokedAt:
      record.revokedAt === null ? null : new Date(record.revokedAt.getTime()),
    createdAt: new Date(record.createdAt.getTime()),
    lastSeenAt: new Date(record.lastSeenAt.getTime()),
  };
}

export type SessionPrincipalRow = Readonly<{
  readonly accountId: string;
  readonly status: string;
  readonly roles: unknown;
  readonly scopes: unknown;
}>;

export function sessionRowToPrincipal(
  row: SessionPrincipalRow,
): SessionPrincipal {
  assertNonEmpty(row.accountId, "accountId");
  const accountStatus = parseStatus(row.status);
  return Object.freeze({
    accountId: row.accountId,
    accountStatus,
    roles: parseRoles(row.roles),
    scopes: parseStringArray(row.scopes, "scopes"),
  });
}

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

export function createSessionRepository(
  db: PostgresJsDatabase<typeof schema>,
): SessionRepositoryPort {
  const repository: SessionRepositoryPort = {
    create: async (record: SessionRecord): Promise<void> => {
      await db.insert(sessions).values(sessionRecordToRow(record));
    },
    findActive: async (
      tokenHash: string,
      now: Date,
    ): Promise<SessionPrincipal | null> => {
      assertDate(now, "now");
      const rows = await db
        .select({
          accountId: accounts.id,
          status: accounts.status,
          roles: sessions.roles,
          scopes: sessions.scopes,
          sessionId: sessions.id,
        })
        .from(sessions)
        .innerJoin(accounts, eq(sessions.accountId, accounts.id))
        .where(
          and(
            eq(sessions.tokenHash, tokenHash),
            isNull(sessions.revokedAt),
            gt(sessions.expiresAt, now),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      await db
        .update(sessions)
        .set({ lastSeenAt: now })
        .where(eq(sessions.id, row.sessionId));
      return sessionRowToPrincipal(row);
    },
    revoke: async (tokenHash: string, revokedAt: Date): Promise<void> => {
      assertDate(revokedAt, "revokedAt");
      await db
        .update(sessions)
        .set({ revokedAt })
        .where(
          and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)),
        );
    },
    rotate: async (
      tokenHash: string,
      record: SessionRecord,
      rotatedAt: Date,
    ): Promise<void> => {
      if (tokenHash.trim().length === 0) {
        throw new TypeError("tokenHash is required");
      }
      assertDate(rotatedAt, "rotatedAt");
      const nextRow = sessionRecordToRow(record);
      await db.transaction(async (transaction) => {
        const revoked = await transaction
          .update(sessions)
          .set({ revokedAt: rotatedAt })
          .where(
            and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)),
          )
          .returning({ id: sessions.id });
        if (revoked.length === 0) {
          throw new PersistenceMappingError("session is no longer active");
        }
        await transaction.insert(sessions).values(nextRow);
      });
    },
  };
  return Object.freeze(repository);
}

export type { DatabaseExecutor };
