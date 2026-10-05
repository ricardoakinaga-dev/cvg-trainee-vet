# Disaster Recovery

Princípios: PostgreSQL é a verdade (restore = reconstruir tudo o mais);
Qdrant é derivado (rebuild via `reconcile:qdrant`); IA é opcional (desligar não
quebra o núcleo). Os alvos aprovados pelo PRD/RNF-015 e D-107 são RPO ≤1 hora
e RTO ≤4 horas. AAA-001 continua sendo gate para demonstrar capacidade
operacional e qualquer uso em produção; não altera esses alvos. Os procedimentos
abaixo usam somente ambiente descartável local e dados sintéticos.

## Perda total do PostgreSQL

- Detection: `/health/ready` 503 + alerta `postgres_not_ready` (critical).
- Containment: parar worker (evita outbox órfão), API segue servindo 503 explícito.
- Recovery: identificar versão do schema e journal Drizzle contidos no dump;
  validar compatibilidade com a versão-alvo da aplicação; provisionar uma
  instância PostgreSQL 16 vazia e isolada; para dump custom, executar
  `pg_restore --list` e decodificar o archive para arquivo SQL temporário antes
  de criar o banco de destino; restaurar o dump compatível com
  `pg_restore --exit-on-error --no-owner --no-privileges`; aplicar somente as
  migrations posteriores com `pnpm db:migrate`; executar
  `pnpm verify:migrations`, validar constraints, RLS, roles/owners e checks de
  integridade antes de habilitar writes. Nunca aplicar `head` antes de restaurar
  um dump antigo: a restauração pode substituir o schema e o journal de
  migrations. Se formato, versão ou journal forem desconhecidos/incompatíveis,
  abortar antes dos writes e restaurar em destino descartável para investigação.
- Evidência local: `scripts/verify-postgres-restore.mjs` usa dump custom de
  PostgreSQL, cria destino com UUID, restaura o snapshot com `--exit-on-error`
  e valida marcador sintético para o schema atual. O complemento
  `pnpm verify:restore-migrations` testa uma fixture histórica, com snapshot
  em `0053_aaa_content_integrity`, restore e aplicação de
  `0054_aaa_content_indexer_service` até `0057_curriculum_publication_provenance`
  em PostgreSQL 16 descartável; compara hashes/timestamps do journal,
  aplica todas as migrations pendentes e verifica marcador, head, metadados e
  predicados das quatro policies, RLS, owners das duas tabelas-alvo e conexão
  por socket Unix privado sem listener TCP. O preflight rejeita uma cópia
  sintética com magic header corrompido e confirma que o banco-alvo ainda não
  foi criado. A policy de `content_versions`
  vincula `status='PUBLICADO'` diretamente à linha protegida; nas policies de
  `ai_suggestions`, os vínculos `content_id`/`version` e o status publicado
  precisam estar na mesma subconsulta da versão associada. A origem histórica precisa do
  principal local privilegiado `postgres`: um role sem `BYPASSRLS` reproduziu recursão em
  `learning_activities` durante a migration `0030`. Após o restore, a sequência
  `0054`–`0057` passa com o role dedicado `NOSUPERUSER NOBYPASSRLS`. A comparação de catálogo
  verifica tipos/defaults/nulabilidade das colunas, constraints validadas e
  índices válidos/prontos entre a origem e as tabelas restauradas
  `content_versions`/`ai_suggestions`; testes rejeitam diferenças estruturais
  sintéticas e metadados ausentes/inválidos. Uma segunda archive sintética,
  com coluna extra e journal `0053` válido, passa pelo preflight e é rejeitada
  após restore e aplicação das migrations pendentes (`semanticSnapshotMismatchRejected=true`).
  No alvo isolado, o drill também aplica a matriz do provisionador local de CI
  e confirma grants efetivos, ausência de ownership/capacidades administrativas
  e default-deny para tabela nova. A medição técnica R47 registrou
  `verificationDurationMs=3368`, não RTO; [stdout original](../../.agent/artifacts/remediation-20261003/r47-restore-comparator/native-2026-10-04T07-29-22.392Z-65395e52-c3cc-4afa-bc1f-a4cf60a6f20d/stdout.log)
  e [resumo com teardown e hashes](../../.agent/artifacts/remediation-20261003/r47-restore-comparator/native-2026-10-04T07-29-22.392Z-65395e52-c3cc-4afa-bc1f-a4cf60a6f20d/summary.json).
  Essa referência é histórica e deve ser substituída por nova evidência para aceitar
  um candidato alterado. O valor anterior de 2226 ms pertence ao drill histórico
  limitado à migration 0054. O teste cobre grants somente do
  fixture local; ainda não valida grants do ambiente de produção, constraints
  de todas as tabelas, incompatibilidades arbitrárias, backups externos ou
  cumprimento operacional de RPO/RTO.
  `pnpm verify:migrations`
  ainda compara apenas os arquivos SQL locais com o journal
  do repositório; o novo drill consulta o journal persistido do destino.
- Verification: `/health/ready` 200, live integration, E2E real.
- Post-incident: registrar RTO medido, causa, gap de backup.

## Corrupção de dados

- Detection: integrity checks / live tests vermelhos.
- Containment: congelar writes (read-only se possível), preservar snapshot.
- Recovery: restore isolado + reconciliação; nunca editar produção à mão.
- Verification: consistency checks + auditoria de divergência.

## Perda do Qdrant

- Detection: `/health/dependencies` DEGRADED + `qdrant_degraded` (warning).
- Containment: nenhuma — núcleo segue (índice é opcional por desenho).
- Recovery: recriar coleção + `pnpm reconcile:qdrant` (advisory lock, orphan cleanup).
- Verification: contagem reconciliada, zero órfãos, readiness volta a UP/DEGRADED conforme policy.

## Worker failure / backlog

- Detection: `worker_jobs`/`dead_letters` + SLO worker (quando instrumentado).
- Containment: drenar fila, inspecionar dead-letter (poison messages isoladas).
- Recovery: replay idempotente (lease/fencing impedem duplo efeito).
- Verification: backlog zerado sem duplicação de efeitos externos.

## Bad deploy

- Detection: readiness falha, 5xx elevado, E2E pós-deploy vermelho.
- Containment: rollback ao SHA anterior (migrations são forward-only: rollback =
  forward-fix, nunca down invisível).
- Recovery: re-deploy do bundle com evidence (commit+digest+provenance).
- Verification: release gate completo no SHA restaurado.

## Compromised credential

- Detection: audit trail anômalo, alerta de auth failures.
- Containment: revogar sessões/tokens afetados, rodar segredos (fora do Git).
- Recovery: reemitir, revalidar ACLs/owners, revisar `verify:secrets`.
- Verification: matriz de privilégios + live negativo; ver runbook dedicado.

## Provider outage (IA/embeddings)

- Detection: timeout/quota + fallback seguro logado.
- Containment: `AI_ENABLED=false` (caminho degradado explícito).
- Recovery: reativar após health do provider; reprocessar fila pendente.
- Verification: evals + schema validation do output; nenhuma decisão automática
  da IA é aceita retroativamente.
