import { useCallback, useEffect, useState } from "react";

import { loadDashboard, type Dashboard } from "./dashboard-model";

export type DashboardPageState = Readonly<{
  readonly dashboard: Dashboard | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly load: () => Promise<void>;
}>;

const unavailableMessage = "Não foi possível carregar o painel da jornada.";

export function useDashboardPageState(apiBase: string): DashboardPageState {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setDashboard(await loadDashboard(apiBase));
    } catch {
      setDashboard(null);
      setError(unavailableMessage);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    void load();
  }, [load]);

  return { dashboard, loading, error, load };
}
