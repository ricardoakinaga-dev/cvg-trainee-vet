import type { AnswerState, AttemptState } from "@cvg/domain";
import { ApplicationError } from "./errors.js";

export type ParticipantAttemptSnapshot = Readonly<{
  attempt: AttemptState;
  answers: readonly AnswerState[];
}>;

export interface ParticipantAttemptReadPort {
  findOwnAttempt(
    participantId: string,
    attemptId: string,
  ): Promise<ParticipantAttemptSnapshot | null>;
}

export async function getParticipantAttempt(
  participantId: string,
  attemptId: string,
  repository: ParticipantAttemptReadPort,
): Promise<ParticipantAttemptSnapshot> {
  const snapshot = await repository.findOwnAttempt(participantId, attemptId);
  if (
    snapshot === null ||
    snapshot.attempt.participantId !== participantId ||
    snapshot.attempt.attemptId !== attemptId
  ) {
    throw new ApplicationError("not_found", "Attempt is not available");
  }
  if (snapshot.answers.some((answer) => answer.attemptId !== attemptId)) {
    throw new ApplicationError("internal_error", "Invalid answer ownership");
  }
  return Object.freeze({
    attempt: snapshot.attempt,
    answers: Object.freeze([...snapshot.answers]),
  });
}
