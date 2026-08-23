CREATE TABLE "account_recovery_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"scope_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"roles" jsonb NOT NULL,
	"scopes" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_recovery_requests_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "account_recovery_requests_token_hash_check" CHECK ("account_recovery_requests"."token_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
ALTER TABLE "account_recovery_requests" ADD CONSTRAINT "account_recovery_requests_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "account_recovery_requests" ADD CONSTRAINT "account_recovery_requests_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "account_recovery_requests_active_idx" ON "account_recovery_requests" USING btree ("expires_at","consumed_at","revoked_at");
--> statement-breakpoint
CREATE INDEX "account_recovery_requests_account_idx" ON "account_recovery_requests" USING btree ("account_id","scope_id","created_at");
