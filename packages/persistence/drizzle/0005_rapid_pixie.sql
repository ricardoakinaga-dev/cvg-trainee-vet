CREATE TABLE "assessment_idempotency" (
	"key" text PRIMARY KEY NOT NULL,
	"operation" text NOT NULL,
	"fingerprint" text NOT NULL,
	"attempt_id" uuid NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"kind" text NOT NULL,
	"score" integer NOT NULL,
	"outcome" text NOT NULL,
	"feedback" text NOT NULL,
	"rule_version" text NOT NULL,
	"corrected_by" uuid NOT NULL,
	"corrected_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_results_kind_check" CHECK ("assessment_results"."kind" in ('HUMANA', 'AUTOMATICA')),
	CONSTRAINT "assessment_results_outcome_check" CHECK ("assessment_results"."outcome" in ('APROVADO', 'REFORCO')),
	CONSTRAINT "assessment_results_score_check" CHECK ("assessment_results"."score" >= 0 and "assessment_results"."score" <= 100),
	CONSTRAINT "assessment_results_version_check" CHECK ("assessment_results"."version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "assessment_idempotency" ADD CONSTRAINT "assessment_idempotency_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_idempotency_expires_at_idx" ON "assessment_idempotency" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_results_attempt_version_idx" ON "assessment_results" USING btree ("attempt_id","version");--> statement-breakpoint
CREATE INDEX "assessment_results_attempt_idx" ON "assessment_results" USING btree ("attempt_id","version");