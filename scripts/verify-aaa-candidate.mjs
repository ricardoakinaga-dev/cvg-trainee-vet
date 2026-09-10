import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

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
  for (const file of Object.values(files)) {
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

  // 4. Same-SHA (§64, §88): HEAD must equal quality/security/artifact SHAs.
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd: root,
    });
    const head = stdout.trim();
    const sameSha = await execFileAsync(
      "node",
      [
        "scripts/verify-same-sha.mjs",
        "--out",
        join(root, "staging-evidence", "ci-runs.json"),
      ],
      {
        cwd: root,
        timeout: 120000,
      },
    ).then(
      () => ({ ok: true }),
      (error) => ({ ok: false, error: error.message }),
    );
    void head;
    check(
      "same-SHA quality/security/artifact",
      sameSha.ok,
      sameSha.ok ? "" : String(sameSha.error).slice(0, 200),
    );
  } catch (error) {
    check("same-SHA quality/security/artifact", false, error.message);
  }

  // 5. Release evidence (§64): bundle validates, SBOM validates.
  try {
    const bundleFailures = await validateBundle(join(root, "release-evidence"));
    check(
      "release evidence bundle valid",
      bundleFailures.length === 0,
      bundleFailures.join("; ").slice(0, 300),
    );
  } catch (error) {
    check("release evidence bundle valid", false, error.message);
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

  // 7. P0/P1 (§64, §86): the final audit must declare zero open P0/P1.
  // Machine-readable by convention: audit v3 states literal "P0 = 0" and
  // "P1 = 0" with justification; anything else fails the gate.
  try {
    const audit = await readFile(
      join(root, "docs/audits/state-of-art-final-audit-v3.md"),
      "utf8",
    );
    const p0 = /^P0 = 0$/mu.test(audit);
    const p1 = /^P1 = 0$/mu.test(audit);
    check("no open P0/P1 (audit v3 declares P0 = 0, P1 = 0)", p0 && p1);
  } catch (error) {
    check(
      "no open P0/P1 (audit v3 declares P0 = 0, P1 = 0)",
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
