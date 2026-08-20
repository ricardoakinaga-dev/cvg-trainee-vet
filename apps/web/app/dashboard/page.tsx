"use client";

import { useDashboardPageState } from "./dashboard-state";
import { DashboardHeader, DashboardPageContent } from "./dashboard-view";

const apiBase = process.env.NEXT_PUBLIC_CVG_API_BASE_URL ?? "";

export default function DashboardPage(): React.JSX.Element {
  const { dashboard, loading, error, load } = useDashboardPageState(apiBase);

  return (
    <main className="shell" id="main-content" tabIndex={-1} aria-busy={loading}>
      <DashboardHeader />
      <DashboardPageContent
        dashboard={dashboard}
        loading={loading}
        error={error}
        onRetry={() => void load()}
      />
    </main>
  );
}
