import type { AttemptStatus, LearningAssignmentStatus } from "@cvg/domain";

import { ApplicationError } from "./errors.js";
import type { CurriculumRuntimeState } from "./curriculum-runtime-use-cases.js";
import type { DiagnosticResultState } from "./diagnostic-use-cases.js";
import type { ProgressNextAction } from "./progress-use-cases.js";
import type {
  ScopedAssessmentWorkflow,
  ScopedLearningAssignment,
} from "./learning-state-use-cases.js";

export type ParticipantJourneyActivity = Readonly<{
  readonly scopeId: string;
  readonly activityId: string;
  /** Internal curriculum binding; never cross the participant projection. */
  readonly moduleId?: string;
  /** Internal assignment provenance; never cross the participant projection. */
  readonly learningAssignmentId?: string;
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
  | "AGUARDAR_CORRECAO_HUMANA";

export type JourneyNextActionTarget = Readonly<{
  readonly kind: "ACTIVITY";
  readonly activityId: string;
}>;

export type ParticipantLearningJourneyState = Readonly<{
  readonly participantId: string;
  readonly assignments: readonly ScopedLearningAssignment[];
  readonly activities: readonly ParticipantJourneyActivity[];
  readonly results: readonly ScopedAssessmentWorkflow[];
  readonly runtimes: readonly CurriculumRuntimeState[];
  readonly diagnosticResults?: readonly DiagnosticResultState[];
  readonly nextAction?: JourneyNextAction;
  readonly nextActionTarget?: JourneyNextActionTarget;
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

export function deriveJourneyNextActionTarget(
  state: ParticipantLearningJourneyState,
): JourneyNextActionTarget | undefined {
  const runtime = state.runtimes.find(
    (candidate) => candidate.evaluation.nextAction !== undefined,
  );
  const runtimeAction = runtime?.evaluation.nextAction;
  if (runtimeAction === "EXECUTAR_REMEDIACAO" && runtime !== undefined) {
    const actionableStatuses = [
      "EM_REFORCO",
      "EM_ANDAMENTO",
      "DISPONIVEL",
    ] as const;
    const activity = actionableStatuses
      .map((status) =>
        state.activities.find(
          (candidate) =>
            candidate.scopeId === runtime.scopeId &&
            candidate.moduleId === runtime.evaluation.moduleId &&
            candidate.learningAssignmentId !== undefined &&
            candidate.status === status,
        ),
      )
      .find((candidate) => candidate !== undefined);
    if (activity !== undefined) {
      return Object.freeze({
        kind: "ACTIVITY",
        activityId: activity.activityId,
      });
    }
    return undefined;
  }
  if (runtimeAction !== undefined) return undefined;

  const activity = state.activities.find(
    (candidate) => candidate.nextAction !== "CONSULTAR_PROXIMO_PASSO",
  );
  if (
    activity === undefined ||
    (activity.nextAction !== "INICIAR_ATIVIDADE" &&
      activity.nextAction !== "RETOMAR_ATIVIDADE")
  ) {
    return undefined;
  }

  return Object.freeze({
    kind: "ACTIVITY",
    activityId: activity.activityId,
  });
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
    ) ||
    (state.diagnosticResults ?? []).some(
      (result) =>
        !allowedScopes.has(result.scopeId) ||
        result.participantId !== command.participantId,
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
    ...(state.diagnosticResults === undefined
      ? {}
      : {
          diagnosticResults: Object.freeze(
            state.diagnosticResults.map((result) =>
              Object.freeze({
                ...result,
                result: Object.freeze({
                  ...result.result,
                  themeResults: Object.freeze(
                    result.result.themeResults.map((theme) =>
                      Object.freeze({
                        ...theme,
                        recommendedModuleIds: Object.freeze([
                          ...theme.recommendedModuleIds,
                        ]),
                      }),
                    ),
                  ),
                  recommendedModuleIds: Object.freeze([
                    ...result.result.recommendedModuleIds,
                  ]),
                  remediationObjectiveIds: Object.freeze([
                    ...result.result.remediationObjectiveIds,
                  ]),
                }),
              }),
            ),
          ),
        }),
  } satisfies Omit<ParticipantLearningJourneyState, "nextAction">;

  const nextActionTarget = deriveJourneyNextActionTarget(cloned);
  return Object.freeze({
    ...cloned,
    nextAction: deriveJourneyNextAction(cloned),
    ...(nextActionTarget === undefined ? {} : { nextActionTarget }),
  });
}
