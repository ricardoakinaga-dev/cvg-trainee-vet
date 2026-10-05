-- T18 additive expansion only. No draft backfill or clinical publication.
-- All private relations are FORCE RLS/default-deny. Scoped server policies
-- and the transactional capture/reader must be implemented before use.
CREATE TABLE "curriculum_blueprint_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "blueprint_id" text NOT NULL,
  "version" integer NOT NULL,
  "scope_id" uuid NOT NULL,
  "module_id" text NOT NULL,
  "approval_decision_id" uuid NOT NULL REFERENCES "audit_entries"("id") ON DELETE RESTRICT,
  "approved_by" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE RESTRICT,
  "approved_at" timestamptz NOT NULL,
  "manifest" jsonb NOT NULL,
  CONSTRAINT "curriculum_blueprint_version_check" CHECK ("version" >= 1),
  CONSTRAINT "curriculum_blueprint_module_check" CHECK ("module_id" ~ '^M(0[1-9]|1[0-9]|2[0-4])$'),
  CONSTRAINT "curriculum_blueprint_manifest_check" CHECK (coalesce((
    jsonb_typeof("manifest") = 'object'
    AND "manifest"->>'moduleId' = "module_id"
    AND "manifest"->>'version' = "version"::text
    AND "manifest"->>'approvalDecisionId' = "approval_decision_id"::text
    AND jsonb_typeof("manifest"->'objectiveIds') = 'array'
    AND jsonb_array_length("manifest"->'objectiveIds') > 0
    AND jsonb_typeof("manifest"->'itemManifest') = 'array'
    AND jsonb_array_length("manifest"->'itemManifest') BETWEEN 1 AND 100
    AND ("manifest"->>'questionTotal')::integer > 0
    AND ("manifest"->>'openResponseCount')::integer >= 0
    AND ("manifest"->>'questionTotal')::integer + ("manifest"->>'openResponseCount')::integer
      = jsonb_array_length("manifest"->'itemManifest')
  ), false))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_blueprint_version_idx"
  ON "curriculum_blueprint_versions"("scope_id", "blueprint_id", "version");
--> statement-breakpoint
CREATE TABLE "curriculum_form_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "form_id" text NOT NULL,
  "version" integer NOT NULL,
  "scope_id" uuid NOT NULL,
  "module_id" text NOT NULL,
  "blueprint_version_id" uuid NOT NULL REFERENCES "curriculum_blueprint_versions"("id") ON DELETE RESTRICT,
  "mode" text NOT NULL,
  "status" text NOT NULL,
  "publication_decision_id" uuid NOT NULL REFERENCES "audit_entries"("id") ON DELETE RESTRICT,
  "published_by" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE RESTRICT,
  "published_at" timestamptz NOT NULL,
  CONSTRAINT "curriculum_form_version_check" CHECK ("version" >= 1),
  CONSTRAINT "curriculum_form_status_check" CHECK ("status" IN ('PUBLICADO', 'RETIRADO')),
  CONSTRAINT "curriculum_form_mode_check" CHECK ("mode" IN ('FORMATIVE_CHOICE', 'MODULE_COMPLETION')),
  CONSTRAINT "curriculum_form_module_check" CHECK ("module_id" ~ '^M(0[1-9]|1[0-9]|2[0-4])$'),
  CONSTRAINT "curriculum_form_identity_check" CHECK (length(trim("form_id")) BETWEEN 1 AND 200)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_form_version_idx"
  ON "curriculum_form_versions"("scope_id", "form_id", "version");
--> statement-breakpoint
CREATE TABLE "curriculum_form_items" (
  "form_version_id" uuid NOT NULL REFERENCES "curriculum_form_versions"("id") ON DELETE RESTRICT,
  "canonical_item_id" text NOT NULL,
  "scope_id" uuid NOT NULL,
  "content_version_id" uuid NOT NULL,
  "content_id" uuid NOT NULL,
  "content_version" integer NOT NULL,
  "ordinal" integer NOT NULL,
  "catalog_item" jsonb NOT NULL,
  "public_item" jsonb NOT NULL,
  PRIMARY KEY ("form_version_id", "canonical_item_id"),
  CONSTRAINT "curriculum_form_item_content_identity_fk"
    FOREIGN KEY ("content_version_id", "content_id", "content_version", "scope_id")
    REFERENCES "content_versions"("id", "content_id", "version", "scope_id") ON DELETE RESTRICT,
  CONSTRAINT "curriculum_form_item_ordinal_check" CHECK ("ordinal" BETWEEN 1 AND 100),
  CONSTRAINT "curriculum_form_item_version_check" CHECK ("content_version" >= 1),
  CONSTRAINT "curriculum_form_item_identity_check" CHECK (coalesce((
    jsonb_typeof("catalog_item") = 'object' AND "catalog_item"->>'id' = "canonical_item_id"
    AND jsonb_typeof("public_item") = 'object' AND "public_item"->>'itemId' = "content_version_id"::text
  ), false))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_form_item_content_idx"
  ON "curriculum_form_items"("form_version_id", "content_version_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_form_item_ordinal_idx"
  ON "curriculum_form_items"("form_version_id", "ordinal");
--> statement-breakpoint
CREATE TABLE "curriculum_activity_forms" (
  "activity_id" uuid PRIMARY KEY REFERENCES "learning_activities"("id") ON DELETE RESTRICT,
  "form_version_id" uuid NOT NULL REFERENCES "curriculum_form_versions"("id") ON DELETE RESTRICT,
  "scope_id" uuid NOT NULL,
  "module_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curriculum_attempt_forms" (
  "attempt_id" uuid PRIMARY KEY REFERENCES "attempts"("id") ON DELETE RESTRICT,
  "participant_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE RESTRICT,
  "scope_id" uuid NOT NULL,
  "module_id" text NOT NULL,
  "form_version_id" uuid NOT NULL REFERENCES "curriculum_form_versions"("id") ON DELETE RESTRICT,
  "captured_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curriculum_attempt_items" (
  "attempt_id" uuid NOT NULL REFERENCES "curriculum_attempt_forms"("attempt_id") ON DELETE RESTRICT,
  "item_id" uuid NOT NULL,
  "canonical_item_id" text NOT NULL,
  "form_version_id" uuid NOT NULL,
  "ordinal" integer NOT NULL,
  "catalog_item" jsonb NOT NULL,
  "public_item" jsonb NOT NULL,
  PRIMARY KEY ("attempt_id", "item_id"),
  CONSTRAINT "curriculum_attempt_item_form_identity_fk"
    FOREIGN KEY ("form_version_id", "canonical_item_id")
    REFERENCES "curriculum_form_items"("form_version_id", "canonical_item_id") ON DELETE RESTRICT,
  CONSTRAINT "curriculum_attempt_item_content_identity_fk"
    FOREIGN KEY ("form_version_id", "item_id")
    REFERENCES "curriculum_form_items"("form_version_id", "content_version_id") ON DELETE RESTRICT,
  CONSTRAINT "curriculum_attempt_item_ordinal_check" CHECK ("ordinal" BETWEEN 1 AND 100),
  CONSTRAINT "curriculum_attempt_item_identity_check" CHECK (coalesce((
    jsonb_typeof("catalog_item") = 'object' AND "catalog_item"->>'id' = "canonical_item_id"
    AND jsonb_typeof("public_item") = 'object' AND "public_item"->>'itemId' = "item_id"::text
  ), false))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_attempt_item_canonical_idx"
  ON "curriculum_attempt_items"("attempt_id", "canonical_item_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_attempt_item_ordinal_idx"
  ON "curriculum_attempt_items"("attempt_id", "ordinal");
--> statement-breakpoint
ALTER TABLE "curriculum_blueprint_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "curriculum_blueprint_versions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "curriculum_form_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "curriculum_form_versions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "curriculum_form_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "curriculum_form_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE "curriculum_activity_forms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "curriculum_activity_forms" FORCE ROW LEVEL SECURITY;
ALTER TABLE "curriculum_attempt_forms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "curriculum_attempt_forms" FORCE ROW LEVEL SECURITY;
ALTER TABLE "curriculum_attempt_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "curriculum_attempt_items" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Snapshots cannot be rewritten, even by the fixture migration owner.
CREATE FUNCTION cvg_prevent_curriculum_snapshot_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'curriculum snapshot is immutable' USING ERRCODE = '23514';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER curriculum_blueprint_immutable BEFORE UPDATE OR DELETE
  ON "curriculum_blueprint_versions" FOR EACH ROW EXECUTE FUNCTION cvg_prevent_curriculum_snapshot_mutation();
CREATE TRIGGER curriculum_form_item_immutable BEFORE UPDATE OR DELETE
  ON "curriculum_form_items" FOR EACH ROW EXECUTE FUNCTION cvg_prevent_curriculum_snapshot_mutation();
CREATE TRIGGER curriculum_attempt_form_immutable BEFORE UPDATE OR DELETE
  ON "curriculum_attempt_forms" FOR EACH ROW EXECUTE FUNCTION cvg_prevent_curriculum_snapshot_mutation();
CREATE TRIGGER curriculum_attempt_item_immutable BEFORE UPDATE OR DELETE
  ON "curriculum_attempt_items" FOR EACH ROW EXECUTE FUNCTION cvg_prevent_curriculum_snapshot_mutation();
--> statement-breakpoint
CREATE FUNCTION cvg_guard_curriculum_form_version() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  blueprint "curriculum_blueprint_versions"%ROWTYPE;
  decision "audit_entries"%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'published curriculum form is immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status <> 'PUBLICADO' OR NEW.status <> 'RETIRADO'
      OR (to_jsonb(NEW) - 'status') <> (to_jsonb(OLD) - 'status') THEN
      RAISE EXCEPTION 'only withdrawal of a curriculum form is allowed' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO blueprint FROM "curriculum_blueprint_versions" WHERE id = NEW.blueprint_version_id;
  SELECT * INTO decision FROM "audit_entries" WHERE id = NEW.publication_decision_id;
  IF blueprint.id IS NULL OR blueprint.scope_id <> NEW.scope_id OR blueprint.module_id <> NEW.module_id
    OR blueprint.approved_at > NEW.published_at OR decision.id IS NULL
    OR decision.actor_kind <> 'AUTHENTICATED' OR decision.principal_id IS DISTINCT FROM NEW.published_by
    OR decision.scope_id IS DISTINCT FROM NEW.scope_id OR decision.outcome <> 'SUCCESS'
    OR decision.occurred_at IS DISTINCT FROM NEW.published_at THEN
    RAISE EXCEPTION 'curriculum publication provenance is inconsistent' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER curriculum_form_version_guard BEFORE INSERT OR UPDATE OR DELETE
  ON "curriculum_form_versions" FOR EACH ROW EXECUTE FUNCTION cvg_guard_curriculum_form_version();
