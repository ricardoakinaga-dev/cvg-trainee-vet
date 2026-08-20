import type { FormEventHandler } from "react";

import { minimumPasswordLength } from "./invite-model";

export function InviteHeader() {
  return (
    <header className="topbar" aria-label="Primeiro acesso">
      <div>
        <p className="eyebrow">CVG · primeiro acesso</p>
        <span className="brand">Ative sua jornada</span>
      </div>
      <span className="status-pill">Convite individual</span>
    </header>
  );
}

export function InviteIntro() {
  return (
    <div>
      <p className="eyebrow">Acesso criado pelo superadmin</p>
      <h1 id="invite-title">Criar senha de primeiro acesso</h1>
      <p>
        Defina sua senha pessoal para entrar no treinamento. O link é de uso
        único e não pode ser reutilizado.
      </p>
    </div>
  );
}

export function InviteComplete() {
  return (
    <div className="first-access-complete">
      <p role="status">Acesso ativado. Você já pode entrar no treinamento.</p>
      <a href="/">Entrar no treinamento</a>
    </div>
  );
}

type InviteFormProps = Readonly<{
  password: string;
  confirmation: string;
  busy: boolean;
  onPasswordChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
}>;

export function InviteForm({
  password,
  confirmation,
  busy,
  onPasswordChange,
  onConfirmationChange,
  onSubmit,
}: InviteFormProps) {
  return (
    <form className="first-access-form" onSubmit={onSubmit}>
      <label htmlFor="invite-password">Nova senha</label>
      <p id="invite-password-help" className="field-help">
        Use pelo menos 12 caracteres e não compartilhe sua senha.
      </p>
      <input
        id="invite-password"
        type="password"
        autoComplete="new-password"
        aria-describedby="invite-password-help"
        minLength={minimumPasswordLength}
        maxLength={128}
        required
        value={password}
        onChange={(event) => onPasswordChange(event.target.value)}
      />
      <label htmlFor="invite-password-confirm">Confirmar nova senha</label>
      <input
        id="invite-password-confirm"
        type="password"
        autoComplete="new-password"
        minLength={minimumPasswordLength}
        maxLength={128}
        required
        value={confirmation}
        onChange={(event) => onConfirmationChange(event.target.value)}
      />
      <button type="submit" disabled={busy}>
        {busy ? "Ativando acesso…" : "Ativar meu acesso"}
      </button>
    </form>
  );
}

export function InviteFeedback({ error }: Readonly<{ error: string | null }>) {
  return error !== null ? (
    <p className="feedback error" role="alert">
      {error}
    </p>
  ) : null;
}
