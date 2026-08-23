-- Close the remaining identity-table boundary with explicit transaction-local
-- contexts. Account provisioning is the only application insert path for a
-- new account; sessions are created only with a scoped server-side snapshot.

ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "accounts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "accounts_context_select_policy" ON "accounts" FOR SELECT USING (
  (
    current_setting('cvg.scope_id', true) <> ''
    AND (
      EXISTS (
        SELECT 1
        FROM "account_invitations" invitation
        WHERE invitation."account_id" = "accounts"."id"
          AND invitation."scopes" @> jsonb_build_array(current_setting('cvg.scope_id', true))
      )
      OR EXISTS (
        SELECT 1
        FROM "account_recovery_requests" recovery
        WHERE recovery."account_id" = "accounts"."id"
          AND recovery."scope_id"::text = current_setting('cvg.scope_id', true)
      )
    )
  )
  OR (
    current_setting('cvg.invitation_token_hash', true) <> ''
    AND EXISTS (
      SELECT 1
      FROM "account_invitations" invitation
      WHERE invitation."account_id" = "accounts"."id"
        AND invitation."token_hash" = current_setting('cvg.invitation_token_hash', true)
    )
  )
  OR (
    current_setting('cvg.recovery_token_hash', true) <> ''
    AND EXISTS (
      SELECT 1
      FROM "account_recovery_requests" recovery
      WHERE recovery."account_id" = "accounts"."id"
        AND recovery."token_hash" = current_setting('cvg.recovery_token_hash', true)
    )
  )
  OR (
    current_setting('cvg.session_token_hash', true) <> ''
    AND EXISTS (
      SELECT 1
      FROM "sessions" session_record
      WHERE session_record."account_id" = "accounts"."id"
        AND session_record."token_hash" = current_setting('cvg.session_token_hash', true)
    )
  )
);--> statement-breakpoint
CREATE POLICY "accounts_context_update_policy" ON "accounts" FOR UPDATE USING (
  (
    current_setting('cvg.scope_id', true) <> ''
    AND (
      EXISTS (
        SELECT 1
        FROM "account_invitations" invitation
        WHERE invitation."account_id" = "accounts"."id"
          AND invitation."scopes" @> jsonb_build_array(current_setting('cvg.scope_id', true))
      )
      OR EXISTS (
        SELECT 1
        FROM "account_recovery_requests" recovery
        WHERE recovery."account_id" = "accounts"."id"
          AND recovery."scope_id"::text = current_setting('cvg.scope_id', true)
      )
    )
  )
  OR (
    current_setting('cvg.invitation_token_hash', true) <> ''
    AND EXISTS (
      SELECT 1
      FROM "account_invitations" invitation
      WHERE invitation."account_id" = "accounts"."id"
        AND invitation."token_hash" = current_setting('cvg.invitation_token_hash', true)
    )
  )
  OR (
    current_setting('cvg.recovery_token_hash', true) <> ''
    AND EXISTS (
      SELECT 1
      FROM "account_recovery_requests" recovery
      WHERE recovery."account_id" = "accounts"."id"
        AND recovery."token_hash" = current_setting('cvg.recovery_token_hash', true)
    )
  )
  OR (
    current_setting('cvg.session_token_hash', true) <> ''
    AND EXISTS (
      SELECT 1
      FROM "sessions" session_record
      WHERE session_record."account_id" = "accounts"."id"
        AND session_record."token_hash" = current_setting('cvg.session_token_hash', true)
    )
  )
) WITH CHECK (
  (
    current_setting('cvg.scope_id', true) <> ''
    AND (
      EXISTS (
        SELECT 1
        FROM "account_invitations" invitation
        WHERE invitation."account_id" = "accounts"."id"
          AND invitation."scopes" @> jsonb_build_array(current_setting('cvg.scope_id', true))
      )
      OR EXISTS (
        SELECT 1
        FROM "account_recovery_requests" recovery
        WHERE recovery."account_id" = "accounts"."id"
          AND recovery."scope_id"::text = current_setting('cvg.scope_id', true)
      )
    )
  )
  OR (
    current_setting('cvg.invitation_token_hash', true) <> ''
    AND EXISTS (
      SELECT 1
      FROM "account_invitations" invitation
      WHERE invitation."account_id" = "accounts"."id"
        AND invitation."token_hash" = current_setting('cvg.invitation_token_hash', true)
    )
  )
  OR (
    current_setting('cvg.recovery_token_hash', true) <> ''
    AND EXISTS (
      SELECT 1
      FROM "account_recovery_requests" recovery
      WHERE recovery."account_id" = "accounts"."id"
        AND recovery."token_hash" = current_setting('cvg.recovery_token_hash', true)
    )
  )
  OR (
    current_setting('cvg.session_token_hash', true) <> ''
    AND EXISTS (
      SELECT 1
      FROM "sessions" session_record
      WHERE session_record."account_id" = "accounts"."id"
        AND session_record."token_hash" = current_setting('cvg.session_token_hash', true)
    )
  )
);--> statement-breakpoint
CREATE POLICY "accounts_provisioning_insert_policy" ON "accounts" FOR INSERT WITH CHECK (
  current_setting('cvg.account_provisioning_id', true) = "id"::text
  AND "status" = 'INVITED'
);--> statement-breakpoint

ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "sessions_context_select_policy" ON "sessions" FOR SELECT USING (
  (
    current_setting('cvg.session_token_hash', true) <> ''
    AND "token_hash" = current_setting('cvg.session_token_hash', true)
  )
  OR (
    current_setting('cvg.scope_id', true) <> ''
    AND "scopes" @> jsonb_build_array(current_setting('cvg.scope_id', true))
  )
);--> statement-breakpoint
CREATE POLICY "sessions_context_update_policy" ON "sessions" FOR UPDATE USING (
  (
    current_setting('cvg.session_token_hash', true) <> ''
    AND "token_hash" = current_setting('cvg.session_token_hash', true)
  )
  OR (
    current_setting('cvg.scope_id', true) <> ''
    AND "scopes" @> jsonb_build_array(current_setting('cvg.scope_id', true))
  )
) WITH CHECK (
  (
    current_setting('cvg.session_token_hash', true) <> ''
    AND "token_hash" = current_setting('cvg.session_token_hash', true)
  )
  OR (
    current_setting('cvg.scope_id', true) <> ''
    AND "scopes" @> jsonb_build_array(current_setting('cvg.scope_id', true))
  )
);--> statement-breakpoint
CREATE POLICY "sessions_scoped_insert_policy" ON "sessions" FOR INSERT WITH CHECK (
  current_setting('cvg.scope_id', true) <> ''
  AND "scopes" @> jsonb_build_array(current_setting('cvg.scope_id', true))
);
