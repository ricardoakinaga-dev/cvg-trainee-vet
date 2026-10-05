import { createElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { commands, page, userEvent } from "vitest/browser";
import HomePage from "../app/page";
import "../app/globals.css";
import { participantActivityProjectionSchema } from "@cvg/contracts";
import {
  participantAttemptProjectionSchema,
  saveAnswerRequestSchema,
} from "@cvg/contracts";
import { participantLearningJourneyProjectionSchema } from "@cvg/contracts";
import { dashboardProjectionSchema } from "@cvg/contracts";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children?: ReactNode }) =>
    createElement("a", { href }, children),
}));
const activityId = "10000000-0000-4000-8000-000000000001";
const attemptId = "10000000-0000-4000-8000-000000000002";
const itemId = "10000000-0000-4000-8000-000000000003";
const at = "2026-10-04T07:00:00.000Z";
const success = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState({}, document.title, "/");
});

for (const selectionMode of ["SINGLE", "MULTIPLE"] as const) {
  for (const [kind, text] of [
    ["token", "Z".repeat(1990)],
    [
      "prose",
      "Alternativa inteiramente sintética com explicação. ".repeat(35).trim(),
    ],
    ["short", "Alternativa sintética."],
  ] as const) {
    it.each([1440, 768, 390])(
      `R50 actual HomePage canonical QUESTAO ${selectionMode}/${kind} preserves content, bounds and native save at %i`,
      async (width) => {
        await page.viewport(width, 1000);
        const activity = participantActivityProjectionSchema.parse({
          activityId,
          slug: "synthetic-r50",
          title: "Atividade sintética R50",
          items: [
            {
              itemId,
              ordinal: 1,
              kind: "QUESTAO",
              title: "Questão sintética R50",
              text: "Somente conteúdo sintético.",
              responseMode: "CHOICE",
              selectionMode,
              choices: [
                { id: "A", label: "A", text },
                { id: "B", label: "B", text: "Segunda alternativa sintética." },
              ],
            },
          ],
        });
        const journey = participantLearningJourneyProjectionSchema.parse({
          assignments: [],
          results: [],
          runtimes: [],
          activities: [
            {
              activityId,
              slug: activity.slug,
              title: activity.title,
              status: "EM_ANDAMENTO",
              attemptId,
              attemptStatus: "SALVA",
              attemptVersion: 2,
              nextAction: "RETOMAR_ATIVIDADE",
            },
          ],
          nextAction: "RETOMAR_ATIVIDADE",
          nextActionTarget: { kind: "ACTIVITY", activityId },
        });
        const attempt = participantAttemptProjectionSchema.parse({
          attemptId,
          activityId,
          status: "SALVA",
          version: 2,
          answers: [],
        });
        const wires: { path: string; body: string }[] = [];
        vi.stubGlobal(
          "fetch",
          vi.fn<typeof fetch>(async (input, init) => {
            const path = String(input);
            if (path === "/api/v1/session/current")
              return success({ status: "active" });
            if (path === "/api/v1/feedback") return success({ tickets: [] });
            if (path === "/api/v1/learning-path") return success(journey);
            if (path === `/api/v1/activities/${activityId}`)
              return success(activity);
            if (path === `/api/v1/attempts/${attemptId}`)
              return success(attempt);
            if (path.endsWith("/answers") && init?.method === "POST") {
              wires.push({ path, body: String(init.body) });
              const payload = JSON.parse(String(init.body)) as {
                response: string;
              };
              return success(
                participantAttemptProjectionSchema.parse({
                  ...attempt,
                  version: 3,
                  answers: [
                    { itemId, response: payload.response, savedAt: at },
                  ],
                }),
              );
            }
            if (path.startsWith("/api/v1/appeals?"))
              return success({ appeals: [] });
            return new Response(
              JSON.stringify({
                success: false,
                error: { code: "not_found", message: "Synthetic." },
              }),
              { status: 404 },
            );
          }),
        );
        const ui = await render(<HomePage />);
        await expect
          .element(
            ui.getByRole("heading", {
              name: "Questão sintética R50",
              exact: true,
            }),
          )
          .toBeVisible();
        expect(window.innerWidth).toBe(width);
        expect(document.querySelector("main.shell")).not.toBeNull();
        expect(document.querySelector(".page-shell")).toBeNull();
        // The item heading can paint before its answer control commits.
        await expect
          .poll(() => document.getElementById(`answer-${itemId}`) !== null)
          .toBe(true);
        const field = document.getElementById(`answer-${itemId}`)!;
        const card = field.closest(".item-card")!.getBoundingClientRect();
        const labels = [...field.querySelectorAll<HTMLLabelElement>("label")];
        const inputs = [...field.querySelectorAll<HTMLInputElement>("input")];
        expect(labels).toHaveLength(2);
        expect(labels[0]!.textContent).toContain(text);
        for (const element of [
          field,
          ...labels,
          ...labels.map((label) => label.querySelector("span")!),
        ]) {
          const box = element.getBoundingClientRect();
          console.log(
            "R50_CONTENT_BOUNDS",
            JSON.stringify({
              viewportWidth: width,
              selectionMode,
              kind,
              tag: element.tagName,
              left: box.left,
              right: box.right,
              width: box.width,
              cardRight: card.right,
            }),
          );
          expect(box.width).toBeGreaterThan(0);
          expect(box.left).toBeGreaterThanOrEqual(card.left);
          expect(box.right).toBeLessThanOrEqual(card.right + 1);
          expect(box.right).toBeLessThanOrEqual(width);
          expect(element.scrollWidth).toBeLessThanOrEqual(
            element.clientWidth + 1,
          );
        }
        for (const input of inputs) {
          const control = input.getBoundingClientRect();
          const label = input.closest("label")!;
          const labelBox = label.getBoundingClientRect();
          const span = label.querySelector("span")!.getBoundingClientRect();
          const fontSize = Number.parseFloat(
            getComputedStyle(document.documentElement).fontSize,
          );
          expect(control.width).toBeCloseTo(1.1 * fontSize, 0);
          expect(control.height).toBeCloseTo(1.1 * fontSize, 0);
          expect(control.right).toBeLessThan(span.left);
          expect(span.right).toBeLessThanOrEqual(labelBox.right + 1);
          expect(span.bottom).toBeLessThanOrEqual(labelBox.bottom + 1);
        }
        inputs[0]!.focus();
        await userEvent.keyboard(" ");
        expect(inputs[0]!.checked).toBe(true);
        await userEvent.keyboard("{Tab}");
        if (selectionMode === "MULTIPLE") {
          expect(document.activeElement).toBe(inputs[1]);
          await userEvent.keyboard("{Tab}");
        }
        expect(document.activeElement).toBe(
          ui
            .getByRole("button", { name: "Salvar resposta", exact: true })
            .element(),
        );
        await userEvent.keyboard("{Enter}");
        await expect
          .element(ui.getByText("Resposta salva.", { exact: true }))
          .toBeVisible();
        expect(wires).toHaveLength(1);
        expect(wires[0]!.path).toBe(`/api/v1/attempts/${attemptId}/answers`);
        expect(
          saveAnswerRequestSchema.parse(JSON.parse(wires[0]!.body)),
        ).toMatchObject({
          itemId,
          attemptId,
          activityId,
          response: selectionMode === "SINGLE" ? "A" : '["A"]',
        });
        await page.screenshot();
      },
    );
  }
}

function glyphRects(element: Element): DOMRect[] {
  const range = document.createRange();
  range.selectNodeContents(element);
  return [...range.getClientRects()];
}
// The root uses scroll-behavior: smooth, so focusing an off-screen control
// animates the scroll. Geometry is only meaningful once scrolling settles.
async function settleScrolling(): Promise<void> {
  let previous = Number.NaN;
  for (let frame = 0; frame < 120; frame++) {
    const current = window.scrollY;
    if (current === previous) return;
    previous = current;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => {
        resolve();
      }),
    );
  }
}
function withinHorizontal(
  rect: Pick<DOMRect, "left" | "right">,
  container: Pick<DOMRect, "left" | "right">,
  width: number,
): boolean {
  return (
    rect.left >= Math.max(0, container.left) - 1 &&
    rect.right <= Math.min(width, container.right) + 1
  );
}
function bodyActivity(text: string) {
  return participantActivityProjectionSchema.parse({
    activityId,
    slug: "synthetic-r54",
    title: "Atividade sintética R54",
    items: [
      {
        itemId,
        ordinal: 1,
        kind: "CASO",
        title: "Caso sintético R54",
        text,
        responseMode: "TEXT",
      },
      ...(["SINGLE", "MULTIPLE"] as const).map((selectionMode, index) => ({
        itemId: `10000000-0000-4000-8000-00000000000${index + 4}`,
        ordinal: index + 2,
        kind: "QUESTAO" as const,
        title: `Questão sintética R54 ${selectionMode}`,
        text: "Escolha somente uma resposta sintética.",
        responseMode: "CHOICE" as const,
        selectionMode,
        choices: [
          { id: "A", label: "A", text: "Primeira alternativa sintética." },
          { id: "B", label: "B", text: "Segunda alternativa sintética." },
        ],
      })),
    ],
  });
}
for (const [kind, text] of [
  ["counterexample", "X".repeat(19990)],
  ["max-token", "X".repeat(20000)],
  [
    "max-prose",
    "Relato inteiramente sintético para testar a leitura do caso. "
      .repeat(400)
      .slice(0, 19999) + ".",
  ],
  ["short", "Caso inteiramente sintético."],
] as const) {
  it.each([1440, 768, 390])(
    `R54 actual HomePage canonical CASO ${kind} retains glyphs and native response controls at %i`,
    async (width) => {
      await page.viewport(width, 1000);
      const activity = bodyActivity(text);
      expect(activity.items[0]!.text).toBe(text);
      expect(text.length).toBeLessThanOrEqual(20000);
      if (kind.startsWith("max-")) expect(text).toHaveLength(20000);
      const attempt = participantAttemptProjectionSchema.parse({
        attemptId,
        activityId,
        status: "SALVA",
        version: 2,
        answers: [],
      });
      const journey = participantLearningJourneyProjectionSchema.parse({
        assignments: [],
        results: [],
        runtimes: [],
        activities: [
          {
            activityId,
            slug: activity.slug,
            title: activity.title,
            status: "EM_ANDAMENTO",
            attemptId,
            attemptStatus: "SALVA",
            attemptVersion: 2,
            nextAction: "RETOMAR_ATIVIDADE",
          },
        ],
        nextAction: "RETOMAR_ATIVIDADE",
        nextActionTarget: { kind: "ACTIVITY", activityId },
      });
      const wires: { path: string; body: string }[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>(async (input, init) => {
          const path = String(input);
          if (path === "/api/v1/session/current")
            return success({ status: "active" });
          if (path === "/api/v1/feedback") return success({ tickets: [] });
          if (path === "/api/v1/learning-path") return success(journey);
          if (path === `/api/v1/activities/${activityId}`)
            return success(activity);
          if (path === `/api/v1/attempts/${attemptId}`) return success(attempt);
          if (path.startsWith("/api/v1/appeals?"))
            return success({ appeals: [] });
          if (
            path === `/api/v1/attempts/${attemptId}/answers` &&
            init?.method === "POST"
          ) {
            const body = String(init.body);
            wires.push({ path, body });
            const answer = saveAnswerRequestSchema.parse(JSON.parse(body));
            return success(
              participantAttemptProjectionSchema.parse({
                ...attempt,
                version: 3,
                answers: [
                  {
                    itemId: answer.itemId,
                    response: answer.response,
                    savedAt: at,
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
      const ui = await render(<HomePage />);
      await expect
        .element(
          ui.getByRole("heading", { name: "Caso sintético R54", exact: true }),
        )
        .toBeVisible();
      expect(window.innerWidth).toBe(width);
      expect(document.querySelector(".page-shell")).toBeNull();
      // The heading can paint before the item list commits; wait for the
      // canonical inventory instead of sampling a partial DOM.
      await expect
        .poll(
          () =>
            document.querySelectorAll("main.shell .item-list .item-card")
              .length,
        )
        .toBe(3);
      const shell = document.querySelector("main.shell")!;
      const list = shell.querySelector(".item-list")!;
      const cards = [...list.querySelectorAll<HTMLElement>(".item-card")];
      expect(cards).toHaveLength(3);
      const paragraphs = cards.map((card) => card.querySelector("p")!);
      expect(paragraphs[0]!.textContent).toBe(text);
      // The interaction controls commit after the cards; wait for the full
      // control inventory instead of sampling a partial DOM.
      await expect
        .poll(
          () =>
            document.querySelectorAll(
              "main.shell .item-list textarea, main.shell .item-list input, main.shell .item-list button",
            ).length,
        )
        .toBe(8);
      const textarea = document.getElementById(
        `answer-${itemId}`,
      ) as HTMLTextAreaElement;
      const controls = [
        ...list.querySelectorAll<HTMLElement>("textarea, input, button"),
      ];
      expect(controls).toHaveLength(8);
      const proof = {
        width,
        kind,
        textLength: text.length,
        elements: [shell, list, ...cards, ...paragraphs, ...controls].map(
          (element) => ({
            tag: element.tagName,
            className: element.className,
            id: element.id,
            rect: element.getBoundingClientRect().toJSON(),
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
          }),
        ),
        paragraphs: paragraphs.map((paragraph) => ({
          textLength: paragraph.textContent!.length,
          rect: paragraph.getBoundingClientRect().toJSON(),
          glyphs: glyphRects(paragraph).map((rect) => rect.toJSON()),
        })),
      };
      const screenshot = await page.screenshot();
      await commands.writeFile(
        screenshot.replace(/\.png$/u, ".geometry.json"),
        JSON.stringify(proof, null, 2),
      );
      for (const element of [
        shell,
        list,
        ...cards,
        ...paragraphs,
        ...controls,
      ]) {
        const rect = element.getBoundingClientRect();
        expect(rect.width).toBeGreaterThan(0);
        expect(
          withinHorizontal(rect, shell.getBoundingClientRect(), width),
        ).toBe(true);
      }
      for (const paragraph of paragraphs) {
        const glyphs = glyphRects(paragraph);
        expect(glyphs.length).toBeGreaterThan(0);
        for (const rect of glyphs) {
          expect(
            withinHorizontal(rect, paragraph.getBoundingClientRect(), width),
          ).toBe(true);
          expect(rect.top).toBeGreaterThanOrEqual(
            paragraph.getBoundingClientRect().top - 1,
          );
          expect(rect.bottom).toBeLessThanOrEqual(
            paragraph.getBoundingClientRect().bottom + 1,
          );
        }
        if (text.length > 1000 && paragraph === paragraphs[0])
          expect(glyphs.length).toBeGreaterThan(1);
      }
      expect(textarea.maxLength).toBe(10000);
      expect(Number.parseFloat(getComputedStyle(textarea).fontSize)).toBe(16);
      const field = ui.getByRole("textbox", {
        name: "Resposta — Caso sintético R54",
        exact: true,
      });
      await field.click();
      await field.fill("Resposta inteiramente sintética R54.");
      expect(document.activeElement).toBe(textarea);
      const fieldRect = textarea.getBoundingClientRect();
      expect(fieldRect.top).toBeGreaterThanOrEqual(0);
      expect(fieldRect.bottom).toBeLessThanOrEqual(window.innerHeight);
      await userEvent.keyboard("{Tab}");
      const save = cards[0]!.querySelector("button")!;
      expect(document.activeElement).toBe(save);
      await settleScrolling();
      const saveRect = save.getBoundingClientRect();
      expect(saveRect.top).toBeGreaterThanOrEqual(0);
      expect(saveRect.bottom).toBeLessThanOrEqual(window.innerHeight);
      await userEvent.keyboard("{Enter}");
      await expect
        .element(ui.getByText("Resposta salva.", { exact: true }))
        .toBeVisible();
      expect(wires).toHaveLength(1);
      expect(saveAnswerRequestSchema.parse(JSON.parse(wires[0]!.body))).toEqual(
        {
          activityId,
          attemptId,
          itemId,
          response: "Resposta inteiramente sintética R54.",
          idempotencyKey: expect.any(String),
        },
      );
      expect(paragraphs[0]!.textContent).toBe(text);
    },
  );
}

it.each([1440, 768, 390])(
  "R54 glyph detector rejects known clipped token despite equal scroll/client width at %i",
  async (width) => {
    await page.viewport(width, 1000);
    const host = document.createElement("div");
    host.style.cssText = "width:128px;overflow:hidden;position:relative";
    const paragraph = document.createElement("p");
    paragraph.textContent = "X".repeat(20000);
    paragraph.style.cssText = "width:max-content;white-space:normal";
    host.append(paragraph);
    document.body.append(host);
    try {
      expect(paragraph.scrollWidth).toBe(paragraph.clientWidth);
      expect(
        glyphRects(paragraph).every((rect) =>
          withinHorizontal(rect, host.getBoundingClientRect(), width),
        ),
      ).toBe(false);
      paragraph.style.cssText =
        "width:auto;min-width:0;overflow-wrap:anywhere;white-space:normal";
      expect(paragraph.textContent).toHaveLength(20000);
      expect(glyphRects(paragraph).length).toBeGreaterThan(1);
      expect(
        glyphRects(paragraph).every((rect) =>
          withinHorizontal(rect, host.getBoundingClientRect(), width),
        ),
      ).toBe(true);
    } finally {
      host.remove();
    }
  },
);
it.each([1440, 768, 390])(
  "R58 actual HomePage maximum canonical titles/body retain glyphs and keyboard Save at %i",
  async (width) => {
    await page.viewport(width, 1000);
    const title = "W".repeat(300);
    const text = "X".repeat(20000);
    const base = bodyActivity(text);
    const activity = participantActivityProjectionSchema.parse({
      ...base,
      title,
      items: [{ ...base.items[0], title }, ...base.items.slice(1)],
    });
    const attempt = participantAttemptProjectionSchema.parse({
      attemptId,
      activityId,
      status: "SALVA",
      version: 2,
      answers: [],
    });
    const journey = participantLearningJourneyProjectionSchema.parse({
      assignments: [],
      results: [],
      runtimes: [],
      activities: [
        {
          activityId,
          slug: activity.slug,
          title,
          status: "EM_ANDAMENTO",
          attemptId,
          attemptStatus: "SALVA",
          attemptVersion: 2,
          nextAction: "RETOMAR_ATIVIDADE",
        },
      ],
      nextAction: "RETOMAR_ATIVIDADE",
      nextActionTarget: { kind: "ACTIVITY", activityId },
    });
    const wires: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input, init) => {
        const path = String(input);
        if (path === "/api/v1/session/current")
          return success({ status: "active" });
        if (path === "/api/v1/feedback") return success({ tickets: [] });
        if (path === "/api/v1/learning-path") return success(journey);
        if (path === `/api/v1/activities/${activityId}`)
          return success(activity);
        if (path === `/api/v1/attempts/${attemptId}`) return success(attempt);
        if (path.startsWith("/api/v1/appeals?"))
          return success({ appeals: [] });
        if (path.endsWith("/answers") && init?.method === "POST") {
          wires.push(String(init.body));
          const payload = saveAnswerRequestSchema.parse(
            JSON.parse(String(init.body)),
          );
          return success(
            participantAttemptProjectionSchema.parse({
              ...attempt,
              version: 3,
              answers: [
                {
                  itemId: payload.itemId,
                  response: payload.response,
                  savedAt: at,
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
    const ui = await render(<HomePage />);
    const field = ui.getByRole("textbox", {
      name: `Resposta — ${title}`,
      exact: true,
    });
    await expect.element(field).toBeVisible();
    const card = document
      .getElementById(`answer-${itemId}`)!
      .closest(".item-card")!;
    const heading = card.querySelector("h2")!;
    const paragraph = card.querySelector("p")!;
    expect(heading.textContent).toBe(title);
    expect(paragraph.textContent).toBe(text);
    for (const element of [
      document.getElementById("activity-title")!,
      heading,
      paragraph,
      card.querySelector(".answer-area > label")!,
      ...document.querySelectorAll(".journey-activity-item strong"),
    ]) {
      const rect = element.getBoundingClientRect();
      expect(
        withinHorizontal(
          rect,
          document.querySelector("main.shell")!.getBoundingClientRect(),
          width,
        ),
      ).toBe(true);
      const glyphs = glyphRects(element);
      expect(glyphs.length).toBeGreaterThan(1);
      const paintContainer =
        element.closest(".item-card, .privacy-card, .journey-summary") ??
        document.querySelector("main.shell")!;
      const paintRect = paintContainer.getBoundingClientRect();
      for (const glyph of glyphs) {
        expect(withinHorizontal(glyph, rect, width)).toBe(true);
        expect(glyph.top).toBeGreaterThanOrEqual(paintRect.top - 1);
        expect(glyph.bottom).toBeLessThanOrEqual(paintRect.bottom + 1);
      }
    }
    await field.click();
    await field.fill("Resposta sintética R58.");
    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(card.querySelector("button"));
    await settleScrolling();
    const buttonRect = card.querySelector("button")!.getBoundingClientRect();
    expect(buttonRect.top).toBeGreaterThanOrEqual(0);
    expect(buttonRect.bottom).toBeLessThanOrEqual(window.innerHeight);
    await userEvent.keyboard("{Enter}");
    await expect
      .element(ui.getByText("Resposta salva.", { exact: true }))
      .toBeVisible();
    expect(wires).toHaveLength(1);
    expect(saveAnswerRequestSchema.parse(JSON.parse(wires[0]!))).toMatchObject({
      activityId,
      attemptId,
      itemId,
      response: "Resposta sintética R58.",
    });
    expect(heading.textContent).toBe(title);
    expect(paragraph.textContent).toBe(text);
  },
);
function fullDashboard() {
  const projection = dashboardProjectionSchema.parse({
    kind: "participant",
    nextAction: "RETOMAR_ATIVIDADE",
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
        competence: "Competência sintética",
        status: "EM_DESENVOLVIMENTO_DIGITAL",
        scorePercent: 50,
        lastEvaluatedAt: "2026-10-04T07:00:00.000Z",
        evidence: "AVALIACAO_MODULAR_DIGITAL",
        practicalCompetenceClaim: "PROIBIDO_MVP",
      },
    ],
    diagnosticProfile: (["B07-S1", "B07-S2", "B07-S3"] as const).map(
      (themeId) => ({
        themeId,
        themeLabel: "Tema sintético",
        status: "BASELINE_REGISTRADA",
        scorePercent: 50,
        answeredItemCount: 1,
        itemCount: 40,
        recommendedModuleIds: ["M01"],
        lastEvaluatedAt: "2026-10-04T07:00:00.000Z",
        evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
        notPunitive: true,
        noGlobalPassFail: true,
        practicalCompetenceClaim: "PROIBIDO_MVP",
      }),
    ),
    progress: {
      assignedActivities: 1,
      completedActivities: 0,
      progressPercent: 0,
      remediationObjectives: 0,
      retentionReviewsPending: 0,
      pendingCorrections: 0,
    },
  });
  if (projection.kind !== "participant")
    throw new Error("Expected synthetic participant dashboard");
  return projection;
}

it.each([false, true])(
  "R58 actual HomePage dashboard poison=%s obeys producer boundary",
  async (poison) => {
    const valid = fullDashboard();
    const marker = "SYNTHETIC_DASHBOARD_MARKER";
    const dashboard = poison
      ? {
          ...valid,
          profile: valid.profile.map((item) => ({
            ...item,
            source: marker,
            competence: marker,
          })),
        }
      : valid;
    expect(dashboardProjectionSchema.safeParse(dashboard).success).toBe(
      !poison,
    );
    const activity = bodyActivity("Caso sintético para verificar o dashboard.");
    const attempt = participantAttemptProjectionSchema.parse({
      attemptId,
      activityId,
      status: "SALVA",
      version: 2,
      answers: [],
    });
    const reads: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input) => {
        const path = String(input);
        reads.push(path);
        if (path === "/api/v1/session/current")
          return success({ status: "active" });
        if (path === "/api/v1/dashboard") return success(dashboard);
        if (path === "/api/v1/feedback") return success({ tickets: [] });
        if (path === "/api/v1/learning-path")
          return success(
            participantLearningJourneyProjectionSchema.parse({
              assignments: [],
              activities: [
                {
                  activityId,
                  slug: activity.slug,
                  title: activity.title,
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
            }),
          );
        if (path === `/api/v1/activities/${activityId}`)
          return success(activity);
        if (path === `/api/v1/attempts/${attemptId}`) return success(attempt);
        if (path.startsWith("/api/v1/appeals?"))
          return success({ appeals: [] });
        return new Response(
          JSON.stringify({ success: false, error: { code: "not_found" } }),
          { status: 404 },
        );
      }),
    );
    const ui = await render(<HomePage />);
    await expect.poll(() => reads.includes("/api/v1/dashboard")).toBe(true);
    await expect
      .element(
        ui.getByRole("heading", { name: "Caso sintético R54", exact: true }),
      )
      .toBeVisible();
    if (poison) {
      expect(document.body.textContent).not.toContain(marker);
      expect(document.querySelector(".profile-item")).toBeNull();
    } else {
      await expect
        .element(ui.getByText("Competência sintética", { exact: true }))
        .toBeVisible();
      expect(document.body.textContent).toContain("Tema sintético");
    }
  },
);
