import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { validateBundle } from "./release-evidence.mjs";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const failures = [];

function check(name, ok, detail = "") {
  if (ok) {
    console.log(`ok: ${name}`);
  } else {
    console.error(`FAIL: ${name}${detail === "" ? "" : ` — ${detail}`}`);
    failures.push(name);
  }
}

/**
 * AAA-FINAL-008 §97 — AUDIT THE AUDITOR.
 *
 * Gates are only as good as their resistance to gaming. This verifier binds
 * the evidence artifacts to each other so that hand-editing any one of them
 * breaks another gate:
 * - coverage-summary must be consistent with coverage-final.json;
 * - mutation-summary must recompute from the Stryker reports (with caps);
 * - scorecard must mirror the latest machine-readable audit JSON;
 * - strict evidence validation must reject placeholders and stale SHAs.
 *
 * Runs AFTER test:coverage in `pnpm verify` (evidence must exist first).
 */
async function main() {
  // 1. Coverage consistency.
  try {
    const summary = JSON.parse(
      await readFile(join(root, "coverage/coverage-summary.json"), "utf8"),
    );
    const raw = JSON.parse(
      await readFile(join(root, "coverage/coverage-final.json"), "utf8"),
    );
    let statements = 0;
    let coveredStatements = 0;
    for (const file of Object.values(raw)) {
      for (const count of Object.values(file.s ?? {})) {
        statements += 1;
        if (count > 0) coveredStatements += 1;
      }
    }
    check(
      "coverage summary totals trace to the raw report",
      summary.total.statements.total > 0 &&
        statements > summary.total.statements.total * 0.9 &&
        summary.total.statements.total <= statements &&
        summary.total.statements.covered <= coveredStatements,
      `${summary.total.statements.total}/${statements}`,
    );
    check(
      "coverage percentages are bounded",
      ["statements", "branches", "functions", "lines"].every(
        (axis) =>
          summary.total[axis].pct >= 0 && summary.total[axis].pct <= 100,
      ),
    );
  } catch (error) {
    check("coverage summary present and consistent", false, error.message);
  }

  // 2. Mutation consistency (skipped when the summary was not generated
  // in this pipeline stage — e.g. quality CI, which has no mutation step.
  // The AAA candidate gate requires it independently and fail-closed).
  try {
    await readFile(join(root, "reports/mutation-summary.json"), "utf8").catch(
      () => {
        throw new Error("SKIP_ABSENT");
      },
    );
    const summary = JSON.parse(
      await readFile(join(root, "reports/mutation-summary.json"), "utf8"),
    );
    check(
      "mutation summary format",
      summary.format === "cvg-mutation-summary/v1",
      summary.format ?? "missing",
    );
    let total = 0;
    let rawKilled = 0;
    for (const name of [
      "mutation/mutation.json",
      "mutation-critical/mutation.json",
      "mutation-worker/mutation.json",
    ]) {
      let report = null;
      try {
        report = JSON.parse(
          await readFile(join(root, "reports", name), "utf8"),
        );
      } catch {
        continue;
      }
      for (const file of Object.values(report.files)) {
        total += file.mutants.length;
        rawKilled += file.mutants.filter((m) => m.status === "Killed").length;
      }
    }
    check(
      "mutation totals recompute",
      summary.total === total,
      `${summary.total}/${total}`,
    );
    check(
      "mutation raw kills recompute",
      summary.raw_killed === rawKilled,
      `${summary.raw_killed}/${rawKilled}`,
    );
    let capped = 0;
    for (const scope of summary.scopes ?? []) {
      capped += Math.min(
        scope.raw_killed + scope.verified_kills,
        scope.total - scope.equivalent_count,
      );
    }
    check(
      "mutation adjusted recomputes",
      Math.abs(
        summary.adjusted_score -
          capped / (summary.total - summary.equivalent_count),
      ) < 0.0001,
      String(summary.adjusted_score),
    );
    check(
      "mutation gate PASS with zero real survivors",
      summary.status === "PASS" && summary.critical_real_survivors === 0,
      summary.status ?? "missing",
    );
  } catch (error) {
    if (error.message === "SKIP_ABSENT") {
      console.log("skip: mutation summary not generated in this stage");
    } else {
      check("mutation summary present and consistent", false, error.message);
    }
  }

  // 3. Scorecard mirrors the latest machine-readable audit.
  try {
    const scorecard = await readFile(
      join(root, "docs/quality/scorecard.md"),
      "utf8",
    );
    const audits = (await readdir(join(root, "docs/audits"))).filter((file) =>
      /^state-of-art-final-audit-v\d+\.json$/u.test(file),
    );
    check("audit JSON exists", audits.length > 0);
    if (audits.length > 0) {
      const latest = audits.sort().at(-1);
      const audit = JSON.parse(
        await readFile(join(root, "docs/audits", latest), "utf8"),
      );
      const engineering = audit.aaa_engineering ?? audit.engineering;
      const security = audit.aaa_security ?? audit.security;
      const operations = audit.aaa_operations ?? audit.operations;
      check(
        "scorecard mirrors audit aggregates",
        scorecard.includes(`AAA Engineering = ${engineering}`) &&
          scorecard.includes(`AAA Security = ${security}`) &&
          scorecard.includes(`AAA Operations = ${operations}`),
      );
      check(
        "scorecard mirrors audit P0/P1",
        scorecard.includes(`P0 = ${audit.p0}`) &&
          scorecard.includes(`P1 = ${audit.p1}`),
      );
    }
  } catch (error) {
    check("scorecard consistent with audit JSON", false, error.message);
  }

  // 4. Strict validation rejects placeholders (fail-closed proof).
  try {
    const strictFailures = await validateBundle(
      join(root, "release-evidence"),
      {
        strict: true,
        head: "0".repeat(40),
      },
    );
    check(
      "strict validator rejects a bogus HEAD",
      strictFailures.length > 0,
      "accepted?!",
    );
  } catch (error) {
    check("strict validator rejects a bogus HEAD", false, error.message);
  }

  if (failures.length > 0) {
    console.error(`\nevidence-consistency: FAIL (${failures.length} gates)`);
    process.exitCode = 1;
    return;
  }
  console.log("\nevidence-consistency: PASS");
}

await main().catch((error) => {
  console.error(`evidence consistency failed: ${error.message}`);
  process.exitCode = 1;
});
