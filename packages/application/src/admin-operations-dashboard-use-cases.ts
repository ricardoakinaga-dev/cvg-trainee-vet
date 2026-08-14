import type { AdminDashboard } from "./admin-dashboard-use-cases.js";

type Counter = Readonly<Record<string, number>>;

export type AdminOperationsSignals = Readonly<{
  readonly accounts: Readonly<{
    readonly invited: number;
    readonly active: number;
    readonly suspended: number;
    readonly deactivated: number;
    readonly inactiveOver14Days: number;
  }>;
  readonly corrections: Readonly<{
    readonly open: number;
    readonly overdue: number;
    readonly slaBreaches: number;
  }>;
  readonly remediation: Readonly<{
    readonly participants: number;
    readonly objectives: number;
  }>;
  readonly contentValidity: Readonly<{
    readonly valid: number;
    readonly dueForReview: number;
    readonly expired: number;
    readonly withdrawn: number;
  }>;
  readonly feedback: Readonly<{
    readonly open: number;
    readonly technicalFailures: number;
  }>;
}>;

export type AdminOperationsDashboard = Readonly<{
  readonly dashboard: AdminDashboard;
  readonly operations: AdminOperationsSignals;
}>;

export interface AdminOperationsDashboardReadDependencies {
  readonly getAdminDashboard: (
    scopeIds: readonly string[],
  ) => Promise<AdminDashboard>;
  readonly readSignals: (
    scopeIds: readonly string[],
    now: Date,
  ) => Promise<AdminOperationsSignals>;
}

function assertCounters(value: Counter, prefix: string): void {
  for (const [key, counter] of Object.entries(value)) {
    if (!Number.isInteger(counter) || counter < 0) {
      throw new TypeError(`${prefix}.${key} must be a non-negative integer`);
    }
  }
}

function freezeSignals(
  signals: AdminOperationsSignals,
): AdminOperationsSignals {
  assertCounters(signals.accounts, "accounts");
  assertCounters(signals.corrections, "corrections");
  assertCounters(signals.remediation, "remediation");
  assertCounters(signals.contentValidity, "contentValidity");
  assertCounters(signals.feedback, "feedback");
  return Object.freeze({
    accounts: Object.freeze({ ...signals.accounts }),
    corrections: Object.freeze({ ...signals.corrections }),
    remediation: Object.freeze({ ...signals.remediation }),
    contentValidity: Object.freeze({ ...signals.contentValidity }),
    feedback: Object.freeze({ ...signals.feedback }),
  });
}

export function buildAdminOperationsDashboard(
  dashboard: AdminDashboard,
  signals: AdminOperationsSignals,
): AdminOperationsDashboard {
  return Object.freeze({
    dashboard,
    operations: freezeSignals(signals),
  });
}

export async function getInternalAdminOperationsDashboard(
  scopeIds: readonly string[],
  dependencies: AdminOperationsDashboardReadDependencies,
  now = new Date(),
): Promise<AdminOperationsDashboard> {
  const [dashboard, signals] = await Promise.all([
    dependencies.getAdminDashboard(scopeIds),
    dependencies.readSignals(scopeIds, now),
  ]);
  return buildAdminOperationsDashboard(dashboard, signals);
}
