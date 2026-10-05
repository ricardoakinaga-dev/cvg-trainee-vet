import { describe, expect, it } from "vitest";
import { saveAnswerRequestSchema } from "../../contracts/dist/assessment.js";
import { hasCanonicalChoiceResponseEncoding } from "./published-choice-response.js";

function orderedSelections(values: readonly string[]): readonly string[][] {
  const result: string[][] = [];
  function visit(
    prefix: readonly string[],
    remaining: readonly string[],
  ): void {
    if (prefix.length > 0) result.push([...prefix]);
    remaining.forEach((value, index) => {
      visit(
        [...prefix, value],
        remaining.filter((_value, other) => other !== index),
      );
    });
  }
  visit([], values);
  return result;
}

function acceptsWire(response: string): boolean {
  return saveAnswerRequestSchema.safeParse({
    activityId: "00000000-0000-4000-8000-000000000002",
    attemptId: "00000000-0000-4000-8000-000000000003",
    itemId: "00000000-0000-4000-8000-000000000004",
    response,
    idempotencyKey: "canonical-encoding-proof",
  }).success;
}

describe("published choice response encoding admission", () => {
  it.each([
    ["<", ">"],
    [">", "<"],
    ["before<", "after>"],
    ["quote<", "slash\\>"],
  ])(
    "denies a MULTIPLE catalog with at least one invalid ordered selection: %j",
    (...ids) => {
      const before = [...ids];
      expect(
        orderedSelections(ids).some(
          (selection) => !acceptsWire(JSON.stringify(selection)),
        ),
      ).toBe(true);
      expect(hasCanonicalChoiceResponseEncoding(ids, "MULTIPLE")).toBe(false);
      expect(ids).toEqual(before);
    },
  );
  it.each([
    ["alpha", "beta"],
    ["a<b", "plain"],
    ["a>b", "plain"],
    [">a<", "plain"],
    ['quoted"id', "slash\\id", "unicode-é"],
    ["x".repeat(32), "y".repeat(32)],
  ])(
    "preserves every canonical wire permutation of a safe MULTIPLE catalog: %j",
    (...ids) => {
      expect(
        hasCanonicalChoiceResponseEncoding(Object.freeze(ids), "MULTIPLE"),
      ).toBe(true);
      for (const selection of orderedSelections(ids)) {
        expect(acceptsWire(JSON.stringify(selection))).toBe(true);
      }
    },
  );
  it("preserves individually valid SINGLE keys even when their combined JSON would be invalid", () => {
    const ids = Object.freeze(["<", ">", ">a<", 'quoted"id']);
    expect(hasCanonicalChoiceResponseEncoding(ids, "SINGLE")).toBe(true);
    expect(ids.every(acceptsWire)).toBe(true);
  });
  it.each(["SINGLE", "MULTIPLE"] as const)(
    "rejects an individually invalid HTML key for %s",
    (mode) => {
      expect(acceptsWire("<id>")).toBe(false);
      expect(hasCanonicalChoiceResponseEncoding(["<id>", "plain"], mode)).toBe(
        false,
      );
    },
  );
  it("rejects an unknown mode without inferring it from private answer keys", () => {
    expect(
      hasCanonicalChoiceResponseEncoding(
        ["alpha", "beta"],
        "UNKNOWN" as "SINGLE",
      ),
    ).toBe(false);
  });
});
