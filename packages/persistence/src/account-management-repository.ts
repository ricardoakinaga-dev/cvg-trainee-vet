import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  AccountManagementRepositoryPort,
  AccountManagementResendInput,
  AccountManagementResendTarget,
  AccountManagementStatusInput,
  AccountStatusChangeResult,
  AccountStatus,
  ManagedAccountStatus,
} from "@cvg/application";

import { createAuditRepository } from "./audit-repository.js";
import { PersistenceMappingError } from "./attempt-repository.js";
import { accountInvitations, accounts, sessions } from "./schema.js";
import type * as schema from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

const participantRoleJson = JSON.stringify(["PARTICIPANT"]);
const accountStatuses: readonly AccountStatus[] = [
  "INVITED",
  "ACTIVE",
  "SUSPENDED",
  "DEACTIVATED",
];

export class AccountManagementConflictError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AccountManagementConflict";
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

function assertAccountStatus(value: string): asserts value is AccountStatus {
  if (!accountStatuses.includes(value as AccountStatus)) {
    throw new PersistenceMappingError("account status is not supported");
  }
}

function assertManagedStatus(
  value: string,
): asserts value is ManagedAccountStatus {
  if (value !== "ACTIVE" && value !== "SUSPENDED" && value !== "DEACTIVATED") {
    throw new PersistenceMappingError(
      "managed account status is not supported",
    );
  }
}

function assertTokenHash(value: string): void {
  if (!/^[a-f0-9]{64}$/u.test(value)) {
    throw new PersistenceMappingError("tokenHash must be a SHA-256 hex digest");
  }
}

function assertStringArray(value: unknown, field: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || item.trim().length === 0)
  ) {
    throw new PersistenceMappingError(
      `${field} must be a non-empty string array`,
    );
  }
  return Object.freeze(value.map((item) => item as string));
}

export function accountStatusTransitionReason(
  from: AccountStatus,
  to: ManagedAccountStatus,
): string {
  assertAccountStatus(from);
  assertManagedStatus(to);
  return `account_status_${from.toLowerCase()}_to_${to.toLowerCase()}`;
}

type MembershipRow = Readonly<{
  readonly accountId: string;
  readonly professionalEmail: string;
  readonly accountStatus: string;
  readonly roles: unknown;
  readonly scopes: unknown;
  readonly acceptedAt: Date | null;
}>;

async function findParticipantMembership(
  executor: DatabaseExecutor,
  targetAccountId: string,
  scopeId: string,
  invitedOnly: boolean,
): Promise<MembershipRow | null> {
  const conditions = [
    eq(accounts.id, targetAccountId),
    sql`${accountInvitations.roles} @> ${participantRoleJson}::jsonb`,
    sql`${accountInvitations.scopes} @> ${JSON.stringify([scopeId])}::jsonb`,
    ...(invitedOnly
      ? [eq(accounts.status, "INVITED"), isNull(accountInvitations.acceptedAt)]
      : []),
  ];
  const rows = await executor
    .select({
      accountId: accounts.id,
      professionalEmail: accounts.professionalEmail,
      accountStatus: accounts.status,
      roles: accountInvitations.roles,
      scopes: accountInvitations.scopes,
      acceptedAt: accountInvitations.acceptedAt,
    })
    .from(accounts)
    .innerJoin(
      accountInvitations,
      eq(accountInvitations.accountId, accounts.id),
    )
    .where(and(...conditions))
    .orderBy(desc(accountInvitations.createdAt))
    .limit(1);
  const row = rows[0];
  return row === undefined ? null : row;
}

function baseAuditReason(input: AccountManagementStatusInput): string {
  return input.audit.reasonCode ?? "account_lifecycle_transition";
}

function auditWithReason(
  input: AccountManagementStatusInput,
  reasonCode: string,
) {
  return { ...input.audit, reasonCode };
}

export function createAccountManagementRepository(
  db: DatabaseExecutor,
): AccountManagementRepositoryPort {
  return Object.freeze({
    changeStatus: async (
      input: AccountManagementStatusInput,
    ): Promise<AccountStatusChangeResult | null> => {
      assertNonEmpty(input.targetAccountId, "targetAccountId");
      assertNonEmpty(input.scopeId, "scopeId");
      assertNonEmpty(input.principalId, "principalId");
      assertDate(input.now, "now");
      assertAccountStatus(input.expectedStatus);
      assertManagedStatus(input.status);
      return db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSecurityContext(executor, { scopeId: input.scopeId });
        const membership = await findParticipantMembership(
          executor,
          input.targetAccountId,
          input.scopeId,
          false,
        );
        if (membership === null) return null;
        assertAccountStatus(membership.accountStatus);
        if (membership.accountStatus !== input.expectedStatus) {
          throw new AccountManagementConflictError(
            "account status changed before this lifecycle action",
          );
        }
        if (membership.acceptedAt === null && input.status !== "DEACTIVATED") {
          throw new AccountManagementConflictError(
            "an invited account must accept its invitation before activation",
          );
        }

        const updated = await executor
          .update(accounts)
          .set({ status: input.status, updatedAt: input.now })
          .where(
            and(
              eq(accounts.id, input.targetAccountId),
              eq(accounts.status, input.expectedStatus),
            ),
          )
          .returning({ id: accounts.id, status: accounts.status });
        const row = updated[0];
        if (row === undefined) {
          throw new AccountManagementConflictError(
            "account status changed concurrently",
          );
        }
        assertAccountStatus(row.status);

        let revokedSessions = 0;
        const shouldRevokeSessions =
          input.status === "SUSPENDED" ||
          input.status === "DEACTIVATED" ||
          (input.status === "ACTIVE" &&
            (input.expectedStatus === "SUSPENDED" ||
              input.expectedStatus === "DEACTIVATED"));
        if (shouldRevokeSessions) {
          const revoked = await executor
            .update(sessions)
            .set({ revokedAt: input.now })
            .where(
              and(
                eq(sessions.accountId, input.targetAccountId),
                isNull(sessions.revokedAt),
              ),
            )
            .returning({ id: sessions.id });
          revokedSessions = revoked.length;
        }

        const audit = createAuditRepository(executor);
        await audit.append(
          auditWithReason(
            input,
            row.status === input.expectedStatus
              ? `${baseAuditReason(input)}_unchanged`
              : accountStatusTransitionReason(
                  membership.accountStatus,
                  input.status,
                ),
          ),
        );
        return Object.freeze({
          accountId: row.id,
          status: row.status as ManagedAccountStatus,
          revokedSessions,
        });
      });
    },
    resendInvitation: async (
      input: AccountManagementResendInput,
    ): Promise<AccountManagementResendTarget | null> => {
      assertNonEmpty(input.targetAccountId, "targetAccountId");
      assertNonEmpty(input.scopeId, "scopeId");
      assertNonEmpty(input.principalId, "principalId");
      assertNonEmpty(input.invitationId, "invitationId");
      assertTokenHash(input.tokenHash);
      assertDate(input.expiresAt, "expiresAt");
      assertDate(input.createdAt, "createdAt");
      if (input.expiresAt <= input.createdAt) {
        throw new PersistenceMappingError("expiresAt must be after createdAt");
      }
      return db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSecurityContext(executor, { scopeId: input.scopeId });
        await executor.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${input.targetAccountId}, 0))`,
        );
        const membership = await findParticipantMembership(
          executor,
          input.targetAccountId,
          input.scopeId,
          true,
        );
        if (membership === null) return null;
        const roles = assertStringArray(membership.roles, "roles");
        assertStringArray(membership.scopes, "scopes");
        await executor
          .update(accountInvitations)
          .set({ expiresAt: input.createdAt })
          .where(
            and(
              eq(accountInvitations.accountId, input.targetAccountId),
              isNull(accountInvitations.acceptedAt),
              gt(accountInvitations.expiresAt, input.createdAt),
            ),
          );
        await executor.insert(accountInvitations).values({
          id: input.invitationId,
          accountId: input.targetAccountId,
          tokenHash: input.tokenHash,
          roles,
          scopes: [input.scopeId],
          expiresAt: input.expiresAt,
          acceptedAt: null,
          createdBy: input.principalId,
          createdAt: input.createdAt,
        });
        await createAuditRepository(executor).append(input.audit);
        return Object.freeze({
          accountId: membership.accountId,
          professionalEmail: membership.professionalEmail,
          expiresAt: new Date(input.expiresAt.getTime()),
        });
      });
    },
  });
}
