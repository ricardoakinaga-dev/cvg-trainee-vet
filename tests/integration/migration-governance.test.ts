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
      "GRANT EXECUTE ON FUNCTION public.cvg_participant_in_scope(uuid, uuid) TO %I",
    );
  });
});
