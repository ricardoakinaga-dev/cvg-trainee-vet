import { expect, test } from "@playwright/test";

test("redirects protected internal surfaces before a session cookie exists", async ({
  request,
  baseURL,
}) => {
  const origin = baseURL ?? "http://127.0.0.1:3100";
  for (const path of ["/operations", "/authoring"]) {
    const response = await request.get(`${origin}${path}`, {
      headers: { cookie: "" },
      maxRedirects: 0,
    });

    expect(response.status(), path).toBe(307);
    const location = new URL(response.headers().location ?? "", origin);
    expect(location.pathname, path).toBe("/");
    expect(location.search, path).toBe("?access=required");
  }
});
