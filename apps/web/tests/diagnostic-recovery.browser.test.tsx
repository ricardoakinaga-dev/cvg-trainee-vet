import { createElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";

import DiagnosticPage from "../app/diagnostic/page";
import "../app/globals.css";
import { diagnosticSessionProjectionSchema } from "@cvg/contracts";
import { apiErrorResponse } from "@cvg/contracts";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children?: ReactNode }) =>
    createElement("a", { href }, children),
}));

function session(choiceText = "Alternativa sintética A.", version = 1) {
  return diagnosticSessionProjectionSchema.parse({
    sessionId: "44444444-4444-4444-8444-444444444444",
    diagnosticId: "B07-DIAGNOSTIC-V1",
    diagnosticVersion: "0.1.0",
    version,
    status: "EM_ANDAMENTO",
    startedAt: "2026-10-03T12:00:00.000Z",
    itemCount: 120,
    answeredItemCount: 0,
    currentOrdinal: 1,
    items: Array.from({ length: 120 }, (_, index) => ({
      itemId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      ordinal: index + 1,
      title: `Questão sintética ${index + 1}`,
      text: `Escolha a alternativa segura para o item ${index + 1}.`,
      responseMode: "CHOICE",
      selectionMode: "SINGLE",
      choices: [
        {
          id: "A",
          label: "A",
          text: index === 0 ? choiceText : "Alternativa sintética A.",
        },
        { id: "B", label: "B", text: "Alternativa sintética B." },
      ],
    })),
    answers: [],
  });
}

function success(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    headers: { "content-type": "application/json" },
  });
}

function rejected(status = 422, code = "validation_error"): Response {
  if (code === "validation_error")
    return new Response(
      JSON.stringify(apiErrorResponse("validation_error", "synthetic-r50")),
      { status },
    );
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code,
        message: "PRIVATE_CANARY_45",
        details: { source: "PRIVATE_CANARY_45" },
      },
    }),
    { status, headers: { "content-type": "application/json" } },
  );
}

function fieldset(): HTMLFieldSetElement {
  const field = document.querySelector<HTMLFieldSetElement>(
    ".diagnostic-choice-fieldset",
  );
  if (field === null) throw new Error("Synthetic field missing");
  return field;
}

function choices(): HTMLInputElement[] {
  return [...fieldset().querySelectorAll<HTMLInputElement>("input")];
}

async function keyboardSave(): Promise<void> {
  choices()[0]!.focus();
  await userEvent.keyboard(" ");
  expect(choices()[0]!.checked).toBe(true);
  await userEvent.keyboard("{Tab}");
  expect(document.activeElement?.textContent).toBe("Salvar resposta e avançar");
  await userEvent.keyboard("{Enter}");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

for (const [kind, text] of [
  ["LONG", "Sintetic".repeat(220)],
  [
    "prose",
    "Alternativa sintética com espaços e explicação segura. ".repeat(34).trim(),
  ],
] as const) {
  it.each([1440, 768, 390])(
    `R45 ${kind} canonical choice keeps field and native Save/Clear inside the card at %i`,
    async (width) => {
      await page.viewport(width, 1000);
      const projection = session(text);
      const wires: string[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>(async (_input, init) => {
          if (init?.method !== "PUT") return success(projection);
          wires.push(String(init.body));
          return success({ ...projection, version: 2 });
        }),
      );
      const ui = await render(<DiagnosticPage />);
      await expect.element(ui.getByTestId("diagnostic-item")).toBeVisible();
      expect(fieldset().textContent).toContain(text);
      const item = ui
        .getByTestId("diagnostic-item")
        .element()
        .getBoundingClientRect();
      const targets = [
        fieldset(),
        ...document.querySelectorAll<HTMLElement>(
          ".diagnostic-choice, .diagnostic-choice span, .diagnostic-action-row button",
        ),
      ];
      console.log(
        "R45_GEOMETRY",
        JSON.stringify({
          width,
          kind,
          boxes: targets.map((element) => ({
            tag: element.tagName,
            x: element.getBoundingClientRect().x,
            width: element.getBoundingClientRect().width,
          })),
        }),
      );
      for (const element of targets) {
        const box = element.getBoundingClientRect();
        expect(box.width).toBeGreaterThan(0);
        expect(box.left).toBeGreaterThanOrEqual(item.left);
        expect(box.right).toBeLessThanOrEqual(item.right + 1);
        expect(box.right).toBeLessThanOrEqual(width);
        expect(element.scrollWidth).toBeLessThanOrEqual(
          element.clientWidth + 1,
        );
      }
      await ui.getByRole("radio").first().click();
      const save = ui
        .getByRole("button", { name: "Salvar resposta e avançar", exact: true })
        .element();
      const clear = ui
        .getByRole("button", { name: "Limpar resposta", exact: true })
        .element();
      choices()[0]!.focus();
      await userEvent.keyboard("{Tab}");
      expect(document.activeElement).toBe(save);
      await userEvent.keyboard("{Tab}");
      expect(document.activeElement).toBe(clear);
      await userEvent.keyboard("{Enter}");
      await expect
        .element(
          ui.getByText(
            "Resposta removida; a sessão continua pronta para retomada.",
            { exact: true },
          ),
        )
        .toBeVisible();
      expect(wires).toHaveLength(1);
      expect(JSON.parse(wires[0]!)).toMatchObject({
        version: 1,
        selectedChoiceIds: [],
      });
      expect(choices()[0]!.checked).toBe(false);
      expect(
        document.getElementById("diagnostic-item-title")?.textContent,
      ).toBe("Questão sintética 1");
      await page.screenshot();
    },
  );
}

it.each([1440, 768, 390])(
  "R45 recognized answer 422 associates fixed error and restores enabled native field at %i",
  async (width) => {
    await page.viewport(width, 1000);
    const wires: string[] = [];
    const initial = session();
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (_input, init) => {
        if (init?.method !== "PUT") return success(initial);
        wires.push(String(init.body));
        if (wires.length === 1) return rejected();
        const body = JSON.parse(String(init.body)) as {
          selectedChoiceIds: string[];
        };
        return success({
          ...initial,
          version: 2,
          answeredItemCount: 1,
          currentOrdinal: 2,
          answers: [
            {
              itemId: initial.items[0]!.itemId,
              selectedChoiceIds: body.selectedChoiceIds,
            },
          ],
        });
      }),
    );
    const ui = await render(<DiagnosticPage />);
    await expect.element(ui.getByTestId("diagnostic-item")).toBeVisible();
    await keyboardSave();
    await expect.element(ui.getByRole("alert")).toBeVisible();
    const alert = ui.getByRole("alert").element();
    expect(alert.textContent).toBe(
      "Revise a resposta deste item e tente salvar novamente.",
    );
    expect(alert.id.length).toBeGreaterThan(0);
    expect(fieldset().getAttribute("aria-invalid")).toBe("true");
    expect(fieldset().getAttribute("aria-describedby")?.split(" ")).toContain(
      alert.id,
    );
    expect(fieldset().contains(document.activeElement)).toBe(true);
    expect(choices()[0]!.disabled).toBe(false);
    expect(choices()[0]!.checked).toBe(true);
    expect(document.body.textContent).not.toContain("PRIVATE_CANARY_45");
    expect(wires).toHaveLength(1);
    await page.screenshot();
    if (document.activeElement === fieldset())
      await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(choices()[0]);
    await ui.getByRole("radio").nth(1).click();
    expect(fieldset().getAttribute("aria-invalid")).not.toBe("true");
    await ui
      .getByRole("button", { name: "Salvar resposta e avançar", exact: true })
      .click();
    await expect
      .element(
        ui.getByRole("heading", { name: "Questão sintética 2", exact: true }),
      )
      .toBeVisible();
    expect(document.activeElement).toBe(
      document.getElementById("diagnostic-item-title"),
    );
    expect(wires).toHaveLength(2);
    expect(JSON.parse(wires[1]!)).toMatchObject({
      version: 1,
      selectedChoiceIds: ["B"],
    });
    expect(choices().every((choice) => !choice.checked)).toBe(true);
  },
);

it.each([
  "unknown-code",
  "wrong-status",
  "malformed",
  "unproven-receipt",
  "missing-message",
  "blank-message",
  "nonstring-message",
  "invalid-details",
  "private-field",
  "private-message",
])(
  "R45 %s stays pinned, never associates field validation or focuses it, and preserves dirty original replay",
  async (mode) => {
    const initial = session();
    const wires: { path: string; body: string }[] = [];
    let reads = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input, init) => {
        if (init?.method !== "PUT")
          return success({ ...initial, version: reads++ === 0 ? 1 : 9 });
        wires.push({ path: String(input), body: String(init.body) });
        if (wires.length > 1)
          return success({
            ...initial,
            version: 2,
            answeredItemCount: 1,
            answers: [
              { itemId: initial.items[0]!.itemId, selectedChoiceIds: ["A"] },
            ],
          });
        if (mode === "unknown-code") return rejected(422, "unknown");
        if (mode === "wrong-status") return rejected(500);
        if (mode === "malformed") return new Response("{}", { status: 422 });
        const publicError = apiErrorResponse(
          "validation_error",
          "synthetic-r50",
        );
        if (mode === "missing-message")
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: "validation_error" },
            }),
            { status: 422 },
          );
        if (
          ["blank-message", "nonstring-message", "private-message"].includes(
            mode,
          )
        )
          return new Response(
            JSON.stringify({
              ...publicError,
              error: {
                ...publicError.error,
                message:
                  mode === "blank-message"
                    ? ""
                    : mode === "nonstring-message"
                      ? 12
                      : "PRIVATE_CANARY_45",
              },
            }),
            { status: 422 },
          );
        if (mode === "invalid-details")
          return new Response(
            JSON.stringify({
              ...publicError,
              error: {
                ...publicError.error,
                details: { field: "PRIVATE_CANARY_45" },
              },
            }),
            { status: 422 },
          );
        if (mode === "private-field")
          return new Response(
            JSON.stringify({ ...publicError, source: "PRIVATE_CANARY_45" }),
            { status: 422 },
          );
        return success({ ...initial, version: 2 });
      }),
    );
    const ui = await render(<DiagnosticPage />);
    await expect.element(ui.getByTestId("diagnostic-item")).toBeVisible();
    await keyboardSave();
    await expect.element(ui.getByRole("alert")).toBeVisible();
    expect(fieldset().getAttribute("aria-invalid")).not.toBe("true");
    expect(fieldset().contains(document.activeElement)).toBe(false);
    expect(wires).toHaveLength(1);
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
    expect(fieldset().contains(document.activeElement)).toBe(false);
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
    expect(wires).toHaveLength(2);
    expect(wires[1]).toEqual(wires[0]);
    expect(document.getElementById("diagnostic-item-title")?.textContent).toBe(
      "Questão sintética 1",
    );
    await expect.element(ui.getByRole("radio").nth(1)).toBeChecked();
    expect(fieldset().getAttribute("aria-invalid")).not.toBe("true");
    expect(fieldset().contains(document.activeElement)).toBe(false);
    expect(document.activeElement?.id).not.toBe("diagnostic-item-title");
    expect(document.body.textContent).not.toContain("PRIVATE_CANARY_45");
  },
);
