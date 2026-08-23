import { canAccess, type AccountStatus, type Role } from "./authorization.js";
import { ApplicationError } from "./errors.js";

export type ContentReviewQueueStatus =
  "EM_REVISAO_CLINICA" | "AJUSTES_SOLICITADOS";

export type ContentReviewQueueQuery = Readonly<{
  readonly scopeId: string;
  readonly status?: ContentReviewQueueStatus;
  readonly limit?: number;
}>;

export type ContentReviewQueueItem = Readonly<{
  readonly contentId: string;
  readonly version: number;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly sessionId: string;
  readonly title: string;
  readonly authorId: string;
  readonly status: ContentReviewQueueStatus;
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

export type ContentReviewQueueState = Readonly<{
  readonly kind: "content_review_queue";
  readonly scopeId: string;
  readonly generatedAt: string;
  readonly filters: Readonly<{
    readonly scopeId: string;
    readonly status?: ContentReviewQueueStatus;
    readonly limit: number;
  }>;
  readonly items: readonly ContentReviewQueueItem[];
}>;

export type GetContentReviewQueueCommand = Readonly<{
  readonly principalId: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly approvedClinicalApproverId?: string;
  readonly query: ContentReviewQueueQuery;
}>;

export interface ContentReviewQueueReadPort {
  readonly findContentReviewQueue: (
    query: Readonly<{
      readonly scopeId: string;
      readonly status?: ContentReviewQueueStatus;
      readonly limit: number;
      readonly authorId?: string;
    }>,
  ) => Promise<ContentReviewQueueState>;
}

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function assertUuid(value: string, field: string): void {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      value,
    )
  ) {
    throw new ApplicationError("validation_error", `${field} is invalid`);
  }
}

function normalizeQuery(query: ContentReviewQueueQuery): Readonly<{
  readonly scopeId: string;
  readonly status?: ContentReviewQueueStatus;
  readonly limit: number;
}> {
  assertNonEmpty(query.scopeId, "scopeId");
  assertUuid(query.scopeId, "scopeId");
  if (
    query.status !== undefined &&
    query.status !== "EM_REVISAO_CLINICA" &&
    query.status !== "AJUSTES_SOLICITADOS"
  ) {
    throw new ApplicationError("validation_error", "status is invalid");
  }
  const limit = query.limit ?? 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ApplicationError("validation_error", "limit is invalid");
  }
  return Object.freeze({
    scopeId: query.scopeId,
    ...(query.status === undefined ? {} : { status: query.status }),
    limit,
  });
}

function freezeItem(item: ContentReviewQueueItem): ContentReviewQueueItem {
  return Object.freeze({
    ...item,
    preflight: Object.freeze({ ...item.preflight }),
    ...(item.latestReview === undefined
      ? {}
      : { latestReview: Object.freeze({ ...item.latestReview }) }),
  });
}

function hasScopedStaffIdentity(
  command: GetContentReviewQueueCommand,
): boolean {
  return (
    command.roles.includes("MODERATOR") ||
    command.roles.includes("ADMIN") ||
    (command.roles.includes("CLINICAL_APPROVER") &&
      command.approvedClinicalApproverId === command.principalId)
  );
}

export async function getContentReviewQueue(
  command: GetContentReviewQueueCommand,
  repository: ContentReviewQueueReadPort,
): Promise<ContentReviewQueueState> {
  assertNonEmpty(command.principalId, "principalId");
  const query = normalizeQuery(command.query);
  if (
    !canAccess({
      principalId: command.principalId,
      accountStatus: command.accountStatus,
      roles: command.roles,
      capability: "VIEW_CONTENT_REVIEW_QUEUE",
      resource: { scopeId: query.scopeId },
      scopes: command.scopes,
      ...(command.approvedClinicalApproverId === undefined
        ? {}
        : { approvedClinicalApproverId: command.approvedClinicalApproverId }),
    })
  ) {
    throw new ApplicationError("forbidden", "Content queue is not authorized");
  }

  const authorOnly =
    command.roles.includes("AUTHOR") && !hasScopedStaffIdentity(command);
  const repositoryQuery = Object.freeze({
    ...query,
    ...(authorOnly ? { authorId: command.principalId } : {}),
  });
  const state = await repository.findContentReviewQueue(repositoryQuery);
  if (
    state.kind !== "content_review_queue" ||
    state.scopeId !== query.scopeId ||
    state.filters.scopeId !== query.scopeId ||
    state.filters.status !== query.status ||
    state.filters.limit !== query.limit ||
    state.items.some(
      (item) =>
        item.scopeId !== query.scopeId ||
        (authorOnly && item.authorId !== command.principalId),
    )
  ) {
    throw new ApplicationError(
      "forbidden",
      "Content queue returned data outside the requested scope",
    );
  }

  const canOpenAuthoring = canAccess({
    principalId: command.principalId,
    accountStatus: command.accountStatus,
    roles: command.roles,
    capability: "VIEW_INTERNAL_SOURCE",
    resource: { scopeId: query.scopeId },
    scopes: command.scopes,
    ...(command.approvedClinicalApproverId === undefined
      ? {}
      : { approvedClinicalApproverId: command.approvedClinicalApproverId }),
  });

  return Object.freeze({
    ...state,
    filters: Object.freeze({ ...state.filters }),
    items: Object.freeze(
      state.items.map((item) => freezeItem({ ...item, canOpenAuthoring })),
    ),
  });
}
