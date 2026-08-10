CREATE TABLE "ai_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" text DEFAULT 'DRAFT_AI' NOT NULL,
	"draft_text" text NOT NULL,
	"warnings" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_suggestions_status_check" CHECK ("ai_suggestions"."status" = 'DRAFT_AI'),
	CONSTRAINT "ai_suggestions_version_check" CHECK ("ai_suggestions"."version" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_suggestions_content_version_idx" ON "ai_suggestions" USING btree ("content_id","version");