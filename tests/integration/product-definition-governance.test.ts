import { expect, it } from "vitest";

import { validateDefinitionGates } from "../../scripts/verify-product-definition-support.mjs";
import { validateProductDefinitionSnapshot } from "../../scripts/verify-product-definition.mjs";

const validSnapshot = new Map<string, string>([
  [
    "BRIEFING/09.PROJETO_CVG_TREINAMENTO/00.DISCOVERY/0090_discovery_validation.md",
    "RESULTADO FORMAL: `APROVADO — GATE DISCOVERY ENCERRADO`\nORDEM CUMPRIDA: DISCOVERY APROVADO ANTES DO PRD\nD-101",
  ],
  [
    "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0090_prd_validation.md",
    "Resultado formal: `APROVADO — GATE PRD ENCERRADO`\ndepois do Discovery\nD-102 D-103 D-104 D-105 D-106 D-107 D-108",
  ],
  [
    "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0020_prd_master.md",
    "Problema\nUsuários\nEscopo\nRegras de negócio\nRequisitos funcionais\nMétricas de sucesso",
  ],
  [
    "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0012_regras_de_negocio.md",
    "RN-001\nRN-043\nRN-074\nRN-085",
  ],
  [
    "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0013_requisitos_funcionais.md",
    "RF-001\nRF-010\nRF-020\nRF-038\nRF-107",
  ],
  [
    "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0015_metricas_de_sucesso.md",
    "KPIs\nPROPOSTA\nlinha de base",
  ],
  [
    "BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0120_spec_master.md",
    "0101 0102 0103 0104 0105 0106 0107 0108 0109 0110 0111 0112 0113 0114 0115 0116 0117 0118 0190\nPostgreSQL\nQdrant\nIA server-side",
  ],
  [
    "BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0190_spec_validation.md",
    "SPEC_APROVADA_TECNICAMENTE\nPRD formalmente aprovado\nBUILD",
  ],
  [
    "BRIEFING/04.AUDIT/0494_product_definition_coverage.md",
    [
      "DEF-01",
      "DEF-02",
      "DEF-03",
      "DEF-04",
      "DEF-05",
      "DEF-06",
      "DEF-07",
      "DEF-08",
      "DEF-09",
      "DEF-10",
      "DEFINED",
      "MAPPED",
      "DEFERRED",
      "HUMAN_APPROVAL",
      "PARTIAL",
      "No silent scope change",
      "Discovery PRD SPEC",
    ].join("\n"),
  ],
  [
    "traceability.yml",
    [
      "PRODUCT-DEFINITION-BASELINE",
      "requirements:",
      "documents:",
      "verification:",
      "status:",
    ].join("\n"),
  ],
]);

it("accepts the approved Discovery → PRD → SPEC chain and coverage matrix", () => {
  expect(validateProductDefinitionSnapshot(validSnapshot)).toEqual([]);
});

it("keeps the Discovery → PRD → SPEC approval checks composable", () => {
  expect(validateDefinitionGates(validSnapshot)).toEqual([]);
});

it("rejects a definition chain with missing gate approval or coverage status", () => {
  const invalidSnapshot = new Map(validSnapshot);
  invalidSnapshot.set(
    "BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0190_spec_validation.md",
    "SPEC em elaboração",
  );
  invalidSnapshot.set(
    "BRIEFING/04.AUDIT/0494_product_definition_coverage.md",
    "DEF-01\nDEFINED",
  );

  const findings = validateProductDefinitionSnapshot(invalidSnapshot);

  expect(findings).toContain("SPEC gate is not technically approved");
  expect(findings).toContain("definition coverage matrix is missing DEF-02");
});
