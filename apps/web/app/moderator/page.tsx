"use client";

import { useEffect, useState } from "react";

type ModeratorDashboard = Readonly<{
  readonly practiceValidation: "NOT_AVAILABLE";
  readonly summary: Readonly<{
    readonly participantsTotal: number;
    readonly correctionPending: number;
    readonly feedbackOpen: number;
    readonly technicalFailures: number;
    readonly overdueQueues: number;
  }>;
  readonly queues: readonly Readonly<{
    readonly queueId: string;
    readonly scopeId: string;
    readonly kind: string;
    readonly openCount: number;
    readonly overdueCount: number;
  }>[];
  readonly participants: readonly Readonly<{
    readonly participantId: string;
    readonly professionalEmail: string;
    readonly progressPercent: number;
    readonly nextAction: string;
    readonly gapCount: number;
    readonly remediationObjectiveIds: readonly string[];
    readonly correctionPendingCount: number;
    readonly feedbackOpenCount: number;
    readonly technicalFailureCount: number;
    readonly digitalReinforcementPlan: readonly string[];
  }>[];
}>;

type ApiRecord = Readonly<Record<string, unknown>>;
const apiBase = process.env.NEXT_PUBLIC_CVG_API_BASE_URL ?? "";

function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isModeratorDashboard(value: unknown): value is ModeratorDashboard {
  if (!isRecord(value) || value.practiceValidation !== "NOT_AVAILABLE") {
    return false;
  }
  const summary = value.summary;
  if (!isRecord(summary) || !Array.isArray(value.queues)) {
    return false;
  }
  const summaryFields = [
    "participantsTotal",
    "correctionPending",
    "feedbackOpen",
    "technicalFailures",
    "overdueQueues",
  ] as const;
  return (
    summaryFields.every((field) => typeof summary[field] === "number") &&
    value.queues.every(
      (queue) =>
        isRecord(queue) &&
        typeof queue.queueId === "string" &&
        typeof queue.scopeId === "string" &&
        typeof queue.kind === "string" &&
        typeof queue.openCount === "number" &&
        typeof queue.overdueCount === "number",
    ) &&
    Array.isArray(value.participants) &&
    value.participants.every(
      (participant) =>
        isRecord(participant) &&
        typeof participant.participantId === "string" &&
        typeof participant.professionalEmail === "string" &&
        typeof participant.progressPercent === "number" &&
        typeof participant.nextAction === "string" &&
        typeof participant.gapCount === "number" &&
        Array.isArray(participant.remediationObjectiveIds) &&
        Array.isArray(participant.digitalReinforcementPlan) &&
        typeof participant.correctionPendingCount === "number" &&
        typeof participant.feedbackOpenCount === "number" &&
        typeof participant.technicalFailureCount === "number",
    )
  );
}

export default function ModeratorPage() {
  const [dashboard, setDashboard] = useState<ModeratorDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    setError(null);
    try {
      const response = await fetch(
        apiBase + "/api/v1/internal/moderator/dashboard",
        { credentials: "include", cache: "no-store" },
      );
      const payload: unknown = await response.json().catch(() => null);
      if (
        !response.ok ||
        !isRecord(payload) ||
        payload.success !== true ||
        !isModeratorDashboard(payload.data)
      ) {
        throw new Error("moderator dashboard unavailable");
      }
      setDashboard(payload.data);
    } catch {
      setDashboard(null);
      setError("Não foi possível carregar as filas atribuídas.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="shell" id="main-content" tabIndex={-1}>
      <header className="topbar" aria-label="Moderação">
        <div>
          <p className="eyebrow">CVG · moderação</p>
          <span className="brand">Fila de acompanhamento</span>
        </div>
        <span className="status-pill">Acesso restrito</span>
      </header>

      <section className="hero-card" aria-labelledby="moderator-title">
        <p className="eyebrow">Trabalho atribuído</p>
        <h1 id="moderator-title">Painel do moderador</h1>
        <p>
          Veja somente participantes e filas atribuídos ao seu escopo. Este
          painel não valida prática clínica nem substitui revisão humana.
        </p>
      </section>

      {error !== null ? (
        <section className="admin-dashboard-card error-panel" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => void load()}>
            Tentar novamente
          </button>
        </section>
      ) : dashboard === null ? (
        <section className="admin-dashboard-card" role="status">
          Carregando filas atribuídas…
        </section>
      ) : (
        <>
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
                <strong>{dashboard.summary.participantsTotal}</strong>
                <small>Com trabalho atribuído</small>
              </div>
              <div>
                <span>Correções pendentes</span>
                <strong>{dashboard.summary.correctionPending}</strong>
                <small>
                  {dashboard.summary.overdueQueues} fila(s) vencida(s)
                </small>
              </div>
              <div>
                <span>Feedback aberto</span>
                <strong>{dashboard.summary.feedbackOpen}</strong>
                <small>
                  {dashboard.summary.technicalFailures} falha(s) técnica(s)
                </small>
              </div>
              <div>
                <span>Validação prática</span>
                <strong>Não disponível</strong>
                <small>Sem alegação de competência clínica</small>
              </div>
            </div>
          </section>

          <section
            className="admin-dashboard-card"
            aria-labelledby="queues-title"
          >
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
                  {dashboard.queues.length === 0 ? (
                    <tr>
                      <td colSpan={4}>Nenhuma fila atribuída.</td>
                    </tr>
                  ) : (
                    dashboard.queues.map((queue) => (
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
                  {dashboard.participants.length === 0 ? (
                    <tr>
                      <td colSpan={4}>Nenhum participante atribuído.</td>
                    </tr>
                  ) : (
                    dashboard.participants.map((participant) => (
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
        </>
      )}
    </main>
  );
}
