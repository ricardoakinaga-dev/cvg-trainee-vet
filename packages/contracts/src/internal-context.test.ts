import { describe, expect, it } from "vitest";

import { internalSessionScopesProjectionSchema } from "./internal-context.js";

describe("internal session context contract", () => {
  it("accepts only validated principal/session recovery bindings", () => {
    const data = {
      kind: "internal_session_scopes",
      scopes: [],
      recoveryContext: {
        principalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        sessionBinding: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      },
    };
    expect(internalSessionScopesProjectionSchema.parse(data)).toEqual(data);
    expect(() =>
      internalSessionScopesProjectionSchema.parse({
        ...data,
        recoveryContext: { ...data.recoveryContext, sessionBinding: "token" },
      }),
    ).toThrow();
    expect(() =>
      internalSessionScopesProjectionSchema.parse({
        ...data,
        recoveryContext: { ...data.recoveryContext, tokenHash: "synthetic" },
      }),
    ).toThrow();
  });
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
