ALTER TABLE "feedback_tickets"
ADD COLUMN "logical_page" text;
--> statement-breakpoint
ALTER TABLE "feedback_tickets"
ADD COLUMN "app_version" text;
--> statement-breakpoint
ALTER TABLE "feedback_tickets"
ADD COLUMN "occurred_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "feedback_tickets"
ADD COLUMN "error_code" text;
--> statement-breakpoint
ALTER TABLE "feedback_tickets"
ADD CONSTRAINT "feedback_tickets_technical_context_check" CHECK (
  (
    "feedback_tickets"."logical_page" is null
    and "feedback_tickets"."app_version" is null
    and "feedback_tickets"."occurred_at" is null
    and "feedback_tickets"."error_code" is null
  )
  or (
    "feedback_tickets"."logical_page" is not null
    and "feedback_tickets"."app_version" is not null
    and "feedback_tickets"."logical_page" ~ '^/[A-Za-z0-9][A-Za-z0-9/_:-]{0,127}$'
    and "feedback_tickets"."app_version" ~ '^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$'
    and (
      "feedback_tickets"."error_code" is null
      or "feedback_tickets"."error_code" ~ '^[A-Z0-9][A-Z0-9_.:-]{0,63}$'
    )
  )
);
