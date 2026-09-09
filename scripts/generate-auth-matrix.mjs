import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const registryPath = join(root, "apps/api/src/routing/route-registry.ts");
const outPath = join(root, "docs/security/authorization-matrix.generated.md");

const RISK_ALIASES = new Map([
  ["PUBLIC_LOW", "public-low-risk"],
  ["AUTHN", "authentication"],
  ["RECOVERY", "recovery"],
  ["MUTATION", "mutation"],
  ["READ", "expensive-read"],
  ["INTERNAL", "internal"],
]);

function splitEntries(source) {
  const start = source.indexOf("ROUTE_REGISTRY");
  const body = source.slice(start);
  const entries = [];
  const pattern =
    /(exact|pattern)\(\s*(?:"([A-Z*]+)"|(\*))\s*,\s*"((?:[^"\\]|\\.)*)"\s*(?:,\s*"((?:[^"\\]|\\.)*)"\s*)?,\s*\{([\s\S]*?)\n\s*\}(?:\s*\))?/gu;
  for (const match of body.matchAll(pattern)) {
    const [, , quotedMethod, starMethod, template, , init] = match;
    entries.push({
      method: starMethod === "*" ? "*" : quotedMethod,
      template,
      init,
    });
  }
  return entries;
}

function field(init, name) {
  const match = new RegExp(`${name}:\\s*([^,\\n]+)`, "u").exec(init);
  return match?.[1]?.trim() ?? "";
}

function capabilitiesOf(init) {
  const match = /capabilities:\s*Object\.freeze\(\[([\s\S]*?)\]\)/u.exec(init);
  if (!match) return [];
  return [...match[1].matchAll(/"([A-Z_]+)"/gu)].map((entry) => entry[1]);
}

function noteOf(init) {
  const match = /note:\s*"((?:[^"\\]|\\.)*)"/u.exec(init);
  return match?.[1] ?? "";
}

function riskOf(raw) {
  const literal = /^"([^"]+)"$/u.exec(raw)?.[1];
  if (literal) return literal;
  return RISK_ALIASES.get(raw) ?? raw;
}

export function parseMatrixEntries(source) {
  return splitEntries(source).map((entry) => ({
    method: entry.method,
    template: entry.template,
    auth: field(entry.init, "auth").replace(/"/gu, ""),
    capabilities: capabilitiesOf(entry.init),
    enforcement: field(entry.init, "enforcement").replace(/"/gu, ""),
    riskClass: riskOf(field(entry.init, "riskClass")),
    note: noteOf(entry.init),
  }));
}

export function renderMatrix(entries) {
  const lines = [
    "# Authorization Matrix — generated from route registry",
    "",
    "> Gerado por `node scripts/generate-auth-matrix.mjs`. NÃO editar à mão:",
    "> a fonte canônica é `apps/api/src/routing/route-registry.ts` e o teste",
    "> `tests/integration/auth-matrix-generated.test.ts` falha se este arquivo",
    "> estiver desatualizado.",
    "",
    `Total: ${entries.length} entradas.`,
    "",
    "| Method | Route | Auth | Capability | Enforcement | Risk |",
    "|---|---|---|---|---|---|",
  ];
  for (const entry of entries) {
    const capability =
      entry.capabilities.length === 0 ? "—" : entry.capabilities.join(", ");
    lines.push(
      `| ${entry.method} | \`${entry.template}\` | ${entry.auth} | ${capability} | ${entry.enforcement} | ${entry.riskClass} |`,
    );
  }
  lines.push(
    "",
    "## Notes",
    "",
    ...entries
      .filter((entry) => entry.note !== "")
      .map((entry) => `- \`${entry.method} ${entry.template}\`: ${entry.note}`),
    "",
  );
  return `${lines.join("\n")}\n`;
}

export async function generateMatrix() {
  const source = await readFile(registryPath, "utf8");
  const entries = parseMatrixEntries(source);
  if (entries.length === 0) throw new Error("no registry entries parsed");
  const markdown = renderMatrix(entries);
  await writeFile(outPath, markdown);
  return { entries: entries.length, outPath };
}

async function main() {
  const result = await generateMatrix();
  console.log(
    `auth matrix: ${result.entries} entries written to ${result.outPath}`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
