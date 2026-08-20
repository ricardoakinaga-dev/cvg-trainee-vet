import { describe, expect, it, vi } from "vitest";

import {
  isDashboard,
  loadDashboard,
  statusLabel,
} from "../app/dashboard/dashboard-model.js";

const dashboard = {
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
    sessionCount: 4,
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
} as const;

describe("dashboard model", () => {
  it("validates the bounded roadmap and recommendation projection", () => {
    expect(isDashboard(dashboard)).toBe(true);
    expect(
      isDashboard({ ...dashboard, roadmap: dashboard.roadmap.slice(0, 23) }),
    ).toBe(false);
  });

  it("derives guards from the canonical contract instead of accepting arbitrary links", () => {
    expect(
      isDashboard({
        ...dashboard,
        recommendations: dashboard.recommendations.map((recommendation) => ({
          ...recommendation,
          href: "/unregistered-route",
        })),
      }),
    ).toBe(false);
  });

  it("loads only a successful dashboard envelope", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: dashboard }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadDashboard("/api")).resolves.toEqual(dashboard);
    expect(fetchMock).toHaveBeenCalledWith("/api/api/v1/dashboard", {
      credentials: "include",
      cache: "no-store",
    });
  });

  it("maps known statuses and preserves bounded unknown labels", () => {
    expect(statusLabel("EM_ANDAMENTO")).toBe("Em andamento");
    expect(statusLabel("UNKNOWN_STATUS")).toBe("UNKNOWN_STATUS");
  });
});
