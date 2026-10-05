import { createElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import HomePage from "../app/page";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children?: ReactNode }) =>
    createElement("a", { href }, children),
}));

const invitationCode = "synthetic-invitation-token-000001";

function successResponse(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      meta: { request_id: "browser-test" },
    }),
    { status, headers: { "content-type": "application/json" } },
  );
}

function unauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: { code: "unauthorized", message: "Synthetic rejection." },
    }),
    { status: 401, headers: { "content-type": "application/json" } },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState({}, document.title, "/");
});

it("keeps invitation access available and reports activation failure safely", async () => {
  const requests: { path: string; init?: RequestInit }[] = [];
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    requests.push({
      path: typeof input === "string" ? input : input.toString(),
      init,
    });
    return unauthorizedResponse();
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<HomePage />);

  await expect
    .element(screen.getByRole("heading", { name: "Acesso interno" }))
    .toBeVisible();
  const tokenField = screen.getByLabelText("Token de convite");
  await expect.element(tokenField).toHaveAttribute("type", "password");
  await tokenField.fill(invitationCode);
  await screen.getByRole("button", { name: "Ativar acesso" }).click();

  await expect
    .element(screen.getByRole("alert"))
    .toHaveTextContent(
      "Não foi possível concluir a operação. Tente novamente.",
    );
  expect(requests.map((request) => request.path)).toEqual([
    "/api/v1/session/current",
    "/api/v1/invitations/accept",
  ]);
  expect(requests[1]?.init).toMatchObject({
    method: "POST",
    credentials: "include",
    body: JSON.stringify({
      token: invitationCode,
      sessionExpiresInSeconds: 3600,
    }),
  });
});

it("restores an active session with an empty journey and retries it", async () => {
  window.history.replaceState({}, document.title, "/");
  const requests: string[] = [];
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const path = typeof input === "string" ? input : input.toString();
    requests.push(path);
    if (path === "/api/v1/session/current") {
      return successResponse({ status: "active" });
    }
    if (path === "/api/v1/feedback") {
      return successResponse({ tickets: [] });
    }
    if (path === "/api/v1/learning-path") {
      return successResponse({
        assignments: [],
        activities: [],
        results: [],
        runtimes: [],
        nextAction: "CONSULTAR_PROXIMO_PASSO",
      });
    }
    return unauthorizedResponse();
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<HomePage />);

  await expect
    .element(
      screen.getByRole("heading", { name: "Nenhuma atividade atribuída" }),
    )
    .toBeVisible();
  await screen.getByRole("button", { name: "Atualizar jornada" }).click();
  await expect.element(screen.getByText("Jornada atualizada.")).toBeVisible();
  expect(
    requests.filter((path) => path === "/api/v1/learning-path"),
  ).toHaveLength(2);
  expect(document.body.textContent).not.toContain("recommendedModuleIds");
});

it("retries the journey after a temporary service failure", async () => {
  const activityId = "55555555-5555-4555-8555-555555555555";
  const activityTitle = "Atividade disponível após a retomada";
  const requests: { path: string; init?: RequestInit }[] = [];
  let journeyReads = 0;
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    requests.push({ path, init });

    if (path === "/api/v1/session/current") {
      return successResponse({ status: "active" });
    }
    if (path === "/api/v1/feedback") return successResponse({ tickets: [] });
    if (path === "/api/v1/learning-path") {
      journeyReads += 1;
      if (journeyReads === 1) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "internal_error",
              message: "Synthetic journey diagnostic.",
            },
          }),
          { status: 503, headers: { "content-type": "application/json" } },
        );
      }
      return successResponse({
        assignments: [],
        activities: [
          {
            activityId,
            slug: "synthetic-recovered-journey",
            title: activityTitle,
            status: "DISPONIVEL",
            nextAction: "INICIAR_ATIVIDADE",
          },
        ],
        results: [],
        runtimes: [],
        nextActionTarget: { kind: "ACTIVITY", activityId },
        nextAction: "INICIAR_ATIVIDADE",
      });
    }
    if (path === "/api/v1/dashboard") return unauthorizedResponse();
    if (path === `/api/v1/activities/${activityId}`) {
      return successResponse({
        activityId,
        slug: "synthetic-recovered-journey",
        title: activityTitle,
        items: [],
      });
    }
    return unauthorizedResponse();
  });
  vi.stubGlobal("fetch", fetchMock);
  window.history.replaceState({}, document.title, "/");

  const screen = await render(<HomePage />);

  await expect
    .element(screen.getByRole("heading", { name: "Jornada indisponível" }))
    .toBeVisible();
  await expect
    .element(screen.getByRole("alert"))
    .toHaveTextContent(
      "Não conseguimos atualizar as atividades agora. Sua sessão permanece protegida; tente novamente em instantes.",
    );
  expect(document.body.textContent).not.toContain(
    "Synthetic journey diagnostic.",
  );

  await screen.getByRole("button", { name: "Tentar novamente" }).click();

  await expect
    .element(screen.getByRole("heading", { name: activityTitle }))
    .toBeVisible();
  await expect.element(screen.getByText("Jornada atualizada.")).toBeVisible();
  expect(
    requests.filter(({ path }) => path === "/api/v1/learning-path"),
  ).toHaveLength(2);
  const journeyReadsRecorded = requests.filter(
    (request) => request.path === "/api/v1/learning-path",
  );
  expect(journeyReadsRecorded[0]?.init).toMatchObject({
    method: "GET",
    credentials: "include",
  });
  expect(document.body.textContent).not.toContain("learningAssignmentId");
});

it("opens the prioritized journey activity and updates its deep link", async () => {
  const currentActivityId = "11111111-1111-4111-8111-111111111111";
  const targetActivityId = "22222222-2222-4222-8222-222222222222";
  const currentTitle = "Atividade sintética em andamento";
  const targetTitle = "Próxima atividade sintética";
  const requests: { path: string; init?: RequestInit }[] = [];
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    requests.push({ path, init });

    if (path === "/api/v1/session/current") {
      return successResponse({ status: "active" });
    }
    if (path === "/api/v1/feedback") return successResponse({ tickets: [] });
    if (path === "/api/v1/learning-path") {
      return successResponse({
        assignments: [],
        activities: [
          {
            activityId: currentActivityId,
            slug: "synthetic-current-activity",
            title: currentTitle,
            status: "EM_ANDAMENTO",
            nextAction: "RETOMAR_ATIVIDADE",
          },
          {
            activityId: targetActivityId,
            slug: "synthetic-next-activity",
            title: targetTitle,
            status: "DISPONIVEL",
            nextAction: "INICIAR_ATIVIDADE",
          },
        ],
        results: [],
        runtimes: [],
        nextActionTarget: { kind: "ACTIVITY", activityId: targetActivityId },
        nextAction: "INICIAR_ATIVIDADE",
      });
    }
    if (path === "/api/v1/dashboard") return unauthorizedResponse();
    if (path === `/api/v1/activities/${currentActivityId}`) {
      return successResponse({
        activityId: currentActivityId,
        slug: "synthetic-current-activity",
        title: currentTitle,
        items: [],
      });
    }
    if (path === `/api/v1/activities/${targetActivityId}`) {
      return successResponse({
        activityId: targetActivityId,
        slug: "synthetic-next-activity",
        title: targetTitle,
        items: [],
      });
    }
    return unauthorizedResponse();
  });
  vi.stubGlobal("fetch", fetchMock);
  window.history.replaceState(
    {},
    document.title,
    `/?activityId=${currentActivityId}`,
  );

  const screen = await render(<HomePage />);

  await expect
    .element(screen.getByRole("heading", { name: currentTitle }))
    .toBeVisible();
  await screen
    .getByRole("button", { name: `Abrir atividade: ${targetTitle}` })
    .click();
  await expect
    .element(screen.getByRole("heading", { name: targetTitle }))
    .toBeVisible();
  await expect.element(screen.getByText("Atividade aberta.")).toBeVisible();

  expect(new URL(window.location.href).searchParams.get("activityId")).toBe(
    targetActivityId,
  );
  const targetRequest = requests.find(
    (request) => request.path === `/api/v1/activities/${targetActivityId}`,
  );
  expect(targetRequest?.init).toMatchObject({
    method: "GET",
    credentials: "include",
  });
  expect(document.body.textContent).not.toContain("learningAssignmentId");
});

it("retries a selected activity after a temporary service failure", async () => {
  const currentActivityId = "33333333-3333-4333-8333-333333333333";
  const targetActivityId = "44444444-4444-4444-8444-444444444444";
  const currentTitle = "Atividade sintética atual";
  const targetTitle = "Atividade sintética após nova tentativa";
  const requests: string[] = [];
  let targetReads = 0;
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const path = typeof input === "string" ? input : input.toString();
    requests.push(path);

    if (path === "/api/v1/session/current") {
      return successResponse({ status: "active" });
    }
    if (path === "/api/v1/feedback") return successResponse({ tickets: [] });
    if (path === "/api/v1/learning-path") {
      return successResponse({
        assignments: [],
        activities: [
          {
            activityId: currentActivityId,
            slug: "synthetic-current-activity",
            title: currentTitle,
            status: "EM_ANDAMENTO",
            nextAction: "RETOMAR_ATIVIDADE",
          },
          {
            activityId: targetActivityId,
            slug: "synthetic-retry-activity",
            title: targetTitle,
            status: "DISPONIVEL",
            nextAction: "INICIAR_ATIVIDADE",
          },
        ],
        results: [],
        runtimes: [],
        nextActionTarget: { kind: "ACTIVITY", activityId: targetActivityId },
        nextAction: "INICIAR_ATIVIDADE",
      });
    }
    if (path === "/api/v1/dashboard") return unauthorizedResponse();
    if (path === `/api/v1/activities/${currentActivityId}`) {
      return successResponse({
        activityId: currentActivityId,
        slug: "synthetic-current-activity",
        title: currentTitle,
        items: [],
      });
    }
    if (path === `/api/v1/activities/${targetActivityId}`) {
      targetReads += 1;
      if (targetReads === 1) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "internal_error",
              message: "Synthetic upstream diagnostic.",
            },
          }),
          { status: 503, headers: { "content-type": "application/json" } },
        );
      }
      return successResponse({
        activityId: targetActivityId,
        slug: "synthetic-retry-activity",
        title: targetTitle,
        items: [],
      });
    }
    return unauthorizedResponse();
  });
  vi.stubGlobal("fetch", fetchMock);
  window.history.replaceState(
    {},
    document.title,
    `/?activityId=${currentActivityId}`,
  );

  const screen = await render(<HomePage />);

  await expect
    .element(screen.getByRole("heading", { name: currentTitle }))
    .toBeVisible();
  await screen
    .getByRole("button", { name: `Abrir atividade: ${targetTitle}` })
    .click();
  await expect
    .element(
      screen.getByText(
        "Esta é a última versão carregada. A atualização falhou; você pode tentar novamente.",
      ),
    )
    .toBeVisible();
  await expect
    .element(screen.getByRole("alert"))
    .toHaveTextContent(
      "Não foi possível concluir a operação. Tente novamente.",
    );
  expect(document.body.textContent).not.toContain(
    "Synthetic upstream diagnostic.",
  );
  expect(new URL(window.location.href).searchParams.get("activityId")).toBe(
    targetActivityId,
  );

  await screen.getByRole("button", { name: "Tentar novamente" }).click();

  await expect
    .element(screen.getByRole("heading", { name: targetTitle }))
    .toBeVisible();
  await expect.element(screen.getByText("Atividade atualizada.")).toBeVisible();
  expect(
    requests.filter(
      (path) => path === `/api/v1/activities/${targetActivityId}`,
    ),
  ).toHaveLength(2);
});

it.each([false, true])(
  "starts, saves and submits with lost responses=%s",
  async (loseResponses) => {
    const activityId = "44444444-4444-4444-8444-444444444444";
    const attemptId = "55555555-5555-4555-8555-555555555555";
    const multipleChoiceItemId = "66666666-6666-4666-8666-666666666666";
    const singleChoiceItemId = "77777777-7777-4777-8777-777777777777";
    const activity = {
      activityId,
      slug: "synthetic-m01-formative-check",
      title: "Prioridades do caso sintético",
      items: [
        {
          itemId: multipleChoiceItemId,
          ordinal: 1,
          kind: "QUESTAO",
          title: "Sinais que exigem prioridade",
          text: "Marque as observações prioritárias.",
          responseMode: "CHOICE",
          selectionMode: "MULTIPLE",
          choices: [
            { id: "airway", label: "A", text: "Avaliar a via aérea." },
            { id: "defer", label: "B", text: "Adiar a reavaliação." },
            { id: "circulation", label: "C", text: "Verificar a circulação." },
          ],
        },
        {
          itemId: singleChoiceItemId,
          ordinal: 2,
          kind: "QUESTAO",
          title: "Próxima ação formativa",
          text: "Escolha a ação indicada no cenário sintético.",
          responseMode: "CHOICE",
          selectionMode: "SINGLE",
          choices: [
            { id: "document", label: "A", text: "Registrar a observação." },
            { id: "reassess", label: "B", text: "Reavaliar os sinais." },
          ],
        },
      ],
    };
    const journey = {
      assignments: [],
      activities: [
        {
          activityId,
          slug: activity.slug,
          title: activity.title,
          status: "DISPONIVEL",
          nextAction: "INICIAR_ATIVIDADE",
        },
      ],
      results: [],
      runtimes: [],
      nextActionTarget: { kind: "ACTIVITY", activityId },
      nextAction: "INICIAR_ATIVIDADE",
    };
    const runtime = {
      moduleId: "M01",
      version: 1,
      status: "DOMINIO_DIGITAL",
      nextAction: "REVISAR_RETENCAO",
      remediationCount: 0,
      retentionReviews: [],
      practicalCompetenceClaim: "PROIBIDO_MVP",
    };
    const participantDashboard = {
      kind: "participant",
      nextAction: "INICIAR_ATIVIDADE",
      progress: {
        assignedActivities: 1,
        completedActivities: 0,
        progressPercent: 0,
        remediationObjectives: 0,
        retentionReviewsPending: 0,
        pendingCorrections: 0,
      },
      path: [
        {
          moduleId: "M01",
          month: 1,
          status: "EM_ANDAMENTO",
          nextAction: "INICIAR_ATIVIDADE",
        },
      ],
      profile: [
        {
          moduleId: "M01",
          month: 1,
          competence: "Competência digital sintética.",
          status: "EM_DESENVOLVIMENTO_DIGITAL",
          scorePercent: 70,
          evidence: "AVALIACAO_MODULAR_DIGITAL",
          practicalCompetenceClaim: "PROIBIDO_MVP",
        },
      ],
    };
    const requests: { path: string; init?: RequestInit }[] = [];
    const savedAnswers: { itemId: string; response: string }[] = [];
    const committed = new Map<string, unknown>();
    async function mutationResponse(
      body: Record<string, unknown>,
      data: unknown,
    ): Promise<Response> {
      const key = String(body.idempotencyKey);
      if (committed.has(key)) return successResponse(committed.get(key));
      committed.set(key, data);
      if (loseResponses)
        throw new TypeError("Synthetic response lost after commit");
      return successResponse(data);
    }
    let attemptVersion = 0;
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const path = typeof input === "string" ? input : input.toString();
      requests.push({ path, init });

      if (path === "/api/v1/session/current") return unauthorizedResponse();
      if (path === "/api/v1/invitations/accept") {
        return successResponse({ status: "active" });
      }
      if (path === "/api/v1/feedback") {
        return successResponse({ tickets: [] });
      }
      if (path === "/api/v1/learning-path") return successResponse(journey);
      if (path === "/api/v1/dashboard") {
        return successResponse(participantDashboard);
      }
      if (path === `/api/v1/activities/${activityId}`) {
        return successResponse(activity);
      }
      if (path === "/api/v1/curriculum/modules/M01/runtime") {
        return successResponse(runtime);
      }
      if (path === "/api/v1/attempts" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        attemptVersion = 1;
        return mutationResponse(body, {
          attemptId,
          activityId,
          status: "EM_ANDAMENTO",
          version: attemptVersion,
          answers: [],
        });
      }
      if (
        path === `/api/v1/attempts/${attemptId}/answers` &&
        init?.method === "POST"
      ) {
        const body = JSON.parse(String(init.body)) as {
          itemId: string;
          response: string;
          idempotencyKey: string;
        };
        if (committed.has(body.idempotencyKey))
          return successResponse(committed.get(body.idempotencyKey));
        const existingIndex = savedAnswers.findIndex(
          (answer) => answer.itemId === body.itemId,
        );
        if (existingIndex === -1) savedAnswers.push(body);
        else savedAnswers[existingIndex] = body;
        attemptVersion += 1;
        return mutationResponse(body, {
          attemptId,
          activityId,
          status: "SALVA",
          version: attemptVersion,
          answers: savedAnswers.map(({ itemId, response }) => ({
            itemId,
            response,
            savedAt: "2026-10-03T12:00:00.000Z",
          })),
        });
      }
      if (
        path === `/api/v1/attempts/${attemptId}/submit` &&
        init?.method === "POST"
      ) {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        if (committed.has(String(body.idempotencyKey)))
          return successResponse(committed.get(String(body.idempotencyKey)));
        attemptVersion += 1;
        return mutationResponse(body, {
          attemptId,
          activityId,
          status: "SUBMETIDA",
          version: attemptVersion,
          answers: savedAnswers.map(({ itemId, response }) => ({
            itemId,
            response,
            savedAt: "2026-10-03T12:00:00.000Z",
          })),
        });
      }
      return unauthorizedResponse();
    });
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState(
      {},
      document.title,
      `/?activityId=${activityId}`,
    );

    const screen = await render(<HomePage />);

    await expect
      .element(screen.getByRole("heading", { name: "Acesso interno" }))
      .toBeVisible();
    await screen.getByLabelText("Token de convite").fill(invitationCode);
    await screen.getByRole("button", { name: "Ativar acesso" }).click();
    await expect
      .element(
        screen.getByRole("heading", {
          name: "Prioridades do caso sintético",
        }),
      )
      .toBeVisible();

    await screen.getByRole("button", { name: "Iniciar tentativa" }).click();
    if (loseResponses) {
      await expect
        .element(screen.getByRole("alert"))
        .toHaveTextContent(
          "Não foi possível concluir a operação. Tente novamente.",
        );
      await screen.getByRole("button", { name: "Iniciar tentativa" }).click();
    }
    await expect.element(screen.getByText("Tentativa iniciada.")).toBeVisible();
    await screen.getByRole("checkbox", { name: /Avaliar a via aérea/ }).click();
    await screen.getByRole("checkbox", { name: /Adiar a reavaliação/ }).click();
    await screen.getByRole("checkbox", { name: /Adiar a reavaliação/ }).click();
    await screen
      .getByRole("checkbox", { name: /Verificar a circulação/ })
      .click();
    await expect
      .element(screen.getByRole("button", { name: "Enviar tentativa" }))
      .toBeDisabled();
    await screen
      .getByRole("button", { name: "Salvar resposta" })
      .first()
      .click();
    if (loseResponses) {
      await expect.element(screen.getByRole("alert")).toBeVisible();
      await screen
        .getByRole("button", { name: "Salvar resposta" })
        .first()
        .click();
    }
    await expect.element(screen.getByText("Resposta salva.")).toBeVisible();

    await screen.getByRole("checkbox", { name: /Avaliar a via aérea/ }).click();
    await expect
      .element(screen.getByRole("button", { name: "Enviar tentativa" }))
      .toBeDisabled();
    await expect
      .element(
        screen.getByText(
          "Salve as alterações nas respostas antes de enviar a tentativa.",
        ),
      )
      .toBeVisible();
    await screen
      .getByRole("button", { name: "Salvar resposta" })
      .first()
      .click();
    if (loseResponses) {
      await expect.element(screen.getByRole("alert")).toBeVisible();
      await expect
        .element(screen.getByRole("button", { name: "Enviar tentativa" }))
        .toBeDisabled();
      await screen
        .getByRole("button", { name: "Salvar resposta" })
        .first()
        .click();
    }
    await expect.element(screen.getByText("Resposta salva.")).toBeVisible();

    await screen.getByRole("radio", { name: /Reavaliar os sinais/ }).click();
    await screen
      .getByRole("button", { name: "Salvar resposta" })
      .nth(1)
      .click();
    if (loseResponses) {
      await expect.element(screen.getByRole("alert")).toBeVisible();
      await screen
        .getByRole("button", { name: "Salvar resposta" })
        .nth(1)
        .click();
    }
    await expect.element(screen.getByText("Resposta salva.")).toBeVisible();
    await screen.getByRole("button", { name: "Enviar tentativa" }).click();
    if (loseResponses) {
      await expect.element(screen.getByRole("alert")).toBeVisible();
      await screen.getByRole("button", { name: "Enviar tentativa" }).click();
    }
    await expect
      .element(screen.getByText("Tentativa enviada; aguardando correção."))
      .toBeVisible();

    const startRequest = requests.find(
      (request) =>
        request.path === "/api/v1/attempts" && request.init?.method === "POST",
    );
    expect(JSON.parse(String(startRequest?.init?.body))).toMatchObject({
      activityId,
      idempotencyKey: expect.stringMatching(/^start-[0-9a-f-]{36}$/iu),
    });
    const answerRequests = requests.filter(
      (request) =>
        request.path === `/api/v1/attempts/${attemptId}/answers` &&
        request.init?.method === "POST",
    );
    expect(
      answerRequests
        .filter((_, index) => !loseResponses || index % 2 === 0)
        .map((request) => {
          const body = JSON.parse(String(request.init?.body)) as {
            attemptId: string;
            activityId: string;
            itemId: string;
            response: string;
            idempotencyKey: string;
          };
          expect(body.idempotencyKey).toMatch(/^answer-[0-9a-f-]{36}$/iu);
          expect(body.attemptId).toBe(attemptId);
          expect(body.activityId).toBe(activityId);
          return [body.itemId, body.response];
        }),
    ).toEqual([
      [multipleChoiceItemId, '["airway","circulation"]'],
      [multipleChoiceItemId, '["circulation"]'],
      [singleChoiceItemId, "reassess"],
    ]);
    const submitRequest = requests.find(
      (request) =>
        request.path === `/api/v1/attempts/${attemptId}/submit` &&
        request.init?.method === "POST",
    );
    expect(JSON.parse(String(submitRequest?.init?.body))).toMatchObject({
      idempotencyKey: expect.stringMatching(/^submit-[0-9a-f-]{36}$/iu),
    });
    expect(startRequest?.init?.credentials).toBe("include");
    expect(answerRequests[0]?.init?.credentials).toBe("include");
    expect(submitRequest?.init?.credentials).toBe("include");
    expect(savedAnswers).toHaveLength(2);
    if (loseResponses) {
      for (const path of [
        "/api/v1/attempts",
        `/api/v1/attempts/${attemptId}/answers`,
        `/api/v1/attempts/${attemptId}/submit`,
      ]) {
        const bodies = requests
          .filter(
            (request) =>
              request.path === path && request.init?.method === "POST",
          )
          .map((request) => String(request.init?.body));
        for (let index = 0; index < bodies.length; index += 2)
          expect(bodies[index + 1]).toBe(bodies[index]);
      }
      expect(committed.size).toBe(5);
    }
    expect(document.body.textContent).not.toContain("practicalCompetenceClaim");
    expect(document.body.textContent).not.toContain("answer_key");
  },
);

it.each(["SINGLE", "MULTIPLE", "TEXT"] as const)(
  "restores saved %s answers from the authorized attempt",
  async (mode) => {
    const activityId = "88888888-8888-4888-8888-888888888888";
    const attemptId = "99999999-9999-4999-8999-999999999999";
    const itemId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const response =
      mode === "TEXT"
        ? "Resposta sintética salva."
        : mode === "SINGLE"
          ? "a"
          : '["a","b"]';
    const requests: string[] = [];
    let failAttemptRead = false;
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input) => {
        const path = String(input);
        requests.push(path);
        if (path === "/api/v1/session/current")
          return successResponse({ status: "active" });
        if (path === "/api/v1/feedback")
          return successResponse({ tickets: [] });
        if (path === "/api/v1/learning-path")
          return successResponse({
            assignments: [],
            activities: [
              {
                activityId,
                slug: "synthetic-resume",
                title: "Retomada sintética",
                status: "EM_ANDAMENTO",
                attemptId,
                attemptStatus: "SALVA",
                attemptVersion: 2,
                nextAction: "RETOMAR_ATIVIDADE",
              },
            ],
            results: [],
            runtimes: [],
            nextAction: "RETOMAR_ATIVIDADE",
            nextActionTarget: { kind: "ACTIVITY", activityId },
          });
        if (path === `/api/v1/activities/${activityId}`)
          return successResponse({
            activityId,
            slug: "synthetic-resume",
            title: "Retomada sintética",
            items: [
              {
                itemId,
                ordinal: 1,
                kind: "QUESTAO",
                title: "Item sintético",
                text: "Responda ao item.",
                responseMode: mode === "TEXT" ? "TEXT" : "CHOICE",
                ...(mode === "TEXT"
                  ? {}
                  : {
                      selectionMode: mode,
                      choices: [
                        { id: "a", label: "A", text: "Opção sintética A" },
                        { id: "b", label: "B", text: "Opção sintética B" },
                      ],
                    }),
              },
            ],
          });
        if (path === `/api/v1/attempts/${attemptId}`)
          return failAttemptRead
            ? new Response(
                JSON.stringify({
                  success: false,
                  error: { code: "internal_error" },
                }),
                { status: 503 },
              )
            : successResponse({
                attemptId,
                activityId,
                status: "SALVA",
                version: 2,
                answers: [
                  { itemId, response, savedAt: "2026-10-03T12:00:00.000Z" },
                ],
              });
        return unauthorizedResponse();
      }),
    );
    window.history.replaceState(
      {},
      document.title,
      `/?activityId=${activityId}`,
    );
    const screen = await render(<HomePage />);
    if (mode === "TEXT")
      await expect
        .element(screen.getByLabelText("Resposta — Item sintético"))
        .toHaveValue(response);
    else {
      await expect
        .element(
          screen.getByRole(mode === "SINGLE" ? "radio" : "checkbox", {
            name: /Opção sintética A/u,
          }),
        )
        .toBeChecked();
      if (mode === "MULTIPLE")
        await expect
          .element(screen.getByRole("checkbox", { name: /Opção sintética B/u }))
          .toBeChecked();
    }
    expect(requests).toContain(`/api/v1/attempts/${attemptId}`);
    await expect
      .element(screen.getByRole("button", { name: "Enviar tentativa" }))
      .toBeEnabled();
    if (mode === "TEXT") {
      const field = screen.getByLabelText("Resposta — Item sintético");
      await field.fill("Edição sintética ainda não salva.");
      failAttemptRead = true;
      await screen.getByRole("button", { name: "Atualizar respostas" }).click();
      await expect
        .element(
          screen.getByRole("button", { name: "Tentar carregar respostas" }),
        )
        .toBeVisible();
      await expect
        .element(field)
        .toHaveValue("Edição sintética ainda não salva.");
      await expect.element(field).toBeDisabled();
      failAttemptRead = false;
      await screen
        .getByRole("button", { name: "Tentar carregar respostas" })
        .click();
      await expect.element(field).toBeEnabled();
      await expect
        .element(field)
        .toHaveValue("Edição sintética ainda não salva.");
      await expect
        .element(screen.getByRole("button", { name: "Enviar tentativa" }))
        .toBeDisabled();
    }
  },
);

it("resumes a persisted digital reflection and updates its participant projection", async () => {
  const activityId = "88888888-8888-4888-8888-888888888888";
  const attemptId = "99999999-9999-4999-8999-999999999999";
  const itemId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const reflectionResponse = "Descrever a próxima ação sintética.";
  const activity = {
    activityId,
    slug: "synthetic-m01-reflection",
    title: "Reflexão do caso sintético",
    items: [
      {
        itemId,
        ordinal: 1,
        kind: "REFLEXAO",
        title: "Próxima ação",
        text: "Descreva a próxima ação para o cenário sintético.",
        responseMode: "TEXT",
      },
    ],
  };
  const journey = {
    assignments: [],
    activities: [
      {
        activityId,
        slug: activity.slug,
        title: activity.title,
        status: "DISPONIVEL",
        nextAction: "INICIAR_ATIVIDADE",
        attemptId,
        attemptStatus: "SALVA",
        attemptVersion: 2,
      },
    ],
    results: [],
    runtimes: [],
    nextActionTarget: { kind: "ACTIVITY", activityId },
    nextAction: "INICIAR_ATIVIDADE",
  };
  const participantDashboard = {
    kind: "participant",
    nextAction: "INICIAR_ATIVIDADE",
    progress: {
      assignedActivities: 1,
      completedActivities: 0,
      progressPercent: 0,
      remediationObjectives: 1,
      retentionReviewsPending: 1,
      pendingCorrections: 0,
    },
    path: [
      {
        moduleId: "M01",
        month: 1,
        status: "EM_ANDAMENTO",
        nextAction: "RETOMAR_MODULO",
      },
    ],
    profile: [
      {
        moduleId: "M01",
        month: 1,
        competence: "Priorizar observações no cenário sintético.",
        status: "EM_DESENVOLVIMENTO_DIGITAL",
        scorePercent: 70,
        evidence: "AVALIACAO_MODULAR_DIGITAL",
        practicalCompetenceClaim: "PROIBIDO_MVP",
      },
    ],
    diagnosticProfile: [
      {
        themeId: "B07-S1",
        themeLabel: "Tema sintético um",
        status: "BASELINE_REGISTRADA",
        scorePercent: 75,
        answeredItemCount: 3,
        itemCount: 4,
        recommendedModuleIds: ["M01"],
        evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
        notPunitive: true,
        noGlobalPassFail: true,
        practicalCompetenceClaim: "PROIBIDO_MVP",
      },
      {
        themeId: "B07-S2",
        themeLabel: "Tema sintético dois",
        status: "SEM_EVIDENCIA_DIGITAL",
        scorePercent: null,
        answeredItemCount: 0,
        itemCount: 4,
        recommendedModuleIds: ["M01"],
        evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
        notPunitive: true,
        noGlobalPassFail: true,
        practicalCompetenceClaim: "PROIBIDO_MVP",
      },
      {
        themeId: "B07-S3",
        themeLabel: "Tema sintético três",
        status: "SEM_EVIDENCIA_DIGITAL",
        scorePercent: null,
        answeredItemCount: 0,
        itemCount: 4,
        recommendedModuleIds: ["M01"],
        evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
        notPunitive: true,
        noGlobalPassFail: true,
        practicalCompetenceClaim: "PROIBIDO_MVP",
      },
    ],
  };
  const runtime = {
    moduleId: "M01",
    version: 1,
    status: "EM_REMEDIACAO",
    nextAction: "EXECUTAR_REMEDIACAO",
    scorePercent: 70,
    remediationCount: 1,
    retentionReviews: [
      { day: 30, dueAt: "2026-11-01T12:00:00.000Z", status: "PENDENTE" },
    ],
    practicalCompetenceClaim: "PROIBIDO_MVP",
  };
  const requests: { path: string; init?: RequestInit }[] = [];
  const savedAnswers: { itemId: string; response: string }[] = [];
  let activityReads = 0;
  let attemptVersion = 2;
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    requests.push({ path, init });

    if (path === "/api/v1/session/current") {
      return successResponse({ status: "active" });
    }
    if (path === "/api/v1/feedback") {
      return successResponse({ tickets: [] });
    }
    if (path === "/api/v1/learning-path") return successResponse(journey);
    if (path === "/api/v1/dashboard") {
      return successResponse(participantDashboard);
    }
    if (path === `/api/v1/activities/${activityId}`) {
      activityReads += 1;
      const hasAnswer = activityReads >= 1;
      const submitted = activityReads >= 3;
      return successResponse({
        ...activity,
        reflection: {
          status: submitted ? "CONCLUIDA" : "EM_ANDAMENTO",
          nextAction: submitted ? "PROXIMA_ACAO" : "ENVIAR_REFLEXAO",
          itemCount: 1,
          answeredItemCount: hasAnswer ? 1 : 0,
          answers: hasAnswer
            ? [
                {
                  itemId,
                  response:
                    activityReads === 1
                      ? "Resposta anterior salva sinteticamente."
                      : reflectionResponse,
                  savedAt: "2026-10-02T12:00:00.000Z",
                },
              ]
            : [],
          evidence: "REFLEXAO_DIGITAL",
          practicalCompetenceClaim: "PROIBIDO_MVP",
        },
      });
    }
    if (path === "/api/v1/curriculum/modules/M01/runtime") {
      return successResponse(runtime);
    }
    if (path === `/api/v1/attempts/${attemptId}`) {
      return successResponse({
        attemptId,
        activityId,
        status: "SALVA",
        version: 2,
        answers: [
          {
            itemId,
            response: "Resposta anterior salva sinteticamente.",
            savedAt: "2026-10-03T12:00:00.000Z",
          },
        ],
      });
    }
    if (path === "/api/v1/attempts" && init?.method === "POST") {
      attemptVersion = 1;
      return successResponse(
        {
          attemptId,
          activityId,
          status: "EM_ANDAMENTO",
          version: attemptVersion,
          answers: [],
        },
        201,
      );
    }
    if (
      path === `/api/v1/attempts/${attemptId}/answers` &&
      init?.method === "POST"
    ) {
      const body = JSON.parse(String(init.body)) as {
        itemId: string;
        response: string;
      };
      savedAnswers.push({ itemId: body.itemId, response: body.response });
      attemptVersion += 1;
      return successResponse({
        attemptId,
        activityId,
        status: "SALVA",
        version: attemptVersion,
        answers: savedAnswers.map(({ itemId, response }) => ({
          itemId,
          response,
          savedAt: "2026-10-03T12:00:00.000Z",
        })),
      });
    }
    if (
      path === `/api/v1/attempts/${attemptId}/submit` &&
      init?.method === "POST"
    ) {
      attemptVersion += 1;
      return successResponse({
        attemptId,
        activityId,
        status: "SUBMETIDA",
        version: attemptVersion,
        answers: savedAnswers.map(({ itemId, response }) => ({
          itemId,
          response,
          savedAt: "2026-10-03T12:00:00.000Z",
        })),
      });
    }
    return unauthorizedResponse();
  });
  vi.stubGlobal("fetch", fetchMock);
  window.history.replaceState({}, document.title, `/?activityId=${activityId}`);

  const screen = await render(<HomePage />);

  await expect
    .element(
      screen.getByRole("heading", { name: "Reflexão do caso sintético" }),
    )
    .toBeVisible();
  await expect
    .element(screen.getByTestId("reflection-state"))
    .toHaveTextContent("Enviar reflexão");
  await expect
    .element(screen.getByRole("heading", { name: "Competências acompanhadas" }))
    .toBeVisible();
  await expect
    .element(screen.getByRole("heading", { name: "Diagnóstico por tema" }))
    .toBeVisible();
  await expect
    .element(screen.getByRole("heading", { name: "EXECUTAR_REMEDIACAO" }))
    .toBeVisible();

  const answerField = screen.getByLabelText("Resposta — Próxima ação");
  await expect
    .element(answerField)
    .toHaveValue("Resposta anterior salva sinteticamente.");
  await answerField.fill(reflectionResponse);
  await screen.getByRole("button", { name: "Salvar resposta" }).click();
  await expect.element(screen.getByText("Resposta salva.")).toBeVisible();
  await expect.element(answerField).toHaveValue(reflectionResponse);
  await expect
    .element(screen.getByTestId("reflection-state"))
    .toHaveTextContent("Enviar reflexão");

  await screen.getByRole("button", { name: "Enviar tentativa" }).click();
  await expect
    .element(screen.getByTestId("reflection-state"))
    .toHaveTextContent("Concluída");
  await expect
    .element(screen.getByTestId("reflection-state"))
    .toHaveTextContent("Próxima ação");
  await expect
    .element(
      screen.getByText(
        "Esta é uma reflexão digital para orientar a próxima ação. Não gera nota, gabarito ou comprovação de competência prática.",
      ),
    )
    .toBeVisible();

  expect(
    requests.some(
      (request) =>
        request.path === "/api/v1/attempts" && request.init?.method === "POST",
    ),
  ).toBe(false);
  const answerRequest = requests.find(
    (request) =>
      request.path === `/api/v1/attempts/${attemptId}/answers` &&
      request.init?.method === "POST",
  );
  expect(JSON.parse(String(answerRequest?.init?.body))).toMatchObject({
    attemptId,
    activityId,
    itemId,
    response: reflectionResponse,
    idempotencyKey: expect.stringMatching(/^answer-[0-9a-f-]{36}$/iu),
  });
  const submitRequest = requests.find(
    (request) =>
      request.path === `/api/v1/attempts/${attemptId}/submit` &&
      request.init?.method === "POST",
  );
  expect(JSON.parse(String(submitRequest?.init?.body))).toMatchObject({
    idempotencyKey: expect.stringMatching(/^submit-[0-9a-f-]{36}$/iu),
  });
  expect(answerRequest?.init?.credentials).toBe("include");
  expect(submitRequest?.init?.credentials).toBe("include");
  expect(savedAnswers).toEqual([{ itemId, response: reflectionResponse }]);
  expect(document.body.textContent).not.toContain("practicalCompetenceClaim");
  expect(document.body.textContent).not.toContain("recommendedModuleIds");
  expect(document.body.textContent).not.toContain("answer_key");
});

it("submits synthetic participant feedback and renders its public ticket projection", async () => {
  const feedbackDescription = "Relato de usabilidade sintético.";
  const requests: { path: string; init?: RequestInit }[] = [];
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    requests.push({ path, init });

    if (path === "/api/v1/session/current") return unauthorizedResponse();
    if (path === "/api/v1/invitations/accept") {
      return successResponse({ status: "active" });
    }
    if (path === "/api/v1/feedback" && init?.method === "GET") {
      return successResponse({ tickets: [] });
    }
    if (path === "/api/v1/learning-path") {
      return successResponse({
        assignments: [],
        activities: [],
        results: [],
        runtimes: [],
        nextAction: "CONSULTAR_PROXIMO_PASSO",
      });
    }
    if (path === "/api/v1/feedback" && init?.method === "POST") {
      return successResponse(
        {
          ticketId: "44444444-4444-4444-8444-444444444444",
          type: "USABILIDADE",
          description: feedbackDescription,
          createdAt: "2026-10-01T12:00:00.000Z",
          status: "NOVO",
          version: 0,
        },
        201,
      );
    }
    return unauthorizedResponse();
  });
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<HomePage />);
  await screen.getByLabelText("Token de convite").fill(invitationCode);
  await screen.getByRole("button", { name: "Ativar acesso" }).click();
  await expect.element(screen.getByTestId("feedback-panel")).toBeVisible();

  await screen.getByLabelText("Tipo de relato").selectOptions("USABILIDADE");
  await screen.getByLabelText("Descrição").fill(feedbackDescription);
  await screen.getByRole("button", { name: "Enviar feedback" }).click();

  await expect
    .element(
      screen.getByText("Feedback enviado. Acompanhe o status nesta tela.", {
        exact: true,
      }),
    )
    .toBeVisible();
  await expect
    .element(
      screen.getByRole("list", { name: "Meus relatos" }).getByRole("listitem"),
    )
    .toHaveTextContent("Usabilidade · Recebido · 2026-10-01");
  await expect.element(screen.getByText(feedbackDescription)).toBeVisible();
  expect(document.body.textContent).not.toContain("participantId");
  expect(document.body.textContent).not.toContain("scopeId");

  const feedbackPost = requests.find(
    (request) =>
      request.path === "/api/v1/feedback" && request.init?.method === "POST",
  );
  expect(feedbackPost?.init?.credentials).toBe("include");
  expect(JSON.parse(String(feedbackPost?.init?.body))).toEqual({
    type: "USABILIDADE",
    description: feedbackDescription,
  });
  expect(requests.map(({ path }) => path)).toEqual([
    "/api/v1/session/current",
    "/api/v1/invitations/accept",
    "/api/v1/feedback",
    "/api/v1/learning-path",
    "/api/v1/dashboard",
    "/api/v1/feedback",
  ]);
});

it("restores a corrected attempt and files an auditable participant appeal", async () => {
  const activityId = "88888888-8888-4888-8888-888888888888";
  const attemptId = "99999999-9999-4999-8999-999999999999";
  const itemId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const appealId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const justification = "Justificativa sintética para contestação.";
  const requests: { path: string; init?: RequestInit }[] = [];
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    requests.push({ path, init });

    if (path === "/api/v1/session/current") {
      return successResponse({ status: "active" });
    }
    if (path === "/api/v1/feedback") {
      return successResponse({ tickets: [] });
    }
    if (path === "/api/v1/learning-path") {
      return successResponse({
        assignments: [],
        activities: [
          {
            activityId,
            slug: "synthetic-appeal-flow",
            title: "Atividade sintética concluída",
            status: "CONCLUIDO",
            attemptId,
            attemptStatus: "CORRIGIDA_AUTOMATICAMENTE",
            attemptVersion: 3,
            nextAction: "REVISAR_PROXIMO_CONTEUDO",
          },
        ],
        results: [],
        runtimes: [],
        nextAction: "CONSULTAR_PROXIMO_PASSO",
      });
    }
    if (path === "/api/v1/dashboard") return unauthorizedResponse();
    if (path === `/api/v1/activities/${activityId}`) {
      return successResponse({
        activityId,
        slug: "synthetic-appeal-flow",
        title: "Atividade sintética concluída",
        items: [
          {
            itemId,
            ordinal: 1,
            kind: "QUESTAO",
            title: "Prioridades iniciais",
            text: "Descreva a prioridade no cenário fictício.",
            responseMode: "TEXT",
          },
        ],
      });
    }
    if (path === `/api/v1/attempts/${attemptId}`)
      return successResponse({
        attemptId,
        activityId,
        status: "CORRIGIDA_AUTOMATICAMENTE",
        version: 3,
        answers: [],
      });
    if (path === `/api/v1/appeals?attemptId=${attemptId}`) {
      return successResponse({ appeals: [] });
    }
    if (path === `/api/v1/attempts/${attemptId}/feedback`) {
      return successResponse({
        attemptStatus: "CORRIGIDA_AUTOMATICAMENTE",
        attemptVersion: 3,
        resultVersion: 1,
        score: 82,
        outcome: "APROVADO",
        feedback: "Feedback formativo próprio.",
      });
    }
    if (path === "/api/v1/appeals" && init?.method === "POST") {
      return successResponse(
        {
          appealId,
          attemptId,
          itemId,
          createdAt: "2026-10-01T12:00:00.000Z",
          dueAt: "2026-10-12T12:00:00.000Z",
          status: "ABERTA",
          version: 0,
        },
        201,
      );
    }
    return unauthorizedResponse();
  });
  vi.stubGlobal("fetch", fetchMock);
  window.history.replaceState({}, document.title, `/?activityId=${activityId}`);

  const screen = await render(<HomePage />);
  await expect
    .element(
      screen.getByRole("heading", { name: "Atividade sintética concluída" }),
    )
    .toBeVisible();
  await expect
    .element(screen.getByText("Feedback formativo próprio."))
    .toBeVisible();
  await expect.element(screen.getByTestId("appeals-panel")).toBeVisible();

  await screen
    .getByTestId("appeals-panel")
    .getByLabelText("Questão")
    .selectOptions(itemId);
  await screen.getByLabelText("Justificativa").fill(justification);
  await screen.getByRole("button", { name: "Enviar contestação" }).click();

  await expect
    .element(
      screen.getByText(
        "Contestação registrada. Acompanhe o protocolo nesta tela.",
        { exact: true },
      ),
    )
    .toBeVisible();
  await expect
    .element(
      screen
        .getByRole("list", { name: "Meus protocolos" })
        .getByRole("listitem"),
    )
    .toHaveTextContent("Item 1 · Recebida · prazo 2026-10-12");
  expect(document.body.textContent).not.toContain("reviewerId");
  expect(document.body.textContent).not.toContain("gabarito");
  expect(document.body.textContent).not.toContain("scopeId");

  const appealPost = requests.find(
    (request) =>
      request.path === "/api/v1/appeals" && request.init?.method === "POST",
  );
  expect(appealPost?.init?.credentials).toBe("include");
  expect(JSON.parse(String(appealPost?.init?.body))).toEqual({
    attemptId,
    itemId,
    justification,
  });
  expect(
    requests.some(
      (request) => request.path === `/api/v1/appeals?attemptId=${attemptId}`,
    ),
  ).toBe(true);
  expect(
    requests.some(
      (request) =>
        request.path === `/api/v1/attempts/${attemptId}/feedback` &&
        request.init?.method === "GET",
    ),
  ).toBe(true);
});

it("starts a new attempt only for the prioritized remediation activity", async () => {
  const activityId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const priorAttemptId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const newAttemptId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  const itemId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
  const requests: { path: string; init?: RequestInit }[] = [];
  let attemptStarts = 0;
  const activity = {
    activityId,
    slug: "synthetic-m01-remediation",
    title: "Atividade sintética de reforço",
    items: [
      {
        itemId,
        ordinal: 1,
        kind: "QUESTAO",
        title: "Próxima ação formativa",
        text: "Escolha a próxima ação do cenário sintético.",
        responseMode: "TEXT",
      },
    ],
  };
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    requests.push({ path, init });

    if (path === "/api/v1/session/current") {
      return successResponse({ status: "active" });
    }
    if (path === "/api/v1/feedback") return successResponse({ tickets: [] });
    if (path === "/api/v1/learning-path") {
      return successResponse({
        assignments: [],
        activities: [
          {
            activityId,
            slug: activity.slug,
            title: activity.title,
            status: "EM_REFORCO",
            attemptId: priorAttemptId,
            attemptStatus: "CORRIGIDA_AUTOMATICAMENTE",
            attemptVersion: 4,
            nextAction: "REVISAR_PROXIMO_CONTEUDO",
          },
        ],
        results: [],
        runtimes: [],
        nextActionTarget: { kind: "ACTIVITY", activityId },
        nextAction: "EXECUTAR_REMEDIACAO",
      });
    }
    if (path === "/api/v1/dashboard") return unauthorizedResponse();
    if (path === `/api/v1/activities/${activityId}`) {
      return successResponse(activity);
    }
    if (path === "/api/v1/curriculum/modules/M01/runtime") {
      return successResponse({
        moduleId: "M01",
        version: 2,
        status: "EM_REMEDIACAO",
        nextAction: "EXECUTAR_REMEDIACAO",
        scorePercent: 70,
        remediationCount: 1,
        retentionReviews: [],
        practicalCompetenceClaim: "PROIBIDO_MVP",
      });
    }
    if (path === `/api/v1/attempts/${priorAttemptId}`)
      return successResponse({
        attemptId: priorAttemptId,
        activityId,
        status: "CORRIGIDA_AUTOMATICAMENTE",
        version: 4,
        answers: [],
      });
    if (path === `/api/v1/appeals?attemptId=${priorAttemptId}`) {
      return successResponse({ appeals: [] });
    }
    if (path === `/api/v1/attempts/${priorAttemptId}/feedback`) {
      return successResponse({
        attemptStatus: "CORRIGIDA_AUTOMATICAMENTE",
        attemptVersion: 4,
        resultVersion: 2,
        score: 70,
        outcome: "REFORCO",
        feedback: "Feedback formativo sintético.",
      });
    }
    if (path === "/api/v1/attempts" && init?.method === "POST") {
      attemptStarts += 1;
      if (attemptStarts === 1) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "internal_error",
              message: "Synthetic attempt-service detail.",
            },
          }),
          { status: 503, headers: { "content-type": "application/json" } },
        );
      }
      return successResponse(
        {
          attemptId: newAttemptId,
          activityId,
          status: "EM_ANDAMENTO",
          version: 0,
          answers: [],
        },
        201,
      );
    }
    return unauthorizedResponse();
  });
  vi.stubGlobal("fetch", fetchMock);
  window.history.replaceState({}, document.title, `/?activityId=${activityId}`);

  const screen = await render(<HomePage />);

  await expect
    .element(screen.getByRole("heading", { name: activity.title }))
    .toBeVisible();
  await expect
    .element(screen.getByRole("button", { name: "Iniciar nova tentativa" }))
    .toBeVisible();
  await expect
    .element(screen.getByText("Feedback formativo sintético."))
    .toBeVisible();

  await screen.getByRole("button", { name: "Iniciar nova tentativa" }).click();
  await expect
    .element(screen.getByRole("alert"))
    .toHaveTextContent(
      "Não foi possível concluir a operação. Tente novamente.",
    );
  expect(document.body.textContent).not.toContain(
    "Synthetic attempt-service detail.",
  );
  await screen.getByRole("button", { name: "Iniciar nova tentativa" }).click();

  await expect.element(screen.getByText("Tentativa iniciada.")).toBeVisible();
  await expect
    .element(screen.getByRole("button", { name: "Enviar tentativa" }))
    .toBeVisible();
  expect(
    requests.some(
      (request) =>
        request.path === "/api/v1/attempts" && request.init?.method === "POST",
    ),
  ).toBe(true);
  const startRequests = requests.filter(
    (request) =>
      request.path === "/api/v1/attempts" && request.init?.method === "POST",
  );
  expect(startRequests).toHaveLength(2);
  const startRequest = startRequests[1];
  expect(startRequest?.init?.credentials).toBe("include");
  expect(JSON.parse(String(startRequest?.init?.body))).toMatchObject({
    activityId,
  });
  expect(JSON.parse(String(startRequest?.init?.body)).idempotencyKey).toMatch(
    /^start-[0-9a-f-]{36}$/u,
  );
  expect(document.body.textContent).not.toContain("learningAssignmentId");
});

it("allows a new feedback report after its history cannot load", async () => {
  const reportDescription = "Relato sintético após falha da consulta.";
  const feedbackPosts: RequestInit[] = [];
  let feedbackReads = 0;
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = typeof input === "string" ? input : input.toString();
    if (path === "/api/v1/session/current") {
      return successResponse({ status: "active" });
    }
    if (path === "/api/v1/feedback") {
      if (init?.method === "POST") {
        feedbackPosts.push(init);
        return successResponse(
          {
            ticketId: "12121212-1212-4212-8212-121212121212",
            type: "BUG_TECNICO",
            description: reportDescription,
            createdAt: "2026-10-02T10:00:00.000Z",
            status: "NOVO",
            version: 0,
          },
          201,
        );
      }
      feedbackReads += 1;
      if (feedbackReads === 1) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "internal_error",
              message: "Synthetic feedback-service detail.",
            },
          }),
          { status: 503, headers: { "content-type": "application/json" } },
        );
      }
      return successResponse({ tickets: [] });
    }
    if (path === "/api/v1/learning-path") {
      return successResponse({
        assignments: [],
        activities: [],
        results: [],
        runtimes: [],
        nextAction: "CONSULTAR_PROXIMO_PASSO",
      });
    }
    if (path === "/api/v1/dashboard") return unauthorizedResponse();
    return unauthorizedResponse();
  });
  vi.stubGlobal("fetch", fetchMock);
  window.history.replaceState({}, document.title, "/");

  const screen = await render(<HomePage />);

  await expect
    .element(screen.getByRole("alert"))
    .toHaveTextContent(
      "Não foi possível concluir a operação. Tente novamente.",
    );
  await expect
    .element(screen.getByText(/Não foi possível consultar seus relatos/u))
    .toBeVisible();
  expect(document.body.textContent).not.toContain(
    "Synthetic feedback-service detail.",
  );

  await screen.getByLabelText("Tipo de relato").selectOptions("BUG_TECNICO");
  await screen.getByLabelText("Descrição").fill(reportDescription);
  await screen.getByRole("button", { name: "Enviar feedback" }).click();

  await expect
    .element(
      screen.getByText("Feedback enviado. Acompanhe o status nesta tela."),
    )
    .toBeVisible();
  await expect
    .element(
      screen
        .getByRole("list", { name: "Meus relatos" })
        .getByText(reportDescription),
    )
    .toBeVisible();
  expect(feedbackReads).toBe(1);
  expect(feedbackPosts).toHaveLength(1);
  expect(feedbackPosts[0]?.credentials).toBe("include");
  expect(JSON.parse(String(feedbackPosts[0]?.body))).toEqual({
    type: "BUG_TECNICO",
    description: reportDescription,
  });
  expect(document.body.textContent).not.toContain(
    "Não foi possível concluir a operação. Tente novamente.",
  );
});
