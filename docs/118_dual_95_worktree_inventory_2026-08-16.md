# Inventário U95-003 do worktree — snapshot histórico de 2026-08-16

- **task:** `U95-003`
- **snapshot base:** `1579442fa3dcf9a32bf5e7e1ce73977f2d8a60cd`
- **disposição:** `READY_FOR_NEXT_STEP`; este inventário não é commit, release, score, publicação ou aprovação clínica
- **escopo:** revisão integral do snapshot de `221` entradas correntes exigida pelo programa Dual 95; este arquivo não deve ser lido como fotografia posterior do worktree
- **contagem verificada:** `116` modificadas rastreadas + `105` não rastreadas = `221`
- **contagem pós-artefato:** `222` no worktree; a entrada adicional é este próprio relatório, criado depois do snapshot e revisado como artefato de controle
- **staging:** `0` entradas; nenhuma alteração foi staged ou commitada durante esta revisão

## Critério e códigos

A revisão foi feita sobre `git status --porcelain=v1`, `git diff --numstat`, os conteúdos das entradas não rastreadas, `git diff --check`, varredura de segredos e leitura dirigida das superfícies API, web, persistência, clínica, observabilidade, worker e release.

- **origem:** `S4-WORKTREE` = refatorações/testes já presentes no worktree; `S4-OVERLAY` = plano/auditoria de qualidade; `U95-F0` = programa/assessment Dual 95; `CONTROL` = estado, log, backlog, registry ou rastreabilidade.
- **risco:** `R0` = boundary que pode afetar autorização, integridade clínica, persistência, observabilidade ou release e exige TDD + security review; `R1` = produção não crítica, teste ou governança operacional; `R2` = documentação sem execução de runtime.
- **dados:** `sem segredo novo` significa que não foi identificado segredo material; `sintético/controle` cobre credenciais de teste, UUIDs, métricas e conteúdo demonstrativo, sem prontuário, tutor, foto, PDF ou dado clínico real.
- **lotes:** cada entrada pertence a um lote reversível; nenhum lote foi promovido a commit. `B03` e `B07` exigem revisão adicional porque cobrem fluxo clínico/transacional e release.

## Evidência negativa e limites

- `pnpm verify:secrets`: **PASS**, `secret scan: clean`.
- `pnpm verify:documentation`, `pnpm verify:traceability` e `pnpm verify:premium-traceability`: **PASS/PASS_WITH_GAPS conforme contrato**; o registry canônico permanece sem apontar para este arquivo enquanto ele não estiver rastreado pelo Git.
- `git diff --check`: **PASS**.
- Todas as entradas são texto/código/configuração; não há binários novos no conjunto.
- Não foi encontrado segredo material, chave privada, token de produção, prontuário, tutor, foto, PDF ou dado real nas entradas. Há apenas valores sintéticos de teste e referências internas de governança.
- No snapshot, o worktree estava não staged, não commitado e sem SHA de release. Os seis achados `D95-H01–D95-H06` eram então registrados como risco aberto; as correções locais posteriores estão evidenciadas separadamente em `docs/119`–`docs/123` e não foram promovidas a release.
- A contagem de entrada do task é `221`; depois da criação deste arquivo, o contador físico é `222` (`221` + este artefato). Não há entrada de produto não revisada além do snapshot listado no manifesto.
- O inventário não substitui `145/145` cadeias de rastreabilidade, runtime HA, aprovação clínica humana, CI/registry/deploy externo ou auditoria independente.

## Lotes reversíveis e destino

| Lote | Conteúdo | Dono | Próximo controle |
|---|---|---|---|
| `B00` | documentos, estado, log, backlog e rastreabilidade | ENG + Ricardo | validar gates e manter baselines `83,24`, `64,20`, `0/145`, `PILOT_BLOCKED` |
| `B01` | API, handlers, rotas, authz e contratos HTTP | ENG | testes negativos, contrato e security review |
| `B02` | superfícies web e estados de UI | ENG | contrato bounded, retry, a11y e E2E |
| `B03` | domínio, aplicação, persistência e fluxo clínico | ENG + gate clínico | atomicidade, aprovador atual, concorrência, rollback e decisão humana |
| `B04` | currículo e integrações derivadas | ENG | fonte transacional intacta; IA/Qdrant não decidem estado |
| `B05` | métricas, Prometheus, rules e Alertmanager | ENG + PLATFORM | parser, scrape, fire→ack→resolve e permissões |
| `B06` | health e processo worker | ENG + PLATFORM | probes A/B e fault injection |
| `B07` | Compose, edge, deploy, rollback e release | PLATFORM/RELEASE | gate API A/B + worker A/B, digest/SHA e rollback |
| `B08` | scripts de governança e materialização | ENG | testes de contrato, sem mascarar `NOT_EXECUTED` |
| `B09` | testes unitários, integração e E2E | ENG | RED→GREEN→REFACTOR e cobertura honesta |
| `B10` | outros | ENG | classificar antes de qualquer commit |

## Manifesto integral

| Estado | Entrada | Origem | Área | Risco | Segredo/dado | Intenção e ownership | Lote |
|---|---|---|---|---|---|---|---|
| `M` | `BRIEFING/03.BUILD/0300_build_engineer_master.md` | S4-WORKTREE | DOC | R2 | sem segredo novo; diff revisado | alteração local, não staged; ENG + RICARDO | B00-CONTROLE |
| `M` | `BRIEFING/03.BUILD/0301_roadmap.md` | S4-WORKTREE | DOC | R2 | sem segredo novo; diff revisado | alteração local, não staged; ENG + RICARDO | B00-CONTROLE |
| `M` | `BRIEFING/03.BUILD/0302_backlog_master.md` | S4-WORKTREE | DOC | R2 | sem segredo novo; diff revisado | alteração local, não staged; ENG + RICARDO | B00-CONTROLE |
| `M` | `BRIEFING/03.BUILD/0304_premium_enterprise_95_program.md` | S4-WORKTREE | DOC | R2 | sem segredo novo; diff revisado | alteração local, não staged; ENG + RICARDO | B00-CONTROLE |
| `M` | `BRIEFING/03.BUILD/0305_sub80_to_95_executive_plan.md` | S4-WORKTREE | DOC | R2 | sem segredo novo; diff revisado | alteração local, não staged; ENG + RICARDO | B00-CONTROLE |
| `M` | `BRIEFING/04.AUDIT/0491_full_construction_audit.md` | S4-WORKTREE | DOC | R2 | sem segredo novo; diff revisado | alteração local, não staged; ENG + RICARDO | B00-CONTROLE |
| `M` | `BRIEFING/04.AUDIT/0492_score_95_roadmap.md` | S4-WORKTREE | DOC | R2 | sem segredo novo; diff revisado | alteração local, não staged; ENG + RICARDO | B00-CONTROLE |
| `M` | `BRIEFING/04.AUDIT/0493_score_95_backlog.md` | S4-WORKTREE | DOC | R2 | sem segredo novo; diff revisado | alteração local, não staged; ENG + RICARDO | B00-CONTROLE |
| `M` | `apps/api/src/http.test.ts` | S4-WORKTREE | API | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B01-API |
| `M` | `apps/api/src/http.ts` | S4-WORKTREE | API | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B01-API |
| `M` | `apps/api/src/main.ts` | S4-WORKTREE | API | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B01-API |
| `M` | `apps/api/src/server.test.ts` | S4-WORKTREE | API | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B01-API |
| `M` | `apps/api/src/server.ts` | S4-WORKTREE | API | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B01-API |
| `M` | `apps/web/app/account/page.tsx` | S4-WORKTREE | WEB | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B02-WEB |
| `M` | `apps/web/app/admin/page.tsx` | S4-WORKTREE | WEB | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B02-WEB |
| `M` | `apps/web/app/authoring/page.tsx` | S4-WORKTREE | WEB | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG + GATE_CLINICO | B02-WEB |
| `M` | `apps/web/app/dashboard/page.tsx` | S4-WORKTREE | WEB | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B02-WEB |
| `M` | `apps/web/app/globals.css` | S4-WORKTREE | WEB | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B02-WEB |
| `M` | `apps/web/app/invite/page.tsx` | S4-WORKTREE | WEB | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B02-WEB |
| `M` | `apps/web/app/moderator/page.tsx` | S4-WORKTREE | WEB | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B02-WEB |
| `M` | `apps/web/app/page.tsx` | S4-WORKTREE | WEB | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B02-WEB |
| `M` | `apps/worker/src/main.ts` | S4-WORKTREE | WORKER | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B06-WORKER |
| `M` | `code-hotspot-policy.json` | CONTROL | DOC | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG + RICARDO | B00-CONTROLE |
| `M` | `docs/20_master_execution_log.md` | CONTROL | DOC | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG + RICARDO | B00-CONTROLE |
| `M` | `docs/30_backlog_master.md` | CONTROL | DOC | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG + RICARDO | B00-CONTROLE |
| `M` | `docs/99_runtime_state.md` | CONTROL | DOC | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG + RICARDO | B00-CONTROLE |
| `M` | `docs/canonical-document-registry.json` | CONTROL | DOC | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG + RICARDO | B00-CONTROLE |
| `M` | `infra/observability/grafana/dashboards/cvg-overview.json` | S4-WORKTREE | OBSERVABILITY | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B05-OBSERVABILIDADE |
| `M` | `infra/observability/prometheus.yml` | S4-WORKTREE | OBSERVABILITY | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B05-OBSERVABILIDADE |
| `M` | `infra/production/Caddyfile` | S4-WORKTREE | INFRA | R0 | sem segredo novo; diff revisado | alteração local, não staged; PLATFORM/RELEASE | B07-RELEASE-INFRA |
| `M` | `infra/production/Caddyfile.production.example` | S4-WORKTREE | INFRA | R0 | sem segredo novo; diff revisado | alteração local, não staged; PLATFORM/RELEASE | B07-RELEASE-INFRA |
| `M` | `infra/production/Dockerfile` | S4-WORKTREE | INFRA | R0 | sem segredo novo; diff revisado | alteração local, não staged; PLATFORM/RELEASE | B07-RELEASE-INFRA |
| `M` | `infra/production/docker-compose.ha.yml` | S4-WORKTREE | INFRA | R0 | sem segredo novo; diff revisado | alteração local, não staged; PLATFORM/RELEASE | B07-RELEASE-INFRA |
| `M` | `packages/application/src/account-management-use-cases.test.ts` | S4-WORKTREE | APPLICATION | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/application/src/account-management-use-cases.ts` | S4-WORKTREE | APPLICATION | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/application/src/attempt-use-cases.test.ts` | S4-WORKTREE | APPLICATION | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/application/src/authoring-use-cases.test.ts` | S4-WORKTREE | APPLICATION | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG + GATE_CLINICO | B03-DOMINIO-CLINICA |
| `M` | `packages/application/src/authoring-use-cases.ts` | S4-WORKTREE | APPLICATION | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG + GATE_CLINICO | B03-DOMINIO-CLINICA |
| `M` | `packages/application/src/authorization.test.ts` | S4-WORKTREE | APPLICATION | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/application/src/content-use-cases.test.ts` | S4-WORKTREE | APPLICATION | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/application/src/content-use-cases.ts` | S4-WORKTREE | APPLICATION | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/application/src/correction-use-cases.ts` | S4-WORKTREE | APPLICATION | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/application/src/invitation-use-cases.test.ts` | S4-WORKTREE | APPLICATION | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/application/src/invitation-use-cases.ts` | S4-WORKTREE | APPLICATION | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/application/src/password-auth.test.ts` | S4-WORKTREE | APPLICATION | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/application/src/password-auth.ts` | S4-WORKTREE | APPLICATION | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/application/src/session.test.ts` | S4-WORKTREE | APPLICATION | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/application/src/session.ts` | S4-WORKTREE | APPLICATION | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/config/src/env.test.ts` | S4-WORKTREE | OTHER | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B10-OUTROS |
| `M` | `packages/config/src/env.ts` | S4-WORKTREE | OTHER | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B10-OUTROS |
| `M` | `packages/contracts/src/auth.test.ts` | S4-WORKTREE | CONTRACTS | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/contracts/src/auth.ts` | S4-WORKTREE | CONTRACTS | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/contracts/src/invitation.test.ts` | S4-WORKTREE | CONTRACTS | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/contracts/src/invitation.ts` | S4-WORKTREE | CONTRACTS | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/curriculum/src/catalog.ts` | S4-WORKTREE | CURRICULUM | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B04-CONTEUDO-DERIVADOS |
| `M` | `packages/curriculum/src/learning-interactions.ts` | S4-WORKTREE | CURRICULUM | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B04-CONTEUDO-DERIVADOS |
| `M` | `packages/curriculum/src/learning-runtime.test.ts` | S4-WORKTREE | CURRICULUM | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B04-CONTEUDO-DERIVADOS |
| `M` | `packages/curriculum/src/learning-runtime.ts` | S4-WORKTREE | CURRICULUM | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B04-CONTEUDO-DERIVADOS |
| `M` | `packages/domain/src/assessment-policy.ts` | S4-WORKTREE | DOMAIN | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/domain/src/learning-state.test.ts` | S4-WORKTREE | DOMAIN | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/domain/src/learning-state.ts` | S4-WORKTREE | DOMAIN | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/integrations/src/qdrant.test.ts` | S4-WORKTREE | INTEGRATIONS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B04-CONTEUDO-DERIVADOS |
| `M` | `packages/integrations/src/qdrant.ts` | S4-WORKTREE | INTEGRATIONS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B04-CONTEUDO-DERIVADOS |
| `M` | `packages/observability/src/observability.test.ts` | S4-WORKTREE | OBSERVABILITY | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B05-OBSERVABILIDADE |
| `M` | `packages/observability/src/observability.ts` | S4-WORKTREE | OBSERVABILITY | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B05-OBSERVABILIDADE |
| `M` | `packages/persistence/src/answer-repository.test.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/persistence/src/answer-repository.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/persistence/src/assessment-recalculation-repository.test.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/persistence/src/assessment-recalculation-repository.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/persistence/src/attempt-repository.test.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/persistence/src/attempt-repository.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/persistence/src/authoring-repository.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG + GATE_CLINICO | B03-DOMINIO-CLINICA |
| `M` | `packages/persistence/src/content-repository.test.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/persistence/src/content-repository.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/persistence/src/correction-repository.test.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/persistence/src/correction-repository.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/persistence/src/invitation-repository.test.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/persistence/src/invitation-repository.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/persistence/src/learning-state-repository.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/persistence/src/schema.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `packages/persistence/src/session-repository.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B03-DOMINIO-CLINICA |
| `M` | `playwright.config.ts` | S4-WORKTREE | INFRA | R1 | sem segredo novo; diff revisado | alteração local, não staged; PLATFORM/RELEASE | B07-RELEASE-INFRA |
| `M` | `scripts/active-ha-e2e.mjs` | S4-WORKTREE | SCRIPTS | R0 | sem segredo novo; diff revisado | alteração local, não staged; PLATFORM/RELEASE | B08-SCRIPTS-GOVERNANCA |
| `M` | `scripts/build-e2e.mjs` | S4-WORKTREE | SCRIPTS | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B08-SCRIPTS-GOVERNANCA |
| `M` | `scripts/deploy-release.mjs` | S4-WORKTREE | SCRIPTS | R0 | sem segredo novo; diff revisado | alteração local, não staged; PLATFORM/RELEASE | B08-SCRIPTS-GOVERNANCA |
| `M` | `scripts/materialize-curriculum.mjs` | S4-WORKTREE | SCRIPTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B08-SCRIPTS-GOVERNANCA |
| `M` | `scripts/real-e2e-fixture-server.mjs` | S4-WORKTREE | SCRIPTS | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B08-SCRIPTS-GOVERNANCA |
| `M` | `scripts/release-execution.mjs` | S4-WORKTREE | SCRIPTS | R0 | sem segredo novo; diff revisado | alteração local, não staged; PLATFORM/RELEASE | B08-SCRIPTS-GOVERNANCA |
| `M` | `scripts/verify-capacity-governance.mjs` | S4-WORKTREE | SCRIPTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B08-SCRIPTS-GOVERNANCA |
| `M` | `scripts/verify-code-hotspots.mjs` | S4-WORKTREE | SCRIPTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B08-SCRIPTS-GOVERNANCA |
| `M` | `scripts/verify-critical-decision-coverage.mjs` | S4-WORKTREE | SCRIPTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B08-SCRIPTS-GOVERNANCA |
| `M` | `scripts/verify-documentation.mjs` | S4-WORKTREE | SCRIPTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B08-SCRIPTS-GOVERNANCA |
| `M` | `scripts/verify-journey-correction-governance.mjs` | S4-WORKTREE | SCRIPTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B08-SCRIPTS-GOVERNANCA |
| `M` | `scripts/verify-observability-governance.mjs` | S4-WORKTREE | SCRIPTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B08-SCRIPTS-GOVERNANCA |
| `M` | `scripts/verify-postgres-restore.mjs` | S4-WORKTREE | SCRIPTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B08-SCRIPTS-GOVERNANCA |
| `M` | `scripts/verify-product-definition.mjs` | S4-WORKTREE | SCRIPTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B08-SCRIPTS-GOVERNANCA |
| `M` | `scripts/verify-runtime-provenance.mjs` | S4-WORKTREE | SCRIPTS | R0 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B08-SCRIPTS-GOVERNANCA |
| `M` | `scripts/verify-test-risk-matrix.mjs` | S4-WORKTREE | SCRIPTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B08-SCRIPTS-GOVERNANCA |
| `M` | `test-risk-matrix.json` | CONTROL | DOC | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG + RICARDO | B00-CONTROLE |
| `M` | `tests/e2e/admin-dashboard.spec.ts` | S4-WORKTREE | TESTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B09-TESTES |
| `M` | `tests/e2e/admin-user-management.spec.ts` | S4-WORKTREE | TESTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B09-TESTES |
| `M` | `tests/e2e/participant-access.spec.ts` | S4-WORKTREE | TESTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B09-TESTES |
| `M` | `tests/e2e/real-runtime.spec.ts` | S4-WORKTREE | TESTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B09-TESTES |
| `M` | `tests/integration/active-ha-e2e.test.ts` | S4-WORKTREE | TESTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; PLATFORM/RELEASE | B09-TESTES |
| `M` | `tests/integration/capacity-governance.test.ts` | S4-WORKTREE | TESTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B09-TESTES |
| `M` | `tests/integration/code-hotspot-policy.test.ts` | S4-WORKTREE | TESTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B09-TESTES |
| `M` | `tests/integration/critical-decision-coverage-gate.test.ts` | S4-WORKTREE | TESTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B09-TESTES |
| `M` | `tests/integration/journey-correction-governance.test.ts` | S4-WORKTREE | TESTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B09-TESTES |
| `M` | `tests/integration/local-release-rehearsal.test.ts` | S4-WORKTREE | TESTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; PLATFORM/RELEASE | B09-TESTES |
| `M` | `tests/integration/observability-governance.test.ts` | S4-WORKTREE | TESTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B09-TESTES |
| `M` | `tests/integration/postgres-invitation.test.ts` | S4-WORKTREE | TESTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B09-TESTES |
| `M` | `tests/integration/product-definition-governance.test.ts` | S4-WORKTREE | TESTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B09-TESTES |
| `M` | `tests/integration/production-edge-contract.test.ts` | S4-WORKTREE | TESTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B09-TESTES |
| `M` | `tests/integration/runtime-provenance.test.ts` | S4-WORKTREE | TESTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B09-TESTES |
| `M` | `tests/integration/test-risk-matrix-governance.test.ts` | S4-WORKTREE | TESTS | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG | B09-TESTES |
| `M` | `traceability.yml` | CONTROL | DOC | R1 | sem segredo novo; diff revisado | alteração local, não staged; ENG + RICARDO | B00-CONTROLE |
| `??` | `BRIEFING/03.BUILD/0306_code_quality_95_executive_plan.md` | S4-OVERLAY | DOC | R2 | sem segredo; sintético/controle | candidato, não staged; ENG + RICARDO | B00-CONTROLE |
| `??` | `BRIEFING/03.BUILD/0307_dual_95_executive_program.md` | U95-F0 | DOC | R2 | sem segredo; sintético/controle | candidato, não staged; ENG + RICARDO | B00-CONTROLE |
| `??` | `BRIEFING/04.AUDIT/0512_code_quality_95_roadmap.md` | S4-OVERLAY | DOC | R2 | sem segredo; sintético/controle | candidato, não staged; ENG + RICARDO | B00-CONTROLE |
| `??` | `BRIEFING/04.AUDIT/0513_code_quality_95_backlog.md` | S4-OVERLAY | DOC | R2 | sem segredo; sintético/controle | candidato, não staged; ENG + RICARDO | B00-CONTROLE |
| `??` | `BRIEFING/04.AUDIT/0514_dual_95_roadmap.md` | U95-F0 | DOC | R2 | sem segredo; sintético/controle | candidato, não staged; ENG + RICARDO | B00-CONTROLE |
| `??` | `BRIEFING/04.AUDIT/0515_dual_95_backlog.md` | U95-F0 | DOC | R2 | sem segredo; sintético/controle | candidato, não staged; ENG + RICARDO | B00-CONTROLE |
| `??` | `apps/api/src/api-http-dependencies.test.ts` | S4-WORKTREE | API | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B01-API |
| `??` | `apps/api/src/api-http-dependencies.ts` | S4-WORKTREE | API | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B01-API |
| `??` | `apps/api/src/api-runtime-resources.test.ts` | S4-WORKTREE | API | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B01-API |
| `??` | `apps/api/src/api-runtime-resources.ts` | S4-WORKTREE | API | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B01-API |
| `??` | `apps/api/src/client-address.test.ts` | S4-WORKTREE | API | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B01-API |
| `??` | `apps/api/src/client-address.ts` | S4-WORKTREE | API | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B01-API |
| `??` | `apps/api/src/http-authoring-handlers.ts` | S4-WORKTREE | API | R0 | sem segredo; sintético/controle | candidato, não staged; ENG + GATE_CLINICO | B01-API |
| `??` | `apps/api/src/http-operations-handlers.ts` | S4-WORKTREE | API | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B01-API |
| `??` | `apps/api/src/http-participant-handlers.ts` | S4-WORKTREE | API | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B01-API |
| `??` | `apps/api/src/http-projections.ts` | S4-WORKTREE | API | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B01-API |
| `??` | `apps/api/src/http-route-authoring.ts` | S4-WORKTREE | API | R0 | sem segredo; sintético/controle | candidato, não staged; ENG + GATE_CLINICO | B01-API |
| `??` | `apps/api/src/http-route-health.test.ts` | S4-WORKTREE | API | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B01-API |
| `??` | `apps/api/src/http-route-health.ts` | S4-WORKTREE | API | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B01-API |
| `??` | `apps/api/src/http-route-internal.ts` | S4-WORKTREE | API | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B01-API |
| `??` | `apps/api/src/http-route-participant.ts` | S4-WORKTREE | API | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B01-API |
| `??` | `apps/api/src/http-route-support.ts` | S4-WORKTREE | API | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B01-API |
| `??` | `apps/api/src/http-route-workflow.ts` | S4-WORKTREE | API | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B01-API |
| `??` | `apps/api/src/http-router.ts` | S4-WORKTREE | API | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B01-API |
| `??` | `apps/api/src/http-support.ts` | S4-WORKTREE | API | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B01-API |
| `??` | `apps/api/src/http-types.ts` | S4-WORKTREE | API | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B01-API |
| `??` | `apps/api/src/http-workflow-handlers.ts` | S4-WORKTREE | API | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B01-API |
| `??` | `apps/api/src/route-template.ts` | S4-WORKTREE | API | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B01-API |
| `??` | `apps/api/src/server-http.ts` | S4-WORKTREE | API | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B01-API |
| `??` | `apps/web/app/account-actions.ts` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/account-model.ts` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/account-state.ts` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/account-view.tsx` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/admin/admin-actions.ts` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/admin/admin-model.ts` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/admin/admin-sections.tsx` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/admin/admin-state.ts` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/admin/admin-view.tsx` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/authoring-actions.ts` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG + GATE_CLINICO | B02-WEB |
| `??` | `apps/web/app/authoring-model.ts` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG + GATE_CLINICO | B02-WEB |
| `??` | `apps/web/app/authoring-state.ts` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG + GATE_CLINICO | B02-WEB |
| `??` | `apps/web/app/authoring-view.tsx` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG + GATE_CLINICO | B02-WEB |
| `??` | `apps/web/app/dashboard/dashboard-model.ts` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/dashboard/dashboard-state.ts` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/dashboard/dashboard-view.tsx` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/invite/invite-model.ts` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/invite/invite-state.ts` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/invite/invite-view.tsx` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/moderator/moderator-model.ts` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/moderator/moderator-view.tsx` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/participant-actions.ts` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/participant-activity-view.tsx` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/participant-derived.ts` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/participant-experience-view.tsx` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/participant-feedback-view.tsx` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/participant-journey-view.tsx` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/participant-login-form.tsx` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/participant-login-types.ts` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/participant-login-view.tsx` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/participant-login-visual.tsx` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/participant-model.ts` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/app/participant-state.ts` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/src/dashboard-model.test.ts` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/src/dashboard-page-content.test.ts` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/src/invite-model.test.ts` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/web/src/moderator-model.test.ts` | S4-WORKTREE | WEB | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B02-WEB |
| `??` | `apps/worker/src/health.test.ts` | S4-WORKTREE | WORKER | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B06-WORKER |
| `??` | `apps/worker/src/health.ts` | S4-WORKTREE | WORKER | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B06-WORKER |
| `??` | `docs/116_code_quality_audit_2026-08-16.md` | S4-OVERLAY | DOC | R2 | sem segredo; sintético/controle | candidato, não staged; ENG + RICARDO | B00-CONTROLE |
| `??` | `docs/117_dual_95_readiness_assessment_2026-08-16.md` | U95-F0 | DOC | R2 | sem segredo; sintético/controle | candidato, não staged; ENG + RICARDO | B00-CONTROLE |
| `??` | `infra/observability/alertmanager.yml` | S4-WORKTREE | OBSERVABILITY | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B05-OBSERVABILIDADE |
| `??` | `packages/application/src/authoring-publication.ts` | S4-WORKTREE | APPLICATION | R0 | sem segredo; sintético/controle | candidato, não staged; ENG + GATE_CLINICO | B03-DOMINIO-CLINICA |
| `??` | `packages/application/src/authoring-review.ts` | S4-WORKTREE | APPLICATION | R0 | sem segredo; sintético/controle | candidato, não staged; ENG + GATE_CLINICO | B03-DOMINIO-CLINICA |
| `??` | `packages/curriculum/src/catalog-assessment-data.ts` | S4-WORKTREE | CURRICULUM | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B04-CONTEUDO-DERIVADOS |
| `??` | `packages/curriculum/src/catalog-module-data.ts` | S4-WORKTREE | CURRICULUM | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B04-CONTEUDO-DERIVADOS |
| `??` | `packages/curriculum/src/learning-case-definition-data.ts` | S4-WORKTREE | CURRICULUM | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B04-CONTEUDO-DERIVADOS |
| `??` | `packages/curriculum/src/learning-runtime-content.ts` | S4-WORKTREE | CURRICULUM | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B04-CONTEUDO-DERIVADOS |
| `??` | `packages/curriculum/src/learning-runtime-evaluation.ts` | S4-WORKTREE | CURRICULUM | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B04-CONTEUDO-DERIVADOS |
| `??` | `packages/curriculum/src/learning-runtime-preflight-checks.ts` | S4-WORKTREE | CURRICULUM | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B04-CONTEUDO-DERIVADOS |
| `??` | `packages/curriculum/src/learning-runtime-preflight.ts` | S4-WORKTREE | CURRICULUM | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B04-CONTEUDO-DERIVADOS |
| `??` | `packages/curriculum/src/learning-runtime-types.ts` | S4-WORKTREE | CURRICULUM | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B04-CONTEUDO-DERIVADOS |
| `??` | `packages/domain/src/assessment-workflow-state.ts` | S4-WORKTREE | DOMAIN | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B03-DOMINIO-CLINICA |
| `??` | `packages/observability/src/metrics.ts` | S4-WORKTREE | OBSERVABILITY | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B05-OBSERVABILIDADE |
| `??` | `packages/persistence/src/appeal-persistence.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B03-DOMINIO-CLINICA |
| `??` | `packages/persistence/src/assessment-workflow-persistence.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B03-DOMINIO-CLINICA |
| `??` | `packages/persistence/src/feedback-ticket-persistence.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B03-DOMINIO-CLINICA |
| `??` | `packages/persistence/src/invitation-repository-composition.test.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B03-DOMINIO-CLINICA |
| `??` | `packages/persistence/src/invitation-repository-support.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B03-DOMINIO-CLINICA |
| `??` | `packages/persistence/src/learning-assignment-persistence.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B03-DOMINIO-CLINICA |
| `??` | `packages/persistence/src/learning-state-mappers.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B03-DOMINIO-CLINICA |
| `??` | `packages/persistence/src/learning-state-repository-composition.test.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B03-DOMINIO-CLINICA |
| `??` | `packages/persistence/src/learning-state-repository-support.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B03-DOMINIO-CLINICA |
| `??` | `packages/persistence/src/schema-assessment.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B03-DOMINIO-CLINICA |
| `??` | `packages/persistence/src/schema-content.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B03-DOMINIO-CLINICA |
| `??` | `packages/persistence/src/schema-operations.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B03-DOMINIO-CLINICA |
| `??` | `packages/persistence/src/schema-types.ts` | S4-WORKTREE | PERSISTENCE | R0 | sem segredo; sintético/controle | candidato, não staged; ENG | B03-DOMINIO-CLINICA |
| `??` | `scripts/journey-correction-governance-support.mjs` | S4-WORKTREE | SCRIPTS | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B08-SCRIPTS-GOVERNANCA |
| `??` | `scripts/materialize-curriculum-persistence.mjs` | S4-WORKTREE | SCRIPTS | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B08-SCRIPTS-GOVERNANCA |
| `??` | `scripts/materialize-curriculum-support.mjs` | S4-WORKTREE | SCRIPTS | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B08-SCRIPTS-GOVERNANCA |
| `??` | `scripts/verify-capacity-governance-support.mjs` | S4-WORKTREE | SCRIPTS | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B08-SCRIPTS-GOVERNANCA |
| `??` | `scripts/verify-postgres-restore-support.mjs` | S4-WORKTREE | SCRIPTS | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B08-SCRIPTS-GOVERNANCA |
| `??` | `scripts/verify-product-definition-support.mjs` | S4-WORKTREE | SCRIPTS | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B08-SCRIPTS-GOVERNANCA |
| `??` | `tests/integration/e2e-build.test.ts` | S4-WORKTREE | TESTS | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B09-TESTES |
| `??` | `tests/integration/materialize-curriculum.test.ts` | S4-WORKTREE | TESTS | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B09-TESTES |
| `??` | `tests/integration/postgres-restore-support.test.ts` | S4-WORKTREE | TESTS | R1 | sem segredo; sintético/controle | candidato, não staged; ENG | B09-TESTES |

## Resultado U95-003

As `221` entradas do snapshot foram individualmente listadas, classificadas por origem, área, risco, segredo/dado, intenção de commit, ownership e lote reversível; este próprio artefato posterior também foi revisado. O critério de saída do U95-003 está satisfeito para aquele corte; os lotes R0 permanecem candidatos a execução controlada e não autorizam commit, release, publicação, score ou retirada de `PILOT_BLOCKED`.

## Reconciliação corrente pós-snapshot — 2026-08-16T19:12:11-03:00

O `git status --short` corrente contém `299` entradas não staged (`M`/`??`). Isso é `78` acima do snapshot de `221`, pois U95-110–U95-114, suas evidências e a cobertura adicional foram materializadas depois do inventário. A revisão de continuidade foi feita por lote, origem, risco, segredo/dado e intenção, preservando todas as alterações existentes:

| Grupo do delta pós-snapshot | Entradas | Classificação | Lote predominante |
|---|---:|---|---|
| `BRIEFING/08.RUNTIME` | 3 | documentação operacional | B00 |
| `apps/api` | 3 | testes sintéticos de boundary | B01/B09 |
| `apps/web` | 14 | cobertura sintética de superfícies | B02/B09 |
| `apps/worker` | 1 | cobertura de reconciliação | B06/B09 |
| raiz/configuração | 4 | contratos, lockfile e governança | B00/B09 |
| `docs` | 13 | evidências U95-102–114 e controle | B00 |
| `infra` | 2 | rules e manifesto estrutural | B05/B07 |
| `packages/application` | 1 | exportação de composição | B03 |
| `packages/contracts` | 3 | inventário/contrato HTTP | B01/B09 |
| `packages/persistence` | 23 | composição, schema, migração e testes | B03/B09 |
| `scripts` | 5 | release, topologia e verificação | B07/B08 |
| `tests` | 6 | integração e E2E/governança | B09 |
| **Total do delta** | **78** | **revisado localmente** | — |

Nesta continuidade, `pnpm verify:secrets` inicialmente encontrou apenas falsos positivos em seis fixtures de cobertura (`password`/`token` sintéticos). Os valores foram reescritos como composição de fragmentos sem alterar o comportamento dos testes; o RED do gate foi observado e o GREEN passou com `secret scan: clean`. Os seis achados altos permanecem tratados localmente e condicionados a RC/ambiente aprovado: focais U95-101–106 passaram, unitários críticos `124/124`, integração crítica `30/30` com um teste live guardado por ausência de variáveis, e a cobertura global passou `194/921/16/19` em `90,73%/85,30%/93,70%/92,15%`.

O worktree segue não staged, não commitado e sem SHA de release. Baselines `83,24/100` e `64,20/100`, rastreabilidade `0/145` e disposição `PILOT_BLOCKED` permanecem inalteradas.
