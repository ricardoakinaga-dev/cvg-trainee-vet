import { ApplicationError } from "./errors.js";
import {
  buildPersonalizedCurriculumPath,
  curriculumV3,
  type PersonalizedPathItem,
} from "@cvg/curriculum";
import type {
  JourneyNextAction,
  ParticipantLearningJourneyState,
} from "./journey-use-cases.js";
import { deriveJourneyNextAction } from "./journey-use-cases.js";
import type { AccountStatus } from "./authorization.js";
import {
  deriveParticipantDiagnosticProfile,
  type ParticipantDiagnosticProfileItem,
} from "./diagnostic-use-cases.js";

export type DashboardNextAction = JourneyNextAction;

export type ParticipantDashboardState = Readonly<{
  readonly kind: "participant";
  readonly nextAction: DashboardNextAction;
  readonly path: readonly PersonalizedPathItem[];
  readonly profile: readonly ParticipantCompetencyProfileItem[];
  readonly diagnosticProfile?: readonly ParticipantDiagnosticProfileItem[];
  readonly progress: Readonly<{
    readonly assignedActivities: number;
    readonly completedActivities: number;
    readonly progressPercent: number | null;
    readonly remediationObjectives: number;
    readonly retentionReviewsPending: number;
    readonly pendingCorrections: number;
  }>;
}>;

export type ParticipantCompetencyProfileItem = Readonly<{
  readonly moduleId: string;
  readonly month: number;
  readonly competence: string;
  readonly status:
    | "SEM_EVIDENCIA_DIGITAL"
    | "EM_DESENVOLVIMENTO_DIGITAL"
    | "DOMINIO_DIGITAL"
    | "EM_REMEDIACAO"
    | "RETENCAO_PENDENTE"
    | "AGUARDA_CORRECAO_HUMANA";
  readonly scorePercent: number | null;
  readonly lastEvaluatedAt?: string;
  readonly evidence: "AVALIACAO_MODULAR_DIGITAL";
  readonly practicalCompetenceClaim: "PROIBIDO_MVP";
}>;

export type StaffDashboardParticipant = Readonly<{
  readonly participantId: string;
  readonly professionalEmail: string;
  readonly accountStatus: AccountStatus;
  /** Authorized membership scopes used only to route subsequent server-side actions. */
  readonly scopeIds: readonly string[];
  readonly lastSeenAt?: string;
  readonly progress: Readonly<{
    readonly assignedModules: number;
    readonly completedModules: number;
    readonly progressPercent: number | null;
    readonly remediationModules: number;
    readonly retentionReviewsPending: number;
  }>;
  readonly pendingCorrections: number;
  readonly openFeedback: number;
  readonly nextAction: DashboardNextAction;
  readonly diagnosticProfile?: readonly ParticipantDiagnosticProfileItem[];
}>;

export type StaffDashboardMetrics = Readonly<{
  readonly invitedParticipants: number;
  readonly activeParticipants: number;
  readonly inactiveParticipants: number;
  readonly assignedModules: number;
  readonly completedModules: number;
  readonly completionRatePercent: number | null;
  readonly medianProgressPercent: number | null;
  readonly pendingCorrections: number;
  readonly remediationParticipants: number;
  readonly retentionReviewsPending: number;
  readonly openFeedback: number;
  readonly content: Readonly<{
    readonly published: number;
    readonly inReview: number;
    readonly expired: number;
    readonly withdrawn: number;
  }>;
}>;

export type StaffDashboardState = Readonly<{
  readonly scopes: readonly string[];
  readonly generatedAt: string;
  readonly metrics: StaffDashboardMetrics;
  readonly participants: readonly StaffDashboardParticipant[];
}>;

export type GetStaffDashboardCommand = Readonly<{
  readonly principalId: string;
  readonly scopeIds: readonly string[];
}>;

export interface DashboardReadPort {
  readonly findStaffDashboard: (
    scopeIds: readonly string[],
  ) => Promise<StaffDashboardState>;
}

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function normalizeScopeIds(scopeIds: readonly string[]): readonly string[] {
  const normalized = scopeIds
    .map((scopeId) => scopeId.trim())
    .filter((scopeId) => scopeId.length > 0);
  if (normalized.length === 0) {
    throw new ApplicationError("validation_error", "scopeIds is required");
  }
  return Object.freeze([...new Set(normalized)]);
}

function freezeParticipant(
  participant: StaffDashboardParticipant,
): StaffDashboardParticipant {
  return Object.freeze({
    ...participant,
    scopeIds: Object.freeze([...participant.scopeIds]),
    progress: Object.freeze({ ...participant.progress }),
    ...(participant.diagnosticProfile === undefined
      ? {}
      : {
          diagnosticProfile: Object.freeze(
            participant.diagnosticProfile.map((item) =>
              Object.freeze({
                ...item,
                recommendedModuleIds: Object.freeze([
                  ...item.recommendedModuleIds,
                ]),
              }),
            ),
          ),
        }),
  });
}

function freezeMetrics(metrics: StaffDashboardMetrics): StaffDashboardMetrics {
  return Object.freeze({
    ...metrics,
    content: Object.freeze({ ...metrics.content }),
  });
}

function cloneStaffDashboard(
  state: StaffDashboardState,
  requestedScopes: readonly string[],
): StaffDashboardState {
  const returnedScopes = Object.freeze(
    [...new Set(state.scopes.map((scopeId) => scopeId.trim()))].filter(
      (scopeId) => scopeId.length > 0,
    ),
  );
  const allowedScopes = new Set(requestedScopes);
  if (
    returnedScopes.length === 0 ||
    returnedScopes.some((scopeId) => !allowedScopes.has(scopeId))
  ) {
    throw new ApplicationError(
      "forbidden",
      "Dashboard contains data outside the current scope",
    );
  }
  const participants = state.participants.map((participant) => {
    const participantScopes = Object.freeze(
      [
        ...new Set(participant.scopeIds.map((scopeId) => scopeId.trim())),
      ].filter((scopeId) => scopeId.length > 0),
    );
    if (
      participantScopes.length === 0 ||
      participantScopes.some((scopeId) => !allowedScopes.has(scopeId))
    ) {
      throw new ApplicationError(
        "forbidden",
        "Dashboard participant contains data outside the current scope",
      );
    }
    return freezeParticipant({ ...participant, scopeIds: participantScopes });
  });
  return Object.freeze({
    scopes: returnedScopes,
    generatedAt: state.generatedAt,
    metrics: freezeMetrics(state.metrics),
    participants: Object.freeze(participants),
  });
}

export async function getStaffDashboard(
  command: GetStaffDashboardCommand,
  repository: DashboardReadPort,
): Promise<StaffDashboardState> {
  assertNonEmpty(command.principalId, "principalId");
  const scopeIds = normalizeScopeIds(command.scopeIds);
  const state = await repository.findStaffDashboard(scopeIds);
  return cloneStaffDashboard(state, scopeIds);
}

function percentage(completed: number, total: number): number | null {
  if (total === 0) return null;
  return Math.round((completed / total) * 100);
}

function latestRuntimeByModule(
  journey: ParticipantLearningJourneyState,
): ReadonlyMap<string, ParticipantLearningJourneyState["runtimes"][number]> {
  const latest = new Map<
    string,
    ParticipantLearningJourneyState["runtimes"][number]
  >();
  for (const runtime of journey.runtimes) {
    const previous = latest.get(runtime.evaluation.moduleId);
    if (
      previous === undefined ||
      new Date(runtime.updatedAt).getTime() >=
        new Date(previous.updatedAt).getTime()
    ) {
      latest.set(runtime.evaluation.moduleId, runtime);
    }
  }
  return latest;
}

function competencyStatus(
  runtime: ParticipantLearningJourneyState["runtimes"][number] | undefined,
): ParticipantCompetencyProfileItem["status"] {
  if (runtime === undefined) return "SEM_EVIDENCIA_DIGITAL";
  if (
    runtime.evaluation.retentionReviews.some(
      (review) => review.status === "PENDENTE",
    )
  ) {
    return "RETENCAO_PENDENTE";
  }
  if (runtime.evaluation.status === "DOMINIO_DIGITAL") {
    return "DOMINIO_DIGITAL";
  }
  if (runtime.evaluation.status === "EM_REMEDIACAO") {
    return "EM_REMEDIACAO";
  }
  if (runtime.evaluation.status === "AGUARDA_CORRECAO_HUMANA") {
    return "AGUARDA_CORRECAO_HUMANA";
  }
  return "EM_DESENVOLVIMENTO_DIGITAL";
}

export function deriveParticipantCompetencyProfile(
  journey: ParticipantLearningJourneyState,
): readonly ParticipantCompetencyProfileItem[] {
  const runtimes = latestRuntimeByModule(journey);
  return Object.freeze(
    curriculumV3.modules.map((module) => {
      const runtime = runtimes.get(module.id);
      return Object.freeze({
        moduleId: module.id,
        month: module.month,
        competence: module.competence,
        status: competencyStatus(runtime),
        scorePercent: runtime?.evaluation.scorePercent ?? null,
        ...(runtime === undefined
          ? {}
          : { lastEvaluatedAt: runtime.updatedAt }),
        evidence: "AVALIACAO_MODULAR_DIGITAL" as const,
        practicalCompetenceClaim: "PROIBIDO_MVP" as const,
      });
    }),
  );
}

export function deriveParticipantDashboard(
  journey: ParticipantLearningJourneyState,
): ParticipantDashboardState {
  const assignedActivities = journey.activities.length;
  const completedActivities = journey.activities.filter(
    (activity) => activity.status === "CONCLUIDO",
  ).length;
  const remediationObjectives = journey.runtimes.reduce(
    (total, runtime) =>
      total + runtime.evaluation.remediationObjectiveIds.length,
    0,
  );
  const retentionReviewsPending = journey.runtimes.reduce(
    (total, runtime) =>
      total +
      runtime.evaluation.retentionReviews.filter(
        (review) => review.status === "PENDENTE",
      ).length,
    0,
  );
  const pendingCorrections =
    journey.activities.filter(
      (activity) =>
        activity.attemptStatus === "SUBMETIDA" ||
        activity.attemptStatus === "AGUARDA_CORRECAO_HUMANA",
    ).length +
    journey.results.filter(
      ({ state }) => state.status === "RESULTADO_EM_PROCESSAMENTO",
    ).length;

  const assignedModuleIds = journey.assignments.map(
    ({ state: assignment }) => assignment.moduleId,
  );
  const masteredModuleIds = journey.assignments
    .filter(({ state: assignment }) =>
      ["CONCLUIDO", "CONCLUIDO_COM_RETENCAO_PENDENTE"].includes(
        assignment.status,
      ),
    )
    .map(({ state: assignment }) => assignment.moduleId);
  const remediationModuleIds = journey.assignments
    .filter(
      ({ state: assignment }) =>
        assignment.status === "EM_REFORCO" ||
        (assignment.status === "BLOQUEADO" &&
          assignment.blockReason === "OBJETIVO_EM_REMEDIACAO"),
    )
    .map(({ state: assignment }) => assignment.moduleId);
  const retentionDueModuleIds = journey.assignments
    .filter(
      ({ state: assignment }) =>
        assignment.status === "CONCLUIDO_COM_RETENCAO_PENDENTE",
    )
    .map(({ state: assignment }) => assignment.moduleId);
  const inProgressModuleIds = journey.assignments
    .filter(({ state: assignment }) => assignment.status === "EM_ANDAMENTO")
    .map(({ state: assignment }) => assignment.moduleId);

  for (const runtime of journey.runtimes) {
    const moduleId = runtime.evaluation.moduleId;
    if (runtime.evaluation.status === "DOMINIO_DIGITAL") {
      masteredModuleIds.push(moduleId);
    }
    if (runtime.evaluation.status === "EM_REMEDIACAO") {
      remediationModuleIds.push(moduleId);
    }
    if (
      runtime.evaluation.retentionReviews.some(
        (review) => review.status === "PENDENTE",
      )
    ) {
      retentionDueModuleIds.push(moduleId);
    }
    if (runtime.evaluation.status === "AGUARDA_CORRECAO_HUMANA") {
      inProgressModuleIds.push(moduleId);
    }
    if (!assignedModuleIds.includes(moduleId)) {
      assignedModuleIds.push(moduleId);
    }
  }

  const path = buildPersonalizedCurriculumPath({
    masteredModuleIds,
    remediationModuleIds,
    retentionDueModuleIds,
    inProgressModuleIds,
    assignedModuleIds,
  });

  const diagnosticProfile =
    journey.diagnosticResults === undefined
      ? undefined
      : deriveParticipantDiagnosticProfile(journey.diagnosticResults);

  return Object.freeze({
    kind: "participant",
    nextAction: journey.nextAction ?? deriveJourneyNextAction(journey),
    path: Object.freeze(path.map((item) => Object.freeze({ ...item }))),
    profile: deriveParticipantCompetencyProfile(journey),
    ...(diagnosticProfile === undefined ? {} : { diagnosticProfile }),
    progress: Object.freeze({
      assignedActivities,
      completedActivities,
      progressPercent: percentage(completedActivities, assignedActivities),
      remediationObjectives,
      retentionReviewsPending,
      pendingCorrections,
    }),
  });
}
