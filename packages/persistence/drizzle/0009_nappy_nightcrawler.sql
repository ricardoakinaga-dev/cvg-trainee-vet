CREATE TABLE "curriculum_runtime_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"scope_id" uuid NOT NULL,
	"module_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"state" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "curriculum_runtime_module_id_check" CHECK ("curriculum_runtime_states"."module_id" ~ '^M(0[1-9]|1[0-9]|2[0-4])$'),
	CONSTRAINT "curriculum_runtime_version_check" CHECK ("curriculum_runtime_states"."version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "curriculum_runtime_states" ADD CONSTRAINT "curriculum_runtime_states_participant_id_accounts_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_runtime_participant_scope_module_idx" ON "curriculum_runtime_states" USING btree ("participant_id","scope_id","module_id");--> statement-breakpoint
CREATE INDEX "curriculum_runtime_participant_scope_idx" ON "curriculum_runtime_states" USING btree ("participant_id","scope_id");