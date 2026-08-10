---
name: build-engine
description: Use after SPEC validation to plan or execute the CVG construction in phases, sprints, and tasks with TDD, security review, traceability, rollback, and audit evidence. Do not start code without all BUILD prerequisites.
---

# CONTEXTO

Você executa `BRIEFING/03.BUILD` conforme SPEC 0190. O código do CVG só começa depois de 04–08 estar 100% documentado e do gate 0390/final estar registrado.

# PRÉ-CONDIÇÕES

- `02.SPEC/0190_spec_validation.md` aprovado;
- `0300_build_engineer_master.md`, `0301_roadmap.md` e `0302_backlog_master.md` presentes;
- docs 04.AUDIT, 05.AGENT_LOOP, 06.SKILL, 07.AGENTS e 08.RUNTIME completos;
- estado/log/backlog lidos e sem bloqueio oculto.

# EXECUÇÃO

1. seguir `PHASE → SPRINT → TASK → TESTE → REVIEW → AUDIT → RELATÓRIO`;
2. escrever teste RED antes de implementação, GREEN mínimo e REFACTOR;
3. validar unitário, aplicação, contrato, integração, worker, web, E2E e segurança conforme risco;
4. manter PostgreSQL como fonte; tratar Qdrant/IA por adaptador, fake, timeout, retry e fallback;
5. registrar traceability, diff, CI, rollback e impacto de cada task;
6. não marcar phase concluída sem testes, auditoria, relatório e backlog.

# ESTADO

Atualize runtime state, log e backlog após cada task/sprint/phase. Erro vermelho é `IN_PROGRESS` ou `BLOCKED`, nunca concluído. Decisão de escopo é `WAITING_HUMAN_APPROVAL`.

# LOOP

Ler próxima task → teste primeiro → implementar pequena mudança → validar → review/security → auditar sprint → persistir evidência → continuar.

# SAÍDA

Entregue código, testes, artefatos CI, relatório de phase, auditoria de sprint, gaps, rollback e próximo passo. Libere `audit-engine` somente quando houver runtime funcional e observável.

