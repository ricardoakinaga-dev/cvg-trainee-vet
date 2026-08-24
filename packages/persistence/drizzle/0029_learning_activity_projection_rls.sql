-- Protect the activity projection at the database boundary.
-- Publication writes require a transaction-local scope; participant reads
-- require an assigned activity and never bypass the assignment RLS.

ALTER TABLE "learning_activities"
  ADD CONSTRAINT "learning_activities_session_module_check"
  CHECK ("session_id" is null or "module_id" is null or "session_id" ~ ('^' || "module_id" || '-S[1-4]$'));--> statement-breakpoint

ALTER TABLE "learning_activities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "learning_activities" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "learning_activities_scope_select_policy"
  ON "learning_activities" FOR SELECT USING (
    current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
  );--> statement-breakpoint
CREATE POLICY "learning_activities_participant_select_policy"
  ON "learning_activities" FOR SELECT USING (
    current_setting('cvg.participant_id', true) <> ''
    AND EXISTS (
      SELECT 1
      FROM "activity_assignments" AS assignment
      WHERE assignment."activity_id" = "learning_activities"."id"
        AND assignment."participant_id"::text = current_setting('cvg.participant_id', true)
    )
  );--> statement-breakpoint
CREATE POLICY "learning_activities_authoring_insert_policy"
  ON "learning_activities" FOR INSERT WITH CHECK (
    current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
    AND "module_id" IS NOT NULL
    AND "session_id" IS NOT NULL
    AND "status" = 'PUBLISHED'
  );--> statement-breakpoint

ALTER TABLE "learning_activity_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "learning_activity_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "learning_activity_items_scope_select_policy"
  ON "learning_activity_items" FOR SELECT USING (
    current_setting('cvg.scope_id', true) <> ''
    AND EXISTS (
      SELECT 1
      FROM "learning_activities" AS activity
      WHERE activity."id" = "learning_activity_items"."activity_id"
        AND activity."scope_id"::text = current_setting('cvg.scope_id', true)
    )
  );--> statement-breakpoint
CREATE POLICY "learning_activity_items_participant_select_policy"
  ON "learning_activity_items" FOR SELECT USING (
    current_setting('cvg.participant_id', true) <> ''
    AND EXISTS (
      SELECT 1
      FROM "activity_assignments" AS assignment
      WHERE assignment."activity_id" = "learning_activity_items"."activity_id"
        AND assignment."participant_id"::text = current_setting('cvg.participant_id', true)
    )
  );--> statement-breakpoint
CREATE POLICY "learning_activity_items_authoring_insert_policy"
  ON "learning_activity_items" FOR INSERT WITH CHECK (
    current_setting('cvg.scope_id', true) <> ''
    AND EXISTS (
      SELECT 1
      FROM "learning_activities" AS activity
      INNER JOIN "content_versions" AS version
        ON version."id" = "learning_activity_items"."content_version_id"
      WHERE activity."id" = "learning_activity_items"."activity_id"
        AND activity."scope_id"::text = current_setting('cvg.scope_id', true)
        AND activity."status" = 'PUBLISHED'
        AND version."scope_id"::text = current_setting('cvg.scope_id', true)
        AND version."status" = 'PUBLICADO'
    )
  );
