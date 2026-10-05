import { afterEach, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import OperationsPage from "../app/operations/page";

import {
  unavailableResponse,
  successResponse,
  staffDashboard,
  readyDependencies,
} from "./operations-test-support";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState({}, document.title, "/");
});

function delayedResponse() {
  let complete: (response: Response) => void = () => {
    throw new Error("request not initialized");
  };
  const promise = new Promise<Response>((resolve) => {
    complete = resolve;
  });
  return { promise, resolve: (response: Response) => complete(response) };
}

function delayedJson() {
  let complete: (payload: unknown) => void = () => {
    throw new Error("JSON request not initialized");
  };
  const promise = new Promise<unknown>((resolve) => {
    complete = resolve;
  });
  return { promise, resolve: (payload: unknown) => complete(payload) };
}

function temporalReport(path: string, email: string): Response {
  const query = new URL(path, "http://browser.test").searchParams;
  const scopeId = query.get("scopeId");
  if (scopeId === null) throw new Error("scoped report fixture required");
  const moduleId = query.get("moduleId");
  const accountStatus = query.get("accountStatus");
  return successResponse({
    kind: "continuing_education_report",
    scopeId,
    generatedAt: "2026-10-03T12:00:00.000Z",
    filters: {
      scopeId,
      ...(moduleId === null ? {} : { moduleId }),
      ...(accountStatus === null ? {} : { accountStatus }),
    },
    summary: {
      participantCount: 1,
      invitedParticipants: 0,
      activeParticipants: 1,
      suspendedParticipants: 0,
      deactivatedParticipants: 0,
      assignedModules: 1,
      completedModules: 1,
      completionRatePercent: 100,
      completedDigitalMinutes: 360,
      completedDigitalHours: 6,
    },
    participants: [
      {
        participantId: "33333333-3333-4333-8333-333333333333",
        professionalEmail: email,
        accountStatus: "ACTIVE",
        assignedModules: 1,
        completedModules: 1,
        progressPercent: 100,
        completedDigitalMinutes: 360,
        completedDigitalHours: 6,
      },
    ],
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
    pagination: {
      page: Number(query.get("page") ?? "1"),
      pageSize: 25,
      totalParticipants: 1,
      totalPages: 1,
      hasNextPage: false,
    },
    learningEvidence: "ATIVIDADE_MODULAR_DIGITAL",
    hoursClaim: "NAO_CREDENCIADAS",
    practicalCompetenceClaim: "PROIBIDO_MVP",
  });
}

async function paintedTemporalUpdate() {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

it.each([200, 401, 503])(
  "T28 preserves fast B after slow A resolves last with status %s, including CSV",
  async (oldStatus) => {
    const scopeB = "22222222-2222-4222-8222-222222222222";
    const scopeA = "88888888-8888-4888-8888-888888888888";
    const slow = delayedResponse();
    let slowPath = "";
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input) => {
        const path = input.toString();
        if (path === "/api/v1/dashboard")
          return successResponse({
            ...staffDashboard(),
            scopes: [scopeB, scopeA],
          });
        if (path === "/health/dependencies") return readyDependencies();
        if (path.startsWith("/api/v1/internal/reports/continuing-education?")) {
          if (
            new URL(path, "http://browser.test").searchParams.get("scopeId") ===
            scopeA
          ) {
            slowPath = path;
            // Deliberately ignore AbortSignal: version/identity must also reject A.
            return slow.promise;
          }
          return temporalReport(path, "current-b@example.test");
        }
        return unavailableResponse();
      }),
    );
    const screen = await render(<OperationsPage />);
    const panel = screen.getByTestId("continuing-education-report");
    await expect
      .element(panel.getByText("current-b@example.test"))
      .toBeVisible();
    await screen
      .getByRole("combobox", { name: "Escopo de gestão" })
      .selectOptions(scopeA);
    await vi.waitFor(() => expect(slowPath).not.toBe(""));
    await screen
      .getByRole("combobox", { name: "Escopo de gestão" })
      .selectOptions(scopeB);
    await expect
      .element(panel.getByText("current-b@example.test"))
      .toBeVisible();
    slow.resolve(
      oldStatus === 200
        ? temporalReport(slowPath, "obsolete-a@example.test")
        : new Response("{}", { status: oldStatus }),
    );
    await paintedTemporalUpdate();
    await expect
      .element(panel.getByText("current-b@example.test"))
      .toBeVisible();
    expect(document.body.textContent).not.toContain("obsolete-a@example.test");
    expect(document.body.textContent).not.toContain("Relatório restrito");
    const createUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:http://browser.test/t28");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      () => undefined,
    );
    await panel.getByRole("button", { name: "Exportar página CSV" }).click();
    const blob = createUrl.mock.calls[0]?.[0];
    if (!(blob instanceof Blob)) throw new Error("actual CSV Blob required");
    const csv = await blob.text();
    expect(csv).toContain("current-b@example.test");
    expect(csv).not.toContain("obsolete-a@example.test");
  },
);

it("T28 keeps dirty filters usable while A is pending and exports the fast B query", async () => {
  const slow = delayedResponse();
  let slowPath = "";
  const requests: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input) => {
      const path = input.toString();
      if (path === "/api/v1/dashboard")
        return successResponse(staffDashboard());
      if (path === "/health/dependencies") return readyDependencies();
      if (path.startsWith("/api/v1/internal/reports/continuing-education?")) {
        requests.push(path);
        const params = new URL(path, "http://browser.test").searchParams;
        if (params.get("moduleId") === "M02" && !params.has("accountStatus")) {
          slowPath = path;
          return slow.promise;
        }
        return temporalReport(
          path,
          params.has("accountStatus")
            ? "dirty-b@example.test"
            : "initial@example.test",
        );
      }
      return unavailableResponse();
    }),
  );
  const screen = await render(<OperationsPage />);
  const panel = screen.getByTestId("continuing-education-report");
  await expect.element(panel.getByText("initial@example.test")).toBeVisible();
  await panel.getByRole("combobox", { name: "Módulo" }).selectOptions("M02");
  await vi.waitFor(() => expect(slowPath).not.toBe(""));
  await panel
    .getByRole("combobox", { name: "Conta", exact: true })
    .selectOptions("ACTIVE");
  await expect.element(panel.getByText("dirty-b@example.test")).toBeVisible();
  slow.resolve(temporalReport(slowPath, "dirty-obsolete-a@example.test"));
  await paintedTemporalUpdate();
  await expect
    .element(panel.getByRole("combobox", { name: "Módulo" }))
    .toHaveValue("M02");
  await expect
    .element(panel.getByRole("combobox", { name: "Conta", exact: true }))
    .toHaveValue("ACTIVE");
  await expect.element(panel.getByText("dirty-b@example.test")).toBeVisible();
  expect(
    requests.some((path) => {
      const query = new URL(path, "http://browser.test").searchParams;
      return (
        query.get("moduleId") === "M02" &&
        query.get("accountStatus") === "ACTIVE"
      );
    }),
  ).toBe(true);
  const createUrl = vi
    .spyOn(URL, "createObjectURL")
    .mockReturnValue("blob:http://browser.test/t28-dirty");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
    () => undefined,
  );
  await panel.getByRole("button", { name: "Exportar página CSV" }).click();
  const blob = createUrl.mock.calls[0]?.[0];
  if (!(blob instanceof Blob)) throw new Error("actual filtered CSV required");
  const csv = await blob.text();
  expect(csv).toContain("dirty-b@example.test");
  expect(csv).not.toContain("dirty-obsolete-a@example.test");
});

it("T28 binds reflection aggregates to the latest authorized scope", async () => {
  const scopeB = "22222222-2222-4222-8222-222222222222";
  const scopeA = "88888888-8888-4888-8888-888888888888";
  const slow = delayedResponse();
  let oldScopeRequested = false;
  const reflection = (scopeId: string, moduleId: string) =>
    successResponse({
      kind: "reflection_management_aggregate",
      scopeId,
      generatedAt: "2026-10-03T12:00:00.000Z",
      modules: [
        {
          moduleId,
          totalAssignments: 1,
          counts: { NAO_INICIADA: 0, EM_ANDAMENTO: 0, CONCLUIDA: 1 },
        },
      ],
      evidence: "REFLEXAO_DIGITAL",
      practicalCompetenceClaim: "PROIBIDO_MVP",
    });
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input) => {
      const path = input.toString();
      if (path === "/api/v1/dashboard")
        return successResponse({
          ...staffDashboard(),
          scopes: [scopeB, scopeA],
        });
      if (path === "/health/dependencies") return readyDependencies();
      if (path.startsWith("/api/v1/internal/reports/reflections?")) {
        if (
          new URL(path, "http://browser.test").searchParams.get("scopeId") ===
          scopeA
        ) {
          oldScopeRequested = true;
          return slow.promise;
        }
        return reflection(scopeB, "M02");
      }
      return unavailableResponse();
    }),
  );
  const screen = await render(<OperationsPage />);
  const panel = screen.getByTestId("reflection-management-report");
  await expect
    .element(panel.getByRole("rowheader", { name: "M02", exact: true }))
    .toBeVisible();
  await screen
    .getByRole("combobox", { name: "Escopo de gestão" })
    .selectOptions(scopeA);
  await vi.waitFor(() => expect(oldScopeRequested).toBe(true));
  await screen
    .getByRole("combobox", { name: "Escopo de gestão" })
    .selectOptions(scopeB);
  await expect
    .element(panel.getByRole("rowheader", { name: "M02", exact: true }))
    .toBeVisible();
  slow.resolve(reflection(scopeA, "M03"));
  await paintedTemporalUpdate();
  await expect
    .element(panel.getByRole("rowheader", { name: "M02", exact: true }))
    .toBeVisible();
  await expect
    .element(panel.getByRole("rowheader", { name: "M03", exact: true }))
    .not.toBeInTheDocument();
});

it.each([true, false])(
  "T28 ignores delayed A JSON after B, including malformed A payload: %s",
  async (validOldPayload) => {
    const scopeB = "22222222-2222-4222-8222-222222222222";
    const scopeA = "88888888-8888-4888-8888-888888888888";
    const slowJson = delayedJson();
    let oldPath = "";
    let jsonStarted = false;
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input) => {
        const path = input.toString();
        if (path === "/api/v1/dashboard")
          return successResponse({
            ...staffDashboard(),
            scopes: [scopeB, scopeA],
          });
        if (path === "/health/dependencies") return readyDependencies();
        if (path.startsWith("/api/v1/internal/reports/continuing-education?")) {
          if (
            new URL(path, "http://browser.test").searchParams.get("scopeId") ===
            scopeA
          ) {
            oldPath = path;
            const response = temporalReport(
              path,
              "json-obsolete-a@example.test",
            );
            vi.spyOn(response, "json").mockImplementation(() => {
              jsonStarted = true;
              return slowJson.promise;
            });
            return response;
          }
          return temporalReport(path, "json-current-b@example.test");
        }
        return unavailableResponse();
      }),
    );
    const screen = await render(<OperationsPage />);
    const panel = screen.getByTestId("continuing-education-report");
    await expect
      .element(panel.getByText("json-current-b@example.test"))
      .toBeVisible();
    await screen
      .getByRole("combobox", { name: "Escopo de gestão" })
      .selectOptions(scopeA);
    await vi.waitFor(() => expect(jsonStarted).toBe(true));
    await screen
      .getByRole("combobox", { name: "Escopo de gestão" })
      .selectOptions(scopeB);
    await expect
      .element(panel.getByText("json-current-b@example.test"))
      .toBeVisible();
    slowJson.resolve(
      validOldPayload
        ? await temporalReport(oldPath, "json-obsolete-a@example.test").json()
        : { success: false, error: { message: "obsolete private detail" } },
    );
    await paintedTemporalUpdate();
    await expect
      .element(panel.getByText("json-current-b@example.test"))
      .toBeVisible();
    expect(document.body.textContent).not.toContain(
      "json-obsolete-a@example.test",
    );
    expect(document.body.textContent).not.toContain("obsolete private detail");
  },
);

it("T28 aborts pending report on unmount and cannot contaminate a new authorized view", async () => {
  const slow = delayedResponse();
  let reads = 0;
  let oldPath = "";
  let signal: AbortSignal | null | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input, init) => {
      const path = input.toString();
      if (path === "/api/v1/dashboard")
        return successResponse(staffDashboard());
      if (path === "/health/dependencies") return readyDependencies();
      if (path.startsWith("/api/v1/internal/reports/continuing-education?")) {
        reads += 1;
        if (reads === 1) {
          oldPath = path;
          signal = init?.signal;
          return slow.promise;
        }
        return temporalReport(path, "mounted-current@example.test");
      }
      return unavailableResponse();
    }),
  );
  const first = await render(<OperationsPage />);
  await vi.waitFor(() => expect(reads).toBe(1));
  expect(signal).toBeInstanceOf(AbortSignal);
  await first.unmount();
  expect(signal?.aborted).toBe(true);
  const second = await render(<OperationsPage />);
  await expect
    .element(second.getByText("mounted-current@example.test"))
    .toBeVisible();
  slow.resolve(temporalReport(oldPath, "unmounted-obsolete@example.test"));
  await paintedTemporalUpdate();
  await expect
    .element(second.getByText("mounted-current@example.test"))
    .toBeVisible();
  expect(document.body.textContent).not.toContain(
    "unmounted-obsolete@example.test",
  );
});

it.each([
  {
    status: 401,
    heading: "Sessão de gestão necessária",
    message: "Entre com uma conta interna para consultar esta superfície.",
  },
  {
    status: 403,
    heading: "Visão restrita",
    message:
      "Esta conta não possui autorização para consultar esta superfície.",
  },
])(
  "keeps internal controls hidden when the dashboard returns $status",
  async ({ status, heading, message }) => {
    const requests: string[] = [];
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const path = typeof input === "string" ? input : input.toString();
      requests.push(path);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: status === 401 ? "unauthorized" : "forbidden",
            message: "Synthetic authorization detail.",
          },
        }),
        {
          status,
          headers: { "content-type": "application/json" },
        },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const screen = await render(<OperationsPage />);

    await expect
      .element(screen.getByRole("heading", { name: heading }))
      .toBeVisible();
    await expect.element(screen.getByText(message)).toBeVisible();
    expect(requests).toEqual(["/api/v1/dashboard"]);
    expect(document.body.textContent).not.toContain(
      "Synthetic authorization detail.",
    );
    expect(document.body.textContent).not.toContain(
      "Fila de relatos do produto",
    );
    expect(document.body.textContent).not.toContain("Criar convite");
  },
);

it("retries dashboard validation after a transient internal error", async () => {
  let dashboardReads = 0;
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const path = typeof input === "string" ? input : input.toString();
    if (path === "/api/v1/dashboard") {
      dashboardReads += 1;
      if (dashboardReads === 1) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "internal_error",
              message: "Synthetic temporary failure.",
            },
          }),
          {
            status: 503,
            headers: { "content-type": "application/json" },
          },
        );
      }
      return successResponse(staffDashboard());
    }
    if (path === "/health/dependencies") return readyDependencies();
    return unavailableResponse();
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<OperationsPage />);

  await expect
    .element(screen.getByRole("heading", { name: "Acesso indisponível" }))
    .toBeVisible();
  await expect
    .element(screen.getByRole("button", { name: "Tentar novamente" }))
    .toBeVisible();
  expect(document.body.textContent).not.toContain(
    "Synthetic temporary failure.",
  );

  await screen.getByRole("button", { name: "Tentar novamente" }).click();

  await expect
    .element(screen.getByRole("heading", { name: "Saúde do ambiente" }))
    .toBeVisible();
  expect(dashboardReads).toBe(2);
});

it("contains malformed JSON across operational panels and keeps scoped retries available", async () => {
  const requests: string[] = [];
  let dashboardReads = 0;
  const malformedResponse = () => new Response("", { status: 200 });
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const path = typeof input === "string" ? input : input.toString();
    requests.push(path);
    if (path === "/api/v1/dashboard") {
      dashboardReads += 1;
      return dashboardReads === 1
        ? malformedResponse()
        : successResponse(staffDashboard());
    }
    if (path === "/health/dependencies") return malformedResponse();
    if (
      path.startsWith("/api/v1/internal/reports/") ||
      path.startsWith("/api/v1/internal/feedback?") ||
      path.startsWith("/api/v1/internal/appeals/review-queue?") ||
      path.startsWith("/api/v1/audit?")
    ) {
      return malformedResponse();
    }
    return unavailableResponse();
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<OperationsPage />);

  const accessGate = screen.getByTestId("internal-access-gate");
  await expect
    .element(
      accessGate.getByText(
        "Não foi possível validar a autorização da sessão interna.",
      ),
    )
    .toBeVisible();
  await accessGate.getByRole("button", { name: "Tentar novamente" }).click();
  await expect
    .element(screen.getByRole("heading", { name: "Acompanhar evolução" }))
    .toBeVisible();

  const report = screen.getByTestId("continuing-education-report");
  const feedbackQueue = screen.getByTestId("feedback-triage-queue");
  const reflection = screen.getByTestId("reflection-management-report");
  const appealQueue = screen.getByTestId("appeal-review-queue");
  const auditTrail = screen.getByTestId("audit-trail");
  await expect
    .element(
      report.getByText("Não foi possível carregar o relatório educacional."),
    )
    .toBeVisible();
  await expect
    .element(
      feedbackQueue.getByText("Não foi possível carregar a fila de relatos."),
    )
    .toBeVisible();
  await expect
    .element(
      reflection.getByText("Não foi possível carregar o agregado de reflexão."),
    )
    .toBeVisible();
  await expect
    .element(
      appealQueue.getByText("Não foi possível carregar a fila de contestação."),
    )
    .toBeVisible();
  await expect
    .element(
      auditTrail.getByText("Não foi possível carregar a trilha de auditoria."),
    )
    .toBeVisible();
  await expect
    .element(
      screen.getByText("Não foi possível consultar o estado operacional."),
    )
    .toBeVisible();
  expect(document.body.textContent).not.toContain("SyntaxError");

  await report.getByRole("button", { name: "Tentar novamente" }).click();
  await feedbackQueue.getByRole("button", { name: "Tentar novamente" }).click();
  await reflection.getByRole("button", { name: "Tentar novamente" }).click();
  await appealQueue.getByRole("button", { name: "Tentar novamente" }).click();
  await auditTrail.getByRole("button", { name: "Tentar novamente" }).click();

  await expect
    .poll(
      () =>
        requests.filter((path) =>
          path.startsWith("/api/v1/internal/reports/continuing-education?"),
        ).length,
    )
    .toBe(2);
  await expect
    .poll(
      () =>
        requests.filter((path) => path.startsWith("/api/v1/internal/feedback?"))
          .length,
    )
    .toBe(2);
  await expect
    .poll(
      () =>
        requests.filter((path) =>
          path.startsWith("/api/v1/internal/reports/reflections?"),
        ).length,
    )
    .toBe(2);
  await expect
    .poll(
      () =>
        requests.filter((path) =>
          path.startsWith("/api/v1/internal/appeals/review-queue?"),
        ).length,
    )
    .toBe(2);
  await expect
    .poll(
      () => requests.filter((path) => path.startsWith("/api/v1/audit?")).length,
    )
    .toBe(2);
  expect(dashboardReads).toBe(2);
});

it("renders scoped individual progress and formative follow-up signals", async () => {
  const participantId = "33333333-3333-4333-8333-333333333333";
  const scopeId = "22222222-2222-4222-8222-222222222222";
  const dashboardRequests: RequestInit[] = [];
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    if (path === "/api/v1/dashboard") {
      if (init !== undefined) dashboardRequests.push(init);
      return successResponse({
        ...staffDashboard([
          {
            participantId,
            professionalEmail: "vet.synthetic@example.invalid",
            accountStatus: "ACTIVE",
            scopeIds: [scopeId],
            lastSeenAt: "2026-10-01T12:00:00.000Z",
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
                lastEvaluatedAt: "2026-10-01T12:00:00.000Z",
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
        ]),
        scopes: [scopeId],
        metrics: {
          ...staffDashboard().metrics,
          activeParticipants: 1,
          assignedModules: 2,
          completedModules: 1,
          completionRatePercent: 50,
          medianProgressPercent: 50,
          pendingCorrections: 1,
          remediationParticipants: 1,
          retentionReviewsPending: 1,
          openFeedback: 1,
        },
      });
    }
    if (path === "/health/dependencies") return readyDependencies();
    return unavailableResponse();
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<OperationsPage />);

  await expect
    .element(screen.getByRole("heading", { name: "Acompanhar evolução" }))
    .toBeVisible();
  const participants = screen.getByRole("region", {
    name: "Tabela de evolução dos profissionais",
  });
  await expect
    .element(participants.getByText("vet.synthetic@example.invalid"))
    .toBeVisible();
  await expect.element(participants.getByText("50%")).toBeVisible();
  await expect.element(participants.getByText("1 de 2 módulos")).toBeVisible();
  await expect
    .element(participants.getByText("Diagnóstico formativo por tema"))
    .toBeVisible();
  await expect
    .element(participants.getByText("Núcleo clínico e segurança"))
    .toBeVisible();
  await expect
    .element(participants.getByText("Aguardar correção humana"))
    .toBeVisible();
  await expect
    .element(participants.getByText("1 correções · 1 reforços · 1 feedbacks"))
    .toBeVisible();
  await expect
    .element(
      participants.getByText(
        "Sem nota global; não representa competência prática ou autorização clínica.",
      ),
    )
    .toBeVisible();
  expect(dashboardRequests).toHaveLength(1);
  expect(dashboardRequests[0]?.method).toBeUndefined();
  expect(dashboardRequests[0]).toMatchObject({
    credentials: "include",
    cache: "no-store",
  });
  expect(document.body.textContent).not.toContain(participantId);
  expect(document.body.textContent).not.toContain(scopeId);
});

it("loads scoped appeal history and a read-only impact preview", async () => {
  const scopeId = "22222222-2222-4222-8222-222222222222";
  const appealId = "44444444-4444-4444-8444-444444444444";
  const participantId = "33333333-3333-4333-8333-333333333333";
  const reviewerId = "66666666-6666-4666-8666-666666666666";
  const attemptId = "55555555-5555-4555-8555-555555555555";
  const itemId = "77777777-7777-4777-8777-777777777777";
  const appealRequests: {
    readonly path: string;
    readonly init?: RequestInit;
  }[] = [];
  let previewReads = 0;
  let historyReads = 0;
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    if (path === "/api/v1/dashboard") return successResponse(staffDashboard());
    if (path === "/health/dependencies") return readyDependencies();
    if (path.startsWith("/api/v1/internal/appeals/")) {
      appealRequests.push({ path, ...(init === undefined ? {} : { init }) });
      if (path.includes("/review-queue?")) {
        return successResponse({
          kind: "appeal_review_queue",
          scopeId,
          generatedAt: "2026-10-01T12:00:00.000Z",
          filters: { scopeId, limit: 50 },
          items: [
            {
              appealId,
              participantId,
              attemptId,
              itemId,
              justification:
                "A justificativa sintética aguarda revisão interna.",
              createdAt: "2026-10-01T10:00:00.000Z",
              dueAt: "2026-10-03T10:00:00.000Z",
              status: "ABERTA",
              version: 1,
            },
          ],
        });
      }
      if (path.endsWith(`/${appealId}/history`)) {
        historyReads += 1;
        if (historyReads === 1) return new Response("", { status: 200 });
        return successResponse({
          appealId,
          events: [
            {
              historyId: "88888888-8888-4888-8888-888888888888",
              appealId,
              appealVersion: 1,
              eventType: "DECIDIR",
              fromStatus: "EM_REVISAO",
              toStatus: "DECIDIDA",
              reviewerId,
              decision: "MANTER_RESULTADO",
              decisionRationale: "Rationale interno sintético.",
              decisionAt: "2026-10-01T12:00:00.000Z",
              decisionCorrelationId: "99999999-9999-4999-8999-999999999999",
              createdAt: "2026-10-01T12:00:01.000Z",
            },
          ],
        });
      }
      if (path.endsWith(`/${appealId}/impact-preview?decision=ANULAR_ITEM`)) {
        previewReads += 1;
        if (previewReads === 1) return new Response("", { status: 200 });
        return successResponse({
          kind: "appeal_decision_impact_preview",
          appealId,
          decision: "ANULAR_ITEM",
          appeal: { status: "ABERTA", version: 1 },
          target: {
            attemptId,
            itemId,
            attemptStatus: "CORRIGIDA_AUTOMATICAMENTE",
            attemptVersion: 3,
          },
          latestResult: { availability: "AVAILABLE", version: 2 },
          impact: {
            scoreImpact: "NOT_COMPUTED",
            recalculation: "NOT_AVAILABLE_IN_THIS_SLICE",
            automaticMutation: "NONE",
            publication: "NOT_PERFORMED",
          },
        });
      }
    }
    return unavailableResponse();
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<OperationsPage />);

  const queue = screen.getByTestId("appeal-review-queue");
  await expect
    .element(
      queue.getByText("A justificativa sintética aguarda revisão interna."),
    )
    .toBeVisible();
  await expect.element(queue.getByText("Não atribuído")).toBeVisible();
  await queue.getByRole("button", { name: "Prévia de anulação" }).click();
  const impact = screen.getByTestId("appeal-impact-preview");
  await expect
    .element(impact.getByText("Não foi possível carregar a prévia."))
    .toBeVisible();
  await impact.getByRole("button", { name: "Tentar novamente" }).click();
  await expect.element(impact.getByText(/Cenário candidato/u)).toBeVisible();
  await expect.element(impact.getByText(/Score: não calculado/u)).toBeVisible();
  await expect
    .element(impact.getByText(/publicação: não executada/u))
    .toBeVisible();
  await queue.getByRole("button", { name: "Ver histórico" }).click();
  const history = screen.getByTestId("appeal-history");
  await expect
    .element(history.getByText("Não foi possível carregar o histórico."))
    .toBeVisible();
  await history.getByRole("button", { name: "Tentar novamente" }).click();
  await expect
    .element(history.getByText("Rationale interno sintético."))
    .toBeVisible();
  await expect.element(history.getByText("Somente leitura")).toBeVisible();
  expect(appealRequests).toHaveLength(5);
  expect(appealRequests[0]?.path).toBe(
    `/api/v1/internal/appeals/review-queue?scopeId=${scopeId}`,
  );
  expect(appealRequests[1]?.path).toBe(
    `/api/v1/internal/appeals/${appealId}/impact-preview?decision=ANULAR_ITEM`,
  );
  expect(appealRequests[2]?.path).toBe(
    `/api/v1/internal/appeals/${appealId}/impact-preview?decision=ANULAR_ITEM`,
  );
  expect(appealRequests[3]?.path).toBe(
    `/api/v1/internal/appeals/${appealId}/history`,
  );
  expect(appealRequests[4]?.path).toBe(
    `/api/v1/internal/appeals/${appealId}/history`,
  );
  expect(
    appealRequests.every(({ init }) => init?.credentials === "include"),
  ).toBe(true);
  expect(appealRequests.every(({ init }) => init?.method === undefined)).toBe(
    true,
  );
  expect(document.body.textContent).not.toContain(participantId);
  expect(document.body.textContent).not.toContain(reviewerId);
  expect(document.body.textContent).not.toContain("scopeId");
});

it("redacts a forbidden appeal impact preview without showing an outcome", async () => {
  const scopeId = "22222222-2222-4222-8222-222222222222";
  const appealId = "44444444-4444-4444-8444-444444444444";
  const requests: { readonly path: string; readonly init?: RequestInit }[] = [];
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    requests.push({ path, ...(init === undefined ? {} : { init }) });
    if (path === "/api/v1/dashboard") return successResponse(staffDashboard());
    if (path === "/health/dependencies") return readyDependencies();
    if (path.startsWith("/api/v1/internal/appeals/review-queue?")) {
      return successResponse({
        kind: "appeal_review_queue",
        scopeId,
        generatedAt: "2026-10-02T09:00:00.000Z",
        filters: { scopeId, limit: 50 },
        items: [
          {
            appealId,
            participantId: "33333333-3333-4333-8333-333333333333",
            attemptId: "55555555-5555-4555-8555-555555555555",
            itemId: "77777777-7777-4777-8777-777777777777",
            justification: "Contestação sintética para teste de acesso.",
            createdAt: "2026-10-01T10:00:00.000Z",
            dueAt: "2026-10-03T10:00:00.000Z",
            status: "ABERTA",
            version: 1,
          },
        ],
      });
    }
    if (path.endsWith(`/${appealId}/impact-preview?decision=ANULAR_ITEM`)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "forbidden",
            message: "synthetic_internal_appeal_detail_must_not_leak",
          },
        }),
        { status: 403, headers: { "content-type": "application/json" } },
      );
    }
    return unavailableResponse();
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<OperationsPage />);
  const queue = screen.getByTestId("appeal-review-queue");
  await expect
    .element(queue.getByText("Contestação sintética para teste de acesso."))
    .toBeVisible();
  await queue.getByRole("button", { name: "Prévia de anulação" }).click();

  const impact = screen.getByTestId("appeal-impact-preview");
  await expect
    .element(
      impact.getByText(
        "Esta conta não possui autorização para consultar esta prévia.",
      ),
    )
    .toBeVisible();
  expect(document.body.textContent).not.toContain(
    "synthetic_internal_appeal_detail_must_not_leak",
  );
  expect(document.body.textContent).not.toContain("Cenário candidato");
  expect(document.body.textContent).not.toContain("ANULADA");

  const impactRequest = requests.find((request) =>
    request.path.endsWith(
      `/internal/appeals/${appealId}/impact-preview?decision=ANULAR_ITEM`,
    ),
  );
  expect(impactRequest).toMatchObject({
    path: `/api/v1/internal/appeals/${appealId}/impact-preview?decision=ANULAR_ITEM`,
    init: { credentials: "include", cache: "no-store" },
  });
  expect(impactRequest?.init?.method).toBeUndefined();
});

it("renders scoped continuing education and reflection aggregates", async () => {
  const scopeId = "22222222-2222-4222-8222-222222222222";
  const reportRequests: {
    readonly path: string;
    readonly init?: RequestInit;
  }[] = [];
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    if (path === "/api/v1/dashboard") return successResponse(staffDashboard());
    if (path === "/health/dependencies") return readyDependencies();
    if (path.startsWith("/api/v1/internal/reports/continuing-education?")) {
      reportRequests.push({ path, ...(init === undefined ? {} : { init }) });
      const requestUrl = new URL(path, "http://browser.test");
      const moduleId = requestUrl.searchParams.get("moduleId");
      const accountStatus = requestUrl.searchParams.get("accountStatus");
      const page = Number(requestUrl.searchParams.get("page") ?? "1");
      return successResponse({
        kind: "continuing_education_report",
        scopeId,
        generatedAt: "2026-10-01T12:00:00.000Z",
        filters: {
          scopeId,
          ...(moduleId === null ? {} : { moduleId }),
          ...(accountStatus === null ? {} : { accountStatus }),
        },
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
        participants: [
          {
            participantId: "33333333-3333-4333-8333-333333333333",
            professionalEmail: "=synthetic@example.invalid",
            accountStatus: "ACTIVE",
            assignedModules: 2,
            completedModules: 1,
            progressPercent: 50,
            completedDigitalMinutes: 360,
            completedDigitalHours: 6,
            lastSeenAt: "2026-10-01T11:00:00.000Z",
          },
        ],
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
        pagination: {
          page,
          pageSize: 25,
          totalParticipants: 1,
          totalPages: 2,
          hasNextPage: page < 2,
        },
        learningEvidence: "ATIVIDADE_MODULAR_DIGITAL",
        hoursClaim: "NAO_CREDENCIADAS",
        practicalCompetenceClaim: "PROIBIDO_MVP",
      });
    }
    if (path.startsWith("/api/v1/internal/reports/reflections?")) {
      return successResponse({
        kind: "reflection_management_aggregate",
        scopeId,
        generatedAt: "2026-10-01T12:00:00.000Z",
        modules: [
          {
            moduleId: "M02",
            totalAssignments: 3,
            counts: { NAO_INICIADA: 1, EM_ANDAMENTO: 1, CONCLUIDA: 1 },
          },
        ],
        evidence: "REFLEXAO_DIGITAL",
        practicalCompetenceClaim: "PROIBIDO_MVP",
      });
    }
    return unavailableResponse();
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<OperationsPage />);

  const report = screen.getByTestId("continuing-education-report");
  await expect
    .element(report.getByText("=synthetic@example.invalid"))
    .toBeVisible();
  await expect
    .element(report.getByText(/não hora CPD credenciada/u))
    .toBeVisible();
  await expect
    .element(report.getByText("Horas digitais concluídas"))
    .toBeVisible();
  const reflection = screen.getByTestId("reflection-management-report");
  await expect
    .element(
      reflection.getByRole("heading", { name: "Estado agregado por módulo" }),
    )
    .toBeVisible();
  await expect
    .element(
      reflection.getByRole("region", {
        name: "Tabela de estados de reflexão digital por módulo",
      }),
    )
    .toBeVisible();
  expect(
    reportRequests.some(({ path }) => {
      const requestUrl = new URL(path, "http://browser.test");
      return (
        requestUrl.searchParams.get("scopeId") === scopeId &&
        requestUrl.searchParams.get("page") === "1" &&
        requestUrl.searchParams.get("pageSize") === "25"
      );
    }),
  ).toBe(true);

  await report.getByRole("combobox").first().selectOptions("M02");
  await report.getByRole("combobox").nth(1).selectOptions("ACTIVE");
  await expect
    .poll(() =>
      reportRequests.some(({ path }) => {
        const requestUrl = new URL(path, "http://browser.test");
        return (
          requestUrl.searchParams.get("scopeId") === scopeId &&
          requestUrl.searchParams.get("moduleId") === "M02" &&
          requestUrl.searchParams.get("accountStatus") === "ACTIVE"
        );
      }),
    )
    .toBe(true);
  await report.getByRole("button", { name: "Próxima página" }).click();
  await expect
    .element(report.getByText("Página 2 de 2 · 1 participantes"))
    .toBeVisible();
  await expect
    .poll(() =>
      reportRequests.some(({ path }) => {
        const requestUrl = new URL(path, "http://browser.test");
        return (
          requestUrl.searchParams.get("scopeId") === scopeId &&
          requestUrl.searchParams.get("page") === "2" &&
          requestUrl.searchParams.get("moduleId") === "M02" &&
          requestUrl.searchParams.get("accountStatus") === "ACTIVE"
        );
      }),
    )
    .toBe(true);
  await report.getByRole("button", { name: "Página anterior" }).click();
  await expect
    .element(report.getByText("Página 1 de 2 · 1 participantes"))
    .toBeVisible();
  expect(
    reportRequests.every(({ init }) => init?.credentials === "include"),
  ).toBe(true);
  expect(document.body.textContent).not.toContain(
    "33333333-3333-4333-8333-333333333333",
  );
  expect(document.body.textContent).not.toContain(scopeId);

  const createdObjectUrl = "blob:https://browser.test/synthetic-report";
  const createObjectUrl = vi
    .spyOn(URL, "createObjectURL")
    .mockImplementation(() => createdObjectUrl);
  const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL");
  let downloadAttributes: { href: string; filename: string } | null = null;
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloadAttributes = { href: this.href, filename: this.download };
  });

  await report.getByRole("button", { name: "Exportar página CSV" }).click();

  expect(createObjectUrl).toHaveBeenCalledOnce();
  expect(revokeObjectUrl).toHaveBeenCalledWith(createdObjectUrl);
  if (downloadAttributes === null) {
    throw new Error("The synthetic CSV download was not created.");
  }
  const exportedBlob = createObjectUrl.mock.calls[0]?.[0];
  if (!(exportedBlob instanceof Blob)) {
    throw new Error("The synthetic CSV download was not a Blob.");
  }
  expect(downloadAttributes).toEqual({
    href: createdObjectUrl,
    filename: "cvg-participacao-digital-pagina-1.csv",
  });
  expect(exportedBlob.type).toBe("text/csv;charset=utf-8");
  const csvBytes = new Uint8Array(await exportedBlob.arrayBuffer());
  expect(Array.from(csvBytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
  const csv = new TextDecoder().decode(csvBytes.slice(3));
  expect(csv).toContain("email_profissional,status_conta,modulos_atribuidos");
  expect(csv).toContain(
    "\r\n\t=synthetic@example.invalid,ACTIVE,2,1,50,360,6,2026-10-01T11:00:00.000Z",
  );
});

it("shows a redacted dependency failure and a retry action", async () => {
  const requests: string[] = [];
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const path = typeof input === "string" ? input : input.toString();
    requests.push(path);
    return path === "/api/v1/dashboard"
      ? successResponse(staffDashboard())
      : unavailableResponse();
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<OperationsPage />);

  await expect
    .element(screen.getByRole("heading", { name: "Saúde do ambiente" }))
    .toBeVisible();
  await expect
    .element(screen.getByRole("heading", { name: "Acompanhar evolução" }))
    .toBeVisible();
  await expect
    .element(
      screen.getByText("Não foi possível consultar o estado operacional."),
    )
    .toHaveTextContent("Não foi possível consultar o estado operacional.");
  expect(requests).toContain("/health/dependencies");
  expect(requests).toContain("/api/v1/dashboard");
  expect(document.body.textContent).not.toContain("Synthetic fixture.");

  const countBeforeRetry = fetchMock.mock.calls.length;
  await screen
    .getByRole("button", { name: "Tentar novamente" })
    .first()
    .click();
  await expect
    .element(
      screen.getByText("Não foi possível consultar o estado operacional."),
    )
    .toHaveTextContent("Não foi possível consultar o estado operacional.");
  expect(fetchMock.mock.calls.length).toBeGreaterThan(countBeforeRetry);
});

it("creates a scoped invitation and exposes its one-time token", async () => {
  const email = "cvg-remediation@example.invalid";
  const token = "s".repeat(32);
  const invitationRequests: RequestInit[] = [];
  let invitationCalls = 0;
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    if (path === "/api/v1/dashboard") return successResponse(staffDashboard());
    if (path === "/health/dependencies") return readyDependencies();
    if (path === "/api/v1/internal/invitations") {
      if (init !== undefined) invitationRequests.push(init);
      invitationCalls += 1;
      if (invitationCalls === 1) return new Response("", { status: 201 });
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            professionalEmail: email,
            token,
            expiresAt: "2026-10-09T00:00:00.000Z",
          },
          meta: { request_id: "browser-test" },
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      );
    }
    return unavailableResponse();
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<OperationsPage />);

  await expect
    .element(screen.getByRole("heading", { name: "Saúde do ambiente" }))
    .toBeVisible();
  await screen.getByLabelText("E-mail profissional").fill(email);
  await screen.getByRole("button", { name: "Criar convite" }).click();
  await expect
    .element(screen.getByText("Não foi possível criar o convite."))
    .toBeVisible();
  expect(document.body.textContent).not.toContain(token);
  await screen.getByRole("button", { name: "Criar convite" }).click();

  await expect
    .element(screen.getByText(`Convite criado para ${email}`))
    .toBeVisible();
  await expect
    .element(screen.getByLabelText("Token de convite criado"))
    .toHaveValue(token);
  expect(invitationRequests).toHaveLength(2);
  expect(invitationRequests[1]).toMatchObject({
    method: "POST",
    credentials: "include",
    body: JSON.stringify({
      professionalEmail: email,
      invitedRoles: ["PARTICIPANT"],
      invitedScopes: ["22222222-2222-4222-8222-222222222222"],
      expiresInSeconds: 604_800,
    }),
  });
});

it("resends an invitation to an invited participant in the selected scope", async () => {
  const participantId = "33333333-3333-4333-8333-333333333333";
  const scopeId = "22222222-2222-4222-8222-222222222222";
  const email = "invited.synthetic@example.invalid";
  const token = "i".repeat(40);
  const invitationRequests: RequestInit[] = [];
  let resendCalls = 0;
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    if (path === "/api/v1/dashboard") {
      return successResponse(
        staffDashboard([
          {
            participantId,
            professionalEmail: email,
            accountStatus: "INVITED",
            scopeIds: [scopeId],
            progress: {
              assignedModules: 0,
              completedModules: 0,
              progressPercent: null,
              remediationModules: 0,
              retentionReviewsPending: 0,
            },
            pendingCorrections: 0,
            openFeedback: 0,
            nextAction: "AGUARDAR_ATRIBUICAO",
          },
        ]),
      );
    }
    if (path === "/health/dependencies") return readyDependencies();
    if (path === `/api/v1/internal/accounts/${participantId}/invitation`) {
      if (init !== undefined) invitationRequests.push(init);
      resendCalls += 1;
      if (resendCalls === 1) return new Response("", { status: 200 });
      return successResponse({
        professionalEmail: email,
        token,
        expiresAt: "2026-10-09T00:00:00.000Z",
      });
    }
    return unavailableResponse();
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<OperationsPage />);

  await screen.getByRole("button", { name: "Reenviar convite" }).click();
  await expect
    .element(screen.getByText("Não foi possível reenviar o convite."))
    .toBeVisible();
  await screen.getByRole("button", { name: "Reenviar convite" }).click();

  await expect
    .element(screen.getByText("Convite reenviado com sucesso."))
    .toBeVisible();
  await expect
    .element(screen.getByText(`Convite reenviado para ${email}`))
    .toBeVisible();
  await expect
    .element(screen.getByLabelText("Token de convite criado"))
    .toHaveValue(token);
  expect(invitationRequests).toHaveLength(2);
  expect(invitationRequests[1]).toMatchObject({
    method: "POST",
    credentials: "include",
    body: JSON.stringify({ scopeId, expiresInSeconds: 604_800 }),
  });
  expect(document.body.textContent).not.toContain(participantId);
});

it("suspends an active participant and refreshes the scoped account state", async () => {
  const participantId = "33333333-3333-4333-8333-333333333333";
  const scopeId = "22222222-2222-4222-8222-222222222222";
  let accountStatus: "ACTIVE" | "SUSPENDED" = "ACTIVE";
  const statusRequests: RequestInit[] = [];
  let statusCalls = 0;
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    if (path === "/api/v1/dashboard") {
      return successResponse(
        staffDashboard([
          {
            participantId,
            professionalEmail: "participant.synthetic@example.invalid",
            accountStatus,
            scopeIds: [scopeId],
            progress: {
              assignedModules: 0,
              completedModules: 0,
              progressPercent: null,
              remediationModules: 0,
              retentionReviewsPending: 0,
            },
            pendingCorrections: 0,
            openFeedback: 0,
            nextAction: "AGUARDAR_ATRIBUICAO",
          },
        ]),
      );
    }
    if (path === "/health/dependencies") return readyDependencies();
    if (path === `/api/v1/internal/accounts/${participantId}/status`) {
      if (init !== undefined) statusRequests.push(init);
      statusCalls += 1;
      if (statusCalls === 1) return new Response("", { status: 200 });
      const body = JSON.parse(String(init?.body)) as {
        status: "ACTIVE" | "SUSPENDED";
      };
      accountStatus = body.status;
      return successResponse({ status: body.status, revokedSessions: 2 });
    }
    return unavailableResponse();
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<OperationsPage />);

  await screen.getByRole("button", { name: "Suspender" }).click();
  await expect
    .element(screen.getByText("Não foi possível atualizar a conta."))
    .toBeVisible();
  await screen.getByRole("button", { name: "Suspender" }).click();
  await expect
    .element(
      screen.getByText("Conta atualizada: Suspenso. Sessões revogadas: 2."),
    )
    .toBeVisible();
  await expect
    .element(screen.getByRole("button", { name: "Reativar" }))
    .toBeVisible();
  await screen.getByRole("button", { name: "Reativar" }).click();
  await expect
    .element(screen.getByText("Conta atualizada: Ativo. Sessões revogadas: 2."))
    .toBeVisible();
  await expect
    .element(screen.getByRole("button", { name: "Suspender" }))
    .toBeVisible();
  expect(statusRequests).toHaveLength(3);
  expect(statusRequests[1]).toMatchObject({
    method: "PATCH",
    credentials: "include",
    body: JSON.stringify({
      scopeId,
      expectedStatus: "ACTIVE",
      status: "SUSPENDED",
    }),
  });
  expect(statusRequests[2]).toMatchObject({
    method: "PATCH",
    credentials: "include",
    body: JSON.stringify({
      scopeId,
      expectedStatus: "SUSPENDED",
      status: "ACTIVE",
    }),
  });
});

it("does not deactivate an active participant when confirmation is canceled", async () => {
  const participantId = "33333333-3333-4333-8333-333333333333";
  const scopeId = "22222222-2222-4222-8222-222222222222";
  const statusRequests: string[] = [];
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const path = typeof input === "string" ? input : input.toString();
    if (path === "/api/v1/dashboard") {
      return successResponse(
        staffDashboard([
          {
            participantId,
            professionalEmail: "participant.synthetic@example.invalid",
            accountStatus: "ACTIVE",
            scopeIds: [scopeId],
            progress: {
              assignedModules: 0,
              completedModules: 0,
              progressPercent: null,
              remediationModules: 0,
              retentionReviewsPending: 0,
            },
            pendingCorrections: 0,
            openFeedback: 0,
            nextAction: "AGUARDAR_ATRIBUICAO",
          },
        ]),
      );
    }
    if (path === "/health/dependencies") return readyDependencies();
    if (
      path.includes("/api/v1/internal/accounts/") &&
      path.endsWith("/status")
    ) {
      statusRequests.push(path);
    }
    return unavailableResponse();
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<OperationsPage />);

  await screen.getByRole("button", { name: "Desativar" }).click();

  expect(confirm).toHaveBeenCalledOnce();
  expect(statusRequests).toEqual([]);
  await expect
    .element(screen.getByRole("button", { name: "Desativar" }))
    .toBeVisible();
});

it("deactivates an active participant after confirmation", async () => {
  const participantId = "33333333-3333-4333-8333-333333333333";
  const scopeId = "22222222-2222-4222-8222-222222222222";
  let accountStatus: "ACTIVE" | "DEACTIVATED" = "ACTIVE";
  const statusRequests: RequestInit[] = [];
  const confirmDialog = vi.spyOn(window, "confirm").mockReturnValue(true);
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    if (path === "/api/v1/dashboard") {
      return successResponse(
        staffDashboard([
          {
            participantId,
            professionalEmail: "participant.synthetic@example.invalid",
            accountStatus,
            scopeIds: [scopeId],
            progress: {
              assignedModules: 0,
              completedModules: 0,
              progressPercent: null,
              remediationModules: 0,
              retentionReviewsPending: 0,
            },
            pendingCorrections: 0,
            openFeedback: 0,
            nextAction: "AGUARDAR_ATRIBUICAO",
          },
        ]),
      );
    }
    if (path === "/health/dependencies") return readyDependencies();
    if (path === `/api/v1/internal/accounts/${participantId}/status`) {
      if (init !== undefined) statusRequests.push(init);
      accountStatus = "DEACTIVATED";
      return successResponse({ status: "DEACTIVATED", revokedSessions: 2 });
    }
    return unavailableResponse();
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<OperationsPage />);

  await screen.getByRole("button", { name: "Desativar" }).click();
  await expect
    .element(
      screen.getByText("Conta atualizada: Desativado. Sessões revogadas: 2."),
    )
    .toBeVisible();
  await expect
    .element(screen.getByRole("button", { name: "Reativar" }))
    .toBeVisible();
  expect(confirmDialog).toHaveBeenCalledOnce();
  expect(statusRequests).toHaveLength(1);
  expect(statusRequests[0]).toMatchObject({
    method: "PATCH",
    credentials: "include",
    body: JSON.stringify({
      scopeId,
      expectedStatus: "ACTIVE",
      status: "DEACTIVATED",
    }),
  });
});

it("issues a scoped one-time recovery link after confirmation", async () => {
  const participantId = "33333333-3333-4333-8333-333333333333";
  const scopeId = "22222222-2222-4222-8222-222222222222";
  const alternateScopeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const token = "r".repeat(40);
  const confirmDialog = vi.spyOn(window, "confirm").mockReturnValue(true);
  const recoveryRequests: RequestInit[] = [];
  let recoveryCalls = 0;
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    if (path === "/api/v1/dashboard") {
      return successResponse({
        ...staffDashboard([
          {
            participantId,
            professionalEmail: "participant.synthetic@example.invalid",
            accountStatus: "ACTIVE",
            scopeIds: [alternateScopeId],
            progress: {
              assignedModules: 1,
              completedModules: 0,
              progressPercent: 0,
              remediationModules: 0,
              retentionReviewsPending: 0,
            },
            pendingCorrections: 0,
            openFeedback: 0,
            nextAction: "AGUARDAR_ATRIBUICAO",
          },
        ]),
        scopes: [scopeId, alternateScopeId],
      });
    }
    if (path === "/health/dependencies") return readyDependencies();
    if (path === `/api/v1/internal/accounts/${participantId}/recovery`) {
      if (init !== undefined) recoveryRequests.push(init);
      recoveryCalls += 1;
      if (recoveryCalls === 1) return new Response("", { status: 200 });
      return successResponse({
        professionalEmail: "participant.synthetic@example.invalid",
        token,
        expiresAt: "2026-10-02T01:00:00.000Z",
        revokedSessions: 3,
      });
    }
    return unavailableResponse();
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<OperationsPage />);

  const scopePicker = screen.getByLabelText("Escopo de gestão");
  await scopePicker.selectOptions(alternateScopeId);
  await scopePicker.selectOptions(scopeId);

  await screen.getByRole("button", { name: "Gerar recuperação" }).click();
  await expect
    .element(screen.getByText("Não foi possível gerar a recuperação."))
    .toBeVisible();
  await screen.getByRole("button", { name: "Gerar recuperação" }).click();

  await expect
    .element(screen.getByText("Recuperação emitida. Sessões revogadas: 3."))
    .toBeVisible();
  await expect
    .element(screen.getByLabelText("Token de recuperação criado"))
    .toHaveValue(token);
  expect(confirmDialog).toHaveBeenCalledTimes(2);
  expect(confirmDialog).toHaveBeenLastCalledWith(
    "Gerar um link de recuperação? As sessões atuais serão revogadas e a conta permanecerá ativa.",
  );
  expect(recoveryRequests).toHaveLength(2);
  expect(recoveryRequests[1]).toMatchObject({
    method: "POST",
    credentials: "include",
    body: JSON.stringify({
      scopeId: alternateScopeId,
      expiresInSeconds: 1800,
    }),
  });
});

it("renders scoped audit metadata as read-only across cursor pages", async () => {
  const scopeId = "22222222-2222-4222-8222-222222222222";
  const principalId = "11111111-1111-4111-8111-111111111111";
  const requestId = "33333333-3333-4333-8333-333333333333";
  const correlationId = "44444444-4444-4444-8444-444444444444";
  const auditRequests: { url: URL; init: RequestInit | undefined }[] = [];
  const eventsByCursor = {
    first: [
      {
        auditId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        occurredAt: "2026-10-01T12:00:00.000Z",
        actorKind: "AUTHENTICATED",
        principalId,
        action: "content.reviewed",
        resourceType: "content_item",
        resourceId: "synthetic-item-42",
        scopeId,
        outcome: "SUCCESS",
        reasonCode: "review.approved",
        requestId,
        correlationId,
        beforeHash: "a".repeat(64),
        afterHash: "b".repeat(64),
      },
    ],
    second: [
      {
        auditId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        occurredAt: "2026-10-01T12:30:00.000Z",
        actorKind: "ANONYMOUS",
        action: "session.denied",
        resourceType: "session",
        resourceId: "synthetic-session-7",
        scopeId,
        outcome: "DENIED",
        reasonCode: "policy.denied",
        requestId: "55555555-5555-4555-8555-555555555555",
        correlationId: "66666666-6666-4666-8666-666666666666",
      },
    ],
  } as const;
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    if (path === "/api/v1/dashboard") return successResponse(staffDashboard());
    if (path === "/health/dependencies") return readyDependencies();
    if (path.startsWith("/api/v1/audit?")) {
      const url = new URL(path, window.location.origin);
      auditRequests.push({ url, init });
      const secondPage = url.searchParams.has("cursor");
      return successResponse(
        {
          kind: "audit_trail",
          scopeId,
          filters: { scopeId, limit: 25 },
          items: secondPage ? eventsByCursor.second : eventsByCursor.first,
        },
        secondPage
          ? { has_next: false }
          : { has_next: true, next_cursor: "synthetic-cursor-page-2" },
      );
    }
    return unavailableResponse();
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<OperationsPage />);
  const auditPanel = screen.getByTestId("audit-trail");

  await expect.element(screen.getByText("content.reviewed")).toBeVisible();
  await expect.element(screen.getByText("synthetic-item-42")).toBeVisible();
  await expect
    .element(
      screen.getByText(
        "Consulta somente leitura dos eventos do escopo selecionado.",
      ),
    )
    .toBeVisible();
  await expect
    .element(auditPanel.getByRole("button", { name: "Próxima página" }))
    .toBeEnabled();

  await auditPanel.getByRole("button", { name: "Próxima página" }).click();

  await expect.element(screen.getByText("session.denied")).toBeVisible();
  await expect.element(screen.getByText("synthetic-session-7")).toBeVisible();
  await expect
    .element(auditPanel.getByRole("button", { name: "Próxima página" }))
    .toBeDisabled();

  expect(auditRequests).toHaveLength(2);
  expect(auditRequests[0]?.url.pathname).toBe("/api/v1/audit");
  expect(
    Object.fromEntries(auditRequests[0]!.url.searchParams.entries()),
  ).toEqual({
    scopeId,
    limit: "25",
  });
  expect(
    Object.fromEntries(auditRequests[1]!.url.searchParams.entries()),
  ).toEqual({
    scopeId,
    limit: "25",
    cursor: "synthetic-cursor-page-2",
  });
  for (const request of auditRequests) {
    expect(request.init).toMatchObject({
      cache: "no-store",
      credentials: "include",
    });
    expect(request.init?.method).toBeUndefined();
  }
  for (const privateValue of [
    principalId,
    requestId,
    correlationId,
    "55555555-5555-4555-8555-555555555555",
    "66666666-6666-4666-8666-666666666666",
    "a".repeat(64),
    "b".repeat(64),
  ]) {
    expect(document.body.textContent).not.toContain(privateValue);
  }
});

it("rejects unexpected audit fields and recovers on a scoped retry", async () => {
  const scopeId = "22222222-2222-4222-8222-222222222222";
  const auditRequests: RequestInit[] = [];
  let auditReads = 0;
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    if (path === "/api/v1/dashboard") return successResponse(staffDashboard());
    if (path === "/health/dependencies") return readyDependencies();
    if (path.startsWith("/api/v1/audit?")) {
      auditReads += 1;
      if (init !== undefined) auditRequests.push(init);
      const filters =
        auditReads === 1
          ? {
              scopeId,
              limit: 25,
              rawActorEmail: "synthetic-operator@example.invalid",
            }
          : { scopeId, limit: 25 };
      return successResponse(
        { kind: "audit_trail", scopeId, filters, items: [] },
        { has_next: false },
      );
    }
    return unavailableResponse();
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<OperationsPage />);
  const auditPanel = screen.getByTestId("audit-trail");

  await expect
    .element(
      screen.getByText("Não foi possível carregar a trilha de auditoria."),
    )
    .toBeVisible();
  expect(document.body.textContent).not.toContain(
    "synthetic-operator@example.invalid",
  );

  await auditPanel.getByRole("button", { name: "Tentar novamente" }).click();

  await expect
    .element(screen.getByText("Nenhum evento no recorte autorizado."))
    .toBeVisible();
  expect(auditReads).toBe(2);
  expect(auditRequests).toHaveLength(2);
  for (const request of auditRequests) {
    expect(request).toMatchObject({
      cache: "no-store",
      credentials: "include",
    });
    expect(request.method).toBeUndefined();
  }
});

it.each([401, 403])(
  "keeps audit event details hidden when the scoped endpoint returns %i",
  async (status) => {
    const auditRequests: RequestInit[] = [];
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const path = typeof input === "string" ? input : input.toString();
      if (path === "/api/v1/dashboard") {
        return successResponse(staffDashboard());
      }
      if (path === "/health/dependencies") return readyDependencies();
      if (path.startsWith("/api/v1/audit?")) {
        if (init !== undefined) auditRequests.push(init);
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: status === 401 ? "unauthorized" : "forbidden",
              message: "Synthetic audit denial details.",
            },
          }),
          { status, headers: { "content-type": "application/json" } },
        );
      }
      return unavailableResponse();
    });
    vi.stubGlobal("fetch", fetchMock);

    const screen = await render(<OperationsPage />);
    const auditPanel = screen.getByTestId("audit-trail");

    await expect.element(auditPanel.getByText("Trilha restrita")).toBeVisible();
    await expect
      .element(
        auditPanel.getByText(
          "Esta conta não possui autorização para consultar os eventos deste escopo.",
        ),
      )
      .toBeVisible();
    expect(document.body.textContent).not.toContain(
      "Synthetic audit denial details.",
    );
    expect(auditRequests).toHaveLength(1);
    expect(auditRequests[0]).toMatchObject({
      cache: "no-store",
      credentials: "include",
    });
    expect(auditRequests[0]?.method).toBeUndefined();
  },
);
