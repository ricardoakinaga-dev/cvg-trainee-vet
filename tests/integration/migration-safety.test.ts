import { describe, expect, it } from "vitest";

import {
  readMigrationSql,
  validateMigrationSafety,
} from "../../scripts/verify-migration-safety.mjs";

describe("migration safety (N/N-1 expand/contract)", () => {
  it("rejects destructive schema changes that break a running N-1 deployment", () => {
    const destructive = [
      "ALTER TABLE accounts DROP COLUMN legacy_field;",
      "DROP TABLE old_attempts;",
      "ALTER TABLE accounts ALTER COLUMN status TYPE text;",
      "ALTER TABLE accounts RENAME COLUMN status TO state;",
      "ALTER TABLE accounts RENAME TO partners;",
    ];
    for (const sql of destructive) {
      const findings = validateMigrationSafety(sql, "9999_bad.sql");
      expect(findings.length).toBeGreaterThan(0);
    }
  });

  it("allows additive and constraint-relaxing changes (safe for N-1)", () => {
    const additive = [
      "ALTER TABLE accounts ADD COLUMN session_generation integer DEFAULT 0;",
      "ALTER TABLE accounts ADD COLUMN migrated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL;",
      "ALTER TABLE accounts ADD COLUMN optional_metadata jsonb;",
      "CREATE TABLE new_table (id uuid PRIMARY KEY);",
      "ALTER TABLE appeals DROP CONSTRAINT appeals_decision_check;",
      "CREATE INDEX IF NOT EXISTS idx ON accounts (id);",
    ];
    for (const sql of additive) {
      const findings = validateMigrationSafety(sql, "9999_ok.sql");
      expect(findings).toEqual([]);
    }
  });

  it("rejects data-destructive and required-column changes that break N-1", () => {
    const incompatible = [
      ["TRUNCATE TABLE accounts;", "truncate-table"],
      ["DELETE FROM accounts WHERE status = 'DISABLED';", "delete-data"],
      [
        "ALTER TABLE accounts ALTER COLUMN roles SET NOT NULL;",
        "set-not-null-without-backfill-guard",
      ],
      [
        "ALTER TABLE accounts ADD COLUMN required_code text NOT NULL;",
        "required-column-without-default",
      ],
    ] as const;

    for (const [sql, rule] of incompatible) {
      expect(validateMigrationSafety(sql, "9999_bad.sql")).toEqual(
        expect.arrayContaining([expect.objectContaining({ rule })]),
      );
    }
  });

  it("allows a contract constraint only after an explicit backfill guard", () => {
    const guarded = `
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM accounts WHERE roles IS NULL) THEN
          RAISE EXCEPTION 'legacy rows require backfill';
        END IF;
      END $$;
      ALTER TABLE accounts ALTER COLUMN roles SET NOT NULL;
    `;

    expect(validateMigrationSafety(guarded, "9999_guarded.sql")).toEqual([]);
  });

  it("finds no destructive migration in the repository", async () => {
    const migrations = await readMigrationSql();
    const findings = [];
    for (const { name, sql } of migrations) {
      findings.push(...validateMigrationSafety(sql, name));
    }
    expect(findings.map((f) => `${f.migrationName}:${f.rule}`)).toEqual([]);
  });
});
