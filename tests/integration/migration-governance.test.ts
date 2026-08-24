import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  readMigrationManifest,
  validateMigrationManifest,
} from "../../scripts/verify-migrations.mjs";

describe("migration governance", () => {
  it("keeps the repository migration chain contiguous and aligned with the journal", async () => {
    const manifest = await readMigrationManifest();

    expect(validateMigrationManifest(manifest)).toMatchObject({
      migrationCount: manifest.sqlNames.length,
      lastIndex: manifest.sqlNames.length - 1,
    });
  });

  it("rejects a missing migration index before a database is touched", () => {
    expect(() =>
      validateMigrationManifest({
        sqlNames: ["0000_initial.sql", "0002_missing.sql"],
        journal: {
          entries: [
            { idx: 0, tag: "0000_initial" },
            { idx: 1, tag: "0002_missing" },
          ],
        },
      }),
    ).toThrow("contiguous");
  });

  it("keeps the curriculum membership oracle private to the application role", async () => {
    const migrationPath = fileURLToPath(
      new URL(
        "../../packages/persistence/drizzle/0034_curriculum_runtime_membership_rls.sql",
        import.meta.url,
      ),
    );
    const provisioningPath = fileURLToPath(
      new URL("../../scripts/provision-ci-postgres.mjs", import.meta.url),
    );
    const [migration, provisioning] = await Promise.all([
      readFile(migrationPath, "utf8"),
      readFile(provisioningPath, "utf8"),
    ]);

    expect(migration).toContain(
      "REVOKE EXECUTE ON FUNCTION cvg_participant_in_scope(uuid, uuid) FROM PUBLIC",
    );
    expect(provisioning).toContain(
      "public.cvg_participant_in_scope(uuid,uuid)",
    );
  });

  it("keeps every SECURITY DEFINER RLS helper private and explicitly granted", async () => {
    const hardeningPath = fileURLToPath(
      new URL(
        "../../packages/persistence/drizzle/0035_rls_helper_execute_hardening.sql",
        import.meta.url,
      ),
    );
    const provisioningPath = fileURLToPath(
      new URL("../../scripts/provision-ci-postgres.mjs", import.meta.url),
    );
    const [hardening, provisioning] = await Promise.all([
      readFile(hardeningPath, "utf8"),
      readFile(provisioningPath, "utf8"),
    ]);
    const helpers = [
      [
        "cvg_learning_activity_in_scope(uuid, text)",
        "public.cvg_learning_activity_in_scope(uuid,text)",
      ],
      [
        "cvg_learning_activity_for_participant(uuid, text)",
        "public.cvg_learning_activity_for_participant(uuid,text)",
      ],
      [
        "cvg_learning_activity_item_insert_allowed(uuid, uuid, text)",
        "public.cvg_learning_activity_item_insert_allowed(uuid,uuid,text)",
      ],
      [
        "cvg_learning_activity_content_for_participant(uuid, text)",
        "public.cvg_learning_activity_content_for_participant(uuid,text)",
      ],
      [
        "cvg_participant_in_scope(uuid, uuid)",
        "public.cvg_participant_in_scope(uuid,uuid)",
      ],
    ] as const;

    for (const [migrationSignature, provisioningSignature] of helpers) {
      expect(hardening).toContain(
        `REVOKE EXECUTE ON FUNCTION ${migrationSignature} FROM PUBLIC`,
      );
      expect(provisioning).toContain(provisioningSignature);
    }
    expect(provisioning).toContain("REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC");
    expect(provisioning).toContain("GRANT EXECUTE ON FUNCTION %s TO %I");
  });

  it("keeps authoring draft idempotency scoped and protected by the repository transaction", async () => {
    const migrationPath = fileURLToPath(
      new URL(
        "../../packages/persistence/drizzle/0036_authoring_draft_idempotency.sql",
        import.meta.url,
      ),
    );
    const repositoryPath = fileURLToPath(
      new URL(
        "../../packages/persistence/src/authoring-repository.ts",
        import.meta.url,
      ),
    );
    const provisionerPath = fileURLToPath(
      new URL("../../scripts/provision-ci-postgres.mjs", import.meta.url),
    );
    const [migration, repository, provisioner] = await Promise.all([
      readFile(migrationPath, "utf8"),
      readFile(repositoryPath, "utf8"),
      readFile(provisionerPath, "utf8"),
    ]);

    expect(migration).toContain('CREATE TABLE "authoring_draft_idempotency"');
    expect(migration).toContain(
      'ALTER TABLE "authoring_draft_idempotency" FORCE ROW LEVEL SECURITY',
    );
    expect(migration).toContain(
      'CREATE POLICY "authoring_draft_idempotency_scope_policy"',
    );
    expect(migration).toContain(
      'CREATE POLICY "authoring_draft_idempotency_insert_policy"',
    );
    expect(migration).toContain(
      'REVOKE UPDATE, DELETE ON "authoring_draft_idempotency" FROM PUBLIC',
    );
    expect(migration).toContain(
      "authoring_draft_idempotency_editorial_identity_fk",
    );
    expect(migration).toContain(
      "authoring_draft_idempotency_version_identity_fk",
    );
    expect(migration).toContain(
      'CREATE POLICY "audit_entries_insert_with_scoped_context"',
    );
    expect(provisioner).toContain(
      'REVOKE UPDATE, DELETE ON TABLE "authoring_draft_idempotency"',
    );
    expect(repository).toContain("idempotency record identity mismatch");
    expect(repository).toContain("db.transaction(async (transaction)");
    expect(repository).toContain("pg_advisory_xact_lock");
    expect(repository).toContain("PersistenceConflictError");
  });
});
