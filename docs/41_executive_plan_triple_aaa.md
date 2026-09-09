# Plano executivo — State of Art / Triplo AAA

**Data:** 2026-09-09
**Status:** `IN_PROGRESS` — execução local bounded autorizada; live/produção/clínica/piloto sob gate humano.
**Base canônica:** `BRIEFING/03.BUILD/STATE_OF_THE_ART_MASTER_PLAN.md`, `0300_build_engineer_master.md`.
**Diagnóstico de partida:** `docs/40_construction_audit_report_2026-09-09.md` (média real ~72–75/100; release 25/100).
**Roadmap:** `docs/42_roadmap_triple_aaa.md`. **Backlog:** `docs/43_backlog_triple_aaa.md`.

## 1. Decisão executiva

Levar o CVG de base local forte a plataforma premium de desenvolvimento clínico digital contínuo, sem rewrite, sem microserviço sem dor observada, sem dado real no repositório, sem IA decisória e sem claim de competência prática. "State of Art" e "Triplo AAA" são barra interna de qualidade, não certificação externa.

Ordem aprovada: (1) eliminar P0/P1 de integridade, autorização e rastreabilidade; (2) provar jornada vertical browser→API→PostgreSQL/RLS; (3) fechar autoria/revisão/conteúdo aprovado; (4) elevar experiência e aprendizagem adaptativa; (5) demonstrar operação, recuperação, segurança e release reproduzível; (6) piloto controlado somente após gates humanos e operacionais.

## 2. O que é o Triplo AAA (definição operacional)

### A1 — Assurance clínico-pedagógico

Sistema ensina e mede progressão digital com conteúdo autoral, revisão humana, avaliação determinística e métricas de aprendizagem. Atividade digital nunca vira competência prática automaticamente. Barra: 100% do conteúdo publicado aprovado no fluxo clínico; scoring determinístico; feedback sem vazar gabarito/fonte; D+7/D+30/D+90 modelados.

### A2 — Assurance de engenharia e segurança

PostgreSQL como fonte transacional; autorização server-side deny-by-default; RLS como defesa adicional; contratos strict; invariantes críticas com cobertura de decisão completa; recuperação verificável. Barra: zero P0/P1 abertos; cobertura global ≥80%; cada jornada crítica provada no boundary correto; nenhum campo interno na fronteira pública; build reproduzível same-SHA com SBOM.

### A3 — Assurance de experiência e operação

Fluxos claros, acessíveis e responsivos; autoria/operação auditáveis; incidentes detectáveis, diagnosticáveis, recuperáveis e mensuráveis. Barra: WCAG 2.2 AA nos fluxos críticos; SLOs/alertas/logs redigidos/métricas/traces; backup/restore/rollback exercitados com RPO/RTO registrados; piloto mede aprendizagem digital sem declarar competência.

## 3. Metas mensuráveis (AAA-Q01–Q11, `PROPOSED` até `AAA-001`)

| Código | Meta | Evidência de aceite |
|---|---|---|
| AAA-Q01 | Zero P0/P1 segurança/integridade/clínica abertos | auditoria independente + reexecução corrente |
| AAA-Q02 | Cobertura ≥80% + decisão completa nas invariantes críticas | coverage + matriz de decisões |
| AAA-Q03 | Jornada crítica provada no boundary correto | browser/API/PG/RLS quando aplicável |
| AAA-Q04 | Nada interno atravessa fronteira pública | exposure scan + testes negativos + revisão manual |
| AAA-Q05 | WCAG 2.2 AA nos fluxos críticos | axe + teclado + foco + contraste + revisão manual |
| AAA-Q06 | Build reproduzível same-SHA | CI remoto + artefatos + SBOM + traceability |
| AAA-Q07 | SLOs, alertas, logs, métricas, traces | ambiente autorizado + collector descartável |
| AAA-Q08 | Backup/restore/rollback/recuperação exercitados | runbook com RPO/RTO |
| AAA-Q09 | 100% publicado aprovado no fluxo clínico | revisão item-a-item + decisão humana |
| AAA-Q10 | IA/Qdrant derivados, limitados, desligáveis, nunca decisórios | evals + fallback + human-in-the-loop |
| AAA-Q11 | Piloto mede aprendizagem digital sem claim de competência | protocolo + métricas + auditoria |

SLO/RPO/RTO, capacidade, cadência de revisão e escopo do piloto são calibrados em `AAA-001` por Ricardo; nada é inventado no código.

## 4. Frentes (F0–F8)

| Frente | Resultado de negócio | Resultado técnico | Dono do gate |
|---|---|---|---|
| F0 Governança | decisões e evidências confiáveis | control plane sincronizado, quality bar aprovada | Ricardo (G0) |
| F1 Trust core | ninguém altera estado fora da política | RLS, constraints, idempotência, sessões, auditoria | Eng + auditor independente (G1) |
| F2 Jornada | participante sabe o próximo passo | diagnóstico→assignment→atividade→feedback real | Eng + ambiente autorizado (G2) |
| F3 Conteúdo | conteúdo autoral confiável | autoria, revisão four-eyes, publicação/retirada | Ricardo clínica (G3) |
| F4 Pessoas/UX | cada papel enxerga o necessário | UX por papel, privacidade, agregados | UX + privacidade |
| F5 Aprendizagem | prática adaptativa explicável | mastery, retrieval, remediação, retenção | Pedagógico + eng |
| F6 Plataforma | operar sem improviso | observabilidade, CI same-SHA, DR, runbooks | Ops/eng (G4) |
| F7 IA segura | acelerar autoria sem perder controle | adapters, evals, Qdrant reconstruível, HITL | Segurança/IA |
| F8 Piloto | aprender com risco controlado | readiness, baseline, piloto, auditoria, decisão | Ricardo + auditor (G5/G6) |

## 5. Gates (G0–G6)

| Gate | Libera | Não libera | Critério de falha |
|---|---|---|---|
| G0 plano aprovado | `AAA-100` em diante (local bounded) | deploy, publicação clínica | gap P0/P1, drift no control plane |
| G1 trust core | jornada técnica real | conteúdo publicado | RLS/auth/integridade com P1 aberto |
| G2 jornada vertical | validação de produto autorizada | claim de competência | sem E2E browser→PG/RLS |
| G3 conteúdo clínico | publicação interna aprovada | IA autônoma | item sem revisão humana |
| G4 release readiness | piloto controlado | produção aberta | sem CI same-SHA/DR/segurança atual |
| G5 pilot exit | decisão manter/corrigir/expandir | certificação automática | métricas/incidentes sem auditoria |
| G6 AAA audit | declaração interna de barra | qualquer claim sem evidência | P0/P1 aberto ou evidência stale |

## 6. Definition of Done do programa

Programa só é AAA quando: (1) zero P0/P1 com evidência corrente; (2) G0–G6 com decisão e artefato; (3) jornadas críticas no boundary real; (4) conteúdo revisado/publicado no fluxo autorizado; (5) segurança, privacidade, acessibilidade, observabilidade e recuperação com provas atuais; (6) state/log/backlog/roadmap/traceability/auditorias convergentes; (7) auditor independente reproduz o veredito sem depender desta conversa.

## 7. Limites inegociáveis

Ricardo aprova barra, metas, piloto, protocolos e conteúdo antes de publicar. Prod/ambiente, secrets, grants/owners, provider/MFA, workflow remoto e participantes reais exigem autoridade específica. Tudo sintético em fixtures/seeds/testes/logs/UI. Decisão humana nunca converte teste sintético em evidência produtiva. Qdrant/IA nunca decidem estado, nota, gabarito, publicação, aprovação, papel ou autonomia.

## 8. Riscos e mitigação (top 5)

1. Drift worktree sem rebaseline → crítica fresh + `validate --check-drift` antes de qualquer promoção.
2. Live sem ambiente autorizado → `AAA-202/107/603/701-live` travados até `CVG_TEST_DATABASE_URL` descartável.
3. Conteúdo sem revisão → `AAA-302–304` sob `WAITING_HUMAN_APPROVAL`; preflight fail-closed.
4. Proxy/auth com bypass → testes negativos cross-scope + upstream que exige cookie em todo E2E real.
5. IA/Qdrant como autoridade → adapters com timeout/quota/fallback/evals + HITL server-side.
