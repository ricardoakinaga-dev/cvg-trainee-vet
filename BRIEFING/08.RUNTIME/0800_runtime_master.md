# 0800 — Runtime Master — CVG

**Objetivo:** operar o CVG com configuração segura, health, observabilidade, recuperação e continuidade documentadas.

## Componentes

- `apps/web`: web/SPA, sem segredo e sem regra de autoridade;
- `apps/api`: HTTP, sessão, autorização, casos de uso e health;
- `apps/worker`: outbox, jobs, retry, Qdrant e IA;
- PostgreSQL: fonte transacional;
- Qdrant: índice semântico interno derivado;
- IA: adaptador server-side, assistivo e desligável;
- observabilidade: logs redigidos, métricas, traces e auditoria.

## Estados operacionais

`READY`, `DEGRADED`, `NOT_READY`, `MAINTENANCE`, `ROLLBACK` e `INCIDENT`. PostgreSQL indisponível impede escrita/leitura transacional; Qdrant/IA indisponíveis degradam somente recursos internos assistivos.

## Runbooks obrigatórios

1. deploy/rollback;
2. migração/expand-contract;
3. PostgreSQL backup/restore;
4. Qdrant reconciliação/rebuild;
5. IA timeout/refusal/limite;
6. segredo exposto/rotação;
7. perda/duplicação de resposta;
8. exposição autoral ou acesso cruzado;
9. job preso/dead-letter lógico;
10. acessibilidade/erro de experiência.

Cada runbook deve registrar pré-condição, comandos seguros, validação, rollback, auditoria e próxima ação.

