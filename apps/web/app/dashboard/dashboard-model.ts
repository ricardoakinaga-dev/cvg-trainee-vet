import {
  parseParticipantDashboard,
  type ParticipantDashboardProjection,
} from "@cvg/contracts";

export type Dashboard = ParticipantDashboardProjection;
export type DashboardModule = Dashboard["roadmap"][number];
export type DashboardRecommendation = Dashboard["recommendations"][number];

type ApiRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isDashboard(value: unknown): value is Dashboard {
  try {
    parseParticipantDashboard(value);
    return true;
  } catch {
    return false;
  }
}

export async function loadDashboard(apiBase: string): Promise<Dashboard> {
  const response = await fetch(`${apiBase}/api/v1/dashboard`, {
    credentials: "include",
    cache: "no-store",
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !isRecord(payload) || payload.success !== true) {
    throw new Error("dashboard unavailable");
  }
  if (!isDashboard(payload.data)) {
    throw new Error("dashboard unavailable");
  }
  return payload.data;
}

export function statusLabel(status: string): string {
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
