"use client";

import type { Dispatch, SetStateAction } from "react";
import { ParticipantActivityView } from "./participant-activity-view";
import { ParticipantFeedbackView } from "./participant-feedback-view";
import { ParticipantJourneyView } from "./participant-journey-view";
import { ParticipantLoginView } from "./participant-login-view";
import type { ParticipantActions } from "./participant-actions";
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

export type ParticipantExperienceViewProps = Readonly<{
  readonly authenticated: boolean;
  readonly canManageAdmin: boolean;
  readonly busy: boolean;
  readonly error: string | null;
  readonly notice: string | null;
  readonly login: string;
  readonly password: string;
  readonly showPassword: boolean;
  readonly activity: ActivityProjection | null;
  readonly activityState: ExperienceState;
  readonly attempt: AttemptProjection | null;
  readonly answers: Readonly<Record<string, string>>;
  readonly digitalCase: DigitalCaseRuntimeProjection | null;
  readonly journey: LearningJourneyProjection | null;
  readonly runtime: CurriculumRuntimeProjection | null;
  readonly journeyState: ExperienceState;
  readonly answerableItems: readonly ActivityItem[];
  readonly answeredItemCount: number;
  readonly progressPercent: number;
  readonly pageSaveState: PageSaveState;
  readonly questionPage: number;
  readonly totalBlocks: number;
  readonly visibleItems: readonly ActivityItem[];
  readonly currentBlockAnswerableItems: readonly ActivityItem[];
  readonly currentBlockAnsweredCount: number;
  readonly blockStartOrdinal: number;
  readonly blockEndOrdinal: number;
  readonly hasNextPage: boolean;
  readonly feedbackType: FeedbackType;
  readonly feedbackDescription: string;
  readonly feedbackState: FeedbackState;
  readonly retryAction: RetryAction;
  readonly setLogin: Dispatch<SetStateAction<string>>;
  readonly setPassword: Dispatch<SetStateAction<string>>;
  readonly setShowPassword: Dispatch<SetStateAction<boolean>>;
  readonly setAnswers: Dispatch<
    SetStateAction<Readonly<Record<string, string>>>
  >;
  readonly setQuestionPage: Dispatch<SetStateAction<number>>;
  readonly setPageSaveState: Dispatch<SetStateAction<PageSaveState>>;
  readonly setFeedbackType: Dispatch<SetStateAction<FeedbackType>>;
  readonly setFeedbackDescription: Dispatch<SetStateAction<string>>;
  readonly actions: ParticipantActions;
}>;

function ParticipantTopbar(
  props: Pick<
    ParticipantExperienceViewProps,
    "authenticated" | "canManageAdmin" | "busy" | "actions"
  >,
) {
  return (
    <header
      className={props.authenticated ? "topbar" : "topbar login-topbar"}
      aria-label="Identificação do ambiente"
    >
      <div>
        <p className="eyebrow">CVG · academia interna</p>
        <span className="brand">Treinamento veterinário</span>
      </div>
      {props.authenticated ? (
        <div className="session-actions">
          {props.canManageAdmin ? (
            <a className="admin-nav-link" href="/admin">
              Centro de controle
            </a>
          ) : null}
          <button
            className="admin-nav-link session-logout"
            type="button"
            onClick={() => void props.actions.signOut()}
            disabled={props.busy}
          >
            Sair
          </button>
        </div>
      ) : null}
    </header>
  );
}

function ParticipantMainContent(props: ParticipantExperienceViewProps) {
  if (!props.authenticated) {
    return (
      <ParticipantLoginView
        login={props.login}
        password={props.password}
        showPassword={props.showPassword}
        busy={props.busy}
        error={props.error}
        retryAction={props.retryAction}
        setLogin={props.setLogin}
        setPassword={props.setPassword}
        setShowPassword={props.setShowPassword}
        handleLogin={props.actions.handleLogin}
        handleRetry={props.actions.handleRetry}
      />
    );
  }
  if (props.activity === null) {
    return (
      <ParticipantJourneyView
        journeyState={props.journeyState}
        journey={props.journey}
        busy={props.busy}
        refreshJourney={props.actions.refreshJourney}
        handleRetry={props.actions.handleRetry}
      />
    );
  }
  return (
    <ParticipantActivityView
      activity={props.activity}
      activityState={props.activityState}
      attempt={props.attempt}
      answers={props.answers}
      digitalCase={props.digitalCase}
      journey={props.journey}
      runtime={props.runtime}
      busy={props.busy}
      answeredItemCount={props.answeredItemCount}
      answerableItems={props.answerableItems}
      progressPercent={props.progressPercent}
      pageSaveState={props.pageSaveState}
      questionPage={props.questionPage}
      totalBlocks={props.totalBlocks}
      visibleItems={props.visibleItems}
      currentBlockAnswerableItems={props.currentBlockAnswerableItems}
      currentBlockAnsweredCount={props.currentBlockAnsweredCount}
      blockStartOrdinal={props.blockStartOrdinal}
      blockEndOrdinal={props.blockEndOrdinal}
      hasNextPage={props.hasNextPage}
      setAnswers={props.setAnswers}
      setQuestionPage={props.setQuestionPage}
      setPageSaveState={props.setPageSaveState}
      handleStartAttempt={props.actions.handleStartAttempt}
      handleChoiceChange={props.actions.handleChoiceChange}
      handleAdvanceDigitalCase={props.actions.handleAdvanceDigitalCase}
      handleSaveAnswer={props.actions.handleSaveAnswer}
      handleNextPage={props.actions.handleNextPage}
      saveCurrentBlock={props.actions.saveCurrentBlock}
      handleSubmitAttempt={props.actions.handleSubmitAttempt}
    />
  );
}

function ParticipantFeedback(props: ParticipantExperienceViewProps) {
  if (!props.authenticated) return null;
  return (
    <ParticipantFeedbackView
      feedbackType={props.feedbackType}
      feedbackDescription={props.feedbackDescription}
      feedbackState={props.feedbackState}
      error={props.error}
      notice={props.notice}
      retryAction={props.retryAction}
      busy={props.busy}
      setFeedbackType={props.setFeedbackType}
      setFeedbackDescription={props.setFeedbackDescription}
      handleFeedbackSubmit={props.actions.handleFeedbackSubmit}
      handleRetry={props.actions.handleRetry}
    />
  );
}

export function ParticipantExperienceView(
  props: ParticipantExperienceViewProps,
) {
  return (
    <main
      className="shell"
      id="main-content"
      tabIndex={-1}
      aria-busy={props.busy}
    >
      <ParticipantTopbar {...props} />
      {props.busy ? (
        <div
          className="feedback pending"
          data-testid="loading-state"
          role="status"
          aria-live="polite"
        >
          Atualizando seu treinamento…
        </div>
      ) : null}
      <ParticipantMainContent {...props} />
      <ParticipantFeedback {...props} />
    </main>
  );
}
