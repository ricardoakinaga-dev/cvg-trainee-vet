import { and, desc, eq } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  FeedbackTriageQueueReadPort,
  FeedbackTriageQueueStatus,
  FeedbackTriageQueueState,
} from "@cvg/application";

import {
  feedbackTicketRowToState,
  type FeedbackTicketRowShape,
} from "./learning-state-repository.js";
import { feedbackTickets } from "./schema.js";
import type * as schema from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

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

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export type FeedbackTriageQueueRepository = FeedbackTriageQueueReadPort &
  Readonly<{
    readonly findFeedbackTicketParticipant: (
      ticketId: string,
      scopeId: string,
    ) => Promise<string | null>;
  }>;

function assertQuery(
  query: Parameters<FeedbackTriageQueueReadPort["listFeedbackTickets"]>[0],
): void {
  if (query.scopeId.trim().length === 0) {
    throw new TypeError("scopeId is required");
  }
  if (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > 100) {
    throw new TypeError("limit is invalid");
  }
  if (query.status !== undefined && !queueStatuses.includes(query.status)) {
    throw new TypeError("status is invalid");
  }
}

function assertUuid(value: string, field: string): void {
  if (!uuidPattern.test(value)) throw new TypeError(`${field} is invalid`);
}

export function createFeedbackTriageQueueRepository(
  db: DatabaseExecutor,
  options: Readonly<{ readonly now?: () => Date }> = {},
): FeedbackTriageQueueRepository {
  const now = options.now ?? (() => new Date());
  return Object.freeze({
    listFeedbackTickets: async (
      query: Parameters<FeedbackTriageQueueReadPort["listFeedbackTickets"]>[0],
    ): Promise<FeedbackTriageQueueState> => {
      assertQuery(query);
      return db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSecurityContext(executor, { scopeId: query.scopeId });
        const rows = await executor
          .select()
          .from(feedbackTickets)
          .where(
            and(
              eq(feedbackTickets.scopeId, query.scopeId),
              ...(query.status === undefined
                ? []
                : [eq(feedbackTickets.status, query.status)]),
            ),
          )
          .orderBy(desc(feedbackTickets.createdAt), desc(feedbackTickets.id))
          .limit(query.limit);
        const items = rows.map((row) => {
          const scoped = feedbackTicketRowToState(
            row as FeedbackTicketRowShape,
          );
          return Object.freeze({
            ticketId: scoped.state.ticketId,
            type: scoped.state.type,
            description: scoped.state.description,
            createdAt: scoped.state.createdAt,
            status: scoped.state.status,
            version: scoped.state.version,
          });
        });
        const generatedAt = now();
        if (Number.isNaN(generatedAt.getTime())) {
          throw new TypeError("generatedAt is invalid");
        }
        return Object.freeze({
          kind: "feedback_triage_queue" as const,
          scopeId: query.scopeId,
          generatedAt: generatedAt.toISOString(),
          filters: Object.freeze({
            scopeId: query.scopeId,
            ...(query.status === undefined ? {} : { status: query.status }),
            limit: query.limit,
          }),
          items: Object.freeze(items),
        });
      });
    },
    findFeedbackTicketParticipant: async (
      ticketId: string,
      scopeId: string,
    ): Promise<string | null> => {
      assertUuid(ticketId, "ticketId");
      assertUuid(scopeId, "scopeId");
      return db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSecurityContext(executor, { scopeId });
        const rows = await executor
          .select({ participantId: feedbackTickets.participantId })
          .from(feedbackTickets)
          .where(
            and(
              eq(feedbackTickets.id, ticketId),
              eq(feedbackTickets.scopeId, scopeId),
            ),
          )
          .limit(1);
        return rows[0]?.participantId ?? null;
      });
    },
  });
}
