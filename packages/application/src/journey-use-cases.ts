import type { AttemptStatus, LearningAssignmentStatus } from "@cvg/domain";
import { curriculumV3 } from "@cvg/curriculum";

import { ApplicationError } from "./errors.js";
import type { CurriculumRuntimeState } from "./curriculum-runtime-use-cases.js";
import type { ProgressNextAction } from "./progress-use-cases.js";
import type {
  ScopedAssessmentWorkflow,
  ScopedLearningAssignment,
} from "./learning-state-use-cases.js";

export type ParticipantJourneyActivity = Readonly<{
  readonly scopeId: string;
  readonly activityId: string;
  readonly slug: string;
  readonly title: string;
  readonly status: Exclude<LearningAssignmentStatus, "NAO_ATRIBUIDO">;
  readonly attemptId?: string;
  readonly attemptStatus?: AttemptStatus;
  readonly attemptVersion?: number;
  readonly nextAction: ProgressNextAction;
}>;

export type JourneyNextAction =
  | ProgressNextAction
  | "EXECUTAR_REMEDIACAO"
  | "REVISAR_RETENCAO"
  | "INICIAR_BASELINE"
  | "AGUARDAR_PUBLICACAO"
  | "AGUARDAR_CORRECAO_HUMANA";

export type ParticipantLearningJourneyState = Readonly<{
  readonly participantId: string;
  readonly assignments: readonly ScopedLearningAssignment[];
  readonly activities: readonly ParticipantJourneyActivity[];
  readonly results: readonly ScopedAssessmentWorkflow[];
  readonly runtimes: readonly CurriculumRuntimeState[];
  readonly nextAction?: JourneyNextAction;
}>;

export type GetParticipantLearningJourneyCommand = Readonly<{
  readonly participantId: string;
  readonly scopeIds: readonly string[];
}>;

export interface ParticipantJourneyReadPort {
  readonly findParticipantLearningJourney: (
    participantId: string,
    scopeIds: readonly string[],
  ) => Promise<ParticipantLearningJourneyState>;
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
  return Object.freeze([...new Set(normalized)]);
}

function cloneAssignment(
  value: ScopedLearningAssignment,
): ScopedLearningAssignment {
  return Object.freeze({
    scopeId: value.scopeId,
    state: Object.freeze({ ...value.state }),
  });
}

function cloneResult(
  value: ScopedAssessmentWorkflow,
): ScopedAssessmentWorkflow {
  return Object.freeze({
    scopeId: value.scopeId,
    participantId: value.participantId,
    state: Object.freeze({ ...value.state }),
  });
}

function cloneRuntime(value: CurriculumRuntimeState): CurriculumRuntimeState {
  return Object.freeze({
    participantId: value.participantId,
    scopeId: value.scopeId,
    version: value.version,
    updatedAt: value.updatedAt,
    evaluation: Object.freeze({
      ...value.evaluation,
      objectiveResults: Object.freeze(
        value.evaluation.objectiveResults.map((item) =>
          Object.freeze({ ...item }),
        ),
      ),
      remediationObjectiveIds: Object.freeze([
        ...value.evaluation.remediationObjectiveIds,
      ]),
      criticalErrorItemIds: Object.freeze([
        ...value.evaluation.criticalErrorItemIds,
      ]),
      invalidAnswerItemIds: Object.freeze([
        ...value.evaluation.invalidAnswerItemIds,
      ]),
      unansweredChoiceItemIds: Object.freeze([
        ...value.evaluation.unansweredChoiceItemIds,
      ]),
      openResponseItemIds: Object.freeze([
        ...value.evaluation.openResponseItemIds,
      ]),
      retentionReviews: Object.freeze(
        value.evaluation.retentionReviews.map((item) =>
          Object.freeze({ ...item }),
        ),
      ),
    }),
  });
}

const moduleSlugPattern = /(?:^|-)m(0[1-9]|1[0-9]|2[0-4])(?:-|$)/iu;

function moduleIdFromActivitySlug(slug: string): string | null {
  const match = moduleSlugPattern.exec(slug);
  return match?.[1] === undefined ? null : `M${match[1]}`;
}

function moduleOrder(moduleId: string): number {
  const moduleIndex = curriculumV3.modules.findIndex(
    (module) => module.id === moduleId,
  );
  return moduleIndex < 0 ? Number.POSITIVE_INFINITY : moduleIndex;
}

function compareActivities(
  left: ParticipantJourneyActivity,
  right: ParticipantJourneyActivity,
): number {
  const orderDifference =
    moduleOrder(moduleIdFromActivitySlug(left.slug) ?? "") -
    moduleOrder(moduleIdFromActivitySlug(right.slug) ?? "");
  if (orderDifference !== 0) return orderDifference;
  const slugDifference = left.slug.localeCompare(right.slug);
  if (slugDifference !== 0) return slugDifference;
  return left.activityId.localeCompare(right.activityId);
}

function runtimeForModule(
  state: ParticipantLearningJourneyState,
  moduleId: string,
): CurriculumRuntimeState | undefined {
  return state.runtimes.find(
    (runtime) => runtime.evaluation.moduleId === moduleId,
  );
}

function assignmentForModule(
  state: ParticipantLearningJourneyState,
  moduleId: string,
): ScopedLearningAssignment | undefined {
  return state.assignments.find(
    ({ state: assignment }) => assignment.moduleId === moduleId,
  );
}

function moduleIsComplete(
  state: ParticipantLearningJourneyState,
  moduleId: string,
): boolean {
  const runtime = runtimeForModule(state, moduleId);
  if (runtime !== undefined) {
    return (
      runtime.evaluation.status === "DOMINIO_DIGITAL" &&
      runtime.evaluation.retentionReviews.length === 0
    );
  }

  return assignmentForModule(state, moduleId)?.state.status === "CONCLUIDO";
}

function firstIncompleteModuleId(
  state: ParticipantLearningJourneyState,
): string | undefined {
  return curriculumV3.modules.find(
    (module) => !moduleIsComplete(state, module.id),
  )?.id;
}

/**
 * Returns only the activity belonging to the first incomplete curriculum
 * module. A later published activity is intentionally not a fallback when
 * the current module is still pending publication, evaluation, or retention.
 */
export function getNextParticipantJourneyActivity(
  state: ParticipantLearningJourneyState,
): ParticipantJourneyActivity | undefined {
  const currentModuleId = firstIncompleteModuleId(state);
  if (currentModuleId === undefined) return undefined;

  // The persisted runtime is authoritative for the current module. An
  // activity cannot bypass a pending baseline, remediation, correction, or
  // retention action just because its projection is published.
  if (runtimeForModule(state, currentModuleId) !== undefined) return undefined;

  return [...state.activities]
    .sort(compareActivities)
    .find(
      (activity) =>
        moduleIdFromActivitySlug(activity.slug) === currentModuleId &&
        activity.nextAction !== "CONSULTAR_PROXIMO_PASSO",
    );
}

/**
 * Keeps direct activity reads/starts aligned with the same ordered journey.
 * Non-curriculum diagnostic activities do not participate in the M01–M24
 * sequence and retain their existing scoped-assignment authorization.
 */
export function isParticipantJourneyActivityCurrent(
  state: ParticipantLearningJourneyState,
  activityId: string,
): boolean {
  const activity = state.activities.find(
    (candidate) => candidate.activityId === activityId,
  );
  if (activity === undefined) return false;
  if (moduleIdFromActivitySlug(activity.slug) === null) {
    return activity.nextAction !== "CONSULTAR_PROXIMO_PASSO";
  }
  return getNextParticipantJourneyActivity(state)?.activityId === activityId;
}

export function deriveJourneyNextAction(
  state: ParticipantLearningJourneyState,
): JourneyNextAction {
  const currentModuleId = firstIncompleteModuleId(state);
  const runtimeAction =
    currentModuleId === undefined
      ? undefined
      : runtimeForModule(state, currentModuleId)?.evaluation.nextAction;
  if (runtimeAction === "INICIAR_BASELINE") return "AGUARDAR_PUBLICACAO";
  if (runtimeAction !== undefined) return runtimeAction;

  const activityAction = getNextParticipantJourneyActivity(state)?.nextAction;
  if (activityAction !== undefined) return activityAction;

  const currentAssignment =
    currentModuleId === undefined
      ? undefined
      : assignmentForModule(state, currentModuleId)?.state;
  if (
    currentAssignment?.status === "DISPONIVEL" ||
    currentAssignment?.status === "ATRIBUIDO"
  ) {
    return "INICIAR_ATIVIDADE";
  }

  if (
    state.results.some(
      ({ state: result }) => result.status === "RESULTADO_EM_PROCESSAMENTO",
    )
  ) {
    return "AGUARDAR_CORRECAO_HUMANA";
  }

  if (
    currentModuleId !== undefined &&
    state.activities.some((activity) => {
      const activityModuleId = moduleIdFromActivitySlug(activity.slug);
      return (
        activityModuleId !== null &&
        moduleOrder(activityModuleId) > moduleOrder(currentModuleId)
      );
    })
  ) {
    return "AGUARDAR_PUBLICACAO";
  }

  return "CONSULTAR_PROXIMO_PASSO";
}

export async function getParticipantLearningJourney(
  command: GetParticipantLearningJourneyCommand,
  repository: ParticipantJourneyReadPort,
): Promise<ParticipantLearningJourneyState> {
  assertNonEmpty(command.participantId, "participantId");
  const scopeIds = normalizeScopeIds(command.scopeIds);
  const state = await repository.findParticipantLearningJourney(
    command.participantId,
    scopeIds,
  );

  if (state.participantId !== command.participantId) {
    throw new ApplicationError(
      "forbidden",
      "Learning journey is outside the current participant scope",
    );
  }

  const allowedScopes = new Set(scopeIds);
  if (
    state.assignments.some(
      ({ scopeId, state: assignment }) =>
        !allowedScopes.has(scopeId) ||
        assignment.participantId !== command.participantId,
    ) ||
    state.activities.some((activity) => !allowedScopes.has(activity.scopeId)) ||
    state.results.some(
      ({ scopeId, participantId }) =>
        !allowedScopes.has(scopeId) || participantId !== command.participantId,
    ) ||
    state.runtimes.some(
      (runtime) =>
        !allowedScopes.has(runtime.scopeId) ||
        runtime.participantId !== command.participantId,
    )
  ) {
    throw new ApplicationError(
      "forbidden",
      "Learning journey contains data outside the current scope",
    );
  }

  const cloned = {
    participantId: command.participantId,
    assignments: Object.freeze(state.assignments.map(cloneAssignment)),
    activities: Object.freeze(
      state.activities.map((activity) => Object.freeze({ ...activity })),
    ),
    results: Object.freeze(state.results.map(cloneResult)),
    runtimes: Object.freeze(state.runtimes.map(cloneRuntime)),
  } satisfies Omit<ParticipantLearningJourneyState, "nextAction">;

  return Object.freeze({
    ...cloned,
    nextAction: deriveJourneyNextAction(cloned),
  });
}
