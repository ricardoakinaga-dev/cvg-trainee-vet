CREATE TABLE "assessment_recalculation_candidates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"participant_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE restrict,
	"scope_id" uuid NOT NULL,
	"attempt_id" uuid NOT NULL REFERENCES "attempts"("id") ON DELETE restrict,
	"item_id" uuid NOT NULL,
	"previous_version" integer NOT NULL,
	"previous_score" integer NOT NULL,
	"previous_outcome" text NOT NULL,
	"correct_count" integer NOT NULL,
	"eligible_item_count" integer NOT NULL,
	"trigger_reason" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"recalculated_version" integer,
	"recalculated_score" integer,
	"recalculated_outcome" text,
	"recalculated_at" timestamp with time zone,
	"notification_queued_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_recalculation_previous_version_check" CHECK ("assessment_recalculation_candidates"."previous_version" >= 1),
	CONSTRAINT "assessment_recalculation_previous_score_check" CHECK ("assessment_recalculation_candidates"."previous_score" >= 0 and "assessment_recalculation_candidates"."previous_score" <= 100),
	CONSTRAINT "assessment_recalculation_counts_check" CHECK ("assessment_recalculation_candidates"."correct_count" >= 0 and "assessment_recalculation_candidates"."correct_count" <= "assessment_recalculation_candidates"."eligible_item_count" and "assessment_recalculation_candidates"."eligible_item_count" >= 1),
	CONSTRAINT "assessment_recalculation_outcome_check" CHECK ("assessment_recalculation_candidates"."previous_outcome" in ('APROVADO', 'REFORCO')),
	CONSTRAINT "assessment_recalculation_reason_check" CHECK ("assessment_recalculation_candidates"."trigger_reason" in ('ITEM_ANNULLED', 'ANSWER_KEY_CHANGED')),
	CONSTRAINT "assessment_recalculation_status_check" CHECK ("assessment_recalculation_candidates"."status" in ('PENDING', 'CALCULATED', 'NOTIFICATION_QUEUED')),
	CONSTRAINT "assessment_recalculation_processed_fields_check" CHECK (
		("assessment_recalculation_candidates"."status" = 'PENDING' and "assessment_recalculation_candidates"."recalculated_version" is null and "assessment_recalculation_candidates"."recalculated_score" is null and "assessment_recalculation_candidates"."recalculated_outcome" is null and "assessment_recalculation_candidates"."recalculated_at" is null and "assessment_recalculation_candidates"."notification_queued_at" is null)
		or
		("assessment_recalculation_candidates"."status" in ('CALCULATED', 'NOTIFICATION_QUEUED') and "assessment_recalculation_candidates"."recalculated_version" is not null and "assessment_recalculation_candidates"."recalculated_score" is not null and "assessment_recalculation_candidates"."recalculated_outcome" is not null and "assessment_recalculation_candidates"."recalculated_at" is not null)
	),
	CONSTRAINT "assessment_recalculation_score_check" CHECK ("assessment_recalculation_candidates"."recalculated_score" is null or ("assessment_recalculation_candidates"."recalculated_score" >= 0 and "assessment_recalculation_candidates"."recalculated_score" <= 100)),
	CONSTRAINT "assessment_recalculation_result_outcome_check" CHECK ("assessment_recalculation_candidates"."recalculated_outcome" is null or "assessment_recalculation_candidates"."recalculated_outcome" in ('APROVADO', 'REFORCO'))
);
--> statement-breakpoint
CREATE INDEX "assessment_recalculation_scope_item_status_idx" ON "assessment_recalculation_candidates" USING btree ("scope_id","item_id","status");
--> statement-breakpoint
CREATE INDEX "assessment_recalculation_attempt_idx" ON "assessment_recalculation_candidates" USING btree ("attempt_id","previous_version");
--> statement-breakpoint
ALTER TABLE "assessment_recalculation_candidates" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "assessment_recalculation_candidates" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "assessment_recalculation_clinical_read_policy" ON "assessment_recalculation_candidates" FOR SELECT USING (
  current_setting('cvg.recalculation_read', true) = 'true'
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
);
--> statement-breakpoint
CREATE POLICY "assessment_recalculation_clinical_insert_policy" ON "assessment_recalculation_candidates" FOR INSERT WITH CHECK (
  current_setting('cvg.recalculation_write', true) = 'true'
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
);
--> statement-breakpoint
CREATE POLICY "assessment_recalculation_clinical_update_policy" ON "assessment_recalculation_candidates" FOR UPDATE USING (
  current_setting('cvg.recalculation_write', true) = 'true'
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
) WITH CHECK (
  current_setting('cvg.recalculation_write', true) = 'true'
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
);
