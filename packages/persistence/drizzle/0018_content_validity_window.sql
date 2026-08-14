ALTER TABLE "content_versions"
ADD COLUMN "valid_until" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "content_versions"
ADD COLUMN "next_review_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX "content_versions_expiry_idx"
ON "content_versions" USING btree ("status", "valid_until", "scope_id");
