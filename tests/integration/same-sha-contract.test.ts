import { describe, expect, it } from "vitest";

import { evaluateSameSha } from "../../scripts/same-sha.mjs";

const HEAD = "a".repeat(40);

function run(workflow, overrides = {}) {
  return {
    workflow,
    headSha: HEAD,
    status: "completed",
    conclusion: "success",
    ...overrides,
  };
}

describe("same-sha contract", () => {
  it("accepts green quality+security runs on the exact HEAD", () => {
    const evaluation = evaluateSameSha(HEAD, [run("quality"), run("security")]);
    expect(evaluation).toMatchObject({ ok: true });
  });

  it("rejects missing, mismatched, or non-green runs fail-closed", () => {
    expect(evaluateSameSha(HEAD, [run("quality")]).ok).toBe(false);
    expect(
      evaluateSameSha(HEAD, [
        run("quality"),
        run("security", { headSha: "b".repeat(40) }),
      ]).ok,
    ).toBe(false);
    expect(
      evaluateSameSha(HEAD, [
        run("quality"),
        run("security", { status: "in_progress", conclusion: null }),
      ]).ok,
    ).toBe(false);
    expect(
      evaluateSameSha(HEAD, [
        run("quality"),
        run("security", { conclusion: "failure" }),
      ]).ok,
    ).toBe(false);
    expect(evaluateSameSha("short", []).ok).toBe(false);
  });
});
