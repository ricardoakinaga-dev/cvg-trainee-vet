import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AccountPage from "../app/account/page.js";
import AdminPage from "../app/admin/page.js";
import AuthoringPage from "../app/authoring/page.js";
import DashboardPage from "../app/dashboard/page.js";
import InvitePage from "../app/invite/page.js";
import RootLayout from "../app/layout.js";
import HomePage from "../app/page.js";
import ModeratorPage from "../app/moderator/page.js";
import OperationsPage, { isDependencyState } from "../app/operations/page.js";

describe("Next production page coverage", () => {
  it("renders the initial bounded state of every production entry surface", () => {
    const pages = [
      HomePage,
      AccountPage,
      AdminPage,
      AuthoringPage,
      DashboardPage,
      InvitePage,
      ModeratorPage,
      OperationsPage,
    ];

    for (const Page of pages) {
      const markup = renderToStaticMarkup(createElement(Page));
      expect(markup).toContain('id="main-content"');
    }

    const documentMarkup = renderToStaticMarkup(
      createElement(RootLayout, { children: createElement(HomePage) }),
    );
    expect(documentMarkup).toContain('lang="pt-BR"');
    expect(documentMarkup).toContain("Pular para o conteúdo principal");
  });

  it("accepts only redacted dependency projections", () => {
    expect(
      isDependencyState({
        status: "READY",
        dependencies: {
          postgres: "UP",
          qdrant: "DISABLED",
          ai: "DISABLED",
        },
      }),
    ).toBe(true);
    expect(
      isDependencyState({
        status: "READY",
        dependencies: { postgres: "UP", qdrant: "SECRET", ai: "DISABLED" },
      }),
    ).toBe(false);
    expect(isDependencyState(null)).toBe(false);
    expect(isDependencyState({ dependencies: {} })).toBe(false);
  });
});
