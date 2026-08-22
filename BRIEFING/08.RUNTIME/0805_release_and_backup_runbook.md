# 0805 — Release imutável, rollback e backup

Este runbook fecha o mecanismo operacional sem fingir que um ambiente produtivo foi executado. Os comandos de deploy e rollback são `DRY_RUN` por padrão; `CVG_RELEASE_EXECUTE=true` só pode ser usado no ambiente aprovado, com os segredos fornecidos pelo secret manager.

## Pré-condições

- `pnpm verify`, `pnpm build`, migrações, E2E real, headers/TLS, traces e restore passam no artefato candidato;
- `CVG_RELEASE_MANIFEST` contém `imageDigest` e `rollbackImageDigest` imutáveis, diferentes e compatíveis com migração `EXPAND_CONTRACT`;
- o manifesto declara `DRAIN_N_MINUS_1_BEFORE_N`, exige gate de mutação
  fechado, limita este corte a `qdrantIdentity=disabled` e define um budget de
  drain compatível com o lote em voo;
- `CVG_RELEASE_MUTATION_GATE_CLOSED=true` atesta que não existe outro ingress,
  publisher ou caminho administrativo de mutação durante a janela. O
  controlador também para o `edge`; a variável isolada não é evidência
  produtiva suficiente;
- IdP externo, domínio HTTPS gerenciado, storage de traces, destino de backup e janela de mudança estão aprovados;
- `CVG_IDENTITY_PROVIDER_PROBE_PRINCIPAL` identifica uma conta técnica sintética do IdP; o valor não é uma conta de participante nem segredo;
- `pnpm ops:verify-production-security` retorna `PASS` no ambiente de release, sem imprimir segredos.
- no Compose HA, o helper `prometheus-secret-init` concluiu com sucesso e o
  Prometheus/Alertmanager estão `healthy` antes de aceitar scrape; a rotação
  do token repete o helper e reinicia somente o Prometheus após validação.

Para uma rotação autorizada no ambiente local/aprovado, sem imprimir o valor:

```bash
docker compose --env-file /etc/cvg/ha.env \
  -f infra/production/docker-compose.ha.yml \
  -p cvg-trainee-vet-ha run --rm --no-deps prometheus-secret-init
docker compose --env-file /etc/cvg/ha.env \
  -f infra/production/docker-compose.ha.yml \
  -p cvg-trainee-vet-ha up -d --no-deps prometheus
```

## Deploy canário

```bash
pnpm ops:verify-release-manifest
CVG_RELEASE_EXECUTE=true \
CVG_RELEASE_MUTATION_GATE_CLOSED=true \
CVG_RELEASE_MANIFEST=/run/secrets/cvg-release-manifest.json \
CVG_COMPOSE_ENV_FILE=/etc/cvg/ha.env \
CVG_COMPOSE_METRICS_ENV_FILE=/etc/cvg/metrics.env \
pnpm ops:deploy-release
```

O controlador primeiro prova que as quatro réplicas estão no digest N-1,
para o `edge`, drena e para os dois workers N-1 e exige `exited/0` antes da
migração. Depois sobe e prova os dois workers N, confirma `api-b` N-1, executa
o canário sintético direto em `api-a` N, promove `api-b` N e somente então
reabre o `edge`. O procedimento cria uma janela de indisponibilidade planejada;
nenhuma falha anterior à reabertura pode expor o release candidato ao tráfego.
No deploy, `ExitCode` diferente de zero, processo ausente ou SIGKILL aborta
antes da migração/promoção.

## Rollback

```bash
CVG_RELEASE_EXECUTE=true \
CVG_RELEASE_MUTATION_GATE_CLOSED=true \
CVG_RELEASE_MANIFEST=/run/secrets/cvg-release-manifest.json \
CVG_COMPOSE_ENV_FILE=/etc/cvg/ha.env \
CVG_COMPOSE_METRICS_ENV_FILE=/etc/cvg/metrics.env \
pnpm ops:rollback-release
```

O rollback para o `edge` e interrompe os dois workers N. Para workers que
estavam ativos no início da tentativa, exige saída `exited/0`; um worker já
falho antes do rollback pode entrar somente no caminho explícito de
recuperação, enquanto processo ausente ou reiniciando falha fechado. Antes de
reintroduzir qualquer worker N-1, o controlador consulta o PostgreSQL dentro do
contêiner e exige zero eventos `PENDING` ou `PROCESSING`. Backlog não é
descartado nem entregue ao consumidor antigo: o rollback aborta e requer drain
por N saudável ou recuperação/quarentena manual. Com quiescência comprovada,
o controlador sobe e prova os dois workers N-1, faz canário de `api-a` N-1,
promove `api-b` N-1 e reabre o `edge` somente após saúde e proveniência. A
migração expandida é preservada; o controlador não executa down/contract.
Migração destrutiva exige procedimento separado, backup íntegro e aprovação
humana.

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

Para verificar um backup já armazenado, fornecer o dump e o manifesto correspondentes, sempre fora do repositório:

```bash
CVG_RESTORE_SOURCE_DATABASE_URL='postgresql://<user>:<password>@<host>:5432/<database>' \
CVG_RESTORE_BACKUP_FILE=/var/backups/cvg/postgres/cvg-backup-<id>.dump \
CVG_RESTORE_BACKUP_MANIFEST=/var/backups/cvg/postgres/cvg-backup-<id>.json \
pnpm exec node scripts/verify-postgres-restore.mjs
```

O verificador recusa manifesto incompleto, nome divergente, tamanho incorreto, SHA-256 divergente, symlink no dump e entradas dentro do repositório; depois restaura em banco descartável e confirma objetos de aplicação. Essa prova de artefato não substitui a medição de RPO/RTO no ambiente produtivo.

O gate de segurança de produção também executa `pnpm ops:verify-identity-provider` internamente. Ele só retorna `PASS` depois de consultar o IdP por HTTPS e confirmar recuperação `AVAILABLE` e MFA `ENABLED`; a ausência de provedor ou qualquer resposta inválida permanece `FAIL`.

## Evidência obrigatória

Registrar release id, digest, migração, canário, health gate, rollback/restore, RPO/RTO medidos, incidentes e próximo passo em `docs/20_master_execution_log.md` e `docs/99_runtime_state.md`. Não registrar credenciais, URLs com senha, dados clínicos ou conteúdo de participantes.
