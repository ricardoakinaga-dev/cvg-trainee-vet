import { and, eq, inArray, sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type {
  ModeratorAssignedParticipantSnapshot,
  ModeratorDashboardReadData,
  ModeratorQueueSnapshot,
} from "@cvg/application";

import { accounts, appeals, feedbackTickets } from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";
import type * as schema from "./schema.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;
type DatabaseTransaction = Parameters<
  Parameters<DatabaseExecutor["transaction"]>[0]
>[0];

type AssignedWorkKind = "CORRECTION" | "FEEDBACK";

export type ModeratorAssignedWorkRow = Readonly<{
  readonly participantId: string;
  readonly scopeId: string;
  readonly kind: AssignedWorkKind;
  readonly technicalFailure: boolean;
  readonly overdue: boolean;
}>;

export type ModeratorAssignedAccountRow = Readonly<{
  readonly participantId: string;
  readonly professionalEmail: string;
  readonly roles: readonly string[];
  readonly scopeIds: readonly string[];
}>;

const openFeedbackStatuses = [
  "NOVO",
  "TRIADO",
  "EM_TRATAMENTO",
  "AGUARDA_USUARIO",
] as const;
const openAppealStatuses = [
  "ABERTA",
  "EM_REVISAO",
  "RECALCULO_PENDENTE",
] as const;

function normalizeValues(values: readonly string[]): readonly string[] {
  return Object.freeze([
    ...new Set(values.map((value) => value.trim()).filter(Boolean)),
  ]);
}

function hasParticipantRole(roles: readonly string[]): boolean {
  return roles.includes("PARTICIPANT");
}

function queueId(kind: AssignedWorkKind, scopeId: string): string {
  return `${kind}:${scopeId}`;
}

type ParticipantWorkState = Readonly<{
  readonly scopeIds: readonly string[];
  readonly queueIds: readonly string[];
  readonly correctionPendingCount: number;
  readonly feedbackOpenCount: number;
  readonly technicalFailureCount: number;
}>;

type QueueWorkState = Readonly<{
  readonly scopeId: string;
  readonly kind: AssignedWorkKind;
  readonly openCount: number;
  readonly overdueCount: number;
}>;

function appendUnique(
  values: readonly string[],
  value: string,
): readonly string[] {
  return values.includes(value) ? values : [...values, value];
}

function indexParticipantAccounts(
  scopes: ReadonlySet<string>,
  accountRows: readonly ModeratorAssignedAccountRow[],
): ReadonlyMap<string, ModeratorAssignedAccountRow> {
  return new Map(
    accountRows
      .filter(
        (account) =>
          hasParticipantRole(account.roles) &&
          normalizeValues(account.scopeIds).some((scopeId) =>
            scopes.has(scopeId),
          ),
      )
      .map((account) => [account.participantId, account] as const),
  );
}

function accumulateParticipantWork(
  participantRows: ReadonlyMap<string, ParticipantWorkState>,
  row: ModeratorAssignedWorkRow,
): ReadonlyMap<string, ParticipantWorkState> {
  const existing = participantRows.get(row.participantId) ?? {
    scopeIds: [],
    queueIds: [],
    correctionPendingCount: 0,
    feedbackOpenCount: 0,
    technicalFailureCount: 0,
  };
  return new Map(participantRows).set(
    row.participantId,
    Object.freeze({
      scopeIds: appendUnique(existing.scopeIds, row.scopeId),
      queueIds: appendUnique(existing.queueIds, queueId(row.kind, row.scopeId)),
      correctionPendingCount:
        existing.correctionPendingCount + (row.kind === "CORRECTION" ? 1 : 0),
      feedbackOpenCount:
        existing.feedbackOpenCount + (row.kind === "FEEDBACK" ? 1 : 0),
      technicalFailureCount:
        existing.technicalFailureCount +
        (row.kind === "FEEDBACK" && row.technicalFailure ? 1 : 0),
    }),
  );
}

function accumulateQueueWork(
  queueRows: ReadonlyMap<string, QueueWorkState>,
  row: ModeratorAssignedWorkRow,
): ReadonlyMap<string, QueueWorkState> {
  const key = queueId(row.kind, row.scopeId);
  const existing = queueRows.get(key) ?? {
    scopeId: row.scopeId,
    kind: row.kind,
    openCount: 0,
    overdueCount: 0,
  };
  return new Map(queueRows).set(
    key,
    Object.freeze({
      ...existing,
      openCount: existing.openCount + 1,
      overdueCount: existing.overdueCount + (row.overdue ? 1 : 0),
    }),
  );
}

function aggregateAssignedWork(
  scopes: ReadonlySet<string>,
  accountsById: ReadonlyMap<string, ModeratorAssignedAccountRow>,
  workRows: readonly ModeratorAssignedWorkRow[],
): Readonly<{
  readonly participantRows: ReadonlyMap<string, ParticipantWorkState>;
  readonly queueRows: ReadonlyMap<string, QueueWorkState>;
}> {
  let participantRows: ReadonlyMap<string, ParticipantWorkState> = new Map();
  let queueRows: ReadonlyMap<string, QueueWorkState> = new Map();
  for (const row of workRows) {
    if (!scopes.has(row.scopeId) || !accountsById.has(row.participantId)) {
      continue;
    }
    participantRows = accumulateParticipantWork(participantRows, row);
    queueRows = accumulateQueueWork(queueRows, row);
  }
  return Object.freeze({ participantRows, queueRows });
}

function buildParticipantSnapshots(
  accountsById: ReadonlyMap<string, ModeratorAssignedAccountRow>,
  participantRows: ReadonlyMap<string, ParticipantWorkState>,
): readonly ModeratorAssignedParticipantSnapshot[] {
  return Object.freeze(
    [...participantRows.entries()]
      .map(([participantId, work]) => {
        const account = accountsById.get(participantId);
        if (account === undefined) return undefined;
        return Object.freeze({
          participantId,
          professionalEmail: account.professionalEmail,
          scopeIds: normalizeValues(work.scopeIds),
          assignedQueueIds: normalizeValues(work.queueIds),
          correctionPendingCount: work.correctionPendingCount,
          feedbackOpenCount: work.feedbackOpenCount,
          technicalFailureCount: work.technicalFailureCount,
        });
      })
      .filter(
        (value): value is ModeratorAssignedParticipantSnapshot =>
          value !== undefined,
      ),
  );
}

function buildQueueSnapshots(
  queueRows: ReadonlyMap<string, QueueWorkState>,
): readonly ModeratorQueueSnapshot[] {
  return Object.freeze(
    [...queueRows.values()]
      .map((queue) =>
        Object.freeze({
          queueId: queueId(queue.kind, queue.scopeId),
          scopeId: queue.scopeId,
          kind: queue.kind,
          openCount: queue.openCount,
          overdueCount: queue.overdueCount,
        }),
      )
      .sort((left, right) => left.queueId.localeCompare(right.queueId)),
  );
}

export function buildModeratorAssignedWork(
  _moderatorId: string,
  requestedScopeIds: readonly string[],
  workRows: readonly ModeratorAssignedWorkRow[],
  accountRows: readonly ModeratorAssignedAccountRow[],
): ModeratorDashboardReadData {
  const scopes = new Set(normalizeValues(requestedScopeIds));
  const accountsById = indexParticipantAccounts(scopes, accountRows);
  const { participantRows, queueRows } = aggregateAssignedWork(
    scopes,
    accountsById,
    workRows,
  );
  return Object.freeze({
    participants: buildParticipantSnapshots(accountsById, participantRows),
    queues: buildQueueSnapshots(queueRows),
  });
}

async function readAssignedRows(
  tx: DatabaseTransaction,
  moderatorId: string,
  scopeId: string,
  now: Date,
): Promise<readonly ModeratorAssignedWorkRow[]> {
  const feedbackRows = await tx
    .select({
      participantId: feedbackTickets.participantId,
      scopeId: feedbackTickets.scopeId,
      type: feedbackTickets.type,
    })
    .from(feedbackTickets)
    .where(
      and(
        eq(feedbackTickets.scopeId, scopeId),
        eq(feedbackTickets.assigneeId, moderatorId),
        inArray(feedbackTickets.status, openFeedbackStatuses),
      ),
    );
  const appealRows = await tx
    .select({
      participantId: appeals.participantId,
      scopeId: appeals.scopeId,
      dueAt: appeals.dueAt,
    })
    .from(appeals)
    .where(
      and(
        eq(appeals.scopeId, scopeId),
        eq(appeals.reviewerId, moderatorId),
        inArray(appeals.status, openAppealStatuses),
      ),
    );

  return Object.freeze([
    ...feedbackRows.map((row) =>
      Object.freeze({
        participantId: row.participantId,
        scopeId: row.scopeId,
        kind: "FEEDBACK" as const,
        technicalFailure: row.type === "BUG_TECNICO",
        overdue: false,
      }),
    ),
    ...appealRows.map((row) =>
      Object.freeze({
        participantId: row.participantId,
        scopeId: row.scopeId,
        kind: "CORRECTION" as const,
        technicalFailure: false,
        overdue: row.dueAt.getTime() < now.getTime(),
      }),
    ),
  ]);
}

async function readAccounts(
  tx: DatabaseTransaction,
  participantIds: readonly string[],
): Promise<readonly ModeratorAssignedAccountRow[]> {
  if (participantIds.length === 0) return Object.freeze([]);
  const rows = await tx
    .select({
      participantId: accounts.id,
      professionalEmail: accounts.professionalEmail,
      roles: accounts.roles,
      scopeIds: accounts.scopes,
    })
    .from(accounts)
    .where(inArray(accounts.id, participantIds));
  return Object.freeze(
    rows.map((row) =>
      Object.freeze({
        participantId: row.participantId,
        professionalEmail: row.professionalEmail,
        roles: Array.isArray(row.roles) ? [...row.roles] : [],
        scopeIds: Array.isArray(row.scopeIds) ? [...row.scopeIds] : [],
      }),
    ),
  );
}

export function createModeratorDashboardRepository(
  db: DatabaseExecutor,
): Readonly<{
  readonly listAssignedWork: (
    moderatorId: string,
    scopeIds: readonly string[],
  ) => Promise<ModeratorDashboardReadData>;
}> {
  return Object.freeze({
    listAssignedWork: async (moderatorId, scopeIds) => {
      const normalizedScopeIds = normalizeValues(scopeIds);
      if (moderatorId.trim().length === 0 || normalizedScopeIds.length === 0) {
        return Object.freeze({
          participants: Object.freeze([]),
          queues: Object.freeze([]),
        });
      }
      const now = new Date();
      const rowsByScope = await Promise.all(
        normalizedScopeIds.map(async (scopeId) =>
          db.transaction(async (tx) => {
            await setDatabaseSecurityContext(tx, { scopeId });
            await tx.execute(
              sql`select set_config('cvg.feedback_staff_read', 'true', true), set_config('cvg.moderator_read', 'true', true)`,
            );
            return readAssignedRows(tx, moderatorId, scopeId, now);
          }),
        ),
      );
      const workRows = rowsByScope.flat();
      const accountRows = await db.transaction(async (tx) => {
        await setDatabaseSecurityContext(tx, {
          scopeId: normalizedScopeIds[0]!,
        });
        await tx.execute(
          sql`select set_config('cvg.feedback_staff_read', 'true', true), set_config('cvg.moderator_read', 'true', true)`,
        );
        return readAccounts(tx, [
          ...new Set(workRows.map((row) => row.participantId)),
        ]);
      });
      return buildModeratorAssignedWork(
        moderatorId,
        normalizedScopeIds,
        workRows,
        accountRows,
      );
    },
  });
}
