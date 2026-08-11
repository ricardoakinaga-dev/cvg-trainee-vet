# Evidência da fila de revisão clínica — 2026-08-11

## Objetivo

Eliminar a operação manual por `contentId` e tornar rastreável a revisão item a item sem permitir que conteúdo projetado seja publicado sem decisão clínica independente.

## Construção entregue

- `GET /api/v1/internal/authoring/review-queue` exige escopo, paginação (`page`/`per_page`) e sessão com `CLINICAL_APPROVER` aprovado para o escopo;
- a persistência calcula a decisão mais recente por conteúdo/versão e filtra a fila pendente sem alterar dados;
- a projeção da fila contém somente identificadores editoriais, módulo, sessão, objetivo, autor, status e pré-voo técnico; não contém título, prompt, gabarito, rubrica, feedback ou referências;
- `apps/web/app/authoring` carrega a fila, pagina, abre um item para revisão e mantém a ordem revisão → publicação;
- cada decisão continua exigindo justificativa e é gravada pelo fluxo editorial existente em `content_review_decisions`;
- `scripts/verify-clinical-review-queue.mjs` mede a fila no PostgreSQL e possui modo estrito fail-closed.

## Testes

```text
RED: contratos, autorização e endpoint falharam antes da implementação;
GREEN: API HTTP 34/34, servidor 9/9, contratos 3/3, autorização 7/7;
integração do verificador 3/3;
E2E de autoria 2/2 Chromium, incluindo fila paginada e ausência de internals;
pnpm lint PASS;
pnpm typecheck PASS;
pnpm build PASS;
```

## Evidência live no PostgreSQL HA

Com escopo sintético `11111111-1111-4111-8111-111111111111`:

```text
total editorial: 796
pendentes: 763
sem revisão: 763
aprovações clínicas persistidas: 0
solicitações de ajuste: 0
falhas de pré-voo técnico entre pendentes: 0
consulta da fila: total 763, página 1 retornou 2/2 itens solicitados
```

`pnpm ops:verify-clinical-review-queue` retornou `PASS_WITH_GAPS`. Com `CVG_CLINICAL_REVIEW_REQUIRE_COMPLETE=true`, retornou `FAIL` com `clinical review queue is incomplete: 763 pending items` e exit code 1. O comportamento é intencional: nenhum item foi aprovado ou publicado automaticamente.

## Limites restantes

A fila resolve a descoberta e a rastreabilidade operacional, mas não substitui a revisão semântica humana. Os 763 conteúdos continuam aguardando decisão independente; o gate clínico estrito permanece fechado. IdP/MFA/recovery externo, domínio/certificado gerenciado, traces externos, backup/RPO/RTO e deploy/rollback produtivos continuam dependentes de decisões e ambiente autorizados.

## Rastreabilidade

- código: `packages/application/src/authoring-review-queue.ts`, `packages/persistence/src/clinical-review-queue-repository.ts`, `apps/api/src/http.ts`, `apps/api/src/main.ts`, `apps/api/src/server.ts`, `apps/web/app/authoring/page.tsx`, `scripts/verify-clinical-review-queue.mjs`;
- testes: contratos, autorização, API/servidor, `tests/integration/clinical-review-queue-verifier.test.ts` e `tests/e2e/authoring-review.spec.ts`;
- commit técnico: `8670defb3a1c098c556afdf9cddbd427a64d693a` (`feat: add clinical review queue`).
