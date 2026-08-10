import type { CorrectionResult } from "./correction-use-cases.js";

export type GetAttemptFeedbackCommand = Readonly<{
  readonly participantId: string;
  readonly attemptId: string;
}>;

export interface FeedbackReadPort {
  readonly findByParticipantAndAttempt: (
    participantId: string,
    attemptId: string,
  ) => Promise<CorrectionResult | null>;
}

export async function getAttemptFeedback(
  command: GetAttemptFeedbackCommand,
  repository: FeedbackReadPort,
): Promise<CorrectionResult | null> {
  if (command.participantId.trim().length === 0) {
    throw new TypeError("participantId is required");
  }
  if (command.attemptId.trim().length === 0) {
    throw new TypeError("attemptId is required");
  }
  return repository.findByParticipantAndAttempt(
    command.participantId,
    command.attemptId,
  );
}
