import { describe, expect, it } from "vitest";

import { PersistenceMappingError } from "./attempt-repository.js";
import { assertIdempotencyKey } from "./idempotency-policy.js";

describe("persistence idempotency policy", () => {
  it("requires the same 16–128 character key floor as the API contract", () => {
    expect(() => assertIdempotencyKey("short-key")).toThrow(
      PersistenceMappingError,
    );
    expect(() => assertIdempotencyKey("key-2026-08-20-000001")).not.toThrow();
    expect(() => assertIdempotencyKey("a".repeat(129))).toThrow(
      PersistenceMappingError,
    );
  });

  it("rejects whitespace and unsupported key characters", () => {
    expect(() => assertIdempotencyKey("key-2026-08-20-000001 ")).toThrow(
      PersistenceMappingError,
    );
    expect(() => assertIdempotencyKey("key/2026-08-20-000001")).toThrow(
      PersistenceMappingError,
    );
  });
});
