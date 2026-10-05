# CODEX MASTER PROMPT (cópia arquivada)

## CVG TRAINEE VET — FINAL STATE OF ART / TRIPLO AAA CERTIFICATION
## (Matriz normativa G01–G73 + veredicto mecânico)

Repositório:

`https://github.com/ricardoakinaga-dev/cvg-trainee-vet`

Branch canônica:

`main`

Objetivo:

# STATE OF ART / TRIPLO AAA — PASS

Esta é a fase final de certificação.

Não iniciar nova modernização ampla.

Não reabrir arquitetura estável.

Não adicionar infraestrutura sem necessidade comprovada.

A missão é fechar os últimos gaps de CI remoto, same-SHA, assurance, evidência e certificação final.

---

# 1. PRINCÍPIOS

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

Preservar a arquitetura:

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

Não adicionar sem necessidade comprovada:

```text
Kubernetes
Kafka
service mesh
microservices
CQRS
event sourcing
new database
```

---

# 2. FLUXO OBRIGATÓRIO

```text
Fresh Baseline
→ Diagnose
→ Reproduce
→ Fix
→ Local Verification
→ Remote Verification
→ Freeze Candidate SHA
→ Regenerate Evidence
→ Independent Review
→ Mechanical Verdict
```

Nenhum passo posterior substitui um anterior.

---

# 3. PRIMEIRA AÇÃO

Antes de modificar código, ler:

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

Também revisar:

```text
verify:same-sha
verify:aaa-candidate
verify:triple-aaa
verify:release-evidence
verify:audit-consistency
coverage gates
mutation closure
Redis candidate verification
staging verification
```

Executar baseline fresh em:

```text
Node 22.x
pnpm 10.33.x
```

Criar:

```text
docs/modernization/0007_final_aaa_certification_baseline.md
```

---

# 4. MATRIZ ÚNICA DE CERTIFICAÇÃO

Esta matriz é a **única definição normativa de promoção**.

CI, audit JSON, scorecard, release evidence e `verify:triple-aaa` devem derivar seus critérios dela.

Nenhum gate paralelo pode definir thresholds diferentes.

| ID  | Domínio         | Gate obrigatório               | Evidência machine-readable       | Condição de PASS                               | Falha implica                   |
| --- | --------------- | ------------------------------ | -------------------------------- | ---------------------------------------------- | ------------------------------- |
| G01 | Source          | Candidate SHA                  | `git-sha.txt` / manifest         | SHA válido de 40 chars e congelado             | REVISE                          |
| G02 | Runtime         | Toolchain                      | provenance                       | Node 22.x + pnpm 10.33.x                       | REVISE                          |
| G03 | Quality         | Format                         | test/CI summary                  | PASS                                           | REVISE                          |
| G04 | Quality         | Lint                           | test/CI summary                  | PASS                                           | REVISE                          |
| G05 | Quality         | Typecheck                      | test/CI summary                  | PASS                                           | REVISE                          |
| G06 | Coverage        | Statements                     | `coverage-summary.json`          | >= 90%                                         | REVISE                          |
| G07 | Coverage        | Branches                       | `coverage-summary.json`          | >= 85%                                         | REVISE                          |
| G08 | Coverage        | Functions                      | `coverage-summary.json`          | >= 90%                                         | REVISE                          |
| G09 | Coverage        | Lines                          | `coverage-summary.json`          | >= 90%                                         | REVISE                          |
| G10 | Mutation        | Adjusted critical score        | `mutation-summary.json`          | >= 95%                                         | REVISE                          |
| G11 | Mutation        | Real critical survivors        | `mutation-summary.json`          | 0                                              | REVISE                          |
| G12 | Contracts       | Contract tests                 | test summary                     | PASS                                           | REVISE                          |
| G13 | Worker          | Worker suite                   | test summary                     | PASS                                           | REVISE                          |
| G14 | Architecture    | Boundaries                     | architecture summary             | PASS                                           | REVISE                          |
| G15 | Architecture    | Route registry                 | route summary                    | PASS                                           | REVISE                          |
| G16 | Architecture    | Dependency cycles              | cycle summary                    | 0 forbidden cycles                             | REVISE                          |
| G17 | Maintainability | Complexity budgets             | complexity summary               | PASS / accepted ratchets only                  | REVISE                          |
| G18 | Maintainability | Dead code                      | dead-code summary                | PASS                                           | REVISE                          |
| G19 | Persistence     | Migration governance           | migration summary                | PASS                                           | REVISE                          |
| G20 | Persistence     | PostgreSQL live                | live summary                     | PASS                                           | REVISE                          |
| G21 | Security        | RLS live                       | `rls-live-summary.json`          | PASS                                           | REVISE                          |
| G22 | Security        | Cross-scope read denial        | RLS summary                      | true                                           | FAIL if exploitable             |
| G23 | Security        | Cross-scope write denial       | RLS summary                      | true                                           | FAIL if exploitable             |
| G24 | Security        | Pool context isolation         | RLS summary                      | true                                           | FAIL if exploitable             |
| G25 | Security        | No BYPASSRLS/SUPERUSER         | RLS summary                      | true                                           | FAIL if exploitable             |
| G26 | Security        | Authentication                 | security summary                 | PASS                                           | FAIL on bypass                  |
| G27 | Security        | Authorization                  | security summary                 | PASS                                           | FAIL on bypass                  |
| G28 | Security        | Session/recovery               | security summary                 | PASS                                           | FAIL on critical weakness       |
| G29 | Security        | CSRF                           | security summary                 | PASS                                           | FAIL on critical weakness (ver nota) |
| G30 | Redis           | Real backend                   | `redis-candidate-summary.json`   | redis/valkey                                   | REVISE                          |
| G31 | Redis           | Multi-instance shared budget   | Redis summary                    | PASS                                           | REVISE                          |
| G32 | Redis           | Atomicity                      | Redis summary                    | PASS                                           | REVISE                          |
| G33 | Redis           | Restart/reconnect              | Redis summary                    | PASS                                           | REVISE                          |
| G34 | Redis           | Critical fail-closed           | Redis summary                    | PASS                                           | FAIL if bypass                  |
| G35 | Redis           | Trusted proxy/spoof resistance | Redis summary                    | PASS                                           | FAIL if bypass                  |
| G36 | Qdrant          | Live integration               | staging/live summary             | PASS                                           | REVISE                          |
| G37 | Qdrant          | Rebuild from PostgreSQL        | staging summary                  | PASS                                           | REVISE                          |
| G38 | AI              | Governance boundary            | security/audit summary           | PASS                                           | FAIL on critical authority leak |
| G39 | Observability   | OTel collector                 | `otel-summary.json`              | PASS                                           | REVISE                          |
| G40 | Observability   | Trace correlation              | OTel summary                     | PASS                                           | REVISE                          |
| G41 | Observability   | Redaction                      | OTel/security summary            | PASS                                           | FAIL on sensitive leakage       |
| G42 | Resilience      | Retry/timeout                  | resilience summary               | PASS                                           | REVISE                          |
| G43 | Resilience      | Graceful shutdown              | resilience summary               | PASS                                           | REVISE                          |
| G44 | Resilience      | Fault drills                   | staging summary                  | PASS                                           | REVISE                          |
| G45 | Backup          | Backup/restore                 | `restore-summary.json`           | v2; PASS; same-SHA; markerVerified/targetIsolated/integrity_verified=true; verificationDurationMs safe integer ≥0 (partial, not operational RTO) | REVISE |
| G46 | Performance     | Load checks                    | `load-summary.json`              | failed checks = 0                              | REVISE                          |
| G47 | Performance     | Server errors                  | load summary                     | HTTP 5xx = 0                                   | REVISE                          |
| G48 | Staging         | Full stack                     | `staging-summary.json`           | PASS                                           | REVISE                          |
| G49 | Staging         | Browser journey                | staging summary                  | PASS                                           | REVISE                          |
| G50 | Supply Chain    | CodeQL                         | `security-summary.json` / remote | PASS                                           | REVISE                          |
| G51 | Supply Chain    | Supply Chain OSV               | security summary / remote        | PASS                                           | REVISE                          |
| G52 | Supply Chain    | Dependency review/control      | security summary                 | PASS ou N/A justificado                        | REVISE                          |
| G53 | Supply Chain    | Secret scan                    | security summary                 | PASS                                           | FAIL if secret confirmed        |
| G54 | Supply Chain    | SBOM                           | `sbom.cyclonedx.json`            | valid + non-empty                              | REVISE                          |
| G55 | Supply Chain    | Provenance                     | `provenance.json`                | valid                                          | REVISE                          |
| G56 | Remote CI       | Quality workflow               | `remote-ci-summary.json`         | success                                        | REVISE                          |
| G57 | Remote CI       | Security workflow              | remote summary                   | success                                        | REVISE                          |
| G58 | Remote CI       | Candidate workflow             | remote summary                   | success                                        | REVISE                          |
| G59 | Same-SHA        | Quality SHA                    | remote summary                   | == candidate SHA                               | REVISE                          |
| G60 | Same-SHA        | Security SHA                   | remote summary                   | == candidate SHA                               | REVISE                          |
| G61 | Same-SHA        | Candidate SHA                  | remote summary                   | == candidate SHA                               | REVISE                          |
| G62 | Same-SHA        | Evidence/provenance/restore SHA| manifest/provenance/restore summary | == candidate SHA ou docs-only freshness válida | REVISE                   |
| G63 | Evidence        | Required artifacts             | manifest                         | todos presentes                                | REVISE                          |
| G64 | Evidence        | JSON/schema validity           | evidence validator               | PASS                                           | REVISE                          |
| G65 | Evidence        | SHA-256 digests                | `artifact-digests.json`          | todos válidos                                  | REVISE                          |
| G66 | Evidence        | Freshness                      | evidence validator               | PASS                                           | REVISE                          |
| G67 | Evidence        | No placeholders                | evidence validator               | zero `missing/unknown/pending/blocked`         | REVISE                          |
| G68 | Assurance       | Independent review             | independent review JSON          | PASS                                           | REVISE                          |
| G69 | Findings        | P0                             | final audit JSON                 | 0                                              | FAIL                            |
| G70 | Findings        | P1                             | final audit JSON                 | 0                                              | FAIL                            |
| G71 | Score           | AAA Engineering                | final audit JSON                 | >= 97                                          | REVISE                          |
| G72 | Score           | AAA Security                   | final audit JSON                 | >= 95                                          | REVISE                          |
| G73 | Score           | AAA Operations                 | final audit JSON                 | >= 95                                          | REVISE                          |

> Nota de arquivamento: G29 nesta cópia lê-se com "FAIL on critical
> weakness" conforme o prompt de certificação (§32); a tabela acima
> preserva o texto original desta terceira cópia.

---

# 5. INTERPRETAÇÃO DA MATRIZ

Existem apenas três resultados possíveis.

## PASS

Somente se:

```text
G01..G73 obrigatórios = PASS
P0 = 0
P1 = 0
Engineering >= 97
Security >= 95
Operations >= 95
```

Resultado:

```text
TRIPLE AAA — PASS
```

---

## REVISE

Usar quando não houver P0/P1 confirmado, mas houver qualquer gate obrigatório:

```text
missing
unproven
pending
stale
failed
mismatched
ambiguous
```

Resultado:

```text
TRIPLE AAA — REVISE
```

---

## FAIL

Usar quando houver:

```text
P0/P1 confirmado
auth bypass
RLS bypass
critical data-integrity failure
secret exposure material
evidence forgery
fundamental security guarantee broken
```

Resultado:

```text
TRIPLE AAA — FAIL
```

---

# 6. SINGLE SOURCE OF TRUTH

Criar:

```text
config/triple-aaa-gates.json
```

ou equivalente versionado.

Ele deve representar mecanicamente a matriz acima.

Exemplo:

```json
{
  "coverage": {
    "statements_min": 90,
    "branches_min": 85,
    "functions_min": 90,
    "lines_min": 90
  },
  "mutation": {
    "adjusted_critical_min": 95,
    "real_critical_survivors_max": 0
  },
  "scores": {
    "engineering_min": 97,
    "security_min": 95,
    "operations_min": 95
  },
  "findings": {
    "p0_max": 0,
    "p1_max": 0
  }
}
```

Todos os scripts de promoção devem consumir essa configuração.

Não duplicar thresholds em vários arquivos.

---

# 7. REMOTE CI CLOSURE

O principal blocker atual é CI remoto.

Use GitHub autenticado para diagnosticar:

```text
quality
security
candidate
```

Não aceitar evidência local como substituto.

Para falha E2E, preservar com redaction:

```text
Playwright trace
screenshots
browser console
web logs
API logs
health state
process/port state
test-results JSON
```

Reproduzir com:

```text
CI=true
Node 22
pnpm frozen
same env
same topology
same browser
```

Corrigir a causa real, não mascarar com sleeps/retries excessivos.

---

# 8. FINAL CANDIDATE SHA

Depois de fechar qualquer problema remoto:

criar um commit técnico final.

Registrar:

```text
FINAL_CANDIDATE_SHA=<40-char SHA>
```

Depois:

# FREEZE.

Mudança técnica posterior invalida a certificação.

---

# 9. SAME-SHA

No SHA congelado executar:

```text
quality.yml
security.yml
candidate.yml
```

Obrigatório:

```text
quality = success
security = success
candidate = success
```

E:

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

A exceção docs-only só é válida quando:

```text
candidate SHA is ancestor
AND
runtime diff == empty
```

---

# 10. RELEASE EVIDENCE

Regenerar após o freeze:

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
  triple-aaa-verdict.json
```

---

# 11. MECHANICAL VERDICT

Criar ou fortalecer:

```text
pnpm verify:triple-aaa
```

Ele deve:

1. carregar `config/triple-aaa-gates.json`;
2. carregar os artifacts;
3. validar schemas;
4. validar SHA/freshness;
5. validar digests;
6. avaliar G01..G73;
7. calcular scores;
8. calcular verdict;
9. calcular readiness;
10. gerar `triple-aaa-verdict.json`.

---

# 12. `triple-aaa-verdict.json`

Formato mínimo:

```json
{
  "schema_version": 1,
  "candidate_sha": "",
  "gates": {
    "G01": "PASS",
    "G02": "PASS"
  },
  "findings": {
    "p0": 0,
    "p1": 0,
    "p2": 0,
    "p3": 0
  },
  "scores": {
    "engineering": 0,
    "security": 0,
    "operations": 0
  },
  "verdict": "PASS|REVISE|FAIL",
  "readiness": "STAGING_VERIFIED"
}
```

`verdict` não pode ser informado manualmente.

---

# 13. VERDICT ALGORITHM

Implementar:

```text
if P0 > 0 or P1 > 0 or fundamental guarantee broken:
    verdict = FAIL

else if every mandatory gate passes
     and engineering >= 97
     and security >= 95
     and operations >= 95:
    verdict = PASS

else:
    verdict = REVISE
```

---

# 14. EXIT CODES

```text
PASS   → exit 0
REVISE → exit != 0
FAIL   → exit != 0
```

Nenhuma promoção pode ocorrer se `verify:triple-aaa` retornar código diferente de zero.

---

# 15. ASSURANCE SELF-TEST

Testar o próprio verifier.

Cenários obrigatórios:

```text
coverage branches = 84.99
mutation score = 94.99
critical survivor = 1
P1 = 1
quality SHA mismatch
security pending
candidate missing
Redis backend = memory
RLS pool isolation = false
CodeQL missing
SBOM missing
digest mismatch
stale evidence
independent review = REVISE
engineering = 96.99
operations = 94.99
```

Todos devem impedir PASS.

Também criar fixture positiva sintética.

Ela deve ser marcada:

```text
synthetic_verifier_test = true
```

e nunca aceita em certificação real.

---

# 16. FINAL STAGING

No candidate SHA, reexecutar:

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

Com:

```text
browser journey
session lifecycle
cross-scope denial
RLS
Redis A/B
Qdrant rebuild
worker recovery
OTel trace
backup/restore
fault drills
load
```

---

# 17. FINAL INDEPENDENT REVIEW

Depois dos workflows remotos verdes e evidence fresh:

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
CSRF
XFF spoof
rate-limit bypass
Redis outage bypass
SQL injection
log/header injection
SSRF
Qdrant poisoning
AI authority leak
worker duplicate effect
same-SHA bypass
stale evidence
artifact substitution
coverage gaming
mutation gaming
```

Resultado permitido:

```text
PASS
REVISE
FAIL
```

---

# 18. FINAL AUDIT

Criar:

```text
docs/audits/state-of-art-final-audit-v7.md
docs/audits/state-of-art-final-audit-v7.json
```

O JSON é autoridade de automação.

O Markdown é explicação humana.

O audit JSON deve incluir:

```text
candidate SHA
G01..G73
P0/P1/P2/P3
Engineering score
Security score
Operations score
Verdict
Readiness
```

---

# 19. CONSISTENCY

Criar/manter:

```text
pnpm verify:audit-consistency
```

Ele deve provar consistência entre:

```text
Gate config
Audit JSON
Audit Markdown
Scorecard
Runtime State
Release Evidence
Triple AAA verdict
```

---

# 20. PRODUCTION STATUS

Triplo AAA técnico não implica produção validada.

Readiness permitidos:

```text
TECHNICALLY VERIFIED
STAGING VERIFIED
PRODUCTION CANDIDATE
PRODUCTION VERIFIED
```

Nesta fase, mesmo com `TRIPLE AAA — PASS`, o esperado é:

```text
STAGING VERIFIED
```

`PRODUCTION VERIFIED` exige evidência real de:

```text
deploy
secrets
ACLs
telemetry
backup
restore
traffic
SLO measurement
human approvals
```

---

# 21. CLINICAL SAFETY

Nenhuma certificação autoriza:

* publicação clínica;
* alteração de gabarito;
* aprovação de competência;
* liberação de protocolo;
* decisão clínica por IA.

Esses gates permanecem humanos.

---

# 22. COMMAND MATRIX

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

# 23. FINAL OUTPUT

Ao concluir, retornar:

```text
FINAL_CANDIDATE_SHA =

Gate Summary:
Passed =
Revised =
Failed =

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
P3 =

AAA Engineering =
AAA Security =
AAA Operations =

Triple AAA Verdict =
Readiness =
```

---

# 24. SUCCESS STATE

Sucesso somente quando:

```text
G01..G73 mandatory gates = PASS

P0 = 0
P1 = 0

AAA Engineering >= 97
AAA Security >= 95
AAA Operations >= 95

pnpm verify:triple-aaa → exit 0
```

e:

```json
{
  "verdict": "PASS",
  "readiness": "STAGING_VERIFIED"
}
```

Então emitir:

# STATE OF ART — VERIFIED

# TRIPLO AAA — PASS

# STAGING VERIFIED

Caso contrário:

# TRIPLO AAA — REVISE

ou, diante de falha fundamental:

# TRIPLO AAA — FAIL

---

# 25. STOP CONDITION

Quando o gate mecânico retornar PASS:

# PARE.

Não buscar score 100.

Não abrir nova modernização.

Não refatorar por estética.

Não adicionar mais infraestrutura.

O objetivo é uma certificação defensável, reproduzível e sustentável — não perfeição artificial.
