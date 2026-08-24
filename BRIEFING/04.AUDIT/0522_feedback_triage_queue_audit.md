# AUDIT — FEEDBACK-043: fila interna bounded de triagem de relatos

**Data:** 2026-08-24
**Item:** FEEDBACK-043 / AUD-P1-001
**Resultado:** `PASS_WITH_GAPS` local

## Objetivo e escopo congelado

Disponibilizar, para moderador, administrador ou aprovador clínico autorizado,
uma consulta interna bounded dos relatos de feedback já persistidos e as
transições de estado que a máquina existente permite. A consulta é filtrada
por escopo no servidor, usa projeção allowlisted e limita a resposta a 100
itens.

Esta fatia não cria prioridade, atribuição, resposta ao participante, histórico
dedicado, notificação, alerta/retirada clínica, SLA, anexo, novo estado ou
decisão automática. Também não afirma prova PostgreSQL/RLS live, workflow
remoto, provider/MFA, piloto ou produção.

## Base de produto e engenharia

- PRD: `PRD-RF-072`, `PRD-RF-073`, `PRD-RF-103` e `PRD-RF-104`;
- caso de uso: `UC-023`;
- SPEC: `0105_maquina_de_estados_e_fluxos`, `0106_contratos_de_aplicacao`,
  `0107_contratos_de_api`, `0111_permissoes_governanca_e_auditoria`,
  `0114_superficie_web_spa_e_acessibilidade` e
  `0118_estrategia_de_testes_rastreabilidade_e_verificacao`;
- dependência: `FEEDBACK-041`, que já persiste o ticket e expõe a projeção
  participante sem ampliar campos internos.

## Implementação auditada

- contrato Zod strict para `scopeId`, status allowlisted e limite de 1 a 100;
  projeção interna strict com `ticketId`, tipo, descrição plain-text, criação,
  status e versão; `participantId` não atravessa a fila nem o navegador;
- caso de uso valida identidade ativa, capability
  `VIEW_FEEDBACK_QUEUE`, escopo autorizado, query bounded, estado devolvido,
  UUIDs, status, texto sem HTML, datas, versões e unicidade dos tickets;
- repositório executa a leitura em transação, chama
  `setDatabaseSecurityContext({ scopeId })` antes do `SELECT`, filtra por
  escopo/status, ordena de forma determinística e não escreve nem aceita
  escopo derivado do participante;
- API expõe `GET /api/v1/internal/feedback`, valida chaves desconhecidas,
  autenticação, query e capability, e mantém a projeção fora da rota pública
  `/api/v1/feedback`;
- a transição UI reutiliza `PATCH /api/v1/internal/feedback/:ticketId` e o
  comando versionado existente, enviando somente `ticketId`, `scopeId`,
  `version` e eventos permitidos pelo estado atual; o servidor resolve o
  `participantId` por ticket+escopo sob contexto transacional antes de chamar o
  comando; concorrência perdida retorna erro bounded e pede nova leitura;
- a superfície de operações apresenta loading, proibido, erro/retry, vazio,
  filtro, tabela acessível e ações de triagem; não exibe `participantId` como
  coluna ou texto de interface;
- E2E sintético verifica consulta da fila, ação `TRIAR`, incremento de versão
  e atualização para `TRIADO`.

## TDD e evidência local

- RED observado antes da implementação: os módulos novos ainda não existiam,
  a capability negava o cenário novo e a rota HTTP retornava `404`;
- GREEN inicial: 5 arquivos / 80 testes passaram em contrato, aplicação,
  persistência, autorização e HTTP;
- crítica independente inicial encontrou `FAIL` por identidade do participante
  controlável no PATCH, encaminhamento clínico incompleto na borda HTTP e
  ausência de testes HTTP específicos; o hardening removeu o identificador do
  contrato/projeção, criou resolver server-side por ticket+escopo, propagou a
  identidade clínica para as duas capabilities e adicionou os testes negativos;
- GREEN final focado: 6 arquivos / 87 testes passaram, incluindo identidade
  forjada, aprovador clínico no GET/PATCH, contrato interno strict e resolver
  persistente;
- `pnpm typecheck` passou; os builds de `@cvg/contracts` e
  `@cvg/application` foram reexecutados para garantir que a API consumisse as
  superfícies compiladas atuais;
- `pnpm verify` passou no HEAD final com cobertura de 84,50% statements,
  80,34% branches, 85,91% functions e 85,24% lines;
- `pnpm test:contract` passou 26 arquivos / 70 testes; `pnpm test:worker`
  passou 4 arquivos / 25 testes;
- `pnpm test:integration` passou 8 arquivos / 20 testes e deixou 26 arquivos /
  28 testes skipped por dependências live ausentes;
- `pnpm test:e2e` passou 23/23, incluindo a superfície de operações e os
  cenários de acessibilidade;
- `pnpm verify:migrations` passou 26/26, com a migration mais recente
  `0025_appeal_recalculation_history`; nenhuma migration foi necessária para
  esta consulta;
- `pnpm audit --audit-level=high` não encontrou vulnerabilidades conhecidas;
- gates de format, CI contract, lint, typecheck, secrets, traceability,
  architecture, documentation, product-definition, exposure e
  `git diff --check` passaram.

## Crítica independente e limites de assurance

A primeira crítica read-only do agente Hilbert recomendou `FAIL` pelos três
gaps descritos acima. Após o hardening no commit
`2f0d5d31f7d2afd78db0e3bda5fc99b7123f4a9b` e o teste de leitura clínica no
commit `708082a9b62a18350c982d535fb1b4a9b47b7046`, uma segunda crítica do
mesmo agente retornou `CONDITIONAL PASS`: confirmou a projeção sem
`participantId`, o request interno strict, a resolução server-side e o
encaminhamento de `approvedClinicalApproverId`; não encontrou novo defeito de
código, mantendo RLS live como inconclusivo por ausência de infraestrutura.

Não houve prova PostgreSQL/RLS live porque `CVG_TEST_DATABASE_URL` e a
capacidade administrativa necessária não estão disponíveis no ambiente atual.
Grants efetivos, concorrência real, observabilidade remota,
retention/restore, workflow CI remoto, provider/MFA, suporte externo,
aprovação clínica e operação produtiva permanecem abertos.

## Resultado e próximo passo

O recorte local fica `COMPLETED_WITH_GAPS` após a reexecução dos gates, sem
declarar o produto 100% concluído. O próximo passo de BUILD será escolhido em
uma fatia separada. Nenhum dado real, prontuário, tutor, foto, PDF, segredo ou
decisão clínica foi usado.
