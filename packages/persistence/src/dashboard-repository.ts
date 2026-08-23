import { and, eq, sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type {
  DashboardNextAction,
  DashboardReadPort,
  DiagnosticResultState,
  ParticipantDiagnosticProfileItem,
  StaffDashboardParticipant,
  StaffDashboardState,
} from "@cvg/application";
import { deriveParticipantDiagnosticProfile } from "@cvg/application";
import type { AccountStatus } from "@cvg/application";

import { PersistenceMappingError } from "./attempt-repository.js";
import {
  accountInvitations,
  accounts,
  activityAssignments,
  assessmentWorkflows,
  attempts,
  contentVersions,
  curriculumRuntimeStates,
  diagnosticResults,
  feedbackTickets,
  learningActivities,
  learningAssignments,
  sessions,
} from "./schema.js";
import type * as schema from "./schema.js";
import { diagnosticResultRowToState } from "./diagnostic-result-repository.js";
import { setDatabaseSecurityContext } from "./security-context.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

export type DashboardRepositoryOptions = Readonly<{
  readonly now?: () => Date;
}>;

type MutableParticipant = {
  readonly participantId: string;
  readonly professionalEmail: string;
  readonly accountStatus: AccountStatus;
  readonly scopeIds: Set<string>;
  readonly lastSeenAt?: string;
  readonly assignedModuleIds: Set<string>;
  readonly completedModuleIds: Set<string>;
  readonly remediationModuleIds: Set<string>;
  readonly retentionReviewModuleIds: Set<string>;
  pendingCorrections: number;
  openFeedback: number;
  hasResumableActivity: boolean;
  hasAvailableActivity: boolean;
  diagnosticResults: DiagnosticResultState[];
};

const participantRoleJson = JSON.stringify(["PARTICIPANT"]);

function parseAccountStatus(value: string): AccountStatus {
  if (
    value !== "INVITED" &&
    value !== "ACTIVE" &&
    value !== "SUSPENDED" &&
    value !== "DEACTIVATED"
  ) {
    throw new PersistenceMappingError("dashboard account status is invalid");
  }
  return value;
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new PersistenceMappingError("dashboard timestamp is invalid");
  }
  return date.toISOString();
}

function countPercent(completed: number, total: number): number | null {
  if (total === 0) return null;
  return Math.round((completed / total) * 100);
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  if (ordered.length % 2 === 1) return ordered[middle] ?? null;
  const lower = ordered[middle - 1];
  const upper = ordered[middle];
  if (lower === undefined || upper === undefined) return null;
  return Math.round((lower + upper) / 2);
}

function nextActionForParticipant(
  participant: MutableParticipant,
): DashboardNextAction {
  if (participant.remediationModuleIds.size > 0) {
    return "EXECUTAR_REMEDIACAO";
  }
  if (participant.retentionReviewModuleIds.size > 0) {
    return "REVISAR_RETENCAO";
  }
  if (participant.pendingCorrections > 0) {
    return "AGUARDAR_CORRECAO_HUMANA";
  }
  if (participant.hasResumableActivity) return "RETOMAR_ATIVIDADE";
  if (participant.hasAvailableActivity) return "INICIAR_ATIVIDADE";
  return "CONSULTAR_PROXIMO_PASSO";
}

function toParticipant(
  participant: MutableParticipant,
): StaffDashboardParticipant {
  const assignedModules = participant.assignedModuleIds.size;
  const completedModules = participant.completedModuleIds.size;
  const diagnosticProfile:
    readonly ParticipantDiagnosticProfileItem[] | undefined =
    participant.diagnosticResults.length === 0
      ? undefined
      : deriveParticipantDiagnosticProfile(participant.diagnosticResults);
  return Object.freeze({
    participantId: participant.participantId,
    professionalEmail: participant.professionalEmail,
    accountStatus: participant.accountStatus,
    scopeIds: Object.freeze([...participant.scopeIds].sort()),
    ...(participant.lastSeenAt === undefined
      ? {}
      : { lastSeenAt: participant.lastSeenAt }),
    progress: Object.freeze({
      assignedModules,
      completedModules,
      progressPercent: countPercent(completedModules, assignedModules),
      remediationModules: participant.remediationModuleIds.size,
      retentionReviewsPending: participant.retentionReviewModuleIds.size,
    }),
    pendingCorrections: participant.pendingCorrections,
    openFeedback: participant.openFeedback,
    nextAction: nextActionForParticipant(participant),
    ...(diagnosticProfile === undefined ? {} : { diagnosticProfile }),
  });
}

function ensureParticipant(
  participants: Map<string, MutableParticipant>,
  participantId: string,
): MutableParticipant | undefined {
  return participants.get(participantId);
}

function addAssignmentRows(
  participants: Map<string, MutableParticipant>,
  rows: readonly Readonly<{
    readonly participantId: string;
    readonly moduleId: string;
    readonly status: string;
  }>[],
): void {
  for (const row of rows) {
    const participant = ensureParticipant(participants, row.participantId);
    if (participant === undefined) continue;
    participant.assignedModuleIds.add(row.moduleId);
    if (
      row.status === "CONCLUIDO" ||
      row.status === "CONCLUIDO_COM_RETENCAO_PENDENTE"
    ) {
      participant.completedModuleIds.add(row.moduleId);
    }
    if (row.status === "EM_REFORCO") {
      participant.remediationModuleIds.add(row.moduleId);
    }
    if (row.status === "CONCLUIDO_COM_RETENCAO_PENDENTE") {
      participant.retentionReviewModuleIds.add(row.moduleId);
    }
  }
}

function addActivityRows(
  participants: Map<string, MutableParticipant>,
  rows: readonly Readonly<{
    readonly participantId: string;
    readonly status: string;
  }>[],
): void {
  for (const row of rows) {
    const participant = ensureParticipant(participants, row.participantId);
    if (participant === undefined) continue;
    if (row.status === "EM_ANDAMENTO" || row.status === "PAUSADO") {
      participant.hasResumableActivity = true;
    }
    if (row.status === "ATRIBUIDO" || row.status === "DISPONIVEL") {
      participant.hasAvailableActivity = true;
    }
  }
}

function addAttemptRows(
  participants: Map<string, MutableParticipant>,
  rows: readonly Readonly<{
    readonly participantId: string;
    readonly status: string;
  }>[],
): void {
  for (const row of rows) {
    const participant = ensureParticipant(participants, row.participantId);
    if (participant === undefined) continue;
    if (
      row.status === "SUBMETIDA" ||
      row.status === "AGUARDA_CORRECAO_HUMANA"
    ) {
      participant.pendingCorrections += 1;
    }
  }
}

function addWorkflowRows(
  participants: Map<string, MutableParticipant>,
  rows: readonly Readonly<{
    readonly participantId: string;
    readonly status: string;
  }>[],
): void {
  for (const row of rows) {
    const participant = ensureParticipant(participants, row.participantId);
    if (
      participant !== undefined &&
      row.status === "RESULTADO_EM_PROCESSAMENTO"
    ) {
      participant.pendingCorrections += 1;
    }
  }
}

function addFeedbackRows(
  participants: Map<string, MutableParticipant>,
  rows: readonly Readonly<{
    readonly participantId: string;
    readonly status: string;
  }>[],
): void {
  const terminalStatuses = new Set([
    "RESOLVIDO",
    "DUPLICADO",
    "NAO_REPRODUZIDO",
    "NAO_PLANEJADO",
  ]);
  for (const row of rows) {
    const participant = ensureParticipant(participants, row.participantId);
    if (participant !== undefined && !terminalStatuses.has(row.status)) {
      participant.openFeedback += 1;
    }
  }
}

function addRuntimeRows(
  participants: Map<string, MutableParticipant>,
  rows: readonly Readonly<{
    readonly participantId: string;
    readonly moduleId: string;
    readonly state: unknown;
  }>[],
): void {
  for (const row of rows) {
    const participant = ensureParticipant(participants, row.participantId);
    if (
      participant === undefined ||
      row.state === null ||
      typeof row.state !== "object"
    ) {
      continue;
    }
    const state = row.state as {
      readonly remediationObjectiveIds?: unknown;
      readonly retentionReviews?: unknown;
    };
    if (
      Array.isArray(state.remediationObjectiveIds) &&
      state.remediationObjectiveIds.length > 0
    ) {
      participant.remediationModuleIds.add(row.moduleId);
    }
    if (
      Array.isArray(state.retentionReviews) &&
      state.retentionReviews.some(
        (review) =>
          review !== null &&
          typeof review === "object" &&
          (review as { readonly status?: unknown }).status === "PENDENTE",
      )
    ) {
      participant.retentionReviewModuleIds.add(row.moduleId);
    }
  }
}

function addDiagnosticRows(
  participants: Map<string, MutableParticipant>,
  rows: readonly (typeof diagnosticResults.$inferSelect)[],
): void {
  for (const row of rows) {
    const participant = ensureParticipant(participants, row.participantId);
    if (participant === undefined) continue;
    participant.diagnosticResults.push(
      diagnosticResultRowToState({
        id: row.id,
        participantId: row.participantId,
        scopeId: row.scopeId,
        diagnosticId: row.diagnosticId,
        diagnosticVersion: row.diagnosticVersion,
        result: row.result,
        completedAt: row.completedAt,
      }),
    );
  }
}

function createParticipantMap(
  rows: readonly Readonly<{
    readonly participantId: string;
    readonly professionalEmail: string;
    readonly accountStatus: string;
    readonly scopeId: string;
    readonly lastSeenAt: Date | string | null;
  }>[],
): Map<string, MutableParticipant> {
  const participants = new Map<string, MutableParticipant>();
  for (const row of rows) {
    const existing = participants.get(row.participantId);
    if (existing !== undefined) {
      existing.scopeIds.add(row.scopeId);
      continue;
    }
    const lastSeenAt = toIso(row.lastSeenAt);
    participants.set(row.participantId, {
      participantId: row.participantId,
      professionalEmail: row.professionalEmail,
      accountStatus: parseAccountStatus(row.accountStatus),
      scopeIds: new Set([row.scopeId]),
      ...(lastSeenAt === undefined ? {} : { lastSeenAt }),
      assignedModuleIds: new Set(),
      completedModuleIds: new Set(),
      remediationModuleIds: new Set(),
      retentionReviewModuleIds: new Set(),
      pendingCorrections: 0,
      openFeedback: 0,
      hasResumableActivity: false,
      hasAvailableActivity: false,
      diagnosticResults: [],
    });
  }
  return participants;
}

export function createDashboardReadRepository(
  db: DatabaseExecutor,
  options: DashboardRepositoryOptions = {},
): DashboardReadPort {
  const now = options.now ?? (() => new Date());
  return Object.freeze({
    findStaffDashboard: async (
      scopeIds: readonly string[],
    ): Promise<StaffDashboardState> => {
      const normalizedScopes = [
        ...new Set(
          scopeIds
            .map((scopeId) => scopeId.trim())
            .filter((scopeId) => scopeId.length > 0),
        ),
      ];
      if (normalizedScopes.length === 0) {
        throw new PersistenceMappingError("dashboard scope is required");
      }

      return db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        const memberRows: Array<{
          readonly participantId: string;
          readonly professionalEmail: string;
          readonly accountStatus: string;
          readonly scopeId: string;
          readonly lastSeenAt: Date | string | null;
        }> = [];

        for (const scopeId of normalizedScopes) {
          await setDatabaseSecurityContext(executor, { scopeId });
          const rows = await executor
            .select({
              participantId: accounts.id,
              professionalEmail: accounts.professionalEmail,
              accountStatus: accounts.status,
              lastSeenAt: sql<Date | null>`max(${sessions.lastSeenAt})`,
            })
            .from(accountInvitations)
            .innerJoin(accounts, eq(accountInvitations.accountId, accounts.id))
            .leftJoin(sessions, eq(sessions.accountId, accounts.id))
            .where(
              and(
                sql`${accountInvitations.roles} @> ${participantRoleJson}::jsonb`,
                sql`${accountInvitations.scopes} @> ${JSON.stringify([scopeId])}::jsonb`,
              ),
            )
            .groupBy(accounts.id, accounts.professionalEmail, accounts.status);
          memberRows.push(...rows.map((row) => ({ ...row, scopeId })));
        }

        const participants = createParticipantMap(memberRows);
        const contentCounts = new Map<string, number>();
        for (const scopeId of normalizedScopes) {
          await setDatabaseSecurityContext(executor, { scopeId });

          const assignmentRows = await executor
            .select({
              participantId: learningAssignments.participantId,
              moduleId: learningAssignments.moduleId,
              status: learningAssignments.status,
            })
            .from(learningAssignments)
            .where(eq(learningAssignments.scopeId, scopeId));
          addAssignmentRows(participants, assignmentRows);

          const activityRows = await executor
            .select({
              participantId: activityAssignments.participantId,
              status: activityAssignments.status,
            })
            .from(activityAssignments)
            .innerJoin(
              learningActivities,
              eq(activityAssignments.activityId, learningActivities.id),
            )
            .where(eq(learningActivities.scopeId, scopeId));
          addActivityRows(participants, activityRows);

          const attemptRows = await executor
            .select({
              participantId: attempts.participantId,
              status: attempts.status,
            })
            .from(attempts)
            .innerJoin(
              learningActivities,
              eq(attempts.activityId, learningActivities.id),
            )
            .where(eq(learningActivities.scopeId, scopeId));
          addAttemptRows(participants, attemptRows);

          const workflowRows = await executor
            .select({
              participantId: assessmentWorkflows.participantId,
              status: assessmentWorkflows.status,
            })
            .from(assessmentWorkflows)
            .where(eq(assessmentWorkflows.scopeId, scopeId));
          addWorkflowRows(participants, workflowRows);

          const feedbackRows = await executor
            .select({
              participantId: feedbackTickets.participantId,
              status: feedbackTickets.status,
            })
            .from(feedbackTickets)
            .where(eq(feedbackTickets.scopeId, scopeId));
          addFeedbackRows(participants, feedbackRows);

          const runtimeRows = await executor
            .select({
              participantId: curriculumRuntimeStates.participantId,
              moduleId: curriculumRuntimeStates.moduleId,
              state: curriculumRuntimeStates.state,
            })
            .from(curriculumRuntimeStates)
            .where(eq(curriculumRuntimeStates.scopeId, scopeId));
          addRuntimeRows(participants, runtimeRows);

          const diagnosticRows = await executor
            .select()
            .from(diagnosticResults)
            .where(eq(diagnosticResults.scopeId, scopeId));
          addDiagnosticRows(participants, diagnosticRows);

          const contentRows = await executor
            .select({ status: contentVersions.status })
            .from(contentVersions)
            .where(eq(contentVersions.scopeId, scopeId));
          for (const row of contentRows) {
            contentCounts.set(
              row.status,
              (contentCounts.get(row.status) ?? 0) + 1,
            );
          }
        }

        const participantRows = [...participants.values()]
          .map(toParticipant)
          .sort((left, right) =>
            left.professionalEmail.localeCompare(right.professionalEmail),
          );
        const assignedModules = participantRows.reduce(
          (total, participant) => total + participant.progress.assignedModules,
          0,
        );
        const completedModules = participantRows.reduce(
          (total, participant) => total + participant.progress.completedModules,
          0,
        );
        const progressValues = participantRows.flatMap((participant) =>
          participant.progress.progressPercent === null
            ? []
            : [participant.progress.progressPercent],
        );
        const nowValue = now();
        const inactiveBefore = nowValue.getTime() - 14 * 24 * 60 * 60 * 1000;
        const inactiveParticipants = participantRows.filter(
          (participant) =>
            participant.accountStatus === "ACTIVE" &&
            (participant.lastSeenAt === undefined ||
              new Date(participant.lastSeenAt).getTime() < inactiveBefore),
        ).length;

        return Object.freeze({
          scopes: Object.freeze(normalizedScopes),
          generatedAt: nowValue.toISOString(),
          metrics: Object.freeze({
            invitedParticipants: participantRows.filter(
              (participant) => participant.accountStatus === "INVITED",
            ).length,
            activeParticipants: participantRows.filter(
              (participant) => participant.accountStatus === "ACTIVE",
            ).length,
            inactiveParticipants,
            assignedModules,
            completedModules,
            completionRatePercent: countPercent(
              completedModules,
              assignedModules,
            ),
            medianProgressPercent: median(progressValues),
            pendingCorrections: participantRows.reduce(
              (total, participant) => total + participant.pendingCorrections,
              0,
            ),
            remediationParticipants: participantRows.filter(
              (participant) => participant.progress.remediationModules > 0,
            ).length,
            retentionReviewsPending: participantRows.reduce(
              (total, participant) =>
                total + participant.progress.retentionReviewsPending,
              0,
            ),
            openFeedback: participantRows.reduce(
              (total, participant) => total + participant.openFeedback,
              0,
            ),
            content: Object.freeze({
              published: contentCounts.get("PUBLICADO") ?? 0,
              inReview:
                (contentCounts.get("EM_REVISAO_CLINICA") ?? 0) +
                (contentCounts.get("AJUSTES_SOLICITADOS") ?? 0),
              expired: contentCounts.get("VENCIDO") ?? 0,
              withdrawn: contentCounts.get("RETIRADO") ?? 0,
            }),
          }),
          participants: Object.freeze(participantRows),
        });
      });
    },
  });
}
