# CODEX MASTER PROMPT — TRIPLE AAA MACHINE-VERIFIABLE VERDICT (§125) (cópia arquivada)

> Continuação do prompt de promoção (`docs/50_codex_master_prompt_final_state_of_art_closure.md`), fornecida pelo usuário em 2026-09-11 e arquivada conforme solicitado ("acrescente esse restante de prompt ao sua tarefa" + "salve os prompt na pasta docs").
> Arquivo: `docs/51_codex_master_prompt_triple_aaa_verdict_machine.md`.
> Implementação: `scripts/verify-triple-aaa.mjs` (`pnpm verify:triple-aaa`), evidência em `release-evidence/triple-aaa-verdict.json`, auditoria em `docs/audits/state-of-art-final-audit-v6.*`.

---

# 125. EXPECTED SUCCESS STATE — MACHINE VERIFIABLE

O sucesso final NÃO pode ser determinado por texto livre, interpretação do agente, Markdown, scorecard narrativo ou declaração manual.

A única fonte autorizada para promoção será um artefato machine-readable validado por um gate fail-closed.

Criar:

```text
release-evidence/triple-aaa-verdict.json
```

Schema lógico obrigatório:

```json
{
  "schema_version": 1,
  "candidate_sha": "<40 lowercase hexadecimal characters>",
  "generated_at": "<ISO-8601 UTC timestamp>",

  "remote": {
    "quality": {
      "status": "PASS",
      "sha": "<candidate_sha>",
      "run_id": 1
    },
    "security": {
      "status": "PASS",
      "sha": "<candidate_sha>",
      "run_id": 1
    },
    "candidate": {
      "status": "PASS",
      "sha": "<candidate_sha>",
      "run_id": 1
    },
    "same_sha": true
  },

  "coverage": {
    "statements": 0.0,
    "branches": 0.0,
    "functions": 0.0,
    "lines": 0.0,
    "status": "PASS"
  },

  "mutation": {
    "adjusted_critical_score": 0.0,
    "critical_real_survivors": 0,
    "status": "PASS"
  },

  "assurance": {
    "rls_live": "PASS",
    "redis_candidate": "PASS",
    "staging": "PASS",
    "supply_chain": "PASS",
    "release_evidence": "PASS",
    "independent_review": "PASS"
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

  "verdict": "PASS",
  "readiness": "STAGING_VERIFIED"
}
```

---

# 125.1 — SOURCE-OF-TRUTH RULE

`triple-aaa-verdict.json` NÃO pode receber resultados fornecidos manualmente.

Cada campo deverá ser derivado de artefato anterior verificável
(coverage-final.json → coverage-summary.json → verdict;
mutation results → mutation-summary.json → verdict;
GitHub API autenticada → remote-ci-summary.json → verdict;
RLS live execution → rls-live-summary.json → verdict).

Nenhum campo crítico pode ser obtido de Markdown.

---

# 125.2 — REQUIRED ARTIFACTS

Antes de calcular o verdict, exigir:

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
state-of-art-final-audit-v6.json
```

Se qualquer arquivo obrigatório estiver ausente: `VERDICT = REVISE`, `EXIT CODE != 0`.

---

# 125.3 — CANDIDATE SHA VALIDATION

`candidate_sha` deve satisfazer `^[0-9a-f]{40}$` e ser igual a
`git rev-parse FINAL_CANDIDATE_SHA` quando executado no candidate checkout.

---

# 125.4 — SAME-SHA INVARIANT

```text
candidate_sha == remote.quality.sha == remote.security.sha
== remote.candidate.sha == coverage_summary.sha == mutation_summary.sha
== rls_summary.sha == redis_summary.sha == staging_summary.sha
== sbom/provenance source SHA
```

Exceção: artefatos docs-only descendentes aceitos somente pela freshness
rule (ancestor + runtime diff vazio). Qualquer outra divergência:
`same_sha = false`, `VERDICT = REVISE`.

---

# 125.5 — REMOTE CI INVARIANT

`remote.quality/security/candidate.status == PASS`, `remote.same_sha == true`,
`run_id > 0` para os três. `missing/unknown/pending/skipped/cancelled/
neutral/timed_out/failure` NÃO contam como PASS.

---

# 125.6 — COVERAGE INVARIANT

`statements >= 90.0`, `branches >= 85.0`, `functions >= 90.0`,
`lines >= 90.0` e `coverage.status == PASS`. Hardening preferencial
91/86/92/91 (não substitui o piso).

---

# 125.7 — MUTATION INVARIANT

`adjusted_critical_score >= 90.0`, `critical_real_survivors == 0`,
`mutation.status == PASS` (preferencial ≥ 95). Equivalentes exigem evidence.

---

# 125.8 — SECURITY INVARIANT

`security_summary.high == 0`, `critical == 0`, `secret_scan == PASS`,
`CodeQL == PASS`, `OSV == PASS`, `dependency_review == PASS`.
Scanner obrigatório sem execução: REVISE (ausência ≠ zero findings).

---

# 125.9 — RLS INVARIANT

`rls_live.status == PASS`, `failed == 0`, mais:
`cross_scope_read_denied`, `cross_scope_write_denied`, `anonymous_denied`,
`service_identity_constrained`, `pool_context_isolated`, `force_rls_verified`,
`bypassrls_absent`, `superuser_absent` — todos true.

---

# 125.10 — REDIS INVARIANT

`redis_candidate.status == PASS`, `backend == redis|valkey`,
`api_instances >= 2`, `shared_budget/atomicity/timeout/restart/reconnect/
trusted_proxy/spoof_rejection/critical_fail_closed == PASS`. Memory não satisfaz.

---

# 125.11 — STAGING INVARIANT

`staging.status == PASS` com `postgres/redis/api_instances>=2/worker/
qdrant/web/tls/otel_collector/browser_journey/fault_drills == PASS`.

---

# 125.12 — LOAD INVARIANT

`load.failed_checks == 0`, `load.http_5xx == 0`, respeitando o regression
budget; sem baseline válido, não inventar comparação.

---

# 125.13 — RESTORE INVARIANT

`restore.status == PASS`, `restore.integrity_verified == true`; RTO
numérico sem threshold inventado.

---

# 125.14 — SUPPLY-CHAIN INVARIANT

SBOM válido, provenance válida, digests válidos, Actions pinadas, lockfile,
security workflow PASS. SBOM vazio: FAIL.

---

# 125.15 — EVIDENCE-INTEGRITY INVARIANT

Digests, existência, JSON, schemas, freshness. Edição manual posterior
invalida o bundle.

---

# 125.16 — FINDINGS INVARIANT

P0 == 0, P1 == 0. P2 com id/finding/impact/owner/mitigation/validation/
accepted_risk. P2 material não aceito: REVISE.

---

# 125.17 — SCORE INVARIANT

engineering >= 97, security >= 95, operations >= 95, calculados pelo
algoritmo documentado — nunca digitados no verdict.

---

# 125.18 — INDEPENDENT REVIEW INVARIANT

`independent_review == PASS` apontando para o candidate_sha (review de SHA
anterior inválido).

---

# 125.19 — VERDICT BOOLEAN

Todas as condições (REMOTE/SAME_SHA/COVERAGE/MUTATION/SECURITY/RLS/REDIS/
STAGING/SUPPLY_CHAIN/RELEASE_EVIDENCE/INDEPENDENT_REVIEW/P0/P1/scores) com
AND. Nenhuma opcional.

---

# 125.20 — VERDICT DERIVATION

Calculado, nunca manual: P0/P1 ou garantia fundamental quebrada → FAIL;
todas as invariantes true → PASS; senão REVISE.

---

# 125.21 — READINESS DERIVATION

Calculada: production evidence completa → PRODUCTION_VERIFIED; senão
candidate requirements → PRODUCTION_CANDIDATE; senão staging →
STAGING_VERIFIED; senão TECHNICALLY_VERIFIED. Sem readiness manual.

---

# 125.22 — FINAL VERIFIER

`pnpm verify:triple-aaa`: carregar artefatos, validar schemas/SHA/
freshness/digests, calcular invariantes/scores/verdict/readiness,
escrever `triple-aaa-verdict.json`.

---

# 125.23 — EXIT CODES

PASS → 0; REVISE/FAIL → != 0. Promoção só com exit 0.

---

# 125.24 — HUMAN-READABLE OUTPUT

Imprimir o quadro §124 como renderização do JSON (não segunda fonte).

---

# 125.25 — NEGATIVE SELF-TESTS

14 cenários (coverage 84.99, mutation 89.99, survivors 1, P1 1, SHAs
divergentes, security pending, backend memory, pool false, SBOM missing,
digest mismatch, staging unknown, review REVISE, eng 96, ops 94) —
cada um: exit != 0, verdict != PASS.

---

# 125.26 — POSITIVE SELF-TEST

Fixture sintética com tudo satisfeito → exit 0, PASS, marcada
`synthetic_verifier_test = true` (nunca evidence real).

---

# 125.27 — ANTI-FORGERY RULE

Rejeitar evidence marcada fixture/synthetic/example/mock/self-test em
modo de certificação real.

---

# 125.28 — CI PROMOTION

Último step de `candidate.yml`: `pnpm verify:triple-aaa`. Nada de
publicação antes dele.

---

# 125.29 — SUCCESS CONDITION

`verify:triple-aaa` exit 0 + `verdict == PASS` + `readiness ==
STAGING_VERIFIED` com invariantes por evidence real e fresh.

---

# 125.30 — EXPECTED SUCCESS STATE

Estado final mecanicamente verificável (§125.30): exit 0, verdict PASS,
scores, P0/P1 zero, same_sha true, tudo PASS. Só então STATE OF ART —
VERIFIED / TRIPLE AAA — PASS / STAGING VERIFIED. Nunca antecipar.
