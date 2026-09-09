# AAA round 6 — revalidação local após AAA-106

Data: 2026-09-06
Escopo: AAA-106, UI-VIS-001 e regressão local do programa Premium State of the Art Triplo AAA.

## Resultado

- `corepack pnpm verify`: PASS.
- `corepack pnpm exec playwright test --config /tmp/cvg-e2e.config.ts`: 39/39 E2E PASS contra `next start` em `127.0.0.1:3110`, com fixtures sintéticos e sem dados reais.
- `tests/e2e/visual-gauntlet.spec.ts`: 6/6 PASS, incluindo axe sem violações, matriz de rotas, estados preenchidos de diagnóstico/autoria/operations, reduced-motion, foco, 200% de zoom equivalente, cópia longa e CLS.
- Cobertura global: 84,44% statements, 80,16% branches, 87,29% functions e 85,18% lines.
- `corepack pnpm test:integration:live`: BLOCKED no preflight porque `CVG_TEST_DATABASE_URL` não foi fornecida; não é evidência de PostgreSQL/RLS, concorrência, restauração ou observabilidade live.

## Mudanças verificadas

- Operations e authoring agora mantêm o shell interno fechado até a projeção autorizada server-side chegar.
- Fixtures visuais autorizadas são sintéticas e explícitas.
- A superfície de operations não exibe elementos parcialmente fora da viewport em 195px, incluindo estados de dependência e painéis internos.
- A API continua como autoridade de autenticação, capability e escopo.

## Crítica independente

Carver inspecionou o working tree sem editar. Decisão: `REVISE` / independência `I0`.

Gaps confirmados: falta guard server-side de rota/proxy em `/operations` e `/authoring`; authoring ainda pode usar `NEXT_PUBLIC_CVG_API_BASE_URL`; faltam prova sem mocks com cookie/expiração/revogação/cross-scope, browser→API→PostgreSQL e gates live/produção/clínicos.

## Decisão

Este round comprova a fatia local executável e melhora a rastreabilidade, mas não autoriza declarar prontidão Triplo AAA final. O próximo passo técnico local é proteger a cadeia Next/proxy sem duplicar a autoridade da API; os gates live, humanos e produção permanecem dependências explícitas.
