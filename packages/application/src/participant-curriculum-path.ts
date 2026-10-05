import {
  buildPersonalizedCurriculumPath,
  type PersonalizedPathItem,
} from "@cvg/curriculum";
import {
  hasCoherentModuleCompletion,
  type ModuleAuthorityFacts,
} from "./journey-module-authority.js";
import type { CurriculumRuntimeState } from "./curriculum-runtime-use-cases.js";
import { selectCurrentJourneyRuntimes } from "./journey-runtime-selection.js";
import {
  isAssignmentOperationallyAvailable,
  isUnstartedAssignmentAvailable,
} from "./journey-assignment-eligibility.js";
import type { ScopedLearningAssignment } from "./learning-state-use-cases.js";

type CurriculumPathFacts = ModuleAuthorityFacts &
  Readonly<{
    runtimes: readonly CurriculumRuntimeState[];
  }>;

function applyAssignmentAvailability(
  item: PersonalizedPathItem,
  assignments: readonly ScopedLearningAssignment[],
  prerequisitePath: readonly PersonalizedPathItem[],
): PersonalizedPathItem {
  const available = assignments.some(({ state }) =>
    isAssignmentOperationallyAvailable(state),
  );
  if (!available) {
    const status = assignments.some(({ state }) => state.status === "BLOQUEADO")
      ? "BLOQUEADO"
      : assignments.some(({ state }) => state.status === "PAUSADO")
        ? "PAUSADO"
        : undefined;
    if (status !== undefined) {
      return Object.freeze({
        ...item,
        status,
        nextAction: "CONSULTAR_PROXIMO_PASSO",
      });
    }
  }
  const notStarted = assignments.some(({ state }) =>
    ["ATRIBUIDO", "DISPONIVEL"].includes(state.status),
  );
  const started = assignments.some(({ state }) =>
    [
      "EM_ANDAMENTO",
      "EM_REFORCO",
      "CONCLUIDO",
      "CONCLUIDO_COM_RETENCAO_PENDENTE",
    ].includes(state.status),
  );
  if (notStarted && !started && !available) {
    return Object.freeze({
      ...item,
      status: "NAO_ATRIBUIDO",
      nextAction: "AGUARDAR_ATRIBUICAO",
    });
  }
  const blocked = prerequisitePath.find(
    (prerequisite) =>
      prerequisite.moduleId === item.moduleId &&
      prerequisite.status === "BLOQUEADO_PRE_REQUISITO",
  );
  return notStarted && !started && blocked !== undefined ? blocked : item;
}

function buildScopePath(
  journey: CurriculumPathFacts,
): readonly PersonalizedPathItem[] {
  const assignedModuleIds = journey.assignments
    .filter(
      ({ state }) =>
        !["ATRIBUIDO", "DISPONIVEL"].includes(state.status) ||
        isUnstartedAssignmentAvailable(state),
    )
    .map(({ state: assignment }) => assignment.moduleId);
  const completedModuleIds = journey.assignments
    .filter(({ scopeId, state: assignment }) =>
      hasCoherentModuleCompletion(journey, scopeId, assignment.moduleId),
    )
    .map(({ state: assignment }) => assignment.moduleId);
  const prerequisitePath = buildPersonalizedCurriculumPath({
    assignedModuleIds,
    completedModuleIds,
    masteredModuleIds: [],
    remediationModuleIds: [],
    retentionDueModuleIds: [],
  });
  const masteredModuleIds: string[] = [];
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
        assignment.status === "CONCLUIDO_COM_RETENCAO_PENDENTE" &&
        completedModuleIds.includes(assignment.moduleId),
    )
    .map(({ state: assignment }) => assignment.moduleId);
  const inProgressModuleIds = journey.assignments
    .filter(({ state: assignment }) => assignment.status === "EM_ANDAMENTO")
    .map(({ state: assignment }) => assignment.moduleId);

  for (const activity of journey.activities) {
    if (
      activity.moduleId !== undefined &&
      ["EM_ANDAMENTO", "EM_REFORCO"].includes(activity.status) &&
      ["INICIAR_ATIVIDADE", "RETOMAR_ATIVIDADE", "AGUARDAR_CORRECAO"].includes(
        activity.nextAction,
      ) &&
      !completedModuleIds.includes(activity.moduleId) &&
      journey.assignments.some(
        ({ scopeId, state: assignment }) =>
          scopeId === activity.scopeId &&
          assignment.participantId === journey.participantId &&
          assignment.moduleId === activity.moduleId &&
          assignment.assignmentId === activity.learningAssignmentId &&
          ([
            "EM_ANDAMENTO",
            "EM_REFORCO",
            "CONCLUIDO",
            "CONCLUIDO_COM_RETENCAO_PENDENTE",
          ].includes(assignment.status) ||
            prerequisitePath.find((item) => item.moduleId === activity.moduleId)
              ?.status === "DISPONIVEL"),
      )
    )
      inProgressModuleIds.push(activity.moduleId);
  }

  for (const runtime of selectCurrentJourneyRuntimes(
    journey.participantId,
    journey.runtimes,
  )) {
    const moduleId = runtime.evaluation.moduleId;
    if (runtime.evaluation.status === "DOMINIO_DIGITAL") {
      masteredModuleIds.push(moduleId);
    }
    const mandatoryActivitiesPending =
      runtime.evaluation.activityProgress !== undefined ||
      inProgressModuleIds.includes(moduleId);
    if (mandatoryActivitiesPending && !completedModuleIds.includes(moduleId))
      inProgressModuleIds.push(moduleId);
    if (runtime.evaluation.status === "EM_REMEDIACAO") {
      remediationModuleIds.push(moduleId);
    }
    if (
      (!mandatoryActivitiesPending || completedModuleIds.includes(moduleId)) &&
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
    completedModuleIds,
    remediationModuleIds,
    retentionDueModuleIds,
    inProgressModuleIds,
    assignedModuleIds,
  });

  return path.map((item) => {
    const assignments = journey.assignments.filter(
      ({ state }) =>
        state.participantId === journey.participantId &&
        state.moduleId === item.moduleId,
    );
    return applyAssignmentAvailability(item, assignments, prerequisitePath);
  });
}

const statusPriority: Readonly<Record<PersonalizedPathItem["status"], number>> =
  {
    EM_REMEDIACAO: 0,
    EM_ANDAMENTO: 1,
    BLOQUEADO_PRE_REQUISITO: 2,
    RETENCAO_PENDENTE: 3,
    DISPONIVEL: 4,
    CONCLUIDO: 5,
    PAUSADO: 6,
    BLOQUEADO: 7,
    NAO_ATRIBUIDO: 8,
  };

export function buildParticipantCurriculumPath<T extends CurriculumPathFacts>(
  journey: T,
): readonly PersonalizedPathItem[] {
  const scopes = new Set(
    [...journey.assignments, ...journey.activities, ...journey.runtimes].map(
      (item) => item.scopeId,
    ),
  );
  const scopedPaths = [...scopes].map((scopeId) =>
    buildScopePath({
      ...journey,
      assignments: journey.assignments.filter(
        (item) => item.scopeId === scopeId,
      ),
      activities: journey.activities.filter((item) => item.scopeId === scopeId),
      runtimes: journey.runtimes.filter((item) => item.scopeId === scopeId),
    }),
  );
  const baseline = buildScopePath({
    ...journey,
    assignments: [],
    activities: [],
    runtimes: [],
  });
  return Object.freeze(
    baseline.map((module) => {
      const assigned = scopedPaths.flatMap((path) =>
        path.filter(
          (item) =>
            item.moduleId === module.moduleId &&
            item.status !== "NAO_ATRIBUIDO",
        ),
      );
      assigned.sort(
        (left, right) =>
          statusPriority[left.status] - statusPriority[right.status],
      );
      return assigned[0] ?? module;
    }),
  );
}
