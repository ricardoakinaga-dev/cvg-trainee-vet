"use client";

import { useEffect, useState } from "react";

type DashboardModule = Readonly<{
  readonly moduleId: string;
  readonly month: number;
  readonly title: string;
  readonly competence: string;
  readonly sessionCount: 4;
  readonly status: string;
  readonly nextAction: string;
}>;

type DashboardRecommendation = Readonly<{
  readonly id: "NEXT_STUDY" | "ACCOUNT_SECURITY" | "REPORT_FEEDBACK";
  readonly title: string;
  readonly description: string;
  readonly href: "/dashboard" | "/account" | "/#feedback-report-title";
}>;

type Dashboard = Readonly<{
  readonly curriculumVersion: string;
  readonly totalMonths: 24;
  readonly totalModules: 24;
  readonly completedModules: number;
  readonly progressPercent: number;
  readonly activeModuleId?: string;
  readonly nextAction: string;
  readonly roadmap: readonly DashboardModule[];
  readonly recommendations: readonly DashboardRecommendation[];
}>;

type ApiRecord = Readonly<Record<string, unknown>>;
const apiBase = process.env.NEXT_PUBLIC_CVG_API_BASE_URL ?? "";

function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isDashboard(value: unknown): value is Dashboard {
  if (!isRecord(value) || !Array.isArray(value.roadmap)) return false;
  return (
    typeof value.curriculumVersion === "string" &&
    value.totalMonths === 24 &&
    value.totalModules === 24 &&
    typeof value.completedModules === "number" &&
    typeof value.progressPercent === "number" &&
    typeof value.nextAction === "string" &&
    value.roadmap.length === 24 &&
    Array.isArray(value.recommendations) &&
    value.recommendations.length === 3 &&
    value.recommendations.every(
      (recommendation) =>
        isRecord(recommendation) &&
        typeof recommendation.id === "string" &&
        typeof recommendation.title === "string" &&
        typeof recommendation.description === "string" &&
        typeof recommendation.href === "string",
    ) &&
    value.roadmap.every(
      (module) =>
        isRecord(module) &&
        typeof module.moduleId === "string" &&
        typeof module.month === "number" &&
        typeof module.title === "string" &&
        typeof module.competence === "string" &&
        module.sessionCount === 4 &&
        typeof module.status === "string" &&
        typeof module.nextAction === "string",
    )
  );
}

function statusLabel(status: string): string {
  const labels: Readonly<Record<string, string>> = {
    DISPONIVEL: "Disponível",
    EM_ANDAMENTO: "Em andamento",
    EM_REMEDIACAO: "Em remediação",
    RETENCAO_PENDENTE: "Retenção pendente",
    CONCLUIDO_DIGITAL: "Concluído no digital",
    BLOQUEADO_PRE_REQUISITO: "Aguardando pré-requisito",
    AGUARDANDO_PUBLICACAO: "Aguardando publicação clínica",
  };
  return labels[status] ?? status;
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/v1/dashboard`, {
        credentials: "include",
        cache: "no-store",
      });
      const payload: unknown = await response.json().catch(() => null);
      if (
        !isRecord(payload) ||
        payload.success !== true ||
        !isDashboard(payload.data)
      ) {
        throw new Error("invalid dashboard");
      }
      setDashboard(payload.data);
    } catch {
      setDashboard(null);
      setError("Não foi possível carregar o painel da jornada.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="shell" id="main-content" tabIndex={-1}>
      <header className="topbar" aria-label="Painel da jornada">
        <div>
          <p className="eyebrow">CVG · jornada individual</p>
          <span className="brand">Painel de aprendizagem</span>
        </div>
        <span className="status-pill">Progresso digital</span>
      </header>

      {error !== null ? (
        <section className="hero-card error-panel" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => void load()}>
            Tentar novamente
          </button>
        </section>
      ) : dashboard === null ? (
        <section className="hero-card" role="status">
          Carregando jornada…
        </section>
      ) : (
        <>
          <section className="hero-card" aria-labelledby="dashboard-title">
            <p className="eyebrow">Currículo {dashboard.curriculumVersion}</p>
            <h1 id="dashboard-title">Sua jornada de 24 meses</h1>
            <p>
              {dashboard.completedModules} de {dashboard.totalModules} módulos
              concluídos no ambiente digital. Próxima ação:{" "}
              {dashboard.nextAction}.
            </p>
            <progress
              max={100}
              value={dashboard.progressPercent}
              aria-label={`${dashboard.progressPercent}% da jornada digital concluída`}
            />
            <p>{dashboard.progressPercent}% concluído no digital</p>
          </section>

          <section
            className="hero-card dashboard-recommendations"
            aria-labelledby="recommendations-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">Acesso rápido</p>
                <h2 id="recommendations-title">Recomendações para você</h2>
              </div>
            </div>
            <div className="recommendation-grid">
              {dashboard.recommendations.map((recommendation) => (
                <a
                  className="recommendation-card"
                  href={recommendation.href}
                  key={recommendation.id}
                >
                  <h3>{recommendation.title}</h3>
                  <p>{recommendation.description}</p>
                </a>
              ))}
            </div>
          </section>

          <section className="journey-list" aria-labelledby="roadmap-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Mapa completo</p>
                <h2 id="roadmap-title">Meses 1–24</h2>
              </div>
              {dashboard.activeModuleId !== undefined ? (
                <span className="status-pill">
                  Atual: {dashboard.activeModuleId}
                </span>
              ) : null}
            </div>
            {dashboard.roadmap.map((module) => (
              <article className="journey-item" key={module.moduleId}>
                <div>
                  <p className="eyebrow">
                    Mês {module.month} · {module.moduleId}
                  </p>
                  <h3>{module.title}</h3>
                  <p>{module.competence}</p>
                </div>
                <div>
                  <span className="status-pill">
                    {statusLabel(module.status)}
                  </span>
                  <p className="field-help">
                    Próximo passo: {module.nextAction}
                  </p>
                </div>
              </article>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
