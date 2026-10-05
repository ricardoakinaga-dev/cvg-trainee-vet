# CODEX MASTER PROMPT (cópia arquivada)

## CVG TRAINEE VET — FINAL REMOTE CERTIFICATION / TRIPLO AAA PASS

Repositório alvo:

`https://github.com/ricardoakinaga-dev/cvg-trainee-vet`

Branch canônica:

`main`

Objetivo:

# STATE OF ART / TRIPLO AAA — PASS

Esta é a fase final.

NÃO iniciar nova modernização ampla.

NÃO reabrir arquitetura estável.

NÃO adicionar infraestrutura por estética.

A missão é fechar os últimos gaps objetivos de certificação e entregar um candidate SHA que passe de forma mecânica, auditável e reproduzível por todos os gates finais.

---

# 1. ESTADO ATUAL

Considere o estado atual aproximadamente como:

```text
Global técnico ~97/100

Coverage = PASS
Mutation Assurance = PASS
RLS = PASS
Redis Candidate = PASS
Staging = PASS
Supply Chain local = PASS
P0 = 0
P1 = 0
```

O principal blocker restante é:

```text
Remote Quality/Security/Candidate = UNPROVEN / FAIL
Same-SHA = FAIL
```

O audit v6 continua corretamente em:

```text
TRIPLE AAA — REVISE
```

Seu objetivo é fechar isso sem reduzir thresholds.

---

# 2. PAPEL

Atue como:

* Principal Engineer
* CI/CD Engineer
* Release Engineer
* SRE
* Security Engineer
* QA Architect
* Reliability Engineer
* Adversarial Reviewer
* Independent Verifier

A ordem mental deve ser:

```text
Diagnose
→ Reproduce
→ Fix
→ Verify locally
→ Verify remotely
→ Freeze SHA
→ Regenerate evidence
→ Independent review
→ Final verdict
```

---

# 3. OBJETIVOS DESTA RODADA

Execute apenas:

```text
AAA-V7-001 — Fresh baseline
AAA-V7-002 — Diagnose remote quality failure
AAA-V7-003 — Diagnose remote security failure
AAA-V7-004 — Make candidate workflow executable
AAA-V7-005 — Same-SHA closure
AAA-V7-006 — Remote evidence regeneration
AAA-V7-007 — Final independent review
AAA-V7-008 — Audit v7
AAA-V7-009 — Mechanical triple-AAA verdict
```

---

# 4. PRIMEIRA AÇÃO

Leia:

```text
AGENTS.md
docs/99_runtime_state.md
docs/20_master_execution_log.md
docs/30_backlog_master.md
docs/audits/state-of-art-final-audit-v6.md
docs/audits/state-of-art-final-audit-v6.json
docs/quality/scorecard.md
release-evidence/*
.github/workflows/quality.yml
.github/workflows/security.yml
.github/workflows/candidate.yml
```

Leia também:

```text
verify:same-sha
verify:aaa-candidate
verify:triple-aaa
verify:release-evidence
verify:audit-consistency
```

Depois execute o baseline local completo.

---

# 5. BASELINE

Criar:

`docs/modernization/0007_remote_aaa_certification_baseline.md`

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
quality remote status
security remote status
candidate remote status
same-SHA
P0
P1
P2
```

---

# 6. RUNTIME CANÔNICO

Toda prova oficial deve usar:

```text
Node 22.x
pnpm 10.33.x
```

conforme contrato CI.

Node 24 pode ser evidência adicional, nunca canônica.

---

# 7. AAA-V7-002 — REMOTE QUALITY ROOT CAUSE

O quality workflow já teve falha remota de E2E.

Não contorne.

Encontre a causa real.

---

# 8. OBTER LOGS REAIS

Use GitHub autenticado.

Preferência:

```text
GITHUB_TOKEN
gh run view
GitHub REST API autenticada
```

Nunca depender de API anônima.

---

# 9. SE HOUVER 403

Diagnosticar permissões:

```text
actions:read
contents:read
checks:read
```

Se necessário, ajustar workflow/token permissions de forma mínima.

---

# 10. QUALITY FAILURE DIAGNOSTICS

Em falha E2E, capturar:

```text
playwright-report
trace.zip
screenshots
browser console
web logs
api logs
health snapshots
process table
port bindings
test-results JSON
```

Tudo redigido de secrets.

---

# 11. REPRODUÇÃO LOCAL CI-LIKE

Reproduzir com:

```text
CI=true
Node 22
pnpm frozen lockfile
same env vars
same ports
same Playwright version
same service topology
same test ordering
```

---

# 12. FLAKINESS AUDIT

Rodar a suite crítica repetidamente.

Preferência:

```text
10x
```

ou quantidade proporcional.

Procurar:

```text
race
port collision
shared temp dir
unawaited async
process leakage
browser readiness
API readiness
filesystem timing
clock dependency
fixed sleeps
```

---

# 13. NÃO MASCARAR COM RETRY

Não resolver flakiness apenas com:

```text
retry++
timeout enorme
sleep arbitrário
```

Corrigir root cause.

---

# 14. DETERMINISTIC READINESS

Preferir:

```text
health polling
port discovery
condition wait
event barrier
process readiness
```

---

# 15. AAA-V7-003 — REMOTE SECURITY ROOT CAUSE

Revalidar:

```text
CodeQL
OSV
dependency review
secret scan
SBOM
```

no SHA final.

---

# 16. SECURITY WORKFLOW

Se falhar, distinguir:

```text
real vulnerability
tool failure
workflow syntax
permissions
SARIF upload
network
cache
```

---

# 17. OSV

Garantir que o workflow use a integração correta e versão pinada por SHA.

OSV local = 0 não substitui OSV remoto.

---

# 18. CODEQL

CodeQL precisa concluir:

```text
SUCCESS
```

no mesmo SHA.

---

# 19. DEPENDENCY REVIEW

Se push não executa dependency-review por design:

documentar como:

```text
N/A on push
required on PR
```

Mas o candidate final deve provar o controle equivalente definido pelo projeto.

---

# 20. AAA-V7-004 — CANDIDATE WORKFLOW

O candidate workflow nunca pode ser apenas teórico.

Ele precisa ser executável e executado.

---

# 21. TRIGGERS

Garantir trigger seguro para candidate:

```text
workflow_dispatch
candidate-* tag
```

ou equivalente.

---

# 22. CANDIDATE CONTENT

O workflow candidate deve executar:

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
security gates
migrations
Postgres live
RLS live
Redis live
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
same-SHA
verify:aaa-candidate
verify:triple-aaa
```

---

# 23. WORKFLOW TIMEOUTS

Candidate pesado precisa ter timeout explícito, por exemplo:

```text
90 min
```

ou valor justificado.

Nunca infinito.

---

# 24. AAA-V7-005 — FINAL SHA FREEZE

Depois de corrigir quality/security/candidate:

crie um commit técnico final.

Registrar:

```text
FINAL_CANDIDATE_SHA=<40-char-sha>
```

Depois:

# FREEZE.

Nenhuma mudança técnica após isso.

---

# 25. SAME-SHA EXECUTION

Executar:

```text
quality.yml
security.yml
candidate.yml
```

todos no mesmo SHA.

---

# 26. REQUIRED CONCLUSIONS

Obrigatório:

```text
quality = success
security = success
candidate = success
```

---

# 27. SHA EQUALITY

Obrigatoriamente:

```text
FINAL_CANDIDATE_SHA
=
quality.head_sha
=
security.head_sha
=
candidate.head_sha
=
SBOM source SHA
=
provenance source SHA
=
evidence source SHA
```

---

# 28. REMOTE SUMMARY

Gerar:

`release-evidence/remote-ci-summary.json`

com:

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

# 29. SAME-SHA VERIFIER

`verify:same-sha` deve:

```text
use authenticated API
require all 3 runs
require success
require exact SHA match
require non-zero run IDs
fail on pending/cancelled/neutral/skipped
```

---

# 30. NO STALE EVIDENCE

Nenhuma evidence de SHA anterior pode contar.

---

# 31. DOCS-ONLY EXCEPTION

Somente aceitar descendente docs-only quando:

```text
candidate SHA is ancestor
AND
runtime diff == empty
```

---

# 32. AAA-V7-006 — REGENERATE ALL EVIDENCE

Após remote CI verde:

regenerar fresh:

```text
coverage-summary.json
mutation-summary.json
test-summary.json
security-summary.json
rls-live-summary.json
redis-candidate-summary.json
staging-summary.json
otel-summary.json
load-summary.json
restore-summary.json
remote-ci-summary.json
sbom.cyclonedx.json
provenance.json
artifact-digests.json
```

---

# 33. VERIFY RELEASE EVIDENCE

Executar:

```text
pnpm verify:release-evidence
```

Exigir:

```text
presence
valid JSON
schema
SHA
freshness
digests
PASS
```

---

# 34. MECHANICAL VERDICT

Executar:

```text
pnpm verify:triple-aaa
```

---

# 35. PASS CONDITIONS

Somente PASS se:

```text
Engineering >= 97
Security >= 95
Operations >= 95

P0 = 0
P1 = 0

Coverage PASS
Mutation PASS
RLS PASS
Redis PASS
Quality remote PASS
Security remote PASS
Candidate remote PASS
Same-SHA PASS
Staging PASS
Supply Chain PASS
Release Evidence PASS
Independent Review PASS
```

---

# 36. IF ENGINEERING SCORE REMAINS BELOW 97

Não inflar.

Investigar quais componentes reais estão puxando a média.

---

# 37. ENGINEERING SCORE CLOSURE

Melhorias aceitáveis:

```text
CI reliability
maintainability
coverage margin
mutation assurance
traceability
test quality
```

Não adicionar features.

---

# 38. OPERATIONS SCORE CLOSURE

O principal ganho esperado vem de:

```text
remote CI PASS
same-SHA PASS
candidate PASS
release evidence PASS
```

Não criar nova infraestrutura.

---

# 39. AAA-V7-007 — FINAL INDEPENDENT REVIEW

Depois do remote green:

usar reviewer fresh.

---

# 40. REVIEWER SCOPE

Tentar reprovar:

```text
auth bypass
BOLA
IDOR
RLS bypass
session replay
CSRF
rate-limit bypass
Redis failure
SQL injection
Qdrant poisoning
worker duplicate effect
stale evidence
same-SHA bypass
artifact substitution
coverage gaming
mutation gaming
```

---

# 41. REVIEW RESULT

Somente:

```text
PASS
REVISE
FAIL
```

---

# 42. INDEPENDENT REVIEW JSON

Criar:

```text
docs/audits/independent-review-v2.json
```

com:

```text
candidate_sha
P0
P1
P2
result
limitations
```

---

# 43. AAA-V7-008 — AUDIT V7

Criar:

```text
docs/audits/state-of-art-final-audit-v7.md
docs/audits/state-of-art-final-audit-v7.json
```

---

# 44. AUDIT V7 JSON

Deve conter:

```json
{
  "candidate_sha": "",
  "p0": 0,
  "p1": 0,
  "coverage": "PASS",
  "mutation": "PASS",
  "rls": "PASS",
  "redis": "PASS",
  "quality_remote": "PASS",
  "security_remote": "PASS",
  "candidate_remote": "PASS",
  "same_sha": "PASS",
  "staging": "PASS",
  "supply_chain": "PASS",
  "release_evidence": "PASS",
  "independent_review": "PASS",
  "aaa_engineering": 0,
  "aaa_security": 0,
  "aaa_operations": 0,
  "triple_aaa": "PASS|REVISE|FAIL",
  "readiness": "STAGING_VERIFIED"
}
```

---

# 45. AAA ENGINEERING TARGET

```text
>= 97
```

---

# 46. AAA SECURITY TARGET

```text
>= 95
```

---

# 47. AAA OPERATIONS TARGET

```text
>= 95
```

---

# 48. NO ROUNDING UP

```text
96.9 != 97
```

Não arredondar para passar.

---

# 49. P0/P1

Obrigatório:

```text
P0 = 0
P1 = 0
```

---

# 50. P2

P2 pode permanecer somente se:

```text
non-material
owned
mitigated
documented
accepted
```

---

# 51. SCORECARD

Atualizar:

```text
docs/quality/scorecard.md
```

para o final SHA.

---

# 52. CONSISTENCY GATE

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

# 53. AAA-V7-009 — FINAL PROMOTION

Executar:

```text
pnpm verify:triple-aaa
```

---

# 54. EXPECTED MACHINE RESULT

Somente aceitar:

```json
{
  "verdict": "PASS",
  "readiness": "STAGING_VERIFIED"
}
```

com exit code:

```text
0
```

---

# 55. IF SAME-SHA FAILS

Resultado obrigatório:

```text
TRIPLE AAA — REVISE
```

---

# 56. IF P0/P1 APPEARS

Nunca PASS.

---

# 57. IF REMOTE CI FAILS

Não substituir por prova local.

Corrigir e rerodar.

---

# 58. IF CANDIDATE FAILS

Não promover quality+security verdes isoladamente.

---

# 59. IF INDEPENDENT REVIEW = REVISE

Resultado global:

```text
TRIPLE AAA — REVISE
```

---

# 60. FINAL READINESS

Mesmo com PASS:

```text
Readiness = STAGING VERIFIED
```

até haver produção real.

---

# 61. PRODUCTION VERIFIED

Não declarar sem:

```text
real deploy
real secrets
real ACLs
real telemetry
real backup
real restore
real traffic
SLO measurement
human approvals
```

---

# 62. NO OVERENGINEERING

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

---

# 63. ARCHITECTURE PRESERVATION

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
 ├─ Redis
 ├─ Qdrant
 └─ AI

Worker
OTel Collector
```

---

# 64. FINAL COMMAND SET

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

# 65. FINAL OUTPUT

Ao final, retornar exatamente:

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

# 66. SUCCESS STATE

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

# 67. STOP CONDITION

Quando:

```text
pnpm verify:triple-aaa
```

retornar exit code `0` e o verdict JSON contiver:

```json
{
  "verdict": "PASS",
  "readiness": "STAGING_VERIFIED"
}
```

# PARE.

Não continue refatorando.

Não busque score 100.

Não abra nova fase técnica.

---

# 68. FINAL PRINCIPLE

O objetivo não é melhorar o projeto indefinidamente.

O objetivo é fechar a cadeia:

```text
Code
→ Tests
→ Live Evidence
→ Remote CI
→ Same-SHA
→ Immutable Evidence
→ Independent Review
→ Mechanical Verdict
```

Somente quando todos os elos forem comprovados:

# STATE OF ART — VERIFIED

# TRIPLO AAA — PASS

Caso contrário:

# TRIPLO AAA — REVISE
