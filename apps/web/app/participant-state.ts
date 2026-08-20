"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type {
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
import type { ParticipantActionContext } from "./participant-actions";

type LearningState = Pick<
  ParticipantActionContext,
  | "activityId"
  | "activity"
  | "runtime"
  | "digitalCase"
  | "journey"
  | "attempt"
  | "answers"
  | "questionPage"
  | "pageSaveState"
  | "journeyState"
  | "activityState"
  | "retryAction"
  | "setActivityId"
  | "setActivity"
  | "setRuntime"
  | "setDigitalCase"
  | "setJourney"
  | "setAttempt"
  | "setAnswers"
  | "setQuestionPage"
  | "setPageSaveState"
  | "setJourneyState"
  | "setActivityState"
  | "setRetryAction"
>;

type UiState = Readonly<{
  readonly authenticated: boolean;
  readonly canManageAdmin: boolean;
  readonly busy: boolean;
  readonly error: string | null;
  readonly notice: string | null;
  readonly login: string;
  readonly password: string;
  readonly showPassword: boolean;
  readonly feedbackType: FeedbackType;
  readonly feedbackDescription: string;
  readonly feedbackState: FeedbackState;
  readonly setAuthenticated: Dispatch<SetStateAction<boolean>>;
  readonly setCanManageAdmin: Dispatch<SetStateAction<boolean>>;
  readonly setBusy: Dispatch<SetStateAction<boolean>>;
  readonly setError: Dispatch<SetStateAction<string | null>>;
  readonly setNotice: Dispatch<SetStateAction<string | null>>;
  readonly setLogin: Dispatch<SetStateAction<string>>;
  readonly setPassword: Dispatch<SetStateAction<string>>;
  readonly setShowPassword: Dispatch<SetStateAction<boolean>>;
  readonly setFeedbackType: Dispatch<SetStateAction<FeedbackType>>;
  readonly setFeedbackDescription: Dispatch<SetStateAction<string>>;
  readonly setFeedbackState: Dispatch<SetStateAction<FeedbackState>>;
}>;

function useLearningState(): LearningState {
  const [activityId, setActivityId] = useState("");
  const [activity, setActivity] = useState<ActivityProjection | null>(null);
  const [runtime, setRuntime] = useState<CurriculumRuntimeProjection | null>(
    null,
  );
  const [digitalCase, setDigitalCase] =
    useState<DigitalCaseRuntimeProjection | null>(null);
  const [journey, setJourney] = useState<LearningJourneyProjection | null>(
    null,
  );
  const [attempt, setAttempt] = useState<AttemptProjection | null>(null);
  const [answers, setAnswers] = useState<Readonly<Record<string, string>>>({});
  const [questionPage, setQuestionPage] = useState(0);
  const [pageSaveState, setPageSaveState] = useState<PageSaveState>("idle");
  const [journeyState, setJourneyState] = useState<ExperienceState>("idle");
  const [activityState, setActivityState] = useState<ExperienceState>("idle");
  const [retryAction, setRetryAction] = useState<RetryAction>(null);
  return {
    activityId,
    activity,
    runtime,
    digitalCase,
    journey,
    attempt,
    answers,
    questionPage,
    pageSaveState,
    journeyState,
    activityState,
    retryAction,
    setActivityId,
    setActivity,
    setRuntime,
    setDigitalCase,
    setJourney,
    setAttempt,
    setAnswers,
    setQuestionPage,
    setPageSaveState,
    setJourneyState,
    setActivityState,
    setRetryAction,
  };
}

function useUiState(): UiState {
  const [authenticated, setAuthenticated] = useState(false);
  const [canManageAdmin, setCanManageAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("BUG_TECNICO");
  const [feedbackDescription, setFeedbackDescription] = useState("");
  const [feedbackState, setFeedbackState] = useState<FeedbackState>("idle");
  return {
    authenticated,
    canManageAdmin,
    busy,
    error,
    notice,
    login,
    password,
    showPassword,
    feedbackType,
    feedbackDescription,
    feedbackState,
    setAuthenticated,
    setCanManageAdmin,
    setBusy,
    setError,
    setNotice,
    setLogin,
    setPassword,
    setShowPassword,
    setFeedbackType,
    setFeedbackDescription,
    setFeedbackState,
  };
}

export type ParticipantPageState = LearningState & UiState;

export function useParticipantPageState(): ParticipantPageState {
  return { ...useLearningState(), ...useUiState() };
}
