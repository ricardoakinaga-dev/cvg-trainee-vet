# RUNTIME STATE — CVG

> Estado corrente apenas. Histórico preservado sem alteração em
> `docs/runtime-history/2026-08.md` e `docs/runtime-history/2026-09.md`
> (migração MOD-AAA R2-009). Log append-only em
> `docs/20_master_execution_log.md`.

## CONTEXTO

- project: cvg-trainee-vet
- current_engine: BUILD ENGINE / GAUNTLET LOOP / ORCHESTRATE / RUNTIME CONTROLLER
- source_of_truth: BRIEFING/09.PROJETO_CVG_TREINAMENTO

## POSIÇÃO ATUAL

- current_phase: BUILD — MOD-AAA Round-1 (master prompt §§1–100): baseline + Phase 1/2/3 parcial, gates verdes locais
- current_sprint: `MOD-REGISTRY` + `MOD-SECURITY-BASE` + `MOD-SUPPLYCHAIN-BASE` + `AAA-001` (ainda pendente)
- current_task: retomar MOD-002/MOD-003 — wiring do registry/rate-limit no runtime — mantendo AAA-001 e os gates humanos/operacionais abertos

## STATUS

- status: READY_FOR_NEXT_STEP

## PROGRESSO

- last_completed_action: `main` consolidado e publicado em `54e65a0`; `aaa/round-10-verification` e `agent/publish-production-hardening` removidas do remoto e a branch local AAA removida após confirmação de ancestralidade; apenas `main` permanece
- next_action: iniciar MOD-002/MOD-003 conforme backlog, sem avançar AAA-001, publicação clínica, piloto, produção ou deploy; manter a limitação Node 24 local versus contrato Node 22.22.0 explícita

## BLOQUEIOS

- blockers: `AAA-001` continua aguardando aprovação humana das metas SLO/RPO/RTO, capacidade, escopo do piloto e autoridade de ambientes; lives PG+Qdrant+restore verdes em descartável local (41/111) mas a prova remota same-SHA, ACL/retention/assinatura/cache, provider IA real, custo/latência, collector/evals sobre provider, concorrência real, cross-scope, expiração/cookie, E2E browser→API→PostgreSQL autorizado, owners produtivos, carga, failover, deploy e conteúdo clínico publicado continuam sem evidência. Nenhuma task usa dados reais ou altera migrations produtivas. O shell nativo tem Node `18.19.1`/sem pnpm; verificações locais usam Node `24.20.0`/pnpm `10.33.0`, fora do intervalo declarado do repositório, enquanto o contrato CI permanece Node `22.22.0`/pnpm `10.33.0`.

## DECISÃO HUMANA

- human_decision_required: yes
- decision_description: Ricardo deve aprovar `AAA-001`: a definição operacional de Triplo AAA, metas de SLO/RPO/RTO/capacidade, escopo do piloto, autoridade de ambientes e ordem da próxima onda. A solicitação atual autoriza implementação local bounded; a aprovação não libera automaticamente publicação clínica, produção, deploy, live externo ou claim de competência.

## TIMESTAMP

- last_update: 2026-09-09T17:42:31-0300
- session_checkpoint: transição concluída; `main`/`origin/main`/`origin/HEAD` apontam para `54e65a0`, somente `main` existe como branch, árvore canônica AAA preservada e histórico legado alcançável pelo segundo pai `95eade4`

## OBSERVAÇÃO REPOSITÓRIO E EVIDÊNCIA ATUAL

- head: branch local `main` em `54e65a0`; árvore efetiva preserva a ponta `7ef0805` da AAA; não houve deploy
- origin: somente `origin/main` e `origin/HEAD -> origin/main` existem, ambos em `54e65a0`; os testes são evidência do checkout, não de workflow remoto; nenhuma execução remota foi inferida
- worktree: contém a implementação visual bounded em `.gitignore`, `apps/web/app/globals.css`, `apps/web/app/page.tsx`, `apps/web/app/authoring/page.tsx`, `apps/web/app/operations/page.tsx`, `apps/web/proxy.ts`, `apps/web/src/proxy.test.ts`, `scripts/e2e-proxy-fixture-server.mjs`, `tests/e2e/proxy-auth-boundary.spec.ts`, `tests/e2e/visual-gauntlet.spec.ts`, `tests/e2e/authoring-review.spec.ts`, `tests/e2e/operations-dashboard.spec.ts`, `packages/integrations/src/ai.ts`, `packages/integrations/src/ai.test.ts`, `packages/integrations/src/composition.ts`, `packages/integrations/src/index.ts`, `.github/workflows/quality.yml`, `scripts/ci-artifact-governance.mjs`, `scripts/verify-ci-contract.mjs`, `tests/integration/ci-governance.test.ts`, `.agent/artifacts/`, `.agent/plans/` e `apps/web/public/assets/`; alterações concorrentes externas em `apps/api`, `packages/application`, `packages/persistence`, demais `tests`, `BRIEFING/03.BUILD`, `docs/`, `traceability.yml`, `.gauntlet/` e as migrations AAA foram preservadas; o relatório gerado `.agent/playwright-report-postfix/` foi preservado localmente e não será publicado; nenhuma migration produtiva aplicada e nenhum deploy executado nesta rodada
- active_execplan: `BRIEFING/03.BUILD/STATE_OF_THE_ART_MASTER_PLAN.md`
- verification_state: `AAA-200/201` focal pós-correção passou `25/25`; o boundary de API/contratos/persistência focal passou `108/108`; a validação fresca desta consolidação passou `pnpm verify` com `155` arquivos/`866` testes, `42` skips, cobertura `84,65%/80,48%`, contratos `95/95`, worker `44/44`, migrations `55/55`, `pnpm build` em `12/12` workspaces e E2E `45/45`; `git diff --check`, secrets, traceability, architecture, documentation, product-definition e exposure passaram. `CVG_TEST_DATABASE_URL` permanece ausente; workflow remoto same-SHA, provider IA real, PostgreSQL/RLS live, Qdrant live, produção real, upstream real do proxy, clínica, zoom nativo e competência continuam sem evidência. A validação local usou Node `24.20.0`, fora do intervalo declarado `>=22.22.0 <23`; o contrato CI exigido é Node `22.22.0`/pnpm `10.33.0`.

- current_readiness_evidence: `OPS-061-READINESS-006`, `OPS-061-READINESS-007` e `OPS-061-RETRY-008` permanecem fechados conforme as auditorias `0547`–`0549`; readiness é PostgreSQL-only, a saúde agregada mantém `DEGRADED`, API/worker não bloqueiam o cold start, retry é bounded/cancelável, `close()` aguarda inicialização em voo e `reconcile:qdrant` aguarda a preparação da coleção. A evidência anterior é local/sintética e não prova produção, release ou competência. A decisão A de `JOURNEY-056` está registrada acima; a evidência específica da jornada está em `journey_056_evidence`.

- journey_056_evidence: `JOURNEY-056` tem implementação GREEN/REFACTOR em worktree, migration `0051_diagnostic_sessions`, contrato `0560`, contrato vertical `0561` e auditoria `0550`. A crítica independente encontrou e o lead corrigiu um P1 de projeção interna e proveniência: `AAA-200/201` permanecem `COMPLETED_WITH_GAPS`, com focal pós-correção `25/25`, resumo allowlisted sem IDs/módulos internos, source diagnostic divergente fail-closed e vínculo de atividade divergente fail-closed. A releitura pós-correção retornou `REVISE` por não inspecionar sob a restrição declarada; isso permanece gap de revisão independente, sem registrar PASS. O teste live PostgreSQL/RLS continua condicional e foi bloqueado por ausência de `CVG_TEST_DATABASE_URL`; não há prova browser→API→PostgreSQL, grants/owners produtivos, operação externa, publicação clínica, release ou competência prática.
- recovery_205_evidence: `AAA-205` foi reclassificado como `COMPLETED_WITH_GAPS` no contrato `0562` e no manifesto `AAA-RECOVERY-205`: `apps/web/app/page.tsx` e `apps/web/app/recovery/page.tsx` preservam estados de falha e retomada, removem token da URL e usam sessão server-side; `experience-accessibility`, `participant-access` e `recovery-access` cobrem retry, erro público, redaction e link one-time no browser sintético; a revalidação pós-correção passou `43/43` em portas isoladas. Expiração/revogação HTTPS real, rede real, cross-scope, browser→API→PostgreSQL/RLS, revisão assistiva e operação produtiva continuam gaps.
- visual_gauntlet_evidence: `UI-VIS-001` tem evidência local bounded em `tests/e2e/visual-gauntlet.spec.ts`: a evidência histórica do Round 7 cobre suíte visual `6/6`; o Round 8 adicionou o rail de ações em `/operations`, teste focal `1/1`, axe zero, oito links, overflow ausente nos três viewports e renders hashados em `.agent/artifacts/ui-visual-operations-rail-round8.md`. A Round 9 corrigiu rail mobile, composição de retries e legibilidade secundária em RED/GREEN; a Round 10 revalidou authoring/recovery/operations e a crítica fresh `Chandrasekhar` retornou `PASS` sem achados P0/P1/P2. A revalidação corrente pós-mutação passou a matriz completa `11/11` em `59,1 s`, com operações, authoring, recovery, loading/empty/success, foco, reidratação e stress, conforme `.agent/artifacts/ui-visual-current-revalidation-2026-09-06.md`. O recorte continua web bounded: zoom nativo, tecnologia assistiva, live PostgreSQL/RLS, produção real, clínica e AAA global continuam sem evidência.
- visual_tools_checkpoint: após queda transitória, Blender MCP reconectado e validado por leitura de objetos em `CVG_Visual_Asset`/`Layout`, câmera `CVG_Visual_Camera`, core/ring/nodes/light e `missing_files: []`; ComfyUI saudável em `127.0.0.1:8188`; OpenDesign segue `Transport closed`. A cena Blender é sintética/efêmera e não altera o repositório.
- visual_round11_checkpoint: leitura final do Blender MCP retornou `CVG_Visual_Asset`, workspace `Layout`, `BLENDER_EEVEE`, câmera `CVG_V2_Camera` e 17 objetos em `CVG_Orbital_Asset_V2`; o asset v2 está em `apps/web/public/assets/cvg-orbit-render-v2.png` com SHA256 registrado no artefato Round 11. ComfyUI `server_info` permaneceu saudável; OpenDesign `get_active_context` retornou `Transport closed`. Nenhum resultado OpenDesign foi inventado.
- visual_round11_evidence: seis renders finais hashados, RED/GREEN, testes `11/11` e `5/5`, critics fresh e limitações estão em `.agent/artifacts/ui-visual-round11-final.md`; o item segue `IN_PROGRESS` porque live, produção, clínica, zoom nativo, tecnologia assistiva e AAA-001 não foram fechados.
- aaa_701_evidence: a fatia local de reconciliação está registrada em `.agent/artifacts/aaa-701-qdrant-reconciliation-2026-09-06.md`; a primeira crítica fresh retornou `REVISE` com P1/P2, os achados foram tratados, e a segunda crítica `Euler` (`01a07903-d239-77e1-8e80-204781c8a175`) foi encerrada sem parecer. Não há `PASS` independente nesta rodada. O Gauntlet está `valid: false` por drift das alterações AAA-701 e só deve ser rebaselineado após nova crítica fresh e atualização documental.
- aaa_106_evidence: `AAA-106` tem implementação local bounded em `apps/web/app/operations/page.tsx`, `apps/web/app/authoring/page.tsx`, `apps/web/proxy.ts` e `scripts/e2e-proxy-fixture-server.mjs`: o shell interno só aparece após resposta server-side autorizada; a projeção de participante em dashboard é tratada como proibida; a fila de autoria permanece fora da árvore até escopos autorizados; o `authoring` não expõe mais `NEXT_PUBLIC_CVG_API_BASE_URL`; o proxy encaminha somente `__Host-cvg_session`. Testes do proxy `11/11`, foco E2E `12/12`, typecheck/build web, E2E completo final `43/43` e visual `7/7` passaram. O proxy real ainda exige prova sem mocks de cookie HTTPS, expiração, revogação, cross-scope, upstream produtivo, PostgreSQL/RLS e browser→API→PostgreSQL.
- bounded_visual_authorization: a solicitação direta de Ricardo autoriza esta fatia visual sem liberar o programa AAA-001, produção, publicação clínica, piloto, deploy ou claim de competência. OpenDesign permaneceu indisponível por transporte fechado; nenhum resultado foi inventado ou usado como evidência.

## REGRAS DE USO

1. Ler este arquivo antes de executar qualquer ação.
2. Executar somente a ação indicada em next_action ou registrar a alteração de escopo.
3. Atualizar este arquivo depois de cada ação relevante.
4. Registrar a ação correspondente em docs/20_master_execution_log.md.
5. Atualizar docs/30_backlog_master.md quando houver mudança de item, prioridade, dependência ou bloqueio.
6. Nunca encerrar uma rodada sem last_completed_action, next_action, status e timestamp válidos.
7. Usar somente os estados oficiais: IN_PROGRESS, READY_FOR_NEXT_STEP, BLOCKED, WAITING_HUMAN_APPROVAL e COMPLETED.
8. Não avançar para PRD formal, SPEC, BUILD ou AUDIT enquanto os gates canônicos não estiverem aprovados.

## 2026-09-09 — MOD-AAA Round-1: baseline + fundação da modernização (sem commit)

### TIMESTAMP

2026-09-09T09:11:18-0300

### ACTION

Executada a primeira rodada do CODEX MASTER PROMPT (`docs/46_codex_master_prompt_state_of_art_triple_aaa.md`):
baseline `docs/modernization/0001_baseline_audit.md` (P0=0, P1=4, P2=12, P3=6);
route registry com paridade testada + 6 gaps F-REG provados; request context com
redaction; rate-limit store port + risk classes + fail policy; security headers;
threat model, authorization matrix, data classification; SLO, DR, 7 runbooks;
6 docs de arquitetura + 5 ADRs + scorecard honesto; `security.yml` + pin SHA em
`quality.yml` + contrato CI exigindo pins; scripts `release-evidence` e
`pin-actions`; `next 16.3.0→16.3.4` + override `js-yaml≥4.3.2`; auditoria interim
com veredito REPROVADO-para-AAA (honesto). TDD RED→GREEN em todas as adições.

### RESULT

`pnpm verify` PASS (155 arq/866 testes, 42 skips, 84,65% statements);
`test:contract` 95, `test:worker` 44, architecture 2; `pnpm build` 12/12;
`test:e2e` 45/45; `audit --audit-level=high` PASS (2 moderates residuais:
vitest dev-only); SBOM CycloneDX 322 componentes validado localmente;
`git diff --check` PASS. Nenhum dado real, segredo, deploy ou migration produtiva.
Sem commit (AGENTS.md: sem pedido explícito).

### NEXT

Revisão de Ricardo + autorização de commit/push em branch dedicada; depois wiring
runtime do registry/rate-limit (P1-03/P1-04) e extração incremental de `http.ts`.

### STATUS

IN_PROGRESS

## 2026-09-09 — MOD-AAA Round-1: publicação dos 6 commits

### TIMESTAMP

2026-09-09T09:15:00-0300

### ACTION

Push normal de `e3501e4..fe36b3d` para `origin/aaa/round-10-verification`
(6 commits: feat api, ci security, feat release, fix deps, docs modernization,
docs runtime). `main` intocado. Release-traceability PASS em worktree com
commits alcançáveis. Nenhum deploy, migration produtiva ou dado real.

### RESULT

Remoto sincronizado na branch de verificação; nenhuma execução de workflow
remoto inferida desta ação.

### NEXT

Acompanhar runs remotos (quality + security.yml estreante); revisão de Ricardo.

### STATUS

IN_PROGRESS
