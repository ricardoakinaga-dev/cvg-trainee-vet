import { describe, expect, it } from "vitest";

import { normalizeIpAddress, resolveClientIp } from "./trusted-proxy.js";

/**
 * AAA-FINAL-003 — Coverage margin hardening (trusted proxy parsing).
 *
 * Risco: spoof de IP (bypass de rate-limit por identidade, auditoria
 * errada). Branches: IPv6/port stripping, mapped, forwarded parsing.
 * Comportamento: normalização e seleção de IP observáveis.
 */
describe("proxy branch closure — normalization", () => {
  it("strips brackets and ports from IP literals", () => {
    expect(normalizeIpAddress("[::1]:8080")).toBe("::1");
    expect(normalizeIpAddress("[2001:db8::1]:443")).toBe("2001:db8::1");
    expect(normalizeIpAddress("[1.2.3.4]")).toBe("1.2.3.4");
    expect(normalizeIpAddress("1.2.3.4:8080")).toBe("1.2.3.4");
  });

  it("rejects malformed mapped, compressed and oversized inputs", () => {
    expect(normalizeIpAddress("::ffff:999.1.1.1")).toBeNull();
    expect(normalizeIpAddress("1::2::3")).toBeNull();
    expect(normalizeIpAddress("1:2:3:4:5:6:7:8:9")).toBeNull();
    expect(normalizeIpAddress("1.2.3.4:999999")).toBeNull();
    expect(normalizeIpAddress(`1.2.3.${"4".repeat(60)}`)).toBeNull();
    expect(normalizeIpAddress("   ")).toBeNull();
  });

  it("accepts full IPv6 and lowercases it", () => {
    expect(normalizeIpAddress("2001:DB8::1")).toBe("2001:db8::1");
    expect(normalizeIpAddress("2001:0db8:0000:0000:0000:ff00:0042:8329")).toBe(
      "2001:0db8:0000:0000:0000:ff00:0042:8329",
    );
    expect(normalizeIpAddress("::1")).toBe("127.0.0.1");
    expect(normalizeIpAddress("::ffff:10.0.0.8")).toBe("10.0.0.8");
  });
});

describe("proxy branch closure — client resolution", () => {
  it("parses quoted and multi-segment Forwarded headers", () => {
    expect(
      resolveClientIp(
        "127.0.0.1",
        { forwarded: 'for="203.0.113.7:4711";proto=http' },
        ["127.0.0.1"],
      ),
    ).toBe("203.0.113.7");
    expect(
      resolveClientIp("127.0.0.1", { forwarded: "for=unknown" }, ["127.0.0.1"]),
    ).toBe("127.0.0.1");
    expect(
      resolveClientIp("127.0.0.1", { forwarded: "for=" }, ["127.0.0.1"]),
    ).toBe("127.0.0.1");
  });

  it("skips empty XFF entries and untrusted sockets", () => {
    // Leftmost-only: an empty first entry falls back to the socket instead
    // of scanning the list (no list-smuggling).
    expect(
      resolveClientIp("127.0.0.1", { "x-forwarded-for": " , 203.0.113.9" }, [
        "127.0.0.1",
      ]),
    ).toBe("127.0.0.1");
    expect(
      resolveClientIp("198.51.100.9", { "x-forwarded-for": "203.0.113.9" }, []),
    ).toBe("198.51.100.9");
    expect(resolveClientIp("not-an-ip", {}, [])).toBe("unknown");
  });
});
