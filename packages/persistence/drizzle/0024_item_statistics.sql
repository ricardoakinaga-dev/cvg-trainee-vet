CREATE TABLE "item_statistics" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"scope_id" text NOT NULL,
	"content_version" integer NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"sample_size" integer NOT NULL,
	"correct_count" integer NOT NULL,
	"appeal_count" integer NOT NULL,
	"difficulty" real NOT NULL,
	"appeal_rate" real NOT NULL,
	"discrimination" real,
	"distractor_counts" jsonb NOT NULL,
	"anomaly_codes" jsonb NOT NULL,
	"requires_human_review" boolean NOT NULL,
	"automatic_decision" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_statistics_content_version_check" CHECK ("item_statistics"."content_version" >= 1),
	CONSTRAINT "item_statistics_sample_size_check" CHECK ("item_statistics"."sample_size" >= 1),
	CONSTRAINT "item_statistics_correct_count_check" CHECK ("item_statistics"."correct_count" >= 0 and "item_statistics"."correct_count" <= "item_statistics"."sample_size"),
	CONSTRAINT "item_statistics_appeal_count_check" CHECK ("item_statistics"."appeal_count" >= 0 and "item_statistics"."appeal_count" <= "item_statistics"."sample_size"),
	CONSTRAINT "item_statistics_difficulty_check" CHECK ("item_statistics"."difficulty" >= 0 and "item_statistics"."difficulty" <= 1),
	CONSTRAINT "item_statistics_appeal_rate_check" CHECK ("item_statistics"."appeal_rate" >= 0 and "item_statistics"."appeal_rate" <= 1),
	CONSTRAINT "item_statistics_discrimination_check" CHECK ("item_statistics"."discrimination" is null or ("item_statistics"."discrimination" >= -1 and "item_statistics"."discrimination" <= 1)),
	CONSTRAINT "item_statistics_decision_check" CHECK ("item_statistics"."automatic_decision" = 'NONE'),
	CONSTRAINT "item_statistics_distractors_object_check" CHECK (jsonb_typeof("item_statistics"."distractor_counts") = 'array'),
	CONSTRAINT "item_statistics_anomalies_object_check" CHECK (jsonb_typeof("item_statistics"."anomaly_codes") = 'array')
);
--> statement-breakpoint
CREATE INDEX "item_statistics_scope_item_idx" ON "item_statistics" USING btree ("scope_id","item_id","content_version","observed_at");
--> statement-breakpoint
ALTER TABLE "item_statistics" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "item_statistics" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "item_statistics_scope_policy" ON "item_statistics" FOR ALL USING (
  current_setting('cvg.scope_id', true) = "scope_id"
) WITH CHECK (
  current_setting('cvg.scope_id', true) = "scope_id"
);
