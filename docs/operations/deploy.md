# Deploy — artefato imutável, migração, smoke e rollback

Implementa o contrato `BRIEFING/08.RUNTIME/0802_deploy_health_recovery.md`
(M04/M05/M08 da auditoria de 2026-10-07). Nada aqui autoriza produção: o gate
humano AAA-001 e os critérios de `docs/operations/production-readiness-checklist.md`
continuam obrigatórios.

## Artefatos

| Imagem | Dockerfile | Alvo | Processo |
|---|---|---|---|
| `cvg-api` | `apps/api/Dockerfile` | `runtime` | `node dist/main.js`, porta 3000, usuário `node`, healthcheck `/health/live` |
| `cvg-api-migrator` | `apps/api/Dockerfile` | `migrator` | `drizzle-kit migrate` (forward-only) e `scripts/provision-ci-postgres.mjs` (roles/grants, psql); sem egress em runtime |
| `cvg-worker` | `apps/worker/Dockerfile` | `runtime` | `node dist/main.js` (outbox, leases, reconcile) |
| `cvg-web` | `apps/web/Dockerfile` | `runtime` | Next standalone, porta 3100, `CVG_API_INTERNAL_URL` para o rewrite |

Regras:

- contexto de build é a raiz do repositório; `.dockerignore` exclui git, docs,
  evidências, `node_modules`, `dist`, `.next` e qualquer `.env`;
- Node fixado em `22.22.0` e pnpm `10.33.0` via corepack, iguais ao contrato de CI;
- API e worker são compilados por project references (`tsc -b apps/<app>/tsconfig.json`)
  e empacotados com `pnpm deploy --legacy --prod`, sem devDependencies;
- web usa `output: "standalone"` somente quando `CVG_NEXT_STANDALONE=true` no build;
  desenvolvimento, testes e `next start` não mudam;
- as imagens rodam como usuário não root e não contêm segredo algum.

Build local de verificação:

```bash
docker build -f apps/api/Dockerfile -t cvg-api:local .
docker build -f apps/api/Dockerfile --target migrator -t cvg-api-migrator:local .
docker build -f apps/worker/Dockerfile -t cvg-worker:local .
docker build -f apps/web/Dockerfile -t cvg-web:local .
```

## Publicação (`.github/workflows/release.yml`)

Disparo por tag `v*` ou manual. O job `preflight` exige run `success` dos
workflows `quality` e `security` no mesmo SHA; depois cada imagem é construída
a partir do SHA verificado, publicada em `ghcr.io/<owner>/<imagem>` com tags
`sha-<sha>` e `<tag>`, com provenance e SBOM do BuildKit, assinada com Cosign
keyless (OIDC) e o digest é gravado como artefato `release-images-<imagem>`.
Nenhuma chave privada existe no repositório.

Verificação do consumidor antes de implantar:

```bash
cosign verify ghcr.io/<owner>/cvg-api@sha256:<digest> \
  --certificate-identity-regexp 'https://github.com/<owner>/cvg-trainee-vet/.github/workflows/release.yml@refs/tags/v.*' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

## Stack de referência (`deploy/compose.yml`)

Serviços: `postgres` 16 (volume), `redis` 7 (AOF), `migrate` (one-shot),
`api`, `worker`, `web`, `caddy` (TLS automático, HSTS), `backup` (pg_dump
verificado por hora) e, no perfil `observability`, `otel-collector`,
`blackbox`, `prometheus` e `alertmanager`. Rede `internal` sem saída; só
`caddy` e `web` tocam a rede `edge`. Todas as imagens de infraestrutura estão
fixadas por digest.

```bash
cp deploy/.env.example deploy/.env      # preencher segredos; nunca commitar
docker compose --env-file deploy/.env -f deploy/compose.yml pull
docker compose --env-file deploy/.env -f deploy/compose.yml up -d
node scripts/deploy-smoke.mjs --base-url https://<host>
```

Roles PostgreSQL: o container cria o migrador `cvg`; o role de runtime
`cvg_app` (sem `SUPERUSER`/`BYPASSRLS`, grants mínimos) é criado uma vez com
`node scripts/provision-ci-postgres.mjs` apontado para o banco do ambiente
(`CVG_MIGRATION_DATABASE_URL`, `DATABASE_URL`, `CVG_TEST_ADMIN_DATABASE_URL`
podem apontar para o mesmo host com senhas distintas); o script é idempotente
e é o mesmo validado em CI e no drill de restore.

## Procedimento de release (0802, passos 1–7)

1. CI verde no SHA (`quality`, `security`; `candidate` para promoção AAA).
2. Tag `vX.Y.Z` → workflow `release` publica e assina as quatro imagens.
3. No host: `CVG_IMAGE_TAG=vX.Y.Z` em `deploy/.env`; `docker compose pull`.
4. `docker compose up -d migrate` — aplica apenas migrations pendentes com o
   role migrador; falha fecha o deploy (API antiga continua servindo).
5. `docker compose up -d api worker web` — a API só recebe tráfego quando o
   healthcheck interno passa.
6. `node scripts/deploy-smoke.mjs --base-url https://<host>` — `live`,
   `ready` e `dependencies` precisam responder 200; qualquer falha → rollback.
7. Observar 30 minutos: alertas (`docs/operations/alerting.md`), erros 5xx,
   latência e backlog do worker; registrar commit, digests, migration head e
   configuração não secreta em `docs/20_master_execution_log.md` e atualizar
   `docs/99_runtime_state.md`.

## Rollback

- Aplicação: definir `CVG_IMAGE_TAG` (ou os digests) da release anterior e
  `docker compose up -d api worker web`. Imagens anteriores continuam no
  registry; nunca reconstruir para voltar.
- Migrations são forward-only (`verify:migrations`). Uma release só pode ser
  revertida para uma versão compatível com o schema atual; migrations que
  quebram compatibilidade exigem expand/contract em duas releases.
- Dados: `docs/runbooks/restore-database.md` e `docs/runbooks/backup-postgres.md`.
- Registrar o rollback no log com causa e versão restaurada
  (`docs/runbooks/failed-deploy.md`).

## O que ainda não existe

- host/VM ou provedor contratado, DNS e certificado reais (M05);
- execução do workflow `release` em CI remota (H-REMOTE);
- medição de RPO/RTO em homologação (M14) e teste da topologia HTTPS com
  `TRUSTED_PROXIES` (M15).
