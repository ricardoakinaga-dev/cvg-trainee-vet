# AUDIT — APPEAL-040: recálculo local bounded de contestação

**Data:** 2026-08-24
**Item:** APPEAL-040 / AUD-P1-001
**Resultado:** `PASS_WITH_GAPS` local

## Objetivo e escopo congelado

Fechar somente o caminho seguro de `MANTER_RESULTADO`: preservar a versão
anterior, criar uma nova linha imutável com o mesmo score, outcome e feedback,
e encerrar a contestação somente depois da escrita concluída. A solicitação é
publicada por outbox transacional e processada por worker replay-safe.

Esta fatia não altera `ANULAR_ITEM`, `ALTERAR_RESULTADO`, resposta, tentativa,
nota ou regra clínica; não identifica afetados, envia notificação, publica
conteúdo, decide competência, integra provider/MFA, prova workflow remoto ou
libera piloto/produção.

## Base de produto e engenharia

- PRD: `PRD-RF-064`, `PRD-RF-065` e `PRD-RF-080`;
- caso de uso: `UC-018`;
- SPEC: `0106`, `0107`, `0110` e `0111`;
- dependência: APPEAL-039, que exige rationale interno bounded, data e
  correlação da decisão.

## Implementação auditada

- o domínio só permite solicitar e concluir recálculo para
  `MANTER_RESULTADO`;
- `appeal_review_history` registra cada transição interna com versão única,
  contexto de escopo, trigger append-only e RLS; a aplicação não recebe
  permissão de UPDATE/DELETE;
- `SOLICITAR_RECALCULO` grava atomicamente o evento
  `appeal.recalculation.requested.v1` no outbox;
- o worker valida o payload e delega ao processador de persistência sem
  atravessar a fronteira worker → aplicação;
- o processador executa em uma transação: lê o estado escopado, insere uma
  nova versão `AUTOMATICA`, preserva score/outcome/feedback e somente depois
  persiste `ENCERRADA` e o histórico de conclusão;
- replay de uma mensagem já commitada observa `ENCERRADA` e não cria outra
  versão. Falha intermediária faz rollback da escrita e da transição;
- contratos/projeções públicas não foram ampliados: rationale, correlação,
  histórico, IDs internos e resultado operacional continuam fora da superfície
  do participante.

## TDD e evidência local

- RED observado antes da implementação: falhas explícitas no domínio, no
  módulo de aplicação ausente e no handler de worker não configurado;
- GREEN focado: 5 arquivos / 32 testes passaram, cobrindo domínio, aplicação,
  persistência, transição e worker;
- regressão: `pnpm verify` passou com 115 arquivos / 541 testes / 28 skips;
- cobertura: 84,53% statements, 80,49% branches, 85,83% functions e 85,22%
  lines;
- integração configurada: `pnpm test:integration` passou com 8 arquivos / 20
  testes e 26 arquivos / 28 testes skipped por dependências live ausentes;
- build: `pnpm build` passou nos 12 workspaces;
- E2E: `pnpm test:e2e` passou 22/22, incluindo participant, authoring,
  operations, recovery e axe;
- gates: typecheck, lint, contratos, worker, migrations (26/26), secrets,
  traceability, architecture, documentation, product-definition, exposure e
  `git diff --check` passaram.

## Crítica independente e limites de assurance

Foi solicitada crítica independente read-only durante o loop. O agente crítico
não devolveu relatório antes do timeout controlado; portanto esta auditoria
não atribui PASS independente nem trata ausência de resposta como aprovação.

Não houve prova PostgreSQL/RLS live desta fatia porque
`CVG_TEST_DATABASE_URL`/capacidade administrativa não estão disponíveis no
ambiente atual. A integração real, permissões efetivas da role de aplicação,
concorrência entre workers, observabilidade remota, retenção, restore,
workflow CI remoto e operação produtiva permanecem abertos.

## Resultado e próximo passo

O recorte local está `COMPLETED_WITH_GAPS` e apto para a próxima lacuna de
BUILD. Antes de qualquer promoção, executar a prova live escopada e revisar
com autoridade humana os fluxos `ANULAR_ITEM`/`ALTERAR_RESULTADO`, comunicação
ao participante e impactos operacionais. Nenhum dado real, prontuário, tutor,
foto, PDF, segredo ou decisão clínica foi usado.
