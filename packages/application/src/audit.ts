export type AuditOutcome = "SUCCESS" | "DENIED" | "FAILURE";

export type AuditEntryInput = Readonly<{
  readonly auditId: string;
  readonly principalId: string;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly scopeId?: string;
  readonly outcome: AuditOutcome;
  readonly reasonCode?: string;
  readonly requestId: string;
  readonly correlationId: string;
  readonly beforeHash?: string;
  readonly afterHash?: string;
  readonly occurredAt: string;
}>;

export type AuditEntry = AuditEntryInput;

export interface AuditPort {
  readonly append: (entry: AuditEntry) => Promise<void>;
}

export interface AuditReadPort {
  readonly list: () => Promise<readonly AuditEntry[]>;
}

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) throw new Error(`${field} is required`);
}

function assertSafeToken(value: string, field: string): void {
  assertNonEmpty(value, field);
  if (!/^[A-Za-z][A-Za-z0-9_.-]{1,127}$/u.test(value)) {
    throw new Error(`${field} contains unsafe characters`);
  }
}

function assertHash(value: string | undefined, field: string): void {
  if (value !== undefined && !/^[a-f0-9]{64}$/u.test(value)) {
    throw new Error(`${field} must be a SHA-256 hex digest`);
  }
}

export function createAuditEntry(input: AuditEntryInput): AuditEntry {
  assertNonEmpty(input.auditId, "auditId");
  assertNonEmpty(input.principalId, "principalId");
  assertSafeToken(input.action, "action");
  assertSafeToken(input.resourceType, "resourceType");
  assertNonEmpty(input.resourceId, "resourceId");
  assertNonEmpty(input.requestId, "requestId");
  assertNonEmpty(input.correlationId, "correlationId");
  if (input.scopeId !== undefined) assertNonEmpty(input.scopeId, "scopeId");
  if (input.reasonCode !== undefined) {
    assertSafeToken(input.reasonCode, "reasonCode");
  }
  assertHash(input.beforeHash, "beforeHash");
  assertHash(input.afterHash, "afterHash");
  if (Number.isNaN(Date.parse(input.occurredAt))) {
    throw new Error("occurredAt must be a valid timestamp");
  }

  return Object.freeze({
    auditId: input.auditId,
    principalId: input.principalId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    ...(input.scopeId === undefined ? {} : { scopeId: input.scopeId }),
    outcome: input.outcome,
    ...(input.reasonCode === undefined ? {} : { reasonCode: input.reasonCode }),
    requestId: input.requestId,
    correlationId: input.correlationId,
    ...(input.beforeHash === undefined ? {} : { beforeHash: input.beforeHash }),
    ...(input.afterHash === undefined ? {} : { afterHash: input.afterHash }),
    occurredAt: input.occurredAt,
  });
}

export async function listAuditEntries(
  repository: AuditReadPort,
): Promise<readonly AuditEntry[]> {
  const entries = await repository.list();
  if (!Array.isArray(entries)) {
    throw new TypeError("audit entries must be an array");
  }
  return Object.freeze(entries.map((entry) => createAuditEntry(entry)));
}
