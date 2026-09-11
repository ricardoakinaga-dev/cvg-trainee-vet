import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { COVERAGE_EXCLUSIONS } from "./coverage-exclusions.mjs";
import { isEvidenceFresh } from "./evidence-freshness.mjs";
import { validateBundle, validateSbom } from "./release-evidence.mjs";

const execFileAsync = promisify(execFile);
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

function pctOf(covered, total) {
  if (total === 0) return 100;
  return (covered / total) * 100;
}

async function coverageTotals() {
  // Derived from `pnpm test:coverage` output (coverage-final.json).
  // Applies the same documented exclusions as vitest.config.ts so the gate
  // matches the report that `pnpm test:coverage` enforces.
  const raw = await readFile(
    join(root, "coverage", "coverage-final.json"),
    "utf8",
  );
  const files = JSON.parse(raw);
  const totals = {
    statements: [0, 0],
    branches: [0, 0],
    functions: [0, 0],
    lines: [0, 0],
  };
  for (const [path, file] of Object.entries(files)) {
    if (
      COVERAGE_EXCLUSIONS.some((exclusion) => {
        const normalized = path.replaceAll("\\", "/");
        if (exclusion.endsWith("/**")) {
          return normalized.includes(exclusion.slice(0, -3));
        }
        return normalized.endsWith(exclusion);
      })
    ) {
      continue;
    }
    for (const counts of Object.values(file.s ?? {})) {
      totals.statements[1] += 1;
      if (counts > 0) totals.statements[0] += 1;
    }
    for (const counts of Object.values(file.b ?? {})) {
      for (const count of counts) {
        totals.branches[1] += 1;
        if (count > 0) totals.branches[0] += 1;
      }
    }
    for (const counts of Object.values(file.f ?? {})) {
      totals.functions[1] += 1;
      if (counts > 0) totals.functions[0] += 1;
    }
    const seenLines = new Set();
    for (const [key, location] of Object.entries(file.statementMap ?? {})) {
      const line = location?.start?.line;
      if (line === undefined || seenLines.has(line)) continue;
      seenLines.add(line);
      totals.lines[1] += 1;
      if ((file.s?.[key] ?? 0) > 0) totals.lines[0] += 1;
    }
  }
  return {
    statements: pctOf(...totals.statements),
    branches: pctOf(...totals.branches),
    functions: pctOf(...totals.functions),
    lines: pctOf(...totals.lines),
  };
}

async function main() {
  // 1. Coverage gate (§64, §87): run from `pnpm test:coverage` output.
  try {
    const totals = await coverageTotals();
    check(
      "coverage statements >= 90",
      totals.statements >= 90,
      totals.statements.toFixed(2),
    );
    check(
      "coverage branches >= 85",
      totals.branches >= 85,
      totals.branches.toFixed(2),
    );
    check(
      "coverage functions >= 90",
      totals.functions >= 90,
      totals.functions.toFixed(2),
    );
    check("coverage lines >= 90", totals.lines >= 90, totals.lines.toFixed(2));
  } catch {
    check("coverage present (run pnpm test:coverage first)", false);
  }

  // 1b. Mutation gate (§§10–12, §37): machine-readable only, never Markdown.
  try {
    const summary = JSON.parse(
      await readFile(join(root, "reports/mutation-summary.json"), "utf8"),
    );
    check(
      "mutation summary fresh (cvg-mutation-summary/v1)",
      summary.format === "cvg-mutation-summary/v1",
      summary.format ?? "unknown",
    );
    check(
      "mutation adjusted >= 90",
      typeof summary.adjusted_score === "number" &&
        summary.adjusted_score >= 0.9,
      String(summary.adjusted_score ?? "missing"),
    );
    check(
      "mutation critical real survivors = 0",
      summary.critical_real_survivors === 0,
      String(summary.critical_real_survivors ?? "missing"),
    );
    check(
      "mutation gate PASS",
      summary.status === "PASS",
      summary.status ?? "unknown",
    );
  } catch {
    check(
      "mutation summary present (run node scripts/verify-mutation-closure.mjs --write-summary)",
      false,
    );
  }

  // 2. Route drift (§64): registry is the single source of truth.
  try {
    const { verifyRoutes } = await import("./verify-routes.mjs");
    const [registry, ...dispatches] = await Promise.all(
      [
        "apps/api/src/routing/route-registry.ts",
        "apps/api/src/http.ts",
        "apps/api/src/features/ops/ops.handler.ts",
      ].map((file) => readFile(join(root, file), "utf8")),
    );
    const result = verifyRoutes(registry, dispatches.join("\n"));
    check(
      "route registry bidirectional consistency",
      result.failures.length === 0,
      result.failures.join("; ").slice(0, 400),
    );
  } catch (error) {
    check("route registry bidirectional consistency", false, error.message);
  }

  // 3. RLS live evidence (§64, §89): the matrix summary must be PASS.
  try {
    const evidence = await readFile(
      join(root, "staging-evidence", "rls-live-summary.json"),
      "utf8",
    );
    const parsed = JSON.parse(evidence);
    check(
      "RLS live matrix PASS",
      parsed.status === "PASS",
      parsed.status ?? "unknown",
    );
  } catch {
    check("RLS live matrix PASS", false, "run pnpm test:rls:live first");
  }

  // 4. Same-SHA (AAA-CERT-002 §§15–18, §37): live re-verification goes to
  // staging scratch; the PROMOTION authority is the bundled
  // release-evidence/remote-ci-summary.json (produced by the candidate
  // workflow step before the bundle, so bundle digests stay stable).
  try {
    const { stdout: headStdout } = await execFileAsync(
      "git",
      ["rev-parse", "HEAD"],
      { cwd: root },
    );
    const head = headStdout.trim();
    const args = [
      "scripts/verify-same-sha.mjs",
      "--out",
      join(root, "staging-evidence", "ci-runs.json"),
      "--summary-out",
      join(root, "staging-evidence", "remote-ci-summary.json"),
      "--require-auth",
      "--require-candidate",
    ];
    const selfRunId =
      process.env.CVG_SELF_CANDIDATE_RUN_ID?.trim() ||
      process.env.GITHUB_RUN_ID?.trim() ||
      "";
    if (selfRunId !== "") {
      args.push("--self-candidate-run-id", selfRunId);
    }
    const sameSha = await execFileAsync("node", args, {
      cwd: root,
      timeout: 300000,
    }).then(
      () => ({ ok: true }),
      (error) => ({ ok: false, error: error.message }),
    );
    check(
      "same-SHA quality/security/candidate (authenticated, live)",
      sameSha.ok,
      sameSha.ok ? "" : String(sameSha.error).slice(0, 200),
    );
    const bundled = JSON.parse(
      await readFile(
        join(root, "release-evidence", "remote-ci-summary.json"),
        "utf8",
      ),
    );
    const bundledFresh = await isEvidenceFresh(root, bundled.sha, head);
    check(
      "bundled remote-ci summary fresh",
      (bundled.format === "cvg-remote-ci-summary/v2" ||
        bundled.format === "cvg-remote-ci-summary/v1") &&
        bundledFresh.fresh &&
        bundled.status === "PASS",
      `${bundled.sha ?? "missing"}/${bundled.status ?? "missing"} (${bundledFresh.detail})`,
    );
  } catch (error) {
    check(
      "same-SHA quality/security/candidate (authenticated)",
      false,
      error.message,
    );
  }

  // 4b. Redis candidate (AAA-CERT-003 §§25–30, §37): durable backend proof.
  try {
    const evidence = JSON.parse(
      await readFile(
        join(root, "release-evidence", "redis-candidate-summary.json"),
        "utf8",
      ),
    );
    const { stdout: head } = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd: root,
    });
    check(
      "redis candidate backend is durable (no silent memory fallback)",
      evidence.backend === "redis" || evidence.backend === "valkey",
      String(evidence.backend ?? "missing"),
    );
    const fresh = await isEvidenceFresh(root, evidence.sha, head.trim());
    check("redis candidate evidence fresh", fresh.fresh, fresh.detail);
    check(
      "redis candidate PASS",
      evidence.status === "PASS",
      evidence.status ?? "unknown",
    );
  } catch {
    check(
      "redis candidate PASS (run node scripts/write-redis-candidate-summary.mjs)",
      false,
    );
  }

  // 4c. Staging (AAA-CERT-005 §§39–53, §37): fresh staging verification.
  try {
    const evidence = JSON.parse(
      await readFile(
        join(root, "release-evidence", "staging-summary.json"),
        "utf8",
      ),
    );
    const { stdout: head } = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd: root,
    });
    const fresh = await isEvidenceFresh(root, evidence.sha, head.trim());
    // Staging exercises the serving runtime: a runtime diff always
    // re-opens it, while docs-only commits keep it fresh.
    check("staging evidence fresh", fresh.fresh, fresh.detail);
    check(
      "staging PASS",
      evidence.status === "PASS",
      evidence.status ?? "unknown",
    );
  } catch {
    check("staging PASS (run pnpm staging:verify)", false);
  }

  // 5. Release evidence (AAA-CERT-004 §35): strict bundle validation
  // against HEAD — required files, JSON, SHA, digests, PASS, freshness.
  try {
    const { stdout: headStdout } = await execFileAsync(
      "git",
      ["rev-parse", "HEAD"],
      { cwd: root },
    );
    const bundleFailures = await validateBundle(
      join(root, "release-evidence"),
      {
        strict: true,
        head: headStdout.trim(),
      },
    );
    check(
      "release evidence bundle valid (strict, fresh for HEAD)",
      bundleFailures.length === 0,
      bundleFailures.join("; ").slice(0, 300),
    );
  } catch (error) {
    check("release evidence bundle valid (strict)", false, error.message);
  }
  try {
    const sbom = JSON.parse(
      await readFile(
        join(root, "release-evidence", "sbom.cyclonedx.json"),
        "utf8",
      ),
    );
    const sbomFailures = validateSbom(sbom);
    check(
      "SBOM valid (CycloneDX, components > 0)",
      sbomFailures.length === 0,
      sbomFailures.join("; ").slice(0, 200),
    );
  } catch (error) {
    check("SBOM valid (CycloneDX, components > 0)", false, error.message);
  }

  // 6. Security scans (§64): no high/critical advisories.
  try {
    const child = await execFileAsync(
      "pnpm",
      ["audit", "--audit-level=high", "--json"],
      {
        cwd: root,
        timeout: 180000,
      },
    );
    const audit = JSON.parse(child.stdout || "{}");
    const advisories = audit.advisories ?? audit.vulnerabilities ?? {};
    const high = Object.values(advisories).filter(
      (entry) => entry.severity === "high" || entry.severity === "critical",
    );
    check(
      "dependency audit high/critical clean",
      high.length === 0,
      `${high.length} advisories`,
    );
  } catch (error) {
    check(
      "dependency audit high/critical clean",
      false,
      String(error.message).slice(0, 200),
    );
  }

  // 7. P0/P1 (§30, §37–38): the LATEST machine-readable audit JSON is the
  // authority. Markdown explains; JSON decides. No Markdown parsing.
  // Freshness follows the shared evidence rule (ancestor + no runtime
  // diff): a tracked file can never contain its own future commit SHA.
  try {
    const { readdir } = await import("node:fs/promises");
    const audits = (await readdir(join(root, "docs/audits"))).filter((file) =>
      /^state-of-art-final-audit-v\d+\.json$/u.test(file),
    );
    if (audits.length === 0) throw new Error("no final audit JSON found");
    const latest = audits.sort().at(-1);
    const audit = JSON.parse(
      await readFile(join(root, "docs/audits", latest), "utf8"),
    );
    const { stdout: head } = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd: root,
    });
    check(`no open P0 (${latest})`, audit.p0 === 0, `p0=${audit.p0}`);
    check(`no open P1 (${latest})`, audit.p1 === 0, `p1=${audit.p1}`);
    const fresh = await isEvidenceFresh(root, audit.sha, head.trim());
    check(
      "latest audit fresh (ancestor + no runtime diff)",
      fresh.fresh,
      fresh.detail,
    );
  } catch (error) {
    check(
      "no open P0/P1 (latest state-of-art-final-audit-vN.json)",
      false,
      error.message,
    );
  }

  if (failures.length > 0) {
    console.error(`\naaa-candidate: FAIL (${failures.length} gates)`);
    process.exitCode = 1;
    return;
  }
  console.log("\naaa-candidate: PASS");
}

await main();
