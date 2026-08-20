const requiredPrdMasterMarkers = Object.freeze([
  "Problema",
  "Usuários",
  "Escopo",
  "Regras de negócio",
  "Requisitos funcionais",
  "Métricas de sucesso",
]);

const requiredSpecDocuments = Object.freeze([
  "0101",
  "0102",
  "0103",
  "0104",
  "0105",
  "0106",
  "0107",
  "0108",
  "0109",
  "0110",
  "0111",
  "0112",
  "0113",
  "0114",
  "0115",
  "0116",
  "0117",
  "0118",
  "0190",
]);

const requiredDefinitionRows = Object.freeze(
  Array.from(
    { length: 10 },
    (_, index) => `DEF-${String(index + 1).padStart(2, "0")}`,
  ),
);

function valueOf(snapshot, path) {
  const value = snapshot.get(path);
  return typeof value === "string" ? value : null;
}

function requireMarkers(snapshot, path, markers, errors) {
  const content = valueOf(snapshot, path);
  if (content === null || content.trim().length === 0) {
    errors.push(`missing required definition file: ${path}`);
    return null;
  }
  for (const marker of markers) {
    if (!content.includes(marker)) {
      errors.push(`${path} has no marker: ${marker}`);
    }
  }
  return content;
}

export function validateRequiredDefinitionFiles(snapshot, requiredFiles) {
  const errors = [];
  for (const path of requiredFiles) {
    const content = valueOf(snapshot, path);
    if (content === null || content.trim().length === 0) {
      errors.push(`missing required definition file: ${path}`);
    }
  }
  return Object.freeze(errors);
}

export function validateDefinitionGates(snapshot) {
  const errors = [];
  const discovery = valueOf(
    snapshot,
    "BRIEFING/09.PROJETO_CVG_TREINAMENTO/00.DISCOVERY/0090_discovery_validation.md",
  );
  if (
    discovery !== null &&
    (!discovery.includes("APROVADO") ||
      !discovery.includes("GATE DISCOVERY ENCERRADO") ||
      !discovery.includes("ORDEM CUMPRIDA: DISCOVERY APROVADO ANTES DO PRD"))
  ) {
    errors.push("Discovery gate is not formally approved before PRD");
  }

  const prd = valueOf(
    snapshot,
    "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0090_prd_validation.md",
  );
  if (
    prd !== null &&
    (!prd.includes("APROVADO") ||
      !prd.includes("GATE PRD ENCERRADO") ||
      !prd.includes("depois do Discovery"))
  ) {
    errors.push("PRD gate is not formally approved after Discovery");
  }

  const spec = valueOf(
    snapshot,
    "BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0190_spec_validation.md",
  );
  if (
    spec !== null &&
    (!spec.includes("SPEC_APROVADA_TECNICAMENTE") || !spec.includes("PRD"))
  ) {
    errors.push("SPEC gate is not technically approved");
  }
  return Object.freeze(errors);
}

export function validateDefinitionContent(snapshot) {
  const errors = [];
  requireMarkers(
    snapshot,
    "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0020_prd_master.md",
    requiredPrdMasterMarkers,
    errors,
  );
  requireMarkers(
    snapshot,
    "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0012_regras_de_negocio.md",
    ["RN-001", "RN-043", "RN-074", "RN-085"],
    errors,
  );
  requireMarkers(
    snapshot,
    "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0013_requisitos_funcionais.md",
    ["RF-001", "RF-010", "RF-020", "RF-038", "RF-107"],
    errors,
  );
  requireMarkers(
    snapshot,
    "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0015_metricas_de_sucesso.md",
    ["PROPOSTA", "linha de base"],
    errors,
  );

  const specMaster = requireMarkers(
    snapshot,
    "BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0120_spec_master.md",
    ["PostgreSQL", "Qdrant", "IA server-side"],
    errors,
  );
  if (specMaster !== null) {
    for (const documentId of requiredSpecDocuments) {
      if (!specMaster.includes(documentId)) {
        errors.push(`SPEC master does not map document: ${documentId}`);
      }
    }
  }
  return Object.freeze(errors);
}

export function validateDefinitionCoverage(snapshot) {
  const errors = [];
  const coverage = valueOf(
    snapshot,
    "BRIEFING/04.AUDIT/0494_product_definition_coverage.md",
  );
  if (coverage === null) {
    errors.push("definition coverage matrix is incomplete");
    return Object.freeze(errors);
  }
  for (const row of requiredDefinitionRows) {
    if (!coverage.includes(row)) {
      errors.push(`definition coverage matrix is missing ${row}`);
    }
  }
  for (const status of [
    "DEFINED",
    "MAPPED",
    "DEFERRED",
    "HUMAN_APPROVAL",
    "PARTIAL",
  ]) {
    if (!coverage.includes(status)) {
      errors.push(`definition coverage matrix is missing status ${status}`);
    }
  }
  if (
    !coverage.includes("No silent scope change") &&
    !coverage.includes("sem alterar silenciosamente o escopo aprovado")
  ) {
    errors.push("definition coverage matrix is missing no-silent-scope rule");
  }
  if (
    !coverage.includes("Discovery") ||
    !coverage.includes("PRD") ||
    !coverage.includes("SPEC")
  ) {
    errors.push("definition coverage matrix is missing the full gate chain");
  }
  return Object.freeze(errors);
}

export function validateTraceabilityBaseline(snapshot) {
  const errors = [];
  const manifest = valueOf(snapshot, "traceability.yml");
  if (manifest !== null) {
    const artifactStart = manifest.indexOf("PRODUCT-DEFINITION-BASELINE");
    if (artifactStart < 0) {
      errors.push("traceability has no PRODUCT-DEFINITION-BASELINE artifact");
    } else {
      const artifact = manifest.slice(artifactStart);
      for (const marker of [
        "requirements:",
        "documents:",
        "verification:",
        "status:",
      ]) {
        if (!artifact.includes(marker)) {
          errors.push(`PRODUCT-DEFINITION-BASELINE has no ${marker}`);
        }
      }
    }
  }
  return Object.freeze(errors);
}
