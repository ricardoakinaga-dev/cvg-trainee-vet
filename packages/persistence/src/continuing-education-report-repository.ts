import { and, eq, sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { curriculumV3 } from "@cvg/curriculum";
import type {
  ContinuingEducationReportReadPort,
  ContinuingEducationReportState,
  ContinuingEducationReportQuery,
} from "@cvg/application";

import { PersistenceMappingError } from "./attempt-repository.js";
import {
  accountInvitations,
  accounts,
  learningAssignments,
  sessions,
} from "./schema.js";
import type * as schema from "./schema.js";
import { setDatabaseSecurityContext } from "./security-context.js";

type DatabaseExecutor = PostgresJsDatabase<typeof schema>;

export type ContinuingEducationReportRepositoryOptions = Readonly<{
  readonly now?: () => Date;
}>;

type AccountStatus = "INVITED" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

type MutableParticipant = {
  readonly participantId: string;
  readonly professionalEmail: string;
  readonly accountStatus: AccountStatus;
  readonly lastSeenAt?: string;
  readonly assignedModuleIds: Set<string>;
  readonly completedModuleIds: Set<string>;
};

type ModuleAccumulator = {
  readonly assignedParticipants: Set<string>;
  readonly completedParticipants: Set<string>;
};

const participantRoleJson = JSON.stringify(["PARTICIPANT"]);
const completedStatuses = new Set([
  "CONCLUIDO",
  "CONCLUIDO_COM_RETENCAO_PENDENTE",
]);
const assignedStatuses = new Set([
  "ATRIBUIDO",
  "DISPONIVEL",
  "EM_ANDAMENTO",
  "CONCLUIDO",
  "EM_REFORCO",
  "CONCLUIDO_COM_RETENCAO_PENDENTE",
  "PAUSADO",
  "BLOQUEADO",
]);

function toIso(value: Date | string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new PersistenceMappingError(
      "continuing education timestamp is invalid",
    );
  }
  return date.toISOString();
}

function percent(completed: number, total: number): number | null {
  if (total === 0) return null;
  return Math.round((completed / total) * 100);
}

function hours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

function moduleFromCatalog(moduleId: string) {
  const module = curriculumV3.modules.find(
    (candidate) => candidate.id === moduleId,
  );
  if (module === undefined) {
    throw new PersistenceMappingError("continuing education module is invalid");
  }
  return module;
}

function createParticipants(
  rows: readonly Readonly<{
    readonly participantId: string;
    readonly professionalEmail: string;
    readonly accountStatus: string;
    readonly lastSeenAt: Date | string | null;
  }>[],
  accountStatus: AccountStatus | undefined,
): Map<string, MutableParticipant> {
  const participants = new Map<string, MutableParticipant>();
  for (const row of rows) {
    if (
      row.accountStatus !== "INVITED" &&
      row.accountStatus !== "ACTIVE" &&
      row.accountStatus !== "SUSPENDED" &&
      row.accountStatus !== "DEACTIVATED"
    ) {
      throw new PersistenceMappingError(
        "continuing education account status is invalid",
      );
    }
    if (accountStatus !== undefined && row.accountStatus !== accountStatus) {
      continue;
    }
    if (participants.has(row.participantId)) continue;
    const lastSeenAt = toIso(row.lastSeenAt);
    participants.set(row.participantId, {
      participantId: row.participantId,
      professionalEmail: row.professionalEmail,
      accountStatus: row.accountStatus,
      ...(lastSeenAt === undefined ? {} : { lastSeenAt }),
      assignedModuleIds: new Set(),
      completedModuleIds: new Set(),
    });
  }
  return participants;
}

export function createContinuingEducationReportRepository(
  db: DatabaseExecutor,
  options: ContinuingEducationReportRepositoryOptions = {},
): ContinuingEducationReportReadPort {
  const now = options.now ?? (() => new Date());
  return Object.freeze({
    findContinuingEducationReport: async (
      query: ContinuingEducationReportQuery,
    ): Promise<ContinuingEducationReportState> => {
      const scopeId = query.scopeId.trim();
      if (scopeId.length === 0) {
        throw new PersistenceMappingError(
          "continuing education scope is required",
        );
      }

      return db.transaction(async (transaction) => {
        const executor = transaction as unknown as DatabaseExecutor;
        await setDatabaseSecurityContext(executor, { scopeId });
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 25;

        const memberRows = await executor
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
              ...(query.accountStatus === undefined
                ? []
                : [eq(accounts.status, query.accountStatus)]),
            ),
          )
          .groupBy(accounts.id, accounts.professionalEmail, accounts.status);

        const participants = createParticipants(
          memberRows,
          query.accountStatus,
        );
        const assignmentRows = await executor
          .select({
            participantId: learningAssignments.participantId,
            moduleId: learningAssignments.moduleId,
            status: learningAssignments.status,
          })
          .from(learningAssignments)
          .where(
            and(
              eq(learningAssignments.scopeId, scopeId),
              ...(query.moduleId === undefined
                ? []
                : [eq(learningAssignments.moduleId, query.moduleId)]),
            ),
          );

        const moduleAccumulators = new Map<string, ModuleAccumulator>();
        for (const row of assignmentRows) {
          if (query.moduleId !== undefined && row.moduleId !== query.moduleId) {
            continue;
          }
          const participant = participants.get(row.participantId);
          if (participant === undefined) continue;
          moduleFromCatalog(row.moduleId);
          const accumulator = moduleAccumulators.get(row.moduleId) ?? {
            assignedParticipants: new Set<string>(),
            completedParticipants: new Set<string>(),
          };
          moduleAccumulators.set(row.moduleId, accumulator);
          if (assignedStatuses.has(row.status)) {
            participant.assignedModuleIds.add(row.moduleId);
            accumulator.assignedParticipants.add(row.participantId);
          }
          if (completedStatuses.has(row.status)) {
            participant.completedModuleIds.add(row.moduleId);
            accumulator.completedParticipants.add(row.participantId);
          }
        }

        const participantRows = [...participants.values()]
          .map((participant) => {
            const completedDigitalMinutes = [...participant.completedModuleIds]
              .map((moduleId) => moduleFromCatalog(moduleId).minutes)
              .reduce((total, minutes) => total + minutes, 0);
            const assignedModules = participant.assignedModuleIds.size;
            const completedModules = participant.completedModuleIds.size;
            return Object.freeze({
              participantId: participant.participantId,
              professionalEmail: participant.professionalEmail,
              accountStatus: participant.accountStatus,
              assignedModules,
              completedModules,
              progressPercent: percent(completedModules, assignedModules),
              completedDigitalMinutes,
              completedDigitalHours: hours(completedDigitalMinutes),
              ...(participant.lastSeenAt === undefined
                ? {}
                : { lastSeenAt: participant.lastSeenAt }),
            });
          })
          .sort((left, right) =>
            left.professionalEmail.localeCompare(right.professionalEmail),
          );

        const moduleRows = [...moduleAccumulators.entries()]
          .map(([moduleId, accumulator]) => {
            const module = moduleFromCatalog(moduleId);
            const assignedParticipants = accumulator.assignedParticipants.size;
            const completedParticipants =
              accumulator.completedParticipants.size;
            return Object.freeze({
              moduleId,
              month: module.month,
              scheduledMinutes: module.minutes,
              assignedParticipants,
              completedParticipants,
              completionRatePercent: percent(
                completedParticipants,
                assignedParticipants,
              ),
            });
          })
          .sort((left, right) => left.month - right.month);

        const assignedModules = participantRows.reduce(
          (total, participant) => total + participant.assignedModules,
          0,
        );
        const completedModules = participantRows.reduce(
          (total, participant) => total + participant.completedModules,
          0,
        );
        const completedDigitalMinutes = participantRows.reduce(
          (total, participant) => total + participant.completedDigitalMinutes,
          0,
        );
        const totalParticipants = participantRows.length;
        const totalPages = Math.ceil(totalParticipants / pageSize);
        const start = (page - 1) * pageSize;
        const pagedParticipants = participantRows.slice(
          start,
          start + pageSize,
        );

        return Object.freeze({
          kind: "continuing_education_report" as const,
          scopeId,
          generatedAt: now().toISOString(),
          filters: Object.freeze({
            scopeId,
            ...(query.moduleId === undefined
              ? {}
              : { moduleId: query.moduleId }),
            ...(query.accountStatus === undefined
              ? {}
              : { accountStatus: query.accountStatus }),
          }),
          summary: Object.freeze({
            participantCount: participantRows.length,
            invitedParticipants: participantRows.filter(
              (participant) => participant.accountStatus === "INVITED",
            ).length,
            activeParticipants: participantRows.filter(
              (participant) => participant.accountStatus === "ACTIVE",
            ).length,
            suspendedParticipants: participantRows.filter(
              (participant) => participant.accountStatus === "SUSPENDED",
            ).length,
            deactivatedParticipants: participantRows.filter(
              (participant) => participant.accountStatus === "DEACTIVATED",
            ).length,
            assignedModules,
            completedModules,
            completionRatePercent: percent(completedModules, assignedModules),
            completedDigitalMinutes,
            completedDigitalHours: hours(completedDigitalMinutes),
          }),
          participants: Object.freeze(pagedParticipants),
          modules: Object.freeze(moduleRows),
          pagination: Object.freeze({
            page,
            pageSize,
            totalParticipants,
            totalPages,
            hasNextPage: page < totalPages,
          }),
          learningEvidence: "ATIVIDADE_MODULAR_DIGITAL" as const,
          hoursClaim: "NAO_CREDENCIADAS" as const,
          practicalCompetenceClaim: "PROIBIDO_MVP" as const,
        });
      });
    },
  });
}
