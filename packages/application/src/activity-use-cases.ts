import { ApplicationError } from "./errors.js";

export type ParticipantActivityChoice = Readonly<{
  readonly id: string;
  readonly label: string;
  readonly text: string;
}>;

export type ParticipantActivityItem = Readonly<{
  readonly itemId: string;
  readonly ordinal: number;
  readonly kind: "LEITURA" | "QUESTAO" | "CASO" | "REFLEXAO";
  readonly title: string;
  readonly text: string;
  readonly responseMode: "TEXT" | "CHOICE" | "NONE";
  readonly choices?: readonly ParticipantActivityChoice[];
  readonly selectionMode?: "SINGLE" | "MULTIPLE";
}>;

export type ParticipantActivityState = Readonly<{
  readonly activityId: string;
  readonly scopeId: string;
  readonly slug: string;
  readonly title: string;
  readonly items: readonly ParticipantActivityItem[];
}>;

export type GetParticipantActivityCommand = Readonly<{
  readonly participantId: string;
  readonly activityId: string;
}>;

export interface ActivityReadPort {
  readonly findParticipantActivity: (
    participantId: string,
    activityId: string,
  ) => Promise<ParticipantActivityState | null>;
}

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

export async function getParticipantActivity(
  command: GetParticipantActivityCommand,
  repository: ActivityReadPort,
): Promise<ParticipantActivityState> {
  assertNonEmpty(command.participantId, "participantId");
  assertNonEmpty(command.activityId, "activityId");
  const activity = await repository.findParticipantActivity(
    command.participantId,
    command.activityId,
  );
  if (activity === null) {
    throw new ApplicationError(
      "not_found",
      "Activity is not available in the current scope",
    );
  }

  return Object.freeze({
    ...activity,
    items: Object.freeze(
      activity.items.map((item) => Object.freeze({ ...item })),
    ),
  });
}
