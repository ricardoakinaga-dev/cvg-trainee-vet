-- Private PROPOSED native storage. CURRICULUM_ATTEMPT only; no clinical publication.
-- No backfill. Trusted writer must validate original-INICIAR capture, complete
-- membership, terminal witnesses and D-102 applicable summative approval.
-- Audit/capture correspondence below does NOT prove D-102 grades or approval.
CREATE UNIQUE INDEX "learning_assignments_identity_idx" ON "learning_assignments" ("id", "participant_id", "scope_id", "module_id");
--> statement-breakpoint
CREATE TABLE "curriculum_module_blueprint_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "blueprint_id" text NOT NULL,
  "version" integer NOT NULL,
  "scope_id" uuid NOT NULL,
  "module_id" text NOT NULL,
  "approval_decision_id" uuid NOT NULL,
  "approved_by" uuid NOT NULL,
  "approved_at" timestamptz NOT NULL,
  "snapshot" jsonb NOT NULL,
  CONSTRAINT "module_blueprint_version_check" CHECK ("curriculum_module_blueprint_versions"."version" >= 1),
  CONSTRAINT "module_blueprint_module_check" CHECK ("curriculum_module_blueprint_versions"."module_id" ~ '^M(0[1-9]|1[0-9]|2[0-4])$'),
  CONSTRAINT "module_blueprint_name_check" CHECK (length(trim("curriculum_module_blueprint_versions"."blueprint_id")) between 1 and 200),
  CONSTRAINT "module_blueprint_snapshot_check" CHECK (coalesce(
      jsonb_typeof("curriculum_module_blueprint_versions"."snapshot") = 'object'
      and jsonb_typeof("curriculum_module_blueprint_versions"."snapshot"->'questionCountsBySession') = 'array'
      and jsonb_array_length("curriculum_module_blueprint_versions"."snapshot"->'questionCountsBySession') = 4
      and jsonb_typeof("curriculum_module_blueprint_versions"."snapshot"->'objectiveIds') = 'array'
      and jsonb_array_length("curriculum_module_blueprint_versions"."snapshot"->'objectiveIds') between 1 and 100
      and jsonb_typeof("curriculum_module_blueprint_versions"."snapshot"->'itemManifest') = 'array'
      and jsonb_array_length("curriculum_module_blueprint_versions"."snapshot"->'itemManifest') between 1 and 100
      and jsonb_typeof("curriculum_module_blueprint_versions"."snapshot"->'questionTotal') = 'number'
      and ("curriculum_module_blueprint_versions"."snapshot"->>'questionTotal')::integer > 0
      and jsonb_typeof("curriculum_module_blueprint_versions"."snapshot"->'openResponseCount') = 'number'
      and ("curriculum_module_blueprint_versions"."snapshot"->>'openResponseCount')::integer > 0
      and ("curriculum_module_blueprint_versions"."snapshot"->>'questionTotal')::integer + ("curriculum_module_blueprint_versions"."snapshot"->>'openResponseCount')::integer
        = jsonb_array_length("curriculum_module_blueprint_versions"."snapshot"->'itemManifest')
      and not jsonb_path_exists("curriculum_module_blueprint_versions"."snapshot", '$.itemManifest[*] ? (@.type() != "object")'), false))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "module_blueprint_version_idx" ON "curriculum_module_blueprint_versions" ("scope_id", "blueprint_id", "version");
--> statement-breakpoint
CREATE UNIQUE INDEX "module_blueprint_identity_idx" ON "curriculum_module_blueprint_versions" ("id", "version", "scope_id", "module_id");
--> statement-breakpoint
ALTER TABLE "curriculum_module_blueprint_versions" ADD CONSTRAINT "curriculum_module_blueprint_versions_approval_decision_id_audit_entries_id_fk" FOREIGN KEY ("approval_decision_id") REFERENCES "audit_entries" ("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "curriculum_module_blueprint_versions" ADD CONSTRAINT "curriculum_module_blueprint_versions_approved_by_accounts_id_fk" FOREIGN KEY ("approved_by") REFERENCES "accounts" ("id") ON DELETE RESTRICT;
--> statement-breakpoint
CREATE TABLE "curriculum_module_obligation_manifests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "version" integer NOT NULL,
  "scope_id" uuid NOT NULL,
  "module_id" text NOT NULL,
  "blueprint_version_id" uuid NOT NULL,
  "blueprint_version" integer NOT NULL,
  "approval_decision_id" uuid NOT NULL,
  "approved_by" uuid NOT NULL,
  "approved_at" timestamptz NOT NULL,
  "obligations" jsonb NOT NULL,
  CONSTRAINT "module_manifest_version_check" CHECK ("curriculum_module_obligation_manifests"."version" >= 1 and "curriculum_module_obligation_manifests"."blueprint_version" >= 1),
  CONSTRAINT "module_manifest_module_check" CHECK ("curriculum_module_obligation_manifests"."module_id" ~ '^M(0[1-9]|1[0-9]|2[0-4])$'),
  CONSTRAINT "module_obligations_json_check" CHECK (coalesce(jsonb_typeof("curriculum_module_obligation_manifests"."obligations") = 'array'
      and jsonb_array_length("curriculum_module_obligation_manifests"."obligations") between 1 and 100
      and not jsonb_path_exists("curriculum_module_obligation_manifests"."obligations", '$[*] ? (@.type() != "object" || !exists(@.evidenceKind) || @.evidenceKind.type() != "string" || @.evidenceKind != "CURRICULUM_ATTEMPT" || !exists(@.items) || @.items.type() != "array" || @.items.size() < 1 || @.items.size() > 100)')
      and not jsonb_path_exists("curriculum_module_obligation_manifests"."obligations", '$[*].items[*] ? (@.type() != "object")'), false))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "module_manifest_identity_idx" ON "curriculum_module_obligation_manifests" ("id", "version", "blueprint_version_id", "blueprint_version", "scope_id", "module_id");
--> statement-breakpoint
ALTER TABLE "curriculum_module_obligation_manifests" ADD CONSTRAINT "curriculum_module_obligation_manifests_approval_decision_id_audit_entries_id_fk" FOREIGN KEY ("approval_decision_id") REFERENCES "audit_entries" ("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "curriculum_module_obligation_manifests" ADD CONSTRAINT "curriculum_module_obligation_manifests_approved_by_accounts_id_fk" FOREIGN KEY ("approved_by") REFERENCES "accounts" ("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "curriculum_module_obligation_manifests" ADD CONSTRAINT "module_manifest_blueprint_fk" FOREIGN KEY ("blueprint_version_id", "blueprint_version", "scope_id", "module_id") REFERENCES "curriculum_module_blueprint_versions" ("id", "version", "scope_id", "module_id") ON DELETE RESTRICT;
--> statement-breakpoint
CREATE TABLE "curriculum_assignment_obligations" (
  "assignment_id" uuid PRIMARY KEY NOT NULL,
  "participant_id" uuid NOT NULL,
  "scope_id" uuid NOT NULL,
  "module_id" text NOT NULL,
  "manifest_id" uuid NOT NULL,
  "manifest_version" integer NOT NULL,
  "blueprint_version_id" uuid NOT NULL,
  "blueprint_version" integer NOT NULL,
  "bound_at" timestamptz NOT NULL,
  "assignment_version" integer NOT NULL,
  CONSTRAINT "module_binding_version_check" CHECK ("curriculum_assignment_obligations"."assignment_version" >= 1 and "curriculum_assignment_obligations"."manifest_version" >= 1 and "curriculum_assignment_obligations"."blueprint_version" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "module_assignment_binding_identity_idx" ON "curriculum_assignment_obligations" ("assignment_id", "participant_id", "scope_id", "module_id", "manifest_id", "manifest_version", "blueprint_version_id", "blueprint_version");
--> statement-breakpoint
ALTER TABLE "curriculum_assignment_obligations" ADD CONSTRAINT "module_binding_assignment_fk" FOREIGN KEY ("assignment_id", "participant_id", "scope_id", "module_id") REFERENCES "learning_assignments" ("id", "participant_id", "scope_id", "module_id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "curriculum_assignment_obligations" ADD CONSTRAINT "module_binding_manifest_fk" FOREIGN KEY ("manifest_id", "manifest_version", "blueprint_version_id", "blueprint_version", "scope_id", "module_id") REFERENCES "curriculum_module_obligation_manifests" ("id", "version", "blueprint_version_id", "blueprint_version", "scope_id", "module_id") ON DELETE RESTRICT;
--> statement-breakpoint
CREATE TABLE "curriculum_module_completion_receipts" (
  "assignment_id" uuid PRIMARY KEY NOT NULL,
  "participant_id" uuid NOT NULL,
  "scope_id" uuid NOT NULL,
  "module_id" text NOT NULL,
  "manifest_id" uuid NOT NULL,
  "manifest_version" integer NOT NULL,
  "blueprint_version_id" uuid NOT NULL,
  "blueprint_version" integer NOT NULL,
  "completed_assignment_version" integer NOT NULL,
  "completed_at" timestamptz NOT NULL,
  "actor_id" uuid NOT NULL,
  "request_id" uuid NOT NULL,
  "correlation_id" uuid NOT NULL,
  "audit_entry_id" uuid NOT NULL,
  "witnesses" jsonb NOT NULL,
  CONSTRAINT "module_receipt_version_check" CHECK ("curriculum_module_completion_receipts"."completed_assignment_version" >= 2 and "curriculum_module_completion_receipts"."manifest_version" >= 1 and "curriculum_module_completion_receipts"."blueprint_version" >= 1),
  CONSTRAINT "module_completion_witnesses_check" CHECK (coalesce(jsonb_typeof("curriculum_module_completion_receipts"."witnesses") = 'array'
      and jsonb_array_length("curriculum_module_completion_receipts"."witnesses") between 1 and 100
      and not jsonb_path_exists("curriculum_module_completion_receipts"."witnesses", '$[*] ? (@.type() != "object" || !exists(@.activityId) || @.activityId.type() != "string" || !exists(@.attemptId) || @.attemptId.type() != "string" || !exists(@.attemptVersion) || @.attemptVersion.type() != "number" || @.attemptVersion < 1 || !exists(@.formVersionId) || @.formVersionId.type() != "string" || !exists(@.formVersion) || @.formVersion.type() != "number" || @.formVersion < 1 || !exists(@.correctedAt) || @.correctedAt.type() != "string" || (exists(@.assessmentResultId) && (@.assessmentResultId.type() != "string" || !(@.assessmentResultId like_regex "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"))))'), false))
);
--> statement-breakpoint
ALTER TABLE "curriculum_module_completion_receipts" ADD CONSTRAINT "curriculum_module_completion_receipts_actor_id_accounts_id_fk" FOREIGN KEY ("actor_id") REFERENCES "accounts" ("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "curriculum_module_completion_receipts" ADD CONSTRAINT "curriculum_module_completion_receipts_audit_entry_id_audit_entries_id_fk" FOREIGN KEY ("audit_entry_id") REFERENCES "audit_entries" ("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "curriculum_module_completion_receipts" ADD CONSTRAINT "module_receipt_binding_fk" FOREIGN KEY ("assignment_id", "participant_id", "scope_id", "module_id", "manifest_id", "manifest_version", "blueprint_version_id", "blueprint_version") REFERENCES "curriculum_assignment_obligations" ("assignment_id", "participant_id", "scope_id", "module_id", "manifest_id", "manifest_version", "blueprint_version_id", "blueprint_version") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "curriculum_module_blueprint_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "curriculum_module_blueprint_versions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "curriculum_module_obligation_manifests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "curriculum_module_obligation_manifests" FORCE ROW LEVEL SECURITY;
ALTER TABLE "curriculum_assignment_obligations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "curriculum_assignment_obligations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "curriculum_module_completion_receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "curriculum_module_completion_receipts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Generic audit trigger has no column dependencies: it unconditionally rejects
-- UPDATE/DELETE. Its reuse here does not expose or rewrite audit entries.
CREATE TRIGGER module_blueprint_append_only BEFORE UPDATE OR DELETE
  ON curriculum_module_blueprint_versions FOR EACH ROW EXECUTE FUNCTION cvg_prevent_audit_mutation();
CREATE TRIGGER module_manifest_append_only BEFORE UPDATE OR DELETE
  ON curriculum_module_obligation_manifests FOR EACH ROW EXECUTE FUNCTION cvg_prevent_audit_mutation();
CREATE TRIGGER module_binding_append_only BEFORE UPDATE OR DELETE
  ON curriculum_assignment_obligations FOR EACH ROW EXECUTE FUNCTION cvg_prevent_audit_mutation();
CREATE TRIGGER module_receipt_append_only BEFORE UPDATE OR DELETE
  ON curriculum_module_completion_receipts FOR EACH ROW EXECUTE FUNCTION cvg_prevent_audit_mutation();
REVOKE UPDATE, DELETE, TRUNCATE ON curriculum_module_blueprint_versions,
  curriculum_module_obligation_manifests, curriculum_assignment_obligations,
  curriculum_module_completion_receipts FROM PUBLIC;
--> statement-breakpoint
-- Scoped staff may publish technical immutable snapshots. Participant/service
-- contexts cannot publish. No role grants, clinical seed, or public projection.
CREATE POLICY module_blueprint_insert ON curriculum_module_blueprint_versions FOR INSERT WITH CHECK (
  scope_id::text = current_setting('cvg.scope_id', true)
  AND coalesce(current_setting('cvg.participant_id', true), '') = ''
);
CREATE POLICY module_manifest_insert ON curriculum_module_obligation_manifests FOR INSERT WITH CHECK (
  scope_id::text = current_setting('cvg.scope_id', true)
  AND coalesce(current_setting('cvg.participant_id', true), '') = ''
);
CREATE POLICY module_binding_insert ON curriculum_assignment_obligations FOR INSERT WITH CHECK (
  scope_id::text = current_setting('cvg.scope_id', true)
  AND participant_id::text = current_setting('cvg.participant_id', true)
);
CREATE POLICY module_receipt_insert ON curriculum_module_completion_receipts FOR INSERT WITH CHECK (
  scope_id::text = current_setting('cvg.scope_id', true)
  AND participant_id::text = current_setting('cvg.participant_id', true)
);
CREATE POLICY module_binding_read ON curriculum_assignment_obligations FOR SELECT USING (
  scope_id::text = current_setting('cvg.scope_id', true)
  AND participant_id::text = current_setting('cvg.participant_id', true)
);
CREATE POLICY module_receipt_read ON curriculum_module_completion_receipts FOR SELECT USING (
  scope_id::text = current_setting('cvg.scope_id', true)
  AND participant_id::text = current_setting('cvg.participant_id', true)
);
CREATE POLICY module_blueprint_read ON curriculum_module_blueprint_versions FOR SELECT USING (
  scope_id::text = current_setting('cvg.scope_id', true)
  AND (coalesce(current_setting('cvg.participant_id', true), '') = '' OR EXISTS (
    SELECT 1 FROM curriculum_assignment_obligations binding
    WHERE binding.blueprint_version_id = curriculum_module_blueprint_versions.id
      AND binding.blueprint_version = curriculum_module_blueprint_versions.version
      AND binding.scope_id = curriculum_module_blueprint_versions.scope_id
      AND binding.module_id = curriculum_module_blueprint_versions.module_id
      AND binding.participant_id::text = current_setting('cvg.participant_id', true)
  ) OR EXISTS (
    SELECT 1 FROM learning_assignments assigned
    WHERE assigned.scope_id = curriculum_module_blueprint_versions.scope_id
      AND assigned.module_id = curriculum_module_blueprint_versions.module_id
      AND assigned.participant_id::text = current_setting('cvg.participant_id', true)
      AND assigned.version >= 1
      AND NOT EXISTS (
        SELECT 1 FROM curriculum_assignment_obligations captured
        WHERE captured.assignment_id = assigned.id
      )
  ))
);
CREATE POLICY module_manifest_read ON curriculum_module_obligation_manifests FOR SELECT USING (
  scope_id::text = current_setting('cvg.scope_id', true)
  AND (coalesce(current_setting('cvg.participant_id', true), '') = '' OR EXISTS (
    SELECT 1 FROM curriculum_assignment_obligations binding
    WHERE binding.manifest_id = curriculum_module_obligation_manifests.id
      AND binding.manifest_version = curriculum_module_obligation_manifests.version
      AND binding.scope_id = curriculum_module_obligation_manifests.scope_id
      AND binding.module_id = curriculum_module_obligation_manifests.module_id
      AND binding.participant_id::text = current_setting('cvg.participant_id', true)
  ) OR EXISTS (
    SELECT 1 FROM learning_assignments assigned
    WHERE assigned.scope_id = curriculum_module_obligation_manifests.scope_id
      AND assigned.module_id = curriculum_module_obligation_manifests.module_id
      AND assigned.participant_id::text = current_setting('cvg.participant_id', true)
      AND assigned.version >= 1
      AND NOT EXISTS (
        SELECT 1 FROM curriculum_assignment_obligations captured
        WHERE captured.assignment_id = assigned.id
      )
  ))
);
--> statement-breakpoint
-- Invoker guards respect FORCE RLS. The trusted transaction must configure the
-- existing cvg.audit_read/audit_scope_id before INSERT; no hidden elevation.
CREATE FUNCTION cvg_guard_module_blueprint_approval() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT isfinite(NEW.approved_at) OR NEW.approved_at > clock_timestamp()
    OR NOT EXISTS (
      SELECT 1 FROM public.audit_entries decision
      WHERE decision.id = NEW.approval_decision_id
        AND decision.actor_kind = 'AUTHENTICATED'
        AND decision.outcome = 'SUCCESS'
        AND decision.principal_id = NEW.approved_by
        AND decision.scope_id = NEW.scope_id
        AND decision.action = 'CURRICULUM_MODULE_BLUEPRINT_APPROVED'
        AND decision.resource_type = 'curriculum_module_blueprint_version'
        AND decision.resource_id = NEW.id::text
        AND decision.occurred_at = NEW.approved_at
    ) THEN
    RAISE EXCEPTION 'module blueprint provenance is inconsistent' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER module_blueprint_approval_guard BEFORE INSERT ON curriculum_module_blueprint_versions
  FOR EACH ROW EXECUTE FUNCTION cvg_guard_module_blueprint_approval();
--> statement-breakpoint
CREATE FUNCTION cvg_guard_module_manifest_approval() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT isfinite(NEW.approved_at) OR NEW.approved_at > clock_timestamp()
    OR NOT EXISTS (
      SELECT 1 FROM public.curriculum_module_blueprint_versions blueprint
      WHERE blueprint.id = NEW.blueprint_version_id AND blueprint.version = NEW.blueprint_version
        AND blueprint.scope_id = NEW.scope_id AND blueprint.module_id = NEW.module_id
        AND blueprint.approved_at <= NEW.approved_at
    ) OR NOT EXISTS (
      SELECT 1 FROM public.audit_entries decision
      WHERE decision.id = NEW.approval_decision_id
        AND decision.actor_kind = 'AUTHENTICATED'
        AND decision.outcome = 'SUCCESS'
        AND decision.principal_id = NEW.approved_by
        AND decision.scope_id = NEW.scope_id
        AND decision.action = 'CURRICULUM_MODULE_OBLIGATIONS_APPROVED'
        AND decision.resource_type = 'curriculum_module_obligation_manifest'
        AND decision.resource_id = NEW.id::text
        AND decision.occurred_at = NEW.approved_at
    ) THEN
    RAISE EXCEPTION 'module manifest provenance is inconsistent' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER module_manifest_approval_guard BEFORE INSERT ON curriculum_module_obligation_manifests
  FOR EACH ROW EXECUTE FUNCTION cvg_guard_module_manifest_approval();
--> statement-breakpoint
CREATE FUNCTION cvg_guard_module_assignment_binding() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  -- Version correspondence is not evidence that this was the original INICIAR.
  -- Only the future command writer may create this binding on original start.
  PERFORM 1 FROM public.learning_assignments assignment
    WHERE assignment.id = NEW.assignment_id AND assignment.participant_id = NEW.participant_id
      AND assignment.scope_id = NEW.scope_id AND assignment.module_id = NEW.module_id
      AND assignment.version = NEW.assignment_version FOR UPDATE;
  IF NOT FOUND OR NOT isfinite(NEW.bound_at) OR NEW.bound_at > clock_timestamp()
    OR NOT EXISTS (
      SELECT 1 FROM public.curriculum_module_obligation_manifests manifest
      WHERE manifest.id = NEW.manifest_id AND manifest.version = NEW.manifest_version
        AND manifest.blueprint_version_id = NEW.blueprint_version_id
        AND manifest.blueprint_version = NEW.blueprint_version
        AND manifest.scope_id = NEW.scope_id AND manifest.module_id = NEW.module_id
        AND manifest.approved_at <= NEW.bound_at
    ) THEN
    RAISE EXCEPTION 'module assignment binding is inconsistent' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER module_assignment_binding_guard BEFORE INSERT ON curriculum_assignment_obligations
  FOR EACH ROW EXECUTE FUNCTION cvg_guard_module_assignment_binding();
--> statement-breakpoint
CREATE FUNCTION cvg_guard_module_completion_receipt() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  -- Audit/version correspondence is storage provenance, not D-102 approval.
  PERFORM 1 FROM public.learning_assignments assignment
    WHERE assignment.id = NEW.assignment_id AND assignment.participant_id = NEW.participant_id
      AND assignment.scope_id = NEW.scope_id AND assignment.module_id = NEW.module_id
      AND assignment.version = NEW.completed_assignment_version FOR UPDATE;
  IF NOT FOUND OR NOT isfinite(NEW.completed_at) OR NEW.completed_at > clock_timestamp()
    OR NOT EXISTS (
      SELECT 1 FROM public.curriculum_assignment_obligations binding
      WHERE binding.assignment_id = NEW.assignment_id AND binding.participant_id = NEW.participant_id
        AND binding.scope_id = NEW.scope_id AND binding.module_id = NEW.module_id
        AND binding.manifest_id = NEW.manifest_id AND binding.manifest_version = NEW.manifest_version
        AND binding.blueprint_version_id = NEW.blueprint_version_id
        AND binding.blueprint_version = NEW.blueprint_version
        AND NEW.completed_assignment_version > binding.assignment_version
        AND binding.bound_at <= NEW.completed_at
    ) OR NOT EXISTS (
      SELECT 1 FROM public.audit_entries decision
      WHERE decision.id = NEW.audit_entry_id
        AND decision.actor_kind = 'AUTHENTICATED'
        AND decision.outcome = 'SUCCESS'
        AND decision.principal_id = NEW.actor_id
        AND decision.scope_id = NEW.scope_id
        AND decision.request_id = NEW.request_id
        AND decision.correlation_id = NEW.correlation_id
        AND decision.action = 'MODULE_COMPLETION_RECORDED'
        AND decision.resource_type = 'curriculum_module_completion_receipt'
        AND decision.resource_id = NEW.assignment_id::text
        AND decision.occurred_at = NEW.completed_at
    ) THEN
    RAISE EXCEPTION 'module completion receipt provenance is inconsistent' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER module_completion_receipt_guard BEFORE INSERT ON curriculum_module_completion_receipts
  FOR EACH ROW EXECUTE FUNCTION cvg_guard_module_completion_receipt();
--> statement-breakpoint
REVOKE ALL ON FUNCTION cvg_guard_module_blueprint_approval(), cvg_guard_module_manifest_approval(),
  cvg_guard_module_assignment_binding(), cvg_guard_module_completion_receipt() FROM PUBLIC;
