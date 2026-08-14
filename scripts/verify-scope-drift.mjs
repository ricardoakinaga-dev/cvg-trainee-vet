import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const TRACEABILITY_PATH = "traceability.yml";
export const FUNCTIONAL_REQUIREMENTS_PATH =
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0013_requisitos_funcionais.md";
export const NON_FUNCTIONAL_REQUIREMENTS_PATH =
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0014_requisitos_nao_funcionais_produto.md";
export const DECISION_SOURCE_PATHS = Object.freeze([
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0020_alinhamento_produto_pre_spec.md",
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0021_pacote_fechamento_gates_pre_spec.md",
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0027_decisao_atual_integracoes_testes_e_sem_burocracia.md",
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0020_prd_master.md",
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0017_programa_curricular_24_meses.md",
]);

const SCOPE_CONTROL_MARKER = "scope_control:";
const APPROVED_STATUS = "APPROVED_BASELINE";

function contentOf(snapshot, path) {
  const value = snapshot.get(path);
  return typeof value === "string" ? value : "";
}

function scopeControlBlock(manifest) {
  const start = manifest.indexOf(SCOPE_CONTROL_MARKER);
  if (start < 0) return "";
  const end = manifest.indexOf("\nnotes:", start);
  return manifest.slice(start, end < 0 ? manifest.length : end);
}

function quotedList(block, field, indentation) {
  const pattern = new RegExp(
    `^\\s{${indentation}}${field}:\\s*\\[([^\\]]*)\\]$`,
    "mu",
  );
  const match = block.match(pattern);
  if (match === null) return [];
  return Object.freeze(
    [...match[1].matchAll(/"([^"\n]+)"/gu)].map((item) => item[1]),
  );
}

function parseCapabilities(block) {
  const matches = [...block.matchAll(/^\s{4}- id: "([^"]+)"/gmu)];
  return Object.freeze(
    matches.map((match, index) => {
      const start = match.index ?? 0;
      const end = matches[index + 1]?.index ?? block.length;
      const capabilityBlock = block.slice(start, end);
      const statusMatch = capabilityBlock.match(/^\s{6}status:\s*"([^"]+)"/mu);
      return Object.freeze({
        id: match[1],
        decisions: quotedList(capabilityBlock, "decisions", 6),
        requirements: quotedList(capabilityBlock, "requirements", 6),
        status: statusMatch?.[1] ?? null,
      });
    }),
  );
}

function idsFrom(contents, pattern) {
  return new Set(contents.match(pattern) ?? []);
}

export function validateScopeDriftSnapshot(snapshot) {
  const errors = [];
  const manifest = contentOf(snapshot, TRACEABILITY_PATH);
  const block = scopeControlBlock(manifest);
  if (block.length === 0) {
    return Object.freeze({
      errors: Object.freeze(["traceability has no scope_control block"]),
      capabilityCount: 0,
    });
  }

  const sourcePathSet = new Set(
    DECISION_SOURCE_PATHS.filter((path) => block.includes(`"${path}"`)),
  );
  for (const canonicalPath of DECISION_SOURCE_PATHS) {
    if (!sourcePathSet.has(canonicalPath)) {
      errors.push(`scope_control is missing decision source ${canonicalPath}`);
    }
    if (contentOf(snapshot, canonicalPath).trim().length === 0) {
      errors.push(`missing decision source ${canonicalPath}`);
    }
  }

  const decisionIds = new Set(
    DECISION_SOURCE_PATHS.flatMap(
      (path) => contentOf(snapshot, path).match(/\bD-[0-9]{3}\b/gu) ?? [],
    ),
  );
  const requirementIds = idsFrom(
    contentOf(snapshot, FUNCTIONAL_REQUIREMENTS_PATH) +
      "\n" +
      contentOf(snapshot, NON_FUNCTIONAL_REQUIREMENTS_PATH),
    /\b(?:RF|RNF)-[0-9]{3}\b/gu,
  );

  const capabilities = parseCapabilities(block);
  const capabilityIds = new Set();
  const usedDecisions = new Set();
  const usedRequirements = new Set();
  for (const capability of capabilities) {
    if (capabilityIds.has(capability.id)) {
      errors.push(`duplicate capability ${capability.id}`);
    }
    capabilityIds.add(capability.id);
    if (capability.decisions.length === 0) {
      errors.push(`${capability.id} must declare at least one decision`);
    }
    if (capability.requirements.length === 0) {
      errors.push(`${capability.id} must declare at least one requirement`);
    }
    if (capability.status !== APPROVED_STATUS) {
      errors.push(`${capability.id} must use an approved status`);
    }
    for (const decision of capability.decisions) {
      usedDecisions.add(decision);
      if (!decisionIds.has(decision)) {
        errors.push(`${capability.id} has unknown decision ${decision}`);
      }
    }
    for (const requirement of capability.requirements) {
      usedRequirements.add(requirement);
      if (!requirementIds.has(requirement)) {
        errors.push(`${capability.id} has unknown requirement ${requirement}`);
      }
    }
  }
  if (capabilities.length === 0) {
    errors.push("scope_control must declare at least one capability");
  }

  return Object.freeze({
    errors: Object.freeze(errors),
    capabilityCount: capabilities.length,
    decisionCount: usedDecisions.size,
    requirementCount: usedRequirements.size,
  });
}

export function buildScopeDriftReport(snapshot) {
  const result = validateScopeDriftSnapshot(snapshot);
  if (result.errors.length > 0) throw new Error(result.errors.join("; "));
  return Object.freeze({
    status: "PASS",
    task: "ENT95-02-B",
    capabilityCount: result.capabilityCount,
    decisionCount: result.decisionCount,
    requirementCount: result.requirementCount,
  });
}

export async function loadScopeDriftSnapshot(root = process.cwd()) {
  const paths = [
    TRACEABILITY_PATH,
    FUNCTIONAL_REQUIREMENTS_PATH,
    NON_FUNCTIONAL_REQUIREMENTS_PATH,
    ...DECISION_SOURCE_PATHS,
  ];
  const entries = await Promise.all(
    paths.map(async (path) => [
      path,
      await readFile(`${root}/${path}`, "utf8"),
    ]),
  );
  return new Map(entries);
}

async function main() {
  const report = buildScopeDriftReport(await loadScopeDriftSnapshot());
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
