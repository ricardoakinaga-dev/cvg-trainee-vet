# 0302 — Backlog Master do BUILD — CVG

**Rastreabilidade:** `BLD-*` aponta para PRD/SPEC, testes e evidência. Nenhum item de código começa antes do gate documental 04–08.

## Execução vigente — Dual 95

A execução corrente coordena duas baselines congeladas: maturidade `83,24/100` (`0491`, 16 itens) e qualidade independente `64,20/100` (`docs/116`, 16 itens). O programa `0307_dual_95_executive_program.md`, roadmap `../04.AUDIT/0514_dual_95_roadmap.md` e backlog `../04.AUDIT/0515_dual_95_backlog.md` exigem `32/32` células ≥95 no mesmo RC. Nenhuma média ou task concluída substitui as duas reauditorias.

`ENT95-*`, `AUD-CQ-*` e `BLK-*` permanecem aliases/requisitos de origem. O status executivo vive em `U95-*`. A fotografia pós-S4-173 está em `docs/117_dual_95_readiness_assessment_2026-08-16.md`; score, `PILOT_BLOCKED` e `0/145` cadeias permanecem sem promoção.

## Baseline histórica — F3-S8 verificado

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

### R1-S4 — E2E contra HA ativo

- **descrição:** executar a jornada de participante no web service e no HA já ativos, com fixture efêmera administrativa e teardown seguro;
- **módulo:** CI/E2E/runtime/edge;
- **dependência:** R1-S1/R1-S2/R1-S3 e canal interno loopback do edge;
- **phase:** R1;
- **risco:** alto — teste pode mascarar falha de proxy, cleanup ou isolamento de dados;
- **impacto:** alto;
- **testes:** `pnpm test:e2e:active-ha`, integração do orquestrador, consulta administrativa de resíduos mutáveis e `ops:verify-ha`;
- **pronto:** navegador percorre web→API→PostgreSQL no runtime ativo; fixture encerra com código 0; resíduos mutáveis ficam em zero; auditoria append-only permanece;
- **status:** COMPLETED localmente;
- **evidência:** `scripts/active-ha-e2e.mjs`, `scripts/real-e2e-fixture-server.mjs`, `tests/integration/active-ha-e2e.test.ts`, Caddy `:8081`, host loopback `3182`, E2E 2/2, contagens mutáveis 0 e 11 registros sintéticos recentes de auditoria imutável preservados;
- **limites:** prova local/LAN; IdP/MFA/recovery externo, domínio/TLS gerenciado, storage externo, deploy/rollback autorizado e CI remoto permanecem pendentes;
- **plano:** 0303_remediation_program.md.

### R2-S1 — Atribuições e estados dos 24 módulos

- **descrição:** job administrativo idempotente para 24 learning_assignments e 24 curriculum_runtime_states, com estado inicial honesto;
- **módulo:** curriculum/application/persistence;
- **dependência:** R1-S1;
- **phase:** R2;
- **risco:** alto;
- **impacto:** alto;
- **testes:** live PostgreSQL, idempotência, RLS contextual, learning path, `pnpm ops:verify-curriculum-runtime`;
- **pronto:** 24 estados/atribuições visíveis somente no escopo autorizado e nenhum mastery inventado;
- **status:** COMPLETED;
- **evidência:** `scripts/materialize-curriculum.mjs` executado no banco ativo e em banco efêmero: 24 `learning_activities`, 796 versões/editorial/itens, 24 `learning_assignments`, 24 `curriculum_runtime_states`; segunda execução idempotente com zero inserts; `scripts/verify-curriculum-runtime.mjs` confirmou M01–M24, estados `PENDENTE`, atribuições `NAO_ATRIBUIDO` e 763 itens ainda não publicados; RLS da API permanece sem `SUPERUSER`/`BYPASSRLS`;
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
- **evidência:** banco autoral e preflight materializados para 24 módulos; a superfície web agora exige justificativa e aprovação clínica antes de habilitar publicação; E2E de autoria passou com publicação desabilitada antes da aprovação e publicação habilitada depois (`c7a591b`); a fila paginada protegida por `VIEW_CLINICAL_REVIEW_QUEUE` e o verificador live confirmaram 796 registros, 763 pendentes, 763 sem revisão e 0 falhas de pré-voo; o modo estrito falha com `clinical review queue is incomplete: 763 pending items`; 763 versões novas estão `PROJECAO_VERIFICADA`, 33 versões M02 pré-existentes `PUBLICADO`; revisão semântica/item a item de Ricardo ainda é obrigatória;
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
- **evidência:** configuração fail-closed e adapter testado para ausência/erro do provedor; recovery/MFA não retornam sucesso sem `IDENTITY_PROVIDER_REQUIRED`, URL HTTPS e token configurados; o commit `3793066` passou a rejeitar `http://` também no runtime de produção; sandbox/provedor real ainda não escolhido;
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
- **evidência:** Caddy/Next headers, redirect HTTP→HTTPS e TLS interno foram verificados ao vivo em `:3180/:3181`; `infra/production/Caddyfile.production.example` foi validado pelo Caddy sem `tls internal`, e o Compose foi validado com FQDN/targets produtivos sintéticos; certificado gerenciado, domínio/DNS, handshake público e E2E externo aguardam decisão humana;
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
- **evidência:** Tempo 3.0.0 recebeu trace OTLP consultável após restart em volume `tempo-data`; o perfil externo genérico `infra/observability/otel-collector.production.example.yaml` e o overlay `infra/production/docker-compose.external-traces.example.yml` foram validados com URL-base HTTPS/autorização sintéticas, sem alterar o perfil local; o caminho padrão `/v1/traces` foi explicitado no follow-up `8b03283`; manifest imutável, dry-run e rehearsal local de canário/rollback (`pnpm ops:rehearse-local-release`, release `bf457ddf…`, rollback versionado `6ca763bb…`) passaram; a prova foi fortalecida com uma segunda imagem construída do commit anterior `b30c85d`, com troca e restauração do HA saudáveis; o backup agora valida manifesto/SHA-256 e restaura artefato existente, com `pnpm test:integration:restore` 2/2 e execução HA observada em 197.097 bytes/27 objetos/RTO 2.357 ms; implementação de traces externos nos commits `b5e615c` e `8b03283`; storage externo escolhido, retenção de produção, RPO/RTO, registry e promoção autorizada permanecem pendentes;
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
- **status:** COMPLETED;
- **evidência:** parser/timeout default validado por teste e load smoke HA publicado com `CVG_LOAD_TARGET=http://127.0.0.1:3180/health/live` em 200/200; edge/Tempo/HA verificados ao vivo; `pnpm verify` 412/429 com cobertura global 84,85% statements / 80,07% branches / 86,55% functions / 85,61% lines; build, audit, E2E real 14/14, E2E HA ativo final 2/2, restore isolado 1/1, build descartável isolado em `.next-e2e-real`, web dependencies 200 após teardown e diff-check passaram; correção em `57ed11985312a573a3649ed48c6b15b399e7bf8f`;
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

## Addendum de execução local — 2026-08-14T10:42:04-03:00

O lote de fechamento local da matriz completou os dez elos de evidência que estavam pendentes e integrou o recálculo localmente. `pnpm verify` passou com 161 arquivos de teste, 706 testes aprovados, 18 skips governados e cobertura 83,78% statements / 80,41% branches / 84,95% functions / 84,55% lines; migrations 29/29, contratos 81/81 e worker 24/24 passaram. A matriz está em 145/145 linhas com evidência local e 0/145 cadeias completas, pois o worktree continua dirty e 145/145 commits/SHA de release continuam pendentes.

O recálculo determinístico agora possui adapter PostgreSQL/RLS, rota interna, outbox e handler de worker no runtime local; a entrega clínica externa continua sem prova e a policy de manutenção ainda aguarda horários hospitalares aprovados. Portanto o backlog permanece `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`; BLK-01…BLK-07, BLK-06-B/C/D e BLK-08-C/D continuam abertos.

## Addendum de commit e rollback local — 2026-08-14T11:02:00-03:00

As alterações verificadas foram consolidadas no commit local `4d8618dfcf3aea2cab610842dbe1f7ea74cd33a9`, sem push; o worktree está limpo. As 145 linhas da matriz foram ancoradas no SHA e não há mais gaps de commit/worktree. O ensaio local de release/deploy/rollback passou com release digest `sha256:8c3b2acd13236eefed6f5d639f133eb9e0dc28acd63fd4c861cb9d81d0684524` e rollback digest `sha256:cf03cb172580d36c7eecb1f706bbf1605c46f0377ca55061a2c1b870b27143dd`.

Esse fechamento é local: não promove estado `VERIFIED`/`RELEASE_READY` e não substitui beta clínico, IdP/MFA, DNS/TLS, backup/RPO/RTO, CI/registry/deploy externo, UAT, WCAG manual, Web Vitals reais, soak, DR ou reauditoria.

## Addendum de runtime RC ancorado — 2026-08-14T11:15:28-03:00

O RC local foi reconstruído com `CVG_SOURCE_SHA=e3aff802fe7ec104917e8cc6aa77bb0aea4f6229`. API-A/API-B e worker-A/worker-B estão saudáveis no digest comum `sha256:ac7eac66e96c38cc31ccf01c9911cd112dae1ae6bac79dba6f98f3821c7637ea`, com label de revisão exatamente igual ao source SHA imutável; o snapshot documental posterior foi consolidado em `1501070` sem alteração de código; migrations `29/29` passaram. Health live/dependencies retornou `200/200`, as superfícies internas de recálculo, moderador e administração retornaram `401` sem sessão, e a E2E HA passou `3/3`.

O ensaio local com a imagem RC passou `deploy=PASS`, `rollback=PASS` e `runtimeRestored=true`, usando rollback sintético `sha256:76b84ecd58011cbbffca2594cd2ce75b23b7ab57e66ebc7ea384b8d30f7567a4`. Esse resultado fecha somente o vínculo local de SHA/digest/runtime/rollback; não promove `VERIFIED`/`RELEASE_READY` nem substitui os gates externos, clínicos, humanos, UAT, operação e reauditoria.

## Addendum de probes operacionais — 2026-08-14T11:32:02-03:00

A fila clínica live confirmou `796` conteúdos, `763` pendências não revisadas e `0` falhas técnicas; o beta está preparado para a revisão com veterinários, sem decisão clínica fabricada. A carga local passou `5000/5000` requests, concorrência `100`, p95 `300,56 ms`. Backup PostgreSQL administrativo fora do repositório e restore isolado passaram com SHA verificado, `32` objetos restaurados e RTO observado `4583 ms`.

Esses resultados fecham preparação e recuperação local, não backup externo com retenção/RPO/RTO produtivos, IdP/MFA, DNS/TLS público, CI/registry/deploy remoto, UAT, soak/DR ou reauditoria. O backlog permanece `WAITING_HUMAN_APPROVAL` / `PILOT_BLOCKED`.

## Addendum de qualidade local — CODE-QUALITY-REVALIDATION-S4-173 — 2026-08-16T10:39:29-03:00

`apps/web/app/dashboard/page.tsx::DashboardPage` foi reduzido de `217` para `21` linhas sob TDD, com modelo/loader, estado, apresentação e composição de estados separados; RED/GREEN passou `3/3`, a caracterização focal passou `6/6`, `pnpm verify` passou com `177` arquivos, `790` testes e `16` skips, build passou nos `12` workspaces e Playwright passou `26/26`. O dashboard preserva loading, erro bounded, retry, conteúdo, roadmap, landmarks e limites de exposição.

Este avanço é evidência local do worktree não comitado. O backlog mantém score `64,20/100`, `0/145` cadeias completas e `PILOT_BLOCKED`; SHA/RC, runtime HA final, gates externos/humanos, revisão clínica, UAT/WCAG manual, soak/DR e reauditoria independente permanecem pendentes.

## Addendum Dual 95 — U95-003 — 2026-08-16T11:38:28-03:00

O inventário `docs/118_dual_95_worktree_inventory_2026-08-16.md` revisou as `221` entradas correntes (`116` modificadas rastreadas + `105` não rastreadas), classificando origem, risco, segredo/dado, ownership, intenção e lotes reversíveis. `pnpm verify:secrets` e `git diff --check` passaram; não houve staging, commit, release, score ou publicação. O próximo gate local é `U95-101–106`; os seis achados altos, `0/145` e `PILOT_BLOCKED` permanecem.

## Addendum Dual 95 — U95-101 — 2026-08-16T11:49:35-03:00

O renderer Prometheus foi corrigido sob RED/GREEN: descritores HELP/TYPE únicos, ordering determinístico, counters `_total` e histogramas em segundos/tipo `histogram`. Os testes focais de observability `13/13`, worker `1/1`, API `71/71`, governança e `promtool check metrics` passaram. D95-H01 fica tratado localmente, sujeito à revalidação no RC; D95-H02–H06, score, `0/145` e `PILOT_BLOCKED` permanecem.

## Addendum Dual 95 — U95-102 — 2026-08-16T12:10:55-03:00

O Compose HA passou a preparar o token em helper one-shot sem rede, com volume `0440` para Prometheus `65534:65534`; Prometheus e Alertmanager ganharam readiness gates e o Prometheus aguarda API/worker A/B saudáveis. RED `1/6` → GREEN `6/6`; `pnpm ops:verify-ha`, build local, `promtool` config/rules/metrics e `amtool` passaram. O runtime mostrou cinco targets `up`, 7 rules `health=ok`, bearer negativo `401` e fire→ack→resolve sintético. Evidência: `docs/119_dual_95_u95_102_observability_evidence_2026-08-16.md`. D95-H02/U95-102 estão concluídos localmente, condicionados a RC imutável/ambiente aprovado; H03–H06, score, `0/145` e `PILOT_BLOCKED` permanecem.

## Addendum Dual 95 — U95-103 — 2026-08-16T12:55:43-03:00

Review + decisão e authorize + publish passaram a compartilhar uma fronteira transacional PostgreSQL, com idempotência por `correlationId`/fingerprint e replay fail-closed em conflito. Fault injection após a segunda transição em ambos os fluxos confirmou rollback sem decisão, outbox ou publicação parcial; o retry retornou resposta igual sem duplicidade. O teste live PostgreSQL passou `1/1`, os unitários focais `14/14`, a migração `0029` foi aplicada, API/worker A/B foram recriados como `healthy` e `pnpm ops:verify-ha` retornou `PASS`. Evidência: `docs/120_dual_95_u95_103_authoring_atomicity_evidence_2026-08-16.md`. D95-H03/U95-103 está concluído localmente, condicionado a RC imutável/ambiente aprovado; próximo U95-104; H04–H06, score, `0/145` e `PILOT_BLOCKED` permanecem.

## Addendum Dual 95 — U95-104 — 2026-08-16T13:13:20-03:00

Publicação agora exige `approvedClinicalApproverId`, a rota bloqueia `403` sem `CLINICAL_APPROVER_ID` corrente e o use case compara esse ID com o `reviewerId` da decisão clínica persistida antes de qualquer transição. O ID também integra o fingerprint de idempotência. RED `3` falhas → GREEN; os focais passaram `74/74`, a integração PostgreSQL `1/1` comprovou divergência/rotação fail-closed e caminho correto, `pnpm test:coverage` passou com `799` testes e `80,05%` de branches, e o `pnpm verify` completo passou. Evidência: `docs/121_dual_95_u95_104_current_clinical_approver_evidence_2026-08-16.md`. D95-H04/U95-104 está concluído localmente, condicionado a RC imutável/ambiente aprovado; próximo U95-105; H05–H06, score, `0/145` e `PILOT_BLOCKED` permanecem.

## Addendum Dual 95 — U95-105 — 2026-08-16T13:21:48-03:00

O fixture PostgreSQL autoral passou a declarar explicitamente autor, aprovador clínico e participante sintéticos, a usar `approvedClinicalApproverId` designado e a separar role administrativa de preparação/limpeza da role da aplicação no workflow. O caso negativo live com reviewer/aprovador divergente falhou `forbidden` antes de transição; a suíte live passou `1/1` sem skip, com caminho correto, fault/replay e teardown limpo. Evidência: `docs/122_dual_95_u95_105_postgres_authoring_fixture_evidence_2026-08-16.md`. D95-H05/U95-105 está concluído localmente, condicionado a RC imutável/ambiente aprovado; próximo U95-106; H06, score, `0/145` e `PILOT_BLOCKED` permanecem.

## Addendum Dual 95 — U95-106 — 2026-08-16T13:40:08-03:00

O controlador de deploy/rollback passou a exigir `api-a`, `api-b`, `worker-a` e `worker-b` em `running/healthy`. O deploy faz gate do canário API/worker, só promove o edge após o gate das quatro réplicas e mantém health final; o rollback faz o mesmo gate antes de declarar sucesso. RED/GREEN passou `9/9`; cada processo foi injetado como `unhealthy`, `worker-a` foi parado live e o gate falhou fechado, com restauração saudável. O rehearsal local passou `deploy=PASS`, `rollback=PASS` e `runtimeRestored=true`; `pnpm verify` passou com `801` testes, `80,05%` de branches e migrações `30/30`. Evidência: `docs/123_dual_95_u95_106_worker_health_gate_evidence_2026-08-16.md`. D95-H06/U95-106 está concluído localmente, condicionado a RC imutável/CI/registry/ambiente aprovado; próximo U95-107; score, `0/145` e `PILOT_BLOCKED` permanecem.
