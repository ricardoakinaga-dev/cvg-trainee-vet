-- Store the internal decision rationale and server-generated audit metadata.
-- The constraint is NOT VALID so existing decided rows can be backfilled by an
-- authorized migration run before validation; all new and updated rows must
-- satisfy the complete metadata invariant.

ALTER TABLE "appeals" ADD COLUMN "decision_rationale" text;--> statement-breakpoint
ALTER TABLE "appeals" ADD COLUMN "decision_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appeals" ADD COLUMN "decision_correlation_id" uuid;--> statement-breakpoint

ALTER TABLE "appeals" DROP CONSTRAINT "appeals_decision_check";--> statement-breakpoint

ALTER TABLE "appeals" ADD CONSTRAINT "appeals_decision_check" CHECK ((
  ("appeals"."status" in ('DECIDIDA', 'RECALCULO_PENDENTE', 'ENCERRADA')
    and "appeals"."decision" is not null
    and "appeals"."decision" in ('MANTER_RESULTADO', 'ANULAR_ITEM', 'ALTERAR_RESULTADO')
    and "appeals"."decision_rationale" is not null
    and length(trim("appeals"."decision_rationale")) between 1 and 10000
    and "appeals"."decision_rationale" not like '%<%>%'
    and "appeals"."decision_at" is not null
    and "appeals"."decision_correlation_id" is not null)
  or ("appeals"."status" in ('ABERTA', 'EM_REVISAO')
    and "appeals"."decision" is null
    and "appeals"."decision_rationale" is null
    and "appeals"."decision_at" is null
    and "appeals"."decision_correlation_id" is null)
)) NOT VALID;--> statement-breakpoint
