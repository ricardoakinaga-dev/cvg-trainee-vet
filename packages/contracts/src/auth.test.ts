import { describe, expect, it } from "vitest";

import {
  activeSessionProjectionSchema,
  loginRequestSchema,
  passwordUpdateRequestSchema,
} from "./auth.js";

const validCredential = "Acesso-CVG-2026!Seguro";

describe("authentication contracts", () => {
  it("accepts a bounded credential login and applies the default lifetime", () => {
    expect(
      loginRequestSchema.parse({
        login: " trainee@cvg.example ",
        password: validCredential,
      }),
    ).toEqual({
      login: "trainee@cvg.example",
      password: validCredential,
      sessionExpiresInSeconds: 3600,
    });
  });

  it("rejects malformed or short credentials", () => {
    expect(
      loginRequestSchema.safeParse({
        login: "not-an-email",
        password: "short",
      }).success,
    ).toBe(false);
    expect(
      passwordUpdateRequestSchema.safeParse({
        currentPassword: "short",
        password: "short",
      }).success,
    ).toBe(false);
    expect(
      passwordUpdateRequestSchema.safeParse({
        currentPassword: validCredential,
        password: validCredential,
      }).success,
    ).toBe(false);
  });

  it("keeps the session projection intentionally minimal", () => {
    expect(activeSessionProjectionSchema.parse({ status: "active" })).toEqual({
      status: "active",
      canAccessAdmin: false,
    });
    expect(
      activeSessionProjectionSchema.parse({
        status: "active",
        canAccessAdmin: true,
      }),
    ).toEqual({
      status: "active",
      canAccessAdmin: true,
    });
    expect(
      activeSessionProjectionSchema.safeParse({
        status: "active",
        roles: ["ADMIN"],
      }).success,
    ).toBe(false);
  });
});
