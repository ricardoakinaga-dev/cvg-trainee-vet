-- Avoid recursive policy evaluation while keeping the projection scoped.
-- These functions return only a boolean and run with the migration owner's
-- read authority; application writes still require the transaction scope.

CREATE OR REPLACE FUNCTION cvg_learning_activity_in_scope(
  p_activity_id uuid,
  p_scope_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_scope_id <> ''
    AND EXISTS (
      SELECT 1
      FROM learning_activities AS activity
      WHERE activity.id = p_activity_id
        AND activity.scope_id::text = p_scope_id
    );
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION cvg_learning_activity_for_participant(
  p_activity_id uuid,
  p_participant_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_participant_id <> ''
    AND EXISTS (
      SELECT 1
      FROM activity_assignments AS assignment
      WHERE assignment.activity_id = p_activity_id
        AND assignment.participant_id::text = p_participant_id
    );
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION cvg_learning_activity_item_insert_allowed(
  p_activity_id uuid,
  p_content_version_id uuid,
  p_scope_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_scope_id <> ''
    AND EXISTS (
      SELECT 1
      FROM learning_activities AS activity
      INNER JOIN content_versions AS version
        ON version.id = p_content_version_id
      WHERE activity.id = p_activity_id
        AND activity.scope_id::text = p_scope_id
        AND activity.status = 'PUBLISHED'
        AND version.scope_id::text = p_scope_id
        AND version.status = 'PUBLICADO'
    );
$$;--> statement-breakpoint

DROP POLICY "learning_activities_participant_select_policy"
  ON "learning_activities";--> statement-breakpoint
CREATE POLICY "learning_activities_participant_select_policy"
  ON "learning_activities" FOR SELECT USING (
    cvg_learning_activity_for_participant(
      "learning_activities"."id",
      current_setting('cvg.participant_id', true)
    )
  );--> statement-breakpoint

DROP POLICY "learning_activity_items_scope_select_policy"
  ON "learning_activity_items";--> statement-breakpoint
CREATE POLICY "learning_activity_items_scope_select_policy"
  ON "learning_activity_items" FOR SELECT USING (
    cvg_learning_activity_in_scope(
      "learning_activity_items"."activity_id",
      current_setting('cvg.scope_id', true)
    )
  );--> statement-breakpoint
DROP POLICY "learning_activity_items_participant_select_policy"
  ON "learning_activity_items";--> statement-breakpoint
CREATE POLICY "learning_activity_items_participant_select_policy"
  ON "learning_activity_items" FOR SELECT USING (
    cvg_learning_activity_for_participant(
      "learning_activity_items"."activity_id",
      current_setting('cvg.participant_id', true)
    )
  );--> statement-breakpoint
DROP POLICY "learning_activity_items_authoring_insert_policy"
  ON "learning_activity_items";--> statement-breakpoint
CREATE POLICY "learning_activity_items_authoring_insert_policy"
  ON "learning_activity_items" FOR INSERT WITH CHECK (
    cvg_learning_activity_item_insert_allowed(
      "learning_activity_items"."activity_id",
      "learning_activity_items"."content_version_id",
      current_setting('cvg.scope_id', true)
    )
  );
