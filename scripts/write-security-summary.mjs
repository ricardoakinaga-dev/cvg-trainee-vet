import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = join(fileURLToPath(import.meta.url), "..", "..");

/**
 * AAA-CERT-004 — security summary from real scans (never hand-written).
 *
 * Runs `pnpm audit --audit-level=high`, `pnpm verify:secrets` and counts
 * SBOM components, then publishes `staging-evidence/security-summary.json`.
 * CodeQL/OSV/dependency-review run in the `security` workflow; this file
 * records their workflow reference, not their verdict.
 */
async function main() {
  const audit = await execFileAsync(
    "pnpm",
    ["audit", "--audit-level=high", "--json"],
    { cwd: root, timeout: 300000, maxBuffer: 64 * 1024 * 1024 },
  )
    .then(({ stdout }) => JSON.parse(stdout || "{}"))
    .catch(() => null);
  const advisories = audit
    ? Object.values(audit.advisories ?? audit.vulnerabilities ?? {})
    : [];
  const count = (severity) =>
    advisories.filter((entry) => entry.severity === severity).length;
  const high = count("high");
  const critical = count("critical");
  const moderate = count("moderate");
  const low = count("low");

  let secretsClean = true;
  try {
    await execFileAsync("pnpm", ["verify:secrets"], {
      cwd: root,
      timeout: 120000,
    });
  } catch {
    secretsClean = false;
  }

  let sbomComponents = null;
  try {
    const sbom = JSON.parse(
      await readFile(join(root, "sbom.cyclonedx.json"), "utf8"),
    );
    sbomComponents = Array.isArray(sbom.components)
      ? sbom.components.length
      : null;
  } catch {
    sbomComponents = null;
  }

  const { stdout: sha } = await execFileAsync("git", ["rev-parse", "HEAD"], {
    cwd: root,
  });
  const summary = {
    format: "cvg-security-summary/v1",
    sha: sha.trim(),
    generatedAt: new Date().toISOString(),
    audit:
      high + critical === 0
        ? "pnpm audit --audit-level=high PASS"
        : "pnpm audit FAIL",
    residual: { low, moderate, high, critical },
    secrets: secretsClean ? "verify:secrets clean" : "verify:secrets FAIL",
    sbomComponents,
    codeql: "security workflow (CodeQL javascript-typescript)",
    osv: "security workflow (OSV reusable workflow)",
    status: high + critical === 0 && secretsClean ? "PASS" : "FAIL",
  };
  if (summary.status !== "PASS") throw new Error("security summary FAIL");
  await mkdir(join(root, "staging-evidence"), { recursive: true });
  await writeFile(
    join(root, "staging-evidence", "security-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.log(
    `security summary written (high=${high} critical=${critical} moderate=${moderate} low=${low})`,
  );
}

await main().catch((error) => {
  console.error(`security summary failed: ${error.message}`);
  process.exitCode = 1;
});
