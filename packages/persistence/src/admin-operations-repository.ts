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

function buildAccountSignals(
  rows: readonly AdminAccountOperationalRow[],
  inactiveBefore: number,
) {
  return Object.freeze({
    invited: rows.filter((row) => row.status === "INVITED").length,
    active: rows.filter((row) => row.status === "ACTIVE").length,
    suspended: rows.filter((row) => row.status === "SUSPENDED").length,
    deactivated: rows.filter((row) => row.status === "DEACTIVATED").length,
    inactiveOver14Days: rows.filter(
      (row) =>
        participantAccount(row) &&
        (row.lastSeenAt === null || row.lastSeenAt.getTime() < inactiveBefore),
    ).length,
  });
}

function buildCorrectionSignals(
  rows: readonly AdminCorrectionRow[],
  now: Date,
) {
  const open = rows.filter((row) =>
    openCorrectionStatuses.includes(
      row.status as (typeof openCorrectionStatuses)[number],
    ),
  );
  const overdue = open.filter(
    (row) => row.dueAt.getTime() < now.getTime(),
  ).length;
  return Object.freeze({ open: open.length, overdue, slaBreaches: overdue });
}

function buildRemediationSignals(rows: readonly AdminRemediationRow[]) {
  return Object.freeze({
    participants: new Set(rows.map((row) => row.participantId)).size,
    objectives: unique(rows.flatMap((row) => row.objectiveIds)).length,
  });
}

function buildContentValiditySignals(
  rows: readonly AdminContentValidityRow[],
  now: Date,
) {
  const active = rows.filter(
    (row) => row.status !== "RETIRADO" && row.status !== "VENCIDO",
  );
  const expired = rows.filter(
    (row) =>
      row.status === "VENCIDO" ||
      (row.validUntil !== null && row.validUntil.getTime() <= now.getTime()),
  );
  const valid = active.filter(
    (row) =>
      row.validUntil === null || row.validUntil.getTime() > now.getTime(),
  );
  const dueForReview = rows.filter(
    (row) =>
      row.nextReviewAt !== null && row.nextReviewAt.getTime() <= now.getTime(),
  );
  return Object.freeze({
    valid: valid.length,
    dueForReview: dueForReview.length,
    expired: expired.length,
    withdrawn: rows.filter((row) => row.status === "RETIRADO").length,
  });
}

function buildFeedbackSignals(rows: readonly AdminFeedbackRow[]) {
  const open = rows.filter((row) =>
    openFeedbackStatuses.includes(
      row.status as (typeof openFeedbackStatuses)[number],
    ),
  );
  return Object.freeze({
    open: open.length,
    technicalFailures: open.filter((row) => row.type === "BUG_TECNICO").length,
  });
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

  return Object.freeze({
    accounts: buildAccountSignals(accountRows, inactiveBefore),
    corrections: buildCorrectionSignals(correctionRows, now),
    remediation: buildRemediationSignals(remediationRows),
    contentValidity: buildContentValiditySignals(contentRows, now),
    feedback: buildFeedbackSignals(feedbackRows),
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
  const accountsRows = await readAccountOperationalRows(tx, scopeId);
  const corrections = await readCorrectionRows(tx, scopeId);
  const remediation = await readRemediationRows(tx, scopeId);
  const content = await readContentRows(tx, scopeId);
  const feedback = await readFeedbackRows(tx, scopeId);
  return {
    accounts: accountsRows,
    corrections,
    remediation,
    content,
    feedback,
  };
}

async function readAccountOperationalRows(
  tx: DatabaseTransaction,
  scopeId: string,
): Promise<readonly AdminAccountOperationalRow[]> {
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
  return accountRows.map((row) => ({
    status: row.status,
    roles: Array.isArray(row.roles) ? [...row.roles] : [],
    lastSeenAt: lastSeenByAccount.get(row.accountId) ?? null,
  }));
}

async function readCorrectionRows(
  tx: DatabaseTransaction,
  scopeId: string,
): Promise<readonly AdminCorrectionRow[]> {
  return tx
    .select({ status: appeals.status, dueAt: appeals.dueAt })
    .from(appeals)
    .where(
      and(
        eq(appeals.scopeId, scopeId),
        inArray(appeals.status, openCorrectionStatuses),
      ),
    );
}

async function readRemediationRows(
  tx: DatabaseTransaction,
  scopeId: string,
): Promise<readonly AdminRemediationRow[]> {
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
  return [
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
  ];
}

async function readContentRows(
  tx: DatabaseTransaction,
  scopeId: string,
): Promise<readonly AdminContentValidityRow[]> {
  return tx
    .select({
      status: contentVersions.status,
      validUntil: contentVersions.validUntil,
      nextReviewAt: contentVersions.nextReviewAt,
    })
    .from(contentVersions)
    .where(eq(contentVersions.scopeId, scopeId));
}

async function readFeedbackRows(
  tx: DatabaseTransaction,
  scopeId: string,
): Promise<readonly AdminFeedbackRow[]> {
  return tx
    .select({ status: feedbackTickets.status, type: feedbackTickets.type })
    .from(feedbackTickets)
    .where(eq(feedbackTickets.scopeId, scopeId));
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
