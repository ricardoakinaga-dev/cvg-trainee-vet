CREATE TABLE "content_editorial_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_version_id" uuid NOT NULL,
	"content_id" uuid NOT NULL,
	"scope_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"module_id" text NOT NULL,
	"session_id" text NOT NULL,
	"objective_id" text NOT NULL,
	"author_id" uuid NOT NULL,
	"item" jsonb NOT NULL,
	"preflight" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_editorial_records_version_check" CHECK ("content_editorial_records"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "content_review_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_editorial_record_id" uuid NOT NULL,
	"content_version_id" uuid NOT NULL,
	"content_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"scope_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"rationale" text NOT NULL,
	"correlation_id" text NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_review_decisions_decision_check" CHECK ("content_review_decisions"."decision" in ('APROVAR_CLINICAMENTE', 'SOLICITAR_AJUSTES')),
	CONSTRAINT "content_review_decisions_version_check" CHECK ("content_review_decisions"."version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "content_editorial_records" ADD CONSTRAINT "content_editorial_records_content_version_id_content_versions_id_fk" FOREIGN KEY ("content_version_id") REFERENCES "public"."content_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_editorial_records" ADD CONSTRAINT "content_editorial_records_author_id_accounts_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_review_decisions" ADD CONSTRAINT "content_review_decisions_content_editorial_record_id_content_editorial_records_id_fk" FOREIGN KEY ("content_editorial_record_id") REFERENCES "public"."content_editorial_records"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_review_decisions" ADD CONSTRAINT "content_review_decisions_content_version_id_content_versions_id_fk" FOREIGN KEY ("content_version_id") REFERENCES "public"."content_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_review_decisions" ADD CONSTRAINT "content_review_decisions_reviewer_id_accounts_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_editorial_records_content_version_idx" ON "content_editorial_records" USING btree ("content_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "content_editorial_records_version_row_idx" ON "content_editorial_records" USING btree ("content_version_id");--> statement-breakpoint
CREATE INDEX "content_editorial_records_scope_idx" ON "content_editorial_records" USING btree ("scope_id","module_id");--> statement-breakpoint
CREATE INDEX "content_review_decisions_content_version_idx" ON "content_review_decisions" USING btree ("content_id","version","reviewed_at");--> statement-breakpoint
CREATE INDEX "content_review_decisions_scope_idx" ON "content_review_decisions" USING btree ("scope_id","reviewed_at");--> statement-breakpoint
