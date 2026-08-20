"use client";

import type { ChangeEvent } from "react";

import {
  operationalNotice,
  operationalNoticeTitle,
} from "./operational-notice";
import type { ParticipantLoginViewProps } from "./participant-login-types";

type LoginFormProps = Pick<
  ParticipantLoginViewProps,
  | "login"
  | "password"
  | "showPassword"
  | "busy"
  | "setLogin"
  | "setPassword"
  | "setShowPassword"
  | "handleLogin"
>;

export function ParticipantLoginFormPanel(
  props: ParticipantLoginViewProps,
): React.JSX.Element {
  return (
    <div className="login-form-panel">
      <div className="form-panel-meta">
        <span className="form-panel-label">Acesso interno</span>
      </div>
      <h2>Bem-vindo de volta</h2>
      <p className="form-panel-intro">
        Entre com o e-mail profissional e continue de onde parou.
      </p>
      <OperationalNotice />
      <LoginForm {...props} />
      <LoginFeedback
        error={props.error}
        retryAction={props.retryAction}
        busy={props.busy}
        handleRetry={props.handleRetry}
      />
      <LoginSupport />
      <p className="login-footer">
        Conteúdo interno · acesso individual · sem cadastro público
      </p>
    </div>
  );
}

function OperationalNotice(): React.JSX.Element {
  return (
    <section
      className="operational-notice"
      aria-labelledby="operational-notice-title"
    >
      <h3 id="operational-notice-title">{operationalNoticeTitle}</h3>
      <div className="operational-notice-grid">
        {operationalNotice.map((notice) => (
          <div className="operational-notice-item" key={notice.id}>
            <h4>{notice.heading}</h4>
            <p>{notice.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LoginForm({
  login,
  password,
  showPassword,
  busy,
  setLogin,
  setPassword,
  setShowPassword,
  handleLogin,
}: LoginFormProps): React.JSX.Element {
  const handlePasswordToggle = (): void => {
    setShowPassword((visible) => !visible);
  };
  const handleLoginChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setLogin(event.target.value);
  };
  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setPassword(event.target.value);
  };
  return (
    <form className="access-form login-form" onSubmit={handleLogin}>
      <label htmlFor="login">E-mail profissional</label>
      <p id="login-help" className="field-help">
        Use o e-mail cadastrado pela operação do ambiente.
      </p>
      <input
        id="login"
        name="login"
        type="email"
        autoComplete="username"
        aria-describedby="login-help"
        value={login}
        onChange={handleLoginChange}
        maxLength={320}
        required
      />
      <div className="password-label-row">
        <label htmlFor="password">Senha</label>
        <span className="password-rule">Mínimo de 12 caracteres</span>
      </div>
      <p id="password-help" className="field-help">
        Use a senha recebida no convite da operação.
      </p>
      <div className="password-field">
        <input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          aria-describedby="password-help"
          value={password}
          onChange={handlePasswordChange}
          minLength={12}
          maxLength={128}
          required
        />
        <button
          type="button"
          className="password-toggle"
          aria-controls="password"
          aria-pressed={showPassword}
          onClick={handlePasswordToggle}
        >
          {showPassword ? "Ocultar senha" : "Mostrar senha"}
        </button>
      </div>
      <button className="login-submit" type="submit" disabled={busy}>
        <span>{busy ? "Abrindo jornada…" : "Entrar"}</span>
        <span className="submit-arrow" aria-hidden="true">
          →
        </span>
      </button>
    </form>
  );
}

function LoginFeedback({
  error,
  retryAction,
  busy,
  handleRetry,
}: Pick<
  ParticipantLoginViewProps,
  "error" | "retryAction" | "busy" | "handleRetry"
>): React.JSX.Element | null {
  if (error === null) return null;
  return (
    <div className="feedback-group">
      <p className="feedback error" role="alert">
        {error}
      </p>
      {retryAction === "login" ? (
        <button type="button" onClick={handleRetry} disabled={busy}>
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}

function LoginSupport(): React.JSX.Element {
  return (
    <div className="login-support">
      <span className="support-icon" aria-hidden="true">
        ✦
      </span>
      <p>
        <strong>Primeiro acesso?</strong> O superadmin cria seu acesso e envia
        um link individual para você definir sua senha.
      </p>
    </div>
  );
}
