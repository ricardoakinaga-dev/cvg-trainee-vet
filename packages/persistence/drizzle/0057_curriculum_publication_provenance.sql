-- Technical snapshot event correspondence only; no clinical approval/publication.
-- Additive guards: immutable historical rows remain unchanged. Runtime capture
-- and evaluation also revalidate them against the same canonical event protocol.
CREATE FUNCTION cvg_guard_curriculum_blueprint_provenance() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT isfinite(NEW.approved_at) OR NEW.approved_at > clock_timestamp()
    OR NOT EXISTS (
      SELECT 1 FROM public.audit_entries decision
      WHERE decision.id = NEW.approval_decision_id
        AND decision.actor_kind = 'AUTHENTICATED'
        AND decision.principal_id = NEW.approved_by
        AND decision.scope_id = NEW.scope_id
        AND decision.outcome = 'SUCCESS'
        AND decision.action = 'CURRICULUM_BLUEPRINT_APPROVED'
        AND decision.resource_type = 'curriculum_blueprint_version'
        AND decision.resource_id = NEW.id::text
        AND decision.occurred_at = NEW.approved_at
    ) THEN
    RAISE EXCEPTION 'curriculum approval provenance is inconsistent' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER curriculum_blueprint_provenance_guard BEFORE INSERT
  ON "curriculum_blueprint_versions" FOR EACH ROW EXECUTE FUNCTION cvg_guard_curriculum_blueprint_provenance();
--> statement-breakpoint
CREATE FUNCTION cvg_guard_curriculum_publication_provenance() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT isfinite(NEW.published_at) OR NEW.published_at > clock_timestamp()
    OR NOT EXISTS (
      SELECT 1 FROM public.curriculum_blueprint_versions blueprint
      JOIN public.audit_entries approval ON approval.id = blueprint.approval_decision_id
      JOIN public.audit_entries publication ON publication.id = NEW.publication_decision_id
      WHERE blueprint.id = NEW.blueprint_version_id
        AND blueprint.scope_id = NEW.scope_id AND blueprint.module_id = NEW.module_id
        AND isfinite(blueprint.approved_at) AND blueprint.approved_at <= NEW.published_at
        AND approval.actor_kind = 'AUTHENTICATED'
        AND approval.principal_id = blueprint.approved_by
        AND approval.scope_id = blueprint.scope_id
        AND approval.outcome = 'SUCCESS'
        AND approval.action = 'CURRICULUM_BLUEPRINT_APPROVED'
        AND approval.resource_type = 'curriculum_blueprint_version'
        AND approval.resource_id = blueprint.id::text
        AND approval.occurred_at = blueprint.approved_at
        AND publication.actor_kind = 'AUTHENTICATED'
        AND publication.principal_id = NEW.published_by
        AND publication.scope_id = NEW.scope_id
        AND publication.outcome = 'SUCCESS'
        AND publication.action = 'CURRICULUM_FORM_PUBLISHED'
        AND publication.resource_type = 'curriculum_form_version'
        AND publication.resource_id = NEW.id::text
        AND publication.occurred_at = NEW.published_at
    ) THEN
    RAISE EXCEPTION 'curriculum publication provenance is inconsistent' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER curriculum_publication_provenance_guard BEFORE INSERT
  ON "curriculum_form_versions" FOR EACH ROW EXECUTE FUNCTION cvg_guard_curriculum_publication_provenance();
