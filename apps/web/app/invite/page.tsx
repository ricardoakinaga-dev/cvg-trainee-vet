"use client";

import { useEffect, useState, type FormEvent } from "react";

type ApiRecord = Readonly<Record<string, unknown>>;
const apiBase = process.env.NEXT_PUBLIC_CVG_API_BASE_URL ?? "";
const minimumPasswordLength = 12;

function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSuccess(value: unknown): boolean {
  return isRecord(value) && value.success === true;
}

export default function InvitePage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (token === null || token.trim().length === 0) {
      setError("Este link de primeiro acesso não é válido.");
      return;
    }
    if (password.length < minimumPasswordLength) {
      setError("A senha deve ter pelo menos 12 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const acceptResponse = await fetch(
        apiBase + "/api/v1/invitations/accept",
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            token,
            sessionExpiresInSeconds: 3600,
          }),
        },
      );
      const acceptPayload: unknown = await acceptResponse
        .json()
        .catch(() => null);
      if (!acceptResponse.ok || !isSuccess(acceptPayload)) {
        throw new Error("invitation unavailable");
      }

      const passwordResponse = await fetch(
        apiBase + "/api/v1/account/password",
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ password }),
        },
      );
      const passwordPayload: unknown = await passwordResponse
        .json()
        .catch(() => null);
      if (!passwordResponse.ok || !isSuccess(passwordPayload)) {
        throw new Error("password unavailable");
      }

      setPassword("");
      setConfirmation("");
      setToken(null);
      setComplete(true);
    } catch {
      setError(
        "Não foi possível ativar este acesso. Solicite um novo link ao superadmin.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell first-access-shell" id="main-content" tabIndex={-1}>
      <header className="topbar" aria-label="Primeiro acesso">
        <div>
          <p className="eyebrow">CVG · primeiro acesso</p>
          <span className="brand">Ative sua jornada</span>
        </div>
        <span className="status-pill">Convite individual</span>
      </header>

      <section className="first-access-card" aria-labelledby="invite-title">
        <div>
          <p className="eyebrow">Acesso criado pelo superadmin</p>
          <h1 id="invite-title">Criar senha de primeiro acesso</h1>
          <p>
            Defina sua senha pessoal para entrar no treinamento. O link é de uso
            único e não pode ser reutilizado.
          </p>
        </div>

        {complete ? (
          <div className="first-access-complete">
            <p role="status">
              Acesso ativado. Você já pode entrar no treinamento.
            </p>
            <a href="/">Entrar no treinamento</a>
          </div>
        ) : token === null ? (
          <p className="first-access-invalid" role="alert">
            Consultando o link de primeiro acesso…
          </p>
        ) : (
          <form className="first-access-form" onSubmit={handleSubmit}>
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
              onChange={(event) => setPassword(event.target.value)}
            />
            <label htmlFor="invite-password-confirm">
              Confirmar nova senha
            </label>
            <input
              id="invite-password-confirm"
              type="password"
              autoComplete="new-password"
              minLength={minimumPasswordLength}
              maxLength={128}
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
            <button type="submit" disabled={busy}>
              {busy ? "Ativando acesso…" : "Ativar meu acesso"}
            </button>
          </form>
        )}
      </section>

      {error !== null ? (
        <p className="feedback error" role="alert">
          {error}
        </p>
      ) : null}
    </main>
  );
}
