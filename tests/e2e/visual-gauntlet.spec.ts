import { writeFile } from "node:fs/promises";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const routes = [
  { path: "/", slug: "home" },
  { path: "/diagnostic", slug: "diagnostic" },
  { path: "/operations", slug: "operations" },
  { path: "/authoring", slug: "authoring" },
  { path: "/recovery", slug: "recovery" },
] as const;

const viewports = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
] as const;

const rehydratedActivityId = "11111111-1111-4111-8111-111111111111";

const tabbableSelector =
  'a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"])';

function successEnvelope(data: unknown) {
  return {
    success: true,
    data,
    meta: { request_id: "visual-gauntlet" },
  };
}

function pagedSuccessEnvelope(data: unknown) {
  return {
    success: true,
    data,
    meta: { request_id: "visual-gauntlet", has_next: false },
  };
}

const visualScopeId = "22222222-2222-4222-8222-222222222222";

async function installAuthorizedInternalSurfaceFixtures(
  page: Page,
): Promise<void> {
  await page.route("**/health/dependencies", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          status: "READY",
          dependencies: { postgres: "UP", qdrant: "DISABLED", ai: "DISABLED" },
        }),
      ),
    });
  });
  await page.route("**/api/v1/dashboard", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          kind: "staff",
          scopes: [visualScopeId],
          generatedAt: "2026-08-26T12:05:00.000Z",
          metrics: {
            invitedParticipants: 0,
            activeParticipants: 0,
            inactiveParticipants: 0,
            assignedModules: 0,
            completedModules: 0,
            completionRatePercent: null,
            medianProgressPercent: null,
            pendingCorrections: 0,
            remediationParticipants: 0,
            retentionReviewsPending: 0,
            openFeedback: 0,
            content: { published: 0, inReview: 0, expired: 0, withdrawn: 0 },
          },
          participants: [],
        }),
      ),
    });
  });
  await page.route("**/api/v1/internal/session/scopes", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          kind: "internal_session_scopes",
          scopes: [visualScopeId],
        }),
      ),
    });
  });
  await page.route(
    "**/api/v1/internal/content/review-queue**",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            kind: "content_review_queue",
            scopeId: visualScopeId,
            generatedAt: "2026-08-26T12:05:00.000Z",
            filters: { scopeId: visualScopeId, limit: 50 },
            items: [],
          }),
        ),
      });
    },
  );
  await page.route(
    "**/api/v1/internal/reports/continuing-education**",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            kind: "continuing_education_report",
            scopeId: visualScopeId,
            generatedAt: "2026-08-26T12:05:00.000Z",
            filters: { scopeId: visualScopeId },
            summary: {
              participantCount: 0,
              invitedParticipants: 0,
              activeParticipants: 0,
              suspendedParticipants: 0,
              deactivatedParticipants: 0,
              assignedModules: 0,
              completedModules: 0,
              completionRatePercent: null,
              completedDigitalMinutes: 0,
              completedDigitalHours: 0,
            },
            participants: [],
            modules: [],
            pagination: {
              page: 1,
              pageSize: 25,
              totalParticipants: 0,
              totalPages: 0,
              hasNextPage: false,
            },
            learningEvidence: "ATIVIDADE_MODULAR_DIGITAL",
            hoursClaim: "NAO_CREDENCIADAS",
            practicalCompetenceClaim: "PROIBIDO_MVP",
          }),
        ),
      });
    },
  );
  await page.route(
    "**/api/v1/internal/reports/reflections**",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            kind: "reflection_management_aggregate",
            scopeId: visualScopeId,
            generatedAt: "2026-08-26T12:05:00.000Z",
            modules: [],
            evidence: "REFLEXAO_DIGITAL",
            practicalCompetenceClaim: "PROIBIDO_MVP",
          }),
        ),
      });
    },
  );
  await page.route("**/api/v1/internal/feedback**", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        pagedSuccessEnvelope({
          kind: "feedback_triage_queue",
          scopeId: visualScopeId,
          generatedAt: "2026-08-26T12:05:00.000Z",
          filters: { scopeId: visualScopeId, limit: 50 },
          items: [],
        }),
      ),
    });
  });
  await page.route(
    "**/api/v1/internal/appeals/review-queue**",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          pagedSuccessEnvelope({
            kind: "appeal_review_queue",
            scopeId: visualScopeId,
            generatedAt: "2026-08-26T12:05:00.000Z",
            filters: { scopeId: visualScopeId, limit: 50 },
            items: [],
          }),
        ),
      });
    },
  );
  await page.route("**/api/v1/audit**", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        pagedSuccessEnvelope({
          kind: "audit_trail",
          scopeId: visualScopeId,
          filters: { scopeId: visualScopeId, limit: 25 },
          items: [],
        }),
      ),
    });
  });
}

async function waitForVisualSettle(page: Page): Promise<void> {
  await expect
    .poll(
      async () =>
        page
          .locator(".topbar")
          .first()
          .evaluate((element) => {
            const style = getComputedStyle(element);
            return (
              style.opacity === "1" &&
              [...element.getAnimations()].every(
                (animation) => animation.playState === "finished",
              )
            );
          }),
      { timeout: 3_000 },
    )
    .toBe(true);
}

async function mockVisualStaffDashboard(page: Page): Promise<void> {
  await installAuthorizedInternalSurfaceFixtures(page);
}

test.describe("premium visual quality bar", () => {
  for (const viewport of viewports) {
    test(`keeps the route matrix usable at ${viewport.width}px`, async ({
      page,
    }, testInfo) => {
      const brokenAssets: string[] = [];
      const failedStylesheets: string[] = [];
      const failedCriticalRequests: string[] = [];
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      page.on("response", (response) => {
        if (/\/assets\//u.test(response.url()) && response.status() >= 400) {
          brokenAssets.push(`${response.status()} ${response.url()}`);
        }
        if (
          response.request().resourceType() === "stylesheet" &&
          response.status() >= 400
        ) {
          failedStylesheets.push(`${response.status()} ${response.url()}`);
        }
      });
      page.on("requestfailed", (request) => {
        if (
          ["document", "script", "stylesheet"].includes(request.resourceType())
        ) {
          failedCriticalRequests.push(
            `${request.resourceType()} ${request.url()} ${request.failure()?.errorText ?? "unknown"}`,
          );
        }
      });
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => {
        pageErrors.push(error.message);
      });
      await page.setViewportSize(viewport);
      await mockVisualStaffDashboard(page);

      for (const route of routes) {
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await page.goto(route.path);
        await expect(page.locator("h1").first()).toBeVisible();
        await waitForVisualSettle(page);
        const orbitDecoration = await page
          .locator(".shell")
          .first()
          .evaluate((element) => {
            const style = getComputedStyle(element, "::after");
            return {
              backgroundImage: style.backgroundImage,
              animationName: style.animationName,
              animationDuration: style.animationDuration,
              opacity: style.opacity,
            };
          });
        expect(orbitDecoration.backgroundImage).toContain(
          "cvg-orbit-render-v2.png",
        );
        expect(orbitDecoration.animationName).toContain("cvg-orbit-drift");
        expect(
          Number.parseFloat(orbitDecoration.animationDuration),
        ).toBeGreaterThan(0);
        expect(Number.parseFloat(orbitDecoration.opacity)).toBeGreaterThan(0);
        await page.evaluate(() => {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
        });

        const dimensions = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));
        expect(dimensions.scrollWidth).toBeLessThanOrEqual(
          dimensions.clientWidth,
        );

        const disabledSelectStates = await page
          .locator("select:disabled")
          .evaluateAll((elements) =>
            elements
              .filter((element) => element.getClientRects().length > 0)
              .map((element) => {
                const style = getComputedStyle(element);
                return {
                  color: style.color,
                  backgroundColor: style.backgroundColor,
                  backgroundImage: style.backgroundImage,
                  opacity: style.opacity,
                };
              }),
          );
        expect(
          disabledSelectStates.every(
            (state) =>
              state.color !== "rgb(128, 128, 128)" &&
              state.backgroundImage === "none" &&
              state.opacity === "1",
          ),
        ).toBe(true);

        const axeResults = await new AxeBuilder({ page }).analyze();
        expect(axeResults.violations).toEqual([]);

        await page.screenshot({
          path: testInfo.outputPath(`${route.slug}-${viewport.width}.png`),
          fullPage: true,
        });

        const skipLink = page.getByRole("link", {
          name: "Pular para o conteúdo principal",
        });
        await skipLink.focus();
        await page.keyboard.press("Enter");
        const skipTargetFocus = await page.evaluate(() => {
          const element = document.activeElement;
          if (!(element instanceof HTMLElement)) return null;
          const style = getComputedStyle(element);
          return {
            id: element.id,
            outlineStyle: style.outlineStyle,
            outlineWidth: style.outlineWidth,
            boxShadow: style.boxShadow,
          };
        });
        expect(skipTargetFocus?.id).toBe("main-content");
        expect(
          skipTargetFocus?.outlineStyle !== "none" ||
            skipTargetFocus?.outlineWidth !== "0px" ||
            skipTargetFocus?.boxShadow !== "none",
        ).toBe(true);
        await page.locator(tabbableSelector).first().focus();

        const tabbableCount = await page
          .locator(tabbableSelector)
          .evaluateAll((elements) => {
            const usable = elements.filter((element) => {
              if (!(element instanceof HTMLElement)) return false;
              const style = getComputedStyle(element);
              return (
                !element.matches(":disabled") &&
                element.getAttribute("aria-hidden") !== "true" &&
                style.visibility !== "hidden" &&
                style.display !== "none" &&
                element.getClientRects().length > 0
              );
            });
            const radioGroups = new Map<string, HTMLInputElement[]>();
            for (const element of usable) {
              if (
                element instanceof HTMLInputElement &&
                element.type === "radio"
              ) {
                const key = `${element.form?.id ?? "document"}:${element.name}`;
                const group = radioGroups.get(key) ?? [];
                group.push(element);
                radioGroups.set(key, group);
              }
            }
            return usable.filter((element) => {
              if (
                !(element instanceof HTMLInputElement) ||
                element.type !== "radio"
              ) {
                return true;
              }
              const key = `${element.form?.id ?? "document"}:${element.name}`;
              const group = radioGroups.get(key) ?? [];
              const checked = group.find((radio) => radio.checked);
              if (checked !== undefined) return element === checked;
              return element === group[0];
            }).length;
          });
        expect(tabbableCount).toBeGreaterThan(0);
        let keyboardStops = 0;
        const distinctFocusStops = new Set<string>();
        for (let index = 0; index <= tabbableCount; index += 1) {
          await page.keyboard.press("Tab");
          const focusState = await page.evaluate((selector) => {
            const element = document.activeElement;
            if (!(element instanceof HTMLElement)) return null;
            const style = getComputedStyle(element);
            const domIndex = [...document.querySelectorAll(selector)].indexOf(
              element,
            );
            return {
              tagName: element.tagName,
              id: element.id,
              name: element.getAttribute("name"),
              text: element.textContent?.trim().slice(0, 80),
              domIndex,
              visible: element.getClientRects().length > 0,
              outlineStyle: style.outlineStyle,
              outlineWidth: style.outlineWidth,
              boxShadow: style.boxShadow,
            };
          }, tabbableSelector);
          if (focusState?.tagName === "BODY") break;
          expect(focusState).not.toBeNull();
          expect(focusState?.visible).toBe(true);
          distinctFocusStops.add(
            [
              focusState?.tagName,
              focusState?.id,
              focusState?.name,
              focusState?.text,
              focusState?.domIndex,
            ]
              .map((value) => value ?? "")
              .join("|"),
          );
          const hasFocusTreatment =
            focusState?.outlineStyle !== "none" ||
            focusState?.outlineWidth !== "0px" ||
            focusState?.boxShadow !== "none";
          if (!hasFocusTreatment) {
            throw new Error(
              `missing focus treatment on ${route.path} stop ${index + 1}: ${JSON.stringify(focusState)}`,
            );
          }
          keyboardStops += 1;
        }
        expect(
          keyboardStops,
          `${route.path} skipped an available keyboard target`,
        ).toBeGreaterThanOrEqual(Math.max(0, tabbableCount - 1));
        if (keyboardStops > 1) {
          expect(
            distinctFocusStops.size,
            `${route.path} exposed ${keyboardStops} keyboard stops but only ${distinctFocusStops.size} distinct focus targets`,
          ).toBeGreaterThan(1);
        }

        await page.emulateMedia({ reducedMotion: "reduce" });
        const motionViolations = await page.evaluate(() => {
          const durationInSeconds = (value: string): number => {
            const amount = Number.parseFloat(value);
            if (!Number.isFinite(amount)) return 0;
            return value.trim().endsWith("ms") ? amount / 1_000 : amount;
          };
          return [...document.querySelectorAll<HTMLElement>("*")]
            .filter((element) => {
              const style = getComputedStyle(element);
              return (
                (style.animationName !== "none" &&
                  durationInSeconds(style.animationDuration) > 0.001) ||
                durationInSeconds(style.transitionDuration) > 0.001 ||
                (style.animationName !== "none" && style.transform !== "none")
              );
            })
            .map((element) => {
              const style = getComputedStyle(element);
              return {
                tagName: element.tagName,
                id: element.id,
                className: element.className,
                animationName: style.animationName,
                animationDuration: style.animationDuration,
                transitionDuration: style.transitionDuration,
                transform: style.transform,
              };
            });
        });
        expect(motionViolations).toEqual([]);
        const reducedMotionOrbit = await page
          .locator(".shell")
          .first()
          .evaluate((element) => {
            const style = getComputedStyle(element, "::after");
            const durationInSeconds = (value: string): number => {
              const amount = Number.parseFloat(value);
              if (!Number.isFinite(amount)) return 0;
              return value.trim().endsWith("ms") ? amount / 1_000 : amount;
            };
            return {
              animationDuration: durationInSeconds(style.animationDuration),
              transform: style.transform,
            };
          });
        expect(reducedMotionOrbit.animationDuration).toBeLessThanOrEqual(0.001);
        expect(reducedMotionOrbit.transform).toBe("none");
      }

      expect(brokenAssets).toEqual([]);
      expect(failedStylesheets).toEqual([]);
      expect(failedCriticalRequests).toEqual([]);
      expect(
        consoleErrors.filter(
          (message) => !/Failed to load resource/u.test(message),
        ),
      ).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  }
});

test("gives the operational surface a direct section index", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockVisualStaffDashboard(page);
  for (const endpoint of [
    "**/api/v1/internal/reports/continuing-education**",
    "**/api/v1/internal/reports/reflections**",
    "**/api/v1/internal/feedback**",
    "**/api/v1/internal/appeals/review-queue**",
    "**/api/v1/audit**",
  ]) {
    await page.route(endpoint, async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { code: "synthetic_unavailable", message: "synthetic" },
        }),
      });
    });
  }
  await page.goto("/operations");

  const navigation = page.getByRole("navigation", {
    name: "Atalhos da operação",
  });
  await expect(navigation).toBeVisible();
  const laneTitles = page.locator(
    '[data-testid="staff-dashboard"] .operations-lane-heading h3',
  );
  await expect(laneTitles).toHaveCount(3);
  await expect(laneTitles.nth(0)).toHaveText("Visão do programa");
  await expect(laneTitles.nth(1)).toHaveText("Ações que pedem atenção");
  await expect(laneTitles.nth(2)).toHaveText("Controles e entrada");
  await expect(navigation).toHaveCSS("position", "sticky");

  const links = navigation.getByRole("link");
  await expect(links).toHaveCount(8);
  await expect(links.nth(0)).toHaveAttribute("href", "#management-title");
  await expect(links.nth(1)).toHaveAttribute("href", "#invite-title");
  await expect(links.nth(2)).toHaveAttribute("href", "#participants-title");
  await expect(links.nth(7)).toHaveAttribute("href", "#audit-trail-title");
  await expect(links.nth(0)).toHaveClass(/operations-rail-primary/u);

  const railLayout = await navigation
    .locator(".operations-rail-links")
    .evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        links: [...element.querySelectorAll("a")].map((link) => {
          const linkBounds = link.getBoundingClientRect();
          return {
            left: linkBounds.left,
            right: linkBounds.right,
            top: linkBounds.top,
            visible: linkBounds.width > 0 && linkBounds.height > 0,
          };
        }),
        containerLeft: bounds.left,
        containerRight: bounds.right,
      };
    });
  expect(railLayout.scrollWidth).toBeLessThanOrEqual(railLayout.clientWidth);
  expect(railLayout.links.every((link) => link.visible)).toBe(true);
  expect(
    railLayout.links.every(
      (link) =>
        link.left >= railLayout.containerLeft - 1 &&
        link.right <= railLayout.containerRight + 1,
    ),
  ).toBe(true);
  const railTargetHeights = await navigation
    .locator(".operations-rail-links a")
    .evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().height),
    );
  expect(Math.min(...railTargetHeights)).toBeGreaterThanOrEqual(44);

  const metricColumns = await page
    .locator('[data-testid="staff-dashboard"] .dashboard-metrics')
    .first()
    .evaluate(
      (element) =>
        getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/u)
          .length,
    );
  expect(metricColumns).toBe(2);

  const rowCounts = new Map<number, number>();
  for (const link of railLayout.links) {
    const row = Math.round(link.top);
    rowCounts.set(row, (rowCounts.get(row) ?? 0) + 1);
  }
  expect([...rowCounts.values()]).toEqual([2, 2, 2, 2]);

  const readability = await page.evaluate(() => {
    const selectors = [
      ".dashboard-summary",
      ".metric-card span",
      ".operations-rail-links a",
    ];
    const elements = selectors.map((selector) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (element === null)
        throw new Error(`missing typography target: ${selector}`);
      return element;
    });
    const metrics = elements.map((element) => {
      const style = getComputedStyle(element);
      const fontSize = Number.parseFloat(style.fontSize);
      const lineHeight = Number.parseFloat(style.lineHeight);
      return {
        fontSize,
        lineHeightRatio: lineHeight / fontSize,
      };
    });
    return {
      minFontSize: Math.min(...metrics.map((metric) => metric.fontSize)),
      minLineHeightRatio: Math.min(
        ...metrics.map((metric) => metric.lineHeightRatio),
      ),
    };
  });
  expect(readability.minFontSize).toBeGreaterThanOrEqual(14);
  expect(readability.minLineHeightRatio).toBeGreaterThanOrEqual(1.4);

  const alertLayout = await page
    .locator(".management-card .error-panel")
    .first()
    .evaluate((element) => {
      const style = getComputedStyle(element);
      const button = element.querySelector("button");
      return {
        columns: style.gridTemplateColumns.trim().split(/\s+/u).length,
        buttonRatio:
          button === null
            ? 0
            : button.getBoundingClientRect().width / element.clientWidth,
      };
    });
  expect(alertLayout.columns).toBe(1);
  expect(alertLayout.buttonRatio).toBeGreaterThan(0.75);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
});

test("stacks dense authoring controls on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockVisualStaffDashboard(page);
  await page.goto("/authoring");
  const authoringToolsToggle = page.getByRole("button", {
    name: "Criar ou abrir um item",
  });
  await expect(authoringToolsToggle).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Criar rascunho sintético" }),
  ).toHaveCount(0);
  await authoringToolsToggle.click();
  await expect(
    page.getByRole("heading", { name: "Criar rascunho sintético" }),
  ).toBeVisible();
  await expect(authoringToolsToggle).toHaveAttribute("aria-expanded", "true");
  await waitForVisualSettle(page);

  const gridLayout = await page.locator(".draft-form").evaluate((form) => {
    const readColumns = (selector: string): number => {
      const element = form.querySelector<HTMLElement>(selector);
      if (element === null) throw new Error(`missing grid: ${selector}`);
      return getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/u)
        .length;
    };
    return {
      draftColumns: readColumns(":scope > .draft-grid"),
      choiceColumns: readColumns(":scope > .draft-fieldset .draft-choice-grid"),
    };
  });

  expect(gridLayout.draftColumns).toBe(1);
  expect(gridLayout.choiceColumns).toBe(1);
  const typography = await page.locator(".draft-form").evaluate((form) => {
    const elements = [
      ...form.querySelectorAll<HTMLElement>(
        "label, legend, input, select, textarea",
      ),
    ];
    return Math.min(
      ...elements.map((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      ),
    );
  });
  expect(typography).toBeGreaterThanOrEqual(14);
  const surfaceContrast = await page.locator(".draft-form").evaluate((form) => {
    const alpha = (color: string): number => {
      const match = color.match(/rgba?\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/u);
      return match === null ? 1 : Number(match[1]);
    };
    const field = form.querySelector<HTMLElement>("input");
    if (field === null) throw new Error("missing authoring form field");
    return {
      formBackgroundAlpha: alpha(getComputedStyle(form).backgroundColor),
      fieldBorderAlpha: alpha(getComputedStyle(field).borderColor),
    };
  });
  expect(surfaceContrast.formBackgroundAlpha).toBeGreaterThanOrEqual(0.9);
  expect(surfaceContrast.fieldBorderAlpha).toBeGreaterThanOrEqual(0.2);

  const grouping = await page.locator(".draft-form").evaluate((form) => {
    const alpha = (color: string): number => {
      if (color.startsWith("rgba")) {
        const value = Number.parseFloat(color.split(",")[3] ?? "0");
        return Number.isFinite(value) ? value : 0;
      }
      return color === "transparent" ? 0 : 1;
    };
    return [
      ...form.querySelectorAll<HTMLElement>(
        ":scope > .draft-grid, :scope > .draft-fieldset",
      ),
    ].map((element) => {
      const style = getComputedStyle(element);
      return {
        backgroundAlpha: alpha(style.backgroundColor),
        borderRadius: Number.parseFloat(style.borderTopLeftRadius),
        padding: Number.parseFloat(style.paddingTop),
      };
    });
  });
  expect(grouping.length).toBeGreaterThanOrEqual(3);
  expect(grouping.every((group) => group.backgroundAlpha >= 0.2)).toBe(true);
  expect(grouping.every((group) => group.borderRadius >= 12)).toBe(true);
  expect(grouping.every((group) => group.padding >= 12)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
});

test("keeps operations sections scanable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockVisualStaffDashboard(page);
  await page.goto("/operations");
  await expect(
    page.getByRole("heading", { name: "Participação digital da trilha" }),
  ).toBeVisible();

  const lanePresentation = await page
    .locator('[data-testid="staff-dashboard"] .operations-lane')
    .evaluateAll((lanes) =>
      lanes.map((lane) => {
        const heading = lane.querySelector<HTMLElement>(
          ".operations-lane-heading h3",
        );
        const style = getComputedStyle(lane);
        return {
          heading: heading?.textContent?.trim() ?? "",
          headingSize:
            heading === null || heading === undefined
              ? 0
              : Number.parseFloat(getComputedStyle(heading).fontSize),
          padding: Number.parseFloat(style.paddingLeft),
        };
      }),
    );

  expect(lanePresentation).toHaveLength(3);
  expect(lanePresentation.map((lane) => lane.heading)).toEqual([
    "Visão do programa",
    "Ações que pedem atenção",
    "Controles e entrada",
  ]);
  expect(lanePresentation.every((lane) => lane.headingSize >= 23)).toBe(true);
  expect(lanePresentation.every((lane) => lane.padding >= 12)).toBe(true);

  const tableScrollHint = await page
    .locator('[data-testid="staff-dashboard"] .dashboard-table-wrap')
    .first()
    .evaluate((element) => getComputedStyle(element, "::before").content);
  expect(tableScrollHint).toContain("Deslize");

  const durableSurfaces = await page
    .locator(
      '[data-testid="staff-dashboard"] .dashboard-empty, [data-testid="staff-dashboard"] .dashboard-table-wrap, [data-testid="staff-dashboard"] .metric-card',
    )
    .evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element);
        return {
          backgroundAlpha: style.backgroundColor,
          borderRadius: Number.parseFloat(style.borderTopLeftRadius),
          padding: Number.parseFloat(style.paddingTop),
        };
      }),
    );
  expect(durableSurfaces.length).toBeGreaterThanOrEqual(5);
  expect(durableSurfaces.every((surface) => surface.borderRadius >= 12)).toBe(
    true,
  );
  expect(durableSurfaces.every((surface) => surface.padding >= 12)).toBe(true);

  const freshBadges = await page
    .locator(".dashboard-panel-freshness")
    .evaluateAll(
      (elements) =>
        elements.filter((element) => element.getClientRects().length > 0)
          .length,
    );
  expect(freshBadges).toBeLessThanOrEqual(1);

  const tableTypography = await page
    .locator(".dashboard-table")
    .first()
    .evaluate((table) => {
      const bodyCell = table.querySelector<HTMLElement>("tbody td");
      const headCell = table.querySelector<HTMLElement>("thead th");
      if (bodyCell === null || headCell === null) return null;
      return {
        bodySize: Number.parseFloat(getComputedStyle(bodyCell).fontSize),
        headSize: Number.parseFloat(getComputedStyle(headCell).fontSize),
      };
    });
  expect(tableTypography).not.toBeNull();
  expect(tableTypography?.bodySize).toBeGreaterThanOrEqual(14);
  expect(tableTypography?.headSize).toBeGreaterThanOrEqual(12);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("makes focus and disclosure states explicit", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockVisualStaffDashboard(page);

  await page.goto("/authoring");
  const authoringToolsToggle = page.getByRole("button", {
    name: "Criar ou abrir um item",
  });
  await authoringToolsToggle.focus();
  const authoringFocus = await authoringToolsToggle.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outline: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
    };
  });
  expect(
    authoringFocus.outline !== "none" ||
      authoringFocus.outlineWidth !== "0px" ||
      authoringFocus.boxShadow !== "none",
  ).toBe(true);
  await authoringToolsToggle.click();
  await expect(authoringToolsToggle).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("heading", { name: "Criar rascunho sintético" }),
  ).toBeVisible();

  await page.goto("/operations");
  const operationsPrimary = page.getByRole("link", { name: /Visão geral/u });
  await operationsPrimary.focus();
  const operationsFocus = await operationsPrimary.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outline: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
    };
  });
  expect(
    operationsFocus.outline !== "none" ||
      operationsFocus.outlineWidth !== "0px" ||
      operationsFocus.boxShadow !== "none",
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("keeps invalid recovery state actionable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/recovery");
  await expect(
    page.getByRole("heading", { name: "Não foi possível recuperar o acesso" }),
  ).toBeVisible();

  const returnLink = page.getByRole("link", { name: "Voltar ao acesso" });
  await expect(returnLink).toHaveAttribute("href", "/");
  await expect(returnLink).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("keeps the rehydrated participant activity stacked on mobile", async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedCriticalRequests: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("requestfailed", (request) => {
    if (["document", "script", "stylesheet"].includes(request.resourceType())) {
      failedCriticalRequests.push(
        `${request.resourceType()} ${request.url()} ${request.failure()?.errorText ?? "unknown"}`,
      );
    }
  });
  await page.route("**/api/v1/session/current", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(successEnvelope({ status: "active" })),
    });
  });
  await page.route("**/api/v1/feedback", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(successEnvelope({ tickets: [] })),
    });
  });
  await page.route("**/api/v1/learning-path", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          assignments: [],
          activities: [
            {
              activityId: rehydratedActivityId,
              slug: "emergencia-v1",
              title: "Emergência e priorização",
              status: "EM_ANDAMENTO",
              nextAction: "RETOMAR_ATIVIDADE",
            },
          ],
          results: [],
          runtimes: [],
          nextActionTarget: {
            kind: "ACTIVITY",
            activityId: rehydratedActivityId,
          },
          nextAction: "RETOMAR_ATIVIDADE",
        }),
      ),
    });
  });
  await page.route(
    `**/api/v1/activities/${rehydratedActivityId}`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            activityId: rehydratedActivityId,
            slug: "emergencia-v1",
            title: "Emergência e priorização",
            items: [
              {
                itemId: "33333333-3333-4333-8333-333333333333",
                ordinal: 1,
                kind: "QUESTAO",
                title: "Primeiro sinal",
                text: "Qual achado deve orientar a primeira priorização digital?",
                responseMode: "CHOICE",
                selectionMode: "SINGLE",
                choices: [
                  { id: "a", label: "A", text: "Risco imediato" },
                  { id: "b", label: "B", text: "Ordem de chegada" },
                ],
              },
              {
                itemId: "44444444-4444-4444-8444-444444444444",
                ordinal: 2,
                kind: "REFLEXAO",
                title: "Justifique a sequência",
                text: "Registre a justificativa da próxima ação.",
                responseMode: "TEXT",
              },
            ],
          }),
        ),
      });
    },
  );

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`/?activityId=${rehydratedActivityId}`);
    await expect(
      page.getByRole("heading", { name: "Emergência e priorização" }).first(),
    ).toBeVisible();
    await expect(page.getByText("Sessão restaurada.")).toBeVisible();
    await expect(page.getByLabel("Token de convite")).toHaveCount(0);
    await waitForVisualSettle(page);
    await expect(new AxeBuilder({ page }).analyze()).resolves.toMatchObject({
      violations: [],
    });

    const layout = await page.evaluate(() => {
      const content = document.querySelector<HTMLElement>(".content-column");
      const privacy = document.querySelector<HTMLElement>(".privacy-card");
      if (content === null || privacy === null) return null;
      const contentRect = content.getBoundingClientRect();
      const privacyRect = privacy.getBoundingClientRect();
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        contentBottom: contentRect.bottom,
        privacyTop: privacyRect.top,
      };
    });
    expect(layout).not.toBeNull();
    expect(layout?.scrollWidth).toBeLessThanOrEqual(layout?.clientWidth ?? 0);
    if (viewport.width === 390) {
      expect(layout?.privacyTop).toBeGreaterThanOrEqual(
        layout?.contentBottom ?? 0,
      );
    }
    await page.screenshot({
      path: testInfo.outputPath(`authenticated-${viewport.width}.png`),
      fullPage: true,
    });
  }
  expect(failedCriticalRequests).toEqual([]);
  expect(
    consoleErrors.filter(
      (message) => !/Failed to load resource/u.test(message),
    ),
  ).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("renders loading, empty and success state variants without visual regressions", async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedCriticalRequests: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("requestfailed", (request) => {
    if (["document", "script", "stylesheet"].includes(request.resourceType())) {
      failedCriticalRequests.push(
        `${request.resourceType()} ${request.url()} ${request.failure()?.errorText ?? "unknown"}`,
      );
    }
  });
  const token = "v".repeat(32);
  let releaseRecovery: (() => void) | undefined;
  const recoveryPending = new Promise<void>((resolve) => {
    releaseRecovery = resolve;
  });
  let releaseJourney: (() => void) | undefined;
  const journeyPending = new Promise<void>((resolve) => {
    releaseJourney = resolve;
  });

  await page.route("**/api/v1/recovery/accept", async (route) => {
    await recoveryPending;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(successEnvelope({ status: "active" })),
    });
  });
  await page.goto(`/recovery?token=${token}`);
  await expect(
    page.getByRole("heading", { name: "Validando o link…" }),
  ).toBeVisible();
  await waitForVisualSettle(page);
  await expect(new AxeBuilder({ page }).analyze()).resolves.toMatchObject({
    violations: [],
  });
  await page.screenshot({
    path: testInfo.outputPath("state-recovery-loading.png"),
    fullPage: true,
  });

  releaseRecovery?.();
  await expect(
    page.getByRole("heading", { name: "Acesso recuperado" }),
  ).toBeVisible();
  await waitForVisualSettle(page);
  await page.screenshot({
    path: testInfo.outputPath("state-recovery-success.png"),
    fullPage: true,
  });

  await page.route("**/api/v1/session/current", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(successEnvelope({ status: "active" })),
    });
  });
  await page.route("**/api/v1/feedback", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(successEnvelope({ tickets: [] })),
    });
  });
  await page.route("**/api/v1/learning-path", async (route) => {
    await journeyPending;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          assignments: [],
          activities: [],
          results: [],
          runtimes: [],
          nextAction: "CONSULTAR_PROXIMO_PASSO",
        }),
      ),
    });
  });
  await page.goto("/");
  await expect(page.getByTestId("journey-loading")).toBeVisible();
  await expect(
    page.getByTestId("journey-loading").getByRole("status"),
  ).toContainText("Aguarde enquanto buscamos");
  await page.screenshot({
    path: testInfo.outputPath("state-home-loading.png"),
    fullPage: true,
  });
  releaseJourney?.();
  await expect(page.getByTestId("empty-state")).toBeVisible();
  await waitForVisualSettle(page);
  await expect(new AxeBuilder({ page }).analyze()).resolves.toMatchObject({
    violations: [],
  });
  await page.screenshot({
    path: testInfo.outputPath("state-home-empty.png"),
    fullPage: true,
  });

  const diagnosticItems = Array.from({ length: 120 }, (_, index) => {
    const ordinal = index + 1;
    return {
      itemId: `00000000-0000-4000-8000-${String(ordinal).padStart(12, "0")}`,
      ordinal,
      title: `Questão sintética ${ordinal}`,
      text: `Escolha a alternativa segura para o item ${ordinal}.`,
      responseMode: "CHOICE" as const,
      selectionMode: "SINGLE" as const,
      choices: [
        { id: "A", label: "A", text: "Alternativa sintética A." },
        { id: "B", label: "B", text: "Alternativa sintética B." },
      ],
    };
  });
  await page.route(
    "**/api/v1/diagnostics/b07/sessions/current",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            sessionId: "11111111-1111-4111-8111-111111111111",
            diagnosticId: "B07-DIAGNOSTIC-V1",
            diagnosticVersion: "0.1.0",
            version: 3,
            status: "FINALIZADA",
            startedAt: "2026-08-26T12:00:00.000Z",
            lastCheckpointAt: "2026-08-26T12:04:00.000Z",
            finalizedAt: "2026-08-26T12:05:00.000Z",
            itemCount: 120,
            answeredItemCount: 1,
            currentOrdinal: null,
            items: diagnosticItems,
            answers: [
              {
                itemId: diagnosticItems[0]?.itemId,
                selectedChoiceIds: ["A"],
              },
            ],
            result: {
              completedAt: "2026-08-26T12:05:00.000Z",
              themes: [
                {
                  themeId: "B07-S1",
                  themeLabel: "Núcleo clínico e segurança",
                  status: "BASELINE_REGISTRADA",
                  scorePercent: 100,
                  answeredItemCount: 1,
                  itemCount: 40,
                  lastEvaluatedAt: "2026-08-26T12:05:00.000Z",
                  evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
                  notPunitive: true,
                  noGlobalPassFail: true,
                  practicalCompetenceClaim: "PROIBIDO_MVP",
                },
                {
                  themeId: "B07-S2",
                  themeLabel: "Emergência e priorização",
                  status: "SEM_EVIDENCIA_DIGITAL",
                  scorePercent: null,
                  answeredItemCount: 0,
                  itemCount: 40,
                  evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
                  notPunitive: true,
                  noGlobalPassFail: true,
                  practicalCompetenceClaim: "PROIBIDO_MVP",
                },
                {
                  themeId: "B07-S3",
                  themeLabel: "Internação, monitoramento e integração",
                  status: "SEM_EVIDENCIA_DIGITAL",
                  scorePercent: null,
                  answeredItemCount: 0,
                  itemCount: 40,
                  evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
                  notPunitive: true,
                  noGlobalPassFail: true,
                  practicalCompetenceClaim: "PROIBIDO_MVP",
                },
              ],
            },
            nextAction: "CONTINUAR_TRILHA",
          }),
        ),
      });
    },
  );
  await page.goto("/diagnostic");
  await expect(page.getByTestId("diagnostic-result")).toBeVisible();
  await waitForVisualSettle(page);
  await expect(new AxeBuilder({ page }).analyze()).resolves.toMatchObject({
    violations: [],
  });
  await page.screenshot({
    path: testInfo.outputPath("state-diagnostic-populated.png"),
    fullPage: true,
  });

  const scopeId = "22222222-2222-4222-8222-222222222222";
  const contentId = "33333333-3333-4333-8333-333333333333";
  await page.route("**/api/v1/internal/session/scopes", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({ kind: "internal_session_scopes", scopes: [scopeId] }),
      ),
    });
  });
  await page.route(
    "**/api/v1/internal/content/review-queue**",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          successEnvelope({
            kind: "content_review_queue",
            scopeId,
            generatedAt: "2026-08-26T12:05:00.000Z",
            filters: { scopeId, limit: 50 },
            items: [
              {
                contentId,
                version: 1,
                scopeId,
                moduleId: "M02",
                sessionId: "M02-S1",
                title: "Prioridade sintética",
                authorId: "44444444-4444-4444-8444-444444444444",
                status: "EM_REVISAO_CLINICA",
                preflight: {
                  technicalChecksPassed: true,
                  checkedAt: "2026-08-26T12:05:00.000Z",
                },
                canOpenAuthoring: true,
                updatedAt: "2026-08-26T12:05:00.000Z",
                nextAction: "REVISAR_CLINICAMENTE",
              },
            ],
          }),
        ),
      });
    },
  );
  await page.goto("/authoring");
  await expect(page.getByText("Prioridade sintética").first()).toBeVisible();
  await waitForVisualSettle(page);
  await expect(new AxeBuilder({ page }).analyze()).resolves.toMatchObject({
    violations: [],
  });
  await page.screenshot({
    path: testInfo.outputPath("state-authoring-populated.png"),
    fullPage: true,
  });

  const participantId = "55555555-5555-4555-8555-555555555555";
  await page.route("**/api/v1/internal/**", async (route) => {
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: { code: "forbidden", message: "synthetic redaction" },
      }),
    });
  });
  await page.route("**/api/v1/audit**", async (route) => {
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: { code: "forbidden", message: "synthetic redaction" },
      }),
    });
  });
  await page.route("**/health/dependencies", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          status: "READY",
          dependencies: { postgres: "UP", qdrant: "DISABLED", ai: "DISABLED" },
        }),
      ),
    });
  });
  await page.route("**/api/v1/dashboard", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        successEnvelope({
          kind: "staff",
          scopes: [scopeId],
          generatedAt: "2026-08-26T12:05:00.000Z",
          metrics: {
            invitedParticipants: 1,
            activeParticipants: 1,
            inactiveParticipants: 0,
            assignedModules: 12,
            completedModules: 7,
            completionRatePercent: 58,
            medianProgressPercent: 58,
            pendingCorrections: 2,
            remediationParticipants: 1,
            retentionReviewsPending: 1,
            openFeedback: 1,
            content: { published: 24, inReview: 3, expired: 0, withdrawn: 0 },
          },
          participants: [
            {
              participantId,
              professionalEmail: "participante.sintetico@example.test",
              accountStatus: "ACTIVE",
              scopeIds: [scopeId],
              lastSeenAt: "2026-08-26T12:00:00.000Z",
              progress: {
                assignedModules: 12,
                completedModules: 7,
                progressPercent: 58,
                remediationModules: 1,
                retentionReviewsPending: 1,
              },
              pendingCorrections: 2,
              openFeedback: 1,
              nextAction: "CONCLUIR_MODULO",
              diagnosticProfile: [
                {
                  themeId: "B07-S1",
                  themeLabel: "Núcleo clínico e segurança",
                  status: "BASELINE_REGISTRADA",
                  scorePercent: 100,
                  answeredItemCount: 40,
                  itemCount: 40,
                  recommendedModuleIds: ["M01"],
                  lastEvaluatedAt: "2026-08-26T12:05:00.000Z",
                  evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
                  notPunitive: true,
                  noGlobalPassFail: true,
                  practicalCompetenceClaim: "PROIBIDO_MVP",
                },
                {
                  themeId: "B07-S2",
                  themeLabel: "Emergência e priorização",
                  status: "SEM_EVIDENCIA_DIGITAL",
                  scorePercent: null,
                  answeredItemCount: 0,
                  itemCount: 40,
                  recommendedModuleIds: ["M02"],
                  evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
                  notPunitive: true,
                  noGlobalPassFail: true,
                  practicalCompetenceClaim: "PROIBIDO_MVP",
                },
                {
                  themeId: "B07-S3",
                  themeLabel: "Internação, monitoramento e integração",
                  status: "SEM_EVIDENCIA_DIGITAL",
                  scorePercent: null,
                  answeredItemCount: 0,
                  itemCount: 40,
                  recommendedModuleIds: ["M03"],
                  evidence: "DIAGNOSTICO_FORMATIVO_DIGITAL",
                  notPunitive: true,
                  noGlobalPassFail: true,
                  practicalCompetenceClaim: "PROIBIDO_MVP",
                },
              ],
            },
          ],
        }),
      ),
    });
  });
  await page.goto("/operations");
  await expect(page.getByTestId("operations-ready")).toBeVisible();
  await expect(
    page.getByText("participante.sintetico@example.test"),
  ).toBeVisible();
  await waitForVisualSettle(page);
  await expect(new AxeBuilder({ page }).analyze()).resolves.toMatchObject({
    violations: [],
  });
  await page.screenshot({
    path: testInfo.outputPath("state-operations-populated.png"),
    fullPage: true,
  });
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 195, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await waitForVisualSettle(page);
    const responsiveTargets = await page.evaluate(() => {
      const visible = (element: Element) => {
        if (!(element instanceof HTMLElement)) return false;
        const style = getComputedStyle(element);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          !element.closest(".visually-hidden") &&
          element.getClientRects().length > 0
        );
      };
      const targetElements = new Set<HTMLElement>();
      for (const element of document.querySelectorAll<HTMLElement>(
        'a[href],button,select,textarea,input:not([type="radio"]):not([type="checkbox"]),input[type="radio"],input[type="checkbox"],label:has(input[type="radio"]),label:has(input[type="checkbox"]),.draft-radio-label,.draft-checkbox-label',
      )) {
        if (!visible(element)) continue;
        const target = element.matches(
          'input[type="radio"],input[type="checkbox"]',
        )
          ? (element.closest("label") ?? element)
          : element;
        if (target instanceof HTMLElement && visible(target)) {
          targetElements.add(target);
        }
      }
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        undersizedTargets: [...targetElements]
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              label: element.textContent?.trim().slice(0, 60) ?? element.id,
              width: rect.width,
              height: rect.height,
            };
          })
          .filter((target) => target.width < 40 || target.height < 40),
      };
    });
    expect(responsiveTargets.scrollWidth).toBeLessThanOrEqual(
      responsiveTargets.clientWidth,
    );
    expect(responsiveTargets.undersizedTargets).toEqual([]);
  }

  expect(failedCriticalRequests).toEqual([]);
  expect(
    consoleErrors.filter(
      (message) => !/Failed to load resource/u.test(message),
    ),
  ).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("keeps interaction targets and reflow healthy under frontend stress", async ({
  page,
}, testInfo) => {
  await mockVisualStaffDashboard(page);
  await page.addInitScript(() => {
    const state = window as Window & {
      __cvgCumulativeLayoutShift?: number;
      __cvgLargestContentfulPaint?: number;
    };
    state.__cvgCumulativeLayoutShift = 0;
    state.__cvgLargestContentfulPaint = undefined;
    if ("PerformanceObserver" in window) {
      try {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries.at(-1);
          if (last !== undefined) {
            state.__cvgLargestContentfulPaint = last.startTime;
          }
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutShift = entry as PerformanceEntry & {
              hadRecentInput?: boolean;
              value?: number;
            };
            if (!layoutShift.hadRecentInput) {
              state.__cvgCumulativeLayoutShift =
                (state.__cvgCumulativeLayoutShift ?? 0) +
                (layoutShift.value ?? 0);
            }
          }
        }).observe({ type: "layout-shift", buffered: true });
      } catch {
        // Chromium may expose no paint/shift observers in headless mode.
      }
    }
  });

  const evidence: Array<Record<string, unknown>> = [];
  for (const route of routes) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route.path);
    await expect(page.locator("h1").first()).toBeVisible();
    await page.waitForTimeout(120);

    const baseline = await page.evaluate(() => {
      const visible = (element: Element) => {
        if (!(element instanceof HTMLElement)) return false;
        const style = getComputedStyle(element);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          !element.closest(".visually-hidden") &&
          element.getClientRects().length > 0
        );
      };
      const targetElements = new Set<HTMLElement>();
      for (const element of document.querySelectorAll<HTMLElement>(
        'a[href],button,select,textarea,input:not([type="radio"]):not([type="checkbox"]),input[type="radio"],input[type="checkbox"],label:has(input[type="radio"]),label:has(input[type="checkbox"]),.draft-radio-label,.draft-checkbox-label',
      )) {
        if (!visible(element)) continue;
        const target = element.matches(
          'input[type="radio"],input[type="checkbox"]',
        )
          ? (element.closest("label") ?? element)
          : element;
        if (target instanceof HTMLElement && visible(target)) {
          targetElements.add(target);
        }
      }
      const targets = [...targetElements].map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label: element.textContent?.trim().slice(0, 60) ?? element.id,
          width: rect.width,
          height: rect.height,
        };
      });
      const resources = performance
        .getEntriesByType("resource")
        .map((entry) => entry as PerformanceResourceTiming)
        .map((entry) => ({
          name: new URL(entry.name, window.location.href).pathname,
          bytes: entry.transferSize,
        }));
      const navigation = performance.getEntriesByType("navigation")[0] as
        PerformanceNavigationTiming | undefined;
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        h1Count: document.querySelectorAll("h1").length,
        undersizedTargets: targets.filter(
          (target) => target.width < 40 || target.height < 40,
        ),
        largestResource: resources.reduce(
          (largest, resource) =>
            resource.bytes > largest.bytes ? resource : largest,
          { name: "none", bytes: 0 },
        ),
        resourceBytes: resources.reduce(
          (total, resource) => total + resource.bytes,
          0,
        ),
        domComplete: navigation?.domComplete ?? null,
        responseStart: navigation?.responseStart ?? null,
        lcp:
          (window as Window & { __cvgLargestContentfulPaint?: number })
            .__cvgLargestContentfulPaint ?? null,
        cls:
          (window as Window & { __cvgCumulativeLayoutShift?: number })
            .__cvgCumulativeLayoutShift ?? null,
      };
    });

    expect(baseline.h1Count).toBe(1);
    expect(baseline.scrollWidth).toBeLessThanOrEqual(baseline.clientWidth);
    expect(baseline.undersizedTargets).toEqual([]);
    expect(baseline.largestResource.bytes).toBeLessThan(2_000_000);
    expect(baseline.resourceBytes).toBeLessThan(4_000_000);
    expect(baseline.cls).toBeLessThan(0.1);

    await page.setViewportSize({ width: 195, height: 844 });
    const zoomed = await page.evaluate(() => {
      const visible = (element: Element) => {
        if (!(element instanceof HTMLElement)) return false;
        const style = getComputedStyle(element);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          element.getClientRects().length > 0 &&
          !element.closest(".visually-hidden")
        );
      };
      const clippedElements = [
        ...document.querySelectorAll<HTMLElement>("main *"),
      ]
        .filter(visible)
        .filter((element) => {
          const scrollContainer = element.closest<HTMLElement>(
            ".dashboard-table-wrap",
          );
          return !(
            scrollContainer !== null &&
            scrollContainer.scrollWidth > scrollContainer.clientWidth
          );
        })
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName,
            className: element.className.toString().slice(0, 80),
            left: rect.left,
            right: rect.right,
          };
        })
        .filter(
          ({ left, right }) => left < -1 || right > window.innerWidth + 1,
        );
      return {
        viewportWidth: window.innerWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        h1Visible: document.querySelector("h1")?.getClientRects().length ?? 0,
        clippedElements,
      };
    });
    expect(zoomed.scrollWidth).toBeLessThanOrEqual(zoomed.clientWidth);
    expect(zoomed.h1Visible).toBeGreaterThan(0);
    expect(zoomed.clippedElements).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`stress-zoom-${route.slug}.png`),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });

    await page.screenshot({
      path: testInfo.outputPath(`stress-${route.slug}.png`),
      fullPage: true,
    });
    const longCopy = await page.evaluate(() => {
      const suffix =
        " Texto sintético adicional para verificar medida, quebra, densidade e recuperação em uma viewport estreita.".repeat(
          6,
        );
      const target = [...document.querySelectorAll<HTMLElement>("main p")].find(
        (element) =>
          !element.classList.contains("eyebrow") &&
          element.getClientRects().length > 0,
      );
      if (target !== undefined) {
        target.textContent = `${target.textContent}${suffix}`;
      }
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        targetChanged: target !== undefined,
      };
    });
    expect(longCopy.targetChanged).toBe(true);
    expect(longCopy.scrollWidth).toBeLessThanOrEqual(longCopy.clientWidth);
    await page.screenshot({
      path: testInfo.outputPath(`stress-long-copy-${route.slug}.png`),
      fullPage: true,
    });
    evidence.push({ route: route.path, baseline, zoomed, longCopy });
  }

  await page.evaluate(() => {
    document.documentElement.style.zoom = "";
  });
  await page.screenshot({
    path: testInfo.outputPath("stress-final.png"),
    fullPage: true,
  });
  await writeFile(
    testInfo.outputPath("frontend-stress-evidence.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        capturedAt: new Date().toISOString(),
        browser: "Playwright Chromium",
        routes: evidence,
      },
      null,
      2,
    ),
  );
  expect(evidence).toHaveLength(routes.length);
});
