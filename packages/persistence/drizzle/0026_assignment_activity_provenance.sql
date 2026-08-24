-- Bind adaptive module assignments to explicitly mapped published activities.
-- Legacy activities remain nullable and are never inferred by slug.

ALTER TABLE "learning_activities"
  ADD COLUMN "module_id" text;--> statement-breakpoint
ALTER TABLE "learning_activities"
  ADD CONSTRAINT "learning_activities_module_id_check"
  CHECK ("module_id" is null or "module_id" ~ '^M(0[1-9]|1[0-9]|2[0-4])$');--> statement-breakpoint
CREATE INDEX "learning_activities_scope_module_status_idx"
  ON "learning_activities" USING btree ("scope_id", "module_id", "status");--> statement-breakpoint

ALTER TABLE "activity_assignments"
  ADD COLUMN "learning_assignment_id" uuid;--> statement-breakpoint
ALTER TABLE "activity_assignments"
  ADD CONSTRAINT "activity_assignments_learning_assignment_id_learning_assignments_id_fk"
  FOREIGN KEY ("learning_assignment_id")
  REFERENCES "public"."learning_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_assignments_learning_assignment_idx"
  ON "activity_assignments" USING btree ("learning_assignment_id");--> statement-breakpoint
CREATE POLICY "activity_assignments_adaptive_insert_policy"
  ON "activity_assignments" FOR INSERT WITH CHECK (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
    AND "learning_assignment_id" IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM "learning_activities" AS activity
      INNER JOIN "learning_assignments" AS assignment
        ON assignment."id" = "activity_assignments"."learning_assignment_id"
      WHERE activity."id" = "activity_assignments"."activity_id"
        AND activity."status" = 'PUBLISHED'
        AND activity."scope_id"::text = current_setting('cvg.scope_id', true)
        AND assignment."participant_id" = "activity_assignments"."participant_id"
        AND assignment."scope_id" = activity."scope_id"
        AND assignment."module_id" = activity."module_id"
    )
  );--> statement-breakpoint
CREATE POLICY "activity_assignments_adaptive_update_policy"
  ON "activity_assignments" FOR UPDATE
  USING (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
    AND EXISTS (
      SELECT 1
      FROM "learning_activities" AS activity
      WHERE activity."id" = "activity_assignments"."activity_id"
        AND activity."scope_id"::text = current_setting('cvg.scope_id', true)
    )
  )
  WITH CHECK (
    current_setting('cvg.participant_id', true) <> ''
    AND current_setting('cvg.scope_id', true) <> ''
    AND current_setting('cvg.participant_id', true) = "participant_id"::text
    AND "learning_assignment_id" IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM "learning_activities" AS activity
      INNER JOIN "learning_assignments" AS assignment
        ON assignment."id" = "activity_assignments"."learning_assignment_id"
      WHERE activity."id" = "activity_assignments"."activity_id"
        AND activity."status" = 'PUBLISHED'
        AND activity."scope_id"::text = current_setting('cvg.scope_id', true)
        AND assignment."participant_id" = "activity_assignments"."participant_id"
        AND assignment."scope_id" = activity."scope_id"
        AND assignment."module_id" = activity."module_id"
    )
  );--> statement-breakpoint

ALTER TABLE "learning_assignments"
  ADD COLUMN "source_diagnostic_result_id" uuid;--> statement-breakpoint
ALTER TABLE "learning_assignments"
  ADD CONSTRAINT "learning_assignments_source_diagnostic_result_id_diagnostic_results_id_fk"
  FOREIGN KEY ("source_diagnostic_result_id")
  REFERENCES "public"."diagnostic_results"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "learning_assignments_source_diagnostic_idx"
  ON "learning_assignments" USING btree ("source_diagnostic_result_id");
