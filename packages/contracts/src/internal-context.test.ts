import { describe, expect, it } from "vitest";

import { internalSessionScopesProjectionSchema } from "./internal-context.js";

describe("internal session context contract", () => {
  it("accepts only bounded UUID memberships", () => {
    expect(
      internalSessionScopesProjectionSchema.parse({
        kind: "internal_session_scopes",
        scopes: ["11111111-1111-4111-8111-111111111111"],
      }),
    ).toEqual({
      kind: "internal_session_scopes",
      scopes: ["11111111-1111-4111-8111-111111111111"],
    });
  });

  it("rejects unknown fields and malformed memberships", () => {
    expect(() =>
      internalSessionScopesProjectionSchema.parse({
        kind: "internal_session_scopes",
        scopes: ["not-a-uuid"],
      }),
    ).toThrow();
    expect(() =>
      internalSessionScopesProjectionSchema.parse({
        kind: "internal_session_scopes",
        scopes: [],
        principalId: "internal-only",
      }),
    ).toThrow();
  });
});
