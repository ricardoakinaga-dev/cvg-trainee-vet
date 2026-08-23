-- Direct defense for credential-bearing membership and recovery records.
-- Anonymous acceptance is narrowed to the matching SHA-256 hash; internal
-- operations must establish the requested scope in the same transaction.

ALTER TABLE "account_invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account_invitations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "account_invitations_scope_or_token_policy" ON "account_invitations" FOR ALL USING (
  (
    current_setting('cvg.scope_id', true) <> ''
    AND "scopes" @> jsonb_build_array(current_setting('cvg.scope_id', true))
  )
  OR (
    current_setting('cvg.invitation_token_hash', true) <> ''
    AND "token_hash" = current_setting('cvg.invitation_token_hash', true)
  )
) WITH CHECK (
  (
    current_setting('cvg.scope_id', true) <> ''
    AND "scopes" @> jsonb_build_array(current_setting('cvg.scope_id', true))
  )
  OR (
    current_setting('cvg.invitation_token_hash', true) <> ''
    AND "token_hash" = current_setting('cvg.invitation_token_hash', true)
  )
);--> statement-breakpoint

ALTER TABLE "account_recovery_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account_recovery_requests" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "account_recovery_requests_scope_or_token_policy" ON "account_recovery_requests" FOR ALL USING (
  (
    current_setting('cvg.scope_id', true) <> ''
    AND "scope_id"::text = current_setting('cvg.scope_id', true)
  )
  OR (
    current_setting('cvg.recovery_token_hash', true) <> ''
    AND "token_hash" = current_setting('cvg.recovery_token_hash', true)
  )
) WITH CHECK (
  (
    current_setting('cvg.scope_id', true) <> ''
    AND "scope_id"::text = current_setting('cvg.scope_id', true)
  )
  OR (
    current_setting('cvg.recovery_token_hash', true) <> ''
    AND "token_hash" = current_setting('cvg.recovery_token_hash', true)
  )
);
