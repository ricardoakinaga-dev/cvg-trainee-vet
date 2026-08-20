import type { ModeratorDashboard } from "./moderator-model";

export function ModeratorHeader(): React.JSX.Element {
  return (
    <header className="topbar" aria-label="Moderação">
      <div>
        <p className="eyebrow">CVG · moderação</p>
        <span className="brand">Fila de acompanhamento</span>
      </div>
      <span className="status-pill">Acesso restrito</span>
    </header>
  );
}

export function ModeratorHero(): React.JSX.Element {
  return (
    <section className="hero-card" aria-labelledby="moderator-title">
      <p className="eyebrow">Trabalho atribuído</p>
      <h1 id="moderator-title">Painel do moderador</h1>
      <p>
        Veja somente participantes e filas atribuídos ao seu escopo. Este painel
        não valida prática clínica nem substitui revisão humana.
      </p>
    </section>
  );
}

export function ModeratorSummary({
  summary,
}: Readonly<{ summary: ModeratorDashboard["summary"] }>): React.JSX.Element {
  return (
    <section
      className="admin-dashboard-card"
      aria-labelledby="moderator-summary-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">Resumo operacional</p>
          <h2 id="moderator-summary-title">Prioridades da fila</h2>
        </div>
        <span className="status-pill">Prática: indisponível</span>
      </div>
      <div className="admin-summary-grid">
        <div>
          <span>Participantes</span>
          <strong>{summary.participantsTotal}</strong>
          <small>Com trabalho atribuído</small>
        </div>
        <div>
          <span>Correções pendentes</span>
          <strong>{summary.correctionPending}</strong>
          <small>{summary.overdueQueues} fila(s) vencida(s)</small>
        </div>
        <div>
          <span>Feedback aberto</span>
          <strong>{summary.feedbackOpen}</strong>
          <small>{summary.technicalFailures} falha(s) técnica(s)</small>
        </div>
        <div>
          <span>Validação prática</span>
          <strong>Não disponível</strong>
          <small>Sem alegação de competência clínica</small>
        </div>
      </div>
    </section>
  );
}

export function ModeratorQueues({
  queues,
}: Readonly<{ queues: ModeratorDashboard["queues"] }>): React.JSX.Element {
  return (
    <section className="admin-dashboard-card" aria-labelledby="queues-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Filas atribuídas</p>
          <h2 id="queues-title">Correção e feedback</h2>
        </div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Fila</th>
              <th scope="col">Escopo</th>
              <th scope="col">Abertos</th>
              <th scope="col">Vencidos</th>
            </tr>
          </thead>
          <tbody>
            {queues.length === 0 ? (
              <tr>
                <td colSpan={4}>Nenhuma fila atribuída.</td>
              </tr>
            ) : (
              queues.map((queue) => (
                <tr key={queue.queueId}>
                  <td>{queue.kind}</td>
                  <td>{queue.scopeId}</td>
                  <td>{queue.openCount}</td>
                  <td>{queue.overdueCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ModeratorParticipants({
  participants,
}: Readonly<{
  participants: ModeratorDashboard["participants"];
}>): React.JSX.Element {
  return (
    <section
      className="admin-dashboard-card"
      aria-labelledby="participants-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">Acompanhamento restrito</p>
          <h2 id="participants-title">Participantes atribuídos</h2>
        </div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Participante</th>
              <th scope="col">Progresso</th>
              <th scope="col">Lacunas</th>
              <th scope="col">Reforço digital</th>
            </tr>
          </thead>
          <tbody>
            {participants.length === 0 ? (
              <tr>
                <td colSpan={4}>Nenhum participante atribuído.</td>
              </tr>
            ) : (
              participants.map((participant) => (
                <tr key={participant.participantId}>
                  <td>
                    <strong>{participant.professionalEmail}</strong>
                    <small>{participant.nextAction}</small>
                  </td>
                  <td>{participant.progressPercent}%</td>
                  <td>
                    {participant.gapCount} ·{" "}
                    {participant.correctionPendingCount} correção(ões)
                  </td>
                  <td>
                    {participant.digitalReinforcementPlan.length === 0
                      ? "Sem objetivo pendente"
                      : participant.digitalReinforcementPlan.join(", ")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ModeratorDashboardView({
  dashboard,
}: Readonly<{ dashboard: ModeratorDashboard }>): React.JSX.Element {
  return (
    <>
      <ModeratorSummary summary={dashboard.summary} />
      <ModeratorQueues queues={dashboard.queues} />
      <ModeratorParticipants participants={dashboard.participants} />
    </>
  );
}
