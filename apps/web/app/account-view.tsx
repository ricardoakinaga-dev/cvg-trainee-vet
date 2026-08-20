"use client";

import type { Dispatch, SetStateAction } from "react";
import type { AccountActions } from "./account-actions";
import type { Operation, Security } from "./account-model";
import type { AccountPageState } from "./account-state";

export type AccountViewProps = AccountPageState & AccountActions;

function AccountHeader() {
  return (
    <header className="topbar" aria-label="Segurança da conta">
      <div>
        <p className="eyebrow">CVG · conta</p>
        <span className="brand">Acesso e segurança</span>
      </div>
      <span className="status-pill">Sem segredos locais</span>
    </header>
  );
}

function SecuritySummary({
  security,
}: Readonly<{ readonly security: Security | null }>) {
  return security === null ? (
    <p role="status">Consultando segurança…</p>
  ) : (
    <dl className="dependency-list">
      <div>
        <dt>Provedor</dt>
        <dd>{security.provider}</dd>
      </div>
      <div>
        <dt>Recuperação</dt>
        <dd>{security.recovery}</dd>
      </div>
      <div>
        <dt>MFA</dt>
        <dd>{security.mfa}</dd>
      </div>
      <div>
        <dt>Sessão</dt>
        <dd>{security.session}</dd>
      </div>
    </dl>
  );
}

function ProviderActions({
  security,
  busy,
  startRecovery,
  startMfa,
}: Pick<AccountViewProps, "security" | "busy" | "startRecovery" | "startMfa">) {
  return (
    <div className="review-actions">
      <button
        type="button"
        disabled={busy || security?.recovery !== "AVAILABLE"}
        onClick={() => void startRecovery()}
      >
        Iniciar recuperação
      </button>
      <button
        type="button"
        disabled={busy || security?.provider !== "EXTERNAL_IDENTITY_PROVIDER"}
        onClick={() => void startMfa()}
      >
        Configurar MFA
      </button>
    </div>
  );
}

function OperationConfirmation({
  operation,
  code,
  setCode,
  busy,
  inputId,
  label,
  inputMode,
  buttonLabel,
  complete,
}: Readonly<{
  readonly operation: Operation | null;
  readonly code: string;
  readonly setCode: Dispatch<SetStateAction<string>>;
  readonly busy: boolean;
  readonly inputId: string;
  readonly label: string;
  readonly inputMode: "text" | "numeric";
  readonly buttonLabel: string;
  readonly complete: () => Promise<void>;
}>) {
  return operation === null ? null : (
    <fieldset className="review-actions">
      <legend>{buttonLabel}</legend>
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        type="password"
        inputMode={inputMode}
        autoComplete="one-time-code"
        maxLength={256}
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />
      <button
        type="button"
        disabled={busy || code.trim().length === 0}
        onClick={() => void complete()}
      >
        {buttonLabel}
      </button>
    </fieldset>
  );
}

function AccountFeedback({
  error,
  notice,
}: Pick<AccountViewProps, "error" | "notice">) {
  return (
    <>
      {error !== null ? (
        <p className="feedback error" role="alert">
          {error}
        </p>
      ) : null}
      {notice !== null ? (
        <p className="feedback success" role="status">
          {notice}
        </p>
      ) : null}
    </>
  );
}

export function AccountView(props: AccountViewProps) {
  return (
    <main
      className="shell"
      id="main-content"
      tabIndex={-1}
      aria-busy={props.busy}
    >
      <AccountHeader />
      <section className="hero-card" aria-labelledby="account-title">
        <p className="eyebrow">Identidade delegada</p>
        <h1 id="account-title">Recuperação e MFA</h1>
        <p>
          Credenciais, recuperação e fatores de autenticação permanecem no
          provedor de identidade. O CVG guarda apenas o estado necessário para
          operar a jornada.
        </p>
        <SecuritySummary security={props.security} />
        <ProviderActions {...props} />
        <OperationConfirmation
          operation={props.recoveryOperation}
          code={props.recoveryCode}
          setCode={props.setRecoveryCode}
          busy={props.busy}
          inputId="recovery-code"
          label="Código de recuperação"
          inputMode="text"
          buttonLabel="Concluir recuperação"
          complete={props.completeRecovery}
        />
        <OperationConfirmation
          operation={props.mfaOperation}
          code={props.mfaCode}
          setCode={props.setMfaCode}
          busy={props.busy}
          inputId="mfa-code"
          label="Código de confirmação MFA"
          inputMode="numeric"
          buttonLabel="Confirmar MFA"
          complete={props.completeMfa}
        />
      </section>
      <AccountFeedback error={props.error} notice={props.notice} />
    </main>
  );
}
