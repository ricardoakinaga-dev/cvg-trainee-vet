# RUNTIME STATE — CVG

> Estado corrente apenas. Histórico preservado sem alteração em
> `docs/runtime-history/2026-08.md`, `docs/runtime-history/2026-09.md` e
> `docs/runtime-history/2026-10.md` (arquivamento SA-40 em 2026-10-11, além
> das migrações MOD-AAA R2-009). Log append-only em
> `docs/20_master_execution_log.md`.

## CONTEXTO

- project: cvg-trainee-vet
- current_engine: BUILD ENGINE / GAUNTLET LOOP / ORCHESTRATE / ENGINEERING FRAMEWORK / DESIGN DIRECTOR / RUNTIME CONTROLLER
- source_of_truth: BRIEFING/09.PROJETO_CVG_TREINAMENTO

## CHECKPOINT PREVALENTE — SA-01/SA-02 concluídos: quality/security verdes same-SHA em 2026-10-12T08:00:00Z

- current_engine: BUILD ENGINE / RELEASE ENGINEERING / RUNTIME CONTROLLER
- current_phase: EXECUTION; SA-01/SA-02/SA-11/SA-40 concluídos com evidência; SA-03/SA-04/SA-14 bloqueados por certificação/crítica independente; SA-10/SA-20+ aguardam Ricardo.
- current_task: AUD-SYSTEM-20261011-SA01/SA02 (plano 62/63).
- status: WAITING_HUMAN_APPROVAL
- last_completed_action: pipeline remoto completo verde pela primeira vez no mesmo SHA `e178e6f404e5d475e0c32c99e8391f7c2939834d`: `quality` run 38216496310 SUCCESS (50m15s — verify, live PostgreSQL, live Qdrant, restore, build, browser E2E, E2E real, audit e artefatos de release) e `security` run 38216496693 SUCCESS. SA-02 fechou quatro residuais com RED local: budget de suíte nas duas suítes nativas de currículo; override de teste de `statement_timeout` (120s via URL no `live-postgres-harness.ts`) após reproduzir o INSERT de 33 respostas levando 66s em PG16 (funções de RLS reavaliadas por linha) contra o teto de 30s do papel; flag `CVG_OWNED_DISPOSABLE_BINDING_DATABASE` declarada na etapa Qdrant de `quality.yml`/`candidate.yml` e janela 45→75 min; CSS de `operations-rail-label` encolhendo/quebrando a 195px (falha CI-only do visual-gauntlet). Um flake ambiental (`EACCES` em `/proc/<pid>/environ`) passou em rerun do mesmo SHA. SA-11: proposta de detalhamento da somativa publicada (`docs/decisions/2026-10-11-rem06-summative-native-detail-proposal.md`, WAITING_HUMAN_APPROVAL). SA-40: 47 checkpoints arquivados (`docs/runtime-history/2026-10.md`; estado 946→45 linhas).
- next_action: decisões de Ricardo — (1) responder as 3 perguntas da SA-11; (2) fornecer dados/acesso da VPS (SA-20) e revisar M03 (0/153); (3) definir o provedor dos valores pinados k6/otel e os artefatos de certificação do candidato (audit/review/risk) para destravar SA-03/SA-04; depois disso, dispatch do `candidate` e `verify:same-sha --require-candidate`.
- blockers: SA-03/SA-04 bloqueadas — pipeline `candidate` nunca concluiu verde (5/5 FAIL) e repositório com zero variáveis de Actions (`total_count: 0`), sem `CVG_K6_RELEASE_URL/SHA256`, `CVG_OTEL_RELEASE_URL/SHA256` e `CVG_AAA_AUDIT/REVIEW/RISK_INPUT`; a revisão independente não é auto-emitível; staging local bloqueado por portas fixas (3100 ocupada por processo externo) e ausência de `otelcol-contrib`/`redis-server`; SA-14 aguarda críticas fresh.
- human_decision_required: yes — SA-11 (3 perguntas objetivas), dados/acesso da VPS, revisão clínica M02/B-07, decisão same-UID e os artefatos de certificação do candidato.
- active_execplan: docs/63_backlog_audit_remediation_2026-10-11.md (recorte corrente) + .agent/plans/2026-10-03-remediation-execution.md (histórico)
- active_action_id: AUD-SYSTEM-20261011-SA01/SA02
- last_update: 2026-10-12T08:00:00Z
- evidence: runs https://github.com/ricardoakinaga-dev/cvg-trainee-vet/actions/runs/38216496310 (quality SUCCESS) e 38216496693 (security SUCCESS) no SHA `e178e6f`; commits `80dc2ab`, `b391d03`, `a2240bc`, `a7bea9f`, `e178e6f`; .agent/artifacts/audit-20261011/sa02-*.log, test-e2e-cssfix.log; docs/63 (SA-01/SA-02 COMPLETED); docs/decisions/2026-10-11-rem06-summative-native-detail-proposal.md; docs/runtime-history/2026-10.md
- head: `e178e6f404e5d475e0c32c99e8391f7c2939834d` (SHA medido com quality/security verdes); registro documental desta rodada em commit subsequente; sem deploy/publicação/globalaccept

## CHECKPOINT ANTERIOR — Auditoria de sistema com pontuação em 2026-10-11T02:10:00Z

- current_engine: AUDIT ENGINE / RUNTIME CONTROLLER
- current_phase: AUDIT; auditoria solicitada por Ricardo (ler documentação, auditar o sistema e entregar relatório 0–100 por item); nenhum arquivo de produto alterado.
- current_task: AUDIT-SYSTEM-20261011.
- status: WAITING_HUMAN_APPROVAL
- last_completed_action: relatório `docs/audits/system-audit-2026-10-11.md` publicado com matriz de 17 itens (média ponderada 84/100) e veredito NÃO PRONTO para release/piloto; em seguida, plano de remediação entregue: `docs/62_roadmap_audit_remediation_2026-10-11.md` (fases A0–A3, gates GA0–GA3, metas de nota) e `docs/63_backlog_audit_remediation_2026-10-11.md` (23 tasks SA-01…SA-40 com origem, dono, dependência, teste, pronto, rollback e crosswalk para backlog 61/PROD-M). Evidências técnicas no HEAD `1ae1f8d` com Node 22.23.2: `pnpm verify` EXIT 0 (23 gates; 3.929 PASS/212 skip; cobertura 91,07/86,97/95,07/92,40); `test:integration` 779 PASS/210 skip; `test:integration:live` em PostgreSQL 18.4 descartável migrado+provisionado 882 PASS/103 skip/0 FAIL (remediação CI-LIVE-01…05 do commit `2420ffb` confirmada localmente); browser 290/290; e2e mockado 45/45 (porta 3110 em modo servidores externos porque a 3100 estava ocupada por processo do editor, não interrompido); e2e real 2/2 (browser→proxy→API→PostgreSQL, limpeza verificada); `pnpm audit` 0 vulnerabilidades. `verify:triple-aaa` FAIL (1 fatal+16 REVISE; P0=0/P1=0/P2=9; Eng 94/Sec 95/Ops 90,8; readiness NOT_VERIFIED) e `verify:aaa-candidate` FAIL (9 gates) por cadeia de evidência obsoleta (`3cd7bc3`) e same-SHA ausente.
- next_action: selecionar a execução do plano 62/63 começando por SA-01 (publicar `2420ffb`+`1ae1f8d` e obter `quality`/`security` verdes same-SHA, registrando run IDs); na sequência SA-02/SA-03/SA-04 (re-congelar candidato e same-SHA), e em frentes paralelas SA-10 (revisão clínica 0/153), SA-11…SA-13 (somativa nativa), SA-14 (holdovers) e SA-20 (VPS, após dados de Ricardo).
- blockers: release bloqueada por evidência de candidato obsoleta, same-SHA ausente, conteúdo clínico 0/153 e ambiente real inexistente; nenhum bloqueio técnico novo no núcleo.
- human_decision_required: yes — H-REMOTE vigente para push/dispatch; pendentes de Ricardo os dados da VPS, o segundo contato de alertas e as revisões clínicas M02/B-07.
- active_execplan: .agent/plans/2026-10-03-remediation-execution.md
- active_action_id: AUDIT-SYSTEM-20261011
- last_update: 2026-10-11T02:30:00Z
- evidence: docs/audits/system-audit-2026-10-11.md; docs/62_roadmap_audit_remediation_2026-10-11.md; docs/63_backlog_audit_remediation_2026-10-11.md; .agent/artifacts/audit-20261011/verify-full.log, verify-triple-aaa.log, verify-aaa-candidate.log, test-integration.log, test-integration-live.log, test-browser.log, test-e2e-external.log, test-e2e-real.log
- head: `1ae1f8d53733be2afa8bcf9fc7a1dfcfdfe0fb34` (`main` local; worktree limpo exceto artefatos de evidência não rastreados); `origin/main` em `c5cb444`; sem push/deploy/publicação/globalaccept

## CHECKPOINT ANTERIOR — Remediação CI-LIVE-01…05 da integração PostgreSQL real em 2026-10-08T05:10:00Z

- current_engine: BUILD ENGINE / RUNTIME CONTROLLER
- current_phase: FIX_RETEST; os 46 testes live que falharam no run remoto `quality` 37719804195 (SHA `112b720`) foram reproduzidos em PostgreSQL 18.4 descartável e corrigidos com TDD; commit e push autorizados pelas decisões Git/H-REMOTE já registradas.
- current_task: CI-LIVE-REMEDIATION-20261008 (continuação de PROD-UNBLOCK-20261008; tasks T01/G08/M07).
- status: IN_PROGRESS
- last_completed_action: RED local 40/46 reproduzido com o ambiente da etapa live; correções: (01) `CVG_OWNED_DISPOSABLE_BINDING_DATABASE=true` declarado na etapa live de `quality.yml`/`candidate.yml` (serviço PostgreSQL do job é banco próprio e descartável) e `postgres-module-obligations` (prova nativa R59) com `describe.skipIf` sem `CVG_R59_RUN_DIRECTORY`, registrado em `docs/quality/skip-inventory.md`; (02) `applicationTablePrivileges` com `SELECT, INSERT` nas quatro tabelas da 0058, matriz do teste de governança e inventário de schema (`module-obligation-schema.ts`) alinhados, role restrito de `postgres-security-isolation` com os grants de currículo e `FOR UPDATE` das políticas de captura; (03) limpeza do evento de recálculo no teste de appeal, quarentena explícita de eventos pendentes de outras suítes no fencing e asserção do papel admin alinhada ao contrato `NOSUPERUSER BYPASSRLS`; (04) `createCorrectionOperations` restaura o contexto de staff após `triggerModuleCompletionOnCorrection` (RED wiring → GREEN 24/24); (05) `ATRIBUIDO` incluído nos predicados de autoridade/ordenação da jornada (RED unit → GREEN 41/41). Live local completo em banco recém-criado: 879 PASS / 103 skip; `migration-governance` 28/28 após ajuste do inventário; `triple-aaa-verifier` 177/177 isolado (timeouts só sob carga concorrente). Unit 2860 PASS; lint/typecheck/format/ci-contract/secrets/documentation PASS. Browser, e2e e verificador isolado: browser 290/290, e2e 45/45, `triple-aaa-verifier` isolado 177/177.
- next_action: commit + push do SHA remediado; acompanhar `quality`/`security` remotos até verde no mesmo SHA; registrar run IDs; depois dispatch manual de `release` (já autorizado) e continuidade G08/M07.
- blockers: nenhum técnico local; `quality` remoto ainda não executado no SHA remediado. Divergências PG18/PG16 não observadas nesta rodada.
- human_decision_required: no (autorizações Git/H-REMOTE vigentes); permanecem pendentes de Ricardo os dados da VPS, segundo contato de alertas e a revisão clínica M02/B-07.
- active_execplan: .agent/plans/2026-10-03-remediation-execution.md
- active_action_id: CI-LIVE-REMEDIATION-20261008
- last_update: 2026-10-08T05:10:00Z
- evidence: docs/operations/remote-ci-2026-10-08.md (seção "Remediação executada"); docs/quality/skip-inventory.md (adendo 2026-10-08); docs/61_backlog_repository_remediation_2026-10-03.md (T01).
- head: `2420ffb` (`main` local); push a origin negado pela permissão desta sessão — executar `git push origin main` para disparar `quality`/`security` no SHA e então registrar os run IDs
