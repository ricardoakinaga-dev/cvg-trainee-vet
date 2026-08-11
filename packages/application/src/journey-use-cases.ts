import type { AttemptStatus, LearningAssignmentStatus } from "@cvg/domain";

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

export function deriveJourneyNextAction(
  state: ParticipantLearningJourneyState,
): JourneyNextAction {
  const runtimeAction = state.runtimes.find(
    (runtime) => runtime.evaluation.nextAction !== undefined,
  )?.evaluation.nextAction;
  if (runtimeAction === "INICIAR_BASELINE") return "AGUARDAR_PUBLICACAO";
  if (runtimeAction !== undefined) return runtimeAction;

  const activityAction = state.activities.find(
    (activity) => activity.nextAction !== "CONSULTAR_PROXIMO_PASSO",
  )?.nextAction;
  if (activityAction !== undefined) return activityAction;

  if (
    state.assignments.some(
      ({ state: assignment }) =>
        assignment.status === "DISPONIVEL" || assignment.status === "ATRIBUIDO",
    )
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
