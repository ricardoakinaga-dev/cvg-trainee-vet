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
          await expect(
            restricted.db.execute(sql.raw(`select ${helper.call}`)),
          ).rejects.toThrow(/permission denied for function/u);
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
  },
);
