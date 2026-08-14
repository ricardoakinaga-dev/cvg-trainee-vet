import { describe, expect, it } from "vitest";

import type { AdminDashboard } from "./admin-dashboard-use-cases.js";
import {
  buildAdminOperationsDashboard,
  getInternalAdminOperationsDashboard,
  type AdminOperationsSignals,
} from "./admin-operations-dashboard-use-cases.js";

const dashboard: AdminDashboard = {
  curriculumId: "CVG-CURRICULUM-24M",
  curriculumVersion: "3.0.0",
  summary: {
    participantsTotal: 2,
    activeParticipants: 1,
    invitedParticipants: 1,
    participantsInProgress: 1,
    averageProgressPercent: 25,
    assignedModules: 2,
    completedModules: 1,
  },
  participants: [],
  trainingCatalog: [],
};

const signals: AdminOperationsSignals = {
  accounts: {
    invited: 1,
    active: 1,
    suspended: 0,
    deactivated: 0,
    inactiveOver14Days: 1,
  },
  corrections: { open: 3, overdue: 1, slaBreaches: 1 },
  remediation: { participants: 2, objectives: 4 },
  contentValidity: { valid: 8, dueForReview: 2, expired: 1, withdrawn: 1 },
  feedback: { open: 2, technicalFailures: 1 },
};

describe("admin operations dashboard", () => {
  it("combines the administrative dashboard with operational controls", () => {
    const result = buildAdminOperationsDashboard(dashboard, signals);

    expect(result.dashboard).toBe(dashboard);
    expect(result.operations).toEqual(signals);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.operations)).toBe(true);
  });

  it("fails closed for negative operational counters", () => {
    expect(() =>
      buildAdminOperationsDashboard(dashboard, {
        ...signals,
        feedback: { open: -1, technicalFailures: 0 },
      }),
    ).toThrow();
  });

  it("loads the product dashboard and operational signals together", async () => {
    const result = await getInternalAdminOperationsDashboard(["scope-1"], {
      getAdminDashboard: async () => dashboard,
      readSignals: async () => signals,
    });

    expect(result).toMatchObject({ dashboard, operations: signals });
  });
});
