"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import type {
  FeedbackState,
  FeedbackType,
  RetryAction,
} from "./participant-model";

type ParticipantFeedbackViewProps = Readonly<{
  readonly feedbackType: FeedbackType;
  readonly feedbackDescription: string;
  readonly feedbackState: FeedbackState;
  readonly error: string | null;
  readonly notice: string | null;
  readonly retryAction: RetryAction;
  readonly busy: boolean;
  readonly setFeedbackType: Dispatch<SetStateAction<FeedbackType>>;
  readonly setFeedbackDescription: Dispatch<SetStateAction<string>>;
  readonly handleFeedbackSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => Promise<void>;
  readonly handleRetry: () => void;
}>;

export function ParticipantFeedbackView({
  feedbackType,
  feedbackDescription,
  feedbackState,
  error,
  notice,
  retryAction,
  busy,
  setFeedbackType,
  setFeedbackDescription,
  handleFeedbackSubmit,
  handleRetry,
}: ParticipantFeedbackViewProps) {
  return (
    <>
      <FeedbackForm
        feedbackType={feedbackType}
        feedbackDescription={feedbackDescription}
        feedbackState={feedbackState}
        setFeedbackType={setFeedbackType}
        setFeedbackDescription={setFeedbackDescription}
        handleFeedbackSubmit={handleFeedbackSubmit}
      />
      <FeedbackMessages
        error={error}
        notice={notice}
        retryAction={retryAction}
        busy={busy}
        handleRetry={handleRetry}
      />
    </>
  );
}

type FeedbackFormProps = Pick<
  ParticipantFeedbackViewProps,
  | "feedbackType"
  | "feedbackDescription"
  | "feedbackState"
  | "setFeedbackType"
  | "setFeedbackDescription"
  | "handleFeedbackSubmit"
>;

function FeedbackForm({
  feedbackType,
  feedbackDescription,
  feedbackState,
  setFeedbackType,
  setFeedbackDescription,
  handleFeedbackSubmit,
}: FeedbackFormProps) {
  return (
    <section
      className="feedback-report-card"
      aria-labelledby="feedback-report-title"
    >
      <div>
        <p className="eyebrow">Canal protegido</p>
        <h2 id="feedback-report-title">Relatar um problema ou melhoria</h2>
        <p>
          Envie somente contexto do treinamento. Não inclua prontuários, dados
          de tutores, fotos, PDFs, respostas ou outros dados reais.
        </p>
      </div>
      <FeedbackFormFields
        feedbackType={feedbackType}
        feedbackDescription={feedbackDescription}
        feedbackState={feedbackState}
        setFeedbackType={setFeedbackType}
        setFeedbackDescription={setFeedbackDescription}
        handleFeedbackSubmit={handleFeedbackSubmit}
      />
    </section>
  );
}

function FeedbackFormFields({
  feedbackType,
  feedbackDescription,
  feedbackState,
  setFeedbackType,
  setFeedbackDescription,
  handleFeedbackSubmit,
}: FeedbackFormProps) {
  return (
    <form
      className="feedback-report-form"
      onSubmit={(event) => void handleFeedbackSubmit(event)}
    >
      <label htmlFor="feedback-type">Tipo do relato</label>
      <select
        id="feedback-type"
        value={feedbackType}
        onChange={(event) =>
          setFeedbackType(event.target.value as FeedbackType)
        }
        disabled={feedbackState === "sending"}
      >
        <option value="BUG_TECNICO">Bug técnico</option>
        <option value="USABILIDADE">Usabilidade</option>
        <option value="ERRO_CONTEUDO">Erro de conteúdo</option>
        <option value="MELHORIA">Melhoria</option>
        <option value="CONTESTACAO">Contestação</option>
      </select>
      <label htmlFor="feedback-description">Descrição</label>
      <textarea
        id="feedback-description"
        value={feedbackDescription}
        onChange={(event) => setFeedbackDescription(event.target.value)}
        maxLength={10_000}
        rows={4}
        placeholder="Descreva o que aconteceu ou o que poderia melhorar."
        disabled={feedbackState === "sending"}
        required
      />
      <button
        type="submit"
        className="secondary-button"
        disabled={feedbackState === "sending"}
      >
        {feedbackState === "sending" ? "Enviando…" : "Enviar relato"}
      </button>
      {feedbackState === "sent" ? (
        <p className="feedback success" role="status">
          Relato registrado.
        </p>
      ) : null}
    </form>
  );
}

type FeedbackMessagesProps = Pick<
  ParticipantFeedbackViewProps,
  "error" | "notice" | "retryAction" | "busy" | "handleRetry"
>;

function FeedbackMessages({
  error,
  notice,
  retryAction,
  busy,
  handleRetry,
}: FeedbackMessagesProps) {
  return (
    <>
      {error !== null ? (
        <div className="feedback-group">
          <p className="feedback error" role="alert">
            {error}
          </p>
          {retryAction !== null ? (
            <button type="button" onClick={handleRetry} disabled={busy}>
              Tentar novamente
            </button>
          ) : null}
        </div>
      ) : null}
      {notice !== null ? (
        <p className="feedback success" role="status">
          {notice}
        </p>
      ) : null}
    </>
  );
}
