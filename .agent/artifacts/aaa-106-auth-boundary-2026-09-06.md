# AAA-106 — Boundary de autorização interna

## Escopo

Fatia local bounded para impedir que `/operations` e `/authoring` renderizem a
superfície interna antes de a API confirmar sessão ativa, papel e escopo. A API
continua sendo a autoridade server-side; o cliente não recebe capability nem
escolhe identidade.

## Implementação

- `apps/web/app/operations/page.tsx`
  - consulta o dashboard autorizado antes de carregar saúde operacional;
  - trata uma projeção de participante como acesso proibido;
  - mantém somente uma mensagem mínima de acesso enquanto a autorização não
    foi confirmada;
  - não renderiza o título, métricas ou ações internas em 401/403/erro.
- `apps/web/app/authoring/page.tsx`
  - mantém a fila, formulário, gabarito e fontes fora da árvore renderizada até
    `GET /api/v1/internal/session/scopes` retornar escopos autorizados;
  - conserva retry sem exibir a superfície interna durante falha.

## Evidência

- RED: os testes de boundary exigindo ausência do shell interno falharam antes
  do gate existir.
- GREEN: `corepack pnpm --filter @cvg/web typecheck` passou.
- GREEN: `corepack pnpm --filter @cvg/web build` passou.
- GREEN produção: `corepack pnpm exec playwright test --config /tmp/cvg-e2e.config.ts tests/e2e/operations-dashboard.spec.ts tests/e2e/authoring-review.spec.ts` — **11/11 PASS** em `next start`.
- A execução em `next dev` produziu 10/11 por Strict Mode repetir o efeito de
  carregamento de escopos; não foi usada como evidência final.

## Limites e próximo gate

Esta é evidência sintética de web/API mockada. Ainda faltam cookie real,
expiração/revogação, cross-scope, PostgreSQL/RLS live, browser→API→PostgreSQL,
proxy remoto e revisão independente same-SHA. Nenhuma autorização de produção,
publicação clínica, piloto ou claim de competência foi inferida.
