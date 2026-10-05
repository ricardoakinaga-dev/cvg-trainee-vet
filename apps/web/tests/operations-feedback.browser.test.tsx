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

it("triages a scoped feedback report and shows its read-only history", async () => {
  const scopeId = "22222222-2222-4222-8222-222222222222";
  const ticketId = "44444444-4444-4444-8444-444444444444";
  const staffId = "99999999-9999-4999-8999-999999999999";
  let status = "NOVO";
  let priority = "NORMAL";
  let version = 0;
  let assigneeId: string | undefined;
  let failNextMetadata = true;
  let failNextTransition = true;
  let failNextHistory = true;
  const metadataRequests: RequestInit[] = [];
  const transitionRequests: RequestInit[] = [];
  const queueRequestQueries: string[] = [];
  let historyReads = 0;
  const historyEvents = [
    {
      historyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      ticketId,
      ticketVersion: 0,
      eventType: "CRIADO",
      toStatus: "NOVO",
      createdAt: "2026-08-24T11:00:00.000Z",
    },
    {
      historyId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      ticketId,
      ticketVersion: 1,
      eventType: "METADATA_ALTERADO",
      fromStatus: "NOVO",
      toStatus: "NOVO",
      fromPriority: "NORMAL",
      toPriority: "ALTA",
      fromAssigneeId: null,
      toAssigneeId: null,
      createdAt: "2026-08-24T11:10:00.000Z",
    },
    {
      historyId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      ticketId,
      ticketVersion: 2,
      eventType: "STATUS_ALTERADO",
      fromStatus: "NOVO",
      toStatus: "TRIADO",
      createdAt: "2026-08-24T11:20:00.000Z",
    },
    {
      historyId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      ticketId,
      ticketVersion: 3,
      eventType: "METADATA_ALTERADO",
      fromStatus: "TRIADO",
      toStatus: "TRIADO",
      fromPriority: "ALTA",
      toPriority: "ALTA",
      fromAssigneeId: null,
      toAssigneeId: staffId,
      createdAt: "2026-08-24T11:30:00.000Z",
    },
  ];
  const queueResponse = (cursor?: string, statusFilter?: string | null) =>
    successResponse(
      {
        kind: "feedback_triage_queue",
        scopeId,
        generatedAt: "2026-08-24T12:00:00.000Z",
        filters: {
          scopeId,
          ...(statusFilter ? { status: statusFilter } : {}),
          limit: 50,
        },
        items: [
          {
            ticketId,
            type: "USABILIDADE",
            description:
              cursor === "synthetic-next"
                ? "Relato seguinte de usabilidade sintético."
                : "Relato de usabilidade sintético.",
            createdAt: "2026-08-24T11:00:00.000Z",
            status,
            version,
            priority,
            ...(assigneeId === undefined ? {} : { assigneeId }),
          },
        ],
      },
      {
        has_next: cursor !== "synthetic-next",
        ...(cursor === "synthetic-next"
          ? {}
          : { next_cursor: "synthetic-next" }),
      },
    );
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    if (path === "/api/v1/dashboard") return successResponse(staffDashboard());
    if (path === "/health/dependencies") return readyDependencies();
    if (path.startsWith("/api/v1/internal/feedback?")) {
      const requestUrl = new URL(path, "http://browser.test");
      queueRequestQueries.push(requestUrl.search);
      return queueResponse(
        requestUrl.searchParams.get("cursor") ?? undefined,
        requestUrl.searchParams.get("status"),
      );
    }
    if (path === `/api/v1/internal/feedback/${ticketId}/triage-metadata`) {
      if (init !== undefined) metadataRequests.push(init);
      if (failNextMetadata) {
        failNextMetadata = false;
        return new Response("", { status: 200 });
      }
      const body = JSON.parse(String(init?.body)) as {
        priority: string;
        assignment: string;
      };
      priority = body.priority;
      if (body.assignment === "ASSUMIR") assigneeId = staffId;
      if (body.assignment === "LIBERAR") assigneeId = undefined;
      version += 1;
      return successResponse({
        ticketId,
        scopeId,
        status,
        version,
        priority,
        ...(assigneeId === undefined ? {} : { assigneeId }),
      });
    }
    if (path === `/api/v1/internal/feedback/${ticketId}`) {
      if (init !== undefined) transitionRequests.push(init);
      if (failNextTransition) {
        failNextTransition = false;
        return new Response("", { status: 200 });
      }
      status = "TRIADO";
      version += 1;
      return successResponse({ ticketId, status, version });
    }
    if (path === `/api/v1/internal/feedback/${ticketId}/history?limit=100`) {
      historyReads += 1;
      if (failNextHistory) {
        failNextHistory = false;
        return new Response("", { status: 200 });
      }
      return successResponse({ ticketId, events: historyEvents });
    }
    return unavailableResponse();
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<OperationsPage />);

  await expect
    .element(
      screen.getByRole("heading", { name: "Fila de relatos do produto" }),
    )
    .toBeVisible();
  await expect
    .element(screen.getByText("Relato de usabilidade sintético."))
    .toBeVisible();

  await screen
    .getByLabelText(`Prioridade do relato ${ticketId}`)
    .selectOptions("ALTA");
  await expect
    .element(
      screen.getByText(
        "Não foi possível atualizar a prioridade ou a atribuição. O estado pode ter mudado; tente novamente.",
      ),
    )
    .toBeVisible();
  await screen
    .getByLabelText(`Prioridade do relato ${ticketId}`)
    .selectOptions("ALTA");
  await expect
    .element(screen.getByRole("button", { name: "Triar" }))
    .toBeVisible();
  await screen.getByRole("button", { name: "Triar" }).click();
  await expect
    .element(
      screen.getByText(
        "Não foi possível atualizar o relato. O estado pode ter mudado; tente novamente.",
      ),
    )
    .toBeVisible();
  await screen.getByRole("button", { name: "Triar" }).click();
  await expect
    .element(screen.getByRole("button", { name: "Iniciar tratamento" }))
    .toBeVisible();
  await screen.getByRole("button", { name: "Assumir para mim" }).click();
  await expect
    .element(screen.getByRole("button", { name: "Liberar responsável" }))
    .toBeVisible();
  await screen.getByRole("button", { name: "Ver histórico do relato" }).click();
  await expect
    .element(screen.getByText("Não foi possível carregar o histórico."))
    .toBeVisible();
  await screen
    .getByTestId("feedback-history")
    .getByRole("button", { name: "Tentar novamente" })
    .click();
  await expect
    .element(screen.getByRole("heading", { name: "Linha do tempo do relato" }))
    .toBeVisible();
  await expect
    .element(screen.getByText("Prioridade Normal → Alta"))
    .toBeVisible();
  await expect
    .element(
      screen.getByText(
        "Responsabilidade Sem responsável → Responsável definido",
      ),
    )
    .toBeVisible();

  await screen.getByLabelText("Status").first().selectOptions("TRIADO");
  await expect
    .poll(() =>
      queueRequestQueries.some(
        (query) => new URLSearchParams(query).get("status") === "TRIADO",
      ),
    )
    .toBe(true);
  await screen.getByRole("button", { name: "Próxima página" }).click();
  await expect
    .element(screen.getByText("Relato seguinte de usabilidade sintético."))
    .toBeVisible();
  expect(
    queueRequestQueries.some((query) => {
      const params = new URLSearchParams(query);
      return (
        params.get("status") === "TRIADO" &&
        params.get("cursor") === "synthetic-next"
      );
    }),
  ).toBe(true);
  const queryCountBeforePrevious = queueRequestQueries.length;
  await screen.getByRole("button", { name: "Página anterior" }).click();
  await expect
    .poll(() =>
      queueRequestQueries.slice(queryCountBeforePrevious).some((query) => {
        const params = new URLSearchParams(query);
        return (
          params.get("status") === "TRIADO" && params.get("cursor") === null
        );
      }),
    )
    .toBe(true);
  await expect
    .element(screen.getByText("Relato de usabilidade sintético."))
    .toBeVisible();
  expect(historyReads).toBe(2);

  expect(metadataRequests).toHaveLength(3);
  expect(metadataRequests[0]).toMatchObject({
    method: "PATCH",
    credentials: "include",
    body: JSON.stringify({
      expectedVersion: 0,
      priority: "ALTA",
      assignment: "MANTER",
    }),
  });
  expect(transitionRequests).toHaveLength(2);
  expect(transitionRequests[0]).toMatchObject({
    method: "PATCH",
    credentials: "include",
    body: JSON.stringify({
      ticketId,
      scopeId,
      version: 1,
      event: "TRIAR",
    }),
  });
  expect(transitionRequests[1]).toMatchObject({
    method: "PATCH",
    credentials: "include",
    body: JSON.stringify({
      ticketId,
      scopeId,
      version: 1,
      event: "TRIAR",
    }),
  });
  expect(metadataRequests[2]).toMatchObject({
    body: JSON.stringify({
      expectedVersion: 2,
      priority: "ALTA",
      assignment: "ASSUMIR",
    }),
  });
});

it("resumes feedback triage after the user responds", async () => {
  const scopeId = "22222222-2222-4222-8222-222222222222";
  const ticketId = "44444444-4444-4444-8444-444444444444";
  let status = "AGUARDA_USUARIO";
  let version = 4;
  const transitionRequests: {
    readonly path: string;
    readonly init?: RequestInit;
  }[] = [];
  const queueResponse = () =>
    successResponse(
      {
        kind: "feedback_triage_queue",
        scopeId,
        generatedAt: "2026-10-02T09:10:00.000Z",
        filters: { scopeId, limit: 50 },
        items: [
          {
            ticketId,
            type: "USABILIDADE",
            description: "Relato sintético aguardando retorno.",
            createdAt: "2026-10-01T10:00:00.000Z",
            status,
            version,
            priority: "NORMAL",
          },
        ],
      },
      { has_next: false },
    );
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    if (path === "/api/v1/dashboard") return successResponse(staffDashboard());
    if (path === "/health/dependencies") return readyDependencies();
    if (path.startsWith("/api/v1/internal/feedback?")) {
      return queueResponse();
    }
    if (path === `/api/v1/internal/feedback/${ticketId}`) {
      transitionRequests.push({
        path,
        ...(init === undefined ? {} : { init }),
      });
      status = "EM_TRATAMENTO";
      version += 1;
      return successResponse({ ticketId, status, version });
    }
    return unavailableResponse();
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<OperationsPage />);
  const queue = screen.getByTestId("feedback-triage-queue");
  await expect
    .element(queue.getByText("Relato sintético aguardando retorno."))
    .toBeVisible();
  await expect
    .element(queue.getByRole("cell", { name: "Aguardando usuário" }))
    .toBeVisible();
  await queue.getByRole("button", { name: "Retomar tratamento" }).click();

  await expect
    .element(queue.getByRole("cell", { name: "Em tratamento" }))
    .toBeVisible();
  expect(transitionRequests).toHaveLength(1);
  expect(transitionRequests[0]).toMatchObject({
    path: `/api/v1/internal/feedback/${ticketId}`,
    init: {
      method: "PATCH",
      credentials: "include",
      body: JSON.stringify({
        ticketId,
        scopeId,
        version: 4,
        event: "RETOMAR_TRATAMENTO",
      }),
    },
  });
  expect(document.body.textContent).not.toContain("PUBLICADO");
});

it("shows no status transition for terminal feedback tickets", async () => {
  const scopeId = "22222222-2222-4222-8222-222222222222";
  const terminalItems = [
    {
      ticketId: "44444444-4444-4444-8444-444444444444",
      status: "RESOLVIDO",
      description: "Relato sintético resolvido.",
      label: "Resolvido",
    },
    {
      ticketId: "55555555-5555-4555-8555-555555555555",
      status: "DUPLICADO",
      description: "Relato sintético duplicado.",
      label: "Duplicado",
    },
    {
      ticketId: "66666666-6666-4666-8666-666666666666",
      status: "NAO_REPRODUZIDO",
      description: "Relato sintético não reproduzido.",
      label: "Não reproduzido",
    },
    {
      ticketId: "77777777-7777-4777-8777-777777777777",
      status: "NAO_PLANEJADO",
      description: "Relato sintético não planejado.",
      label: "Não planejado",
    },
  ] as const;
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const path = typeof input === "string" ? input : input.toString();
    if (path === "/api/v1/dashboard") return successResponse(staffDashboard());
    if (path === "/health/dependencies") return readyDependencies();
    if (path.startsWith("/api/v1/internal/feedback?")) {
      return successResponse(
        {
          kind: "feedback_triage_queue",
          scopeId,
          generatedAt: "2026-10-02T09:15:00.000Z",
          filters: { scopeId, limit: 50 },
          items: terminalItems.map(({ ticketId, status, description }) => ({
            ticketId,
            type: "MELHORIA",
            description,
            createdAt: "2026-10-01T10:00:00.000Z",
            status,
            version: 3,
            priority: "NORMAL",
          })),
        },
        { has_next: false },
      );
    }
    return unavailableResponse();
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<OperationsPage />);
  const queue = screen.getByTestId("feedback-triage-queue");
  for (const item of terminalItems) {
    await expect.element(queue.getByText(item.description)).toBeVisible();
    await expect
      .element(queue.getByRole("cell", { name: item.label, exact: true }))
      .toBeVisible();
  }

  expect(document.body.textContent?.match(/Estado final/gu)).toHaveLength(4);
  expect(document.body.textContent).not.toContain("Retomar tratamento");
  expect(document.body.textContent).not.toContain("Iniciar tratamento");
  for (const item of terminalItems) {
    expect(
      fetchMock.mock.calls.some(([input]) => {
        const path = typeof input === "string" ? input : input.toString();
        return path === `/api/v1/internal/feedback/${item.ticketId}`;
      }),
    ).toBe(false);
  }
});

it("shows the allowed follow-up transitions for a feedback ticket in treatment", async () => {
  const scopeId = "22222222-2222-4222-8222-222222222222";
  const ticketId = "44444444-4444-4444-8444-444444444444";
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const path = typeof input === "string" ? input : input.toString();
    if (path === "/api/v1/dashboard") return successResponse(staffDashboard());
    if (path === "/health/dependencies") return readyDependencies();
    if (path.startsWith("/api/v1/internal/feedback?")) {
      return successResponse(
        {
          kind: "feedback_triage_queue",
          scopeId,
          generatedAt: "2026-10-02T09:20:00.000Z",
          filters: { scopeId, limit: 50 },
          items: [
            {
              ticketId,
              type: "USABILIDADE",
              description: "Relato sintético em tratamento.",
              createdAt: "2026-10-01T10:00:00.000Z",
              status: "EM_TRATAMENTO",
              version: 5,
              priority: "NORMAL",
            },
          ],
        },
        { has_next: false },
      );
    }
    return unavailableResponse();
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<OperationsPage />);
  const queue = screen.getByTestId("feedback-triage-queue");
  await expect
    .element(queue.getByText("Relato sintético em tratamento."))
    .toBeVisible();
  for (const action of [
    "Aguardar usuário",
    "Resolver",
    "Marcar duplicado",
    "Não reproduzido",
    "Não planejado",
  ]) {
    await expect
      .element(queue.getByRole("button", { name: action }))
      .toBeEnabled();
  }
  expect(
    fetchMock.mock.calls.some(([input]) => {
      const path = typeof input === "string" ? input : input.toString();
      return path === `/api/v1/internal/feedback/${ticketId}`;
    }),
  ).toBe(false);
});
