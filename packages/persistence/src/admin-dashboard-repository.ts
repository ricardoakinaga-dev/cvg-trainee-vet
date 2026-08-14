import { asc } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  AccountStatus,
  AdminDashboardParticipantAccount,
} from "@cvg/application";

import { PersistenceMappingError } from "./attempt-repository.js";
import { accounts } from "./schema.js";
import type * as schema from "./schema.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

export const MAX_ADMIN_DASHBOARD_ACCOUNTS = 200;

export type TrainingParticipantAccountRow = Readonly<{
  readonly participantId: string;
  readonly professionalEmail: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly string[];
  readonly scopeIds: readonly string[];
}>;

function normalizeValues(values: readonly string[]): readonly string[] {
  return Object.freeze(
    values.map((value) => value.trim()).filter((value) => value.length > 0),
  );
}

function normalizeUniqueValues(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(normalizeValues(values))]);
}

function hasParticipantRole(roles: readonly string[]): boolean {
  return roles.some((role) => role.trim() === "PARTICIPANT");
}

export function filterTrainingParticipantAccounts(
  rows: readonly TrainingParticipantAccountRow[],
  requestedScopeIds: readonly string[],
): readonly AdminDashboardParticipantAccount[] {
  const requested = new Set(normalizeUniqueValues(requestedScopeIds));
  if (requested.size === 0) return Object.freeze([]);

  return Object.freeze(
    rows
      .filter(
        (row) =>
          row.accountStatus !== "DEACTIVATED" &&
          hasParticipantRole(row.roles) &&
          normalizeValues(row.scopeIds).some((scopeId) =>
            requested.has(scopeId),
          ),
      )
      .map((row) =>
        Object.freeze({
          participantId: row.participantId,
          professionalEmail: row.professionalEmail,
          accountStatus: row.accountStatus,
          scopeIds: normalizeUniqueValues(row.scopeIds),
        }),
      )
      .sort((left, right) =>
        left.professionalEmail.localeCompare(right.professionalEmail),
      ),
  );
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

function parseAccountStatus(value: unknown): AccountStatus {
  if (
    value !== "INVITED" &&
    value !== "ACTIVE" &&
    value !== "SUSPENDED" &&
    value !== "DEACTIVATED"
  ) {
    throw new PersistenceMappingError("account status is invalid");
  }
  return value;
}

export function createTrainingParticipantRepository(
  db: DatabaseExecutor,
): Readonly<{
  readonly listParticipants: (
    scopeIds: readonly string[],
  ) => Promise<readonly AdminDashboardParticipantAccount[]>;
}> {
  return Object.freeze({
    listParticipants: async (scopeIds: readonly string[]) => {
      const normalizedScopeIds = normalizeUniqueValues(scopeIds);
      if (normalizedScopeIds.length === 0) return Object.freeze([]);

      const rows = await db
        .select({
          participantId: accounts.id,
          professionalEmail: accounts.professionalEmail,
          accountStatus: accounts.status,
          roles: accounts.roles,
          scopeIds: accounts.scopes,
        })
        .from(accounts)
        .orderBy(asc(accounts.professionalEmail))
        .limit(MAX_ADMIN_DASHBOARD_ACCOUNTS);
      const mappedRows = rows.map((row) => ({
        participantId: row.participantId,
        professionalEmail: row.professionalEmail,
        accountStatus: parseAccountStatus(row.accountStatus),
        roles: parseStringArray(row.roles, "roles"),
        scopeIds: parseStringArray(row.scopeIds, "scopes"),
      }));
      return filterTrainingParticipantAccounts(mappedRows, normalizedScopeIds);
    },
  });
}
