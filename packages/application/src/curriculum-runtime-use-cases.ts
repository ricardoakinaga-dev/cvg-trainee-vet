import {
  evaluateModuleAttempt,
  type ModuleAnswer,
  type ModuleEvaluationMode,
  type ModuleEvaluationResult,
} from "@cvg/curriculum";

import { ApplicationError } from "./errors.js";

export type CurriculumRuntimeState = Readonly<{
  readonly participantId: string;
  readonly scopeId: string;
  readonly version: number;
  readonly updatedAt: string;
  readonly evaluation: ModuleEvaluationResult;
}>;

export type CurriculumRuntimeWriteInput = Readonly<{
  readonly participantId: string;
  readonly scopeId: string;
  readonly evaluation: ModuleEvaluationResult;
}>;

export interface CurriculumRuntimeWritePort {
  readonly saveCurriculumRuntime: (
    input: CurriculumRuntimeWriteInput,
  ) => Promise<CurriculumRuntimeState>;
}

export interface CurriculumRuntimeReadPort {
  readonly findCurriculumRuntime: (
    participantId: string,
    moduleId: string,
  ) => Promise<CurriculumRuntimeState | null>;
}

export type EvaluateCurriculumModuleCommand = Readonly<{
  readonly participantId: string;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly answers: readonly ModuleAnswer[];
  readonly completedAt: string;
  readonly mode?: ModuleEvaluationMode;
}>;

export type GetParticipantCurriculumRuntimeCommand = Readonly<{
  readonly participantId: string;
  readonly moduleId: string;
}>;

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function assertModuleId(value: string): void {
  assertNonEmpty(value, "moduleId");
  if (!/^M(?:0[1-9]|1[0-9]|2[0-4])$/u.test(value)) {
    throw new ApplicationError("validation_error", "moduleId is invalid");
  }
}

export async function evaluateAndPersistCurriculumModule(
  command: EvaluateCurriculumModuleCommand,
  repository: CurriculumRuntimeWritePort,
): Promise<CurriculumRuntimeState> {
  assertNonEmpty(command.participantId, "participantId");
  assertNonEmpty(command.scopeId, "scopeId");
  assertModuleId(command.moduleId);

  const evaluation = evaluateModuleAttempt({
    moduleId: command.moduleId,
    answers: command.answers,
    completedAt: command.completedAt,
    ...(command.mode === undefined ? {} : { mode: command.mode }),
  });
  return repository.saveCurriculumRuntime(
    Object.freeze({
      participantId: command.participantId,
      scopeId: command.scopeId,
      evaluation,
    }),
  );
}

export async function getParticipantCurriculumRuntime(
  command: GetParticipantCurriculumRuntimeCommand,
  repository: CurriculumRuntimeReadPort,
): Promise<CurriculumRuntimeState> {
  assertNonEmpty(command.participantId, "participantId");
  assertModuleId(command.moduleId);
  const state = await repository.findCurriculumRuntime(
    command.participantId,
    command.moduleId,
  );
  if (state === null) {
    throw new ApplicationError(
      "not_found",
      "Curriculum runtime state was not found in the current scope",
    );
  }
  if (state.participantId !== command.participantId) {
    throw new ApplicationError(
      "forbidden",
      "Curriculum runtime state is outside the current scope",
    );
  }
  return Object.freeze({
    ...state,
    evaluation: Object.freeze({
      ...state.evaluation,
      objectiveResults: Object.freeze([...state.evaluation.objectiveResults]),
      remediationObjectiveIds: Object.freeze([
        ...state.evaluation.remediationObjectiveIds,
      ]),
      criticalErrorItemIds: Object.freeze([
        ...state.evaluation.criticalErrorItemIds,
      ]),
      invalidAnswerItemIds: Object.freeze([
        ...state.evaluation.invalidAnswerItemIds,
      ]),
      unansweredChoiceItemIds: Object.freeze([
        ...state.evaluation.unansweredChoiceItemIds,
      ]),
      openResponseItemIds: Object.freeze([
        ...state.evaluation.openResponseItemIds,
      ]),
      retentionReviews: Object.freeze([...state.evaluation.retentionReviews]),
    }),
  });
}
