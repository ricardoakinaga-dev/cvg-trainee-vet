import { describe, expect, it } from "vitest";

import {
  AssessmentPolicyError,
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

describe("summative assessment policy branches", () => {
  const caseComponent = {
    kind: "CASO",
    status: "RESPONDIDO",
    scorePercent: 90,
  } as const;
  const examComponent = {
    kind: "PROVA",
    status: "RESPONDIDO",
    scorePercent: 80,
  } as const;

  it("rejects malformed components and invalid kinds", () => {
    expect(() =>
      evaluateSummativeAssessment({
        caseComponent: null as never,
        examComponent,
        objectives: [],
      }),
    ).toThrow(AssessmentPolicyError);
    expect(() =>
      evaluateSummativeAssessment({
        caseComponent: { ...caseComponent, status: "INVALIDO" } as never,
        examComponent,
        objectives: [],
      }),
    ).toThrow(AssessmentPolicyError);
    expect(() =>
      evaluateSummativeAssessment({
        caseComponent: {
          ...caseComponent,
          scorePercent: 101,
        },
        examComponent,
        objectives: [],
      }),
    ).toThrow(AssessmentPolicyError);
    expect(() =>
      evaluateSummativeAssessment({
        caseComponent: { ...caseComponent, kind: "PROVA" },
        examComponent,
        objectives: [],
      }),
    ).toThrow(AssessmentPolicyError);
    expect(() =>
      evaluateSummativeAssessment({
        caseComponent,
        examComponent: { ...examComponent, kind: "CASO" },
        objectives: [],
      }),
    ).toThrow(AssessmentPolicyError);
    expect(() =>
      evaluateSummativeAssessment({
        caseComponent,
        examComponent,
        quizPercent: -1,
        objectives: [],
      }),
    ).toThrow(AssessmentPolicyError);
  });

  it("rejects duplicate or malformed objectives", () => {
    expect(() =>
      evaluateSummativeAssessment({
        caseComponent,
        examComponent,
        objectives: [
          { objectiveId: "A", critical: false },
          { objectiveId: "A", critical: false },
        ],
      }),
    ).toThrow(AssessmentPolicyError);
    expect(() =>
      evaluateSummativeAssessment({
        caseComponent,
        examComponent,
        objectives: [{ objectiveId: "", critical: false }],
      }),
    ).toThrow(AssessmentPolicyError);
    expect(() =>
      evaluateSummativeAssessment({
        caseComponent,
        examComponent,
        objectives: [
          { objectiveId: "A", status: "INVALIDO", critical: false } as never,
        ],
      }),
    ).toThrow(AssessmentPolicyError);
    expect(() =>
      evaluateSummativeAssessment({
        caseComponent,
        examComponent,
        objectives: [
          {
            objectiveId: "A",
            status: "RESPONDIDO",
            percent: 70.5,
            critical: false,
          },
        ],
      }),
    ).toThrow(AssessmentPolicyError);
    expect(() =>
      evaluateSummativeAssessment({
        caseComponent,
        examComponent,
        objectives: [
          {
            objectiveId: "A",
            status: "DADO_INCOMPLETO",
            percent: 10,
            critical: false,
          },
        ],
      }),
    ).toThrow(AssessmentPolicyError);
  });

  it("returns pending when data is incomplete", () => {
    const pending = evaluateSummativeAssessment({
      caseComponent: { kind: "CASO", status: "DADO_INCOMPLETO" },
      examComponent,
      objectives: [
        { objectiveId: "A", status: "DADO_INCOMPLETO", critical: false },
      ],
    });
    expect(pending.status).toBe("PENDENTE_DADOS");
    const allIncomplete = evaluateSummativeAssessment({
      caseComponent: { kind: "CASO", status: "NAO_APLICAVEL" },
      examComponent: { kind: "PROVA", status: "DADO_INCOMPLETO" },
      objectives: [],
    });
    expect(allIncomplete.status).toBe("PENDENTE_DADOS");
  });

  it("returns approved or reforco based on the weighted score", () => {
    const approved = evaluateSummativeAssessment({
      caseComponent,
      examComponent,
      objectives: [
        {
          objectiveId: "A",
          status: "RESPONDIDO",
          percent: 80,
          critical: false,
        },
      ],
    });
    expect(approved.status).toBe("APROVADO");
    expect(approved.scorePercent).toBe(83);
    const reforco = evaluateSummativeAssessment({
      caseComponent: { ...caseComponent, scorePercent: 50 },
      examComponent: { ...examComponent, scorePercent: 40 },
      objectives: [
        {
          objectiveId: "A",
          status: "RESPONDIDO",
          percent: 60,
          critical: false,
        },
      ],
    });
    expect(reforco.status).toBe("REFORCO");
    const critical = evaluateSummativeAssessment({
      caseComponent,
      examComponent,
      objectives: [
        { objectiveId: "A", status: "RESPONDIDO", percent: 50, critical: true },
      ],
    });
    expect(critical.status).toBe("REFORCO");
    expect(critical.criticalObjectiveIdsBelowThreshold).toEqual(["A"]);
  });

  it("tracks pending objectives and quiz percent", () => {
    const result = evaluateSummativeAssessment({
      caseComponent,
      examComponent,
      quizPercent: 10,
      objectives: [
        { objectiveId: "A", status: "DADO_INCOMPLETO", critical: false },
        { objectiveId: "B", status: "NAO_APLICAVEL", critical: false },
      ],
    });
    expect(result.pendingObjectiveIds).toEqual(["A"]);
    expect(result.quizWeightPercent).toBe(0);
  });
});

describe("summative attempt eligibility branches", () => {
  const now = "2026-08-17T12:00:00.000Z";

  it("rejects invalid timestamps, item sets and histories", () => {
    expect(() =>
      evaluateSummativeAttemptEligibility({
        now: "bad",
        itemIds: ["I1"],
        history: {
          attemptCount: 0,
          remediationCompleted: false,
          previousItemIds: [],
        },
      }),
    ).toThrow(AssessmentPolicyError);
    expect(() =>
      evaluateSummativeAttemptEligibility({
        now,
        itemIds: [],
        history: {
          attemptCount: 0,
          remediationCompleted: false,
          previousItemIds: [],
        },
      }),
    ).toThrow(AssessmentPolicyError);
    expect(() =>
      evaluateSummativeAttemptEligibility({
        now,
        itemIds: ["I1", "I1"],
        history: {
          attemptCount: 0,
          remediationCompleted: false,
          previousItemIds: [],
        },
      }),
    ).toThrow(AssessmentPolicyError);
    expect(() =>
      evaluateSummativeAttemptEligibility({
        now,
        itemIds: ["I1"],
        history: {
          attemptCount: -1,
          remediationCompleted: false,
          previousItemIds: [],
        },
      }),
    ).toThrow(AssessmentPolicyError);
    expect(() =>
      evaluateSummativeAttemptEligibility({
        now,
        itemIds: ["I1"],
        history: {
          attemptCount: 1,
          remediationCompleted: "yes" as never,
          previousItemIds: [],
        },
      }),
    ).toThrow(AssessmentPolicyError);
    expect(() =>
      evaluateSummativeAttemptEligibility({
        now,
        itemIds: ["I1"],
        history: {
          attemptCount: 1,
          remediationCompleted: true,
          previousItemIds: [],
        } as never,
      }),
    ).toThrow(AssessmentPolicyError);
  });

  it("rejects repeated items, mandatory remediation and minimum intervals", () => {
    const base = {
      now,
      itemIds: ["I1", "I2"],
      history: {
        attemptCount: 2,
        lastSubmittedAt: "2026-08-01T12:00:00.000Z",
        remediationCompleted: false,
        previousItemIds: [["I9", "I1"]],
      },
    } as const;
    expect(evaluateSummativeAttemptEligibility(base).reason).toBe(
      "ITENS_REPETIDOS",
    );
    expect(
      evaluateSummativeAttemptEligibility({
        ...base,
        history: {
          ...base.history,
          previousItemIds: [["I9"]],
        },
      }).reason,
    ).toBe("REMEDIACAO_OBRIGATORIA");
    const interval = evaluateSummativeAttemptEligibility({
      now: "2026-08-07T12:00:00.000Z",
      itemIds: ["I1", "I2"],
      history: {
        attemptCount: 2,
        lastSubmittedAt: "2026-08-01T12:00:00.000Z",
        remediationCompleted: true,
        previousItemIds: [],
      },
    });
    expect(interval.reason).toBe("INTERVALO_MINIMO");
    if (interval.eligible === false) {
      expect(interval.nextAllowedAt).toBe("2026-08-08T12:00:00.000Z");
    }
  });

  it("allows an eligible attempt", () => {
    const result = evaluateSummativeAttemptEligibility({
      now: "2026-08-17T12:00:00.000Z",
      itemIds: ["I1", "I2"],
      history: {
        attemptCount: 1,
        lastSubmittedAt: "2026-08-01T12:00:00.000Z",
        remediationCompleted: true,
        previousItemIds: [],
      },
    });
    expect(result).toEqual({ eligible: true, reason: "ELIGIBLE" });
  });
});
