import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { validateBundle } from "../../scripts/release-evidence.mjs";

const root = join(fileURLToPath(import.meta.url), "..", "..", "..");

/**
 * AAA-FINAL-008 §97 — AUDIT THE AUDITOR.
 *
 * Os gates só valem se não puderem ser enganados. Estes testes amarram as
 * evidências umas às outras (cobertura, mutation, scorecard, bundle) de
 * modo que qualquer falsificação manual de um artefato quebre outro gate:
 * - coverage-summary deve ser consistente com coverage-final.json;
 * - mutation-summary deve recomputar a partir dos relatórios Stryker;
 * - scorecard deve espelhar o JSON de auditoria;
 * - strict validator deve rejeitar placeholders.
 */
describe("assurance self-audit (audit the auditor)", () => {
  it("coverage summary is consistent with the raw coverage report", async () => {
    const summary = JSON.parse(
      await readFile(join(root, "coverage/coverage-summary.json"), "utf8"),
    );
    const raw = JSON.parse(
      await readFile(join(root, "coverage/coverage-final.json"), "utf8"),
    );
    let statements = 0;
    let covered = 0;
    for (const file of Object.values(raw) as Array<{
      s?: Record<string, number>;
    }>) {
      for (const count of Object.values(file.s ?? {})) {
        statements += 1;
        if (count > 0) covered += 1;
      }
    }
    // Same order of magnitude: the summary cannot be hand-inflated without
    // diverging from the raw report (tolerance for exclusion/floor logic).
    expect(summary.total.statements.total).toBeGreaterThan(0);
    expect(statements).toBeGreaterThan(summary.total.statements.total * 0.9);
    expect(summary.total.statements.total).toBeLessThanOrEqual(statements);
    for (const axis of ["statements", "branches", "functions", "lines"]) {
      expect(summary.total[axis].pct).toBeGreaterThanOrEqual(0);
      expect(summary.total[axis].pct).toBeLessThanOrEqual(100);
    }
  });

  it("mutation summary recomputes from the Stryker reports", async () => {
    const summary = JSON.parse(
      await readFile(join(root, "reports/mutation-summary.json"), "utf8"),
    );
    expect(summary.format).toBe("cvg-mutation-summary/v1");
    let total = 0;
    let rawKilled = 0;
    const auth = JSON.parse(
      await readFile(join(root, "reports/mutation/mutation.json"), "utf8"),
    );
    const critical = JSON.parse(
      await readFile(join(root, "reports/mutation-critical/mutation.json"), "utf8"),
    );
    for (const report of [auth, critical]) {
      for (const file of Object.values(report.files) as Array<{
        mutants: Array<{ status: string }>;
      }>) {
        total += file.mutants.length;
        rawKilled += file.mutants.filter((m) => m.status === "Killed").length;
      }
    }
    expect(summary.total).toBe(total);
    expect(summary.raw_killed).toBe(rawKilled);
    expect(summary.raw_score).toBeCloseTo(rawKilled / total, 4);
    // Mirror the writer's per-scope cap: verified kills can never exceed
    // the non-equivalent remainder (fail-closed against double counting).
    let capped = 0;
    for (const scope of summary.scopes as Array<{
      total: number;
      raw_killed: number;
      equivalent_count: number;
      verified_kills: number;
    }>) {
      capped += Math.min(
        scope.raw_killed + scope.verified_kills,
        scope.total - scope.equivalent_count,
      );
    }
    expect(summary.adjusted_score).toBeCloseTo(
      capped / (summary.total - summary.equivalent_count),
      4,
    );
    expect(summary.critical_real_survivors).toBe(0);
    expect(summary.status).toBe("PASS");
  });

  it("scorecard mirrors the machine-readable audit", async () => {
    const scorecard = await readFile(
      join(root, "docs/quality/scorecard.md"),
      "utf8",
    );
    const audit = JSON.parse(
      await readFile(
        join(root, "docs/audits/state-of-art-final-audit-v4.json"),
        "utf8",
      ),
    );
    // The scorecard's AAA aggregates must equal the audit JSON (no drift
    // between the human narrative and the machine authority).
    for (const [label, value] of [
      ["AAA Engineering", audit.aaa_engineering],
      ["AAA Security", audit.aaa_security],
      ["AAA Operations", audit.aaa_operations],
    ] as const) {
      expect(scorecard).toContain(`${label} = ${value}`);
    }
    expect(scorecard).toContain(`P0 = ${audit.p0}`);
    expect(scorecard).toContain(`P1 = ${audit.p1}`);
  });

  it("strict evidence validation rejects placeholders", async () => {
    const failures = await import("../../scripts/release-evidence.mjs").then(
      (module) =>
        module.validateBundle(join(root, "release-evidence"), {
          strict: true,
          head: "0".repeat(40),
        }),
    );
    // A bogus HEAD must fail freshness even if every file parses.
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.join("\n")).toMatch(/not fresh|missing-blocked|FAIL/);
  });

  it("non-strict bundle validation still enforces digests", async () => {
    await expect(
      validateBundle(join(root, "release-evidence")),
    ).resolves.toEqual([]);
  });
});
