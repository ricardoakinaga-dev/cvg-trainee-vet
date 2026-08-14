CREATE POLICY "learning_assignments_admin_read_policy" ON "learning_assignments" FOR SELECT USING (
  current_setting('cvg.admin_read', true) = 'true'
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
);
--> statement-breakpoint
CREATE POLICY "curriculum_runtime_admin_read_policy" ON "curriculum_runtime_states" FOR SELECT USING (
  current_setting('cvg.admin_read', true) = 'true'
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
);
