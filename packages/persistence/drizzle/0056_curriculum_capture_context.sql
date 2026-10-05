-- Server-only, transaction-local identities. Ordinary participant/staff contexts
-- have no policy to read these private catalogs or keys. No publication grants.
CREATE FUNCTION cvg_curriculum_attempt_context(expected_scope uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT coalesce(
    nullif(current_setting('cvg.curriculum_activity_id', true), '') IS NOT NULL
    AND nullif(current_setting('cvg.curriculum_attempt_id', true), '') IS NOT NULL
    AND current_setting('cvg.scope_id', true) = expected_scope::text
    AND EXISTS (
      SELECT 1 FROM attempts a
      JOIN learning_activities l ON l.id = a.activity_id
      JOIN activity_assignments assignment
        ON assignment.activity_id = a.activity_id AND assignment.participant_id = a.participant_id
      WHERE a.id::text = current_setting('cvg.curriculum_attempt_id', true)
        AND a.activity_id::text = current_setting('cvg.curriculum_activity_id', true)
        AND a.participant_id::text = current_setting('cvg.participant_id', true)
        AND l.scope_id = expected_scope
    ), false);
$$;
--> statement-breakpoint
CREATE POLICY curriculum_activity_internal_read ON curriculum_activity_forms FOR SELECT USING (
  cvg_curriculum_attempt_context(scope_id)
  AND activity_id::text = current_setting('cvg.curriculum_activity_id', true)
);
CREATE POLICY curriculum_form_internal_read ON curriculum_form_versions FOR SELECT USING (
  cvg_curriculum_attempt_context(scope_id) AND EXISTS (
    SELECT 1 FROM curriculum_activity_forms binding
    WHERE binding.form_version_id = curriculum_form_versions.id
      AND binding.scope_id = curriculum_form_versions.scope_id
      AND binding.module_id = curriculum_form_versions.module_id
  )
);
CREATE POLICY curriculum_blueprint_internal_read ON curriculum_blueprint_versions FOR SELECT USING (
  cvg_curriculum_attempt_context(scope_id) AND EXISTS (
    SELECT 1 FROM curriculum_form_versions form
    WHERE form.blueprint_version_id = curriculum_blueprint_versions.id
      AND form.scope_id = curriculum_blueprint_versions.scope_id
      AND form.module_id = curriculum_blueprint_versions.module_id
  )
);
CREATE POLICY curriculum_form_item_internal_read ON curriculum_form_items FOR SELECT USING (
  cvg_curriculum_attempt_context(scope_id) AND EXISTS (
    SELECT 1 FROM curriculum_form_versions form WHERE form.id = form_version_id AND form.scope_id = curriculum_form_items.scope_id
  )
);
CREATE POLICY curriculum_attempt_internal_read ON curriculum_attempt_forms FOR SELECT USING (
  cvg_curriculum_attempt_context(scope_id)
  AND attempt_id::text = current_setting('cvg.curriculum_attempt_id', true)
  AND participant_id::text = current_setting('cvg.participant_id', true)
);
CREATE POLICY curriculum_attempt_internal_insert ON curriculum_attempt_forms FOR INSERT WITH CHECK (
  cvg_curriculum_attempt_context(scope_id)
  AND attempt_id::text = current_setting('cvg.curriculum_attempt_id', true)
  AND participant_id::text = current_setting('cvg.participant_id', true)
  AND EXISTS (SELECT 1 FROM curriculum_activity_forms binding
    WHERE binding.form_version_id = curriculum_attempt_forms.form_version_id
      AND binding.scope_id = curriculum_attempt_forms.scope_id
      AND binding.module_id = curriculum_attempt_forms.module_id)
);
CREATE POLICY curriculum_attempt_item_internal_read ON curriculum_attempt_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM curriculum_attempt_forms binding
    WHERE binding.attempt_id = curriculum_attempt_items.attempt_id
      AND binding.form_version_id = curriculum_attempt_items.form_version_id)
);
CREATE POLICY curriculum_attempt_item_internal_insert ON curriculum_attempt_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM curriculum_attempt_forms binding
    WHERE binding.attempt_id = curriculum_attempt_items.attempt_id
      AND binding.form_version_id = curriculum_attempt_items.form_version_id)
);
--> statement-breakpoint
-- PostgreSQL row-locking reads also consult UPDATE policies. The trusted
-- identity may lock these source rows, while WITH CHECK(false) forbids using
-- the added policy to change participant-visible content or membership.
CREATE POLICY curriculum_activity_capture_lock ON learning_activities FOR UPDATE USING (
  cvg_curriculum_attempt_context(scope_id)
  AND id::text = current_setting('cvg.curriculum_activity_id', true)
) WITH CHECK (false);
CREATE POLICY curriculum_membership_capture_lock ON learning_activity_items FOR UPDATE USING (
  activity_id::text = current_setting('cvg.curriculum_activity_id', true)
  AND EXISTS (SELECT 1 FROM learning_activities activity
    WHERE activity.id = learning_activity_items.activity_id AND cvg_curriculum_attempt_context(activity.scope_id))
) WITH CHECK (false);
CREATE POLICY curriculum_content_capture_lock ON content_versions FOR UPDATE USING (
  cvg_curriculum_attempt_context(scope_id)
  AND EXISTS (SELECT 1 FROM curriculum_form_items item
    WHERE item.content_version_id = content_versions.id AND item.scope_id = content_versions.scope_id)
) WITH CHECK (false);
-- Bound reads use immutable attempt membership instead of today's activity
-- membership. Still require a published version and a trusted, owned context.
CREATE POLICY curriculum_content_bound_read ON content_versions FOR SELECT USING (
  status = 'PUBLICADO'
  AND cvg_curriculum_attempt_context(scope_id)
  AND cvg_participant_in_scope(
    current_setting('cvg.participant_id', true)::uuid, scope_id)
  AND EXISTS (SELECT 1 FROM curriculum_attempt_items item
    WHERE item.item_id = content_versions.id
      AND item.attempt_id::text = current_setting('cvg.curriculum_attempt_id', true))
);
--> statement-breakpoint
-- Concurrent withdrawal and append share the same native form fence as capture.
CREATE FUNCTION cvg_fence_curriculum_form() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('curriculum-form:' || NEW.id::text, 0));
  RETURN NEW;
END;
$$;
CREATE TRIGGER curriculum_form_fence BEFORE UPDATE ON curriculum_form_versions
  FOR EACH ROW EXECUTE FUNCTION cvg_fence_curriculum_form();
--> statement-breakpoint
CREATE FUNCTION cvg_guard_curriculum_form_append() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('curriculum-form:' || NEW.form_version_id::text, 0));
  IF EXISTS (SELECT 1 FROM curriculum_attempt_forms WHERE form_version_id = NEW.form_version_id) THEN
    RAISE EXCEPTION 'captured curriculum form cannot receive new items' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER curriculum_form_append_guard BEFORE INSERT ON curriculum_form_items
  FOR EACH ROW EXECUTE FUNCTION cvg_guard_curriculum_form_append();
--> statement-breakpoint
CREATE FUNCTION cvg_guard_curriculum_activity_binding() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'curriculum activity association is immutable' USING ERRCODE = '23514';
  END IF;
  PERFORM 1 FROM learning_activities WHERE id = NEW.activity_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM attempts WHERE activity_id = NEW.activity_id) THEN
    RAISE EXCEPTION 'activity with attempts cannot acquire a new curriculum association' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER curriculum_activity_binding_guard BEFORE INSERT OR UPDATE OR DELETE ON curriculum_activity_forms
  FOR EACH ROW EXECUTE FUNCTION cvg_guard_curriculum_activity_binding();
--> statement-breakpoint
CREATE FUNCTION cvg_guard_curriculum_attempt_item() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  frozen curriculum_form_items%ROWTYPE;
  binding curriculum_attempt_forms%ROWTYPE;
  attempt_state attempts%ROWTYPE;
BEGIN
  SELECT * INTO binding FROM curriculum_attempt_forms WHERE attempt_id = NEW.attempt_id;
  SELECT * INTO attempt_state FROM attempts WHERE id = NEW.attempt_id FOR UPDATE;
  SELECT * INTO frozen FROM curriculum_form_items
    WHERE form_version_id = NEW.form_version_id AND canonical_item_id = NEW.canonical_item_id;
  IF binding.attempt_id IS NULL OR binding.form_version_id <> NEW.form_version_id
    OR attempt_state.status NOT IN ('CRIADA', 'EM_ANDAMENTO') OR attempt_state.version > 1
    OR frozen.content_version_id IS DISTINCT FROM NEW.item_id
    OR frozen.ordinal IS DISTINCT FROM NEW.ordinal
    OR frozen.catalog_item IS DISTINCT FROM NEW.catalog_item
    OR frozen.public_item IS DISTINCT FROM NEW.public_item THEN
    RAISE EXCEPTION 'attempt item must be copied from its authorized frozen form at start' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER curriculum_attempt_item_copy_guard BEFORE INSERT ON curriculum_attempt_items
  FOR EACH ROW EXECUTE FUNCTION cvg_guard_curriculum_attempt_item();
--> statement-breakpoint
-- Deferred completeness prevents committing an attempt with only a subset.
-- At commit, restore only the FK-bound internal identity for this trigger and
-- then restore the caller's flags. Remains SECURITY INVOKER/FORCE RLS; neither
-- the migration owner nor an unrestricted SECURITY DEFINER is needed.
CREATE FUNCTION cvg_check_curriculum_attempt_completeness() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  expected integer;
  actual integer;
  captured_activity uuid;
  previous_activity text;
  previous_attempt text;
BEGIN
  SELECT activity_id INTO captured_activity FROM attempts WHERE id = NEW.attempt_id
    AND participant_id = NEW.participant_id;
  IF captured_activity IS NULL OR current_setting('cvg.scope_id', true) IS DISTINCT FROM NEW.scope_id::text
    OR current_setting('cvg.participant_id', true) IS DISTINCT FROM NEW.participant_id::text THEN
    RAISE EXCEPTION 'capture commit requires the same authorized transaction identity' USING ERRCODE = '23514';
  END IF;
  previous_activity := coalesce(current_setting('cvg.curriculum_activity_id', true), '');
  previous_attempt := coalesce(current_setting('cvg.curriculum_attempt_id', true), '');
  PERFORM set_config('cvg.curriculum_activity_id', captured_activity::text, true),
    set_config('cvg.curriculum_attempt_id', NEW.attempt_id::text, true);
  SELECT (blueprint.manifest->>'questionTotal')::integer + (blueprint.manifest->>'openResponseCount')::integer
    INTO expected FROM curriculum_form_versions form JOIN curriculum_blueprint_versions blueprint ON blueprint.id = form.blueprint_version_id
    WHERE form.id = NEW.form_version_id;
  SELECT count(*) INTO actual FROM curriculum_attempt_items WHERE attempt_id = NEW.attempt_id;
  PERFORM set_config('cvg.curriculum_activity_id', previous_activity, true),
    set_config('cvg.curriculum_attempt_id', previous_attempt, true);
  IF expected IS NULL OR actual <> expected THEN
    RAISE EXCEPTION 'attempt capture must include the complete authorized form' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER curriculum_attempt_capture_complete AFTER INSERT ON curriculum_attempt_forms
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION cvg_check_curriculum_attempt_completeness();
--> statement-breakpoint
-- An explicitly bound activity must not commit an uncaptured attempt, even if
-- a caller bypasses the application repository. Legacy activities stay unbound.
CREATE FUNCTION cvg_require_curriculum_attempt_capture() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  previous_activity text;
  previous_attempt text;
  has_binding boolean;
  expected integer;
  actual integer;
BEGIN
  previous_activity := coalesce(current_setting('cvg.curriculum_activity_id', true), '');
  previous_attempt := coalesce(current_setting('cvg.curriculum_attempt_id', true), '');
  PERFORM set_config('cvg.curriculum_activity_id', NEW.activity_id::text, true),
    set_config('cvg.curriculum_attempt_id', NEW.id::text, true);
  SELECT EXISTS (SELECT 1 FROM curriculum_activity_forms binding
    WHERE binding.activity_id = NEW.activity_id) INTO has_binding;
  IF has_binding THEN
    IF current_setting('cvg.participant_id', true) IS DISTINCT FROM NEW.participant_id::text THEN
      RAISE EXCEPTION 'bound attempt requires its authorized participant transaction' USING ERRCODE = '23514';
    END IF;
    SELECT (blueprint.manifest->>'questionTotal')::integer + (blueprint.manifest->>'openResponseCount')::integer,
      (SELECT count(*) FROM curriculum_attempt_items item WHERE item.attempt_id = NEW.id)
      INTO expected, actual
      FROM curriculum_activity_forms association
      JOIN curriculum_attempt_forms captured ON captured.attempt_id = NEW.id
        AND captured.form_version_id = association.form_version_id
        AND captured.scope_id = association.scope_id AND captured.module_id = association.module_id
        AND captured.participant_id = NEW.participant_id
      JOIN curriculum_form_versions form ON form.id = captured.form_version_id AND form.status = 'PUBLICADO'
      JOIN curriculum_blueprint_versions blueprint ON blueprint.id = form.blueprint_version_id
      WHERE association.activity_id = NEW.activity_id
        AND association.scope_id::text = current_setting('cvg.scope_id', true);
  END IF;
  PERFORM set_config('cvg.curriculum_activity_id', previous_activity, true),
    set_config('cvg.curriculum_attempt_id', previous_attempt, true);
  IF has_binding AND (expected IS NULL OR actual IS NULL OR expected <> actual) THEN
    RAISE EXCEPTION 'bound attempt must capture its complete published form before commit' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER curriculum_attempt_required_capture AFTER INSERT ON attempts
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION cvg_require_curriculum_attempt_capture();
--> statement-breakpoint
-- Locking is permitted only for the owned internal attempt identity. The added
-- policy cannot be used to mutate an assignment (WITH CHECK false).
CREATE POLICY curriculum_assignment_answer_lock ON activity_assignments FOR UPDATE USING (
  participant_id::text = current_setting('cvg.participant_id', true)
  AND activity_id::text = current_setting('cvg.curriculum_activity_id', true)
  AND EXISTS (SELECT 1 FROM learning_activities activity
    WHERE activity.id = activity_assignments.activity_id AND cvg_curriculum_attempt_context(activity.scope_id))
) WITH CHECK (false);
--> statement-breakpoint
CREATE FUNCTION cvg_validate_frozen_answer_response(projection jsonb, response text) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE selected jsonb;
BEGIN
  IF response IS NULL OR length(btrim(response)) NOT BETWEEN 1 AND 10000
    OR response ~ '<[^>]*>' THEN RETURN false; END IF;
  IF projection->>'responseMode' = 'TEXT' THEN RETURN true; END IF;
  IF projection->>'responseMode' IS DISTINCT FROM 'CHOICE'
    OR jsonb_typeof(projection->'choices') IS DISTINCT FROM 'array'
    OR jsonb_array_length(projection->'choices') NOT BETWEEN 2 AND 12 THEN RETURN false; END IF;
  IF projection->>'selectionMode' = 'SINGLE' THEN
    RETURN EXISTS (SELECT 1 FROM jsonb_array_elements(projection->'choices') choice
      WHERE choice->>'id' = btrim(response));
  END IF;
  IF projection->>'selectionMode' IS DISTINCT FROM 'MULTIPLE' THEN RETURN false; END IF;
  BEGIN selected := response::jsonb;
  EXCEPTION WHEN invalid_text_representation THEN RETURN false; END;
  IF jsonb_typeof(selected) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
  IF jsonb_array_length(selected) NOT BETWEEN 1 AND 12
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(selected) value WHERE jsonb_typeof(value) <> 'string')
    OR (SELECT count(DISTINCT value) FROM jsonb_array_elements_text(selected) value) <> jsonb_array_length(selected)
    THEN RETURN false; END IF;
  RETURN NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(selected) AS selected_choice(id)
    WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(projection->'choices') AS choice(option)
      WHERE choice.option->>'id' = selected_choice.id));
END;
$$;
--> statement-breakpoint
-- Conditional binding for legacy-compatible answers. Once an attempt is bound,
-- SQL callers must obey the frozen public response contract and submitted rows
-- are immutable. Locking the parent serializes this check with submission.
CREATE FUNCTION cvg_guard_curriculum_answer() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  answer_attempt uuid;
  answer_item uuid;
  parent attempts%ROWTYPE;
  captured curriculum_attempt_forms%ROWTYPE;
  projection jsonb;
  previous_activity text;
  previous_attempt text;
  has_binding boolean;
  authorized boolean;
  expected integer;
  actual integer;
BEGIN
  IF TG_OP = 'DELETE' THEN answer_attempt := OLD.attempt_id; answer_item := OLD.item_id;
  ELSE answer_attempt := NEW.attempt_id; answer_item := NEW.item_id; END IF;
  IF TG_OP = 'UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.attempt_id IS DISTINCT FROM OLD.attempt_id
    OR NEW.item_id IS DISTINCT FROM OLD.item_id) THEN
    RAISE EXCEPTION 'answer identity is immutable' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO parent FROM attempts WHERE id = answer_attempt FOR UPDATE;
  IF parent.id IS NULL THEN RAISE EXCEPTION 'answer requires an owned attempt' USING ERRCODE = '23514'; END IF;
  previous_activity := coalesce(current_setting('cvg.curriculum_activity_id', true), '');
  previous_attempt := coalesce(current_setting('cvg.curriculum_attempt_id', true), '');
  PERFORM set_config('cvg.curriculum_activity_id', parent.activity_id::text, true),
    set_config('cvg.curriculum_attempt_id', parent.id::text, true);
  SELECT EXISTS (SELECT 1 FROM curriculum_activity_forms WHERE activity_id = parent.activity_id) INTO has_binding;
  SELECT * INTO captured FROM curriculum_attempt_forms WHERE attempt_id = parent.id;
  IF has_binding OR captured.attempt_id IS NOT NULL THEN
    IF parent.participant_id::text IS DISTINCT FROM current_setting('cvg.participant_id', true)
      OR captured.attempt_id IS NULL OR captured.scope_id::text IS DISTINCT FROM current_setting('cvg.scope_id', true)
      OR NOT cvg_participant_in_scope(parent.participant_id, captured.scope_id)
      OR parent.status NOT IN ('CRIADA', 'EM_ANDAMENTO', 'SALVA') THEN
      RAISE EXCEPTION 'bound answers require an authorized open attempt' USING ERRCODE = '23514';
    END IF;
    PERFORM pg_advisory_xact_lock_shared(hashtextextended('curriculum-form:' || captured.form_version_id::text, 0));
    SELECT jsonb_array_length(blueprint.manifest->'itemManifest') INTO expected
      FROM curriculum_form_versions form JOIN curriculum_blueprint_versions blueprint ON blueprint.id = form.blueprint_version_id
      WHERE form.id = captured.form_version_id AND form.status = 'PUBLICADO';
    PERFORM cv.id FROM curriculum_attempt_items item JOIN content_versions cv ON cv.id = item.item_id
      WHERE item.attempt_id = parent.id ORDER BY cv.id FOR SHARE OF cv;
    SELECT count(*) INTO actual FROM curriculum_attempt_items item JOIN content_versions cv ON cv.id = item.item_id
      WHERE item.attempt_id = parent.id AND cv.status = 'PUBLICADO' AND cv.scope_id = captured.scope_id;
    IF expected IS NULL OR actual <> expected THEN
      RAISE EXCEPTION 'bound answer requires the complete published captured form' USING ERRCODE = '23514';
    END IF;
    SELECT true INTO authorized FROM activity_assignments assignment
      JOIN learning_activities activity ON activity.id = assignment.activity_id
      JOIN learning_assignments learning ON learning.id = assignment.learning_assignment_id
        AND learning.participant_id = assignment.participant_id AND learning.scope_id = activity.scope_id
        AND learning.module_id = activity.module_id
      WHERE assignment.participant_id = parent.participant_id AND activity.id = parent.activity_id
        AND activity.scope_id = captured.scope_id AND activity.status = 'PUBLISHED'
        AND assignment.status IN ('DISPONIVEL', 'EM_ANDAMENTO', 'EM_REFORCO')
        AND learning.status IN ('DISPONIVEL', 'EM_ANDAMENTO', 'EM_REFORCO')
      FOR SHARE OF assignment, activity, learning;
    SELECT public_item INTO projection FROM curriculum_attempt_items
      WHERE attempt_id = parent.id AND item_id = answer_item;
    IF authorized IS DISTINCT FROM true OR projection IS NULL
      OR projection->>'kind' IS NULL OR projection->>'kind' NOT IN ('QUESTAO', 'CASO', 'REFLEXAO') THEN
      RAISE EXCEPTION 'answer item is outside its authorized frozen attempt' USING ERRCODE = '23514';
    END IF;
    IF TG_OP <> 'DELETE' AND NOT cvg_validate_frozen_answer_response(projection, NEW.response) THEN
      RAISE EXCEPTION 'answer does not match its frozen public response contract' USING ERRCODE = '23514';
    END IF;
  END IF;
  PERFORM set_config('cvg.curriculum_activity_id', previous_activity, true),
    set_config('cvg.curriculum_attempt_id', previous_attempt, true);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER curriculum_answer_binding_guard BEFORE INSERT OR UPDATE OR DELETE ON answers
  FOR EACH ROW EXECUTE FUNCTION cvg_guard_curriculum_answer();
