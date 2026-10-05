import { createElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import HomePage from "../app/page";
import {
  isActivity,
  isAttempt,
  isCorrection,
  isJourney,
  isParticipantAppeal,
} from "../app/participant-contracts";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children?: ReactNode }) =>
    createElement("a", { href }, children),
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState({}, document.title, "/");
});
const activityId = "12345678-1234-4234-8234-123456789012";
const attemptId = "23456789-2345-4345-8345-234567890123";
const itemId = "34567890-3456-4456-8456-345678901234";
const foreignId = "45678901-4567-4567-8567-456789012345";
const at = "2026-10-03T12:00:00.000Z";
function activity() {
  return {
    activityId,
    slug: "synthetic-coherence",
    title: "Atividade coerente",
    items: [
      {
        itemId,
        ordinal: 1,
        kind: "QUESTAO",
        title: "Questão coerente",
        text: "Texto sintético.",
        responseMode: "TEXT",
      },
    ],
  };
}
function attempt(
  version = 2,
  response = "Persistida sintética",
  status = "SALVA",
) {
  return {
    attemptId,
    activityId,
    version,
    status,
    answers: [{ itemId, response, savedAt: at }],
  };
}
function journey(status = "SALVA", version = 2) {
  return {
    assignments: [],
    activities: [
      {
        activityId,
        slug: "synthetic-coherence",
        title: "Atividade coerente",
        status: "EM_ANDAMENTO",
        attemptId,
        attemptStatus: status,
        attemptVersion: version,
        nextAction: "RETOMAR_ATIVIDADE",
      },
    ],
    results: [],
    runtimes: [],
    nextAction: "RETOMAR_ATIVIDADE",
    nextActionTarget: { kind: "ACTIVITY", activityId },
  };
}
function correction(status = "CORRIGIDA_AUTOMATICAMENTE", version = 7) {
  return {
    attemptStatus: status,
    attemptVersion: version,
    resultVersion: 1,
    score: 100,
    outcome: "APROVADO",
    feedback: "Resultado sintético vinculado",
  };
}
function appeal(targetAttempt = attemptId, targetItem = itemId) {
  return {
    appealId: foreignId,
    attemptId: targetAttempt,
    itemId: targetItem,
    createdAt: at,
    dueAt: at,
    status: "ABERTA",
    version: 0,
  };
}
function ok(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), { status: 200 });
}
function stub(
  override: (
    path: string,
    init?: RequestInit,
  ) => Response | Promise<Response> | undefined,
  status = "SALVA",
  version = 2,
) {
  expect(isActivity(activity())).toBe(true);
  expect(isAttempt(attempt(version, undefined, status))).toBe(true);
  expect(isJourney(journey(status, version))).toBe(true);
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input, init) => {
      const path = String(input);
      calls.push(path);
      const response = override(path, init);
      if (response !== undefined) return response;
      if (path === "/api/v1/session/current") return ok({ status: "active" });
      if (path === "/api/v1/feedback") return ok({ tickets: [] });
      if (path === "/api/v1/learning-path") return ok(journey(status, version));
      if (path === `/api/v1/activities/${activityId}`) return ok(activity());
      if (path === `/api/v1/attempts/${attemptId}`)
        return ok(attempt(version, undefined, status));
      if (path === `/api/v1/attempts/${attemptId}/feedback`)
        return ok(correction(status, version));
      if (path.startsWith("/api/v1/appeals?")) return ok({ appeals: [] });
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "not_found", message: "Synthetic." },
        }),
        { status: 404 },
      );
    }),
  );
  return calls;
}
const answerValue = () =>
  (document.getElementById(`answer-${itemId}`) as HTMLTextAreaElement | null)
    ?.value;

it.each([2, 3, 4])(
  "R17 F01 acknowledged answer survives GET v%i without overwriting a later draft",
  async (getVersion) => {
    let saved = false;
    stub((path, init) => {
      if (path.endsWith("/answers") && init?.method === "POST") {
        saved = true;
        return ok(attempt(3, "Confirmada sintética"));
      }
      if (path === `/api/v1/attempts/${attemptId}` && saved)
        return ok(
          attempt(
            getVersion,
            getVersion < 3 ? "Persistida sintética" : "Confirmada sintética",
          ),
        );
      return undefined;
    });
    const screen = await render(<HomePage />);
    const field = screen.getByLabelText("Resposta — Questão coerente");
    await expect.element(field).toHaveValue("Persistida sintética");
    await field.fill("Confirmada sintética");
    await screen
      .getByRole("button", { name: "Salvar resposta", exact: true })
      .click();
    await expect
      .element(screen.getByText("Resposta salva.", { exact: true }))
      .toBeVisible();
    await screen
      .getByRole("button", { name: "Atualizar respostas", exact: true })
      .click();
    await expect
      .element(screen.getByText("Atividade atualizada.", { exact: true }))
      .toBeVisible();
    expect(answerValue()).toBe("Confirmada sintética");
    await field.fill("Posterior não enviada");
    await screen
      .getByRole("button", { name: "Atualizar respostas", exact: true })
      .click();
    await expect
      .element(screen.getByText("Atividade atualizada.", { exact: true }))
      .toBeVisible();
    expect(answerValue()).toBe("Posterior não enviada");
    await expect
      .element(
        screen.getByRole("button", { name: "Enviar tentativa", exact: true }),
      )
      .toBeDisabled();
  },
);

it.each(["SALVA", "SUBMETIDA"])(
  "R17 F02 submitted journey with GET %s v7 respects editability",
  async (readStatus) => {
    const calls = stub(
      (path) =>
        path === `/api/v1/attempts/${attemptId}`
          ? ok(attempt(7, undefined, readStatus))
          : undefined,
      "SUBMETIDA",
      7,
    );
    const screen = await render(<HomePage />);
    await expect
      .element(
        screen.getByRole("heading", {
          name: "Atividade coerente",
          exact: true,
        }),
      )
      .toBeVisible();
    await vi.waitFor(() =>
      expect(calls).toContain(`/api/v1/attempts/${attemptId}`),
    );
    await vi.waitFor(() =>
      expect(document.body.textContent).not.toContain(
        "Carregando respostas salvas",
      ),
    );
    expect(
      Array.from(document.querySelectorAll("button")).some(
        (button) => button.textContent === "Enviar tentativa",
      ),
    ).toBe(false);
    expect(
      Array.from(document.querySelectorAll("textarea")).some(
        (field) => field.id === `answer-${itemId}` && !field.disabled,
      ),
    ).toBe(false);
  },
);

it("R17 F02 matching saved projection remains editable", async () => {
  stub(() => undefined);
  const screen = await render(<HomePage />);
  await expect
    .element(screen.getByLabelText("Resposta — Questão coerente"))
    .toBeEnabled();
  await expect
    .element(
      screen.getByRole("button", { name: "Enviar tentativa", exact: true }),
    )
    .toBeEnabled();
});

it.each([
  ["CORRIGIDA_HUMANAMENTE", 7, false],
  ["CORRIGIDA_AUTOMATICAMENTE", 1, false],
  ["CORRIGIDA_AUTOMATICAMENTE", 8, false],
  ["CORRIGIDA_HUMANAMENTE", 1, false],
  ["CORRIGIDA_AUTOMATICAMENTE", 7, true],
] as const)(
  "R17 F03 correction %s v%i publishes only a matching result (%s)",
  async (status, version, matching) => {
    const projection = correction(status, version);
    expect(isCorrection(projection)).toBe(true);
    stub(
      (path) =>
        path === `/api/v1/attempts/${attemptId}/feedback`
          ? ok(projection)
          : undefined,
      "CORRIGIDA_AUTOMATICAMENTE",
      7,
    );
    const screen = await render(<HomePage />);
    const panel = screen.getByTestId("correction-panel");
    await expect.element(panel).toBeVisible();
    await vi.waitFor(() =>
      expect(
        document.querySelector(".correction-score") !== null ||
          document.body.textContent?.includes("Tentar consultar resultado"),
      ).toBe(true),
    );
    expect(
      document.querySelector(".correction-score")?.textContent === "100%",
    ).toBe(matching);
    expect(document.body.textContent?.includes(projection.feedback)).toBe(
      matching,
    );
    if (!matching)
      await expect
        .element(
          screen.getByRole("button", { name: "Tentar consultar resultado" }),
        )
        .toBeVisible();
  },
);

it.each([false, true])(
  "R17 F05 GET appeal foreign=%s cannot suppress current question",
  async (foreign) => {
    const row = appeal(foreign ? foreignId : attemptId);
    expect(isParticipantAppeal(row)).toBe(true);
    stub(
      (path) =>
        path.startsWith("/api/v1/appeals?")
          ? ok({ appeals: [row] })
          : undefined,
      "CORRIGIDA_AUTOMATICAMENTE",
      7,
    );
    const screen = await render(<HomePage />);
    await expect.element(screen.getByTestId("appeals-panel")).toBeVisible();
    await vi.waitFor(() =>
      expect(document.body.textContent).not.toContain(
        "Consultando seus protocolos",
      ),
    );
    expect(document.getElementById("appeal-item") !== null).toBe(foreign);
    expect(
      document.querySelector('[aria-label="Meus protocolos"]') !== null,
    ).toBe(!foreign);
  },
);

it.each(["attempt", "item", "matching"] as const)(
  "R17 F05 POST %s receipt is context-bound and keeps later draft",
  async (kind) => {
    let release!: (response: Response) => void;
    const writes: string[] = [];
    stub(
      (path, init) => {
        if (path === "/api/v1/appeals" && init?.method === "POST") {
          writes.push(String(init.body));
          return new Promise((resolve) => {
            release = resolve;
          });
        }
        return undefined;
      },
      "CORRIGIDA_AUTOMATICAMENTE",
      7,
    );
    const screen = await render(<HomePage />);
    const field = screen.getByLabelText("Justificativa");
    await expect.element(field).toBeVisible();
    await screen
      .getByLabelText("Questão", { exact: true })
      .selectOptions(itemId);
    await field.fill("Original sintético");
    await screen
      .getByRole("button", { name: "Enviar contestação", exact: true })
      .click();
    await vi.waitFor(() => expect(writes).toHaveLength(1));
    await field.fill("Posterior não enviada");
    const row = appeal(
      kind === "attempt" ? foreignId : attemptId,
      kind === "item" ? foreignId : itemId,
    );
    expect(isParticipantAppeal(row)).toBe(true);
    release(ok(row));
    await vi.waitFor(() =>
      expect(document.body.textContent).toMatch(
        /Contestação registrada|Não foi possível concluir a operação/,
      ),
    );
    const matching = kind === "matching";
    expect(
      document.querySelector('[aria-label="Meus protocolos"]') !== null,
    ).toBe(matching);
    if (matching) {
      expect(document.body.textContent).toContain("Contestação registrada.");
    } else {
      expect(document.body.textContent).not.toContain(
        "Contestação registrada.",
      );
      expect(
        (document.getElementById("appeal-justification") as HTMLTextAreaElement)
          .value,
      ).toBe("Posterior não enviada");
    }
    expect(JSON.parse(writes[0]!)).toEqual({
      attemptId,
      itemId,
      justification: "Original sintético",
    });
  },
);

it("R17 F04 appeal overlap keeps later unsent draft for another current question", async () => {
  let release!: (response: Response) => void;
  stub(
    (path, init) => {
      if (path === `/api/v1/activities/${activityId}`) {
        const next = activity();
        next.items.push({
          ...next.items[0]!,
          itemId: foreignId,
          ordinal: 2,
          title: "Seconde synthétique",
        });
        expect(isActivity(next)).toBe(true);
        return ok(next);
      }
      if (path === "/api/v1/appeals" && init?.method === "POST")
        return new Promise((resolve) => {
          release = resolve;
        });
      return undefined;
    },
    "CORRIGIDA_AUTOMATICAMENTE",
    7,
  );
  const screen = await render(<HomePage />);
  const field = screen.getByLabelText("Justificativa");
  await expect.element(field).toBeVisible();
  await screen.getByLabelText("Questão", { exact: true }).selectOptions(itemId);
  await field.fill("Original sintético");
  await screen
    .getByRole("button", { name: "Enviar contestação", exact: true })
    .click();
  await vi.waitFor(() => expect(release).toBeTypeOf("function"));
  await field.fill("Posterior não enviada");
  release(ok(appeal()));
  await expect
    .element(
      screen.getByText(
        "Contestação registrada. Acompanhe o protocolo nesta tela.",
        { exact: true },
      ),
    )
    .toBeVisible();
  await expect.element(field).toHaveValue("Posterior não enviada");
});

it("R17 F03 old correction is hidden while the replacement attempt loads appeals", async () => {
  let replacing = false;
  let releaseAppeals!: (response: Response) => void;
  stub(
    (path) => {
      if (path === "/api/v1/learning-path" && replacing) {
        const next = journey("CORRIGIDA_AUTOMATICAMENTE", 7);
        next.activities[0]!.attemptId = foreignId;
        return ok(next);
      }
      if (path === `/api/v1/attempts/${foreignId}`)
        return ok({
          ...attempt(7, undefined, "CORRIGIDA_AUTOMATICAMENTE"),
          attemptId: foreignId,
        });
      if (path === `/api/v1/attempts/${attemptId}` && replacing)
        return ok({
          ...attempt(7, undefined, "CORRIGIDA_AUTOMATICAMENTE"),
          attemptId: foreignId,
        });
      if (path === `/api/v1/appeals?attemptId=${foreignId}`)
        return new Promise((resolve) => {
          releaseAppeals = resolve;
        });
      if (path === `/api/v1/attempts/${foreignId}/feedback`)
        return ok({
          ...correction(),
          score: 82,
          feedback: "Resultado da nova tentativa sintética",
        });
      return undefined;
    },
    "CORRIGIDA_AUTOMATICAMENTE",
    7,
  );
  const screen = await render(<HomePage />);
  await expect
    .element(screen.getByText("Resultado sintético vinculado", { exact: true }))
    .toBeVisible();
  replacing = true;
  await screen
    .getByRole("button", {
      name: "Abrir atividade: Atividade coerente",
      exact: true,
    })
    .first()
    .click();
  await expect
    .element(
      screen.getByRole("button", {
        name: "Tentar carregar respostas",
        exact: true,
      }),
    )
    .toBeVisible();
  await screen
    .getByRole("button", { name: "Tentar carregar respostas", exact: true })
    .click();
  await vi.waitFor(() => expect(releaseAppeals).toBeTypeOf("function"));
  // The stale projection is removed in a later commit than the retry click.
  await expect
    .poll(() => document.body.textContent ?? "")
    .not.toContain("Resultado sintético vinculado");
  await expect
    .poll(() => document.querySelector(".correction-score"))
    .toBeNull();
  releaseAppeals(ok({ appeals: [] }));
  await expect
    .element(
      screen.getByText("Resultado da nova tentativa sintética", {
        exact: true,
      }),
    )
    .toBeVisible();
  expect(document.querySelector(".correction-score")?.textContent).toBe("82%");
});
