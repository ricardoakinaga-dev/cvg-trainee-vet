import { access, readFile, stat } from "node:fs/promises";
import { EventEmitter } from "node:events";
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
    expect(provisioning).toContain(
      "GRANT EXECUTE ON FUNCTION %s TO %I WITH GRANT OPTION",
    );
  });

  it("keeps the journey visibility oracle private and explicitly provisioned", async () => {
    const migrationPath = fileURLToPath(
      new URL(
        "../../packages/persistence/drizzle/0047_learning_journey_visibility_oracle.sql",
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
      "CREATE OR REPLACE FUNCTION cvg_learning_activity_journey_visible",
    );
    expect(migration).toContain(
      "REVOKE EXECUTE ON FUNCTION cvg_learning_activity_journey_visible(uuid, text) FROM PUBLIC",
    );
    expect(provisioning).toContain(
      "public.cvg_learning_activity_journey_visible(uuid,text)",
    );
  });

  it("keeps participant activity scope resolution and history RLS hardening private", async () => {
    const migrationPath = fileURLToPath(
      new URL(
        "../../packages/persistence/drizzle/0048_learning_participant_context_hardening.sql",
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
      "CREATE OR REPLACE FUNCTION cvg_learning_activity_scope_for_participant",
    );
    expect(migration).toContain(
      "REVOKE EXECUTE ON FUNCTION cvg_learning_activity_scope_for_participant(uuid, text) FROM PUBLIC",
    );
    expect(migration).toContain(
      'CREATE POLICY "feedback_ticket_history_participant_select_policy"',
    );
    expect(migration).toContain(
      'CREATE POLICY "feedback_ticket_history_participant_insert_policy"',
    );
    expect(migration).toContain("current_setting('cvg.scope_id', true) <> ''");
    expect(provisioning).toContain(
      "public.cvg_learning_activity_scope_for_participant(uuid,text)",
    );
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
      'REVOKE UPDATE, DELETE ON TABLE public."authoring_draft_idempotency"',
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
      'REVOKE UPDATE, DELETE ON TABLE public."feedback_ticket_history"',
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

  it("keeps feedback history event lineage fail-closed for new rows", async () => {
    const migrationPath = fileURLToPath(
      new URL(
        "../../packages/persistence/drizzle/0039_feedback_ticket_history_event_lineage.sql",
        import.meta.url,
      ),
    );
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION cvg_validate_feedback_ticket_history_insert()",
    );
    expect(migration).toContain("previous_status text");
    expect(migration).toContain("NEW.to_status <> 'NOVO'");
    expect(migration).toContain(
      "NEW.from_status IS DISTINCT FROM previous_status",
    );
    expect(migration).toContain(
      "history.ticket_version = NEW.ticket_version - 1",
    );
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).toContain("FOR UPDATE");
  });

  it("keeps feedback metadata updates scoped, versioned and append-only", async () => {
    const migrationPath = fileURLToPath(
      new URL(
        "../../packages/persistence/drizzle/0041_feedback_triage_metadata.sql",
        import.meta.url,
      ),
    );
    const repositoryPath = fileURLToPath(
      new URL(
        "../../packages/persistence/src/feedback-triage-metadata-repository.ts",
        import.meta.url,
      ),
    );
    const [migration, repository] = await Promise.all([
      readFile(migrationPath, "utf8"),
      readFile(repositoryPath, "utf8"),
    ]);

    expect(migration).toContain(
      "ADD COLUMN \"priority\" text DEFAULT 'NORMAL' NOT NULL",
    );
    expect(migration).toContain('ADD COLUMN "assignee_id" uuid');
    expect(migration).toContain(
      'CREATE POLICY "feedback_tickets_staff_scope_update_policy"',
    );
    expect(migration).toContain(
      "staff feedback updates are limited to triage metadata",
    );
    expect(migration).toContain("NEW.version IS DISTINCT FROM OLD.version + 1");
    expect(migration).toContain("METADATA_ALTERADO");
    expect(migration).toContain(
      "NEW.to_priority IS DISTINCT FROM parent_priority",
    );
    expect(repository).toContain("scopeIds");
    expect(repository).toContain("FeedbackTriageMetadataConflictError");
    expect(repository).toContain("feedbackTicketHistory");
    expect(repository).not.toContain("participantId: input");
  });

  it("keeps participant feedback writes limited to create while staff writes use scope context", async () => {
    const migrationPath = fileURLToPath(
      new URL(
        "../../packages/persistence/drizzle/0042_feedback_ticket_participant_write_rls.sql",
        import.meta.url,
      ),
    );
    const repositoryPath = fileURLToPath(
      new URL(
        "../../packages/persistence/src/learning-state-repository.ts",
        import.meta.url,
      ),
    );
    const useCasesPath = fileURLToPath(
      new URL(
        "../../packages/application/src/learning-state-use-cases.ts",
        import.meta.url,
      ),
    );
    const [migration, repository, useCases] = await Promise.all([
      readFile(migrationPath, "utf8"),
      readFile(repositoryPath, "utf8"),
      readFile(useCasesPath, "utf8"),
    ]);

    expect(migration).toContain(
      'DROP POLICY "feedback_tickets_participant_scope_policy" ON "feedback_tickets"',
    );
    expect(migration).toContain(
      'DROP POLICY "feedback_tickets_staff_scope_select_policy" ON "feedback_tickets"',
    );
    expect(migration).toContain(
      'CREATE POLICY "feedback_tickets_staff_scope_select_policy"',
    );
    expect(migration).toContain(
      "current_setting('cvg.participant_id', true) = ''",
    );
    expect(migration).toContain(
      'CREATE POLICY "feedback_tickets_participant_scope_select_policy"',
    );
    expect(migration).toContain(
      'CREATE POLICY "feedback_tickets_participant_scope_insert_policy"',
    );
    expect(migration).not.toContain('ON "feedback_tickets" FOR ALL USING');
    expect(migration).not.toContain(
      'CREATE POLICY "feedback_tickets_participant_scope_delete_policy"',
    );
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION cvg_guard_feedback_ticket_staff_metadata_update()",
    );
    expect(migration).toContain("NEW.status IS DISTINCT FROM OLD.status");
    expect(migration).toContain("NEW.priority IS DISTINCT FROM OLD.priority");
    expect(migration).toContain("triage metadata or a status transition");
    expect(repository).toContain("StaffPersistenceContext");
    expect(repository).toContain("saveFeedbackTicketAsStaff");
    expect(repository).toContain("findFeedbackTicketAsStaff");
    expect(useCases).toContain("LearningStateStaffContext");
    expect(useCases).toContain("saveFeedbackTicketAsStaff");
    expect(useCases).toContain("findFeedbackTicketAsStaff");
  });

  it("keeps participant feedback history compatible with insert-only RLS", async () => {
    const migrationPath = fileURLToPath(
      new URL(
        "../../packages/persistence/drizzle/0043_feedback_history_participant_insert_rls.sql",
        import.meta.url,
      ),
    );
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION cvg_validate_feedback_ticket_history_insert()",
    );
    expect(migration).toContain("current_setting('cvg.participant_id', true)");
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain(
      "feedback history parent ticket scope does not match",
    );
  });

  it("keeps participant journey scope iteration bound to accepted membership", async () => {
    const migrationPath = fileURLToPath(
      new URL(
        "../../packages/persistence/drizzle/0044_learning_journey_participant_scope_rls.sql",
        import.meta.url,
      ),
    );
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toContain(
      'CREATE POLICY "learning_assignments_participant_scope_policy"',
    );
    expect(migration).toContain(
      'cvg_participant_in_scope("participant_id", "scope_id")',
    );
    expect(migration).toContain(
      "current_setting('cvg.participant_id', true) = ''",
    );
    expect(migration).toContain(
      'CREATE POLICY "activity_assignments_participant_select_policy"',
    );
  });

  it("keeps staff scope policies inactive during participant journey reads", async () => {
    const migrationPath = fileURLToPath(
      new URL(
        "../../packages/persistence/drizzle/0045_learning_journey_staff_scope_rls.sql",
        import.meta.url,
      ),
    );
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toContain(
      'CREATE POLICY "learning_assignments_staff_scope_select_policy"',
    );
    expect(migration).toContain(
      'CREATE POLICY "activity_assignments_staff_scope_select_policy"',
    );
    expect(migration).toContain(
      'CREATE POLICY "assessment_workflows_staff_scope_select_policy"',
    );
    expect(migration).toContain(
      "current_setting('cvg.participant_id', true) = ''",
    );
  });

  it("keeps adaptive activity binding checks server-side and private", async () => {
    const migrationPath = fileURLToPath(
      new URL(
        "../../packages/persistence/drizzle/0046_learning_activity_assignment_insert_rls.sql",
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
      "CREATE OR REPLACE FUNCTION cvg_learning_activity_assignment_insert_allowed",
    );
    expect(migration).toContain(
      "REVOKE EXECUTE ON FUNCTION cvg_learning_activity_assignment_insert_allowed(uuid, uuid, uuid, text) FROM PUBLIC",
    );
    expect(migration).toContain(
      'CREATE POLICY "activity_assignments_adaptive_insert_policy"',
    );
    expect(provisioning).toContain(
      "public.cvg_learning_activity_assignment_insert_allowed(uuid,uuid,uuid,text)",
    );
  });

  it("keeps diagnostic answers closed after finalization and binds result identity", async () => {
    const migrationPath = fileURLToPath(
      new URL(
        "../../packages/persistence/drizzle/0051_diagnostic_sessions.sql",
        import.meta.url,
      ),
    );
    const migration = await readFile(migrationPath, "utf8");

    expect(
      migration.match(/session_record\.status = 'EM_ANDAMENTO'/gu),
    ).toHaveLength(4);
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "diagnostic_results_identity_idx"',
    );
    expect(migration).toContain(
      'ADD CONSTRAINT "diagnostic_sessions_result_identity_fk"',
    );
    expect(migration).toContain(
      "diagnostic result identity does not match session",
    );
  });

  it("keeps the live feedback fixture cleanup scoped and its audit IDs explicit", async () => {
    const integrationPath = fileURLToPath(
      new URL("./postgres-learning-state.test.ts", import.meta.url),
    );
    const integration = await readFile(integrationPath, "utf8");

    expect(integration).not.toContain(
      'truncate table "feedback_ticket_history", "audit_entries"',
    );
    expect(integration).toContain("feedbackCreateRequestId");
    expect(integration).toContain("feedbackCreateCorrelationId");
    expect(integration).toContain("feedbackTransitionRequestId");
    expect(integration).toContain("feedbackTransitionCorrelationId");
  });

  it("keeps adaptive activity assignment integrity enforced by private RLS", async () => {
    const migrationPath = fileURLToPath(
      new URL(
        "../../packages/persistence/drizzle/0049_learning_activity_assignment_integrity_rls.sql",
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
      "CREATE OR REPLACE FUNCTION cvg_learning_activity_assignment_write_allowed",
    );
    expect(migration).toContain("p_activity_assignment_status IN (");
    expect(migration).toContain("version.status = 'PUBLICADO'");
    expect(migration).toContain(
      "version.scope_id IS DISTINCT FROM activity.scope_id",
    );
    expect(migration).toContain(
      "REVOKE EXECUTE ON FUNCTION cvg_learning_activity_assignment_write_allowed(uuid, uuid, uuid, text, text) FROM PUBLIC",
    );
    expect(provisioning).toContain(
      "public.cvg_learning_activity_assignment_write_allowed(uuid,uuid,uuid,text,text)",
    );
  });

  it("keeps unassigned curriculum states out of adaptive activity bindings", async () => {
    const migrationPath = fileURLToPath(
      new URL(
        "../../packages/persistence/drizzle/0050_learning_assignment_status_integrity_rls.sql",
        import.meta.url,
      ),
    );
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION cvg_learning_activity_assignment_write_allowed",
    );
    expect(migration).toContain("assignment.status IN (");
    expect(migration).toContain("'ATRIBUIDO'");
    expect(migration).not.toContain("'NAO_ATRIBUIDO'");
  });

  it("keeps application table privileges explicit and default-deny", async () => {
    const provisioningPath = fileURLToPath(
      new URL("../../scripts/provision-ci-postgres.mjs", import.meta.url),
    );
    const schemaPath = fileURLToPath(
      new URL("../../packages/persistence/src/schema.ts", import.meta.url),
    );
    const [provisioning, schema] = await Promise.all([
      readFile(provisioningPath, "utf8"),
      readFile(schemaPath, "utf8"),
    ]);
    const applicationPrivileges = {
      accounts: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      account_invitations: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      account_recovery_requests: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      content_versions: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      content_editorial_records: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      content_review_decisions: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      authoring_draft_idempotency: ["SELECT", "INSERT"],
      learning_activities: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      learning_activity_items: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      ai_suggestions: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      activity_assignments: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      curriculum_runtime_states: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      diagnostic_results: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      diagnostic_sessions: ["SELECT", "INSERT", "UPDATE"],
      diagnostic_session_answers: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      diagnostic_session_idempotency: ["SELECT", "INSERT", "DELETE"],
      attempts: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      assessment_results: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      answers: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      attempt_idempotency: ["SELECT", "INSERT"],
      answer_idempotency: ["SELECT", "INSERT"],
      assessment_idempotency: ["SELECT", "INSERT"],
      sessions: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      rate_limit_buckets: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      outbox_events: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      audit_entries: ["SELECT", "INSERT"],
      learning_assignments: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      assessment_workflows: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      feedback_tickets: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      feedback_ticket_history: ["SELECT", "INSERT"],
      appeals: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      appeal_review_history: ["SELECT", "INSERT"],
    } as const;

    expect(provisioning).toContain(
      "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM ${appIdentifier}, ${adminIdentifier};",
    );
    expect(provisioning).toContain(
      "REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM ${appIdentifier}, ${adminIdentifier};",
    );
    expect(provisioning).toContain(
      "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC;",
    );
    expect(provisioning).toContain(
      "REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;",
    );
    expect(provisioning).toContain(
      "ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC;",
    );
    expect(provisioning).toContain(
      "ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC;",
    );
    expect(provisioning).toContain(
      "ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC;",
    );
    expect(provisioning).toContain(
      "ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC;",
    );
    expect(provisioning).toContain(
      "ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} REVOKE ALL PRIVILEGES ON TABLES FROM ${appIdentifier};",
    );
    expect(provisioning).toContain(
      "ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} REVOKE ALL PRIVILEGES ON SEQUENCES FROM ${appIdentifier};",
    );
    expect(provisioning).toContain(
      "ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM ${appIdentifier};",
    );
    expect(provisioning).toContain(
      "ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM ${appIdentifier};",
    );
    expect(provisioning).not.toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${appIdentifier};",
    );
    expect(provisioning).not.toContain(
      "ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationIdentifier} IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${appIdentifier};",
    );
    expect(provisioning).not.toContain(
      "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${appIdentifier};",
    );

    const {
      applicationExcludedTables,
      applicationTablePrivileges,
      roleProvisionSql,
    } = await import("../../scripts/provision-ci-postgres.mjs");
    expect(applicationTablePrivileges).toEqual(applicationPrivileges);
    expect(applicationExcludedTables).toEqual(["knowledge_documents"]);
    expect(applicationTablePrivileges).not.toHaveProperty(
      "knowledge_documents",
    );
    const schemaTableNames = [
      ...schema.matchAll(/pgTable\(\s*["']([^"']+)["']/gu),
    ]
      .map((match) => match[1])
      .filter((table): table is string => table !== undefined)
      .sort();
    expect(
      [
        ...Object.keys(applicationTablePrivileges),
        ...applicationExcludedTables,
      ].sort(),
    ).toEqual(schemaTableNames);

    const provisionedSql = roleProvisionSql({
      migration: { role: "cvg", password: "synthetic", database: "cvg" },
      application: {
        role: "cvg_app",
        password: "synthetic",
        database: "cvg",
      },
      admin: {
        role: "cvg_test_admin",
        password: "synthetic",
        database: "cvg",
      },
    });
    for (const [table, privileges] of Object.entries(applicationPrivileges)) {
      expect(provisionedSql).toContain(
        `GRANT ${privileges.join(", ")} ON TABLE public."${table}" TO "cvg_app";`,
      );
    }
    expect(provisionedSql).not.toContain('"knowledge_documents"');
  });

  it("hardens provisioner connection handling and privilege transaction boundaries", async () => {
    const provisioningPath = fileURLToPath(
      new URL("../../scripts/provision-ci-postgres.mjs", import.meta.url),
    );
    const provisioning = await readFile(provisioningPath, "utf8");
    const {
      connectionParts,
      pgpassEntry,
      postgresProcessEnvironment,
      postgresProvisionArgs,
      roleProvisionSql,
    } = await import("../../scripts/provision-ci-postgres.mjs");
    const migration = connectionParts(
      "CVG_MIGRATION_DATABASE_URL",
      "postgresql://cvg:synthetic%3Asecret@db.example:6543/cvg?sslmode=require",
    );
    const args = postgresProvisionArgs(migration, "/tmp/cvg-provision.sql");
    expect(args).not.toContain(
      "postgresql://cvg:synthetic%3Asecret@db.example:6543/cvg?sslmode=require",
    );
    expect(args).not.toContain("synthetic:secret");
    expect(args).not.toContain("select 1");
    expect(pgpassEntry(migration)).toBe(
      "db.example:6543:cvg:cvg:synthetic\\:secret",
    );
    expect(args).toContain("cvg");
    expect(args).toContain("db.example");
    expect(args).toContain("6543");

    const childEnvironment = postgresProcessEnvironment(
      {
        PATH: "/usr/bin",
        DATABASE_URL: "postgresql://runtime:secret@db.example/cvg",
        CVG_MIGRATION_DATABASE_URL:
          "postgresql://cvg:synthetic%3Asecret@db.example/cvg",
        PGPASSWORD: "old",
        PGHOSTADDR: "192.0.2.10",
        PGSSLKEY: "/tmp/sensitive-client-key",
        PGSERVICE: "unsafe-service",
        AWS_SECRET_ACCESS_KEY: "synthetic-secret",
      },
      migration,
      "/tmp/cvg-pgpass-test",
    );
    expect(childEnvironment).toMatchObject({
      PATH: "/usr/bin",
      PGPASSFILE: "/tmp/cvg-pgpass-test",
      PGSSLMODE: "require",
    });
    expect(childEnvironment).not.toHaveProperty("DATABASE_URL");
    expect(childEnvironment).not.toHaveProperty("CVG_MIGRATION_DATABASE_URL");
    expect(childEnvironment).not.toHaveProperty("PGPASSWORD");
    expect(childEnvironment).not.toHaveProperty("PGHOSTADDR");
    expect(childEnvironment).not.toHaveProperty("PGSSLKEY");
    expect(childEnvironment).not.toHaveProperty("PGSERVICE");
    expect(childEnvironment).not.toHaveProperty("AWS_SECRET_ACCESS_KEY");

    const sql = roleProvisionSql({
      migration: { role: "cvg", password: "synthetic", database: "cvg" },
      application: {
        role: "cvg_app",
        password: "synthetic",
        database: "cvg",
      },
      admin: {
        role: "cvg_test_admin",
        password: "synthetic",
        database: "cvg",
      },
    });
    expect(sql).toMatch(/^BEGIN;/u);
    expect(sql).toMatch(/COMMIT;\s*$/u);
    expect(sql).toContain(
      'REVOKE ALL PRIVILEGES ON DATABASE "cvg" FROM PUBLIC;',
    );
    expect(sql).toContain(
      "REVOKE ALL PRIVILEGES ON SCHEMA public FROM PUBLIC;",
    );
    expect(sql).toContain(
      'ALTER DEFAULT PRIVILEGES FOR ROLE "cvg" IN SCHEMA public REVOKE ALL PRIVILEGES ON FUNCTIONS FROM PUBLIC;',
    );
    expect(sql).toContain("NOREPLICATION");
    expect(sql).toContain(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."accounts" TO "cvg_app";',
    );
    expect(sql).toContain(
      'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "cvg_test_admin" WITH GRANT OPTION;',
    );
    expect(sql).toContain(
      'GRANT CONNECT ON DATABASE "cvg" TO "cvg_test_admin" WITH GRANT OPTION;',
    );
    expect(sql).not.toContain('ON TABLE "accounts" TO "cvg_app"');
    expect(sql).not.toMatch(/TO "cvg_app" WITH GRANT OPTION/u);
    expect(provisioning).toContain("mkdtemp");
    expect(provisioning).toContain("PGPASSFILE");
    expect(provisioning).toContain('"--file"');
    expect(provisioning).not.toContain('"--command"');
  });

  it("keeps the actual psql invocation secret-free and cleans temporary files", async () => {
    const { provisionCiPostgres } =
      await import("../../scripts/provision-ci-postgres.mjs");
    const child = new EventEmitter();
    const calls: unknown[][] = [];
    const environment = {
      PATH: "/usr/bin",
      CVG_MIGRATION_DATABASE_URL: "postgresql://cvg:move@db.example:6543/cvg",
      CVG_TEST_DATABASE_URL: "postgresql://cvg_app:app@db.example:6543/cvg",
      CVG_TEST_ADMIN_DATABASE_URL:
        "postgresql://cvg_test_admin:admin@db.example:6543/cvg",
      DATABASE_URL: "postgresql://runtime:run@db.example:6543/cvg",
    };

    const returnedChild = await provisionCiPostgres(environment, (...args) => {
      calls.push(args);
      return child;
    });
    expect(returnedChild).toBe(child);
    expect(calls).toHaveLength(1);
    const [command, rawArgs, rawOptions] = calls[0] ?? [];
    const args = rawArgs as string[];
    const options = rawOptions as {
      readonly env: Record<string, string>;
    };
    expect(command).toBe("psql");
    expect(args).not.toContain(environment.CVG_MIGRATION_DATABASE_URL);
    expect(args).not.toContain("move");
    expect(args).not.toContain("app");
    expect(args).not.toContain("admin");
    expect(args).toContain("--file");
    expect(options.env).toMatchObject({
      PATH: "/usr/bin",
      PGPASSFILE: expect.any(String),
    });
    expect(options.env).not.toHaveProperty("CVG_MIGRATION_DATABASE_URL");
    expect(options.env).not.toHaveProperty("CVG_TEST_DATABASE_URL");
    expect(options.env).not.toHaveProperty("CVG_TEST_ADMIN_DATABASE_URL");
    expect(options.env).not.toHaveProperty("DATABASE_URL");
    expect(options.env).not.toHaveProperty("PGPASSWORD");

    const pgpassFile = options.env.PGPASSFILE;
    const fileIndex = args.indexOf("--file");
    const sqlFile = args[fileIndex + 1];
    expect(sqlFile).toBeDefined();
    expect((await stat(pgpassFile)).mode & 0o777).toBe(0o600);
    expect((await stat(sqlFile!)).mode & 0o777).toBe(0o600);
    expect(await readFile(pgpassFile, "utf8")).toContain(
      "db.example:6543:cvg:cvg:move",
    );
    expect(await readFile(sqlFile!, "utf8")).toContain("cvg_app");

    child.emit("close", 0, null);
    await expect
      .poll(async () => {
        const results = await Promise.allSettled([
          access(pgpassFile),
          access(sqlFile!),
        ]);
        return results.every(({ status }) => status === "rejected");
      })
      .toBe(true);
  });

  it("keeps the runtime least-privilege health guard aligned with the matrix", async () => {
    const databasePath = fileURLToPath(
      new URL("../../packages/persistence/src/database.ts", import.meta.url),
    );
    const databaseSource = await readFile(databasePath, "utf8");

    expect(databaseSource).toContain('rolreplication as "canReplicate"');
    expect(databaseSource).toContain(
      "has_database_privilege(current_user, current_database(), 'CREATE') as \"canCreateInDatabase\"",
    );
    expect(databaseSource).toContain(
      "has_database_privilege(current_user, current_database(), 'TEMPORARY') as \"canUseTemporaryTables\"",
    );
    expect(databaseSource).toContain(
      "has_schema_privilege(current_user, 'public', 'USAGE') as \"canUsePublicSchema\"",
    );
    expect(databaseSource).toContain("role.canReplicate");
    expect(databaseSource).toContain("role.canUseTemporaryTables");
  });
});
