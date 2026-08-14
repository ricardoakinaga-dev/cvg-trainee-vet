import { describe, expect, it } from "vitest";

import {
  operationalAiProposalRequestSchema,
  operationalAiProposalProjectionSchema,
} from "./operational-ai.js";

describe("operational AI contracts", () => {
  it("accepts a bounded proposal request and strict non-authoritative output", () => {
    const request = operationalAiProposalRequestSchema.parse({
      tool: "DRAFT_OPERATIONAL_SUMMARY",
      impact: "IMPACTFUL",
      input: "queue_depth=12",
      instructions: "Return an operational summary only.",
      estimatedCostUsd: 0.03,
    });
    const projection = operationalAiProposalProjectionSchema.parse({
      requestId: "request-1",
      tool: request.tool,
      impact: request.impact,
      estimatedCostUsd: request.estimatedCostUsd,
      costCeilingUsd: 0.25,
      generatedAt: "2026-08-14T12:00:00.000Z",
      output: {
        action: "Review queue",
        rationale: "The queue exceeds the threshold.",
        evidence: ["queue_depth=12"],
        stateMutation: false,
        clinicalAuthority: false,
      },
      requiresHumanReview: true,
      stateSource: false,
      clinicalAuthority: false,
    });

    expect(projection.output.stateMutation).toBe(false);
  });

  it("rejects unsupported tools and any attempt to expose a state mutation", () => {
    expect(() =>
      operationalAiProposalRequestSchema.parse({
        tool: "PUBLISH_CONTENT",
        impact: "INFORMATIONAL",
        input: "queue_depth=1",
        instructions: "summary",
        estimatedCostUsd: 0.01,
      }),
    ).toThrow();
    expect(() =>
      operationalAiProposalProjectionSchema.parse({
        requestId: "request-1",
        tool: "READ_OPERATIONAL_METRICS",
        impact: "INFORMATIONAL",
        input: "metrics",
        instructions: "summary",
        estimatedCostUsd: 0.01,
        costCeilingUsd: 0.25,
        generatedAt: "2026-08-14T12:00:00.000Z",
        output: {
          action: "read",
          rationale: "rationale",
          evidence: [],
          stateMutation: true,
          clinicalAuthority: false,
        },
        requiresHumanReview: false,
        stateSource: false,
        clinicalAuthority: false,
      }),
    ).toThrow();
  });
});
