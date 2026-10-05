import { and, eq, gt, isNull } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  SessionPrincipal,
  SessionRecord,
  SessionRepositoryPort,
} from "@cvg/application";
import type { AccountStatus, Role } from "@cvg/application";
import {
  isSessionWithinExpiryPolicy,
  SESSION_ABSOLUTE_LIFETIME_SECONDS,
} from "@cvg/application";

import { PersistenceMappingError } from "./attempt-repository.js";
import { accounts, sessions } from "./schema.js";
import { setDatabaseSessionSecurityContext } from "./security-context.js";
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

function assertTokenHash(value: string): void {
  if (!/^[a-f0-9]{64}$/u.test(value)) {
    throw new PersistenceMappingError("tokenHash must be a SHA-256 hex digest");
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
  readonly sessionId?: string;
  readonly accountId: string;
  readonly status: string;
  readonly roles: unknown;
  readonly scopes: unknown;
}>;

export function sessionRowToPrincipal(
  row: SessionPrincipalRow,
): SessionPrincipal {
  assertNonEmpty(row.accountId, "accountId");
  if (
    row.sessionId !== undefined &&
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iu.test(
      row.sessionId,
    )
  ) {
    throw new PersistenceMappingError("sessionId must be a UUID");
  }
  const accountStatus = parseStatus(row.status);
  return Object.freeze({
    ...(row.sessionId === undefined ? {} : { sessionId: row.sessionId }),
    accountId: row.accountId,
    accountStatus,
    roles: parseRoles(row.roles),
    scopes: parseStringArray(row.scopes, "scopes"),
  });
}

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

async function lockActiveSession(
  executor: DatabaseExecutor,
  tokenHash: string,
  now: Date,
) {
  const [row] = await executor
    .select({
      accountId: accounts.id,
      status: accounts.status,
      roles: sessions.roles,
      scopes: sessions.scopes,
      sessionId: sessions.id,
      createdAt: sessions.createdAt,
      lastSeenAt: sessions.lastSeenAt,
      expiresAt: sessions.expiresAt,
      revokedAt: sessions.revokedAt,
    })
    .from(sessions)
    .innerJoin(accounts, eq(sessions.accountId, accounts.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now),
        eq(accounts.status, "ACTIVE"),
      ),
    )
    .for("update", { of: sessions })
    .limit(1);
  if (row === undefined) return null;
  const principal = sessionRowToPrincipal(row);
  if (
    principal.accountStatus !== "ACTIVE" ||
    !isSessionWithinExpiryPolicy({ ...row, roles: principal.roles }, now)
  )
    return null;
  return { row, principal };
}

function assertRotationBinding(
  next: SessionInsertRow,
  previous: NonNullable<Awaited<ReturnType<typeof lockActiveSession>>>,
  now: Date,
): void {
  const { row, principal } = previous;
  if (
    next.accountId !== principal.accountId ||
    JSON.stringify(next.roles) !== JSON.stringify(principal.roles) ||
    JSON.stringify(next.scopes) !== JSON.stringify(principal.scopes) ||
    next.createdAt.getTime() !== row.createdAt.getTime() ||
    next.lastSeenAt.getTime() !== now.getTime() ||
    next.expiresAt.getTime() >
      row.createdAt.getTime() + SESSION_ABSOLUTE_LIFETIME_SECONDS * 1_000 ||
    !isSessionWithinExpiryPolicy({ ...next, roles: principal.roles }, now)
  )
    throw new PersistenceMappingError(
      "rotation must preserve session identity and absolute deadline",
    );
}

export function createSessionRepository(
  db: PostgresJsDatabase<typeof schema>,
): SessionRepositoryPort {
  const repository: SessionRepositoryPort = {
    create: async (record: SessionRecord): Promise<void> => {
      const row = sessionRecordToRow(record);
      const scopeId = row.scopes[0];
      if (scopeId === undefined) {
        throw new PersistenceMappingError(
          "session scopes must include a scope",
        );
      }
      await db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSessionSecurityContext(executor, {
          tokenHash: row.tokenHash,
          scopeId,
        });
        await transaction.insert(sessions).values(row);
      });
    },
    findActive: async (
      tokenHash: string,
      now: Date,
    ): Promise<SessionPrincipal | null> => {
      assertTokenHash(tokenHash);
      assertDate(now, "now");
      return db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSessionSecurityContext(executor, { tokenHash });
        const active = await lockActiveSession(executor, tokenHash, now);
        if (active === null) return null;
        const { row, principal } = active;
        await transaction
          .update(sessions)
          .set({ lastSeenAt: now })
          .where(eq(sessions.id, row.sessionId));
        return Object.freeze({
          ...principal,
          sessionLifetime: Object.freeze({
            createdAt: new Date(row.createdAt.getTime()),
            lastSeenAt: new Date(now.getTime()),
            expiresAt: new Date(row.expiresAt.getTime()),
          }),
        });
      });
    },
    revoke: async (tokenHash: string, revokedAt: Date): Promise<void> => {
      assertTokenHash(tokenHash);
      assertDate(revokedAt, "revokedAt");
      await db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSessionSecurityContext(executor, { tokenHash });
        await transaction
          .update(sessions)
          .set({ revokedAt })
          .where(
            and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)),
          );
      });
    },
    rotate: async (
      tokenHash: string,
      record: SessionRecord,
      rotatedAt: Date,
    ): Promise<void> => {
      assertTokenHash(tokenHash);
      assertDate(rotatedAt, "rotatedAt");
      const nextRow = sessionRecordToRow(record);
      const scopeId = nextRow.scopes[0];
      if (scopeId === undefined) {
        throw new PersistenceMappingError(
          "session scopes must include a scope",
        );
      }
      await db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSessionSecurityContext(executor, {
          tokenHash,
          scopeId,
        });
        const active = await lockActiveSession(executor, tokenHash, rotatedAt);
        if (active === null)
          throw new PersistenceMappingError("session is no longer active");
        assertRotationBinding(nextRow, active, rotatedAt);
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
