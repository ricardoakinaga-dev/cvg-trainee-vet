# 145 — Evidência Dual 99 U98-106/B99-201/B99-205 — idempotência de sugestão de IA

**Data:** 2026-08-22
**Registro:** `DUAL99-U98-106-AI-SUGGESTION-IDEMPOTENCY-311`
**Predecessor:** `docs/144_dual_99_u98_106_worker_cleanup_evidence_2026-08-21.md`
**Disposição:** `LOCAL_PASS_WITH_LIMITATIONS / IN_PROGRESS / PILOT_BLOCKED`

## Objetivo e limite

Fechar o gap local de replay do consumidor `ai.suggestion.requested.v1` sem
permitir que o mesmo `event_id` produza mais de um efeito interno persistido.
O contrato continua sendo **at-least-once**: esta rodada não alega chamada
exactly-once ao provider, publicação produtiva, compatibilidade N/N-1, release,
score, piloto ou decisão clínica.

Foram usados somente eventos UUID, conteúdo e respostas de IA sintéticos. O
PostgreSQL 16 descartável foi executado com uma role sem `SUPERUSER` e sem
`BYPASSRLS`; ao final, o contêiner `cvg-gauntlet-ai-idem-pg` foi parado e
removido automaticamente, eliminando apenas os dados sintéticos da prova.

## RED → GREEN → REFACTOR

Os REDs reproduziram falhas reais do candidato recuperado:

- uma execução stale liberava a lease reclamada por outro worker;
- o cleanup do outbox removia a identidade necessária ao replay e reinvocava
  a IA;
- um estado `PROCESSING` com `completed_at` era aceito pelo banco;
- a governança de skips não refletia todos os testes live;
- sob instrumentação integral, testes de estresse do scanner/hotspots
  ultrapassavam o timeout, embora passassem isoladamente.

A implementação final:

- adiciona `source_event_id` nullable e único ao draft, preservando a forma
  aditiva da migration;
- cria tombstone durável por `event_id`, sem cascade do outbox, com estado,
  versão, tentativas, lease token, timestamps e checks coerentes;
- usa advisory lock transacional não bloqueante e `clock_timestamp()` do
  PostgreSQL para claim/reclaim;
- exige token opaco em save e release; um worker stale não salva, conclui nem
  libera a lease corrente;
- grava o draft e conclui o tombstone na mesma transação;
- trata `COMPLETED` como replay sem nova chamada, e `IN_PROGRESS`/conflito como
  falha fechada;
- rejeita UUID, versão, draft, warnings e estados inválidos;
- não reconhece silenciosamente o evento quando a integração de IA está
  desligada: o fluxo segue para retry/DLQ;
- preserva o erro original mesmo quando a liberação compensatória falha.

## Evidência PostgreSQL e fault injection

A migration `0033_ai_suggestion_event_idempotency.sql` foi aplicada desde um
banco vazio como a migration 34/34. A prova live passou `7/7` e observou:

- claim, draft, ACK e cleanup básicos;
- replay antes e depois da remoção do outbox sem segunda chamada à IA;
- duas claims concorrentes com somente uma aquisição;
- advisory lock ocupado retornando imediatamente `IN_PROGRESS`;
- lease expirada com novo token, save/release stale rejeitados;
- constraint rejeitando estado temporal inválido;
- RLS habilitada e forçada no tombstone, invisível sem o contexto do worker;
- fault injection entre upsert do draft e completion do tombstone, com rollback
  do draft e claim ainda `PROCESSING`;
- retries limitados e DLQ.

A policy atual baseada em GUC é somente um gate de contexto. Como API e worker
usam a mesma role de runtime, ela **não** constitui isolamento forte de
identidade. A separação `owner/migrator`, `cvg_api` e `cvg_worker`, com policy
e grants ligados à role do worker, continua obrigatória antes de release.

## Verificações finais

| Gate | Resultado |
|---|---|
| Unitários focais handler/repository/main | `49/49 PASS` |
| PostgreSQL 16 live sintético/restrito | `7/7 PASS` |
| Worker | `64/64 PASS` |
| Cobertura integral | `205` arquivos, `1191` testes, `25` skips governados |
| Cobertura global | `94,96%` statements; `90,81%` branches; `95,32%` functions; `95,67%` lines |
| Critical decisions | `7/7`, branch coverage `100%` nos alvos |
| Skip governance | `17` arquivos, `25` testes, `20/20` runs, `0` flaky |
| Migrações / safety | `34/34`; `0` migrations destrutivas |
| Build | `12/12 PASS` com URL interna sintética |
| Formato, lint, typecheck, diff-check, exposure | `PASS` |
| Dependências | nenhuma vulnerabilidade conhecida no gate executado |
| Hotspots | `0`; ratchet de dívida preservado |
| Secret scanner | `FAIL_CLOSED`: quatro assignments redigidos de `.env.local` e um finding genérico de histórico acima do budget |

Os timeouts dos testes de estresse foram ajustados para a instrumentação de
cobertura; budgets, assertions e comportamento fail-closed do scanner não
foram relaxados.

## Crítica independente

O primeiro revisor reproduziu o bug de lease stale e rejeitou o candidato. A
correção adicionou fencing e atomicidade. O crítico fresco final emitiu
**PASS para o consumidor N local** e **NOT RELEASE-PASS**. Uma segunda revisão
de compatibilidade concordou com a correção local e rejeitou a promoção
global pelos limites abaixo.

## Gaps e rollback seguro

Permanecem abertos:

1. workers N-1 não criam nem respeitam tombstones; o rollout exige gate do
   publisher, drain de N-1, migration expand, deploy completo N, canário e
   matriz mixed-version;
2. API e worker compartilham role; a policy por GUC não é isolamento forte;
3. a chamada externa ao provider continua at-least-once e pode repetir antes
   do commit; nenhum publisher produtivo/determinístico do evento foi achado;
4. o índice único não concorrente requer rehearsal de lock/tempo em volume
   representativo; tombstones precisam de retenção e métrica;
5. a consistência entre writes do Qdrant continua sendo o próximo gap local;
6. o scanner impede commit: quatro assignments locais sensíveis e o
   histórico Git acima do budget de 256 MiB exigem saneamento autorizado;
7. RC/SHA, CI/registry, providers, WebKit aprovado, runtime, clínica, UAT,
   `0/145`, gates externos, aprovação humana e reauditoria permanecem abertos.

Rollback seguro não remove `0033` nem os tombstones. Deve desligar o publisher,
drenar/parar workers N, reverter o binário e preservar o schema expandido. Não
houve commit ou push desta rodada porque o gate de secrets está vermelho.

## Arquivos do recorte

- `apps/worker/src/handlers.ts` e testes;
- `apps/worker/src/main.test.ts`;
- `packages/persistence/src/ai-suggestion-repository.ts` e testes;
- schemas content/operations, exports e journal Drizzle;
- `packages/persistence/drizzle/0033_ai_suggestion_event_idempotency.sql`;
- `tests/integration/postgres-worker.test.ts`;
- governança de skips e timeouts de estresse sob cobertura.
