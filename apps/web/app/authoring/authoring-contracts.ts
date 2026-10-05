export type AdjustmentReceipt = Readonly<{
  readonly contentId: string;
  readonly version: number;
  readonly scopeId: string;
  readonly contentStatus: "AJUSTES_SOLICITADOS";
  readonly review: Readonly<{
    readonly decision: "SOLICITAR_AJUSTES";
    readonly reviewedAt: string;
    readonly rationale: string;
    readonly correlationId?: string;
  }>;
}>;

export type InternalAuthoringRecord = Readonly<{
  readonly contentId: string;
  readonly version: number;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly sessionId: string;
  readonly objectiveId: string;
  readonly authorId: string;
  readonly contentStatus: string;
  readonly item: Readonly<{
    readonly title: string;
    readonly prompt: string;
    readonly responseMode: string;
    readonly choices?: readonly Readonly<{
      readonly id: string;
      readonly label: string;
      readonly text: string;
    }>[];
    readonly correctChoiceIds?: readonly string[];
    readonly rubric?: Readonly<{
      readonly dimensions: readonly Readonly<{
        readonly id: string;
        readonly label: string;
        readonly description: string;
        readonly maxPoints: number;
      }>[];
      readonly passScore: number;
      readonly criticalErrors: readonly string[];
    }>;
    readonly feedback: string;
    readonly critical: boolean;
    readonly remediationTargetObjectiveId: string;
    readonly sourceRefs: readonly Readonly<{
      readonly code: string;
      readonly locator: string;
      readonly updateRequired: boolean;
    }>[];
  }>;
  readonly preflight: Readonly<{
    readonly technicalChecksPassed: boolean;
    readonly readyForClinicalReview?: boolean;
    readonly readyForPublication?: boolean;
  }>;
  readonly latestReview?: Readonly<{
    readonly decision: string;
    readonly rationale: string;
    readonly reviewerId: string;
    readonly reviewedAt: string;
  }>;
  readonly availableActions: Readonly<{
    readonly requestAdjustments: boolean;
    readonly approveClinically: boolean;
  }>;
}>;

type ContentReviewQueueItem = Readonly<{
  readonly contentId: string;
  readonly version: number;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly sessionId: string;
  readonly title: string;
  readonly authorId: string;
  readonly status: "EM_REVISAO_CLINICA" | "AJUSTES_SOLICITADOS";
  readonly preflight: Readonly<{
    readonly technicalChecksPassed: boolean;
    readonly checkedAt: string;
  }>;
  readonly latestReview?: Readonly<{
    readonly decision: "APROVAR_CLINICAMENTE" | "SOLICITAR_AJUSTES";
    readonly reviewedAt: string;
  }>;
  readonly canOpenAuthoring: boolean;
  readonly updatedAt: string;
  readonly nextAction: "REVISAR_CLINICAMENTE" | "AGUARDAR_REENVIO_AUTOR";
}>;

export type ContentReviewQueue = Readonly<{
  readonly kind: "content_review_queue";
  readonly scopeId: string;
  readonly generatedAt: string;
  readonly filters: Readonly<{
    readonly scopeId: string;
    readonly status?: "EM_REVISAO_CLINICA" | "AJUSTES_SOLICITADOS";
    readonly limit: number;
  }>;
  readonly items: readonly ContentReviewQueueItem[];
}>;

export type InternalSessionScopes = Readonly<{
  readonly kind: "internal_session_scopes";
  readonly scopes: readonly string[];
  readonly recoveryContext?: RecoveryContext;
}>;

type RecoveryContext = Readonly<{
  readonly principalId: string;
  // Non-secret server binding; it must change after logout/login.
  readonly sessionBinding: string;
}>;

type ApiRecord = Readonly<Record<string, unknown>>;

export function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isReviewRationale(value: unknown): value is string {
  return (
    isString(value) &&
    value.trim().length > 0 &&
    value.trim().length <= 10_000 &&
    !/<[^>]*>/u.test(value)
  );
}

export function isUuid(value: unknown): value is string {
  return (
    isString(value) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      value,
    )
  );
}

function isCalendarTimestamp(value: unknown): value is string {
  if (!isString(value) || !Number.isFinite(Date.parse(value))) return false;
  const parts =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.exec(
      value,
    );
  if (parts === null) return false;
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  const hour = Number(parts[4]);
  const minute = Number(parts[5]);
  const second = Number(parts[6]);
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day);
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    calendar.getUTCFullYear() === year &&
    calendar.getUTCMonth() === month - 1 &&
    calendar.getUTCDate() === day
  );
}

export function isAdjustmentReceipt(
  value: unknown,
): value is AdjustmentReceipt {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "contentId",
      "version",
      "scopeId",
      "contentStatus",
      "review",
    ]) &&
    isUuid(value.contentId) &&
    isUuid(value.scopeId) &&
    typeof value.version === "number" &&
    Number.isSafeInteger(value.version) &&
    value.version >= 1 &&
    value.contentStatus === "AJUSTES_SOLICITADOS" &&
    isRecord(value.review) &&
    hasOnlyKeys(value.review, [
      "decision",
      "reviewedAt",
      "rationale",
      "correlationId",
    ]) &&
    value.review.decision === "SOLICITAR_AJUSTES" &&
    isCalendarTimestamp(value.review.reviewedAt) &&
    isReviewRationale(value.review.rationale) &&
    (value.review.correlationId === undefined ||
      isUuid(value.review.correlationId))
  );
}

export function isInternalAuthoringRecord(
  value: unknown,
): value is InternalAuthoringRecord {
  if (
    !isRecord(value) ||
    !isString(value.contentId) ||
    !isRecord(value.availableActions) ||
    !hasOnlyKeys(value, [
      "contentId",
      "version",
      "scopeId",
      "moduleId",
      "sessionId",
      "objectiveId",
      "authorId",
      "contentStatus",
      "item",
      "preflight",
      "latestReview",
      "availableActions",
    ]) ||
    !hasOnlyKeys(value.availableActions, [
      "requestAdjustments",
      "approveClinically",
    ]) ||
    (value.latestReview !== undefined &&
      (!isRecord(value.latestReview) ||
        !isReviewRationale(value.latestReview.rationale) ||
        !isString(value.latestReview.reviewedAt) ||
        !isUuid(value.latestReview.reviewerId) ||
        (value.latestReview.decision !== "SOLICITAR_AJUSTES" &&
          value.latestReview.decision !== "APROVAR_CLINICAMENTE")))
  )
    return false;
  if (!isRecord(value.item) || !isRecord(value.preflight)) return false;
  return (
    isUuid(value.contentId) &&
    isUuid(value.scopeId) &&
    typeof value.version === "number" &&
    isString(value.moduleId) &&
    isString(value.sessionId) &&
    isString(value.objectiveId) &&
    isUuid(value.authorId) &&
    isString(value.contentStatus) &&
    isString(value.item.title) &&
    isString(value.item.prompt) &&
    isString(value.item.feedback) &&
    typeof value.item.critical === "boolean" &&
    typeof value.preflight.technicalChecksPassed === "boolean" &&
    typeof value.availableActions.requestAdjustments === "boolean" &&
    typeof value.availableActions.approveClinically === "boolean"
  );
}

function hasOnlyKeys(value: ApiRecord, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function isContentReviewQueueItem(
  value: unknown,
): value is ContentReviewQueueItem {
  if (!isRecord(value) || !isRecord(value.preflight)) return false;
  if (
    !hasOnlyKeys(value, [
      "contentId",
      "version",
      "scopeId",
      "moduleId",
      "sessionId",
      "title",
      "authorId",
      "status",
      "preflight",
      "latestReview",
      "canOpenAuthoring",
      "updatedAt",
      "nextAction",
    ]) ||
    !isString(value.contentId) ||
    !isString(value.scopeId) ||
    !isString(value.moduleId) ||
    !isString(value.sessionId) ||
    !isString(value.title) ||
    !isString(value.authorId) ||
    !isString(value.updatedAt) ||
    typeof value.version !== "number" ||
    !Number.isInteger(value.version) ||
    value.version < 1 ||
    (value.status !== "EM_REVISAO_CLINICA" &&
      value.status !== "AJUSTES_SOLICITADOS") ||
    (value.nextAction !== "REVISAR_CLINICAMENTE" &&
      value.nextAction !== "AGUARDAR_REENVIO_AUTOR") ||
    typeof value.preflight.technicalChecksPassed !== "boolean" ||
    !isString(value.preflight.checkedAt) ||
    typeof value.canOpenAuthoring !== "boolean"
  ) {
    return false;
  }
  if (value.latestReview !== undefined) {
    if (
      !isRecord(value.latestReview) ||
      !hasOnlyKeys(value.latestReview, ["decision", "reviewedAt"]) ||
      !isString(value.latestReview.reviewedAt) ||
      (value.latestReview.decision !== "APROVAR_CLINICAMENTE" &&
        value.latestReview.decision !== "SOLICITAR_AJUSTES")
    ) {
      return false;
    }
  }
  return true;
}

export function isContentReviewQueue(
  value: unknown,
): value is ContentReviewQueue {
  if (!isRecord(value) || !Array.isArray(value.items)) return false;
  if (
    !hasOnlyKeys(value, [
      "kind",
      "scopeId",
      "generatedAt",
      "filters",
      "items",
    ]) ||
    value.kind !== "content_review_queue" ||
    !isString(value.scopeId) ||
    !isString(value.generatedAt) ||
    !isRecord(value.filters) ||
    !hasOnlyKeys(value.filters, ["scopeId", "status", "limit"]) ||
    value.filters.scopeId !== value.scopeId ||
    typeof value.filters.limit !== "number" ||
    !Number.isInteger(value.filters.limit) ||
    value.filters.limit < 1 ||
    value.filters.limit > 100 ||
    !value.items.every(isContentReviewQueueItem)
  ) {
    return false;
  }
  return true;
}

export function isInternalSessionScopes(
  value: unknown,
): value is InternalSessionScopes {
  if (!isRecord(value) || !Array.isArray(value.scopes)) return false;
  return (
    hasOnlyKeys(value, ["kind", "scopes", "recoveryContext"]) &&
    value.kind === "internal_session_scopes" &&
    value.scopes.length <= 100 &&
    value.scopes.every(isUuid) &&
    (value.recoveryContext === undefined ||
      (isRecord(value.recoveryContext) &&
        hasOnlyKeys(value.recoveryContext, ["principalId", "sessionBinding"]) &&
        isUuid(value.recoveryContext.principalId) &&
        isUuid(value.recoveryContext.sessionBinding)))
  );
}
