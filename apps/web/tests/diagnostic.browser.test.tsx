import { createElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import DiagnosticPage from "../app/diagnostic/page";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children?: ReactNode }) =>
    createElement("a", { href }, children),
}));

function apiResponse(code: string): Response {
  return new Response(
    JSON.stringify({ success: false, error: { code, message: "Synthetic." } }),
    {
      status: code === "not_found" ? 404 : 403,
      headers: { "content-type": "application/json" },
    },
  );
}

function successResponse(data: unknown, statusCode = 200): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      meta: { request_id: "browser-test" },
    }),
    { status: statusCode, headers: { "content-type": "application/json" } },
  );
}

function diagnosticItems() {
  return Array.from({ length: 120 }, (_, index) => {
    const ordinal = index + 1;
    return {
      itemId: `00000000-0000-4000-8000-${String(ordinal).padStart(12, "0")}`,
      ordinal,
      title: `Questão sintética ${ordinal}`,
      text: `Escolha a alternativa segura para o item ${ordinal}.`,
      responseMode: "CHOICE" as const,
      choices: [
        { id: "A", label: "A", text: "Alternativa sintética A." },
        { id: "B", label: "B", text: "Alternativa sintética B." },
      ],
      selectionMode: "SINGLE" as const,
    };
  });
}

function diagnosticTheme(
  themeId: "B07-S1" | "B07-S2" | "B07-S3",
  scorePercent: number | null,
) {
  return {
    themeId,
    themeLabel:
      themeId === "B07-S1"
        ? "Núcleo clínico e segurança"
        : themeId === "B07-S2"
          ? "Emergência e priorização"
          : "Internação, monitoramento e integração",
    status:
      scorePercent === null ? "SEM_EVIDENCIA_DIGITAL" : "BASELINE_REGISTRADA",
    scorePercent,
    answeredItemCount: scorePercent === null ? 0 : 1,
    itemCount: 40,
    evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
    notPunitive: true,
    noGlobalPassFail: true,
    practicalCompetenceClaim: "PROIBIDO_MVP",
  } as const;
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  window.history.replaceState({}, document.title, "/");
});

const r14SessionId = "44444444-4444-4444-8444-444444444444";
function r14Session(
  version = 1,
  answers: { itemId: string; selectedChoiceIds: string[] }[] = [],
) {
  return {
    sessionId: r14SessionId,
    diagnosticId: "B07-DIAGNOSTIC-V1",
    diagnosticVersion: "0.1.0",
    version,
    status: "EM_ANDAMENTO",
    startedAt: "2026-10-03T12:00:00.000Z",
    itemCount: 120,
    answeredItemCount: answers.length,
    currentOrdinal: 1,
    items: diagnosticItems(),
    answers,
  };
}
it.each([1, 57, null])(
  "R17 F06 reversed diagnostic resumes published ordinal %s",
  async (ordinal) => {
    const next = {
      ...r14Session(),
      currentOrdinal: ordinal,
      items: diagnosticItems().reverse(),
    };
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => successResponse(next)),
    );
    const screen = await render(<DiagnosticPage />);
    await expect.element(screen.getByTestId("diagnostic-item")).toBeVisible();
    expect(document.getElementById("diagnostic-item-title")?.textContent).toBe(
      `Questão sintética ${ordinal ?? 1}`,
    );
    expect(next.items.map((item) => item.ordinal)).toEqual(
      Array.from({ length: 120 }, (_, i) => 120 - i),
    );
  },
);
it("R25 acknowledges original diagnostic replay without rewinding a newer checkpoint", async () => {
  const wires: { path: string; body: string }[] = [];
  const firstId = diagnosticItems()[0]!.itemId;
  const secondId = diagnosticItems()[1]!.itemId;
  let reads = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input, init) => {
      if (init?.method === "PUT") {
        wires.push({ path: String(input), body: String(init.body) });
        if (wires.length === 1)
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: "internal_error", message: "Synthetic" },
            }),
            { status: 500 },
          );
        return successResponse(
          r14Session(2, [{ itemId: firstId, selectedChoiceIds: ["A"] }]),
        );
      }
      return successResponse(
        reads++ === 0
          ? r14Session()
          : r14Session(9, [
              { itemId: firstId, selectedChoiceIds: ["A"] },
              { itemId: secondId, selectedChoiceIds: ["B"] },
            ]),
      );
    }),
  );
  const screen = await render(<DiagnosticPage />);
  await expect.element(screen.getByTestId("diagnostic-item")).toBeVisible();
  await screen
    .getByRole("radio", { name: "AAlternativa sintética A.", exact: true })
    .click();
  await screen
    .getByRole("button", { name: "Salvar resposta e avançar", exact: true })
    .click();
  await expect
    .element(
      screen.getByRole("button", {
        name: "Reenviar envio pendente",
        exact: true,
      }),
    )
    .toBeVisible();
  await screen
    .getByRole("button", { name: "Atualizar sessão", exact: true })
    .click();
  await expect
    .element(screen.getByText("2 de 120 itens salvos", { exact: true }))
    .toBeVisible();
  await screen
    .getByRole("button", { name: "Reenviar envio pendente", exact: true })
    .click();
  await expect
    .element(
      screen.getByText(
        "Resposta salva. Você pode avançar ou voltar quando quiser.",
        { exact: true },
      ),
    )
    .toBeVisible();
  await expect
    .element(screen.getByText("2 de 120 itens salvos", { exact: true }))
    .toBeVisible();
  await expect
    .element(
      screen.getByRole("radio", {
        name: "BAlternativa sintética B.",
        exact: true,
      }),
    )
    .toBeChecked();
  expect(wires).toHaveLength(2);
  expect(wires[1]).toEqual(wires[0]);
});
it("R17 F06 reordered save receipt advances and returns by ordinal without changing wire identity", async () => {
  const wires: { path: string; body: string }[] = [];
  const firstId = diagnosticItems()[0]!.itemId;
  const wire = { ...r14Session(), items: diagnosticItems().reverse() };
  const originalOrder = wire.items.map((item) => item.itemId);
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input, init) => {
      if (init?.method === "PUT") {
        wires.push({ path: String(input), body: String(init.body) });
        return successResponse({
          ...r14Session(2, [{ itemId: firstId, selectedChoiceIds: ["A"] }]),
          currentOrdinal: 2,
          items: [...wire.items],
        });
      }
      return successResponse(wire);
    }),
  );
  const screen = await render(<DiagnosticPage />);
  await expect.element(screen.getByTestId("diagnostic-item")).toBeVisible();
  await screen
    .getByRole("radio", { name: "AAlternativa sintética A.", exact: true })
    .click();
  await screen
    .getByRole("button", { name: "Salvar resposta e avançar", exact: true })
    .click();
  await expect
    .element(
      screen.getByRole("heading", { name: "Questão sintética 2", exact: true }),
    )
    .toBeVisible();
  await screen
    .getByRole("button", { name: "Item anterior", exact: true })
    .click();
  await expect
    .element(
      screen.getByRole("heading", { name: "Questão sintética 1", exact: true }),
    )
    .toBeVisible();
  await expect
    .element(
      screen.getByRole("radio", {
        name: "AAlternativa sintética A.",
        exact: true,
      }),
    )
    .toBeChecked();
  expect(wires).toHaveLength(1);
  expect(wires[0]!.path).toBe(
    `/api/v1/diagnostics/b07/sessions/${r14SessionId}/answers/${firstId}`,
  );
  expect(JSON.parse(wires[0]!.body)).toMatchObject({
    version: 1,
    selectedChoiceIds: ["A"],
  });
  expect(wire.items.map((item) => item.itemId)).toEqual(originalOrder);
});
it.each(["foreign-session", "stale-version", "missing-choice"])(
  "R14 diagnostic rejects %s receipt and manually replays original bytes",
  async (mode) => {
    const wires: { path: string; body: string }[] = [];
    const firstId = diagnosticItems()[0]?.itemId;
    if (!firstId) throw new Error("synthetic item missing");
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input, init) => {
        const path = String(input);
        if (init?.method === "PUT") {
          wires.push({ path, body: String(init.body) });
          const valid = r14Session(2, [
            { itemId: firstId, selectedChoiceIds: ["A"] },
          ]);
          if (wires.length > 1) return successResponse(valid);
          return successResponse(
            mode === "foreign-session"
              ? { ...valid, sessionId: "55555555-5555-4555-8555-555555555555" }
              : mode === "stale-version"
                ? { ...valid, version: 1 }
                : r14Session(2),
          );
        }
        return successResponse(r14Session());
      }),
    );
    const screen = await render(<DiagnosticPage />);
    await expect.element(screen.getByText("Item 1 de 120")).toBeVisible();
    await screen.getByRole("radio").first().click();
    await screen
      .getByRole("button", { name: "Salvar resposta e avançar" })
      .click();
    await expect.element(screen.getByRole("alert")).toBeVisible();
    expect(document.body.textContent).not.toContain("Resposta salva.");
    await expect
      .element(screen.getByText("0 de 120 itens salvos"))
      .toBeVisible();
    await screen.getByRole("radio").nth(1).click();
    await screen
      .getByRole("button", { name: "Reenviar envio pendente", exact: true })
      .click();
    await expect
      .element(
        screen.getByText(
          "Resposta salva. Você pode avançar ou voltar quando quiser.",
        ),
      )
      .toBeVisible();
    expect(wires).toHaveLength(2);
    expect(wires[1]).toEqual(wires[0]);
    await expect.element(screen.getByRole("radio").nth(1)).toBeChecked();
    await expect
      .element(screen.getByRole("button", { name: "Finalizar diagnóstico" }))
      .toBeDisabled();
  },
);

it("R14 diagnostic bounded current request offers manual recovery", async () => {
  let calls = 0;
  let signal: AbortSignal | null | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (_input, init) => {
      calls += 1;
      signal = init?.signal;
      if (calls === 1) return new Promise<Response>(() => {});
      return successResponse(r14Session());
    }),
  );
  const screen = await render(<DiagnosticPage />);
  await new Promise((resolve) => setTimeout(resolve, 15_100));
  await expect
    .element(screen.getByRole("button", { name: "Tentar novamente" }))
    .toBeVisible();
  expect(signal?.aborted).toBe(true);
  expect(calls).toBe(1);
  await screen.getByRole("button", { name: "Tentar novamente" }).click();
  await expect.element(screen.getByTestId("diagnostic-item")).toBeVisible();
  expect(calls).toBe(2);
}, 20_000);

it("R14 diagnostic unmount aborts pending current request", async () => {
  let signal: AbortSignal | null | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (_input, init) => {
      signal = init?.signal;
      return new Promise<Response>(() => {});
    }),
  );
  const screen = await render(<DiagnosticPage />);
  await expect.element(screen.getByTestId("diagnostic-loading")).toBeVisible();
  await screen.unmount();
  expect(signal?.aborted).toBe(true);
});

it.each(["transport", "body"])(
  "R14 diagnostic %s mutation timeout preserves original manual replay after refresh",
  async (phase) => {
    const wires: string[] = [];
    let signal: AbortSignal | null | undefined;
    let reads = 0;
    const firstId = diagnosticItems()[0]?.itemId;
    if (!firstId) throw new Error("synthetic item missing");
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (_input, init) => {
        if (init?.method !== "PUT") {
          reads += 1;
          return successResponse(r14Session(reads === 1 ? 1 : 19));
        }
        wires.push(String(init.body));
        signal = init.signal;
        if (wires.length > 1)
          return successResponse(
            r14Session(2, [{ itemId: firstId, selectedChoiceIds: ["A"] }]),
          );
        if (phase === "transport") return new Promise<Response>(() => {});
        const response = successResponse({});
        response.json = () => new Promise<unknown>(() => {});
        return response;
      }),
    );
    const screen = await render(<DiagnosticPage />);
    await expect.element(screen.getByTestId("diagnostic-item")).toBeVisible();
    await screen.getByRole("radio").first().click();
    await screen
      .getByRole("button", { name: "Salvar resposta e avançar" })
      .click();
    await new Promise((resolve) => setTimeout(resolve, 15_100));
    await expect
      .element(
        screen.getByRole("button", {
          name: "Reenviar envio pendente",
          exact: true,
        }),
      )
      .toBeEnabled();
    expect(signal?.aborted).toBe(true);
    expect(wires).toHaveLength(1);
    await screen.getByRole("radio").nth(1).click();
    await screen
      .getByRole("button", { name: "Atualizar sessão", exact: true })
      .click();
    await expect
      .element(
        screen.getByRole("button", {
          name: "Reenviar envio pendente",
          exact: true,
        }),
      )
      .toBeEnabled();
    expect(reads).toBe(2);
    await screen
      .getByRole("button", { name: "Reenviar envio pendente", exact: true })
      .click();
    await expect
      .element(
        screen.getByText(
          "Resposta salva. Você pode avançar ou voltar quando quiser.",
        ),
      )
      .toBeVisible();
    expect(wires).toHaveLength(2);
    expect(wires[1]).toBe(wires[0]);
    expect(JSON.parse(wires[0] ?? "{}").version).toBe(1);
    await expect.element(screen.getByRole("radio").nth(1)).toBeChecked();
    await expect
      .element(screen.getByRole("button", { name: "Finalizar diagnóstico" }))
      .toBeDisabled();
    console.log(
      "R14_DIAGNOSTIC_REPLAY",
      JSON.stringify({ phase, wires, reads }),
    );
    await page.screenshot();
  },
  25_000,
);

it("R14 diagnostic foreign current session cannot retarget unresolved original retry", async () => {
  let reads = 0;
  const wires: { path: string; body: string }[] = [];
  const firstId = diagnosticItems()[0]?.itemId;
  if (!firstId) throw new Error("synthetic item missing");
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input, init) => {
      if (init?.method === "PUT") {
        wires.push({ path: String(input), body: String(init.body) });
        if (wires.length === 1) throw new TypeError("lost response");
        return successResponse(
          r14Session(2, [{ itemId: firstId, selectedChoiceIds: ["A"] }]),
        );
      }
      reads += 1;
      return successResponse(
        reads === 1
          ? r14Session()
          : {
              ...r14Session(19),
              sessionId: "55555555-5555-4555-8555-555555555555",
            },
      );
    }),
  );
  const screen = await render(<DiagnosticPage />);
  await expect.element(screen.getByTestId("diagnostic-item")).toBeVisible();
  await screen.getByRole("radio").first().click();
  await screen
    .getByRole("button", { name: "Salvar resposta e avançar" })
    .click();
  await expect
    .element(
      screen.getByRole("button", {
        name: "Reenviar envio pendente",
        exact: true,
      }),
    )
    .toBeEnabled();
  await screen.getByRole("radio").nth(1).click();
  await screen
    .getByRole("button", { name: "Atualizar sessão", exact: true })
    .click();
  await expect
    .element(
      screen.getByRole("button", {
        name: "Reenviar envio pendente",
        exact: true,
      }),
    )
    .toBeEnabled();
  await screen
    .getByRole("button", { name: "Reenviar envio pendente", exact: true })
    .click();
  await expect
    .element(
      screen.getByText(
        "Resposta salva. Você pode avançar ou voltar quando quiser.",
      ),
    )
    .toBeVisible();
  expect(wires).toHaveLength(2);
  expect(wires[1]).toEqual(wires[0]);
  expect(reads).toBe(2);
  await expect.element(screen.getByRole("radio").nth(1)).toBeChecked();
});

it("R14 diagnostic public parsing rejects private metadata before rendering", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async () =>
      successResponse({ ...r14Session(), source: "PRIVATE_SYNTHETIC" }),
    ),
  );
  const screen = await render(<DiagnosticPage />);
  await expect
    .element(screen.getByRole("button", { name: "Tentar novamente" }))
    .toBeVisible();
  expect(document.body.textContent).not.toContain("PRIVATE_SYNTHETIC");
  expect(document.querySelector('[data-testid="diagnostic-item"]')).toBeNull();
});

it("T31 names the native diagnostic progress", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async () =>
      successResponse({
        sessionId: "11111111-1111-4111-8111-111111111111",
        diagnosticId: "B07-DIAGNOSTIC-V1",
        diagnosticVersion: "0.1.0",
        version: 1,
        status: "EM_ANDAMENTO",
        startedAt: "2026-10-03T12:00:00.000Z",
        itemCount: 120,
        answeredItemCount: 0,
        currentOrdinal: 1,
        items: diagnosticItems(),
        answers: [],
      }),
    ),
  );
  const screen = await render(<DiagnosticPage />);
  await expect
    .element(
      screen.getByRole("progressbar", { name: "Progresso do diagnóstico" }),
    )
    .toBeVisible();
});

it("offers a formative session start and explains an access rejection", async () => {
  const requests: { path: string; init?: RequestInit }[] = [];
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    requests.push({ path, init });
    return apiResponse(
      path.endsWith("/current") ? "not_found" : "unauthenticated",
    );
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<DiagnosticPage />);

  await expect
    .element(
      screen.getByRole("heading", { name: "Mapeamento formativo inicial" }),
    )
    .toBeVisible();
  await expect.element(screen.getByText("Começar uma sessão")).toBeVisible();
  await screen.getByRole("button", { name: "Iniciar diagnóstico" }).click();

  await expect
    .element(screen.getByRole("alert"))
    .toHaveTextContent(
      "Ative seu acesso no painel do participante antes de iniciar o diagnóstico.",
    );
  expect(requests.map((request) => request.path)).toEqual([
    "/api/v1/diagnostics/b07/sessions/current",
    "/api/v1/diagnostics/b07/sessions",
  ]);
  expect(requests[1]?.init).toMatchObject({
    method: "POST",
    credentials: "include",
    body: JSON.stringify({ idempotencyKey: "cvg-b07-start-v1" }),
  });
});

it("retries loading a current diagnostic session after a service failure", async () => {
  const sessionId = "22222222-2222-4222-8222-222222222222";
  const items = diagnosticItems();
  const requests: { path: string; init?: RequestInit }[] = [];
  let currentReads = 0;
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    requests.push({ path, init });
    if (path.endsWith("/sessions/current")) {
      currentReads += 1;
      if (currentReads === 1) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "internal_error",
              message: "Synthetic diagnostic-service detail.",
            },
          }),
          { status: 503, headers: { "content-type": "application/json" } },
        );
      }
      return successResponse({
        sessionId,
        diagnosticId: "B07-DIAGNOSTIC-V1",
        diagnosticVersion: "0.1.0",
        version: 2,
        status: "EM_ANDAMENTO",
        startedAt: "2026-10-02T00:00:00.000Z",
        itemCount: 120,
        answeredItemCount: 0,
        currentOrdinal: 1,
        items,
        answers: [],
      });
    }
    return apiResponse("not_found");
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<DiagnosticPage />);

  await expect
    .element(screen.getByRole("alert"))
    .toHaveTextContent(
      "Não foi possível concluir a operação. Tente novamente.",
    );
  expect(document.body.textContent).not.toContain(
    "Synthetic diagnostic-service detail.",
  );
  await screen.getByRole("button", { name: "Tentar novamente" }).click();
  await expect.element(screen.getByTestId("diagnostic-item")).toBeVisible();
  await expect.element(screen.getByText("Item 1 de 120")).toBeVisible();

  expect(
    requests.filter(({ path }) => path.endsWith("/sessions/current")),
  ).toHaveLength(2);
  expect(requests[0]?.init).toMatchObject({
    method: "GET",
    credentials: "include",
  });
  expect(document.body.textContent).not.toContain("answer_key");
});

it("resumes a saved answer, clears it and navigates between diagnostic items", async () => {
  const sessionId = "33333333-3333-4333-8333-333333333333";
  const items = diagnosticItems();
  const firstItemId = items[0]?.itemId;
  if (firstItemId === undefined) throw new Error("synthetic item missing");
  let version = 4;
  let answers = [{ itemId: firstItemId, selectedChoiceIds: ["A"] }];
  const requests: { path: string; init?: RequestInit }[] = [];
  const projection = () => ({
    sessionId,
    diagnosticId: "B07-DIAGNOSTIC-V1",
    diagnosticVersion: "0.1.0",
    version,
    status: "EM_ANDAMENTO",
    startedAt: "2026-10-02T00:00:00.000Z",
    itemCount: 120,
    answeredItemCount: answers.length,
    currentOrdinal: answers.length === 0 ? 1 : 2,
    items,
    answers,
  });
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    requests.push({ path, init });
    if (path.endsWith("/sessions/current") && init?.method === "GET") {
      return successResponse(projection());
    }
    if (
      path.includes(`/sessions/${sessionId}/answers/`) &&
      init?.method === "PUT"
    ) {
      const body = JSON.parse(String(init.body)) as {
        selectedChoiceIds: readonly string[];
      };
      answers =
        body.selectedChoiceIds.length === 0
          ? []
          : [
              {
                itemId: firstItemId,
                selectedChoiceIds: [...body.selectedChoiceIds],
              },
            ];
      version += 1;
      return successResponse(projection());
    }
    return apiResponse("not_found");
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<DiagnosticPage />);

  await expect.element(screen.getByText("Item 2 de 120")).toBeVisible();
  await screen.getByRole("button", { name: "Item anterior" }).click();
  await expect.element(screen.getByText("Item 1 de 120")).toBeVisible();
  const clearButton = screen.getByRole("button", { name: "Limpar resposta" });
  await expect.element(clearButton).toBeEnabled();
  await clearButton.click();
  await expect
    .element(
      screen.getByText(
        "Resposta removida; a sessão continua pronta para retomada.",
      ),
    )
    .toBeVisible();
  await expect.element(screen.getByText("0 de 120 itens salvos")).toBeVisible();
  await screen.getByRole("button", { name: "Próximo item" }).click();
  await expect.element(screen.getByText("Item 2 de 120")).toBeVisible();

  const clearRequest = requests.find(
    (request) =>
      request.path ===
        `/api/v1/diagnostics/b07/sessions/${sessionId}/answers/${firstItemId}` &&
      request.init?.method === "PUT",
  );
  expect(clearRequest?.init?.credentials).toBe("include");
  expect(JSON.parse(String(clearRequest?.init?.body))).toMatchObject({
    version: 4,
    selectedChoiceIds: [],
  });
  expect(document.body.textContent).not.toContain("answer_key");
});

it("starts, saves and finalizes a synthetic formative session", async () => {
  const sessionId = "11111111-1111-4111-8111-111111111111";
  const items = diagnosticItems();
  let started = false;
  let status: "EM_ANDAMENTO" | "FINALIZADA" = "EM_ANDAMENTO";
  let version = 0;
  let answers: { itemId: string; selectedChoiceIds: string[] }[] = [];
  const finalizedAt = "2026-10-02T00:05:00.000Z";
  const projection = () => {
    const currentOrdinal =
      status === "FINALIZADA"
        ? null
        : (items.find(
            (item) => !answers.some((answer) => answer.itemId === item.itemId),
          )?.ordinal ?? null);
    return {
      sessionId,
      diagnosticId: "B07-DIAGNOSTIC-V1",
      diagnosticVersion: "0.1.0",
      version,
      status,
      startedAt: "2026-10-02T00:00:00.000Z",
      ...(status === "FINALIZADA" ? { finalizedAt } : {}),
      itemCount: 120,
      answeredItemCount: answers.length,
      currentOrdinal,
      items,
      answers,
      ...(status === "FINALIZADA"
        ? {
            result: {
              completedAt: finalizedAt,
              themes: [
                diagnosticTheme("B07-S1", 100),
                diagnosticTheme("B07-S2", null),
                diagnosticTheme("B07-S3", null),
              ],
            },
            nextAction: "CONTINUAR_TRILHA",
          }
        : {}),
    };
  };
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    const method = init?.method ?? "GET";
    if (path.endsWith("/sessions/current") && method === "GET") {
      return started ? successResponse(projection()) : apiResponse("not_found");
    }
    if (path === "/api/v1/diagnostics/b07/sessions" && method === "POST") {
      started = true;
      return successResponse(projection(), 201);
    }
    if (path.includes("/answers/") && method === "PUT") {
      const itemId = path.split("/").at(-1);
      const body = JSON.parse(String(init?.body)) as {
        selectedChoiceIds?: unknown;
      };
      if (itemId === undefined) throw new Error("synthetic item id missing");
      const selectedChoiceIds = Array.isArray(body.selectedChoiceIds)
        ? body.selectedChoiceIds.filter(
            (choiceId): choiceId is string => typeof choiceId === "string",
          )
        : [];
      answers = answers.filter((answer) => answer.itemId !== itemId);
      if (selectedChoiceIds.length > 0) {
        answers.push({ itemId, selectedChoiceIds });
      }
      version += 1;
      return successResponse(projection());
    }
    if (path.endsWith("/finalize") && method === "POST") {
      status = "FINALIZADA";
      version += 1;
      return successResponse(projection());
    }
    return apiResponse("not_found");
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<DiagnosticPage />);

  await expect.element(screen.getByTestId("diagnostic-start")).toBeVisible();
  await screen.getByRole("button", { name: "Iniciar diagnóstico" }).click();
  await expect.element(screen.getByTestId("diagnostic-item")).toBeVisible();
  await expect.element(screen.getByText("Item 1 de 120")).toBeVisible();
  await screen.getByRole("radio").first().click();
  await screen
    .getByRole("button", { name: "Salvar resposta e avançar" })
    .click();
  await expect.element(screen.getByText("1 de 120 itens salvos")).toBeVisible();
  await expect.element(screen.getByText("Item 2 de 120")).toBeVisible();
  await screen.getByRole("button", { name: "Finalizar diagnóstico" }).click();

  await expect
    .element(screen.getByRole("heading", { name: "Seu resultado formativo" }))
    .toBeVisible();
  await expect.element(screen.getByText("Sem nota global")).toBeVisible();
  await expect
    .element(screen.getByText("Baseline digital registrada"))
    .toBeVisible();
  expect(document.body.textContent).not.toContain("recommendedModuleIds");
});

it("toggles multiple diagnostic choices and persists the remaining selection", async () => {
  const sessionId = "44444444-4444-4444-8444-444444444444";
  const items = diagnosticItems().map((item, index) =>
    index === 0 ? { ...item, selectionMode: "MULTIPLE" as const } : item,
  );
  const firstItemId = items[0]?.itemId;
  if (firstItemId === undefined) throw new Error("synthetic item missing");
  let version = 6;
  let answers: { itemId: string; selectedChoiceIds: string[] }[] = [];
  const requests: { path: string; init?: RequestInit }[] = [];
  const projection = () => ({
    sessionId,
    diagnosticId: "B07-DIAGNOSTIC-V1",
    diagnosticVersion: "0.1.0",
    version,
    status: "EM_ANDAMENTO",
    startedAt: "2026-10-02T00:00:00.000Z",
    itemCount: 120,
    answeredItemCount: answers.length,
    currentOrdinal: answers.length === 0 ? 1 : 2,
    items,
    answers,
  });
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    requests.push({ path, init });
    if (path.endsWith("/sessions/current") && init?.method === "GET") {
      return successResponse(projection());
    }
    if (
      path.includes(`/sessions/${sessionId}/answers/`) &&
      init?.method === "PUT"
    ) {
      const body = JSON.parse(String(init.body)) as {
        selectedChoiceIds: readonly string[];
      };
      answers =
        body.selectedChoiceIds.length === 0
          ? []
          : [
              {
                itemId: firstItemId,
                selectedChoiceIds: [...body.selectedChoiceIds],
              },
            ];
      version += 1;
      return successResponse(projection());
    }
    return apiResponse("not_found");
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<DiagnosticPage />);

  await expect.element(screen.getByText("mais de uma escolha")).toBeVisible();
  const choices = screen.getByRole("checkbox");
  await choices.nth(0).click();
  await choices.nth(1).click();
  await choices.nth(0).click();
  await expect.element(choices.nth(0)).not.toBeChecked();
  await expect.element(choices.nth(1)).toBeChecked();
  await screen
    .getByRole("button", { name: "Salvar resposta e avançar" })
    .click();
  await expect.element(screen.getByText("Item 2 de 120")).toBeVisible();

  const saveRequest = requests.find(
    (request) =>
      request.path ===
        `/api/v1/diagnostics/b07/sessions/${sessionId}/answers/${firstItemId}` &&
      request.init?.method === "PUT",
  );
  expect(JSON.parse(String(saveRequest?.init?.body))).toMatchObject({
    version: 6,
    selectedChoiceIds: ["B"],
  });
  expect(document.body.textContent).not.toContain("answer_key");
});
