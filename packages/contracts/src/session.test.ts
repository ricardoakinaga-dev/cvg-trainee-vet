import { describe, expect, it } from "vitest";

import {
  rotateSessionRequestSchema,
  sessionCurrentProjectionSchema,
} from "./session.js";

describe("current session projection", () => {
  it("accepts only the minimal public active-session signal", () => {
    expect(sessionCurrentProjectionSchema.parse({ status: "active" })).toEqual({
      status: "active",
    });
  });

  it("rejects identity and session material at the public boundary", () => {
    expect(() =>
      sessionCurrentProjectionSchema.parse({
        status: "active",
        accountId: "11111111-1111-4111-8111-111111111111",
      }),
    ).toThrow();
  });
});

describe("rotate session request", () => {
  it("uses the bounded one-hour default", () => {
    expect(rotateSessionRequestSchema.parse({})).toEqual({
      sessionExpiresInSeconds: 3600,
    });
  });

  it("accepts only the configured inclusive lifetime bounds", () => {
    expect(
      rotateSessionRequestSchema.parse({ sessionExpiresInSeconds: 60 }),
    ).toEqual({ sessionExpiresInSeconds: 60 });
    expect(
      rotateSessionRequestSchema.parse({ sessionExpiresInSeconds: 604_800 }),
    ).toEqual({ sessionExpiresInSeconds: 604_800 });
    expect(() =>
      rotateSessionRequestSchema.parse({ sessionExpiresInSeconds: 59 }),
    ).toThrow();
    expect(() =>
      rotateSessionRequestSchema.parse({ sessionExpiresInSeconds: 604_801 }),
    ).toThrow();
  });

  it("rejects extra fields and non-integral lifetimes", () => {
    expect(() =>
      rotateSessionRequestSchema.parse({
        sessionExpiresInSeconds: 3600.5,
      }),
    ).toThrow();
    expect(() =>
      rotateSessionRequestSchema.parse({
        sessionExpiresInSeconds: 3600,
        sessionId: "internal",
      }),
    ).toThrow();
  });
});
