import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AdminContent } from "../app/admin/admin-sections.js";
import { AdminView } from "../app/admin/admin-view.js";
import {
  formatAccountStatus,
  formatExpiration,
} from "../app/admin/admin-model.js";

const participantId = "11111111-1111-4111-8111-111111111111";
const accountId = "22222222-2222-4222-8222-222222222222";
const invitationFixtureToken = [
  "fixture",
  "invitation",
  "value",
  "1234567890",
].join("-");

const trainingCatalog = Array.from({ length: 24 }, (_, index) => ({
  moduleId: `M${String(index + 1).padStart(2, "0")}`,
  month: index + 1,
  title: `Módulo ${index + 1}`,
  competence: "Raciocínio clínico digital seguro.",
  assignedParticipants: index === 0 ? 2 : 0,
  activeParticipants: index === 0 ? 1 : 0,
  completedParticipants: index === 0 ? 1 : 0,
}));

const dashboard = {
  curriculumId: "CVG-CURRICULUM-24M",
  curriculumVersion: "3.0.0",
  summary: {
    participantsTotal: 1,
    activeParticipants: 1,
    invitedParticipants: 0,
    participantsInProgress: 1,
    averageProgressPercent: 50,
    assignedModules: 2,
    completedModules: 1,
  },
  participants: [
    {
      participantId,
      professionalEmail: "participant@example.test",
      accountStatus: "ACTIVE",
      scopeIds: ["scope-1"],
      assignedModules: 2,
      completedModules: 1,
      progressPercent: 50,
      activeModuleId: "M01",
      activeModuleTitle: "Módulo 1",
      nextAction: "INICIAR_ATIVIDADE",
    },
  ],
  trainingCatalog,
} as const;

const operations = {
  dependencyStatus: "READY",
  dependencies: { postgres: "UP", qdrant: "DISABLED", ai: "DISABLED" },
  metrics: { requestsTotal: 42, errorsTotal: 2, p95DurationMs: 18 },
  evidence: {
    collector: "VERIFIED",
    retention: "NOT_CONFIGURED",
    traces: "NOT_EXECUTED",
    load: "NOT_EXECUTED",
    failover: "NOT_EXECUTED",
    replicas: "NOT_EXECUTED",
  },
} as const;

const adminOperations = {
  dashboard,
  operations: {
    accounts: {
      invited: 1,
      active: 2,
      suspended: 1,
      deactivated: 1,
      inactiveOver14Days: 1,
    },
    corrections: { open: 2, overdue: 1, slaBreaches: 1 },
    remediation: { participants: 1, objectives: 2 },
    contentValidity: { valid: 20, dueForReview: 2, expired: 1, withdrawn: 1 },
    feedback: { open: 3, technicalFailures: 1 },
  },
} as const;

const accounts = [
  {
    accountId,
    professionalEmail: "active@example.test",
    accountStatus: "ACTIVE",
    roles: ["PARTICIPANT"],
    scopes: ["scope-1"],
    version: 1,
    createdAt: "2026-08-16T12:00:00.000Z",
    updatedAt: "2026-08-16T12:00:00.000Z",
  },
  {
    accountId: "33333333-3333-4333-8333-333333333333",
    professionalEmail: "suspended@example.test",
    accountStatus: "SUSPENDED",
    roles: ["MODERATOR"],
    scopes: ["scope-1"],
    version: 2,
    createdAt: "2026-08-16T12:00:00.000Z",
    updatedAt: "2026-08-16T12:00:00.000Z",
  },
  {
    accountId: "44444444-4444-4444-8444-444444444444",
    professionalEmail: "deactivated@example.test",
    accountStatus: "DEACTIVATED",
    roles: ["AUTHOR"],
    scopes: ["scope-1"],
    version: 3,
    createdAt: "2026-08-16T12:00:00.000Z",
    updatedAt: "2026-08-16T12:00:00.000Z",
  },
] as const;

const invitation = {
  professionalEmail: "new-user@example.test",
  token: invitationFixtureToken,
  expiresAt: "2026-08-17T12:00:00.000Z",
} as const;

function actionProps() {
  return {
    load: vi.fn(async () => undefined),
    updateManagedAccountStatus: vi.fn(async () => undefined),
    revokeManagedAccountSessions: vi.fn(async () => undefined),
    handleCreateInvitation: vi.fn(async (event: unknown) => {
      (event as { preventDefault: () => void }).preventDefault();
    }),
    handleAssignModule: vi.fn(async (event: unknown) => {
      (event as { preventDefault: () => void }).preventDefault();
    }),
  };
}

function fullProps(overrides: Record<string, unknown> = {}) {
  return {
    operations,
    adminDashboard: dashboard,
    adminOperations,
    managedAccounts: accounts,
    selectedParticipantId: participantId,
    selectedModuleId: "M01",
    email: "new-user@example.test",
    role: "PARTICIPANT",
    invitation,
    invitationPath: "/invite#token=synthetic-invitation-token-1234567890",
    busy: false,
    error: "Falha operacional sintética.",
    notice: "Operação concluída.",
    setSelectedParticipantId: vi.fn(),
    setSelectedModuleId: vi.fn(),
    setEmail: vi.fn(),
    setRole: vi.fn(),
    ...actionProps(),
    ...overrides,
  };
}

describe("admin production views", () => {
  it("renders the complete dashboard, governance controls and invitation result", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminView, fullProps() as never),
    );

    expect(markup).toContain("Dashboard de treinamento");
    expect(markup).toContain("Lifecycle de contas");
    expect(markup).toContain("Catálogo de treinamentos");
    expect(markup).toContain("Envie o primeiro acesso");
    expect(markup).toContain("new-user@example.test");
    expect(markup).toContain("Falha operacional sintética.");
    expect(markup).toContain("Operação concluída.");
  });

  it("covers unavailable, empty and partial admin states", () => {
    const unavailable = renderToStaticMarkup(
      createElement(
        AdminView,
        fullProps({
          operations: null,
          adminDashboard: null,
          error: null,
        }) as never,
      ),
    );
    expect(unavailable).toContain("Carregando centro de controle");

    const failed = renderToStaticMarkup(
      createElement(
        AdminView,
        fullProps({ operations: null, adminDashboard: null }) as never,
      ),
    );
    expect(failed).toContain("Tentar novamente");

    const partial = renderToStaticMarkup(
      createElement(
        AdminContent,
        fullProps({ adminDashboard: null, adminOperations: null }) as never,
      ),
    );
    expect(partial).toContain("Métricas redigidas");

    expect(formatAccountStatus("ACTIVE")).toBe("Ativo");
    expect(formatAccountStatus("INVITED")).toBe("Convite pendente");
    expect(formatAccountStatus("SUSPENDED")).toBe("Suspenso");
    expect(formatAccountStatus("DEACTIVATED")).toBe("Desativado");
    expect(formatExpiration("not-a-date")).toBe("not-a-date");
  });
});
