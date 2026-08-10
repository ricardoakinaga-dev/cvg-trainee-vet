# 0802 — Deploy, Health e Recovery

## Deploy

1. validar CI, cobertura, segurança, contrato e migração;
2. construir artefato imutável com SHA/digest;
3. aplicar migração compatível;
4. iniciar API/worker com healthchecks;
5. executar smoke de login/leitura/atividade sintética;
6. observar erros/latência/outbox por janela definida;
7. registrar release no log e atualizar runtime state.

## Health

- `/health/live`: processo;
- `/health/ready`: PostgreSQL, migração e configuração essencial;
- `/health/dependencies`: estado redigido de PostgreSQL/Qdrant/IA/outbox;
- Qdrant/IA falhos: `DEGRADED`;
- PostgreSQL falho: `NOT_READY`;
- nenhuma resposta de health inclui segredo, URL sensível, prompt ou fonte.

## Recovery

- API: rollback para artefato compatível;
- PostgreSQL: restore isolado e validação de contagem/hash; RPO ≤1h/RTO ≤4h;
- Qdrant: apagar/recriar coleção versionada e reindexar desde PostgreSQL;
- IA: desligar feature flag e seguir fluxo manual;
- outbox: lease/retry/replay idempotente;
- Qdrant: executar `pnpm reconcile:qdrant` quando houver divergência/index lag; a origem é PostgreSQL e a saída contém somente contadores técnicos (`expected`, `upserted`, `removed`);
- conteúdo: retirar versão e preservar histórico;
- exposição: bloquear projeção, registrar incidente, redigir evidência e revisar segurança.
