import { describe, expect, it } from "vitest";

import { parseAdminOperationsDashboard } from "./admin-operations-dashboard.js";

const trainingCatalog = Array.from({ length: 24 }, (_, index) => ({
  moduleId: `M${String(index + 1).padStart(2, "0")}`,
  month: index + 1,
  title: `Módulo ${index + 1}`,
  competence: "Raciocínio clínico digital seguro.",
  assignedParticipants: 0,
  activeParticipants: 0,
  completedParticipants: 0,
}));

const projection = {
  dashboard: {
    curriculumId: "CVG-CURRICULUM-24M",
    curriculumVersion: "3.0.0",
    summary: {
      participantsTotal: 0,
      activeParticipants: 0,
      invitedParticipants: 0,
      participantsInProgress: 0,
      averageProgressPercent: 0,
      assignedModules: 0,
      completedModules: 0,
    },
    participants: [],
    trainingCatalog,
  },
  operations: {
    accounts: {
      invited: 0,
      active: 0,
      suspended: 0,
      deactivated: 0,
      inactiveOver14Days: 0,
    },
    corrections: { open: 0, overdue: 0, slaBreaches: 0 },
    remediation: { participants: 0, objectives: 0 },
    contentValidity: { valid: 0, dueForReview: 0, expired: 0, withdrawn: 0 },
    feedback: { open: 0, technicalFailures: 0 },
  },
} as const;

describe("admin operations dashboard contract", () => {
  it("accepts all operational control groups", () => {
    expect(parseAdminOperationsDashboard(projection)).toEqual(projection);
  });

  it("rejects negative counters", () => {
    expect(() =>
      parseAdminOperationsDashboard({
        ...projection,
        operations: {
          ...projection.operations,
          feedback: { open: -1, technicalFailures: 0 },
        },
      }),
    ).toThrow();
  });
});
