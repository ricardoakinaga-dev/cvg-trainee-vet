import { afterEach, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import RecoveryPage from "../app/recovery/page";

const validToken = "a".repeat(32);

function setRecoveryUrl(search = ""): void {
  window.history.replaceState({}, document.title, `/recovery${search}`);
}

function jsonResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState({}, document.title, "/");
});

it.each([
  { label: "missing", search: "" },
  { label: "too short", search: "?token=short" },
  { label: "invalid characters", search: `?token=${"a".repeat(31)}!` },
  { label: "too long", search: `?token=${"a".repeat(257)}` },
])("rejects a $label token without calling the API", async ({ search }) => {
  setRecoveryUrl(search);
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<RecoveryPage />);

  await expect
    .element(screen.getByRole("alert"))
    .toHaveTextContent(
      "O link é inválido, expirou, foi revogado ou já foi utilizado.",
    );
  await expect
    .element(screen.getByRole("link", { name: "Voltar ao acesso" }))
    .toHaveAttribute("href", "/");
  expect(fetchMock).not.toHaveBeenCalled();
});

it("consumes a valid token and creates a session", async () => {
  setRecoveryUrl(`?token=${validToken}`);
  let resolveResponse!: (value: Response) => void;
  const pendingResponse = new Promise<Response>((resolve) => {
    resolveResponse = resolve;
  });
  const fetchMock = vi.fn<typeof fetch>().mockReturnValue(pendingResponse);
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<RecoveryPage />);

  await expect
    .element(screen.getByRole("heading", { name: "Validando o link…" }))
    .toBeVisible();
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/v1/recovery/accept",
    expect.objectContaining({
      method: "POST",
      credentials: "include",
      body: JSON.stringify({
        token: validToken,
        sessionExpiresInSeconds: 3600,
      }),
    }),
  );
  expect(window.location.search).toBe("");

  resolveResponse(
    jsonResponse(JSON.stringify({ success: true, data: { status: "active" } })),
  );

  await expect
    .element(screen.getByRole("heading", { name: "Acesso recuperado" }))
    .toBeVisible();
  await expect
    .element(screen.getByRole("link", { name: "Ir para a trilha" }))
    .toHaveAttribute("href", "/");
});

it.each([
  { label: "null payload", body: "null", status: 200 },
  { label: "array payload", body: "[]", status: 200 },
  { label: "primitive payload", body: "false", status: 200 },
  { label: "rejected envelope", body: '{"success":false}', status: 200 },
  {
    label: "missing data",
    body: '{"success":true,"data":null}',
    status: 200,
  },
  {
    label: "array data",
    body: '{"success":true,"data":[]}',
    status: 200,
  },
  {
    label: "inactive session",
    body: '{"success":true,"data":{"status":"expired"}}',
    status: 200,
  },
  { label: "malformed JSON", body: "{", status: 200 },
  {
    label: "HTTP rejection",
    body: '{"success":true,"data":{"status":"active"}}',
    status: 403,
  },
])("shows a safe error for $label", async ({ body, status }) => {
  setRecoveryUrl(`?token=${validToken}`);
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValue(jsonResponse(body, status));
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<RecoveryPage />);

  await expect
    .element(
      screen.getByRole("heading", {
        name: "Não foi possível recuperar o acesso",
      }),
    )
    .toBeVisible();
  await expect
    .element(screen.getByRole("link", { name: "Voltar ao acesso" }))
    .toHaveAttribute("href", "/");
});

it("shows a safe error when recovery cannot reach the API", async () => {
  setRecoveryUrl(`?token=${validToken}`);
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockRejectedValue(new Error("synthetic network failure"));
  vi.stubGlobal("fetch", fetchMock);

  const screen = await render(<RecoveryPage />);

  await expect
    .element(
      screen.getByRole("heading", {
        name: "Não foi possível recuperar o acesso",
      }),
    )
    .toBeVisible();
});
