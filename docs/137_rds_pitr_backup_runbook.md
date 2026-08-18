# Runbook — Backup gerenciado RDS/PITR e DR

> **Objetivo:** migrar a persistência transacional do Compose-Postgres local
> para um PostgreSQL gerenciado (AWS RDS/equivalente) com PITR nativo, e medir
> `RPO≤1h` e `RTO≤4h` no RC. Complementa os scripts locais já existentes
> (`create-postgres-backup.mjs`, `verify-postgres-restore.mjs`), não os substitui.
>
> **Status:** runbook de planejamento/provisionamento. Exige credenciais,
> custo e decisão de provider/região do sponsor. Não declara execução.

## 1. Decisões prévias necessárias (sponsor)

| Decisão | Opções | Impacto |
|---|---|---|
| Provider | AWS RDS / Azure PostgreSQL / GCP Cloud SQL | custo e API de PITR |
| Região/zona | preferível próxima do edge | latência e DR |
| Tamanho | instância + storage (IOPS) | custo e capacidade |
| Multi-AZ | sim/não | RTO e failover |
| Retenção PITR | 7–35 dias (backup window) | janela de restauração |

## 2. Migração do Compose-Postgres para RDS

1. **Provisionar** a instância RDS/equivalente (PostgreSQL 16, para casar com o
   `postgres:16` atual).
2. **Criar** as roles espelhando o split atual:
   - `admin` (supervisor, usado por migração/backup) — `CVG_DB_ADMIN`;
   - `cvg_app` (aplicação, `NOSUPERUSER NOBYPASSRLS`) — `CVG_DB_USER`.
3. **Habilitar** RLS e o split de privilégios (mesmo do `init-app-role.sh`).
4. **Carregar** o schema via `pnpm db:migrate` contra o endpoint do RDS.
5. **Pointar** `DATABASE_URL` do Compose para o host/porta do RDS (rede privada,
   sem expor 5432 publicamente). O serviço `postgres` local sai do HA.

> O RLS/`FORCE RLS` e a role sem `SUPERUSER/BYPASSRLS` continuam obrigatórios
> no RDS (mesma invariante do PostgreSQL local).

## 3. Política de PITR / RPO / RTO

| Métrica | Alvo | Mecanismo |
|---|---|---|
| RPO | ≤ 1h | PITR nativo (WAL archive + snapshots automáticos) |
| RTO | ≤ 4h | restore + promoção Multi-AZ / snapshot |
| Retenção | definida na decisão | backup retention window |

- Configurar janela de backup automática (fora do horário de pico);
- habilitar `point-in-time` recovery;
- testar `restore-to-point-in-time` (não apenas snapshot).

## 4. Reuso dos scripts existentes (não descartar)

Os scripts locais continuam válidos e são **complementares** ao PITR gerenciado:

```bash
# dump lógico periódico (defesa em profundidade), fora do repo:
CVG_BACKUP_SOURCE_DATABASE_URL='postgresql://...@rds-host:5432/cvg' \
CVG_BACKUP_DIRECTORY=/var/backups/cvg/postgres \
pnpm ops:create-postgres-backup

# verificação de um artefato de backup (dump + manifesto + SHA-256):
CVG_RESTORE_SOURCE_DATABASE_URL='postgresql://...@rds-host:5432/cvg' \
CVG_RESTORE_BACKUP_FILE=/var/backups/cvg/postgres/cvg-backup-<id>.dump \
CVG_RESTORE_BACKUP_MANIFEST=/var/backups/cvg/postgres/cvg-backup-<id>.json \
pnpm exec node scripts/verify-postgres-restore.mjs
```

- O dump lógico serve como **camada extra** e teste de integridade de conteúdo;
- o **PITR gerenciado** serve como **camada primária** de point-in-time;
- ambos devem apontar para o mesmo RDS no ambiente aprovado.

## 5. Drills obrigatórios (para fechar DR/RPO/RTO no RC)

1. **Restore point-in-time** a um timestamp anterior, validando invariantes de
   domínio (não apenas "banco sobe").
2. **Failover** Multi-AZ (se habilitado) com medição de RTO.
3. **Dump lógico → restore isolado** via `verify-postgres-restore.mjs`.
4. **DR cross-region** (se aplicável) com evidência de RPO.

Cada drill registra: timestamp, RPO/RTO observados, comandos, e nenhum segredo.

## 6. Evidência e rastreabilidade

- Registrar restore/PITR/RPO/RTO em `docs/20_master_execution_log.md` e
  `docs/99_runtime_state.md`;
- não registrar URL com senha, credencial ou conteúdo de banco;
- a evidência só vale no mesmo RC/SHA do programa Dual 98.

## 7. Segurança e limites

- endpoint RDS em rede privada (VPC/peering), nunca público;
- credenciais em secret manager; rotação documentada;
- audit logging do RDS ligado à telemetria redigida (0803);
- encryption at-rest habilitada (KMS/equivalente) e TLS nas conexões.
