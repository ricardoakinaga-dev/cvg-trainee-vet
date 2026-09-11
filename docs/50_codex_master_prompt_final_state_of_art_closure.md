# CODEX MASTER PROMPT — FINAL STATE OF ART / TRIPLO AAA CLOSURE (cópia arquivada)

> Cópia verbatim do prompt fornecido pelo usuário em 2026-09-11, arquivada em `docs/` conforme solicitado ("salve uma copia do seguinte prompt na pasta docs em seguida implemente todas as melhorias do prompt").
> Arquivo: `docs/50_codex_master_prompt_final_state_of_art_closure.md`.
> Implementação registrada em `docs/99_runtime_state.md`, `docs/20_master_execution_log.md`, `docs/30_backlog_master.md`, `docs/modernization/0005_final_aaa_closure_baseline.md` e auditorias em `docs/audits/` (v5).

---

# CODEX MASTER PROMPT

## CVG TRAINEE VET — FINAL STATE OF ART / TRIPLO AAA CLOSURE

Repositório alvo:

`https://github.com/ricardoakinaga-dev/cvg-trainee-vet`

Branch canônica:

`main`

Objetivo final:

# STATE OF ART / TRIPLO AAA — PASS

Esta é uma execução de **certificação e fechamento final**, não uma nova modernização ampla.

O sistema já está tecnicamente muito avançado e possui:

* modular monolith;
* arquitetura executável;
* Route Registry canônico;
* API modularizada;
* RLS live;
* Redis real multi-instância;
* trusted proxy;
* auth/authz server-side;
* negative security tests;
* OpenTelemetry;
* collector;
* traces;
* retries/timeouts;
* graceful shutdown;
* worker resilience;
* fault injection;
* staging reproduzível;
* TLS;
* browser→API→PostgreSQL real;
* Qdrant rebuild;
* backup/restore;
* load testing;
* CodeQL;
* OSV;
* SBOM;
* provenance;
* SHA-pinned Actions;
* candidate workflow;
* release evidence;
* coverage >= 90/85/90/90;
* mutation adjusted = 100% no escopo crítico atual;
* P0 = 0;
* P1 = 0.

Preserve tudo isso.

---

# 1. MISSÃO

Sua missão é eliminar os últimos riscos residuais de assurance e produzir um único candidate SHA capaz de sustentar, com evidência machine-readable e auditoria adversarial:

```text
AAA Engineering >= 97
AAA Security    >= 95
AAA Operations  >= 95
P0 = 0
P1 = 0
```

Se qualquer critério falhar:

`TRIPLE AAA — REVISE`

Não reduza a barra.

---

# 2. ORDEM DE EXECUÇÃO

Execute nesta ordem:

```text
AAA-FINAL-001 — Fresh baseline
AAA-FINAL-002 — Expand critical mutation assurance
AAA-FINAL-003 — Coverage margin hardening
AAA-FINAL-004 — Residual complexity review
AAA-FINAL-005 — Candidate Redis/runtime closure
AAA-FINAL-006 — Remote same-SHA certification
AAA-FINAL-007 — Fresh candidate evidence bundle
AAA-FINAL-008 — Independent adversarial audit v5
AAA-FINAL-009 — Final promotion decision
```

Não pare apenas no planejamento.

---

# 3. PRIMEIRO PASSO

Antes de modificar código:

Leia:

```text
AGENTS.md
docs/99_runtime_state.md
docs/20_master_execution_log.md
docs/30_backlog_master.md
docs/audits/state-of-art-final-audit-v4.md
docs/audits/state-of-art-final-audit-v4.json
docs/quality/scorecard.md
docs/quality/mutation-authorization.md
architecture-boundaries.json
.github/workflows/quality.yml
.github/workflows/security.yml
.github/workflows/candidate.yml
```

Leia também:

* `verify:same-sha`;
* `verify:aaa-candidate`;
* `verify:release-evidence`;
* mutation closure scripts;
* staging scripts;
* Redis candidate scripts.

Depois execute todos os gates locais.

---

# 4. BASELINE FRESH

Criar:

`docs/modernization/0005_final_aaa_closure_baseline.md`

Registrar:

```text
HEAD
coverage
mutation raw
mutation adjusted
P0/P1/P2
same-SHA status
quality status
security status
candidate status
Redis candidate
RLS live
staging
release evidence
```

Não reutilizar números antigos.

---

# 5. AAA-FINAL-002 — EXPANDIR MUTATION ASSURANCE

Hoje mutation está muito forte em `authorization.ts`, mas ainda concentrada.

Expandir seletivamente para componentes críticos.

Prioridade:

```text
session lifecycle
rate-limit policy
idempotency
recovery token lifecycle
state transition guards
attempt lifecycle
diagnostic lifecycle
```

Não rodar mutation no monorepo inteiro.

---

# 6. CLASSIFICAÇÃO DE MUTANTS

Para cada surviving mutant:

```text
REAL
EQUIVALENT
UNREACHABLE
TOOL_ARTIFACT
LOW_VALUE
```

Qualquer classificação diferente de REAL exige justificativa reproduzível.

---

# 7. MUTANTS REAIS

Todo mutant REAL de caminho crítico deve ser morto.

Adicionar apenas testes comportamentais.

Não criar assertions artificiais para satisfazer Stryker.

---

# 8. MUTATION SCORE

Gerar:

```text
raw score
adjusted critical score
real survivors
equivalent mutants
```

Meta:

```text
adjusted critical score >= 90%
critical real survivors = 0
```

Ideal:

```text
adjusted >= 95%
```

---

# 9. MUTATION MACHINE-READABLE

Atualizar:

`reports/mutation-summary.json`

Exemplo:

```json
{
  "scope": [],
  "raw_score": 0,
  "adjusted_score": 0,
  "critical_real_survivors": 0,
  "equivalent_count": 0,
  "status": "PASS"
}
```

---

# 10. AAA-FINAL-003 — COVERAGE MARGIN HARDENING

Coverage atual apenas encosta no branch floor.

Não alterar a meta.

Aumentar margem de segurança.

Meta recomendada:

```text
Statements >= 91
Branches   >= 86
Functions  >= 92
Lines      >= 91
```

Essa é uma meta de hardening, não uma redefinição do gate original.

---

# 11. PRIORIZAR BRANCHES REAIS

Buscar gaps em:

```text
authorization deny paths
session expiry
recovery edge cases
Redis failure paths
worker replay
Qdrant degradation
API generic errors
DB conflicts
idempotency
```

Não cobrir código trivial apenas para subir número.

---

# 12. TEST QUALITY

Todo novo teste precisa responder:

```text
Qual risco ele reduz?
Qual branch real ele prova?
Qual comportamento observável ele valida?
```

---

# 13. AAA-FINAL-004 — RESIDUAL COMPLEXITY REVIEW

Revisar hotspots restantes:

* `http.ts`;
* dispatch;
* main runtime composition;
* repositories grandes;
* web pages grandes.

Não dividir por estética.

---

# 14. REFACTOR SOMENTE SE HOUVER GANHO

Só extrair código se houver:

```text
multiple responsibilities
high branch density
large blast radius
poor testability
high coupling
```

Caso contrário, preservar.

---

# 15. `http.ts`

Se continuar aproximadamente como composition/dispatch root e estiver protegido por ratchet:

pode permanecer.

Mas reduzir funções excessivamente longas quando isso melhorar clareza e testabilidade.

---

# 16. FUNCTION BUDGET

Objetivo:

```text
warn > 80 linhas
fail > 150
```

Ratchets históricos devem diminuir, nunca aumentar, salvo justificativa explícita.

---

# 17. AAA-FINAL-005 — REDIS / CANDIDATE RUNTIME

Redis já possui prova real.

Agora garantir que `candidate.yml` use Redis/Valkey como backend efetivo do rate limiter.

Não permitir fallback silencioso para memória.

---

# 18. CANDIDATE STACK

Candidate deve subir:

```text
Web
API A
API B
Worker
PostgreSQL
Redis/Valkey
Qdrant
OTel Collector
TLS
```

---

# 19. REDIS CANDIDATE TESTS

Executar:

```text
shared budget A/B
parallel increments
timeout
restart
reconnect
trusted proxy
spoof rejection
fail-open low-risk
fail-closed critical
```

---

# 20. REDIS BACKEND EVIDENCE

Gerar:

`release-evidence/redis-candidate-summary.json`

com:

```text
backend
version
api_instances
shared_budget
atomicity
restart
timeout
proxy
fail_policy
status
```

---

# 21. RATE-LIMIT METRICS

Confirmar métricas de:

```text
store requests
store failures
latency
429 rejections
```

Sem labels de alta cardinalidade.

---

# 22. AAA-FINAL-006 — REMOTE SAME-SHA CERTIFICATION

Este é o maior gate de promoção.

Escolha um commit técnico final.

Depois congele o SHA.

---

# 23. FINAL CANDIDATE SHA

Registrar:

```text
FINAL_CANDIDATE_SHA=<full sha>
```

A partir desse momento:

nenhuma alteração de runtime/código.

Se qualquer arquivo técnico mudar:

novo candidate SHA
+
nova certificação completa.

---

# 24. REMOTE WORKFLOWS

No mesmo SHA executar:

```text
quality
security
candidate
```

Todos precisam terminar:

```text
conclusion = success
```

---

# 25. NÃO USAR API ANÔNIMA

Em CI usar:

```text
GITHUB_TOKEN
```

ou credencial GitHub autorizada.

Same-SHA não pode depender de API anônima sujeita a rate limit.

---

# 26. SAME-SHA MUST VERIFY

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

# 27. WAIT POLICY

Polling remoto precisa ser:

```text
bounded
timeout
retry
backoff
fail-closed
```

Nunca infinito.

---

# 28. REMOTE CI SUMMARY

Gerar:

`release-evidence/remote-ci-summary.json`

com:

```json
{
  "sha": "...",
  "quality": {},
  "security": {},
  "candidate": {},
  "all_same_sha": true,
  "status": "PASS"
}
```

Incluir run IDs e timestamps.

---

# 29. CANDIDATE WORKFLOW OBRIGATÓRIO

Candidate precisa comprovar:

```text
format
lint
typecheck
coverage
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
Redis candidate
Qdrant live
restore
staging browser
OTel collector
fault drills
load bounded
audit
SBOM
provenance
evidence
AAA gate
```

---

# 30. CANDIDATE GATE

`verify:aaa-candidate` deve ler apenas dados machine-readable.

Nada de parsear Markdown.

---

# 31. AAA GATE CONDITIONS

Falhar se:

```text
coverage below floor
mutation adjusted < target
real critical mutant > 0
RLS != PASS
Redis candidate != PASS
same-SHA != PASS
staging != PASS
security high/critical > 0
P0 > 0
P1 > 0
release evidence invalid
```

---

# 32. AAA-FINAL-007 — FRESH EVIDENCE BUNDLE

Toda evidence deve pertencer ao mesmo SHA final.

Regenerar tudo após freeze.

---

# 33. FINAL EVIDENCE BUNDLE

Deve conter:

```text
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

# 34. FRESHNESS RULE

Evidence deve ser:

```text
same SHA
ou
ancestor sem runtime diff
```

Mas a promoção final deve preferir tudo regenerado exatamente no SHA final.

---

# 35. STRICT VALIDATOR

`verify:release-evidence` deve validar:

```text
file presence
JSON syntax
schema/required fields
SHA
timestamps
digests
PASS state
freshness
```

---

# 36. SHA256

Todos os artefatos relevantes devem ter digest SHA-256.

---

# 37. SBOM

Confirmar:

```text
valid CycloneDX
non-empty components
project metadata
correct SHA association
```

---

# 38. PROVENANCE

Registrar:

```text
git SHA
runner
Node
pnpm
lockfile hash
dependency manifest hashes
migration head
build timestamp
```

---

# 39. SUPPLY CHAIN

Executar:

```text
CodeQL
OSV
dependency review
pnpm audit
secret scan
```

High/critical relevante:

`AAA FAIL`.

---

# 40. AAA-FINAL-008 — FINAL STAGING REVALIDATION

Depois de qualquer mudança técnica, rodar a stack completa novamente.

---

# 41. STAGING STACK

```text
TLS
Web
API x2
PostgreSQL
Redis
Worker
Qdrant
OTel
```

---

# 42. BROWSER JOURNEY

Provar:

```text
browser
→ web
→ API
→ PostgreSQL
```

para:

```text
session
learning
attempt
diagnostic
recovery
staff access
```

---

# 43. AUTHORIZATION JOURNEY

Testar:

```text
participant A cannot read B
staff A cannot cross scope
anonymous denied
revoked session denied
```

---

# 44. SESSION TLS

Verificar:

```text
__Host-
Secure
HttpOnly
SameSite
Path=/
```

---

# 45. RLS FRESH

Executar novamente matriz completa no final SHA.

---

# 46. REDIS FRESH

Executar novamente multi-instance/restart no final SHA.

---

# 47. OTEL FRESH

Provar spans recebidos pelo collector.

---

# 48. TRACE CORRELATION

Uma jornada deve demonstrar:

```text
requestId
correlationId
traceId
spanId
```

---

# 49. REDACTION

Não aceitar telemetry contendo:

```text
cookie
token
PII
patient data
tutor data
password
raw AI prompt
sensitive output
```

---

# 50. QDRANT LOSS

Apagar coleção e reconstruir a partir do PostgreSQL.

---

# 51. WORKER FAILURE

Provar:

```text
crash
lease
replay
duplicate
recovery
```

---

# 52. BACKUP/RESTORE

Executar fresh.

Registrar:

```text
RTO
integrity
row/invariant checks
```

---

# 53. FAILURE DRILLS

Mínimo:

```text
Redis outage
Postgres restart
Qdrant outage
worker restart
OTel outage
```

---

# 54. LOAD

Executar k6 fresh.

Comparar com baseline.

---

# 55. REGRESSION RULE

Investigar se:

```text
5xx > 0
check failure > 0
p95 degrades materially
```

Não exigir otimização sem regressão real.

---

# 56. AAA-FINAL-008 — ADVERSARIAL AUDIT V5

Após remote candidate verde:

executar auditoria independente fresh.

---

# 57. AUDITOR DEVE TENTAR REPROVAR

Testar:

```text
auth bypass
BOLA
IDOR
scope escalation
RLS bypass
pool context leak
session fixation
session replay
recovery abuse
CSRF bypass
XFF spoof
rate-limit bypass
Redis outage bypass
SQL injection
header injection
log injection
SSRF
Qdrant poisoning
AI malformed output
prompt injection boundary
artifact substitution
stale evidence
same-SHA mismatch
coverage gaming
mutation gaming
```

---

# 58. INDEPENDENT REVIEW

Não usar apenas o mesmo agente que implementou como fonte final de verdade.

Se o ambiente permitir, usar um reviewer fresh.

Reviewer pode retornar:

```text
PASS
REVISE
FAIL
```

---

# 59. TEST QUALITY AUDIT

Procurar:

```text
tests only testing mocks
coverage padding
mutation padding
fragile sleeps
trivial assertions
implementation-coupled tests
```

---

# 60. MUTATION AUDIT

Revisar as classificações de equivalência.

Se qualquer equivalência for duvidosa:

reclassificar como REAL.

---

# 61. ROUTE AUDIT

Todas as rotas devem ter:

```text
registry
auth classification
capability
risk
telemetry
positive test
negative test
```

---

# 62. DATABASE AUDIT

Confirmar:

```text
RLS
FORCE RLS
owners
grants
no SUPERUSER
no BYPASSRLS
service roles
pool isolation
```

---

# 63. CI AUDIT

Confirmar que workflows realmente executaram o código do final SHA.

---

# 64. RELEASE AUDIT

Confirmar que artifacts não foram substituídos ou gerados de SHA diferente.

---

# 65. MACHINE-READABLE FINAL AUDIT

Criar:

`docs/audits/state-of-art-final-audit-v5.json`

Com:

```json
{
  "sha": "",
  "p0": 0,
  "p1": 0,
  "engineering": 0,
  "security": 0,
  "operations": 0,
  "coverage": "PASS",
  "mutation": "PASS",
  "same_sha": "PASS",
  "redis": "PASS",
  "rls": "PASS",
  "staging": "PASS",
  "verdict": ""
}
```

---

# 66. HUMAN AUDIT

Criar:

`docs/audits/state-of-art-final-audit-v5.md`

---

# 67. AUDIT V5 STRUCTURE

1. Executive Summary
2. Final SHA
3. Evidence Scope
4. Architecture
5. Modularization
6. API
7. Domain/Application
8. Contracts
9. Persistence
10. RLS
11. Authentication
12. Authorization
13. Sessions
14. Rate Limit
15. Redis Candidate
16. Security
17. Supply Chain
18. Testing
19. Coverage
20. Mutation Assurance
21. CI
22. Same-SHA
23. Staging
24. OTel
25. Resilience
26. Worker
27. Qdrant
28. AI Governance
29. Fault Drills
30. Load
31. Backup/Restore
32. DR
33. Accessibility
34. Maintainability
35. Release Engineering
36. Residual Risk
37. Final Scores
38. Triple AAA Verdict

---

# 68. SCORECARD

Atualizar:

`docs/quality/scorecard.md`

para o final SHA.

---

# 69. AAA ENGINEERING

Meta:

```text
>=97
```

Avaliar:

```text
architecture
modularity
domain
application
contracts
testing
coverage
mutation
maintainability
CI
traceability
```

---

# 70. AAA SECURITY

Meta:

```text
>=95
```

Avaliar:

```text
auth
authz
RLS
session
rate limit
negative tests
security testing
supply chain
secrets
audit
```

---

# 71. AAA OPERATIONS

Meta:

```text
>=95
```

Avaliar:

```text
observability
OTel
metrics
timeouts
retries
worker
multi-instance
Redis
backup
restore
DR
fault drills
load
same-SHA
release evidence
```

---

# 72. NÃO INFLAR SCORE

Scores precisam ser sustentados por evidência.

Não usar 100 sem evidência extraordinária.

---

# 73. FINAL PASS RULE

Somente:

# TRIPLE AAA — PASS

se:

```text
Engineering >=97
Security >=95
Operations >=95
P0 = 0
P1 = 0
Coverage = PASS
Mutation = PASS
RLS = PASS
Redis = PASS
Same-SHA = PASS
Staging = PASS
Security remote = PASS
Evidence = PASS
Independent review = PASS
```

---

# 74. SE SAME-SHA FALHAR

Resultado obrigatório:

```text
TRIPLE AAA — REVISE
```

---

# 75. SE QUALQUER P0/P1 SURGIR

Resultado obrigatório:

```text
TRIPLE AAA — FAIL
```

ou REVISE conforme severidade e política vigente, mas nunca PASS.

---

# 76. PRODUCTION STATUS SEPARADO

Triple AAA técnico não implica produção validada.

Use separadamente:

```text
TECHNICALLY VERIFIED
STAGING VERIFIED
PRODUCTION CANDIDATE
PRODUCTION VERIFIED
```

---

# 77. PRODUCTION VERIFIED EXIGE

```text
real deployment
real secrets
real ACLs
real external telemetry
real backup
real restore
real traffic
required approvals
```

---

# 78. AAA-001

Se decisão humana continuar pendente:

não inventar aprovação.

---

# 79. CLINICAL SAFETY

Nenhuma ação desta execução autoriza:

```text
clinical publication
answer-key change
clinical competency claim
automatic clinical approval
AI clinical decision
```

---

# 80. TEST DATA

Somente dados sintéticos.

---

# 81. NO BIG BANG

Mudanças pequenas, verificadas imediatamente.

---

# 82. COMMITS

Exemplos:

```text
test(mutation): expand critical assurance beyond authorization
test(coverage): harden branch margin above aaa floor
refactor(api): reduce residual high-risk dispatch complexity
test(redis): certify durable candidate limiter
ci(candidate): close authenticated same-sha promotion
test(staging): regenerate final candidate evidence
docs(audit): publish final aaa audit v5
```

---

# 83. SHA FREEZE RULE

Após o commit técnico final:

freeze.

Qualquer alteração técnica reinicia certificação.

---

# 84. DOCUMENT-ONLY COMMITS

Se necessário após freeze, usar regra de evidence freshness já existente:

```text
ancestor
+
no runtime diff
```

Mas não usar isso para esconder alteração funcional.

---

# 85. FINAL COMMAND SET

Executar, conforme aplicável:

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
pnpm staging:verify
pnpm test:load
pnpm verify:release-evidence
pnpm verify
pnpm build
pnpm test:e2e
pnpm audit --audit-level=high
pnpm verify:same-sha
pnpm verify:aaa-candidate
git diff --check
```

Adicionar novos mutation commands críticos se criados.

---

# 86. RUNTIME CANÔNICO

Executar certificação final em:

```text
Node 22.x
pnpm 10.33.x
```

conforme contrato CI.

---

# 87. RELATÓRIO POR FASE

Registrar:

```text
TASK
STATUS
SHA
FILES
TESTS
COVERAGE
MUTATION
SECURITY
CI
EVIDENCE
FINDINGS CLOSED
NEW FINDINGS
BLOCKERS
NEXT
```

---

# 88. NÃO PARAR EM ROADMAP

Continue até concluir todo trabalho tecnicamente possível.

---

# 89. NÃO CRIAR INFRA DESNECESSÁRIA

Não adicionar:

```text
Kubernetes
Kafka
service mesh
microservices
event sourcing
CQRS
new databases
```

sem necessidade comprovada.

---

# 90. ARQUITETURA ALVO

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

# 91. PRIORIDADE

```text
Correctness
>
Security
>
Data integrity
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

# 92. FINAL OUTPUT

Ao final, informar:

```text
FINAL_CANDIDATE_SHA =
AAA Engineering =
AAA Security =
AAA Operations =
P0 =
P1 =
Coverage =
Adjusted Critical Mutation =
RLS =
Redis Candidate =
Remote Same-SHA =
Staging =
Supply Chain =
Independent Audit =
```

---

# 93. FINAL VERDICT

Escolher somente:

```text
TRIPLE AAA — PASS
TRIPLE AAA — REVISE
TRIPLE AAA — FAIL
```

---

# 94. READINESS

Também informar:

```text
TECHNICALLY VERIFIED
STAGING VERIFIED
PRODUCTION CANDIDATE
ou
PRODUCTION VERIFIED
```

---

# 95. DEFINITION OF DONE

Esta fase só fecha quando:

```text
mutation assurance ampliada e PASS
coverage com margem segura
same-SHA remoto PASS
quality remote PASS
security remote PASS
candidate remote PASS
Redis candidate PASS
RLS live PASS
staging fresh PASS
release evidence fresh PASS
audit adversarial PASS
P0 = 0
P1 = 0
Engineering >=97
Security >=95
Operations >=95
```

---

# 96. NÃO CONFUNDIR QUANTIDADE COM QUALIDADE

Não busque mais testes apenas para aumentar números.

Não busque mais código.

Busque redução de risco e aumento de evidência.

---

# 97. AUDIT THE AUDITOR

Verifique também se:

```text
coverage gate pode ser enganado
mutation report pode ser falsificado
same-SHA pode aceitar artefato stale
release evidence pode aceitar placeholder
scorecard pode divergir do JSON
```

Esses caminhos também são parte da superfície de assurance.

---

# 98. PROMOTION MUST FAIL CLOSED

Qualquer ambiguidade de evidência:

```text
REVISE
```

Nunca inferir PASS.

---

# 99. PRIMEIRA TASK

Comece agora por:

# AAA-FINAL-001 — Fresh Baseline

Depois:

# AAA-FINAL-002 — Expand Critical Mutation Assurance

Não reabra a arquitetura geral.

---

# 100. OBJETIVO FINAL

O sucesso desta execução não é “melhorar bastante”.

O sucesso é criar um **candidate SHA congelado, reproduzível, auditável, same-SHA verified e adversarialmente revisado** capaz de sustentar tecnicamente:

# STATE OF ART / TRIPLO AAA — PASS

Se a evidência não fechar, preserve `REVISE`.

Não reduza a barra. . Me entregue um programa State of Art, Triplo AAA de qualidade.
