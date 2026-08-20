import { describe, expect, it } from "vitest";

import {
  isAdminDashboard,
  isAdminOperationsDashboard,
  isManagedAccountPage,
  isOperations,
} from "../app/admin/admin-model.js";

const participantId = "11111111-1111-4111-8111-111111111111";

function trainingCatalog() {
  return Array.from({ length: 24 }, (_, index) => ({
    moduleId: `M${String(index + 1).padStart(2, "0")}`,
    month: index + 1,
    title: `Módulo ${index + 1}`,
    competence: "Raciocínio clínico digital seguro.",
    assignedParticipants: 1,
    activeParticipants: 1,
    completedParticipants: 0,
  }));
}

const dashboard = {
  curriculumId: "CVG-CURRICULUM-24M",
  curriculumVersion: "3.0.0",
  summary: {
    participantsTotal: 1,
    activeParticipants: 1,
    invitedParticipants: 0,
    participantsInProgress: 1,
    averageProgressPercent: 10,
    assignedModules: 1,
    completedModules: 0,
  },
  participants: [
    {
      participantId,
      professionalEmail: "participant@example.test",
      accountStatus: "ACTIVE",
      scopeIds: ["scope-1"],
      assignedModules: 1,
      completedModules: 0,
      progressPercent: 10,
      activeModuleId: "M01",
      activeModuleTitle: "Módulo 1",
      nextAction: "INICIAR_ATIVIDADE",
    },
  ],
  trainingCatalog: trainingCatalog(),
} as const;

const operations = {
  accounts: {
    invited: 0,
    active: 1,
    suspended: 0,
    deactivated: 0,
    inactiveOver14Days: 0,
  },
  corrections: { open: 0, overdue: 0, slaBreaches: 0 },
  remediation: { participants: 0, objectives: 0 },
  contentValidity: { valid: 1, dueForReview: 0, expired: 0, withdrawn: 0 },
  feedback: { open: 0, technicalFailures: 0 },
} as const;

const operationsDashboard = {
  dependencyStatus: "READY",
  dependencies: { postgres: "UP", qdrant: "DISABLED", ai: "DISABLED" },
  metrics: { requestsTotal: 1, errorsTotal: 0, p95DurationMs: 12 },
  evidence: {
    collector: "VERIFIED",
    retention: "NOT_CONFIGURED",
    traces: "NOT_EXECUTED",
    load: "NOT_EXECUTED",
    failover: "NOT_EXECUTED",
    replicas: "NOT_EXECUTED",
  },
} as const;

describe("admin web contracts", () => {
  it("rejects out-of-range and duplicate dashboard values", () => {
    expect(isAdminDashboard(dashboard)).toBe(true);
    expect(
      isAdminDashboard({
        ...dashboard,
        summary: { ...dashboard.summary, averageProgressPercent: 101 },
      }),
    ).toBe(false);
    expect(
      isAdminDashboard({
        ...dashboard,
        trainingCatalog: dashboard.trainingCatalog.map((module) => ({
          ...module,
          moduleId: "M01",
        })),
      }),
    ).toBe(false);
  });

  it("bounds operations and managed-account projections", () => {
    expect(isAdminOperationsDashboard({ dashboard, operations })).toBe(true);
    expect(
      isOperations({
        ...operationsDashboard,
        metrics: { ...operationsDashboard.metrics, p95DurationMs: -1 },
      }),
    ).toBe(false);
    expect(
      isManagedAccountPage({
        accounts: [
          {
            accountId: participantId,
            professionalEmail: "participant@example.test",
            accountStatus: "ACTIVE",
            roles: ["PARTICIPANT"],
            scopes: ["scope-1"],
            version: 1,
            createdAt: "2026-08-16T12:00:00.000Z",
            updatedAt: "2026-08-16T12:00:00.000Z",
          },
        ],
        nextCursor: null,
      }),
    ).toBe(true);
  });
});
