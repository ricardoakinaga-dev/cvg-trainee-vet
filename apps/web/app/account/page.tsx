"use client";

import { useEffect, useState } from "react";

type Security = Readonly<{
  readonly provider: "EXTERNAL_IDENTITY_PROVIDER" | "NOT_CONFIGURED";
  readonly recovery: "AVAILABLE" | "UNAVAILABLE";
  readonly mfa: "ENABLED" | "NOT_ENABLED" | "UNAVAILABLE";
  readonly session: "ACTIVE" | "NO_SESSION";
}>;

type ApiRecord = Readonly<Record<string, unknown>>;
type Operation = Readonly<{
  readonly operationId: string;
  readonly expiresAt: string;
}>;
type OperationSetter = (operation: Operation | null) => void;
const apiBase = process.env.NEXT_PUBLIC_CVG_API_BASE_URL ?? "";

function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSecurity(value: unknown): value is Security {
  if (!isRecord(value)) return false;
  return (
    (value.provider === "EXTERNAL_IDENTITY_PROVIDER" ||
      value.provider === "NOT_CONFIGURED") &&
    (value.recovery === "AVAILABLE" || value.recovery === "UNAVAILABLE") &&
    (value.mfa === "ENABLED" ||
      value.mfa === "NOT_ENABLED" ||
      value.mfa === "UNAVAILABLE") &&
    (value.session === "ACTIVE" || value.session === "NO_SESSION")
  );
}

function isOperation(value: unknown): value is Operation {
  return (
    isRecord(value) &&
    typeof value.operationId === "string" &&
    value.operationId.trim().length > 0 &&
    typeof value.expiresAt === "string" &&
    value.expiresAt.trim().length > 0
  );
}

export default function AccountPage() {
  const [security, setSecurity] = useState<Security | null>(null);
  const [recoveryOperation, setRecoveryOperation] = useState<Operation | null>(
    null,
  );
  const [mfaOperation, setMfaOperation] = useState<Operation | null>(null);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/v1/account/security`, {
        credentials: "include",
        cache: "no-store",
      });
      const payload: unknown = await response.json().catch(() => null);
      if (
        !isRecord(payload) ||
        payload.success !== true ||
        !isSecurity(payload.data)
      ) {
        throw new Error("invalid security projection");
      }
      setSecurity(payload.data);
    } catch {
      setError("Não foi possível carregar a segurança da conta.");
    }
  }

  async function begin(
    path: string,
    message: string,
    setOperation: OperationSetter,
  ): Promise<void> {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const response = await fetch(`${apiBase}${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const payload: unknown = await response.json().catch(() => null);
      if (
        !isRecord(payload) ||
        payload.success !== true ||
        !isOperation(payload.data)
      ) {
        throw new Error("operation unavailable");
      }
      setOperation(payload.data);
      setNotice(message);
    } catch {
      setError("A operação depende de um provedor de identidade configurado.");
    } finally {
      setBusy(false);
    }
  }

  async function complete(
    path: string,
    operation: Operation | null,
    code: string,
    setOperation: OperationSetter,
    clearCode: () => void,
    message: string,
  ): Promise<void> {
    if (operation === null || code.trim().length === 0) {
      setError("Informe o código recebido do provedor de identidade.");
      return;
    }
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const response = await fetch(`${apiBase}${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operationId: operation.operationId,
          verificationCode: code,
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (
        !isRecord(payload) ||
        payload.success !== true ||
        !isOperation(payload.data)
      ) {
        throw new Error("operation unavailable");
      }
      setOperation(null);
      clearCode();
      setNotice(message);
    } catch {
      setError("O provedor não confirmou o código informado.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="shell" id="main-content" tabIndex={-1} aria-busy={busy}>
      <header className="topbar" aria-label="Segurança da conta">
        <div>
          <p className="eyebrow">CVG · conta</p>
          <span className="brand">Acesso e segurança</span>
        </div>
        <span className="status-pill">Sem segredos locais</span>
      </header>

      <section className="hero-card" aria-labelledby="account-title">
        <p className="eyebrow">Identidade delegada</p>
        <h1 id="account-title">Recuperação e MFA</h1>
        <p>
          Credenciais, recuperação e fatores de autenticação permanecem no
          provedor de identidade. O CVG guarda apenas o estado necessário para
          operar a jornada.
        </p>
        {security === null ? (
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
        )}
        <div className="review-actions">
          <button
            type="button"
            disabled={busy || security?.recovery !== "AVAILABLE"}
            onClick={() =>
              void begin(
                "/api/v1/account/recovery/start",
                "Solicitação de recuperação encaminhada ao provedor.",
                setRecoveryOperation,
              )
            }
          >
            Iniciar recuperação
          </button>
          <button
            type="button"
            disabled={
              busy || security?.provider !== "EXTERNAL_IDENTITY_PROVIDER"
            }
            onClick={() =>
              void begin(
                "/api/v1/account/mfa/enrollment",
                "Inscrição MFA encaminhada ao provedor.",
                setMfaOperation,
              )
            }
          >
            Configurar MFA
          </button>
        </div>

        {recoveryOperation !== null ? (
          <fieldset className="review-actions">
            <legend>Confirmar recuperação</legend>
            <label htmlFor="recovery-code">Código de recuperação</label>
            <input
              id="recovery-code"
              type="password"
              inputMode="text"
              autoComplete="one-time-code"
              maxLength={256}
              value={recoveryCode}
              onChange={(event) => setRecoveryCode(event.target.value)}
            />
            <button
              type="button"
              disabled={busy || recoveryCode.trim().length === 0}
              onClick={() =>
                void complete(
                  "/api/v1/account/recovery/complete",
                  recoveryOperation,
                  recoveryCode,
                  setRecoveryOperation,
                  () => setRecoveryCode(""),
                  "Recuperação concluída pelo provedor.",
                )
              }
            >
              Concluir recuperação
            </button>
          </fieldset>
        ) : null}

        {mfaOperation !== null ? (
          <fieldset className="review-actions">
            <legend>Confirmar MFA</legend>
            <label htmlFor="mfa-code">Código de confirmação MFA</label>
            <input
              id="mfa-code"
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={256}
              value={mfaCode}
              onChange={(event) => setMfaCode(event.target.value)}
            />
            <button
              type="button"
              disabled={busy || mfaCode.trim().length === 0}
              onClick={() =>
                void complete(
                  "/api/v1/account/mfa/enrollment/verify",
                  mfaOperation,
                  mfaCode,
                  setMfaOperation,
                  () => setMfaCode(""),
                  "MFA confirmado pelo provedor.",
                )
              }
            >
              Confirmar MFA
            </button>
          </fieldset>
        ) : null}
      </section>
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
    </main>
  );
}
