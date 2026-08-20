import { parseModeratorDashboard } from "@cvg/contracts";
import type { ModeratorDashboardProjection } from "@cvg/contracts";

export type ModeratorDashboard = ModeratorDashboardProjection;

type ApiRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isModeratorDashboard(
  value: unknown,
): value is ModeratorDashboard {
  try {
    parseModeratorDashboard(value);
    return true;
  } catch {
    return false;
  }
}

export async function loadModeratorDashboard(
  apiBase: string,
): Promise<ModeratorDashboard> {
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
  return payload.data;
}
