-- Participant journey reads may iterate over caller-provided scopes, but a
-- scope value is not proof of membership. Keep scope-only policies for staff
-- contexts and require an accepted participant membership for assignments.
DROP POLICY "learning_assignments_participant_scope_policy"
  ON "learning_assignments";--> statement-breakpoint
CREATE POLICY "learning_assignments_participant_scope_policy"
  ON "learning_assignments" FOR ALL USING (
    current_setting('cvg.participant_id', true) = "participant_id"::text
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
    AND cvg_participant_in_scope("participant_id", "scope_id")
  ) WITH CHECK (
    current_setting('cvg.participant_id', true) = "participant_id"::text
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
    AND cvg_participant_in_scope("participant_id", "scope_id")
  );--> statement-breakpoint
DROP POLICY "learning_activities_scope_select_policy"
  ON "learning_activities";--> statement-breakpoint
CREATE POLICY "learning_activities_scope_select_policy"
  ON "learning_activities" FOR SELECT USING (
    current_setting('cvg.participant_id', true) = ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.scope_id', true) = "scope_id"::text
  );--> statement-breakpoint

DROP POLICY "learning_activity_items_scope_select_policy"
  ON "learning_activity_items";--> statement-breakpoint
CREATE POLICY "learning_activity_items_scope_select_policy"
  ON "learning_activity_items" FOR SELECT USING (
    current_setting('cvg.participant_id', true) = ''
    AND cvg_learning_activity_in_scope(
      "learning_activity_items"."activity_id",
      current_setting('cvg.scope_id', true)
    )
  );--> statement-breakpoint

DROP POLICY "activity_assignments_participant_select_policy"
  ON "activity_assignments";--> statement-breakpoint
CREATE POLICY "activity_assignments_participant_select_policy"
  ON "activity_assignments" FOR SELECT USING (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
    AND cvg_learning_activity_for_participant(
      "activity_assignments"."activity_id",
      current_setting('cvg.participant_id', true)
    )
  );
