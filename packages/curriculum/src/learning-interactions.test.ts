import { describe, expect, it } from "vitest";

import {
  LearningInteractionError,
  advanceDigitalCase,
  createDigitalCaseDefinition,
  createInitialDigitalCaseState,
  evaluateDoseInfusion,
  evaluateStructuredFields,
  calculateDoseInfusion,
  getVisibleDigitalCaseExams,
  projectPublicDigitalCaseRuntime,
  projectPublicDigitalCaseStage,
  toPublicAssessmentInteraction,
  type DigitalCaseDefinition,
  type DigitalCaseRuntimeState,
  type DoseInfusionResponseSpec,
  type StructuredResponseSpec,
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

function expectLearningInteractionError(
  action: () => unknown,
  message: string,
): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(LearningInteractionError);
    expect(error).toMatchObject({ message });
    return;
  }
  throw new Error(`Expected LearningInteractionError: ${message}`);
}

function withDefinition(
  overrides: Partial<DigitalCaseDefinition>,
): DigitalCaseDefinition {
  return { ...definition, ...overrides };
}

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

  it("normalizes choices, preserves prior states, and completes both outcomes", () => {
    const initial = createInitialDigitalCaseState(
      definition,
      "2026-08-14T10:00:00.000Z",
    );
    const afterFirst = advanceDigitalCase(definition, initial, {
      selectedChoiceIds: [" b "],
      expectedVersion: 0,
      now: "2026-08-14T10:01:00.000Z",
    });
    const afterSecond = advanceDigitalCase(definition, afterFirst, {
      selectedChoiceIds: ["a"],
      expectedVersion: 1,
      now: "2026-08-14T10:02:00.000Z",
    });
    const completed = advanceDigitalCase(definition, afterSecond, {
      selectedChoiceIds: ["a"],
      expectedVersion: 2,
      now: "2026-08-14T10:03:00.000Z",
    });

    expect(initial).toMatchObject({
      version: 0,
      currentStage: 1,
      state: {},
      revealedExamSeriesIds: [],
      consequences: [],
    });
    expect(afterFirst).toMatchObject({
      version: 1,
      currentStage: 2,
      state: { path: "MONITORAMENTO" },
    });
    expect(afterSecond).toMatchObject({
      version: 2,
      currentStage: 3,
      state: { path: "MONITORAMENTO", branch: "REAVALIACAO" },
    });
    expect(completed).toMatchObject({
      version: 3,
      currentStage: "CONCLUIDO",
      state: {
        path: "MONITORAMENTO",
        branch: "REAVALIACAO",
        outcome: "REAVALIADO",
      },
    });
    expect(completed.consequences).toHaveLength(3);
    expect(
      getVisibleDigitalCaseExams(definition, completed).map((exam) => [
        exam.modality,
        exam.observations.length,
      ]),
    ).toEqual([
      ["POCUS", 2],
      ["ECG", 2],
    ]);
    expect(Object.isFrozen(initial)).toBe(true);
    expect(Object.isFrozen(afterFirst.state)).toBe(true);
    expect(Object.isFrozen(completed.consequences)).toBe(true);

    const escalated = advanceDigitalCase(
      definition,
      advanceDigitalCase(
        definition,
        advanceDigitalCase(
          definition,
          createInitialDigitalCaseState(definition, "2026-08-14T10:10:00.000Z"),
          {
            selectedChoiceIds: ["a"],
            expectedVersion: 0,
            now: "2026-08-14T10:11:00.000Z",
          },
        ),
        {
          selectedChoiceIds: ["b"],
          expectedVersion: 1,
          now: "2026-08-14T10:12:00.000Z",
        },
      ),
      {
        selectedChoiceIds: ["b"],
        expectedVersion: 2,
        now: "2026-08-14T10:13:00.000Z",
      },
    );
    expect(escalated.state).toMatchObject({
      path: "ESTABILIZACAO",
      branch: "MONITORAMENTO",
      outcome: "ESCALONADO",
    });
    expect(escalated.currentStage).toBe("CONCLUIDO");
  });

  it("rejects malformed case identifiers, stages, exams, and branches", () => {
    const validStageItemIds = ["synthetic-1", "synthetic-2", "synthetic-3"] as [
      string,
      string,
      string,
    ];

    expectLearningInteractionError(
      () =>
        createDigitalCaseDefinition({
          caseId: "",
          stageItemIds: validStageItemIds,
        }),
      "caseId must not be empty",
    );
    expectLearningInteractionError(
      () =>
        createDigitalCaseDefinition({
          caseId: undefined as unknown as string,
          stageItemIds: validStageItemIds,
        }),
      "caseId must not be empty",
    );
    expectLearningInteractionError(
      () =>
        createDigitalCaseDefinition({
          caseId: "synthetic-case",
          stageItemIds: ["synthetic-1", " ", "synthetic-3"],
        }),
      "digital case stage item ids are invalid",
    );
    expectLearningInteractionError(
      () =>
        createDigitalCaseDefinition({
          caseId: "synthetic-case",
          stageItemIds: ["synthetic-1", "synthetic-1", "synthetic-3"],
        }),
      "digital case stage item ids are invalid",
    );
    expectLearningInteractionError(
      () =>
        createDigitalCaseDefinition({
          caseId: "synthetic-case",
          stageItemIds: ["synthetic-1", "synthetic-2"] as unknown as [
            string,
            string,
            string,
          ],
        }),
      "digital case must contain three stages",
    );

    expectLearningInteractionError(
      () =>
        createInitialDigitalCaseState(
          withDefinition({ id: "" }),
          "2026-08-14T10:20:00.000Z",
        ),
      "case id must not be empty",
    );
    expectLearningInteractionError(
      () =>
        createInitialDigitalCaseState(
          withDefinition({
            id: undefined as unknown as string,
          }),
          "2026-08-14T10:20:00.000Z",
        ),
      "case id must not be empty",
    );
    expectLearningInteractionError(
      () =>
        createInitialDigitalCaseState(
          withDefinition({
            stageItemIds: [
              "synthetic-1",
              "synthetic-2",
            ] as unknown as readonly [string, string, string],
          }),
          "2026-08-14T10:20:00.000Z",
        ),
      "digital case must contain three stages",
    );
    expectLearningInteractionError(
      () =>
        createInitialDigitalCaseState(
          withDefinition({
            examSeries: [definition.examSeries[0]!, ...definition.examSeries],
          }),
          "2026-08-14T10:20:00.000Z",
        ),
      "exam series ids must be unique",
    );
    expectLearningInteractionError(
      () =>
        createInitialDigitalCaseState(
          withDefinition({
            examSeries: [
              {
                ...definition.examSeries[0]!,
                observations: [definition.examSeries[0]!.observations[0]!],
              },
              ...definition.examSeries.slice(1),
            ],
          }),
          "2026-08-14T10:20:00.000Z",
        ),
      "exam series must contain serial observations",
    );
    expectLearningInteractionError(
      () =>
        createInitialDigitalCaseState(
          withDefinition({
            branches: [
              {
                ...definition.branches[0]!,
                id: "",
              },
              ...definition.branches.slice(1),
            ],
          }),
          "2026-08-14T10:20:00.000Z",
        ),
      "branch id must not be empty",
    );
    expectLearningInteractionError(
      () =>
        createInitialDigitalCaseState(
          withDefinition({
            branches: [
              {
                ...definition.branches[0]!,
                selectedChoiceIds: [""],
              },
              ...definition.branches.slice(1),
            ],
          }),
          "2026-08-14T10:20:00.000Z",
        ),
      "case choice ids are invalid",
    );
    expectLearningInteractionError(
      () =>
        createInitialDigitalCaseState(
          withDefinition({
            branches: [
              {
                ...definition.branches[0]!,
                selectedChoiceIds: ["a", "a"],
              },
              ...definition.branches.slice(1),
            ],
          }),
          "2026-08-14T10:20:00.000Z",
        ),
      "case choice ids are invalid",
    );
    expectLearningInteractionError(
      () =>
        createInitialDigitalCaseState(
          withDefinition({
            branches: [
              {
                ...definition.branches[0]!,
                revealExamSeriesIds: ["synthetic-unknown-exam"],
              },
              ...definition.branches.slice(1),
            ],
          }),
          "2026-08-14T10:20:00.000Z",
        ),
      "branch reveals an unknown exam series",
    );
  });

  it("fails closed for invalid timestamps, transitions, and completed states", () => {
    const initial = createInitialDigitalCaseState(
      definition,
      "2026-08-14T10:30:00.000Z",
    );
    const otherDefinition = createDigitalCaseDefinition({
      caseId: "SYNTHETIC-OTHER-CASE",
      stageItemIds: ["other-1", "other-2", "other-3"],
    });

    expectLearningInteractionError(
      () => createInitialDigitalCaseState(definition, "not-a-timestamp"),
      "timestamp must be valid",
    );
    expectLearningInteractionError(
      () =>
        advanceDigitalCase(definition, initial, {
          selectedChoiceIds: ["a"],
          expectedVersion: 0,
          now: "not-a-timestamp",
        }),
      "timestamp must be valid",
    );
    expectLearningInteractionError(
      () =>
        advanceDigitalCase(
          definition,
          createInitialDigitalCaseState(
            otherDefinition,
            "2026-08-14T10:30:00.000Z",
          ),
          {
            selectedChoiceIds: ["a"],
            expectedVersion: 0,
            now: "2026-08-14T10:31:00.000Z",
          },
        ),
      "case state belongs to another case",
    );
    expectLearningInteractionError(
      () =>
        advanceDigitalCase(definition, initial, {
          selectedChoiceIds: ["z"],
          expectedVersion: 0,
          now: "2026-08-14T10:31:00.000Z",
        }),
      "case branch is not available",
    );
    expectLearningInteractionError(
      () =>
        advanceDigitalCase(definition, initial, {
          selectedChoiceIds: ["a", "a"],
          expectedVersion: 0,
          now: "2026-08-14T10:31:00.000Z",
        }),
      "case choice ids are invalid",
    );

    const completed = {
      ...initial,
      currentStage: "CONCLUIDO",
    } as DigitalCaseRuntimeState;
    expectLearningInteractionError(
      () =>
        advanceDigitalCase(definition, completed, {
          selectedChoiceIds: ["a"],
          expectedVersion: 0,
          now: "2026-08-14T10:31:00.000Z",
        }),
      "digital case is already completed",
    );
    expect(getVisibleDigitalCaseExams(definition, initial)).toEqual([]);
  });

  it("rejects invalid persisted runtime state before public projection", () => {
    const advanced = advanceDigitalCase(
      definition,
      createInitialDigitalCaseState(definition, "2026-08-14T10:40:00.000Z"),
      {
        selectedChoiceIds: ["a"],
        expectedVersion: 0,
        now: "2026-08-14T10:41:00.000Z",
      },
    );

    expectLearningInteractionError(
      () =>
        projectPublicDigitalCaseRuntime(definition, {
          ...advanced,
          caseId: "SYNTHETIC-OTHER-CASE",
        }),
      "case state belongs to another case",
    );
    expectLearningInteractionError(
      () =>
        projectPublicDigitalCaseRuntime(definition, {
          ...advanced,
          updatedAt: "not-a-timestamp",
        }),
      "timestamp must be valid",
    );
    expectLearningInteractionError(
      () =>
        projectPublicDigitalCaseRuntime(definition, {
          ...advanced,
          state: { ...advanced.state, syntheticPrivateKey: "redacted" },
        }),
      "case state contains an unknown key",
    );
  });

  it("covers structured-field validation, missing values and zero-point rubrics", () => {
    const base: StructuredResponseSpec = {
      kind: "STRUCTURED_FIELDS",
      fields: [
        {
          id: "text",
          label: "Texto",
          valueType: "TEXT",
          required: true,
        },
        {
          id: "number",
          label: "Número",
          valueType: "NUMBER",
          required: true,
          min: 1,
          max: 10,
        },
        {
          id: "boolean",
          label: "Confirmado",
          valueType: "BOOLEAN",
          required: true,
        },
      ],
      rubric: {
        criteria: [
          { fieldId: "text", expectedValue: "OK", points: 1 },
          { fieldId: "number", expectedValue: 5, points: 1 },
          { fieldId: "boolean", expectedValue: true, points: 1 },
        ],
        passScore: 3,
      },
    };
    expect(
      evaluateStructuredFields(base, {
        text: "",
        number: 11,
        boolean: "yes",
        unknown: true,
      }),
    ).toMatchObject({
      passed: false,
      missingFieldIds: [],
      invalidFieldIds: ["text", "number", "boolean", "unknown"],
    });
    expect(
      evaluateStructuredFields(base, { text: "<script>", number: 5 }),
    ).toMatchObject({
      passed: false,
      missingFieldIds: ["boolean"],
      invalidFieldIds: ["text"],
    });
    expectLearningInteractionError(
      () =>
        evaluateStructuredFields(
          { ...base, fields: [{ ...base.fields[0]!, id: "" }] },
          {},
        ),
      "structured field id must not be empty",
    );
    expectLearningInteractionError(
      () =>
        evaluateStructuredFields(
          { ...base, fields: [{ ...base.fields[0]!, label: " " }] },
          {},
        ),
      "structured field label must not be empty",
    );
    expectLearningInteractionError(
      () =>
        evaluateStructuredFields(
          { ...base, fields: [{ ...base.fields[1]!, min: Number.NaN }] },
          {},
        ),
      "structured field minimum is invalid",
    );
    expectLearningInteractionError(
      () =>
        evaluateStructuredFields(
          {
            ...base,
            fields: [{ ...base.fields[1]!, max: Number.POSITIVE_INFINITY }],
          },
          {},
        ),
      "structured field maximum is invalid",
    );
    expectLearningInteractionError(
      () =>
        evaluateStructuredFields(
          { ...base, fields: [{ ...base.fields[1]!, min: 10, max: 1 }] },
          {},
        ),
      "structured field range is invalid",
    );
    expectLearningInteractionError(
      () =>
        evaluateStructuredFields(
          { ...base, fields: [base.fields[0]!, base.fields[0]!] },
          {},
        ),
      "structured field ids must be unique",
    );
    expect(
      evaluateStructuredFields(
        { ...base, fields: [], rubric: { criteria: [], passScore: 0 } },
        {},
      ),
    ).toMatchObject({ totalPoints: 0, percent: 0, passed: true });
  });

  it("validates dose inputs and exposes only public interaction metadata", () => {
    const invalidInputs: readonly [
      Partial<DoseInfusionResponseSpec["calculationInputs"]>,
      string,
    ][] = [
      [{ weightKg: 0 }, "weightKg must be positive"],
      [{ weightKg: 1, doseMgPerKg: -1 }, "doseMgPerKg must be non-negative"],
      [
        { weightKg: 1, doseMgPerKg: 1, concentrationMgPerMl: 0 },
        "concentrationMgPerMl must be positive",
      ],
      [
        {
          weightKg: 1,
          doseMgPerKg: 1,
          concentrationMgPerMl: 1,
          durationHours: 0,
        },
        "durationHours must be positive",
      ],
    ];
    for (const [partial, message] of invalidInputs) {
      expectLearningInteractionError(
        () =>
          calculateDoseInfusion({
            weightKg: 1,
            doseMgPerKg: 1,
            concentrationMgPerMl: 1,
            durationHours: 1,
            ...partial,
          }),
        message,
      );
    }
    expect(
      toPublicAssessmentInteraction({
        kind: "STRUCTURED_FIELDS",
        fields: [
          { id: "text", label: "Texto", valueType: "TEXT", required: true },
        ],
        rubric: { criteria: [], passScore: 0 },
      }),
    ).toMatchObject({ kind: "STRUCTURED_FIELDS", evaluationMode: "AUTOMATIC" });
    expect(
      toPublicAssessmentInteraction({
        kind: "DOSE_INFUSION",
        fields: [
          { id: "dose", label: "Dose", valueType: "NUMBER", required: true },
        ],
        calculationInputs: {
          weightKg: 1,
          doseMgPerKg: 1,
          concentrationMgPerMl: 1,
          durationHours: 1,
        },
        formulaLabel: "fórmula sintética",
        tolerance: 0.01,
      }),
    ).toMatchObject({
      kind: "DOSE_INFUSION",
      evaluationMode: "AUTOMATIC",
      formulaLabel: "fórmula sintética",
    });
  });
});
