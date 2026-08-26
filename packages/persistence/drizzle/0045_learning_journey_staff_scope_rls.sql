-- Staff scope policies must not become an alternate read path while a
-- participant context is active. Journey reads set both participant and scope
-- per iteration, so scope-only policies are reserved for staff contexts.
DROP POLICY "learning_assignments_staff_scope_select_policy"
  ON "learning_assignments";--> statement-breakpoint
CREATE POLICY "learning_assignments_staff_scope_select_policy"
  ON "learning_assignments" FOR SELECT USING (
    current_setting('cvg.participant_id', true) = ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
  );--> statement-breakpoint

DROP POLICY "activity_assignments_staff_scope_select_policy"
  ON "activity_assignments";--> statement-breakpoint
CREATE POLICY "activity_assignments_staff_scope_select_policy"
  ON "activity_assignments" FOR SELECT USING (
    current_setting('cvg.participant_id', true) = ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND EXISTS (
      SELECT 1
      FROM learning_activities AS activity
      WHERE activity.id = "activity_assignments"."activity_id"
        AND activity.scope_id::text = current_setting('cvg.scope_id', true)
    )
  );--> statement-breakpoint

DROP POLICY "assessment_workflows_staff_scope_select_policy"
  ON "assessment_workflows";--> statement-breakpoint
CREATE POLICY "assessment_workflows_staff_scope_select_policy"
  ON "assessment_workflows" FOR SELECT USING (
    current_setting('cvg.participant_id', true) = ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
  );
