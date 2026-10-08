# Runbook — backup do PostgreSQL

Alvo aprovado: RPO ≤ 1 h e RTO ≤ 4 h (RNF-015/D-107). Implementação: M06.

## Mecanismo

`deploy/backup/backup.sh` roda no serviço `backup` de `deploy/compose.yml`
(imagem `postgres:16`, mesma major do banco). A cada
`CVG_BACKUP_INTERVAL_SECONDS` (3600):

1. `pg_dump --format=custom --no-owner --no-privileges` para `cvg-<UTC>.dump.partial`;
2. verificação com `pg_restore --list`; falha apaga o parcial e registra `backup.failed`;
3. `mv` atômico para `cvg-<UTC>.dump` e log `backup.completed` com bytes;
4. poda de arquivos `cvg-*.dump` mais antigos que `CVG_BACKUP_RETENTION_DAYS` (14).

Logs são JSON em stdout (`service: cvg-backup`). O script é coberto por
`tests/integration/backup-script.test.ts` com ferramentas simuladas.

## Obrigações operacionais

- Copiar `/backups` para armazenamento fora do host (object storage com
  versionamento e retenção ≥ 30 dias). Backup só no mesmo disco não atende DR.
- Preferir PITR do provedor (WAL contínuo) quando o PostgreSQL for gerenciado;
  o dump horário é o mínimo e também serve como cópia lógica portável.
- Alerta: ausência de `backup.completed` por mais de 2 h deve abrir incidente
  (regra de log no agregador; não existe métrica dedicada).
- Restore de verificação mensal em alvo isolado:
  `docs/runbooks/restore-database.md` e `scripts/verify-postgres-restore.mjs`.
  Registrar duração (RTO medido) no log mestre.

## Teste local sem banco

```bash
CVG_BACKUP_DATABASE_URL=postgresql://x:y@localhost/cvg \
CVG_BACKUP_DIR=/tmp/cvg-backups CVG_BACKUP_ONCE=true CVG_BACKUP_DRY_RUN=true \
sh deploy/backup/backup.sh
```

## Não comprovado nesta rodada

RPO/RTO reais, cópia off-host e restore de produção dependem de ambiente
provisionado (M05/M14).
