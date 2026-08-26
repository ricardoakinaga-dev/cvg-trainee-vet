import { sql, type SQL } from "drizzle-orm";

export type DatabaseSecurityContext = Readonly<{
  readonly participantId?: string;
  readonly scopeId?: string;
}>;

export type DatabaseTokenContextKind = "invitation" | "recovery";

export type DatabaseTokenSecurityContext = Readonly<{
  readonly kind: DatabaseTokenContextKind;
  readonly tokenHash: string;
}>;

export type DatabaseAccountProvisioningContext = Readonly<{
  readonly accountId: string;
}>;

export type DatabaseSessionSecurityContext = Readonly<{
  readonly tokenHash: string;
  readonly scopeId?: string;
}>;

export type DatabaseAppealReviewSecurityContext = Readonly<{
  readonly scopeId: string;
}>;

export type DatabaseAuditReadSecurityContext = Readonly<{
  readonly scopeId: string;
}>;

type ContextExecutor = Readonly<{
  readonly execute: (query: SQL) => Promise<unknown>;
}>;

type ActivityScopeRow = Readonly<{
  readonly scopeId?: unknown;
}>;

function normalizeValue(value: string | undefined, field: string): string {
  if (value === undefined) return "";
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty when provided`);
  }
  return value;
}

export function normalizeDatabaseSecurityContext(
  context: DatabaseSecurityContext,
): DatabaseSecurityContext {
  const participantId = normalizeValue(context.participantId, "participantId");
  const scopeId = normalizeValue(context.scopeId, "scopeId");
  if (participantId.length === 0 && scopeId.length === 0) {
    throw new TypeError(
      "security context must include participantId or scopeId",
    );
  }
  return Object.freeze({
    ...(participantId.length === 0 ? {} : { participantId }),
    ...(scopeId.length === 0 ? {} : { scopeId }),
  });
}

export async function setDatabaseSecurityContext(
  executor: ContextExecutor,
  context: DatabaseSecurityContext,
): Promise<void> {
  const normalized = normalizeDatabaseSecurityContext(context);
  await executor.execute(
    sql`select
      set_config('cvg.participant_id', ${normalized.participantId ?? ""}, true),
      set_config('cvg.scope_id', ${normalized.scopeId ?? ""}, true),
      set_config('cvg.account_provisioning_id', '', true),
      set_config('cvg.invitation_token_hash', '', true),
      set_config('cvg.recovery_token_hash', '', true),
      set_config('cvg.session_token_hash', '', true),
      set_config('cvg.appeal_review_scope_id', '', true),
      set_config('cvg.audit_write', '', true),
      set_config('cvg.audit_read', '', true),
      set_config('cvg.audit_scope_id', '', true)`,
  );
}

export async function resolveParticipantActivityScope(
  executor: ContextExecutor,
  activityId: string,
  participantId: string,
): Promise<string | null> {
  const result = await executor.execute(
    sql`select cvg_learning_activity_scope_for_participant(
      ${activityId}::uuid,
      ${participantId}::text
    ) as "scopeId"`,
  );
  if (!Array.isArray(result)) return null;
  const row = result[0] as ActivityScopeRow | undefined;
  return typeof row?.scopeId === "string" ? row.scopeId : null;
}

export async function setDatabaseTokenSecurityContext(
  executor: ContextExecutor,
  context: DatabaseTokenSecurityContext,
): Promise<void> {
  if (!/^[a-f0-9]{64}$/u.test(context.tokenHash)) {
    throw new TypeError("tokenHash must be a SHA-256 hex digest");
  }
  if (context.kind !== "invitation" && context.kind !== "recovery") {
    throw new TypeError("token context kind is not supported");
  }
  const invitationHash = context.kind === "invitation" ? context.tokenHash : "";
  const recoveryHash = context.kind === "recovery" ? context.tokenHash : "";
  await executor.execute(
    sql`select
      set_config('cvg.participant_id', '', true),
      set_config('cvg.scope_id', '', true),
      set_config('cvg.account_provisioning_id', '', true),
      set_config('cvg.invitation_token_hash', ${invitationHash}, true),
      set_config('cvg.recovery_token_hash', ${recoveryHash}, true),
      set_config('cvg.session_token_hash', '', true),
      set_config('cvg.appeal_review_scope_id', '', true),
      set_config('cvg.audit_write', '', true),
      set_config('cvg.audit_read', '', true),
      set_config('cvg.audit_scope_id', '', true)`,
  );
}

export async function setDatabaseAccountProvisioningContext(
  executor: ContextExecutor,
  context: DatabaseAccountProvisioningContext,
): Promise<void> {
  const accountId = normalizeValue(context.accountId, "accountId");
  if (accountId.length === 0) {
    throw new TypeError("accountId must not be empty");
  }
  await executor.execute(
    sql`select
      set_config('cvg.participant_id', '', true),
      set_config('cvg.scope_id', '', true),
      set_config('cvg.account_provisioning_id', ${accountId}, true),
      set_config('cvg.invitation_token_hash', '', true),
      set_config('cvg.recovery_token_hash', '', true),
      set_config('cvg.session_token_hash', '', true),
      set_config('cvg.appeal_review_scope_id', '', true),
      set_config('cvg.audit_write', '', true),
      set_config('cvg.audit_read', '', true),
      set_config('cvg.audit_scope_id', '', true)`,
  );
}

export async function setDatabaseSessionSecurityContext(
  executor: ContextExecutor,
  context: DatabaseSessionSecurityContext,
): Promise<void> {
  if (!/^[a-f0-9]{64}$/u.test(context.tokenHash)) {
    throw new TypeError("tokenHash must be a SHA-256 hex digest");
  }
  const scopeId = normalizeValue(context.scopeId, "scopeId");
  await executor.execute(
    sql`select
      set_config('cvg.participant_id', '', true),
      set_config('cvg.scope_id', ${scopeId}, true),
      set_config('cvg.account_provisioning_id', '', true),
      set_config('cvg.invitation_token_hash', '', true),
      set_config('cvg.recovery_token_hash', '', true),
      set_config('cvg.session_token_hash', ${context.tokenHash}, true),
      set_config('cvg.appeal_review_scope_id', '', true),
      set_config('cvg.audit_write', '', true),
      set_config('cvg.audit_read', '', true),
      set_config('cvg.audit_scope_id', '', true)`,
  );
}

export async function setDatabaseAppealReviewContext(
  executor: ContextExecutor,
  context: DatabaseAppealReviewSecurityContext,
): Promise<void> {
  const scopeId = normalizeValue(context.scopeId, "scopeId");
  await executor.execute(
    sql`select
      set_config('cvg.participant_id', '', true),
      set_config('cvg.scope_id', ${scopeId}, true),
      set_config('cvg.account_provisioning_id', '', true),
      set_config('cvg.invitation_token_hash', '', true),
      set_config('cvg.recovery_token_hash', '', true),
      set_config('cvg.session_token_hash', '', true),
      set_config('cvg.appeal_review_scope_id', ${scopeId}, true),
      set_config('cvg.audit_write', '', true),
      set_config('cvg.audit_read', '', true),
      set_config('cvg.audit_scope_id', '', true)`,
  );
}

export async function setDatabaseAuditReadContext(
  executor: ContextExecutor,
  context: DatabaseAuditReadSecurityContext,
): Promise<void> {
  const scopeId = normalizeValue(context.scopeId, "scopeId");
  await executor.execute(
    sql`select
      set_config('cvg.participant_id', '', true),
      set_config('cvg.scope_id', '', true),
      set_config('cvg.account_provisioning_id', '', true),
      set_config('cvg.invitation_token_hash', '', true),
      set_config('cvg.recovery_token_hash', '', true),
      set_config('cvg.session_token_hash', '', true),
      set_config('cvg.appeal_review_scope_id', '', true),
      set_config('cvg.audit_write', '', true),
      set_config('cvg.audit_read', 'on', true),
      set_config('cvg.audit_scope_id', ${scopeId}, true)`,
  );
}
