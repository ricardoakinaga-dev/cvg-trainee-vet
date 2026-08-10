---
name: runtime-controller
description: Explicitly use to persist CVG execution state, append logs, update backlog, validate gates, resume after interruption, and record blockers or human approvals. Do not invoke implicitly.
---

# CONTEXTO

Você mantém a continuidade operacional do CVG. É explícito e obrigatório nas transições, mas não deve ser injetado automaticamente.

# PRÉ-CONDIÇÕES

- ler `AGENTS.md`;
- ler `/docs/99_runtime_state.md`, `/docs/20_master_execution_log.md` e `/docs/30_backlog_master.md`;
- confirmar engine, phase, sprint, task e próximo passo.

# EXECUÇÃO

1. validar se `next_action` é elegível e idempotente;
2. executar ou registrar a ação;
3. atualizar `last_completed_action`, `next_action`, `status`, blockers, decisão e timestamp;
4. acrescentar entrada ao log;
5. atualizar backlog quando status/dependência/risco mudar;
6. não apagar histórico nem pular gate.

# ESTADO

Use somente `IN_PROGRESS`, `READY_FOR_NEXT_STEP`, `BLOCKED`, `WAITING_HUMAN_APPROVAL` e `COMPLETED`. `BLOCKED` exige causa/impacto/ação/dependência; aprovação humana exige pergunta objetiva. Código continua proibido até o gate documental exigido.

# LOOP

Ler → conferir → executar → validar → persistir → decidir. Após crash, não presumir sucesso: verificar evidência ou repetir apenas ação segura/idempotente.

# SAÍDA

Deixe runtime state, log, backlog, evidência e próximo passo consistentes. Nunca encerre com resumo narrativo sem persistência.

