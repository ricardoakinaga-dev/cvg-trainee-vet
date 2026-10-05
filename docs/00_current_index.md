# Índice corrente de continuidade

Origem: `AUDIT-20261003-T11`. Publicado em 2026-10-03, 13:30 UTC.
Índice verificável: [current-index.json](current-index.json).

O estado atual está exclusivamente no único **CHECKPOINT PREVALENTE** de
[99_runtime_state.md](99_runtime_state.md). Os checkpoints anteriores são
históricos. O status e a próxima ação são lidos desse bloco; este índice não
duplica esses campos nem transforma uma prova focal em aceite global.

| Finalidade                                  | Fonte vigente                                                   |
| ------------------------------------------- | --------------------------------------------------------------- |
| Objetivo e sequência integral               | [Roadmap 60](60_roadmap_repository_remediation_2026-10-03.md)   |
| Tasks, dependências e critérios             | [Backlog 61](61_backlog_repository_remediation_2026-10-03.md)   |
| Ownership e continuidade da execução        | [ExecPlan](../.agent/plans/2026-10-03-remediation-execution.md) |
| Registro cumulativo                         | [Log 20](20_master_execution_log.md)                            |
| Backlog operacional e decisões anteriores   | [Backlog 30](30_backlog_master.md)                              |
| Requisito → SPEC → fonte → teste → artefato | [traceability.yml](../traceability.yml)                         |

A base deste plano é a [auditoria de 2026-10-03](audits/repository-audit-2026-10-03.md),
veredito **REVISE**, medida sobre HEAD
`3cd7bc32751d59d0142e7d1b21a5a5a79a0103ff` com alterações locais anteriores.
Seu [manifesto](audits/repository-audit-2026-10-03-evidence/audit-manifest.json)
permanece congelado: SHA-256
`f90b8e0f95202ae67a692be7c3153fbae15e31ee46aab3cd7caaa3203f8c6a6f`.
Esses são os bytes da auditoria histórica, não uma certificação do código atual.
A barra [AR03-v1](../.agent/plans/2026-10-03-remediation-quality-bar.json)
também tem digest fixado no índice JSON.

A auditoria 0491, a scorecard em `docs/quality`, os planos Triple AAA anteriores
e o plano State of Art preservam sua história e decisões. Seus títulos
“Current” não substituem o checkpoint prevalente ou as tasks do backlog 61.
Decisões humanas anteriores continuam registradas no backlog operacional;
nenhuma publicação clínica ou promoção decorre deste índice.

`pnpm verify:documentation` confere precedência, campos do checkpoint, ponteiros,
identidade e digests da auditoria/barra. A evidência final do candidato será
acrescentada quando G05 for executado; a base histórica não será reidentificada.
