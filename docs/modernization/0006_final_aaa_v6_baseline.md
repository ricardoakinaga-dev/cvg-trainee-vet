# 0006 — Final AAA V6 Baseline (2026-09-11, HEAD `14b97a8`)

Prompt: `docs/50_codex_master_prompt_final_state_of_art_closure.md` (§4) +
`docs/51_codex_master_prompt_triple_aaa_verdict_machine.md` (§125).
Runtime local Node v24.20.0/pnpm 10.33.0; contrato CI Node 22.22.0/pnpm
10.33.0. Origem `2dd6760`; 8 commits locais à frente (push/tag pendem de
aprovação humana + token).

## HEAD

- HEAD: `14b97a8b7e257b49ffc6fbf97ea3e46a9b842e39` (main; inclui fix
  review-driven `4184132` em `authorization.ts` + adapter fail-closed)

## Coverage (`coverage/coverage-summary.json`, run 14:43 no tree do HEAD)

- Statements 91.56% · Branches 86.10% · Functions 95.94% · Lines 92.17%
- Piso 90/85/90/90: PASS; hardening 91/86/92/91: PASS
- Bundle carrega envelope `cvg-coverage-summary/v1` (§125.4/§125.6)

## Mutation (`reports/mutation-summary.json`, sha `14b97a8` fresh)

- 6 escopos / 1139 mutantes: authorization 219, session 129, attempt 99,
  recovery 182, rate-limit 365, worker loop 145
- Raw 84.28% · Adjusted 98.84% · real survivors 0 → PASS (ideal ≥95)

## P0 / P1 / P2

- P0 = 0 · P1 = 0 (reviewer independente fresh + adversarial §71)
- P2 = 5: RF-02 + RF-09 materiais abertos (bloqueiam promoção);
  RF-03R/RF-04/RF-07 aceitos com plano. P3 = 1 (RF-AT)

## Same-SHA status

- Local: verifier autenticado + candidate leg + self-run + polling bounded
  + summary v2 (mecanismo PASS, self-tests 18/18)
- Remoto no HEAD: sem runs (quality/security/candidate) → FAIL honesto;
  prova parcial no SHA publicado anterior (verify+lives verdes)

## Quality / security / candidate (remoto)

- quality/security/candidate no HEAD: sem runs (sem token local) → RF-02
- security local: OSV 0, `pnpm audit` 0, secrets limpo, SBOM 492 válido;
  writer v2 fail-closed sem token (nunca infere PASS remoto)

## Redis candidate

- `release-evidence/redis-candidate-summary.json` PASS (sha `14b97a8`
  fresh; Redis 8.10.1 efetivo + backend explícito fail-closed no boot)

## RLS live

- 7/7 PASS + 8 invariantes machine (sha `14b97a8` fresh)

## Staging

- `staging-summary.json` PASS (sha `14b97a8` fresh; stack + browser 6
  jornadas + cross-scope + 5 drills + k6 p95 ~13ms + 3017 traces)

## Release evidence

- Bundle 18 artefatos regenerado no HEAD; strict validator: só 2 falhas
  (security-summary stale de `15ed926`, remote-ci FAIL) — ambas RF-02

## Verifier `verify:triple-aaa`

- 18/18 self-tests; anti-forgery restrito a claims (fix SBOM falso-positivo);
  no HEAD: REVISE sem fatal, 8 causas abertas (remoto/same-SHA, scores,
  RF-02/09, security-summary)

## Scores de partida (audit v6)

- Eng 94.0 / Sec 95.0 / Ops 90.8 → TRIPLE AAA — REVISE · STAGING VERIFIED
