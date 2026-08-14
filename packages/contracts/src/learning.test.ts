import { describe, expect, it } from "vitest";

import {
  parseParticipantCurriculumRuntime,
  parseParticipantDigitalCaseRuntime,
  digitalCaseAdvanceRequestSchema,
  curriculumRuntimeEvaluationRequestSchema,
  parseParticipantActivity,
  participantActivityProjectionSchema,
} from "./learning.js";

const projection = {
  activityId: "11111111-1111-4111-8111-111111111111",
  slug: "emergencia-v1",
  title: "Emergência",
  items: [
    {
      itemId: "22222222-2222-4222-8222-222222222222",
      ordinal: 1,
      kind: "LEITURA",
      title: "Prioridades iniciais",
      text: "Conteúdo autoral interno para treinamento.",
      responseMode: "TEXT",
    },
  ],
} as const;

describe("participant activity contract", () => {
  it("accepts only the published projection shape", () => {
    expect(parseParticipantActivity(projection)).toEqual(projection);
    expect(participantActivityProjectionSchema.parse(projection)).toEqual(
      projection,
    );
  });

  it("rejects internal authorship fields and invalid item order", () => {
    expect(() =>
      parseParticipantActivity({
        ...projection,
        source_record_id: "internal",
      }),
    ).toThrow();
    expect(() =>
      parseParticipantActivity({
        ...projection,
        items: [{ ...projection.items[0], ordinal: 0 }],
      }),
    ).toThrow();
    expect(() =>
      parseParticipantActivity({
        ...projection,
        items: [{ ...projection.items[0], text: "<b>unsafe</b>" }],
      }),
    ).toThrow();
  });

  it("requires public choices for choice-response items", () => {
    const choiceProjection = {
      ...projection,
      items: [
        {
          itemId: projection.items[0].itemId,
          ordinal: 1,
          kind: "QUESTAO",
          title: "Escolha",
          text: "Selecione uma opção.",
          responseMode: "CHOICE",
          selectionMode: "SINGLE",
          choices: [
            { id: "a", label: "A", text: "Primeira opção." },
            { id: "b", label: "B", text: "Segunda opção." },
          ],
        },
      ],
    } as const;

    expect(parseParticipantActivity(choiceProjection)).toEqual(
      choiceProjection,
    );
    expect(() =>
      parseParticipantActivity({
        ...choiceProjection,
        items: [{ ...choiceProjection.items[0], choices: undefined }],
      }),
    ).toThrow();
  });

  it("accepts structured and dose interactions without exposing scoring targets", () => {
    const richProjection = {
      ...projection,
      items: [
        {
          itemId: projection.items[0].itemId,
          ordinal: 1,
          kind: "CASO",
          title: "Cálculo fictício",
          text: "Preencha os campos do exercício.",
          responseMode: "DOSE_INFUSION",
          interaction: {
            kind: "DOSE_INFUSION",
            evaluationMode: "AUTOMATIC",
            fields: [
              {
                id: "doseMg",
                label: "Dose calculada",
                valueType: "NUMBER",
                unit: "mg",
                required: true,
              },
            ],
            calculationInputs: {
              weightKg: 10,
              doseMgPerKg: 2,
              concentrationMgPerMl: 4,
              durationHours: 2,
            },
            formulaLabel: "dose = peso × dose/kg",
          },
          digitalCaseStage: {
            caseId: "M24-DIGITAL-CASE-V1",
            stage: 1,
            examSeries: [
              {
                id: "RADIOGRAFIA-SERIES",
                modality: "RADIOGRAFIA",
                label: "Radiografia seriada — caso fictício",
                observationCount: 2,
              },
              {
                id: "POCUS-SERIES",
                modality: "POCUS",
                label: "POCUS seriado — caso fictício",
                observationCount: 2,
              },
              {
                id: "ECG-SERIES",
                modality: "ECG",
                label: "ECG seriado — caso fictício",
                observationCount: 2,
              },
            ],
          },
        },
      ],
    } as const;

    expect(parseParticipantActivity(richProjection)).toEqual(richProjection);
    expect(() =>
      parseParticipantActivity({
        ...richProjection,
        items: [
          {
            ...richProjection.items[0],
            interaction: {
              ...richProjection.items[0].interaction,
              rubric: { expected: 20 },
            },
          },
        ],
      }),
    ).toThrow();
    expect(
      curriculumRuntimeEvaluationRequestSchema.parse({
        participantId: projection.activityId,
        scopeId: "22222222-2222-4222-8222-222222222222",
        answers: [
          {
            itemId: "M24-S1-SF01",
            structuredValues: { priority: "IMEDIATA", reassessmentMinutes: 15 },
          },
        ],
        completedAt: "2026-08-10T01:00:00.000Z",
      }),
    ).toMatchObject({ answers: [{ structuredValues: expect.any(Object) }] });
  });

  it("validates internal evaluation input without changing the public state boundary", () => {
    const request = {
      participantId: "11111111-1111-4111-8111-111111111111",
      scopeId: "22222222-2222-4222-8222-222222222222",
      answers: [
        { itemId: "M03-S1-Q01", selectedChoiceIds: ["a"] },
        { itemId: "M03-S4-RA01", text: "Plano fictício para correção humana." },
      ],
      completedAt: "2026-08-10T01:00:00.000Z",
      mode: "MODULE_COMPLETION",
    } as const;
    expect(curriculumRuntimeEvaluationRequestSchema.parse(request)).toEqual(
      request,
    );
    expect(() =>
      curriculumRuntimeEvaluationRequestSchema.parse({
        ...request,
        answers: [{ itemId: "M03-S1-Q01", text: "<script>" }],
      }),
    ).toThrow();
    expect(() =>
      curriculumRuntimeEvaluationRequestSchema.parse({
        ...request,
        answers: [{ itemId: "M03-S1-Q01", selectedChoiceIds: [] }],
      }),
    ).toThrow();
  });

  it("projects runtime state without participant, scope, item or answer internals", () => {
    const runtime = {
      moduleId: "M03",
      version: 1,
      status: "DOMINIO_DIGITAL",
      nextAction: "REVISAR_RETENCAO",
      scorePercent: 100,
      remediationCount: 0,
      retentionReviews: [
        { day: 30, dueAt: "2026-09-09T01:00:00.000Z", status: "PENDENTE" },
        { day: 60, dueAt: "2026-10-09T01:00:00.000Z", status: "PENDENTE" },
      ],
      practicalCompetenceClaim: "PROIBIDO_MVP",
    } as const;
    expect(parseParticipantCurriculumRuntime(runtime)).toEqual(runtime);
    expect(() =>
      parseParticipantCurriculumRuntime({
        ...runtime,
        participantId: "internal",
      }),
    ).toThrow();
  });

  it("validates persisted digital-case projections and optimistic advances", () => {
    const advance = {
      scopeId: "22222222-2222-4222-8222-222222222222",
      selectedChoiceIds: ["a"],
      expectedVersion: 0,
    } as const;
    expect(digitalCaseAdvanceRequestSchema.parse(advance)).toEqual(advance);
    expect(() =>
      digitalCaseAdvanceRequestSchema.parse({
        ...advance,
        selectedChoiceIds: ["a", "a"],
      }),
    ).toThrow();

    const runtime = {
      moduleId: "M24",
      caseId: "M24-DIGITAL-CASE-V1",
      version: 1,
      currentStage: 2,
      state: { path: "ESTABILIZACAO" },
      revealedExamSeries: [
        {
          id: "RADIOGRAFIA-SERIES",
          modality: "RADIOGRAFIA",
          label: "Radiografia seriada — caso fictício",
          observations: [
            {
              sequence: 1,
              syntheticSummary: "Achado sintético inicial do cenário digital.",
            },
          ],
        },
      ],
      consequences: [
        {
          branchId: "S1-A",
          consequence: "Ramo simulado liberado.",
          recordedAt: "2026-08-14T09:01:00.000Z",
        },
      ],
      updatedAt: "2026-08-14T09:01:00.000Z",
    } as const;
    expect(parseParticipantDigitalCaseRuntime(runtime)).toEqual(runtime);
    expect(() =>
      parseParticipantDigitalCaseRuntime({
        ...runtime,
        state: { answer_key: "internal" },
      }),
    ).toThrow();
  });
});
