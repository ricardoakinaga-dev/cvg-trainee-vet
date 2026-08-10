import { describe, expect, it } from "vitest";

import {
  evaluateSummativeAssessment,
  evaluateSummativeAttemptEligibility,
  type AssessmentComponent,
} from "./assessment-policy.js";

const responded = (
  kind: AssessmentComponent["kind"],
  scorePercent: number,
): AssessmentComponent => ({
  kind,
  status: "RESPONDIDO",
  scorePercent,
});

describe("summative assessment policy", () => {
  it("applies 30/70 weights and keeps the formative quiz out of the score", () => {
    const result = evaluateSummativeAssessment({
      caseComponent: responded("CASO", 80),
      examComponent: responded("PROVA", 60),
      quizPercent: 0,
      objectives: [{ objectiveId: "OBJ-1", percent: 80, critical: true }],
    });

    expect(result).toMatchObject({
      status: "REFORCO",
      scorePercent: 66,
      quizWeightPercent: 0,
      caseWeightPercent: 30,
      examWeightPercent: 70,
    });
  });

  it("requires 80 percent in critical objectives even when the global score passes", () => {
    const result = evaluateSummativeAssessment({
      caseComponent: responded("CASO", 100),
      examComponent: responded("PROVA", 90),
      objectives: [{ objectiveId: "OBJ-CRITICO", percent: 79, critical: true }],
    });

    expect(result.status).toBe("REFORCO");
    expect(result.scorePercent).toBe(93);
    expect(result.criticalObjectiveIdsBelowThreshold).toEqual(["OBJ-CRITICO"]);
  });

  it("does not convert incomplete data to zero", () => {
    const result = evaluateSummativeAssessment({
      caseComponent: { kind: "CASO", status: "DADO_INCOMPLETO" },
      examComponent: responded("PROVA", 100),
      objectives: [],
    });

    expect(result).toEqual(
      expect.objectContaining({ status: "PENDENTE_DADOS" }),
    );
    expect(result).not.toHaveProperty("scorePercent");
  });

  it("renormalizes an explicitly non-applicable component without treating it as zero", () => {
    const result = evaluateSummativeAssessment({
      caseComponent: { kind: "CASO", status: "NAO_APLICAVEL" },
      examComponent: responded("PROVA", 80),
      objectives: [],
    });

    expect(result.status).toBe("APROVADO");
    expect(result.scorePercent).toBe(80);
  });
});

describe("summative attempt eligibility policy", () => {
  const base = {
    now: "2026-08-17T17:00:00.000Z",
    itemIds: ["item-c", "item-d"],
    history: {
      attemptCount: 1,
      lastSubmittedAt: "2026-08-10T17:00:00.000Z",
      remediationCompleted: false,
      previousItemIds: [["item-a", "item-b"]],
    },
  } as const;

  it("allows a different form after the seven-day interval", () => {
    expect(evaluateSummativeAttemptEligibility(base)).toEqual({
      eligible: true,
      reason: "ELIGIBLE",
    });
  });

  it("requires remediation after two failures, enforces the interval, and rejects repeated items", () => {
    expect(
      evaluateSummativeAttemptEligibility({
        ...base,
        now: "2026-08-12T17:00:00.000Z",
      }),
    ).toMatchObject({ eligible: false, reason: "INTERVALO_MINIMO" });
    expect(
      evaluateSummativeAttemptEligibility({
        ...base,
        history: { ...base.history, attemptCount: 2 },
      }),
    ).toMatchObject({ eligible: false, reason: "REMEDIACAO_OBRIGATORIA" });
    expect(
      evaluateSummativeAttemptEligibility({
        ...base,
        itemIds: ["item-a", "item-c"],
      }),
    ).toMatchObject({ eligible: false, reason: "ITENS_REPETIDOS" });
  });

  it("allows a new attempt after the required remediation", () => {
    expect(
      evaluateSummativeAttemptEligibility({
        ...base,
        history: {
          ...base.history,
          attemptCount: 2,
          remediationCompleted: true,
        },
      }),
    ).toMatchObject({ eligible: true, reason: "ELIGIBLE" });
  });
});
