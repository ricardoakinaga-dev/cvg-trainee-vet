import { canAccess, type AccountStatus, type Role } from "./authorization.js";
import { ApplicationError } from "./errors.js";

export type FeedbackTriageQueueStatus =
  | "NOVO"
  | "TRIADO"
  | "EM_TRATAMENTO"
  | "AGUARDA_USUARIO"
  | "RESOLVIDO"
  | "DUPLICADO"
  | "NAO_REPRODUZIDO"
  | "NAO_PLANEJADO";
export type FeedbackTriageQueuePriority =
  "BAIXA" | "NORMAL" | "ALTA" | "URGENTE";

export class FeedbackTriageQueueQueryError extends TypeError {
  constructor(message: string) {
    super(message);
    this.name = "FeedbackTriageQueueQueryError";
  }
}

export type FeedbackTriageQueueQuery = Readonly<{
  readonly scopeId: string;
  readonly status?: FeedbackTriageQueueStatus;
  readonly cursor?: string;
  readonly limit?: number;
}>;

export type FeedbackTriageQueueItem = Readonly<{
  readonly ticketId: string;
  readonly type:
    | "BUG_TECNICO"
    | "USABILIDADE"
    | "ERRO_CONTEUDO"
    | "MELHORIA"
    | "CONTESTACAO";
  readonly description: string;
  readonly createdAt: string;
  readonly status: FeedbackTriageQueueStatus;
  readonly version: number;
  readonly priority: FeedbackTriageQueuePriority;
  readonly assigneeId?: string;
}>;

export type FeedbackTriageQueueState = Readonly<{
  readonly kind: "feedback_triage_queue";
  readonly scopeId: string;
  readonly generatedAt: string;
  readonly filters: Readonly<{
    readonly scopeId: string;
    readonly status?: FeedbackTriageQueueStatus;
    readonly limit: number;
  }>;
  readonly items: readonly FeedbackTriageQueueItem[];
  readonly hasNext: boolean;
  readonly nextCursor?: string;
}>;

export type GetFeedbackTriageQueueCommand = Readonly<{
  readonly principalId: string;
  readonly accountStatus: AccountStatus;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly approvedClinicalApproverId?: string;
  readonly query: FeedbackTriageQueueQuery;
}>;

export interface FeedbackTriageQueueReadPort {
  readonly listFeedbackTickets: (
    query: Readonly<{
      readonly scopeId: string;
      readonly status?: FeedbackTriageQueueStatus;
      readonly cursor?: string;
      readonly limit: number;
    }>,
  ) => Promise<FeedbackTriageQueueState>;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const cursorPattern = /^[A-Za-z0-9_-]{1,512}$/u;
const queueStatuses: readonly FeedbackTriageQueueStatus[] = [
  "NOVO",
  "TRIADO",
  "EM_TRATAMENTO",
  "AGUARDA_USUARIO",
  "RESOLVIDO",
  "DUPLICADO",
  "NAO_REPRODUZIDO",
  "NAO_PLANEJADO",
];
const queuePriorities: readonly FeedbackTriageQueuePriority[] = [
  "BAIXA",
  "NORMAL",
  "ALTA",
  "URGENTE",
];

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function assertUuid(value: string, field: string): void {
  if (!uuidPattern.test(value)) {
    throw new ApplicationError("validation_error", `${field} is invalid`);
  }
}

function normalizeQuery(query: FeedbackTriageQueueQuery): Readonly<{
  readonly scopeId: string;
  readonly status?: FeedbackTriageQueueStatus;
  readonly cursor?: string;
  readonly limit: number;
}> {
  assertNonEmpty(query.scopeId, "scopeId");
  assertUuid(query.scopeId, "scopeId");
  if (query.status !== undefined && !queueStatuses.includes(query.status)) {
    throw new ApplicationError("validation_error", "status is invalid");
  }
  if (query.cursor !== undefined && !cursorPattern.test(query.cursor)) {
    throw new ApplicationError("validation_error", "cursor is invalid");
  }
  const limit = query.limit ?? 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ApplicationError("validation_error", "limit is invalid");
  }
  return Object.freeze({
    scopeId: query.scopeId,
    ...(query.status === undefined ? {} : { status: query.status }),
    ...(query.cursor === undefined ? {} : { cursor: query.cursor }),
    limit,
  });
}

function freezeItem(item: FeedbackTriageQueueItem): FeedbackTriageQueueItem {
  return Object.freeze({ ...item });
}

function assertQueueState(
  state: FeedbackTriageQueueState,
  query: Readonly<{
    readonly scopeId: string;
    readonly status?: FeedbackTriageQueueStatus;
    readonly cursor?: string;
    readonly limit: number;
  }>,
): void {
  if (
    state.kind !== "feedback_triage_queue" ||
    state.scopeId !== query.scopeId ||
    state.filters.scopeId !== query.scopeId ||
    state.filters.status !== query.status ||
    state.filters.limit !== query.limit ||
    state.items.length > query.limit
  ) {
    throw new ApplicationError(
      "forbidden",
      "Feedback queue returned data outside the requested scope",
    );
  }
  if (
    typeof state.hasNext !== "boolean" ||
    (state.hasNext &&
      (state.nextCursor === undefined ||
        !cursorPattern.test(state.nextCursor))) ||
    (!state.hasNext && state.nextCursor !== undefined)
  ) {
    throw new ApplicationError(
      "internal_error",
      "Feedback queue returned invalid pagination metadata",
    );
  }
  const seen = new Set<string>();
  for (const item of state.items) {
    if (
      !uuidPattern.test(item.ticketId) ||
      seen.has(item.ticketId) ||
      !queueStatuses.includes(item.status) ||
      !queuePriorities.includes(item.priority) ||
      (item.assigneeId !== undefined && !uuidPattern.test(item.assigneeId)) ||
      typeof item.description !== "string" ||
      item.description.trim().length === 0 ||
      item.description.length > 10_000 ||
      /<[^>]*>/u.test(item.description) ||
      Number.isNaN(new Date(item.createdAt).getTime()) ||
      !Number.isInteger(item.version) ||
      item.version < 0
    ) {
      throw new ApplicationError(
        "internal_error",
        "Feedback queue returned an invalid item",
      );
    }
    seen.add(item.ticketId);
  }
}

export async function getFeedbackTriageQueue(
  command: GetFeedbackTriageQueueCommand,
  repository: FeedbackTriageQueueReadPort,
): Promise<FeedbackTriageQueueState> {
  assertNonEmpty(command.principalId, "principalId");
  const query = normalizeQuery(command.query);
  if (
    !canAccess({
      principalId: command.principalId,
      accountStatus: command.accountStatus,
      roles: command.roles,
      capability: "VIEW_FEEDBACK_QUEUE",
      resource: { scopeId: query.scopeId },
      scopes: command.scopes,
      ...(command.approvedClinicalApproverId === undefined
        ? {}
        : { approvedClinicalApproverId: command.approvedClinicalApproverId }),
    })
  ) {
    throw new ApplicationError("forbidden", "Feedback queue is not authorized");
  }

  let state: FeedbackTriageQueueState;
  try {
    state = await repository.listFeedbackTickets(query);
  } catch (error) {
    if (error instanceof FeedbackTriageQueueQueryError) {
      throw new ApplicationError(
        "validation_error",
        "Feedback queue cursor or query is invalid",
      );
    }
    throw error;
  }
  assertQueueState(state, query);
  return Object.freeze({
    ...state,
    filters: Object.freeze({ ...state.filters }),
    items: Object.freeze(state.items.map(freezeItem)),
  });
}
