# 0600 — Skill Engine Master — CVG

**Objetivo:** organizar skills operacionais do Codex para executar o pipeline CVG com gates, linguagem imperativa, escopo claro e persistência de estado.

## Skills oficiais

| Skill | Usar quando | Não usar quando | Libera |
|---|---|---|---|
| `discovery-engine` | ideia/dor ainda indefinida | Discovery/PRD já aprovado | `prd-engine` após 0090 |
| `prd-engine` | transformar Discovery aprovado em produto | Discovery incompleto | `spec-engine` após 0090 PRD |
| `spec-engine` | transformar PRD aprovado em engenharia | PRD incompleto | `build-engine` após 0190 |
| `build-engine` | executar construção faseada | SPEC ou docs transversais incompletos | AUDIT quando há runtime |
| `audit-engine` | verificar sistema funcional em dev/staging/produção | sistema sem execução observável | remediação/loop |
| `runtime-controller` | manter estado, log, backlog e retomada em qualquer fase | invocação implícita; usar explicitamente | continuidade |

## Contrato de cada skill

Cada pasta tem `SKILL.md` com frontmatter `name`/`description`, contexto, pré-condições, execução, estado, loop e saída. `agents/openai.yaml` informa uso e política de invocação. Skills não escondem decisões de negócio nem criam permissões.

## Gates

```text
DISCOVERY 0090 PASS → PRD
PRD 0090 PASS → SPEC
SPEC 0190 PASS → BUILD
BUILD funcional + evidências → AUDIT
AUDIT + remediação → melhoria contínua
```

O `runtime-controller` verifica `/docs/99_runtime_state.md` antes e depois de todas as transições.

