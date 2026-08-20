import { describe, expect, it } from "vitest";

import {
  confirmOperationalAiProposal,
  createOperationalAiProposal,
} from "./operational-ai.js";

const baseInput = {
  requestId: "request-1",
  tool: "READ_OPERATIONAL_METRICS" as const,
  impact: "IMPACTFUL" as const,
  estimatedCostUsd: 0.02,
  costCeilingUsd: 0.05,
  generatedAt: "2026-08-14T09:00:00.000Z",
  output: {
    action: "SUGGEST_RUNBOOK_STEP",
    rationale: "A fila de tarefas excedeu o limiar operacional configurado.",
    evidence: ["queue_depth=12"],
    stateMutation: false,
    clinicalAuthority: false,
  },
};

describe("operational AI safety policy", () => {
  it("creates a structured proposal that cannot be a state or clinical authority", () => {
    const proposal = createOperationalAiProposal(baseInput);

    expect(proposal).toMatchObject({
      requestId: "request-1",
      tool: "READ_OPERATIONAL_METRICS",
      impact: "IMPACTFUL",
      requiresHumanReview: true,
      stateSource: false,
      clinicalAuthority: false,
      costCeilingUsd: 0.05,
    });
    expect(Object.isFrozen(proposal)).toBe(true);
  });

  it("rejects tools outside the operational allowlist", () => {
    expect(() =>
      createOperationalAiProposal({
        ...baseInput,
        tool: "PUBLISH_CONTENT" as never,
      }),
    ).toThrow("tool is not allowed");
  });

  it("rejects a cost estimate above the configured ceiling", () => {
    expect(() =>
      createOperationalAiProposal({
        ...baseInput,
        estimatedCostUsd: 0.06,
      }),
    ).toThrow("cost ceiling");
  });

  it("rejects output that claims state mutation or clinical authority", () => {
    expect(() =>
      createOperationalAiProposal({
        ...baseInput,
        output: { ...baseInput.output, stateMutation: true },
      }),
    ).toThrow("stateMutation");

    expect(() =>
      createOperationalAiProposal({
        ...baseInput,
        output: { ...baseInput.output, clinicalAuthority: true },
      }),
    ).toThrow("clinicalAuthority");
  });

  it("requires an identified human confirmation for impactful proposals", () => {
    const proposal = createOperationalAiProposal(baseInput);

    expect(() =>
      confirmOperationalAiProposal(proposal, {
        confirmedBy: " ",
        confirmedAt: "2026-08-14T09:01:00.000Z",
      }),
    ).toThrow("confirmedBy");

    const confirmation = confirmOperationalAiProposal(proposal, {
      confirmedBy: "operator-1",
      confirmedAt: "2026-08-14T09:01:00.000Z",
      rationale: "Operador confirmou o passo operacional sugerido.",
    });

    expect(confirmation).toMatchObject({
      status: "CONFIRMED",
      confirmedBy: "operator-1",
      proposal,
    });
    expect(Object.isFrozen(confirmation)).toBe(true);
  });

  it("does not require confirmation for informational proposals", () => {
    const proposal = createOperationalAiProposal({
      ...baseInput,
      impact: "INFORMATIONAL",
    });

    expect(proposal.requiresHumanReview).toBe(false);
  });

  it("rejects malformed request, cost, timestamp and output boundaries", () => {
    expect(() =>
      createOperationalAiProposal({ ...baseInput, requestId: " " }),
    ).toThrow("requestId");
    expect(() =>
      createOperationalAiProposal({ ...baseInput, impact: "UNKNOWN" as never }),
    ).toThrow("impact");
    expect(() =>
      createOperationalAiProposal({ ...baseInput, estimatedCostUsd: -1 }),
    ).toThrow("estimated cost");
    expect(() =>
      createOperationalAiProposal({ ...baseInput, costCeilingUsd: 0 }),
    ).toThrow("cost ceiling");
    expect(() =>
      createOperationalAiProposal({ ...baseInput, generatedAt: "invalid" }),
    ).toThrow("generatedAt");
    expect(() =>
      createOperationalAiProposal({ ...baseInput, output: null }),
    ).toThrow("output must");
    expect(() =>
      createOperationalAiProposal({
        ...baseInput,
        output: { ...baseInput.output, unsupported: true },
      }),
    ).toThrow("unsupported fields");
    expect(() =>
      createOperationalAiProposal({
        ...baseInput,
        output: { ...baseInput.output, action: " " },
      }),
    ).toThrow("output.action");
    expect(() =>
      createOperationalAiProposal({
        ...baseInput,
        output: { ...baseInput.output, evidence: [" "] },
      }),
    ).toThrow("evidence");
    expect(() =>
      confirmOperationalAiProposal(createOperationalAiProposal(baseInput), {
        confirmedBy: "operator-1",
        confirmedAt: "invalid",
      }),
    ).toThrow("confirmedAt");
  });
});
