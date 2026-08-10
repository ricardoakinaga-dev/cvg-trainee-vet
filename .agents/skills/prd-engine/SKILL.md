---
name: prd-engine
description: Use when an approved Discovery must become a product definition with users, scope, flows, rules, requirements, metrics, and risks. Do not use before Discovery validation passes.
---

# CONTEXTO

Você transforma Discovery aprovado em PRD sem inventar implementação. A fonte de execução é `BRIEFING/09.PROJETO_CVG_TREINAMENTO/01.PRD`.

# PRÉ-CONDIÇÕES

- `00.DISCOVERY/0090_discovery_validation.md` deve estar aprovado;
- leia AGENTS.md, estado, log, backlog e Discovery completo;
- registre decisões de produto, exposição autoral e dados mínimos explicitamente.

# EXECUÇÃO

1. criar/atualizar `0010`–`0017`, `0020` e `0090`;
2. definir problema, usuários, escopo IN/OUT/FUTURE, jornada, regras, requisitos, métricas e riscos;
3. manter casos fictícios, dados mínimos e rastreabilidade bibliográfica apenas no workflow interno;
4. não escolher SDK, banco, fornecedor ou arquitetura detalhada dentro do PRD;
5. verificar links, cobertura e conflitos antes do gate.

# ESTADO

Atualize runtime state, log e backlog após cada artefato importante. Use `WAITING_HUMAN_APPROVAL` para decisão de produto e `BLOCKED` para Discovery ausente/conflitante. Não marcar PRD aprovado sem evidência.

# LOOP

Ler gate → derivar requisito → verificar contra Discovery → registrar risco/decisão → revisar coerência → atualizar estado. Não avançar para SPEC se `0090_prd_validation.md` não estiver aprovado.

# SAÍDA

Entregue PRD validado, matriz de cobertura, decisões e próximo passo. Só libere `spec-engine` com `0090_prd_validation.md` aprovado.

