# 0514 — Auditoria da Fronteira de Contestação do Participante

**Data:** 2026-08-23
**Item:** APPEAL-036 / AUD-P1-001
**Resultado:** `PASS_WITH_GAPS` — protocolo próprio redigido e persistido localmente; revisão humana, recálculo, notificações e prova live pendentes.

## Escopo

Esta rodada materializa somente a primeira fatia verificável do protocolo de
contestação: uma tentativa corrigida pode ser contestada por seu próprio
participante, o item precisa pertencer à atividade daquela tentativa, o protocolo
é lido no contexto de participante/escopo/tentativa e a projeção pública é
allowlisted. Não foram implementados reviewer queue, decisão fundamentada,
recálculo de resultado, notificação de afetados, provedor de entrega, publicação
clínica ou piloto.

## Evidência de implementação

- `packages/application/src/appeal-use-cases.ts` valida o contexto e verifica o
  escopo retornado pelo port antes de congelar a projeção;
- `packages/contracts/src/learning-state.ts` adiciona query strict e envelope
  limitado a 100 protocolos, com datas, estado, versão e decisão opcional;
- `packages/persistence/src/learning-state-repository.ts` consulta somente
  protocolos do próprio participante/escopo/tentativa, com ordenação determinística;
- `packages/persistence/src/activity-repository.ts` resolve o vínculo
  participante/atividade/item em transação e restringe o item a `QUESTAO`/`CASO`,
  sem selecionar resposta, texto ou gabarito; a atribuição pode estar concluída
  porque o protocolo se refere à tentativa já corrigida;
- `apps/api/src/http.ts` aplica autenticação, `VIEW_OWN_APPEALS`, tentativa
  própria, escopo, estado corrigido e validação server-side do item antes do
  `POST`; o `GET` rejeita query extra e devolve envelope redigido;
- `apps/web/app/page.tsx` apresenta loading, vazio, erro/retry, submissão,
  duplicidade e estados terminais sem expor justificativa, revisor, resposta,
  nota, gabarito ou fonte; ao reabrir a jornada, reconstrói a tentativa própria
  corrigida a partir da projeção de jornada e consulta o protocolo persistido.

## Barra de qualidade

| Critério | Resultado | Evidência |
|---|---|---|
| Elegibilidade | PASS local | `POST` aceita somente `CORRIGIDA_AUTOMATICAMENTE`/`CORRIGIDA_HUMANAMENTE`; tentativa não corrigida retorna conflito. |
| Vínculo tentativa/item | PASS local | resolver PostgreSQL e teste HTTP negativo rejeitam item fora da atividade ou não avaliável; somente `QUESTAO`/`CASO` entram no fluxo. |
| Isolamento | PASS local | contexto de participante/escopo/tentativa no caso de uso e repositório; autorização `VIEW_OWN_APPEALS` e tentativa própria. |
| Projeção participante | PASS local | schema strict e allowlist; não há justificativa, `reviewerId`, resposta, score, gabarito, fontes ou claim prático. |
| Integridade/duplicidade | PASS local | domínio e constraint condicional existentes; criação retorna conflito uniforme em duplicidade. |
| Experiência web | PASS local | estados acessíveis e fluxo navegador sintético com `axe` sem violações. |
| PostgreSQL/RLS live | GAP | teste preparado, mas `CVG_TEST_DATABASE_URL` não está disponível nesta execução. |
| Reviewer/recalc/notifications | GAP explícito | dependem de contratos internos, auditoria de decisão, versionamento de resultado e provedor operacional ainda não autorizados. |
| Operação | GAP | collector/OTel, retenção, carga, failover, restore, MFA/provedor e E2E navegador→API real permanecem sem evidência autorizada. |

## TDD e verificações locais

O RED inicial falhou pelos motivos esperados: contrato sem datas/query, módulo de
leitura inexistente, rota sem listagem e criação sem a elegibilidade/vínculo
server-side. Após a implementação, a fatia passou por:

- `pnpm exec vitest run packages/application/src/authorization.test.ts packages/application/src/appeal-use-cases.test.ts packages/contracts/src/learning-state.test.ts packages/persistence/src/learning-state-repository.test.ts apps/api/src/http.test.ts` — PASS, 5 arquivos/79 testes;
- `pnpm verify` — PASS, 103 arquivos/495 testes, 25 skips; 84,33% statements,
  80,14% branches, 85,58% functions e 85,04% lines; contratos 59/59 e worker
  24/24;
- `pnpm build` — PASS, 12 workspaces;
- `pnpm test:e2e` — PASS, 22/22, incluindo criação, restauração do protocolo
  após recarga e axe;
- `pnpm exec vitest run tests/integration/postgres-learning-state.test.ts --project integration` — preparado para o cenário live; sem `CVG_TEST_DATABASE_URL`, o teste é skipped e não constitui evidência de PASS;
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm verify:documentation`,
  `pnpm verify:traceability`, `pnpm verify:exposure` e `git diff --check` — PASS
  no gate completo; o release gate ainda depende de commit e worktree limpo.

Nenhum dado clínico real, prontuário, tutor, foto, PDF, resposta real ou fonte de
terceiro foi usado. A literatura atual consultada orienta interpretar a
contestação como controle de qualidade/feedback de uma evidência de assessment,
não como decisão de competência: o CBVE da AAVMC enfatiza resultados,
aprendizagem centrada no estudante e avaliação longitudinal com múltiplas
ferramentas; o VetGDP do RCVS combina EPAs, reflexão, objetivos e feedback. A
fatia não transforma um protocolo digital em aprovação clínica ou competência
prática.

## Crítica independente

Foram abertas duas tentativas de crítica read-only, uma com contexto completo e
outra com contexto mínimo, ambas com escopo restrito a APPEAL-036. Cada uma
atingiu duas janelas de 30 segundos sem produzir relatório e foi encerrada; isso
não foi contado como PASS. A evidência desta auditoria permanece baseada nos
testes, no diff e na inspeção local, e a crítica independente continua uma
pendência de processo para a próxima rodada.

## Gaps e próxima ação

`APPEAL-036` permanece `COMPLETED_WITH_GAPS` apenas para esta primeira fatia. A
próxima ação local é escolher entre fechar a consulta operacional de protocolos
(fila interna, decisão e recálculo) ou a próxima lacuna de jornada (filtros,
paginação e exportação), preservando a fronteira redigida. Quando um PostgreSQL
com role/RLS autorizados estiver disponível, executar os testes live e registrar
separadamente a evidência; não simular fornecedor, aprovação clínica ou piloto.
