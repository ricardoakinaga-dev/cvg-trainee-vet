import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = join(fileURLToPath(import.meta.url), "..", "..");
const TARGET = join(root, "packages/application/src/authorization.ts");

const SUITE = [
  "packages/application/src/authorization.test.ts",
  "packages/application/src/authorization.property.test.ts",
  "packages/application/src/authorization-mutation-closure.test.ts",
];

/**
 * AAA-CERT-001 — harness autoritativo de fechamento de mutation.
 *
 * O Stryker (`coverageAnalysis: perTest` + `vitest.related: true`) reportou
 * 22 sobreviventes com raw 89,95%. A filtragem per-test produz falsos
 * sobreviventes (provado: mutante L105→true aplicado na mão mata 3 testes
 * do suite, mas o Stryker o declarou Survived após 126 testes filtrados).
 *
 * Este harness aplica cada mutante sobrevivente por substituição textual
 * ancorada em linha, executa o suite de autorização COMPLETO (sem filtro
 * per-test) e registra kill (suite falha) ou no-effect (suite verde).
 * no-effect só é aceito se o mutante constar na lista de EQUIVALENT com
 * prova em `docs/quality/mutation-classification-v4.md`; qualquer outro
 * no-effect é REAL survivor e reprova o gate.
 */
const MUTANTS = [
  {
    id: "M40",
    stryker: "40/ConditionalExpression",
    line: 105,
    classification: "REAL",
    old: "return scopeId !== undefined && request.scopes.includes(scopeId);",
    next: "return true;",
  },
  {
    id: "M59",
    stryker: "59/LogicalOperator",
    line: 121,
    classification: "REAL",
    old: 'hasRole(request, "MODERATOR") ||\n    hasRole(request, "ADMIN") ||',
    next: 'hasRole(request, "MODERATOR") &&\n    hasRole(request, "ADMIN") ||',
  },
  {
    id: "M63",
    stryker: "63/ConditionalExpression",
    line: 128,
    classification: "REAL",
    old: 'if (request.accountStatus !== "ACTIVE" || request.principalId.trim() === "") {',
    next: "if (true) {",
  },
  {
    id: "M67",
    stryker: "67/EqualityOperator",
    line: 128,
    classification: "REAL",
    old: 'request.accountStatus !== "ACTIVE"',
    next: 'request.accountStatus === "ACTIVE"',
  },
  {
    id: "M70",
    stryker: "70/EqualityOperator",
    line: 128,
    classification: "REAL",
    old: 'request.principalId.trim() === ""',
    next: 'request.principalId.trim() !== ""',
  },
  {
    id: "M80",
    stryker: "80/StringLiteral",
    line: 138,
    classification: "EQUIVALENT",
    proof: "P-D1",
    old: 'case "START_OWN_ATTEMPT":',
    next: 'case "":',
  },
  {
    id: "M81",
    stryker: "81/StringLiteral",
    line: 139,
    classification: "EQUIVALENT",
    proof: "P-D1",
    old: 'case "SAVE_OWN_ANSWER":',
    next: 'case "":',
  },
  {
    id: "M82",
    stryker: "82/StringLiteral",
    line: 140,
    classification: "EQUIVALENT",
    proof: "P-D1",
    old: 'case "SUBMIT_OWN_ATTEMPT":',
    next: 'case "":',
  },
  {
    id: "M83",
    stryker: "83/StringLiteral",
    line: 141,
    classification: "EQUIVALENT",
    proof: "P-D1",
    old: 'case "VIEW_OWN_FEEDBACK":',
    next: 'case "":',
  },
  {
    id: "M84",
    stryker: "84/ConditionalExpression",
    line: 142,
    classification: "EQUIVALENT",
    proof: "P-D1",
    old: 'case "VIEW_OWN_APPEALS":\n      return (\n        hasRole(request, "PARTICIPANT") &&\n        ownsResource(request) &&\n        hasScope(request)\n      );',
    next: 'case "VIEW_OWN_APPEALS":',
  },
  {
    id: "M94",
    stryker: "94/StringLiteral",
    line: 149,
    classification: "EQUIVALENT",
    proof: "P-E1",
    old: 'case "CREATE_APPEAL":',
    next: 'case "":',
  },
  {
    id: "M102",
    stryker: "102/StringLiteral",
    line: 156,
    classification: "EQUIVALENT",
    proof: "P-E2",
    old: 'case "MANAGE_ASSESSMENT_WORKFLOWS":',
    next: 'case "":',
  },
  {
    id: "M115",
    stryker: "115/LogicalOperator",
    line: 162,
    classification: "REAL",
    old: '(hasRole(request, "MODERATOR") || hasRole(request, "ADMIN")) &&',
    next: '(hasRole(request, "MODERATOR") && hasRole(request, "ADMIN")) &&',
  },
  {
    id: "M117",
    stryker: "117/StringLiteral",
    line: 162,
    classification: "REAL",
    old: '(hasRole(request, "MODERATOR") || hasRole(request, "ADMIN")) &&\n        hasScope(request)\n      );\n    case "REVIEW_APPEAL":',
    next: '(hasRole(request, "") || hasRole(request, "ADMIN")) &&\n        hasScope(request)\n      );\n    case "REVIEW_APPEAL":',
  },
  {
    id: "M137",
    stryker: "137/ConditionalExpression",
    line: 174,
    classification: "REAL",
    old: 'case "AUTHOR_CONTENT":\n      return hasRole(request, "AUTHOR") && hasScope(request);',
    next: 'case "AUTHOR_CONTENT":',
  },
  {
    id: "M148",
    stryker: "148/LogicalOperator",
    line: 178,
    classification: "REAL",
    old: 'return isApprovedClinicalIdentity(request) && hasScope(request);\n    case "VIEW_INTERNAL_SOURCE":',
    next: 'return isApprovedClinicalIdentity(request) || hasScope(request);\n    case "VIEW_INTERNAL_SOURCE":',
  },
  {
    id: "M163",
    stryker: "163/StringLiteral",
    line: 185,
    classification: "REAL",
    old: 'return hasRole(request, "AUDITOR") || hasRole(request, "ADMIN");',
    next: 'return hasRole(request, "") || hasRole(request, "ADMIN");',
  },
  {
    id: "M170",
    stryker: "170/LogicalOperator",
    line: 188,
    classification: "REAL",
    old: '(hasRole(request, "AUDITOR") ||\n          hasRole(request, "ADMIN") ||\n          isApprovedClinicalIdentity(request)) &&',
    next: '(hasRole(request, "AUDITOR") ||\n          hasRole(request, "ADMIN") &&\n          isApprovedClinicalIdentity(request)) &&',
  },
  {
    id: "M175",
    stryker: "175/ConditionalExpression",
    line: 193,
    classification: "EQUIVALENT",
    proof: "P-I1",
    old: 'case "VIEW_STAFF_DASHBOARD":\n      return hasScopedStaffRole(request) && hasScope(request);',
    next: 'case "VIEW_STAFF_DASHBOARD":',
  },
  {
    id: "M193",
    stryker: "193/ConditionalExpression",
    line: 202,
    classification: "REAL",
    old: 'case "VIEW_INTERNAL_SCOPES":\n      return (\n        hasRole(request, "AUTHOR") ||\n        hasRole(request, "MODERATOR") ||\n        hasRole(request, "ADMIN") ||\n        isApprovedClinicalIdentity(request)\n      );',
    next: 'case "VIEW_INTERNAL_SCOPES":',
  },
  {
    id: "M214",
    stryker: "214/ConditionalExpression",
    line: 213,
    classification: "EQUIVALENT",
    proof: "P-J1",
    old: 'case "GRANT_CLINICAL_APPROVER":\n      return false;',
    next: 'case "GRANT_CLINICAL_APPROVER":',
  },
  {
    id: "M215",
    stryker: "215/StringLiteral",
    line: 213,
    classification: "EQUIVALENT",
    proof: "P-J1",
    old: 'case "GRANT_CLINICAL_APPROVER":',
    next: 'case "":',
  },
];

async function runSuite() {
  try {
    await execFileAsync(
      "pnpm",
      ["vitest", "run", "--project", "unit", ...SUITE],
      {
        cwd: root,
        timeout: 240000,
      },
    );
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const writeSummary = process.argv.includes("--write-summary");
  const original = await readFile(TARGET, "utf8");
  const results = [];
  try {
    for (const mutant of MUTANTS) {
      if (!original.includes(mutant.old)) {
        results.push({
          ...mutant,
          outcome: "HARNESS_ERROR",
          detail: "anchor not found",
        });
        continue;
      }
      await writeFile(TARGET, original.replace(mutant.old, mutant.next));
      const green = await runSuite();
      await writeFile(TARGET, original);
      results.push({
        ...mutant,
        outcome: green ? "NO_EFFECT" : "KILLED",
      });
      console.log(
        `${mutant.id} (${mutant.stryker} L${mutant.line}): ${green ? "NO_EFFECT" : "KILLED"}`,
      );
    }
  } finally {
    await writeFile(TARGET, original);
  }
  const killed = results.filter((r) => r.outcome === "KILLED");
  const noEffect = results.filter((r) => r.outcome === "NO_EFFECT");
  const equivalent = noEffect.filter((r) => r.classification === "EQUIVALENT");
  const realSurvivors = noEffect.filter(
    (r) => r.classification !== "EQUIVALENT",
  );
  const errors = results.filter((r) => r.outcome === "HARNESS_ERROR");
  console.log(
    `\nkilled=${killed.length} equivalent-no-effect=${equivalent.length} real-survivors=${realSurvivors.length} errors=${errors.length}`,
  );
  for (const r of [...realSurvivors, ...errors]) {
    console.error(`OPEN: ${r.id} ${r.outcome}`);
  }
  if (writeSummary) {
    const stryker = JSON.parse(
      await readFile(join(root, "reports/mutation/mutation.json"), "utf8"),
    );
    const file = Object.values(stryker.files)[0];
    const total = file.mutants.length;
    const strykerKilled = file.mutants.filter(
      (m) => m.status === "Killed",
    ).length;
    const equivalentCount = 10;
    const verifiedKills = killed.length;
    const adjusted =
      (strykerKilled + verifiedKills) / (total - equivalentCount);
    const { stdout: headSha } = await execFileAsync(
      "git",
      ["rev-parse", "HEAD"],
      {
        cwd: root,
      },
    ).catch(() => ({ stdout: "unknown" }));
    const summary = {
      format: "cvg-mutation-summary/v1",
      sha: headSha.trim(),
      scope: ["packages/application/src/authorization.ts"],
      tool: "StrykerJS 9 + cvg mutation-closure harness v1",
      generatedAt: new Date().toISOString(),
      total,
      raw_killed: strykerKilled,
      raw_score: strykerKilled / total,
      equivalent_count: equivalentCount,
      equivalent_ids: [
        "80",
        "81",
        "82",
        "83",
        "84",
        "94",
        "102",
        "175",
        "214",
        "215",
      ],
      verified_kills: verifiedKills,
      verified_kill_ids: killed.map((r) => r.stryker),
      critical_real_survivors: realSurvivors.length,
      adjusted_score: adjusted,
      status:
        realSurvivors.length === 0 && errors.length === 0 && adjusted >= 0.9
          ? "PASS"
          : "FAIL",
    };
    await writeFile(
      join(root, "reports/mutation-summary.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
    );
    console.log(
      `mutation summary written (adjusted=${adjusted.toFixed(4)} status=${summary.status})`,
    );
  }
  if (realSurvivors.length > 0 || errors.length > 0) process.exitCode = 1;
}

await main().catch((error) => {
  console.error(`mutation closure harness failed: ${error.message}`);
  process.exitCode = 1;
});
