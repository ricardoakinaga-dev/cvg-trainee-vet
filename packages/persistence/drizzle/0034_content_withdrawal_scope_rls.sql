-- U98-117: an authorized scope-level clinical withdrawal must enumerate every
-- participant assignment affected by the published content while preserving
-- participant isolation for ordinary requests.
CREATE POLICY "activity_assignments_scope_withdrawal_select_policy"
  ON "activity_assignments"
  FOR SELECT
  USING (
    current_setting('cvg.scope_id', true) <> ''
    AND EXISTS (
      SELECT 1
      FROM "learning_activities" AS activity
      WHERE activity."id" = "activity_assignments"."activity_id"
        AND activity."scope_id"::text = current_setting('cvg.scope_id', true)
    )
  );
