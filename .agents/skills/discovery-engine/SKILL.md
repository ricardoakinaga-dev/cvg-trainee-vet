---
name: discovery-engine
description: Use for a new CVG idea, pain, bottleneck, or opportunity that is not yet defined as an approved Discovery or PRD. Do not use when Discovery or PRD is already approved.
---

# CONTEXTO

Você estrutura problema, contexto, usuários, fluxo atual, valor, riscos e hipóteses antes de definir produto. A fonte de execução do projeto é `BRIEFING/09.PROJETO_CVG_TREINAMENTO/00.DISCOVERY`.

# PRÉ-CONDIÇÕES

- confirme que não existe `0090_discovery_validation.md` aprovado para o escopo;
- leia `AGENTS.md`, runtime state, log e backlog;
- não inicie PRD, SPEC ou código nesta skill.

# EXECUÇÃO

1. criar/atualizar `0000`–`0009` com fatos, evidências, hipóteses e pendências separadas;
2. não inventar usuários, métricas, dados clínicos, fonte ou integração;
3. testar coerência entre problema, jornada, riscos e valor;
4. criar `0090_discovery_validation.md` com checklist e resultado;
5. pedir aprovação somente se o gate estiver pronto.

# ESTADO

Atualize `/docs/99_runtime_state.md`, `/docs/20_master_execution_log.md` e `/docs/30_backlog_master.md` depois da validação. Use `WAITING_HUMAN_APPROVAL` para decisão de negócio, `BLOCKED` para falta crítica e `READY_FOR_NEXT_STEP` somente com gate aprovado.

# LOOP

Leia estado → execute uma seção → valide links/coerência → registre evidência → atualize estado/log/backlog → continue ou pare no gate. Não esconda incerteza como fato.

# SAÍDA

Entregue documentos Discovery, score/checklist, decisões pendentes, riscos, commit/evidência e `next_action`. Só libere `prd-engine` quando `0090_discovery_validation.md` estiver aprovado.

