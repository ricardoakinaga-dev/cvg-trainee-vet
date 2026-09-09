import { describe, expect, it } from "vitest";

import {
  errorResponse,
  statusByErrorCode,
  validationResponse,
} from "./errors.js";

describe("http error model", () => {
  it("maps every error code to its public status without leaking internals", () => {
    expect(statusByErrorCode).toMatchObject({
      unauthenticated: 401,
      forbidden: 403,
      not_found: 404,
      state_conflict: 409,
      idempotency_conflict: 409,
      validation_error: 422,
      rate_limited: 429,
      internal_error: 500,
    });
    for (const code of Object.keys(statusByErrorCode)) {
      const response = errorResponse(
        code as keyof typeof statusByErrorCode,
        "request-1",
      );
      expect(response.body).toMatchObject({
        success: false,
        error: { code },
      });
      expect(JSON.stringify(response.body)).not.toContain("stack");
      expect(JSON.stringify(response.body)).not.toContain("Error:");
    }
  });

  it("allows an explicit status override without changing the code", () => {
    const response = errorResponse("internal_error", "request-1", 503);
    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      error: { code: "internal_error" },
    });
  });

  it("builds validation errors with an optional field pointer", () => {
    const plain = validationResponse("request-1");
    expect(plain.status).toBe(422);
    const pointed = validationResponse("request-1", "scopeId");
    expect(pointed.body).toMatchObject({
      error: {
        code: "validation_error",
        details: [{ code: "invalid_input", field: "scopeId" }],
      },
    });
  });
});
