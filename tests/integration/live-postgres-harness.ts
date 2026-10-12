import { sql } from "drizzle-orm";

import {
  createPostgresDatabase,
  type DatabaseHandle,
} from "../../packages/persistence/src/database.js";

export type LivePostgresRoleCapabilities = Readonly<{
  readonly roleName: string;
  readonly isSuperuser: boolean;
  readonly bypassesRls: boolean;
  readonly canCreateRoles: boolean;
  readonly canCreateDatabases: boolean;
  readonly canReplicate: boolean;
}>;

export type LivePostgresHarness = Readonly<{
  readonly application: DatabaseHandle;
  readonly admin: DatabaseHandle;
  readonly applicationRole: LivePostgresRoleCapabilities;
  readonly adminRole: LivePostgresRoleCapabilities;
}>;

export const liveDatabaseUrl = process.env.CVG_TEST_DATABASE_URL?.trim();
const liveAdminDatabaseUrl = process.env.CVG_TEST_ADMIN_DATABASE_URL?.trim();

export const liveAdminCapabilityMessage =
  "live PostgreSQL tests require CVG_TEST_ADMIN_DATABASE_URL with SUPERUSER or BYPASSRLS for isolated fixture cleanup";

/**
 * Test-only statement budget override (2026-10-12, SA-02). PostgreSQL 16
 * re-evaluates the nested RLS policy helper functions per row inside
 * cvg_guard_curriculum_answer; the 33-item synthetic fixtures of the native
 * curriculum suites can exceed the production-mirroring 30s role cap on
 * loaded CI runners (quality runs 38196035891/38199585344). The driver
 * forwards URL query parameters as startup options, so this bounds the
 * harness sessions at 2 minutes without touching the provisioning contract
 * (ALTER ROLE cvg_app SET statement_timeout = '30s') that production and
 * migration-governance keep asserting.
 */
function withExtendedStatementTimeout(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}statement_timeout=120000`;
}

async function readRoleCapabilities(
  database: DatabaseHandle,
): Promise<LivePostgresRoleCapabilities> {
  const rows = await database.db.execute<{
    readonly roleName: string;
    readonly isSuperuser: boolean;
    readonly bypassesRls: boolean;
    readonly canCreateRoles: boolean;
    readonly canCreateDatabases: boolean;
    readonly canReplicate: boolean;
  }>(sql`
    select
      current_user as "roleName",
      rolsuper as "isSuperuser",
      rolbypassrls as "bypassesRls",
      rolcreaterole as "canCreateRoles",
      rolcreatedb as "canCreateDatabases",
      rolreplication as "canReplicate"
    from pg_roles
    where rolname = current_user
  `);
  const role = rows[0];
  if (role === undefined) {
    throw new Error("live PostgreSQL current role could not be inspected");
  }
  return Object.freeze(role);
}

export async function openLivePostgresHarness(): Promise<LivePostgresHarness> {
  if (liveDatabaseUrl === undefined || liveDatabaseUrl.length === 0) {
    throw new Error("CVG_TEST_DATABASE_URL is required for live integration");
  }
  if (liveAdminDatabaseUrl === undefined || liveAdminDatabaseUrl.length === 0) {
    throw new Error(liveAdminCapabilityMessage);
  }
  if (liveAdminDatabaseUrl === liveDatabaseUrl) {
    throw new Error(
      "live PostgreSQL tests require distinct application and admin database URLs",
    );
  }

  const application = createPostgresDatabase(
    withExtendedStatementTimeout(liveDatabaseUrl),
  );
  const admin = createPostgresDatabase(
    withExtendedStatementTimeout(liveAdminDatabaseUrl),
  );
  try {
    const [applicationRole, adminRole] = await Promise.all([
      readRoleCapabilities(application),
      readRoleCapabilities(admin),
    ]);
    return Object.freeze({ application, admin, applicationRole, adminRole });
  } catch (error) {
    await Promise.allSettled([application.close(), admin.close()]);
    throw error;
  }
}

export async function closeLivePostgresHarness(
  harness: LivePostgresHarness,
): Promise<void> {
  await Promise.all([harness.application.close(), harness.admin.close()]);
}

export function hasAdministrativeCleanupCapability(
  role: LivePostgresRoleCapabilities,
): boolean {
  return role.isSuperuser || role.bypassesRls;
}
