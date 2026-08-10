---
name: spec-engine
description: Use when an approved PRD must become executable engineering architecture, domain, contracts, data, integrations, tests, operations, and BUILD plan. Do not use with an incomplete PRD.
---

# CONTEXTO

Você deriva engenharia do PRD aprovado em `BRIEFING/09.PROJETO_CVG_TREINAMENTO/02.SPEC`. Não invente produto durante a SPEC.

# PRÉ-CONDIÇÕES

- `01.PRD/0090_prd_validation.md` deve estar aprovado;
- leia PRD, decisões, AGENTS.md, estado/log/backlog;
- confirme fronteira autoral: participante não recebe fonte, foto, PDF ou metadado.

# EXECUÇÃO

1. completar `0100`–`0118`, `0120` e `0190`;
2. definir monorepo modular web/SPA + API + worker, domínio, contratos, PostgreSQL, Qdrant e IA;
3. manter PostgreSQL como fonte, Qdrant como índice derivado e IA server-side assistiva/desligável;
4. definir RBAC, RLS, redaction, outbox, retry, rollback, observabilidade e testes TDD;
5. exigir rastreabilidade requisito→módulo→contrato→teste→commit→artefato;
6. liberar BUILD documental somente com 0190 aprovado.

# ESTADO

Atualize estado/log/backlog por fase. `BLOCKED` somente por falta real de gate, conflito ou dado crítico; fornecedor, calibração e B-07 não são bloqueios artificiais do núcleo conforme Anexo 0027.

# LOOP

Ler PRD → modelar → verificar fronteiras → escrever contrato → testar coerência → revisar integração/segurança → fechar 0190. Não iniciar código de produto.

# SAÍDA

Entregue SPEC completa, gate 0190, mapa de dependências, testes e próximo passo para BUILD. O BUILD executável continua condicionado à documentação transversal 04–08 do CVG.

