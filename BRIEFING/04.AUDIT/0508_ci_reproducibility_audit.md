# 0508 — Auditoria de CI, reprodutibilidade e prontidão de build

**Data:** 2026-08-10, America/Sao_Paulo  
**Item:** 15 — CI, reprodutibilidade e prontidão de build  
**Backlog:** `CI-15-01`  
**Baseline:** 50/100 em `0491_full_construction_audit.md`  
**Resultado atual:** **95/100 — CONCLUÍDO COM GAPS**
**Escopo:** contrato técnico de ambiente, workflow, gates, artefatos, diagnóstico remoto e reprodução local; não é aprovação clínica, piloto ou release.

## Veredito

O item 15 foi executado de ponta a ponta. O repositório privado `ricardoakinaga-dev/cvg-trainee-vet` foi criado, o checkout foi publicado em `origin/main`, e o workflow remoto passou no commit `dd4790973e31e1c3799c58cf99701128367b055b`.

O job remoto `quality` executou PostgreSQL 16 e Qdrant 1.15.5 descartáveis, readiness, contrato, migrations, integração live, restore sintético, build dos 12 workspaces, E2E padrão, E2E real navegador→web→API→PostgreSQL, audit de dependências e upload de artefatos. O E2E real passou 14/14 e o job terminou verde em 4m20s.

O bloqueio externo `CI-REMOTE-001` foi resolvido pela autorização explícita registrada nesta rodada. O histórico não foi apagado: a auditoria conserva as falhas anteriores, seus SHA/run IDs e a correção aplicada. O item 15 atinge 95/100 no escopo técnico/documental, mas carga, failover, restart, múltiplas réplicas, cache quente e rollback operacional de release permanecem gaps próprios.

## Matriz de avaliação

| Dimensão | Peso | Nota | Evidência |
|---|---:|---:|---|
| Contrato de ambiente e pins | 20 | 20 | `.nvmrc`, `package.json`, lockfile, `.env.example`, `verify:ci-contract`, Node `22.22.0`, pnpm `10.33.0` e teste de bootstrap da API real. |
| Workflow e dependências descartáveis | 20 | 20 | PostgreSQL 16, Qdrant 1.15.5, readiness no runner, migrations, live, restore, E2E padrão/real, audit e artefatos `always()`. |
| Reprodução local e reconciliação com CI | 25 | 24 | `pnpm verify`, build, migrations, containers pinados e E2E local com `NODE_ENV=test` no processo pai; o cache local/remoto não teve hit quente comprovado. |
| Artefatos e diagnóstico | 15 | 15 | Artefato remoto com coverage, Playwright e JUnit; falhas de bootstrap e API foram preservadas em runs distintos, com causa e correção rastreadas. |
| SHA, execução remota, rollback e cache observáveis | 20 | 16 | SHA remoto, job, duração, URL, artifact, digest e cache miss registrados; rollback de release não foi exercitado porque não houve deployment. |
| **Total** | **100** | **95** | **CONCLUÍDO COM GAPS** |

## Linha do tempo e falhas preservadas

| Run | SHA | Resultado | Evidência e decisão |
|---|---|---|---|
| `31378647864` | `b402fd73b9a6cb4211edecbab5fa775c1202081f` | Falha | `actions/setup-node` tentou resolver `cache: pnpm` antes de o workflow ativar pnpm; falhou em `Setup Node.js` com `Unable to locate executable file: pnpm`. |
| `31379006703` | `32163ec0ced8cfb77f437a0a236f4e6ba89e09a5` | Falha | Depois do ajuste de ordem, o API real herdou `NODE_ENV=test`; `apps/api/src/main.ts` encerrou sem escutar e o Playwright registrou `Process from config.webServer exited early`. A rerun confirmou a causa. |
| `31380183984` | `dd4790973e31e1c3799c58cf99701128367b055b` | **Sucesso** | Correção de `NODE_ENV=development` no webServer da API real; job `93428409312`, 4m20s, todos os 19 passos verdes. |

As falhas anteriores são evidência operacional, não foram escondidas nem convertidas em sucesso retroativo. O run intermediário preservou o artefato `9059201205`; o run final preservou o artefato `9059654877`.

## RED → GREEN → REFACTOR

- **RED — bootstrap pnpm:** o primeiro workflow falhou antes dos testes porque o cache do `setup-node` era resolvido antes do `corepack`; o contrato passou a exigir a ordem `Enable pnpm` → `Setup Node.js`.
- **GREEN — bootstrap pnpm:** `32163ec` corrigiu a ordem e os checks locais passaram; o novo run alcançou todos os gates até o E2E real.
- **RED — API real em CI:** o teste de governança para o webServer real falhou porque `playwright.config.ts` não sobrescrevia o `NODE_ENV=test` herdado do job.
- **GREEN — API real:** `dd47909` adicionou `NODE_ENV=development` ao comando da API e o contrato passou com quatro testes.
- **REFACTOR:** `scripts/verify-ci-contract.mjs` passou a ler `playwright.config.ts` e a impedir regressão do bootstrap; o cenário local foi repetido com `NODE_ENV=test` no processo pai e passou 14/14.

## Evidência local

| Verificação | Resultado |
|---|---|
| `pnpm verify` | PASS — 77 arquivos; 356 testes passaram; 17 skips condicionais; 84,92% statements, 80,34% branches, 85,89% functions, 85,61% lines. |
| `pnpm build` | PASS — 12 workspaces. |
| `pnpm audit --audit-level=high` | PASS — nenhuma vulnerabilidade conhecida. |
| `pnpm db:migrate` | PASS — migrations 0000–0014 em PostgreSQL 16 descartável. |
| `pnpm test:integration:extended` | PASS — 23 arquivos/32 testes, PostgreSQL + Qdrant pinados + restore isolado. |
| `NODE_ENV=test ... CVG_RUN_REAL_E2E=true pnpm test:e2e` | PASS — 14/14; confirma o mesmo modo herdado do CI com API real iniciada em `development`. |
| `pnpm vitest run --project integration tests/integration/ci-governance.test.ts` | PASS — 4/4. |
| `pnpm verify:ci-contract` | PASS — Node `22.22.0`, pnpm `10.33.0`, 12 chaves de ambiente, 19 checks de workflow e 1 check de runtime. |
| `pnpm format:check`, `git diff --check` | PASS. |

O container descartável `cvg-ci-real-e2e-postgres` criado para a reprodução local foi removido após a execução. Nenhum serviço pré-existente foi alterado.

## Evidência remota final

| Campo | Valor |
|---|---|
| Repositório | `https://github.com/ricardoakinaga-dev/cvg-trainee-vet` — privado |
| Branch/SHA | `main` / `dd4790973e31e1c3799c58cf99701128367b055b` |
| Workflow/run | `quality` / `31380183984` |
| Job | `quality` / `93428409312` |
| Execução | `2026-08-10T10:41:01Z` → `2026-08-10T10:45:21Z`, 4m20s |
| Resultado | **success** — setup, containers, checkout, pnpm, Node, install, readiness, verify, migrations, live PostgreSQL, live Qdrant, restore, build, Chromium, E2E padrão, E2E real, audit, artifact e cleanup verdes |
| E2E padrão | 12/12 |
| E2E real | 14/14, com convite, atividade, tentativa, resposta e submissão sintéticos persistidos |
| Audit remoto | `No known vulnerabilities found` |
| Artifact | `quality-artifacts-dd4790973e31e1c3799c58cf99701128367b055b` / ID `9059654877` |
| Artifact | 99 arquivos, 821659 bytes, SHA256 `fe7e25c3701dd511bec0000397076b063c00cf5d115d155acefb6637f1f625ee` |
| Retenção | 7 dias; expira em `2026-08-17T10:45:11Z` |
| URL do run | `https://github.com/ricardoakinaga-dev/cvg-trainee-vet/actions/runs/31380183984` |
| URL do artifact | `https://github.com/ricardoakinaga-dev/cvg-trainee-vet/actions/runs/31380183984/artifacts/9059654877` |
| Validação final da documentação | commit `4281f238e0a2644410c88801e670f2a9eda760c1`; run `31381262006`; job `93431720358`; 4m45s; artifact `9060063069`; SHA256 `7745f6c5578416bf88971d6da2b336ffd2ea1aed7fab3033c30905778f64ce43` |

O `Setup Node.js` registrou `cache: pnpm` e `pnpm cache is not found`; esse cache miss é evidência observada e não falha do job. O workflow continua reproduzível por `pnpm install --frozen-lockfile`. O rollback de release não foi executado porque esta rodada não fez deployment; o rollback seguro permanece a reversão por commit imutável/revert de `dd47909`, documentada como operação separada e não como falso teste de produção.

## Gaps e decisão

- o CI remoto agora está configurado, executado e verde; não há bloqueio humano para `CI-15-01`;
- cache quente, carga, failover, restart, múltiplas réplicas, collector/OTel externo, retenção efetiva e operação de release permanecem gaps próprios;
- rollback operacional de deployment não foi exercitado, pois não houve deployment nem mudança em ambiente externo de produção;
- release, piloto, publicação clínica e transição para `PUBLICADO` continuam bloqueados pelos gates humanos e clínicos já registrados.

**Decisão operacional:** `CI-15-01` concluído com gaps em **95/100**; o item 16 pode ser aberto pela ordem. A conclusão técnica não autoriza release, piloto, publicação clínica ou autonomia da IA.
