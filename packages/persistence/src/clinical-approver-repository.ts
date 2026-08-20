import { eq } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  ClinicalApproverPort,
  ClinicalApproverRecord,
} from "@cvg/application";

import { PersistenceMappingError } from "./attempt-repository.js";
import { accounts } from "./schema.js";
import type * as schema from "./schema.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

export function createClinicalApproverPort(
  db: DatabaseExecutor,
): ClinicalApproverPort {
  return Object.freeze({
    findById: async (
      accountId: string,
    ): Promise<ClinicalApproverRecord | null> => {
      const rows = await db
        .select({
          accountId: accounts.id,
          accountStatus: accounts.status,
          roles: accounts.roles,
          scopes: accounts.scopes,
        })
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1)
        .for("update");
      const row = rows[0];
      if (row === undefined) return null;
      if (
        row.accountStatus !== "INVITED" &&
        row.accountStatus !== "ACTIVE" &&
        row.accountStatus !== "SUSPENDED" &&
        row.accountStatus !== "DEACTIVATED"
      ) {
        throw new PersistenceMappingError(
          "clinical approver status is invalid",
        );
      }
      if (
        !Array.isArray(row.roles) ||
        row.roles.some((role) => typeof role !== "string") ||
        !Array.isArray(row.scopes) ||
        row.scopes.some((scope) => typeof scope !== "string")
      ) {
        throw new PersistenceMappingError(
          "clinical approver access data is invalid",
        );
      }
      return Object.freeze({
        accountId: row.accountId,
        accountStatus: row.accountStatus,
        roles: Object.freeze([...row.roles]),
        scopes: Object.freeze([...row.scopes]),
      });
    },
  });
}
