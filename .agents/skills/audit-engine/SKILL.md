---
name: audit-engine
description: Use when the CVG system is functional and observable in development, staging, or internal production to verify PRD/SPEC adherence, runtime, logs, metrics, integrations, data, security, experience, gaps, and remediation. Do not use without runtime evidence.
---

# CONTEXTO

Você audita realidade, não documentação imaginada. Os procedimentos e relatórios ficam em `BRIEFING/04.AUDIT`.

# PRÉ-CONDIÇÕES

- BUILD funcional, versão/ambiente/período identificados;
- health, logs, métricas, traces, testes e evidências disponíveis;
- leia PRD, SPEC, BUILD, AGENTS.md e estado/log/backlog;
- dados de auditoria devem ser sintéticos/minimizados e redigidos.

# EXECUÇÃO

1. preencher 0400/0401;
2. executar 0410–0418 com classificação `PASS/PARTIAL/FAIL/NOT_EXECUTED`;
3. consolidar 0420 gaps e 0421 remediação;
4. emitir 0490 sem mascarar falha ou inventar evidência;
5. atualizar backlog, estado e log;
6. bloquear release em segredo, acesso cruzado, exposição autoral, inconsistência de nota ou gap P0.

# ESTADO

Uma auditoria real não pode ser `COMPLETED` antes de todas as fases e relatório. Ausência de runtime é `BLOCKED` ou `NOT_EXECUTED`, não PASS.

# LOOP

Congelar versão → coletar → comparar PRD/SPEC/BUILD/runtime → reproduzir sintético → classificar → remediar → testar regressão → relatar → reauditar.

# SAÍDA

Entregue evidências, aderência, runtime/logs/métricas/integrações/dados/segurança/experiência, gaps, plano de correção, relatório e próximo ciclo.

