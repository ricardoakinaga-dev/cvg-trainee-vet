import type {
  Dashboard,
  DashboardModule,
  DashboardRecommendation,
} from "./dashboard-model";
import { statusLabel } from "./dashboard-model";

export function DashboardHeader(): React.JSX.Element {
  return (
    <header className="topbar" aria-label="Painel da jornada">
      <div>
        <p className="eyebrow">CVG · jornada individual</p>
        <span className="brand">Painel de aprendizagem</span>
      </div>
      <span className="status-pill">Progresso digital</span>
    </header>
  );
}

function DashboardHero({ dashboard }: Readonly<{ dashboard: Dashboard }>) {
  return (
    <section className="hero-card" aria-labelledby="dashboard-title">
      <p className="eyebrow">Currículo {dashboard.curriculumVersion}</p>
      <h1 id="dashboard-title">Sua jornada de 24 meses</h1>
      <p>
        {dashboard.completedModules} de {dashboard.totalModules} módulos
        concluídos no ambiente digital. Próxima ação: {dashboard.nextAction}.
      </p>
      <progress
        max={100}
        value={dashboard.progressPercent}
        aria-label={`${dashboard.progressPercent}% da jornada digital concluída`}
      />
      <p>{dashboard.progressPercent}% concluído no digital</p>
    </section>
  );
}

function RecommendationCard({
  recommendation,
}: Readonly<{ recommendation: DashboardRecommendation }>) {
  return (
    <a
      className="recommendation-card"
      href={recommendation.href}
      key={recommendation.id}
    >
      <h3>{recommendation.title}</h3>
      <p>{recommendation.description}</p>
    </a>
  );
}

function DashboardRecommendations({
  recommendations,
}: Readonly<{ recommendations: Dashboard["recommendations"] }>) {
  return (
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
        {recommendations.map((recommendation) => (
          <RecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
          />
        ))}
      </div>
    </section>
  );
}

function JourneyItem({ module }: Readonly<{ module: DashboardModule }>) {
  return (
    <article className="journey-item" key={module.moduleId}>
      <div>
        <p className="eyebrow">
          Mês {module.month} · {module.moduleId}
        </p>
        <h3>{module.title}</h3>
        <p>{module.competence}</p>
      </div>
      <div>
        <span className="status-pill">{statusLabel(module.status)}</span>
        <p className="field-help">Próximo passo: {module.nextAction}</p>
      </div>
    </article>
  );
}

function DashboardRoadmap({ dashboard }: Readonly<{ dashboard: Dashboard }>) {
  return (
    <section className="journey-list" aria-labelledby="roadmap-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Mapa completo</p>
          <h2 id="roadmap-title">Meses 1–24</h2>
        </div>
        {dashboard.activeModuleId !== undefined ? (
          <span className="status-pill">Atual: {dashboard.activeModuleId}</span>
        ) : null}
      </div>
      {dashboard.roadmap.map((module) => (
        <JourneyItem key={module.moduleId} module={module} />
      ))}
    </section>
  );
}

export function DashboardView({
  dashboard,
}: Readonly<{ dashboard: Dashboard }>): React.JSX.Element {
  return (
    <>
      <DashboardHero dashboard={dashboard} />
      <DashboardRecommendations recommendations={dashboard.recommendations} />
      <DashboardRoadmap dashboard={dashboard} />
    </>
  );
}

export type DashboardPageContentProps = Readonly<{
  readonly dashboard: Dashboard | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly onRetry: () => void;
}>;

export function DashboardPageContent({
  dashboard,
  loading,
  error,
  onRetry,
}: DashboardPageContentProps): React.JSX.Element {
  if (error !== null) {
    return (
      <DashboardError message={error} onRetry={onRetry} loading={loading} />
    );
  }
  if (dashboard === null) {
    return <DashboardLoading loading={loading} />;
  }
  return <DashboardView dashboard={dashboard} />;
}

export function DashboardError({
  message,
  onRetry,
  loading,
}: Readonly<{
  message: string;
  onRetry: () => void;
  loading: boolean;
}>): React.JSX.Element {
  return (
    <section className="hero-card error-panel" role="alert">
      <p>{message}</p>
      <button type="button" onClick={onRetry} disabled={loading}>
        {loading ? "Tentando novamente…" : "Tentar novamente"}
      </button>
    </section>
  );
}

export function DashboardLoading({
  loading,
}: Readonly<{ readonly loading: boolean }>): React.JSX.Element {
  return (
    <section
      className="hero-card"
      data-testid="dashboard-loading"
      role="status"
      aria-busy={loading}
    >
      Carregando jornada…
    </section>
  );
}
