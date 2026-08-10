CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_email" text NOT NULL,
	"status" text DEFAULT 'INVITED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_professional_email_unique" UNIQUE("professional_email"),
	CONSTRAINT "accounts_status_check" CHECK ("accounts"."status" in ('INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'))
);
--> statement-breakpoint
CREATE TABLE "answer_idempotency" (
	"key" text PRIMARY KEY NOT NULL,
	"operation" text NOT NULL,
	"fingerprint" text NOT NULL,
	"attempt_id" uuid NOT NULL,
	"answer_id" uuid NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"response" text NOT NULL,
	"saved_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"principal_id" uuid NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid NOT NULL,
	"scope_id" uuid,
	"outcome" text NOT NULL,
	"reason_code" text,
	"request_id" uuid NOT NULL,
	"correlation_id" uuid NOT NULL,
	"before_hash" text,
	"after_hash" text,
	"occurred_at" timestamp with time zone NOT NULL,
	CONSTRAINT "audit_entries_outcome_check" CHECK ("audit_entries"."outcome" in ('SUCCESS', 'DENIED', 'FAILURE'))
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"roles" jsonb NOT NULL,
	"scopes" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "answer_idempotency" ADD CONSTRAINT "answer_idempotency_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_idempotency" ADD CONSTRAINT "answer_idempotency_answer_id_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."answers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "answer_idempotency_expires_at_idx" ON "answer_idempotency" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "answers_attempt_item_idx" ON "answers" USING btree ("attempt_id","item_id");--> statement-breakpoint
CREATE INDEX "answers_attempt_idx" ON "answers" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "audit_entries_resource_idx" ON "audit_entries" USING btree ("resource_type","resource_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_entries_principal_idx" ON "audit_entries" USING btree ("principal_id","occurred_at");--> statement-breakpoint
CREATE INDEX "sessions_account_idx" ON "sessions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "sessions_active_idx" ON "sessions" USING btree ("expires_at","revoked_at");--> statement-breakpoint
ALTER TABLE "audit_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_entries" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "audit_entries_insert_with_context" ON "audit_entries" FOR INSERT WITH CHECK (current_setting('cvg.audit_write', true) = 'on');--> statement-breakpoint
CREATE POLICY "audit_entries_select_with_context" ON "audit_entries" FOR SELECT USING (current_setting('cvg.audit_read', true) = 'on');--> statement-breakpoint
CREATE FUNCTION cvg_prevent_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_entries is append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER audit_entries_append_only
  BEFORE UPDATE OR DELETE ON "audit_entries"
  FOR EACH ROW EXECUTE FUNCTION cvg_prevent_audit_mutation();--> statement-breakpoint
REVOKE UPDATE, DELETE ON "audit_entries" FROM PUBLIC;
