# Implementação das melhorias de prontidão — 2026-10-07

- Task: `PROD-IMPL-20261007`; solicitação direta de Ricardo: "implementar todas as melhorias para alcançar a produção" e salvar a documentação em `docs/`.
- Base: `docs/audits/production-readiness-audit-2026-10-07.md` (27 melhorias M01–M27). Status por item em `docs/30_backlog_master.md` (PROD-M01…M27) e checklist viva em `docs/operations/production-readiness-checklist.md`.
- HEAD de partida `07532c2`; worktree alterado sem commit, push, deploy ou publicação. Nenhuma fonte sob hold das rodadas R01–R63 foi tocada; nenhum produto foi inventado.

## Resultado

Das 27 melhorias, 14 ficaram implementadas e verificadas localmente, 3 já estavam atendidas pelo código existente e foram confirmadas, e 10 não podem ser concluídas no repositório porque dependem de decisão humana, de conteúdo clínico, de ambiente real ou de ação remota autorizada. **O sistema continua NÃO PRONTO para produção**: os P0 de decisão (AAA-001, REM-06, H-CONTENT) e de ambiente (host, CI remota, RPO/RTO reais) seguem abertos.

## O que foi implementado

| # | Entrega | Arquivos | Verificação |
|---|---|---|---|
| M09 | Dependências HIGH corrigidas (`sharp` ≥ 0.35.5, `source-map-js` ≥ 1.2.2) | `package.json` (overrides), `pnpm-lock.yaml` | `pnpm audit --prod --audit-level=high` e `pnpm audit --audit-level=high`: "No known vulnerabilities found" |
| M04 | Artefato implantável: 4 imagens, contexto raiz, Node 22.22/pnpm 10.33 fixados, usuário `node`, healthcheck, sem segredos | `apps/api/Dockerfile` (targets `runtime` e `migrator`), `apps/worker/Dockerfile`, `apps/web/Dockerfile`, `.dockerignore`, `apps/web/next.config.ts` (standalone opt-in) | builds locais EXIT 0: `cvg-api` 426 MB, `cvg-worker` 421 MB, `cvg-web` 387 MB, `cvg-api-migrator` 1,13 GB; contêineres rodam como uid 1000 |
| M08 | Workflow de release: preflight same-SHA (`quality`+`security` success), GHCR, provenance/SBOM, Cosign keyless, digests como artefato; runbook de deploy/rollback; smoke pós-deploy | `.github/workflows/release.yml` (ações fixadas por SHA), `docs/operations/deploy.md`, `scripts/deploy-smoke.mjs`, `tests/integration/deploy-smoke.test.ts` | prettier/eslint/typecheck PASS; 4 testes do smoke PASS; `verify:ci-contract` PASS |
| M05 (parcial) | Stack de referência: PostgreSQL 16, Redis 7, `migrate` e `provision` one-shot, api, worker, web, Caddy TLS, backup, perfil `observability`; imagens de infra fixadas por digest; rede interna sem egress | `deploy/compose.yml`, `deploy/.env.example`, `deploy/caddy/Caddyfile` | `docker compose config` válido; ensaio completo abaixo |
| M06 | Backup horário verificado (`pg_dump` custom + `pg_restore --list`), retenção, logs JSON, dry-run | `deploy/backup/backup.sh`, `tests/integration/backup-script.test.ts`, `docs/runbooks/backup-postgres.md` | 4 testes PASS com ferramentas simuladas; no ensaio do stack produziu dumps verificados a cada 15 s |
| M10 | Collector OTel com redaction, probes blackbox dos health endpoints, 5 regras de alerta com runbook, Alertmanager com webhook, dono e teste obrigatório | `deploy/observability/{otel-collector.yaml,blackbox.yml,prometheus.yml,alert-rules.yml,alertmanager.yml}`, `docs/operations/alerting.md` | configuração validada pelo compose; teste de ponta a ponta exige ambiente (M05) |
| M11 | Procedimento de entrega de convite e recuperação sem provedor de e-mail | `docs/runbooks/invitation-delivery.md` | documental |
| M17 | IA e Qdrant desligados por padrão no lançamento | `deploy/.env.example` | documental; decisão de ligar permanece humana |
| M18 (parcial) | CODEOWNERS com o dono real do repositório | `.github/CODEOWNERS` | regras de branch protection exigem ação remota autorizada |
| M19 | Freshness deixa de contar screenshots gerados de browser como runtime sujo | `scripts/evidence-freshness.mjs`, `tests/integration/evidence-freshness.test.ts` | RED→GREEN; 22 testes PASS |
| M20 | Evidência de máquina e estados de sessão fora do índice | `.gitignore` | `git status` sem os três diretórios |
| M21 | Procedimentos LGPD (retenção, exclusão/anonimização, titular, incidente) | `docs/security/lgpd-procedures.md` | documental; prazos são proposta até decisão de Ricardo |
| M24 | Inventário de segredos, donos, rotação | `docs/security/secrets-management.md` | documental |
| Config | Variáveis opcionais em branco tratadas como ausentes (orquestradores entregam `""`); obrigatórias continuam fail-closed | `packages/config/src/env.ts`, `packages/config/src/env.test.ts` | RED 2 falhas → GREEN 16/16; descoberto no ensaio do stack (api/worker rejeitavam `QDRANT_URL=""`) |

## Confirmado no código existente (sem alteração)

| # | Constatação |
|---|---|
| M22 | `checkRateLimit` em `apps/api/src/server.ts` e `createRateLimitGuard` já negam (429, retry-after 1) quando o backend falha; RF-11 permanece no registro até prova com falha real de PostgreSQL |
| M26 | `pnpm typecheck` já encadeia `tsc -p tsconfig.tests.json` cobrindo `tests/**` (T08) |
| M27 | `.nvmrc` fixa 22.22; o shell desta sessão usava Node 24 e todos os gates passaram com o toolchain fixado; arquivar checkpoints do estado fica como tarefa documental |

## Ensaio do stack completo (compose, imagens locais)

Executado com `deploy/compose.yml` mais override de portas e `.env` sintético; serviços `postgres redis migrate provision api worker web backup`.

| Verificação | Resultado |
|---|---|
| `docker compose up` (postgres, redis, migrate, provision, api, worker, web, backup) | exit 0; `api` e `web` `healthy` pelo healthcheck das imagens |
| `migrate` (one-shot) | 59 migrations aplicadas (`drizzle.__drizzle_migrations` = 59) |
| `provision` (one-shot) | roles `cvg` (migrador), `cvg_app` (`rolsuper=f`, `rolbypassrls=f`), `cvg_admin` (`bypassrls=t`, operação) criados com a matriz auditada de grants |
| `GET /health/ready` pela borda (web → rewrite → api) | 200, `{"status":"READY","dependencies":{"postgres":"UP","qdrant":"DISABLED","ai":"DISABLED"}}` |
| `node scripts/deploy-smoke.mjs` pela borda e dentro da rede interna (`http://api:3000`) | PASS nos dois caminhos (live/ready/dependencies 200) |
| `GET /api/v1/session/current` sem sessão | 401 (autorização server-side preservada) |
| `GET /operations` sem sessão | 307 (proxy do web exige sessão) |
| API publicada diretamente no host | inacessível por desenho (rede `internal` sem egress; só `web`/`caddy` tocam a borda) |
| Rate limit | backend Redis ativo (`[api] rate-limit backend: redis`) |
| Worker | lotes processados continuamente (`worker.batch.completed`, 23 em ~20 s) |
| Backup | 2 dumps verificados em 30 s com intervalo de teste de 15 s, nomeados por UTC, sem `.partial` residual |

Correções descobertas pelo ensaio e aplicadas: build por project references com `contracts` primeiro (testes de pacotes importam `../../contracts/dist`), `migrator` sem bootstrap de pnpm em runtime (rede sem egress), origem interna da API fixada no build do web (`rewrites()` é avaliado em build) e normalização de variáveis opcionais em branco no `@cvg/config`.

## Não implementado nesta rodada e por quê

| # | Motivo | Próximo passo |
|---|---|---|
| M01 AAA-001, M02 REM-06, M03 H-CONTENT | decisões de negócio/clínicas; AGENTS.md proíbe inventar produto | respostas de Ricardo no documento 45, decisão REM-06 e revisão clínica item a item |
| M05 ambientes, M14 RPO/RTO e carga, M15 HTTPS real, M16 aceitação manual | exigem host/provedor, DNS, segredos reais e pessoas | provisionar com `deploy/compose.yml` após AAA-001 D6; executar runbooks |
| M07 CI remota, execução do `release`, branch protection (M18) | ações remotas (push, dispatch, configuração do GitHub) sob H-REMOTE | autorização explícita; `gh` está autenticado nesta máquina |
| M12 T13–T22, M23 T24, M25 T07 | fontes sob hold de rodadas concorrentes no backlog 61; refatoração de páginas com alto risco de conflito | continuar pelo ExecPlan vigente |
| M13 re-congelar candidato | exige commit do worktree atual e reexecução de Stryker/k6/RLS/Redis/staging (horas) | após commit autorizado, `pnpm release:evidence` e `verify:triple-aaa` |

## Verificações finais desta rodada

| Verificação | Resultado |
|---|---|
| `pnpm format:check`, `pnpm lint`, `pnpm typecheck` | PASS |
| `pnpm test:unit` | 2858 PASS / 2 skip (255 arquivos) |
| `pnpm test:coverage` | 3927 PASS / 212 skip (308 arquivos); 91,05 / 86,95 / 95,07 / 92,38 contra pisos 90/85/90/90 |
| `verify:coverage-floor`, `verify:evidence-consistency` | PASS |
| `test:contract`, `test:worker` | PASS |
| `verify:ci-contract`, `verify:secrets`, `verify:migrations`, `verify:traceability`, `verify:architecture`, `verify:routes`, `verify:complexity`, `verify:cycles`, `verify:dead-code`, `verify:security`, `verify:otel`, `verify:release-evidence`, `verify:documentation`, `verify:product-definition`, `verify:exposure` | PASS (os 23 gates de `pnpm verify`, executados individualmente) |
| `git diff --check` | PASS |
| `pnpm audit`, `pnpm audit --prod` | 0 vulnerabilidades |
| `pnpm test:integration` (não-live) | 755 PASS; `triple-aaa-verifier.test.ts` 177/177 em execução isolada (24 timeouts na execução concorrente com as builds Docker, causa ambiental já registrada na R63) |
| `verify:traceability:release` | FAIL esperado: exige worktree limpo até o commit desta rodada |
| Builds Docker | api, migrator, worker, web EXIT 0 |
| Ensaio compose | PASS (tabela acima) |

Não executados: testes live PostgreSQL/Qdrant/Redis, E2E com navegador, Stryker, k6, staging script e workflows remotos. Cada um exige commit do candidato ou ambiente, conforme a seção anterior.
