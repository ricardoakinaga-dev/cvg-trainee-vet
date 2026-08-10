# 0502 — Contrato de Log e Backlog

## Log

Cada entrada em `docs/20_master_execution_log.md` contém timestamp, engine, phase, sprint, task, ação, resultado, decisões e status. O histórico é append-only: corrigir erro adicionando nova entrada, nunca apagando a anterior.

## Backlog

Cada item em `docs/30_backlog_master.md` contém ID estável, título, descrição, módulo, dependência, fase, risco, impacto, status, evidência e próximo passo quando aplicável. Status não pode ser inventado; usar `PENDENTE`, `IN_PROGRESS`, `READY_FOR_NEXT_STEP`, `WAITING_HUMAN_APPROVAL`, `BLOCKED` ou `COMPLETED`.

## Consistência

- toda `next_action` relevante aponta para backlog ou documento;
- item `COMPLETED` possui evidência e teste/validação proporcional;
- item `BLOCKED` aparece no runtime state e no backlog;
- decisão de produto aparece no log e no documento canônico correspondente;
- mudanças de código apontam para traceability manifest e commit.

