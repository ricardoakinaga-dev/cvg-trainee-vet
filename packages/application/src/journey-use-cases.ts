import type { AttemptStatus, LearningAssignmentStatus } from "@cvg/domain";
import { curriculumV3 } from "@cvg/curriculum";

import { ApplicationError } from "./errors.js";
import {
  hasCoherentModuleCompletion,
  type ModuleCompletionReceiptFact,
} from "./journey-module-authority.js";
import { selectCurrentJourneyRuntimes } from "./journey-runtime-selection.js";
import {
  isAssignmentOperationallyAvailable,
  isUnstartedAssignmentAvailable,
} from "./journey-assignment-eligibility.js";
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
  readonly completionReceipts?: readonly ModuleCompletionReceiptFact[];
  readonly boundAssignmentIds?: readonly string[];
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

function isScopedModulePrerequisiteBlocked(
  state: ParticipantLearningJourneyState,
  scopeId: string,
  moduleId: string,
): boolean {
  const index = curriculumV3.modules.findIndex(
    (module) => module.id === moduleId,
  );
  if (index < 0) return true;
  const predecessor = curriculumV3.modules[index - 1];
  return (
    predecessor !== undefined &&
    !hasCoherentModuleCompletion(state, scopeId, predecessor.id)
  );
}

function isAuthorizedModuleActivity(
  state: ParticipantLearningJourneyState,
  context: Readonly<{ scopeId: string; moduleId: string }>,
  candidate: ParticipantJourneyActivity,
  allowCompletedAssignment = false,
): boolean {
  return (
    candidate.scopeId === context.scopeId &&
    candidate.moduleId === context.moduleId &&
    ["DISPONIVEL", "EM_ANDAMENTO", "EM_REFORCO"].includes(candidate.status) &&
    ["INICIAR_ATIVIDADE", "RETOMAR_ATIVIDADE", "AGUARDAR_CORRECAO"].includes(
      candidate.nextAction,
    ) &&
    (candidate.nextAction !== "RETOMAR_ATIVIDADE" ||
      ["CRIADA", "EM_ANDAMENTO", "SALVA"].includes(
        candidate.attemptStatus ?? "",
      )) &&
    (candidate.nextAction !== "AGUARDAR_CORRECAO" ||
      ["SUBMETIDA", "AGUARDA_CORRECAO_HUMANA"].includes(
        candidate.attemptStatus ?? "",
      )) &&
    state.assignments.some(
      ({ scopeId, state: assignment }) =>
        scopeId === context.scopeId &&
        assignment.participantId === state.participantId &&
        assignment.moduleId === context.moduleId &&
        assignment.assignmentId === candidate.learningAssignmentId &&
        ([
          "EM_ANDAMENTO",
          "EM_REFORCO",
          "CONCLUIDO",
          "CONCLUIDO_COM_RETENCAO_PENDENTE",
        ].includes(assignment.status) ||
          (isUnstartedAssignmentAvailable(assignment) &&
            !isScopedModulePrerequisiteBlocked(
              state,
              context.scopeId,
              context.moduleId,
            ))) &&
        (["ATRIBUIDO", "DISPONIVEL", "EM_ANDAMENTO", "EM_REFORCO"].includes(
          assignment.status,
        ) ||
          (allowCompletedAssignment &&
            ["CONCLUIDO", "CONCLUIDO_COM_RETENCAO_PENDENTE"].includes(
              assignment.status,
            ))),
    )
  );
}

function compareAuthorizedActivities(
  left: ParticipantJourneyActivity,
  right: ParticipantJourneyActivity,
): number {
  const humanPriority =
    Number(right.nextAction === "AGUARDAR_CORRECAO") -
    Number(left.nextAction === "AGUARDAR_CORRECAO");
  const statuses = ["EM_REFORCO", "EM_ANDAMENTO", "DISPONIVEL"];
  return (
    humanPriority ||
    statuses.indexOf(left.status) - statuses.indexOf(right.status) ||
    JSON.stringify([
      left.scopeId,
      left.moduleId,
      left.activityId,
    ]).localeCompare(
      JSON.stringify([right.scopeId, right.moduleId, right.activityId]),
    )
  );
}

function pendingModuleActivity(
  state: ParticipantLearningJourneyState,
  runtime: CurriculumRuntimeState,
): ParticipantJourneyActivity | undefined {
  return state.activities
    .filter((candidate) =>
      isAuthorizedModuleActivity(
        state,
        {
          scopeId: runtime.scopeId,
          moduleId: runtime.evaluation.moduleId,
        },
        candidate,
        true,
      ),
    )
    .sort(compareAuthorizedActivities)[0];
}

function deriveActualPendingDecision(
  state: ParticipantLearningJourneyState,
):
  | Readonly<{ action: JourneyNextAction; target?: JourneyNextActionTarget }>
  | undefined {
  const statuses = ["EM_REFORCO", "EM_ANDAMENTO", "DISPONIVEL"] as const;
  const activity = statuses.flatMap((status) =>
    state.activities
      .filter(
        (candidate) =>
          candidate.status === status &&
          candidate.moduleId !== undefined &&
          !hasCoherentModuleCompletion(
            state,
            candidate.scopeId,
            candidate.moduleId,
          ) &&
          isAuthorizedModuleActivity(
            state,
            {
              scopeId: candidate.scopeId,
              moduleId: candidate.moduleId,
            },
            candidate,
            true,
          ),
      )
      .sort(compareAuthorizedActivities),
  )[0];
  if (activity === undefined) return undefined;
  return activity.nextAction === "AGUARDAR_CORRECAO"
    ? Object.freeze({ action: "AGUARDAR_CORRECAO_HUMANA" })
    : Object.freeze({
        action: activity.nextAction,
        target: Object.freeze({
          kind: "ACTIVITY",
          activityId: activity.activityId,
        }),
      });
}

export { hasCoherentModuleCompletion } from "./journey-module-authority.js";
function isModuleCompleted(
  state: ParticipantLearningJourneyState,
  runtime: CurriculumRuntimeState,
): boolean {
  return hasCoherentModuleCompletion(
    state,
    runtime.scopeId,
    runtime.evaluation.moduleId,
  );
}

function journeyRuntimePriority(
  state: ParticipantLearningJourneyState,
  runtime: CurriculumRuntimeState,
): number {
  if (!isModuleCompleted(state, runtime)) {
    const pending = pendingModuleActivity(state, runtime);
    if (
      pending?.nextAction === "AGUARDAR_CORRECAO" ||
      runtime.evaluation.activityProgress === "AGUARDA_CORRECAO_HUMANA"
    )
      return 0;
    if (
      pending !== undefined ||
      runtime.evaluation.activityProgress !== undefined
    )
      return 1;
  }
  return runtime.evaluation.nextAction === "AGUARDAR_CORRECAO_HUMANA"
    ? 2
    : runtime.evaluation.nextAction === "EXECUTAR_REMEDIACAO"
      ? 3
      : 4;
}

function isRuntimeAssignmentIneligible(
  state: ParticipantLearningJourneyState,
  runtime: CurriculumRuntimeState,
): boolean {
  const assignments = state.assignments.filter(
    (entry) =>
      entry.scopeId === runtime.scopeId &&
      entry.state.participantId === state.participantId &&
      entry.state.moduleId === runtime.evaluation.moduleId,
  );
  return (
    assignments.length > 0 &&
    assignments.every(
      (entry) =>
        !isAssignmentOperationallyAvailable(entry.state) ||
        (isUnstartedAssignmentAvailable(entry.state) &&
          isScopedModulePrerequisiteBlocked(
            state,
            entry.scopeId,
            entry.state.moduleId,
          )),
    )
  );
}

function selectJourneyRuntime(
  state: ParticipantLearningJourneyState,
): CurriculumRuntimeState | undefined {
  const current = selectCurrentJourneyRuntimes(
    state.participantId,
    state.runtimes,
  ).filter(
    (runtime) =>
      runtime.evaluation.nextAction !== undefined &&
      !isRuntimeAssignmentIneligible(state, runtime) &&
      !(
        isModuleCompleted(state, runtime) &&
        runtime.evaluation.nextAction === "AGUARDAR_CORRECAO_HUMANA"
      ),
  );
  // Stable tuple order supplied by the selector breaks equivalent priorities.
  return [...current].sort(
    (left, right) =>
      journeyRuntimePriority(state, left) -
      journeyRuntimePriority(state, right),
  )[0];
}

export function deriveJourneyNextAction(
  state: ParticipantLearningJourneyState,
): JourneyNextAction {
  const runtime = selectJourneyRuntime(state);
  const mandatoryPending =
    runtime !== undefined && !isModuleCompleted(state, runtime);
  const pendingActivity = mandatoryPending
    ? pendingModuleActivity(state, runtime)
    : undefined;
  if (pendingActivity?.nextAction === "AGUARDAR_CORRECAO")
    return "AGUARDAR_CORRECAO_HUMANA";
  if (
    mandatoryPending &&
    runtime.evaluation.activityProgress === "AGUARDA_CORRECAO_HUMANA"
  )
    return "AGUARDAR_CORRECAO_HUMANA";
  if (
    mandatoryPending &&
    (runtime.evaluation.activityProgress === "ATIVIDADES_PENDENTES" ||
      (pendingActivity !== undefined &&
        runtime.evaluation.nextAction !== "EXECUTAR_REMEDIACAO"))
  ) {
    const action = pendingActivity?.nextAction;
    return (
      action ??
      deriveActualPendingDecision(state)?.action ??
      "CONSULTAR_PROXIMO_PASSO"
    );
  }
  const runtimeAction = runtime?.evaluation.nextAction;
  if (runtimeAction === "REVISAR_RETENCAO") {
    const pending = deriveActualPendingDecision(state);
    if (pending !== undefined) return pending.action;
  }
  if (runtimeAction !== undefined) return runtimeAction;

  const pending = deriveActualPendingDecision(state);
  if (pending !== undefined) return pending.action;

  if (
    state.assignments.some(
      ({ scopeId, state: assignment }) =>
        assignment.participantId === state.participantId &&
        !isScopedModulePrerequisiteBlocked(
          state,
          scopeId,
          assignment.moduleId,
        ) &&
        isUnstartedAssignmentAvailable(assignment),
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
  const runtime = selectJourneyRuntime(state);
  const mandatoryPending =
    runtime !== undefined && !isModuleCompleted(state, runtime);
  const pendingActivity = mandatoryPending
    ? pendingModuleActivity(state, runtime)
    : undefined;
  if (pendingActivity?.nextAction === "AGUARDAR_CORRECAO") return undefined;
  if (
    mandatoryPending &&
    runtime.evaluation.activityProgress === "AGUARDA_CORRECAO_HUMANA"
  )
    return undefined;
  if (
    mandatoryPending &&
    (runtime.evaluation.activityProgress === "ATIVIDADES_PENDENTES" ||
      (pendingActivity !== undefined &&
        runtime.evaluation.nextAction !== "EXECUTAR_REMEDIACAO"))
  ) {
    const activity = pendingActivity;
    if (activity === undefined)
      return deriveActualPendingDecision(state)?.target;
    return activity.nextAction === "AGUARDAR_CORRECAO"
      ? undefined
      : Object.freeze({ kind: "ACTIVITY", activityId: activity.activityId });
  }
  const runtimeAction = runtime?.evaluation.nextAction;
  if (runtimeAction === "REVISAR_RETENCAO") {
    const pending = deriveActualPendingDecision(state);
    if (pending !== undefined) return pending.target;
  }
  if (runtimeAction === "EXECUTAR_REMEDIACAO" && runtime !== undefined) {
    const actionableStatuses = [
      "EM_REFORCO",
      "EM_ANDAMENTO",
      "DISPONIVEL",
    ] as const;
    const activity = actionableStatuses
      .map((status) =>
        [...state.activities].sort(compareAuthorizedActivities).find(
          (candidate) =>
            isAuthorizedModuleActivity(
              state,
              {
                scopeId: runtime.scopeId,
                moduleId: runtime.evaluation.moduleId,
              },
              candidate,
            ) && candidate.status === status,
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

  return deriveActualPendingDecision(state)?.target;
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
    ) ||
    (state.completionReceipts ?? []).some(
      (receipt) =>
        !allowedScopes.has(receipt.scopeId) ||
        receipt.participantId !== command.participantId,
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
    ...(state.completionReceipts === undefined
      ? {}
      : {
          completionReceipts: Object.freeze(
            state.completionReceipts.map((receipt) =>
              Object.freeze({ ...receipt }),
            ),
          ),
        }),
    ...(state.boundAssignmentIds === undefined
      ? {}
      : {
          boundAssignmentIds: Object.freeze([...state.boundAssignmentIds]),
        }),
  } satisfies Omit<ParticipantLearningJourneyState, "nextAction">;

  const nextActionTarget = deriveJourneyNextActionTarget(cloned);
  return Object.freeze({
    ...cloned,
    nextAction: deriveJourneyNextAction(cloned),
    ...(nextActionTarget === undefined ? {} : { nextActionTarget }),
  });
}
