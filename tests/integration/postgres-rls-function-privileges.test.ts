import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createPostgresDatabase } from "../../packages/persistence/src/database.js";
import {
  closeLivePostgresHarness,
  hasAdministrativeCleanupCapability,
  liveAdminCapabilityMessage,
  liveDatabaseUrl,
  openLivePostgresHarness,
} from "./live-postgres-harness.js";

const runLiveDatabaseTests = process.env.CVG_RUN_LIVE_DB_TESTS === "true";
const syntheticUuid = "00000000-0000-4000-8000-000000000000";

const rlsHelpers = [
  {
    procedure: "public.cvg_learning_activity_in_scope(uuid,text)",
    call: `public.cvg_learning_activity_in_scope('${syntheticUuid}'::uuid, ''::text)`,
  },
  {
    procedure: "public.cvg_learning_activity_for_participant(uuid,text)",
    call: `public.cvg_learning_activity_for_participant('${syntheticUuid}'::uuid, ''::text)`,
  },
  {
    procedure:
      "public.cvg_learning_activity_item_insert_allowed(uuid,uuid,text)",
    call: `public.cvg_learning_activity_item_insert_allowed('${syntheticUuid}'::uuid, '${syntheticUuid}'::uuid, ''::text)`,
  },
  {
    procedure:
      "public.cvg_learning_activity_content_for_participant(uuid,text)",
    call: `public.cvg_learning_activity_content_for_participant('${syntheticUuid}'::uuid, ''::text)`,
  },
  {
    procedure: "public.cvg_participant_in_scope(uuid,uuid)",
    call: `public.cvg_participant_in_scope('${syntheticUuid}'::uuid, '${syntheticUuid}'::uuid)`,
  },
  {
    procedure:
      "public.cvg_learning_activity_assignment_insert_allowed(uuid,uuid,uuid,text)",
    call: `public.cvg_learning_activity_assignment_insert_allowed('${syntheticUuid}'::uuid, '${syntheticUuid}'::uuid, '${syntheticUuid}'::uuid, ''::text)`,
  },
  {
    procedure:
      "public.cvg_learning_activity_assignment_write_allowed(uuid,uuid,uuid,text,text)",
    call: `public.cvg_learning_activity_assignment_write_allowed('${syntheticUuid}'::uuid, '${syntheticUuid}'::uuid, '${syntheticUuid}'::uuid, ''::text, 'ATRIBUIDO'::text)`,
  },
  {
    procedure: "public.cvg_learning_activity_journey_visible(uuid,text)",
    call: `public.cvg_learning_activity_journey_visible('${syntheticUuid}'::uuid, ''::text)`,
  },
  {
    procedure: "public.cvg_learning_activity_scope_for_participant(uuid,text)",
    call: `public.cvg_learning_activity_scope_for_participant('${syntheticUuid}'::uuid, ''::text)`,
  },
] as const;

function quoteRoleIdentifier(value: string): string {
  if (!/^cvg_rls_fn_[a-f0-9]+$/u.test(value)) {
    throw new Error("unsafe synthetic role identifier");
  }
  return `"${value}"`;
}

function assertCleanupSucceeded(errors: readonly unknown[]): void {
  if (errors.length > 0) {
    throw new AggregateError(
      errors,
      "live RLS helper privilege cleanup failed",
    );
  }
}

function containsPermissionDenied(error: unknown): boolean {
  if (
    error instanceof Error &&
    /permission denied for function/u.test(error.message)
  ) {
    return true;
  }
  if (typeof error === "object" && error !== null && "cause" in error) {
    return containsPermissionDenied(error.cause);
  }
  return false;
}

function containsTablePermissionDenied(error: unknown): boolean {
  if (
    error instanceof Error &&
    /permission denied for (table|relation)/u.test(error.message)
  ) {
    return true;
  }
  if (typeof error === "object" && error !== null && "cause" in error) {
    return containsTablePermissionDenied(error.cause);
  }
  return false;
}

describe.skipIf(!runLiveDatabaseTests || liveDatabaseUrl === undefined)(
  "PostgreSQL RLS helper function privileges",
  () => {
    it("allows the application role and denies a role without an explicit grant", async ({
      skip,
    }) => {
      const harness = await openLivePostgresHarness();
      if (!hasAdministrativeCleanupCapability(harness.adminRole)) {
        await closeLivePostgresHarness(harness);
        skip(liveAdminCapabilityMessage);
        return;
      }
      if (!harness.adminRole.canCreateRoles) {
        await closeLivePostgresHarness(harness);
        skip(
          "the live admin role must be able to create a synthetic negative-test role",
        );
        return;
      }

      expect(harness.applicationRole.isSuperuser).toBe(false);
      expect(harness.applicationRole.bypassesRls).toBe(false);
      const applicationRoleName = harness.applicationRole.roleName;
      for (const helper of rlsHelpers) {
        const privilegeRows = await harness.application.db.execute<{
          readonly owner: string;
          readonly directExecute: boolean;
          readonly publicExecute: boolean;
        }>(
          sql.raw(`
            select
              pg_get_userbyid(procedure_row.proowner) as "owner",
              coalesce(bool_or(
                privilege.grantee = (
                  select oid from pg_roles where rolname = current_user
                )
                and privilege.privilege_type = 'EXECUTE'
              ), false) as "directExecute",
              coalesce(bool_or(
                privilege.grantee = 0
                and privilege.privilege_type = 'EXECUTE'
              ), false) as "publicExecute"
            from pg_proc as procedure_row
            cross join lateral aclexplode(
              coalesce(
                procedure_row.proacl,
                acldefault('f', procedure_row.proowner)
              )
            ) as privilege
            where procedure_row.oid = '${helper.procedure}'::regprocedure
            group by procedure_row.oid, procedure_row.proowner
          `),
        );
        expect(privilegeRows[0]).toBeDefined();
        expect(privilegeRows[0]?.owner).not.toBe(applicationRoleName);
        expect(privilegeRows[0]?.directExecute).toBe(true);
        expect(privilegeRows[0]?.publicExecute).toBe(false);
      }

      const roleName = `cvg_rls_fn_${randomUUID().replaceAll("-", "")}`;
      const rolePassword = randomUUID().replaceAll("-", "");
      const role = quoteRoleIdentifier(roleName);
      const source = new URL(liveDatabaseUrl);
      let restricted: ReturnType<typeof createPostgresDatabase> | null = null;
      let roleCreated = false;

      try {
        await harness.admin.db.execute(
          sql.raw(
            `create role ${role} login password '${rolePassword}' nosuperuser nobypassrls`,
          ),
        );
        roleCreated = true;
        await harness.admin.db.execute(
          sql.raw(`grant usage on schema public to ${role}`),
        );

        restricted = createPostgresDatabase(
          (() => {
            const restrictedUrl = new URL(source);
            restrictedUrl.username = roleName;
            restrictedUrl.password = rolePassword;
            restrictedUrl.hash = "";
            return restrictedUrl.toString();
          })(),
        );

        for (const helper of rlsHelpers) {
          await expect(
            harness.application.db.execute(sql.raw(`select ${helper.call}`)),
          ).resolves.toBeDefined();
          const rejection = await restricted.db
            .execute(sql.raw(`select ${helper.call}`))
            .then(
              () => null,
              (error: unknown) => error,
            );
          expect(rejection).not.toBeNull();
          expect(containsPermissionDenied(rejection)).toBe(true);
        }
      } finally {
        const cleanupErrors: unknown[] = [];
        const attemptCleanup = async (
          action: () => Promise<unknown>,
        ): Promise<void> => {
          try {
            await action();
          } catch (error) {
            cleanupErrors.push(error);
          }
        };

        await attemptCleanup(async () => {
          if (restricted !== null) await restricted.close();
        });
        if (roleCreated) {
          await attemptCleanup(() =>
            harness.admin.db.execute(
              sql.raw(`revoke usage on schema public from ${role}`),
            ),
          );
          await attemptCleanup(() =>
            harness.admin.db.execute(sql.raw(`drop role if exists ${role}`)),
          );
        }
        await attemptCleanup(() => closeLivePostgresHarness(harness));
        assertCleanupSucceeded(cleanupErrors);
      }
    });

    it("enforces the explicit application table matrix and default deny", async ({
      skip,
    }) => {
      const harness = await openLivePostgresHarness();
      if (!hasAdministrativeCleanupCapability(harness.adminRole)) {
        await closeLivePostgresHarness(harness);
        skip(liveAdminCapabilityMessage);
        return;
      }

      try {
        expect(harness.applicationRole.isSuperuser).toBe(false);
        expect(harness.applicationRole.bypassesRls).toBe(false);
        expect(harness.applicationRole.canCreateRoles).toBe(false);

        const { applicationExcludedTables, applicationTablePrivileges } =
          await import("../../scripts/provision-ci-postgres.mjs");
        const expectedPrivileges = applicationTablePrivileges as Record<
          string,
          readonly string[]
        >;
        const excludedTables = applicationExcludedTables as readonly string[];
        const tableRows = await harness.application.db.execute<{
          readonly tableName: string;
          readonly canSelect: boolean;
          readonly canInsert: boolean;
          readonly canUpdate: boolean;
          readonly canDelete: boolean;
          readonly canTruncate: boolean;
          readonly canReference: boolean;
          readonly canTrigger: boolean;
        }>(sql`
          select
            relation.relname as "tableName",
            has_table_privilege(current_user, relation.oid, 'SELECT') as "canSelect",
            has_table_privilege(current_user, relation.oid, 'INSERT') as "canInsert",
            has_table_privilege(current_user, relation.oid, 'UPDATE') as "canUpdate",
            has_table_privilege(current_user, relation.oid, 'DELETE') as "canDelete",
            has_table_privilege(current_user, relation.oid, 'TRUNCATE') as "canTruncate",
            has_table_privilege(current_user, relation.oid, 'REFERENCES') as "canReference",
            has_table_privilege(current_user, relation.oid, 'TRIGGER') as "canTrigger"
          from pg_class as relation
          join pg_namespace as namespace on namespace.oid = relation.relnamespace
          where namespace.nspname = 'public'
            and relation.relkind in ('r', 'p')
          order by relation.relname
        `);
        const expectedTableNames = [
          ...Object.keys(expectedPrivileges),
          ...excludedTables,
        ].sort();
        expect(tableRows.map((row) => row.tableName)).toEqual(
          expectedTableNames,
        );

        for (const row of tableRows) {
          const privileges = expectedPrivileges[row.tableName] ?? [];
          expect(row.canSelect).toBe(privileges.includes("SELECT"));
          expect(row.canInsert).toBe(privileges.includes("INSERT"));
          expect(row.canUpdate).toBe(privileges.includes("UPDATE"));
          expect(row.canDelete).toBe(privileges.includes("DELETE"));
          expect(row.canTruncate).toBe(false);
          expect(row.canReference).toBe(false);
          expect(row.canTrigger).toBe(false);
        }

        const directPrivilegeRows = await harness.admin.db.execute<{
          readonly tableName: string;
          readonly privilegeType: string;
        }>(sql`
          select
            relation.relname as "tableName",
            privilege.privilege_type as "privilegeType"
          from pg_class as relation
          join pg_namespace as namespace on namespace.oid = relation.relnamespace
          cross join lateral aclexplode(
            coalesce(relation.relacl, acldefault('r', relation.relowner))
          ) as privilege
          where namespace.nspname = 'public'
            and relation.relkind in ('r', 'p')
            and privilege.grantee = (
              select oid
              from pg_roles
              where rolname = ${harness.applicationRole.roleName}
            )
          order by relation.relname, privilege.privilege_type
        `);
        const directPrivilegesByTable = new Map<string, string[]>();
        for (const row of directPrivilegeRows) {
          const privileges = directPrivilegesByTable.get(row.tableName) ?? [];
          privileges.push(row.privilegeType);
          directPrivilegesByTable.set(row.tableName, privileges);
        }
        expect([...directPrivilegesByTable.keys()].sort()).toEqual(
          Object.keys(expectedPrivileges).sort(),
        );
        for (const [tableName, privileges] of Object.entries(
          expectedPrivileges,
        )) {
          expect(directPrivilegesByTable.get(tableName)?.sort()).toEqual(
            [...privileges].sort(),
          );
        }

        const publicPrivilegeRows = await harness.admin.db.execute<{
          readonly tableName: string;
          readonly privilegeType: string;
        }>(sql`
          select
            relation.relname as "tableName",
            privilege.privilege_type as "privilegeType"
          from pg_class as relation
          join pg_namespace as namespace on namespace.oid = relation.relnamespace
          cross join lateral aclexplode(
            coalesce(relation.relacl, acldefault('r', relation.relowner))
          ) as privilege
          where namespace.nspname = 'public'
            and relation.relkind in ('r', 'p')
            and privilege.grantee = 0
          order by relation.relname, privilege.privilege_type
        `);
        expect(publicPrivilegeRows).toEqual([]);

        const applicationMembershipRows = await harness.admin.db.execute<{
          readonly parentRole: string;
        }>(sql`
          select parent.rolname as "parentRole"
          from pg_auth_members as membership
          join pg_roles as member on member.oid = membership.member
          join pg_roles as parent on parent.oid = membership.roleid
          where member.rolname = ${harness.applicationRole.roleName}
          order by parent.rolname
        `);
        expect(applicationMembershipRows).toEqual([]);

        const publicSequenceRows = await harness.admin.db.execute<{
          readonly sequenceName: string;
        }>(sql`
          select relation.relname as "sequenceName"
          from pg_class as relation
          join pg_namespace as namespace on namespace.oid = relation.relnamespace
          where namespace.nspname = 'public'
            and relation.relkind = 'S'
          order by relation.relname
        `);
        expect(publicSequenceRows).toEqual([]);

        const defaultPrivilegeRows = await harness.admin.db.execute<{
          readonly objectType: string;
          readonly privilegeType: string;
        }>(sql`
          select
            default_acl.defaclobjtype as "objectType",
            privilege.privilege_type as "privilegeType"
          from pg_default_acl as default_acl
          left join pg_namespace as namespace
            on namespace.oid = default_acl.defaclnamespace
          cross join lateral aclexplode(default_acl.defaclacl) as privilege
          left join pg_roles as grantee on grantee.oid = privilege.grantee
          where (namespace.nspname = 'public' or default_acl.defaclnamespace = 0)
            and (
              privilege.grantee = 0
              or grantee.rolname = ${harness.applicationRole.roleName}
            )
            and privilege.privilege_type in (
              'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE',
              'REFERENCES', 'TRIGGER', 'USAGE'
            )
          order by default_acl.defaclobjtype, privilege.privilege_type
        `);
        expect(defaultPrivilegeRows).toEqual([]);

        const accessRejection = await harness.application.db
          .execute(
            sql`
            select id
            from public.knowledge_documents
            limit 1
          `,
          )
          .then(
            () => null,
            (error: unknown) => error,
          );
        expect(accessRejection).not.toBeNull();
        expect(containsTablePermissionDenied(accessRejection)).toBe(true);
      } finally {
        await closeLivePostgresHarness(harness);
      }
    });
  },
);
