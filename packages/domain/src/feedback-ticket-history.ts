import { isValidIsoTimestamp } from "./timestamp.js";
import { LearningAssignmentDomainError } from "./learning-state-error.js";
import type {
  FeedbackTicketHistoryEntry,
  FeedbackTicketState,
  FeedbackTicketStatus,
} from "./learning-state.js";

function freeze<T>(value: T): Readonly<T> {
  return Object.freeze(value);
}

function assertNonEmpty(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new LearningAssignmentDomainError(`${field} must not be empty`);
  }
}

const feedbackTicketStatuses: ReadonlySet<FeedbackTicketStatus> = new Set([
  "NOVO",
  "TRIADO",
  "EM_TRATAMENTO",
  "AGUARDA_USUARIO",
  "RESOLVIDO",
  "DUPLICADO",
  "NAO_REPRODUZIDO",
  "NAO_PLANEJADO",
]);

export function normalizeFeedbackTicketHistory(
  state: FeedbackTicketState,
): readonly FeedbackTicketHistoryEntry[] {
  const history =
    state.history ??
    ([{ status: state.status, changedAt: state.createdAt }] as const);
  if (history.length === 0 || history.length > 100) {
    throw new LearningAssignmentDomainError(
      "feedback ticket history must contain between 1 and 100 entries",
    );
  }
  return freeze(
    history.map((entry) => {
      if (!feedbackTicketStatuses.has(entry.status)) {
        throw new LearningAssignmentDomainError(
          "feedback ticket history status is not supported",
        );
      }
      if (!isValidIsoTimestamp(entry.changedAt)) {
        throw new LearningAssignmentDomainError(
          "feedback ticket history changedAt must be a valid timestamp",
        );
      }
      if (entry.actorId !== undefined) assertNonEmpty(entry.actorId, "actorId");
      return freeze({
        status: entry.status,
        changedAt: entry.changedAt,
        ...(entry.actorId === undefined ? {} : { actorId: entry.actorId }),
      });
    }),
  );
}
