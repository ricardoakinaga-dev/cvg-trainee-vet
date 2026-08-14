import { and, eq, inArray, sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type { AdminOperationsSignals } from "@cvg/application";

import {
  accounts,
  appeals,
  contentVersions,
  curriculumRuntimeStates,
  feedbackTickets,
  learningAssignments,
  sessions,
} from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";
import type * as schema from "./schema.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;
type DatabaseTransaction = Parameters<
  Parameters<DatabaseExecutor["transaction"]>[0]
>[0];

export type AdminAccountOperationalRow = Readonly<{
  readonly status: string;
  readonly roles: readonly string[];
  readonly lastSeenAt: Date | null;
}>;

export type AdminCorrectionRow = Readonly<{
  readonly status: string;
  readonly dueAt: Date;
}>;

export type AdminRemediationRow = Readonly<{
  readonly participantId: string;
  readonly objectiveIds: readonly string[];
}>;

export type AdminContentValidityRow = Readonly<{
  readonly status: string;
  readonly validUntil: Date | null;
  readonly nextReviewAt: Date | null;
}>;

export type AdminFeedbackRow = Readonly<{
  readonly status: string;
  readonly type: string;
}>;

const openCorrectionStatuses = [
  "ABERTA",
  "EM_REVISAO",
  "RECALCULO_PENDENTE",
] as const;
const openFeedbackStatuses = [
  "NOVO",
  "TRIADO",
  "EM_TRATAMENTO",
  "AGUARDA_USUARIO",
] as const;
const inactivityWindowMs = 14 * 24 * 60 * 60 * 1000;

function participantAccount(row: AdminAccountOperationalRow): boolean {
  return row.roles.includes("PARTICIPANT");
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function buildAdminOperationsSignals(
  accountRows: readonly AdminAccountOperationalRow[],
  correctionRows: readonly AdminCorrectionRow[],
  remediationRows: readonly AdminRemediationRow[],
  contentRows: readonly AdminContentValidityRow[],
  feedbackRows: readonly AdminFeedbackRow[],
  now: Date,
): AdminOperationsSignals {
  if (Number.isNaN(now.getTime())) throw new TypeError("now is invalid");
  const inactiveBefore = now.getTime() - inactivityWindowMs;
  const openCorrections = correctionRows.filter((row) =>
    openCorrectionStatuses.includes(
      row.status as (typeof openCorrectionStatuses)[number],
    ),
  );
  const openFeedback = feedbackRows.filter((row) =>
    openFeedbackStatuses.includes(
      row.status as (typeof openFeedbackStatuses)[number],
    ),
  );
  const activeContent = contentRows.filter(
    (row) => row.status !== "RETIRADO" && row.status !== "VENCIDO",
  );
  const expiredContent = contentRows.filter(
    (row) =>
      row.status === "VENCIDO" ||
      (row.validUntil !== null && row.validUntil.getTime() <= now.getTime()),
  );
  const validContent = activeContent.filter(
    (row) =>
      row.validUntil === null || row.validUntil.getTime() > now.getTime(),
  );
  const dueForReview = contentRows.filter(
    (row) =>
      row.nextReviewAt !== null && row.nextReviewAt.getTime() <= now.getTime(),
  );
  const remediationObjectives = unique(
    remediationRows.flatMap((row) => row.objectiveIds),
  );

  return Object.freeze({
    accounts: Object.freeze({
      invited: accountRows.filter((row) => row.status === "INVITED").length,
      active: accountRows.filter((row) => row.status === "ACTIVE").length,
      suspended: accountRows.filter((row) => row.status === "SUSPENDED").length,
      deactivated: accountRows.filter((row) => row.status === "DEACTIVATED")
        .length,
      inactiveOver14Days: accountRows.filter(
        (row) =>
          participantAccount(row) &&
          (row.lastSeenAt === null ||
            row.lastSeenAt.getTime() < inactiveBefore),
      ).length,
    }),
    corrections: Object.freeze({
      open: openCorrections.length,
      overdue: openCorrections.filter(
        (row) => row.dueAt.getTime() < now.getTime(),
      ).length,
      slaBreaches: openCorrections.filter(
        (row) => row.dueAt.getTime() < now.getTime(),
      ).length,
    }),
    remediation: Object.freeze({
      participants: new Set(remediationRows.map((row) => row.participantId))
        .size,
      objectives: remediationObjectives.length,
    }),
    contentValidity: Object.freeze({
      valid: validContent.length,
      dueForReview: dueForReview.length,
      expired: expiredContent.length,
      withdrawn: contentRows.filter((row) => row.status === "RETIRADO").length,
    }),
    feedback: Object.freeze({
      open: openFeedback.length,
      technicalFailures: openFeedback.filter(
        (row) => row.type === "BUG_TECNICO",
      ).length,
    }),
  });
}

async function readOperationalRows(
  tx: DatabaseTransaction,
  scopeId: string,
): Promise<{
  readonly accounts: readonly AdminAccountOperationalRow[];
  readonly corrections: readonly AdminCorrectionRow[];
  readonly remediation: readonly AdminRemediationRow[];
  readonly content: readonly AdminContentValidityRow[];
  readonly feedback: readonly AdminFeedbackRow[];
}> {
  const accountRows = await tx
    .select({
      accountId: accounts.id,
      status: accounts.status,
      roles: accounts.roles,
    })
    .from(accounts)
    .where(sql`${accounts.scopes} ? ${scopeId}`);
  const accountIds = accountRows.map((row) => row.accountId);
  const sessionRows =
    accountIds.length === 0
      ? []
      : await tx
          .select({
            accountId: sessions.accountId,
            lastSeenAt: sessions.lastSeenAt,
          })
          .from(sessions)
          .where(
            and(
              inArray(sessions.accountId, accountIds),
              sql`${sessions.revokedAt} is null`,
            ),
          );
  const lastSeenByAccount = new Map<string, Date>();
  for (const row of sessionRows) {
    const current = lastSeenByAccount.get(row.accountId);
    if (current === undefined || row.lastSeenAt > current) {
      lastSeenByAccount.set(row.accountId, row.lastSeenAt);
    }
  }
  const correctionRows = await tx
    .select({ status: appeals.status, dueAt: appeals.dueAt })
    .from(appeals)
    .where(
      and(
        eq(appeals.scopeId, scopeId),
        inArray(appeals.status, openCorrectionStatuses),
      ),
    );
  const assignmentRows = await tx
    .select({
      participantId: learningAssignments.participantId,
      moduleId: learningAssignments.moduleId,
    })
    .from(learningAssignments)
    .where(
      and(
        eq(learningAssignments.scopeId, scopeId),
        eq(learningAssignments.status, "EM_REFORCO"),
      ),
    );
  const runtimeRows = await tx
    .select({
      participantId: curriculumRuntimeStates.participantId,
      state: curriculumRuntimeStates.state,
    })
    .from(curriculumRuntimeStates)
    .where(eq(curriculumRuntimeStates.scopeId, scopeId));
  const contentRows = await tx
    .select({
      status: contentVersions.status,
      validUntil: contentVersions.validUntil,
      nextReviewAt: contentVersions.nextReviewAt,
    })
    .from(contentVersions)
    .where(eq(contentVersions.scopeId, scopeId));
  const feedbackRows = await tx
    .select({ status: feedbackTickets.status, type: feedbackTickets.type })
    .from(feedbackTickets)
    .where(eq(feedbackTickets.scopeId, scopeId));

  return {
    accounts: accountRows.map((row) => ({
      status: row.status,
      roles: Array.isArray(row.roles) ? [...row.roles] : [],
      lastSeenAt: lastSeenByAccount.get(row.accountId) ?? null,
    })),
    corrections: correctionRows,
    remediation: [
      ...assignmentRows.map((row) => ({
        participantId: row.participantId,
        objectiveIds: [row.moduleId],
      })),
      ...runtimeRows.map((row) => ({
        participantId: row.participantId,
        objectiveIds: Array.isArray(row.state.remediationObjectiveIds)
          ? [...row.state.remediationObjectiveIds]
          : [],
      })),
    ],
    content: contentRows,
    feedback: feedbackRows,
  };
}

export function createAdminOperationsRepository(
  db: DatabaseExecutor,
): Readonly<{
  readonly readSignals: (
    scopeIds: readonly string[],
    now: Date,
  ) => Promise<AdminOperationsSignals>;
}> {
  return Object.freeze({
    readSignals: async (scopeIds, now) => {
      const normalizedScopeIds = unique(scopeIds);
      const rows = await Promise.all(
        normalizedScopeIds.map((scopeId) =>
          db.transaction(async (tx) => {
            await setDatabaseSecurityContext(tx, { scopeId });
            await tx.execute(
              sql`select set_config('cvg.feedback_staff_read', 'true', true), set_config('cvg.moderator_read', 'true', true), set_config('cvg.admin_read', 'true', true)`,
            );
            return readOperationalRows(tx, scopeId);
          }),
        ),
      );
      return buildAdminOperationsSignals(
        rows.flatMap((row) => row.accounts),
        rows.flatMap((row) => row.corrections),
        rows.flatMap((row) => row.remediation),
        rows.flatMap((row) => row.content),
        rows.flatMap((row) => row.feedback),
        now,
      );
    },
  });
}
