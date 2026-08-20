import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  validateDefinitionContent,
  validateDefinitionCoverage,
  validateDefinitionGates,
  validateRequiredDefinitionFiles,
  validateTraceabilityBaseline,
} from "./verify-product-definition-support.mjs";

const definitionFiles = Object.freeze([
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/00.DISCOVERY/0090_discovery_validation.md",
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0090_prd_validation.md",
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0020_prd_master.md",
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0012_regras_de_negocio.md",
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0013_requisitos_funcionais.md",
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0015_metricas_de_sucesso.md",
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0120_spec_master.md",
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0190_spec_validation.md",
  "BRIEFING/04.AUDIT/0494_product_definition_coverage.md",
  "traceability.yml",
]);

export function validateProductDefinitionSnapshot(snapshot, options = {}) {
  const requiredFiles = options.requiredFiles ?? definitionFiles;
  const errors = [
    ...validateRequiredDefinitionFiles(snapshot, requiredFiles),
    ...validateDefinitionGates(snapshot),
    ...validateDefinitionContent(snapshot),
    ...validateDefinitionCoverage(snapshot),
    ...validateTraceabilityBaseline(snapshot),
  ];
  return Object.freeze(errors);
}

export async function loadProductDefinitionSnapshot(root) {
  const snapshot = new Map();
  for (const path of definitionFiles) {
    try {
      snapshot.set(path, await readFile(join(root, path), "utf8"));
    } catch {
      snapshot.set(path, "");
    }
  }
  return snapshot;
}

async function main() {
  const snapshot = await loadProductDefinitionSnapshot(process.cwd());
  const errors = validateProductDefinitionSnapshot(snapshot);
  if (errors.length > 0) {
    console.error(
      `product definition gate failed (${errors.length} findings):`,
    );
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    "product definition gate: Discovery → PRD → SPEC chain and coverage matrix are consistent",
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
