import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "packages/persistence/drizzle/0033_audit_read_scope_hardening.sql",
);

describe("audit trail RLS governance", () => {
  it("requires a dedicated read context and the requested scope", async () => {
    const migration = await readFile(migrationPath, "utf8");
    expect(migration).toContain("cvg.audit_read");
    expect(migration).toContain("cvg.audit_scope_id");
    expect(migration).toContain("scope_id");
    expect(migration).toContain(
      '("scope_id" IS NULL AND "actor_kind" = \'ANONYMOUS\')',
    );
    expect(migration).toContain("IS NULL");
  });

  it("keeps the policy read-only and replaces the broad legacy policy", async () => {
    const migration = await readFile(migrationPath, "utf8");
    expect(migration).toContain(
      'DROP POLICY "audit_entries_select_with_context" ON "audit_entries"',
    );
    expect(migration).toContain(
      'CREATE POLICY "audit_entries_select_with_scoped_context" ON "audit_entries" FOR SELECT',
    );
    expect(migration).not.toContain("FOR UPDATE");
    expect(migration).not.toContain("FOR DELETE");
  });
});
