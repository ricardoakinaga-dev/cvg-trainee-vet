import { and, asc, eq } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  FeedbackTicketHistoryEvent,
  FeedbackTicketHistoryReadPort,
  FeedbackTicketHistoryReadResult,
} from "@cvg/application";

import { feedbackTicketHistory, feedbackTickets } from "./schema.js";
import type * as schema from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;
const maxHistoryEvents = 100;
const statuses: readonly string[] = [
  "NOVO",
  "TRIADO",
  "EM_TRATAMENTO",
  "AGUARDA_USUARIO",
  "RESOLVIDO",
  "DUPLICADO",
  "NAO_REPRODUZIDO",
  "NAO_PLANEJADO",
];

export type FeedbackTicketHistoryRowShape = Readonly<{
  readonly id: string;
  readonly ticketId: string;
  readonly scopeId: string;
  readonly ticketVersion: number;
  readonly eventType: string;
  readonly fromStatus: string | null;
  readonly toStatus: string;
  readonly createdAt: Date;
}>;

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) throw new TypeError(`${field} is required`);
}

function assertStatus(value: string, field: string): void {
  if (!statuses.includes(value)) throw new TypeError(`${field} is invalid`);
}

function assertLimit(limit: number): void {
  if (!Number.isInteger(limit) || limit < 1 || limit > maxHistoryEvents) {
    throw new TypeError("limit must be between 1 and 100");
  }
}

export function feedbackTicketHistoryRowToEvent(
  row: FeedbackTicketHistoryRowShape,
): FeedbackTicketHistoryEvent {
  assertNonEmpty(row.id, "historyId");
  assertNonEmpty(row.ticketId, "ticketId");
  assertNonEmpty(row.scopeId, "scopeId");
  if (!Number.isInteger(row.ticketVersion) || row.ticketVersion < 0) {
    throw new TypeError("ticketVersion is invalid");
  }
  if (row.eventType !== "CRIADO" && row.eventType !== "STATUS_ALTERADO") {
    throw new TypeError("eventType is invalid");
  }
  assertStatus(row.toStatus, "toStatus");
  if (row.eventType === "CRIADO" && row.fromStatus !== null) {
    throw new TypeError("created history cannot have fromStatus");
  }
  if (row.eventType === "STATUS_ALTERADO" && row.fromStatus === null) {
    throw new TypeError("status history requires fromStatus");
  }
  if (row.fromStatus !== null) assertStatus(row.fromStatus, "fromStatus");
  if (Number.isNaN(row.createdAt.getTime())) {
    throw new TypeError("createdAt is invalid");
  }
  return Object.freeze({
    historyId: row.id,
    ticketId: row.ticketId,
    ticketVersion: row.ticketVersion,
    eventType: row.eventType,
    ...(row.fromStatus === null ? {} : { fromStatus: row.fromStatus }),
    toStatus: row.toStatus,
    createdAt: row.createdAt.toISOString(),
  }) as FeedbackTicketHistoryEvent;
}

export function createFeedbackTicketHistoryRepository(
  db: DatabaseExecutor,
): FeedbackTicketHistoryReadPort {
  return Object.freeze({
    getFeedbackTicketHistory: async (
      ticketId: string,
      scopeIds: readonly string[],
      limit: number,
    ): Promise<FeedbackTicketHistoryReadResult> => {
      assertNonEmpty(ticketId, "ticketId");
      if (scopeIds.length === 0 || scopeIds.length > maxHistoryEvents) {
        throw new TypeError("scopeIds are invalid");
      }
      scopeIds.forEach((scopeId) => assertNonEmpty(scopeId, "scopeId"));
      assertLimit(limit);

      return db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        for (const scopeId of [...new Set(scopeIds)]) {
          await setDatabaseSecurityContext(executor, { scopeId });
          const ticketRows = await executor
            .select({
              id: feedbackTickets.id,
              scopeId: feedbackTickets.scopeId,
            })
            .from(feedbackTickets)
            .where(
              and(
                eq(feedbackTickets.id, ticketId),
                eq(feedbackTickets.scopeId, scopeId),
              ),
            )
            .limit(1);
          if (ticketRows.length === 0) continue;

          const historyRows = await executor
            .select()
            .from(feedbackTicketHistory)
            .where(
              and(
                eq(feedbackTicketHistory.ticketId, ticketId),
                eq(feedbackTicketHistory.scopeId, scopeId),
              ),
            )
            .orderBy(
              asc(feedbackTicketHistory.ticketVersion),
              asc(feedbackTicketHistory.createdAt),
              asc(feedbackTicketHistory.id),
            )
            .limit(limit);
          return Object.freeze({
            ticketExists: true,
            scopeId,
            events: Object.freeze(
              historyRows.map((row) =>
                feedbackTicketHistoryRowToEvent(
                  row as FeedbackTicketHistoryRowShape,
                ),
              ),
            ),
          });
        }
        return Object.freeze({
          ticketExists: false,
          scopeId: "",
          events: Object.freeze([] as FeedbackTicketHistoryEvent[]),
        });
      });
    },
  });
}
