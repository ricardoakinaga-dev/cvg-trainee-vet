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
      "CREATE TABLE new_table (id uuid PRIMARY KEY);",
      "ALTER TABLE appeals DROP CONSTRAINT appeals_decision_check;",
      "CREATE INDEX IF NOT EXISTS idx ON accounts (id);",
    ];
    for (const sql of additive) {
      const findings = validateMigrationSafety(sql, "9999_ok.sql");
      expect(findings).toEqual([]);
    }
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
