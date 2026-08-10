CREATE TABLE "rate_limit_buckets" (
	"key" text PRIMARY KEY NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "rate_limit_buckets_key_check" CHECK ("rate_limit_buckets"."key" <> ''),
	CONSTRAINT "rate_limit_buckets_count_check" CHECK ("rate_limit_buckets"."count" >= 0)
);
--> statement-breakpoint
CREATE INDEX "rate_limit_buckets_expires_at_idx" ON "rate_limit_buckets" USING btree ("expires_at");
--> statement-breakpoint
REVOKE ALL ON "rate_limit_buckets" FROM PUBLIC;
