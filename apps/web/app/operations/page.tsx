"use client";

import { useCallback, useEffect, useState } from "react";

type DependencyState = Readonly<{
  readonly status: "READY" | "DEGRADED" | "NOT_READY";
  readonly dependencies: Readonly<{
    readonly postgres: "UP" | "DOWN";
    readonly qdrant: "UP" | "DOWN" | "DISABLED";
    readonly ai: "ENABLED" | "DISABLED";
  }>;
}>;

type ApiRecord = Readonly<Record<string, unknown>>;
type LoadState = "loading" | "ready" | "error";

function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isDependencyState(value: unknown): value is DependencyState {
  if (!isRecord(value) || !isRecord(value.dependencies)) return false;
  return (
    (value.status === "READY" ||
      value.status === "DEGRADED" ||
      value.status === "NOT_READY") &&
    (value.dependencies.postgres === "UP" ||
      value.dependencies.postgres === "DOWN") &&
    (value.dependencies.qdrant === "UP" ||
      value.dependencies.qdrant === "DOWN" ||
      value.dependencies.qdrant === "DISABLED") &&
    (value.dependencies.ai === "ENABLED" ||
      value.dependencies.ai === "DISABLED")
  );
}

async function requestDependencyState(): Promise<DependencyState> {
  const response = await fetch("/health/dependencies", {
    cache: "no-store",
    credentials: "include",
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!isRecord(payload) || payload.success !== true) throw new Error();
  if (!isDependencyState(payload.data)) throw new Error();
  return payload.data;
}

type DependencyExperienceProps = Readonly<{
  readonly state: LoadState;
  readonly dependencies: DependencyState | null;
  readonly onRetry: () => void;
}>;

function DependencyExperience({
  state,
  dependencies,
  onRetry,
}: DependencyExperienceProps) {
  if (state === "loading") {
    return (
      <div
        className="experience-panel"
        data-testid="operations-loading"
        role="status"
      >
        Consultando dependências…
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="experience-panel error-panel" role="alert">
        <p>Não foi possível consultar o estado operacional.</p>
        <button type="button" onClick={onRetry}>
          Tentar novamente
        </button>
      </div>
    );
  }
  if (dependencies === null) return null;
  return (
    <div className="experience-panel" data-testid="operations-ready">
      <p className="operations-status">
        Estado geral: <strong>{dependencies.status}</strong>
      </p>
      <dl className="dependency-list">
        <div>
          <dt>PostgreSQL</dt>
          <dd>{dependencies.dependencies.postgres}</dd>
        </div>
        <div>
          <dt>Qdrant</dt>
          <dd>{dependencies.dependencies.qdrant}</dd>
        </div>
        <div>
          <dt>IA assistiva</dt>
          <dd>{dependencies.dependencies.ai}</dd>
        </div>
      </dl>
    </div>
  );
}

export default function OperationsPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [dependencies, setDependencies] = useState<DependencyState | null>(
    null,
  );

  const loadDependencies = useCallback(async () => {
    setState("loading");
    try {
      setDependencies(await requestDependencyState());
      setState("ready");
    } catch {
      setDependencies(null);
      setState("error");
    }
  }, []);

  useEffect(() => {
    void loadDependencies();
  }, [loadDependencies]);

  return (
    <main
      className="shell"
      id="main-content"
      tabIndex={-1}
      aria-busy={state === "loading"}
    >
      <header className="topbar" aria-label="Identificação da operação">
        <div>
          <p className="eyebrow">CVG · superfície interna</p>
          <span className="brand">Estado operacional</span>
        </div>
        <span className="status-pill" role="status" aria-live="polite">
          Operação
        </span>
      </header>

      <section
        className="hero-card operations-card"
        aria-labelledby="operations-title"
      >
        <div className="hero-copy">
          <p className="eyebrow">Dependências redigidas</p>
          <h1 id="operations-title">Saúde do ambiente</h1>
          <p>
            Esta tela mostra apenas o estado agregado permitido para operação.
            URLs, segredos, payloads e dados de participantes não são exibidos.
          </p>
        </div>

        <DependencyExperience
          state={state}
          dependencies={dependencies}
          onRetry={() => void loadDependencies()}
        />
      </section>
    </main>
  );
}
