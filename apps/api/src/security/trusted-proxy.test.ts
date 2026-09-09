import { describe, expect, it } from "vitest";

import { resolveClientIp } from "./trusted-proxy.js";

describe("trusted proxy client ip", () => {
  it("ignores forwarded headers when no proxy is trusted (spoof-proof default)", () => {
    expect(
      resolveClientIp("203.0.113.7", {
        "x-forwarded-for": "198.51.100.9",
        "x-real-ip": "198.51.100.9",
        forwarded: "for=198.51.100.9",
      }),
    ).toBe("203.0.113.7");
  });

  it("honors the leftmost X-Forwarded-For entry from a trusted proxy", () => {
    expect(
      resolveClientIp(
        "10.0.0.1",
        { "x-forwarded-for": "198.51.100.9, 10.0.0.2" },
        ["10.0.0.1"],
      ),
    ).toBe("198.51.100.9");
  });

  it("prefers X-Forwarded-For over X-Real-IP and Forwarded", () => {
    expect(
      resolveClientIp(
        "10.0.0.1",
        {
          "x-forwarded-for": "198.51.100.9",
          "x-real-ip": "192.0.2.5",
          forwarded: "for=192.0.2.6",
        },
        ["10.0.0.1"],
      ),
    ).toBe("198.51.100.9");
  });

  it("falls back to X-Real-IP and Forwarded when XFF is absent", () => {
    expect(
      resolveClientIp("10.0.0.1", { "x-real-ip": "192.0.2.5" }, ["10.0.0.1"]),
    ).toBe("192.0.2.5");
    expect(
      resolveClientIp("10.0.0.1", { forwarded: "for=192.0.2.6" }, ["10.0.0.1"]),
    ).toBe("192.0.2.6");
  });

  it("handles IPv6 clients and IPv4-mapped addresses", () => {
    expect(resolveClientIp("::1", {})).toBe("127.0.0.1");
    expect(resolveClientIp("::ffff:203.0.113.7", {})).toBe("203.0.113.7");
    expect(
      resolveClientIp("2001:db8::1", { "x-forwarded-for": "2001:db8::9" }, [
        "2001:db8::1",
      ]),
    ).toBe("2001:db8::9");
  });

  it("falls back to the socket ip on malformed forwarded values", () => {
    expect(
      resolveClientIp("10.0.0.1", { "x-forwarded-for": "not-an-ip!!!" }, [
        "10.0.0.1",
      ]),
    ).toBe("10.0.0.1");
    expect(
      resolveClientIp("10.0.0.1", { forwarded: "for=unknown" }, ["10.0.0.1"]),
    ).toBe("10.0.0.1");
    expect(resolveClientIp("", {})).toBe("unknown");
  });
});
