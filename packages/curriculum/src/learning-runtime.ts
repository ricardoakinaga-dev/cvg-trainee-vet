import { freeze, LearningRuntimeError } from "./learning-runtime-types.js";
import type { ModuleEvaluationResult } from "./learning-runtime-types.js";

export * from "./learning-runtime-types.js";
export * from "./learning-runtime-content.js";
export * from "./learning-runtime-evaluation.js";
export * from "./learning-runtime-preflight.js";

export function createInitialModuleEvaluation(
  moduleId: string,
): ModuleEvaluationResult {
  if (!/^M(?:0[1-9]|1[0-9]|2[0-4])$/u.test(moduleId)) {
    throw new LearningRuntimeError("moduleId is invalid");
  }
  return freeze({
    moduleId,
    status: "PENDENTE",
    nextAction: "INICIAR_BASELINE",
    objectiveResults: freeze([]),
    remediationObjectiveIds: freeze([]),
    criticalErrorItemIds: freeze([]),
    invalidAnswerItemIds: freeze([]),
    unansweredChoiceItemIds: freeze([]),
    openResponseItemIds: freeze([]),
    retentionReviews: freeze([]),
    practicalCompetenceClaim: "PROIBIDO_MVP",
  });
}
