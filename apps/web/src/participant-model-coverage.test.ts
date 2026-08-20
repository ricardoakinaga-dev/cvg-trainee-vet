import { describe, expect, it, vi } from "vitest";

import {
  PublicApiError,
  answersFromAttempt,
  attemptFromJourneyActivity,
  canAutoOpenJourneyActivity,
  idempotencyKey,
  initialActivityId,
  isActivity,
  isAnswerComplete,
  isAttempt,
  isChoice,
  isDigitalCaseRuntime,
  isDigitalCaseStage,
  isJourney,
  isJourneyActivity,
  isRecord,
  isRuntime,
  isSessionProjection,
  isStructuredInteraction,
  isString,
  journeyActivityOrder,
  mergeAttemptProjection,
  moduleIdFromActivity,
  nextActionLabel,
  orderedJourneyActivities,
  publicErrorMessage,
  requestJson,
  selectedChoiceIds,
  structuredAnswerValue,
  structuredValues,
  updateStructuredAnswer,
} from "../app/participant-model.js";
import type {
  ActivityItem,
  ActivityProjection,
  AttemptProjection,
  CurriculumRuntimeProjection,
  DigitalCaseRuntimeProjection,
  JourneyActivityProjection,
  LearningJourneyProjection,
} from "../app/participant-model.js";

const choices = [
  { id: "a", label: "A", text: "Primeira escolha" },
  { id: "b", label: "B", text: "Segunda escolha" },
] as const;

const structuredInteraction = {
  kind: "STRUCTURED_FIELDS",
  evaluationMode: "AUTOMATIC",
  fields: [
    {
      id: "weight",
      label: "Peso",
      valueType: "NUMBER",
      unit: "kg",
      required: true,
      min: 1,
      max: 100,
    },
    {
      id: "note",
      label: "Observação",
      valueType: "TEXT",
      required: true,
    },
    {
      id: "confirmed",
      label: "Confirmado",
      valueType: "BOOLEAN",
      required: true,
    },
  ],
} as const;

const doseInteraction = {
  kind: "DOSE_INFUSION",
  evaluationMode: "AUTOMATIC",
  fields: [
    {
      id: "dose",
      label: "Dose",
      valueType: "NUMBER",
      required: true,
    },
  ],
  calculationInputs: {
    weightKg: 10,
    doseMgPerKg: 2,
    concentrationMgPerMl: 5,
    durationHours: 1,
  },
  formulaLabel: "peso × dose ÷ concentração",
} as const;

const caseStage = {
  caseId: "case-1",
  stage: 1,
  examSeries: [
    {
      id: "xray",
      modality: "RADIOGRAFIA",
      label: "Raio-X",
      observationCount: 2,
    },
    { id: "pocus", modality: "POCUS", label: "POCUS", observationCount: 2 },
    { id: "ecg", modality: "ECG", label: "ECG", observationCount: 2 },
  ],
} as const;

const textItem = {
  itemId: "text-1",
  ordinal: 1,
  kind: "QUESTAO",
  title: "Texto",
  text: "Explique.",
  responseMode: "TEXT",
} as const satisfies ActivityItem;

const noneItem = {
  itemId: "none-1",
  ordinal: 2,
  kind: "INFO",
  title: "Informação",
  text: "Leia.",
  responseMode: "NONE",
} as const satisfies ActivityItem;

const choiceItem = {
  itemId: "choice-1",
  ordinal: 3,
  kind: "QUESTAO",
  title: "Escolha",
  text: "Selecione.",
  responseMode: "CHOICE",
  choices,
  selectionMode: "SINGLE",
} as const satisfies ActivityItem;

const multipleChoiceItem = {
  ...choiceItem,
  itemId: "choice-many",
  selectionMode: "MULTIPLE",
} as const satisfies ActivityItem;

const structuredItem = {
  itemId: "structured-1",
  ordinal: 4,
  kind: "QUESTAO",
  title: "Campos",
  text: "Preencha.",
  responseMode: "STRUCTURED_FIELDS",
  interaction: structuredInteraction,
} as const satisfies ActivityItem;

const doseItem = {
  itemId: "dose-1",
  ordinal: 5,
  kind: "QUESTAO",
  title: "Dose",
  text: "Calcule.",
  responseMode: "DOSE_INFUSION",
  interaction: doseInteraction,
} as const satisfies ActivityItem;

const caseChoiceItem = {
  ...choiceItem,
  itemId: "case-choice",
  digitalCaseStage: caseStage,
} as const satisfies ActivityItem;

const activity = {
  activityId: "activity-1",
  slug: "m01-baseline",
  title: "Atividade",
  items: [
    textItem,
    noneItem,
    choiceItem,
    multipleChoiceItem,
    structuredItem,
    doseItem,
    caseChoiceItem,
  ],
} as const satisfies ActivityProjection;

const runtime = {
  moduleId: "M01",
  version: 1,
  status: "EM_REMEDIACAO",
  nextAction: "EXECUTAR_REMEDIACAO",
  scorePercent: 70,
  remediationCount: 1,
  retentionReviews: [
    { day: 7, dueAt: "2026-08-17T00:00:00.000Z", status: "PENDENTE" },
  ],
  practicalCompetenceClaim: "PROIBIDO_MVP",
} as const satisfies CurriculumRuntimeProjection;

const digitalCase = {
  moduleId: "M01",
  caseId: "case-1",
  version: 1,
  currentStage: 1,
  state: { alert: "stable", score: 2, confirmed: true },
  revealedExamSeries: [
    {
      id: "xray",
      modality: "RADIOGRAFIA",
      label: "Raio-X",
      observations: [{ sequence: 1, syntheticSummary: "Sem alteração." }],
    },
  ],
  consequences: [
    {
      branchId: "branch-a",
      consequence: "Observação liberada",
      recordedAt: "2026-08-16T00:00:00.000Z",
    },
  ],
  updatedAt: "2026-08-16T00:00:00.000Z",
} as const satisfies DigitalCaseRuntimeProjection;

const journeyActivity = {
  activityId: "activity-1",
  slug: "m01-baseline",
  title: "Atividade",
  status: "DISPONIVEL",
  attemptId: "attempt-1",
  attemptStatus: "EM_ANDAMENTO",
  attemptVersion: 2,
  nextAction: "INICIAR_ATIVIDADE",
} as const satisfies JourneyActivityProjection;

const journey = {
  assignments: [{ id: "assignment-1" }],
  activities: [journeyActivity],
  results: [{ id: "result-1" }],
  runtimes: [runtime],
  nextAction: "INICIAR_ATIVIDADE",
} as const satisfies LearningJourneyProjection;

const attempt = {
  attemptId: "attempt-1",
  activityId: "activity-1",
  status: "EM_ANDAMENTO",
  version: 2,
  answers: [{ itemId: "text-1", response: "Resposta" }],
} as const satisfies AttemptProjection;

describe("participant model production coverage", () => {
  it("validates session, choices, interactions, activity and runtime boundaries", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord([])).toBe(false);
    expect(isString("ok")).toBe(true);
    expect(isString(1)).toBe(false);
    expect(
      isSessionProjection({ status: "active", canAccessAdmin: true }),
    ).toBe(true);
    expect(
      isSessionProjection({ status: "inactive", canAccessAdmin: true }),
    ).toBe(false);
    expect(isChoice(choices[0])).toBe(true);
    expect(isChoice({ id: "", label: "B", text: "texto" })).toBe(false);
    expect(isChoice({ id: "a", label: "", text: "texto" })).toBe(false);

    expect(isStructuredInteraction(structuredInteraction)).toBe(true);
    expect(isStructuredInteraction(doseInteraction)).toBe(true);
    expect(
      isStructuredInteraction({
        ...structuredInteraction,
        evaluationMode: "MANUAL",
      }),
    ).toBe(false);
    expect(
      isStructuredInteraction({
        ...structuredInteraction,
        fields: [{ ...structuredInteraction.fields[0], required: false }],
      }),
    ).toBe(false);
    expect(
      isStructuredInteraction({
        ...doseInteraction,
        calculationInputs: undefined,
      }),
    ).toBe(false);

    expect(isDigitalCaseStage(caseStage)).toBe(true);
    expect(
      isDigitalCaseStage({
        ...caseStage,
        examSeries: caseStage.examSeries.slice(0, 2),
      }),
    ).toBe(false);
    expect(
      isDigitalCaseStage({
        ...caseStage,
        examSeries: caseStage.examSeries.map((exam) => ({
          ...exam,
          observationCount: 1,
        })),
      }),
    ).toBe(false);

    expect(isActivity(activity)).toBe(true);
    expect(
      isActivity({ ...activity, items: [{ ...textItem, itemId: 1 }] }),
    ).toBe(false);
    expect(
      isActivity({
        ...activity,
        items: [{ ...choiceItem, choices: [choices[0]] }],
      }),
    ).toBe(false);
    expect(
      isActivity({
        ...activity,
        items: [
          {
            ...structuredItem,
            responseMode: "DOSE_INFUSION",
          },
        ],
      }),
    ).toBe(false);
    expect(isAttempt(attempt)).toBe(true);
    expect(
      isAttempt({ ...attempt, answers: [{ itemId: 1, response: "x" }] }),
    ).toBe(false);
    expect(isRuntime(runtime)).toBe(true);
    expect(isRuntime({ ...runtime, moduleId: "M00" })).toBe(false);
    expect(isRuntime({ ...runtime, scorePercent: 101 })).toBe(false);
    expect(isRuntime({ ...runtime, retentionReviews: [{ day: 8 }] })).toBe(
      false,
    );
    expect(isDigitalCaseRuntime(digitalCase)).toBe(true);
    expect(
      isDigitalCaseRuntime({ ...digitalCase, state: { "": "invalid" } }),
    ).toBe(false);
    expect(
      isDigitalCaseRuntime({
        ...digitalCase,
        revealedExamSeries: [
          {
            ...digitalCase.revealedExamSeries[0],
            observations: [{ sequence: 1 }],
          },
        ],
      }),
    ).toBe(false);
    expect(isJourneyActivity(journeyActivity)).toBe(true);
    expect(isJourneyActivity({ ...journeyActivity, attemptVersion: -1 })).toBe(
      false,
    );
    expect(isJourney(journey)).toBe(true);
    expect(
      isJourney({
        ...journey,
        activities: [{ ...journeyActivity, attemptId: 1 }],
      }),
    ).toBe(false);
  });

  it("derives bounded labels, ordering, auto-open and public errors", () => {
    expect(nextActionLabel("INICIAR_ATIVIDADE")).toBe("Iniciar atividade");
    expect(nextActionLabel("UNKNOWN")).toBe("UNKNOWN");
    expect(moduleIdFromActivity({ slug: "case-m24-final" })).toBe("M24");
    expect(moduleIdFromActivity({ slug: "unknown" })).toBeNull();
    expect(journeyActivityOrder(journeyActivity)).toBe(1);
    expect(journeyActivityOrder({ ...journeyActivity, slug: "unknown" })).toBe(
      Number.POSITIVE_INFINITY,
    );
    const unordered = [
      { ...journeyActivity, activityId: "z", slug: "m02-z" },
      { ...journeyActivity, activityId: "b", slug: "m01-b" },
      { ...journeyActivity, activityId: "a", slug: "m01-a" },
      { ...journeyActivity, activityId: "unknown", slug: "unknown" },
    ];
    expect(
      orderedJourneyActivities(unordered).map(({ activityId }) => activityId),
    ).toEqual(["a", "b", "z", "unknown"]);
    expect(canAutoOpenJourneyActivity(journey)).toBe(true);
    expect(
      canAutoOpenJourneyActivity({
        ...journey,
        nextAction: "CONSULTAR_PROXIMO_PASSO",
      }),
    ).toBe(false);
    expect(publicErrorMessage(new PublicApiError("unauthenticated", "x"))).toBe(
      "Login ou senha inválidos.",
    );
    expect(
      publicErrorMessage(new PublicApiError("validation_error", "x")),
    ).toBe("Informe um e-mail profissional e uma senha válida.");
    expect(publicErrorMessage(new Error("x"))).toContain("Não foi possível");
    expect(idempotencyKey("test")).toMatch(/^test-[0-9a-f-]{36}$/u);
  });

  it("handles choices, structured answers, attempts and completion rules", () => {
    expect(selectedChoiceIds(choiceItem, undefined)).toEqual([]);
    expect(selectedChoiceIds(choiceItem, "a")).toEqual(["a"]);
    expect(selectedChoiceIds(multipleChoiceItem, '["a",1,"b"]')).toEqual([
      "a",
      "b",
    ]);
    expect(selectedChoiceIds(multipleChoiceItem, "invalid")).toEqual([]);
    expect(structuredValues(undefined)).toEqual({});
    expect(structuredValues("invalid")).toEqual({});
    expect(
      structuredValues(
        '{"weight": 10, "ok": true, "note": "x", "ignored": null}',
      ),
    ).toEqual({
      weight: 10,
      ok: true,
      note: "x",
    });
    expect(structuredAnswerValue('{"weight":10}', "weight")).toBe(10);
    expect(
      updateStructuredAnswer('{"weight":10,"note":"x"}', "weight", 12),
    ).toBe('{"weight":12,"note":"x"}');
    expect(
      updateStructuredAnswer('{"weight":10,"note":"x"}', "weight", undefined),
    ).toBe('{"note":"x"}');
    expect(isAnswerComplete(noneItem, undefined)).toBe(true);
    expect(isAnswerComplete(choiceItem, undefined)).toBe(false);
    expect(isAnswerComplete(choiceItem, "a")).toBe(true);
    expect(
      isAnswerComplete(
        structuredItem,
        '{"weight":10,"note":"x","confirmed":true}',
      ),
    ).toBe(true);
    expect(
      isAnswerComplete(
        structuredItem,
        '{"weight":"10","note":"x","confirmed":true}',
      ),
    ).toBe(false);
    expect(isAnswerComplete(doseItem, '{"dose": 2}')).toBe(true);
    expect(isAnswerComplete(textItem, " ")).toBe(false);
    expect(isAnswerComplete(textItem, "answer")).toBe(true);
    expect(answersFromAttempt(null)).toEqual({});
    expect(answersFromAttempt(attempt)).toEqual({ "text-1": "Resposta" });
    expect(
      mergeAttemptProjection(attempt, {
        ...attempt,
        version: 3,
        answers: [{ itemId: "choice-1", response: "a" }],
      }),
    ).toMatchObject({
      version: 3,
      answers: [
        { itemId: "text-1", response: "Resposta" },
        { itemId: "choice-1", response: "a" },
      ],
    });
    expect(attemptFromJourneyActivity(undefined)).toBeNull();
    expect(attemptFromJourneyActivity(journeyActivity)).toMatchObject({
      attemptId: "attempt-1",
      version: 2,
    });
  });

  it("accepts successful JSON and exposes bounded API errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ success: true, data: { ok: true } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      requestJson("/ok", { method: "POST", body: { a: 1 } }),
    ).resolves.toEqual({
      ok: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/ok",
      expect.objectContaining({ method: "POST", body: '{"a":1}' }),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          success: false,
          error: { code: "bad", message: "no" },
        }),
      }),
    );
    await expect(requestJson("/bad", { method: "GET" })).rejects.toMatchObject({
      code: "bad",
      message: "no",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: async () => "invalid" }),
    );
    await expect(
      requestJson("/invalid", { method: "GET" }),
    ).rejects.toMatchObject({
      code: "internal_error",
    });
    vi.stubGlobal("window", { location: { search: "?activityId=activity-1" } });
    expect(initialActivityId()).toBe("activity-1");
    vi.unstubAllGlobals();
  });

  it("rejects malformed nested public projections and answer shapes", () => {
    expect(isChoice(null)).toBe(false);
    expect(isChoice({ id: 1, label: "A", text: "x" })).toBe(false);
    expect(isChoice({ id: "a", label: "A", text: " " })).toBe(false);
    expect(isStructuredInteraction(null)).toBe(false);
    expect(
      isStructuredInteraction({ ...structuredInteraction, fields: [] }),
    ).toBe(false);
    expect(
      isStructuredInteraction({
        ...structuredInteraction,
        fields: [{ id: "x" }],
      }),
    ).toBe(false);
    expect(
      isStructuredInteraction({
        ...structuredInteraction,
        fields: [{ ...structuredInteraction.fields[0], valueType: "DATE" }],
      }),
    ).toBe(false);
    expect(
      isStructuredInteraction({
        ...structuredInteraction,
        fields: [{ ...structuredInteraction.fields[0], min: "1" }],
      }),
    ).toBe(false);
    expect(
      isStructuredInteraction({
        ...doseInteraction,
        formulaLabel: 1,
      }),
    ).toBe(false);

    expect(isDigitalCaseStage(null)).toBe(false);
    expect(isDigitalCaseStage({ ...caseStage, caseId: 1 })).toBe(false);
    expect(isDigitalCaseStage({ ...caseStage, stage: 4 })).toBe(false);
    expect(
      isDigitalCaseStage({
        ...caseStage,
        examSeries: caseStage.examSeries.map((exam) => ({
          ...exam,
          modality: "MRI",
        })),
      }),
    ).toBe(false);
    expect(
      isDigitalCaseStage({
        ...caseStage,
        examSeries: caseStage.examSeries.map((exam) => ({
          ...exam,
          observationCount: 2.5,
        })),
      }),
    ).toBe(false);

    expect(isActivity(null)).toBe(false);
    expect(isActivity({ ...activity, slug: 1 })).toBe(false);
    expect(
      isActivity({
        ...activity,
        items: [{ ...textItem, responseMode: "UNKNOWN" }],
      }),
    ).toBe(false);
    expect(
      isActivity({
        ...activity,
        items: [{ ...choiceItem, selectionMode: "UNKNOWN" }],
      }),
    ).toBe(false);
    expect(
      isActivity({
        ...activity,
        items: [{ ...choiceItem, choices: "invalid" }],
      }),
    ).toBe(false);
    expect(
      isActivity({
        ...activity,
        items: [
          {
            ...structuredItem,
            interaction: doseInteraction,
          },
        ],
      }),
    ).toBe(false);
    expect(
      isActivity({
        ...activity,
        items: [{ ...choiceItem, choices: choices.slice(0, 1) }],
      }),
    ).toBe(false);
    expect(isAttempt({ ...attempt, version: "2" })).toBe(false);
    expect(isRuntime(null)).toBe(false);
    expect(isRuntime({ ...runtime, status: "UNKNOWN" })).toBe(false);
    expect(isRuntime({ ...runtime, nextAction: "UNKNOWN" })).toBe(false);
    expect(isRuntime({ ...runtime, version: 0 })).toBe(false);
    expect(isRuntime({ ...runtime, remediationCount: -1 })).toBe(false);
    expect(isJourneyActivity(null)).toBe(false);
    expect(isJourneyActivity({ ...journeyActivity, attemptStatus: 1 })).toBe(
      false,
    );
    expect(isJourney(null)).toBe(false);
    expect(isJourney({ ...journey, assignments: "invalid" })).toBe(false);
  });

  it("rejects malformed runtime state and covers answer fallback branches", () => {
    expect(isDigitalCaseRuntime(null)).toBe(false);
    expect(isDigitalCaseRuntime({ ...digitalCase, moduleId: "M00" })).toBe(
      false,
    );
    expect(
      isDigitalCaseRuntime({
        ...digitalCase,
        state: { score: null },
      }),
    ).toBe(false);
    expect(
      isDigitalCaseRuntime({
        ...digitalCase,
        revealedExamSeries: [
          {
            ...digitalCase.revealedExamSeries[0],
            modality: "MRI",
          },
        ],
      }),
    ).toBe(false);
    expect(
      isDigitalCaseRuntime({
        ...digitalCase,
        consequences: [{ branchId: 1 }],
      }),
    ).toBe(false);
    expect(selectedChoiceIds(multipleChoiceItem, "{}" as string)).toEqual([]);
    expect(structuredValues("[]")).toEqual({});
    expect(structuredValues(" ")).toEqual({});
    expect(structuredAnswerValue('{"other":true}', "missing")).toBeUndefined();
    expect(
      isAnswerComplete(
        {
          ...structuredItem,
          interaction: undefined,
        },
        "{}",
      ),
    ).toBe(false);
    expect(isAnswerComplete(structuredItem, '{"weight":10,"note":""}')).toBe(
      false,
    );
    expect(
      attemptFromJourneyActivity({
        ...journeyActivity,
        attemptStatus: undefined,
        attemptVersion: undefined,
      }),
    ).toMatchObject({ status: "EM_ANDAMENTO", version: 0 });
    expect(initialActivityId()).toBe("");
  });
});
