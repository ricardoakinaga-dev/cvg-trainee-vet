# CODEX MASTER PROMPT — State of Art / Triplo AAA Modernization

> **Procedência:** prompt integral fornecido por Ricardo em 2026-09-09, preservado
> verbatim em `docs/` conforme solicitado ("salve esse prompt na pasta docs em
> seguida implemente todo o seu conteudo").
> **Arquivo canônico:** `docs/46_codex_master_prompt_state_of_art_triple_aaa.md`
> **Status de execução:** em implementação faseada; ver
> `docs/modernization/0001_baseline_audit.md`, `docs/99_runtime_state.md`,
> `docs/20_master_execution_log.md` e `docs/30_backlog_master.md`.
> Nenhuma decisão de produto, gate clínico/humano ou publicação foi alterada por
> este arquivamento.

---

# CODEX MASTER PROMPT

## CVG TRAINEE VET — STATE OF ART / TRIPLO AAA MODERNIZATION

Repositório alvo:

`https://github.com/ricardoakinaga-dev/cvg-trainee-vet`

Você está assumindo o papel de **Principal Engineer + Software Architect + Security Engineer + SRE + QA Architect + Release Engineer + Independent Verifier**.

Sua missão é transformar o repositório `cvg-trainee-vet` em um sistema:

**State of Art**
**Production Grade**
**Enterprise Grade**
**Security Hardened**
**Highly Observable**
**Auditable**
**Resilient**
**Maintainable**
**Triplo AAA de qualidade**

Não trate esta tarefa como uma sequência de mudanças superficiais. Execute uma modernização arquitetural e operacional completa, preservando comportamento correto existente, rastreabilidade, contratos e regras do produto.

---

# 1. OBJETIVO FINAL

O sistema deverá atingir simultaneamente três níveis AAA:

## AAA — ENGINEERING

Deverá demonstrar excelência em:

* arquitetura;
* modularidade;
* domínio;
* application layer;
* contratos;
* TDD;
* testes;
* type safety;
* maintainability;
* DX;
* rastreabilidade;
* CI;
* qualidade de código;
* automação;
* documentação executável.

Meta mínima:

`AAA Engineering >= 97/100`

---

## AAA — SECURITY

Deverá demonstrar excelência em:

* authentication;
* authorization;
* deny-by-default;
* least privilege;
* RLS;
* CSRF;
* rate limiting;
* abuse resistance;
* secrets;
* dependency security;
* supply-chain;
* SSRF;
* injection;
* filesystem security;
* input validation;
* session security;
* auditability;
* artifact integrity;
* provenance;
* adversarial tests.

Meta mínima:

`AAA Security >= 95/100`

Nenhum P0 ou P1 poderá permanecer aberto.

---

## AAA — OPERATIONS

Deverá demonstrar excelência em:

* observabilidade;
* métricas;
* logs estruturados;
* distributed tracing;
* OpenTelemetry;
* health;
* readiness;
* SLO;
* alertas;
* retry;
* timeout;
* backpressure;
* graceful shutdown;
* recovery;
* backup;
* restore;
* disaster recovery;
* fault injection;
* concurrency;
* multi-instance;
* release evidence;
* deployment safety.

Meta mínima:

`AAA Operations >= 95/100`

---

# 2. REGRA PRINCIPAL

Antes de alterar qualquer código:

1. leia integralmente `AGENTS.md`;
2. leia `docs/99_runtime_state.md`;
3. leia `docs/20_master_execution_log.md`;
4. leia `docs/30_backlog_master.md`;
5. leia os documentos relevantes de Discovery, PRD, SPEC, BUILD e AUDIT;
6. leia `architecture-boundaries.json`;
7. analise a estrutura real do monorepo;
8. execute os verificadores existentes;
9. reconstrua mentalmente a arquitetura antes de modificar qualquer arquivo.

Não viole o pipeline oficial:

`DISCOVERY → PRD → SPEC → BUILD → AUDIT`

Não ignore gates existentes.

Não invente requisitos de produto.

Não transforme dívida técnica em mudança funcional não autorizada.

---

# 3. NÃO DESTRUIR O QUE JÁ ESTÁ BOM

Preserve especialmente:

* separação apps/packages;
* Domain Layer independente;
* Application Layer isolada;
* contratos explícitos;
* PostgreSQL como source of truth;
* Qdrant como índice derivado e reconstruível;
* IA como camada assistiva e desligável;
* deny-by-default;
* autorização server-side;
* RLS como defesa adicional;
* TDD;
* traceability;
* documentação operacional;
* runtime state;
* evidence-based engineering;
* testes live existentes;
* restore testing;
* arquitetura executável;
* regras de exposição pública;
* gates clínicos e humanos.

Não adote microserviços sem prova objetiva de necessidade.

O alvo arquitetural preferido continua sendo um:

**modular monolith fortemente modularizado**

com worker separado quando necessário.

---

# 4. AUDITORIA INICIAL OBRIGATÓRIA

Antes da implementação, produza:

`docs/modernization/0001_baseline_audit.md`

Inclua:

* arquitetura atual;
* dependências;
* riscos;
* hotspots;
* coupling;
* tamanho de arquivos;
* complexidade;
* cobertura;
* CI;
* segurança;
* observabilidade;
* resiliência;
* supply chain;
* deployability;
* estado real versus documentação;
* blockers;
* dívida técnica;
* oportunidades.

Classifique os achados:

* P0 — critical;
* P1 — high;
* P2 — medium;
* P3 — low.

Não trate problemas estéticos como P0/P1.

---

# 5. PRINCIPAL DÍVIDA ARQUITETURAL: API

Existe um hotspot importante em:

`apps/api/src/http.ts`

e no respectivo teste.

A API deverá deixar de depender de um grande God Module.

Não faça uma refatoração big-bang.

Faça decomposição incremental e protegida por testes.

Objetivo desejado:

```text
apps/api/src/

server/
  create-server.ts
  routing.ts
  request-context.ts

middleware/
  authentication.ts
  authorization.ts
  csrf.ts
  rate-limit.ts
  request-id.ts
  body-limit.ts
  error-boundary.ts

features/
  auth/
  invitations/
  accounts/
  curriculum/
  activities/
  attempts/
  diagnostics/
  feedback/
  appeals/
  content/
  audit/
  reporting/

shared/
  presenters/
  validation/
  response/
```

Cada feature deverá, quando aplicável, possuir:

* route definition;
* controller/handler;
* schemas;
* authorization policy;
* presenter;
* application orchestration;
* tests.

Não empurre regra de negócio para controllers.

---

# 6. ROUTE REGISTRY

Eliminar gradualmente o grande mapeamento manual de:

`routeTemplate()`

Crie uma fonte única de verdade para rotas.

O registry deverá permitir definir:

* method;
* canonical route;
* pattern;
* handler;
* auth requirement;
* capability;
* rate-limit class;
* telemetry template.

Exemplo conceitual:

```ts
{
  method: "POST",
  template: "/api/v1/attempts/:attemptId/submit",
  matcher,
  auth: "required",
  capability: "attempt.submit",
  riskClass: "state_change",
}
```

Telemetria não pode depender de uma segunda lista manual de rotas.

Adicionar testes que detectem rota sem:

* telemetry template;
* autorização;
* classificação;
* contrato.

---

# 7. REQUEST CONTEXT

Introduzir contexto de request tipado contendo apenas dados necessários:

```ts
RequestContext {
  requestId
  correlationId
  principal
  session
  scopes
  client
  telemetry
  deadline
}
```

Evitar passagem indiscriminada de objetos gigantes.

Não incluir dados clínicos ou sensíveis em logs por padrão.

---

# 8. RATE LIMITING DISTRIBUÍDO

O rate limiter em memória poderá continuar existindo apenas como:

* fallback local;
* implementação de teste;
* ambiente single-node explícito.

Criar uma abstração:

```ts
RateLimitStore
```

Implementações:

* MemoryRateLimitStore;
* RedisRateLimitStore ou alternativa compatível;
* fake deterministic store para testes.

Suportar:

* token bucket ou sliding window;
* TTL;
* atomicidade;
* múltiplas instâncias;
* retry-after;
* fail policy explícita;
* métricas.

A chave deverá permitir composição segura por:

* principal;
* client/IP normalizado;
* rota;
* categoria de risco.

Criar classes de limite:

* public-low-risk;
* authentication;
* recovery;
* mutation;
* expensive-read;
* internal;
* AI-assisted.

Nunca usar headers de proxy como IP confiável sem configuração explícita de trusted proxies.

---

# 9. SECURITY HARDENING

Criar:

`docs/security/threat-model.md`

Use metodologia baseada em:

* assets;
* actors;
* trust boundaries;
* attack surfaces;
* STRIDE;
* abuse cases.

Analisar:

* auth bypass;
* privilege escalation;
* IDOR/BOLA;
* CSRF;
* XSS;
* injection;
* SSRF;
* open redirect;
* malicious headers;
* host header attacks;
* session fixation;
* replay;
* brute force;
* rate-limit bypass;
* request smuggling considerations;
* oversized payloads;
* unsafe serialization;
* dependency poisoning;
* malicious package scripts;
* secret leakage;
* broken RLS;
* cross-scope access;
* audit tampering.

---

# 10. AUTHENTICATION / SESSION SECURITY

Revisar completamente:

* cookie flags;
* `__Host-` guarantees;
* Secure;
* HttpOnly;
* SameSite;
* session rotation;
* revocation;
* idle timeout;
* absolute timeout;
* recovery flow;
* invitation flow;
* replay resistance;
* brute force resistance;
* token entropy.

Adicionar testes adversariais.

Não mudar comportamento funcional legítimo sem justificar.

---

# 11. AUTHORIZATION

Formalizar autorização como policy clara.

Onde possível:

```ts
authorize(principal, capability, resourceContext)
```

Toda rota protegida deverá ser explicitamente classificada.

Implementar teste automatizado:

**nenhuma rota privada pode existir sem autorização explícita.**

Criar coverage matrix:

`docs/security/authorization-matrix.md`

Exemplo:

| Route | Role | Capability | Scope | RLS | Tests |
| ----- | ---- | ---------- | ----- | --- | ----- |

---

# 12. RLS

Auditar todas as tabelas relevantes.

Validar:

* RLS enabled;
* RLS forced onde necessário;
* application role sem bypass;
* migration role separada;
* owner strategy;
* GRANTs mínimos;
* cross-scope denial;
* transaction security context;
* direct SQL bypass scenarios.

Criar testes live para:

* leitura indevida;
* escrita indevida;
* acesso cross-scope;
* ownership;
* privilege escalation;
* session context reset;
* pooled connection leakage.

---

# 13. INPUT VALIDATION

Toda entrada externa precisa ter schema.

Revisar:

* body;
* query;
* params;
* headers;
* env;
* provider responses;
* Qdrant responses;
* AI structured output.

Não confiar em TypeScript runtime.

Fail closed.

Adicionar:

* size limits;
* array limits;
* string limits;
* enum strictness;
* UUID validation;
* unknown field strategy;
* duplicate query parameter handling.

---

# 14. SSRF / OUTBOUND SECURITY

Qualquer outbound HTTP deverá ter política explícita.

Criar infraestrutura reutilizável com:

* allowed schemes;
* allowlist quando aplicável;
* DNS validation;
* private IP rejection;
* loopback rejection;
* link-local rejection;
* redirect policy;
* timeout;
* max response size;
* content type validation;
* response schema validation.

Se não houver outbound HTTP atual, crie a política e testes para futuras integrações somente se isso for proporcional e não gerar complexidade inútil.

---

# 15. SUPPLY CHAIN

Adicionar:

## GitHub Security

* CodeQL;
* dependency review;
* Dependabot ou Renovate;
* secret scanning compatible workflow;
* OSV Scanner;
* Trivy onde aplicável.

Criar workflows separados quando necessário:

```text
quality.yml
security.yml
release.yml
```

Não criar workflows redundantes.

---

# 16. PIN DE GITHUB ACTIONS

Substituir tags mutáveis como:

```yaml
actions/checkout@v4
```

por commits SHA imutáveis.

Adicionar comentário contendo a versão humana.

Exemplo:

```yaml
uses: actions/checkout@<sha> # v4.x
```

Automatizar atualização segura.

---

# 17. SBOM

Gerar SBOM no formato:

* CycloneDX;
  ou
* SPDX.

Usar ferramenta adequada como Syft, quando proporcional.

O SBOM deverá ser artefato de release.

---

# 18. PROVENANCE

Gerar metadata de build contendo:

* commit SHA;
* branch/tag;
* build timestamp;
* Node version;
* pnpm version;
* lockfile hash;
* dependency manifest hash;
* schema/migration head;
* tests summary;
* artifact digest.

Preferir mecanismos alinhados a SLSA quando possível.

---

# 19. ARTIFACT SIGNING

Quando existir artefato/container publicável:

usar assinatura via Cosign ou solução equivalente.

Nunca colocar chave privada fixa no repositório.

Preferir OIDC/keyless em CI quando suportado.

---

# 20. CONTAINERS

Se o sistema já possuir ou passar a possuir containers de produção:

* multi-stage build;
* minimal runtime;
* non-root user;
* read-only filesystem quando possível;
* dropped Linux capabilities;
* explicit healthcheck;
* pinned base image digest;
* no package manager no runtime;
* deterministic install;
* no secrets baked into image.

Adicionar scan Trivy.

Não containerizar componentes sem necessidade.

---

# 21. OBSERVABILITY — OPEN TELEMETRY

Implementar OpenTelemetry de maneira real.

Criar integração para:

* traces;
* metrics;
* structured logs correlation.

Propagar:

* traceId;
* spanId;
* correlationId;
* requestId.

Instrumentar no mínimo:

```text
HTTP request
Application use case
PostgreSQL transaction
Qdrant operation
Worker task
External integration
AI call
```

Não registrar payload clínico/sensível.

---

# 22. OTEL COLLECTOR

Adicionar configuração de referência para OpenTelemetry Collector.

Arquitetura de produção sugerida:

```text
Application
   |
   v
OTel Collector
   |
   +--> Prometheus
   +--> Tempo
   +--> Loki
```

Permitir outros exporters.

Não acoplar aplicação diretamente ao Grafana.

---

# 23. METRICS

Definir métricas mínimas:

```text
http_requests_total
http_request_duration_seconds
http_errors_total

db_query_duration_seconds
db_pool_connections
db_errors_total

worker_jobs_total
worker_job_duration_seconds
worker_retries_total
worker_dead_letters_total

qdrant_operations_total
qdrant_errors_total

rate_limit_rejections_total

auth_failures_total
authorization_denied_total

application_errors_total
```

Evitar labels de cardinalidade alta.

Nunca usar:

* userId;
* patientId;
* ticketId;
* requestId

como label de métrica.

---

# 24. TRACING

Criar spans úteis, não apenas volume.

Exemplo:

```text
HTTP POST /attempts/:id/submit
  ├─ authenticate
  ├─ authorize
  ├─ submitAttempt
  │    ├─ transaction
  │    ├─ loadAttempt
  │    ├─ enforceInvariant
  │    └─ persist
  └─ audit
```

Aplicar sampling configurável.

---

# 25. LOGGING

Logs estruturados.

Formato consistente.

Campos possíveis:

```text
timestamp
level
event
service
environment
requestId
correlationId
traceId
spanId
route
method
status
durationMs
outcome
```

Nunca logar:

* tokens;
* cookies;
* passwords;
* recovery secrets;
* clinical payloads;
* tutor/patient data;
* prompts confidenciais;
* raw AI responses com informação sensível.

Criar redaction tests.

---

# 26. SLOs

Criar:

`docs/operations/slo.md`

Definir SLOs inicialmente realistas para:

* API availability;
* latency;
* error rate;
* worker processing;
* database dependency;
* backup/restore.

Exemplo inicial, sujeito a análise:

```text
API availability >= 99.9%
p95 read latency < 500 ms
p95 mutation latency < 800 ms
5xx error rate < 0.5%
```

Não inventar números impraticáveis.

Justificar cada objetivo.

---

# 27. ALERTAS

Criar regras para:

* availability breach;
* elevated 5xx;
* latency degradation;
* DB connection saturation;
* worker backlog;
* dead letters;
* backup failure;
* restore verification failure;
* high authentication failure rate;
* rate limiting anomalies.

Evitar alert fatigue.

---

# 28. HEALTH MODEL

Separar claramente:

```text
/health/live
/health/ready
/health/dependencies
```

Regras:

* liveness não deve depender de sistemas externos;
* readiness deve refletir apenas dependências necessárias para receber tráfego;
* serviços opcionais devem produzir degraded, não necessariamente unavailable;
* endpoint detalhado não deve revelar secrets, DSNs ou topologia sensível.

Preservar o comportamento já especificado para PostgreSQL/Qdrant/AI quando correto.

---

# 29. TIMEOUTS

Toda operação externa ou potencialmente bloqueante deverá ter timeout.

Incluir:

* DB;
* Qdrant;
* HTTP;
* AI;
* worker handlers.

Propagar deadlines quando aplicável.

Não permitir operações infinitas.

---

# 30. RETRIES

Retry somente quando operação for:

* transitória;
* idempotente;
  ou
* protegida por idempotency key.

Usar:

```text
bounded exponential backoff
+
jitter
```

Nunca retry infinito.

Criar métricas.

---

# 31. CIRCUIT BREAKER

Avaliar se necessário para:

* AI provider;
* Qdrant;
* integrações externas.

Não adicionar indiscriminadamente.

Documentar decisão.

---

# 32. GRACEFUL SHUTDOWN

API e worker deverão:

1. receber SIGTERM;
2. parar de aceitar novo trabalho;
3. finalizar trabalho em andamento dentro de timeout;
4. fechar pool DB;
5. flush telemetry;
6. liberar leases;
7. sair com código adequado.

Adicionar testes.

---

# 33. WORKER RESILIENCE

Revisar worker para:

* idempotência;
* at-least-once;
* duplicate delivery;
* retry;
* dead-letter;
* lease;
* visibility timeout;
* crash recovery;
* poison messages;
* reconciliation.

Criar matriz de falhas.

---

# 34. QDRANT

Preservar princípio:

`PostgreSQL = source of truth`

`Qdrant = derived index`

Garantir:

* rebuild;
* reconcile;
* orphan cleanup;
* versioning;
* stale detection;
* failure isolation;
* readiness semantics corretas.

Qdrant nunca pode decidir estado transacional.

---

# 35. IA

A IA deverá continuar:

* assistiva;
* server-side;
* structured-output;
* desligável.

Nunca permitir IA decidir automaticamente:

* nota;
* gabarito;
* publicação;
* aprovação clínica;
* papel;
* permissão;
* autonomia;
* estado transacional crítico.

Adicionar proteção contra:

* prompt injection;
* provider errors;
* malformed output;
* timeout;
* oversized output;
* unsupported schema;
* sensitive-data leakage.

---

# 36. DATABASE RESILIENCE

Adicionar testes para:

* transaction rollback;
* deadlock retry;
* serialization conflicts quando aplicável;
* connection exhaustion;
* unavailable DB;
* slow DB;
* stale connections;
* failed migrations.

---

# 37. MIGRATION GOVERNANCE

Manter migrations:

* append-only;
* ordered;
* immutable depois de aplicadas;
* reviewed.

Adicionar verificador contra:

* alteração de migration histórica;
* migration fora de sequência;
* destructive change não documentado;
* falta de rollback/forward strategy quando pertinente.

---

# 38. BACKUP E RESTORE

Melhorar testes já existentes.

Cobrir:

* criação de backup;
* restore isolado;
* integrity verification;
* migration compatibility;
* data consistency checks.

Registrar:

* RPO;
* RTO;
* restore duration.

Não usar dados reais.

---

# 39. DISASTER RECOVERY

Criar:

`docs/operations/disaster-recovery.md`

Incluir:

* perda de DB;
* corrupção;
* perda de Qdrant;
* worker failure;
* bad deploy;
* compromised credential;
* provider outage.

Para cada cenário:

```text
Detection
Containment
Recovery
Verification
Post-incident
```

---

# 40. FAULT INJECTION

Criar camada de fault injection apenas em testes.

Cobrir:

* PostgreSQL unavailable;
* latency;
* timeout;
* Qdrant down;
* Qdrant slow;
* AI unavailable;
* invalid provider response;
* worker crash;
* duplicate message;
* telemetry collector unavailable.

Nunca permitir fault injection ativa em produção.

---

# 41. CONCURRENCY TESTING

Adicionar testes para invariantes críticas:

* simultaneous submit;
* double finalize;
* duplicate invitation acceptance;
* concurrent state transition;
* competing workers;
* replay;
* idempotency conflict.

Preferir barreiras determinísticas em teste, não sleeps frágeis.

---

# 42. LOAD TESTING

Criar baseline com ferramenta apropriada como:

* k6;
* autocannon;
  ou equivalente.

Cenários:

* read-heavy;
* mutation;
* authentication;
* dashboard;
* attempt submission;
* mixed traffic.

Registrar:

* throughput;
* p50;
* p95;
* p99;
* error rate;
* CPU;
* memory;
* DB saturation.

Não transformar load test em CI obrigatório pesado.

Criar perfil separado.

---

# 43. TEST PYRAMID

Manter e fortalecer:

```text
unit
application
domain
contract
integration
live integration
security
worker
E2E
load
chaos/fault
```

Evitar duplicação excessiva.

---

# 44. TESTES DE SEGURANÇA

Criar suites dedicadas para:

* authorization bypass;
* cross-scope access;
* RLS;
* CSRF;
* malformed input;
* oversized input;
* request replay;
* rate-limit bypass;
* session abuse;
* header injection;
* open redirect;
* SSRF quando aplicável.

---

# 45. MUTATION TESTING

Avaliar mutation testing nas áreas mais críticas.

Não aplicar ao monorepo inteiro se custo for exagerado.

Priorizar:

* authorization;
* state machines;
* grading invariants;
* session;
* RLS wrappers;
* transitions.

Documentar mutation score.

---

# 46. PROPERTY-BASED TESTING

Usar property-based tests onde houver ganho real.

Exemplos:

* state transitions;
* parsers;
* permission combinations;
* idempotency;
* rate limiting;
* domain invariants.

---

# 47. API CONTRACTS

Garantir que contratos sejam versionados.

Validar:

* request schema;
* response schema;
* error schema;
* backwards compatibility.

Gerar OpenAPI se isso puder ser derivado sem duplicar manualmente contratos.

Preferir geração automática a manutenção paralela.

---

# 48. ERROR MODEL

Padronizar erros.

Separar:

* validation;
* unauthenticated;
* forbidden;
* not found;
* conflict;
* idempotency conflict;
* rate limit;
* dependency unavailable;
* internal.

Nunca vazar stacktrace na API.

---

# 49. IDEMPOTENCY

Mutations críticas devem ter estratégia explícita.

Especialmente:

* invitations;
* recovery;
* submit;
* finalize;
* transitions;
* external side effects.

Criar idempotency store quando necessário.

---

# 50. CODE QUALITY

Configurar regras contra:

* cyclomatic complexity excessiva;
* arquivos gigantes;
* funções gigantes;
* implicit any;
* unsafe casts;
* floating promises;
* ignored errors;
* unreachable branches;
* circular dependencies.

Não usar métricas rígidas sem exceção.

Criar budget de complexidade.

---

# 51. FILE SIZE BUDGET

Criar política gradual para impedir novo God Module.

Sugestão inicial:

* warning acima de ~500 linhas;
* review obrigatório acima de ~800;
* exceção documentada para generated files.

Não quebrar build apenas pela existência de dívida histórica durante a migração.

O `http.ts` deve ser reduzido progressivamente até não ser mais hotspot.

---

# 52. CIRCULAR DEPENDENCIES

Adicionar detector.

Build deverá falhar se ciclos arquiteturais proibidos forem introduzidos.

---

# 53. DEAD CODE

Adicionar detecção de:

* exports não usados;
* dependencies não usadas;
* files orphan.

Ferramentas como Knip podem ser usadas.

Manter allowlist explícita para entrypoints.

---

# 54. PACKAGE BOUNDARIES

Fortalecer `architecture-boundaries.json`.

Além de imports, validar:

* package dependency graph;
* no hidden runtime coupling;
* public exports;
* allowed directions.

Gerar diagrama automaticamente.

---

# 55. DOCUMENTAÇÃO DE ARQUITETURA

Criar/atualizar:

```text
docs/architecture/
  system-context.md
  container-view.md
  component-view.md
  dependency-rules.md
  data-flow.md
  trust-boundaries.md
```

Pode usar Mermaid.

Manter documentação próxima do runtime real.

---

# 56. ADRs

Criar ADRs somente para decisões importantes.

Exemplos:

```text
ADR-001 modular-monolith
ADR-002 distributed-rate-limit
ADR-003 observability-otel
ADR-004 release-provenance
ADR-005 resilience-policy
```

Não burocratizar decisões triviais.

---

# 57. RUNTIME STATE

Reduzir `docs/99_runtime_state.md` para estado corrente.

Mover histórico detalhado para:

```text
docs/runtime-history/
```

ou usar:

`docs/20_master_execution_log.md`

O runtime state deverá ter apenas:

```text
current phase
current sprint
current task
status
last completed action
next action
blockers
human decision
current evidence
timestamp
```

Não destruir histórico existente.

Migrar preservando informação.

---

# 58. RELEASE EVIDENCE BUNDLE

Criar bundle por release.

Exemplo:

```text
release-evidence/
  manifest.json
  commit.txt
  sbom.json
  provenance.json
  test-summary.json
  coverage-summary.json
  security-summary.json
  migration-head.txt
  artifact-digests.txt
```

Todo artefato precisa ser rastreável até o commit.

---

# 59. RELEASE GATE

Uma release só poderá ser classificada como candidata se:

```text
format              PASS
lint                PASS
typecheck           PASS
architecture        PASS
unit                PASS
contract            PASS
integration         PASS
live DB             PASS
RLS                 PASS
worker              PASS
E2E                 PASS
security            PASS
dependency scan     PASS
secret scan         PASS
SBOM                 GENERATED
provenance          GENERATED
build               PASS
evidence bundle     GENERATED
```

Os gates clínicos/humanos permanecem separados e obrigatórios quando aplicáveis.

---

# 60. BRANCH PROTECTION

Documentar configuração recomendada de GitHub:

* no direct push to main;
* pull request required;
* required checks;
* required approval;
* stale approval dismissal;
* conversation resolution;
* linear history;
* squash merge;
* branch up-to-date;
* CODEOWNERS.

Não altere configurações remotas automaticamente se não houver autorização.

---

# 61. CODEOWNERS

Adicionar arquivo sugerindo ownership por camada.

Exemplo:

```text
/packages/domain/          @owner
/packages/application/     @owner
/packages/persistence/     @owner
/apps/api/                 @owner
/.github/                  @owner
```

Use owners reais somente se estiverem disponíveis no repositório.

Não invente usuários GitHub.

---

# 62. SECURITY.md

Criar:

`SECURITY.md`

Incluindo:

* supported versions;
* vulnerability disclosure;
* security expectations;
* secret handling;
* dependency policy.

---

# 63. CONTRIBUTING.md

Criar guia curto com:

* setup;
* architecture;
* test commands;
* migration rules;
* PR checklist;
* security expectations.

Não duplicar `AGENTS.md`.

---

# 64. RUNBOOKS

Criar runbooks:

```text
docs/runbooks/
  api-down.md
  database-down.md
  qdrant-down.md
  worker-backlog.md
  restore-database.md
  failed-deploy.md
  compromised-secret.md
```

Cada runbook:

```text
Symptoms
Detection
Immediate action
Diagnosis
Recovery
Verification
Escalation
```

---

# 65. PERFORMANCE

Fazer profiling antes de otimizar.

Investigar:

* DB N+1;
* excessive allocations;
* serialized work;
* expensive validation;
* Qdrant calls;
* worker throughput;
* frontend bundles.

Não otimizar cegamente.

---

# 66. FRONTEND

Auditar web para:

* accessibility;
* loading states;
* error states;
* empty states;
* keyboard navigation;
* semantic HTML;
* color contrast;
* responsive behavior;
* API error handling;
* no authorization assumptions client-side.

Manter `axe` e Playwright.

Adicionar accessibility gate para jornadas críticas.

---

# 67. FRONTEND SECURITY

Garantir:

* no secrets client-side;
* no internal fields;
* no hidden authorization assumptions;
* safe rendering;
* CSP strategy;
* clickjacking protection;
* referrer policy;
* MIME sniff protection.

---

# 68. SECURITY HEADERS

Avaliar e implementar:

```text
Content-Security-Policy
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
frame-ancestors
Strict-Transport-Security
```

HSTS apenas quando HTTPS de produção estiver garantido.

---

# 69. DATA PRIVACY

Mapear classes de dados.

Criar:

`docs/security/data-classification.md`

Classes possíveis:

* public;
* internal;
* confidential;
* sensitive;
* clinical/personal.

Definir:

* logging;
* storage;
* retention;
* access;
* redaction.

---

# 70. AUDIT TRAIL

Garantir que audit trail seja:

* append-oriented;
* timestamped;
* actor aware;
* scope aware;
* action aware;
* outcome aware.

Evitar registrar conteúdo sensível completo.

Avaliar tamper evidence.

---

# 71. CLOCK

Centralizar clock para regras de domínio testáveis quando tempo for relevante.

Evitar `Date.now()` espalhado em domínio/application.

Usar interface:

```ts
Clock.now()
```

onde houver benefício.

---

# 72. UUID / RANDOMNESS

Centralizar geração de IDs quando necessário para testes determinísticos.

Usar crypto-secure randomness para tokens.

Nunca Math.random para security tokens.

---

# 73. CONFIGURATION

Toda configuração deverá:

* ser validada no startup;
* falhar cedo;
* possuir defaults somente quando seguros;
* distinguir dev/test/prod.

Nunca silently fallback para configuração insegura.

---

# 74. SECRETS

Nunca:

* commit;
* log;
* expose;
* include in artifact.

Criar/fortalecer secret scan.

`.env.example` deve conter apenas placeholders seguros.

---

# 75. QUALITY SCORECARD

Criar:

`docs/quality/scorecard.md`

Com notas verificáveis:

| Domain          | Target | Evidence        |
| --------------- | -----: | --------------- |
| Architecture    |     97 | tests/docs      |
| Engineering     |     97 | CI              |
| Security        |     95 | scans/tests     |
| Operations      |     95 | OTel/resilience |
| Testing         |     97 | suites          |
| Documentation   |     97 | gates           |
| Maintainability |     95 | complexity      |
| Release         |     95 | provenance      |

Não atribuir 100 sem evidência extraordinária.

---

# 76. EXECUTION STRATEGY

Execute em fases.

---

# PHASE 0 — BASELINE

Objetivo:

congelar estado real.

Entregas:

* audit;
* architecture graph;
* test baseline;
* coverage;
* dependency baseline;
* security baseline;
* current hotspots;
* current CI status.

Gate:

nenhuma implementação antes do baseline.

---

# PHASE 1 — API MODULARIZATION

Objetivo:

remover God Module.

Entregas:

* route registry;
* middleware;
* feature modules;
* request context;
* modular handlers.

Critério:

`http.ts` deixa de ser centralizador gigante.

Não perseguir tamanho zero artificialmente.

---

# PHASE 2 — SECURITY ENGINEERING

Objetivo:

hardening completo.

Inclui:

* threat model;
* auth;
* authorization;
* CSRF;
* RLS;
* rate limit;
* session;
* validation;
* SSRF policy;
* adversarial tests.

Gate:

nenhum P0/P1.

---

# PHASE 3 — SUPPLY CHAIN

Objetivo:

proteger build e dependências.

Inclui:

* CodeQL;
* OSV;
* dependency review;
* SBOM;
* SHA-pinned Actions;
* container scanning;
* provenance.

---

# PHASE 4 — OBSERVABILITY

Objetivo:

traces + metrics + logs reais.

Inclui:

* OTel;
* collector;
* dashboards definitions;
* SLO;
* alerts;
* correlation.

---

# PHASE 5 — RESILIENCE

Objetivo:

tornar runtime tolerante a falhas.

Inclui:

* timeout;
* retry;
* graceful shutdown;
* worker reliability;
* DB failure;
* Qdrant failure;
* AI failure.

---

# PHASE 6 — CHAOS / CONCURRENCY / LOAD

Objetivo:

provar comportamento sob stress.

Inclui:

* fault injection;
* concurrency;
* race conditions;
* load baseline.

---

# PHASE 7 — RELEASE ENGINEERING

Objetivo:

release reproduzível.

Inclui:

* evidence bundle;
* SBOM;
* digest;
* provenance;
* signing quando aplicável;
* release gate.

---

# PHASE 8 — DOCUMENTATION & OPERATIONS

Objetivo:

alinhar documentação e runtime.

Inclui:

* architecture docs;
* ADR;
* runbooks;
* DR;
* data classification;
* runtime state cleanup.

---

# PHASE 9 — INDEPENDENT FINAL AUDIT

Faça uma nova auditoria completa como se você não tivesse participado da implementação.

Procure especificamente por:

* falsa sensação de segurança;
* mocks excessivos;
* testes que testam implementação;
* gaps produção/local;
* flaky tests;
* hidden coupling;
* missing authorization;
* excessive privileges;
* instrumentation gaps;
* race conditions;
* stale docs;
* unverified claims.

---

# 77. TDD

Toda alteração comportamental deverá seguir:

`RED → GREEN → REFACTOR`

Registre evidência quando pertinente.

Não escreva teste inútil apenas para cobertura.

---

# 78. COVERAGE

Manter mínimo atual >= 80%.

Objetivo pós-modernização:

```text
Statements >= 90%
Branches >= 85%
Functions >= 90%
Lines >= 90%
```

Para invariantes críticas:

cobertura de decisão próxima de 100%.

Não manipular cobertura excluindo código importante.

---

# 79. CRITICAL PATH COVERAGE

Mapear caminhos críticos:

* login/session;
* invitation;
* recovery;
* authorization;
* attempt;
* diagnostic;
* finalize;
* grading/correction;
* publication;
* RLS;
* audit.

Cada um precisa de:

* happy path;
* invalid input;
* unauthenticated;
* unauthorized;
* wrong scope;
* duplicate/replay;
* dependency failure.

---

# 80. COMMANDS OBRIGATÓRIOS

Ao final de cada fase relevante executar, conforme aplicável:

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

Também executar os novos gates criados.

---

# 81. NÃO FALSEAR EVIDÊNCIA

Nunca dizer:

* production ready;
* fully secure;
* 100%;
* zero risk;
* disaster recovery proven;
* high availability proven;

sem evidência real.

Diferenciar explicitamente:

```text
unit evidence
synthetic evidence
local live evidence
CI evidence
staging evidence
production evidence
```

---

# 82. NÃO IGNORAR SKIPS

Todo teste skipped deve ser classificado:

* expected;
* environmental;
* blocker;
* technical debt.

Criar inventário.

Nenhum skip crítico oculto.

---

# 83. NÃO INTRODUZIR OVERENGINEERING

Evitar:

* Kubernetes sem necessidade;
* Kafka sem necessidade;
* service mesh sem necessidade;
* event sourcing sem necessidade;
* CQRS por moda;
* microservices por estética;
* GraphQL sem benefício;
* abstrações sem consumidor.

Toda nova complexidade deve resolver risco real.

---

# 84. PERFORMANCE BUDGETS

Definir budgets apenas após baseline.

Exemplo:

* API startup;
* memory idle;
* p95 latency;
* bundle size;
* worker throughput.

Não estabelecer números arbitrários.

---

# 85. DEPENDENCY POLICY

Evitar dependências para problemas triviais.

Toda dependência nova deve justificar:

* necessidade;
* manutenção;
* licença;
* security posture;
* bundle/runtime impact.

---

# 86. COMPATIBILITY

Preservar versões atuais de:

* Node;
* pnpm;
* PostgreSQL;
* Qdrant;

salvo justificativa explícita.

Não fazer upgrades em massa sem relação com o objetivo.

---

# 87. COMMITS

Faça commits pequenos e coerentes quando o ambiente permitir.

Exemplo:

```text
refactor(api): introduce typed route registry
refactor(api): extract diagnostics feature
feat(security): add distributed rate limit port
test(security): cover cross-scope authorization
feat(observability): instrument application spans
ci(security): add codeql and dependency review
```

Não misturar 30 assuntos em um commit.

---

# 88. TRACEABILITY

Toda mudança significativa deverá ligar:

```text
Finding
→ Requirement
→ Design
→ Code
→ Test
→ Evidence
→ Audit
```

Atualizar manifesto de rastreabilidade existente.

---

# 89. BACKLOG

Criar itens concretos.

Formato:

```text
ID
Priority
Risk
Scope
Files
Acceptance Criteria
Tests
Evidence
Status
```

---

# 90. ACCEPTANCE CRITERIA

A modernização somente poderá ser marcada COMPLETED quando:

### Architecture

* [ ] God Module removido ou drasticamente reduzido;
* [ ] route registry único;
* [ ] bounded features claras;
* [ ] dependency rules executáveis;
* [ ] zero ciclo arquitetural proibido.

### Security

* [ ] threat model;
* [ ] authorization matrix;
* [ ] cross-scope tests;
* [ ] RLS tests;
* [ ] distributed rate limit;
* [ ] security headers;
* [ ] input validation;
* [ ] no P0/P1;
* [ ] supply-chain scans.

### Testing

* [ ] coverage goals;
* [ ] E2E;
* [ ] live DB;
* [ ] security;
* [ ] concurrency;
* [ ] fault tests.

### Observability

* [ ] OTel;
* [ ] tracing;
* [ ] metrics;
* [ ] structured logs;
* [ ] SLO;
* [ ] alerts;
* [ ] runbooks.

### Operations

* [ ] graceful shutdown;
* [ ] timeouts;
* [ ] retries;
* [ ] recovery;
* [ ] backup;
* [ ] restore;
* [ ] DR plan;
* [ ] failure evidence.

### Supply Chain

* [ ] SHA-pinned Actions;
* [ ] CodeQL;
* [ ] dependency review;
* [ ] OSV/Trivy;
* [ ] SBOM;
* [ ] provenance;
* [ ] artifact digest.

### Release

* [ ] release evidence bundle;
* [ ] reproducible commands;
* [ ] complete CI;
* [ ] documented blockers;
* [ ] no false production claims.

---

# 91. FINAL AUDIT FORMAT

Produzir:

`docs/audits/state-of-art-final-audit.md`

Com seções:

1. Executive Summary
2. Architecture
3. Domain
4. API
5. Persistence
6. Security
7. Authorization
8. RLS
9. Supply Chain
10. Testing
11. CI/CD
12. Observability
13. Resilience
14. Worker
15. Qdrant
16. AI Governance
17. Performance
18. Accessibility
19. Documentation
20. Release Engineering
21. Production Readiness
22. Residual Risks
23. Evidence
24. Scores
25. Final Verdict

---

# 92. SCORE FINAL

Atribua notas de 0–100 para:

```text
Architecture
Modularity
Domain
Application Layer
Contracts
API
Persistence
Security
Authorization
RLS
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

Depois calcular:

```text
AAA Engineering
AAA Security
AAA Operations
```

---

# 93. DEFINIÇÃO DE STATE OF ART

Somente considerar o repositório `State of Art / Triplo AAA` se:

```text
AAA Engineering >= 97
AAA Security >= 95
AAA Operations >= 95
```

e:

```text
P0 = 0
P1 = 0
```

e todos os gates obrigatórios estiverem verdes.

Se não atingir:

**NÃO falsear a nota.**

Produza backlog residual exato.

---

# 94. PRODUCTION CLAIM

Mesmo que o score técnico atinja 95+:

não declare produção validada se faltarem:

* deployment real;
* secrets reais configurados;
* ACLs reais;
* infrastructure verification;
* staging/production telemetry;
* backup real;
* restore real;
* production traffic evidence;
* clinical approval quando aplicável.

Use a classificação correta:

```text
TECHNICALLY VERIFIED
VERIFIED CANDIDATE
STAGING READY
PRODUCTION CANDIDATE
PRODUCTION VERIFIED
```

conforme evidência real.

---

# 95. REGRA CLÍNICA

Nenhuma modernização técnica pode:

* publicar conteúdo clínico sem gate;
* alterar gabarito silenciosamente;
* atribuir competência clínica automaticamente;
* permitir IA aprovar conteúdo;
* transformar avaliação técnica em decisão clínica.

A decisão clínica permanece humana.

---

# 96. REGRA DE DADOS

Nunca utilizar em testes:

* prontuário real;
* tutor real;
* paciente real;
* foto real;
* documento privado;
* PDF clínico privado;
* dados pessoais reais.

Usar fixtures sintéticas.

---

# 97. INDEPENDENT VERIFICATION

Após a implementação, execute uma segunda passada assumindo papel de adversarial reviewer.

Tente provar que o sistema NÃO merece AAA.

Procure:

* auth bypass;
* forgotten routes;
* test gaps;
* flaky behavior;
* local-only assumptions;
* multi-instance issues;
* logging leaks;
* broken RLS;
* race conditions;
* missing deadlines;
* unbounded retries;
* silent fallbacks;
* production claims sem prova.

Somente aceite AAA se essa revisão também passar.

---

# 98. RESULTADO ESPERADO

Ao final, quero receber um sistema que seja claramente superior ao estado inicial em:

```text
Architecture
Security
Reliability
Observability
Testing
Maintainability
Traceability
Operations
Release Engineering
Supply Chain
```

sem perder simplicidade arquitetural.

---

# 99. PRIORIDADE DE ENGENHARIA

Quando houver conflito:

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

Nunca sacrificar segurança ou integridade de dados por velocidade de implementação.

---

# 100. INÍCIO DA EXECUÇÃO

Comece agora.

Primeiro:

1. leia `AGENTS.md`;
2. leia o runtime state;
3. leia o backlog e log;
4. rode os gates existentes;
5. produza `0001_baseline_audit.md`;
6. crie roadmap da modernização;
7. crie backlog por fases;
8. execute Phase 1 em TDD;
9. não pule fases;
10. ao final de cada phase, faça auditoria e atualize runtime state.

Não pare em planejamento.

Prossiga até implementar todas as melhorias que puder ser implementadas com segurança dentro do repositório.

Se houver um blocker externo verdadeiro, registre:

* causa;
* impacto;
* evidência;
* ação necessária;
* trabalho que ainda pode continuar independentemente do blocker.

Nunca transforme ausência de infraestrutura externa em desculpa para não concluir as partes verificáveis localmente.

O objetivo final é levar o `cvg-trainee-vet` de um **Advanced Production Candidate** para um:

# STATE OF ART / TRIPLO AAA

com engenharia comprovada por código, testes, segurança, operação, rastreabilidade e evidência — não apenas por documentação.

---

# Resultado esperado (instrução de entrega do solicitante)

Me entregue um programa State of Art, Triplo AAA de qualidade.
