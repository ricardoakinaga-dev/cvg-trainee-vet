# 0302 — Backlog Master do BUILD — CVG

**Rastreabilidade:** `BLD-*` aponta para PRD/SPEC, testes e evidência. Nenhum item de código começa antes do gate documental 04–08.

## Execução atual — F3-S8 verificado

- B0 está concluído: configuração server-side, PostgreSQL/migração, Qdrant, embeddings, IA estruturada, composição e CI foram materializados e verificados;
- B1 está concluído: domínio, contratos, autorização, erros, idempotência e casos Start/Submit foram testados;
- F2-S1 está concluído: PostgreSQL com tentativa/atividade/idempotência/outbox, API HTTP mínima, health e smoke live foram verificados;
- F2-S2 está concluído: sessão server-side com hash/cookie seguro, SaveAnswer transacional, projeção pública, auditoria append-only com RLS mínima, API de resposta e composição operacional de Qdrant foram verificados;
- F3-S1 está concluído com gaps explícitos: conteúdo versionado mínimo, itens de atividade, atribuição, leitura autorizada e projeção pública sem `scopeId` foram verificados em unitário, contrato, API e PostgreSQL live;
- F3-S2 foi fechado com gaps: transição editorial por papel, publicação/retirada com outbox redigido, progresso/retomada mínima, worker com lease/retry/dead-letter lógico, indexação Qdrant por evento e sink de sugestão `DRAFT_AI` foram materializados e verificados em testes unitários e PostgreSQL/Qdrant live;
- F3-S3 foi fechado com gaps explícitos: convite interno de uso único, ativação transacional, sessão segura, correção humana versionada e feedback exclusivo do participante foram materializados, com cobertura e PostgreSQL live;
- F3-S4 foi fechado com gaps explícitos: superfície web inicial do participante, projeção restrita e ciclo iniciar–salvar–submeter foram materializados; três cenários Playwright sintéticos passam e o CI executa o navegador após o build;
- F3-S5 foi materializado com gaps explícitos: logger JSON redigido, correlação, métricas em memória e telemetria de API/worker passaram em testes negativos de exposição;
- F3-S6 foi materializado com gaps explícitos: CSRF por origem/metadado Fetch, `WEB_ORIGINS`, rate limit bounded por processo, `Retry-After`, health isento e drenagem de corpos rejeitados passaram nos gates;
- F3-S7 foi materializado com gaps explícitos: reconciliação explícita Qdrant desde o conjunto publicado PostgreSQL, comparação por hash/metadado, remoção de órfãos e operação `runtime.reconcile()` passaram nos gates;
- F3-S8 foi materializado e verificado: rotação transacional, revogação uniforme, cookie expirado e contratos de sessão passaram nos gates unitário, HTTP e PostgreSQL live;
- o recorte usa somente dados sintéticos de teste e não transporta fontes, fotos, PDFs, OCR ou conteúdo clínico publicado para eventos, Qdrant, IA ou superfície participante.

Estado: `IN_PROGRESS`; próximo gate: consolidar a auditoria dos complementos F3-S4/F3-S5/F3-S6/F3-S7/F3-S8 e depois fechar E2E contra API real, collector/alertas e demais jornadas.

### Progresso B1-S1

- `BLD-002`: `COMPLETED` — transições puras de tentativa e conteúdo, invariantes de identidade/versão e testes unitários RED/GREEN/refactor.
- `SEC-AUTHZ`: `COMPLETED` — política de autorização com conta ativa, dono, escopo, papel clínico de Ricardo configurável e deny-by-default.
- `BLD-003`: `COMPLETED` — schemas de avaliação públicos, envelopes, erros, portas e casos Start/Submit idempotentes materializados.
- evidência: `packages/domain/src/{attempt,content}.ts`, `packages/application/src/{authorization,errors,attempt-use-cases}.ts`, `packages/contracts/src/{assessment,api}.ts`, 62 testes globais verdes.

### Progresso F2-S2

- `BLD-005` parcial: sessão server-side, cookie `__Host-`, hash SHA-256, expiração, revogação e autenticação por conta ativa materializados; convite/rotação de papéis e E2E de login permanecem para a fatia de identidade;
- `BLD-006` iniciado: entidade resposta, SaveAnswer, idempotência, atualização otimista da tentativa, rota pública e projeção do participante materializados;
- `BLD-004` ampliado: tabelas de respostas, sessões, contas e auditoria; trigger append-only e RLS de auditoria migrados e verificados em PostgreSQL live;
- integração operacional: API readiness consulta PostgreSQL e Qdrant habilitado; inicialização cria/valida coleção Qdrant; IA continua adaptador server-side desligável e sem chamada no caminho crítico;
- evidência: `pnpm build`, `pnpm typecheck`, `pnpm test:coverage`, `pnpm verify`, testes live PostgreSQL de tentativa/resposta/sessão/auditoria e teste live Qdrant.

Próximo task: concluir F3-S3 com identidade complementar, correção/feedback e testes de superfície; em seguida executar a auditoria scoped F3-S3.

## Progresso F3-S1

- `BLD-006` parcial: atividade publicada, conteúdo versionado mínimo, itens ordenados, atribuição elegível e leitura por participante foram materializados;
- `F3-S1-PUBLISHED-ACTIVITY`: `COMPLETED_WITH_GAPS` — repositório PostgreSQL filtra atribuição/estado/publicação, contrato público remove `scopeId` e metadados internos, e a rota `GET /api/v1/activities/:id` foi testada;
- migração `0003_fluffy_psylocke.sql` aplicada no PostgreSQL efêmero; teste live validou dois itens sintéticos em ordem e limpeza;
- evidência: `traceability.yml`, `packages/persistence/src/activity-repository.ts`, `packages/contracts/src/learning.ts`, `apps/api/src/http.ts`, testes unitários/contratuais/API e `tests/integration/postgres-activity-content.test.ts`;
- não implementado nesta fatia: autoria/publicação por papel, currículo completo, correção/progresso, worker, RLS contextual, observabilidade, web/E2E e IA externa real.

## Progresso F3-S2 — conteúdo, progresso e integrações

- `F3-S2-CONTENT-PROGRESS-WORKER-AI`: `IMPLEMENTED_WITH_GAPS` — autorização deny-by-default para transições editoriais, rota interna de transição, projeção de progresso sem identificadores internos, outbox com claim/lease/retry/dead-letter lógico, handlers Qdrant de publicação/retirada e sink de sugestão IA `DRAFT_AI` foram implementados;
- migração `0004_outstanding_green_goblin.sql` foi gerada e aplicada no PostgreSQL efêmero; teste live percorreu claim de dois eventos sintéticos, marcação `PROCESSED` e persistência do rascunho interno sem conteúdo do participante no evento;
- Qdrant live confirmou criação/validação, filtro por escopo, upsert e remoção determinística; o worker não grava texto no payload vetorial;
- IA externa real não é chamada no CI: o adaptador OpenAI é server-side, estruturado, `store=false`, sem retry automático, e o worker usa fake determinístico para o fluxo de sink;
- F3-S2 não fechou release: ainda faltavam convite, correção e feedback; esses itens foram levados para F3-S3. Permanecem nesta fatia: recuperação/rotação, CSRF/rate limit, currículo completo, RLS contextual, observabilidade, web/SPA/E2E, reconciliação formal e backup/restore.

## Progresso F3-S3 — identidade, correção e feedback

- `BLD-005`: `PARTIAL_IMPLEMENTED` — convite interno administrativo, token hash-only, aceite único, ativação de conta e sessão server-side com cookie seguro;
- `BLD-006`: `PARTIAL_IMPLEMENTED` — correção humana com `AssessmentResult` versionado, transição `SUBMETIDA → AGUARDA_CORRECAO_HUMANA → CORRIGIDA_HUMANAMENTE`, feedback por dono e idempotência;
- `BLD-004`: migração `0006_unknown_randall_flagg.sql` adicionou `account_invitations` com FK, hash único, expiração e aceite;
- evidência: contratos, casos de uso, mapeamento/repositório, API, servidor HTTP, teste live PostgreSQL, cobertura global `84,25% / 80,18% / 82,92% / 85,42%` (statements/branches/functions/lines), build/typecheck/lint e scans;
- não concluído: RLS contextual, autoria/operação web, E2E contra API real, axe/revisão manual, observabilidade externa, crash/replay operacional, execução operacional conjunta da reconciliação, backup/restore e IA externa real.

## Progresso F3-S4 — web participante e E2E

- `BLD-009`: `PARTIAL_IMPLEMENTED` — página participante responsiva, formulário de convite, atividade atribuída, tentativa, resposta e submissão com envelopes públicos;
- `F3-S4-WEB-PARTICIPANT-E2E`: `IMPLEMENTED_WITH_GAPS` — Playwright passou em 3 cenários sintéticos; CI instala Chromium e roda a suíte após `pnpm build`;
- evidência: `apps/web/app/page.tsx`, `apps/web/app/globals.css`, `playwright.config.ts`, `tests/e2e/participant-access.spec.ts`, `pnpm test:e2e`, `pnpm build`, `pnpm verify`;
- não concluído: navegador contra API/PostgreSQL reais, autoria/operação, axe/revisão manual de acessibilidade, observabilidade externa, execução operacional conjunta da reconciliação, backup/restore e IA externa real.

## Progresso F3-S5 — observabilidade e redaction

- `BLD-010`: `PARTIAL_IMPLEMENTED` — módulo `@cvg/observability`, logger JSON allowlisted, IDs de correlação validados, contadores/histogramas em memória e instrumentação de API/worker;
- `F3-S5-OBSERVABILITY-REDACTION`: `IMPLEMENTED_WITH_GAPS` — testes cobrem níveis, campos proibidos, campos inválidos, repetição, falha/retry e ausência de payload;
- evidência: `packages/observability/src/observability.ts`, `packages/observability/src/observability.test.ts`, `apps/api/src/server.ts`, `apps/api/src/server.test.ts`, `apps/worker/src/loop.ts`, `apps/worker/src/loop.test.ts`;
- não concluído: exporter/collector OTel, retenção, acesso ao sink, alertas/SLOs, dashboards, traces distribuídos, execução operacional conjunta da reconciliação, RLS contextual, backup/restore e rate limit compartilhado para escala horizontal.

## Progresso F3-S6 — hardening de borda

- `BLD-011`: `IMPLEMENTED_WITH_GAPS` — `WEB_ORIGINS`, guard CSRF para mutações autenticadas, rate limit local bounded, `Retry-After`, exclusão de health e drenagem de corpos rejeitados;
- `F3-S6-EDGE-HARDENING`: `IMPLEMENTED_WITH_GAPS` — testes unitários/API cobrem origem permitida/malformada, same-site, cross-origin, burst, expiração, limite de chaves e integração antes do caso de uso;
- evidência: `apps/api/src/request-security.ts`, `apps/api/src/server.ts`, `apps/api/src/main.ts`, `.env.example`, `apps/api/src/request-security.test.ts` e `apps/api/src/server.test.ts`;
- não concluído: E2E navegador→API real, rate limit compartilhado para múltiplas réplicas, RLS contextual e observabilidade externa.

## Progresso F3-S7 — reconciliação Qdrant

- `BLD-012`: `IMPLEMENTED_WITH_GAPS` — fonte PostgreSQL publicada, `VectorStorePort.list` por scroll, comparação determinística, upsert de divergentes, remoção de órfãos e runbook `pnpm reconcile:qdrant`;
- `F3-S7-INDEX-RECONCILIATION`: `IMPLEMENTED_WITH_GAPS` — worker expõe operação explícita e desabilitada com segurança quando Qdrant/embedding não estão configurados;
- evidência: `traceability.yml`/`F3-S7-INDEX-RECONCILIATION`, `apps/worker/src/reconcile.ts`, `apps/worker/src/indexing.ts`, `packages/integrations/src/qdrant.ts`, `packages/persistence/src/content-repository.ts`, testes unitários e `tests/integration/qdrant-live.test.ts`;
- não concluído: execução operacional automatizada com PostgreSQL+Qdrant habilitados no mesmo comando, observabilidade externa e backup/restore.

## Progresso F3-S8 — rotação e revogação de sessão

- `BLD-013`: `IMPLEMENTED_WITH_GAPS` — rotação atômica do hash atual para novo registro, revogação uniforme, cookie de limpeza e guard de API;
- `F3-S8-SESSION-ROTATION`: `IMPLEMENTED_WITH_GAPS` — testes unitários, contrato, HTTP e PostgreSQL cobrem o fluxo sem token em superfície pública;
- evidência: `traceability.yml`/`F3-S8-SESSION-ROTATION`, `packages/application/src/session.ts`, `packages/persistence/src/session-repository.ts`, `packages/contracts/src/session.ts`, `apps/api/src/http.ts` e testes;
- não concluído: E2E navegador→API real, observabilidade externa, RLS contextual e backup/restore; recuperação interna permanece baseada em convite administrativo controlado.

## P0 — CRÍTICO

### BLD-001 — Fundação e CI

- **descrição:** workspace pnpm, TypeScript strict, lint, format, typecheck, cobertura, secret scan e pipeline.
- **módulo:** foundation/CI
- **dependência:** Phase -1 concluída
- **phase:** 0
- **risco:** alto
- **impacto:** alto
- **testes:** `SEC-FOUNDATION`, `UNIT-BOOT`, `CI-QUALITY`
- **pronto:** pipeline verde com falhas deliberadas bloqueadas.

### BLD-002 — Domínio e estados

- **descrição:** entidades, invariantes e máquinas de estado de conta, conteúdo, tentativa, resultado, ticket e job.
- **módulo:** `packages/domain`
- **dependência:** BLD-001
- **phase:** 1
- **risco:** crítico
- **impacto:** alto
- **testes:** `UNIT-DOMAIN-*`, `PROPERTY-DOMAIN-*`
- **pronto:** testes RED/GREEN/refactor, sem dependência de rede/DB.

### BLD-003 — Contratos e aplicação

- **descrição:** comandos, queries, erros, schemas Zod/OpenAPI, idempotência e política de escopo.
- **módulo:** `packages/application`, `packages/contracts`
- **dependência:** BLD-002
- **phase:** 1
- **risco:** crítico
- **impacto:** alto
- **testes:** `APP-*`, `CONTRACT-*`, `SEC-AUTHZ-*`
- **pronto:** entradas `unknown` validadas e DTO público sem campos internos.

### BLD-004 — PostgreSQL, migrações e RLS

- **descrição:** schemas, constraints, repositories, migrações expand/contract, auditoria e outbox.
- **módulo:** `packages/persistence`, PostgreSQL
- **dependência:** BLD-003
- **phase:** 2
- **risco:** crítico
- **impacto:** alto
- **testes:** `INT-DB-*`, `MIGRATION-*`, `RLS-*`
- **pronto:** transações e rollback testados em banco efêmero.

### BLD-005 — Identidade e autorização

- **descrição:** convite, sessão, recuperação, papéis, escopo e bootstrap de `CLINICAL_APPROVER`.
- **módulo:** `apps/api`, identity adapter
- **dependência:** BLD-004
- **phase:** 2
- **risco:** crítico
- **impacto:** alto
- **testes:** `INT-AUTH-*`, `E2E-AUTH-*`, `SEC-AUTH-*`
- **pronto:** deny-by-default e acesso cruzado rejeitado.

### BLD-006 — Aprendizagem e avaliações

- **descrição:** currículo, conteúdo versionado, tentativas, respostas, correção, progresso, remediação, retenção, feedback e contestação.
- **módulo:** learning/assessment/governance
- **dependência:** BLD-005
- **phase:** 3
- **risco:** crítico
- **impacto:** alto
- **testes:** `UNIT-LEARNING-*`, `INT-ASSESSMENT-*`, `E2E-LEARNING-*`
- **pronto:** retomada, submissão única, cálculo e auditoria passam.

### BLD-007 — Worker e outbox

- **descrição:** lease, retry, dead-letter lógico, replay, retenção e jobs de projeção.
- **módulo:** `apps/worker`
- **dependência:** BLD-004/006
- **phase:** 3
- **risco:** alto
- **impacto:** alto
- **testes:** `WORKER-RETRY-*`, `WORKER-CRASH-*`, `WORKER-IDEMPOTENCY-*`
- **pronto:** crash/replay não duplica efeito.
- **progresso:** claim com lease, retry exponencial, dead-letter lógico, handlers publicados/retirados e integração PostgreSQL live estão implementados; crash real, replay operacional, métricas e reconciliação formal permanecem pendentes.

### BLD-008 — Qdrant e IA interna

- **descrição:** adaptadores, coleção, embeddings, busca filtrada, IA estruturada, redaction e fallback.
- **módulo:** integration/authoring
- **dependência:** BLD-004/007
- **phase:** 4
- **risco:** alto
- **impacto:** médio/alto
- **testes:** `INT-QDRANT-*`, `INT-AI-*`, `SEC-EXPOSURE-*`
- **pronto:** Qdrant é reconstruível, IA é fake no CI e nenhum dado proibido atravessa a integração.
- **progresso:** adaptadores, configuração, fakes, outbox/worker, sink `DRAFT_AI`, remoção de versão e testes live materializados; reconciliação, observabilidade e chamada externa controlada permanecem pendentes.

### BLD-009 — Web/SPA

- **descrição:** telas de acesso, participante, operação e autoria interna com estados e a11y.
- **módulo:** `apps/web`, `packages/ui`
- **dependência:** BLD-003/005/006/008
- **phase:** 5
- **risco:** alto
- **impacto:** alto
- **testes:** `WEB-*`, `A11Y-*`, `E2E-*`
- **pronto:** fluxos críticos e acesso cruzado passam no Playwright.

## P1 — ALTA PRIORIDADE

### BLD-010 — Observabilidade e operação

- descrição: logs redigidos, OpenTelemetry, métricas, health, alertas e runbooks.
- módulo: runtime/ops
- dependência: BLD-004/007
- phase: 6
- risco: alto
- impacto: alto
- testes: `OBS-*`, `HEALTH-*`, `SEC-LOG-*`
- pronto: falha rastreável por request/correlation sem segredo.

### BLD-011 — Hardening e release

- descrição: audit de dependências, SAST, carga pequena, backup/restauração, smoke, rollback e artefato assinado.
- módulo: CI/release
- dependência: BLD-001–010
- phase: 6/7
- risco: alto
- impacto: alto
- testes: `RELEASE-*`, `RECOVERY-*`, `SMOKE-*`
- pronto: release reprodutível e rollback verificado.

### BLD-012 — Conteúdo/protocolo CVG inicial

- descrição: protocolar internamente conteúdo autoral e protocolos derivados da literatura, com revisão de Ricardo e projeção limpa.
- módulo: authoring/content
- dependência: BLD-006/008/009; revisão clínica
- phase: 4/7
- risco: alto
- impacto: alto
- testes: `CONTENT-REDACTION-*`, `CONTENT-PREFLIGHT-*`
- pronto: versão aprovada e nenhuma referência protegida na superfície participante.

## REMEDIAÇÃO R — AUD-2026-08-11-WORKTREE-LOGIN

### R0-S1 — Baseline auditável

- **descrição:** congelar diff, branch, manifesto e gates sem apagar alterações existentes;
- **módulo:** governança/release;
- **dependência:** autorização da remediação;
- **phase:** R0;
- **risco:** alto;
- **impacto:** alto;
- **testes:** verify, verify-documentation, verify-traceability, git diff --check;
- **pronto:** todos os arquivos da janela ligados a um SHA ou status explicitamente pendente;
- **status:** COMPLETED;
- **plano:** 0303_remediation_program.md.

### R1-S1/R1-S2/R1-S3 — E2E real e RLS

- **descrição:** separar DATABASE_URL da API e DATABASE_ADMIN_URL do fixture, tornar seed/cleanup idempotentes e executar web → API → PostgreSQL real;
- **módulo:** CI/E2E/persistence/security;
- **dependência:** R0-S1;
- **phase:** R1;
- **risco:** alto;
- **impacto:** alto;
- **testes:** RLS negativo, seed/cleanup, E2E real, acesso cruzado;
- **pronto:** E2E real verde sem dar BYPASSRLS à API;
- **status:** COMPLETED;
- **evidência:** `scripts/real-e2e-fixture-server.mjs`; `playwright.config.ts`; `.github/workflows/quality.yml`; E2E real 14/14 em banco efêmero com papel da API sem `SUPERUSER`/`BYPASSRLS`; limpeza do banco e papel transitórios confirmada;
- **plano:** 0303_remediation_program.md.

### R2-S1 — Atribuições e estados dos 24 módulos

- **descrição:** job administrativo idempotente para 24 learning_assignments e 24 curriculum_runtime_states, com estado inicial honesto;
- **módulo:** curriculum/application/persistence;
- **dependência:** R1-S1;
- **phase:** R2;
- **risco:** alto;
- **impacto:** alto;
- **testes:** live PostgreSQL, idempotência, RLS contextual, learning path;
- **pronto:** 24 estados/atribuições visíveis somente no escopo autorizado e nenhum mastery inventado;
- **status:** COMPLETED localmente;
- **evidência:** `scripts/materialize-curriculum.mjs` executado no banco ativo e em banco efêmero: 24 `learning_activities`, 796 versões/editorial/itens, 24 `learning_assignments`, 24 `curriculum_runtime_states`; segunda execução idempotente com zero inserts; estados `PENDENTE`/`INICIAR_BASELINE`, atribuições `NAO_ATRIBUIDO`; RLS da API permanece sem `SUPERUSER`/`BYPASSRLS`;
- **plano:** 0303_remediation_program.md.

### R2-S2/R2-S3 — Packs, revisão e publicação

- **descrição:** produzir banco autoral dos 24 packs, preflight, revisão item a item e publicação/retirada rastreável;
- **módulo:** authoring/content/governance;
- **dependência:** R2-S1, source registry e revisão de Ricardo;
- **phase:** R2;
- **risco:** crítico;
- **impacto:** alto;
- **testes:** preflight, exposure, authoring E2E, publicação parcial recusada;
- **pronto:** cada pack tem status e decisão; somente conteúdo revisado pode ser PUBLICADO;
- **status:** WAITING_HUMAN_APPROVAL;
- **evidência:** banco autoral e preflight materializados para 24 módulos; publicação permanece protegida por aprovação clínica independente; 763 versões novas estão `PROJECAO_VERIFICADA`, 33 versões M02 pré-existentes `PUBLICADO`; revisão semântica/item a item de Ricardo ainda é obrigatória;
- **plano:** 0303_remediation_program.md.

### R3-S1/R3-S2/R3-S3 — Provedor, recuperação e MFA

- **descrição:** escolher e integrar provedor externo, recovery, enrollment/challenge MFA, step-up e revogação;
- **módulo:** identity/security/web;
- **dependência:** decisão humana de provedor, domínio e política;
- **phase:** R3;
- **risco:** crítico;
- **impacto:** alto;
- **testes:** adapter unitário, sandbox do provedor, E2E recovery/MFA e secret scan;
- **pronto:** status externo disponível, operação real comprovada e nenhum segredo/log sensível;
- **status:** WAITING_HUMAN_APPROVAL;
- **evidência:** configuração fail-closed e adapter testado para ausência/erro do provedor; recovery/MFA não retornam sucesso sem `IDENTITY_PROVIDER_REQUIRED`, URL HTTPS e token configurados; sandbox/provedor real ainda não escolhido;
- **plano:** 0303_remediation_program.md.

### R4-S1/R4-S2 — Headers e TLS

- **descrição:** CSP, HSTS condicional, headers de proteção, domínio, DNS, certificado e redirect HTTPS;
- **módulo:** edge/web/runtime;
- **dependência:** domínio e infraestrutura autorizados;
- **phase:** R4;
- **risco:** crítico;
- **impacto:** alto;
- **testes:** curl headers, TLS handshake, renovação staging, E2E HTTPS;
- **pronto:** edge HTTPS sem mixed content e cookie Secure;
- **status:** WAITING_HUMAN_APPROVAL;
- **evidência:** Caddy/Next headers, redirect HTTP→HTTPS e TLS interno foram verificados ao vivo em `:3180/:3181`; certificado gerenciado, domínio/DNS e E2E público aguardam decisão humana;
- **plano:** 0303_remediation_program.md.

### R5-S1/R5-S2/R5-S3 — Traces, deploy, rollback e restore

- **descrição:** backend durável de traces, release manifest, canário, rollback, backup agendado e restore com RPO/RTO;
- **módulo:** observability/runtime/release;
- **dependência:** storage/ambiente autorizado;
- **phase:** R5;
- **risco:** crítico;
- **impacto:** alto;
- **testes:** trace após restart, deploy de dois digests, rollback, pg_dump/restore e failover;
- **pronto:** evidência live de retenção, rollback e RPO ≤ 1h/RTO ≤ 4h;
- **status:** WAITING_HUMAN_APPROVAL;
- **evidência:** Tempo 3.0.0 recebeu trace OTLP consultável após restart em volume `tempo-data`; manifest imutável, dry-run de canário/rollback e backup PostgreSQL com checksum passaram; storage externo, retenção de produção, RPO/RTO e promoção real permanecem pendentes;
- **plano:** 0303_remediation_program.md.

### R6-S1/R6-S2/R6-S3 — Carga, auditoria e commit

- **descrição:** corrigir parser 5_000, executar quality gate completo, atualizar auditoria e criar SHA final;
- **módulo:** scripts/CI/audit/release;
- **dependência:** R1–R5 conforme o escopo;
- **phase:** R6;
- **risco:** alto;
- **impacto:** alto;
- **testes:** load smoke default, verify, build, E2E, live, restore, security, diff-check;
- **pronto:** worktree limpo, commit auditável e reauditoria no mesmo SHA sem P1 aberto;
- **status:** READY_FOR_NEXT_STEP;
- **evidência:** load smoke default 200/200, edge/Tempo/HA verificados ao vivo; `pnpm verify` 406/423 com cobertura global acima de 80%, build, audit, E2E real 14/14, restore isolado e diff-check passaram; somente commit/re-auditoria no SHA e gates humanos permanecem;
- **plano:** 0303_remediation_program.md.

## P2 — MÉDIO

- BLD-020: melhoria de busca interna e reindexação sem alterar fonte de verdade;
- BLD-021: otimização de métricas e dashboards;
- BLD-022: segundo adaptador de IA somente se houver necessidade operacional;
- BLD-023: carga maior e isolamento adicional somente com evidência.

## P3 — BAIXO/FUTURO

- BLD-030: OCR/RAG de ativos autorizados, após nova decisão autoral e de segurança;
- BLD-031: app nativo ou microserviço de domínio, somente com dor observada;
- BLD-032: integrações externas de produto fora do MVP.

## Critério comum de aceite

Todo item exige requisito/SPEC, teste antes do código, revisão, `git diff --check`, CI verde, registro no manifesto de rastreabilidade, atualização do log/backlog e próximo passo definido.

## Fechamento técnico adicional — item 11

O item 11 do relatório 0491 foi fechado em 95/100 no artifact `BRIEFING/04.AUDIT/0504_worker_resilience_audit.md`. A matriz de eventos do worker, reconciliação PostgreSQL→Qdrant não vazia, divergência/órfão/replay/retirada, lease expirado, retry e dead-letter têm testes unitários e live. Provider produtivo, observabilidade externa, restore, carga, restart observável e CI com dependências vivas permanecem backlog operacional.
