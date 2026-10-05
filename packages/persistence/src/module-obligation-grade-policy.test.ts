import { describe, expect, it } from "vitest";

import {
  decideSummativeGrade,
  type ApprovedSummativeGradeEvidence,
  type SummativeGradePolicy,
} from "./module-obligation-grade-policy.js";

const ids = (value: number) =>
  `44444444-4444-4444-8444-${String(value).padStart(12, "0")}`;
const participantId = ids(1);
const scopeId = ids(2);
const assignmentId = ids(3);
const moduleId = "M07";
const blueprintVersionId = ids(4);
const blueprintVersion = 3;
const now = new Date("2026-10-04T12:00:00.000Z");

type Result = ApprovedSummativeGradeEvidence["results"][number];

function result(overrides: Partial<Result> = {}): Result {
  return {
    obligationId: "obl-caso",
    assessmentResultId: ids(10),
    modality: "CASO",
    overallPercent: 80,
    criticalPercent: 90,
    itemCount: 20,
    criticalItemCount: 5,
    recordedAt: new Date("2026-10-04T11:00:00.000Z"),
    correctionOutcome: "APROVADO",
    ...overrides,
  };
}

function policy(
  overrides: Partial<SummativeGradePolicy> = {},
): SummativeGradePolicy {
  return {
    decisionId: ids(20),
    version: 1,
    scopeId,
    moduleId,
    blueprintVersionId,
    blueprintVersion,
    approvedBy: ids(21),
    approvedAt: new Date("2026-09-01T09:00:00.000Z"),
    composition: [
      { kind: "CASO", weightPercent: 30 },
      { kind: "EXAME", weightPercent: 70 },
    ],
    minimumOverallPercent: 70,
    minimumCriticalPercent: 80,
    ...overrides,
  };
}

function evidence(
  overrides: Partial<ApprovedSummativeGradeEvidence> = {},
): ApprovedSummativeGradeEvidence {
  return {
    expected: {
      assignmentId,
      participantId,
      scopeId,
      moduleId,
      blueprintVersionId,
      blueprintVersion,
    },
    now,
    obligations: [
      {
        obligationId: "obl-caso",
        activityId: ids(30),
        assessmentResultId: ids(10),
        correctionOutcome: "APROVADO",
      },
      {
        obligationId: "obl-exame",
        activityId: ids(31),
        assessmentResultId: ids(11),
        correctionOutcome: "APROVADO",
      },
    ],
    results: [
      result(),
      result({
        obligationId: "obl-exame",
        assessmentResultId: ids(11),
        modality: "EXAME",
        overallPercent: 75,
        criticalPercent: 85,
      }),
    ],
    ...overrides,
  };
}

describe("D-102 summative grade policy", () => {
  it("approves only when the weighted composition clears both thresholds", () => {
    const decision = decideSummativeGrade(policy(), evidence());

    expect(decision).toEqual({
      outcome: "APROVADO_SOMATIVO",
      policyDecisionId: ids(20),
      policyVersion: 1,
      overallPercent: 76.5,
      components: [
        { obligationId: "obl-caso", modality: "CASO", weightPercent: 30 },
        { obligationId: "obl-exame", modality: "EXAME", weightPercent: 70 },
      ],
      minimumCriticalPercent: 80,
    });
  });

  it("rejects a weighted overall below the general threshold", () => {
    const decision = decideSummativeGrade(
      policy(),
      evidence({
        results: [
          result({ overallPercent: 40, criticalPercent: 90 }),
          result({
            obligationId: "obl-exame",
            assessmentResultId: ids(11),
            modality: "EXAME",
            overallPercent: 70,
            criticalPercent: 85,
          }),
        ],
      }),
    );

    expect(decision).toMatchObject({
      outcome: "REPROVADO",
      reason: "GERAL_ABAIXO_DO_LIMIAR",
      overallPercent: 61,
    });
  });

  it("rejects a critical component below its threshold even with a high overall", () => {
    const decision = decideSummativeGrade(
      policy(),
      evidence({
        results: [
          result({ overallPercent: 95, criticalPercent: 79.9 }),
          result({
            obligationId: "obl-exame",
            assessmentResultId: ids(11),
            modality: "EXAME",
            overallPercent: 95,
            criticalPercent: 95,
          }),
        ],
      }),
    );

    expect(decision).toMatchObject({
      outcome: "REPROVADO",
      reason: "CRITICO_ABAIXO_DO_LIMIAR",
    });
  });

  it("does not assume a single scalar result for the whole module", () => {
    const decision = decideSummativeGrade(
      policy(),
      evidence({
        results: [result({ modality: "CASO", overallPercent: 100 })],
      }),
    );

    expect(decision).toMatchObject({
      outcome: "NAO_APLICAVEL",
      reason: "COMPONENTE_SEM_EVIDENCIA",
    });
  });

  it("denies a summative approval built from a REFORCO correction", () => {
    expect(() =>
      decideSummativeGrade(
        policy(),
        evidence({
          results: [
            result({ correctionOutcome: "REFORCO" }),
            result({
              obligationId: "obl-exame",
              assessmentResultId: ids(11),
              modality: "EXAME",
              overallPercent: 75,
              criticalPercent: 85,
            }),
          ],
        }),
      ),
    ).toThrowError(/summative grade is unavailable/u);
  });

  it("denies a policy frozen for another module, scope or blueprint", () => {
    for (const foreign of [
      policy({ scopeId: ids(40) }),
      policy({ moduleId: "M08" }),
      policy({ blueprintVersion: blueprintVersion + 1 }),
      policy({ blueprintVersionId: ids(41) }),
    ])
      expect(() => decideSummativeGrade(foreign, evidence())).toThrowError(
        /summative grade is unavailable/u,
      );
  });

  it("denies a result attributed to a foreign obligation", () => {
    expect(() =>
      decideSummativeGrade(
        policy(),
        evidence({ results: [result({ obligationId: "obl-inexistente" })] }),
      ),
    ).toThrowError(/summative grade is unavailable/u);
  });

  it("denies duplicated and mismatched component identities", () => {
    expect(() =>
      decideSummativeGrade(
        policy(),
        evidence({
          results: [
            result(),
            result({ assessmentResultId: ids(10) }),
            result({
              obligationId: "obl-exame",
              assessmentResultId: ids(11),
              modality: "EXAME",
              overallPercent: 75,
              criticalPercent: 85,
            }),
          ],
        }),
      ),
    ).toThrowError(/summative grade is unavailable/u);
    expect(() =>
      decideSummativeGrade(
        policy(),
        evidence({
          results: [
            result({ assessmentResultId: ids(99) }),
            result({
              obligationId: "obl-exame",
              assessmentResultId: ids(11),
              modality: "EXAME",
              overallPercent: 75,
              criticalPercent: 85,
            }),
          ],
        }),
      ),
    ).toThrowError(/summative grade is unavailable/u);
  });

  it("denies a duplicated modality in the approved composition", () => {
    expect(() =>
      decideSummativeGrade(
        policy({
          composition: [
            { kind: "CASO", weightPercent: 30 },
            { kind: "CASO", weightPercent: 30 },
            { kind: "EXAME", weightPercent: 40 },
          ],
        }),
        evidence(),
      ),
    ).toThrowError(/summative grade is unavailable/u);
  });

  it("denies a composition that does not total one hundred percent", () => {
    expect(() =>
      decideSummativeGrade(
        policy({
          composition: [
            { kind: "CASO", weightPercent: 30 },
            { kind: "EXAME", weightPercent: 60 },
          ],
        }),
        evidence(),
      ),
    ).toThrowError(/summative grade is unavailable/u);
  });

  it("denies an out-of-range or non-integer declared score", () => {
    for (const invalid of [-1, 100.5, Number.NaN, Number.POSITIVE_INFINITY])
      expect(() =>
        decideSummativeGrade(
          policy(),
          evidence({
            results: [
              result({ overallPercent: invalid }),
              result({
                obligationId: "obl-exame",
                assessmentResultId: ids(11),
                modality: "EXAME",
                overallPercent: 75,
                criticalPercent: 85,
              }),
            ],
          }),
        ),
      ).toThrowError(/summative grade is unavailable/u);
  });

  it("denies a critical percentage without any critical item proven", () => {
    expect(() =>
      decideSummativeGrade(
        policy(),
        evidence({
          results: [
            result({ criticalItemCount: 0, criticalPercent: 95 }),
            result({
              obligationId: "obl-exame",
              assessmentResultId: ids(11),
              modality: "EXAME",
              overallPercent: 75,
              criticalPercent: 85,
              criticalItemCount: 4,
            }),
          ],
        }),
      ),
    ).toThrowError(/summative grade is unavailable/u);
  });

  it("denies a result recorded after the decision instant", () => {
    expect(() =>
      decideSummativeGrade(
        policy(),
        evidence({
          results: [
            result({ recordedAt: new Date("2026-10-04T12:00:00.001Z") }),
            result({
              obligationId: "obl-exame",
              assessmentResultId: ids(11),
              modality: "EXAME",
              overallPercent: 75,
              criticalPercent: 85,
            }),
          ],
        }),
      ),
    ).toThrowError(/summative grade is unavailable/u);
  });

  it("denies a policy approved after the obligations were finalized", () => {
    expect(() =>
      decideSummativeGrade(
        policy({ approvedAt: new Date("2026-10-04T11:59:59.000Z") }),
        evidence(),
      ),
    ).toThrowError(/summative grade is unavailable/u);
  });

  it("does not approve a module without an applicable approved policy", () => {
    expect(decideSummativeGrade(null, evidence())).toMatchObject({
      outcome: "NAO_APLICAVEL",
      reason: "SEM_POLITICA_APROVADA",
    });
  });

  it("never returns a public note, key, source or approval identity projection", () => {
    const decision = decideSummativeGrade(policy(), evidence());

    expect(Object.keys(decision).sort()).toEqual([
      "components",
      "minimumCriticalPercent",
      "outcome",
      "overallPercent",
      "policyDecisionId",
      "policyVersion",
    ]);
    expect(JSON.stringify(decision)).not.toMatch(
      /(sourceRef|chave|answerKey| gabarito|nota|weightByObjective)/iu,
    );
  });
});
