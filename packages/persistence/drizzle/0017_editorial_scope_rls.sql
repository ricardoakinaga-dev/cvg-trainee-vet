-- Editorial source material and review decisions are internal, scoped data.
-- Every application transaction must set cvg.scope_id before reading or
-- mutating these tables. Administrative fixture/maintenance roles may bypass
-- RLS explicitly; the runtime application role may not.

ALTER TABLE "content_editorial_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "content_editorial_records" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "content_editorial_records_scope_policy" ON "content_editorial_records" FOR ALL USING (
  current_setting('cvg.scope_id', true) <> ''
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
) WITH CHECK (
  current_setting('cvg.scope_id', true) <> ''
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
);--> statement-breakpoint

ALTER TABLE "content_review_decisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "content_review_decisions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "content_review_decisions_scope_policy" ON "content_review_decisions" FOR ALL USING (
  current_setting('cvg.scope_id', true) <> ''
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
) WITH CHECK (
  current_setting('cvg.scope_id', true) <> ''
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
);
--> statement-breakpoint
CREATE INDEX "content_review_decisions_latest_idx" ON "content_review_decisions" USING btree (
  "content_editorial_record_id",
  "reviewed_at" DESC,
  "created_at" DESC,
  "id" DESC
);
