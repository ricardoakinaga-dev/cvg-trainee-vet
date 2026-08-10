import { describe, expect, it } from "vitest";

import { contentTransitionRequestSchema } from "./content.js";

describe("content workflow contract", () => {
  it("accepts a versioned scoped transition", () => {
    expect(
      contentTransitionRequestSchema.parse({
        version: 1,
        scopeId: "22222222-2222-4222-8222-222222222222",
        event: "PUBLICAR",
      }),
    ).toEqual({
      version: 1,
      scopeId: "22222222-2222-4222-8222-222222222222",
      event: "PUBLICAR",
    });
  });

  it("rejects arbitrary fields and invalid workflow events", () => {
    expect(() =>
      contentTransitionRequestSchema.parse({
        version: 1,
        scopeId: "22222222-2222-4222-8222-222222222222",
        event: "PUBLICAR",
        participantText: "não deve entrar na borda",
      }),
    ).toThrow();
    expect(() =>
      contentTransitionRequestSchema.parse({
        version: 0,
        scopeId: "not-a-uuid",
        event: "AUTO_PUBLICAR",
      }),
    ).toThrow();
  });
});
