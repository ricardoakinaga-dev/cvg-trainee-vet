import { and, desc, eq } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  feedbackTicketRowToState,
  type FeedbackTicketRowShape,
  type ScopedFeedbackTicket,
} from "./learning-state-repository.js";
import { feedbackTickets } from "./schema.js";
import type * as schema from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;
const MAX_FEEDBACK_TICKETS = 100;

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) throw new TypeError(`${field} is required`);
}

export type FeedbackTicketReadRepository = Readonly<{
  readonly listFeedbackTickets: (
    participantId: string,
    scopeIds: readonly string[],
  ) => Promise<readonly ScopedFeedbackTicket[]>;
}>;

export function createFeedbackTicketReadRepository(
  db: DatabaseExecutor,
): FeedbackTicketReadRepository {
  return Object.freeze({
    listFeedbackTickets: async (
      participantId: string,
      scopeIds: readonly string[],
    ): Promise<readonly ScopedFeedbackTicket[]> => {
      assertNonEmpty(participantId, "participantId");
      if (scopeIds.length > MAX_FEEDBACK_TICKETS) {
        throw new TypeError("scopeIds exceed the bounded limit");
      }
      const uniqueScopeIds = [...new Set(scopeIds)];
      uniqueScopeIds.forEach((scopeId) => assertNonEmpty(scopeId, "scopeId"));
      if (uniqueScopeIds.length === 0) return Object.freeze([]);

      return db.transaction(async (transaction) => {
        const result: ScopedFeedbackTicket[] = [];
        for (const scopeId of uniqueScopeIds) {
          await setDatabaseSecurityContext(transaction, {
            participantId,
            scopeId,
          });
          const rows = await transaction
            .select()
            .from(feedbackTickets)
            .where(
              and(
                eq(feedbackTickets.participantId, participantId),
                eq(feedbackTickets.scopeId, scopeId),
              ),
            )
            .orderBy(desc(feedbackTickets.createdAt), desc(feedbackTickets.id))
            .limit(MAX_FEEDBACK_TICKETS);
          result.push(
            ...rows.map((row) =>
              feedbackTicketRowToState(row as FeedbackTicketRowShape),
            ),
          );
        }
        return Object.freeze(
          result
            .sort((left, right) =>
              right.state.createdAt.localeCompare(left.state.createdAt),
            )
            .slice(0, MAX_FEEDBACK_TICKETS),
        );
      });
    },
  });
}
