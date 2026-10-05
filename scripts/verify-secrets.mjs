import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  ".next",
  // Non-product evidence/scratch trees: plans, round artifacts, snapshots and
  // run outputs. They are not shipped and must not gate the candidate.
  ".agent",
  ".agents",
  ".gauntlet",
  ".opencode",
  ".orchestrate",
  "playwright-report",
  "test-results",
  "staging-evidence",
  "release-evidence",
  "reports",
  "snapshots",
]);
const textExtensions = new Set([
  ".js",
  ".mjs",
  ".ts",
  ".tsx",
  ".json",
  ".yaml",
  ".yml",
  ".md",
  ".toml",
  ".env",
]);
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:sk|rk)-[A-Za-z0-9]{20,}/,
  // The quoted value is captured so exemptions can be literal-scoped.
  /(?:api[_-]?key|password|secret|token)\s*[:=]\s*(["'][^"']{12,}["'])/i,
];

// Reviewed, literal-scoped exemptions for synthetic non-credential fixtures.
// An entry exempts exactly one known literal in exactly one file; anything
// else in that file still fails. Real credentials are never exempted.
const reviewedSyntheticLiterals = [
  {
    file: "apps/worker/src/main.test.ts",
    literal: '"synthetic-token"',
    reason: "worker lease token double, not a credential",
  },
  {
    file: "tests/integration/ci-claim-admission.test.ts",
    literal: '"SYNTHETIC-NONCREDENTIAL"',
    reason: "claim-admission placeholder, name declares non-credential",
  },
  {
    file: "tests/integration/staging-owned-child.test.ts",
    literal: '"different-invocation"',
    reason: "lifecycle log discriminator, not a token value",
  },
];

const exemptionsFor = (file) =>
  new Set(
    reviewedSyntheticLiterals
      .filter((entry) => entry.file === file)
      .map((entry) => entry.literal),
  );

function redact(value) {
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name))
        files.push(...(await walk(join(directory, entry.name))));
      continue;
    }
    if (textExtensions.has(entry.name.slice(entry.name.lastIndexOf("."))))
      files.push(join(directory, entry.name));
  }
  return files;
}

const globalExemptions = new Map(
  reviewedSyntheticLiterals
    .filter((entry) => entry.file === "*")
    .map((entry) => [entry.literal, entry.reason]),
);
const findings = [];
const appliedExemptions = [];
for (const file of await walk(root)) {
  const relativePath = relative(root, file);
  const content = await readFile(file, "utf8");
  const exemptions = new Set([
    ...exemptionsFor(relativePath),
    ...globalExemptions.keys(),
  ]);
  for (const pattern of secretPatterns) {
    const globalPattern = new RegExp(
      pattern.source,
      pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
    );
    for (const match of content.matchAll(globalPattern)) {
      const value = match[1] ?? match[0];
      if (exemptions.has(value)) {
        appliedExemptions.push({
          file: relativePath,
          literal: redact(value),
          reason:
            globalExemptions.get(value) ??
            reviewedSyntheticLiterals.find((entry) => entry.literal === value)
              .reason,
        });
        continue;
      }
      findings.push(`${relativePath} (${redact(value)})`);
      break;
    }
    if (findings.at(-1)?.startsWith(relativePath)) break;
  }
}

if (findings.length > 0) {
  console.error(`Potential secret pattern found in: ${findings.join(", ")}`);
  process.exitCode = 1;
} else {
  for (const entry of appliedExemptions)
    console.log(
      `secret scan: reviewed synthetic literal ${entry.literal} in ${entry.file} (${entry.reason})`,
    );
  console.log("secret scan: clean");
}
