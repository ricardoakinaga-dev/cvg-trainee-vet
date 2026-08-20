import { and, desc, eq, type SQL } from "drizzle-orm";
import type { FeedbackTicketState } from "@cvg/domain";
import {
  assertNonEmpty,
  feedbackTicketRowToState,
  feedbackTicketStateToRow,
} from "./learning-state-mappers.js";
import type {
  FeedbackTicketListContext,
  PersistenceContext,
  ScopedFeedbackTicket,
} from "./learning-state-repository.js";
import {
  conflict,
  type DatabaseExecutor,
  type DatabaseTransaction,
  withContext,
  withFeedbackStaffContext,
} from "./learning-state-repository-support.js";
import { feedbackTickets } from "./schema.js";

export type FeedbackTicketPersistence = Readonly<{
  readonly saveTicket: (
    context: PersistenceContext,
    state: FeedbackTicketState,
  ) => Promise<ScopedFeedbackTicket>;
  readonly findTicket: (
    context: PersistenceContext,
    ticketId: string,
  ) => Promise<ScopedFeedbackTicket | null>;
  readonly listFeedbackTickets: (
    context: FeedbackTicketListContext,
  ) => Promise<readonly ScopedFeedbackTicket[]>;
}>;

async function persistTicketRow(
  tx: DatabaseTransaction,
  row: ReturnType<typeof feedbackTicketStateToRow>,
  now: Date,
): Promise<void> {
  if (row.version === 0) {
    const inserted = await tx
      .insert(feedbackTickets)
      .values({ ...row, updatedAt: now })
      .onConflictDoNothing()
      .returning({ id: feedbackTickets.id });
    if (inserted.length === 0) conflict("feedback ticket already exists");
    return;
  }
  const updated = await tx
    .update(feedbackTickets)
    .set({ ...row, updatedAt: now })
    .where(
      and(
        eq(feedbackTickets.id, row.id),
        eq(feedbackTickets.participantId, row.participantId),
        eq(feedbackTickets.scopeId, row.scopeId),
        eq(feedbackTickets.version, row.version - 1),
      ),
    )
    .returning({ id: feedbackTickets.id });
  if (updated.length === 0) conflict("feedback ticket version changed");
}

async function readTicket(
  tx: DatabaseTransaction,
  ticketId: string,
): Promise<ScopedFeedbackTicket> {
  const rows = await tx
    .select()
    .from(feedbackTickets)
    .where(eq(feedbackTickets.id, ticketId))
    .limit(1);
  const saved = rows[0];
  if (saved === undefined) conflict("feedback ticket was not persisted");
  return feedbackTicketRowToState(saved);
}

async function saveTicket(
  db: DatabaseExecutor,
  context: PersistenceContext,
  state: FeedbackTicketState,
): Promise<ScopedFeedbackTicket> {
  return withContext(db, context, async (tx) => {
    const row = feedbackTicketStateToRow({ scopeId: context.scopeId, state });
    await persistTicketRow(tx, row, new Date());
    return readTicket(tx, row.id);
  });
}

async function findTicket(
  db: DatabaseExecutor,
  context: PersistenceContext,
  ticketId: string,
): Promise<ScopedFeedbackTicket | null> {
  return withContext(db, context, async (tx) => {
    const rows = await tx
      .select()
      .from(feedbackTickets)
      .where(
        and(
          eq(feedbackTickets.id, ticketId),
          eq(feedbackTickets.participantId, context.participantId),
          eq(feedbackTickets.scopeId, context.scopeId),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row === undefined ? null : feedbackTicketRowToState(row);
  });
}

async function listRows(
  tx: DatabaseTransaction,
  filters: readonly SQL<unknown>[],
): Promise<readonly ScopedFeedbackTicket[]> {
  const rows = await tx
    .select()
    .from(feedbackTickets)
    .where(and(...filters))
    .orderBy(desc(feedbackTickets.createdAt), desc(feedbackTickets.id))
    .limit(100);
  return Object.freeze(rows.map((row) => feedbackTicketRowToState(row)));
}

function ticketFilters(
  context: FeedbackTicketListContext,
  participantId?: string,
): SQL<unknown>[] {
  const filters: SQL<unknown>[] = [
    eq(feedbackTickets.scopeId, context.scopeId),
  ];
  if (participantId !== undefined)
    filters.push(eq(feedbackTickets.participantId, participantId));
  if (context.status !== undefined)
    filters.push(eq(feedbackTickets.status, context.status));
  if (context.priority !== undefined)
    filters.push(eq(feedbackTickets.priority, context.priority));
  return filters;
}

async function listParticipantTickets(
  db: DatabaseExecutor,
  context: FeedbackTicketListContext,
): Promise<readonly ScopedFeedbackTicket[]> {
  const participantId = context.participantId;
  assertNonEmpty(participantId, "participantId");
  return withContext(db, { participantId, scopeId: context.scopeId }, (tx) =>
    listRows(tx, ticketFilters(context, participantId)),
  );
}

async function listStaffTickets(
  db: DatabaseExecutor,
  context: FeedbackTicketListContext,
): Promise<readonly ScopedFeedbackTicket[]> {
  return withFeedbackStaffContext(db, context.scopeId, (tx) =>
    listRows(tx, ticketFilters(context)),
  );
}

async function listFeedbackTickets(
  db: DatabaseExecutor,
  context: FeedbackTicketListContext,
): Promise<readonly ScopedFeedbackTicket[]> {
  return context.audience === "PARTICIPANT"
    ? listParticipantTickets(db, context)
    : listStaffTickets(db, context);
}

export function createFeedbackTicketPersistence(
  db: DatabaseExecutor,
): FeedbackTicketPersistence {
  return {
    saveTicket: (context, state) => saveTicket(db, context, state),
    findTicket: (context, ticketId) => findTicket(db, context, ticketId),
    listFeedbackTickets: (context) => listFeedbackTickets(db, context),
  };
}
