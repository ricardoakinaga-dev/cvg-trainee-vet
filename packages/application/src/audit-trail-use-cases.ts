import { ApplicationError } from "./errors.js";
import { canAccess, type AccountStatus, type Role } from "./authorization.js";
import type { AuditActorKind, AuditOutcome } from "./audit.js";

export type AuditTrailQuery = Readonly<{
  readonly scopeId: string;
  readonly action?: string;
  readonly resourceType?: string;
  readonly resourceId?: string;
  readonly principalId?: string;
  readonly actorKind?: AuditActorKind;
  readonly outcome?: AuditOutcome;
  readonly from?: string;
  readonly to?: string;
  readonly cursor?: string;
  readonly limit?: number;
}>;

export type AuditTrailRecord = Readonly<{
  readonly auditId: string;
  readonly occurredAt: string;
  readonly actorKind: AuditActorKind;
  readonly principalId?: string;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId?: string;
  readonly scopeId?: string;
  readonly outcome: AuditOutcome;
  readonly reasonCode?: string;
  readonly requestId: string;
  readonly correlationId: string;
  readonly beforeHash?: string;
  readonly afterHash?: string;
}>;

export type AuditTrailReadPage = Readonly<{
  readonly scopeId: string;
  readonly items: readonly AuditTrailRecord[];
  readonly hasNext: boolean;
  readonly nextCursor?: string;
}>;

export type AuditTrailState = Readonly<{
  readonly kind: "audit_trail";
  readonly scopeId: string;
  readonly filters: Readonly<{
    readonly scopeId: string;
    readonly action?: string;
    readonly resourceType?: string;
    readonly resourceId?: string;
    readonly principalId?: string;
    readonly actorKind?: AuditActorKind;
    readonly outcome?: AuditOutcome;
    readonly from?: string;
    readonly to?: string;
    readonly limit: number;
  }>;
  readonly items: readonly AuditTrailRecord[];
  readonly hasNext: boolean;
  readonly nextCursor?: string;
}>;

export type GetAuditTrailCommand = Readonly<{
  readonly principalId: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly approvedClinicalApproverId?: string;
  readonly query: AuditTrailQuery;
}>;

export interface AuditTrailReadPort {
  readonly listAuditTrail: (
    query: Readonly<{
      readonly scopeId: string;
      readonly action?: string;
      readonly resourceType?: string;
      readonly resourceId?: string;
      readonly principalId?: string;
      readonly actorKind?: AuditActorKind;
      readonly outcome?: AuditOutcome;
      readonly from?: string;
      readonly to?: string;
      readonly cursor?: string;
      readonly limit: number;
    }>,
  ) => Promise<AuditTrailReadPage>;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const tokenPattern = /^[A-Za-z][A-Za-z0-9_.-]{1,127}$/u;
const cursorPattern = /^[A-Za-z0-9_-]{1,512}$/u;
const hashPattern = /^[a-f0-9]{64}$/u;
const outcomes: readonly AuditOutcome[] = ["SUCCESS", "DENIED", "FAILURE"];
const actorKinds: readonly AuditActorKind[] = ["AUTHENTICATED", "ANONYMOUS"];

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function optionalToken(value: string | undefined, field: string): void {
  if (value !== undefined && !tokenPattern.test(value)) {
    throw new ApplicationError("validation_error", `${field} is invalid`);
  }
}

function optionalBoundedText(value: string | undefined, field: string): void {
  if (
    value !== undefined &&
    (value.trim().length === 0 || value.length > 256)
  ) {
    throw new ApplicationError("validation_error", `${field} is invalid`);
  }
}

function normalizeQuery(
  query: AuditTrailQuery,
): Required<Pick<AuditTrailQuery, "scopeId" | "limit">> &
  Omit<AuditTrailQuery, "scopeId" | "limit"> {
  assertNonEmpty(query.scopeId, "scopeId");
  const scopeId = query.scopeId.trim();
  if (!uuidPattern.test(scopeId)) {
    throw new ApplicationError("validation_error", "scopeId is invalid");
  }
  optionalToken(query.action, "action");
  optionalToken(query.resourceType, "resourceType");
  optionalBoundedText(query.resourceId, "resourceId");
  if (query.principalId !== undefined && !uuidPattern.test(query.principalId)) {
    throw new ApplicationError("validation_error", "principalId is invalid");
  }
  if (query.actorKind !== undefined && !actorKinds.includes(query.actorKind)) {
    throw new ApplicationError("validation_error", "actorKind is invalid");
  }
  if (query.outcome !== undefined && !outcomes.includes(query.outcome)) {
    throw new ApplicationError("validation_error", "outcome is invalid");
  }
  for (const [value, field] of [
    [query.from, "from"],
    [query.to, "to"],
  ] as const) {
    if (value !== undefined && Number.isNaN(Date.parse(value))) {
      throw new ApplicationError("validation_error", `${field} is invalid`);
    }
  }
  if (
    query.from !== undefined &&
    query.to !== undefined &&
    Date.parse(query.from) > Date.parse(query.to)
  ) {
    throw new ApplicationError("validation_error", "from must be before to");
  }
  if (query.cursor !== undefined && !cursorPattern.test(query.cursor)) {
    throw new ApplicationError("validation_error", "cursor is invalid");
  }
  const limit = query.limit ?? 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ApplicationError("validation_error", "limit is invalid");
  }
  return Object.freeze({
    scopeId,
    ...(query.action === undefined ? {} : { action: query.action }),
    ...(query.resourceType === undefined
      ? {}
      : { resourceType: query.resourceType }),
    ...(query.resourceId === undefined ? {} : { resourceId: query.resourceId }),
    ...(query.principalId === undefined
      ? {}
      : { principalId: query.principalId }),
    ...(query.actorKind === undefined ? {} : { actorKind: query.actorKind }),
    ...(query.outcome === undefined ? {} : { outcome: query.outcome }),
    ...(query.from === undefined ? {} : { from: query.from }),
    ...(query.to === undefined ? {} : { to: query.to }),
    ...(query.cursor === undefined ? {} : { cursor: query.cursor }),
    limit,
  });
}

function freezeRecord(record: AuditTrailRecord): AuditTrailRecord {
  return Object.freeze({
    auditId: record.auditId,
    occurredAt: record.occurredAt,
    actorKind: record.actorKind,
    ...(record.principalId === undefined
      ? {}
      : { principalId: record.principalId }),
    action: record.action,
    resourceType: record.resourceType,
    ...(record.resourceId === undefined
      ? {}
      : { resourceId: record.resourceId }),
    ...(record.scopeId === undefined ? {} : { scopeId: record.scopeId }),
    outcome: record.outcome,
    ...(record.reasonCode === undefined
      ? {}
      : { reasonCode: record.reasonCode }),
    requestId: record.requestId,
    correlationId: record.correlationId,
    ...(record.beforeHash === undefined
      ? {}
      : { beforeHash: record.beforeHash }),
    ...(record.afterHash === undefined ? {} : { afterHash: record.afterHash }),
  });
}

function matchesQuery(
  record: AuditTrailRecord,
  query: ReturnType<typeof normalizeQuery>,
): boolean {
  return (
    (record.scopeId === query.scopeId ||
      (record.scopeId === undefined && record.actorKind === "ANONYMOUS")) &&
    (query.action === undefined || record.action === query.action) &&
    (query.resourceType === undefined ||
      record.resourceType === query.resourceType) &&
    (query.resourceId === undefined ||
      record.resourceId === query.resourceId) &&
    (query.principalId === undefined ||
      record.principalId === query.principalId) &&
    (query.actorKind === undefined || record.actorKind === query.actorKind) &&
    (query.outcome === undefined || record.outcome === query.outcome) &&
    (query.from === undefined ||
      Date.parse(record.occurredAt) >= Date.parse(query.from)) &&
    (query.to === undefined ||
      Date.parse(record.occurredAt) <= Date.parse(query.to))
  );
}

export async function getAuditTrail(
  command: GetAuditTrailCommand,
  port: AuditTrailReadPort,
): Promise<AuditTrailState> {
  assertNonEmpty(command.principalId, "principalId");
  const query = normalizeQuery(command.query);
  if (
    !canAccess({
      principalId: command.principalId,
      accountStatus: command.accountStatus,
      roles: command.roles,
      capability: "VIEW_AUDIT_TRAIL",
      resource: { scopeId: query.scopeId },
      scopes: command.scopes,
      ...(command.approvedClinicalApproverId === undefined
        ? {}
        : { approvedClinicalApproverId: command.approvedClinicalApproverId }),
    })
  ) {
    throw new ApplicationError("forbidden", "Audit trail is not authorized");
  }

  let page: AuditTrailReadPage;
  try {
    page = await port.listAuditTrail(query);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApplicationError(
        "validation_error",
        "Audit trail cursor or query is invalid",
      );
    }
    throw error;
  }
  if (
    page.scopeId !== query.scopeId ||
    page.items.length > query.limit ||
    (page.hasNext && page.nextCursor === undefined) ||
    (!page.hasNext && page.nextCursor !== undefined)
  ) {
    throw new ApplicationError(
      "internal_error",
      "Audit trail returned an invalid page",
    );
  }
  const seenIds = new Set<string>();
  const items = page.items.map((record) => {
    if (
      !uuidPattern.test(record.auditId) ||
      Number.isNaN(Date.parse(record.occurredAt)) ||
      !tokenPattern.test(record.action) ||
      !tokenPattern.test(record.resourceType) ||
      (record.principalId !== undefined &&
        !uuidPattern.test(record.principalId)) ||
      (record.scopeId !== undefined && record.scopeId !== query.scopeId) ||
      (record.actorKind === "AUTHENTICATED" && record.scopeId === undefined) ||
      (record.actorKind === "ANONYMOUS" && record.principalId !== undefined) ||
      !outcomes.includes(record.outcome) ||
      !actorKinds.includes(record.actorKind) ||
      (record.beforeHash !== undefined &&
        !hashPattern.test(record.beforeHash)) ||
      (record.afterHash !== undefined && !hashPattern.test(record.afterHash)) ||
      seenIds.has(record.auditId) ||
      !matchesQuery(record, query)
    ) {
      throw new ApplicationError(
        "internal_error",
        "Audit trail returned data outside the requested scope",
      );
    }
    seenIds.add(record.auditId);
    return freezeRecord(record);
  });

  return Object.freeze({
    kind: "audit_trail" as const,
    scopeId: query.scopeId,
    filters: Object.freeze({
      scopeId: query.scopeId,
      ...(query.action === undefined ? {} : { action: query.action }),
      ...(query.resourceType === undefined
        ? {}
        : { resourceType: query.resourceType }),
      ...(query.resourceId === undefined
        ? {}
        : { resourceId: query.resourceId }),
      ...(query.principalId === undefined
        ? {}
        : { principalId: query.principalId }),
      ...(query.actorKind === undefined ? {} : { actorKind: query.actorKind }),
      ...(query.outcome === undefined ? {} : { outcome: query.outcome }),
      ...(query.from === undefined ? {} : { from: query.from }),
      ...(query.to === undefined ? {} : { to: query.to }),
      limit: query.limit,
    }),
    items: Object.freeze(items),
    hasNext: page.hasNext,
    ...(page.nextCursor === undefined ? {} : { nextCursor: page.nextCursor }),
  });
}
