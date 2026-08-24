# AUDIT — APPEAL-042: timeline interna do histórico append-only

**Data:** 2026-08-24
**Item:** APPEAL-042 / AUD-P1-001
**Resultado:** `PASS_WITH_GAPS` local

## Objetivo e escopo congelado

Permitir que um revisor autorizado consulte, na superfície interna de
operações, a linha do tempo bounded de uma contestação já persistida em
`appeal_review_history`. A operação é somente leitura, resolve a apelação
pelos escopos presentes na sessão e não decide, recalcula, anula ou altera
resultado.

Esta fatia não amplia a superfície participante, não cria mutação de
apelação, não notifica, não responde ao participante, não publica conteúdo,
não afirma competência clínica e não prova ambiente live ou workflow remoto.

## Base de produto e engenharia

- PRD: `PRD-RF-060`, `PRD-RF-064`, `PRD-RF-065` e `PRD-RF-102`;
- caso de uso: `UC-018`;
- SPEC: `0106_contratos_de_aplicacao`, `0107_contratos_de_api`,
  `0111_permissoes_governanca_e_auditoria` e
  `0118_estrategia_de_testes_rastreabilidade_e_verificacao`;
- dependência: APPEAL-040 e a migration
  `0025_appeal_recalculation_history`, que já garantem histórico append-only
  e contexto RLS de revisão.

## Implementação auditada

- contrato interno estrito com `appealId`, eventos allowlisted, versão,
  transição, decisão, rationale e datas; limite máximo de 100 eventos;
- caso de uso valida UUIDs, limite, participante interno, papel/escopo e
  capacidade `REVIEW_APPEAL`; rejeita evento de outra apelação, escopo não
  autorizado, versão duplicada ou payload inválido;
- repositório executa em transação, aplica
  `setDatabaseAppealReviewContext` antes de consultar `appeals` e
  `appeal_review_history`, filtra por apelação/escopo e nunca escreve;
- a API expõe somente
  `GET /api/v1/internal/appeals/:appealId/history`, com validação de path e
  query, respostas de não autenticado/proibido/não encontrado/entrada inválida
  e projeção interna distinta da projeção participante;
- a tela de operações oferece botão de consulta, estado loading/erro/retry,
  estado vazio e timeline acessível; nenhuma ação de decisão ou recálculo é
  acoplada ao painel;
- a rota não está disponível em `/api/v1/appeals` nem em qualquer projeção do
  participante.

## TDD e evidência local

- RED observado antes da implementação HTTP: 1 teste falhou com `404` ao
  solicitar a rota ainda inexistente, enquanto 60 testes existentes passaram;
- GREEN focado: 4 arquivos / 68 testes passaram em contrato, aplicação,
  persistência e HTTP;
- a regressão E2E passou 23/23 no HEAD final, incluindo abertura da timeline, rationale
  interno, decisão registrada e estado somente leitura; a suíte de axe da
  superfície de operações também passou;
- `pnpm verify` passou no HEAD final com 120 arquivos / 552 testes / 26 arquivos
  e 28 testes configuracionais ignorados; cobertura de 84,52% statements,
  80,36% branches, 85,96% functions e 85,22% lines;
- build passou nos 12 workspaces; `pnpm test:contract` passou 25 arquivos /
  68 testes; `pnpm test:worker` passou 4 arquivos / 25 testes;
- `pnpm test:integration` passou no HEAD final 8 arquivos / 20 testes e deixou
  26 arquivos / 28 testes skipped por dependências live ausentes; migrations
  passaram 26/26;
- `pnpm audit --audit-level=high` não encontrou vulnerabilidades conhecidas;
- gates de format, CI contract, lint, typecheck, secrets, traceability,
  architecture, documentation, product-definition, exposure e
  `git diff --check` passaram;

## Crítica independente e limites de assurance

A crítica independente que selecionou esta fatia recomendou explicitamente
contrato interno estrito, autorização `REVIEW_APPEAL`, contexto de revisão,
limite, testes negativos e timeline sem mutação. A recomendação foi
incorporada. Duas solicitações de crítica read-only da implementação final
expiraram e foram encerradas sem relatório; isso não é tratado como PASS
independente. A revisão própria encontrou e fechou uma lacuna defensiva na
validação de tipos/status/IDs opcionais do port (`e45b4677d651322e49fa1b2416dc0130c8778ee5`),
mas a assurance independente permanece ausente.

Não houve prova PostgreSQL/RLS live porque
`CVG_TEST_DATABASE_URL`/capacidade administrativa não estão disponíveis no
ambiente atual. Grants efetivos, concorrência, observabilidade remota,
retention/restore, workflow CI remoto, provider/MFA, decisão clínica e
operação produtiva permanecem abertos.

## Resultado e próximo passo

O recorte local está marcado `COMPLETED_WITH_GAPS` após a reexecução dos gates
no HEAD final, com a ausência de crítica independente registrada como gap de
assurance. O próximo passo de BUILD será escolhido em uma fatia separada; não
foi incluído nenhum comando de decisão, recálculo, anulação ou alteração de
nota. Nenhum dado real,
prontuário, tutor, foto, PDF, segredo ou decisão clínica foi usado.
