# 0547 — Readiness essencial e inicialização degradável

**Data:** 2026-08-26
**Escopo:** `OPS-061-READINESS-006` — separar readiness PostgreSQL da saúde
agregada e impedir que Qdrant opcional bloqueie o cold start
**Decisão:** `CONDITIONAL PASS / COMPLETED_WITH_GAPS`
**Release:** não autorizado

## 1. Objetivo e limites

Verificar a aderência local entre `/health/ready`,
`/health/dependencies` e o comportamento de inicialização das integrações.
O objetivo é preservar o núcleo autoritativo PostgreSQL quando Qdrant, índice
derivado e assistivo, estiver indisponível. A fatia não altera domínio,
migrations, contratos de participante, produto, dados ou configuração
produtiva.

## 2. Achado e correção

A crítica independente encontrou P1 no caminho anterior: `runtime.listen()`
aguardava `integrations.initialize()` antes de `server.listen()`. Como
`initialize()` chama `ensureCollection()`, um Qdrant indisponível no cold start
impedia a API de abrir a porta e deixava `/health/live`, `/health/ready` e
`/health/dependencies` inacessíveis.

A correção bounded materializa duas responsabilidades:

- `createCoreReadinessHealthcheck` verifica somente o healthcheck PostgreSQL;
  `createServerIntegrations` expõe essa porta como `readiness` e a API a injeta
  em `/health/ready`;
- `healthcheck` agregado continua verificando PostgreSQL e Qdrant, enquanto
  `createDependencyStatus` representa Qdrant indisponível como `DOWN` e estado
  global `DEGRADED`; a API binda antes da inicialização assistiva, agenda
  retry de 5 segundos sem manter o processo preso e cancela o timer no close;
  `close()` também aguarda a tentativa já em voo antes de fechar as integrações.
- o worker mantém `initialize()` não bloqueante para o loop normal, mas expõe
  o modo `waitForOptionalDependencies`; `reconcile-qdrant` usa esse modo para
  aguardar `ensureCollection()` antes de chamar `runtime.reconcile()`, evitando
  a corrida entre criação da coleção e leitura de pontos.

O worker aplica o mesmo ciclo não bloqueante para que a falha do índice não
encerre o processo nem impeça o loop de outbox. Falhas são registradas apenas
com o componente e a condição retryable; causa, URL, segredo e stack trace não
entram em logs ou respostas.

## 3. Evidência RED → GREEN → REFACTOR

- RED focal: o teste de startup com Qdrant em loopback indisponível rejeitava
  `runtime.listen()` antes da correção; o teste inicial de readiness também
  revelou a ausência da porta `createCoreReadinessHealthcheck`; a crítica final
  reproduziu a corrida do comando de reconciliação, e o teste do modo aguardável
  falhava porque `initialize({ waitForOptionalDependencies: true })` ainda
  resolvia imediatamente.
- GREEN focal: `packages/integrations/src/composition.test.ts`,
  `apps/api/src/main.test.ts` e `apps/worker/src/main.test.ts` passaram com
  `15` testes; `apps/worker/src/reconcile.test.ts` e
  `apps/worker/src/reconcile-command-runner.test.ts` também foram incluídos no
  focal ampliado, que passou `18/18`; a prova sintética de preparação da
  coleção confirma o caminho de sucesso antes do reconcile; o focal HTTP
  adicional passou `88/88`. O
  servidor Qdrant sintético confirma que a inicialização foi tentada e que a API já estava
  bindada; a regressão também conecta explicitamente a falha à saúde agregada
  e confirma o estado `DEGRADED`. O comando operacional agora aguarda a
  preparação opcional por contrato explícito; não há alegação de execução live
  do comando neste audit.
- refactor: a API e o worker usam tentativa em background com retry
  cancelável; o retry usa timer `unref`, não expõe erro externo e é limpo no
  fechamento. O teste live de health espera o estado Qdrant `UP` dentro de uma
  janela bounded, pois a inicialização passou a ser eventual.
- `pnpm verify`: `142` arquivos PASS, `29` skipped; `730` testes PASS,
  `38` skipped; cobertura `84,37%` statements, `80,31%` branches, `86,45%`
  functions e `85,08%` lines; migrations `51/51`; gates de CI, lint,
  typecheck, secrets, arquitetura, documentação, definição de produto e
  exposição passaram.
- `pnpm build`: os `12` workspaces passaram.
- `pnpm test:e2e`: `32/32` cenários sintéticos passaram no estado final.
- `git diff --check`: PASS; audit de dependências high passou sem advisories;
  `verify:traceability:release` passou após o fechamento documental, com
  artefatos alcançáveis e paths rastreados. Nenhuma prova externa é inferida.

## 4. Crítica independente

Franklin revisou o primeiro fix somente em leitura e encontrou o P1 de cold
start e um falso-positivo no teste novo. Lagrange revisou a segunda versão e
apontou a corrida de fechamento e a asserção insuficiente do teste; ambos foram
corrigidos nesta rodada. Euler revisou a versão seguinte e encontrou o P1 da
corrida em `reconcile:qdrant`; o modo explicitamente aguardável e seu RED/GREEN
foram adicionados em seguida.
Também registrou um gap P2 preexistente: `database.healthcheck()` confirma
conexão e least privilege, mas não valida literalmente a versão de migration
ou schema. Esse gap não foi ampliado nesta fatia.

Kuhn revisou o achado separado de learning-state. Não confirmou acesso
cross-scope ou cross-membership: autorização limita o escopo e a policy
PostgreSQL exige membership aceita. O endpoint genérico ainda permite que
staff escolha um participante válido dentro do escopo autorizado; isso é P2
condicionado à eventual aplicação do contrato server-side mais estrito do
fluxo adaptativo e não foi alterado.

## 5. Resultado e gaps

`OPS-061-READINESS-006` fica `CONDITIONAL PASS / COMPLETED_WITH_GAPS` para o
recorte local. A mudança corrige a remoção indevida do núcleo por falha de
Qdrant e conserva a saúde detalhada degradada. Permanecem sem evidência nesta
auditoria: outage Qdrant em ambiente live, restart/carga/failover, duração de
retry em operação, limite/backoff/jitter e classificação de falhas de retry no
boot, validação literal de migration/schema pelo readiness, collector/
retention/traces, ACL/owners produtivos, workflow remoto same-SHA e gates
clínicos.

`JOURNEY-056` continua `WAITING_HUMAN_APPROVAL`: Ricardo deve escolher A,
sessão diagnóstica pública própria com checkpoint/retomada, ou B, atividade
especial, antes de qualquer código de jornada. Não há autorização de release,
piloto, publicação clínica ou claim de competência prática.
