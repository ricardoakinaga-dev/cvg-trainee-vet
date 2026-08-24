-- Fence stale workers so an expired lease cannot complete or fail an event
-- after another worker has reclaimed it.

ALTER TABLE "outbox_events"
  ADD COLUMN "lease_token" text;--> statement-breakpoint

ALTER TABLE "outbox_events"
  ADD CONSTRAINT "outbox_events_lease_token_check"
  CHECK ("lease_token" is null or length(trim("lease_token")) > 0);--> statement-breakpoint

CREATE OR REPLACE FUNCTION "guard_outbox_lease_transition"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'PROCESSING'
     AND NEW.status IN ('PENDING', 'PROCESSED', 'FAILED')
     AND (
       OLD.lease_token IS NULL
       OR NEW.lease_token IS NOT NULL
     ) THEN
    RAISE EXCEPTION
      'outbox lease fencing requires a claimed lease token'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER "outbox_events_lease_transition_fence"
BEFORE UPDATE OF "status", "lease_token", "locked_until"
ON "outbox_events"
FOR EACH ROW
EXECUTE FUNCTION "guard_outbox_lease_transition"();
