# CODEX MASTER PROMPT — FINAL TRIPLE AAA CLOSURE (cópia arquivada)

> Cópia verbatim do prompt fornecido pelo usuário em 2026-09-09, arquivada em `docs/` conforme solicitado ("salve uma copia do prompt na pasta docs em seguida implente todo o conteudo do prompt").
> Arquivo: `docs/48_codex_master_prompt_final_triple_aaa_closure.md`.
> Implementação registrada em `docs/99_runtime_state.md`, `docs/20_master_execution_log.md`, `docs/30_backlog_master.md` e auditorias em `docs/audits/`.

---

# CODEX MASTER PROMPT

## CVG TRAINEE VET — FINAL TRIPLE AAA CLOSURE

Repositório alvo:

`https://github.com/ricardoakinaga-dev/cvg-trainee-vet`

Branch canônica:

`main`

Sua missão é concluir a evolução do `cvg-trainee-vet` até o mais alto nível tecnicamente defensável de:

# STATE OF ART / TRIPLO AAA

Você atuará como:

* Principal Software Engineer
* Software Architect
* Security Engineer
* SRE
* QA Architect
* Release Engineer
* Performance Engineer
* Adversarial Reviewer

Não faça uma nova modernização generalista. O sistema já possui uma base avançada. Esta execução é uma **FINAL CLOSURE** focada exclusivamente nos gaps ainda objetivos e comprovados.

---

# 1. ESTADO ATUAL

O sistema já possui:

* modular monolith;
* Domain/Application/Persistence bem separados;
* `architecture-boundaries.json`;
* Route Registry governando runtime;
* anti-drift de rotas;
* distributed rate-limit port;
* RedisRateLimitStore atômico;
* trusted proxy;
* security headers;
* authorization matrix gerada;
* 51 testes negativos de boundary;
* RLS contextual;
* PostgreSQL como source of truth;
* Qdrant como índice derivado;
* IA assistiva, server-side e desligável;
* OpenTelemetry real;
* traceparent W3C;
* tracing/log correlation;
* retries bounded;
* timeouts;
* graceful shutdown;
* worker resilience;
* fault injection;
* concurrency tests;
* load baseline;
* CodeQL;
* dependency review;
* OSV;
* SBOM CycloneDX;
* Actions pinadas por SHA;
* same-SHA verifier;
* release evidence bundle;
* DR docs;
* runbooks;
* state cleanup;
* runtime history separado;
* P0 = 0;
* P1 = 0.

Preserve tudo isso.

---

# 2. OBJETIVO

O estado atual é aproximadamente:

```text
Global Technical Quality ~91/100

AAA Engineering ~92
AAA Security    ~93
AAA Operations  ~90
```

A meta é:

```text
AAA Engineering >= 97
AAA Security    >= 95
AAA Operations  >= 95

P0 = 0
P1 = 0
```

Não inflar score.

Se a evidência não sustentar Triple AAA, não declarar Triple AAA.

---

# 3. GAPS OBRIGATÓRIOS A FECHAR

Esta execução deve focar nestes cinco itens:

```text
AAA-FINAL-001 — API God Module Closure
AAA-FINAL-002 — Coverage & Behavioral Assurance Closure
AAA-FINAL-003 — Full Live RLS Matrix
AAA-FINAL-004 — Remote Same-SHA CI Proof
AAA-FINAL-005 — Distributed Runtime / Redis Multi-Instance Proof
```

Depois executar:

```text
AAA-FINAL-006 — Staging-Like Integrated Verification
AAA-FINAL-007 — Independent Adversarial Final Audit
```

---

# 4. PRIMEIRA AÇÃO

Antes de alterar código:

1. ler `AGENTS.md`;
2. ler `docs/99_runtime_state.md`;
3. ler `docs/20_master_execution_log.md`;
4. ler `docs/30_backlog_master.md`;
5. ler `docs/audits/state-of-art-final-audit-v2.md`;
6. ler `docs/quality/scorecard.md`;
7. ler `architecture-boundaries.json`;
8. ler `BRIEFING/03.BUILD/STATE_OF_THE_ART_MASTER_PLAN.md`;
9. rodar `pnpm verify`;
10. congelar baseline atual.

Criar:

`docs/modernization/0002_final_aaa_closure_baseline.md`

com:

* HEAD;
* coverage;
* tamanho de hotspots;
* skips;
* P0/P1/P2;
* status dos cinco gaps.

---

# 5. AAA-FINAL-001 — API GOD MODULE CLOSURE

Principal dívida técnica atual:

`apps/api/src/http.ts`

e:

`apps/api/src/http.test.ts`

O objetivo é remover o acoplamento central sem big-bang rewrite.

---

# 6. ESTRUTURA ALVO DA API

Evoluir incrementalmente para:

```text
apps/api/src/

routing/
  route-registry.ts
  router.ts

http/
  errors.ts
  response.ts
  request-context.ts
  validation.ts

middleware/
  authentication.ts
  authorization.ts
  csrf.ts
  rate-limit.ts
  body-limit.ts
  security-headers.ts
  observability.ts

features/
  session/
  invitations/
  accounts/
  diagnostics/
  curriculum/
  activities/
  attempts/
  feedback/
  appeals/
  content/
  reports/
  audit/
```

Cada feature pode conter:

```text
feature.handler.ts
feature.routes.ts
feature.presenter.ts
feature.schemas.ts
feature.authorization.ts
feature.test.ts
```

Não criar arquivos artificiais sem necessidade.

---

# 7. ORDEM DE EXTRAÇÃO

Extrair nesta ordem:

```text
1. attempts
2. diagnostics
3. feedback
4. appeals
5. content
6. accounts
7. invitations
8. reports
9. audit
10. curriculum/activity
```

A ordem deve priorizar:

* maior complexidade;
* maior criticidade;
* maior branch density;
* maior valor para cobertura.

---

# 8. REGRA DA EXTRAÇÃO

Cada extração deve:

```text
RED
→ extract
→ GREEN
→ REFACTOR
→ verify architecture
```

Não alterar comportamento externo.

---

# 9. META DE `http.ts`

Ao final:

`http.ts` deve ser apenas composition/glue.

Meta desejável:

```text
< 800 linhas
```

Ideal:

```text
< 500 linhas
```

Mas responsabilidade é mais importante que número.

---

# 10. DECOMPOR GOD TEST

O atual `http.test.ts` também deve ser dividido.

Criar suites por feature.

Exemplo:

```text
attempts.http.test.ts
diagnostics.http.test.ts
feedback.http.test.ts
appeals.http.test.ts
content.http.test.ts
accounts.http.test.ts
reports.http.test.ts
```

Não apenas recortar o arquivo; melhorar ownership e legibilidade.

---

# 11. COMPLEXITY GATE

Fortalecer `verify:complexity`.

Após esta modernização:

* produção > 800 linhas deve falhar salvo allowlist explícita;
* funções com complexidade excessiva devem gerar falha ou review gate;
* generated files podem ser exceção.

Criar allowlist mínima e justificada.

---

# 12. AAA-FINAL-002 — COVERAGE CLOSURE

Meta atual:

```text
Statements >= 90%
Branches   >= 85%
Functions  >= 90%
Lines      >= 90%
```

Não criar testes inúteis para subir percentual.

---

# 13. COBERTURA POR RISCO

Antes de escrever novos testes, gerar relatório de gaps por:

* branch não coberto;
* feature;
* criticidade.

Priorizar:

```text
auth
authorization
RLS context
attempt submit
diagnostic finalize
recovery
session lifecycle
content transitions
feedback
appeals
worker
rate-limit
AI guards
```

---

# 14. CRITICAL PATH COVERAGE

Para caminhos críticos, exigir:

```text
happy path
invalid input
unauthenticated
unauthorized
wrong scope
duplicate
replay
conflict
dependency failure
timeout
```

---

# 15. BRANCH COVERAGE

O principal alvo é elevar branches.

Evitar testes redundantes.

Cada novo branch test deve documentar:

```text
branch
risk
expected behavior
```

---

# 16. MUTATION TESTING

Aplicar mutation testing seletivo em:

```text
authorization
session
state machines
rate-limit
idempotency
RLS context wrappers
critical transitions
```

Não rodar mutation no repo inteiro.

Registrar mutation score.

Objetivo sugerido:

```text
critical mutation score >= 90%
```

---

# 17. PROPERTY-BASED TESTING

Adicionar onde houver ganho real:

```text
capability combinations
state transitions
idempotency
rate-limit keys
UUID/schema parsers
session expiry windows
```

Evitar fuzzing sem critério.

---

# 18. SKIP CLOSURE

Revisar todos os skips.

Classificar:

```text
environmental
expected
debt
blocker
```

Eliminar qualquer skip que já possa ser executado localmente.

Nenhum skip crítico silencioso.

---

# 19. AAA-FINAL-003 — FULL LIVE RLS MATRIX

Este é o maior gap de segurança restante.

Criar suite live dedicada:

```text
tests/live/rls-full-matrix.test.ts
```

ou estrutura equivalente.

---

# 20. MATRIZ DE IDENTIDADES

Cobrir:

```text
participant A
participant B
staff scope A
staff scope B
admin-like test role
content-indexer
worker/service identity
anonymous/no context
```

---

# 21. MATRIZ DE OPERAÇÕES

Para cada tabela protegida relevante testar:

```text
SELECT
INSERT
UPDATE
DELETE
```

quando aplicável.

---

# 22. CASOS RLS OBRIGATÓRIOS

Provar:

```text
participant A cannot read B
participant A cannot mutate B
staff A cannot cross scope
service identity cannot exceed contract
anonymous cannot access protected rows
```

---

# 23. CONNECTION POOL ISOLATION

Provar:

```text
request A sets principal A
connection returned
request B receives same pool slot
B cannot inherit A
```

Executar repetidamente.

---

# 24. SERVICE IDENTITY

Testar:

* content-indexer permissions;
* worker identity;
* no privilege escalation;
* no ownership;
* no BYPASSRLS;
* no unexpected grants.

---

# 25. MIGRATION / GRANT AUDIT

Criar gate que verifica:

```text
owner
grants
RLS enabled
FORCE RLS where required
application role
migration role
service roles
```

---

# 26. LIVE DB GATE

Criar comando:

```text
pnpm test:rls:live
```

ou equivalente.

Esse gate deve executar em PostgreSQL descartável real.

---

# 27. AAA-FINAL-004 — REMOTE SAME-SHA PROOF

O mesmo SHA deve possuir evidência remota de:

```text
quality workflow
security workflow
CodeQL
SBOM
live PostgreSQL
Qdrant
restore
build
E2E
audit
```

---

# 28. PUBLICAÇÃO CONTROLADA

Fazer push normal para `main`.

Sem force push.

Depois coletar os runs remotos do SHA.

---

# 29. SAME-SHA ASSERTION

O release somente pode promover se:

```text
HEAD_SHA
=
QUALITY_SHA
=
SECURITY_SHA
=
ARTIFACT_SHA
```

---

# 30. CI-RUNS EVIDENCE

Atualizar:

```text
release-evidence/ci-runs.json
```

com:

* workflow name;
* run ID;
* commit SHA;
* status;
* conclusion;
* timestamp;
* artifact references.

---

# 31. FAIL CLOSED

Se um workflow não tiver passado:

não promover.

Não reutilizar evidência de SHA anterior.

---

# 32. WORKFLOW FRESHNESS

Garantir que a evidence bundle tenha:

```text
source SHA
workflow SHA
artifact digest
timestamp
```

---

# 33. AAA-FINAL-005 — REDIS / MULTI-INSTANCE PROOF

O código do rate limit distribuído já existe.

Agora provar o runtime real.

---

# 34. BACKEND REAL

Usar Redis ou Valkey real em teste integrado.

Não fake.

---

# 35. MULTI-INSTANCE TEST

Subir:

```text
API instance A
API instance B
Redis
```

Enviar requests alternadamente.

Provar que o contador é compartilhado.

---

# 36. TESTE DE BYPASS

Exemplo:

```text
limit = 10

5 requests → API A
5 requests → API B
11th request → denied
```

---

# 37. REDIS FAILURE

Testar:

* unavailable;
* slow;
* timeout;
* partial response;
* reconnect.

Verificar failure policy por risk class.

---

# 38. ATOMICIDADE

Provar concorrência real contra Redis:

```text
N clients
parallel increments
```

Sem lost update.

---

# 39. TRUSTED PROXY LIVE

Subir cenário com:

```text
reverse proxy
API
Redis
```

Provar:

* trusted forwarded IP;
* spoof direto ignorado;
* malformed forwarded header;
* IPv4;
* IPv6.

---

# 40. AAA-FINAL-006 — STAGING-LIKE INTEGRATED VERIFICATION

Criar ambiente local/staging-like reproduzível com:

```text
Web
API x2
Worker
PostgreSQL
Redis/Valkey
Qdrant
OTel Collector
```

Não precisa ser Kubernetes.

Preferir Docker Compose ou equivalente simples se necessário.

---

# 41. HTTPS

Adicionar proxy TLS local/staging-like.

Provar cookie:

```text
__Host-
Secure
HttpOnly
SameSite
Path=/
```

---

# 42. COOKIE LIFECYCLE

Testar:

```text
login/invite
rotate
expire
revoke
recovery
```

em HTTPS real.

---

# 43. BROWSER → API → POSTGRES

Executar Playwright contra stack real.

Não mockar API.

Provar pelo menos:

```text
session
dashboard
learning path
attempt
diagnostic
recovery
internal authorization
```

---

# 44. CROSS-SCOPE E2E

Criar usuários sintéticos:

```text
participant A
participant B
staff A
staff B
```

Provar no browser/API real que não há vazamento.

---

# 45. OTEL COLLECTOR REAL

Subir collector.

Confirmar spans recebidos para:

```text
HTTP
application
database
worker
Qdrant
AI fake/local provider
```

---

# 46. TRACE CORRELATION

Para uma jornada E2E:

capturar:

```text
requestId
correlationId
traceId
spanId
```

Provar correlação ponta-a-ponta.

---

# 47. OTEL FAILURE

Derrubar collector durante tráfego.

Aplicação deve continuar funcional.

---

# 48. BACKUP/RESTORE STAGING-LIKE

Executar:

```text
seed synthetic state
backup
destroy target
restore
verify invariants
```

Registrar RTO local.

---

# 49. FAILOVER SIMULATION

Sem criar HA artificial, simular:

* PostgreSQL restart;
* Qdrant restart;
* Redis restart;
* worker restart.

Verificar comportamento.

---

# 50. LOAD COM STACK COMPLETO

Executar k6 contra stack staging-like.

Perfis:

```text
read-heavy
mixed
mutation
auth
attempt submit
diagnostic
```

---

# 51. CAPACITY EVIDENCE

Registrar:

```text
throughput
p50
p95
p99
5xx rate
429 rate
DB pool usage
CPU
memory
worker backlog
Redis latency
```

---

# 52. PERFORMANCE TARGETS

Após baseline, estabelecer budgets realistas.

Não inventar números antes da medição.

---

# 53. SLO VALIDATION

Comparar resultado com SLO documentado.

Marcar:

```text
PASS
DEGRADED
FAIL
```

---

# 54. WORKER E2E

Provar:

```text
event persisted
worker leases
worker processes
Qdrant reconciles
no duplicate effect
```

---

# 55. QDRANT LOSS TEST

Apagar índice derivado.

Rodar rebuild/reconcile.

Provar reconstrução a partir de PostgreSQL.

---

# 56. AI GOVERNANCE E2E

Usar provider fake determinístico ou provider autorizado.

Provar:

* structured output;
* timeout;
* malformed result;
* safe fallback;
* no state mutation automática.

---

# 57. PHASE SECURITY ADVERSARIAL

Após stack staging-like estar verde, executar nova auditoria adversarial.

Tentar:

```text
BOLA
IDOR
cross-scope
session replay
cookie fixation
CSRF
XFF spoof
rate-limit bypass
Redis outage bypass
RLS pool leakage
SQL injection
SSRF
log injection
header injection
prompt injection
Qdrant poisoning
audit tampering
```

---

# 58. ROUTE COVERAGE

Gerar automaticamente matriz:

```text
route
auth
capability
negative tests
positive tests
```

Nenhuma rota privada sem ambos.

---

# 59. API CONTRACT COVERAGE

Garantir:

```text
request schema
response schema
error schema
auth classification
tests
```

por rota.

---

# 60. MAINTAINABILITY SCORE

Recalcular após decomposição:

* largest file;
* largest test;
* cycles;
* dead code;
* complexity;
* module coupling.

Meta:

```text
Maintainability >= 95
```

---

# 61. ARCHITECTURE SCORE

Para atingir >=97:

* God Module removido;
* feature ownership claro;
* route registry canônico;
* zero ciclo;
* dependency boundaries verdes;
* no hidden infrastructure coupling.

---

# 62. SECURITY SCORE

Para >=95:

* full live RLS matrix;
* multi-instance rate limit;
* negative route matrix;
* same-SHA security workflow;
* no P0/P1.

---

# 63. OPERATIONS SCORE

Para >=95:

* real OTel collector proof;
* full stack load;
* backup/restore staging-like;
* failure tests;
* multi-instance;
* same-SHA remote evidence;
* runbooks verified at least synthetically.

---

# 64. RELEASE CANDIDATE GATE

Criar:

```text
pnpm verify:aaa-candidate
```

que agregue apenas gates apropriados.

Deve falhar se:

* coverage abaixo da meta;
* route drift;
* RLS live não provado;
* same-SHA missing;
* release evidence inválido;
* security scan high/critical;
* P0/P1 aberto.

---

# 65. NÃO COLOCAR TESTES PESADOS NO PUSH COMUM

Separar:

```text
fast CI
full candidate CI
scheduled/load CI
```

---

# 66. WORKFLOW SUGERIDO

```text
quality.yml
security.yml
candidate.yml
```

`candidate.yml` pode ser manual/tag/release branch.

---

# 67. FINAL EVIDENCE BUNDLE

Gerar:

```text
release-evidence/
  manifest.json
  git-sha.txt
  sbom.cyclonedx.json
  provenance.json
  test-summary.json
  coverage-summary.json
  rls-live-summary.json
  multi-instance-summary.json
  load-summary.json
  security-summary.json
  otel-summary.json
  migration-head.txt
  ci-runs.json
  artifact-digests.json
```

---

# 68. HASHES

Todos os artefactos relevantes devem possuir SHA-256.

---

# 69. SIGNING

Se existir artefato publicável real:

usar Cosign keyless.

Se não existir:

não fingir signing.

---

# 70. SCORECARD

Atualizar:

`docs/quality/scorecard.md`

Somente após todas as verificações.

---

# 71. FINAL AUDIT V3

Criar:

`docs/audits/state-of-art-final-audit-v3.md`

Com pelo menos:

1. Executive Summary
2. Before / After
3. Architecture
4. Modularization
5. Route Registry
6. API
7. Contracts
8. Persistence
9. RLS
10. Authentication
11. Authorization
12. Rate Limiting
13. Sessions
14. Security
15. Supply Chain
16. Testing
17. Coverage
18. Mutation / Property Testing
19. CI
20. Same-SHA
21. Observability
22. OTel
23. Resilience
24. Worker
25. Qdrant
26. AI
27. Fault Injection
28. Multi-Instance
29. Load / Capacity
30. Backup / Restore
31. DR
32. Frontend / Accessibility
33. Release Engineering
34. Maintainability
35. Production Readiness
36. Residual Risk
37. Scorecard
38. Triple AAA Verdict

---

# 72. FINAL SCORING

Pontuar 0–100:

```text
Architecture
Modularity
Domain
Application
API
Contracts
Persistence
RLS
Authentication
Authorization
Security
Supply Chain
Testing
Coverage
CI
Observability
Resilience
Worker
Performance
Accessibility
Documentation
Maintainability
Release Engineering
Production Readiness
```

---

# 73. AAA ENGINEERING

Meta:

```text
>=97
```

Usar:

```text
architecture
modularity
domain
application
contracts
testing
coverage
maintainability
CI
traceability
```

---

# 74. AAA SECURITY

Meta:

```text
>=95
```

Usar:

```text
auth
authz
RLS
rate-limit
session
input security
security tests
supply chain
secrets
audit
```

---

# 75. AAA OPERATIONS

Meta:

```text
>=95
```

Usar:

```text
observability
tracing
metrics
SLO
timeouts
retry
worker
backup
restore
DR
fault tests
multi-instance
load
release evidence
```

---

# 76. PROMOTION RULE

Somente declarar:

# STATE OF ART / TRIPLO AAA

se:

```text
AAA Engineering >= 97
AAA Security >= 95
AAA Operations >= 95

P0 = 0
P1 = 0
```

e todos os gates técnicos necessários estiverem verdes.

---

# 77. PRODUCTION VERIFIED

Não declarar:

```text
PRODUCTION VERIFIED
```

sem ambiente real de produção.

Mesmo que Triple AAA técnico seja alcançado, usar classificação correta:

```text
TECHNICALLY VERIFIED
VERIFIED CANDIDATE
STAGING VERIFIED
PRODUCTION CANDIDATE
```

conforme evidência.

---

# 78. AAA-001

Se `AAA-001` exigir decisão humana:

não bloquear engenharia técnica independente.

Mas não fechar:

* pilot;
* production;
* clinical publication;
* real SLO commitment;

sem aprovação humana.

---

# 79. CLINICAL SAFETY

Nenhuma melhoria técnica autoriza:

* publicar conteúdo clínico;
* mudar gabarito;
* aprovar competência;
* alterar protocolo;
* permitir IA decidir aprovação.

---

# 80. NO REAL DATA

Usar somente dados sintéticos.

---

# 81. NO BIG-BANG

Cada feature extraction deve terminar com:

```text
tests
lint
typecheck
architecture
routes
```

---

# 82. COMMITS

Use commits coesos:

```text
refactor(api): extract attempts feature
refactor(api): extract diagnostics feature
refactor(api): split legacy http test suite
test(rls): add full live scope matrix
test(coverage): close critical branch gaps
test(rate-limit): prove multi-instance redis enforcement
ci(candidate): add same-sha aaa promotion gate
test(staging): add browser api postgres integrated path
docs(audit): publish triple aaa final audit v3
```

---

# 83. INDEPENDENT REVIEW

Após implementação, faça auditoria fresh.

Não use apenas o agente que implementou como verificador final.

---

# 84. ADVERSARIAL CRITIC

O critic deve tentar reprovar o sistema.

Só considerar PASS se não encontrar P0/P1.

---

# 85. RESIDUAL BACKLOG

Se restarem P2/P3:

documentar.

P2/P3 podem existir em Triple AAA somente se:

* não quebrarem metas;
* não forem riscos materiais;
* estiverem claramente aceitos.

---

# 86. P0/P1

Qualquer P0/P1:

```text
AAA = FAIL
```

---

# 87. COVERAGE

Se não atingir meta:

```text
AAA Engineering = FAIL
```

salvo decisão documentada de mudar a meta com justificativa técnica e humana.

Não reduzir meta para passar.

---

# 88. SAME-SHA

Sem remote same-SHA:

```text
AAA Release = FAIL
```

---

# 89. RLS

Sem matriz live:

```text
AAA Security = FAIL
```

---

# 90. MULTI-INSTANCE

Sem Redis/Valkey real compartilhado:

```text
Distributed rate limiting = UNVERIFIED
```

---

# 91. FINAL RUN

Executar:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:contract
pnpm test:worker
pnpm verify:migrations
pnpm verify:secrets
pnpm verify:traceability
pnpm verify:architecture
pnpm verify:routes
pnpm verify:complexity
pnpm verify:cycles
pnpm verify:dead-code
pnpm verify:security
pnpm verify:otel
pnpm verify:release-evidence
pnpm verify
pnpm build
pnpm test:e2e
pnpm test:rls:live
pnpm test:load
pnpm audit --audit-level=high
git diff --check
```

Além dos novos gates criados.

---

# 92. ENVIRONMENT

Usar versão canônica do projeto:

```text
Node 22.x compatível
pnpm 10.33.x
```

Não validar oficialmente com runtime fora do contrato.

---

# 93. RELATÓRIO DE CADA PHASE

Formato:

```text
PHASE
STATUS
COMMITS
FILES
TESTS
COVERAGE
FINDINGS CLOSED
NEW FINDINGS
EVIDENCE
BLOCKERS
NEXT
```

---

# 94. NÃO PARAR NO PLANEJAMENTO

Implemente.

Não me devolva apenas roadmap.

---

# 95. PRIORIDADE

```text
Correctness
>
Security
>
Data Integrity
>
Reliability
>
Maintainability
>
Observability
>
Performance
>
Convenience
```

---

# 96. SEM OVERENGINEERING

Não adicionar:

* Kubernetes;
* Kafka;
* service mesh;
* microservices;
* event sourcing;
* CQRS;

sem necessidade comprovada.

---

# 97. ARQUITETURA ALVO

Continua sendo:

```text
Web
 ↓
API
 ↓
Application
 ↓
Domain
 ↓
Ports
 ├─ PostgreSQL
 ├─ Redis/Valkey
 ├─ Qdrant
 └─ AI

Worker
```

Modular monolith.

---

# 98. DEFINITION OF DONE

A closure só termina quando:

```text
http.ts no longer God Module
http.test.ts split
coverage >= 90/85/90/90
full live RLS matrix PASS
remote same-SHA PASS
Redis multi-instance PASS
browser→API→Postgres real E2E PASS
OTel collector integration PASS
load full-stack executed
release evidence complete
P0 = 0
P1 = 0
```

---

# 99. FINAL VERDICT

Ao final diga explicitamente um dos três:

```text
TRIPLE AAA — PASS
TRIPLE AAA — REVISE
TRIPLE AAA — FAIL
```

Explique com evidência.

---

# 100. COMEÇAR AGORA

Primeiro execute:

```text
AAA-FINAL-001
API GOD MODULE CLOSURE
```

Mapeie os blocos de `apps/api/src/http.ts`, escolha as extrações de maior valor e comece em TDD.

Depois prossiga sequencialmente até concluir todos os itens tecnicamente executáveis.

O objetivo não é apenas melhorar o repositório.

O objetivo é produzir **evidência suficiente para tentar reprovar o sistema e ainda assim sustentar um claim de State of Art / Triplo AAA**.
