# Checklist de prontidão para produção

Fonte: `docs/audits/production-readiness-audit-2026-10-07.md` (31 achados,
27 melhorias). Cada item só é marcado com evidência registrada em
`docs/20_master_execution_log.md`. Estado em 2026-10-07 após a rodada de
implementação (`docs/audits/production-readiness-implementation-2026-10-07.md`).

## Decisões humanas (Fase 1)

- [ ] AAA-001 respondido item a item (D1–D7); PRD atualizado se algum alvo mudar — `docs/45_aaa001_decision_packet.md`
- [ ] REM-06 decidido (contrato do contexto somativo) — `docs/decisions/2026-10-02-rem06-summative-eligibility.md`
- [ ] H-CONTENT: revisão clínica item a item de M02/B-07 iniciada (AAA-304)
- [ ] same-UID e H-REMOTE decididos (G03/G08 do backlog 61)

## Candidato (Fase 2)

- [x] Dependências de produção sem HIGH/critical (`pnpm audit --prod --audit-level=high`) — M09
- [x] Artefato implantável: Dockerfiles api/migrator/worker/web, `.dockerignore`, build local verificado — M04
- [x] Workflow `release` com preflight same-SHA, GHCR, provenance/SBOM, Cosign keyless e digests — M08
- [x] Freshness ignora `__screenshots__` gerados; evidência pesada fora do índice (`.gitignore`) — M19/M20
- [ ] CI remota verde no SHA (`quality`, `security`, `candidate`) e `verify:same-sha` PASS — M07 (exige push/dispatch: H-REMOTE)
- [ ] Testes live editoriais e E2E real verdes (T01/T02) — M07/M12
- [ ] Stryker, k6, RLS, Redis e staging reexecutados no HEAD; bundle regenerado; `verify:triple-aaa` sem fatal — M13
- [ ] Somativa nativa com receipts provada em PostgreSQL — M02 (após REM-06)
- [ ] Correções de jornada herdadas T13–T22 com crítica fresh — M12

## Operação (Fase 3)

- [x] Stack de referência com PostgreSQL/Redis/TLS/backup/observabilidade fixados por digest — `deploy/compose.yml`
- [x] Backup horário verificado com retenção e runbook — M06 (`deploy/backup/backup.sh`)
- [x] Alertas definidos com runbook e canal — M10 (`docs/operations/alerting.md`)
- [x] Smoke pós-deploy fail-closed — `scripts/deploy-smoke.mjs`
- [x] Procedimento de entrega de convites e recuperação — M11 (`docs/runbooks/invitation-delivery.md`)
- [x] Procedimentos LGPD e gestão de segredos — M21/M24
- [ ] Homologação provisionada, deploy executado, `/health/ready` 200 — M05
- [ ] Restore cronometrado ≤ 4 h e RPO ≤ 1 h demonstrados em homologação — M14
- [ ] Alerta sintético recebido no canal em < 5 min — M10 (teste de ponta a ponta)
- [ ] HTTPS real com `TRUSTED_PROXIES` validado contra proxy que anexa XFF — M15
- [ ] Carga k6 a 3× da capacidade aprovada (D4) — M14
- [ ] Aceitação manual e leitor de tela com colaboradores do CVG — M16

## Piloto (Fase 4)

- [ ] `AI_ENABLED=false` e `QDRANT_ENABLED=false` no go-live, com decisão registrada — M17
- [ ] Branch protection aplicada e CODEOWNERS reais — M18 (`.github/CODEOWNERS` preenchido; regras do GitHub pendentes)
- [ ] Pelo menos um módulo clínico `PUBLICADO` com audit de aprovação — M03
- [ ] Estado de runtime `READY_FOR_NEXT_STEP` para o piloto com aprovação humana registrada
