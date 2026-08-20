import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  DashboardPageContent,
  type DashboardPageContentProps,
} from "../app/dashboard/dashboard-view.js";
import type { Dashboard } from "../app/dashboard/dashboard-model.js";

const dashboard: Dashboard = {
  curriculumId: "CVG-CURRICULUM-24M",
  curriculumVersion: "3.0.0",
  totalMonths: 24,
  totalModules: 24,
  completedModules: 1,
  progressPercent: 4,
  activeModuleId: "M01",
  nextAction: "INICIAR_BASELINE",
  roadmap: Array.from({ length: 24 }, (_, index) => ({
    moduleId: `M${String(index + 1).padStart(2, "0")}`,
    month: index + 1,
    title: `Módulo ${index + 1}`,
    competence: "Raciocínio clínico digital seguro.",
    sessionCount: 4 as const,
    status: index === 0 ? "DISPONIVEL" : "BLOQUEADO_PRE_REQUISITO",
    nextAction: index === 0 ? "INICIAR_BASELINE" : "CONCLUIR_PRE_REQUISITO",
  })),
  recommendations: [
    {
      id: "NEXT_STUDY",
      title: "Acompanhe sua próxima ação",
      description: "Veja a próxima atividade digital da sua jornada.",
      href: "/dashboard",
    },
    {
      id: "ACCOUNT_SECURITY",
      title: "Revise sua conta",
      description: "Confira recuperação, MFA e sessões da sua conta.",
      href: "/account",
    },
    {
      id: "REPORT_FEEDBACK",
      title: "Relate um problema ou melhoria",
      description: "Envie um relato sem anexos ou dados sensíveis.",
      href: "/#feedback-report-title",
    },
  ],
};

function renderContent(props: DashboardPageContentProps): string {
  return renderToStaticMarkup(createElement(DashboardPageContent, props));
}

describe("dashboard page content", () => {
  it("renders the accessible loading state when no projection is available", () => {
    const markup = renderContent({
      dashboard: null,
      error: null,
      onRetry: () => undefined,
      loading: true,
    });

    expect(markup).toContain('role="status"');
    expect(markup).toContain('data-testid="dashboard-loading"');
    expect(markup).toContain("Carregando jornada");
  });

  it("prioritizes the bounded error state over stale dashboard content", () => {
    const markup = renderContent({
      dashboard,
      error: "Não foi possível carregar o painel da jornada.",
      onRetry: () => undefined,
      loading: false,
    });

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Tentar novamente");
    expect(markup).not.toContain("Sua jornada de 24 meses");
  });

  it("renders the complete participant projection with its accessible landmarks", () => {
    const markup = renderContent({
      dashboard,
      error: null,
      onRetry: () => undefined,
      loading: false,
    });

    expect(markup).toContain('aria-labelledby="dashboard-title"');
    expect(markup).toContain('aria-labelledby="recommendations-title"');
    expect(markup).toContain('aria-labelledby="roadmap-title"');
    expect(markup).toContain("Sua jornada de 24 meses");
    expect(markup).toContain("4% da jornada digital concluída");
    expect(markup.match(/class="journey-item"/g)).toHaveLength(24);
  });
});
