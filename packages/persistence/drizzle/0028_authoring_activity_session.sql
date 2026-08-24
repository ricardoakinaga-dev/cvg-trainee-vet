-- Materialize approved authoring sessions as explicit published activities.
-- Legacy activities remain nullable and are not retroactively grouped.

ALTER TABLE "learning_activities"
  ADD COLUMN "session_id" text;--> statement-breakpoint
ALTER TABLE "learning_activities"
  ADD CONSTRAINT "learning_activities_session_id_check"
  CHECK ("session_id" is null or length(trim("session_id")) > 0);--> statement-breakpoint
CREATE UNIQUE INDEX "learning_activities_scope_module_session_idx"
  ON "learning_activities" USING btree ("scope_id", "module_id", "session_id");
