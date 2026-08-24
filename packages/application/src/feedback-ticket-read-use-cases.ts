import type { FeedbackTicketState } from "@cvg/domain";

import { ApplicationError } from "./errors.js";

export type ParticipantFeedbackReadRecord = Readonly<{
  readonly scopeId: string;
  readonly state: FeedbackTicketState;
}>;

export type ParticipantFeedbackReadCommand = Readonly<{
  readonly participantId: string;
  readonly scopeIds: readonly string[];
}>;

export interface ParticipantFeedbackReadPort {
  readonly listFeedbackTickets: (
    participantId: string,
    scopeIds: readonly string[],
  ) => Promise<readonly ParticipantFeedbackReadRecord[]>;
}

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

export async function getParticipantFeedback(
  command: ParticipantFeedbackReadCommand,
  port: ParticipantFeedbackReadPort,
): Promise<readonly FeedbackTicketState[]> {
  assertNonEmpty(command.participantId, "participantId");
  if (
    !Array.isArray(command.scopeIds) ||
    command.scopeIds.length > 100 ||
    command.scopeIds.some((scopeId) => {
      try {
        assertNonEmpty(scopeId, "scopeId");
        return false;
      } catch {
        return true;
      }
    })
  ) {
    throw new ApplicationError("validation_error", "scopeIds are invalid");
  }

  const records = await port.listFeedbackTickets(command.participantId, [
    ...new Set(command.scopeIds),
  ]);
  if (
    records.some(
      ({ scopeId, state }) =>
        !command.scopeIds.includes(scopeId) ||
        state.participantId !== command.participantId,
    )
  ) {
    throw new ApplicationError(
      "internal_error",
      "Feedback read port returned an invalid scope",
    );
  }
  return Object.freeze(
    records
      .map(({ state }) => state)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 100),
  );
}
