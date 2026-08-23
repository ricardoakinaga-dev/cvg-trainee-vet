import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

function successEnvelope(data: unknown) {
  return {
    success: true,
    data,
    meta: { request_id: "e2e-operations-request" },
  };
}

const staffDashboard = {
  kind: "staff",
  scopes: ["11111111-1111-4111-8111-111111111111"],
  generatedAt: "2026-08-23T12:00:00.000Z",
  metrics: {
    invitedParticipants: 2,
    activeParticipants: 1,
    inactiveParticipants: 0,
    assignedModules: 2,
    completedModules: 1,
    completionRatePercent: 50,
    medianProgressPercent: 50,
    pendingCorrections: 1,
    remediationParticipants: 1,
    retentionReviewsPending: 1,
    openFeedback: 1,
    content: { published: 4, inReview: 1, expired: 0, withdrawn: 0 },
  },
  participants: [
    {
      participantId: "22222222-2222-4222-8222-222222222222",
      professionalEmail: "vet.synthetic@example.invalid",
      accountStatus: "ACTIVE",
      scopeIds: ["11111111-1111-4111-8111-111111111111"],
      lastSeenAt: "2026-08-23T11:00:00.000Z",
      progress: {
        assignedModules: 2,
        completedModules: 1,
        progressPercent: 50,
        remediationModules: 1,
        retentionReviewsPending: 1,
      },
      pendingCorrections: 1,
      openFeedback: 1,
      nextAction: "AGUARDAR_CORRECAO_HUMANA",
      diagnosticProfile: [
        {
          themeId: "B07-S1",
          themeLabel: "Núcleo clínico e segurança",
          status: "BASELINE_REGISTRADA",
          scorePercent: 75,
          answeredItemCount: 30,
          itemCount: 40,
          recommendedModuleIds: ["M01", "M11"],
          lastEvaluatedAt: "2026-08-23T12:00:00.000Z",
          evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
          notPunitive: true,
          noGlobalPassFail: true,
          practicalCompetenceClaim: "PROIBIDO_MVP",
        },
        {
          themeId: "B07-S2",
          themeLabel: "Emergência e priorização",
          status: "SEM_EVIDENCIA_DIGITAL",
          scorePercent: null,
          answeredItemCount: 0,
          itemCount: 40,
          recommendedModuleIds: [],
          evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
          notPunitive: true,
          noGlobalPassFail: true,
          practicalCompetenceClaim: "PROIBIDO_MVP",
        },
        {
          themeId: "B07-S3",
          themeLabel: "Internação, monitoramento e integração",
          status: "SEM_EVIDENCIA_DIGITAL",
          scorePercent: null,
          answeredItemCount: 0,
          itemCount: 40,
          recommendedModuleIds: [],
          evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
          notPunitive: true,
          noGlobalPassFail: true,
          practicalCompetenceClaim: "PROIBIDO_MVP",
        },
      ],
    },
  ],
};

const continuingEducationReport = {
  kind: "continuing_education_report",
  scopeId: "11111111-1111-4111-8111-111111111111",
  generatedAt: "2026-08-23T12:00:00.000Z",
  filters: { scopeId: "11111111-1111-4111-8111-111111111111" },
  summary: {
    participantCount: 1,
    invitedParticipants: 0,
    activeParticipants: 1,
    suspendedParticipants: 0,
    deactivatedParticipants: 0,
    assignedModules: 2,
    completedModules: 1,
    completionRatePercent: 50,
    completedDigitalMinutes: 360,
    completedDigitalHours: 6,
  },
  participants: [],
  modules: [
    {
      moduleId: "M02",
      month: 2,
      scheduledMinutes: 360,
      assignedParticipants: 1,
      completedParticipants: 1,
      completionRatePercent: 100,
    },
  ],
  learningEvidence: "ATIVIDADE_MODULAR_DIGITAL",
  hoursClaim: "NAO_CREDENCIADAS",
  practicalCompetenceClaim: "PROIBIDO_MVP",
};

const multiScopeStaffDashboard = {
  ...staffDashboard,
  scopes: [
    "11111111-1111-4111-8111-111111111111",
    "99999999-9999-4999-8999-999999999999",
  ],
  participants: staffDashboard.participants.map((participant) => ({
    ...participant,
    scopeIds: ["99999999-9999-4999-8999-999999999999"],
  })),
};

test.describe("staff training dashboard", () => {
  test("renders scoped progress indicators and individual follow-up", async ({
    page,
  }) => {
    await page.route("**/health/dependencies", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            status: "READY",
            dependencies: {
              postgres: "UP",
              qdrant: "DISABLED",
              ai: "DISABLED",
            },
          }),
        ),
      });
    });
    await page.route("**/api/v1/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(successEnvelope(staffDashboard)),
      });
    });
    await page.route(
      "**/api/v1/internal/reports/continuing-education**",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(successEnvelope(continuingEducationReport)),
        });
      },
    );

    await page.goto("/operations");

    await expect(
      page.getByRole("heading", { name: "Acompanhar evolução" }),
    ).toBeVisible();
    await expect(page.getByText("Profissionais ativos")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Participação digital da trilha" }),
    ).toBeVisible();
    await expect(page.getByText("Horas digitais concluídas")).toBeVisible();
    await expect(page.getByText("não hora CPD credenciada")).toBeVisible();
    await expect(page.getByText("vet.synthetic@example.invalid")).toBeVisible();
    await expect(page.getByText("Aguardar correção humana")).toBeVisible();
    await expect(page.getByText("Baseline registrada")).toBeVisible();
    await expect(
      page.getByText("Diagnóstico formativo por tema"),
    ).toBeVisible();
    await expect(page.getByText("Sem nota global")).toBeVisible();
    await expect(
      page.getByText("não representa competência prática"),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      "22222222-2222-4222-8222-222222222222",
    );
    await expect(page.locator("body")).not.toContainText("scopeId");
  });

  test("explains that management data requires an internal session", async ({
    page,
  }) => {
    await page.route("**/health/dependencies", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            status: "READY",
            dependencies: {
              postgres: "UP",
              qdrant: "DISABLED",
              ai: "DISABLED",
            },
          }),
        ),
      });
    });
    await page.route("**/api/v1/dashboard", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { code: "unauthenticated" },
          meta: { request_id: "e2e-operations-unauthenticated" },
        }),
      });
    });

    await page.goto("/operations");

    await expect(page.getByText("Sessão de gestão necessária")).toBeVisible();
  });

  test("lets an administrator create a scoped participant invitation", async ({
    page,
  }) => {
    await page.route("**/health/dependencies", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            status: "READY",
            dependencies: {
              postgres: "UP",
              qdrant: "DISABLED",
              ai: "DISABLED",
            },
          }),
        ),
      });
    });
    await page.route("**/api/v1/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(successEnvelope(staffDashboard)),
      });
    });
    await page.route("**/api/v1/internal/invitations", async (route) => {
      const request = route.request().postDataJSON() as Readonly<{
        readonly professionalEmail?: string;
        readonly invitedRoles?: readonly string[];
        readonly invitedScopes?: readonly string[];
      }>;
      expect(request.professionalEmail).toBe("new.vet@example.invalid");
      expect(request.invitedRoles).toEqual(["PARTICIPANT"]);
      expect(request.invitedScopes).toEqual(staffDashboard.scopes);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            invitationId: "33333333-3333-4333-8333-333333333333",
            professionalEmail: "new.vet@example.invalid",
            token: "s".repeat(32),
            expiresAt: "2026-08-30T12:00:00.000Z",
          }),
        ),
      });
    });

    await page.goto("/operations");
    await page
      .getByLabel("E-mail profissional")
      .fill("new.vet@example.invalid");
    await page.getByRole("button", { name: "Criar convite" }).click();

    await expect(
      page.getByText("Convite criado para new.vet@example.invalid"),
    ).toBeVisible();
    await expect(page.getByLabel("Token de convite criado")).toHaveValue(
      "s".repeat(32),
    );
    await expect(page.locator("body")).not.toContainText("scopeId");
  });

  test("lets an administrator suspend a participant and report the revoked sessions", async ({
    page,
  }) => {
    await page.route("**/health/dependencies", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            status: "READY",
            dependencies: {
              postgres: "UP",
              qdrant: "DISABLED",
              ai: "DISABLED",
            },
          }),
        ),
      });
    });
    await page.route("**/api/v1/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(successEnvelope(multiScopeStaffDashboard)),
      });
    });
    await page.route("**/api/v1/internal/accounts/*/status", async (route) => {
      const request = route.request().postDataJSON() as Readonly<{
        readonly scopeId?: string;
        readonly expectedStatus?: string;
        readonly status?: string;
      }>;
      expect(request).toEqual({
        scopeId: multiScopeStaffDashboard.scopes[1],
        expectedStatus: "ACTIVE",
        status: "SUSPENDED",
      });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({ status: "SUSPENDED", revokedSessions: 2 }),
        ),
      });
    });

    await page.goto("/operations");
    await page.getByRole("button", { name: "Suspender" }).click();

    await expect(
      page.getByText("Conta atualizada: Suspenso. Sessões revogadas: 2."),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("tokenHash");
  });

  test("has no accessibility violations on the management surface", async ({
    page,
  }) => {
    await page.route("**/health/dependencies", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            status: "READY",
            dependencies: {
              postgres: "UP",
              qdrant: "DISABLED",
              ai: "DISABLED",
            },
          }),
        ),
      });
    });
    await page.route("**/api/v1/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(successEnvelope(staffDashboard)),
      });
    });

    await page.goto("/operations");
    await expect(page.getByTestId("staff-dashboard")).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
