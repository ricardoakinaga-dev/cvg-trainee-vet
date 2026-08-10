import { describe, expect, it } from "vitest";

import {
  apiErrorResponse,
  apiSuccessResponse,
  parsePaginationQuery,
} from "./api.js";

describe("versioned API contracts", () => {
  it("creates an immutable success envelope with a request id", () => {
    const response = apiSuccessResponse(
      { status: "SALVA", count: 1 },
      "request-123",
    );

    expect(response).toEqual({
      success: true,
      data: { status: "SALVA", count: 1 },
      meta: { request_id: "request-123" },
    });
    expect(Object.isFrozen(response)).toBe(true);
  });

  it("returns stable public error messages without internal details", () => {
    const response = apiErrorResponse("internal_error", "request-123", [
      { code: "database_timeout", field: "internal" },
    ]);

    expect(response).toEqual({
      success: false,
      error: {
        code: "internal_error",
        message: "Não foi possível concluir a solicitação.",
        details: [{ code: "database_timeout", field: "internal" }],
      },
      meta: { request_id: "request-123" },
    });
    expect(JSON.stringify(response)).not.toContain("stack");
    expect(JSON.stringify(response)).not.toContain("SQL");
  });

  it("parses bounded pagination defaults and rejects arbitrary sorting", () => {
    expect(parsePaginationQuery({})).toEqual({ page: 1, per_page: 20 });
    expect(parsePaginationQuery({ page: "2", per_page: "100" })).toEqual({
      page: 2,
      per_page: 100,
    });
    expect(() => parsePaginationQuery({ per_page: "101" })).toThrow();
    expect(() => parsePaginationQuery({ sort: "password" })).toThrow();
  });
});
