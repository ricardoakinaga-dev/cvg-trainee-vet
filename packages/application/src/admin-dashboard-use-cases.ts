import { curriculumV3 } from "@cvg/curriculum";

import type { AccountStatus } from "./authorization.js";
import { buildParticipantDashboard } from "./dashboard-use-cases.js";
import type {
  ParticipantDashboardModule,
  ParticipantDashboardModuleStatus,
} from "./dashboard-use-cases.js";
import type { ParticipantLearningJourneyState } from "./journey-use-cases.js";

export type AdminDashboardParticipantAccount = Readonly<{
  readonly participantId: string;
  readonly professionalEmail: string;
  readonly accountStatus: AccountStatus;
  readonly scopeIds: readonly string[];
}>;

export type AdminDashboardParticipantSnapshot =
  AdminDashboardParticipantAccount &
    Readonly<{
      readonly journey: ParticipantLearningJourneyState;
    }>;

export type AdminDashboardSummary = Readonly<{
  readonly participantsTotal: number;
  readonly activeParticipants: number;
  readonly invitedParticipants: number;
  readonly participantsInProgress: number;
  readonly averageProgressPercent: number;
  readonly assignedModules: number;
  readonly completedModules: number;
}>;

export type AdminDashboardParticipant = Readonly<{
  readonly participantId: string;
  readonly professionalEmail: string;
  readonly accountStatus: AccountStatus;
  readonly scopeIds: readonly string[];
  readonly assignedModules: number;
  readonly completedModules: number;
  readonly progressPercent: number;
  readonly activeModuleId?: string;
  readonly activeModuleTitle?: string;
  readonly nextAction: string;
}>;

export type AdminDashboardTrainingModule = Readonly<{
  readonly moduleId: string;
  readonly month: number;
  readonly title: string;
  readonly competence: string;
  readonly assignedParticipants: number;
  readonly activeParticipants: number;
  readonly completedParticipants: number;
}>;

export type AdminDashboard = Readonly<{
  readonly curriculumId: string;
  readonly curriculumVersion: string;
  readonly summary: AdminDashboardSummary;
  readonly participants: readonly AdminDashboardParticipant[];
  readonly trainingCatalog: readonly AdminDashboardTrainingModule[];
}>;

export interface AdminDashboardReadDependencies {
  readonly listParticipants: (
    scopeIds: readonly string[],
  ) => Promise<readonly AdminDashboardParticipantAccount[]>;
  readonly getParticipantLearningJourney: (
    participantId: string,
    scopeIds: readonly string[],
  ) => Promise<ParticipantLearningJourneyState>;
}

const activeModuleStatuses: readonly ParticipantDashboardModuleStatus[] = [
  "DISPONIVEL",
  "EM_ANDAMENTO",
  "EM_REMEDIACAO",
];

function normalizeScopeIds(scopeIds: readonly string[]): readonly string[] {
  return Object.freeze([
    ...new Set(
      scopeIds
        .map((scopeId) => scopeId.trim())
        .filter((scopeId) => scopeId.length > 0),
    ),
  ]);
}

function activeModule(
  dashboard: ReturnType<typeof buildParticipantDashboard>,
  assignedModuleIds: ReadonlySet<string>,
): ParticipantDashboardModule | undefined {
  const moduleId = dashboard.activeModuleId;
  if (moduleId === undefined || !assignedModuleIds.has(moduleId)) {
    return undefined;
  }
  return dashboard.roadmap.find((module) => module.moduleId === moduleId);
}

function participantProjection(
  snapshot: AdminDashboardParticipantSnapshot,
): Readonly<{
  readonly participant: AdminDashboardParticipant;
  readonly dashboard: ReturnType<typeof buildParticipantDashboard>;
  readonly assignedModuleIds: ReadonlySet<string>;
}> {
  const dashboard = buildParticipantDashboard(snapshot.journey);
  const assignedModuleIds = new Set(
    snapshot.journey.assignments
      .filter(({ state }) => state.status !== "NAO_ATRIBUIDO")
      .map(({ state }) => state.moduleId),
  );
  const assignedModules = assignedModuleIds.size;
  const active =
    snapshot.accountStatus === "ACTIVE"
      ? activeModule(dashboard, assignedModuleIds)
      : undefined;

  return Object.freeze({
    participant: Object.freeze({
      participantId: snapshot.participantId,
      professionalEmail: snapshot.professionalEmail,
      accountStatus: snapshot.accountStatus,
      scopeIds: Object.freeze([...snapshot.scopeIds]),
      assignedModules,
      completedModules: dashboard.completedModules,
      progressPercent: dashboard.progressPercent,
      ...(active === undefined
        ? {}
        : {
            activeModuleId: active.moduleId,
            activeModuleTitle: active.title,
          }),
      nextAction: snapshot.journey.nextAction ?? dashboard.nextAction,
    }),
    dashboard,
    assignedModuleIds,
  });
}

function isInProgress(participant: AdminDashboardParticipant): boolean {
  return (
    participant.accountStatus === "ACTIVE" &&
    participant.assignedModules > participant.completedModules
  );
}

function isActiveCatalogStatus(
  status: ParticipantDashboardModuleStatus,
): boolean {
  return activeModuleStatuses.includes(status);
}

export function buildAdminDashboard(
  snapshots: readonly AdminDashboardParticipantSnapshot[],
): AdminDashboard {
  const projected = snapshots
    .map(participantProjection)
    .sort((left, right) =>
      left.participant.professionalEmail.localeCompare(
        right.participant.professionalEmail,
      ),
    );
  const participants = Object.freeze(
    projected.map(({ participant }) => participant),
  );
  const progressTotal = participants.reduce(
    (total, participant) => total + participant.progressPercent,
    0,
  );
  const summary = Object.freeze({
    participantsTotal: participants.length,
    activeParticipants: participants.filter(
      ({ accountStatus }) => accountStatus === "ACTIVE",
    ).length,
    invitedParticipants: participants.filter(
      ({ accountStatus }) => accountStatus === "INVITED",
    ).length,
    participantsInProgress: participants.filter(isInProgress).length,
    averageProgressPercent:
      participants.length === 0
        ? 0
        : Math.round(progressTotal / participants.length),
    assignedModules: participants.reduce(
      (total, participant) => total + participant.assignedModules,
      0,
    ),
    completedModules: participants.reduce(
      (total, participant) => total + participant.completedModules,
      0,
    ),
  });

  const trainingCatalog = Object.freeze(
    curriculumV3.modules.map((module) => {
      let assignedParticipants = 0;
      let activeParticipants = 0;
      let completedParticipants = 0;

      for (const item of projected) {
        const roadmapModule = item.dashboard.roadmap.find(
          (candidate) => candidate.moduleId === module.id,
        );
        if (item.assignedModuleIds.has(module.id)) {
          assignedParticipants += 1;
          if (
            roadmapModule !== undefined &&
            isActiveCatalogStatus(roadmapModule.status)
          ) {
            activeParticipants += 1;
          }
        }
        if (roadmapModule?.status === "CONCLUIDO_DIGITAL") {
          completedParticipants += 1;
        }
      }

      return Object.freeze({
        moduleId: module.id,
        month: module.month,
        title: module.title,
        competence: module.competence,
        assignedParticipants,
        activeParticipants,
        completedParticipants,
      });
    }),
  );

  return Object.freeze({
    curriculumId: curriculumV3.id,
    curriculumVersion: curriculumV3.version,
    summary,
    participants,
    trainingCatalog,
  });
}

export async function getInternalAdminDashboard(
  scopeIds: readonly string[],
  dependencies: AdminDashboardReadDependencies,
): Promise<AdminDashboard> {
  const normalizedScopeIds = normalizeScopeIds(scopeIds);
  const accounts = await dependencies.listParticipants(normalizedScopeIds);
  const snapshots = await Promise.all(
    accounts.map(async (account) => {
      const participantScopes = normalizeScopeIds(
        account.scopeIds.filter((scopeId) =>
          normalizedScopeIds.includes(scopeId.trim()),
        ),
      );
      const journey = await dependencies.getParticipantLearningJourney(
        account.participantId,
        participantScopes,
      );
      return Object.freeze({ ...account, journey });
    }),
  );
  return buildAdminDashboard(snapshots);
}
