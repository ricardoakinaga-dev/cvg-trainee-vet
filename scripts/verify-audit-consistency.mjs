import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

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
 * AAA-V6 §109 — verify:audit-consistency.
 *
 * Guarantees the critical fields do not diverge across:
 * Audit Markdown, Audit JSON, Scorecard, Runtime State, Release Evidence.
 * Fails closed on any divergence (promotion gates consume JSON; humans
 * read Markdown — they must agree).
 */
async function main() {
  const audits = (await readdir(join(root, "docs/audits"))).filter((file) =>
    /^state-of-art-final-audit-v\d+\.json$/u.test(file),
  );
  check("final audit JSON exists", audits.length > 0);
  if (audits.length === 0) {
    process.exitCode = 1;
    return;
  }
  const latestJson = audits.sort().at(-1);
  const version = latestJson.match(/v(\d+)\.json$/u)[1];
  const audit = JSON.parse(
    await readFile(join(root, "docs/audits", latestJson), "utf8"),
  );
  const markdown = await readFile(
    join(root, `docs/audits/state-of-art-final-audit-v${version}.md`),
    "utf8",
  ).catch(() => null);
  check("final audit Markdown exists", markdown !== null);
  const scorecard = await readFile(
    join(root, "docs/quality/scorecard.md"),
    "utf8",
  );
  const runtime = await readFile(
    join(root, "docs/99_runtime_state.md"),
    "utf8",
  );

  const sha = audit.candidate_sha ?? audit.sha;
  check("audit SHA valid", /^[0-9a-f]{40}$/u.test(sha ?? ""), String(sha));
  if (markdown !== null && sha) {
    check(
      "Markdown cites the candidate SHA",
      markdown.includes(sha.slice(0, 12)),
    );
  }

  // Verdict agreement (wording variants tolerated, semantics exact).
  const verdict = audit.triple_aaa ?? audit.verdict;
  check("audit verdict present", ["PASS", "REVISE", "FAIL"].includes(verdict));
  if (markdown !== null && verdict) {
    check(
      "Markdown carries the same verdict",
      markdown.includes(`TRIPLE AAA — ${verdict}`),
      verdict,
    );
  }
  if (verdict) {
    check(
      "Scorecard carries the same verdict",
      scorecard.includes(`TRIPLE AAA — ${verdict}`),
      verdict,
    );
  }

  // Findings agreement.
  check(
    "Markdown states P0/P1 counts",
    markdown === null ||
      (markdown.includes(`P0 = ${audit.p0}`) &&
        markdown.includes(`P1 = ${audit.p1}`)),
  );

  // Scores agreement (audit JSON is the authority; scorecard mirrors it).
  const engineering = audit.aaa_engineering ?? audit.engineering;
  const security = audit.aaa_security ?? audit.security;
  const operations = audit.aaa_operations ?? audit.operations;
  check(
    "Scorecard mirrors audit aggregates",
    scorecard.includes(`AAA Engineering = ${engineering}`) &&
      scorecard.includes(`AAA Security = ${security}`) &&
      scorecard.includes(`AAA Operations = ${operations}`),
  );

  // Runtime state agreement (phase + verdict, not free prose).
  if (verdict === "PASS") {
    check(
      "runtime state records completion",
      runtime.includes("COMPLETED") || runtime.includes("TRIPLE AAA — PASS"),
    );
  } else {
    check(
      "runtime state does not claim PASS",
      !runtime.includes("TRIPLE AAA — PASS") ||
        runtime.includes(`TRIPLE AAA — ${verdict}`),
    );
  }

  // Release evidence agreement (bundle commit vs candidate SHA via
  // freshness rule is the strict validator's job; here: manifest exists
  // and points at a full SHA).
  try {
    const manifest = JSON.parse(
      await readFile(join(root, "release-evidence/manifest.json"), "utf8"),
    );
    check(
      "release manifest carries a full commit SHA",
      /^[0-9a-f]{40}$/u.test(manifest.commit ?? ""),
    );
  } catch (error) {
    check("release manifest readable", false, error.message);
  }

  if (failures.length > 0) {
    console.error(`\naudit-consistency: FAIL (${failures.length} gates)`);
    process.exitCode = 1;
    return;
  }
  console.log("\naudit-consistency: PASS");
}

await main().catch((error) => {
  console.error(`audit consistency failed: ${error.message}`);
  process.exitCode = 1;
});
