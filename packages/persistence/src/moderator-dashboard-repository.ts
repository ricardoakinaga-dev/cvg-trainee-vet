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

export function buildModeratorAssignedWork(
  _moderatorId: string,
  requestedScopeIds: readonly string[],
  workRows: readonly ModeratorAssignedWorkRow[],
  accountRows: readonly ModeratorAssignedAccountRow[],
): ModeratorDashboardReadData {
  const scopes = new Set(normalizeValues(requestedScopeIds));
  const accountsById = new Map(
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
  const participantRows = new Map<
    string,
    {
      readonly scopeIds: Set<string>;
      readonly queueIds: Set<string>;
      correctionPendingCount: number;
      feedbackOpenCount: number;
      technicalFailureCount: number;
    }
  >();
  const queueRows = new Map<
    string,
    {
      readonly scopeId: string;
      readonly kind: AssignedWorkKind;
      openCount: number;
      overdueCount: number;
    }
  >();

  for (const row of workRows) {
    if (!scopes.has(row.scopeId)) continue;
    const account = accountsById.get(row.participantId);
    if (account === undefined) continue;
    const key = `${row.kind}:${row.scopeId}`;
    const existing = participantRows.get(row.participantId) ?? {
      scopeIds: new Set<string>(),
      queueIds: new Set<string>(),
      correctionPendingCount: 0,
      feedbackOpenCount: 0,
      technicalFailureCount: 0,
    };
    existing.scopeIds.add(row.scopeId);
    existing.queueIds.add(queueId(row.kind, row.scopeId));
    if (row.kind === "CORRECTION") existing.correctionPendingCount += 1;
    if (row.kind === "FEEDBACK") {
      existing.feedbackOpenCount += 1;
      if (row.technicalFailure) existing.technicalFailureCount += 1;
    }
    participantRows.set(row.participantId, existing);

    const queue = queueRows.get(key) ?? {
      scopeId: row.scopeId,
      kind: row.kind,
      openCount: 0,
      overdueCount: 0,
    };
    queue.openCount += 1;
    if (row.overdue) queue.overdueCount += 1;
    queueRows.set(key, queue);
  }

  const participants: readonly ModeratorAssignedParticipantSnapshot[] =
    Object.freeze(
      [...participantRows.entries()]
        .map(([participantId, work]) => {
          const account = accountsById.get(participantId);
          if (account === undefined) return undefined;
          return Object.freeze({
            participantId,
            professionalEmail: account.professionalEmail,
            scopeIds: normalizeValues([...work.scopeIds]),
            assignedQueueIds: normalizeValues([...work.queueIds]),
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
  const queues: readonly ModeratorQueueSnapshot[] = Object.freeze(
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

  return Object.freeze({ participants, queues });
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
