import { buildParticipantDashboard } from "./dashboard-use-cases.js";
import type { ParticipantLearningJourneyState } from "./journey-use-cases.js";

export type ModeratorQueueKind = "CORRECTION" | "FEEDBACK" | "REMEDIATION";

export type ModeratorQueueSnapshot = Readonly<{
  readonly queueId: string;
  readonly scopeId: string;
  readonly kind: ModeratorQueueKind;
  readonly openCount: number;
  readonly overdueCount: number;
}>;

export type ModeratorParticipantSnapshot = Readonly<{
  readonly participantId: string;
  readonly professionalEmail: string;
  readonly scopeIds: readonly string[];
  readonly assignedQueueIds: readonly string[];
  readonly correctionPendingCount: number;
  readonly feedbackOpenCount: number;
  readonly technicalFailureCount: number;
  readonly journey: ParticipantLearningJourneyState;
}>;

export type ModeratorDashboardParticipant = Readonly<{
  readonly participantId: string;
  readonly professionalEmail: string;
  readonly scopeIds: readonly string[];
  readonly progressPercent: number;
  readonly nextAction: string;
  readonly gapCount: number;
  readonly remediationObjectiveIds: readonly string[];
  readonly correctionPendingCount: number;
  readonly feedbackOpenCount: number;
  readonly technicalFailureCount: number;
  readonly digitalReinforcementPlan: readonly string[];
}>;

export type ModeratorDashboard = Readonly<{
  readonly moderatorId: string;
  readonly scopeIds: readonly string[];
  readonly participants: readonly ModeratorDashboardParticipant[];
  readonly queues: readonly ModeratorQueueSnapshot[];
  readonly practiceValidation: "NOT_AVAILABLE";
  readonly summary: Readonly<{
    readonly participantsTotal: number;
    readonly correctionPending: number;
    readonly feedbackOpen: number;
    readonly technicalFailures: number;
    readonly overdueQueues: number;
  }>;
}>;

export type ModeratorAssignedParticipantSnapshot = Readonly<{
  readonly participantId: string;
  readonly professionalEmail: string;
  readonly scopeIds: readonly string[];
  readonly assignedQueueIds: readonly string[];
  readonly correctionPendingCount: number;
  readonly feedbackOpenCount: number;
  readonly technicalFailureCount: number;
}>;

export type ModeratorDashboardReadData = Readonly<{
  readonly participants: readonly ModeratorAssignedParticipantSnapshot[];
  readonly queues: readonly ModeratorQueueSnapshot[];
}>;

export interface ModeratorDashboardReadDependencies {
  readonly listAssignedWork: (
    moderatorId: string,
    scopeIds: readonly string[],
  ) => Promise<ModeratorDashboardReadData>;
  readonly getParticipantLearningJourney: (
    participantId: string,
    scopeIds: readonly string[],
  ) => Promise<ParticipantLearningJourneyState>;
}

function normalizeIds(values: readonly string[]): readonly string[] {
  return Object.freeze([
    ...new Set(values.map((value) => value.trim()).filter(Boolean)),
  ]);
}

function nonNegative(value: number): number {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function participantProjection(
  snapshot: ModeratorParticipantSnapshot,
  requestedScopes: ReadonlySet<string>,
  visibleQueueIds: ReadonlySet<string>,
): ModeratorDashboardParticipant | undefined {
  const scopeIds = normalizeIds(
    snapshot.scopeIds.filter((scopeId) => requestedScopes.has(scopeId.trim())),
  );
  const assignedQueueIds = normalizeIds(snapshot.assignedQueueIds).filter(
    (queueId) => visibleQueueIds.has(queueId),
  );
  if (scopeIds.length === 0 || assignedQueueIds.length === 0) {
    return undefined;
  }

  const dashboard = buildParticipantDashboard(snapshot.journey);
  const remediationObjectiveIds = normalizeIds(
    snapshot.journey.runtimes.flatMap(
      (runtime) => runtime.evaluation.remediationObjectiveIds,
    ),
  );
  const criticalErrorItemIds = normalizeIds(
    snapshot.journey.runtimes.flatMap(
      (runtime) => runtime.evaluation.criticalErrorItemIds,
    ),
  );

  return Object.freeze({
    participantId: snapshot.participantId,
    professionalEmail: snapshot.professionalEmail,
    scopeIds,
    progressPercent: dashboard.progressPercent,
    nextAction: snapshot.journey.nextAction ?? dashboard.nextAction,
    gapCount: remediationObjectiveIds.length + criticalErrorItemIds.length,
    remediationObjectiveIds,
    correctionPendingCount: nonNegative(snapshot.correctionPendingCount),
    feedbackOpenCount: nonNegative(snapshot.feedbackOpenCount),
    technicalFailureCount: nonNegative(snapshot.technicalFailureCount),
    digitalReinforcementPlan: remediationObjectiveIds,
  });
}

export function buildModeratorDashboard(
  moderatorId: string,
  scopeIds: readonly string[],
  participantSnapshots: readonly ModeratorParticipantSnapshot[],
  queueSnapshots: readonly ModeratorQueueSnapshot[],
): ModeratorDashboard {
  const normalizedScopeIds = normalizeIds(scopeIds);
  const requestedScopes = new Set(normalizedScopeIds);
  const queues = Object.freeze(
    queueSnapshots
      .filter((queue) => requestedScopes.has(queue.scopeId.trim()))
      .map((queue) =>
        Object.freeze({
          queueId: queue.queueId,
          scopeId: queue.scopeId,
          kind: queue.kind,
          openCount: nonNegative(queue.openCount),
          overdueCount: nonNegative(queue.overdueCount),
        }),
      )
      .sort((left, right) => left.queueId.localeCompare(right.queueId)),
  );
  const visibleQueueIds = new Set(queues.map((queue) => queue.queueId));
  const participants = Object.freeze(
    participantSnapshots
      .map((snapshot) =>
        participantProjection(snapshot, requestedScopes, visibleQueueIds),
      )
      .filter(
        (participant): participant is ModeratorDashboardParticipant =>
          participant !== undefined,
      )
      .sort((left, right) =>
        left.professionalEmail.localeCompare(right.professionalEmail),
      ),
  );

  return Object.freeze({
    moderatorId,
    scopeIds: normalizedScopeIds,
    participants,
    queues,
    practiceValidation: "NOT_AVAILABLE" as const,
    summary: Object.freeze({
      participantsTotal: participants.length,
      correctionPending: participants.reduce(
        (total, participant) => total + participant.correctionPendingCount,
        0,
      ),
      feedbackOpen: participants.reduce(
        (total, participant) => total + participant.feedbackOpenCount,
        0,
      ),
      technicalFailures: participants.reduce(
        (total, participant) => total + participant.technicalFailureCount,
        0,
      ),
      overdueQueues: queues.reduce(
        (total, queue) => total + queue.overdueCount,
        0,
      ),
    }),
  });
}

export async function getInternalModeratorDashboard(
  moderatorId: string,
  scopeIds: readonly string[],
  dependencies: ModeratorDashboardReadDependencies,
): Promise<ModeratorDashboard> {
  const normalizedScopeIds = normalizeIds(scopeIds);
  const work = await dependencies.listAssignedWork(
    moderatorId,
    normalizedScopeIds,
  );
  const participants = await Promise.all(
    work.participants.map(async (snapshot) =>
      Object.freeze({
        ...snapshot,
        journey: await dependencies.getParticipantLearningJourney(
          snapshot.participantId,
          snapshot.scopeIds.filter((scopeId) =>
            normalizedScopeIds.includes(scopeId),
          ),
        ),
      }),
    ),
  );
  return buildModeratorDashboard(
    moderatorId,
    normalizedScopeIds,
    participants,
    work.queues,
  );
}
