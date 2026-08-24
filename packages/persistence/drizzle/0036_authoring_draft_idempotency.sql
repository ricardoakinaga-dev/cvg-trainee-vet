CREATE TABLE "authoring_draft_idempotency" (
	"key" text PRIMARY KEY NOT NULL,
	"operation" text NOT NULL,
	"fingerprint" text NOT NULL,
	"content_editorial_record_id" uuid NOT NULL,
	"content_version_id" uuid NOT NULL,
	"content_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"scope_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "authoring_draft_idempotency_operation_check" CHECK ("authoring_draft_idempotency"."operation" = 'create_authoring_draft'),
	CONSTRAINT "authoring_draft_idempotency_key_check" CHECK ("authoring_draft_idempotency"."key" ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{7,127}$'),
	CONSTRAINT "authoring_draft_idempotency_version_check" CHECK ("authoring_draft_idempotency"."version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "authoring_draft_idempotency" ADD CONSTRAINT "authoring_draft_idempotency_content_editorial_record_id_content_editorial_records_id_fk" FOREIGN KEY ("content_editorial_record_id") REFERENCES "public"."content_editorial_records"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "authoring_draft_idempotency" ADD CONSTRAINT "authoring_draft_idempotency_content_version_id_content_versions_id_fk" FOREIGN KEY ("content_version_id") REFERENCES "public"."content_versions"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "authoring_draft_idempotency" ADD CONSTRAINT "authoring_draft_idempotency_author_id_accounts_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_identity_unique" UNIQUE ("id", "content_id", "version", "scope_id");
--> statement-breakpoint
ALTER TABLE "content_editorial_records" ADD CONSTRAINT "content_editorial_records_identity_unique" UNIQUE ("id", "content_id", "version", "scope_id");
--> statement-breakpoint
ALTER TABLE "authoring_draft_idempotency" ADD CONSTRAINT "authoring_draft_idempotency_editorial_identity_fk" FOREIGN KEY ("content_editorial_record_id", "content_id", "version", "scope_id") REFERENCES "public"."content_editorial_records"("id", "content_id", "version", "scope_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "authoring_draft_idempotency" ADD CONSTRAINT "authoring_draft_idempotency_version_identity_fk" FOREIGN KEY ("content_version_id", "content_id", "version", "scope_id") REFERENCES "public"."content_versions"("id", "content_id", "version", "scope_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "authoring_draft_idempotency_expires_at_idx" ON "authoring_draft_idempotency" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX "authoring_draft_idempotency_scope_idx" ON "authoring_draft_idempotency" USING btree ("scope_id","created_at");
--> statement-breakpoint
ALTER TABLE "authoring_draft_idempotency" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "authoring_draft_idempotency" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "authoring_draft_idempotency_scope_policy" ON "authoring_draft_idempotency" FOR SELECT USING (
  current_setting('cvg.scope_id', true) <> ''
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
);
--> statement-breakpoint
CREATE POLICY "authoring_draft_idempotency_insert_policy" ON "authoring_draft_idempotency" FOR INSERT WITH CHECK (
  current_setting('cvg.scope_id', true) <> ''
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
);
--> statement-breakpoint
REVOKE UPDATE, DELETE ON "authoring_draft_idempotency" FROM PUBLIC;
--> statement-breakpoint
DROP POLICY "audit_entries_insert_with_context" ON "audit_entries";
--> statement-breakpoint
CREATE POLICY "audit_entries_insert_with_scoped_context" ON "audit_entries" FOR INSERT WITH CHECK (
  current_setting('cvg.audit_write', true) = 'on'
  AND (
    (
      "actor_kind" = 'ANONYMOUS'
      AND "principal_id" IS NULL
      AND "scope_id" IS NULL
      AND current_setting('cvg.audit_scope_id', true) = ''
    )
    OR (
      "actor_kind" = 'AUTHENTICATED'
      AND "principal_id" IS NOT NULL
      AND "scope_id" IS NOT NULL
      AND current_setting('cvg.audit_scope_id', true) <> ''
      AND "scope_id"::text = current_setting('cvg.audit_scope_id', true)
    )
  )
);
