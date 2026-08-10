"use client";

import { useEffect, useState } from "react";

type Security = Readonly<{
  readonly provider: "EXTERNAL_IDENTITY_PROVIDER" | "NOT_CONFIGURED";
  readonly recovery: "AVAILABLE" | "UNAVAILABLE";
  readonly mfa: "ENABLED" | "NOT_ENABLED" | "UNAVAILABLE";
  readonly session: "ACTIVE" | "NO_SESSION";
}>;

type ApiRecord = Readonly<Record<string, unknown>>;
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

export default function AccountPage() {
  const [security, setSecurity] = useState<Security | null>(null);
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

  async function begin(path: string, message: string): Promise<void> {
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
      if (!isRecord(payload) || payload.success !== true) {
        throw new Error("operation unavailable");
      }
      setNotice(message);
    } catch {
      setError("A operação depende de um provedor de identidade configurado.");
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
              )
            }
          >
            Configurar MFA
          </button>
        </div>
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
