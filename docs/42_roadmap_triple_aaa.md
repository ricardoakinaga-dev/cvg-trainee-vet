# Roadmap — State of Art / Triplo AAA

**Data:** 2026-09-09
**Base canônica:** `BRIEFING/03.BUILD/0301_roadmap.md`.
**Leitura:** roadmap de gates, não promessa de calendário. Fase só fecha com evidência corrente + auditoria independente. Durações indicativas para equipe pequena; ambiente autorizado e revisão clínica podem ampliar.

## 1. Ondas e gates

| Onda | Janela indicativa | Resultado | Gate | Estado em 2026-09-09 |
|---|---|---|---|---|
| 0 Controle | semanas 0–2 | plano, barra, estado e evidência sincronizados | G0 | parcial: plano existe; `AAA-001` aguarda Ricardo; Gauntlet STALE |
| 1 Trust core | semanas 2–6 | integridade, RLS, auth, dados sem P1 | G1 | parcial: `AAA-101–106` IN_PROGRESS local; live pendente |
| 2 Jornada | semanas 5–10 | diagnóstico→próxima ação no boundary real | G2 | parcial: `AAA-200/201/205` WITH_GAPS; `AAA-202` bloqueado sem banco |
| 3 Conteúdo | semanas 8–14 | autoria e conteúdo revisados | G3 | bloqueado: `AAA-302–304` aguardam Ricardo |
| 4 Experiência | semanas 10–16 | UX por papel + WCAG 2.2 AA | revisão F4 | parcial: `UI-VIS-001` Round 11 PASS bounded |
| 5 Intelligence | semanas 13–19 | mastery/retrieval/adaptativo/IA segura | revisão F5 | não iniciado (`AAA-500–504` READY) |
| 6 Plataforma | semanas 14–21 | observabilidade, DR, performance, release | G4 | parcial: `AAA-603/700/701` IN_PROGRESS local; remoto/live pendente |
| 7 Piloto | semanas 21–27 | piloto controlado + auditoria + decisão | G5/G6 | não iniciado, sob `AAA-802/803` humanas |

## 2. Fases executáveis (saída = evidência, não código)

- **Phase 0 — Rebaseline e barra:** `AAA-000–003` + nova crítica fresh `AAA-701` + rebaseline Gauntlet + decisão `AAA-001`. Saída: G0.
- **Phase 1 — Trust core:** `AAA-100–107`. Migrations forward-only, matriz ator×escopo×recurso×ação, testes negativos RLS, harness least-privilege, reidratação/auth. Saída: G1.
- **Phase 2 — Jornada vertical:** `AAA-200–205` (+ contratos 0560/0561/0562). E2E browser→web/proxy→API→PG/RLS com oracle separado e cleanup zero. Saída: G2.
- **Phase 3 — Autoria/clínica:** `AAA-300–305`. Four-eyes, versionamento/checksum/retirada, B-07/M02 com revisão item-a-item, preflight fail-closed. Saída: G3.
- **Phase 4 — Experiência/papéis:** `AAA-400–406`. Design system, WCAG 2.2 AA crítica, dashboards agregados privacy-by-design, boundary público. Saída: revisão UX/privacidade.
- **Phase 5 — Intelligence:** `AAA-500–504`. Mastery determinístico, retrieval/remediação/retenção com clock injetável, `NextBestLearningActionService`, métricas sem ranking punitivo. Saída: revisão pedagógica+técnica.
- **Phase 6 — Plataforma/release:** `AAA-600–607`. OTel/metrics/alerts, SLOs aprovados, CI same-SHA + SBOM, carga p95/p99, backup/restore/failover com RPO/RTO, incidents, retenção. Saída: G4.
- **Phase 7 — IA/Qdrant/evals:** `AAA-700–704`. Provider robusto (timeout/abort/quota/custo), reconciliação PG→Qdrant, evals injection/PII/groundedness, HITL. Saída: revisão segurança/IA.
- **Phase 8 — Readiness/piloto/auditoria:** `AAA-800–805`. Readiness pack, auditoria independente, protocolo piloto, piloto controlado, análise sem claim de competência, auditoria final AAA. Saída: G5/G6.

## 3. Caminho crítico

```text
AAA-001 → AAA-100/101/102 → AAA-103/104/105 → AAA-200/201/202
→ AAA-300/301/302 → AAA-600/603/604/605 → AAA-800/801/805
```

Se `AAA-101/102` confirmar defeito, G2 volta a `IN_PROGRESS`; sintético verde não promove jornada.

## 4. Paralelização segura (pós-G0)

Paralelo permitido: `AAA-400` UX sem tocar contratos/API; `AAA-600` obs/CI sem tocar migrations de produto; `AAA-700` adapters/evals sem mudar decisão de domínio; conteúdo em rascunho fora da publicação. Proibido em paralelo no mesmo recurso: duas migrations na mesma tabela; dois donos do mesmo contrato público; dois escritores de state/log/backlog; publicação clínica + regra clínica não aprovada.

## 5. Cadência por sprint (5–10 tasks)

`planejar → RED → GREEN → REFACTOR → review independente → checks proporcionais → auditoria de sprint → relatório → próximo gate`. Cerimônias mínimas: início (dependências/contratos/risco/evidência), checkpoint (status/blocker/drift/recursos), encerramento (diff/testes/auditoria/rollback/decisão), recuperação (revalidar state/log/backlog antes de repetir hipótese).

## 6. Stop conditions / rollback

Código: rollback por fatia ou forward fix revisado. Banco: migration nova compatível, nunca reset real. Worker/Qdrant: replay/reconcile desde PG. Conteúdo: retirar versão sem apagar histórico. Piloto: abortar em P0, exposição, perda de integridade ou sinal clínico imprevisto. Stop preserva artefatos e nunca reclassifica como PASS.

## 7. Próximos 3 passos imediatos

1. Nova crítica fresh `AAA-701` + rebaseline Gauntlet (desbloqueia credibilidade da evidência).
2. Decisão `AAA-001` por Ricardo (desbloqueia live, metas e autoridade).
3. `AAA-202` em ambiente descartável autorizado (primeira prova G2 de verdade).
