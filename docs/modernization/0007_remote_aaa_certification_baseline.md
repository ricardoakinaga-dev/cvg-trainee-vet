# 0007 — Remote AAA Certification Baseline (2026-09-11, HEAD `3cd7bc3`)

Prompts: `docs/52_codex_master_prompt_remote_aaa_certification.md` (§5) +
`docs/53_codex_master_prompt_final_certification.md` (§6) +
`docs/54_codex_master_prompt_certification_matrix_gates.md` (§3).
Partida: baseline `0006` + audit v6 (Eng 94.0/Sec 95.0/Ops 90.8, REVISE).

## HEAD

- HEAD: `3cd7bc32751d59d0142e7d1b21a5a5a79a0103ff` (main, sincronizado com
  `origin/main`, worktree a confirmar limpo antes de qualquer freeze)
- Commits desde a evidência (`14b97a8`): `b3e67bd` (assurance v6) +
  `3cd7bc3` (docs) — runtime diff `14b97a8→HEAD` NÃO vazio
  (`scripts/release-evidence.mjs`, `scripts/verify-triple-aaa.mjs`,
  `tests/integration/triple-aaa-verifier.test.ts` + docs)

## Toolchain

- Canônico (contrato CI): Node `v22.23.2` + pnpm `10.33.0` disponíveis via
  nvm; provas oficiais desta rodada rodam nesse runtime
- Local adicional: Node `v24.20.0` (nunca canônico)

## Coverage (`coverage/`, run 14:43)

- Statements 91.56% · Branches 86.10% · Functions 95.94% · Lines 92.17%
- Piso 90/85/90/90: PASS; hardening 91/86/92/91: PASS
- `apps/`+`packages/`+`tests/` idênticos entre `14b97a8` e HEAD → números
  válidos para as fontes medidas; envelope do bundle `sha=14b97a8`
  (stale-by-rule vs HEAD por diff em `scripts/`)

## Mutation (`reports/mutation-summary.json`, sha `14b97a8`)

- 6 escopos / 1139 mutantes; raw 84.28% · adjusted 98.84% · 0 survivors
- Matriz normativa G10 exige `>= 95%` (não 90%): PASS com margem

## RLS / Redis / staging / restore / test (sha `14b97a8`)

- Todos PASS e fresh no SHA da evidência; stale-by-rule vs HEAD (aguardam
  regeneração pós-remote-green, sequência §32/AAA-V7-006)

## Remote @HEAD `3cd7bc3`

- quality: UNKNOWN (API anônima rate-limited; sem token local)
- security: UNKNOWN (idem)
- candidate: UNKNOWN — nunca executado em nenhum SHA (sem tag/dispatch)
- Último conhecido (SHA publicado anterior): quality FAIL no step E2E
  (verify/lives/build verdes; logs inacessíveis sem auth); security com
  CodeQL PASS + OSV PASS pós-fix + dependency-review N/A-on-push

## Same-SHA

- FAIL (sem runs no HEAD; mecanismo local PASS com 18/18 self-tests)

## Findings

- P0 = 0 · P1 = 0 · P2 = 5 (RF-02 + RF-09 materiais abertos; RF-03R/RF-04/
  RF-07 aceitos) · P3 = 1 (RF-AT)

## Gaps que esta rodada pode fechar localmente

- `config/triple-aaa-gates.json` (matriz G01–G73 como single source of
  truth) + fiação dos verificadores (sem duplicar thresholds)
- Self-tests §15 ausentes (mutation 94.99, candidate missing, CodeQL
  missing, stale evidence, eng 96.99, ops 94.99)
- Triggers do candidate: JÁ conformes (workflow_dispatch + schedule +
  `candidate-*`, timeout 90) — verificar conteúdo §22 contra steps
- Diagnóstico E2E: reporter + upload `always()` JÁ cobrem a lista §10

## Gaps que exigem humano (token + aprovações)

- Logs/artifacts remotos (RF-02/AAA-V7-002/003), dispatch/tag candidate,
  runs quality/security/candidate no SHA congelado, security-summary v2
  (writer fail-closed sem token), re-review pós-push
