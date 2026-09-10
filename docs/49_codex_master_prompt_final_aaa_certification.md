# CODEX MASTER PROMPT — FINAL AAA CERTIFICATION & PROMOTION CLOSURE (cópia arquivada)

> Cópia verbatim do prompt fornecido pelo usuário em 2026-09-10, arquivada em `docs/` conforme solicitado ("salve uma copia do seguinte prompt na pasta docs em seguida implemente todo o conteudo do prompt").
> Arquivo: `docs/49_codex_master_prompt_final_aaa_certification.md`.
> Implementação registrada em `docs/99_runtime_state.md`, `docs/20_master_execution_log.md`, `docs/30_backlog_master.md`, `docs/modernization/0004_final_aaa_certification_baseline.md` e auditorias em `docs/audits/`.

---

# CODEX MASTER PROMPT

## CVG TRAINEE VET — FINAL AAA CERTIFICATION & PROMOTION CLOSURE

Repositório alvo:

`https://github.com/ricardoakinaga-dev/cvg-trainee-vet`

Branch canônica:

`main`

Objetivo:

# STATE OF ART / TRIPLO AAA — PASS

Esta NÃO é uma nova rodada ampla de modernização.

O projeto já possui arquitetura, segurança, RLS, distributed rate limiting, OpenTelemetry, staging-like stack, fault injection, backup/restore, load testing, supply-chain security, release evidence e coverage acima da barra formal.

A missão desta execução é eliminar os últimos gaps de assurance e produzir uma promoção tecnicamente defensável.

---

# 1. PAPEL

Atue como:

* Principal Engineer
* Software Architect
* Security Engineer
* SRE
* QA Architect
* Release Engineer
* Performance Engineer
* Adversarial Reviewer
* Independent Verifier

O implementador NÃO deve assumir automaticamente que o resultado merece PASS.

A etapa final deve tentar reprovar o próprio sistema.

---

# 2. ESTADO DE REFERÊNCIA

O projeto atualmente possui aproximadamente:

```text
AAA Engineering = 97
AAA Security    = 96
AAA Operations  = 95

P0 = 0
P1 = 0
```

Coverage atual:

```text
Statements = 90.91%
Branches   = 85.00%
Functions  = 96.03%
Lines      = 91.68%
```

A barra formal é:

```text
Statements >= 90%
Branches   >= 85%
Functions  >= 90%
Lines      >= 90%
```

Portanto coverage está fechada.

Os gaps restantes são principalmente:

```text
AAA-CERT-001 — Mutation Assurance Closure
AAA-CERT-002 — Remote Same-SHA Proof
AAA-CERT-003 — Durable Redis Candidate Verification
AAA-CERT-004 — Evidence Freshness & Scorecard Closure
AAA-CERT-005 — Independent Final Audit v4
```

---

# 3. REGRAS ABSOLUTAS

Não:

* reduzir metas para conseguir PASS;
* reutilizar evidência de SHA antigo;
* declarar workflow PASS sem run real;
* classificar mutant como equivalente sem prova;
* excluir código útil da coverage;
* adicionar nova infraestrutura desnecessária;
* fazer deploy de produção;
* publicar conteúdo clínico;
* usar dados reais;
* permitir IA tomar decisão clínica;
* declarar PRODUCTION VERIFIED sem produção.

---

# 4. PRIMEIRO PASSO

Antes de alterar qualquer arquivo:

1. leia `AGENTS.md`;
2. leia `docs/99_runtime_state.md`;
3. leia `docs/20_master_execution_log.md`;
4. leia `docs/30_backlog_master.md`;
5. leia `docs/audits/state-of-art-final-audit-v3.md`;
6. leia `docs/quality/scorecard.md`;
7. leia o relatório atual de mutation;
8. leia `.github/workflows/quality.yml`;
9. leia `.github/workflows/security.yml`;
10. leia `.github/workflows/candidate.yml`;
11. leia o implementation de `verify:same-sha`;
12. leia o implementation de `verify:aaa-candidate`;
13. leia o release evidence bundle;
14. execute todos os gates locais atuais.

Criar:

`docs/modernization/0004_final_aaa_certification_baseline.md`

com:

* HEAD atual;
* coverage;
* mutation raw;
* mutation adjusted;
* status quality;
* status security;
* status candidate;
* Redis candidate status;
* staging status;
* P0/P1/P2.

---

# 5. AAA-CERT-001 — MUTATION ASSURANCE CLOSURE

Este é o principal gap técnico de assurance restante.

O mutation testing atual deve ser analisado mutant por mutant.

Não busque 90% bruto de forma cega.

---

# 6. CLASSIFICAÇÃO DE MUTANTS

Para cada surviving mutant, classifique:

```text
REAL
EQUIVALENT
UNREACHABLE
TOOL_ARTIFACT
LOW_VALUE
```

Cada classificação diferente de REAL deve conter justificativa concreta.

---

# 7. PROVA DE EQUIVALÊNCIA

Para cada mutant classificado como EQUIVALENT, documentar:

```text
Original:
...

Mutation:
...

Semantic proof:
...

Why no observable behavior differs:
...
```

Não aceitar:

```text
"looks equivalent"
```

---

# 8. MUTANTS REAIS

Todos os mutants reais em componentes críticos devem ser mortos.

Prioridade:

```text
authorization
authentication
session
recovery
capability enforcement
RLS context
rate-limit policy
idempotency
state transitions
attempt lifecycle
diagnostic lifecycle
```

---

# 9. TESTES PARA MUTANTS

Adicionar somente testes que verifiquem comportamento.

Evitar:

* assertion de linha;
* teste de implementação interna;
* teste artificial só para Stryker.

---

# 10. MUTATION SCORE FINAL

Gerar:

```text
raw_mutation_score
adjusted_critical_mutation_score
equivalent_mutants
real_survivors
```

Meta formal:

```text
adjusted critical mutation score >= 90%
real critical survivors = 0
```

---

# 11. MACHINE-READABLE MUTATION REPORT

Criar:

`reports/mutation-summary.json`

Exemplo:

```json
{
  "raw_score": 0,
  "adjusted_score": 0,
  "critical_real_survivors": 0,
  "equivalent_count": 0,
  "status": "PASS"
}
```

---

# 12. INTEGRAR MUTATION AO AAA GATE

`verify:aaa-candidate` deve falhar se:

```text
adjusted mutation < 90
```

ou:

```text
critical_real_survivors > 0
```

Não depender de Markdown.

---

# 13. AAA-CERT-002 — REMOTE SAME-SHA PROOF

Escolher um SHA final.

A partir desse momento:

não modificar nenhum arquivo até terminar os workflows.

---

# 14. FINAL CANDIDATE SHA

Registrar:

```text
FINAL_CANDIDATE_SHA=<sha>
```

em evidence machine-readable.

---

# 15. WORKFLOWS OBRIGATÓRIOS

No mesmo SHA devem passar:

```text
quality
security
candidate
```

---

# 16. SAME-SHA ASSERTION

Obrigatoriamente:

```text
HEAD_SHA
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

# 17. AUTENTICAÇÃO GITHUB

Não usar API GitHub anônima para verificação de promoção.

Em CI, usar:

```text
GITHUB_TOKEN
```

ou mecanismo autenticado equivalente.

---

# 18. VERIFY SAME SHA

Fortalecer `verify:same-sha` para:

* consultar runs autenticados;
* aguardar apenas quando autorizado pelo workflow;
* falhar se pending;
* falhar se cancelled;
* falhar se failed;
* falhar se SHA diferente;
* falhar se artifact não pertencer ao SHA.

---

# 19. SEM POLLING INFINITO

Se o script precisar consultar status:

* timeout bounded;
* retry bounded;
* backoff;
* erro explícito.

---

# 20. REMOTE CI SUMMARY

Gerar:

`release-evidence/remote-ci-summary.json`

com:

```text
sha
quality_run
security_run
candidate_run
status
conclusion
timestamps
artifact_ids
workflow_urls
```

---

# 21. CANDIDATE WORKFLOW

Confirmar que `candidate.yml` executa efetivamente:

```text
format
lint
typecheck
coverage
coverage-floor
contracts
worker
routes
architecture
complexity
cycles
dead-code
security
otel
migrations
PostgreSQL live
RLS live
Redis live
Qdrant live
restore
staging-like browser
OTel collector proof
load or bounded smoke
audit high
SBOM
provenance
evidence bundle
verify:aaa-candidate
```

---

# 22. NÃO DUPLICAR FAST CI

O candidate pode reutilizar resultados/steps corretamente, mas deve garantir same-SHA.

Não criar pipeline redundante e frágil apenas para marcar checklist.

---

# 23. AAA-CERT-003 — DURABLE REDIS CANDIDATE PROOF

O RedisRateLimitStore já está testado contra Redis real.

Agora a prova candidate deve usar Redis/Valkey como backend efetivo.

---

# 24. CANDIDATE STACK

Subir:

```text
Web
API A
API B
Worker
PostgreSQL
Redis/Valkey
Qdrant
OTel Collector
TLS proxy
```

---

# 25. REDIS COMO BACKEND REAL

Na prova candidate:

não permitir MemoryRateLimitStore como fallback silencioso.

Confirmar via configuração/runtime evidence que o backend em uso é Redis/Valkey.

---

# 26. MULTI-INSTANCE REDIS TEST

Provar novamente:

```text
API A + API B → mesmo budget
```

com backend real candidate.

---

# 27. REDIS RESTART DRILL

Durante tráfego:

1. derrubar Redis;
2. observar failure policy;
3. reiniciar Redis;
4. aguardar reconexão bounded;
5. repetir requests;
6. provar recuperação.

---

# 28. REDIS FAIL POLICY

Confirmar:

```text
critical classes → fail closed
public-low-risk → policy explícita
```

Nada pode cair silenciosamente para allow-all.

---

# 29. REDIS METRICS

Verificar métricas:

```text
rate_limit_store_requests_total
rate_limit_store_errors_total
rate_limit_store_duration_seconds
rate_limit_rejections_total
```

ou nomenclatura equivalente.

Sem alta cardinalidade.

---

# 30. REDIS EVIDENCE

Gerar:

`release-evidence/redis-candidate-summary.json`

com:

```text
backend
instances
atomicity_test
shared_budget_test
restart_test
timeout_test
spoof_test
status
```

---

# 31. AAA-CERT-004 — FRESH EVIDENCE CLOSURE

Todos os arquivos de evidence devem pertencer ao FINAL_CANDIDATE_SHA.

Nenhum artifact stale.

---

# 32. SCORECARD FRESH

Atualizar:

`docs/quality/scorecard.md`

para o SHA final.

Não manter scores da auditoria v3.

---

# 33. AUDIT STATE MACHINE READABLE

Criar:

`docs/audits/state-of-art-final-audit-v4.json`

Exemplo:

```json
{
  "sha": "...",
  "p0": 0,
  "p1": 0,
  "aaa_engineering": 0,
  "aaa_security": 0,
  "aaa_operations": 0,
  "triple_aaa": "PASS|REVISE|FAIL",
  "readiness": "..."
}
```

---

# 34. RELEASE EVIDENCE FINAL

Bundle mínimo:

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

# 35. EVIDENCE VALIDATOR

Criar ou fortalecer:

```text
verify:release-evidence
```

para validar:

* arquivos obrigatórios;
* JSON;
* SHA;
* timestamps;
* digests;
* PASS status;
* freshness.

---

# 36. EVIDENCE FRESHNESS

Nenhum evidence pode apontar para commit anterior.

---

# 37. AAA CANDIDATE GATE

`verify:aaa-candidate` deve usar arquivos machine-readable.

Deve verificar:

```text
coverage >= 90/85/90/90
mutation adjusted >= 90
critical mutation survivors = 0
RLS live PASS
Redis candidate PASS
remote same-SHA PASS
staging PASS
security high/critical = 0
P0 = 0
P1 = 0
release evidence PASS
```

---

# 38. NÃO PARSEAR MARKDOWN PARA GATE CRÍTICO

Se atualmente houver gate lendo frases do audit Markdown, migrar para JSON.

Markdown = explicação humana.

JSON = autoridade de máquina.

---

# 39. AAA-CERT-005 — FINAL STAGING REVALIDATION

Depois das mudanças necessárias para mutation/CI/Redis:

reexecutar staging completo.

---

# 40. BROWSER E2E REAL

Provar novamente:

```text
Browser
→ Web
→ API
→ PostgreSQL
```

---

# 41. JORNADAS MÍNIMAS

Revalidar:

```text
invite/session
learning path
activity
attempt start
answer
submit
diagnostic
recovery
staff-only surface
```

---

# 42. AUTHORIZATION

Revalidar:

```text
participant A cannot access B
staff scope A cannot access B
anonymous cannot access private routes
```

---

# 43. TLS COOKIE

Confirmar:

```text
__Host-
Secure
HttpOnly
SameSite
Path=/
```

---

# 44. SESSION LIFECYCLE

Testar:

```text
creation
rotation
expiry
revoke
recovery
```

---

# 45. RLS

Reexecutar 7/7 ou matriz atual completa no candidate SHA.

---

# 46. OTel

Confirmar spans fresh no collector do candidate SHA.

---

# 47. TRACE CORRELATION

Para uma jornada:

```text
requestId
correlationId
traceId
spanId
```

devem ser correlacionáveis.

---

# 48. TELEMETRY REDACTION

Verificar que nenhum span/log contém:

* cookie;
* token;
* PII;
* patient data;
* tutor data;
* raw prompt;
* raw sensitive output.

---

# 49. QDRANT DRILL

Derrubar coleção e reconstruir.

---

# 50. WORKER DRILL

Revalidar:

* crash;
* replay;
* lease;
* duplicate;
* recovery.

---

# 51. BACKUP/RESTORE

Executar fresh.

Registrar RTO staging.

---

# 52. FAILURE DRILLS

No mínimo:

```text
Redis outage
Qdrant outage
OTel outage
worker restart
PostgreSQL restart
```

---

# 53. LOAD REGRESSION

Executar k6 após mudanças.

Comparar com baseline anterior.

---

# 54. PERFORMANCE REGRESSION RULE

Se houver piora significativa:

investigar.

Exemplo orientativo:

```text
p95 regression > 20%
```

deve ser revisado.

Não tratar esse número como lei se baseline justificar outro budget.

---

# 55. HIGH / CRITICAL SECURITY

Executar:

```text
pnpm audit --audit-level=high
CodeQL
OSV
dependency review
secret scan
```

High/critical relevante:

```text
AAA FAIL
```

---

# 56. MODERATE / LOW

Classificar realisticamente.

Dev-only sem path produtivo pode permanecer P3 accepted risk.

---

# 57. COMPLEXITY FINAL REVIEW

Não fazer outra grande refatoração.

Somente corrigir hotspot que ainda represente risco real.

---

# 58. `http.ts`

Se estiver aproximadamente 1166 linhas e funcionando como composition/dispatch:

não destruir arquitetura para atingir métrica estética.

Avaliar complexidade e coupling, não apenas LOC.

---

# 59. FUNCTION HOTSPOTS

Corrigir funções que ultrapassem budget e realmente tenham múltiplas responsabilidades.

---

# 60. NO OVERENGINEERING

Proibido adicionar sem necessidade:

* Kafka;
* Kubernetes;
* service mesh;
* CQRS;
* event sourcing;
* novos bancos;
* microservices.

---

# 61. ARCHITECTURE TARGET

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

# 62. FINAL INDEPENDENT AUDIT V4

Após o FINAL_CANDIDATE_SHA estar congelado e workflows verdes:

execute auditoria fresh.

---

# 63. AUDITOR DEVE TENTAR REPROVAR

Procure:

```text
auth bypass
BOLA
IDOR
scope escalation
RLS bypass
session replay
session fixation
recovery abuse
CSRF bypass
XFF spoof
rate-limit bypass
Redis outage bypass
SQL injection
log injection
header injection
SSRF
Qdrant poisoning
AI output abuse
prompt injection boundary
audit trail tampering
artifact substitution
stale evidence
same-SHA mismatch
coverage gaming
mutation gaming
```

---

# 64. TEST QUALITY REVIEW

Procure testes que:

* só testam mock;
* não observam comportamento;
* existem apenas para coverage;
* existem apenas para mutation;
* dependem de sleeps frágeis;
* possuem assertions triviais.

Corrigir problemas relevantes.

---

# 65. MUTATION REVIEW INDEPENDENTE

Revisar manualmente as equivalências declaradas.

Se a equivalência não for provada:

reclassificar como REAL.

---

# 66. ROUTE SECURITY MATRIX

Confirmar todas as rotas atuais:

```text
route
method
auth
capability
risk
positive test
negative test
telemetry
```

---

# 67. DB SECURITY MATRIX

Confirmar:

```text
RLS enabled
FORCE RLS
owner
grants
service roles
app role
no SUPERUSER
no BYPASSRLS
```

---

# 68. SUPPLY CHAIN REVIEW

Confirmar:

* Actions pinadas por SHA;
* SBOM correto;
* provenance;
* lockfile;
* dependency audit;
* CodeQL;
* OSV;
* no secrets.

---

# 69. RELEASE REVIEW

Confirmar que o artifact é reconstruível e pertence ao SHA final.

---

# 70. AUDIT V4 MARKDOWN

Criar:

`docs/audits/state-of-art-final-audit-v4.md`

---

# 71. AUDIT V4 CONTENT

Incluir:

1. Executive Summary
2. Final Candidate SHA
3. Evidence Scope
4. Architecture
5. Modularization
6. API
7. Contracts
8. Persistence
9. RLS
10. Authentication
11. Authorization
12. Sessions
13. Rate Limiting
14. Redis Candidate
15. Security
16. Supply Chain
17. Testing
18. Coverage
19. Mutation
20. CI
21. Same-SHA
22. Staging
23. Observability
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
37. Scorecard
38. Triple AAA Verdict

---

# 72. SCORECARD FINAL

Pontuar de 0–100:

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
Mutation Assurance
CI
Same-SHA Assurance
Observability
Resilience
Worker
Performance
Accessibility
Maintainability
Release Engineering
Staging Readiness
Production Readiness
Documentation
```

---

# 73. AAA ENGINEERING

Meta:

```text
>= 97
```

---

# 74. AAA SECURITY

Meta:

```text
>= 95
```

---

# 75. AAA OPERATIONS

Meta:

```text
>= 95
```

---

# 76. PROMOTION RULE

Só declarar:

# TRIPLE AAA — PASS

se:

```text
AAA Engineering >= 97
AAA Security >= 95
AAA Operations >= 95

P0 = 0
P1 = 0

Coverage PASS
Mutation PASS
RLS PASS
Redis candidate PASS
Same-SHA PASS
Staging PASS
Security PASS
Evidence PASS
```

---

# 77. SE QUALQUER GATE FALHAR

Resultado:

```text
TRIPLE AAA — REVISE
```

ou:

```text
TRIPLE AAA — FAIL
```

conforme gravidade.

---

# 78. PRODUCTION STATUS SEPARADO

Mesmo com Triple AAA técnico:

não declarar `PRODUCTION VERIFIED`.

Use apenas classificação sustentada:

```text
TECHNICALLY VERIFIED
STAGING VERIFIED
PRODUCTION CANDIDATE
PRODUCTION VERIFIED
```

---

# 79. PRODUCTION VERIFIED EXIGE

* deploy real;
* secrets reais;
* ACLs reais;
* telemetry real;
* backup real;
* restore real;
* traffic real;
* approvals necessárias.

---

# 80. AAA-001

Se `AAA-001` ainda exigir decisão humana:

não fingir fechamento.

A engenharia técnica pode passar, mas produção/piloto continuam bloqueados.

---

# 81. CLINICAL SAFETY

Nenhuma etapa autoriza:

* publicação clínica;
* aprovação automática;
* mudança de gabarito;
* competência automática;
* decisão clínica por IA.

---

# 82. TEST DATA

Somente sintético.

---

# 83. COMMITS

Use commits pequenos e coerentes.

Exemplos:

```text
test(authz): close real surviving authorization mutants
test(mutation): publish adjusted critical mutation evidence
ci(candidate): authenticate same-sha remote verification
test(redis): enforce durable candidate backend
test(staging): revalidate final candidate stack
docs(audit): publish final triple aaa audit v4
```

---

# 84. SHA FREEZE

Após commit final técnico:

freeze.

Nenhuma alteração depois sem reiniciar evidence.

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

Além de qualquer novo gate legitimamente criado.

---

# 86. RUNTIME

Verificação oficial em:

```text
Node 22.x
pnpm 10.33.x
```

conforme contrato.

---

# 87. RELATÓRIO DE CADA ETAPA

Retornar:

```text
TASK
STATUS
FILES CHANGED
TESTS
COVERAGE
MUTATION
CI
EVIDENCE
FINDINGS CLOSED
NEW FINDINGS
BLOCKERS
NEXT ACTION
```

---

# 88. NÃO PARAR EM PLANEJAMENTO

Implemente e verifique.

Não entregar apenas roadmap.

---

# 89. PRIORIDADE

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

# 90. FINAL OBJECTIVE

O objetivo desta execução é produzir um único candidate SHA cuja evidência permita dizer:

```text
Architecture PASS
Engineering PASS
Security PASS
Operations PASS
Coverage PASS
Mutation PASS
RLS PASS
Redis PASS
Same-SHA PASS
Staging PASS
Supply Chain PASS
Adversarial Audit PASS
```

---

# 91. NÃO BUSCAR PERFEIÇÃO FICTÍCIA

Triplo AAA não significa zero P2/P3.

P2/P3 podem permanecer se:

* não forem materiais;
* tiverem risco residual conhecido;
* tiverem owner;
* não quebrarem os thresholds;
* não esconderem gaps fundamentais.

---

# 92. P0/P1

Qualquer P0 ou P1:

```text
TRIPLE AAA = FAIL
```

---

# 93. FINAL CLASSIFICATION

No fim, imprimir explicitamente:

```text
FINAL_CANDIDATE_SHA = ...
AAA Engineering = ...
AAA Security = ...
AAA Operations = ...
P0 = ...
P1 = ...
Coverage = ...
Adjusted Mutation = ...
Same-SHA = ...
Staging = ...
```

e uma das opções:

```text
TRIPLE AAA — PASS
TRIPLE AAA — REVISE
TRIPLE AAA — FAIL
```

---

# 94. READINESS CLASSIFICATION

Também imprimir separadamente:

```text
TECHNICALLY VERIFIED
STAGING VERIFIED
PRODUCTION CANDIDATE
ou
PRODUCTION VERIFIED
```

conforme evidência.

---

# 95. AUDIT MUST BE FRESH

Audit v4 deve ser posterior aos workflows do final candidate SHA.

---

# 96. NO STALE SCORECARD

Scorecard final deve apontar ao mesmo SHA.

---

# 97. NO STALE EVIDENCE

Evidence bundle final deve ser regenerado após o freeze.

---

# 98. NO SELF-CERTIFICATION SHORTCUT

A existência de `verify:aaa-candidate` não prova AAA sozinha.

A auditoria adversarial independente ainda é obrigatória.

---

# 99. PRIMEIRA TASK

Comece agora por:

# AAA-CERT-001 — Mutation Assurance Closure

Leia o relatório atual do Stryker.

Liste todos os surviving mutants.

Classifique um por um.

Mate todos os mutants reais de segurança/autorização com testes comportamentais.

Calcule o adjusted critical mutation score.

Só então avance para a certificação same-SHA.

---

# 100. DEFINIÇÃO FINAL DE SUCESSO

O sucesso não é produzir mais código.

O sucesso é produzir um **candidate SHA imutável, reproduzível, rastreável e adversarialmente auditado** que consiga sustentar tecnicamente o claim:

# STATE OF ART / TRIPLO AAA — PASS

Se a evidência não for suficiente, preserve `REVISE`.

Não reduza a barra.

Comece agora.
