import { describe, expect, it } from "vitest";

import {
  correctOpenResponseRequestSchema,
  correctionResultProjectionSchema,
} from "./correction.js";

const request = {
  scopeId: "11111111-1111-4111-8111-111111111111",
  idempotencyKey: "correct-2026-08-09",
  score: 82,
  outcome: "APROVADO" as const,
  feedback: "Feedback formativo interno.",
  ruleVersion: "rubrica-v1",
};

describe("correction contracts", () => {
  it("accepts bounded plain-text correction input and public result", () => {
    expect(correctOpenResponseRequestSchema.parse(request)).toEqual(request);
    expect(
      correctionResultProjectionSchema.parse({
        attemptStatus: "CORRIGIDA_HUMANAMENTE",
        attemptVersion: 5,
        resultVersion: 1,
        score: 82,
        outcome: "APROVADO",
        feedback: request.feedback,
      }),
    ).toMatchObject({ resultVersion: 1 });
  });

  it("rejects HTML, out-of-range score, and extra fields", () => {
    expect(() =>
      correctOpenResponseRequestSchema.parse({
        ...request,
        idempotencyKey: "short",
      }),
    ).toThrow();
    expect(() =>
      correctOpenResponseRequestSchema.parse({
        ...request,
        feedback: "<script>x</script>",
      }),
    ).toThrow();
    expect(() =>
      correctOpenResponseRequestSchema.parse({ ...request, score: 101 }),
    ).toThrow();
    expect(() =>
      correctOpenResponseRequestSchema.parse({ ...request, internal: true }),
    ).toThrow();
  });
});
