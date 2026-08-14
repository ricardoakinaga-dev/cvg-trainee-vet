import {
  advanceDigitalCase,
  createInitialDigitalCaseState,
  getModuleDraftPack,
  projectPublicDigitalCaseRuntime,
  type PublicDigitalCaseRuntimeState,
  type DigitalCaseRuntimeState,
} from "@cvg/curriculum";

import { ApplicationError } from "./errors.js";

export type DigitalCaseRuntimeRecord = Readonly<{
  readonly participantId: string;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly state: DigitalCaseRuntimeState;
}>;

export type DigitalCaseRuntimeWriteInput = Readonly<
  DigitalCaseRuntimeRecord & {
    readonly expectedVersion: number;
  }
>;

export interface DigitalCaseRuntimeReadPort {
  readonly findDigitalCaseRuntime: (
    participantId: string,
    scopeId: string,
    moduleId: string,
  ) => Promise<DigitalCaseRuntimeRecord | null>;
}

export interface DigitalCaseRuntimeRepositoryPort extends DigitalCaseRuntimeReadPort {
  readonly saveDigitalCaseRuntime: (
    input: DigitalCaseRuntimeWriteInput,
  ) => Promise<DigitalCaseRuntimeRecord>;
}

export type GetParticipantDigitalCaseCommand = Readonly<{
  readonly participantId: string;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly now: string;
}>;

export type AdvanceParticipantDigitalCaseCommand = Readonly<{
  readonly participantId: string;
  readonly scopeId: string;
  readonly moduleId: string;
  readonly selectedChoiceIds: readonly string[];
  readonly expectedVersion: number;
  readonly now: string;
}>;

export function projectParticipantDigitalCaseRuntime(
  record: DigitalCaseRuntimeRecord,
): PublicDigitalCaseRuntimeState {
  const definition = definitionFor(record.moduleId);
  return projectPublicDigitalCaseRuntime(definition, record.state);
}

function assertNonEmpty(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function assertModuleId(value: string): void {
  assertNonEmpty(value, "moduleId");
  if (!/^M(?:0[1-9]|1[0-9]|2[0-4])$/u.test(value)) {
    throw new ApplicationError("validation_error", "moduleId is invalid");
  }
}

function assertTimestamp(value: string): void {
  assertNonEmpty(value, "now");
  if (Number.isNaN(new Date(value).getTime())) {
    throw new ApplicationError("validation_error", "now is invalid");
  }
}

function assertExpectedVersion(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new ApplicationError(
      "validation_error",
      "expectedVersion must be a non-negative integer",
    );
  }
}

function assertSelectedChoiceIds(choiceIds: readonly string[]): void {
  if (
    choiceIds.length < 1 ||
    choiceIds.length > 8 ||
    choiceIds.some(
      (choiceId) =>
        typeof choiceId !== "string" || choiceId.trim().length === 0,
    ) ||
    new Set(choiceIds).size !== choiceIds.length
  ) {
    throw new ApplicationError(
      "validation_error",
      "selectedChoiceIds are invalid",
    );
  }
}

function definitionFor(moduleId: string) {
  try {
    return getModuleDraftPack(moduleId).learningLoop.digitalCase;
  } catch {
    throw new ApplicationError(
      "validation_error",
      "digital case definition is unavailable",
    );
  }
}

function mapInteractionError(error: unknown): never {
  if (error instanceof Error && error.name === "LearningInteractionError") {
    if (/stale|already completed|state changed/iu.test(error.message)) {
      throw new ApplicationError("state_conflict", "Digital case changed");
    }
    throw new ApplicationError(
      "validation_error",
      "Digital case transition is invalid",
    );
  }
  throw error;
}

function assertRecordScope(
  record: DigitalCaseRuntimeRecord,
  command: Readonly<{
    participantId: string;
    scopeId: string;
    moduleId: string;
  }>,
): void {
  if (
    record.participantId !== command.participantId ||
    record.scopeId !== command.scopeId ||
    record.moduleId !== command.moduleId
  ) {
    throw new ApplicationError(
      "forbidden",
      "Digital case state is outside the current scope",
    );
  }
}

export async function getParticipantDigitalCase(
  command: GetParticipantDigitalCaseCommand,
  repository: DigitalCaseRuntimeReadPort,
): Promise<DigitalCaseRuntimeRecord> {
  assertNonEmpty(command.participantId, "participantId");
  assertNonEmpty(command.scopeId, "scopeId");
  assertModuleId(command.moduleId);
  assertTimestamp(command.now);

  const definition = definitionFor(command.moduleId);
  const persisted = await repository.findDigitalCaseRuntime(
    command.participantId,
    command.scopeId,
    command.moduleId,
  );
  if (persisted !== null) {
    assertRecordScope(persisted, command);
    return Object.freeze({ ...persisted });
  }

  return Object.freeze({
    participantId: command.participantId,
    scopeId: command.scopeId,
    moduleId: command.moduleId,
    state: createInitialDigitalCaseState(definition, command.now),
  });
}

export async function advanceParticipantDigitalCase(
  command: AdvanceParticipantDigitalCaseCommand,
  repository: DigitalCaseRuntimeRepositoryPort,
): Promise<DigitalCaseRuntimeRecord> {
  assertNonEmpty(command.participantId, "participantId");
  assertNonEmpty(command.scopeId, "scopeId");
  assertModuleId(command.moduleId);
  assertTimestamp(command.now);
  assertExpectedVersion(command.expectedVersion);
  assertSelectedChoiceIds(command.selectedChoiceIds);

  const definition = definitionFor(command.moduleId);
  const persisted = await repository.findDigitalCaseRuntime(
    command.participantId,
    command.scopeId,
    command.moduleId,
  );
  if (persisted !== null) assertRecordScope(persisted, command);

  const current =
    persisted?.state ?? createInitialDigitalCaseState(definition, command.now);
  if (current.version !== command.expectedVersion) {
    throw new ApplicationError("state_conflict", "Digital case changed");
  }

  let nextState: DigitalCaseRuntimeState;
  try {
    nextState = advanceDigitalCase(definition, current, {
      selectedChoiceIds: [...command.selectedChoiceIds],
      expectedVersion: command.expectedVersion,
      now: command.now,
    });
  } catch (error) {
    mapInteractionError(error);
  }

  try {
    const saved = await repository.saveDigitalCaseRuntime({
      participantId: command.participantId,
      scopeId: command.scopeId,
      moduleId: command.moduleId,
      expectedVersion: command.expectedVersion,
      state: nextState,
    });
    assertRecordScope(saved, command);
    return Object.freeze({ ...saved });
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    if (error instanceof Error && /conflict|version/iu.test(error.name)) {
      throw new ApplicationError("state_conflict", "Digital case changed");
    }
    throw error;
  }
}
