CREATE POLICY "appeals_moderator_read_policy" ON "appeals" FOR SELECT USING (
  current_setting('cvg.moderator_read', true) = 'true'
  AND current_setting('cvg.scope_id', true) = "scope_id"::text
);
