"use client";

import { useCallback, useEffect, useState } from "react";

import {
  isModeratorDashboard,
  loadModeratorDashboard,
  type ModeratorDashboard,
} from "./moderator-model";
import {
  ModeratorDashboardView,
  ModeratorHeader,
  ModeratorHero,
} from "./moderator-view";

const apiBase = process.env.NEXT_PUBLIC_CVG_API_BASE_URL ?? "";

export default function ModeratorPage(): React.JSX.Element {
  const [dashboard, setDashboard] = useState<ModeratorDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      const nextDashboard = await loadModeratorDashboard(apiBase);
      if (!isModeratorDashboard(nextDashboard)) {
        throw new Error("moderator dashboard unavailable");
      }
      setDashboard(nextDashboard);
    } catch {
      setDashboard(null);
      setError("Não foi possível carregar as filas atribuídas.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="shell" id="main-content" tabIndex={-1}>
      <ModeratorHeader />
      <ModeratorHero />
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
        <ModeratorDashboardView dashboard={dashboard} />
      )}
    </main>
  );
}
