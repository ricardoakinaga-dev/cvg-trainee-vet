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

  it("keeps feedback history append-only, scoped and free of participant text", async () => {
    const migrationPath = fileURLToPath(
      new URL(
        "../../packages/persistence/drizzle/0037_feedback_ticket_history.sql",
        import.meta.url,
      ),
    );
    const repositoryPath = fileURLToPath(
      new URL(
        "../../packages/persistence/src/feedback-ticket-history-repository.ts",
        import.meta.url,
      ),
    );
    const learningStatePath = fileURLToPath(
      new URL(
        "../../packages/persistence/src/learning-state-repository.ts",
        import.meta.url,
      ),
    );
    const provisioningPath = fileURLToPath(
      new URL("../../scripts/provision-ci-postgres.mjs", import.meta.url),
    );
    const [migration, repository, learningState, provisioning] =
      await Promise.all([
        readFile(migrationPath, "utf8"),
        readFile(repositoryPath, "utf8"),
        readFile(learningStatePath, "utf8"),
        readFile(provisioningPath, "utf8"),
      ]);

    expect(migration).toContain('CREATE TABLE "feedback_ticket_history"');
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "feedback_ticket_history_version_idx"',
    );
    expect(migration).toContain(
      "CREATE TRIGGER feedback_ticket_history_append_only",
    );
    expect(migration).toContain(
      'REVOKE UPDATE, DELETE ON "feedback_ticket_history" FROM PUBLIC',
    );
    expect(migration).toContain(
      'ALTER TABLE "feedback_ticket_history" FORCE ROW LEVEL SECURITY',
    );
    expect(migration).toContain(
      'CREATE POLICY "feedback_ticket_history_scope_select_policy"',
    );
    expect(migration).toContain(
      'CREATE POLICY "feedback_ticket_history_scope_insert_policy"',
    );
    expect(repository).toContain("setDatabaseSecurityContext");
    expect(repository).toContain("feedbackTicketHistoryRowToEvent");
    expect(repository).not.toContain("description");
    expect(repository).not.toContain("participantId");
    expect(learningState).toContain("tx.insert(feedbackTicketHistory)");
    expect(provisioning).toContain(
      'REVOKE UPDATE, DELETE ON TABLE "feedback_ticket_history"',
    );
  });

  it("keeps feedback history parent identity and insert integrity bounded", async () => {
    const migrationPath = fileURLToPath(
      new URL(
        "../../packages/persistence/drizzle/0038_feedback_ticket_history_integrity.sql",
        import.meta.url,
      ),
    );
    const schemaPath = fileURLToPath(
      new URL("../../packages/persistence/src/schema.ts", import.meta.url),
    );
    const [migration, schema] = await Promise.all([
      readFile(migrationPath, "utf8"),
      readFile(schemaPath, "utf8"),
    ]);

    expect(migration).toContain(
      'CREATE UNIQUE INDEX "feedback_tickets_id_scope_idx"',
    );
    expect(migration).toContain(
      'DROP CONSTRAINT "feedback_ticket_history_ticket_id_feedback_tickets_id_fk"',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("ticket_id", "scope_id") REFERENCES "public"."feedback_tickets"("id", "scope_id")',
    );
    expect(migration).toContain("NOT VALID");
    expect(migration).toContain(
      "CREATE FUNCTION cvg_validate_feedback_ticket_history_insert()",
    );
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).toContain(
      "CREATE TRIGGER feedback_ticket_history_parent_integrity",
    );
    expect(migration).toContain(
      "NEW.ticket_version IS DISTINCT FROM parent_version",
    );
    expect(migration).toContain("NEW.to_status IS DISTINCT FROM parent_status");
    expect(migration).toContain("NEW.event_type = 'CRIADO'");
    expect(migration).toContain("NEW.ticket_version <> 0");
    expect(migration).toContain("NEW.from_status IS NOT NULL");
    expect(migration).toContain("NEW.event_type = 'STATUS_ALTERADO'");
    expect(migration).toContain("NEW.ticket_version < 1");
    expect(migration).toContain("NEW.from_status IS NULL");
    expect(migration).toContain("FOR UPDATE");
    expect(migration).not.toContain(
      "DROP TRIGGER feedback_ticket_history_append_only",
    );
    expect(migration).not.toContain(
      'DISABLE ROW LEVEL SECURITY ON "feedback_ticket_history"',
    );
    expect(schema).toContain(
      'uniqueIndex("feedback_tickets_id_scope_idx").on(table.id, table.scopeId)',
    );
    expect(schema).toContain('name: "feedback_ticket_history_ticket_scope_fk"');
    expect(schema).toContain("columns: [table.ticketId, table.scopeId]");
    expect(schema).toContain(
      "foreignColumns: [feedbackTickets.id, feedbackTickets.scopeId]",
    );
  });
});
