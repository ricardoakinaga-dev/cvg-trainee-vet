export default function DiagnosticLoading() {
  return (
    <main className="shell diagnostic-shell" id="main-content" tabIndex={-1}>
      <header className="topbar" aria-label="Diagnóstico formativo">
        <div>
          <p className="eyebrow">CVG · superfície do participante</p>
          <span className="brand">Diagnóstico formativo B-07</span>
        </div>
      </header>
      <section
        className="diagnostic-card"
        aria-busy="true"
        aria-labelledby="diagnostic-loading-title"
      >
        <p className="eyebrow">Sessão própria</p>
        <h1 id="diagnostic-loading-title">Carregando diagnóstico</h1>
        <p className="feedback pending" role="status">
          Consultando sua sessão…
        </p>
      </section>
    </main>
  );
}
