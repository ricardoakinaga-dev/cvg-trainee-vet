import { describe, expect, it } from "vitest";

import {
  parseTrustedProxyCidrs,
  resolveClientAddress,
} from "./client-address.js";

describe("trusted proxy client address resolution", () => {
  it("parses IPv4 and IPv6 CIDRs and rejects malformed ranges", () => {
    const ranges = parseTrustedProxyCidrs(["10.0.0.0/8", "2001:db8::/32"]);

    expect(ranges).toHaveLength(2);
    expect(ranges[0]?.family).toBe(4);
    expect(ranges[1]?.family).toBe(6);
    expect(() => parseTrustedProxyCidrs(["10.0.0.1"])).toThrow(
      "trustedProxyCidrs",
    );
    expect(() => parseTrustedProxyCidrs(["2001:db8::/129"])).toThrow(
      "trustedProxyCidrs",
    );
  });

  it("ignores forwarded headers from untrusted peers", () => {
    const ranges = parseTrustedProxyCidrs(["10.0.0.0/8"]);

    expect(resolveClientAddress("192.0.2.5", "203.0.113.9", ranges)).toBe(
      "192.0.2.5",
    );
    expect(resolveClientAddress(undefined, "203.0.113.9", ranges)).toBe(
      "unknown",
    );
  });

  it("walks a trusted proxy chain from right to left", () => {
    const ranges = parseTrustedProxyCidrs(["10.0.0.0/8"]);

    expect(
      resolveClientAddress("10.1.1.1", "203.0.113.9, 10.2.2.2", ranges),
    ).toBe("203.0.113.9");
    expect(resolveClientAddress("10.1.1.1", undefined, ranges)).toBe(
      "10.1.1.1",
    );
    expect(resolveClientAddress("10.1.1.1", "10.2.2.2", ranges)).toBe(
      "10.1.1.1",
    );
    expect(
      resolveClientAddress("10.1.1.1", "203.0.113.9, invalid", ranges),
    ).toBe("10.1.1.1");
  });

  it("supports IPv6 proxy chains and header arrays", () => {
    const ranges = parseTrustedProxyCidrs(["2001:db8::/32"]);

    expect(
      resolveClientAddress(
        "2001:db8::1",
        ["2001:db8::2", "2001:db8::3", "2001:db9::1"],
        ranges,
      ),
    ).toBe("2001:db9::1");
  });

  it("covers CIDR edge cases and fail-closed forwarded headers", () => {
    expect(parseTrustedProxyCidrs()).toEqual([]);
    expect(parseTrustedProxyCidrs(["0.0.0.0/0", "::/0"])).toHaveLength(2);
    expect(
      parseTrustedProxyCidrs([
        "10.0.0.1/32",
        "2001:db8:0:0:0:0:0:1/128",
        "::ffff:192.0.2.1/128",
      ]),
    ).toHaveLength(3);

    for (const cidr of [
      "10.0.0/8",
      "10.0.0.256/24",
      "10.0.0.1/not-a-number",
      "10.0.0.1/33",
      "2001:db8::/129",
      "2001:db8::1::2/64",
      "2001:db8::ffff:192.0.2.999/128",
    ]) {
      expect(() => parseTrustedProxyCidrs([cidr])).toThrow("trustedProxyCidrs");
    }

    const ranges = parseTrustedProxyCidrs(["10.0.0.0/8"]);
    expect(resolveClientAddress("10.1.1.1", ",10.2.2.2", ranges)).toBe(
      "10.1.1.1",
    );
    expect(resolveClientAddress("10.1.1.1", ["invalid"], ranges)).toBe(
      "10.1.1.1",
    );
    expect(resolveClientAddress("10.1.1.1", "10.2.2.2", [])).toBe("10.1.1.1");
    expect(
      resolveClientAddress("10.1.1.1", ["10.2.2.2", "10.3.3.3"], ranges),
    ).toBe("10.1.1.1");
  });
});
