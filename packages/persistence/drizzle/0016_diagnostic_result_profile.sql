CREATE TABLE "diagnostic_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"scope_id" uuid NOT NULL,
	"diagnostic_id" text NOT NULL,
	"diagnostic_version" text NOT NULL,
	"result" jsonb NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "diagnostic_results_diagnostic_id_check" CHECK ("diagnostic_results"."diagnostic_id" = 'B07-DIAGNOSTIC-V1'),
	CONSTRAINT "diagnostic_results_diagnostic_version_check" CHECK ("diagnostic_results"."diagnostic_version" = '0.1.0')
);
--> statement-breakpoint
ALTER TABLE "diagnostic_results" ADD CONSTRAINT "diagnostic_results_participant_id_accounts_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "diagnostic_results_participant_scope_idx" ON "diagnostic_results" USING btree ("participant_id","scope_id","diagnostic_id","completed_at");
--> statement-breakpoint
CREATE INDEX "diagnostic_results_scope_completed_idx" ON "diagnostic_results" USING btree ("scope_id","completed_at");
--> statement-breakpoint
ALTER TABLE "diagnostic_results" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "diagnostic_results" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "diagnostic_results_participant_select_policy" ON "diagnostic_results" FOR SELECT USING (
  current_setting('cvg.participant_id', true) <> ''
  AND current_setting('cvg.participant_id', true) = "participant_id"::text
);
--> statement-breakpoint
CREATE POLICY "diagnostic_results_participant_insert_policy" ON "diagnostic_results" FOR INSERT WITH CHECK (
  current_setting('cvg.participant_id', true) <> ''
  AND current_setting('cvg.participant_id', true) = "participant_id"::text
  AND (
    current_setting('cvg.scope_id', true) = ''
    OR current_setting('cvg.scope_id', true) = "scope_id"::text
  )
);
--> statement-breakpoint
CREATE POLICY "diagnostic_results_staff_scope_select_policy" ON "diagnostic_results" FOR SELECT USING (
  current_setting('cvg.scope_id', true) <> ''
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
);
