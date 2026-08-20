"use client";

import type {
  ExperienceState,
  LearningJourneyProjection,
} from "./participant-model";
import { nextActionLabel } from "./participant-model";

type ParticipantJourneyViewProps = Readonly<{
  readonly journeyState: ExperienceState;
  readonly journey: LearningJourneyProjection | null;
  readonly busy: boolean;
  readonly refreshJourney: () => Promise<void>;
  readonly handleRetry: () => void;
}>;

export function ParticipantJourneyView({
  journeyState,
  journey,
  busy,
  refreshJourney,
  handleRetry,
}: ParticipantJourneyViewProps) {
  return journeyState === "empty" ? (
    <section
      className="hero-card empty-state"
      data-testid="empty-state"
      aria-labelledby="empty-title"
    >
      <div className="hero-copy">
        <p className="eyebrow">Sessão ativa</p>
        <h1 id="empty-title">Nenhuma atividade atribuída</h1>
        <p>
          Sua sessão está ativa, mas ainda não há um módulo disponível. Atualize
          a jornada quando a equipe liberar o próximo conteúdo.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void refreshJourney()}
        disabled={busy}
      >
        Atualizar jornada
      </button>
    </section>
  ) : journeyState === "error" ? (
    <section className="hero-card" aria-labelledby="journey-error-title">
      <div className="hero-copy">
        <p className="eyebrow">Sessão ativa</p>
        <h1 id="journey-error-title">Jornada indisponível</h1>
        <p>
          Não conseguimos atualizar as atividades agora. Sua sessão permanece
          protegida; tente novamente em instantes.
        </p>
      </div>
      <button type="button" onClick={handleRetry} disabled={busy}>
        Tentar novamente
      </button>
    </section>
  ) : (
    <section className="hero-card" aria-labelledby="active-title">
      <div className="hero-copy">
        <p className="eyebrow">Sessão ativa</p>
        <h1 id="active-title">Acesso ativado</h1>
        <p>
          {journey === null
            ? "Abra uma atividade atribuída para continuar seu treinamento."
            : "Sua jornada está pronta para orientar o próximo passo."}
        </p>
      </div>
      {journey !== null ? (
        <div className="journey-summary" aria-label="Minha jornada">
          <p className="eyebrow">Minha jornada</p>
          <h2>{nextActionLabel(journey.nextAction)}</h2>
          {journey.activities.length === 0 ? (
            <p className="journey-item">Nenhuma atividade atribuída.</p>
          ) : (
            journey.activities.slice(0, 3).map((item) => (
              <p className="journey-item" key={item.activityId}>
                {item.title} · {nextActionLabel(item.nextAction)}
              </p>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}
