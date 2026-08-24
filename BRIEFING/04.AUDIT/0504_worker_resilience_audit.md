# 0504 — Auditoria do worker, Qdrant, IA e resiliência

**Data:** 2026-08-24
**Escopo:** item 11 da matriz 0491_full_construction_audit.md  
**Task:** RESILIENCE-11-01  
**Resultado:** **95/100 — concluído com gaps operacionais**

## 1. Veredito

O item 11 foi reavaliado em **95/100**. O worker agora reconhece todos os eventos emitidos pelos casos de uso atuais (content.*, attempt.submitted.v1, answer.saved.v1 e assessment.corrected.v1) e o evento interno de solicitação de IA. Eventos educacionais cuja fonte de verdade é o PostgreSQL são reconhecidos por handlers no-op; eventos de publicação/retirada continuam com efeitos explícitos no índice derivado.

O cenário live conjunto PostgreSQL + Qdrant provou um conjunto não vazio, divergência de hash, ponto órfão, upsert, remoção, reconciliação repetida sem novo upsert, alteração de conteúdo, replay de publicação com ID determinístico e retirada. Outro cenário live provou lease expirado, reclaim, fencing de finalização e falha stale, retry com backoff zero para teste e dead-letter após o limite de tentativas.

A nota é técnica e de construção. Não autoriza publicação clínica, piloto, uso de IA externa ou release: provider produtivo, collector externo, reinício de processo observável, E2E navegador→API real, restore e operação de produção continuam nos itens próprios.

## 2. Matriz de avaliação

| Dimensão | Pontos | Evidência | Limite mantido |
|---|---:|---|---|
| Outbox, lease, retry e dead-letter | 20/20 | processOutboxOnce, repository SQL, testes unitários e integração live com reclaim de lease expirado e status FAILED | Não é teste de carga nem de múltiplas réplicas. |
| Cobertura dos eventos emitidos | 15/15 | WORKER_RECOGNIZED_EVENT_TYPES, handlers para os 7 tipos e teste que percorre eventos educacionais sem duplicar estado | A matriz é mantida manualmente no worker e deve acompanhar novos publishers. |
| Qdrant como índice derivado | 25/25 | Reconciliação live não vazia: expected:2, upserted:2, removed:1; repetição upserted:0, removed:0; atualização divergente upserted:1; retirada remove o ponto | Coleção local sintética; não é evidência de disponibilidade de produção. |
| Replay e determinismo | 15/15 | Dois publishes do mesmo evento mantêm dois pontos, com o mesmo vectorPointId; retirada e reconciliação posterior preservam uma única fonte PostgreSQL | Não há garantia de exactly-once; o contrato é at-least-once + upsert/delete idempotentes. |
| IA assistiva e fallback seguro | 13/15 | IA server-side, saída estruturada, sink interno, store:false, validação, no-op quando desabilitada e nenhum poder sobre nota/publicação/estado | IA externa real e embedding produtivo ainda não foram exercitados. |
| Redaction, observabilidade e evidência | 7/10 | Logs do worker não contêm payload/erro clínico; Qdrant guarda somente metadados internos; testes unitários, live e cobertura registrados | Collector/exporter externo, traces, alertas e dashboards pertencem ao item 12. |
| **Total** | **95/100** |  |  |

## 3. Evidência executada

### 3.1 RED → GREEN

- RED do catálogo de eventos: apps/worker/src/handlers.test.ts falhou antes da implementação porque WORKER_RECOGNIZED_EVENT_TYPES não existia.
- GREEN: a matriz foi materializada em apps/worker/src/handlers.ts; handlers no-op educacionais não indexam, não alteram estado e não chamam dependências de conteúdo.
- RED/GREEN de resiliência: os cenários foram adicionados antes da execução live; a implementação existente de claim/retry/dead-letter e a reconciliação determinística passaram sem relaxar o contrato.

### 3.2 Cenário PostgreSQL + Qdrant

Arquivo: tests/integration/worker-qdrant-live.test.ts.

O teste cria conteúdo sintético publicado e uma coleção Qdrant descartável. Semeia um ponto divergente e um órfão, executa a reconciliação, altera o texto de uma versão, repete o publish duas vezes, retira a versão e reconcilia novamente. A lista do Qdrant é comparada apenas por metadados técnicos; texto do participante não é colocado no payload.

### 3.3 Lease, retry e recuperação

Arquivo: tests/integration/postgres-worker.test.ts.

O teste abandona um evento em PROCESSING, expira o lease no banco, confirma novo
claim com attempts:2 e executa a finalização concorrente através de duas
conexões PostgreSQL: somente o token atual vence. Também marca dead-letter e
executa outro evento com falha transitória até a segunda tentativa terminal. O
resultado persistido confirma locked_until:null, status:FAILED e códigos
técnicos de erro.

### 3.4 Testes direcionados

- apps/worker/src/handlers.test.ts: 16 testes passaram.
- apps/worker/src/loop.test.ts: 5 testes passaram.
- apps/worker/src/reconcile.test.ts: 2 testes passaram.
- live worker/Qdrant: 1 teste passou.
- live PostgreSQL worker: 4 testes passaram no recorte de outbox/lease.

Os testes usam apenas UUIDs, textos sintéticos e coleção descartável. Não foram usados PDFs, fotos, fontes, prontuários, tutores, pacientes ou casos identificáveis.

### 3.5 OUTBOX-FENCE-001 — fencing contra worker stale

O slice bounded adicionou `lease_token` por claim, atualização condicional de
`markProcessed`/`markFailed`, relógio `statement_timestamp()` do PostgreSQL
e trigger de rollout que rejeita a transição terminal de uma versão antiga sem
token. O worker trata `0 rows` como `lease_lost`, sem contar processamento
sucesso e sem executar `markFailed` com a posse perdida; a telemetria registra
somente código técnico redigido.

Evidência fresca em 2026-08-24:

- RED: a suíte focal falhou antes do token/retorno booleano, com 9 testes
  vermelhos; o scanner de segredos também detectou fixtures que pareciam
  credenciais e foi corrigido com marcadores sintéticos não ambíguos;
- GREEN: `apps/worker/src/loop.test.ts`,
  `packages/persistence/src/outbox-repository.test.ts` e handlers passaram
  32/32;
- live PostgreSQL: `tests/integration/postgres-worker.test.ts` passou 4/4,
  dentro de 31 arquivos/50 testes, usando aplicação sem
  `SUPERUSER/BYPASSRLS` e fixture administrativa separada;
- o cenário de finalização stale usa duas conexões PostgreSQL independentes
  concorrendo pelo mesmo registro; o token atual retorna `true` e o antigo
  retorna `false`;
- regressão: `pnpm verify` passou com 125 arquivos/579 testes, 33 skips,
  cobertura 84,48% statements, 80,37% branches, 85,97% functions e 85,22%
  lines; migrações 28/28, contrato CI 21 checks e gates de segurança/
  documentação passaram.

O fencing não declara exactly-once: um handler que inicia efeito externo antes
de perder o lease continua exigindo idempotência determinística e reconciliação.

## 4. Decisão e próximos limites

RESILIENCE-11-01 e OUTBOX-FENCE-001 estão concluídos no escopo técnico local
do item 11, com gaps operacionais mantidos explicitamente. O item 12 pode ser
aberto pela ordem controlada, mantendo:

- collector/exporter, alertas, SLO, traces e dashboards;
- restart de processo com telemetria e runbook de produção;
- fallback/retry de provider externo em homologação/produção;
- CI com PostgreSQL/Qdrant vivos e navegador ligado à API real;
- backup/restore, RPO/RTO e teste de carga.

Nenhum estado educacional, nota, gabarito, publicação ou aprovação clínica é decidido pelo worker, Qdrant ou IA.
