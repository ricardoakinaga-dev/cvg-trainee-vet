CREATE TABLE "digital_case_runtime_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"scope_id" uuid NOT NULL,
	"module_id" text NOT NULL,
	"case_id" text NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"state" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "digital_case_runtime_module_id_check" CHECK ("digital_case_runtime_states"."module_id" ~ '^M(0[1-9]|1[0-9]|2[0-4])$'),
	CONSTRAINT "digital_case_runtime_version_check" CHECK ("digital_case_runtime_states"."version" >= 0),
	CONSTRAINT "digital_case_runtime_state_object_check" CHECK (jsonb_typeof("digital_case_runtime_states"."state") = 'object')
);
--> statement-breakpoint
ALTER TABLE "digital_case_runtime_states" ADD CONSTRAINT "digital_case_runtime_states_participant_id_accounts_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "digital_case_runtime_participant_scope_module_idx" ON "digital_case_runtime_states" USING btree ("participant_id","scope_id","module_id");
--> statement-breakpoint
CREATE INDEX "digital_case_runtime_participant_scope_idx" ON "digital_case_runtime_states" USING btree ("participant_id","scope_id");
--> statement-breakpoint
ALTER TABLE "digital_case_runtime_states" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "digital_case_runtime_states" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "digital_case_runtime_participant_scope_policy" ON "digital_case_runtime_states" FOR ALL USING (
  current_setting('cvg.participant_id', true) = "participant_id"::text
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
) WITH CHECK (
  current_setting('cvg.participant_id', true) = "participant_id"::text
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
);
