import type { AppealState } from "@cvg/domain";

import { ApplicationError } from "./errors.js";

export type ParticipantAppealReadContext = Readonly<{
  readonly participantId: string;
  readonly scopeId: string;
}>;

export type ScopedParticipantAppeal = Readonly<{
  readonly scopeId: string;
  readonly state: AppealState;
}>;

export interface ParticipantAppealReadPort {
  readonly listAppeals: (
    context: ParticipantAppealReadContext,
    attemptId: string,
  ) => Promise<readonly ScopedParticipantAppeal[]>;
}

export type GetParticipantAppealsCommand = Readonly<
  ParticipantAppealReadContext & {
    readonly attemptId: string;
  }
>;

function assertNonEmpty(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApplicationError(
      "validation_error",
      `${field} must not be empty`,
      [{ code: "invalid_input", field }],
    );
  }
}

export async function getParticipantAppeals(
  command: GetParticipantAppealsCommand,
  port: ParticipantAppealReadPort,
): Promise<readonly AppealState[]> {
  assertNonEmpty(command.participantId, "participantId");
  assertNonEmpty(command.scopeId, "scopeId");
  assertNonEmpty(command.attemptId, "attemptId");

  const scopedAppeals = await port.listAppeals(
    {
      participantId: command.participantId,
      scopeId: command.scopeId,
    },
    command.attemptId,
  );
  if (
    scopedAppeals.some(
      ({ scopeId, state }) =>
        scopeId !== command.scopeId ||
        state.participantId !== command.participantId ||
        state.attemptId !== command.attemptId,
    )
  ) {
    throw new ApplicationError(
      "internal_error",
      "Appeal read port returned an invalid scope",
    );
  }
  return Object.freeze(scopedAppeals.map(({ state }) => state));
}
