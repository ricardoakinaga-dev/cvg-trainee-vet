-- RLS predicates are SECURITY DEFINER boolean oracles. They are callable by
-- the application through explicit provisioning only; a database role must
-- not be able to invoke them directly through PUBLIC EXECUTE.
REVOKE EXECUTE ON FUNCTION cvg_learning_activity_in_scope(uuid, text) FROM PUBLIC;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION cvg_learning_activity_for_participant(uuid, text) FROM PUBLIC;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION cvg_learning_activity_item_insert_allowed(uuid, uuid, text) FROM PUBLIC;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION cvg_learning_activity_content_for_participant(uuid, text) FROM PUBLIC;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION cvg_participant_in_scope(uuid, uuid) FROM PUBLIC;
