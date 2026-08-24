-- Scope the append-only audit read policy to the dedicated reviewer context.
-- Global anonymous events remain visible to an authorized scope reader, while
-- scoped entries require an exact transaction-local scope match.

DROP POLICY "audit_entries_select_with_context" ON "audit_entries";--> statement-breakpoint

CREATE INDEX "audit_entries_scope_occurred_idx"
  ON "audit_entries" USING btree ("scope_id", "occurred_at", "id");--> statement-breakpoint

CREATE POLICY "audit_entries_select_with_scoped_context" ON "audit_entries" FOR SELECT USING (
  current_setting('cvg.audit_read', true) = 'on'
  AND (
    ("scope_id" IS NULL AND "actor_kind" = 'ANONYMOUS')
    OR "scope_id"::text = current_setting('cvg.audit_scope_id', true)
  )
);
