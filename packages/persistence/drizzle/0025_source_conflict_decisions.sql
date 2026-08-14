CREATE TABLE "source_conflict_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"content_id" text NOT NULL,
	"content_version" integer NOT NULL,
	"scope_id" text NOT NULL,
	"source_codes" jsonb NOT NULL,
	"description" text NOT NULL,
	"decision" text NOT NULL,
	"rationale" text NOT NULL,
	"decided_by" text NOT NULL,
	"decided_at" timestamp with time zone NOT NULL,
	"human_review_required" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_conflict_decisions_version_check" CHECK ("source_conflict_decisions"."content_version" >= 1),
	CONSTRAINT "source_conflict_decisions_decision_check" CHECK ("source_conflict_decisions"."decision" in ('ACCEPT_SOURCE_A', 'ACCEPT_SOURCE_B', 'ESCALATE_CLINICAL_REVIEW', 'DEFER_PUBLICATION')),
	CONSTRAINT "source_conflict_decisions_sources_array_check" CHECK (jsonb_typeof("source_conflict_decisions"."source_codes") = 'array' and jsonb_array_length("source_conflict_decisions"."source_codes") >= 2)
);
--> statement-breakpoint
CREATE INDEX "source_conflict_decisions_scope_content_idx" ON "source_conflict_decisions" USING btree ("scope_id","content_id","content_version","decided_at");
--> statement-breakpoint
ALTER TABLE "source_conflict_decisions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "source_conflict_decisions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "source_conflict_decisions_scope_policy" ON "source_conflict_decisions" FOR ALL USING (
  current_setting('cvg.scope_id', true) = "scope_id"
) WITH CHECK (
  current_setting('cvg.scope_id', true) = "scope_id"
);
