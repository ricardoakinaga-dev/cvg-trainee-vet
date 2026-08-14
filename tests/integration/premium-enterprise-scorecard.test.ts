import { readFile } from "node:fs/promises";

import { expect, it } from "vitest";

import {
  buildPremiumEnterpriseScorecard,
  validatePremiumEnterpriseScorecard,
} from "../../scripts/verify-premium-enterprise-scorecard.mjs";

const canonicalFiles = [
  "BRIEFING/03.BUILD/0304_premium_enterprise_95_program.md",
  "BRIEFING/04.AUDIT/0491_full_construction_audit.md",
  "BRIEFING/04.AUDIT/0492_score_95_roadmap.md",
  "BRIEFING/04.AUDIT/0493_score_95_backlog.md",
] as const;

async function canonicalSnapshot(): Promise<Map<string, string>> {
  const entries = await Promise.all(
    canonicalFiles.map(
      async (file) => [file, await readFile(file, "utf8")] as const,
    ),
  );
  return new Map(entries);
}

it("calculates the current baseline and task status without promoting scores", async () => {
  const snapshot = await canonicalSnapshot();
  expect(validatePremiumEnterpriseScorecard(snapshot)).toEqual([]);

  const scorecard = buildPremiumEnterpriseScorecard(snapshot);
  expect(scorecard.programId).toBe("CVG-PREMIUM-ENTERPRISE-95");
  expect(scorecard.baselineScore).toBe(83);
  expect(scorecard.weightedScore).toBe(83.24);
  expect(scorecard.itemCount).toBe(16);
  expect(scorecard.taskCount).toBe(70);
  expect(scorecard.itemsAtTarget).toBe(1);
  expect(scorecard.taskStatuses.COMPLETED).toBe(18);
  expect(scorecard.taskStatuses.READY_FOR_NEXT_STEP).toBe(25);
  expect(scorecard.taskStatuses.IN_PROGRESS).toBe(9);
  expect(scorecard.targetFloor).toBe(95);
});

it("rejects score drift, incomplete item coverage, and unknown task statuses", async () => {
  const snapshot = await canonicalSnapshot();
  const report = snapshot.get(
    "BRIEFING/04.AUDIT/0491_full_construction_audit.md",
  );
  const backlog = snapshot.get("BRIEFING/04.AUDIT/0493_score_95_backlog.md");
  if (report === undefined || backlog === undefined)
    throw new Error("fixture missing");

  snapshot.set(
    "BRIEFING/04.AUDIT/0491_full_construction_audit.md",
    report.replace(
      "**Nota geral ponderada: 83/100",
      "**Nota geral ponderada: 84/100",
    ),
  );
  snapshot.set(
    "BRIEFING/04.AUDIT/0493_score_95_backlog.md",
    backlog.replace(
      /(### ENT95-16-D[\s\S]*?- prioridade\/status\/esforço:\s*P0 \/ )READY_FOR_NEXT_STEP( \/)/u,
      "$1UNKNOWN_STATUS$2",
    ),
  );

  const errors = validatePremiumEnterpriseScorecard(snapshot);
  expect(errors).toContain(
    "baseline weighted score does not match the report score",
  );
  expect(errors).toContain("task ENT95-16-D has unknown status UNKNOWN_STATUS");
});
