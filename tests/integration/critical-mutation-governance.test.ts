import { describe, expect, it } from "vitest";

import {
  CRITICAL_MUTATION_CASES,
  summarizeMutationResults,
  validateMutationCase,
} from "../../scripts/verify-critical-mutation.mjs";

describe("critical mutation governance", () => {
  it("declares one executable mutation for every critical target", () => {
    expect(CRITICAL_MUTATION_CASES).toHaveLength(7);
    expect(CRITICAL_MUTATION_CASES.map(({ id }) => id)).toEqual([
      "NOTA",
      "PUBLICACAO",
      "PERMISSAO",
      "ESTADO",
      "IDEMPOTENCIA",
      "CONTRATO_ESTADO",
      "MATRIZ",
    ]);
  });

  it("rejects a replacement that is not unique in the source", () => {
    const errors = validateMutationCase(
      {
        id: "INVALID",
        path: "packages/domain/src/assessment-policy.ts",
        from: "return",
        to: "return",
        focalTests: [],
      },
      "return one; return two;",
    );

    expect(errors).toContain("mutation replacement must match exactly once");
  });

  it("requires at least 90 percent killed critical mutations", () => {
    expect(
      summarizeMutationResults([
        { id: "A", killed: true },
        { id: "B", killed: true },
        { id: "C", killed: true },
        { id: "D", killed: true },
        { id: "E", killed: true },
        { id: "F", killed: true },
        { id: "G", killed: false },
      ]),
    ).toMatchObject({
      mutationCount: 7,
      killedCount: 6,
      mutationScorePercent: 85.71,
      status: "FAIL",
    });
  });
});
