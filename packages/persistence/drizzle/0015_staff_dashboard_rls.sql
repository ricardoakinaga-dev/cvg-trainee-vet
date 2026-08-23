-- Staff dashboards read only data in the active scope. Application authorization
-- remains the first barrier; these policies keep a leaked participant context
-- from broadening a scoped staff query at the database boundary.

CREATE POLICY "activity_assignments_staff_scope_select_policy" ON "activity_assignments" FOR SELECT USING (
  current_setting('cvg.scope_id', true) <> ''
  AND EXISTS (
    SELECT 1
    FROM "learning_activities" AS activity
    WHERE activity."id" = "activity_assignments"."activity_id"
      AND activity."scope_id"::text = current_setting('cvg.scope_id', true)
  )
);--> statement-breakpoint

CREATE POLICY "curriculum_runtime_staff_scope_select_policy" ON "curriculum_runtime_states" FOR SELECT USING (
  current_setting('cvg.scope_id', true) <> ''
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
);--> statement-breakpoint

CREATE POLICY "learning_assignments_staff_scope_select_policy" ON "learning_assignments" FOR SELECT USING (
  current_setting('cvg.scope_id', true) <> ''
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
);--> statement-breakpoint

CREATE POLICY "assessment_workflows_staff_scope_select_policy" ON "assessment_workflows" FOR SELECT USING (
  current_setting('cvg.scope_id', true) <> ''
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
);--> statement-breakpoint

CREATE POLICY "feedback_tickets_staff_scope_select_policy" ON "feedback_tickets" FOR SELECT USING (
  current_setting('cvg.scope_id', true) <> ''
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
);--> statement-breakpoint
