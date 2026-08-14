import { describe, expect, it } from "vitest";

import { validatePremiumTraceabilitySnapshot } from "../../scripts/verify-premium-enterprise-traceability.mjs";

const files = (matrix: string): Map<string, string> =>
  new Map([
    [
      "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0013_requisitos_funcionais.md",
      [
        "| ID | Requisito | Prioridade | Classificação |",
        "| RF-001 | Login | P0 | FATO INFORMADO |",
        "| RF-002 | Conta | P1 | APROVADA (D-090) |",
      ].join("\n"),
    ],
    [
      "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0014_requisitos_nao_funcionais_produto.md",
      "| RNF-001 | Disponibilidade | APROVADA (D-098) |",
    ],
    [
      "BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC/0120_spec_master.md",
      [
        "[0106 — aplicação](0106_contratos_de_aplicacao.md)",
        "[0113 — operação](0113_observabilidade_runtime_e_operacao.md)",
      ].join("\n"),
    ],
    ["traceability.yml", matrix],
    [
      "BRIEFING/04.AUDIT/0493_score_95_backlog.md",
      "### ENT95-02-A — Matriz\n### ENT95-16-B — Rastreamento",
    ],
  ]);

const validMatrix = [
  '  - id: "PREMIUM-ENTERPRISE-95-REQUIREMENTS-MATRIX"',
  "    coverage:",
  '      - "RF-001|P0|SPEC-0106|ENT95-02-A|GAP:module|GAP:contract|GAP:test|PRD-FACT|MAPPED_PARTIAL|PILOT_BLOCKED|GAP:commit|GAP:artifact"',
  '      - "RF-002|P1|SPEC-0106|ENT95-02-A|GAP:module|GAP:contract|GAP:test|D-090|MAPPED_PARTIAL|PILOT_BLOCKED|GAP:commit|GAP:artifact"',
  '      - "RNF-001|UNSPECIFIED|SPEC-0113|ENT95-02-A|GAP:module|GAP:contract|GAP:test|D-098|PRIORITY_PENDING_PRODUCT_DECISION|PILOT_BLOCKED|GAP:commit|GAP:artifact"',
  '    documents: ["PRD/0013", "PRD/0014"]',
  '    specification: ["SPEC-0106", "SPEC-0113"]',
  '    tasks: ["ENT95-02-A", "ENT95-16-B"]',
  '    verification: ["pnpm verify:premium-traceability"]',
  '    commit: "GAP:worktree-sha-pending"',
  '    artifact: ["GAP:artifact-pending"]',
  '    status: "mapped-with-gaps"',
].join("\n");

describe("premium enterprise traceability gate", () => {
  it("accepts an explicit RF/RNF matrix with state and release disposition", () => {
    expect(validatePremiumTraceabilitySnapshot(files(validMatrix))).toEqual({
      errors: [],
      requirements: 3,
      completeChains: 0,
      mappedWithGaps: 3,
      localEvidenceRows: 0,
      p0p1Requirements: 2,
      p0p1LocalEvidenceRows: 0,
    });
  });

  it("fails when a P0 requirement is omitted from the matrix", () => {
    const matrix = validMatrix.replace(/\n\s{6}- "RF-001[^\n]+/u, "");

    expect(validatePremiumTraceabilitySnapshot(files(matrix)).errors).toContain(
      "RF-001 is missing from the premium requirements matrix",
    );
  });

  it("fails contradictory release state instead of hiding an open gate", () => {
    const matrix = validMatrix.replace(
      "MAPPED_PARTIAL|PILOT_BLOCKED",
      "RELEASED|PILOT_APPROVED",
    );

    expect(validatePremiumTraceabilitySnapshot(files(matrix)).errors).toContain(
      "RF-001 cannot be RELEASED while release is PILOT_APPROVED",
    );
  });

  it("fails when a matrix destination is absent from the canonical backlog", () => {
    const matrix = validMatrix.replaceAll("ENT95-02-A", "ENT95-99-Z");

    expect(validatePremiumTraceabilitySnapshot(files(matrix)).errors).toContain(
      "ENT95-99-Z is not present in the canonical premium backlog",
    );
  });

  it("fails when a matrix destination is absent from the SPEC master", () => {
    const matrix = validMatrix.replaceAll("SPEC-0106", "SPEC-0199");

    expect(validatePremiumTraceabilitySnapshot(files(matrix)).errors).toContain(
      "SPEC-0199 is not present in the canonical SPEC master",
    );
  });

  it("fails when a local module, contract, or test path is absent", () => {
    const matrix = validMatrix.replace(
      "GAP:module",
      "packages/domain/src/missing-module.ts",
    );

    expect(validatePremiumTraceabilitySnapshot(files(matrix)).errors).toContain(
      "RF-001 module path is not present in the traceability snapshot: packages/domain/src/missing-module.ts",
    );
  });
});
