"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  ITEMS_PER_BLOCK,
  PublicApiError,
  answersFromAttempt,
  attemptFromJourneyActivity,
  canAutoOpenJourneyActivity,
  idempotencyKey,
  initialActivityId,
  isActivity,
  isAnswerComplete,
  isAttempt,
  isDigitalCaseRuntime,
  isJourney,
  isRuntime,
  isSessionProjection,
  mergeAttemptProjection,
  moduleIdFromActivity,
  orderedJourneyActivities,
  publicErrorMessage,
  requestJson,
  selectedChoiceIds,
} from "./participant-model";
import type {
  ActivityItem,
  ActivityProjection,
  AttemptProjection,
  CurriculumRuntimeProjection,
  DigitalCaseRuntimeProjection,
  ExperienceState,
  FeedbackState,
  FeedbackType,
  LearningJourneyProjection,
  PageSaveState,
  RetryAction,
} from "./participant-model";

export type ParticipantActionContext = Readonly<{
  readonly activityId: string;
  readonly activity: ActivityProjection | null;
  readonly login: string;
  readonly password: string;
  readonly feedbackType: FeedbackType;
  readonly feedbackDescription: string;
  readonly journey: LearningJourneyProjection | null;
  readonly runtime: CurriculumRuntimeProjection | null;
  readonly attempt: AttemptProjection | null;
  readonly answers: Readonly<Record<string, string>>;
  readonly questionPage: number;
  readonly digitalCase: DigitalCaseRuntimeProjection | null;
  readonly retryAction: RetryAction;
  readonly journeyState: ExperienceState;
  readonly activityState: ExperienceState;
  readonly feedbackState: FeedbackState;
  readonly pageSaveState: PageSaveState;
  readonly setActivityId: Dispatch<SetStateAction<string>>;
  readonly setActivity: Dispatch<SetStateAction<ActivityProjection | null>>;
  readonly setRuntime: Dispatch<
    SetStateAction<CurriculumRuntimeProjection | null>
  >;
  readonly setDigitalCase: Dispatch<
    SetStateAction<DigitalCaseRuntimeProjection | null>
  >;
  readonly setAttempt: Dispatch<SetStateAction<AttemptProjection | null>>;
  readonly setAnswers: Dispatch<
    SetStateAction<Readonly<Record<string, string>>>
  >;
  readonly setQuestionPage: Dispatch<SetStateAction<number>>;
  readonly setPageSaveState: Dispatch<SetStateAction<PageSaveState>>;
  readonly setAuthenticated: Dispatch<SetStateAction<boolean>>;
  readonly setCanManageAdmin: Dispatch<SetStateAction<boolean>>;
  readonly setBusy: Dispatch<SetStateAction<boolean>>;
  readonly setError: Dispatch<SetStateAction<string | null>>;
  readonly setNotice: Dispatch<SetStateAction<string | null>>;
  readonly setFeedbackDescription: Dispatch<SetStateAction<string>>;
  readonly setFeedbackState: Dispatch<SetStateAction<FeedbackState>>;
  readonly setJourney: Dispatch<
    SetStateAction<LearningJourneyProjection | null>
  >;
  readonly setJourneyState: Dispatch<SetStateAction<ExperienceState>>;
  readonly setActivityState: Dispatch<SetStateAction<ExperienceState>>;
  readonly setRetryAction: Dispatch<SetStateAction<RetryAction>>;
  readonly setPassword: Dispatch<SetStateAction<string>>;
}>;

export type ParticipantActions = Readonly<{
  readonly loadActivity: (
    nextActivityId: string,
    seedAttempt?: AttemptProjection | null,
  ) => Promise<void>;
  readonly loadJourney: () => Promise<LearningJourneyProjection>;
  readonly openJourneyActivity: (
    loadedJourney: LearningJourneyProjection,
  ) => Promise<void>;
  readonly signIn: () => Promise<void>;
  readonly handleLogin: (event: FormEvent<HTMLFormElement>) => void;
  readonly handleFeedbackSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => Promise<void>;
  readonly restoreSession: () => Promise<void>;
  readonly loadSessionCapabilities: () => Promise<boolean>;
  readonly signOut: () => Promise<void>;
  readonly refreshJourney: () => Promise<void>;
  readonly refreshActivity: () => Promise<void>;
  readonly handleRetry: () => void;
  readonly handleStartAttempt: () => Promise<void>;
  readonly handleChoiceChange: (
    item: ActivityItem,
    choiceId: string,
    checked: boolean,
  ) => void;
  readonly handleAdvanceDigitalCase: (item: ActivityItem) => Promise<void>;
  readonly currentBlockItems: () => readonly ActivityItem[];
  readonly focusAnswer: (item: ActivityItem) => void;
  readonly persistAnswer: (
    item: ActivityItem,
    currentAttempt: AttemptProjection,
  ) => Promise<AttemptProjection>;
  readonly handleSaveAnswer: (item: ActivityItem) => Promise<void>;
  readonly saveCurrentBlock: () => Promise<AttemptProjection | null>;
  readonly handleNextPage: () => Promise<void>;
  readonly handleSubmitAttempt: () => Promise<void>;
}>;

async function loadModuleRuntime(
  context: ParticipantActionContext,
  moduleId: string,
): Promise<void> {
  try {
    const data = await requestJson(
      `/api/v1/curriculum/modules/${moduleId}/runtime`,
      { method: "GET" },
    );
    context.setRuntime(isRuntime(data) ? data : null);
  } catch (caught) {
    if (caught instanceof PublicApiError && caught.code === "not_found") {
      context.setRuntime(null);
      return;
    }
    throw caught;
  }
}

async function loadModuleDigitalCase(
  context: ParticipantActionContext,
  moduleId: string,
): Promise<void> {
  try {
    const data = await requestJson(
      `/api/v1/curriculum/modules/${moduleId}/case`,
      { method: "GET" },
    );
    context.setDigitalCase(isDigitalCaseRuntime(data) ? data : null);
  } catch (caught) {
    if (caught instanceof PublicApiError && caught.code === "not_found") {
      context.setDigitalCase(null);
      return;
    }
    throw caught;
  }
}

async function loadParticipantActivity(
  context: ParticipantActionContext,
  nextActivityId: string,
  seedAttempt: AttemptProjection | null = null,
): Promise<void> {
  context.setActivityState("loading");
  context.setRetryAction("activity");
  try {
    const data = await requestJson(`/api/v1/activities/${nextActivityId}`, {
      method: "GET",
    });
    if (!isActivity(data)) {
      throw new PublicApiError("internal_error", "invalid projection");
    }
    const isNewActivity = context.activity?.activityId !== data.activityId;
    context.setActivity(data);
    if (isNewActivity) {
      context.setAttempt(seedAttempt);
      context.setAnswers(answersFromAttempt(seedAttempt));
      context.setQuestionPage(0);
      context.setPageSaveState("idle");
    }
    const moduleId = moduleIdFromActivity(data);
    if (moduleId !== null) {
      await loadModuleRuntime(context, moduleId);
      await loadModuleDigitalCase(context, moduleId);
    } else {
      context.setRuntime(null);
      context.setDigitalCase(null);
    }
    context.setActivityState("ready");
    context.setRetryAction(null);
  } catch (caught) {
    context.setActivityState("error");
    throw caught;
  }
}

async function loadParticipantJourney(
  context: ParticipantActionContext,
): Promise<LearningJourneyProjection> {
  context.setJourneyState("loading");
  context.setRetryAction("journey");
  try {
    const data = await requestJson("/api/v1/learning-path", { method: "GET" });
    if (!isJourney(data)) {
      throw new PublicApiError("internal_error", "invalid journey projection");
    }
    context.setJourney(data);
    context.setJourneyState(data.activities.length === 0 ? "empty" : "ready");
    context.setRetryAction(null);
    return data;
  } catch (caught) {
    context.setJourneyState("error");
    throw caught;
  }
}

async function openParticipantJourneyActivity(
  context: ParticipantActionContext,
  loadedJourney: LearningJourneyProjection,
  loadActivity: ParticipantActions["loadActivity"],
): Promise<void> {
  const requestedActivityId =
    context.activityId.trim().length > 0
      ? context.activityId
      : initialActivityId();
  if (requestedActivityId.length > 0) {
    context.setActivityId(requestedActivityId);
    const requested = loadedJourney.activities.find(
      (item) => item.activityId === requestedActivityId,
    );
    await loadActivity(
      requestedActivityId,
      attemptFromJourneyActivity(requested),
    );
    return;
  }
  if (!canAutoOpenJourneyActivity(loadedJourney)) return;
  const nextActivity = orderedJourneyActivities(loadedJourney.activities).find(
    (item) => item.nextAction !== "CONSULTAR_PROXIMO_PASSO",
  );
  if (nextActivity === undefined) return;
  context.setActivityId(nextActivity.activityId);
  await loadActivity(
    nextActivity.activityId,
    attemptFromJourneyActivity(nextActivity),
  );
}

async function signInParticipant(
  context: ParticipantActionContext,
  actions: ParticipantActions,
): Promise<void> {
  context.setBusy(true);
  context.setError(null);
  context.setNotice(null);
  context.setRetryAction(null);
  context.setCanManageAdmin(false);
  try {
    await requestJson("/api/v1/auth/login", {
      method: "POST",
      body: {
        login: context.login,
        password: context.password,
        sessionExpiresInSeconds: 3600,
      },
    });
  } catch (caught) {
    context.setRetryAction("login");
    context.setError(publicErrorMessage(caught));
    context.setBusy(false);
    return;
  }
  context.setAuthenticated(true);
  context.setPassword("");
  context.setNotice("Login realizado.");
  try {
    void actions.loadSessionCapabilities();
    const journey = await actions.loadJourney();
    await actions.openJourneyActivity(journey);
  } catch (caught) {
    context.setError(publicErrorMessage(caught));
  } finally {
    context.setBusy(false);
  }
}

async function submitParticipantFeedback(
  context: ParticipantActionContext,
  event: FormEvent<HTMLFormElement>,
): Promise<void> {
  event.preventDefault();
  if (context.feedbackDescription.trim().length === 0) {
    context.setError("Descreva o problema ou a melhoria antes de enviar.");
    return;
  }
  context.setFeedbackState("sending");
  context.setError(null);
  context.setNotice(null);
  try {
    await requestJson("/api/v1/feedback", {
      method: "POST",
      body: {
        type: context.feedbackType,
        description: context.feedbackDescription.trim(),
      },
    });
    context.setFeedbackDescription("");
    context.setFeedbackState("sent");
    context.setNotice("Relato registrado.");
  } catch (caught) {
    context.setFeedbackState("idle");
    context.setError(publicErrorMessage(caught));
  }
}

async function restoreParticipantSession(
  context: ParticipantActionContext,
  actions: ParticipantActions,
): Promise<void> {
  if (!(await actions.loadSessionCapabilities())) return;
  context.setAuthenticated(true);
  try {
    const journey = await actions.loadJourney();
    await actions.openJourneyActivity(journey);
  } catch (caught) {
    context.setError(publicErrorMessage(caught));
  }
}

async function loadParticipantSessionCapabilities(
  context: ParticipantActionContext,
): Promise<boolean> {
  try {
    const session = await requestJson("/api/v1/session", { method: "GET" });
    context.setCanManageAdmin(
      isSessionProjection(session) && session.canAccessAdmin,
    );
    return true;
  } catch {
    context.setCanManageAdmin(false);
    return false;
  }
}

async function signOutParticipant(
  context: ParticipantActionContext,
): Promise<void> {
  context.setBusy(true);
  context.setError(null);
  context.setNotice(null);
  try {
    await requestJson("/api/v1/session/revoke", { method: "POST", body: {} });
  } catch (caught) {
    context.setError(publicErrorMessage(caught));
    context.setBusy(false);
    return;
  }
  context.setAuthenticated(false);
  context.setCanManageAdmin(false);
  context.setActivityId("");
  context.setActivity(null);
  context.setJourney(null);
  context.setRuntime(null);
  context.setDigitalCase(null);
  context.setAttempt(null);
  context.setAnswers({});
  context.setQuestionPage(0);
  context.setPageSaveState("idle");
  context.setJourneyState("idle");
  context.setActivityState("idle");
  context.setRetryAction(null);
  context.setFeedbackDescription("");
  context.setFeedbackState("idle");
  context.setNotice("Sessão encerrada.");
  context.setBusy(false);
}

async function refreshParticipantJourney(
  context: ParticipantActionContext,
  actions: ParticipantActions,
): Promise<void> {
  context.setBusy(true);
  context.setError(null);
  context.setNotice(null);
  try {
    const journey = await actions.loadJourney();
    const nextActivityId =
      context.activityId.trim().length > 0
        ? context.activityId
        : canAutoOpenJourneyActivity(journey)
          ? orderedJourneyActivities(journey.activities).find(
              (item) => item.nextAction !== "CONSULTAR_PROXIMO_PASSO",
            )?.activityId
          : undefined;
    if (nextActivityId !== undefined && nextActivityId.length > 0) {
      context.setActivityId(nextActivityId);
      const nextActivity = journey.activities.find(
        (item) => item.activityId === nextActivityId,
      );
      await actions.loadActivity(
        nextActivityId,
        attemptFromJourneyActivity(nextActivity),
      );
    }
    context.setNotice("Jornada atualizada.");
  } catch (caught) {
    context.setError(publicErrorMessage(caught));
  } finally {
    context.setBusy(false);
  }
}

async function refreshParticipantActivity(
  context: ParticipantActionContext,
  actions: ParticipantActions,
): Promise<void> {
  if (context.activityId.trim().length === 0) return;
  context.setBusy(true);
  context.setError(null);
  context.setNotice(null);
  try {
    await actions.loadActivity(context.activityId);
    context.setNotice("Atividade atualizada.");
  } catch (caught) {
    context.setError(publicErrorMessage(caught));
  } finally {
    context.setBusy(false);
  }
}

function retryParticipantAction(
  context: ParticipantActionContext,
  actions: ParticipantActions,
): void {
  if (context.retryAction === "login") void actions.signIn();
  if (context.retryAction === "journey") void actions.refreshJourney();
  if (context.retryAction === "activity") void actions.refreshActivity();
}

async function startParticipantAttempt(
  context: ParticipantActionContext,
): Promise<void> {
  if (context.activity === null) return;
  context.setBusy(true);
  context.setError(null);
  context.setNotice(null);
  try {
    const data = await requestJson("/api/v1/attempts", {
      method: "POST",
      body: {
        activityId: context.activity.activityId,
        idempotencyKey: idempotencyKey("start"),
      },
    });
    if (!isAttempt(data)) {
      throw new PublicApiError("internal_error", "invalid attempt projection");
    }
    context.setAttempt(data);
    context.setAnswers((previous) => ({
      ...previous,
      ...answersFromAttempt(data),
    }));
    context.setQuestionPage(0);
    context.setPageSaveState("idle");
    context.setNotice("Tentativa iniciada.");
  } catch (caught) {
    context.setError(publicErrorMessage(caught));
  } finally {
    context.setBusy(false);
  }
}

function changeParticipantChoice(
  context: ParticipantActionContext,
  item: ActivityItem,
  choiceId: string,
  checked: boolean,
): void {
  const current = selectedChoiceIds(item, context.answers[item.itemId]);
  const next =
    item.selectionMode === "MULTIPLE"
      ? checked
        ? [...current, choiceId].filter(
            (value, index, values) => values.indexOf(value) === index,
          )
        : current.filter((value) => value !== choiceId)
      : checked
        ? [choiceId]
        : [];
  context.setAnswers((previous) => ({
    ...previous,
    [item.itemId]:
      item.selectionMode === "MULTIPLE"
        ? JSON.stringify(next)
        : (next[0] ?? ""),
  }));
}

function focusParticipantAnswer(item: ActivityItem): void {
  const target =
    item.responseMode === "TEXT"
      ? document.getElementById("answer-" + item.itemId)
      : document.querySelector<HTMLInputElement>(
          'input[name="answer-' + item.itemId + '"]',
        );
  target?.focus();
}

function canAdvanceDigitalCase(
  context: ParticipantActionContext,
  item: ActivityItem,
): boolean {
  if (
    context.activity === null ||
    context.attempt === null ||
    item.responseMode !== "CHOICE" ||
    item.digitalCaseStage === undefined ||
    context.digitalCase === null
  ) {
    return false;
  }
  if (
    context.digitalCase.caseId !== item.digitalCaseStage.caseId ||
    context.digitalCase.currentStage !== item.digitalCaseStage.stage
  ) {
    context.setError(
      "Esta etapa já foi registrada ou ainda não está liberada.",
    );
    return false;
  }
  const selected = selectedChoiceIds(item, context.answers[item.itemId]);
  if (selected.length === 0) {
    context.setError("Selecione uma decisão antes de liberar a próxima etapa.");
    focusParticipantAnswer(item);
    return false;
  }
  return true;
}

async function advanceParticipantDigitalCase(
  context: ParticipantActionContext,
  item: ActivityItem,
  persistAnswer: ParticipantActions["persistAnswer"],
): Promise<void> {
  if (!canAdvanceDigitalCase(context, item) || context.digitalCase === null) {
    return;
  }
  context.setBusy(true);
  context.setError(null);
  context.setNotice(null);
  try {
    const answerData = await persistAnswer(item, context.attempt!);
    context.setAttempt(mergeAttemptProjection(context.attempt, answerData));
    const data = await requestJson(
      `/api/v1/curriculum/modules/${context.digitalCase.moduleId}/case/advance`,
      {
        method: "POST",
        body: {
          selectedChoiceIds: [
            ...selectedChoiceIds(item, context.answers[item.itemId]),
          ],
          expectedVersion: context.digitalCase.version,
        },
      },
    );
    if (!isDigitalCaseRuntime(data)) {
      throw new PublicApiError("internal_error", "invalid case projection");
    }
    context.setDigitalCase(data);
    context.setNotice("Decisão registrada. A próxima informação foi liberada.");
  } catch (caught) {
    context.setError(publicErrorMessage(caught));
  } finally {
    context.setBusy(false);
  }
}

function currentParticipantBlockItems(
  context: ParticipantActionContext,
): readonly ActivityItem[] {
  if (context.activity === null) return [];
  const start = context.questionPage * ITEMS_PER_BLOCK;
  return context.activity.items.slice(start, start + ITEMS_PER_BLOCK);
}

async function persistParticipantAnswer(
  context: ParticipantActionContext,
  item: ActivityItem,
  currentAttempt: AttemptProjection,
): Promise<AttemptProjection> {
  const data = await requestJson(
    "/api/v1/attempts/" + currentAttempt.attemptId + "/answers",
    {
      method: "POST",
      body: {
        attemptId: currentAttempt.attemptId,
        activityId: context.activity?.activityId ?? "",
        itemId: item.itemId,
        response: context.answers[item.itemId] ?? "",
        idempotencyKey: idempotencyKey("answer"),
      },
    },
  );
  if (!isAttempt(data)) {
    throw new PublicApiError("internal_error", "invalid answer projection");
  }
  return data;
}

async function saveParticipantAnswer(
  context: ParticipantActionContext,
  item: ActivityItem,
  persistAnswer: ParticipantActions["persistAnswer"],
): Promise<void> {
  if (context.activity === null || context.attempt === null) return;
  if (!isAnswerComplete(item, context.answers[item.itemId])) {
    context.setError("Responda esta questão antes de salvar.");
    focusParticipantAnswer(item);
    return;
  }
  context.setBusy(true);
  context.setError(null);
  context.setNotice(null);
  try {
    const data = await persistAnswer(item, context.attempt);
    context.setAttempt((previous) => mergeAttemptProjection(previous, data));
    context.setPageSaveState("saved");
    context.setNotice("Resposta salva.");
  } catch (caught) {
    context.setError(publicErrorMessage(caught));
  } finally {
    context.setBusy(false);
  }
}

async function saveParticipantBlock(
  context: ParticipantActionContext,
  currentBlockItems: ParticipantActions["currentBlockItems"],
  persistAnswer: ParticipantActions["persistAnswer"],
): Promise<AttemptProjection | null> {
  if (context.activity === null || context.attempt === null) return null;
  const blockItems = currentBlockItems();
  const incomplete = blockItems.find(
    (item) => !isAnswerComplete(item, context.answers[item.itemId]),
  );
  if (incomplete !== undefined) {
    context.setPageSaveState("idle");
    context.setError(
      "Responda todas as questões deste bloco antes de avançar.",
    );
    focusParticipantAnswer(incomplete);
    return null;
  }
  context.setBusy(true);
  context.setError(null);
  context.setNotice(null);
  context.setPageSaveState("saving");
  let currentAttempt = context.attempt;
  try {
    for (const item of blockItems) {
      if (item.responseMode === "NONE") continue;
      const data = await persistAnswer(item, currentAttempt);
      currentAttempt = mergeAttemptProjection(currentAttempt, data);
    }
    context.setAttempt(currentAttempt);
    context.setPageSaveState("saved");
    context.setNotice("Bloco salvo.");
    return currentAttempt;
  } catch (caught) {
    context.setPageSaveState("idle");
    context.setError(publicErrorMessage(caught));
    return null;
  } finally {
    context.setBusy(false);
  }
}

async function nextParticipantPage(
  context: ParticipantActionContext,
  saveCurrentBlock: ParticipantActions["saveCurrentBlock"],
): Promise<void> {
  const savedAttempt = await saveCurrentBlock();
  if (savedAttempt === null || context.activity === null) return;
  const totalBlocks = Math.max(
    1,
    Math.ceil(context.activity.items.length / ITEMS_PER_BLOCK),
  );
  if (context.questionPage >= totalBlocks - 1) return;
  context.setQuestionPage((previous) => previous + 1);
  context.setPageSaveState("idle");
  context.setNotice("Bloco salvo. Próximo bloco liberado.");
  window.requestAnimationFrame(() => {
    document.getElementById("question-block-title")?.focus();
  });
}

async function submitParticipantAttempt(
  context: ParticipantActionContext,
  saveCurrentBlock: ParticipantActions["saveCurrentBlock"],
): Promise<void> {
  if (context.attempt === null || context.activity === null) return;
  const incomplete = context.activity.items.find(
    (item) => !isAnswerComplete(item, context.answers[item.itemId]),
  );
  if (incomplete !== undefined) {
    context.setError("Responda todas as questões antes de enviar a tentativa.");
    context.setQuestionPage(
      Math.floor(context.activity.items.indexOf(incomplete) / ITEMS_PER_BLOCK),
    );
    focusParticipantAnswer(incomplete);
    return;
  }
  const savedAttempt = await saveCurrentBlock();
  if (savedAttempt === null) return;
  context.setBusy(true);
  context.setError(null);
  context.setNotice(null);
  try {
    const data = await requestJson(
      "/api/v1/attempts/" + savedAttempt.attemptId + "/submit",
      {
        method: "POST",
        body: { idempotencyKey: idempotencyKey("submit") },
      },
    );
    if (!isAttempt(data)) {
      throw new PublicApiError(
        "internal_error",
        "invalid submission projection",
      );
    }
    context.setAttempt((previous) => mergeAttemptProjection(previous, data));
    context.setNotice("Tentativa submetida.");
  } catch (caught) {
    context.setError(publicErrorMessage(caught));
  } finally {
    context.setBusy(false);
  }
}

export function createParticipantActions(
  context: ParticipantActionContext,
): ParticipantActions {
  const actions: ParticipantActions = {
    loadActivity: (
      nextActivityId: string,
      seedAttempt?: AttemptProjection | null,
    ) => loadParticipantActivity(context, nextActivityId, seedAttempt),
    loadJourney: () => loadParticipantJourney(context),
    openJourneyActivity: (journey: LearningJourneyProjection) =>
      openParticipantJourneyActivity(context, journey, actions.loadActivity),
    signIn: () => signInParticipant(context, actions),
    handleLogin: (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void actions.signIn();
    },
    handleFeedbackSubmit: (event: FormEvent<HTMLFormElement>) =>
      submitParticipantFeedback(context, event),
    restoreSession: () => restoreParticipantSession(context, actions),
    loadSessionCapabilities: () => loadParticipantSessionCapabilities(context),
    signOut: () => signOutParticipant(context),
    refreshJourney: () => refreshParticipantJourney(context, actions),
    refreshActivity: () => refreshParticipantActivity(context, actions),
    handleRetry: () => retryParticipantAction(context, actions),
    handleStartAttempt: () => startParticipantAttempt(context),
    handleChoiceChange: (
      item: ActivityItem,
      choiceId: string,
      checked: boolean,
    ) => changeParticipantChoice(context, item, choiceId, checked),
    handleAdvanceDigitalCase: (item: ActivityItem) =>
      advanceParticipantDigitalCase(context, item, actions.persistAnswer),
    currentBlockItems: () => currentParticipantBlockItems(context),
    focusAnswer: focusParticipantAnswer,
    persistAnswer: (item: ActivityItem, currentAttempt: AttemptProjection) =>
      persistParticipantAnswer(context, item, currentAttempt),
    handleSaveAnswer: (item: ActivityItem) =>
      saveParticipantAnswer(context, item, actions.persistAnswer),
    saveCurrentBlock: () =>
      saveParticipantBlock(
        context,
        actions.currentBlockItems,
        actions.persistAnswer,
      ),
    handleNextPage: () =>
      nextParticipantPage(context, actions.saveCurrentBlock),
    handleSubmitAttempt: () =>
      submitParticipantAttempt(context, actions.saveCurrentBlock),
  } satisfies ParticipantActions;
  return actions;
}
