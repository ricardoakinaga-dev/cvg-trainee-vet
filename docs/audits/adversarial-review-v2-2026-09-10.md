# Adversarial Review v2 (AAA-FINAL-007) — 2026-09-10

Papel: revisor adversarial com contexto fresco, tentando reprovar o sistema.
Escopo: todo o trabalho R2 (docs/48 §§3–100). Evidência primária: execução dos
gates, diff e artefatos citados no audit v3.

## Tentativas de reprovação e resultado

| # | Ataque | Resultado |
|---|---|---|
| 1 | rota sem registry / registry órfão | `verify:routes` bidirecional 57↔57; mutação de dispatch detectada em teste do script |
| 2 | auth apenas frontend | proxy server-side exige sessão + API revalida (`/operations` sem cookie → 307; API sem sessão → 401) |
| 3 | rate limit local-only | provado Redis real: 5+5/11º negado, 50 incrementos paralelos exatos, fail-closed/aberto por classe, timeout de backend, trusted vs spoofed XFF |
| 4 | query sem timeout | `docs/operations/timeout-policy.md` + `statement_timeout/idle_in_txn/lock_timeout` por role no provisionamento; teste de governança |
| 5 | retry infinito | `RetryPolicy` bounded com jitter; worker retry limitado; bootstrap Qdrant bounded (OPS-061) |
| 6 | cross-scope leak | matriz RLS live 7/7: A↛B, escrita negada (INSERT/UPDATE/DELETE), staff por escopo, service identity contida, anônimo negado |
| 7 | pool leak | 10 alternâncias A/B em pool de 1 conexão; sem herança de contexto |
| 8 | span com PII | redaction por atributo; testes de tracing; `toLogContext` sem principal/IP |
| 9 | workflow mutável | contrato CI falha tag mutável; todos os usos pinados por SHA (incl. OSV reusable workflow) |
| 10 | artefato sem SHA | evidence bundle valida digests de todos os artefatos; SBOM validado |
| 11 | teste skip crítico | inventário `docs/quality/skip-inventory.md`; skips ambientais classificados; sem `.only` |
| 12 | ameaça real nova: recovery 500 vs 404 (ADV-2026-09-01) | corrigido em R2 (validação antes do wiring do port); coberto por 51 negativos |
| 13 | confiar em README/claim sem prova | cada score referencia evidência executável; residuais declarados |
| 14 | God Module disfarçado | http.ts 1166 linhas só como composition root; budget de função e arquivo ativos com ratchets explícitos |
| 15 | telemetria mentirosa na CI | `verify:aaa-candidate` exige coverage ≥ meta, RLS live PASS, same-SHA, bundle válido, audit limpo, P0/P1 zero |

## Achados desta rodada

- **ADV-2026-09-02 (P2, remoto):** a prova same-SHA remota deste HEAD não foi
  concluída: a API pública do GitHub atingiu rate limit sem autenticação e não
  há `gh`/token no ambiente. Evidência parcial coletada: `quality` em `fa36938`
  falhou no passo 11 (release traceability por `http.test.ts` removido) e foi
  corrigido em `963bfce`; `security` teve CodeQL verde e OSV quebrado por
  formato de action v2, corrigido em `19d5ca8`. Runs deste HEAD ficaram
  pendentes de verificação por rate limit — declarado, não inferido.
- **ADV-2026-09-03 (P2, cobertura):** cobertura global (85,48/81,39/86,61/
  86,14) abaixo da meta §12 (90/85/90/90). Nenhum teste artificial foi criado
  para maquiar; permanece como gap de engenharia declarado.

## Veredito adversarial

Nenhum bypass explorável nos caminhos locais/live executados; nenhum P0/P1 de
código. Reprovações residuais são de evidência externa (remote same-SHA) e meta
de cobertura — portanto **TRIPLE AAA — REVISE**, nunca PASS.
