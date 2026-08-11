# 0805 — Release imutável, rollback e backup

Este runbook fecha o mecanismo operacional sem fingir que um ambiente produtivo foi executado. Os comandos de deploy e rollback são `DRY_RUN` por padrão; `CVG_RELEASE_EXECUTE=true` só pode ser usado no ambiente aprovado, com os segredos fornecidos pelo secret manager.

## Pré-condições

- `pnpm verify`, `pnpm build`, migrações, E2E real, headers/TLS, traces e restore passam no artefato candidato;
- `CVG_RELEASE_MANIFEST` contém `imageDigest` e `rollbackImageDigest` imutáveis, diferentes e compatíveis com migração `EXPAND_CONTRACT`;
- IdP externo, domínio HTTPS gerenciado, storage de traces, destino de backup e janela de mudança estão aprovados;
- `pnpm ops:verify-production-security` retorna `PASS` no ambiente de release, sem imprimir segredos.

## Deploy canário

```bash
pnpm ops:verify-release-manifest
CVG_RELEASE_EXECUTE=true \
CVG_RELEASE_MANIFEST=/run/secrets/cvg-release-manifest.json \
CVG_COMPOSE_ENV_FILE=/etc/cvg/ha.env \
CVG_COMPOSE_METRICS_ENV_FILE=/etc/cvg/metrics.env \
pnpm ops:deploy-release
```

O controlador executa `pull` do digest, migração expand/contract, `api-a` + `worker-a`, health gate e promoção das demais réplicas. Falha antes da promoção mantém o tráfego no release anterior; falha após promoção exige rollback explícito e registro do incidente.

## Rollback

```bash
CVG_RELEASE_EXECUTE=true \
CVG_RELEASE_MANIFEST=/run/secrets/cvg-release-manifest.json \
CVG_COMPOSE_ENV_FILE=/etc/cvg/ha.env \
CVG_COMPOSE_METRICS_ENV_FILE=/etc/cvg/metrics.env \
pnpm ops:rollback-release
```

Rollback de schema só é permitido quando a migração é compatível. Migração destrutiva exige procedimento separado, backup íntegro e aprovação humana; o controlador nunca sobrescreve PostgreSQL.

## Backup

```bash
CVG_BACKUP_SOURCE_DATABASE_URL='postgresql://<user>:<password>@<host>:5432/<database>' \
CVG_BACKUP_DIRECTORY=/var/backups/cvg/postgres \
pnpm ops:create-postgres-backup
```

O destino deve estar fora do repositório. O job grava `pg_dump --format=custom`, manifesto com SHA-256, tamanho, horário, RPO alvo de uma hora e referência ao verificador de restore. O valor da URL só existe no ambiente/secret manager e nunca deve aparecer em log ou commit.

## Restore drill

```bash
CVG_RUN_LIVE_RESTORE_TESTS=true \
CVG_TEST_DATABASE_URL='postgresql://<user>:<password>@<host>:5432/<database>' \
pnpm test:integration:restore
```

O drill restaura em banco descartável isolado, valida marcador sintético e remove o destino. O resultado local não autoriza produção: RPO ≤1h e RTO ≤4h precisam ser medidos no ambiente declarado e acompanhados de retenção, criptografia, acesso e owner.

## Evidência obrigatória

Registrar release id, digest, migração, canário, health gate, rollback/restore, RPO/RTO medidos, incidentes e próximo passo em `docs/20_master_execution_log.md` e `docs/99_runtime_state.md`. Não registrar credenciais, URLs com senha, dados clínicos ou conteúdo de participantes.
