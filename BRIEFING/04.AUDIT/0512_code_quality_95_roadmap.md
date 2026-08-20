# 0512 — Roadmap para 95/100 em cada item da auditoria de qualidade

> **Registro histórico absorvido:** o roadmap corrente é `0514_dual_95_roadmap.md`. Este documento mantém a primeira decomposição da auditoria de qualidade e não deve ser usado como fonte concorrente de status.

**Fonte:** `docs/116_code_quality_audit_2026-08-16.md`
**Plano executivo:** `BRIEFING/03.BUILD/0306_code_quality_95_executive_plan.md`
**Backlog:** `BRIEFING/04.AUDIT/0513_code_quality_95_backlog.md`

## 1. Marcos e janelas relativas

As janelas são relativas ao início desta execução e não constituem promessa de calendário. Gates humanos e externos podem manter uma janela em espera sem alterar a ordem técnica.

| Marco | Janela | Escopo | Saída obrigatória |
|---|---|---|---|
| M0 — baseline | S0 | relatório, estado, log, backlog, plano e matriz | baseline `64,20`, 16 metas e evidência inicial congeladas |
| M1 — P1 local | S0–S1 | AUD-CQ-001–005 | proveniência Git válida, aprovador/sessão seguros, request lifecycle protegido, E2E canônico executável |
| M2 — operação local | S1–S2 | AUD-CQ-006–008 | readiness/tráfego, alertas/worker metrics, canário direto sustentado, OTLP e containers endurecidos |
| M3 — produto e qualidade | S2–S3 | AUD-CQ-009–014 | logout/retomada, decisões críticas completas, hotspots ratcheados, web/cobertura/rate limit/documentos corrigidos |
| M4 — gates externos | S2–S5 | AUD-CQ-015 e dependências | CI remoto, registry, IdP/MFA, TLS, backup/DR, UAT, WCAG, RUM, soak e beta reais |
| M5 — RC | S5–S6 | todos | tag/SHA/digest/manifest/artefatos alinhados, rollback ensaiado, zero drift |
| M6 — reauditoria | S6 | audit-engine | 16 notas ≥95, 145/145 cadeias, decisão go/no-go e estado final honesto |

## 2. Sequência de sprints

### S0 — Controle e P1 crítico

Executar o plano e backlog; corrigir proveniência, aprovador, sessão, request lifecycle e entrypoint E2E. Criar testes RED antes dos fixes e registrar evidências focais. Gate M1 exige que falhas negativas sejam rejeitadas pelo verificador.

### S1 — Runtime e segurança de infraestrutura

Aplicar readiness ao tráfego, carregar regras Prometheus, expor métricas de workers, configurar roteamento de alertas, sondar canário diretamente, restringir OTLP e endurecer containers/permissões. Gate M2 exige inspeção efetiva e teste de falha, não somente arquivos de configuração.

### S2 — Experiência, risco e rastreabilidade

Implementar logout e retomada transacional/idempotente, completar matriz P0/P1, corrigir rate limit atrás de proxy e eliminar links/pesos/supersessão inconsistentes. Iniciar cobertura de web/scripts e decomposição de hotspots.

### S3 — Redução de dívida e expansão de testes

Extrair componentes/handlers/repositórios em fatias caracterizadas, remover casts inseguros, centralizar contratos e ampliar Playwright para navegadores/dispositivos disponíveis. Corrigir contraste, foco, ARIA e estados de erro sem expor internals.

### S4–S5 — Dependências externas e aceitação

Com autorização, executar CI remoto no RC, provisionar IdP/MFA, DNS/TLS, registry/deploy, storage de traces, backup offsite, restore/PITR, UAT, screen reader, RUM e soak/DR. Revisão clínica e piloto permanecem humanos; não são substituídos por fixtures.

### S5–S6 — Release candidate e reauditoria

Congelar worktree, tag e digest; gerar SBOM/attestation, executar deploy/rollback por digest e coletar evidências com retenção. O auditor independente repete a rubrica dos 16 itens no mesmo RC e registra as notas. Qualquer item <95 reabre somente o workstream correspondente.

## 3. Gates de saída

| Gate | Critério | Bloqueio explícito |
|---|---|---|
| G0 | plano/backlog/roadmap registrados e estado `IN_PROGRESS` | documentos ausentes ou baseline misturada |
| G1 | P1 local sem regressão e verificadores negativos funcionando | qualquer P1 aberto, hang, unhandled rejection ou E2E quebrado |
| G2 | runtime/observabilidade local verificáveis | liveness no tráfego, regras sem grupos, canário indireto ou OTLP aberto |
| G3 | qualidade e UX com cobertura honesta | web/scripts omitidos, decisão crítica incompleta, fluxo sem logout/retomada |
| G4 | dependências externas/humanas comprovadas | CI/IdP/backup/UAT/WCAG/soak apenas declarados ou sintéticos |
| G5 | RC imutável e rastreável | SHA inexistente, digest divergente, worktree sujo ou artefato sem retenção |
| G6 | reauditoria ≥95 por item | qualquer item abaixo da meta, P0/P1 ou cadeia incompleta |

## 4. Caminho crítico e paralelismo seguro

O caminho crítico técnico é `G0 → AUD-CQ-001/002/003/004/005 → AUD-CQ-006/007/008 → AUD-CQ-010/012/013/014 → G5 → G6`. `AUD-CQ-009` pode avançar em paralelo após contratos de sessão; `AUD-CQ-011` e parte de `AUD-CQ-012` podem avançar com testes de caracterização. `AUD-CQ-015` depende de autorização e ambiente real, mas sua preparação documental pode avançar desde já.

Nenhum paralelismo pode compartilhar fixture mutável, alterar a baseline auditada ou publicar conteúdo. Cada sprint fecha com teste, revisão, auditoria, atualização de backlog, log, estado e rastreabilidade.

## 5. Indicadores de controle

- P1 abertos por item e idade do finding;
- `pnpm verify`/build/E2E canônico: sucesso, duração e flakes;
- cobertura por camada e 4 decisões por requisito P0/P1;
- hotspots/funções >50 linhas e redução líquida por sprint;
- grupos de regras, targets de workers, MTTD/MTTA/MTTR e ruído;
- RPO/RTO, restauração, soak, failover e perda/duplicidade;
- completude de rastreabilidade `completeChains/145`;
- drift de SHA, digest, ambiente, artefato e release manifest.

## 6. Replanejamento

Se uma dependência externa estiver ausente, marcar `WAITING_HUMAN_APPROVAL` com pergunta objetiva e continuar somente tarefas locais idempotentes. Se uma falha P0/P1 aparecer, parar a promoção do workstream, registrar causa/impacto/rollback e repetir o ciclo TDD. Não reduzir a meta, alterar pesos ou chamar ausência de evidência de PASS.

## 7. Checkpoint S4-158 — matriz de risco revalidada

Em 2026-08-16, `test-risk-matrix.json` passou a exigir referências explícitas de destinos de testes de erro ligadas à matriz canônica. O RED/GREEN do gate passou `3/3`; `pnpm verify` passou com `765` testes, `18` skips e cobertura `84,65%`/`80,01%`/`86,76%`/`85,47%`. O relatório atual é `87` requisitos, `63/87` error, `26/87` denied, `36/87` conflict e `11/87` linhas completas.

Este avanço fecha somente evidência local de governança de risco. As `24` linhas sem error proof, as linhas sem outras provas aplicáveis, o SHA/artefato do RC, os gates externos/humanos e a reauditoria independente dos 16 itens continuam pendentes; a disposição permanece `PILOT_BLOCKED`.

## 8. Checkpoint S4-159 — decomposição do preflight curricular

`preflightCurriculumDrafts` foi separado em verificadores de módulos, diagnóstico, campos obrigatórios, metadados de correção, boundary público e retenção. O teste de composição foi RED/GREEN e a suíte focal passou `18/18`; `pnpm verify` passou com `767` testes, `18` skips, cobertura `84,65%`/`80,03%`/`86,78%`/`85,48%` e `verify:hotspots` reduziu as funções longas para `167`, mantendo `0` hotspots acima de `800` linhas.

O checkpoint melhora manutenibilidade local sem promover a nota: publicação clínica continua bloqueada, `0/145` cadeias seguem completas apenas em `0`, e SHA/RC, HA final, gates externos/humanos e reauditoria dos 16 itens continuam necessários.

## 9. Checkpoint S4-160 — decomposição da revisão clínica

`reviewAuthoringContent` foi separado em `packages/application/src/authoring-review.ts`, com funções coesas para validação, autorização clínica, preflight técnico, transição de estado, construção imutável e persistência da revisão. O teste de composição foi RED/GREEN e a suíte focal passou `7/7`; `pnpm verify` passou com `768` testes, `18` skips, cobertura `84,66%`/`80,03%`/`86,87%`/`85,49%` e `verify:hotspots` reduziu as funções longas para `166`, mantendo `0` hotspots acima de `800` linhas.

O checkpoint fortalece a manutenibilidade do caminho clínico sem promover a nota: aprovação independente, preflight obrigatório e publicação fail-closed permanecem; `0/145` cadeias, SHA/RC, HA final, gates externos/humanos e reauditoria dos 16 itens continuam necessários.

## 10. Checkpoint S4-161 — decomposição da publicação clínica

`publishAuthoringContent` foi separado em `packages/application/src/authoring-publication.ts`, com funções coesas para validação, autorização de escopo, aprovação clínica independente, preflight, transições e projeção imutável. O teste de composição e os casos negativos foram RED/GREEN e a suíte focal passou `9/9`; `pnpm verify` passou com `770` testes, `18` skips, cobertura `84,79%`/`80,16%`/`86,94%`/`85,62%` e `verify:hotspots` reduziu as funções longas para `165`, mantendo `0` hotspots acima de `800` linhas.

O checkpoint fortalece a manutenibilidade e a auditabilidade da publicação sem promover a nota: aprovação clínica independente, preflight obrigatório e transições fail-closed permanecem; `0/145` cadeias, SHA/RC, HA final, gates externos/humanos e reauditoria dos 16 itens continuam necessários.

## 11. Checkpoint S4-162 — extração da camada HTTP e contrato de observabilidade

`createApiServer` foi reduzido a composição fina e a camada HTTP foi extraída para `apps/api/src/server-http.ts`, preservando rate limit, CSRF, parsing limitado, respostas bounded, request outcome e instrumentação. O contrato de observabilidade passou a carregar a fonte canônica extraída; o teste focal passou `2/2`, `pnpm verify` passou com `771` testes, `18` skips, cobertura `84,80%`/`80,18%`/`86,99%`/`85,63%` e `verify:hotspots` reduziu as funções longas para `163`, mantendo `0` hotspots acima de `800` linhas.

O checkpoint melhora a manutenibilidade e mantém a evidência de sinais sem promover a nota: o E2E local `26/26` não fecha HA porque a API não estava ativa em `3101`; `0/145` cadeias, SHA/RC, gates externos/humanos e reauditoria dos 16 itens continuam necessários.

## 12. Checkpoint S4-163 — decomposição do validador de observabilidade

`validateObservabilityGovernance` foi decomposto em validadores coesos de metadados da política, catálogo de sinais, catálogo de alertas e regras Prometheus. O teste de composição ficou RED antes da unidade existir e GREEN passou `3/3`; `pnpm verify` passou com `772` testes, `18` skips, cobertura `84,80%`/`80,18%`/`86,99%`/`85,63%` e `verify:hotspots` reduziu as funções longas para `162`, mantendo `0` hotspots acima de `800` linhas.

O checkpoint reduz complexidade sem relaxar ownership, runbooks, PII-safe, marcadores, dashboard ou a exigência de evidência externa. O build e o E2E `26/26` passaram em escopo local; `0/145` cadeias, SHA/RC, HA final, gates externos/humanos e reauditoria dos 16 itens continuam necessários.

## 13. Checkpoint S4-164 — decomposição da configuração de runtime

`loadRuntimeConfig` foi reduzido a uma composição de parsing Zod, validações por capability e builders imutáveis para identidade, observabilidade, Qdrant, IA e configuração final. A caracterização passou `13/13`; `pnpm verify` passou com `772` testes, `18` skips, cobertura `84,79%`/`80,18%`/`87,07%`/`85,62%` e `verify:hotspots` reduziu as funções longas para `161`, mantendo `0` hotspots acima de `800` linhas.

O checkpoint preserva defaults seguros, HTTPS produtivo, token de métricas, aprovador clínico, embedding determinístico restrito e não exposição de segredos. Build nos `12` workspaces e E2E `26/26` em `16,1s` passaram; como a API não estava ativa em `3101`, não constituem evidência HA. `0/145` cadeias, SHA/RC, HA final, gates externos/humanos e reauditoria dos 16 itens continuam necessários.

## 14. Checkpoint S4-165 — decomposição da correção de resposta aberta

`correctOpenResponse` foi reduzido a uma composição de validação de comando, autorização fail-closed, carregamento do attempt, transição de estado, builders imutáveis de resultado/evento/auditoria e aplicação transacional com idempotência preservada. O teste focal passou `3/3`; `pnpm verify` passou com `772` testes, `18` skips, cobertura `84,81%`/`80,18%`/`87,12%`/`85,64%` e `verify:hotspots` reduziu as funções longas para `160`, mantendo `0` hotspots acima de `800` linhas.

O checkpoint fortalece a manutenibilidade do fluxo de correção sem relaxar autorização, transições, auditoria, evento metadata-only ou replay idempotente. Build nos `12` workspaces e E2E `26/26` em `16,1s` passaram; como a API não estava ativa em `3101`, não constituem evidência HA. `0/145` cadeias, SHA/RC, HA final, gates externos/humanos e reauditoria dos 16 itens continuam necessários.

## 15. Checkpoint S4-166 — decomposição da materialização curricular

`scripts/materialize-curriculum.mjs` foi reduzido a um entrypoint fino; `scripts/materialize-curriculum-support.mjs` concentra IDs determinísticos, membership, projeção editorial e relatório, enquanto `scripts/materialize-curriculum-persistence.mjs` concentra inserções por agregado e contagens imutáveis. O teste focal passou `3/3`; `pnpm verify` passou com `775` testes, `18` skips, cobertura `84,81%`/`80,18%`/`87,12%`/`85,64%` e `verify:hotspots` reduziu as funções longas para `158`, mantendo `0` hotspots acima de `800` linhas.

O checkpoint melhora a manutenibilidade do caminho operacional sem alterar a transação, o preflight editorial, o `onConflictDoNothing` ou o relatório de materialização. Build nos `12` workspaces e E2E `26/26` em `15,9s` passaram; como a API não estava ativa em `3101`, não constituem evidência HA. `0/145` cadeias, SHA/RC, HA final, gates externos/humanos e reauditoria dos 16 itens continuam necessários.

## 16. Checkpoint S4-167 — decomposição do verificador de restore

`scripts/verify-postgres-restore.mjs` foi reduzido a composição de parsing de artefatos, geração de alvos isolados, fases de marcador/backup/target/restore/verificação e teardown; `scripts/verify-postgres-restore-support.mjs` concentra opções, nomes e relatórios bounded. O teste focal passou `2/2`; `pnpm verify` passou com `777` testes, `18` skips, cobertura `84,81%`/`80,18%`/`87,12%`/`85,64%` e `verify:hotspots` reduziu as funções longas para `157`, mantendo `0` hotspots acima de `800` linhas.

O checkpoint melhora a manutenibilidade do caminho de backup/restore sem relaxar isolamento, verificação de artefato, diagnóstico de estágio ou cleanup. Build nos `12` workspaces e E2E `26/26` em `16,0s` passaram; restore PostgreSQL live depende de banco/artefato externo e não foi executado neste ciclo. `0/145` cadeias, SHA/RC, HA final, gates externos/humanos e reauditoria dos 16 itens continuam necessários.

## 17. Checkpoint S4-168 — decomposição do verificador de definição de produto

`validateProductDefinitionSnapshot` foi reduzido a uma composição de validadores de arquivos obrigatórios, gates Discovery→PRD→SPEC, conteúdo, cobertura e baseline de rastreabilidade; `scripts/verify-product-definition-support.mjs` concentra as regras puras, mantendo o diagnóstico e o contrato do gate. O teste focal passou `3/3`; `pnpm verify` passou com `778` testes, `18` skips, cobertura `84,81%`/`80,18%`/`87,12%`/`85,64%` e `verify:hotspots` reduziu as funções longas para `156`, mantendo `0` hotspots acima de `800` linhas.

O checkpoint melhora a manutenibilidade do gate de governança sem relaxar aprovação, cobertura ou rastreabilidade. Build nos `12` workspaces e E2E `26/26` em `16,0s` passaram após a conclusão do build; como a API não estava ativa em `3101`, não constituem evidência HA. `0/145` cadeias, SHA/RC, HA final, gates externos/humanos e reauditoria dos 16 itens continuam necessários.

## 18. Checkpoint S4-169 — decomposição da jornada de primeiro acesso

`InvitePage` foi reduzido a uma composição de estado de ativação, modelo puro de token/validação/aceitação e componentes visuais de apresentação. O teste focal passou `3/3`; `pnpm verify` passou com `781` testes, `18` skips, cobertura `84,81%`/`80,18%`/`87,12%`/`85,64%` e `verify:hotspots` reduziu as funções longas para `155`, mantendo `0` hotspots acima de `800` linhas.

O checkpoint melhora a manutenibilidade da jornada de convite sem relaxar validação, sessão, envelope de sucesso, limites de exposição ou acessibilidade. Build nos `12` workspaces e E2E `26/26` em `16,0s` passaram após ajuste de imports para a resolução do Turbopack; como a API não estava ativa em `3101`, não constituem evidência HA. `0/145` cadeias, SHA/RC, HA final, gates externos/humanos e reauditoria dos 16 itens continuam necessários.

## 19. Checkpoint S4-170 — decomposição da governança da jornada de correção

`validateJourneyCorrectionGovernance` foi reduzido a uma composição de validadores de metadados, invariantes, evidências e gaps em `scripts/journey-correction-governance-support.mjs`; o entrypoint preserva loader, relatório, CLI, diagnósticos e os estados `PASS_WITH_GAPS` / `PILOT_BLOCKED`. O teste focal passou `3/3`; `pnpm verify` passou com `782` testes, `18` skips, cobertura `84,81%`/`80,18%`/`87,12%`/`85,64%` e `verify:hotspots` reduziu as funções longas para `154`, mantendo `0` hotspots acima de `800` linhas.

O checkpoint melhora a manutenibilidade do gate de governança sem relaxar invariantes, evidências, gaps ou o bloqueio de piloto. O gate reportou `4` tasks, `4` invariantes, `4` evidências aprovadas e `5` gaps; build nos `12` workspaces e E2E `26/26` em `16,0s` passaram. Como a API não estava ativa em `3101`, o E2E não constitui evidência HA. `0/145` cadeias, SHA/RC, HA final, gates externos/humanos e reauditoria dos 16 itens continuam necessários.

## 20. Checkpoint S4-171 — decomposição da persistência de convites

`createInvitationUseCaseDependencies` foi reduzido a uma composição fina de operações; `packages/persistence/src/invitation-repository-support.ts` separa mapeamento, port de conta, port de convite e a composição de sessão/auditoria. O teste focal passou `4/4`; `pnpm verify` passou com `783` testes, `18` skips, cobertura `84,81%`/`80,18%`/`87,13%`/`85,65%` e `verify:hotspots` manteve `154` funções longas, com maior função de `131` linhas e `0` hotspots acima de `800` linhas.

O checkpoint melhora a manutenibilidade da persistência sem relaxar transação, validação, consulta de convite ativo, single-use ou conflitos de ativação. Build nos `12` workspaces e E2E `26/26` em `15,9s` passaram. Como a API não estava ativa em `3101`, o E2E não constitui evidência HA. `0/145` cadeias, SHA/RC, HA final, gates externos/humanos e reauditoria dos 16 itens continuam necessários.

## 21. Checkpoint S4-172 — decomposição da governança de capacidade

`validateCapacityGovernanceSnapshot` foi reduzido a uma composição de validadores de metadados, smoke, exploração/failover/soak e gaps em `scripts/verify-capacity-governance-support.mjs`; o entrypoint preserva o relatório e os estados `PASS_WITH_GAPS` / `PILOT_BLOCKED`. O teste focal passou `4/4`; `pnpm verify` passou com `784` testes, `18` skips, cobertura `84,81%`/`80,18%`/`87,13%`/`85,65%` e `verify:hotspots` reduziu as funções longas para `153`, com `0` hotspots acima de `800` linhas.

O checkpoint melhora a manutenibilidade do gate operacional sem transformar smoke sintético em prova de soak, failover externo ou SLO produtivo. O gate preservou `200/200`, `3` cargas escalonadas, failover `100%`, soak `NOT_EXECUTED` e `4` gaps; build nos `12` workspaces e E2E `26/26` em `16,6s` passaram. Como a API não estava ativa em `3101`, o E2E não constitui evidência HA. `0/145` cadeias, SHA/RC, HA final, gates externos/humanos e reauditoria dos 16 itens continuam necessários.

## 22. Checkpoint S4-173 — decomposição do dashboard participante

`DashboardPage` foi reduzido de `217` para `21` linhas; o loader/contrato, o hook de estado, a apresentação e a composição dos estados foram separados em módulos coesos. O teste RED falhou `3/3` antes da composição existir, GREEN passou `3/3` e a caracterização focal passou `6/6`, cobrindo loading, erro prioritário, conteúdo completo, landmarks acessíveis e os `24` itens da roadmap.

`pnpm verify` passou com `177` arquivos, `790` testes, `16` skips e cobertura `84,81%`/`80,18%`/`87,13%`/`85,65%`; build nos `12` workspaces e E2E web `26/26` em `21,2s` passaram; `verify:hotspots` registrou `152` funções longas, maior função de `128` linhas e `0` hotspots acima de `800` linhas.

O checkpoint preserva estados de carregamento/erro/conteúdo, retry, progress, roadmap, landmarks e projeção pública bounded. A evidência é local do worktree não comitado; a API não estava ativa em `3101`, portanto o E2E não fecha HA. `0/145` cadeias, SHA/RC, gates externos/humanos e reauditoria dos 16 itens continuam necessários.
