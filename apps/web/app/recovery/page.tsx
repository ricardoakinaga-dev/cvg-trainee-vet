"use client";

import { useEffect, useState } from "react";

type RecoveryState = "loading" | "ready" | "error";

function isSuccess(value: unknown): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const data = record.data;
  return (
    record.success === true &&
    data !== null &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    (data as Record<string, unknown>).status === "active"
  );
}

export default function RecoveryPage() {
  const [state, setState] = useState<RecoveryState>("loading");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const token = query.get("token");
    window.history.replaceState({}, document.title, "/recovery");
    if (token === null || !/^[A-Za-z0-9_-]{32,256}$/u.test(token)) {
      setState("error");
      return;
    }

    void fetch("/api/v1/recovery/accept", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, sessionExpiresInSeconds: 3600 }),
    })
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok || !isSuccess(payload)) throw new Error();
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  return (
    <main className="shell recovery-shell" id="main-content" tabIndex={-1}>
      <header className="topbar" aria-label="Recuperação de acesso">
        <div>
          <p className="eyebrow">CVG · acesso controlado</p>
          <span className="brand">Recuperar acesso</span>
        </div>
        <span
          className="status-pill status-pill--info"
          role="status"
          aria-live="polite"
        >
          Segurança
        </span>
      </header>
      <section
        className="hero-card recovery-card"
        aria-labelledby="recovery-title"
      >
        <div className="hero-copy">
          <p className="eyebrow">Link de uso único</p>
          <h1 id="recovery-title">
            {state === "loading"
              ? "Validando o link…"
              : state === "ready"
                ? "Acesso recuperado"
                : "Não foi possível recuperar o acesso"}
          </h1>
          {state === "loading" ? (
            <p role="status">Aguarde enquanto validamos o link seguro.</p>
          ) : state === "ready" ? (
            <p role="status" aria-live="polite">
              Uma nova sessão foi criada. O link foi consumido e não pode ser
              reutilizado. Você já pode voltar à plataforma.
            </p>
          ) : (
            <p role="alert">
              O link é inválido, expirou, foi revogado ou já foi utilizado.
              Solicite uma nova recuperação pelo canal interno aprovado.
            </p>
          )}
          {state === "ready" ? (
            <a className="button-link" href="/">
              Ir para a trilha
            </a>
          ) : state === "error" ? (
            <a className="button-link" href="/">
              Voltar ao acesso
            </a>
          ) : null}
        </div>
      </section>
    </main>
  );
}
