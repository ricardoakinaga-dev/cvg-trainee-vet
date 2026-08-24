import type { AppealState, AppealStatus } from "@cvg/domain";

import { ApplicationError } from "./errors.js";
import { canAccess, type AccountStatus, type Role } from "./authorization.js";

export type AppealReviewQueueStatus = AppealStatus;

export type AppealReviewQueueQuery = Readonly<{
  readonly scopeId: string;
  readonly status?: AppealReviewQueueStatus;
  readonly limit?: number;
}>;

export type AppealReviewQueueRecord = Readonly<{
  readonly scopeId: string;
  readonly state: AppealState;
}>;

export type AppealReviewQueueItem = Readonly<{
  readonly appealId: string;
  readonly participantId: string;
  readonly attemptId: string;
  readonly itemId: string;
  readonly justification: string;
  readonly createdAt: string;
  readonly dueAt: string;
  readonly status: AppealReviewQueueStatus;
  readonly version: number;
  readonly reviewerId?: string;
  readonly decision?: AppealState["decision"];
  readonly decisionRationale?: string;
  readonly decisionAt?: string;
  readonly decisionCorrelationId?: string;
}>;

export type AppealReviewQueueState = Readonly<{
  readonly kind: "appeal_review_queue";
  readonly scopeId: string;
  readonly generatedAt: string;
  readonly filters: Readonly<{
    readonly scopeId: string;
    readonly status?: AppealReviewQueueStatus;
    readonly limit: number;
  }>;
  readonly items: readonly AppealReviewQueueItem[];
}>;

export type GetAppealReviewQueueCommand = Readonly<{
  readonly principalId: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly approvedClinicalApproverId?: string;
  readonly query: AppealReviewQueueQuery;
}>;

export interface AppealReviewQueueReadPort {
  readonly listAppeals: (
    query: Readonly<{
      readonly scopeId: string;
      readonly status?: AppealReviewQueueStatus;
      readonly limit: number;
    }>,
  ) => Promise<readonly AppealReviewQueueRecord[]>;
}

export type AppealReviewQueueUseCaseOptions = Readonly<{
  readonly now?: () => Date;
}>;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const statuses: readonly AppealReviewQueueStatus[] = [
  "ABERTA",
  "EM_REVISAO",
  "DECIDIDA",
  "RECALCULO_PENDENTE",
  "ENCERRADA",
];

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function normalizeQuery(query: AppealReviewQueueQuery): Readonly<{
  readonly scopeId: string;
  readonly status?: AppealReviewQueueStatus;
  readonly limit: number;
}> {
  assertNonEmpty(query.scopeId, "scopeId");
  const scopeId = query.scopeId.trim();
  if (!uuidPattern.test(scopeId)) {
    throw new ApplicationError("validation_error", "scopeId is invalid");
  }
  if (query.status !== undefined && !statuses.includes(query.status)) {
    throw new ApplicationError("validation_error", "status is invalid");
  }
  const limit = query.limit ?? 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ApplicationError("validation_error", "limit is invalid");
  }
  return Object.freeze({
    scopeId,
    ...(query.status === undefined ? {} : { status: query.status }),
    limit,
  });
}

function freezeItem(state: AppealState): AppealReviewQueueItem {
  return Object.freeze({
    appealId: state.appealId,
    participantId: state.participantId,
    attemptId: state.attemptId,
    itemId: state.itemId,
    justification: state.justification,
    createdAt: state.createdAt,
    dueAt: state.dueAt,
    status: state.status,
    version: state.version,
    ...(state.reviewerId === undefined ? {} : { reviewerId: state.reviewerId }),
    ...(state.decision === undefined ? {} : { decision: state.decision }),
    ...(state.decisionRationale === undefined
      ? {}
      : { decisionRationale: state.decisionRationale }),
    ...(state.decisionAt === undefined ? {} : { decisionAt: state.decisionAt }),
    ...(state.decisionCorrelationId === undefined
      ? {}
      : { decisionCorrelationId: state.decisionCorrelationId }),
  });
}

export async function getAppealReviewQueue(
  command: GetAppealReviewQueueCommand,
  port: AppealReviewQueueReadPort,
  options: AppealReviewQueueUseCaseOptions = {},
): Promise<AppealReviewQueueState> {
  assertNonEmpty(command.principalId, "principalId");
  const query = normalizeQuery(command.query);
  if (
    !canAccess({
      principalId: command.principalId,
      accountStatus: command.accountStatus,
      roles: command.roles,
      capability: "REVIEW_APPEAL",
      resource: { scopeId: query.scopeId },
      scopes: command.scopes,
      ...(command.approvedClinicalApproverId === undefined
        ? {}
        : { approvedClinicalApproverId: command.approvedClinicalApproverId }),
    })
  ) {
    throw new ApplicationError("forbidden", "Appeal queue is not authorized");
  }

  const records = await port.listAppeals(query);
  if (records.length > query.limit) {
    throw new ApplicationError(
      "forbidden",
      "Appeal queue exceeded the requested limit",
    );
  }
  const seenAppeals = new Set<string>();
  const items = records.map((record) => {
    if (
      record.scopeId !== query.scopeId ||
      (query.status !== undefined && record.state.status !== query.status) ||
      seenAppeals.has(record.state.appealId)
    ) {
      throw new ApplicationError(
        "forbidden",
        "Appeal queue returned data outside the requested scope",
      );
    }
    seenAppeals.add(record.state.appealId);
    return freezeItem(record.state);
  });

  const now = (options.now ?? (() => new Date()))();
  if (Number.isNaN(now.getTime())) {
    throw new ApplicationError("internal_error", "Queue timestamp is invalid");
  }
  return Object.freeze({
    kind: "appeal_review_queue" as const,
    scopeId: query.scopeId,
    generatedAt: now.toISOString(),
    filters: Object.freeze({ ...query }),
    items: Object.freeze(items),
  });
}
