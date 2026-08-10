"use client";

import { useEffect, useState } from "react";

type Operations = Readonly<{
  readonly dependencyStatus: string;
  readonly dependencies: Readonly<Record<string, string>>;
  readonly metrics: Readonly<{
    readonly requestsTotal: number;
    readonly errorsTotal: number;
    readonly p95DurationMs: number | null;
  }>;
  readonly evidence: Readonly<Record<string, string>>;
}>;

type ApiRecord = Readonly<Record<string, unknown>>;
const apiBase = process.env.NEXT_PUBLIC_CVG_API_BASE_URL ?? "";

function isRecord(value: unknown): value is ApiRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isOperations(value: unknown): value is Operations {
  if (
    !isRecord(value) ||
    !isRecord(value.dependencies) ||
    !isRecord(value.metrics)
  ) {
    return false;
  }
  return (
    typeof value.dependencyStatus === "string" &&
    Object.values(value.dependencies).every(
      (item) => typeof item === "string",
    ) &&
    typeof value.metrics.requestsTotal === "number" &&
    typeof value.metrics.errorsTotal === "number" &&
    (value.metrics.p95DurationMs === null ||
      typeof value.metrics.p95DurationMs === "number") &&
    isRecord(value.evidence) &&
    Object.values(value.evidence).every((item) => typeof item === "string")
  );
}

export default function AdminPage() {
  const [operations, setOperations] = useState<Operations | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/v1/internal/dashboard`, {
        credentials: "include",
        cache: "no-store",
      });
      const payload: unknown = await response.json().catch(() => null);
      if (
        !isRecord(payload) ||
        payload.success !== true ||
        !isOperations(payload.data)
      ) {
        throw new Error("invalid operations projection");
      }
      setOperations(payload.data);
    } catch {
      setError("Não foi possível carregar os KPIs operacionais.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="shell" id="main-content" tabIndex={-1}>
      <header className="topbar" aria-label="Administração">
        <div>
          <p className="eyebrow">CVG · administração</p>
          <span className="brand">KPIs e operação</span>
        </div>
        <span className="status-pill">Acesso restrito</span>
      </header>

      {error !== null ? (
        <section className="hero-card error-panel" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => void load()}>
            Tentar novamente
          </button>
        </section>
      ) : operations === null ? (
        <section className="hero-card" role="status">
          Carregando indicadores…
        </section>
      ) : (
        <>
          <section className="hero-card" aria-labelledby="admin-title">
            <p className="eyebrow">Estado agregado</p>
            <h1 id="admin-title">Operação do CVG</h1>
            <p>Dependências: {operations.dependencyStatus}.</p>
            <dl className="dependency-list">
              {Object.entries(operations.dependencies).map(([name, value]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="journey-list" aria-labelledby="kpi-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Métricas redigidas</p>
                <h2 id="kpi-title">KPIs</h2>
              </div>
            </div>
            <div className="dependency-list">
              <div>
                <dt>Requisições</dt>
                <dd>{operations.metrics.requestsTotal}</dd>
              </div>
              <div>
                <dt>Erros de servidor</dt>
                <dd>{operations.metrics.errorsTotal}</dd>
              </div>
              <div>
                <dt>P95</dt>
                <dd>{operations.metrics.p95DurationMs ?? "Sem dados"}</dd>
              </div>
            </div>
            <h2>Evidências de operação</h2>
            {Object.entries(operations.evidence).map(([name, value]) => (
              <p className="journey-item" key={name}>
                <strong>{name}</strong> · {value}
              </p>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
