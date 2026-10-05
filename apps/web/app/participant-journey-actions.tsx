import type {
  JourneyActivityProjection,
  LearningJourneyProjection,
} from "./participant-contracts";

export function authorizedJourneyTarget(
  activities: readonly JourneyActivityProjection[],
  nextAction: string,
  target: LearningJourneyProjection["nextActionTarget"],
): JourneyActivityProjection | undefined {
  if (
    !["INICIAR_ATIVIDADE", "RETOMAR_ATIVIDADE", "EXECUTAR_REMEDIACAO"].includes(
      nextAction,
    ) ||
    target?.kind !== "ACTIVITY"
  )
    return undefined;
  return activities.find(
    (activity) => activity.activityId === target.activityId,
  );
}

export function ParticipantJourneyActions({
  activities,
  nextAction,
  nextActionTarget,
  busy,
  onSelect,
  actionLabel,
}: Readonly<{
  activities: readonly JourneyActivityProjection[];
  nextAction: string;
  nextActionTarget: LearningJourneyProjection["nextActionTarget"];
  busy: boolean;
  onSelect: (activityId: string) => Promise<void>;
  actionLabel: (action: string) => string;
}>) {
  const target = authorizedJourneyTarget(
    activities,
    nextAction,
    nextActionTarget,
  );
  return (
    <>
      {target !== undefined ? (
        <div className="journey-activity-item" aria-label="Próxima atividade">
          <strong>{target.title}</strong>
          <button
            type="button"
            className="button-link"
            aria-label={`Abrir atividade: ${target.title}`}
            disabled={busy}
            onClick={() => void onSelect(target.activityId)}
          >
            Abrir atividade
          </button>
        </div>
      ) : null}
      {activities.length === 0 ? (
        <p className="journey-item">Nenhuma atividade atribuída.</p>
      ) : (
        <ul
          className="journey-activity-list"
          aria-label="Atividades da jornada"
        >
          {activities.slice(0, 3).map((item) => (
            <li className="journey-activity-item" key={item.activityId}>
              <div>
                <strong>{item.title}</strong>
                <span>{actionLabel(item.nextAction)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
