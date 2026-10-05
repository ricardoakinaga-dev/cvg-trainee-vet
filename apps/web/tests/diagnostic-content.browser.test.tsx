import { createElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import DiagnosticPage from "../app/diagnostic/page";
import "../app/globals.css";
import {
  diagnosticSessionProjectionSchema,
  diagnosticSessionAnswerRequestSchema,
} from "@cvg/contracts";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children?: ReactNode }) =>
    createElement("a", { href }, children),
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
  window.history.replaceState({}, document.title, "/");
});
const sessionId = "40000000-0000-4000-8000-000000000001";
const title = "W".repeat(300);
const body = "X".repeat(10000);
const choiceText = "Z".repeat(2000);
const success = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data }));
for (const selectionMode of ["SINGLE", "MULTIPLE"] as const) {
  it.each([1440, 768, 390])(
    `R58 actual DiagnosticPage canonical max title/body ${selectionMode} wraps and saves by keyboard at %i`,
    async (width) => {
      await page.viewport(width, 1000);
      const session = diagnosticSessionProjectionSchema.parse({
        sessionId,
        diagnosticId: "B07-DIAGNOSTIC-V1",
        diagnosticVersion: "0.1.0",
        version: 0,
        status: "EM_ANDAMENTO",
        startedAt: "2026-10-04T07:00:00.000Z",
        itemCount: 120,
        answeredItemCount: 0,
        currentOrdinal: 1,
        answers: [],
        items: Array.from({ length: 120 }, (_, index) => ({
          itemId: `50000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
          ordinal: index + 1,
          title: index === 0 ? title : `Item sintético ${index + 1}`,
          text: index === 0 ? body : "Enunciado sintético.",
          responseMode: "CHOICE",
          selectionMode,
          choices: [
            {
              id: "A",
              label: "A",
              text: index === 0 ? choiceText : "Escolha sintética A.",
            },
            { id: "B", label: "B", text: "Escolha sintética B." },
          ],
        })),
      });
      expect(session.items[0]!.title).toHaveLength(300);
      expect(session.items[0]!.text).toHaveLength(10000);
      const wires: { path: string; body: string }[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>(async (input, init) => {
          const path = String(input);
          if (path === "/api/v1/diagnostics/b07/sessions/current")
            return success(session);
          if (init?.method === "PUT") {
            wires.push({ path, body: String(init.body) });
            const request = diagnosticSessionAnswerRequestSchema.parse(
              JSON.parse(String(init.body)),
            );
            return success(
              diagnosticSessionProjectionSchema.parse({
                ...session,
                version: 1,
                answeredItemCount: 1,
                currentOrdinal: 2,
                answers: [
                  {
                    itemId: session.items[0]!.itemId,
                    selectedChoiceIds: request.selectedChoiceIds,
                  },
                ],
              }),
            );
          }
          return new Response(
            JSON.stringify({ success: false, error: { code: "not_found" } }),
            { status: 404 },
          );
        }),
      );
      const ui = await render(<DiagnosticPage />);
      await expect
        .element(ui.getByRole("heading", { name: title, exact: true }))
        .toBeVisible();
      expect(window.innerWidth).toBe(width);
      const card = document.querySelector(".diagnostic-item")!;
      const heading = document.getElementById("diagnostic-item-title")!;
      const paragraph = [...card.querySelectorAll("p")].find(
        (p) => p.textContent === body,
      )!;
      expect(heading.textContent).toBe(title);
      expect(paragraph.textContent).toBe(body);
      const spans = [...card.querySelectorAll(".diagnostic-choice span")];
      expect(spans[0]!.textContent).toBe("A" + choiceText);
      for (const element of [heading, paragraph, ...spans]) {
        const rect = element.getBoundingClientRect();
        const container = card.getBoundingClientRect();
        expect(rect.left).toBeGreaterThanOrEqual(container.left - 1);
        expect(rect.right).toBeLessThanOrEqual(
          Math.min(width, container.right) + 1,
        );
        const range = document.createRange();
        range.selectNodeContents(element);
        const glyphs = [...range.getClientRects()];
        expect(glyphs.length).toBeGreaterThan(0);
        if (element === heading || element === paragraph)
          expect(glyphs.length).toBeGreaterThan(1);
        for (const glyph of glyphs) {
          expect(glyph.left).toBeGreaterThanOrEqual(rect.left - 1);
          expect(glyph.right).toBeLessThanOrEqual(
            Math.min(rect.right, width) + 1,
          );
          expect(glyph.top).toBeGreaterThanOrEqual(rect.top - 1);
          expect(glyph.bottom).toBeLessThanOrEqual(rect.bottom + 1);
        }
      }
      const inputs = [...card.querySelectorAll<HTMLInputElement>("input")];
      expect(inputs).toHaveLength(2);
      for (const control of [...inputs, ...card.querySelectorAll("button")]) {
        const rect = control.getBoundingClientRect();
        expect(rect.width).toBeGreaterThan(0);
        expect(rect.right).toBeLessThanOrEqual(width);
        expect(rect.left).toBeGreaterThanOrEqual(
          card.getBoundingClientRect().left,
        );
      }
      inputs[0]!.focus();
      inputs[0]!.scrollIntoView({ block: "center" });
      await userEvent.keyboard(" ");
      expect(inputs[0]!.checked).toBe(true);
      await userEvent.keyboard("{Tab}");
      if (selectionMode === "MULTIPLE") {
        expect(document.activeElement).toBe(inputs[1]);
        await userEvent.keyboard("{Tab}");
      }
      const save = ui.getByRole("button", {
        name: "Salvar resposta e avançar",
        exact: true,
      });
      expect(document.activeElement).toBe(save.element());
      // The component runner can scroll its outer iframe independently.
      // Exercise ordinary vertical scrolling before activation; top-level
      // focus scrolling is verified separately by the native page harness.
      save.element().scrollIntoView({ block: "center", behavior: "instant" });
      await expect
        .poll(() => save.element().getBoundingClientRect().bottom)
        .toBeLessThanOrEqual(window.innerHeight);
      const rect = save.element().getBoundingClientRect();
      expect(rect.top).toBeGreaterThanOrEqual(0);
      expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight);
      await userEvent.keyboard("{Enter}");
      await expect
        .element(
          ui.getByRole("heading", { name: "Item sintético 2", exact: true }),
        )
        .toBeVisible();
      // Focus moves to the new item title in a later commit than its paint.
      await expect
        .poll(() => document.activeElement)
        .toBe(document.getElementById("diagnostic-item-title"));
      expect(wires).toHaveLength(1);
      expect(wires[0]!.path).toBe(
        `/api/v1/diagnostics/b07/sessions/${sessionId}/answers/${session.items[0]!.itemId}`,
      );
      expect(
        diagnosticSessionAnswerRequestSchema.parse(JSON.parse(wires[0]!.body)),
      ).toMatchObject({
        version: 0,
        selectedChoiceIds: ["A"],
      });
    },
  );
}
