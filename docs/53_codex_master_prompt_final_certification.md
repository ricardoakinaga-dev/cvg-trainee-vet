# CODEX MASTER PROMPT (cópia arquivada)

## CVG TRAINEE VET — FINAL STATE OF ART / TRIPLO AAA CERTIFICATION

Repositório:

`https://github.com/ricardoakinaga-dev/cvg-trainee-vet`

Branch canônica:

`main`

Objetivo:

# STATE OF ART / TRIPLO AAA — PASS

Esta é a fase final de certificação.

NÃO iniciar nova modernização ampla.

NÃO reabrir arquitetura estável.

NÃO adicionar infraestrutura sem necessidade comprovada.

O trabalho agora é fechar os últimos gaps de assurance, CI remoto, same-SHA, evidência e certificação final.

---

# 1. PAPEL

Atue como:

* Principal Engineer
* Software Architect
* Security Engineer
* SRE
* QA Architect
* CI/CD Engineer
* Release Engineer
* Performance Engineer
* Reliability Engineer
* Adversarial Reviewer
* Independent Verifier

Fluxo obrigatório:

```text
Diagnose
→ Reproduce
→ Fix
→ Verify locally
→ Verify remotely
→ Freeze SHA
→ Regenerate evidence
→ Independent review
→ Mechanical verdict
```

---

# 2. ESTADO ATUAL CONHECIDO

O projeto já possui:

* modular monolith;
* Route Registry canônico;
* arquitetura executável;
* API modularizada;
* auth/authz server-side;
* authorization matrix;
* RLS live;
* PostgreSQL como source of truth;
* Redis real multi-instância;
* trusted proxy;
* Qdrant derivado/reconstruível;
* IA assistiva e desligável;
* OpenTelemetry;
* collector;
* tracing;
* retries e timeouts bounded;
* graceful shutdown;
* worker resilience;
* fault injection;
* staging reproduzível;
* TLS;
* browser→Web→API→PostgreSQL real;
* backup/restore;
* Qdrant rebuild;
* load testing;
* CodeQL;
* OSV;
* dependency review;
* secret scanning;
* SBOM;
* provenance;
* SHA-pinned Actions;
* release evidence;
* coverage acima dos pisos;
* mutation assurance crítica;
* P0 = 0;
* P1 = 0.

Não regredir essas garantias.

---

# 3. PRINCIPAL GAP ATUAL

O principal blocker formal é:

```text
Remote Quality/Security/Candidate = UNPROVEN ou FAIL
Same-SHA = FAIL
```

O sistema só pode sair de:

```text
TRIPLE AAA — REVISE
```

quando a cadeia remota final for comprovada.

---

# 4. METAS FORMAIS

PASS somente se:

```text
AAA Engineering >= 97
AAA Security    >= 95
AAA Operations  >= 95

P0 = 0
P1 = 0
```

Além disso:

```text
Coverage = PASS
Critical Mutation = PASS
RLS = PASS
Redis Candidate = PASS
Remote Quality = PASS
Remote Security = PASS
Remote Candidate = PASS
Same-SHA = PASS
Staging = PASS
Supply Chain = PASS
Release Evidence = PASS
Independent Review = PASS
```

Não arredondar scores para passar.

---

# 5. FAIL CLOSED

Qualquer evidência:

```text
missing
invalid
stale
unknown
pending
cancelled
failed
mismatched
```

deve impedir PASS.

Nunca inferir sucesso.

---

# 6. PRIMEIRA AÇÃO — BASELINE FRESH

Antes de modificar código, leia:

```text
AGENTS.md
docs/99_runtime_state.md
docs/20_master_execution_log.md
docs/30_backlog_master.md
docs/audits/state-of-art-final-audit-v6.md
docs/audits/state-of-art-final-audit-v6.json
docs/quality/scorecard.md
architecture-boundaries.json

.github/workflows/quality.yml
.github/workflows/security.yml
.github/workflows/candidate.yml
```

Leia também os scripts de:

```text
verify:same-sha
verify:aaa-candidate
verify:triple-aaa
verify:release-evidence
verify:audit-consistency
mutation closure
Redis candidate
staging verification
```

Depois execute o baseline local completo.

Criar:

```text
docs/modernization/0007_final_aaa_certification_baseline.md
```

Registrar:

```text
HEAD
Node
pnpm
coverage
mutation
RLS
Redis
staging
quality remote
security remote
candidate remote
same-SHA
P0
P1
P2
```

---

# 7. RUNTIME CANÔNICO

Toda prova oficial deve usar runtime compatível com CI:

```text
Node 22.x
pnpm 10.33.x
```

Outras versões podem servir como evidência adicional, nunca canônica.

---

# 8. REMOTE QUALITY — ROOT CAUSE

Investigue a falha remota do workflow `quality`.

Não aceite:

```text
"funciona localmente"
```

como fechamento.

Use GitHub autenticado:

```text
GITHUB_TOKEN
GitHub API autenticada
gh CLI autenticado
```

Obtenha logs e artifacts do run.

Em falhas E2E, capturar de forma redigida:

```text
Playwright trace
screenshots
browser console
web logs
API logs
health snapshots
test-results
process/port diagnostics
```

---

# 9. REPRODUÇÃO CI-LIKE

Reproduza localmente com:

```text
CI=true
Node 22
pnpm frozen lockfile
mesmas env vars
mesmos serviços
mesma versão Playwright
mesma ordem de execução
```

Investigue:

```text
race conditions
fixed ports
process leakage
unawaited async
filesystem collisions
browser readiness
API readiness
shared global state
clock dependency
fragile sleeps
```

Corrija root cause.

Não mascarar falhas com retries excessivos ou sleeps arbitrários.

---

# 10. REMOTE SECURITY

Revalidar no SHA final:

```text
CodeQL
OSV
dependency review
secret scanning
SBOM
```

Distinguir falha de:

```text
tooling
workflow
permissions
network
SARIF
real vulnerability
```

High/critical relevante impede PASS.

Ausência de execução não conta como zero finding.

---

# 11. CANDIDATE WORKFLOW

O workflow `candidate` deve ser executável por trigger seguro, por exemplo:

```text
workflow_dispatch
candidate-* tag
```

Deve executar, conforme aplicável:

```text
format
lint
typecheck
coverage
coverage-floor
mutation
contracts
worker
architecture
routes
complexity
cycles
dead-code
security
migrations
PostgreSQL live
RLS live
Redis real
multi-instance
Qdrant live
restore
staging/browser
OTel
fault drills
load bounded
SBOM
provenance
release evidence
verify:aaa-candidate
verify:triple-aaa
```

Usar timeout explícito e bounded.

---

# 12. MUTATION ASSURANCE

Manter mutation testing seletivo e crítico.

Escopos prioritários:

```text
authorization
session
attempt/idempotency
recovery
rate-limit
worker/outbox
diagnostic state machine
```

Não executar mutation no monorepo inteiro sem necessidade.

Requisitos:

```text
adjusted critical mutation >= 95%
critical real survivors = 0
```

Classificar surviving mutants como:

```text
REAL
EQUIVALENT
UNREACHABLE
TOOL_ARTIFACT
LOW_VALUE
```

Equivalentes exigem prova semântica.

---

# 13. COVERAGE

Manter pelo menos:

```text
Statements >= 90
Branches   >= 85
Functions  >= 90
Lines      >= 90
```

Hardening preferencial:

```text
Statements >= 91
Branches   >= 86
Functions  >= 92
Lines      >= 91
```

Adicionar apenas testes de valor real.

Priorizar:

```text
auth deny paths
session/recovery edges
worker failure
DB conflicts
Qdrant degradation
Redis reconnect
diagnostic transitions
idempotency
```

Não fazer coverage padding.

---

# 14. MAINTAINABILITY

Revisar arquivos grandes, mas não dividir por estética.

Classificar hotspots como:

```text
COMPOSITION_ROOT
REGISTRY
REPOSITORY
PAGE
GOD_MODULE
GENERATED
```

Refatorar apenas quando houver:

```text
multiple responsibilities
high branch density
poor testability
high coupling
large blast radius
```

Ratchets não devem crescer sem justificativa.

---

# 15. REDIS CANDIDATE

O candidate deve usar Redis/Valkey real como backend de rate limiting.

Não permitir fallback silencioso para memória.

Provar:

```text
API A + API B shared budget
atomicity
parallel increments
timeout
restart
reconnect
trusted proxy
spoof rejection
critical fail-closed
low-risk policy explícita
```

Gerar:

```text
release-evidence/redis-candidate-summary.json
```

---

# 16. FINAL CANDIDATE SHA

Depois de corrigir quality/security/candidate:

criar o commit técnico final.

Registrar:

```text
FINAL_CANDIDATE_SHA=<40-char-sha>
```

A partir desse momento:

# FREEZE.

Qualquer alteração técnica exige novo SHA e recertificação.

---

# 17. SAME-SHA CERTIFICATION

Executar no mesmo SHA:

```text
quality.yml
security.yml
candidate.yml
```

Todos devem terminar:

```text
success
```

Obrigatoriamente:

```text
FINAL_CANDIDATE_SHA
=
QUALITY_SHA
=
SECURITY_SHA
=
CANDIDATE_SHA
=
SBOM_SHA
=
PROVENANCE_SHA
=
EVIDENCE_SHA
```

---

# 18. SAME-SHA VERIFIER

`verify:same-sha` deve:

* usar API autenticada;
* exigir os três workflows;
* exigir conclusão `success`;
* exigir SHA exato;
* exigir run IDs válidos;
* usar polling bounded;
* falhar em pending/cancelled/skipped/failure;
* gerar `remote-ci-summary.json`.

---

# 19. REMOTE CI SUMMARY

Formato mínimo:

```json
{
  "sha": "",
  "quality": {
    "run_id": 0,
    "conclusion": "success"
  },
  "security": {
    "run_id": 0,
    "conclusion": "success"
  },
  "candidate": {
    "run_id": 0,
    "conclusion": "success"
  },
  "all_same_sha": true,
  "status": "PASS"
}
```

---

# 20. STAGING FINAL

Reexecutar no SHA final:

```text
TLS
Web
API A
API B
PostgreSQL
Redis
Worker
Qdrant
OTel Collector
```

Provar:

```text
browser→Web→API→PostgreSQL
session lifecycle
learning
attempt
diagnostic
recovery
staff access
cross-scope denial
RLS
Redis shared budget
Qdrant rebuild
worker recovery
OTel trace correlation
backup/restore
fault drills
load
```

---

# 21. TELEMETRY

Confirmar correlação:

```text
requestId
correlationId
traceId
spanId
```

Fail se logs/spans contiverem:

```text
password
cookie
token
PII
patient data
tutor data
raw sensitive prompt
sensitive AI output
```

---

# 22. LOAD / PERFORMANCE

Executar k6 fresh.

Requisitos mínimos:

```text
failed checks = 0
HTTP 5xx = 0
```

Investigar regressão material de p95.

Não otimizar sem problema real.

---

# 23. BACKUP / RESTORE

Executar fresh.

Registrar:

```text
format
sha
status
markerVerified
targetIsolated
integrity_verified
verificationDurationMs
```

Aceitar somente `format == cvg-restore-summary/v2`, `status == PASS`, SHA válida
alinhada/fresh para o candidato, `markerVerified == true`,
`targetIsolated == true`, `integrity_verified == true` e
`verificationDurationMs` inteiro seguro não negativo. Esse campo mede apenas o
intervalo técnico do resumo de restore e não representa RTO operacional.
Registrar RPO/RTO somente a partir de evidência operacional aprovada.

---

# 24. RELEASE EVIDENCE

Regenerar após freeze:

```text
release-evidence/
  manifest.json
  git-sha.txt
  sbom.cyclonedx.json
  provenance.json
  coverage-summary.json
  mutation-summary.json
  test-summary.json
  security-summary.json
  rls-live-summary.json
  redis-candidate-summary.json
  multi-instance-summary.json
  staging-summary.json
  otel-summary.json
  load-summary.json
  restore-summary.json
  remote-ci-summary.json
  migration-head.txt
  artifact-digests.json
```

---

# 25. RELEASE EVIDENCE VALIDATION

`verify:release-evidence` deve validar:

```text
presence
JSON syntax
required fields
SHA
freshness
timestamps
digests
PASS status
```

Nenhum placeholder:

```text
missing
blocked
unknown
pending
```

pode promover.

---

# 26. MACHINE-VERIFIABLE VERDICT

Criar:

```text
release-evidence/triple-aaa-verdict.json
```

O verdict deve ser calculado, nunca informado manualmente.

Campos mínimos:

```json
{
  "candidate_sha": "",
  "remote": {
    "quality": "PASS",
    "security": "PASS",
    "candidate": "PASS",
    "same_sha": true
  },
  "coverage": "PASS",
  "mutation": "PASS",
  "rls": "PASS",
  "redis_candidate": "PASS",
  "staging": "PASS",
  "supply_chain": "PASS",
  "release_evidence": "PASS",
  "independent_review": "PASS",
  "p0": 0,
  "p1": 0,
  "aaa_engineering": 0,
  "aaa_security": 0,
  "aaa_operations": 0,
  "verdict": "PASS|REVISE|FAIL",
  "readiness": "STAGING_VERIFIED"
}
```

---

# 27. TRIPLE AAA BOOLEAN

O equivalente lógico deve ser:

```text
TRIPLE_AAA_PASS =
    RemoteQualityPASS
    && RemoteSecurityPASS
    && RemoteCandidatePASS
    && SameSHAPASS
    && CoveragePASS
    && MutationPASS
    && RLSPASS
    && RedisPASS
    && StagingPASS
    && SupplyChainPASS
    && ReleaseEvidencePASS
    && IndependentReviewPASS
    && P0 == 0
    && P1 == 0
    && Engineering >= 97
    && Security >= 95
    && Operations >= 95
```

Nenhuma condição é opcional.

---

# 28. VERDICT RULE

```text
if P0/P1 or fundamental guarantee broken:
    FAIL

else if every mandatory invariant passes:
    PASS

else:
    REVISE
```

---

# 29. FINAL VERIFIER

Criar ou fortalecer:

```text
pnpm verify:triple-aaa
```

Deve:

1. carregar evidence;
2. validar schemas;
3. validar SHA;
4. validar freshness;
5. validar digests;
6. calcular invariantes;
7. calcular scores;
8. calcular verdict;
9. calcular readiness;
10. escrever `triple-aaa-verdict.json`.

Exit codes:

```text
PASS   → 0
REVISE → != 0
FAIL   → != 0
```

---

# 30. SELF-TEST DO VERIFIER

Criar testes negativos para:

```text
coverage branches = 84.99
mutation = 89.99
real survivor = 1
P1 = 1
quality SHA mismatch
security pending
Redis backend memory
RLS pool isolation false
SBOM missing
digest mismatch
staging unknown
independent review REVISE
engineering = 96
operations = 94
```

Todos devem impedir PASS.

Criar também fixture sintética positiva, claramente marcada como:

```text
synthetic_verifier_test = true
```

Ela testa o verifier, não certifica o produto.

---

# 31. ANTI-FORGERY

Em modo real, rejeitar evidence marcada como:

```text
fixture
synthetic
example
mock
self-test
```

---

# 32. INDEPENDENT REVIEW

Depois de remote CI verde e evidence fresh:

usar reviewer fresh.

Ele deve tentar reprovar:

```text
auth bypass
BOLA
IDOR
scope escalation
RLS bypass
pool leak
session replay/fixation
recovery replay
CSRF bypass
XFF spoof
rate-limit bypass
Redis outage bypass
SQL injection
header/log injection
SSRF
Qdrant poisoning
AI malformed output
worker duplicate side effect
stale evidence
same-SHA bypass
artifact substitution
coverage gaming
mutation gaming
```

Resultado:

```text
PASS
REVISE
FAIL
```

---

# 33. FINAL AUDIT V7

Criar:

```text
docs/audits/state-of-art-final-audit-v7.md
docs/audits/state-of-art-final-audit-v7.json
```

O JSON é a fonte de automação.

O Markdown é explicação humana.

---

# 34. FINAL SCORECARD

Atualizar:

```text
docs/quality/scorecard.md
```

para o candidate SHA.

Calcular sem inflação:

```text
AAA Engineering >= 97
AAA Security >= 95
AAA Operations >= 95
```

Não arredondar para cima.

---

# 35. P2/P3

P2 pode permanecer somente se:

* não for bypass;
* não comprometer integridade;
* não invalidar evidence;
* não quebrar thresholds;
* tiver owner;
* tiver mitigação;
* tiver plano.

P3 pode permanecer quando realmente baixo risco.

---

# 36. CONSISTENCY GATE

Executar:

```text
pnpm verify:audit-consistency
```

Garantir consistência entre:

```text
Audit JSON
Audit Markdown
Scorecard
Runtime State
Release Evidence
```

---

# 37. PRODUCTION STATUS

Triplo AAA técnico não significa produção verificada.

Classificações separadas:

```text
TECHNICALLY VERIFIED
STAGING VERIFIED
PRODUCTION CANDIDATE
PRODUCTION VERIFIED
```

Mesmo com AAA PASS, usar:

```text
STAGING VERIFIED
```

até existir evidência real de produção.

---

# 38. PRODUCTION VERIFIED EXIGE

```text
real deploy
real secrets
real ACLs
real telemetry
real backup
real restore
real traffic
real SLO measurement
required human approvals
```

Sem isso, não declarar.

---

# 39. CLINICAL SAFETY

Nenhuma certificação técnica autoriza:

* publicação clínica;
* mudança de gabarito;
* aprovação automática;
* claim de competência;
* decisão clínica por IA.

---

# 40. TEST DATA

Usar somente:

```text
synthetic data
disposable databases
test credentials
test fixtures
```

---

# 41. NO OVERENGINEERING

Não adicionar:

```text
Kubernetes
Kafka
service mesh
microservices
CQRS
event sourcing
new database
```

sem necessidade comprovada.

---

# 42. ARQUITETURA ALVO

Preservar:

```text
Web
 ↓
API xN
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
OTel Collector
```

---

# 43. PRIORIDADE

Sempre:

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

# 44. COMMAND MATRIX FINAL

Executar conforme aplicável:

```bash
pnpm format:check
pnpm lint
pnpm typecheck

pnpm test:coverage
pnpm verify:coverage-floor

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

pnpm test:rls:live
pnpm test:ratelimit:live

pnpm mutation:authorization
pnpm mutation:critical
pnpm verify:mutation-closure

pnpm staging:verify
pnpm test:load

pnpm verify:release-evidence
pnpm verify:audit-consistency

pnpm verify
pnpm build
pnpm test:e2e

pnpm audit --audit-level=high

pnpm verify:same-sha
pnpm verify:aaa-candidate
pnpm verify:triple-aaa

git diff --check
```

---

# 45. FINAL OUTPUT

Ao terminar, retornar exatamente:

```text
FINAL_CANDIDATE_SHA =

Remote Quality =
Remote Security =
Remote Candidate =
Same-SHA =

Coverage =
Critical Mutation =
RLS =
Redis Candidate =
Staging =
Supply Chain =
Release Evidence =
Independent Review =

P0 =
P1 =
P2 =

AAA Engineering =
AAA Security =
AAA Operations =

Triple AAA Verdict =
Readiness =
```

---

# 46. SUCCESS STATE

O sucesso final é:

```text
Remote Quality = PASS
Remote Security = PASS
Remote Candidate = PASS
Same-SHA = PASS

Coverage = PASS
Critical Mutation = PASS
RLS = PASS
Redis Candidate = PASS
Staging = PASS
Supply Chain = PASS
Release Evidence = PASS
Independent Review = PASS

P0 = 0
P1 = 0

AAA Engineering >= 97
AAA Security >= 95
AAA Operations >= 95

Triple AAA Verdict = TRIPLE AAA — PASS
Readiness = STAGING VERIFIED
```

---

# 47. STOP CONDITION

Quando:

```text
pnpm verify:triple-aaa
```

retornar:

```text
exit code = 0
```

e:

```json
{
  "verdict": "PASS",
  "readiness": "STAGING_VERIFIED"
}
```

# PARE.

Não buscar score 100.

Não abrir nova fase técnica.

Não refatorar por estética.

---

# 48. FINAL PRINCIPLE

A certificação só vale quando esta cadeia estiver comprovada:

```text
Requirements
→ Architecture
→ Implementation
→ Tests
→ Live/Staging Evidence
→ Security Verification
→ Remote CI
→ Same-SHA
→ Immutable Evidence
→ Independent Review
→ Mechanical Verdict
```

Se qualquer elo crítico falhar:

# TRIPLO AAA — REVISE

Se todos passarem:

# STATE OF ART — VERIFIED

# TRIPLO AAA — PASS

# STAGING VERIFIED
