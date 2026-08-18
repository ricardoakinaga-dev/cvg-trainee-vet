# Evidência Dual 95 — U95-105 — fixture PostgreSQL autoral

**Data:** 2026-08-16  
**Ambiente:** Compose HA local `cvg-trainee-vet-ha`, PostgreSQL local, dados sintéticos  
**Status:** `LOCAL_PASS_WITH_LIMITATIONS`  
**Escopo:** tratar localmente o `D95-H05`; não é promoção de score, release, publicação clínica ou autorização de piloto.

## Correção da fixture

O fixture live de autoria agora cria explicitamente autor, aprovador clínico e
participante sintéticos, usa `approvedClinicalApproverId` igual ao aprovador
designado no comando de revisão, e usa o mesmo aprovador persistido no comando
de publicação. A preparação e a limpeza usam uma conexão administrativa
somente para atravessar RLS de `activity_assignments`; o workflow e as leituras
de autoria executam com a conexão da aplicação.

O teste continua protegido por `skipIf` quando as URLs live não são fornecidas,
mas foi executado nesta rodada com `CVG_RUN_LIVE_DB_TESTS=true`, URL da aplicação
e URL administrativa. Não houve skip na execução observada.

## Caso negativo do aprovador divergente

Antes do primeiro write de revisão, o teste envia um `approvedClinicalApproverId`
sintético diferente do `principalId`/aprovador designado. O use case responde
`forbidden`, não abre a transação de autoria, não executa transição e o
conteúdo permanece `PROJECAO_VERIFICADA`. Em seguida, o mesmo fixture executa o
caminho correto, conclui a revisão e publicação, exercita fault injection e
replay idempotente, e remove todos os dados sintéticos no teardown.

## Verificações executadas

- teste live `tests/integration/postgres-authoring-workflow.test.ts`: `1/1`,
  sem skip; divergência do reviewer falha antes de transição, o aprovador
  designado permite review/publicação, e o teardown é executado;
- testes unitários HTTP/aplicação focais: `74/74`;
- `pnpm typecheck`, lint, `pnpm verify:secrets` e `git diff --check`: `PASS`;
- a última execução de `pnpm verify` passou com `177` arquivos, `799` testes,
  `18` skips governados, cobertura `84,55%` statements / `80,05%` branches /
  `86,58%` functions / `85,36%` lines, migrações `30/30`, contratos `81/81` e
  workers `25/25`;
- API A/B e worker A/B foram recriados como `healthy`; `pnpm ops:verify-ha`
  passou.

## Limitações e continuidade

Esta é evidência local com dados sintéticos e conexão administrativa de fixture;
não comprova CI remoto, registry, release imutável, produção, RLS completa de
todo o domínio, rotação real de identidade ou reauditoria independente. O
workflow principal foi executado com a role da aplicação, mas o caso de
deploy/rollback com worker unhealthy permanece no `U95-106`.

D95-H01–H05 estão tratados no worktree local, condicionados à revalidação no
RC. As baselines `83,24/100` e `64,20/100`, `0/145` cadeias completas e
`PILOT_BLOCKED` permanecem inalterados. Nenhum commit, score, release ou
publicação foi promovido.
