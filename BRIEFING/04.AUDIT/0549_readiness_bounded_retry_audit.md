# 0549 — Retry bounded e classificação fail-closed do índice opcional

**Data:** 2026-08-26  
**Escopo:** `OPS-061-RETRY-008` — limitar e classificar a inicialização
opcional do Qdrant em API e worker  
**Decisão:** `CONDITIONAL PASS / COMPLETED_WITH_GAPS`  
**Release:** não autorizado

## 1. Objetivo e limites

Esta auditoria verifica, em ambiente local com servidores e erros sintéticos,
que o bootstrap do índice derivado não mantém retry infinito, não repete falhas
permanentes identificáveis e não altera o readiness autoritativo do
PostgreSQL. O recorte inclui a política pura, os coordenadores de API e worker,
o bootstrap concorrente de índices, a telemetria allowlisted e o patch
rastreável da dependência `@qdrant/js-client-rest@1.19.0`.

Não inclui migrations, produto, `JOURNEY-056`, `FEEDBACK-057`, health probe com
retry interno, outbox, reconciliação automática, provider externo, produção,
deploy, workflow remoto same-SHA, carga, failover, restore, collector externo,
aprovação clínica ou dados reais.

## 2. Quality bar e implementação

- timeout, transporte identificável, `429` e `5xx` são retryáveis; `4xx`,
  configuração, incompatibilidade de schema/dimensão e falhas desconhecidas
  são encerradas sem retry;
- o orçamento tem cinco tentativas totais, com backoff de 5 s, 10 s, 20 s e
  40 s no caminho sem `Retry-After`, cap de 60 s e jitter de ±20% injetável;
- `Retry-After` delta-seconds atravessa a fronteira do SDK integralmente e é
  limitado pelo cap da política;
- API e worker mantêm bind/loop não bloqueante, uma inicialização em voo,
  timer cancelável e `close()` aguardável; no worker, uma chamada explícita
  pode iniciar um novo orçamento depois da exaustão sem duplicar uma chamada
  ainda em voo;
- `ensureCollection()` aguarda todos os irmãos de criação de índice e, em um
  conjunto misto, uma falha terminal ou desconhecida prevalece sobre qualquer
  falha retryable;
- logs e métricas registram somente campos allowlisted (`dependency`,
  `classification`, `retryable`, `attempts`, `max_attempts`, `status`,
  `delay_ms` e `outcome`), sem erro bruto, URL, segredo, stack ou payload;
- `/health/ready` continua PostgreSQL-only.

O patch local corrige a leitura do header no SDK: a versão fixada usava apenas
o primeiro caractere de `Retry-After` (`120` virava `1`). A alteração é
versionada em `patches/@qdrant__js-client-rest@1.19.0.patch` e vinculada por
`package.json`/`pnpm-lock.yaml`.

## 3. RED → GREEN → REFACTOR

### RED

A revisão independente de `OPS-061-RETRY-008` reproduziu dois P1: o caminho
HTTP real truncava `Retry-After`, e a primeira rejeição de
`Promise.allSettled` podia mascarar uma rejeição permanente posterior. A prova
adicional do worker também reproduziu uma corrida em que o modo explícito
observava a Promise rejeitada do quinto intento antes da limpeza do estado.

### GREEN

Foram adicionados o classificador/política compartilhados, o patch de
dependência, o drenamento fail-closed dos irmãos e a coordenação de lifecycle.
Os testes cobrem erro sintético, transporte, `429` HTTP real com header `120`,
status `4xx`/`5xx`, backoff/jitter/cap, cinco tentativas, ausência de sexto
timer, exaustão, novo orçamento explícito, deduplicação, timer obsoleto,
`close()` lento, readiness e redaction.

### REFACTOR

API e worker usam o mesmo módulo puro sem compartilhar executor ou orçamento
entre processos. O worker mantém a deduplicação para chamadas normais e, em
modo explícito, aguarda uma tentativa corrente rejeitada antes de abrir o novo
orçamento. A precedência das rejeições irmãs é calculada somente após todos os
promises assentarem.

## 4. Verificação executada

Commits técnicos: `df91513` (`fix(integrations): bound optional qdrant
initialization retry`) e `2a95f5c` (`fix(worker): guard explicit qdrant retry
generation`).

- suíte focal: 5 arquivos / 30 testes PASS;
- `pnpm verify`: 143 arquivos / 743 testes PASS, 29 arquivos / 38 testes
  skipped; cobertura 84,46% statements, 80,34% branches, 86,62% functions e
  85,24% lines;
- contratos: 30 arquivos / 86 testes PASS; worker: 5 arquivos / 37 testes
  PASS; migrations: 51/51 PASS;
- `pnpm build`: 12/12 workspaces PASS;
- `pnpm test:e2e --workers=1`: 32/32 cenários sintéticos PASS;
- `pnpm audit --audit-level=high`: nenhum advisory conhecido;
- formatação, lint, typecheck, CI contract, secrets, traceability,
  architecture, documentation, product-definition, exposure e
  `git diff --check`: PASS.

As execuções usaram Node `22.22.0` e pnpm `10.33.0` efêmeros. Nenhuma
migration foi aplicada nesta task; não houve banco/Qdrant externo, push, deploy
ou execução produtiva.

## 5. Revisão independente e gaps

Bacon realizou a crítica independente inicial e retornou `FAIL` por dois P1;
ambos foram reproduzidos, corrigidos e cobertos. Ohm realizou uma crítica de
follow-up e encontrou a corrida P1 entre o handler explícito e o catch interno;
ela foi reproduzida no teste de geração concorrente e corrigida no commit
`2a95f5c`. Euclid revisou a implementação final e retornou `CONDITIONAL PASS`,
com P0/P1 zerados e um P2 documental, resolvido no fechamento do manifesto,
backlog e plano. A ausência de evidência live não é convertida em aceite de
produção.

Gaps que permanecem explícitos:

- não foi observada operação live de outage, restart, carga, failover, restore,
  múltiplas réplicas ou collector/retention;
- não há prova integrada com PostgreSQL/Qdrant reais, workflow remoto same-SHA,
  ACL/owners produtivos ou provider externo;
- somente `Retry-After` delta-seconds é preservado pela fronteira corrigida;
  formatos HTTP-date e política distribuída permanecem fora deste recorte;
- a política não foi aplicada a health probe, outbox ou reconciliação automática;
- aprovação clínica, publicação, piloto e competência prática continuam
  bloqueios humanos separados.

## 6. Resultado

`OPS-061-RETRY-008` fica `COMPLETED_WITH_GAPS` no recorte local: os P1
reproduzíveis foram fechados, Euclid retornou `CONDITIONAL PASS` sem P0/P1 e os
gates locais estão verdes, mas isto não é claim de release, disponibilidade,
operação produtiva ou competência clínica.
`JOURNEY-056` permanece em `WAITING_HUMAN_APPROVAL`; qualquer código,
migration ou UX dessa jornada continua condicionado à escolha contratual de
Ricardo entre as opções A e B já registradas no runtime state.
