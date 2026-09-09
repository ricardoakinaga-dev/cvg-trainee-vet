# Backlog executável — State of Art / Triplo AAA

**Data:** 2026-09-09
**Base canônica:** `BRIEFING/03.BUILD/0302_backlog_master.md` (não substituída; este doc é o snapshot operacional derivado do relatório `docs/40_*`).
**Regra:** task só avança por evidência corrente. `COMPLETED_WITH_GAPS` não é terminal: gaps viram tasks AAA. Estados: `READY_FOR_NEXT_STEP`, `IN_PROGRESS`, `WAITING_HUMAN_APPROVAL`, `BLOCKED`, `COMPLETED`. Critério de pronto na seção 12.

## 1. Governança (G0)

| ID | P | Status 2026-09-09 | Próximo passo verificável |
|---|---|---|---|
| AAA-000 | P0 | COMPLETED | manter plano/roadmap/backlog coerentes |
| AAA-001 | P0 | WAITING_HUMAN_APPROVAL | Ricardo: aprovar barra, SLO/RPO/RTO, capacidade, piloto, autoridade de ambientes |
| AAA-002 | P0 | COMPLETED | manter state/log/backlog/traceability sincronizados |
| AAA-003 | P1 | READY_FOR_NEXT_STEP | registro same-SHA por gate (comando, hash, artefato, limitação, revisor) |

## 2. Trust core (G1)

| ID | P | Status | Pronto quando |
|---|---|---|---|
| AAA-100 | P0 | READY_FOR_NEXT_STEP | matriz ator×escopo×recurso×ação cobre rotas críticas, ligada à SPEC |
| AAA-101 | P0 | IN_PROGRESS | `0052` + focal verde + live RLS + auditoria independente |
| AAA-102 | P0 | IN_PROGRESS | preservação de respostas/contagem pós-`FINALIZADA` + live |
| AAA-103 | P0 | IN_PROGRESS | idempotência atômica + CAS nomeado + 409 + concorrência live |
| AAA-104 | P0 | IN_PROGRESS | `0053` + FKs + `FORCE RLS` + orphan scan + RLS live negativo |
| AAA-105 | P0 | IN_PROGRESS | sessão/recovery/reidratação + cookie/expiração/cross-scope + E2E real |
| AAA-106 | P1 | IN_PROGRESS | proxy `__Host` + 11/11 + 12/12 + 43/43 locais OK; falta HTTPS/expiração/cross-scope/upstream prod/browser→PG |
| AAA-107 | P0 | READY_FOR_NEXT_STEP | harness least-privilege + RLS + owners/grants + rollback em banco descartável |

## 3. Jornada vertical (G2)

| ID | P | Status | Pronto quando |
|---|---|---|---|
| AAA-200 | P0 | COMPLETED_WITH_GAPS | contrato 0561; falta live + revisão pós-correção + G2 |
| AAA-201 | P0 | COMPLETED_WITH_GAPS | assignment transacional determinístico local OK; falta live/concorrência |
| AAA-202 | P0 | BLOCKED | E2E browser→web/proxy→API→PG/RLS com oracle separado; depende de `AAA-001` + `CVG_TEST_DATABASE_URL` |
| AAA-203 | P1 | READY_FOR_NEXT_STEP | reply de feedback bounded, plain text, owner/scope scoped |
| AAA-204 | P1 | READY_FOR_NEXT_STEP | retenção/remediação/CTA com cadência aprovada, clock injetável |
| AAA-205 | P1 | COMPLETED_WITH_GAPS | contrato 0562 local OK; falta expiração/cross-scope/browser→PG + revisão manual |

## 4. Autoria e clínica (G3)

| ID | P | Status | Pronto quando |
|---|---|---|---|
| AAA-300 | P0 | READY_FOR_NEXT_STEP | draft→review→resubmit→approval→publish→withdraw + four-eyes + audit trail |
| AAA-301 | P0 | READY_FOR_NEXT_STEP | versionamento/checksum/validade/retirada sem apagar histórico |
| AAA-302 | P0 | WAITING_HUMAN_APPROVAL | B-07 120 itens + rubricas + preflight; sem publicar sem revisão |
| AAA-303 | P0 | WAITING_HUMAN_APPROVAL | M02 com protocolo T2, carga e avaliabilidade registrados |
| AAA-304 | P0 | WAITING_HUMAN_APPROVAL | revisão clínica item-a-item + gate assinado por Ricardo |
| AAA-305 | P1 | READY_FOR_NEXT_STEP | preflight fail-closed de publicação/exposição/redaction |

## 5. Experiência e papéis (F4)

| ID | P | Status | Pronto quando |
|---|---|---|---|
| AAA-400 | P1 | READY_FOR_NEXT_STEP | tokens/componentes/estados premium sem reescrever domínio |
| AAA-401 | P1 | READY_FOR_NEXT_STEP | WCAG 2.2 AA crítica (axe + teclado + manual) |
| AAA-402 | P1 | READY_FOR_NEXT_STEP | progresso/resumo/feedback/próxima ação + E2E + sem internals |
| AAA-403 | P1 | READY_FOR_NEXT_STEP | authoring/operations por capability + cross-scope + paginação bounded |
| AAA-404 | P1 | READY_FOR_NEXT_STEP | dashboard agregado privacy-by-design + export autorizado |
| AAA-405 | P1 | READY_FOR_NEXT_STEP | recovery/sessão expirada/rede instável com mensagens sem segredo |
| AAA-406 | P1 | READY_FOR_NEXT_STEP | exposure scan + DTOs/headers + sem fonte/gabarito/bibliografia interna |
| UI-VIS-001 | P1 | IN_PROGRESS | Round 11 bounded PASS; falta rebaseline pós-drift + live/prod/clínica fora do recorte |

## 6. Intelligence (F5)

| ID | P | Status | Pronto quando |
|---|---|---|---|
| AAA-500 | P1 | READY_FOR_NEXT_STEP | mastery digital determinístico, separado de competência |
| AAA-501 | P1 | READY_FOR_NEXT_STEP | retrieval/remediação/spaced review com clock injetável |
| AAA-502 | P1 | READY_FOR_NEXT_STEP | `NextBestLearningActionService` com reasonCode, mesma entrada→mesma saída |
| AAA-503 | P1 | READY_FOR_NEXT_STEP | métricas de processo/participação/retenção sem ranking punitivo |
| AAA-504 | P2 | READY_FOR_NEXT_STEP | calibração com dataset sintético + revisão independente, sem claim de competência |

## 7. Plataforma e release (G4)

| ID | P | Status | Pronto quando |
|---|---|---|---|
| AAA-600 | P0 | READY_FOR_NEXT_STEP | logs redigidos + métricas + traces + correlação em collector descartável |
| AAA-601 | P0 | READY_FOR_NEXT_STEP | SLOs/alertas/dashboards/ownership aprovados + runbook |
| AAA-602 | P0 | READY_FOR_NEXT_STEP | deploy/env/secrets/roles/migrations/health com dry-run least-privilege |
| AAA-603 | P0 | IN_PROGRESS | SBOM + manifesto + redaction locais OK; falta workflow remoto same-SHA + cache/ACL/retention/assinatura |
| AAA-604 | P1 | READY_FOR_NEXT_STEP | carga/concorrência p95/p99 + budget aprovado |
| AAA-605 | P0 | READY_FOR_NEXT_STEP | backup/restore/failover/rollback com RPO/RTO executados |
| AAA-606 | P1 | READY_FOR_NEXT_STEP | incident response com drill e TTR medido |
| AAA-607 | P0 | READY_FOR_NEXT_STEP | retenção/minimização/export/eliminação + testes de privacidade |

## 8. IA, Qdrant, evals

| ID | P | Status | Pronto quando |
|---|---|---|---|
| AAA-700 | P1 | IN_PROGRESS | retry transient-only + abort + budget locais OK; falta provider real + custo/latência + collector + evals sobre provider |
| AAA-701 | P1 | IN_PROGRESS | duas críticas fresh tratadas (filtro/índice de modelo, identidade, XOR fail-closed, drift/wipe/orfão, lock por outcome); focais 50/280 PASS; falta 3ª revisão + live + same-SHA |
| AAA-702 | P0 | IN_PROGRESS | harness `runTextSafetyEvals` sintético PASS; falta provider real + thresholds + revisão humana |
| AAA-703 | P0 | IN_PROGRESS | ports sem efeito colateral + saída inválida nunca resolve (4/4); falta HITL auditada em operação |
| AAA-704 | P2 | READY_FOR_NEXT_STEP | custo/latência/valor comparados + decisão continuar/parar |

## 9. Readiness, piloto, auditoria (G5/G6)

| ID | P | Status | Pronto quando |
|---|---|---|---|
| AAA-800 | P0 | READY_FOR_NEXT_STEP | readiness pack sem claim não sustentado |
| AAA-801 | P0 | READY_FOR_NEXT_STEP | auditoria independente PRD/SPEC/runtime/dados/segurança/UX |
| AAA-802 | P0 | WAITING_HUMAN_APPROVAL | protocolo/população/escopo/aborto do piloto autorizados |
| AAA-803 | P0 | WAITING_HUMAN_APPROVAL | piloto controlado com consentimento, incident log e cleanup |
| AAA-804 | P1 | READY_FOR_NEXT_STEP | análise sem converter sinal digital em competência |
| AAA-805 | P0 | READY_FOR_NEXT_STEP | auditoria final AAA + decisão expandir/corrigir/parar (G6 só com zero P0/P1) |

## 10. Continuidade

| ID | P | Status | Pronto quando |
|---|---|---|---|
| AAA-900 | P1 | READY_FOR_NEXT_STEP | traceability sem órfãos, bidirecional |
| AAA-901 | P1 | READY_FOR_NEXT_STEP | reauditoria mensal (segurança/exposição/deps/migrations/estado) |
| AAA-902 | P2 | READY_FOR_NEXT_STEP | revisão trimestral custo/UX/aprendizagem/IA/operação |

## 11. Ordem de execução imediata

1. Crítica fresh `AAA-701` → rebaseline Gauntlet (credibilidade).
2. `AAA-001` (Ricardo) → libera live e metas.
3. `AAA-107` + `AAA-202` no banco descartável (primeiro G2 real).
4. `AAA-603` remoto same-SHA em paralelo (sem tocar migrations de produto).
5. `AAA-300–305` com Ricardo (desbloqueia G3).

## 12. Critério comum de pronto

Requisito/contrato atual; RED falhou pela razão certa e GREEN corrigiu sem enfraquecer teste; testes proporcionais + revisão independente; migration/código/docs/traceability ligados; rollback registrado; state/log/backlog atualizados na ordem; sem blocker/aprovação pendente na task.
