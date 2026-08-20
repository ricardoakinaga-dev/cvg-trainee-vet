import { describe, expect, it } from "vitest";

import {
  readMigrationManifest,
  validateMigrationManifest,
} from "../../scripts/verify-migrations.mjs";
import { readMigrationSql } from "../../scripts/verify-migration-safety.mjs";

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

  it("requires an explicit idempotency integrity closure after migration 0030", async () => {
    const migrations = await readMigrationSql();
    const closure = migrations.find(
      ({ name }) => name === "0032_idempotency_integrity_closure.sql",
    );

    expect(closure?.sql).toMatch(/CURRENT_TIMESTAMP/iu);
    expect(closure?.sql).toMatch(/response_hash[\s\S]*SET NOT NULL/iu);
    expect(closure?.sql).toMatch(/legacy[\s\S]*RAISE EXCEPTION/iu);
    expect(closure?.sql).toMatch(/FORCE ROW LEVEL SECURITY/iu);
    expect(closure?.sql).toMatch(/REVOKE ALL ON TABLE/iu);
    expect(closure?.sql).toMatch(
      /attempt_idempotency_participant_delete_policy[\s\S]*FOR DELETE/iu,
    );
    expect(closure?.sql).toMatch(
      /answer_idempotency_participant_delete_policy[\s\S]*FOR DELETE/iu,
    );
    expect(closure?.sql).toMatch(
      /assessment_idempotency_scope_delete_policy[\s\S]*FOR DELETE/iu,
    );
  });
});
