-- Permit only the dedicated, transaction-local reviewer read context to see
-- appeal protocols by scope. Participant reads continue using the original
-- participant/scope policy; this policy is SELECT-only and cannot authorize
-- assignment, decision, recalculation, or any other mutation.

CREATE INDEX "appeals_scope_status_due_idx"
  ON "appeals" USING btree ("scope_id", "status", "due_at", "created_at", "id");--> statement-breakpoint

CREATE POLICY "appeals_review_scope_select_policy" ON "appeals"
  FOR SELECT USING (
    current_setting('cvg.appeal_review_scope_id', true) = "scope_id"::text
  );
