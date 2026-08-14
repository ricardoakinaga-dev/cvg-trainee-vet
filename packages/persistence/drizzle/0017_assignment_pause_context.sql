ALTER TABLE "learning_assignments" ADD COLUMN "pause_reason" text;
--> statement-breakpoint
ALTER TABLE "learning_assignments" ADD COLUMN "resume_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "learning_assignments"
SET "pause_reason" = 'JANELA_OPERACIONAL'
WHERE "status" = 'PAUSADO' AND "pause_reason" IS NULL;
--> statement-breakpoint
ALTER TABLE "learning_assignments"
ADD CONSTRAINT "learning_assignments_pause_context_check"
CHECK ((
  ("status" = 'PAUSADO' AND "pause_reason" IS NOT NULL AND "pause_reason" IN ('AFASTAMENTO', 'ACOMODACAO', 'JANELA_OPERACIONAL'))
  OR
  ("status" <> 'PAUSADO' AND "pause_reason" IS NULL AND "resume_at" IS NULL)
));
