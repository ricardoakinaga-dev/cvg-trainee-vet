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

  it("rejects malformed components, objective data, and unsupported scoring branches", () => {
    const validInput = {
      caseComponent: responded("CASO", 80),
      examComponent: responded("PROVA", 80),
      objectives: [],
    } as const;

    expect(() =>
      evaluateSummativeAssessment({
        ...validInput,
        caseComponent: null as never,
      }),
    ).toThrow("assessment component");
    expect(() =>
      evaluateSummativeAssessment({
        ...validInput,
        caseComponent: {
          kind: "CASO",
          status: "RESPONDIDO",
        },
      }),
    ).toThrow("scorePercent");
    expect(() =>
      evaluateSummativeAssessment({
        ...validInput,
        caseComponent: {
          kind: "CASO",
          status: "RESPONDIDO",
          scorePercent: 101,
        },
      }),
    ).toThrow("scorePercent");
    expect(() =>
      evaluateSummativeAssessment({
        ...validInput,
        caseComponent: { kind: "CASO", status: "UNKNOWN" as never },
      }),
    ).toThrow("status");
    expect(() =>
      evaluateSummativeAssessment({
        ...validInput,
        caseComponent: {
          kind: "CASO",
          status: "DADO_INCOMPLETO",
          scorePercent: 1,
        },
      }),
    ).toThrow("not allowed");
    expect(() =>
      evaluateSummativeAssessment({
        ...validInput,
        caseComponent: responded("PROVA", 80),
      }),
    ).toThrow("kind CASO");
    expect(() =>
      evaluateSummativeAssessment({
        ...validInput,
        examComponent: responded("CASO", 80),
      }),
    ).toThrow("kind PROVA");
    expect(() =>
      evaluateSummativeAssessment({
        ...validInput,
        quizPercent: 101,
      }),
    ).toThrow("quizPercent");
    expect(() =>
      evaluateSummativeAssessment({
        ...validInput,
        objectives: [{ objectiveId: "", critical: false }],
      }),
    ).toThrow("objectiveId");
    expect(() =>
      evaluateSummativeAssessment({
        ...validInput,
        objectives: [
          { objectiveId: "OBJ-1", critical: false },
          { objectiveId: "OBJ-1", critical: false },
        ],
      }),
    ).toThrow("unique");
    expect(() =>
      evaluateSummativeAssessment({
        ...validInput,
        objectives: [
          {
            objectiveId: "OBJ-1",
            critical: false,
            status: "UNKNOWN" as never,
          },
        ],
      }),
    ).toThrow("status");
    expect(() =>
      evaluateSummativeAssessment({
        ...validInput,
        objectives: [
          {
            objectiveId: "OBJ-1",
            critical: false,
            status: "NAO_APLICAVEL",
            percent: 80,
          },
        ],
      }),
    ).toThrow("not allowed");
    expect(() =>
      evaluateSummativeAssessment({
        ...validInput,
        objectives: [{ objectiveId: "OBJ-1", critical: false, percent: 101 }],
      }),
    ).toThrow("percent");

    expect(
      evaluateSummativeAssessment({
        ...validInput,
        objectives: [
          { objectiveId: "OBJ-1", critical: false, percent: 80 },
          { objectiveId: "OBJ-2", critical: false, status: "NAO_APLICAVEL" },
        ],
      }).status,
    ).toBe("APROVADO");
    expect(
      evaluateSummativeAssessment({
        ...validInput,
        objectives: [
          { objectiveId: "OBJ-1", critical: false, status: "DADO_INCOMPLETO" },
        ],
      }).status,
    ).toBe("PENDENTE_DADOS");
    expect(
      evaluateSummativeAssessment({
        caseComponent: { kind: "CASO", status: "NAO_APLICAVEL" },
        examComponent: { kind: "PROVA", status: "NAO_APLICAVEL" },
        objectives: [],
      }).status,
    ).toBe("PENDENTE_DADOS");
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

  it("allows a different equivalent form after the seven-day minimum interval", () => {
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

  it("rejects invalid eligibility inputs and malformed prior forms", () => {
    expect(() =>
      evaluateSummativeAttemptEligibility({
        ...base,
        now: "invalid",
      }),
    ).toThrow("now");
    expect(() =>
      evaluateSummativeAttemptEligibility({
        ...base,
        itemIds: [],
      }),
    ).toThrow("itemIds");
    expect(() =>
      evaluateSummativeAttemptEligibility({
        ...base,
        itemIds: ["item-a", "item-a"],
      }),
    ).toThrow("unique");
    expect(() =>
      evaluateSummativeAttemptEligibility({
        ...base,
        history: { ...base.history, attemptCount: -1 },
      }),
    ).toThrow("attemptCount");
    expect(() =>
      evaluateSummativeAttemptEligibility({
        ...base,
        history: { ...base.history, remediationCompleted: "no" as never },
      }),
    ).toThrow("boolean");
    expect(() =>
      evaluateSummativeAttemptEligibility({
        ...base,
        history: (() => {
          const { lastSubmittedAt, ...historyWithoutSubmission } = base.history;
          void lastSubmittedAt;
          return { ...historyWithoutSubmission, attemptCount: 1 };
        })(),
      }),
    ).toThrow("lastSubmittedAt");
    expect(() =>
      evaluateSummativeAttemptEligibility({
        ...base,
        history: { ...base.history, previousItemIds: [[]] },
      }),
    ).toThrow("previousItemIds");
    expect(() =>
      evaluateSummativeAttemptEligibility({
        ...base,
        history: {
          ...base.history,
          previousItemIds: [["item-a", "item-a"]],
        },
      }),
    ).toThrow("unique");
    expect(
      evaluateSummativeAttemptEligibility({
        now: base.now,
        itemIds: ["item-a"],
        history: {
          attemptCount: 0,
          remediationCompleted: false,
          previousItemIds: [],
        },
      }),
    ).toEqual({ eligible: true, reason: "ELIGIBLE" });
  });
});
