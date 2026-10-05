import { createElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import DiagnosticPage from "../app/diagnostic/page";
import "../app/globals.css";
import { diagnosticSessionProjectionSchema } from "@cvg/contracts";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children?: ReactNode }) =>
    createElement("a", { href }, children),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

for (const selectionMode of ["SINGLE", "MULTIPLE"] as const) {
  it.each([1440, 768, 390])(
    `keeps ${selectionMode} diagnostic choices inside their clickable card at %i`,
    async (width) => {
      await page.viewport(width, 1000);
      const projection = diagnosticSessionProjectionSchema.parse({
        sessionId: "44444444-4444-4444-8444-444444444444",
        diagnosticId: "B07-DIAGNOSTIC-V1",
        diagnosticVersion: "0.1.0",
        version: 1,
        status: "EM_ANDAMENTO",
        startedAt: "2026-10-04T05:00:00.000Z",
        itemCount: 120,
        answeredItemCount: 0,
        currentOrdinal: 1,
        items: Array.from({ length: 120 }, (_, index) => ({
          itemId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
          ordinal: index + 1,
          title: "Questão sintética de disposição",
          text: "Escolha uma alternativa sintética.",
          responseMode: "CHOICE",
          selectionMode,
          choices: [
            {
              id: "A",
              label: "A",
              text: "Alternativa sintética A com texto explicativo.",
            },
            {
              id: "B",
              label: "B",
              text: "Alternativa sintética B com texto explicativo.",
            },
          ],
        })),
        answers: [],
      });
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>(
          async () =>
            new Response(JSON.stringify({ success: true, data: projection })),
        ),
      );
      const ui = await render(<DiagnosticPage />);
      await expect.element(ui.getByTestId("diagnostic-item")).toBeVisible();
      expect(window.innerWidth).toBe(width);
      const choices = [...document.querySelectorAll(".diagnostic-choice")];
      expect(choices).toHaveLength(2);
      for (const choice of choices) {
        const card = choice.getBoundingClientRect();
        const input = choice.querySelector("input")!;
        const text = choice.querySelector("span")!.getBoundingClientRect();
        expect(text.width).toBeGreaterThan(0);
        expect(text.left).toBeGreaterThanOrEqual(card.left);
        expect(text.right).toBeLessThanOrEqual(card.right + 1);
        expect(input.getBoundingClientRect().right).toBeLessThan(text.left);
        expect(card.right).toBeLessThanOrEqual(width);
      }
      await ui
        .getByText("Alternativa sintética A com texto explicativo.")
        .click();
      const selected = choices[0]!.querySelector("input")!;
      expect(selected.checked).toBe(true);
      selected.focus();
      expect(document.activeElement).toBe(selected);
    },
  );
}
