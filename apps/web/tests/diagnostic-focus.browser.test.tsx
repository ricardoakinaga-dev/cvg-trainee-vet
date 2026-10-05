import { createElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";

import DiagnosticPage from "../app/diagnostic/page";
import "../app/globals.css";
import { diagnosticSessionProjectionSchema } from "@cvg/contracts";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children?: ReactNode }) =>
    createElement("a", { href }, children),
}));

function session(version = 1, ordinal = 1, selectedChoiceIds: string[] = []) {
  return diagnosticSessionProjectionSchema.parse({
    sessionId: "44444444-4444-4444-8444-444444444444",
    diagnosticId: "B07-DIAGNOSTIC-V1",
    diagnosticVersion: "0.1.0",
    version,
    status: "EM_ANDAMENTO",
    startedAt: "2026-10-03T12:00:00.000Z",
    itemCount: 120,
    answeredItemCount: selectedChoiceIds.length === 0 ? 0 : 1,
    currentOrdinal: ordinal,
    items: Array.from({ length: 120 }, (_, index) => ({
      itemId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      ordinal: index + 1,
      title: `Questão sintética ${index + 1}`,
      text: `Escolha a alternativa segura para o item ${index + 1}.`,
      responseMode: "CHOICE",
      selectionMode: "SINGLE",
      choices: [
        { id: "A", label: "A", text: "Alternativa sintética A." },
        { id: "B", label: "B", text: "Alternativa sintética B." },
      ],
    })),
    answers:
      selectedChoiceIds.length === 0
        ? []
        : [
            {
              itemId: `00000000-0000-4000-8000-${String(ordinal).padStart(12, "0")}`,
              selectedChoiceIds,
            },
          ],
  });
}

function response(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    headers: { "content-type": "application/json" },
  });
}

function heading(): HTMLElement {
  const element = document.getElementById("diagnostic-item-title");
  if (element === null) throw new Error("Synthetic question missing");
  return element;
}

function firstChoice(): HTMLInputElement {
  const element = document.querySelector<HTMLInputElement>(
    ".diagnostic-choice input",
  );
  if (element === null) throw new Error("Synthetic choice missing");
  return element;
}

async function saveByKeyboard(): Promise<void> {
  firstChoice().focus();
  await userEvent.keyboard(" ");
  expect(firstChoice().checked).toBe(true);
  await userEvent.keyboard("{Tab}");
  expect(document.activeElement?.textContent).toBe("Salvar resposta e avançar");
  await userEvent.keyboard("{Enter}");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it.each([1440, 768, 390])(
  "R40 focuses the acknowledged next question before native Tab at %i",
  async (width) => {
    await page.viewport(width, 1000);
    const wires: { path: string; body: string }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input, init) => {
        if (init?.method !== "PUT") return response(session());
        wires.push({ path: String(input), body: String(init.body) });
        return response({ ...session(2, 1, ["A"]), currentOrdinal: 2 });
      }),
    );
    const ui = await render(<DiagnosticPage />);
    await expect.element(ui.getByTestId("diagnostic-item")).toBeVisible();
    await saveByKeyboard();
    await expect
      .element(
        ui.getByRole("heading", { name: "Questão sintética 2", exact: true }),
      )
      .toBeVisible();
    console.log(
      "R40_ADVANCE_FOCUS",
      JSON.stringify({
        width,
        activeTag: document.activeElement?.tagName,
        activeId: document.activeElement?.id,
        question: heading().textContent,
      }),
    );
    expect(document.activeElement).toBe(heading());
    expect(heading().tabIndex).toBe(-1);
    expect(firstChoice().checked).toBe(false);
    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(firstChoice());
    expect(firstChoice().checked).toBe(false);
    expect(wires).toHaveLength(1);
    expect(wires[0]!.path).toBe(
      `/api/v1/diagnostics/b07/sessions/${session().sessionId}/answers/${session().items[0]!.itemId}`,
    );
    expect(JSON.parse(wires[0]!.body)).toMatchObject({
      version: 1,
      selectedChoiceIds: ["A"],
    });
    await page.screenshot();
  },
);

it.each([1440, 768, 390])(
  "R40 initial passive hydration preserves external focus at %i",
  async (width) => {
    await page.viewport(width, 1000);
    const sentinel = document.createElement("button");
    sentinel.textContent = "Synthetic external focus";
    document.body.append(sentinel);
    sentinel.focus();
    try {
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>(async () => response(session(9, 2))),
      );
      const ui = await render(<DiagnosticPage />);
      await expect
        .element(
          ui.getByRole("heading", { name: "Questão sintética 2", exact: true }),
        )
        .toBeVisible();
      expect(document.activeElement).toBe(sentinel);
    } finally {
      sentinel.remove();
    }
  },
);

it.each(["foreign-session", "stale-version", "missing-choice"])(
  "R40 rejects %s without focus and preserves changed draft on original replay",
  async (mode) => {
    await page.viewport(390, 1000);
    const wires: string[] = [];
    let reads = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (_input, init) => {
        if (init?.method !== "PUT") {
          reads += 1;
          return response(session(reads === 1 ? 1 : 9));
        }
        wires.push(String(init.body));
        const valid = session(2, 1, ["A"]);
        if (wires.length > 1) return response(valid);
        return response(
          mode === "foreign-session"
            ? { ...valid, sessionId: "55555555-5555-4555-8555-555555555555" }
            : mode === "stale-version"
              ? { ...valid, version: 1 }
              : session(2),
        );
      }),
    );
    const ui = await render(<DiagnosticPage />);
    await expect.element(ui.getByTestId("diagnostic-item")).toBeVisible();
    await saveByKeyboard();
    await expect.element(ui.getByRole("alert")).toBeVisible();
    expect(heading().textContent).toBe("Questão sintética 1");
    expect(document.activeElement).not.toBe(heading());
    await ui.getByRole("radio").nth(1).click();
    await ui
      .getByRole("button", { name: "Atualizar sessão", exact: true })
      .click();
    await expect
      .element(
        ui.getByRole("button", {
          name: "Reenviar envio pendente",
          exact: true,
        }),
      )
      .toBeEnabled();
    expect(document.activeElement).not.toBe(heading());
    await expect.element(ui.getByRole("radio").nth(1)).toBeChecked();
    await ui
      .getByRole("button", { name: "Reenviar envio pendente", exact: true })
      .click();
    await expect
      .element(
        ui.getByText(
          "Resposta salva. Você pode avançar ou voltar quando quiser.",
          { exact: true },
        ),
      )
      .toBeVisible();
    expect(document.activeElement).not.toBe(heading());
    expect(heading().textContent).toBe("Questão sintética 1");
    await expect.element(ui.getByRole("radio").nth(1)).toBeChecked();
    await expect
      .element(
        ui.getByRole("button", { name: "Finalizar diagnóstico", exact: true }),
      )
      .toBeDisabled();
    expect(reads).toBe(2);
    expect(wires).toHaveLength(2);
    expect(wires[1]).toBe(wires[0]);
  },
);

it("R40 last item same index does not focus the question", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (_input, init) =>
      response(
        init?.method === "PUT" ? session(2, 120, ["A"]) : session(1, 120),
      ),
    ),
  );
  const ui = await render(<DiagnosticPage />);
  await expect.element(ui.getByTestId("diagnostic-item")).toBeVisible();
  await saveByKeyboard();
  await expect
    .element(
      ui.getByText(
        "Resposta salva. Você pode avançar ou voltar quando quiser.",
        { exact: true },
      ),
    )
    .toBeVisible();
  expect(heading().textContent).toBe("Questão sintética 120");
  expect(document.activeElement).not.toBe(heading());
});
