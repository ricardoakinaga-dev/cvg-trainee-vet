import { describe, expect, it } from "vitest";

import {
  buildScopeDriftReport,
  validateScopeDriftSnapshot,
} from "../../scripts/verify-scope-drift.mjs";

const traceabilityPath = "traceability.yml";
const decisionSourcePath =
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0020_alinhamento_produto_pre_spec.md";
const decisionPackagePath =
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0021_pacote_fechamento_gates_pre_spec.md";
const currentDecisionPath =
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/90.ANEXOS/0027_decisao_atual_integracoes_testes_e_sem_burocracia.md";
const prdDecisionPath =
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0020_prd_master.md";
const curriculumDecisionPath =
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0017_programa_curricular_24_meses.md";
const requirementsPath =
  "BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD/0013_requisitos_funcionais.md";

const validScopeControl = [
  "scope_control:",
  "  decision_sources:",
  `    - "${decisionSourcePath}"`,
  `    - "${decisionPackagePath}"`,
  `    - "${currentDecisionPath}"`,
  `    - "${prdDecisionPath}"`,
  `    - "${curriculumDecisionPath}"`,
  "  capabilities:",
  '    - id: "ACCOUNT_ACCESS"',
  '      decisions: ["D-090", "D-091"]',
  '      requirements: ["RF-001", "RF-008"]',
  '      status: "APPROVED_BASELINE"',
  '    - id: "LEARNING_JOURNEY"',
  '      decisions: ["D-084", "D-085"]',
  '      requirements: ["RF-020", "RF-021"]',
  '      status: "APPROVED_BASELINE"',
].join("\n");

function snapshot(scopeControl = validScopeControl): Map<string, string> {
  return new Map([
    [traceabilityPath, scopeControl],
    [decisionSourcePath, "D-090 D-091"],
    [decisionPackagePath, "D-084 D-085"],
    [currentDecisionPath, "D-109"],
    [prdDecisionPath, "D-068"],
    [curriculumDecisionPath, "D-084 D-085"],
    [requirementsPath, "RF-001 RF-008 RF-020 RF-021"],
  ]);
}

describe("scope drift governance", () => {
  it("accepts capabilities only when decisions and requirements are mapped", () => {
    const result = validateScopeDriftSnapshot(snapshot());

    expect(result).toEqual({
      errors: [],
      capabilityCount: 2,
      decisionCount: 4,
      requirementCount: 4,
    });
    expect(buildScopeDriftReport(snapshot())).toMatchObject({
      status: "PASS",
      capabilityCount: 2,
      decisionCount: 4,
    });
  });

  it("rejects a capability without an approved decision", () => {
    const drifted = validScopeControl.replace(
      'decisions: ["D-090", "D-091"]',
      "decisions: []",
    );

    expect(validateScopeDriftSnapshot(snapshot(drifted)).errors).toContain(
      "ACCOUNT_ACCESS must declare at least one decision",
    );
  });

  it("rejects unknown decisions, requirements, duplicate capabilities, and invalid status", () => {
    const drifted = validScopeControl
      .replace('decisions: ["D-090", "D-091"]', 'decisions: ["D-999"]')
      .replace('requirements: ["RF-001", "RF-008"]', 'requirements: ["RF-999"]')
      .replace('status: "APPROVED_BASELINE"', 'status: "UNAPPROVED"')
      .replace('    - id: "LEARNING_JOURNEY"', '    - id: "ACCOUNT_ACCESS"');

    const errors = validateScopeDriftSnapshot(snapshot(drifted)).errors;
    expect(errors).toEqual(
      expect.arrayContaining([
        "duplicate capability ACCOUNT_ACCESS",
        "ACCOUNT_ACCESS has unknown decision D-999",
        "ACCOUNT_ACCESS has unknown requirement RF-999",
        "ACCOUNT_ACCESS must use an approved status",
      ]),
    );
  });
});
