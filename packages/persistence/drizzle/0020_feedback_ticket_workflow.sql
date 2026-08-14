ALTER TABLE "feedback_tickets"
ADD COLUMN "priority" text DEFAULT 'NORMAL' NOT NULL;
--> statement-breakpoint
ALTER TABLE "feedback_tickets"
ADD COLUMN "assignee_id" uuid;
--> statement-breakpoint
ALTER TABLE "feedback_tickets"
ADD COLUMN "response" text;
--> statement-breakpoint
ALTER TABLE "feedback_tickets"
ADD COLUMN "response_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "feedback_tickets"
ADD COLUMN "response_by" uuid;
--> statement-breakpoint
ALTER TABLE "feedback_tickets"
ADD COLUMN "history" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "feedback_tickets"
ADD CONSTRAINT "feedback_tickets_assignee_id_accounts_id_fk"
FOREIGN KEY ("assignee_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "feedback_tickets"
ADD CONSTRAINT "feedback_tickets_response_by_accounts_id_fk"
FOREIGN KEY ("response_by") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "feedback_tickets"
ADD CONSTRAINT "feedback_tickets_priority_check" CHECK (
  "feedback_tickets"."priority" in ('BAIXA', 'NORMAL', 'ALTA', 'URGENTE')
);
--> statement-breakpoint
ALTER TABLE "feedback_tickets"
ADD CONSTRAINT "feedback_tickets_response_check" CHECK (
  (
    "feedback_tickets"."response" is null
    and "feedback_tickets"."response_at" is null
    and "feedback_tickets"."response_by" is null
  )
  or (
    "feedback_tickets"."response" is not null
    and "feedback_tickets"."response_at" is not null
  )
);
--> statement-breakpoint
ALTER TABLE "feedback_tickets"
ADD CONSTRAINT "feedback_tickets_history_check" CHECK (
  jsonb_typeof("feedback_tickets"."history") = 'array'
  and jsonb_array_length("feedback_tickets"."history") between 0 and 100
);
--> statement-breakpoint
ALTER TABLE "feedback_tickets"
ADD CONSTRAINT "feedback_tickets_response_text_check" CHECK (
  "feedback_tickets"."response" is null
  or (
    length(trim("feedback_tickets"."response")) between 1 and 10000
    and "feedback_tickets"."response" not like '%<%>'
  )
);
--> statement-breakpoint
CREATE INDEX "feedback_tickets_scope_status_priority_idx"
ON "feedback_tickets" USING btree ("scope_id", "status", "priority", "created_at");
--> statement-breakpoint
DROP POLICY "feedback_tickets_participant_scope_policy" ON "feedback_tickets";
--> statement-breakpoint
CREATE POLICY "feedback_tickets_participant_scope_policy" ON "feedback_tickets" FOR ALL USING (
  current_setting('cvg.participant_id', true) = "participant_id"::text
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
) WITH CHECK (
  current_setting('cvg.participant_id', true) = "participant_id"::text
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
);
--> statement-breakpoint
CREATE POLICY "feedback_tickets_staff_read_policy" ON "feedback_tickets" FOR SELECT USING (
  current_setting('cvg.feedback_staff_read', true) = 'true'
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
);
