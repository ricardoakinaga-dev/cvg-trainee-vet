import { describe, expect, it } from "vitest";

import { assertPublicProjection } from "./public-boundary.js";

describe("assertPublicProjection", () => {
  it("accepts participant-safe content", () => {
    expect(() =>
      assertPublicProjection({
        title: "Avaliação clínica organizada",
        case: { species: "fictícia", feedback: "Revise a prioridade." },
        progress: { completed: 2 },
      }),
    ).not.toThrow();
  });

  it("rejects internal fields at any nesting level", () => {
    expect(() =>
      assertPublicProjection({
        title: "Conteúdo CVG",
        metadata: { source_record_id: "internal-only" },
      }),
    ).toThrow("source_record_id");
  });

  it("rejects case-insensitive leaks in arrays", () => {
    expect(() =>
      assertPublicProjection([
        { prompt: "internal" },
        { Answer_Key: "hidden" },
      ]),
    ).toThrow("Answer_Key");
  });
});
