import { expect, it } from "vitest";

import { validateDocumentationSnapshot } from "../../scripts/verify-documentation.mjs";

it("accepts the canonical documentation and current audit evidence", () => {
  const result = validateDocumentationSnapshot(
    new Map<string, string>([
      ["AGENTS.md", "agent instructions"],
      [
        "docs/99_runtime_state.md",
        "status: READY_FOR_NEXT_STEP\nlast_completed_action: audit\nnext_action: next\nlast_update: now",
      ],
      [
        "docs/20_master_execution_log.md",
        "AUD-0491-FULL-CONSTRUCTION-AUDIT\nresult",
      ],
      [
        "docs/30_backlog_master.md",
        "AUD-C0-001 AUD-C0-002 AUD-P1-001 AUD-P1-002 AUD-P1-003 AUD-P1-004 AUD-P1-005 ENT95-PROGRAM",
      ],
      [
        "BRIEFING/04.AUDIT/0490_audit_report.md",
        "0490 — Audit Report (registro histórico do recorte)\n0491_full_construction_audit.md",
      ],
      [
        "BRIEFING/04.AUDIT/0491_full_construction_audit.md",
        [
          "**Nota geral ponderada: 57/100.**",
          "| Item avaliado | Peso | Nota | Julgamento resumido |",
          ...[7, 5, 10, 7, 6, 7, 7, 9, 7, 7, 6, 5, 4, 6, 5, 2].map(
            (weight, index) =>
              `| ${index + 1}. item | ${weight}% | **88** | parcial |`,
          ),
        ].join("\n"),
      ],
      [
        "traceability.yml",
        [
          'version: "1"',
          'project: "cvg-trainee-vet"',
          "artifacts:",
          '  - id: "AUD-0491-FULL-CONSTRUCTION-AUDIT"',
          '    requirements: ["AUD-ITEM-01"]',
          '    documents: ["BRIEFING/04.AUDIT/0491_full_construction_audit.md"]',
          '    tests: ["DOC-GOV-001"]',
          '    verification: ["pnpm verify:documentation"]',
          '    status: "verified"',
          '  - id: "PREMIUM-ENTERPRISE-95-PROGRAM"',
          '    requirements: ["PRD-0013"]',
          '    documents: ["BRIEFING/03.BUILD/0304_premium_enterprise_95_program.md"]',
          '    tests: ["DOC-GOV-001"]',
          '    verification: ["pnpm verify:documentation"]',
          '    status: "planned"',
        ].join("\n"),
      ],
    ]),
    {
      requiredFiles: [
        "AGENTS.md",
        "docs/99_runtime_state.md",
        "docs/20_master_execution_log.md",
        "docs/30_backlog_master.md",
        "BRIEFING/04.AUDIT/0490_audit_report.md",
        "BRIEFING/04.AUDIT/0491_full_construction_audit.md",
        "traceability.yml",
      ],
    },
  );

  expect(result).toEqual([]);
});

it("reports missing required evidence and incomplete traceability", () => {
  const result = validateDocumentationSnapshot(
    new Map<string, string>([
      ["AGENTS.md", "agent instructions"],
      [
        "traceability.yml",
        'version: "1"\nproject: "cvg-trainee-vet"\nartifacts:',
      ],
    ]),
    {
      requiredFiles: ["AGENTS.md", "docs/99_runtime_state.md"],
    },
  );

  expect(result).toContain("missing required file: docs/99_runtime_state.md");
  expect(result).toContain("traceability has no artifact entries");
});

it("rejects an incomplete premium enterprise 95 program", () => {
  const result = validateDocumentationSnapshot(
    new Map<string, string>([
      [
        "BRIEFING/03.BUILD/0304_premium_enterprise_95_program.md",
        "program_id: CVG-PREMIUM-ENTERPRISE-95\nbaseline_score: 82/100\ntarget_floor_per_item: 95/100",
      ],
      [
        "BRIEFING/04.AUDIT/0492_score_95_roadmap.md",
        "baseline_report: outro.md\nENT95-01",
      ],
      ["BRIEFING/04.AUDIT/0493_score_95_backlog.md", "ENT95-01-A"],
    ]),
    {
      requiredFiles: [
        "BRIEFING/03.BUILD/0304_premium_enterprise_95_program.md",
        "BRIEFING/04.AUDIT/0492_score_95_roadmap.md",
        "BRIEFING/04.AUDIT/0493_score_95_backlog.md",
      ],
    },
  );

  expect(result).toContain("premium program baseline must be 83/100");
  expect(result).toContain(
    "premium roadmap must reference 0491_full_construction_audit.md",
  );
  expect(result).toContain("premium roadmap has no item ENT95-16");
  expect(result).toContain("premium backlog has no task for item ENT95-16");
});
