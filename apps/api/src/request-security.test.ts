import { describe, expect, it } from "vitest";

import {
  createRateLimiter,
  isCsrfAllowed,
  type RequestHeaders,
} from "./request-security.js";

describe("API request security", () => {
  it("allows a bounded burst and blocks until the window expires", () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 1_000 });
    const first = limiter.check("client-a", 1_000);
    const second = limiter.check("client-a", 1_001);
    const blocked = limiter.check("client-a", 1_002);
    const afterWindow = limiter.check("client-a", 2_001);

    expect(first).toMatchObject({ allowed: true, remaining: 1 });
    expect(second).toMatchObject({ allowed: true, remaining: 0 });
    expect(blocked).toMatchObject({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 1,
    });
    expect(afterWindow).toMatchObject({ allowed: true, remaining: 1 });
  });

  it("keeps rate-limit keys bounded and rejects invalid configuration", () => {
    expect(() => createRateLimiter({ maxRequests: 0 })).toThrow("maxRequests");
    expect(() => createRateLimiter({ windowMs: 0 })).toThrow("windowMs");

    const limiter = createRateLimiter({
      maxRequests: 1,
      windowMs: 100,
      maxKeys: 2,
    });
    limiter.check("client-a", 0);
    limiter.check("client-b", 0);
    limiter.check("client-c", 0);
    expect(limiter.size()).toBeLessThanOrEqual(2);
  });

  it("allows safe requests and same-site session mutations", () => {
    expect(isCsrfAllowed("GET", {}, ["http://web.internal"])).toBe(true);
    expect(
      isCsrfAllowed("POST", { cookie: "__Host-cvg_session=session" }, [
        "http://web.internal",
      ]),
    ).toBe(false);
    expect(
      isCsrfAllowed(
        "POST",
        {
          cookie: "__Host-cvg_session=session",
          origin: "http://web.internal",
        },
        ["http://web.internal"],
      ),
    ).toBe(true);
    expect(
      isCsrfAllowed(
        "POST",
        {
          cookie: "__Host-cvg_session=session",
          referer: "http://web.internal/activity",
        },
        ["http://web.internal"],
      ),
    ).toBe(true);
    expect(
      isCsrfAllowed(
        "POST",
        {
          cookie: "__Host-cvg_session=session",
          "sec-fetch-site": "same-site",
        },
        ["http://web.internal"],
      ),
    ).toBe(true);
  });

  it("rejects cross-origin and malformed request metadata", () => {
    const sessionHeaders: RequestHeaders = {
      cookie: "__Host-cvg_session=session",
    };
    expect(
      isCsrfAllowed("POST", { ...sessionHeaders, origin: "https://evil" }, [
        "http://web.internal",
      ]),
    ).toBe(false);
    expect(
      isCsrfAllowed("POST", { ...sessionHeaders, referer: "not-a-url" }, [
        "http://web.internal",
      ]),
    ).toBe(false);
    expect(
      isCsrfAllowed(
        "POST",
        { ...sessionHeaders, "sec-fetch-site": "cross-site" },
        ["http://web.internal"],
      ),
    ).toBe(false);
    expect(
      isCsrfAllowed(
        "POST",
        { ...sessionHeaders, origin: "http://web.internal/" },
        ["http://web.internal"],
      ),
    ).toBe(true);
  });
});
