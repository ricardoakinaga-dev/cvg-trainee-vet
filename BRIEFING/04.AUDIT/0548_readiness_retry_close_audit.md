# 0548 — Retry opcional sem duplicação e encerramento aguardável

**Data:** 2026-08-26
**Escopo:** `OPS-061-READINESS-007` — coordenar retry opcional, inicialização
em voo e `close()` do worker
**Decisão:** `CONDITIONAL PASS / COMPLETED_WITH_GAPS`
**Release:** não autorizado

## 1. Objetivo e limites

Verificar, em ambiente local/sintético, que uma recuperação explícita do
Qdrant não deixa um retry antigo iniciar tentativa redundante, que o worker
aguarda uma inicialização opcional lenta durante `close()` e que boot e modo
aguardável compartilham a mesma promessa em voo. A fatia fica limitada a
`apps/worker/src/main.ts`, seus testes e o control plane. Não altera
PostgreSQL, migrations, contratos de domínio, produto, UX, produção ou
`JOURNEY-056`.

## 2. Achado e correção

O parecer independente Linnaeus de `OPS-061-READINESS-006` deixou um P2:
depois de uma falha que agenda retry, uma inicialização explícita bem-sucedida
poderia limpar o timer, mas um callback já enfileirado ainda poderia iniciar
uma tentativa adicional.

A correção bounded mantém uma única coordenação no worker:

- o timer é cancelado antes de iniciar uma tentativa e após sucesso;
- o callback guarda sua identidade e só inicia o retry se ainda for o timer
  ativo;
- `initializationInFlight` é compartilhada por boot e pelo modo
  `waitForOptionalDependencies`;
- `close()` cancela retry, aguarda a tentativa em voo e trata sua rejeição
  antes de fechar as integrações;
- a falha do Qdrant continua opcional e registrada sem URL, segredo, causa ou
  stack trace.

## 3. RED → GREEN → REFACTOR

- **RED:** o teste focal fez a primeira chamada `/exists` retornar 503,
  manteve o timer de 5 segundos observável, executou a recuperação explícita e
  disparou o callback antigo. Antes da guarda de identidade, foram observadas
  três chamadas em vez de duas (`expected 2`, recebido `3`).
- **GREEN:** `apps/worker/src/main.test.ts` passou `34/34`, incluindo a prova
  de `close()` com resposta HTTP lenta, a prova concreta de promessa
  compartilhada entre boot e modo explícito e a asserção de que o callback
  obsoleto não produz terceira chamada.
- **REFACTOR:** a coordenação de timer, promessa em voo e encerramento ficou
  centralizada em `createWorkerRuntime`; o caminho normal continua não
  bloqueante e o comando explícito continua aguardando a preparação opcional.

## 4. Verificação executada

- `pnpm test:worker`: `5` arquivos / `34` testes PASS;
- `pnpm verify`: `142` arquivos / `733` testes PASS, `29` arquivos / `38`
  testes skipped; cobertura `84,45%` statements, `80,34%` branches, `86,54%`
  functions e `85,16%` lines;
- `pnpm build`: `12/12` workspaces PASS;
- `pnpm test:e2e --workers=1`: `32/32` cenários sintéticos PASS;
- `pnpm audit --audit-level=high`: nenhum advisory conhecido;
- `git diff --check`, gates de contratos, migrations, secrets, arquitetura,
  documentação, produto e exposição: PASS.

Toda a evidência desta auditoria é local ou sintética. Não houve migration
aplicada, banco live, Qdrant live externo, push, deploy ou execução produtiva.

## 5. Revisão independente e gaps

Anscombe havia apontado que o teste anterior não executava um callback de retry
já enfileirado. O RED acima reproduziu a falha e a guarda de identidade foi
adicionada antes do GREEN. Gauss revisou o SHA técnico final em modo somente
leitura e retornou `CONDITIONAL PASS`, sem P0/P1; confirmou o escopo restrito,
o teste de callback obsoleto, o `close()` aguardável e a coordenação por
promessa compartilhada.

Permanecem gaps explícitos: cenário integrado boot+reconcile com PostgreSQL e
Qdrant reais, combinação de `close()` lento com retry já enfileirado, política
bounded completa com limite/backoff/jitter/classificação, validação literal de
migration/schema pelo readiness e operação live de outage/restart/carga/failover.
Esses gaps não são convertidos em claim de release.

## 6. Resultado

`OPS-061-READINESS-007` fica `COMPLETED_WITH_GAPS` no recorte local. A jornada
`JOURNEY-056` permanece `WAITING_HUMAN_APPROVAL`; Ricardo ainda deve escolher
entre sessão diagnóstica pública própria (A) e atividade especial (B) antes de
qualquer código, migration ou UX da jornada. Não há autorização de release,
piloto, publicação clínica ou claim de competência prática.
