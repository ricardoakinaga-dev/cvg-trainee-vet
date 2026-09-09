import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { proxy } from "../proxy";

const sessionCookie = "__Host-cvg_session=synthetic-session";

function request(path: string, cookie?: string): NextRequest {
  return new NextRequest(`http://127.0.0.1:3100${path}`, {
    headers: {
      ...(cookie === undefined ? {} : { cookie }),
    },
  });
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify({
      success: status >= 200 && status < 300,
      data,
    }),
    {
      status,
      headers: { "content-type": "application/json" },
    },
  );
}

describe("server-side web proxy guard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("redirects anonymous access to protected internal surfaces", async () => {
    vi.stubEnv("CVG_API_INTERNAL_URL", "http://api.internal.test");

    const response = await proxy(request("/operations"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe("/");
    expect(location.search).toBe("?access=required");
  });

  it("allows a staff dashboard projection and forwards only the session cookie", async () => {
    vi.stubEnv("CVG_API_INTERNAL_URL", "http://api.internal.test/");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ kind: "staff", scopes: ["scope-1"] }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await proxy(request("/operations", sessionCookie));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.internal.test/api/v1/dashboard",
      expect.objectContaining({
        cache: "no-store",
        headers: { cookie: sessionCookie },
      }),
    );
  });

  it("strips unrelated cookies before calling the internal API", async () => {
    vi.stubEnv("CVG_API_INTERNAL_URL", "http://api.internal.test");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ kind: "staff", scopes: ["scope-1"] }));
    vi.stubGlobal("fetch", fetchMock);

    await proxy(
      request(
        "/operations",
        `${sessionCookie}; marketing=unrelated; __Host-cvg_other=other`,
      ),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.internal.test/api/v1/dashboard",
      expect.objectContaining({
        headers: { cookie: sessionCookie },
      }),
    );
  });

  it("rejects an empty scope in an otherwise staff-shaped projection", async () => {
    vi.stubEnv("CVG_API_INTERNAL_URL", "http://api.internal.test");
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse({ kind: "staff", scopes: [" "] })),
    );

    const response = await proxy(request("/operations", sessionCookie));

    expect(response.status).toBe(307);
  });

  it("allows an authoring scope projection only when at least one scope is returned", async () => {
    vi.stubEnv("CVG_API_INTERNAL_URL", "http://api.internal.test");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        jsonResponse({ kind: "internal_session_scopes", scopes: ["scope-1"] }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await proxy(request("/authoring", sessionCookie));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.internal.test/api/v1/internal/session/scopes",
      expect.objectContaining({ headers: { cookie: sessionCookie } }),
    );
  });

  it.each([401, 403, 500])(
    "fails closed for an upstream status %s",
    async (status) => {
      vi.stubEnv("CVG_API_INTERNAL_URL", "http://api.internal.test");
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, status)),
      );

      const response = await proxy(request("/operations", sessionCookie));

      expect(response.status).toBe(307);
    },
  );

  it("fails closed for an invalid projection or an unavailable upstream", async () => {
    vi.stubEnv("CVG_API_INTERNAL_URL", "http://api.internal.test");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ kind: "participant" }))
      .mockRejectedValueOnce(new Error("network unavailable"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      proxy(request("/operations", sessionCookie)),
    ).resolves.toMatchObject({
      status: 307,
    });
    await expect(
      proxy(request("/authoring", sessionCookie)),
    ).resolves.toMatchObject({
      status: 307,
    });
  });

  it("fails closed when production proxy configuration is absent", async () => {
    const response = await proxy(request("/authoring", sessionCookie));

    expect(response.status).toBe(307);
  });

  it("does not guard public or non-page paths", async () => {
    const response = await proxy(request("/"));

    expect(response.status).toBe(200);
  });
});
