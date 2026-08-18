# 130 — Evidência U95-114: cobertura de produção e E2E ativo

**Data:** 2026-08-16 17:31:01 -03:00  
**Programa:** Dual 95 / `ENT95-14` / U95-114  
**Status:** `IN_PROGRESS` local / `PILOT_BLOCKED`  
**Baseline preservada:** maturidade `83,24/100`; qualidade `64,20/100`; rastreabilidade `0/145`

## Objetivo e critério

U95-114 exige incluir toda a produção na cobertura, atingir pelo menos `90%` global, manter nenhuma camada crítica abaixo de `80%`, executar Chromium/Firefox/WebKit/mobile e provar browser → API → banco no RC.

## RED observado

- `vitest.config.ts` não incluía toda a produção de `apps/web` no denominador de cobertura;
- a descoberta de testes não cobria explicitamente `.test.tsx`, deixando parte da caracterização web fora da coleta;
- o Playwright não oferecia um controle explícito e validado para a matriz de browsers;
- o E2E sintético anterior mockava as respostas e a API em `3101` não estava ativa, portanto não provava browser → API → PostgreSQL.

## GREEN implementado

- `vitest.config.ts` agora inclui `packages/**/src/**/*.ts`, `apps/**/src/**/*.ts` e `apps/web/app/**/*.{ts,tsx}`, com descoberta de testes `.test.ts` e `.test.tsx`;
- `playwright.config.ts` valida `CVG_E2E_BROWSERS` e compõe projetos `chromium`, `firefox`, `webkit` e `mobile-chromium`;
- foram adicionados testes sintéticos de modelos, páginas, ações, projeções e views web, além da caracterização em `tests/integration/e2e-build.test.ts`;
- a execução ativa construiu a imagem temporária `cvg-trainee-vet:u95-114-working-tree` a partir do worktree atual, recompilou a web com API interna temporária e executou o fixture com dados sintéticos.

## Verificações executadas

| Verificação | Resultado | Evidência/limite |
|---|---:|---|
| `pnpm typecheck && pnpm lint` | PASS | worktree atual |
| `pnpm test:coverage` | PASS | `191` arquivos passantes, `16` guardados; `855` testes passantes, `19` guardados; `84,47%` statements / `80,29%` branches / `85,35%` functions / `85,77%` lines |
| `CVG_E2E_WEB_PORT=3199 pnpm test:e2e` | PASS `27/27` | Chromium sintético; avisos de conexão recusada ao endpoint mock esperado não são evidência ativa |
| `CVG_RUN_ACTIVE_HA_E2E=true CVG_E2E_BROWSERS=chromium BASE_URL=http://127.0.0.1:3198 pnpm test:e2e:active-ha` | PASS `3/3` | Chromium; browser → web proxy → API atual do worktree em `3197` → PostgreSQL da rede HA; fixture sintético e cleanup confirmados |
| matriz Playwright | CONFIGURADA | Firefox, WebKit e mobile-Chromium não foram executados porque os browsers não estavam disponíveis nesta rodada |

O runtime HA persistente não foi reiniciado. A API e a web temporárias foram removidas após a execução; não restaram container, processo ou porta temporária. A tentativa de `docker compose ps` não foi usada como evidência porque a shell desta rodada não tinha as variáveis de interpolação de segredos; a presença dos serviços existentes foi observada diretamente com `docker ps`.

## Resultado contra o gate

O resultado é parcial. A cobertura global está em `84,47%` statements, abaixo de `90%`. Pelo resumo de cobertura, as funções das camadas críticas ainda estão abaixo de `80%`: `apps/web` `78,33%`, `apps/api` `78,82%` e persistência `75,08%`. O caminho ativo confirma persistência sintética no PostgreSQL HA local, mas não é RC imutável nem produção e não prova a matriz completa de browsers, mobile, UAT, WCAG manual, RUM, backup/DR ou reauditoria.

U95-114 permanece `IN_PROGRESS`; não houve commit, staging, push, release, score ou fechamento de `0/145`.

## Rastreabilidade

- Requisito/gate: `U95-114`, `ENT95-14`, item de qualidade 12.
- SPEC/contratos relacionados: contratos de aplicação/API, dados/persistência, permissões/governança e testes operacionais do Dual 95.
- Módulos: `vitest.config.ts`, `playwright.config.ts`, `apps/web/app/**`, `apps/web/src/*coverage.test.*`, `tests/integration/e2e-build.test.ts`, `tests/integration/active-ha-e2e.test.ts` e `scripts/active-ha-e2e.mjs`.
- Artefatos: esta evidência, `docs/99_runtime_state.md`, `docs/20_master_execution_log.md`, `docs/30_backlog_master.md`, `BRIEFING/04.AUDIT/0515_dual_95_backlog.md` e a entrada histórica `DUAL95-U95-114-COVERAGE-E2E-161` em `traceability.yml`.

## Atualização de continuidade — 2026-08-16 18:28:19 -03:00

### Cobertura final desta rodada

Foram adicionados testes sintéticos de composição da API e de repositórios de persistência, incluindo mapeamento inválido, conflitos, idempotência, transações e caminhos fail-closed. `pnpm test:coverage` passou com `192` arquivos, `908` testes passantes, `16` arquivos guardados e `19` testes guardados:

| Camada | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|
| Global | `90,15%` | `84,10%` | `93,57%` | `91,59%` |
| `apps/api/src` | `86,03%` | `73,45%` | `94,70%` | `89,73%` |
| `apps/web/app` | `90,99%` | `86,31%` | `91,25%` | `95,26%` |
| `apps/worker/src` | `81,60%` | `75,00%` | `83,63%` | `81,74%` |
| `packages/persistence/src` | `92,27%` | `85,74%` | `93,37%` | `92,98%` |

`pnpm typecheck`, `pnpm lint`, `pnpm format:check` e `git diff --check` passaram. Os diretórios temporários `.next-e2e-active` e `.next-e2e-u95-114` foram removidos; `next-env.d.ts` e `tsconfig.json` foram restaurados para o build normal do Next.

### Limites mantidos

A meta global de `≥90%` foi atingida e as funções das camadas críticas estão acima de `80%`. API e worker ainda ficam abaixo de `80%` em branches (`73,45%` e `75,00%`) se o piso se aplicar a toda métrica. A matriz Firefox/WebKit/mobile continua apenas configurada, não executada. O E2E ativo `3/3` e o sintético `27/27` permanecem evidência Chromium local; não são prova de RC imutável, produção, UAT, WCAG manual, RUM, backup/DR, gates externos, score ou `0/145`. U95-114 permanece `IN_PROGRESS` local / `PILOT_BLOCKED`.

## Atualização de continuidade — 2026-08-16 18:56:56 -03:00

### Cobertura e boundaries da API

Foram adicionados testes sintéticos de boundaries de dependências opcionais em participante, authoring, workflow e operações. O comportamento fail-closed foi exercitado sem dados reais. `pnpm typecheck && pnpm test:coverage` passou com `194` arquivos, `921` testes passantes, `16` arquivos guardados e `19` testes guardados:

| Camada | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|
| Global | `90,73%` | `85,30%` | `93,70%` | `92,15%` |
| `apps/api/src` | `89,40%` | `80,25%` | `95,63%` | `93,21%` |
| `apps/web/app` | `90,99%` | `86,31%` | `91,25%` | `95,26%` |
| `apps/worker/src` | `84,80%` | `84,14%` | `83,63%` | `84,64%` |
| `packages/persistence/src` | `92,27%` | `85,74%` | `93,37%` | `92,98%` |

### Matriz Playwright e limites

`CVG_E2E_BROWSERS=chromium,firefox,webkit,mobile-chromium` executou `108` casos: Chromium, Firefox e mobile Chromium passaram `81/81` (27 por projeto). Os `27` casos WebKit foram bloqueados antes das asserções por `libavif16` ausente no host. Os browsers Firefox/WebKit foram instalados no cache local; `sudo -n pnpm exec playwright install-deps webkit` exigiu senha e não alterou o host. O E2E ativo anterior permanece `3/3` em Chromium, no worktree temporário com PostgreSQL HA e fixture sintético.

U95-114 permanece `IN_PROGRESS` local / `PILOT_BLOCKED`: a cobertura global e os pisos críticos locais estão verdes, mas falta repetir WebKit em host aprovado e executar o caminho ativo no RC imutável. A evidência não prova produção, UAT, WCAG manual, RUM, backup/DR, gates externos, score, `0/145` ou reauditoria; não houve commit, staging, push ou release.
