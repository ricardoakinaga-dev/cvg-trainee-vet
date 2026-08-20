# 0517 — Backlog executivo Dual 98

**Programa:** `BRIEFING/03.BUILD/0308_dual_98_executive_program.md`
**Roadmap:** `BRIEFING/04.AUDIT/0516_dual_98_roadmap.md`
**Assessment corrente:** `docs/133_dual_98_post_hardening_assessment_2026-08-16.md`
**Assessment pré-hardening:** `docs/131_dual_98_gap_assessment_2026-08-16.md`
**Evidência local:** `docs/132_dual_98_local_hardening_evidence_2026-08-16.md`
**Baselines congeladas:** maturidade `83,24/100`; qualidade `64,20/100`; `0/32` células ≥98; `0/145` cadeias
**Disposição:** `PILOT_BLOCKED`

## 1. Regras

- `U98-*` é a única coordenação executiva ativa; `U95-*`, `ENT95-*`, `AUD-CQ-*` e `BLK-*` ficam como aliases/evidências de origem;
- `COMPLETED` fecha apenas a task e sua evidência, nunca uma nota;
- código exige RED→GREEN→REFACTOR, review de código e review de segurança proporcional;
- prova final identifica RC, SHA, digest, ambiente, dados sintéticos, comando, resultado, validade e owner;
- `BLOCKED` registra dependência; `WAITING_HUMAN_APPROVAL` não é substituído por inferência técnica;
- nenhum skip, mock, rehearsal ou N/A fecha uma propriedade aplicável sem aprovação;
- as notas só mudam em U98-603/U98-604.

## 2. F98-0 — verdade e mobilização

| ID | Pri | Estado | Owner | Entrega/dependência | Teste/critério de pronto |
|---|---|---|---|---|---|
| `U98-000` | P0 | COMPLETED | ENG/Ricardo | assessment, programa, roadmap, backlog e registry Dual 98 | quatro artefatos ligados; Dual 95 marcado absorvido; nenhuma nota promovida |
| `U98-001` | P0 | COMPLETED | ENG | reconciliar corte `299` e delta documental do plano | pré/plano e pós/plano explicitados; nenhum arquivo do usuário apagado |
| `U98-002` | P0 | WAITING_HUMAN_APPROVAL | Ricardo/AUD-M/AUD-Q | congelar regra de 98 e validade de evidência | 32 critérios, P0/P1/P2, duas execuções e identidade de RC assinados |
| `U98-003` | P0 | WAITING_HUMAN_APPROVAL | Ricardo | aprovar T0, equipe, orçamento, ambientes, reviewers, coorte e auditores | owners/capacidade/janelas/autoridades registrados |
| `U98-004` | P1 | READY_FOR_NEXT_STEP | ENG/AUD | mapear U95-101–114 às 32 células e reruns | cada evidência com célula, ambiente, validade, gap e comando |
| `U98-005` | P0 | IN_PROGRESS | ENG/AUD | reconciliar o worktree pós-hardening a partir do snapshot `303` | inventário final por lote/owner/risco/dados/segredos, zero staged e nenhum arquivo do usuário apagado |

## 3. F98-1 — fechamento técnico local

| ID | Pri | Estado | Owner | Entrega/origem | Teste/critério de pronto |
|---|---|---|---|---|---|
| `U98-102` | P0 | IN_PROGRESS | ENG/QA | fechar U95-108 | `87/87` com success/error/denied/conflict ou N/A aprovado; atual `11/87` completo |
| `U98-103` | P1 | IN_PROGRESS | ENG | fechar U95-109 | zero função >100; zero crítica >50; restantes >50 revisadas; atual `152/21/128`, com `22` ≥100 |
| `U98-104` | P0 | IN_PROGRESS | QA | coverage/mutation/skips/flakes | pisos de `0308`; mutation crítico ≥90%; `19` skips governados e `20/20` runs; thresholds por camada, inclusive worker |
| `U98-105` | P0 | BLOCKED | PLATFORM/QA | WebKit e E2E ativo cross-browser | host aprovado com `libavif16`; quatro projetos e browser→API→DB no RC |
| `U98-106` | P0 | READY_FOR_NEXT_STEP | ENG/SRE | fault/crash/replay/Qdrant/IA | zero hang/unhandled/write parcial; DLQ/rebuild/fallback determinísticos e observáveis |
| `U98-107` | P0 | IN_PROGRESS | SEC/ENG | fechar `D98-RH01` scanner | todos os candidatos sensíveis; sem bypass genérico; unreadable/oversize/binary classificados fail-closed; testes em repo temporário para worktree/index/history |
| `U98-108` | P0 | IN_PROGRESS | ENG/DBA/SEC | fechar idempotência/0030 em HA | namespace e entropia; vencedor confirmado; DB clock/cleanup bounded; legado migrado/rejeitado; role RLS; corrida/TTL/replay/rollback PostgreSQL |
| `U98-109` | P0 | IN_PROGRESS | ENG/SEC/CLINICAL | fechar `D98-RH05` | toda decisão clínica revalida conta/papel/escopo corrente na tx; suspensão/rotação/reaprovação/fault live; sem ID estático decisório |
| `U98-110` | P0 | IN_PROGRESS | SEC/ENG | fechar `D98-RH02`, senha e sessão | current-password e senha diferente no use case; generation/lock serializa troca/rotação/revogação; teste PostgreSQL concorrente; absolute expiry |
| `U98-111` | P0 | IN_PROGRESS | SRE/ENG/DBA | fechar `D98-RH03` worker readiness | heartbeat/freshness + claim/lease/ack/cleanup na outbox real; falhas SQL/permissão; probes consecutivos A/B |
| `U98-112` | P0 | IN_PROGRESS | SRE/ENG | fechar `D98-RH04` observabilidade | API+worker down/absent, AM e dead-man; PromQL protegido; rules carregadas/firing no runtime; rota notify→ack→resolve externa |
| `U98-113` | P1 | IN_PROGRESS | ENG/SEC | diagnostics, convite e boundary | catálogo authz alinhado ao handler; diagnostics limitado/cacheado; convite sem segredo em query/log e métricas fail-closed |
| `U98-114` | P0 | BLOCKED | AUD independente | preauditoria local das 32 células | U98-102–113/115–117 verdes; zero high/P1 local; externos classificados `NOT_EXECUTED`; sem exigir RC |
| `U98-115` | P1 | READY_FOR_NEXT_STEP | ENG/REVIEW | type safety e schemas | zero `any`, double cast ou assertion insegura em boundaries; schemas canônicos, unions exaustivas e type tests |
| `U98-116` | P1 | READY_FOR_NEXT_STEP | ENG/QA | assurance integral da superfície API | 100% rota ligada a schema/authz/erro/telemetria; negativos, fuzz, compatibilidade e zero órfão |
| `U98-117` | P0 | READY_FOR_NEXT_STEP | ENG/RELEASE/QA | fechar `D98-RH06` compatibilidade N/N-1 | expand/contract ou drain/feature gate de mutações; matriz API antiga/nova; canário e rollback sem violar invariantes |

## 4. F98-2 — RC-alpha e supply chain

| ID | Pri | Estado | Owner | Entrega/dependência | Teste/critério de pronto |
|---|---|---|---|---|---|
| `U98-201` | P0 | WAITING_HUMAN_APPROVAL | Ricardo/RELEASE | aprovar lotes e commits intencionais | review de diff/segurança/dados; worktree limpo; SHA alcançável |
| `U98-101` | P0 | BLOCKED | RELEASE/SRE | fechar U95-107 após U98-201 | duas imagens/SHA distintos e alcançáveis; canário/rollback API+worker; attestation; sem rehearsal exception |
| `U98-202` | P0 | BLOCKED | RELEASE/SEC | gerar RC-alpha | U98-201; image digest, SBOM, assinatura, attestation, manifest, migration/content/config hashes |
| `U98-203` | P0 | BLOCKED | RELEASE/SRE/QA | executar RC-alpha | U98-202; CI local limpa, migrations, E2E ativo, probes, alerts, restore, canário e rollback distinto |
| `U98-204` | P0 | BLOCKED | AUD/RELEASE | evidence pack alpha | U98-203; content-addressed, redigido, sem drift e reexecutado por reviewer diferente |

## 5. F98-3 — fundação externa

| ID | Pri | Estado | Owner | Entrega/dependência | Teste/critério de pronto |
|---|---|---|---|---|---|
| `U98-301` | P0 | WAITING_HUMAN_APPROVAL | PLATFORM/RELEASE | CI, registry, CD e retenção | clean checkout no SHA verde duas vezes; artefatos assinados retidos; deploy/rollback alvo |
| `U98-302` | P0 | WAITING_HUMAN_APPROVAL | SEC/PLATFORM | IdP/MFA/recovery/step-up, DNS/TLS | positivos/negativos/rotação/revogação; TLS gerenciado e expiry monitorado |
| `U98-303` | P0 | WAITING_HUMAN_APPROVAL | SRE/SEC | telemetria, RBAC, retenção e on-call | trace/log/metric correlacionados; loss-of-signal; duas rotas fire→notify→ack→resolve |
| `U98-304` | P0 | WAITING_HUMAN_APPROVAL | DBA/SRE | offsite/PITR/restore/RPO/RTO/DR | dois restores isolados; `RPO≤1h`, `RTO≤4h`; runbook exercitado |
| `U98-305` | P0 | WAITING_HUMAN_APPROVAL | SRE | multi-host/capacity/soak/failover | failure domains reais; saturação e falhas de nó/zona; soak ≥24h; SLO aprovado |
| `U98-306` | P0 | BLOCKED | AUD/SRE | fechar `G98-3` | U98-301–305 no mesmo RC/ambiente, sem fixture ou dry-run substitutivo |

## 6. F98-4 — produto e clínica

| ID | Pri | Estado | Owner | Entrega/dependência | Teste/critério de pronto |
|---|---|---|---|---|---|
| `U98-401` | P0 | WAITING_HUMAN_APPROVAL | CLINICAL | calibrar 25 itens | dupla revisão, divergência adjudicada e threshold/rework aprovado |
| `U98-402` | P0 | WAITING_HUMAN_APPROVAL | CLINICAL | revisar fila item a item | U98-401/capacidade; decisão auditável; throughput/rework medidos; sem bulk/IA |
| `U98-403` | P0 | IN_PROGRESS | PRODUCT/CLINICAL | completar 24/96/B-07 | inventário, versão, preflight e QA; publicação continua gated |
| `U98-404` | P0 | IN_PROGRESS | PRODUCT/ENG | completar jornada/lifecycle/métricas | diagnóstico→retenção, correção, recurso e autoria por papel; PRD mensurado |
| `U98-405` | P0 | READY_FOR_NEXT_STEP | CLINICAL/QA | adjudicação e QA secundário | amostra independente sem erro material; trilha e segregação verificadas |
| `U98-406` | P0 | BLOCKED | CLINICAL/PRODUCT | fechar `G98-4` | U98-402–405; fila liberável zero e aceite de produto/clínica |

## 7. F98-5 — RC final, aceitação e resiliência

| ID | Pri | Estado | Owner | Entrega/dependência | Teste/critério de pronto |
|---|---|---|---|---|---|
| `U98-501` | P0 | BLOCKED | RELEASE | congelar RC final | G98-0–4; conteúdo/migrations/config/artefatos imutáveis; nenhuma alteração posterior |
| `U98-502` | P0 | WAITING_HUMAN_APPROVAL | UX/QA | UAT por papel/turno/dispositivo | 100% tarefas críticas e ≥98% total; falhas/retomada; zero severo |
| `U98-503` | P0 | WAITING_HUMAN_APPROVAL | UX/A11Y | WCAG/SR/RUM | WCAG 2.2 AA manual; teclado/SR/zoom; Vitals p75 dentro de `0308` |
| `U98-504` | P0 | WAITING_HUMAN_APPROVAL | SEC | threat/privacy/SAST/SCA/DAST/pentest | zero P0/P1 e zero P2 material não aceito; correções revalidadas |
| `U98-505` | P0 | BLOCKED | SRE/DBA | soak/failover/restore/DR final | duas rodadas; ≥24h; SLO, RPO/RTO e invariantes sem perda |
| `U98-506` | P1 | WAITING_HUMAN_APPROVAL | Ricardo/CLINICAL | piloto controlado/eficácia | coorte, consentimento/retirada, monitoramento e critérios éticos aprovados |
| `U98-507` | P0 | BLOCKED | AUD | fechar `G98-5` | U98-501–506 aplicáveis; zero finding bloqueante e aceites assinados |

## 8. F98-6 — proveniência, auditoria e decisão

| ID | Pri | Estado | Owner | Entrega/dependência | Teste/critério de pronto |
|---|---|---|---|---|---|
| `U98-601` | P0 | BLOCKED | ENG/AUD | completar rastreabilidade | U98-501; `145/145` requisito→SPEC→task→código→teste→commit→digest→artefato |
| `U98-602` | P0 | BLOCKED | AUD/RELEASE | pacote final e segunda execução | U98-601; zero link/drift; retenção/validade; auditor reproduz todos os gates |
| `U98-603` | P0 | WAITING_HUMAN_APPROVAL | AUD-M | reauditoria de maturidade | mesmo RC; `16/16 ≥98`; relatório assinado; sem compensação por média |
| `U98-604` | P0 | WAITING_HUMAN_APPROVAL | AUD-Q | reauditoria de qualidade | mesmo RC; `16/16 ≥98`; relatório assinado; sem compensação por média |
| `U98-605` | P0 | BLOCKED | AUD/ENG | tratar divergência de auditoria | qualquer célula <98 reabre task; patch gera novo RC e rerun afetado |
| `U98-606` | P0 | WAITING_HUMAN_APPROVAL | Ricardo | go/no-go e eventual retirada de `PILOT_BLOCKED` | `32/32`, `145/145`, zero bloqueante, rollback e autoridades registradas |

## 9. Mapa de cobertura das células

| Grupo de células | Tasks principais |
|---|---|
| M1–M2, Q1–Q3 | U98-000–005, U98-601–604 |
| M4–M7, Q4–Q9 | U98-102–104, U98-106, U98-108/109, U98-113–116 |
| M8, Q10 | U98-107–110, U98-302, U98-504 |
| M9–M10, Q2/Q11 | U98-401–406, U98-502/503/506 |
| M11–M12, Q8/Q13/Q14 | U98-106, U98-111/112, U98-303–305, U98-505 |
| M13–M14, Q11–Q12 | U98-104/105, U98-502/503 |
| M15–M16, Q15–Q16 | U98-101/117, U98-201–204, U98-301, U98-501, U98-601/602 |

## 10. Avaliação pós-hardening — 2026-08-16

Os gates agregados de `docs/132` são reproduzíveis: `pnpm verify` passou com
`195/947/19`, cobertura `90,43/85,14/93,61/91,84`, e o build passou nos `12`
workspaces. A revisão independente de `docs/133` classificou o pacote como
`PARTIAL` e reabriu U98-107–113. Há seis achados altos: scanner com bypass,
corrida de sessão, probe de outbox em memória, observabilidade não carregada e
sem API loss-of-signal, identidade clínica global estática e rollout N/N-1
inseguro para mutações.

Migrações `31/31` significam manifesto/journal, não aplicação da 0030. O teste
PostgreSQL authoring continua guardado e incompatível com o novo
`idempotencyKey`. Worker está em `77,60/78,64/78,37/77,88`, abaixo de 80% nas
quatro métricas, embora o threshold global passe. Hotspots precisos:
`152` >50, `21` >100 (`22` ≥100), máximo `128`.

A disposição continua `PILOT_BLOCKED`: não houve commit, RC, release, score ou
fechamento de `0/145`; WebKit, `11/87`, `763` decisões clínicas e `3/20` runs
permanecem gaps.

## 11. Próxima ação executável

Sem nova autoridade externa, executar U98-005 e fechar U98-107–113/115–117 com
TDD, fault/live tests e review independente; depois executar U98-114 como
preauditoria local. U98-101 só avança após a autorização U98-201. Não formar RC,
commitar lotes ou solicitar score antes dos gates correspondentes.
