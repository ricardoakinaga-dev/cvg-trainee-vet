import { describe, expect, it } from "vitest";

import {
  advanceDigitalCase,
  createDigitalCaseDefinition,
  createInitialDigitalCaseState,
  evaluateDoseInfusion,
  evaluateStructuredFields,
  calculateDoseInfusion,
  getVisibleDigitalCaseExams,
  projectPublicDigitalCaseRuntime,
  projectPublicDigitalCaseStage,
  type DigitalCaseDefinition,
} from "./learning-interactions.js";
import {
  evaluateModuleAttempt,
  getModuleDraftPack,
  type ModuleAnswer,
} from "./learning-runtime.js";
import { toParticipantActivityFromDraft } from "./projection.js";

const definition: DigitalCaseDefinition = createDigitalCaseDefinition({
  caseId: "M03-DIGITAL-CASE-V1",
  stageItemIds: ["M03-S1-Q01", "M03-S2-Q01", "M03-S3-Q01"],
});

describe("learning interactions", () => {
  it("keeps digital case state persistent across branches and reveals serial exams", () => {
    const initial = createInitialDigitalCaseState(
      definition,
      "2026-08-14T09:00:00.000Z",
    );

    const afterFirstBranch = advanceDigitalCase(definition, initial, {
      selectedChoiceIds: ["a"],
      expectedVersion: 0,
      now: "2026-08-14T09:01:00.000Z",
    });
    const afterSecondBranch = advanceDigitalCase(definition, afterFirstBranch, {
      selectedChoiceIds: ["b"],
      expectedVersion: 1,
      now: "2026-08-14T09:02:00.000Z",
    });

    expect(initial).not.toBe(afterFirstBranch);
    expect(afterFirstBranch).toMatchObject({
      currentStage: 2,
      version: 1,
      state: { path: "ESTABILIZACAO" },
    });
    expect(afterFirstBranch.consequences).toHaveLength(1);
    expect(afterFirstBranch.revealedExamSeriesIds).toContain(
      "RADIOGRAFIA-SERIES",
    );
    expect(afterSecondBranch).toMatchObject({
      currentStage: 3,
      version: 2,
      state: { branch: "MONITORAMENTO" },
    });
    expect(getVisibleDigitalCaseExams(definition, afterSecondBranch)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ modality: "RADIOGRAFIA" }),
        expect.objectContaining({ modality: "POCUS" }),
      ]),
    );
    expect(() =>
      advanceDigitalCase(definition, afterSecondBranch, {
        selectedChoiceIds: ["a"],
        expectedVersion: 1,
        now: "2026-08-14T09:03:00.000Z",
      }),
    ).toThrow("case state version is stale");
  });

  it("publishes case stage metadata without branch consequences or internal patches", () => {
    const projection = projectPublicDigitalCaseStage(definition, 1);

    expect(projection).toMatchObject({
      caseId: definition.id,
      stage: 1,
    });
    expect(projection.examSeries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ modality: "RADIOGRAFIA" }),
        expect.objectContaining({ modality: "POCUS" }),
        expect.objectContaining({ modality: "ECG" }),
      ]),
    );
    expect(JSON.stringify(projection)).not.toContain("ESTABILIZACAO");
    expect(JSON.stringify(projection)).not.toContain("nextStage");
  });

  it("projects only visible serial exams and participant-safe case consequences", () => {
    const initial = createInitialDigitalCaseState(
      definition,
      "2026-08-14T09:00:00.000Z",
    );
    const advanced = advanceDigitalCase(definition, initial, {
      selectedChoiceIds: ["a"],
      expectedVersion: 0,
      now: "2026-08-14T09:01:00.000Z",
    });
    const projection = projectPublicDigitalCaseRuntime(definition, advanced);

    expect(projection).toMatchObject({
      caseId: definition.id,
      version: 1,
      currentStage: 2,
      state: { path: "ESTABILIZACAO" },
    });
    expect(projection.revealedExamSeries[0]?.observations).toEqual([
      {
        sequence: 1,
        syntheticSummary: "Achado sintético inicial do cenário digital.",
      },
    ]);
    expect(JSON.stringify(projection)).not.toContain("statePatch");
    expect(JSON.stringify(projection)).not.toContain("nextStage");
  });

  it("scores structured fields with an automatic rubric and rejects malformed values", () => {
    const result = evaluateStructuredFields(
      {
        kind: "STRUCTURED_FIELDS",
        fields: [
          {
            id: "priority",
            label: "Prioridade",
            valueType: "TEXT",
            required: true,
          },
          {
            id: "reassessmentMinutes",
            label: "Reavaliação",
            valueType: "NUMBER",
            unit: "min",
            required: true,
            min: 1,
            max: 240,
          },
        ],
        rubric: {
          criteria: [
            {
              fieldId: "priority",
              expectedValue: "IMEDIATA",
              points: 1,
            },
            {
              fieldId: "reassessmentMinutes",
              expectedValue: 15,
              tolerance: 1,
              points: 1,
            },
          ],
          passScore: 2,
        },
      },
      { priority: "IMEDIATA", reassessmentMinutes: 15 },
    );

    expect(result).toMatchObject({
      earnedPoints: 2,
      totalPoints: 2,
      percent: 100,
      passed: true,
      missingFieldIds: [],
      invalidFieldIds: [],
    });
    expect(
      evaluateStructuredFields(
        {
          kind: "STRUCTURED_FIELDS",
          fields: [
            {
              id: "weight",
              label: "Peso",
              valueType: "NUMBER",
              unit: "kg",
              required: true,
              min: 0.1,
              max: 100,
            },
          ],
          rubric: {
            criteria: [{ fieldId: "weight", expectedValue: 10, points: 1 }],
            passScore: 1,
          },
        },
        { weight: "dez" },
      ),
    ).toMatchObject({
      passed: false,
      invalidFieldIds: ["weight"],
    });
  });

  it("calculates dose and infusion fields with the automatic rubric", () => {
    const result = evaluateDoseInfusion(
      {
        kind: "DOSE_INFUSION",
        fields: [
          {
            id: "doseMg",
            label: "Dose calculada",
            valueType: "NUMBER",
            unit: "mg",
            required: true,
          },
          {
            id: "volumeMl",
            label: "Volume calculado",
            valueType: "NUMBER",
            unit: "mL",
            required: true,
          },
          {
            id: "rateMlPerHour",
            label: "Velocidade de infusão",
            valueType: "NUMBER",
            unit: "mL/h",
            required: true,
          },
        ],
        calculationInputs: {
          weightKg: 10,
          doseMgPerKg: 2,
          concentrationMgPerMl: 4,
          durationHours: 2,
        },
        formulaLabel:
          "dose = peso × dose/kg; volume = dose ÷ concentração; taxa = volume ÷ tempo",
        tolerance: 0.01,
      },
      { doseMg: 20, volumeMl: 5, rateMlPerHour: 2.5 },
    );

    expect(result).toMatchObject({
      earnedPoints: 3,
      totalPoints: 3,
      percent: 100,
      passed: true,
    });
  });

  it("materializes the rich interactions in a draft and redacts internal scoring", () => {
    const pack = getModuleDraftPack("M24");
    const structured = pack.items.find(
      (item) => item.responseMode === "STRUCTURED_FIELDS",
    );
    const dose = pack.items.find(
      (item) => item.responseMode === "DOSE_INFUSION",
    );
    const openResponse = pack.items.find(
      (item) => item.responseMode === "TEXT",
    );
    const projection = toParticipantActivityFromDraft(pack);

    expect(structured?.interaction).toMatchObject({
      kind: "STRUCTURED_FIELDS",
      rubric: { criteria: expect.any(Array) },
    });
    expect(dose?.interaction).toMatchObject({
      kind: "DOSE_INFUSION",
      calculationInputs: expect.any(Object),
    });
    expect(openResponse?.humanCorrectionOwner).toBe("RICARDO");
    expect(pack.learningLoop.digitalCase.examSeries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ modality: "RADIOGRAFIA" }),
        expect.objectContaining({ modality: "POCUS" }),
        expect.objectContaining({ modality: "ECG" }),
      ]),
    );
    expect(JSON.stringify(projection).includes('"rubric"')).toBe(false);
    expect(
      projection.items.some((item) => item.responseMode === "DOSE_INFUSION"),
    ).toBe(true);
  });

  it("uses the automatic structured and dose rubrics in module evaluation", () => {
    const pack = getModuleDraftPack("M24");
    const answers: readonly ModuleAnswer[] = pack.items.flatMap(
      (item): readonly ModuleAnswer[] => {
        if (item.responseMode === "CHOICE") {
          return [
            { itemId: item.id, selectedChoiceIds: item.correctChoiceIds ?? [] },
          ];
        }
        if (item.responseMode === "STRUCTURED_FIELDS") {
          return [
            {
              itemId: item.id,
              structuredValues: {
                priority: "IMEDIATA",
                reassessmentMinutes: 15,
              },
            },
          ];
        }
        if (
          item.responseMode === "DOSE_INFUSION" &&
          item.interaction?.kind === "DOSE_INFUSION"
        ) {
          const expected = calculateDoseInfusion(
            item.interaction.calculationInputs,
          );
          return [
            {
              itemId: item.id,
              structuredValues: expected,
            },
          ];
        }
        return [];
      },
    );

    const result = evaluateModuleAttempt({
      moduleId: "M24",
      answers,
      completedAt: "2026-08-14T09:00:00.000Z",
      mode: "FORMATIVE_CHOICE",
    });

    expect(result.status).toBe("DOMINIO_DIGITAL");
    expect(result.scorePercent).toBe(100);
  });
});
