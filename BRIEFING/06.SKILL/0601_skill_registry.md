# 0601 — Registro Operacional de Skills

## `discovery-engine`

Cria e valida `00_discovery/0000–0090`. Classifica fato, evidência, hipótese, proposta e pendência. Só libera PRD com validação aprovada.

## `prd-engine`

Cria e valida `01_prd/0010–0090`. Deriva produto sem inventar implementação. Só libera SPEC com PRD aprovado.

## `spec-engine`

Cria e valida `02_spec/0100–0190`. Define arquitetura modular, domínio, contratos, PostgreSQL, Qdrant, IA, testes e operação. Só libera BUILD com 0190 aprovado.

## `build-engine`

Cria `03_build/0300–0302` e executa `PHASE → SPRINT → TASK → TESTE → AUDIT`. Não inicia código sem planejamento, docs 04–08 completos e gate registrado.

## `audit-engine`

Executa `04_audit/0400–0490` com evidência de runtime. Produz aderência PRD/SPEC, análise técnica, gaps, remediação e relatório. Não marca PASS sem evidência.

## `runtime-controller`

Lê/escreve estado, log e backlog. Não pode ser chamado implicitamente neste projeto; a continuidade deve ser explícita para não pular gates.

