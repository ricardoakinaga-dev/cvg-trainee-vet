-- Align the internal feedback queue keyset traversal with both optional
-- status filtering and its stable scope/created_at/id ordering.
CREATE INDEX "feedback_tickets_scope_created_id_idx"
  ON "feedback_tickets" USING btree ("scope_id", "created_at", "id");--> statement-breakpoint

CREATE INDEX "feedback_tickets_scope_status_created_id_idx"
  ON "feedback_tickets" USING btree ("scope_id", "status", "created_at", "id");
