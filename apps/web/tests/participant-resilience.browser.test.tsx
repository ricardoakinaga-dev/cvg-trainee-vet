import { createElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent, commands, page } from "vitest/browser";
import HomePage from "../app/page";
import {
  participantAppealProjectionSchema,
  participantFeedbackTicketProjectionSchema,
} from "@cvg/contracts";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children?: ReactNode }) =>
    createElement("a", { href }, children),
}));
const activityId = "88888888-8888-4888-8888-888888888888";
const attemptId = "99999999-9999-4999-8999-999999999999";
const itemId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
function ok(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), { status: 200 });
}
function denied(code = "internal_error", status = 503) {
  return new Response(
    JSON.stringify({
      success: false,
      error: { code, message: "private synthetic detail" },
    }),
    { status },
  );
}
function journey(
  activities = [
    {
      activityId,
      slug: "synthetic-current",
      title: "Atividade atual",
      status: "EM_ANDAMENTO",
      attemptId,
      attemptStatus: "SALVA",
      attemptVersion: 2,
      nextAction: "RETOMAR_ATIVIDADE",
    },
  ],
) {
  return {
    assignments: [],
    activities,
    results: [],
    runtimes: [],
    nextAction: "RETOMAR_ATIVIDADE",
    nextActionTarget: { kind: "ACTIVITY", activityId },
  };
}
function stub(
  overrides: (
    path: string,
    init?: RequestInit,
  ) => Response | Promise<Response> | undefined,
) {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input, init) => {
      const path = String(input);
      const replacement = overrides(path, init);
      if (replacement !== undefined) return replacement;
      if (path === "/api/v1/session/current") return ok({ status: "active" });
      if (path === "/api/v1/feedback") return ok({ tickets: [] });
      if (path === "/api/v1/learning-path") return ok(journey());
      if (path === `/api/v1/activities/${activityId}`)
        return ok({
          activityId,
          slug: "synthetic-current",
          title: "Atividade atual",
          items: [
            {
              itemId,
              ordinal: 1,
              kind: "QUESTAO",
              title: "Item sintético",
              text: "Responda ao item.",
              responseMode: "TEXT",
            },
          ],
        });
      if (path === `/api/v1/attempts/${attemptId}`)
        return ok({
          attemptId,
          activityId,
          status: "SALVA",
          version: 2,
          answers: [
            {
              itemId,
              response: "Resposta salva",
              savedAt: "2026-10-03T12:00:00.000Z",
            },
          ],
        });
      return denied("unauthorized", 401);
    }),
  );
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState({}, document.title, "/");
});

it.each(["A", "C", ""])(
  "R27 original replay reconciles with retained newer answer %j and preserves immutable wire",
  async (latest) => {
    let reads = 0;
    const saves: { path: string; body: string; key: string | null }[] = [];
    const submitted: string[] = [];
    let authoritative = latest;
    const projection = (
      version: number,
      response: string,
      status = "SALVA",
    ) => ({
      attemptId,
      activityId,
      version,
      status,
      answers:
        response === ""
          ? []
          : [{ itemId, response, savedAt: "2026-10-04T03:00:00.000Z" }],
    });
    stub((path, init) => {
      if (path === `/api/v1/attempts/${attemptId}`) {
        return ok(reads++ === 0 ? projection(2, "") : projection(9, latest));
      }
      if (path.endsWith("/answers") && init?.method === "POST") {
        const body = String(init.body);
        saves.push({ path, body, key: JSON.parse(body).idempotencyKey });
        if (saves.length === 1) return denied("internal_error", 500);
        if (saves.length === 2) return ok(projection(3, "A"));
        authoritative = "A";
        return ok(projection(10, authoritative));
      }
      if (path.endsWith("/submit") && init?.method === "POST") {
        submitted.push(authoritative);
        return ok(projection(11, authoritative, "SUBMETIDA"));
      }
      return undefined;
    });
    const screen = await render(<HomePage />);
    const field = screen.getByLabelText("Resposta — Item sintético");
    await expect.element(field).toHaveValue("");
    await field.fill("A");
    await screen
      .getByRole("button", { name: "Salvar resposta", exact: true })
      .click();
    const replay = screen.getByRole("button", {
      name: "Reenviar envio pendente de Item sintético",
      exact: true,
    });
    await expect.element(replay).toBeVisible();
    await screen
      .getByRole("button", { name: "Atualizar respostas", exact: true })
      .click();
    await expect.poll(() => reads).toBe(2);
    await expect.element(field).toHaveValue("A");
    await replay.click();
    await expect
      .element(screen.getByText("Resposta salva.", { exact: true }))
      .toBeVisible();
    await expect.element(field).toHaveValue("A");
    expect(saves).toHaveLength(2);
    expect(saves[0]?.key).toBeTruthy();
    expect(saves[1]).toEqual(saves[0]);
    const submit = screen.getByRole("button", {
      name: "Enviar tentativa",
      exact: true,
    });
    if (latest === "A") {
      await expect.element(submit).toBeEnabled();
    } else {
      await expect.element(submit).toBeDisabled();
      expect(submitted).toEqual([]);
      await screen
        .getByRole("button", { name: "Salvar resposta", exact: true })
        .click();
      await expect.poll(() => saves.length).toBe(3);
      expect(saves[2]?.key).not.toBe(saves[0]?.key);
      expect(JSON.parse(saves[2]?.body ?? "{}")).toEqual({
        attemptId,
        activityId,
        itemId,
        response: "A",
        idempotencyKey: saves[2]?.key,
      });
      await expect.element(submit).toBeEnabled();
    }
    await submit.click();
    await expect.poll(() => submitted).toEqual(["A"]);
  },
);

const r27Ticket = {
  ticketId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  type: "MELHORIA",
  description: "Relato sintético público R27",
  createdAt: "2026-10-04T03:00:00.000Z",
  status: "NOVO",
  version: 0,
};
const r27Appeal = {
  appealId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  attemptId,
  itemId,
  createdAt: "2026-10-04T03:00:00.000Z",
  dueAt: "2026-10-12T03:00:00.000Z",
  status: "ABERTA",
  version: 0,
};
const r27FeedbackChanges = [
  {},
  { sourceRefs: ["PRIVATE_SYNTHETIC"] },
  { createdAt: "invalid" },
  { ticketId: "invalid" },
  { status: "ABERTO" },
  { description: "<b>synthetic markup</b>" },
];
it.each(r27FeedbackChanges)(
  "R27 feedback history fails closed for public DTO change %j",
  async (change) => {
    const ticket = { ...r27Ticket, ...change };
    const valid = Object.keys(change).length === 0;
    expect(
      participantFeedbackTicketProjectionSchema.safeParse(ticket).success,
    ).toBe(valid);
    stub((path) =>
      path === "/api/v1/feedback" ? ok({ tickets: [ticket] }) : undefined,
    );
    const screen = await render(<HomePage />);
    if (valid) {
      await expect
        .element(screen.getByText(r27Ticket.description, { exact: true }))
        .toBeVisible();
      expect(document.body.textContent).not.toContain(
        "Não foi possível consultar seus relatos.",
      );
    } else {
      await expect
        .element(screen.getByText(/Não foi possível consultar seus relatos/))
        .toBeVisible();
      await expect
        .element(
          screen.getByRole("button", { name: "Tentar carregar relatos" }),
        )
        .toBeVisible();
      expect(
        document.querySelector('[data-testid="feedback-panel"]')?.textContent,
      ).not.toContain(ticket.description);
    }
    expect(document.body.textContent).not.toContain("PRIVATE_SYNTHETIC");
  },
);
it.each([{}, { sourceRefs: ["PRIVATE_SYNTHETIC"] }, { tickets: [r27Ticket] }])(
  "R27 feedback create receipt remains distinct and strict %j",
  async (change) => {
    const valid = Object.keys(change).length === 0;
    const receipt = "tickets" in change ? change : { ...r27Ticket, ...change };
    stub((path, init) =>
      path === "/api/v1/feedback" && init?.method === "POST"
        ? ok(receipt)
        : undefined,
    );
    const screen = await render(<HomePage />);
    const field = screen.getByLabelText("Descrição");
    await expect
      .element(screen.getByLabelText("Resposta — Item sintético"))
      .toBeVisible();
    await field.fill(r27Ticket.description);
    await screen.getByRole("button", { name: "Enviar feedback" }).click();
    if (valid) {
      await expect
        .element(
          screen.getByText("Feedback enviado. Acompanhe o status nesta tela."),
        )
        .toBeVisible();
      await expect.element(field).toHaveValue("");
    } else {
      await expect.element(screen.getByRole("alert")).toBeVisible();
      await expect.element(field).toHaveValue(r27Ticket.description);
      expect(document.body.textContent).not.toContain("Feedback enviado.");
    }
  },
);
it.each(
  [
    {},
    { reviewerId: "PRIVATE_SYNTHETIC" },
    { dueAt: "invalid" },
    { attemptId: "invalid" },
    { appeals: [r27Appeal] },
  ].flatMap((change) =>
    ["history", "create"].map((kind) => ({ kind, change })),
  ),
)("R27 appeal public DTO fails closed %j", async ({ kind, change }) => {
  const appeal = "appeals" in change ? change : { ...r27Appeal, ...change };
  const valid = Object.keys(change).length === 0;
  expect(participantAppealProjectionSchema.safeParse(appeal).success).toBe(
    valid,
  );
  stub((path, init) => {
    if (path === "/api/v1/learning-path")
      return ok(
        journey([
          {
            ...journey().activities[0]!,
            attemptStatus: "CORRIGIDA_AUTOMATICAMENTE",
          },
        ]),
      );
    if (path === `/api/v1/attempts/${attemptId}`)
      return ok({
        attemptId,
        activityId,
        status: "CORRIGIDA_AUTOMATICAMENTE",
        version: 2,
        answers: [
          { itemId, response: "A", savedAt: "2026-10-04T03:00:00.000Z" },
        ],
      });
    if (path === "/api/v1/appeals" && init?.method === "POST")
      return ok(appeal);
    if (path.startsWith("/api/v1/appeals?"))
      return ok({ appeals: kind === "create" ? [] : [appeal] });
    if (path.endsWith("/feedback"))
      return ok({
        attemptStatus: "CORRIGIDA_AUTOMATICAMENTE",
        attemptVersion: 2,
        resultVersion: 1,
        score: 80,
        outcome: "APROVADO",
        feedback: "Síntese própria sintética",
      });
    return undefined;
  });
  const screen = await render(<HomePage />);
  if (kind === "create") {
    const field = screen.getByLabelText("Justificativa");
    await expect.element(field).toBeVisible();
    await screen
      .getByLabelText("Questão", { exact: true })
      .selectOptions(itemId);
    await field.fill("Justificativa própria sintética R27");
    await screen.getByRole("button", { name: "Enviar contestação" }).click();
    if (valid) {
      await expect
        .element(
          screen.getByText(
            "Contestação registrada. Acompanhe o protocolo nesta tela.",
          ),
        )
        .toBeVisible();
      expect(document.getElementById("appeal-justification")).toBeNull();
    } else {
      await expect
        .element(screen.getByRole("button", { name: "Enviar contestação" }))
        .toBeEnabled();
      await expect.element(screen.getByRole("alert").last()).toBeVisible();
      await expect
        .element(screen.getByRole("alert").last())
        .toHaveTextContent(
          "Não foi possível concluir a operação. Tente novamente.",
        );
      await expect
        .element(field)
        .toHaveValue("Justificativa própria sintética R27");
      expect(document.body.textContent).not.toContain(
        "Contestação registrada.",
      );
    }
  }
  if (valid) {
    await expect.element(screen.getByText(/prazo 2026-10-12/)).toBeVisible();
  } else {
    if (kind === "history")
      await expect
        .element(
          screen.getByRole("button", { name: "Tentar carregar contestações" }),
        )
        .toBeVisible();
    expect(
      document.querySelector('[data-testid="appeals-panel"]')?.textContent,
    ).not.toContain("prazo 2026-10-12");
  }
  expect(document.body.textContent).not.toContain("PRIVATE_SYNTHETIC");
});

it("R17 feedback acknowledgment preserves a newer unsent description", async () => {
  const wires: string[] = [];
  let acknowledge = (_response: Response) => {};
  const delayed = new Promise<Response>((resolve) => {
    acknowledge = resolve;
  });
  stub((path, init) => {
    if (path === "/api/v1/feedback" && init?.method === "POST") {
      wires.push(String(init.body));
      return delayed;
    }
    return undefined;
  });
  const screen = await render(<HomePage />);
  await expect
    .element(screen.getByLabelText("Resposta — Item sintético"))
    .toHaveValue("Resposta salva");
  const field = screen.getByLabelText("Descrição");
  await field.fill("Original synthetic feedback");
  await screen.getByRole("button", { name: "Enviar feedback" }).click();
  expect(wires).toHaveLength(1);
  await field.fill("Newer unsent synthetic feedback");
  acknowledge(
    ok({
      ticketId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      type: "MELHORIA",
      description: "Original synthetic feedback",
      createdAt: "2026-10-03T12:00:00.000Z",
      status: "NOVO",
      version: 0,
    }),
  );
  await expect
    .element(
      screen.getByText("Feedback enviado. Acompanhe o status nesta tela."),
    )
    .toBeVisible();
  await expect.element(field).toHaveValue("Newer unsent synthetic feedback");
  expect(JSON.parse(wires[0] ?? "{}").description).toBe(
    "Original synthetic feedback",
  );
});

it.each(["", "<b>synthetic markup</b>"])(
  "R16 unsent invalid answer %j permits a corrected manual save without pinning a mutation",
  async (invalid) => {
    const wires: string[] = [];
    stub((path, init) => {
      if (path.endsWith("/answers") && init?.method === "POST") {
        wires.push(String(init.body));
        return ok({
          attemptId,
          activityId,
          status: "SALVA",
          version: 3,
          answers: [
            {
              itemId,
              response: "Corrected valid draft",
              savedAt: "2026-10-03T12:00:00.000Z",
            },
          ],
        });
      }
      return undefined;
    });
    const screen = await render(<HomePage />);
    const field = screen.getByLabelText("Resposta — Item sintético");
    const save = screen.getByRole("button", {
      name: "Salvar resposta",
      exact: true,
    });
    await expect.element(field).toHaveValue("Resposta salva");
    await field.fill(invalid);
    await save.click();
    expect(wires).toHaveLength(0);
    await expect.element(field).toHaveAttribute("aria-invalid", "true");
    await expect.element(field).toHaveFocus();
    await expect
      .element(
        screen.getByRole("button", {
          name: "Reenviar envio pendente de Item sintético",
        }),
      )
      .not.toBeInTheDocument();
    await field.fill("Corrected valid draft");
    await save.click();
    await expect
      .element(screen.getByText("Resposta salva.", { exact: true }))
      .toBeVisible();
    expect(wires).toHaveLength(1);
    expect(JSON.parse(wires[0] ?? "{}").response).toBe("Corrected valid draft");
    await expect.element(field).not.toHaveAttribute("aria-invalid", "true");
    await expect
      .element(screen.getByRole("button", { name: "Enviar tentativa" }))
      .toBeEnabled();
  },
);

it("R16 a locally invalid newer draft preserves exact replay of a genuinely dispatched original", async () => {
  const wires: string[] = [];
  stub((path, init) => {
    if (path.endsWith("/answers") && init?.method === "POST") {
      wires.push(String(init.body));
      if (wires.length === 1) throw new TypeError("synthetic lost response");
      return ok({
        attemptId,
        activityId,
        status: "SALVA",
        version: 3,
        answers: [
          {
            itemId,
            response: "Original dispatched draft",
            savedAt: "2026-10-03T12:00:00.000Z",
          },
        ],
      });
    }
    return undefined;
  });
  const screen = await render(<HomePage />);
  const field = screen.getByLabelText("Resposta — Item sintético");
  await expect.element(field).toHaveValue("Resposta salva");
  await field.fill("Original dispatched draft");
  await screen
    .getByRole("button", { name: "Salvar resposta", exact: true })
    .click();
  const replay = screen.getByRole("button", {
    name: "Reenviar envio pendente de Item sintético",
  });
  await expect.element(replay).toBeEnabled();
  await field.fill("<b>invalid newer draft</b>");
  await replay.click();
  await expect
    .element(screen.getByText("Resposta salva.", { exact: true }))
    .toBeVisible();
  expect(wires).toHaveLength(2);
  expect(wires[1]).toBe(wires[0]);
  await expect.element(field).toHaveValue("<b>invalid newer draft</b>");
  await expect
    .element(screen.getByRole("button", { name: "Enviar tentativa" }))
    .toBeDisabled();
});

it("R14 normalized save receipt resolves original replay and retains newer dirty draft", async () => {
  const wires: string[] = [];
  stub((path, init) => {
    if (path.endsWith("/answers") && init?.method === "POST") {
      wires.push(String(init.body));
      if (wires.length === 1) throw new TypeError("synthetic lost response");
      return ok({
        attemptId,
        activityId,
        status: "SALVA",
        version: 3,
        answers: [
          {
            itemId,
            response: "Canonical answer",
            savedAt: "2026-10-03T12:00:00.000Z",
          },
        ],
      });
    }
    return undefined;
  });
  const screen = await render(<HomePage />);
  const field = screen.getByLabelText("Resposta — Item sintético");
  await expect.element(field).toHaveValue("Resposta salva");
  await field.fill("  Canonical answer  ");
  await screen
    .getByRole("button", { name: "Salvar resposta", exact: true })
    .click();
  await expect
    .element(
      screen.getByRole("button", {
        name: "Reenviar envio pendente de Item sintético",
      }),
    )
    .toBeEnabled();
  await field.fill("Newer dirty draft");
  await screen
    .getByRole("button", { name: "Reenviar envio pendente de Item sintético" })
    .click();
  await expect
    .element(screen.getByText("Resposta salva.", { exact: true }))
    .toBeVisible();
  expect(wires).toHaveLength(2);
  expect(wires[1]).toBe(wires[0]);
  expect(JSON.parse(wires[0] ?? "{}").response).toBe("  Canonical answer  ");
  await expect.element(field).toHaveValue("Newer dirty draft");
  await expect
    .element(screen.getByRole("button", { name: "Enviar tentativa" }))
    .toBeDisabled();
  await field.fill("Canonical answer");
  await expect
    .element(screen.getByRole("button", { name: "Enviar tentativa" }))
    .toBeEnabled();
});

it("R14 rejects malformed private-bearing activity before hydration", async () => {
  stub((path) =>
    path === `/api/v1/activities/${activityId}`
      ? ok({
          activityId,
          slug: "synthetic",
          title: "Synthetic",
          items: [
            {
              itemId,
              ordinal: -1,
              kind: "INTERNAL_RUBRIC",
              title: "Hidden",
              text: "PRIVATE_SYNTHETIC",
              responseMode: "TEXT",
              answer_key: "PRIVATE_SYNTHETIC",
            },
          ],
        })
      : undefined,
  );
  const screen = await render(<HomePage />);
  await expect
    .element(
      screen.getByRole("button", { name: "Tentar novamente", exact: true }),
    )
    .toBeVisible();
  expect(document.body.textContent).not.toContain("PRIVATE_SYNTHETIC");
  expect(document.body.textContent).not.toContain("INTERNAL_RUBRIC");
});

it.each([
  ["submitted", "SUBMETIDA", 3],
  ["stale", "SALVA", 2],
  ["negative", "SALVA", -1],
  ["fractional", "SALVA", 2.5],
] as const)(
  "R13 save rejects %s receipt and preserves exact manual replay",
  async (_, status, version) => {
    const bodies: string[] = [];
    stub((path, init) => {
      if (
        path !== `/api/v1/attempts/${attemptId}/answers` ||
        init?.method !== "POST"
      )
        return undefined;
      bodies.push(String(init.body));
      return ok({
        attemptId,
        activityId,
        status: bodies.length === 1 ? status : "SALVA",
        version: bodies.length === 1 ? version : 3,
        answers: [
          {
            itemId,
            response: "Original R13 save",
            savedAt: "2026-10-03T12:00:00.000Z",
          },
        ],
      });
    });
    const screen = await render(<HomePage />);
    const field = screen.getByLabelText("Resposta — Item sintético");
    await expect.element(field).toHaveValue("Resposta salva");
    await field.fill("Original R13 save");
    await screen
      .getByRole("button", { name: "Salvar resposta", exact: true })
      .click();
    await vi.waitFor(() =>
      expect(
        document.getElementById("main-content")?.getAttribute("aria-busy"),
      ).toBe("false"),
    );
    expect(document.body.textContent).not.toContain("Resposta salva.");
    const retry = screen.getByRole("button", {
      name: "Reenviar envio pendente de Item sintético",
    });
    await expect.element(retry).toBeEnabled();
    await field.fill("Later R13 draft");
    await retry.click();
    await expect
      .element(screen.getByText("Resposta salva.", { exact: true }))
      .toBeVisible();
    expect(bodies).toHaveLength(2);
    expect(bodies[1]).toBe(bodies[0]);
    await expect.element(field).toHaveValue("Later R13 draft");
    await expect
      .element(
        screen.getByRole("button", { name: "Enviar tentativa", exact: true }),
      )
      .toBeDisabled();
  },
);

it.each(["submit", "answer"] as const)(
  "R13 ambiguous %s preserves original URI and draft through replacement-identity GET recovery",
  async (operation) => {
    const replacement = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    let currentIdentity = attemptId;
    const writes: { path: string; body: string }[] = [];
    const reads: string[] = [];
    stub((path, init) => {
      reads.push(path);
      if (path === "/api/v1/learning-path")
        return ok(
          journey([
            {
              activityId,
              slug: "synthetic-current",
              title: "Atividade atual",
              status: "EM_ANDAMENTO",
              attemptId: currentIdentity,
              attemptStatus: "SALVA",
              attemptVersion: 2,
              nextAction: "RETOMAR_ATIVIDADE",
            },
          ]),
        );
      if (
        path === `/api/v1/attempts/${attemptId}` &&
        currentIdentity !== attemptId
      )
        return denied();
      if (path === `/api/v1/attempts/${replacement}`)
        return ok({
          attemptId: replacement,
          activityId,
          status: "SALVA",
          version: 7,
          answers: [
            {
              itemId,
              response: "Replacement persisted draft",
              savedAt: "2026-10-03T12:00:00.000Z",
            },
          ],
        });
      if (init?.method !== "POST") return undefined;
      writes.push({ path, body: String(init.body) });
      if (writes.length === 1) return denied();
      return ok({
        attemptId,
        activityId,
        status: operation === "submit" ? "SUBMETIDA" : "SALVA",
        version: 3,
        answers: [
          {
            itemId,
            response:
              operation === "answer"
                ? "Original R13 identity answer"
                : "Resposta salva",
            savedAt: "2026-10-03T12:00:00.000Z",
          },
        ],
      });
    });
    const screen = await render(<HomePage />);
    const field = screen.getByLabelText("Resposta — Item sintético");
    await expect.element(field).toHaveValue("Resposta salva");
    if (operation === "answer")
      await field.fill("Original R13 identity answer");
    const button = screen.getByRole("button", {
      name: operation === "submit" ? "Enviar tentativa" : "Salvar resposta",
      exact: true,
    });
    await button.click();
    await expect.element(button).toBeEnabled();
    if (operation === "answer") await field.fill("Later R13 identity draft");
    currentIdentity = replacement;
    await screen
      .getByRole("button", { name: "Atualizar respostas", exact: true })
      .click();
    await expect
      .element(
        screen.getByRole("button", {
          name: "Tentar carregar respostas",
          exact: true,
        }),
      )
      .toBeEnabled();
    await screen
      .getByRole("button", { name: "Tentar carregar respostas", exact: true })
      .click();
    await expect
      .element(screen.getByText("Jornada atualizada.", { exact: true }))
      .toBeVisible();
    expect(reads).toContain(`/api/v1/attempts/${replacement}`);
    await expect
      .element(screen.getByText(/Há um envio pendente/))
      .toBeVisible();
    await expect
      .element(field)
      .toHaveValue(
        operation === "answer" ? "Later R13 identity draft" : "Resposta salva",
      );
    await expect.element(button).toBeEnabled();
    expect(writes).toHaveLength(1);
    await button.click();
    await expect
      .element(
        screen.getByText(
          operation === "submit" ? "Tentativa submetida." : "Resposta salva.",
          { exact: true },
        ),
      )
      .toBeVisible();
    expect(writes).toHaveLength(2);
    expect(writes[1]).toEqual(writes[0]);
    await expect
      .element(screen.getByText(/Há um envio pendente/))
      .not.toBeInTheDocument();
    if (operation === "answer") {
      await expect.element(field).toHaveValue("Later R13 identity draft");
      await expect
        .element(
          screen.getByRole("button", { name: "Enviar tentativa", exact: true }),
        )
        .toBeDisabled();
    }
    console.info(
      "R13_IDENTITY_REPLAY",
      JSON.stringify({
        operation,
        writes,
        replacementReadObserved: reads.includes(
          `/api/v1/attempts/${replacement}`,
        ),
      }),
    );
    await page.screenshot();
    if (operation === "submit") {
      await screen
        .getByRole("button", {
          name: "Abrir atividade: Atividade atual",
          exact: true,
        })
        .click();
      await expect
        .element(screen.getByText("Atividade aberta.", { exact: true }))
        .toBeVisible();
      await expect.element(field).toHaveValue("Replacement persisted draft");
      expect(writes).toHaveLength(2);
    }
  },
);

it("R13 save replay keeps original version anchor after newer same-identity GET", async () => {
  const bodies: string[] = [];
  let version = 2;
  stub((path, init) => {
    if (path === `/api/v1/attempts/${attemptId}`)
      return ok({
        attemptId,
        activityId,
        status: "SALVA",
        version,
        answers: [
          {
            itemId,
            response: "Resposta salva",
            savedAt: "2026-10-03T12:00:00.000Z",
          },
        ],
      });
    if (
      path !== `/api/v1/attempts/${attemptId}/answers` ||
      init?.method !== "POST"
    )
      return undefined;
    bodies.push(String(init.body));
    if (bodies.length === 1) return denied();
    return ok({
      attemptId,
      activityId,
      status: "SALVA",
      version: 3,
      answers: [
        {
          itemId,
          response: "Original R13 versioned answer",
          savedAt: "2026-10-03T12:00:00.000Z",
        },
      ],
    });
  });
  const screen = await render(<HomePage />);
  const field = screen.getByLabelText("Resposta — Item sintético");
  await expect.element(field).toHaveValue("Resposta salva");
  await field.fill("Original R13 versioned answer");
  await screen
    .getByRole("button", { name: "Salvar resposta", exact: true })
    .click();
  const retry = screen.getByRole("button", {
    name: "Reenviar envio pendente de Item sintético",
  });
  await expect.element(retry).toBeEnabled();
  await field.fill("Later R13 versioned draft");
  version = 19;
  await screen
    .getByRole("button", { name: "Atualizar respostas", exact: true })
    .click();
  await expect
    .element(screen.getByText("Atividade atualizada.", { exact: true }))
    .toBeVisible();
  await retry.click();
  await expect
    .element(screen.getByText("Resposta salva.", { exact: true }))
    .toBeVisible();
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toBe(bodies[0]);
  await expect.element(field).toHaveValue("Later R13 versioned draft");
});

it.each([
  ["start", "foreign-activity"],
  ["submit", "foreign-attempt"],
  ["submit", "foreign-activity"],
  ["start", "wrong-status"],
  ["submit", "wrong-status"],
  ["start", "negative-version"],
  ["submit", "stale-version"],
  ["start", "fractional-version"],
  ["submit", "fractional-version"],
] as const)(
  "R12 %s rejects %s receipt and manually replays original wire identity",
  async (operation, mismatch) => {
    const sent: { path: string; body: string }[] = [];
    const reads: string[] = [];
    const mutationPath =
      operation === "start"
        ? "/api/v1/attempts"
        : `/api/v1/attempts/${attemptId}/submit`;
    const valid = {
      attemptId,
      activityId,
      status: operation === "start" ? "EM_ANDAMENTO" : "SUBMETIDA",
      version: operation === "start" ? 1 : 3,
      answers:
        operation === "start"
          ? []
          : [
              {
                itemId,
                response: "Resposta salva",
                savedAt: "2026-10-03T12:00:00.000Z",
              },
            ],
    };
    const divergent = {
      ...valid,
      ...(mismatch === "foreign-activity"
        ? { activityId: "foreign-r12-activity" }
        : {}),
      ...(mismatch === "foreign-attempt"
        ? { attemptId: "foreign-r12-attempt" }
        : {}),
      ...(mismatch === "wrong-status" ? { status: "SALVA" } : {}),
      ...(mismatch === "negative-version" ? { version: -1 } : {}),
      ...(mismatch === "stale-version" ? { version: 2 } : {}),
      ...(mismatch === "fractional-version" ? { version: 1.5 } : {}),
    };
    stub((path, init) => {
      reads.push(path);
      if (operation === "start" && path === "/api/v1/learning-path")
        return ok({
          ...journey(),
          activities: [
            {
              activityId,
              slug: "synthetic-current",
              title: "Atividade atual",
              status: "DISPONIVEL",
              nextAction: "INICIAR_ATIVIDADE",
            },
          ],
        });
      if (path !== mutationPath || init?.method !== "POST") return undefined;
      sent.push({ path, body: String(init.body) });
      return ok(sent.length === 1 ? divergent : valid);
    });
    const screen = await render(<HomePage />);
    const trigger = screen.getByRole("button", {
      name: operation === "start" ? "Iniciar tentativa" : "Enviar tentativa",
      exact: true,
    });
    await expect.element(trigger).toBeEnabled();
    await trigger.click();
    await expect.element(trigger).toBeEnabled();
    await expect
      .element(
        screen.getByText(
          operation === "start"
            ? "Tentativa iniciada."
            : "Tentativa submetida.",
          { exact: true },
        ),
      )
      .not.toBeInTheDocument();
    expect(sent).toHaveLength(1);
    expect(reads.some((path) => path.includes("foreign-r12"))).toBe(false);
    if (operation === "start")
      await expect
        .element(screen.getByLabelText("Resposta — Item sintético"))
        .not.toBeInTheDocument();
    else
      await expect
        .element(screen.getByLabelText("Resposta — Item sintético"))
        .toHaveValue("Resposta salva");
    if (mismatch.startsWith("foreign")) {
      console.info(
        "R12_REJECTED_RECEIPT",
        JSON.stringify({
          operation,
          wire: sent[0],
          divergent,
          retryEnabled: [...document.querySelectorAll("button")].some(
            (button) =>
              button.textContent?.trim() ===
                (operation === "start"
                  ? "Iniciar tentativa"
                  : "Enviar tentativa") && !button.disabled,
          ),
        }),
      );
      await page.screenshot();
    }
    await trigger.click();
    await expect
      .element(
        screen.getByText(
          operation === "start"
            ? "Tentativa iniciada."
            : "Tentativa submetida.",
          { exact: true },
        ),
      )
      .toBeVisible();
    expect(sent).toHaveLength(2);
    expect(sent[1]).toEqual(sent[0]);
    const original: unknown = JSON.parse(sent[0]?.body ?? "null");
    if (
      original === null ||
      typeof original !== "object" ||
      !("idempotencyKey" in original)
    )
      throw new Error("Actual synthetic wire identity required");
    expect(original.idempotencyKey).toEqual(expect.any(String));
    expect(reads.some((path) => path.includes("foreign-r12"))).toBe(false);
  },
);

it("R12 pending submit refresh cannot move the original receipt anchor or wire replay", async () => {
  const bodies: string[] = [];
  let getVersion = 2;
  stub((path, init) => {
    if (path === `/api/v1/attempts/${attemptId}`)
      return ok({
        attemptId,
        activityId,
        status: "SALVA",
        version: getVersion,
        answers: [
          {
            itemId,
            response: "Resposta salva",
            savedAt: "2026-10-03T12:00:00.000Z",
          },
        ],
      });
    if (
      path !== `/api/v1/attempts/${attemptId}/submit` ||
      init?.method !== "POST"
    )
      return undefined;
    bodies.push(String(init.body));
    if (bodies.length === 1) return denied("internal_error", 503);
    return ok({
      attemptId,
      activityId,
      status: "SUBMETIDA",
      version: 3,
      answers: [
        {
          itemId,
          response: "Resposta salva",
          savedAt: "2026-10-03T12:00:00.000Z",
        },
      ],
    });
  });
  const screen = await render(<HomePage />);
  const submit = screen.getByRole("button", {
    name: "Enviar tentativa",
    exact: true,
  });
  await expect.element(submit).toBeEnabled();
  await submit.click();
  await expect.element(submit).toBeEnabled();
  expect(bodies).toHaveLength(1);
  getVersion = 8;
  await screen
    .getByRole("button", { name: "Atualizar respostas", exact: true })
    .click();
  await expect.element(screen.getByText("Atividade atualizada.")).toBeVisible();
  await expect.element(submit).toBeEnabled();
  await submit.click();
  await expect
    .element(screen.getByText("Tentativa submetida.", { exact: true }))
    .toBeVisible();
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toBe(bodies[0]);
});

it.each([
  ["start", "CRIADA", 0],
  ["start", "EM_ANDAMENTO", 1],
  ["start", "EM_ANDAMENTO", 0],
  ["submit", "SUBMETIDA", 3],
  ["submit", "AGUARDA_CORRECAO_HUMANA", 4],
  ["submit", "CORRIGIDA_AUTOMATICAMENTE", 4],
  ["submit", "CORRIGIDA_HUMANAMENTE", 5],
] as const)(
  "R12 matching %s %s receipt positive control",
  async (operation, status, version) => {
    let writes = 0;
    stub((path, init) => {
      if (operation === "start" && path === "/api/v1/learning-path")
        return ok({
          ...journey(),
          activities: [
            {
              activityId,
              slug: "synthetic-current",
              title: "Atividade atual",
              status: "DISPONIVEL",
              nextAction: "INICIAR_ATIVIDADE",
            },
          ],
        });
      if (
        path ===
          (operation === "start"
            ? "/api/v1/attempts"
            : `/api/v1/attempts/${attemptId}/submit`) &&
        init?.method === "POST"
      ) {
        writes++;
        return ok({
          attemptId,
          activityId,
          status,
          version,
          answers:
            operation === "start"
              ? []
              : [
                  {
                    itemId,
                    response: "Resposta salva",
                    savedAt: "2026-10-03T12:00:00.000Z",
                  },
                ],
        });
      }
      return undefined;
    });
    const screen = await render(<HomePage />);
    const trigger = screen.getByRole("button", {
      name: operation === "start" ? "Iniciar tentativa" : "Enviar tentativa",
      exact: true,
    });
    await expect.element(trigger).toBeEnabled();
    await trigger.click();
    await expect
      .element(
        screen.getByText(
          operation === "start"
            ? "Tentativa iniciada."
            : "Tentativa submetida.",
          { exact: true },
        ),
      )
      .toBeVisible();
    expect(writes).toBe(1);
  },
);

it("R11 T29 keeps original ambiguous bytes through edits and repeated timeouts", async () => {
  const sent: string[] = [];
  stub((path, init) => {
    if (!path.endsWith("/answers")) return undefined;
    sent.push(String(init?.body));
    return new Promise<Response>(() => {});
  });
  const screen = await render(<HomePage />);
  const field = screen.getByLabelText("Resposta — Item sintético");
  await expect.element(field).toHaveValue("Resposta salva");
  await field.fill("Original pending bytes");
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  await screen.getByRole("button", { name: "Salvar resposta" }).click();
  await vi.advanceTimersByTimeAsync(15_000);
  await expect.element(field).toBeEnabled();
  await field.fill("Changed local bytes");
  await screen.getByRole("button", { name: "Salvar resposta" }).click();
  expect(sent).toHaveLength(2);
  await vi.advanceTimersByTimeAsync(15_000);
  await expect.element(field).toBeEnabled();
  await field.fill("Original pending bytes");
  await screen.getByRole("button", { name: "Salvar resposta" }).click();
  expect(sent).toHaveLength(3);
  expect(sent[2]).toBe(sent[0]);
  await vi.advanceTimersByTimeAsync(15_000);
  await vi.advanceTimersByTimeAsync(90_000);
  expect(sent).toHaveLength(3);
});

it("R11 T29 manual original retry confirms original bytes while preserving a newer local draft", async () => {
  const sent: string[] = [];
  stub((path, init) => {
    if (!path.endsWith("/answers")) return undefined;
    sent.push(String(init?.body));
    if (sent.length === 1) return new Promise<Response>(() => {});
    return ok({
      attemptId,
      activityId,
      status: "SALVA",
      version: sent.length + 1,
      answers: [
        {
          itemId,
          response:
            sent.length === 2
              ? "Original ambiguous answer"
              : "Newer unsaved local draft",
          savedAt: "2026-10-03T12:00:00.000Z",
        },
      ],
    });
  });
  const screen = await render(<HomePage />);
  const field = screen.getByLabelText("Resposta — Item sintético");
  await expect.element(field).toHaveValue("Resposta salva");
  await field.fill("Original ambiguous answer");
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  await screen.getByRole("button", { name: "Salvar resposta" }).click();
  await vi.advanceTimersByTimeAsync(15_000);
  await expect.element(field).toBeEnabled();
  vi.useRealTimers();
  await field.fill("Newer unsaved local draft");
  const replay = screen.getByRole("button", {
    name: "Reenviar envio pendente de Item sintético",
  });
  await expect.element(replay).toBeVisible();
  await replay.click();
  await expect.element(screen.getByText("Resposta salva.")).toBeVisible();
  expect(sent).toHaveLength(2);
  expect(sent[1]).toBe(sent[0]);
  await expect.element(field).toHaveValue("Newer unsaved local draft");
  await expect
    .element(screen.getByRole("button", { name: "Enviar tentativa" }))
    .toBeDisabled();
  await page.screenshot();
  await screen.getByRole("button", { name: "Salvar resposta" }).click();
  await expect
    .element(screen.getByRole("button", { name: "Enviar tentativa" }))
    .toBeEnabled();
  expect(sent).toHaveLength(3);
  expect(sent[2]).not.toBe(sent[0]);
  const original: unknown = JSON.parse(sent[0] ?? "null"),
    latest: unknown = JSON.parse(sent[2] ?? "null");
  if (
    original === null ||
    latest === null ||
    typeof original !== "object" ||
    typeof latest !== "object" ||
    !("idempotencyKey" in original) ||
    !("idempotencyKey" in latest) ||
    !("response" in latest)
  )
    throw new Error("Synthetic wire bodies required");
  expect(latest.idempotencyKey).not.toBe(original.idempotencyKey);
  expect(latest.response).toBe("Newer unsaved local draft");
});

it("R11 T30 denies mismatched activity identity before rendering or hydrating, then retries the same target", async () => {
  const paths: string[] = [];
  let mismatched = true;
  stub((path) => {
    paths.push(path);
    if (path !== `/api/v1/activities/${activityId}` || !mismatched)
      return undefined;
    return ok({
      activityId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      slug: "M03-foreign",
      title: "FOREIGN mismatched activity",
      items: [
        {
          itemId: "foreign-item",
          ordinal: 1,
          kind: "QUESTAO",
          title: "Foreign item",
          text: "Foreign prompt",
          responseMode: "TEXT",
        },
      ],
    });
  });
  const screen = await render(<HomePage />);
  await expect
    .element(screen.getByRole("button", { name: "Tentar novamente" }))
    .toBeVisible();
  expect(document.body.textContent).not.toContain(
    "FOREIGN mismatched activity",
  );
  expect(paths).not.toContain(`/api/v1/attempts/${attemptId}`);
  expect(paths).not.toContain("/api/v1/curriculum/modules/M03/runtime");
  await page.screenshot();
  mismatched = false;
  await screen.getByRole("button", { name: "Tentar novamente" }).click();
  await expect
    .element(screen.getByLabelText("Resposta — Item sintético"))
    .toHaveValue("Resposta salva");
  expect(
    paths.filter((path) => path === `/api/v1/activities/${activityId}`),
  ).toHaveLength(2);
  expect(
    paths.some((path) => path.includes("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")),
  ).toBe(false);
});

it.each([
  "network",
  "5xx-validation-code",
  "malformed-422",
  "unknown-422",
  "5xx-non-json",
  "foreign-receipt",
  "wrong-answer-receipt",
])(
  "R11 T29 unproven %s outcome cannot discard original bytes after edits",
  async (kind) => {
    const sent: string[] = [];
    const receipts: unknown[] = [];
    stub((path, init) => {
      if (!path.endsWith("/answers")) return undefined;
      sent.push(String(init?.body));
      if (sent.length === 1) {
        if (kind === "network") throw new TypeError("Synthetic lost transport");
        if (kind === "5xx-validation-code")
          return denied("validation_error", 500);
        if (kind === "unknown-422")
          return denied("synthetic_private_marker", 422);
        if (kind === "malformed-422")
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: "validation_error" },
            }),
            { status: 422 },
          );
        if (kind === "5xx-non-json")
          return new Response("Synthetic non-JSON failure", { status: 503 });
        return ok({
          attemptId: kind === "foreign-receipt" ? "foreign-attempt" : attemptId,
          activityId,
          status: "SALVA",
          version: 3,
          answers: [
            {
              itemId,
              response:
                kind === "wrong-answer-receipt"
                  ? "Unrelated server answer"
                  : "Original unknown answer",
              savedAt: "2026-10-03T12:00:00.000Z",
            },
          ],
        });
      }
      if (kind === "unknown-422" && sent.length === 2) {
        const receipt = {
          attemptId,
          activityId,
          status: "SALVA",
          version: 3,
          answers: [
            {
              itemId,
              response: "Fixed answer",
              savedAt: "2026-10-03T12:00:00.000Z",
            },
          ],
        };
        receipts.push(receipt);
        return ok(receipt);
      }
      return ok({
        attemptId,
        activityId,
        status: "SALVA",
        version: 3,
        answers: [
          {
            itemId,
            response: "Original unknown answer",
            savedAt: "2026-10-03T12:00:00.000Z",
          },
        ],
      });
    });
    const screen = await render(<HomePage />);
    const field = screen.getByLabelText("Resposta — Item sintético");
    await expect.element(field).toHaveValue("Resposta salva");
    await field.fill("Original unknown answer");
    await screen.getByRole("button", { name: "Salvar resposta" }).click();
    const retry = screen.getByRole("button", {
      name: "Reenviar envio pendente de Item sintético",
    });
    await expect.element(retry).toBeVisible();
    expect(document.body.textContent).not.toContain("synthetic_private_marker");
    expect(sent).toHaveLength(1);
    const newerDraft =
      kind === "unknown-422"
        ? "Fixed answer"
        : "Newer draft after unknown outcome";
    await field.fill(newerDraft);
    await retry.click();
    if (kind === "unknown-422") {
      await expect.element(retry).toBeEnabled();
      expect(sent).toHaveLength(2);
      expect(sent[1]).toBe(sent[0]);
      await expect
        .element(screen.getByText("Resposta salva."))
        .not.toBeInTheDocument();
      await expect.element(field).toHaveValue(newerDraft);
      await expect
        .element(screen.getByRole("button", { name: "Enviar tentativa" }))
        .toBeDisabled();
      const localField = document.getElementById(`answer-${itemId}`);
      const submission = [...document.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === "Enviar tentativa",
      );
      if (
        !(localField instanceof HTMLTextAreaElement) ||
        submission === undefined
      )
        throw new Error("Actual synthetic answer surface required");
      console.info(
        "R11_EXPECTED_CHANGED_ORACLE",
        JSON.stringify({
          firstStatus: 422,
          firstErrorCode: "synthetic_private_marker",
          actualWireBodies: sent,
          actualSyntheticReceipts: receipts,
          actualLocalDraft: localField.value,
          actualSubmissionDisabled: submission.disabled,
        }),
      );
      await retry.click();
    }
    await expect.element(screen.getByText("Resposta salva.")).toBeVisible();
    expect(sent).toHaveLength(kind === "unknown-422" ? 3 : 2);
    expect(sent.slice(1).every((body) => body === sent[0])).toBe(true);
    await expect.element(field).toHaveValue(newerDraft);
    await expect
      .element(screen.getByRole("button", { name: "Enviar tentativa" }))
      .toBeDisabled();
  },
);

it("R11 T29 explicit valid 422 rejection releases the key for a corrected answer", async () => {
  const sent: string[] = [];
  stub((path, init) => {
    if (!path.endsWith("/answers")) return undefined;
    sent.push(String(init?.body));
    if (sent.length === 1) return denied("validation_error", 422);
    return ok({
      attemptId,
      activityId,
      status: "SALVA",
      version: 3,
      answers: [
        {
          itemId,
          response: "Corrected after definitive rejection",
          savedAt: "2026-10-03T12:00:00.000Z",
        },
      ],
    });
  });
  const screen = await render(<HomePage />);
  const field = screen.getByLabelText("Resposta — Item sintético");
  await expect.element(field).toHaveValue("Resposta salva");
  await field.fill("Rejected answer");
  await screen.getByRole("button", { name: "Salvar resposta" }).click();
  await expect.element(field).toHaveAttribute("aria-invalid", "true");
  await expect
    .element(
      screen.getByRole("button", {
        name: "Reenviar envio pendente de Item sintético",
      }),
    )
    .not.toBeInTheDocument();
  await field.fill("Corrected after definitive rejection");
  await screen.getByRole("button", { name: "Salvar resposta" }).click();
  await expect.element(screen.getByText("Resposta salva.")).toBeVisible();
  const old: unknown = JSON.parse(sent[0] ?? "null"),
    next: unknown = JSON.parse(sent[1] ?? "null");
  if (
    old === null ||
    next === null ||
    typeof old !== "object" ||
    typeof next !== "object" ||
    !("idempotencyKey" in old) ||
    !("idempotencyKey" in next)
  )
    throw new Error("Synthetic wire bodies required");
  expect(next.idempotencyKey).not.toBe(old.idempotencyKey);
  await expect
    .element(screen.getByRole("button", { name: "Enviar tentativa" }))
    .toBeEnabled();
});

it("T31 associates choice errors, restores focus, supports keyboard and passes scoped axe", async () => {
  stub((path) => {
    if (path.endsWith("/answers")) return denied("validation_error", 422);
    if (path === `/api/v1/attempts/${attemptId}`)
      return ok({
        attemptId,
        activityId,
        status: "SALVA",
        version: 2,
        answers: [
          { itemId, response: "a", savedAt: "2026-10-03T12:00:00.000Z" },
        ],
      });
    if (path === `/api/v1/activities/${activityId}`)
      return ok({
        activityId,
        slug: "synthetic-current",
        title: "Atividade atual",
        items: [
          {
            itemId,
            ordinal: 1,
            kind: "QUESTAO",
            title: "Item sintético",
            text: "Escolha um item sintético.",
            responseMode: "CHOICE",
            selectionMode: "SINGLE",
            choices: [
              { id: "a", label: "A", text: "Opção A" },
              { id: "b", label: "B", text: "Opção B" },
            ],
          },
        ],
      });
    return undefined;
  });
  const screen = await render(<HomePage />);
  const b = screen.getByRole("radio", { name: "B) Opção B" });
  await expect
    .element(screen.getByRole("radio", { name: "A) Opção A" }))
    .toBeChecked();
  await b.click();
  await screen.getByRole("button", { name: "Salvar resposta" }).click();
  const group = screen.getByRole("group", { name: "Selecione sua resposta" });
  await expect
    .element(group)
    .toHaveAttribute("aria-describedby", `answer-error-${itemId}`);
  await expect.element(group).toHaveAttribute("aria-invalid", "true");
  await vi.waitFor(() =>
    expect(document.activeElement?.id).toBe(`answer-${itemId}`),
  );
  await userEvent.keyboard("{Tab}");
  expect(document.activeElement?.getAttribute("type")).toBe("radio");
  const script = document.createElement("script");
  script.textContent = await commands.readFile(
    "node_modules/.pnpm/axe-core@4.10.3/node_modules/axe-core/axe.min.js",
    "utf8",
  );
  document.head.append(script);
  try {
    const main = document.getElementById("main-content");
    if (main === null) throw new Error("actual participant main required");
    const engine: unknown = Reflect.get(window, "axe");
    if (
      typeof engine !== "object" ||
      engine === null ||
      !("run" in engine) ||
      typeof engine.run !== "function"
    )
      throw new Error("actual axe engine required");
    const result: unknown = await engine.run(main);
    if (
      typeof result !== "object" ||
      result === null ||
      !("violations" in result) ||
      !Array.isArray(result.violations)
    )
      throw new Error("actual axe result required");
    expect(result.violations).toEqual([]);
  } finally {
    script.remove();
  }
});

it("T30 offers bounded recovery when an authorized target cannot load", async () => {
  let reads = 0;
  stub((path) =>
    path === `/api/v1/activities/${activityId}` && ++reads === 1
      ? denied("not_found", 404)
      : undefined,
  );
  const screen = await render(<HomePage />);
  await expect
    .element(screen.getByRole("button", { name: "Tentar novamente" }))
    .toBeVisible();
  expect(document.body.textContent).not.toContain(
    "convite não está disponível",
  );
  await screen.getByRole("button", { name: "Tentar novamente" }).click();
  await expect
    .element(screen.getByLabelText("Resposta — Item sintético"))
    .toHaveValue("Resposta salva");
  expect(reads).toBe(2);
});

it("T29 keeps journey recovery independent of successful feedback", async () => {
  let journeyReads = 0;
  let feedbackReads = 0;
  stub((path) => {
    if (path === "/api/v1/feedback") {
      feedbackReads++;
      return ok({ tickets: [] });
    }
    if (path === "/api/v1/learning-path")
      return ++journeyReads === 1 ? denied() : ok(journey());
    return undefined;
  });
  const screen = await render(<HomePage />);
  await expect
    .element(screen.getByRole("heading", { name: "Jornada indisponível" }))
    .toBeVisible();
  await expect.element(screen.getByLabelText("Descrição")).toBeEnabled();
  await screen.getByRole("button", { name: "Tentar novamente" }).click();
  await expect
    .element(screen.getByLabelText("Resposta — Item sintético"))
    .toHaveValue("Resposta salva");
  expect(feedbackReads).toBe(1);
  expect(journeyReads).toBe(2);
});

it.each(["transport", "body"])(
  "T29 exits never-resolving feedback %s and preserves answers on retry",
  async (phase) => {
    let reads = 0;
    let signal: AbortSignal | null | undefined;
    stub((path, init) => {
      if (path !== "/api/v1/feedback") return undefined;
      if (++reads > 1) return ok({ tickets: [] });
      signal = init?.signal;
      if (phase === "transport") return new Promise<Response>(() => {});
      const response = ok({ tickets: [] });
      vi.spyOn(response, "json").mockImplementation(
        () => new Promise(() => {}),
      );
      return response;
    });
    const screen = await render(<HomePage />);
    const field = screen.getByLabelText("Resposta — Item sintético");
    await expect.element(field).toHaveValue("Resposta salva");
    await field.fill("Edição preservada durante deadline");
    await expect
      .element(
        screen.getByText(
          "A operação demorou mais que o esperado. Tente novamente sem alterar os dados.",
        ),
      )
      .toBeVisible();
    expect(signal?.aborted).toBe(true);
    await screen
      .getByRole("button", { name: "Tentar carregar relatos" })
      .click();
    await expect
      .element(screen.getByText("Você ainda não enviou um relato."))
      .toBeVisible();
    await expect
      .element(field)
      .toHaveValue("Edição preservada durante deadline");
    expect(reads).toBe(2);
  },
  25_000,
);

it("T29 ambiguous mutation timeout retains exact key and bytes until explicit retry", async () => {
  const requests: RequestInit[] = [];
  stub((path, init) => {
    if (!path.endsWith("/answers")) return undefined;
    if (init !== undefined) requests.push(init);
    if (requests.length === 1) return new Promise<Response>(() => {});
    return ok({
      attemptId,
      activityId,
      status: "SALVA",
      version: 3,
      answers: [
        {
          itemId,
          response: "Resposta cujo envio é ambíguo",
          savedAt: "2026-10-03T12:00:00.000Z",
        },
      ],
    });
  });
  const screen = await render(<HomePage />);
  const field = screen.getByLabelText("Resposta — Item sintético");
  await expect.element(field).toHaveValue("Resposta salva");
  await field.fill("Resposta cujo envio é ambíguo");
  await screen.getByRole("button", { name: "Salvar resposta" }).click();
  await expect
    .element(
      screen.getByText(
        "A operação demorou mais que o esperado. Tente novamente sem alterar os dados.",
      ),
    )
    .toBeVisible();
  await expect.element(field).toHaveValue("Resposta cujo envio é ambíguo");
  expect(requests).toHaveLength(1);
  await expect
    .element(screen.getByRole("button", { name: "Enviar tentativa" }))
    .toBeDisabled();
  await screen.getByRole("button", { name: "Salvar resposta" }).click();
  await expect.element(screen.getByText("Resposta salva.")).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[1]?.body).toBe(requests[0]?.body);
}, 25_000);

it("T29 aborts reads on unmount without sending dependent reads", async () => {
  let signal: AbortSignal | null | undefined;
  let release: ((response: Response) => void) | undefined;
  const paths: string[] = [];
  stub((path, init) => {
    paths.push(path);
    if (path === "/api/v1/learning-path") {
      signal = init?.signal;
      return new Promise<Response>((resolve) => {
        release = resolve;
      });
    }
    return undefined;
  });
  const screen = await render(<HomePage />);
  await vi.waitFor(() => expect(signal).toBeInstanceOf(AbortSignal));
  await screen.unmount();
  expect(signal?.aborted).toBe(true);
  release?.(ok(journey()));
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  expect(paths).not.toContain(`/api/v1/activities/${activityId}`);
});

it("T30 rejects an unbound target without fetching or inventing a CTA", async () => {
  const paths: string[] = [];
  stub((path) => {
    paths.push(path);
    if (path === "/api/v1/learning-path")
      return ok({ ...journey(), activities: [] });
    return undefined;
  });
  const screen = await render(<HomePage />);
  await expect
    .element(screen.getByRole("heading", { name: "Jornada indisponível" }))
    .toBeVisible();
  expect(document.querySelector('[aria-label^="Abrir atividade:"]')).toBeNull();
  expect(paths).not.toContain(`/api/v1/activities/${activityId}`);
});

it("T31 associates feedback validation with description and preserves its text", async () => {
  let posts = 0;
  stub((path, init) =>
    path === "/api/v1/feedback" && init?.method === "POST"
      ? ++posts === 1
        ? denied("validation_error", 422)
        : ok({
            ticketId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
            type: "MELHORIA",
            description: "Relato corrigido",
            createdAt: "2026-10-03T12:00:00.000Z",
            status: "NOVO",
            version: 0,
          })
      : undefined,
  );
  const screen = await render(<HomePage />);
  const field = screen.getByLabelText("Descrição");
  await expect
    .element(screen.getByLabelText("Resposta — Item sintético"))
    .toHaveValue("Resposta salva");
  await field.fill("Relato sintético que será recusado");
  await screen.getByRole("button", { name: "Enviar feedback" }).click();
  await expect.element(field).toHaveAttribute("aria-invalid", "true");
  await expect
    .element(field)
    .toHaveAttribute("aria-describedby", "feedback-error");
  await expect.element(field).toHaveValue("Relato sintético que será recusado");
  await expect
    .poll(() => document.activeElement?.id)
    .toBe("feedback-description");
  expect(document.body.textContent).not.toContain("Revise o token");
  await field.fill("Relato corrigido");
  await screen.getByRole("button", { name: "Enviar feedback" }).click();
  await expect
    .element(
      screen.getByText("Feedback enviado. Acompanhe o status nesta tela."),
    )
    .toBeVisible();
  await expect.element(field).not.toHaveAttribute("aria-invalid", "true");
  expect(document.getElementById("feedback-error")).toBeNull();
});

it("T29 keeps feedback retry after journey succeeds and preserves dirty answers", async () => {
  let reads = 0;
  stub((path) =>
    path === "/api/v1/feedback"
      ? ++reads === 1
        ? denied()
        : ok({ tickets: [] })
      : undefined,
  );
  const screen = await render(<HomePage />);
  const field = screen.getByLabelText("Resposta — Item sintético");
  await expect.element(field).toHaveValue("Resposta salva");
  await field.fill("Edição ainda não salva");
  await screen.getByRole("button", { name: "Tentar carregar relatos" }).click();
  await expect
    .element(screen.getByText("Você ainda não enviou um relato."))
    .toBeVisible();
  await expect.element(field).toHaveValue("Edição ainda não salva");
  expect(reads).toBe(2);
});

it("T30 exposes the server target after the third activity", async () => {
  const targetId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  window.history.replaceState({}, document.title, `/?activityId=${activityId}`);
  stub((path) => {
    if (path === "/api/v1/learning-path")
      return ok({
        ...journey(),
        activities: [
          ...journey().activities,
          ...["second", "third"].map((title, index) => ({
            activityId:
              index === 0
                ? "22222222-2222-4222-8222-222222222222"
                : "33333333-3333-4333-8333-333333333333",
            slug: title,
            title,
            status: "CONCLUIDO",
            nextAction: "CONSULTAR_PROXIMO_PASSO",
          })),
          {
            activityId: targetId,
            slug: "fourth",
            title: "Alvo na quarta posição",
            status: "DISPONIVEL",
            nextAction: "INICIAR_ATIVIDADE",
          },
        ],
        nextAction: "INICIAR_ATIVIDADE",
        nextActionTarget: { kind: "ACTIVITY", activityId: targetId },
      });
    if (path === `/api/v1/activities/${targetId}`)
      return ok({
        activityId: targetId,
        slug: "fourth",
        title: "Alvo na quarta posição",
        items: [],
      });
    return undefined;
  });
  const screen = await render(<HomePage />);
  await expect
    .element(screen.getByLabelText("Resposta — Item sintético"))
    .toHaveValue("Resposta salva");
  await screen
    .getByRole("button", { name: "Abrir atividade: Alvo na quarta posição" })
    .click();
  await expect
    .element(
      screen.getByRole("heading", {
        name: "Alvo na quarta posição",
        exact: true,
      }),
    )
    .toBeVisible();
  expect(new URL(window.location.href).searchParams.get("activityId")).toBe(
    targetId,
  );
});

it("T31 associates answer validation with its field without asking for a token", async () => {
  stub((path) =>
    path.endsWith("/answers") ? denied("validation_error", 422) : undefined,
  );
  const screen = await render(<HomePage />);
  const field = screen.getByLabelText("Resposta — Item sintético");
  await expect.element(field).toHaveValue("Resposta salva");
  await field.fill("Resposta local inválida");
  await screen.getByRole("button", { name: "Salvar resposta" }).click();
  await expect.element(field).toHaveAttribute("aria-invalid", "true");
  await expect
    .element(field)
    .toHaveAttribute("aria-describedby", `answer-error-${itemId}`);
  await expect
    .element(
      screen.getByText(
        "Revise a resposta deste item e tente salvar novamente.",
      ),
    )
    .toBeVisible();
  await expect.poll(() => document.activeElement?.id).toBe(`answer-${itemId}`);
  expect(document.body.textContent).not.toContain("Revise o token");
  expect(document.body.textContent).not.toContain("private synthetic detail");
});
