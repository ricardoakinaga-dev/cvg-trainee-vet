# CODEX MASTER PROMPT — Final State of Art / Triple AAA Closure (ROUND 2)

> **Procedência:** prompt integral fornecido por Ricardo em 2026-09-09, preservado
> verbatim em `docs/` conforme solicitado ("Salve uma copia do prompt a seguir
> na pasta docs em seguida implemente todo o conteudo do prompt").
> **Arquivo canônico:** `docs/47_codex_master_prompt_final_closure_triple_aaa.md`
> **Antecessor:** `docs/46_codex_master_prompt_state_of_art_triple_aaa.md`
> (Round-1: baseline + fundação).
> **Status de execução:** em implementação faseada; ver
> `docs/99_runtime_state.md`, `docs/20_master_execution_log.md` e
> `docs/30_backlog_master.md`.
> Nenhuma decisão de produto, gate clínico/humano, deploy, publicação clínica
> ou uso de dados reais foi autorizado por este arquivamento.

---

# CODEX MASTER PROMPT

## CVG TRAINEE VET — FINAL STATE OF ART / TRIPLE AAA CLOSURE

Repositório alvo:

`https://github.com/ricardoakinaga-dev/cvg-trainee-vet`

Branch canônica:

`main`

Sua função nesta execução é atuar simultaneamente como:

* Principal Software Engineer;
* Software Architect;
* Security Engineer;
* SRE;
* QA Architect;
* Release Engineer;
* Performance Engineer;
* Independent Adversarial Reviewer.

Sua missão é concluir a modernização do `cvg-trainee-vet` até que o sistema possa ser classificado, com evidência técnica real, como:

# STATE OF ART / TRIPLE AAA

Não produza apenas documentação ou arquitetura futura. Implemente, teste, integre e prove as melhorias.

---

# 1. CONTEXTO ATUAL

O projeto já possui uma base avançada.

Não refaça o que já está funcionando.

Preserve:

* modular monolith;
* `apps/api`;
* `apps/web`;
* `apps/worker`;
* `packages/domain`;
* `packages/application`;
* `packages/persistence`;
* `packages/contracts`;
* `packages/integrations`;
* `packages/observability`;
* `packages/config`;
* `packages/curriculum`;
* arquitetura executável;
* RLS;
* PostgreSQL como source of truth;
* Qdrant como índice derivado reconstruível;
* IA assistiva e desligável;
* deny-by-default;
* autorização server-side;
* TDD;
* rastreabilidade;
* CI existente;
* CodeQL;
* dependency review;
* SBOM;
* Actions pinadas por SHA;
* release evidence;
* security headers;
* `RateLimitStore`;
* route registry;
* request context;
* runbooks;
* SLO;
* DR documentation;
* supply-chain hardening já implementado.

O projeto está aproximadamente em:

```text
Global              ~92/100
AAA Engineering     ~94/100
AAA Security        ~93/100
AAA Operations      ~87/100
```

Objetivo:

```text
AAA Engineering >= 97
AAA Security    >= 95
AAA Operations  >= 95

P0 = 0
P1 = 0
```

---

# 2. REGRAS DE EXECUÇÃO

Antes de qualquer alteração:

1. leia `AGENTS.md`;
2. leia `docs/99_runtime_state.md`;
3. leia `docs/20_master_execution_log.md`;
4. leia `docs/30_backlog_master.md`;
5. leia `BRIEFING/03.BUILD/STATE_OF_THE_ART_MASTER_PLAN.md`;
6. leia o roadmap AAA;
7. leia o backlog AAA;
8. leia `architecture-boundaries.json`;
9. leia `docs/modernization/0001_baseline_audit.md`;
10. leia todas as auditorias AAA relevantes;
11. execute os gates atuais.

Não invente requisitos de produto.

Não mude regra clínica sem aprovação humana.

Não faça deploy.

Não publique conteúdo clínico.

Não use dados reais.

Não falseie evidência.

---

# 3. PRIORIDADE DESTA RODADA

Esta não é uma nova modernização geral.

É uma:

# MOD-AAA FINAL CLOSURE

A prioridade é fechar os gaps arquiteturais e operacionais restantes.

A ordem obrigatória é:

```text
1. Route Registry Runtime Closure
2. Distributed Rate Limit
3. API Modularization
4. OpenTelemetry Runtime
5. Runtime Resilience
6. Fault / Concurrency / Load Evidence
7. Remote Same-SHA CI Closure
8. Release Evidence Closure
9. Documentation State Cleanup
10. Independent Final Audit
```

---

# 4. PHASE 1 — ROUTE REGISTRY COMO SOURCE OF TRUTH

Problema atual:

existem múltiplas representações da mesma rota:

```text
ROUTE_REGISTRY
routeTemplate()
dispatch HTTP
```

Isso cria risco de drift.

A meta desta fase é transformar `ROUTE_REGISTRY` na fonte canônica das rotas.

## Implementar

Cada definição de rota deve conter, quando aplicável:

```ts
{
  method,
  template,
  matcher,
  auth,
  capabilities,
  enforcement,
  riskClass,
  telemetry,
  handler
}
```

A partir desse registry devem ser derivados:

* routing;
* telemetry route name;
* auth classification;
* capability metadata;
* rate-limit classification.

Não manter segunda lista manual equivalente.

---

# 5. REMOVER `routeTemplate()` MANUAL

O atual `routeTemplate()` deve ser eliminado ou reduzido a um thin adapter baseado no registry.

Objetivo:

```text
request
  ↓
route registry match
  ↓
route definition
  ├─ auth
  ├─ risk
  ├─ telemetry
  └─ handler
```

Eliminar os gaps conhecidos:

```text
F-REG-001
F-REG-002
F-REG-003
F-REG-004
F-REG-005
F-REG-006
```

Nenhuma rota conhecida pode resultar em:

```text
unmatched
```

sem que seja realmente inválida.

---

# 6. TESTE ANTI-DRIFT OBRIGATÓRIO

Criar gate que falhe se houver:

* handler sem registry;
* registry sem handler;
* rota privada sem auth;
* rota privada sem enforcement;
* rota sem risk class;
* rota sem telemetry template;
* capability inexistente;
* rota duplicada;
* matcher ambíguo.

Exemplo:

```text
verify:routes
```

Adicionar ao:

```text
pnpm verify
```

---

# 7. PHASE 2 — RATE LIMIT DISTRIBUÍDO

O `RateLimitStore` já existe.

Agora implementar backend de produção distribuído.

Preferência:

```text
Redis
```

ou backend equivalente robusto.

Criar:

```text
RedisRateLimitStore
```

ou nome equivalente.

---

# 8. REQUISITOS DO RATE LIMIT DISTRIBUÍDO

Deve suportar:

* múltiplas réplicas;
* operações atômicas;
* TTL;
* retry-after;
* fail-open/fail-closed explícito;
* métricas;
* timeout;
* cancelamento;
* tratamento de backend indisponível.

Preferir:

* Lua script atômico;
  ou
* operação atômica equivalente.

Nunca fazer:

```text
GET
increment JS
SET
```

sem atomicidade.

---

# 9. TRUSTED PROXY

Não confiar automaticamente em:

```text
X-Forwarded-For
X-Real-IP
Forwarded
```

Criar configuração explícita de:

```text
TRUSTED_PROXY
```

ou equivalente.

Somente aceitar IP forwarded se a conexão vier de proxy autorizado.

Criar testes:

* spoofed X-Forwarded-For;
* trusted proxy;
* direct client;
* IPv4;
* IPv6;
* malformed address.

---

# 10. RATE-LIMIT FAILURE MATRIX

Definir comportamento por classe.

Exemplo conceitual:

```text
authentication    → fail-closed
recovery          → fail-closed
mutation          → fail-closed
internal          → fail-closed
AI-assisted       → fail-closed
public-low-risk   → policy explícita
```

Não escolher silenciosamente.

Documentar ADR.

---

# 11. PHASE 3 — DECOMPOR `http.ts`

O maior hotspot atual é:

```text
apps/api/src/http.ts
```

com milhares de linhas.

Não faça big-bang rewrite.

Faça extração incremental.

Estrutura alvo sugerida:

```text
apps/api/src/

http/
  response.ts
  errors.ts
  validation.ts
  request-context.ts

routing/
  route-registry.ts
  router.ts

middleware/
  authentication.ts
  authorization.ts
  csrf.ts
  rate-limit.ts
  security-headers.ts
  body-limit.ts

features/
  session/
  accounts/
  invitations/
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

---

# 12. ESTRUTURA DE FEATURE

Cada feature deve ter, conforme aplicável:

```text
feature.routes.ts
feature.handler.ts
feature.presenter.ts
feature.schemas.ts
feature.authorization.ts
feature.test.ts
```

Não obrigue todos os arquivos se uma feature for pequena.

Evite abstrações artificiais.

---

# 13. META DE `http.ts`

Ao final:

`http.ts` não deve continuar sendo um God Module.

Pode existir como façade/composition root pequena.

Meta desejável:

```text
< 500–800 linhas
```

Mas não quebre arquitetura só para atingir número.

O critério real é:

* baixa responsabilidade;
* baixo coupling;
* baixa blast radius;
* features independentes.

---

# 14. DECOMPOR `http.test.ts`

O teste gigante também deve ser dividido.

Criar suites por feature:

```text
diagnostics.http.test.ts
attempts.http.test.ts
feedback.http.test.ts
appeals.http.test.ts
session.http.test.ts
content.http.test.ts
```

Preservar cobertura.

Não simplesmente copiar 5000 linhas para vários arquivos sem melhorar estrutura.

---

# 15. COMPLEXITY BUDGET

Adicionar verificador de hotspots.

Não falhar imediatamente por dívida histórica não tratada nesta rodada.

Mas após a decomposição:

fail em novas violações.

Exemplo de política:

```text
production file:
warning > 500 lines
hard review > 800 lines

test file:
warning > 800
```

Generated files podem ser exceção.

---

# 16. DEAD CODE / DEPENDENCY HYGIENE

Adicionar Knip ou equivalente.

Detectar:

* exports não utilizados;
* arquivos orphan;
* dependencies não usadas;
* devDependencies incorretas.

Criar allowlist para entrypoints legítimos.

Integrar ao CI somente quando estabilizado e sem falsos positivos.

---

# 17. CIRCULAR DEPENDENCY GATE

Adicionar detector de dependências circulares.

Pode usar:

* dependency-cruiser;
* madge;
* ferramenta equivalente.

Deve respeitar `architecture-boundaries.json`.

Nenhum ciclo proibido.

---

# 18. PHASE 4 — OPEN TELEMETRY REAL

A principal dívida operacional é observabilidade distribuída.

Implementar OpenTelemetry de verdade.

Criar pacote/configuração para:

* traces;
* metrics;
* log correlation.

---

# 19. PROPAGAÇÃO DE CONTEXTO

Propagar:

```text
traceId
spanId
correlationId
requestId
```

entre:

```text
HTTP
↓
Application
↓
Persistence
↓
Worker
↓
Qdrant
↓
AI
```

Não propagar campos sensíveis.

---

# 20. SPANS PRINCIPAIS

Instrumentar:

```text
HTTP request
authentication
authorization
application use case
PostgreSQL transaction
Qdrant operation
worker job
AI call
external integration
```

Não criar span para cada função trivial.

---

# 21. OTel COLLECTOR

Adicionar configuração funcional de referência.

Exemplo:

```text
Application
  ↓ OTLP
OTel Collector
  ├─ Prometheus
  ├─ Tempo
  └─ Loki
```

Se Loki não for necessário para logs no ambiente local, documentar.

---

# 22. OTEL DEGRADATION

Se collector cair:

a aplicação não pode necessariamente cair junto.

Telemetria deve ser:

* bounded;
* non-blocking;
* degradável.

Adicionar testes.

---

# 23. TELEMETRY REDACTION

Criar testes impedindo tags/spans/logs contendo:

* password;
* cookie;
* session token;
* recovery token;
* invitation token;
* patient;
* tutor;
* clinical answer body;
* raw AI prompt;
* raw AI response sensível.

---

# 24. METRICS

Preservar métricas atuais se já consumidas.

Adicionar aliases ou migração compatível para nomes padronizados.

Mínimo:

```text
http_requests_total
http_request_duration_seconds
http_server_errors_total

auth_failures_total
authorization_denied_total
rate_limit_rejections_total

db_errors_total
db_operation_duration_seconds

worker_jobs_total
worker_retries_total
worker_dead_letters_total

qdrant_operations_total
qdrant_errors_total

ai_requests_total
ai_errors_total
```

Evitar cardinalidade alta.

Nunca usar IDs de usuário/paciente como labels.

---

# 25. PHASE 5 — TIMEOUT / DEADLINE PROPAGATION

Criar deadline por request.

Exemplo:

```text
incoming request
↓
RequestContext.deadline
↓
application
↓
DB / Qdrant / AI
```

Operação externa não pode executar indefinidamente.

---

# 26. DATABASE TIMEOUTS

Auditar:

* query timeout;
* transaction timeout;
* pool timeout;
* connection timeout.

Criar políticas explícitas.

---

# 27. QDRANT TIMEOUT

Toda chamada Qdrant deve ter:

* timeout;
* abort;
* bounded retry.

Qdrant continua opcional/derived.

---

# 28. AI TIMEOUT

IA deve possuir:

* timeout;
* abort;
* bounded retry;
* quota;
* safe fallback.

Parte disso já existe.

Preservar o que está bom e provar integração.

---

# 29. RETRY POLICY

Criar política central.

```text
RetryPolicy
```

com:

```text
maxAttempts
baseDelay
maxDelay
jitter
retryableErrors
```

Não fazer retry em:

* validation;
* auth;
* forbidden;
* deterministic conflict;
* malformed provider output.

---

# 30. GRACEFUL SHUTDOWN

Provar:

```text
SIGTERM
↓
stop accepting traffic
↓
finish requests/jobs
↓
release worker lease
↓
close PostgreSQL
↓
flush telemetry
↓
exit
```

Adicionar integração/teste determinístico.

---

# 31. WORKER FAILURE MATRIX

Criar testes para:

* crash before ACK;
* crash after persistence;
* duplicate delivery;
* lease expiry;
* competing workers;
* poison message;
* dead-letter;
* replay;
* partial Qdrant failure.

---

# 32. PHASE 6 — FAULT INJECTION

Criar fault injection test-only.

Nunca habilitado em produção.

Cobrir:

```text
Postgres down
Postgres slow
Qdrant down
Qdrant slow
Redis down
Redis slow
AI timeout
AI malformed result
OTel collector down
worker crash
```

---

# 33. CHAOS POLICY

Não criar framework gigantesco.

Crie abstrações pequenas e determinísticas.

Exemplo:

```text
FailingPersistence
SlowQdrant
UnavailableRateLimitStore
TimeoutAIProvider
```

---

# 34. CONCURRENCY

Criar testes live para invariantes críticas:

```text
double submit
double finalize
duplicate recovery
duplicate invitation accept
concurrent status transition
attempt answer CAS
competing workers
idempotent replay
```

---

# 35. POSTGRESQL REAL CONCURRENCY

Não simular toda concorrência em memória.

Pelo menos os invariantes mais críticos devem ser provados em PostgreSQL real descartável.

---

# 36. RLS LIVE CLOSURE

Criar matriz live completa para:

* participant A → participant B;
* staff scope A → scope B;
* content internal → participant;
* worker service identity;
* pooled connection reuse;
* reset transaction context.

Testar no PostgreSQL real descartável.

---

# 37. CONNECTION POOL SECURITY

Provar que contexto RLS não vaza entre requests.

Teste:

```text
request A sets participant A
connection returns to pool
request B participant B
```

B não pode herdar contexto A.

---

# 38. LOAD BASELINE

O k6 já existe.

Executar baseline controlado.

Cenários:

```text
session/current
dashboard
learning-path
attempt start
answer save
attempt submit
diagnostic session
internal dashboard
```

Registrar:

* throughput;
* p50;
* p95;
* p99;
* error rate;
* memory;
* CPU;
* DB pool saturation.

---

# 39. LOAD NÃO É GATE PESADO

Não colocar teste de carga completo no push comum.

Criar comando:

```text
pnpm test:load
```

ou workflow manual/scheduled.

---

# 40. PERFORMANCE BUDGET

Depois do baseline definir budgets realistas.

Exemplo:

```text
p95 GET
p95 mutation
error rate
worker throughput
```

Não copiar números arbitrários.

---

# 41. PHASE 7 — REMOTE SAME-SHA CI

O maior gap de evidência atual:

os testes locais estão verdes, mas o SHA consolidado precisa passar CI remoto.

Garantir para o mesmo commit:

```text
quality
security
CodeQL
dependency review where applicable
SBOM
live PostgreSQL
live Qdrant
restore
build
E2E
audit
```

---

# 42. SAME-SHA CONTRACT

Criar verificador que registre:

```text
HEAD_SHA
QUALITY_SHA
SECURITY_SHA
ARTIFACT_SHA
```

Todos devem ser iguais.

Sem isso, não promover release.

---

# 43. CI ARTIFACT GOVERNANCE

Cada artefato deve conter:

* commit SHA;
* workflow;
* timestamp;
* tool version;
* checksum.

Não aceitar artefato sem origem.

---

# 44. RELEASE EVIDENCE

Fortalecer bundle atual.

Obrigatório:

```text
release-evidence/
  manifest.json
  git-sha.txt
  sbom.cyclonedx.json
  provenance.json
  coverage-summary.json
  test-summary.json
  security-summary.json
  migration-head.txt
  artifact-digests.json
  ci-runs.json
```

---

# 45. PROVENANCE

Registrar:

* source SHA;
* Node;
* pnpm;
* lockfile hash;
* package manifests;
* migration head;
* CI runner;
* build tool versions.

---

# 46. SIGNING

Se houver artefato/container publicável:

adicionar Cosign keyless via OIDC.

Se não houver artefato releaseável neste momento:

documentar a implementação pronta e deixar signing condicionado ao artefato real.

Não criar fake signing.

---

# 47. SBOM VALIDATION

Não apenas gerar SBOM.

Validar:

* JSON parse;
* spec;
* component count > 0;
* project metadata;
* hash.

---

# 48. SECURITY WORKFLOW

Manter:

* CodeQL;
* dependency review;
* audit;
* secret scan;
* SBOM.

Adicionar OSV Scanner ou Trivy onde trouxer valor.

Evitar três scanners iguais sem benefício.

---

# 49. CODEOWNERS

Criar `.github/CODEOWNERS`.

Use apenas usuários reais existentes no repositório.

Se não puder determinar owner válido:

documentar template sem inventar identidade.

---

# 50. BRANCH PROTECTION DOCUMENTATION

Criar recomendação:

```text
PR required
required reviews
required quality workflow
required security workflow
require branches up-to-date
conversation resolution
squash merge
no force push
```

Não alterar settings remotos sem autorização explícita.

---

# 51. PHASE 8 — FRONTEND SECURITY / ACCESSIBILITY CLOSURE

A UI já possui boa evidência local.

Agora fechar gaps:

* server-side auth boundary;
* HTTPS cookie behavior;
* expiration;
* revocation;
* cross-scope;
* accessibility.

---

# 52. COOKIE LIVE TEST

Provar com HTTPS local/staging-like:

```text
Secure
HttpOnly
Path=/
SameSite
__Host-
```

Provar que token não aparece em URL após recovery.

---

# 53. ACCESSIBILITY

Manter axe.

Adicionar testes para:

* focus order;
* skip navigation;
* headings;
* labels;
* reduced motion;
* zoom/reflow;
* keyboard-only;
* error announcement.

---

# 54. CSP

Garantir que CSP implementada funcione com Next.js.

Não usar:

```text
unsafe-eval
unsafe-inline
```

sem justificativa.

Se Next exigir nonce/hash:

implementar corretamente.

---

# 55. SECURITY HEADERS TEST

Criar teste E2E/live verificando headers efetivos:

```text
Content-Security-Policy
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
frame-ancestors
HSTS quando HTTPS
```

---

# 56. PHASE 9 — RUNTIME STATE CLEANUP

O `docs/99_runtime_state.md` está excessivamente grande.

Preservar conteúdo histórico, mas mover história.

Estrutura:

```text
docs/99_runtime_state.md
docs/runtime-history/
```

O state atual deve conter apenas:

```text
context
phase
sprint
task
status
last action
next action
blockers
human approval
current evidence
timestamp
```

---

# 57. HISTORY MIGRATION

Não apagar histórico.

Mover seções antigas para arquivos como:

```text
docs/runtime-history/2026-08.md
docs/runtime-history/2026-09.md
```

ou estrutura equivalente.

---

# 58. DOCUMENTATION DRIFT

Atualizar:

```text
docs/quality/scorecard.md
```

pois o score atual ainda reflete baseline antigo.

Não atribuir nota AAA antes da auditoria final.

---

# 59. PHASE 10 — SECURITY ADVERSARIAL AUDIT

Depois de implementar tudo, assuma papel de atacante interno.

Procure:

```text
auth bypass
IDOR
BOLA
scope escalation
RLS bypass
cookie replay
session fixation
CSRF bypass
route classification bypass
rate-limit bypass
trusted proxy spoof
Redis failure bypass
SQL injection
SSRF
header injection
log injection
secret leakage
AI prompt injection
Qdrant poisoning
audit tampering
```

---

# 60. AUTHORIZATION MATRIX AUTOMATIZADA

Gerar documentação a partir do registry:

```text
route
method
auth
capability
risk
enforcement
```

Comparar com testes.

Nenhuma rota privada sem teste de acesso.

---

# 61. NEGATIVE SECURITY TESTS

Para cada rota crítica:

```text
unauthenticated
wrong role
wrong scope
malformed ID
missing capability
revoked session
```

---

# 62. AI SECURITY

Criar testes para:

* prompt injection;
* malicious retrieved text;
* malformed structured output;
* oversized output;
* timeout;
* provider 500;
* provider returns HTML;
* provider returns invalid JSON.

Nunca permitir IA alterar diretamente estado crítico.

---

# 63. QDRANT TRUST BOUNDARY

Qdrant não é source of truth.

Provar que dados do Qdrant não conseguem:

* elevar permissão;
* alterar nota;
* alterar publicação;
* alterar estado.

---

# 64. AUDIT TRAIL

Provar que ações críticas registram:

```text
actor
scope
action
target
outcome
timestamp
requestId
```

Sem payload sensível.

---

# 65. PHASE 11 — MUTATION / PROPERTY TESTING

Aplicar mutation testing apenas em componentes críticos:

* authorization;
* state machines;
* session;
* RLS context;
* rate limit;
* idempotency.

Não rodar no repo inteiro se custo for alto.

---

# 66. PROPERTY BASED TESTING

Usar em:

* state transitions;
* role/capability combinations;
* parsers;
* rate-limit key building;
* idempotency;
* diagnostic transitions.

---

# 67. PHASE 12 — FINAL VERIFICATION

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
pnpm verify:documentation
pnpm verify:product-definition
pnpm verify:exposure
pnpm verify
pnpm build
pnpm test:e2e
pnpm audit --audit-level=high
git diff --check
```

Mais todos os novos gates.

---

# 68. COVERAGE TARGET

Objetivo:

```text
Statements >= 90%
Branches   >= 85%
Functions  >= 90%
Lines      >= 90%
```

Mas não escrever testes sem valor apenas para subir porcentagem.

Para invariantes críticas:

```text
branch/decision coverage ≈ 100%
```

---

# 69. SKIP GOVERNANCE

Classificar todos os skips:

```text
expected
environmental
debt
blocker
```

Nenhum skip crítico silencioso.

---

# 70. FLAKY TEST DETECTION

Executar suites críticas múltiplas vezes.

Detectar:

* sleeps;
* race;
* fixed ports;
* uncontrolled clocks;
* shared global state.

Corrigir flakiness.

---

# 71. DETERMINISTIC TESTING

Preferir:

* injected clock;
* deterministic IDs;
* isolated ports;
* barriers;
* fake provider.

Evitar `setTimeout()` como sincronização de teste.

---

# 72. NODE VERSION CONSISTENCY

O runtime state registra execução local fora do intervalo suportado.

Corrigir o processo para usar:

```text
Node 22.22.x
pnpm 10.33.x
```

nas verificações canônicas.

CI e local devem usar versões compatíveis.

---

# 73. REPRODUCIBLE DEV ENV

Criar comando/documentação para setup determinístico.

Pode usar:

* `.nvmrc`;
* corepack;
* Dev Container apenas se houver valor;
* script de bootstrap.

Não adicionar Docker por moda.

---

# 74. PRODUCTION CLASSIFICATION

Nunca usar:

```text
PRODUCTION VERIFIED
```

sem:

* deploy;
* real ACL;
* real secrets;
* telemetry production;
* backup production;
* restore production;
* production traffic;
* approval humana necessária.

Pode classificar:

```text
TECHNICALLY VERIFIED
VERIFIED CANDIDATE
STAGING READY
PRODUCTION CANDIDATE
```

conforme evidência.

---

# 75. AAA SCORING

No fim, pontuar:

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

# 76. AAA ENGINEERING

Calcular usando principalmente:

```text
architecture
modularity
domain
application
contracts
testing
maintainability
CI
traceability
```

Meta:

```text
>=97
```

---

# 77. AAA SECURITY

Calcular usando:

```text
auth
authorization
RLS
CSRF
rate-limit
sessions
input validation
security testing
supply chain
secrets
audit
```

Meta:

```text
>=95
```

---

# 78. AAA OPERATIONS

Calcular usando:

```text
observability
tracing
metrics
SLO
alerts
timeouts
retries
workers
backup
restore
DR
fault testing
load testing
release evidence
```

Meta:

```text
>=95
```

---

# 79. PROMOTION RULE

Somente declarar:

# STATE OF ART / TRIPLE AAA

se:

```text
AAA Engineering >= 97
AAA Security >= 95
AAA Operations >= 95

P0 = 0
P1 = 0
```

e os gates técnicos possíveis no ambiente estiverem verdes.

---

# 80. NÃO FAZER SCORE INFLATION

Se resultado for:

```text
Engineering 96
Security 95
Operations 92
```

o sistema NÃO é Triple AAA.

Registrar isso.

---

# 81. FINAL AUDIT

Criar:

```text
docs/audits/state-of-art-final-audit-v2.md
```

com:

1. Executive Summary
2. Baseline Comparison
3. Architecture
4. API Modularization
5. Route Registry
6. Rate Limiting
7. Authentication
8. Authorization
9. RLS
10. Sessions
11. Input Security
12. Supply Chain
13. CI
14. Testing
15. Concurrency
16. Fault Injection
17. Load Testing
18. Observability
19. OpenTelemetry
20. Worker
21. Qdrant
22. AI
23. Backup/Restore
24. Disaster Recovery
25. Frontend Security
26. Accessibility
27. Release Engineering
28. Documentation
29. Production Readiness
30. Residual Risks
31. Scores
32. AAA Verdict

---

# 82. COMPARAÇÃO ANTES / DEPOIS

Mostrar:

```text
Before
Global ~92
Engineering ~94
Security ~93
Operations ~87
```

versus final.

---

# 83. REMEDIATION BACKLOG

Se algo ficar pendente:

criar backlog residual objetivo.

Formato:

```text
ID
Severity
Finding
Evidence
Impact
Fix
Validation
Blocker
```

---

# 84. NÃO BLOQUEAR TODO O TRABALHO POR GATE HUMANO

Se `AAA-001` continuar pendente:

implementar tudo que possa ser feito tecnicamente.

Manter apenas as promoções/deploys dependentes de aprovação bloqueadas.

---

# 85. NÃO ALTERAR CONTEÚDO CLÍNICO

A modernização técnica não autoriza:

* publicar conteúdo clínico;
* editar gabarito;
* aprovar conteúdo;
* alterar protocolo;
* atribuir competência.

---

# 86. NÃO USAR DADOS REAIS

Todos os testes devem usar dados sintéticos.

---

# 87. COMMITS

Faça commits coesos.

Exemplos:

```text
refactor(api): make route registry the runtime source of truth
feat(security): add distributed rate limit store
refactor(api): extract attempt feature handlers
feat(observability): add OpenTelemetry tracing
test(security): add live cross-scope RLS matrix
test(resilience): add deterministic fault injection
ci(release): enforce same-sha evidence
docs(runtime): split current state from history
```

---

# 88. EVITAR BIG BANG

Depois de cada extração:

```text
test
typecheck
lint
architecture
```

Não acumular 100 arquivos alterados antes de validar.

---

# 89. INDEPENDENT CRITIC

Após cada grande phase, execute uma auditoria fresh.

O critic deve poder retornar:

```text
PASS
REVISE
FAIL
```

Não converter `REVISE` em `PASS`.

---

# 90. ADVERSARIAL REVIEW FINAL

Após o sistema atingir as metas, tente derrubar o próprio score.

Pergunte:

* existe rota sem registry?
* existe auth apenas frontend?
* existe rate limit local-only?
* existe query sem timeout?
* existe retry infinito?
* existe cross-scope leak?
* existe span contendo PII?
* existe workflow mutable?
* existe artefato sem SHA?
* existe test skip crítico?
* existe claim sem prova?

---

# 91. QUALITY GATES NOVOS

Adicionar, conforme implementado:

```text
verify:routes
verify:complexity
verify:cycles
verify:dead-code
verify:security
verify:otel
verify:release-evidence
```

Não adicionar gate falso ou trivial.

---

# 92. SPEED VERSUS CORRECTNESS

Prioridade:

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

# 93. NÃO INTRODUZIR OVERENGINEERING

Não adicionar:

* Kubernetes;
* Kafka;
* service mesh;
* CQRS;
* event sourcing;
* microservices;

sem requisito real.

---

# 94. MODULAR MONOLITH CONTINUA SENDO A ARQUITETURA ALVO

A forma ideal continua:

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
 ├─ Qdrant
 └─ AI

Worker
```

---

# 95. FINAL DEFINITION OF DONE

O programa só pode marcar esta modernização como `COMPLETED` quando:

* route registry governa runtime;
* `routeTemplate()` duplicado removido;
* zero telemetry gap conhecido;
* rate limit distribuído implementado;
* trusted proxy seguro;
* `http.ts` decomposto;
* God Test decomposto;
* OpenTelemetry funcionando;
* trace correlation funcionando;
* deadline propagation funcionando;
* graceful shutdown testado;
* fault injection implementado;
* concorrência crítica provada;
* RLS cross-scope live provado;
* load baseline executado;
* same-SHA CI remoto provado;
* SBOM/provenance/evidence bundle completos;
* scorecard atualizado;
* runtime state limpo;
* P0 = 0;
* P1 = 0.

---

# 96. RELATÓRIO DE SAÍDA

Ao terminar cada phase, responda com:

```text
PHASE
STATUS
FILES CHANGED
TESTS
COVERAGE
FINDINGS CLOSED
NEW FINDINGS
EVIDENCE
NEXT ACTION
```

---

# 97. NÃO PARAR SÓ NO PLANO

Comece imediatamente pela leitura e baseline.

Depois implemente.

Não me entregue apenas:

```text
roadmap
backlog
recommendations
```

Quero código, testes e evidência.

---

# 98. PRIMEIRA AÇÃO

Comece por:

```text
MOD-AAA-R2-001
Route Registry Runtime Closure
```

Leia:

```text
apps/api/src/routing/route-registry.ts
apps/api/src/server.ts
apps/api/src/http.ts
```

Mapeie todas as rotas existentes.

Crie RED para cada gap.

Faça o registry assumir o runtime.

Somente depois prossiga.

---

# 99. SEGUNDA AÇÃO

Depois execute:

```text
MOD-AAA-R2-002
Distributed Rate Limit
```

com backend distribuído real e testes.

---

# 100. OBJETIVO FINAL

Transforme o `cvg-trainee-vet` de:

```text
Advanced / Enterprise Production Candidate
```

para:

# STATE OF ART / TRIPLE AAA

com qualidade demonstrada por:

```text
Architecture
Security
Testing
Observability
Reliability
Resilience
CI
Supply Chain
Release Evidence
Runtime Proof
Independent Audit
```

e não por autoavaliação.

Comece agora.

---

# Resultado esperado (instrução de entrega do solicitante)

Me entregue um programa State of Art, Triple AAA de qualidade.
