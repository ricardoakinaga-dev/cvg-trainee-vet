# Dual 95 — U95-106 — gate de saúde de API e workers em deploy/rollback

**Data:** 2026-08-16 13:40:08 -03:00  
**Achado:** D95-H06  
**Estado:** concluído localmente; condicionado a RC imutável, CI/registry e ambiente produtivo aprovado

## Escopo

O controlador de release agora exige estado `running` e health `healthy` para
`api-a`, `api-b`, `worker-a` e `worker-b` antes de declarar promoção ou
rollback bem-sucedido. O edge só é iniciado na promoção depois do gate das
quatro réplicas.

Arquivos centrais:

- `scripts/release-execution.mjs` — lista canônica, parser do JSON emitido por
  `docker compose ps` e asserção fail-closed de estado/health;
- `scripts/deploy-release.mjs` — gate do canário `api-a`/`worker-a`, gate das
  quatro réplicas antes do edge e health final pelo edge;
- `scripts/rollback-release.mjs` — gate das quatro réplicas antes do health
  final do rollback;
- `tests/integration/local-release-rehearsal.test.ts` — contrato com estados
  saudáveis, `unhealthy`, `exited` e serviço ausente.

## TDD e controles

O RED reproduziu duas falhas por exportações ainda inexistentes. O GREEN passou
com nove testes focais. A matriz injeta cada processo (`api-a`, `api-b`,
`worker-a`, `worker-b`) como `running/unhealthy`; também cobre `worker-a`
`exited` e `worker-b` ausente. O gate rejeita todos os casos antes de qualquer
resultado `PASS`.

O parser aceita tanto objetos JSON linha a linha quanto array JSON, sem
executar conteúdo retornado pelo Compose. A decisão depende de campos
estruturais exatos (`Service`, `State`, `Health`); duplicidade, ausência,
estado diferente de `running` ou health diferente de `healthy` falham fechado.

## Evidência executada

```text
pnpm vitest run tests/integration/local-release-rehearsal.test.ts --pool=forks --maxWorkers=1
9/9 PASS

pnpm ops:deploy-release
DRY_RUN PASS — healthServices=api-a,api-b,worker-a,worker-b

pnpm ops:rollback-release
DRY_RUN PASS — healthServices=api-a,api-b,worker-a,worker-b

pnpm ops:verify-ha
PASS
```

O rehearsal operacional foi executado contra o Compose HA local com uma imagem
synthetic local rotulada pelo SHA do `HEAD` corrente
`1579442fa3dcf9a32bf5e7e1ce73977f2d8a60cd`:

```text
release digest  sha256:231bb5733b51eb8a20fada20eae86af6ff082dd442ec52323b6ec286f76fe4cf
rollback digest sha256:90f6c04372635d1e5c8d3558a23e61db6467ae18263d24851702b14e0e5e2044
deploy         PASS
rollback       PASS
runtimeRestored true
```

Em uma falha live controlada, `worker-a` foi parado. A leitura real do Compose
foi rejeitada pelo controlador como:

```text
fault-injection health gate failed (worker-a: exited/)
```

Depois de recriar o worker, o mesmo gate retornou as quatro réplicas como
`running/healthy` e o runtime foi restaurado.

## Verificação final

`pnpm verify` passou com `177` arquivos de teste, `801` testes aprovados e `18`
skips governados. A cobertura foi `84,55%` statements, `80,05%` branches,
`86,58%` functions e `85,36%` lines; contratos `81/81`, worker `25/25`,
migrações `30/30`, `verify:ha`, lint, typecheck, secrets, arquitetura,
documentação e exposição também passaram.

## Limites

Esta evidência é local: o SHA usado como label é o `HEAD` de referência, mas o
worktree continua deliberadamente dirty e a imagem é sintética. Não houve
commit, staging, push, registry, CI remoto, deploy produtivo, rollback
produtivo, alteração de score, publicação clínica ou remoção de
`PILOT_BLOCKED`. D95-H06 fica tratado no worktree e requer revalidação no RC
imutável e no ambiente autorizado.
