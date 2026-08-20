import { describe, expect, it } from "vitest";

import type { ApiHttpRequest } from "./http-types.js";
import { readIdempotencyKey } from "./http-support.js";

function request(headers: ApiHttpRequest["headers"]): ApiHttpRequest {
  return Object.freeze({
    method: "POST",
    path: "/api/v1/test",
    body: null,
    ...(headers === undefined ? {} : { headers }),
  });
}

describe("HTTP idempotency boundary", () => {
  it("rejects keys shorter than the contract entropy floor", () => {
    expect(
      readIdempotencyKey(request({ "Idempotency-Key": "short-key" })),
    ).toBeNull();
  });

  it("accepts a bounded key with the contract entropy floor", () => {
    expect(
      readIdempotencyKey(request({ "Idempotency-Key": "authoring-key-2026" })),
    ).toBe("authoring-key-2026");
  });

  it("rejects malformed or oversized keys", () => {
    expect(
      readIdempotencyKey(request({ "Idempotency-Key": "invalid key" })),
    ).toBeNull();
    expect(
      readIdempotencyKey(request({ "Idempotency-Key": "a".repeat(129) })),
    ).toBeNull();
  });
});
