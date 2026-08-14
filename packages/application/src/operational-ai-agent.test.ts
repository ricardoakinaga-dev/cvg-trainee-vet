import { describe, expect, it, vi } from "vitest";

import { runOperationalAiProposal } from "./operational-ai-agent.js";

describe("operational AI application boundary", () => {
  it("requests structured output and returns only a guarded proposal", async () => {
    const generateStructured = vi.fn(async () => ({
      action: "DRAFT_OPERATIONAL_SUMMARY",
      rationale: "Resumo operacional para revisão.",
      evidence: ["error_rate=0"],
      stateMutation: false,
      clinicalAuthority: false,
    }));

    const proposal = await runOperationalAiProposal(
      {
        requestId: "request-1",
        tool: "DRAFT_OPERATIONAL_SUMMARY",
        impact: "INFORMATIONAL",
        input: "internal metrics",
        instructions: "Summarize only; never change state.",
        estimatedCostUsd: 0.01,
        costCeilingUsd: 0.05,
        generatedAt: "2026-08-14T09:00:00.000Z",
      },
      { generateStructured },
    );

    expect(proposal.requiresHumanReview).toBe(false);
    expect(generateStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        input: "internal metrics",
        instructions: "Summarize only; never change state.",
        schemaName: "OperationalAiProposal",
      }),
    );
  });

  it("fails closed when generated output attempts to mutate state", async () => {
    await expect(
      runOperationalAiProposal(
        {
          requestId: "request-1",
          tool: "SUGGEST_RUNBOOK_STEP",
          impact: "IMPACTFUL",
          input: "internal metrics",
          instructions: "Suggest a runbook step.",
          estimatedCostUsd: 0.01,
          costCeilingUsd: 0.05,
          generatedAt: "2026-08-14T09:00:00.000Z",
        },
        {
          generateStructured: async () => ({
            action: "PUBLISH_CONTENT",
            rationale: "unsafe",
            evidence: [],
            stateMutation: true,
            clinicalAuthority: false,
          }),
        },
      ),
    ).rejects.toThrow("stateMutation");
  });

  it("rejects oversized or empty model input before calling the provider", async () => {
    const generateStructured = vi.fn();
    await expect(
      runOperationalAiProposal(
        {
          requestId: "request-1",
          tool: "READ_OPERATIONAL_METRICS",
          impact: "INFORMATIONAL",
          input: " ",
          instructions: "Read metrics.",
          estimatedCostUsd: 0,
          costCeilingUsd: 0.05,
          generatedAt: "2026-08-14T09:00:00.000Z",
        },
        { generateStructured },
      ),
    ).rejects.toThrow("input");
    expect(generateStructured).not.toHaveBeenCalled();
  });
});
