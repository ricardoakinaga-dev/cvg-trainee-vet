# 0513 — Backlog de remediação da auditoria de qualidade 2026-08-16

> **Registro histórico absorvido:** o backlog executivo corrente é `0515_dual_95_backlog.md`. Os IDs `AUD-CQ-*` permanecem aliases de rastreabilidade; seus status correntes são coordenados por `U95-*`.

**Relatório de origem:** `docs/116_code_quality_audit_2026-08-16.md`
**Plano:** `BRIEFING/03.BUILD/0306_code_quality_95_executive_plan.md`
**Roadmap:** `BRIEFING/04.AUDIT/0512_code_quality_95_roadmap.md`

## 1. Regras do backlog

Cada item segue `TASK → RED → GREEN → REFACTOR → REVIEW → AUDIT`. `READY_FOR_NEXT_STEP` significa pronto para execução, não concluído. `WAITING_HUMAN_APPROVAL` é reservado para decisão, ambiente ou ação externa. Nenhum item promove nota sozinho.

## 2. Backlog executável

| ID | Pri | Estado atual | Workstream | Item(s) da nota | Dependências | Critério de pronto |
|---|---|---|---|---|---|---|
| AUD-CQ-001 | P1 | READY_FOR_NEXT_STEP | F1/F6 | 1, 13, 15, 16 | Git/RC local | `git cat-file` alcançável; label/env/digest/SHA alinhados; testes positivo/negativo; runtime/revisão no RC pendentes |
| AUD-CQ-002 | P1 | READY_FOR_NEXT_STEP | F3/F1 | 3, 10, 16 | política clínica | aprovador designado obrigatório em produção; ausência/diferença/correto testados; revisão clínica/RC pendentes |
| AUD-CQ-003 | P1 | READY_FOR_NEXT_STEP | F3/F2 | 9, 10 | sessão/roles | mudança de role/scope e senha revogam sessões; step-up, runtime e reauditoria pendentes |
| AUD-CQ-004 | P1 | READY_FOR_NEXT_STEP | F2 | 7, 8, 9 | contratos HTTP | todo request lifecycle terminal; `503/500` seguro; causa sanitizada; zero hang/unhandled rejection local; runtime pendente |
| AUD-CQ-005 | P1 | READY_FOR_NEXT_STEP | F5/F6 | 1, 7, 12, 15 | ambiente E2E | `pnpm test:e2e` passa `26/26`; CI remoto, artefatos/teardown retidos e reauditoria pendentes |
| AUD-CQ-006 | P1 | READY_FOR_NEXT_STEP | F6 | 13, 14, 15 | Compose/Prometheus | readiness, regras e workers verificados localmente; Alertmanager/ack externo e runtime pendentes |
| AUD-CQ-007 | P1 | READY_FOR_NEXT_STEP | F6 | 13, 15 | release manifest | canário direto implementado; execução real, rollback por digest e reauditoria pendentes |
| AUD-CQ-008 | P1 | READY_FOR_NEXT_STEP | F3/F6 | 10, 13, 14, 15 | infra local | OTLP restrito, arquivos `0600`, hardening e scanner verificados localmente; rotação/RC externo pendentes |
| AUD-CQ-009 | P1 | READY_FOR_NEXT_STEP | F3/F4/F2 | 2, 7, 9, 10, 11 | contratos de sessão | logout, papéis, primeiro acesso transacional e retry implementados; reauditoria no RC pendente |
| AUD-CQ-010 | P1 | IN_PROGRESS | F1/F5 | 9, 10, 12, 16 | matriz P0/P1 | gate `7/7` a `100%` passou; matriz reporta `87/87` success, `63/87` error, `26/87` denied, `36/87` conflict e `11/87` linhas completas; provas por linha/N/A aprovado e reauditoria pendentes |
| AUD-CQ-011 | P2 | IN_PROGRESS | F2 | 4, 5, 6, 7, 9 | testes de caracterização | API/currículo/persistência/frontend/observabilidade/publicação clínica/governança de observabilidade/configuração de runtime/correção de resposta aberta/materialização curricular/verificador de restore/definição de produto/jornada de convite/governança da jornada de correção/persistência de convites/governança de capacidade decompostos; ratchet `152/128` passou com `152` funções longas e maior função `128` linhas, mas `22` funções >100 ainda precisam de exceção com owner/prazo ou decomposição; debt/reauditoria pendentes |
| AUD-CQ-012 | P2 | READY_FOR_NEXT_STEP | F4/F5/F2 | 4, 5, 6, 11, 12 | AUD-CQ-005 | cobertura `784` testes + `18` skips (`84,81%`/`80,18%`/`87,13%`/`85,65%`) e E2E `26/26` locais; Firefox/WebKit/mobile/a11y manual pendentes |
| AUD-CQ-013 | P2 | READY_FOR_NEXT_STEP | F1 | 1, 2, 3, 16 | catálogo documental | 0305 histórico/supersedido e gate documental global verificados; reauditoria de governança pendente |
| AUD-CQ-014 | P2 | READY_FOR_NEXT_STEP | F2/F3 | 7, 8, 10, 12 | identidade/proxy confiável | XFF confiável implementado/testado; prova distribuída/por rota e reauditoria pendentes |
| AUD-CQ-015 | P2 | WAITING_HUMAN_APPROVAL | F1/F6 | 1–16 | G1–G5 + autorizações | CI/registry/deploy/IdP/TLS/backup/DR/UAT/WCAG/RUM/soak/beta reais no mesmo RC; auditor independente dá ≥95 em todos |

## 3. Fatiamento de execução

### Lote A — P1 que invalidam confiança

`AUD-CQ-001` a `AUD-CQ-005`. Testes devem demonstrar que o gate falha para SHA inexistente, aprovador ausente, sessão obsoleta, rate limiter rejeitado e E2E sem contrato; depois devem passar no caminho corrigido.

### Lote B — operação e infraestrutura

`AUD-CQ-006` a `AUD-CQ-008`. A configuração precisa ser exercitada contra o runtime local. Arquivos estáticos não contam como prova de alerta, canário ou isolamento.

### Lote C — produto, UX e qualidade

`AUD-CQ-009` a `AUD-CQ-012`. Priorizar logout, retomada e decisões críticas; depois reduzir dívida e ampliar cobertura sem esconder arquivos da métrica.

### Lote D — governança e gates externos

`AUD-CQ-013` a `AUD-CQ-015`. Correções documentais são locais; CI remoto, IdP, storage, backup, UAT, revisão clínica e release só fecham com autoridade e evidência reais.

## 4. Contrato de evidência por task

Toda task deve anexar no `traceability.yml`: requisitos/achados, SPEC/PRD, módulo/arquivo, contrato, testes RED/GREEN, commit SHA existente, artefato, comando, ambiente, timestamp, resultado, rollback e limitações. Proibidos segredos, fontes licenciadas, PDFs, fotos, dados clínicos reais e URLs internas expostas ao participante.

## 5. Matriz dos 16 itens para reauditoria

| Item | Tasks mínimas | Evidência que deve existir antes de pedir nota |
|---:|---|---|
| 1 | 001, 005, 006, 013, 015 | docs canônicos atuais, CI executado, snapshots rotulados, logs e release manifest |
| 2 | 009, 010, 012, 013, 015 | jornadas PRD completas, UAT, métricas e aceite por papel |
| 3 | 002, 006, 010, 013, 015 | SPEC/contratos/runtime aderentes e publicação clínica fail-closed |
| 4 | 011, 012 | grafo/boundary, inventário-handler e extrações verificadas |
| 5 | 011, 012 | ratchet, hotspots/funções reduzidos, revisão de coesão e complexidade |
| 6 | 003, 004, 011, 012 | strict/typecheck, contratos compartilhados e ausência de casts inseguros |
| 7 | 004, 005, 014 | rotas/schema/erros únicos, validação negativa e segurança de endpoint |
| 8 | 004, 005, 010, 014 | falhas terminais, logs sanitizados, testes de erro e timeout |
| 9 | 003, 004, 010, 011 | transações tipadas, RLS/auditoria, concorrência e restore com invariantes |
| 10 | 002, 003, 008, 009, 014, 015 | authz atualizada, step-up, container/OTLP, rate limit e gates externos |
| 11 | 009, 012, 015 | logout, responsividade, WCAG manual/screen reader e performance real |
| 12 | 005, 010, 012, 015 | E2E canônico, cobertura por camada e matriz crítica 100% |
| 13 | 001, 006, 007, 008, 015 | SHA Git, readiness, HA/canário, soak/failover e rollback |
| 14 | 006, 008, 015 | regras/Alertmanager, worker metrics, backup offsite, restore/RPO/RTO/DR |
| 15 | 001, 005, 007, 015 | CI remoto, SBOM/attestation, digest, deploy progressivo/rollback |
| 16 | 001, 010, 013, 015 | `145/145` cadeias completas e mesmos SHA/artefato/ambiente |

## 6. Definition of Done

Um item do backlog só pode ser `COMPLETED` quando seu código/documento estiver implementado, testes passarem, revisão de segurança/qualidade ocorrer, evidência for persistida, rollback for conhecido, dependências e limites forem registrados e a auditoria da sprint aceitar o critério. `AUD-CQ-015` só será completado após a reauditoria independente; até lá permanece `WAITING_HUMAN_APPROVAL`.

## 7. Revalidação local S4-158 — 2026-08-16T07:50:30-03:00

- **AUD-CQ-010:** o risco de testes passou a usar `proofReferencePaths.error` explícito e validado contra a matriz; resultado local `63/87` error, `26/87` denied, `36/87` conflict e `11/87` linhas completas, sem declarar cobertura total;
- **AUD-CQ-012:** a governança passou `3/3`, `pnpm verify` passou com `171` arquivos, `765` testes, `18` skips e cobertura `84,65%`/`80,01%`/`86,76%`/`85,47%`; build e E2E `26/26` também passaram;
- **limite:** os destinos curados são índices de evidência de testes negativos, não substituem prova por branch/requisito, revisão independente, SHA/artefato ou gates externos; AUD-CQ-001–014 permanecem prontos para reauditoria e AUD-CQ-015 aguarda autorização.

## 8. Revalidação local S4-159 — 2026-08-16T08:04:01-03:00

- **AUD-CQ-011:** `preflightCurriculumDrafts` foi extraído para verificadores coesos de módulo/diagnóstico, com `18/18` testes focais e redução de `169` para `167` funções longas;
- **AUD-CQ-012:** `pnpm verify` passou com `171` arquivos, `767` testes, `18` skips e cobertura `84,65%`/`80,03%`/`86,78%`/`85,48%`; build e E2E `26/26` passaram;
- **limite:** o contrato público e o bloqueio clínico foram preservados; a evidência é local e não fecha SHA/RC, runtime HA, gates externos, revisão clínica ou reauditoria independente.

## 9. Revalidação local S4-160 — 2026-08-16T08:14:08-03:00

- **AUD-CQ-011:** `reviewAuthoringContent` foi extraído para helpers coesos de autorização, preflight, transição e persistência, sem relaxar o bloqueio de autoaprovação ou publicação;
- **AUD-CQ-012:** RED/GREEN passou `7/7` no pacote de aplicação; `pnpm verify` passou com `171` arquivos, `768` testes, `18` skips e cobertura `84,66%`/`80,03%`/`86,87%`/`85,49%`; build e E2E `26/26` passaram;
- **limite:** a evidência é local do worktree não comitado; não fecha SHA/RC, runtime HA, gates externos, revisão humana, cross-browser/mobile/a11y manual ou reauditoria independente.

## 21. Revalidação local S4-172 — 2026-08-16T10:11:24-03:00

- **AUD-CQ-006/AUD-CQ-011/AUD-CQ-012:** `scripts/verify-capacity-governance.mjs::validateCapacityGovernanceSnapshot` foi decomposto sob TDD em validadores de metadados, smoke, exploração/failover/soak e gaps; o teste focal passou `4/4`, preservando as métricas, o diagnóstico e os quatro gaps explícitos;
- **verificação:** `pnpm verify` passou com `175` arquivos, `784` testes, `18` skips e cobertura `84,81%`/`80,18%`/`87,13%`/`85,65%`; `verify:capacity-governance` reportou `200/200`, `3` cargas escalonadas, failover `100%`, soak `NOT_EXECUTED` e `4` gaps; hotspots `0`, `153` funções longas, maior função `130` linhas; build nos `12` workspaces e E2E `26/26` em `16,6s` passaram;
- **limite:** sem API local em `3101`, o E2E não é evidência HA; a evidência é local do worktree não comitado e não fecha SHA/RC, runtime HA, gates externos, revisão humana, cross-browser/mobile/a11y manual ou reauditoria independente. A próxima ação local é reduzir `apps/web/app/dashboard/page.tsx::DashboardPage` sob TDD.

## 22. Revalidação local S4-173 — 2026-08-16T10:39:29-03:00

- **AUD-CQ-011/AUD-CQ-012:** `apps/web/app/dashboard/page.tsx::DashboardPage` foi reduzido de `217` para `21` linhas; `dashboard-model.ts`, `dashboard-state.ts`, `dashboard-view.tsx` e `DashboardPageContent` separam contrato/loader, estado, apresentação e composição; RED/GREEN passou `3/3` e a caracterização focal passou `6/6`;
- **verificação:** `pnpm verify` passou com `177` arquivos, `790` testes, `16` skips e cobertura `84,81%`/`80,18%`/`87,13%`/`85,65%`; hotspots `0`, `152` funções longas, maior função `128` linhas; build nos `12` workspaces e Playwright `26/26` em `21,2s` passaram;
- **limite:** a repetição integral precisou ocorrer fora da restrição de listeners do sandbox; sem API local em `3101`, o E2E não é evidência HA. A evidência é local do worktree não comitado e não fecha SHA/RC, runtime HA, gates externos, revisão humana, cross-browser/mobile/a11y manual ou reauditoria independente. `AUD-CQ-001–014` seguem prontos para reauditoria e `AUD-CQ-015` aguarda autorização.

## 20. Revalidação local S4-171 — 2026-08-16T10:04:15-03:00

- **AUD-CQ-011/AUD-CQ-012:** `packages/persistence/src/invitation-repository.ts::createInvitationUseCaseDependencies` foi decomposto sob TDD em composição de operações, port de conta e port de convite; `packages/persistence/src/invitation-repository-support.ts` preserva mapeamentos, consultas, transação e ports compartilhados; o teste focal passou `4/4`;
- **verificação:** `pnpm verify` passou com `175` arquivos, `783` testes, `18` skips e cobertura `84,81%`/`80,18%`/`87,13%`/`85,65%`; hotspots `0`, `154` funções longas, maior função `131` linhas; build nos `12` workspaces e E2E `26/26` em `15,9s` passaram;
- **limite:** sem API local em `3101`, o E2E não é evidência HA; a evidência é local do worktree não comitado e não fecha SHA/RC, runtime HA, gates externos, revisão humana, cross-browser/mobile/a11y manual ou reauditoria independente. A próxima ação local é reduzir `scripts/verify-capacity-governance.mjs::validateCapacityGovernanceSnapshot` sob TDD.

## 19. Revalidação local S4-170 — 2026-08-16T09:53:20-03:00

- **AUD-CQ-011/AUD-CQ-012:** `scripts/verify-journey-correction-governance.mjs::validateJourneyCorrectionGovernance` foi decomposto sob TDD em validadores de metadados, invariantes, evidências e gaps; o teste focal passou `3/3`, preservando os identificadores obrigatórios, as referências de evidência, os gaps explícitos e os estados `PASS_WITH_GAPS`/`PILOT_BLOCKED`;
- **verificação:** `pnpm verify` passou com `174` arquivos, `782` testes, `18` skips e cobertura `84,81%`/`80,18%`/`87,12%`/`85,64%`; `verify:journey-correction-governance` reportou `4` tasks, `4` invariantes, `4` evidências e `5` gaps; hotspots `0`, `154` funções longas, maior função `135` linhas; build nos `12` workspaces e E2E `26/26` em `16,0s` passaram;
- **limite:** sem API local em `3101`, o E2E não é evidência HA; a evidência é local do worktree não comitado e não fecha SHA/RC, runtime HA, gates externos, revisão humana, cross-browser/mobile/a11y manual ou reauditoria independente. A próxima ação local é reduzir `packages/persistence/src/invitation-repository.ts::createInvitationUseCaseDependencies` sob TDD.

## 18. Revalidação local S4-169 — 2026-08-16T09:44:23-03:00

- **AUD-CQ-009/AUD-CQ-011/AUD-CQ-012:** `apps/web/app/invite/page.tsx::InvitePage` foi decomposto sob TDD em hook de estado, modelo HTTP/validação e componentes de apresentação; o teste focal passou `3/3`, preservando token, validação, envelope de sucesso, sessão, mensagens bounded e campos acessíveis;
- **verificação:** `pnpm verify` passou com `174` arquivos, `781` testes, `18` skips e cobertura `84,81%`/`80,18%`/`87,12%`/`85,64%`; hotspots `0`, `155` funções longas, maior função `140` linhas; build nos `12` workspaces e E2E `26/26` em `16,0s` passaram após o build;
- **limite:** sem API local em `3101`, o E2E não é evidência HA; o build inicialmente encontrou imports locais `.js` não resolvidos pelo Turbopack e passou após a correção para imports extensionless; a evidência é local do worktree não comitado e não fecha SHA/RC, runtime HA, gates externos, revisão humana, cross-browser/mobile/a11y manual ou reauditoria independente. A próxima ação local é reduzir `scripts/verify-journey-correction-governance.mjs::validateJourneyCorrectionGovernance` sob TDD.

## 17. Revalidação local S4-168 — 2026-08-16T09:32:29-03:00

- **AUD-CQ-011/AUD-CQ-012/AUD-CQ-013:** `scripts/verify-product-definition.mjs::validateProductDefinitionSnapshot` foi decomposto sob TDD em validadores de arquivos, gates, conteúdo, cobertura e baseline de rastreabilidade; o teste focal passou `3/3`, preservando o gate Discovery→PRD→SPEC, diagnósticos e contrato imutável;
- **verificação:** `pnpm verify` passou com `173` arquivos, `778` testes, `18` skips e cobertura `84,81%`/`80,18%`/`87,12%`/`85,64%`; hotspots `0`, `156` funções longas, maior função `141` linhas; build nos `12` workspaces e E2E `26/26` em `16,0s` passaram após o build;
- **limite:** sem API local em `3101`, o E2E não é evidência HA; a tentativa concorrente com o build falhou apenas pela corrida de criação de `.next` e foi repetida com sucesso; a evidência é local do worktree não comitado e não fecha SHA/RC, runtime HA, gates externos, revisão humana, cross-browser/mobile/a11y manual ou reauditoria independente. A próxima ação local é reduzir `apps/web/app/invite/page.tsx::InvitePage` sob TDD.

## 16. Revalidação local S4-167 — 2026-08-16T09:24:00-03:00

- **AUD-CQ-011/AUD-CQ-012/AUD-CQ-014:** `scripts/verify-postgres-restore.mjs` foi decomposto sob TDD em entrypoint, suporte puro e fases operacionais; o teste focal passou `2/2`, preservando opções pareadas, isolamento, modos de verificação e teardown;
- **verificação:** `pnpm verify` passou com `173` arquivos, `777` testes, `18` skips e cobertura `84,81%`/`80,18%`/`87,12%`/`85,64%`; hotspots `0`, `157` funções longas, maior função `145` linhas; build nos `12` workspaces e E2E `26/26` em `16,0s` passaram;
- **limite:** sem API local em `3101`, o E2E não é evidência HA; restore PostgreSQL live depende de banco/artefato externo e não foi executado neste ciclo; a evidência é local do worktree não comitado e não fecha SHA/RC, runtime HA, gates externos, revisão humana, cross-browser/mobile/a11y manual ou reauditoria independente. A próxima ação local é reduzir `scripts/verify-product-definition.mjs::validateProductDefinitionSnapshot` sob TDD.

## 15. Revalidação local S4-166 — 2026-08-16T09:14:43-03:00

- **AUD-CQ-011/AUD-CQ-012:** `scripts/materialize-curriculum.mjs` foi decomposto sob TDD em entrypoint, suporte puro e persistência por agregado; o teste focal passou `3/3`, preservando IDs determinísticos, membership por escopo, preflight, transação e relatório;
- **verificação:** `pnpm verify` passou com `172` arquivos, `775` testes, `18` skips e cobertura `84,81%`/`80,18%`/`87,12%`/`85,64%`; hotspots `0`, `158` funções longas, maior função `170` linhas; build nos `12` workspaces e E2E `26/26` em `15,9s` passaram;
- **limite:** sem API local em `3101`, o E2E não é evidência HA; a evidência é local do worktree não comitado e não fecha SHA/RC, runtime HA, gates externos, revisão humana, cross-browser/mobile/a11y manual ou reauditoria independente. A próxima ação local é reduzir `scripts/verify-postgres-restore.mjs::main` sob TDD.

## 14. Revalidação local S4-165 — 2026-08-16T09:06:16-03:00

- **AUD-CQ-011/AUD-CQ-012:** `correctOpenResponse` foi decomposto sob TDD em validação, autorização, carregamento/estado, resultado, evento, auditoria e aplicação transacional; o teste focal passou `3/3`, preservando idempotência e invariantes de correção;
- **verificação:** `pnpm verify` passou com `171` arquivos, `772` testes, `18` skips e cobertura `84,81%`/`80,18%`/`87,12%`/`85,64%`; hotspots `0`, `160` funções longas, maior função `179` linhas; build nos `12` workspaces e E2E `26/26` em `16,1s` passaram;
- **limite:** sem API local em `3101`, o E2E não é evidência HA; a evidência é local do worktree não comitado e não fecha SHA/RC, runtime HA, gates externos, revisão humana, cross-browser/mobile/a11y manual ou reauditoria independente. A próxima ação local é reduzir a próxima função longa sob TDD.

## 13. Revalidação local S4-164 — 2026-08-16T08:53:02-03:00

- **AUD-CQ-011/AUD-CQ-012:** `loadRuntimeConfig` foi separado em parsing, validações por capability e builders imutáveis; caracterização `13/13`, `pnpm test:coverage` com `772` testes e cobertura `84,79%`/`80,18%`/`87,07%`/`85,62%`, hotspots `0` e `161` funções longas;
- **verificação:** `pnpm verify` passou com `171` arquivos, `772` testes, `18` skips e cobertura `84,79%`/`80,18%`/`87,07%`/`85,62%`; build nos `12` workspaces e E2E `26/26` em `16,1s` passaram;
- **limite:** sem API local em `3101`, o E2E não é evidência HA; a evidência é local do worktree não comitado e não fecha SHA/RC, runtime HA, gates externos, revisão humana, cross-browser/mobile/a11y manual ou reauditoria independente. A próxima ação local é reduzir `correctOpenResponse` sob TDD.

## 12. Revalidação local S4-163 — 2026-08-16T08:46:53-03:00

- **AUD-CQ-006/AUD-CQ-011:** `validateObservabilityGovernance` foi separado em validadores de política, sinais, alertas e regras; o teste focal passou `3/3`, preservando marcadores e ownership;
- **AUD-CQ-012:** `pnpm verify` passou com `171` arquivos, `772` testes, `18` skips e cobertura `84,80%`/`80,18%`/`86,99%`/`85,63%`; build e E2E `26/26` passaram;
- **limite:** a evidência é local do worktree não comitado; não fecha SHA/RC, runtime HA, gates externos, revisão humana, cross-browser/mobile/a11y manual ou reauditoria independente. A próxima ação local é reduzir `loadRuntimeConfig` sob TDD.

## 11. Revalidação local S4-162 — 2026-08-16T08:39:24-03:00

- **AUD-CQ-006/AUD-CQ-011:** `createApiServer` passou a delegar para `apps/api/src/server-http.ts`; o snapshot do contrato de observabilidade inclui a fonte extraída e o teste focal passou `2/2`, sem remover marcadores de instrumentação;
- **AUD-CQ-012:** `pnpm verify` passou com `171` arquivos, `771` testes, `18` skips e cobertura `84,80%`/`80,18%`/`86,99%`/`85,63%`; build e E2E `26/26` passaram;
- **limite:** a evidência é local do worktree não comitado; não fecha SHA/RC, runtime HA, gates externos, revisão humana, cross-browser/mobile/a11y manual ou reauditoria independente. A próxima ação local é reduzir `validateObservabilityGovernance` sob TDD.

## 10. Revalidação local S4-161 — 2026-08-16T08:24:37-03:00

- **AUD-CQ-011:** `publishAuthoringContent` foi extraído para helpers coesos de autorização, aprovação clínica independente, preflight, transição e projeção, sem relaxar o bloqueio de publicação;
- **AUD-CQ-012:** RED/GREEN passou `9/9` no authoring, incluindo rejeições fail-closed; `pnpm verify` passou com `171` arquivos, `770` testes, `18` skips e cobertura `84,79%`/`80,16%`/`86,94%`/`85,62%`; build e E2E `26/26` passaram;
- **limite:** a evidência é local do worktree não comitado; não fecha SHA/RC, runtime HA, gates externos, revisão humana, cross-browser/mobile/a11y manual ou reauditoria independente.

## 23. Revalidação local U95-110 — 2026-08-16T15:09:12-03:00

- **AUD-CQ-011/AUD-CQ-012:** a guarda da superfície de dashboard passou a derivar de `parseParticipantDashboard`/`ParticipantDashboardProjection` em `@cvg/contracts`; a dependência do workspace web e o boundary foram declarados. A governança RED encontrou `15` arquivos de produção com `22` double assertions de transação; o GREEN removeu todas e ainda eliminou uma assertion residual em `invitation-repository.ts`.
- **verificação:** focais web `7/7`, persistência `127/127`, arquitetura/governança `3/3`, typecheck, lint, audit de dependências e build web com configuração de URL interna passaram; `pnpm verify` passou com `178` arquivos, `808` testes, `16` arquivos guardados, `18` testes guardados, cobertura `84,55%`/`80,05%`/`86,58%`/`85,36%`, contratos `81/81`, worker `25/25`, migrações `30/30` e arquitetura `2/2`.
- **limite:** U95-110 está `READY_FOR_NEXT_STEP` local, não `COMPLETED`; as demais superfícies web por papel ainda não foram todas migradas para contratos canônicos. O worktree permanece não comitado e não fecha SHA/RC, runtime HA, gates externos, revisão clínica ou reauditoria independente; AUD-CQ-011 continua `IN_PROGRESS` pelas `22` funções >100 sem exceção com owner/prazo.

## 24. Revalidação local U95-111 — 2026-08-16T15:35:39-03:00

- **AUD-CQ-004/AUD-CQ-010/AUD-CQ-012:** `API_SURFACE` passou a derivar o grupo de handler de cada rota e a expor `findApiSurfaceRoute`; o template de telemetria foi reduzido ao lookup canônico e o dispatcher passou a selecionar `API_ROUTE_GROUPS` antes de percorrer qualquer handler. A integração comprovou `57/57` rotas ligadas a seis grupos, sem caminho canônico sem grupo.
- **verificação:** RED/GREEN de contrato `4/4`, inventário/dispatcher `2/2`, API/server `72/72`, pacote de contratos `82/82`; `pnpm verify` passou com `178` arquivos, `810` testes, `16` arquivos guardados, `18` testes guardados, cobertura `84,55%`/`80,06%`/`86,67%`/`85,40%`, decisões críticas `7/7`, arquitetura `2/2` e ratchet `152/128`.
- **limite:** U95-111 está `READY_FOR_NEXT_STEP` local, não `COMPLETED`; o vínculo comprovado é rota canônica → grupo do dispatcher, enquanto os matchers individuais permanecem nos módulos `http-route-*`. O worktree permanece não comitado e não fecha SHA/RC, runtime HA, gates externos, revisão clínica ou reauditoria independente; U95-107/U95-108/U95-109 continuam abertas.

## 25. Revalidação local U95-112 — 2026-08-16T16:04:30-03:00

- **AUD-CQ-004/AUD-CQ-010/AUD-CQ-012:** o append de auditoria passou a configurar `cvg.audit_write` e inserir no mesmo executor transacional; conflitos de unicidade em abertura/idempotência e perda de versão passaram a `PersistenceConflictError`/`state_conflict`; o restore passou a consultar dez invariantes de RLS, políticas, trigger append-only e índices únicos, rejeitando forma inválida ou qualquer flag falsa.
- **verificação:** focais de auditoria `5/5`, persistência `24/24`, aplicação `17/17`, restore `9/9`; PostgreSQL temporário passou corrida/restore `5/5`, rollback `1/1`, RLS `1/1` e migrações `30/30`; `pnpm verify` passou com `178` arquivos, `816` testes, `16` arquivos guardados, `19` testes guardados, cobertura `84,65%`/`80,13%`/`86,79%`/`85,54%`, decisões críticas `7/7`, contratos `82/82`, worker `25/25`, arquitetura `2/2` e ratchet `152/128`.
- **limite:** U95-112 está `READY_FOR_NEXT_STEP` local, não `COMPLETED`; os testes live usaram somente containers temporários com dados sintéticos e teardown, sem provar backup/PITR/RPO/RTO/DR, HA de produção ou RC imutável. O worktree permanece não comitado e não fecha SHA/RC, gates externos, revisão clínica ou reauditoria independente; U95-107/U95-108/U95-109 e `0/145` continuam abertos.

## 26. Revalidação local U95-113 — 2026-08-16T16:30:37-03:00

- **AUD-CQ-004/AUD-CQ-010/AUD-CQ-012:** os guards de admin, moderator, authoring e account passaram a usar schemas/projections canônicos de `@cvg/contracts`; o dashboard passou a separar `loading`/`error`/projeção, limpar a projeção em falha e expor `aria-busy` com retry não concorrente;
- **verificação:** RED/GREEN focal `5/5` arquivos e `11/11` testes, build dos `12` workspaces, typecheck, lint, formato e `pnpm verify` passaram; a cobertura registrou `181` arquivos / `822` testes / `16` arquivos e `19` testes guardados, em `84,65%`/`80,13%`/`86,79%`/`85,54%`; Playwright sintético passou `27/27`;
- **limite:** U95-113 está `READY_FOR_NEXT_STEP` local, não `COMPLETED`; o E2E mockou respostas e a API em `3101` não estava ativa, a cobertura global ainda não inclui toda a camada `apps/web`, e permanecem gaps de screen reader/WCAG manual, mobile/cross-browser, UAT, RUM, browser→API→DB, RC imutável, revisão clínica e reauditoria. O worktree permanece não comitado e não fecha SHA/RC, score ou `0/145`; a próxima ação local é U95-114.

## 27. Revalidação local U95-114 — 2026-08-16T17:31:01-03:00

- **AUD-CQ-004/AUD-CQ-010/AUD-CQ-012:** a configuração de cobertura passou a incluir a produção de `apps/web` e a descobrir testes `.test.ts`/`.test.tsx`; a configuração Playwright passou a controlar Chromium, Firefox, WebKit e mobile-Chromium por `CVG_E2E_BROWSERS`; coberturas sintéticas foram adicionadas para as superfícies web.
- **verificação:** `pnpm typecheck && pnpm lint` passou; `pnpm test:coverage` passou com `191` arquivos, `855` testes passantes, `16` arquivos e `19` testes guardados, cobertura `84,47%`/`80,29%`/`85,35%`/`85,77%`; Playwright sintético passou `27/27` em Chromium; E2E ativo do worktree passou `3/3` em Chromium com fixture sintético e PostgreSQL HA local.
- **limite:** U95-114 está `IN_PROGRESS` local, não `COMPLETED`; ≥90% global não foi atingido, os floors críticos de functions ainda estão abaixo de 80% em web/API/persistência e Firefox/WebKit/mobile não foram executados. O caminho ativo usou imagem/API/web temporários do worktree e não fecha RC imutável, produção, HA completo, UAT, WCAG manual, RUM, gates externos, score, `0/145` ou reauditoria; nenhum commit/release foi feito. Evidência em `docs/130_dual_95_u95_114_coverage_e2e_evidence_2026-08-16.md`.

## 28. Continuação local U95-114 — 2026-08-16T18:28:19-03:00

- **AUD-CQ-004/AUD-CQ-010/AUD-CQ-012:** foram adicionados testes sintéticos para composição HTTP da API e repositórios de persistência, cobrindo mapeamento, conflitos, idempotência, transações, erros e caminhos fail-closed sem dados reais.
- **verificação:** `pnpm test:coverage` passou com `192` arquivos, `908` testes, `16` arquivos guardados e `19` testes guardados; cobertura `90,15%` statements / `84,10%` branches / `93,57%` functions / `91,59%` lines. Typecheck, lint, formato e `git diff --check` passaram. `apps/api/src` ficou em `86,03%/73,45%/94,70%/89,73%`, `apps/web/app` em `90,99%/86,31%/91,25%/95,26%`, `apps/worker/src` em `81,60%/75,00%/83,63%/81,74%` e `packages/persistence/src` em `92,27%/85,74%/93,37%/92,98%` (statements/branches/functions/lines).
- **limite:** U95-114 segue `IN_PROGRESS` local, não `COMPLETED`; a meta global foi atingida e as funções críticas estão acima de `80%`, mas API/worker permanecem abaixo de `80%` em branches se o piso for aplicado a toda métrica. Firefox/WebKit/mobile não foram executados; o E2E ativo é temporário do worktree e não fecha RC imutável, produção, UAT, WCAG manual, RUM, gates externos, score, `0/145` ou reauditoria.

## 29. Revalidação local U95-114 — 2026-08-16T18:56:56-03:00

- **AUD-CQ-004/AUD-CQ-010/AUD-CQ-012:** foram adicionados testes sintéticos para boundaries de dependências opcionais de participante, authoring, workflow e operações, preservando respostas fail-closed sem dados reais.
- **verificação:** `pnpm typecheck && pnpm test:coverage` passou com `194` arquivos, `921` testes, `16` arquivos guardados e `19` testes guardados; cobertura `90,73%` statements / `85,30%` branches / `93,70%` functions / `92,15%` lines. API ficou em `89,40%/80,25%/95,63%/93,21%`, worker em `84,80%/84,14%/83,63%/84,64%`, e todas as camadas críticas ficaram acima de `80%` nas quatro métricas. A matriz Playwright passou `81/81` em Chromium, Firefox e mobile Chromium; WebKit foi bloqueado em `27` casos por `libavif16` ausente no host, antes das asserções.
- **limite:** U95-114 segue `IN_PROGRESS` local, não `COMPLETED`; WebKit depende de host aprovado (`sudo -n pnpm exec playwright install-deps webkit` exigiu senha), o E2E ativo `3/3` anterior foi temporário do worktree e ainda não há prova de RC imutável, UAT, WCAG manual, RUM, gates externos, score, `0/145` ou reauditoria.
