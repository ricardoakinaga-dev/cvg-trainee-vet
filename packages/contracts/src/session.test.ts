import { describe, expect, it } from "vitest";

import { rotateSessionRequestSchema } from "./session.js";

describe("session contracts", () => {
  it("defaults a bounded rotation lifetime and rejects unknown fields", () => {
    expect(rotateSessionRequestSchema.parse({})).toEqual({
      sessionExpiresInSeconds: 3600,
    });
    expect(() =>
      rotateSessionRequestSchema.parse({
        sessionExpiresInSeconds: 60,
        token: "x",
      }),
    ).toThrow();
  });
});
