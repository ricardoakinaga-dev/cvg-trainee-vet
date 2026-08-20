import { afterEach, describe, expect, it, vi } from "vitest";

import { createParticipantActions } from "../app/participant-actions.js";
import type { ParticipantActionContext } from "../app/participant-actions.js";
import type {
  ActivityItem,
  ActivityProjection,
  AttemptProjection,
  CurriculumRuntimeProjection,
  DigitalCaseRuntimeProjection,
  LearningJourneyProjection,
} from "../app/participant-model.js";

const participantPasswordFixture = ["fixture", "participant", "2026"].join("-");

const caseStage = {
  caseId: "case-actions",
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
  itemId: "text",
  ordinal: 1,
  kind: "QUESTAO",
  title: "Texto",
  text: "Explique.",
  responseMode: "TEXT",
} as const satisfies ActivityItem;

const infoItem = {
  itemId: "info",
  ordinal: 2,
  kind: "INFO",
  title: "Informação",
  text: "Leia.",
  responseMode: "NONE",
} as const satisfies ActivityItem;

const choiceItem = {
  itemId: "choice",
  ordinal: 3,
  kind: "QUESTAO",
  title: "Escolha",
  text: "Selecione.",
  responseMode: "CHOICE",
  choices: [
    { id: "a", label: "A", text: "Primeira" },
    { id: "b", label: "B", text: "Segunda" },
  ],
  selectionMode: "SINGLE",
} as const satisfies ActivityItem;

const multipleChoiceItem = {
  ...choiceItem,
  itemId: "multiple",
  selectionMode: "MULTIPLE",
} as const satisfies ActivityItem;

const structuredItem = {
  itemId: "structured",
  ordinal: 5,
  kind: "QUESTAO",
  title: "Campos",
  text: "Preencha.",
  responseMode: "STRUCTURED_FIELDS",
  interaction: {
    kind: "STRUCTURED_FIELDS",
    evaluationMode: "AUTOMATIC",
    fields: [
      { id: "weight", label: "Peso", valueType: "NUMBER", required: true },
      { id: "note", label: "Nota", valueType: "TEXT", required: true },
      {
        id: "confirmed",
        label: "Confirmado",
        valueType: "BOOLEAN",
        required: true,
      },
    ],
  },
} as const satisfies ActivityItem;

const doseItem = {
  itemId: "dose",
  ordinal: 6,
  kind: "QUESTAO",
  title: "Dose",
  text: "Calcule.",
  responseMode: "DOSE_INFUSION",
  interaction: {
    kind: "DOSE_INFUSION",
    evaluationMode: "AUTOMATIC",
    fields: [
      { id: "dose", label: "Dose", valueType: "NUMBER", required: true },
    ],
    calculationInputs: {
      weightKg: 10,
      doseMgPerKg: 2,
      concentrationMgPerMl: 5,
      durationHours: 1,
    },
    formulaLabel: "peso × dose ÷ concentração",
  },
} as const satisfies ActivityItem;

const caseItem = {
  ...choiceItem,
  itemId: "case",
  ordinal: 7,
  digitalCaseStage: caseStage,
} as const satisfies ActivityItem;

const activity = {
  activityId: "activity-actions",
  slug: "m01-actions",
  title: "Atividade de ações",
  items: [
    textItem,
    infoItem,
    choiceItem,
    multipleChoiceItem,
    structuredItem,
    doseItem,
    caseItem,
  ],
} as const satisfies ActivityProjection;

const plainActivity = {
  ...activity,
  activityId: "activity-plain",
  slug: "activity-plain",
} as const satisfies ActivityProjection;

const attempt = {
  attemptId: "attempt-actions",
  activityId: "activity-actions",
  status: "EM_ANDAMENTO",
  version: 1,
  answers: [],
} as const satisfies AttemptProjection;

const runtime = {
  moduleId: "M01",
  version: 1,
  status: "EM_REMEDIACAO",
  nextAction: "EXECUTAR_REMEDIACAO",
  scorePercent: 70,
  remediationCount: 1,
  retentionReviews: [],
  practicalCompetenceClaim: "PROIBIDO_MVP",
} as const satisfies CurriculumRuntimeProjection;

const digitalCase = {
  moduleId: "M01",
  caseId: "case-actions",
  version: 1,
  currentStage: 1,
  state: { stable: true },
  revealedExamSeries: [],
  consequences: [],
  updatedAt: "2026-08-16T00:00:00.000Z",
} as const satisfies DigitalCaseRuntimeProjection;

const journeyActivity = {
  activityId: "activity-actions",
  slug: "m01-actions",
  title: "Atividade de ações",
  status: "DISPONIVEL",
  attemptId: "attempt-actions",
  attemptStatus: "EM_ANDAMENTO",
  attemptVersion: 1,
  nextAction: "INICIAR_ATIVIDADE",
} as const;

const journey = {
  assignments: [],
  activities: [journeyActivity],
  results: [],
  runtimes: [runtime],
  nextAction: "INICIAR_ATIVIDADE",
} as const satisfies LearningJourneyProjection;

const answers = {
  text: "Resposta textual",
  choice: "a",
  multiple: '["a","b"]',
  structured: '{"weight":10,"note":"ok","confirmed":true}',
  dose: '{"dose":2}',
  case: "a",
};

function success(data: unknown) {
  return { success: true, data };
}

function failure(code = "internal_error") {
  return { success: false, error: { code, message: "synthetic failure" } };
}

function response(payload: unknown): Response {
  return { ok: true, json: async () => payload } as Response;
}

function installFetch(
  resolver: (path: string) => unknown | Promise<unknown>,
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (input: unknown) =>
    response(await resolver(String(input))),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function context(overrides: Partial<ParticipantActionContext> = {}) {
  return {
    activityId: "activity-actions",
    activity,
    login: "vet@example.test",
    password: participantPasswordFixture,
    feedbackType: "MELHORIA",
    feedbackDescription: "Uma melhoria sintética.",
    journey,
    runtime,
    attempt,
    answers,
    questionPage: 0,
    digitalCase,
    retryAction: null,
    journeyState: "ready",
    activityState: "ready",
    feedbackState: "idle",
    pageSaveState: "idle",
    setActivityId: vi.fn(),
    setActivity: vi.fn(),
    setRuntime: vi.fn(),
    setDigitalCase: vi.fn(),
    setAttempt: vi.fn(),
    setAnswers: vi.fn(),
    setQuestionPage: vi.fn(),
    setPageSaveState: vi.fn(),
    setAuthenticated: vi.fn(),
    setCanManageAdmin: vi.fn(),
    setBusy: vi.fn(),
    setError: vi.fn(),
    setNotice: vi.fn(),
    setFeedbackDescription: vi.fn(),
    setFeedbackState: vi.fn(),
    setJourney: vi.fn(),
    setJourneyState: vi.fn(),
    setActivityState: vi.fn(),
    setRetryAction: vi.fn(),
    setPassword: vi.fn(),
    ...overrides,
  } as unknown as ParticipantActionContext;
}

function installDocument() {
  const focus = vi.fn();
  vi.stubGlobal("document", {
    getElementById: vi.fn(() => ({ focus })),
    querySelector: vi.fn(() => ({ focus })),
  });
  vi.stubGlobal("window", {
    location: { search: "" },
    requestAnimationFrame: vi.fn((callback: () => void) => callback()),
  });
  return focus;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("participant actions production coverage", () => {
  it("loads activity, runtime and digital-case projections with bounded failures", async () => {
    const state = context();
    installFetch((path) => {
      if (path.includes("/activities/")) return success(activity);
      if (path.endsWith("/runtime")) return success(runtime);
      if (path.endsWith("/case")) return success(digitalCase);
      throw new Error(`unexpected path ${path}`);
    });
    const actions = createParticipantActions(state);
    await actions.loadActivity("activity-actions", attempt);
    expect(state.setActivity).toHaveBeenCalledWith(activity);
    expect(state.setRuntime).toHaveBeenCalledWith(runtime);
    expect(state.setDigitalCase).toHaveBeenCalledWith(digitalCase);
    expect(state.setActivityState).toHaveBeenCalledWith("ready");

    const plainState = context({ activity: null });
    installFetch((path) =>
      path.includes("/activities/") ? success(plainActivity) : failure(),
    );
    await createParticipantActions(plainState).loadActivity("activity-plain");
    expect(plainState.setRuntime).toHaveBeenCalledWith(null);
    expect(plainState.setDigitalCase).toHaveBeenCalledWith(null);

    const notFoundState = context({ activity: null });
    installFetch((path) => {
      if (path.includes("/activities/")) return success(activity);
      return failure("not_found");
    });
    await createParticipantActions(notFoundState).loadActivity(
      "activity-actions",
    );
    expect(notFoundState.setRuntime).toHaveBeenCalledWith(null);
    expect(notFoundState.setDigitalCase).toHaveBeenCalledWith(null);

    const invalidState = context();
    installFetch((path) =>
      path.includes("/activities/")
        ? success({ invalid: true })
        : success(null),
    );
    await expect(
      createParticipantActions(invalidState).loadActivity("activity-actions"),
    ).rejects.toThrow();
    expect(invalidState.setActivityState).toHaveBeenCalledWith("error");
  });

  it("loads, opens and refreshes journeys without inventing an activity", async () => {
    const state = context();
    installFetch((path) => {
      if (path === "/api/v1/learning-path") return success(journey);
      if (path.includes("/activities/")) return success(activity);
      if (path.endsWith("/runtime")) return success(runtime);
      if (path.endsWith("/case")) return success(digitalCase);
      throw new Error(`unexpected path ${path}`);
    });
    const actions = createParticipantActions(state);
    await expect(actions.loadJourney()).resolves.toEqual(journey);
    await actions.openJourneyActivity(journey);
    expect(state.setJourney).toHaveBeenCalledWith(journey);
    expect(state.setActivityId).toHaveBeenCalledWith("activity-actions");

    const emptyJourney = {
      ...journey,
      activities: [],
      nextAction: "INICIAR_ATIVIDADE",
    } as const;
    const emptyState = context({ activityId: "" });
    installFetch((path) =>
      path === "/api/v1/learning-path"
        ? success(emptyJourney)
        : success(activity),
    );
    const emptyActions = createParticipantActions(emptyState);
    await expect(emptyActions.loadJourney()).resolves.toEqual(emptyJourney);
    await emptyActions.openJourneyActivity(emptyJourney);
    expect(emptyState.setJourneyState).toHaveBeenCalledWith("empty");

    const blockedJourney = {
      ...journey,
      activities: [
        { ...journeyActivity, nextAction: "CONSULTAR_PROXIMO_PASSO" },
      ],
      nextAction: "CONSULTAR_PROXIMO_PASSO",
    } as const;
    const blockedState = context({ activityId: "" });
    const blockedActions = createParticipantActions(blockedState);
    await blockedActions.openJourneyActivity(blockedJourney);
    expect(blockedState.setActivity).not.toHaveBeenCalled();

    const invalidState = context();
    installFetch(() => success({ activities: "invalid" }));
    await expect(
      createParticipantActions(invalidState).loadJourney(),
    ).rejects.toThrow();
    expect(invalidState.setJourneyState).toHaveBeenCalledWith("error");
  });

  it("covers login, feedback, session capability and sign-out flows", async () => {
    const state = context();
    installFetch((path) => {
      if (path === "/api/v1/auth/login")
        return success({ authenticated: true });
      if (path === "/api/v1/session") {
        return success({ status: "active", canAccessAdmin: true });
      }
      if (path === "/api/v1/learning-path") return success(journey);
      if (path.includes("/activities/")) return success(activity);
      if (path.endsWith("/runtime")) return success(runtime);
      if (path.endsWith("/case")) return success(digitalCase);
      if (path === "/api/v1/session/revoke") return success({ revoked: true });
      if (path === "/api/v1/feedback") return success({ id: "feedback-1" });
      throw new Error(`unexpected path ${path}`);
    });
    const actions = createParticipantActions(state);
    const loginEvent = { preventDefault: vi.fn() } as never;
    actions.handleLogin(loginEvent);
    await vi.waitFor(() =>
      expect(state.setAuthenticated).toHaveBeenCalledWith(true),
    );
    expect(loginEvent.preventDefault).toHaveBeenCalled();
    await actions.handleFeedbackSubmit({ preventDefault: vi.fn() } as never);
    expect(state.setFeedbackState).toHaveBeenCalledWith("sent");
    expect(state.setNotice).toHaveBeenCalledWith("Relato registrado.");

    const emptyFeedback = context({ feedbackDescription: " " });
    const emptyFeedbackEvent = { preventDefault: vi.fn() } as never;
    await createParticipantActions(emptyFeedback).handleFeedbackSubmit(
      emptyFeedbackEvent,
    );
    expect(emptyFeedback.setError).toHaveBeenCalledWith(
      "Descreva o problema ou a melhoria antes de enviar.",
    );

    const failedFeedback = context();
    installFetch(() => failure("internal_error"));
    await createParticipantActions(failedFeedback).handleFeedbackSubmit({
      preventDefault: vi.fn(),
    } as never);
    expect(failedFeedback.setFeedbackState).toHaveBeenCalledWith("idle");

    const deniedSession = context();
    installFetch(() => failure("unauthenticated"));
    await expect(
      createParticipantActions(deniedSession).loadSessionCapabilities(),
    ).resolves.toBe(false);
    expect(deniedSession.setCanManageAdmin).toHaveBeenCalledWith(false);

    const malformedSession = context();
    installFetch(() => success({ status: "active", canAccessAdmin: "no" }));
    await expect(
      createParticipantActions(malformedSession).loadSessionCapabilities(),
    ).resolves.toBe(true);
    expect(malformedSession.setCanManageAdmin).toHaveBeenCalledWith(false);

    const signedOut = context();
    installFetch(() => success({ revoked: true }));
    await createParticipantActions(signedOut).signOut();
    expect(signedOut.setAuthenticated).toHaveBeenCalledWith(false);
    expect(signedOut.setActivityId).toHaveBeenCalledWith("");
    expect(signedOut.setNotice).toHaveBeenCalledWith("Sessão encerrada.");

    const signOutFailure = context();
    installFetch(() => failure("internal_error"));
    await createParticipantActions(signOutFailure).signOut();
    expect(signOutFailure.setError).toHaveBeenCalled();
  });

  it("handles failed login, restore and retry dispatch", async () => {
    const failedLogin = context();
    installFetch(() => failure("unauthenticated"));
    await createParticipantActions(failedLogin).signIn();
    expect(failedLogin.setRetryAction).toHaveBeenCalledWith("login");
    expect(failedLogin.setError).toHaveBeenCalledWith(
      "Login ou senha inválidos.",
    );

    const restoreDenied = context();
    installFetch(() => failure("unauthenticated"));
    await createParticipantActions(restoreDenied).restoreSession();
    expect(restoreDenied.setAuthenticated).not.toHaveBeenCalled();

    const restored = context();
    installFetch((path) => {
      if (path === "/api/v1/session") {
        return success({ status: "active", canAccessAdmin: false });
      }
      if (path === "/api/v1/learning-path") return success(journey);
      if (path.includes("/activities/")) return success(activity);
      if (path.endsWith("/runtime")) return success(runtime);
      if (path.endsWith("/case")) return success(digitalCase);
      throw new Error(`unexpected path ${path}`);
    });
    await createParticipantActions(restored).restoreSession();
    expect(restored.setAuthenticated).toHaveBeenCalledWith(true);

    const retry = context({ retryAction: "activity" });
    const retryActions = createParticipantActions(retry);
    installFetch((path) => {
      if (path.includes("/activities/")) return success(activity);
      if (path.endsWith("/runtime")) return success(runtime);
      if (path.endsWith("/case")) return success(digitalCase);
      throw new Error(`unexpected path ${path}`);
    });
    retryActions.handleRetry();
    await vi.waitFor(() =>
      expect(retry.setActivity).toHaveBeenCalledWith(activity),
    );

    const journeyRetry = context({ retryAction: "journey" });
    const journeyRetryActions = createParticipantActions(journeyRetry);
    installFetch(() => success(journey));
    journeyRetryActions.handleRetry();
    await vi.waitFor(() =>
      expect(journeyRetry.setJourney).toHaveBeenCalledWith(journey),
    );
  });

  it("starts attempts, changes choices, focuses answers and persists responses", async () => {
    const startedState = context({ attempt: null });
    installFetch(() =>
      success({ ...attempt, answers: [{ itemId: "text", response: "seed" }] }),
    );
    await createParticipantActions(startedState).handleStartAttempt();
    expect(startedState.setAttempt).toHaveBeenCalled();
    expect(startedState.setNotice).toHaveBeenCalledWith("Tentativa iniciada.");

    const noActivity = context({ activity: null });
    await createParticipantActions(noActivity).handleStartAttempt();
    expect(noActivity.setBusy).not.toHaveBeenCalled();

    const choiceState = context({
      answers: { multiple: '["a"]', choice: "a" },
    });
    const choiceActions = createParticipantActions(choiceState);
    choiceActions.handleChoiceChange(multipleChoiceItem, "b", true);
    choiceActions.handleChoiceChange(multipleChoiceItem, "a", false);
    choiceActions.handleChoiceChange(choiceItem, "b", false);
    expect(choiceState.setAnswers).toHaveBeenCalledTimes(3);
    expect(choiceActions.currentBlockItems()).toEqual(
      activity.items.slice(0, 3),
    );

    const focus = installDocument();
    const focusActions = createParticipantActions(context());
    focusActions.focusAnswer(textItem);
    focusActions.focusAnswer(choiceItem);
    expect(focus).toHaveBeenCalled();

    const answerState = context();
    installFetch(() =>
      success({
        ...attempt,
        version: 2,
        answers: [{ itemId: "text", response: "saved" }],
      }),
    );
    const answerActions = createParticipantActions(answerState);
    await expect(
      answerActions.persistAnswer(textItem, attempt),
    ).resolves.toMatchObject({ version: 2 });

    const invalidAnswer = context();
    installFetch(() => success({ invalid: true }));
    await expect(
      createParticipantActions(invalidAnswer).persistAnswer(textItem, attempt),
    ).rejects.toThrow();
  });

  it("validates and advances digital cases and saves individual answers", async () => {
    installDocument();
    const mismatch = context({
      digitalCase: { ...digitalCase, currentStage: 2 },
    });
    await createParticipantActions(mismatch).handleAdvanceDigitalCase(caseItem);
    expect(mismatch.setError).toHaveBeenCalledWith(
      "Esta etapa já foi registrada ou ainda não está liberada.",
    );

    const noSelection = context({ answers: { ...answers, case: "" } });
    await createParticipantActions(noSelection).handleAdvanceDigitalCase(
      caseItem,
    );
    expect(noSelection.setError).toHaveBeenCalledWith(
      "Selecione uma decisão antes de liberar a próxima etapa.",
    );

    const advanced = context();
    installFetch((path) => {
      if (path.endsWith("/answers")) return success({ ...attempt, version: 2 });
      if (path.endsWith("/case/advance")) {
        return success({ ...digitalCase, version: 2, currentStage: 2 });
      }
      throw new Error(`unexpected path ${path}`);
    });
    await createParticipantActions(advanced).handleAdvanceDigitalCase(caseItem);
    expect(advanced.setDigitalCase).toHaveBeenCalledWith({
      ...digitalCase,
      version: 2,
      currentStage: 2,
    });
    expect(advanced.setNotice).toHaveBeenCalledWith(
      "Decisão registrada. A próxima informação foi liberada.",
    );

    const incomplete = context({ answers: { ...answers, text: " " } });
    const incompleteActions = createParticipantActions(incomplete);
    await incompleteActions.handleSaveAnswer(textItem);
    expect(incomplete.setError).toHaveBeenCalledWith(
      "Responda esta questão antes de salvar.",
    );

    const saved = context();
    const persisted = {
      ...attempt,
      version: 2,
      answers: [{ itemId: "text", response: "saved" }],
    };
    const saveActions = createParticipantActions(saved);
    vi.spyOn(saveActions, "persistAnswer").mockResolvedValue(persisted);
    await saveActions.handleSaveAnswer(textItem);
    expect(saved.setPageSaveState).toHaveBeenCalledWith("saved");
    expect(saved.setNotice).toHaveBeenCalledWith("Resposta salva.");

    const saveFailure = context();
    const failureActions = createParticipantActions(saveFailure);
    vi.spyOn(failureActions, "persistAnswer").mockRejectedValue(
      new Error("failure"),
    );
    await failureActions.handleSaveAnswer(textItem);
    expect(saveFailure.setError).toHaveBeenCalled();
  });

  it("saves blocks, advances pages and submits complete attempts", async () => {
    installDocument();
    const incomplete = context({ answers: { ...answers, choice: "" } });
    const incompleteActions = createParticipantActions(incomplete);
    await expect(incompleteActions.saveCurrentBlock()).resolves.toBeNull();
    expect(incomplete.setError).toHaveBeenCalledWith(
      "Responda todas as questões deste bloco antes de avançar.",
    );

    const blockState = context();
    const blockActions = createParticipantActions(blockState);
    vi.spyOn(blockActions, "persistAnswer").mockResolvedValue({
      ...attempt,
      version: 2,
    });
    await expect(blockActions.saveCurrentBlock()).resolves.toMatchObject({
      version: 2,
    });
    expect(blockState.setNotice).toHaveBeenCalledWith("Bloco salvo.");

    const nextState = context();
    const nextActions = createParticipantActions(nextState);
    vi.spyOn(nextActions, "saveCurrentBlock").mockResolvedValue({
      ...attempt,
      version: 2,
    });
    await nextActions.handleNextPage();
    expect(nextState.setQuestionPage).toHaveBeenCalled();
    expect(nextState.setNotice).toHaveBeenCalledWith(
      "Bloco salvo. Próximo bloco liberado.",
    );

    const submitIncomplete = context({ answers: { ...answers, case: "" } });
    const submitIncompleteActions = createParticipantActions(submitIncomplete);
    await submitIncompleteActions.handleSubmitAttempt();
    expect(submitIncomplete.setError).toHaveBeenCalledWith(
      "Responda todas as questões antes de enviar a tentativa.",
    );

    const submitted = context();
    installFetch((path) => {
      if (path.endsWith("/answers")) return success({ ...attempt, version: 2 });
      if (path.endsWith("/submit"))
        return success({ ...attempt, status: "SUBMETIDA", version: 3 });
      throw new Error(`unexpected path ${path}`);
    });
    await createParticipantActions(submitted).handleSubmitAttempt();
    expect(submitted.setNotice).toHaveBeenCalledWith("Tentativa submetida.");

    const submitFailure = context();
    installFetch((path) =>
      path.endsWith("/answers")
        ? success({ ...attempt, version: 2 })
        : failure(),
    );
    await createParticipantActions(submitFailure).handleSubmitAttempt();
    expect(submitFailure.setError).toHaveBeenCalled();
  });

  it("covers secondary loading, session and journey refresh branches", async () => {
    const runtimeFailure = context({ activity: null });
    installFetch((path) => {
      if (path.includes("/activities/")) return success(activity);
      if (path.endsWith("/runtime")) return failure("internal_error");
      throw new Error(`unexpected path ${path}`);
    });
    await expect(
      createParticipantActions(runtimeFailure).loadActivity("activity-actions"),
    ).rejects.toThrow();
    expect(runtimeFailure.setActivityState).toHaveBeenLastCalledWith("error");

    const caseFailure = context({ activity: null });
    installFetch((path) => {
      if (path.includes("/activities/")) return success(activity);
      if (path.endsWith("/runtime")) return success(runtime);
      if (path.endsWith("/case")) return failure("internal_error");
      throw new Error(`unexpected path ${path}`);
    });
    await expect(
      createParticipantActions(caseFailure).loadActivity("activity-actions"),
    ).rejects.toThrow();
    expect(caseFailure.setActivityState).toHaveBeenLastCalledWith("error");

    const autoOpenState = context({ activityId: "" });
    const autoOpenActions = createParticipantActions(autoOpenState);
    vi.spyOn(autoOpenActions, "loadActivity").mockResolvedValue(undefined);
    await autoOpenActions.openJourneyActivity(journey);
    expect(autoOpenState.setActivityId).toHaveBeenCalledWith(
      journeyActivity.activityId,
    );
    expect(autoOpenActions.loadActivity).toHaveBeenCalledWith(
      journeyActivity.activityId,
      expect.anything(),
    );

    const noNextState = context({ activityId: "" });
    const noNextJourney = {
      ...journey,
      activities: [
        { ...journeyActivity, nextAction: "CONSULTAR_PROXIMO_PASSO" },
      ],
      nextAction: "INICIAR_ATIVIDADE",
    } as const;
    const noNextActions = createParticipantActions(noNextState);
    await noNextActions.openJourneyActivity(noNextJourney);
    expect(noNextState.setActivityId).not.toHaveBeenCalled();

    const loginAfterAuth = context();
    installFetch((path) =>
      path === "/api/v1/auth/login"
        ? success({ authenticated: true })
        : success({ status: "active", canAccessAdmin: false }),
    );
    const loginActions = createParticipantActions(loginAfterAuth);
    vi.spyOn(loginActions, "loadSessionCapabilities").mockResolvedValue(true);
    vi.spyOn(loginActions, "loadJourney").mockRejectedValue(
      new Error("journey unavailable"),
    );
    await loginActions.signIn();
    expect(loginAfterAuth.setAuthenticated).toHaveBeenCalledWith(true);
    expect(loginAfterAuth.setError).toHaveBeenCalled();
    expect(loginAfterAuth.setBusy).toHaveBeenLastCalledWith(false);

    const restoreFailure = context();
    const restoreActions = createParticipantActions(restoreFailure);
    vi.spyOn(restoreActions, "loadSessionCapabilities").mockResolvedValue(true);
    vi.spyOn(restoreActions, "loadJourney").mockRejectedValue(
      new Error("journey unavailable"),
    );
    await restoreActions.restoreSession();
    expect(restoreFailure.setAuthenticated).toHaveBeenCalledWith(true);
    expect(restoreFailure.setError).toHaveBeenCalled();

    const refreshState = context({ activityId: "" });
    const refreshActions = createParticipantActions(refreshState);
    vi.spyOn(refreshActions, "loadJourney").mockResolvedValue(journey);
    vi.spyOn(refreshActions, "loadActivity").mockResolvedValue(undefined);
    await refreshActions.refreshJourney();
    expect(refreshActions.loadActivity).toHaveBeenCalledWith(
      journeyActivity.activityId,
      expect.anything(),
    );
    expect(refreshState.setNotice).toHaveBeenCalledWith("Jornada atualizada.");

    const noRefreshState = context({ activityId: "" });
    const noRefreshActions = createParticipantActions(noRefreshState);
    await noRefreshActions.refreshActivity();
    expect(noRefreshState.setBusy).not.toHaveBeenCalled();

    const refreshFailureState = context();
    const refreshFailureActions = createParticipantActions(refreshFailureState);
    vi.spyOn(refreshFailureActions, "loadActivity").mockRejectedValue(
      new Error("activity unavailable"),
    );
    await refreshFailureActions.refreshActivity();
    expect(refreshFailureState.setError).toHaveBeenCalled();

    const retryState = context({ retryAction: "login" });
    const retryActions = createParticipantActions(retryState);
    vi.spyOn(retryActions, "signIn").mockResolvedValue(undefined);
    retryActions.handleRetry();
    await vi.waitFor(() => expect(retryActions.signIn).toHaveBeenCalledOnce());
  });

  it("fails closed for malformed answer projections and empty save/submit guards", async () => {
    const invalidStart = context();
    installFetch(() => success({ invalid: true }));
    await createParticipantActions(invalidStart).handleStartAttempt();
    expect(invalidStart.setError).toHaveBeenCalled();

    installDocument();
    const invalidCase = context();
    const invalidCaseActions = createParticipantActions(invalidCase);
    vi.spyOn(invalidCaseActions, "persistAnswer").mockResolvedValue({
      ...attempt,
      version: 2,
    });
    installFetch((path) =>
      path.endsWith("/answers")
        ? success({ ...attempt, version: 2 })
        : success({ invalid: true }),
    );
    await invalidCaseActions.handleAdvanceDigitalCase(caseItem);
    expect(invalidCase.setError).toHaveBeenCalled();

    const casePersistFailure = context();
    const casePersistActions = createParticipantActions(casePersistFailure);
    vi.spyOn(casePersistActions, "persistAnswer").mockRejectedValue(
      new Error("answer unavailable"),
    );
    await casePersistActions.handleAdvanceDigitalCase(caseItem);
    expect(casePersistFailure.setError).toHaveBeenCalled();

    const noAnswerState = context({ attempt: null });
    const noAnswerActions = createParticipantActions(noAnswerState);
    await noAnswerActions.handleSaveAnswer(textItem);
    await expect(noAnswerActions.saveCurrentBlock()).resolves.toBeNull();
    await noAnswerActions.handleSubmitAttempt();
    expect(noAnswerState.setBusy).not.toHaveBeenCalled();

    const blockFailureState = context();
    const blockFailureActions = createParticipantActions(blockFailureState);
    vi.spyOn(blockFailureActions, "persistAnswer").mockRejectedValue(
      new Error("save unavailable"),
    );
    await expect(blockFailureActions.saveCurrentBlock()).resolves.toBeNull();
    expect(blockFailureState.setPageSaveState).toHaveBeenCalledWith("idle");

    const nullNextState = context();
    const nullNextActions = createParticipantActions(nullNextState);
    vi.spyOn(nullNextActions, "saveCurrentBlock").mockResolvedValue(null);
    await nullNextActions.handleNextPage();
    expect(nullNextState.setQuestionPage).not.toHaveBeenCalled();

    const lastPageState = context({ questionPage: 2 });
    const lastPageActions = createParticipantActions(lastPageState);
    vi.spyOn(lastPageActions, "saveCurrentBlock").mockResolvedValue(attempt);
    await lastPageActions.handleNextPage();
    expect(lastPageState.setQuestionPage).not.toHaveBeenCalled();

    const nullSubmitState = context();
    const nullSubmitActions = createParticipantActions(nullSubmitState);
    vi.spyOn(nullSubmitActions, "saveCurrentBlock").mockResolvedValue(null);
    await nullSubmitActions.handleSubmitAttempt();
    expect(nullSubmitState.setBusy).not.toHaveBeenCalled();

    const invalidSubmitState = context();
    const invalidSubmitActions = createParticipantActions(invalidSubmitState);
    vi.spyOn(invalidSubmitActions, "saveCurrentBlock").mockResolvedValue(
      attempt,
    );
    installFetch(() => success({ invalid: true }));
    await invalidSubmitActions.handleSubmitAttempt();
    expect(invalidSubmitState.setError).toHaveBeenCalled();

    const nullBlockState = context({ activity: null });
    await expect(
      createParticipantActions(nullBlockState).saveCurrentBlock(),
    ).resolves.toBeNull();
    expect(nullBlockState.setPageSaveState).not.toHaveBeenCalled();
  });
});
