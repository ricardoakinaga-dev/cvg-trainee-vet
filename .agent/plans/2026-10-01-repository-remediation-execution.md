# Repository Remediation — ExecPlan

<!-- engineering-framework: active_action_id=AUDIT-REM-07A -->

## Purpose / Big Picture

Implement the remediation roadmap in `docs/58_roadmap_repository_remediation_2026-10-01.md` and `docs/59_backlog_repository_remediation_2026-10-01.md`. Success means each authorized finding has a code or document change with fresh evidence; product/operations choices and external/live proofs remain explicitly pending until their gates are met. The 2026-09-17 evidence and the 2026-10-01 static audit remain historical.

## Progress

- [x] (2026-10-01T22:23:41-03:00) Read project instructions, the current state/log/backlog, the four requested workflow skills, the audit, and remediation plan; preserve the pre-existing dirty worktree.
- [x] (2026-10-01T22:23:41-03:00) Freeze the remediation-specific quality bar and create the Orchestrate task ledger.
- [x] (2026-10-01T22:34:50-03:00) Record H-EDITORIAL/H-OPS/H-LIVE decisions; specify self-review authority in SPEC 0191; application RED→GREEN passed 10/10 under Node 22.23.2; update restore/migration runbook.
- [ ] (active: AUDIT-REM-07A) Verify the API boundary and complete the fresh review of the editorial rule before closing the task.
- [ ] (active: AUDIT-REM-01) Implement and verify local items REM-01–05 with isolated ownership; keep REM-06 subject to approved contract discovery.
- [ ] Implement the safe documentary and code portions of REM-07A/07B, REM-08/09 and mapped SOA work; never decide for the product owner.
- [ ] Run Gauntlet rounds: build, focused/regression verification, fresh critic, fixes, retest and final review; update runtime state, logs, backlog and traceability.

## Surprises & Discoveries

- The checkout already contains a large, pre-existing dirty worktree, including changes to the mutation harness and new harness tests. These are baseline inputs to preserve; inspect each current diff before touching those files.
- The prior Gauntlet run `aaa-2026-09-06-r1` is still ACTIVE but its artifact fingerprint has drifted. Resume is unsafe until explicitly rebaselined; old evidence must become stale.
- The audit found no runtime consumer of summative eligibility, and `StartAttempt` lacks modality/version fields. Implementing REM-06 without a contract would invent product behavior.
- H-EDITORIAL, H-OPS and the bounded local H-LIVE authorization were answered during execution: Ricardo permits MVP self-review, keeps RPO ≤1h/RTO ≤4h, and permits ephemeral local Docker with synthetic data. H-REMOTE, H-CONTENT and production approval remain pending.

## Decision Log

- Decision: Continue the existing Gauntlet run and rebaseline it, rather than initialize or replace a run.
  Context: `.gauntlet/state.json` already contains an ACTIVE run with a frozen AAA-v1 bar and drifted artifacts.
  Alternatives: overwrite/init another run; treat old evidence as current.
  Reason: preserve the existing run/bar and fail closed on prior evidence.
  Consequences: prior run evidence is stale; this plan adds a separate frozen remediation bar.
  Date/Author: 2026-10-01 / Codex.
- Decision: Treat REM-06 as contract-discovery and implementation only when approved modality/version semantics are present.
  Context: PRD/SPEC references exist, but runtime command shape does not carry modality/version.
  Alternatives: infer fields and behavior; block the entire formative attempt flow.
  Reason: preserve formative behavior and avoid inventing product rules.
  Consequences: a missing contract becomes a documented proposal and human gate.
  Date/Author: 2026-10-01 / Codex.
- Decision: Ricardo may self-review MVP content, the approved operational target remains RPO ≤1h/RTO ≤4h, and local disposable Docker with synthetic data is authorized.
  Context: User answered H-EDITORIAL, H-OPS and H-LIVE during execution.
  Alternatives: leave these items waiting; choose the conflicting 24-hour RPO proposal; run no local live verification.
  Reason: explicit product-owner and environment authorization.
  Consequences: align SPEC/code/runbooks to the approved decisions; restrict live tests to local disposable services, synthetic data, and cleanup. H-REMOTE, H-CONTENT and AAA-001 remain separate.
  Date/Author: 2026-10-01 / Ricardo.

## Outcomes & Retrospective

Execution is in progress. Add concrete outcomes, test results, remaining gaps, and recovery notes as each slice closes. Do not claim completion while any required item or gate remains open.

## Context and Orientation

Repository root: `/home/ricardo/cvg-trainee-vet`. The audit is `docs/audits/repository-audit-2026-10-01.md`; the crosswalk is roadmap 58; the executable direct backlog is 59; mapped score gaps remain in `docs/57_backlog_state_of_art.md`. Canonical BUILD governance is `BRIEFING/03.BUILD/0300_build_engineer_master.md` through `0302_backlog_master.md`. Runtime continuity is `docs/99_runtime_state.md`, append-only history is `docs/20_master_execution_log.md`, and current task registry is `docs/30_backlog_master.md`.

Key code entry points: `.github/workflows/candidate.yml`; `scripts/verify-mutation-closure.mjs` and `scripts/verify-mutation-critical.mjs`; `vitest.config.ts`; `playwright.config.ts`; assessment policy/use cases in `packages/domain` and `packages/application`; restore/migration runbooks and scripts. Do not overwrite the existing local edits in these paths; make small additions after reviewing their current content and focused diff.

## Scope and Constraints

- In scope: all 9 audit findings, direct tasks REM-01–10, and mapped SOA tasks across the 28 score dimensions, to the extent implementation is locally authorized and contract-supported.
- Out of scope: publication, production/deployment, participant or real clinical data, external provider calls, remote workflow dispatch/push, and any live DB/Qdrant/Redis/browser-to-service proof before its required authorization.
- Applicable instructions: repository `AGENTS.md`; `engineering-framework`, `orchestrate`, `gauntlet-loop`, `build-engine`, `runtime-controller` skills; docs 58–59.
- Requirements/decisions: approved SPEC gate 0190; BUILD 0300–0302 and readiness gates 0390/0391; SOA-QB-v1; D-083/RN-044/RF-034 clarification 0191; RPO/RTO per RNF-015/D-107; H-REMOTE/H-CONTENT/AAA-001 remain separate.
- Tier/risk/blast radius: T3/T4, high for CI evidence, path containment, source mutation, assessment policy, restore and security; minimal local change, synthetic-only tests, isolated candidate roots.
- Authorization constraints: user authorized implementation and verification, including ephemeral local Docker with synthetic data. No remote dispatch/push, production, or clinical publication is authorized.

## Architecture and Interfaces

The candidate workflow must provide both mutation verifiers the same explicit, bounded manifest generated from the current candidate; the old `--write-summary` interface is removed. Mutation writes stay inside a copied isolated root, and each source has an independent baseline digest and verified restoration. Coverage uses a reproducible allowlisted inventory of owned production `.ts` and `.tsx` files, including unimported web pages, without lowering floors. Playwright's ordinary mode excludes real-runtime; explicit real mode selects it and must fail if its required runtime is unavailable. Summative eligibility may be wired only through the contract's modality/version boundary, while formative attempts remain unchanged. Evidence identifies checkout/worktree and source/hash; stale historical scorecards are never promoted.

Frozen supplementary criteria are in `.agent/plans/2026-10-01-remediation-quality-bar.json`; the existing `.gauntlet/bar.json` remains the outer AAA bar. A failure or missing environment stays FAIL/BLOCKED/NOT VERIFIED, never PASS by fallback.

## Milestones

### M1 — Trustworthy local gates (REM-01–05; S1.1/S1.2)

- Outcome: workflow inputs agree with verifier contracts; mutation path and per-source restoration checks are correct; coverage includes owned TS/TSX production files; real E2E is selectable only in explicit real mode.
- Scope/dependencies: isolated file ownership across workflow, mutation harness, coverage and Playwright; no live services.
- Demonstration: focused RED→GREEN suites and local config/list checks; full `pnpm verify` only after integration and in the declared supported Node/pnpm versions.
- Acceptance/evidence: supplementary bar criteria R01–R06; focal commands and output saved under `.agent/artifacts/`.

### M2 — Domain, governance and operational documents (REM-06–09; SOA-01–40 as mapped)

- Outcome: implement contract-backed domain work, reconcile decision records/provenance, and make restore/schema/migration ordering explicit.
- Scope/dependencies: REM-06 pauses at contract gap; editorial and RPO decisions are recorded; local restore tests are authorized but production claims remain under AAA-001.
- Demonstration: contract trace, RED/GREEN tests where supported, static runbook consistency checks; no restore against non-disposable data.
- Acceptance/evidence: supplementary bar criteria R07–R10; unresolved items remain visibly pending.

### M3 — Integration, independent critique and closeout (REM-10)

- Outcome: audit every direct finding and mapped SOA item against one frozen candidate, record fresh provenance, and publish an honest report/scorecard with residual gaps.
- Scope/dependencies: local verification may finish without remote evidence; remote same-SHA and approval-dependent gates remain open.
- Demonstration: complete verification matrix, fresh-context critic, regression and traceability checks.
- Acceptance/evidence: supplementary bar R11 and final Gauntlet verdict; no open P0/P1 in any claim being promoted.

## Plan of Work

1. Keep this plan and the worktree checkpoint current; preserve all pre-existing edits.
2. Run parallel disjoint implementation lanes for REM-02, REM-03/04 and REM-05; lead owns REM-01 and integration. Each lane writes RED first, changes only owned files, runs focused verification, and reports exact artifacts.
3. Inspect and integrate the workflow contract from the current bounded-manifest producer; do not create a fabricated evidence source. Reconcile a locally reproducible manifest before any candidate workflow claim.
4. Investigate REM-06 against the approved PRD/SPEC and existing use cases. If modality/version is absent, write the gap/proposal and leave the code path pending.
5. Complete documentary remediations and safe mapped SOA tasks; request/await human input only for the dependent decisions. Continue unrelated local work while waiting.
6. Rebaseline the existing Gauntlet state after creating this plan/bar, then record each round and stale any evidence on drift. A fresh critic reviews the integrated artifact fingerprint and does not implement fixes.
7. Run the full authorized verification matrix, fix findings, rerun affected tests, reconcile state/log/backlog/traceability, and finish Gauntlet only when its strict verdict is met.

## Concrete Steps

From `/home/ricardo/cvg-trainee-vet`:

1. [AUDIT-REM-01] Inspect current manifest producer and verifier CLI; implement candidate workflow input/artifact alignment; run focused workflow-contract tests locally.
2. [AUDIT-REM-02] Prove an unimported TSX production file is included in the coverage denominator; keep all current minimum thresholds.
3. [AUDIT-REM-03/04] Add negative symlink/traversal and multi-source digest/restoration cases before the harness fix; run the bounded mutation harness integration suites.
4. [AUDIT-REM-05] Compare `playwright test --list` in ordinary and explicit-real modes; local live tests may use only isolated synthetic services authorized by H-LIVE.
5. [AUDIT-REM-06] Trace modality/version/gating from PRD/SPEC through use case and runtime; contract fields/source are absent, proposal recorded, await Ricardo's decision before implementation.
6. [AUDIT-REM-07A/07B] REM-07A is completed locally; REM-07B's approved RPO/RTO and AAA-001 proposal are reconciled in docs. AAA-001 operational acceptance/production remains pending.
7. [AUDIT-REM-08/09] Keep checkpoint/provenance current. REM-09 now has the tested `cvg-restore-summary/v2` contract and a disposable `0053 → restore → 0054` PostgreSQL 16 drill. Close residuals for corrupt-snapshot abort, constraints/grants, and the approved migration principal; keep production and RPO/RTO claims gated.
8. [AUDIT-REM-10] Re-run focused/full verification, fresh critique, traceability and documentation consistency; update all official checkpoints.

## Validation and Acceptance

| Criterion                     | Required | Procedure/environment                                                                                   | Expected observation                                                                                  | Evidence destination             |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------- |
| R01 bounded workflow contract | yes      | local inspection and workflow contract test                                                             | both verifiers consume one explicit current manifest; no legacy flag                                  | `.agent/artifacts/remediation/`  |
| R02 fail-closed manifest      | yes      | missing, malformed and mismatched input cases                                                           | nonzero/NOT_VERIFIED; valid manifest is traceable                                                     | same                             |
| R03 write containment         | yes      | symlink parent/final and traversal test in disposable temp root                                         | escapes rejected before write; outside sentinel unchanged                                             | same                             |
| R04 source integrity          | yes      | >=2 sources, cross-identity and forced restore failure                                                  | per-source digest/restoration; mismatch not valid                                                     | same                             |
| R05 coverage denominator      | yes      | inventory/config test on unimported TSX and exclusion check                                             | owned TS/TSX included; floors unchanged                                                               | same                             |
| R06 E2E selection             | yes      | Playwright list in common and explicit-real config                                                      | real spec excluded in common, selected in real; no fake pass when unavailable                         | same                             |
| R07 summative contract        | yes      | approved PRD/SPEC trace and domain/application tests                                                    | runtime consumer follows documented modality/version; formative unaffected, or gap explicitly blocked | same                             |
| R08 decision gates            | yes      | compare decision ledger, PRD/SPEC/SLO/runbook references                                                | approved editorial/RPO choices recorded; production/remote/content decisions remain separate          | docs/log                         |
| R09 provenance                | yes      | artifact/hash/checkpoint consistency                                                                    | current evidence bound to exact checkout/worktree; old scorecards historical                          | same                             |
| R10 restore compatibility     | yes      | inspect backup/migration formats and local validation; live drill only after H-LIVE                     | supported schema/order/abort conditions explicit                                                      | runbook and same                 |
| R11 final integrated quality  | yes      | focal + full authorized suite, secret/dependency/architecture/exposure checks, diff check, fresh critic | no unhandled P0/P1 for claims; all gaps named                                                         | audit report and Gauntlet record |

## Risks and Human Decisions

| Risk/decision                           | Evidence/confidence                                                | Controls                                                                                         | Residual/authority                                           | Trigger                       |
| --------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ----------------------------- |
| Existing worktree contains user changes | `git status` has extensive pre-existing modifications              | file ownership, inspect diffs, no broad reset/revert                                             | lead owns integration                                        | before each edit              |
| H-EDITORIAL                             | Ricardo decided self-review is allowed in MVP; SPEC amendment 0191 | require configured approved clinical identity, active role/capability/scope, preflight and audit | decision received; no content publication                    | author/reviewer policy change |
| H-OPS / AAA-001                         | RPO ≤1h and RTO ≤4h reaffirmed from PRD/RNF-015/D-107              | update runbooks; AAA-001 remains operational/production gate                                     | target decision received; production not approved            | operating/production claim    |
| H-LIVE                                  | local ephemeral Docker authorized for synthetic tests              | unique disposable containers, isolated ports/data, cleanup and evidence limits                   | local authorization received; no external/production service | local live verification       |
| H-REMOTE                                | separate request is pending                                        | no dispatch, push or remote CI claims                                                            | Ricardo authorization                                        | remote same-SHA execution     |
| REM-06 contract gap                     | StartAttempt lacks modality/version                                | no invented fields; preserve formative flow                                                      | product decision if docs insufficient                        | contract trace finds mismatch |
| Toolchain drift                         | runtime state reports current Node 24 outside Node 22 CI contract  | report exact toolchain; use declared runtime if available                                        | cannot certify unsupported toolchain                         | full verification             |

## Idempotence and Recovery

Each patch is narrow and reversible. Keep a before/after diff for owned files, use temp roots under the system temp area for mutation tests, and clean only paths created by the test. Never restore the entire dirty worktree from Git. On agent interruption, inspect status/diff and task ownership before resuming. If a manifest, runtime, or toolchain prerequisite is missing, leave its check NOT RUN/BLOCKED and continue unrelated local tasks. Any tree change invalidates the current Gauntlet fingerprint; re-record fingerprint and rerun affected checks before review.

## Artifacts and Evidence

- `docs/audits/repository-audit-2026-10-01.md`: historical static findings and their limits.
- `docs/58_roadmap_repository_remediation_2026-10-01.md` and `docs/59_backlog_repository_remediation_2026-10-01.md`: scope, dependencies and task acceptance.
- `.agent/plans/2026-10-01-remediation-quality-bar.json`: frozen additional binary acceptance bar.
- `.orchestrate/repository-remediation-state.json`: task ownership and dependency ledger.
- `.gauntlet/state.json`: existing Gauntlet run; rebaseline after kickoff artifacts exist and record new rounds.
- `.agent/artifacts/remediation/`: fresh local command output/manifests; no secret or real clinical data.

Plan revision note, 2026-10-01: created to execute docs 58–59 while preserving pre-existing dirty files and honoring separate human/live/remote gates.

Plan revision note, 2026-10-02: REM-01 now has a committed-HEAD producer that
runs Stryker from a `git archive` candidate tree, hashes the exact bounded
test/config/control inputs, binds the mutation summary to the current workflow
run ID, and makes strict release validation require that same ID. The producer
has not been run against this project candidate because its local controls are
dirty relative to HEAD. REM-02 includes unimported TSX and remains below all
four existing floors. REM-03/04/05 and the persistence publication guard pass
their current focused checks. Fresh integrated review of provenance/editorial
hold is pending; finish that review, reconcile traceability/state, and retain
H-REMOTE, AAA-001, H-CONTENT and the coverage failure as separate open gates.

Plan revision note, 2026-10-02 (06:15): REM-02 now executes the five owned web
routes in Vitest Browser Mode on Chromium and covers synthetic participant,
diagnostic, authoring/retry, recovery, operations/retry and invitation paths.
The full suite passed 1506 tests/68 skips, but coverage remains
82.77/72.66/84.77/83.97 against frozen floors 90/85/90/90. The visual matrix
passed 11/11 with the mobile operations density noted for SOA-22/24. REM-03/04
still awaits the user's same-UID threat-model decision; no independent review
PASS is claimed for this slice.

Plan revision note, 2026-10-02 (06:22): the operations route also exercises a
synthetic scoped account suspension and refreshes the resulting `SUSPENDED`
projection. Chromium passed 25/25; integrated coverage is 83.06/73.24/85.16/
84.26 against the unchanged 90/85/90/90 floors, so REM-02 remains open. The
visual E2E logs include refused requests to the unstubbed local API port; these
do not count as runtime integration evidence.

Plan revision note, 2026-10-02 (06:30): Chromium now also proves that canceling
the deactivation confirmation sends no PATCH and leaves the synthetic active
account unchanged. Browser coverage passed 26/26; integrated coverage is
83.07/73.27/85.21/84.28 against the frozen 90/85/90/90 floors. The global
coverage gate remains open, as does the same-UID human decision.

Plan revision note, 2026-10-02 (06:35): existing Gauntlet run
`aaa-2026-09-06-r1` is active at `FIX_RETEST`; its frozen bar was preserved,
the artifact fingerprint was rebaselined, and `validate --check-drift` passed.
A fresh R05 critic was not available because the agent thread limit was
reached; no independent PASS or overall verdict is claimed.

Plan revision note, 2026-10-02 (06:39): Gauntlet `evidence_freshness` remains
`STALE` after rebaseline because no valid current round with an independent
critic was recorded. Local verification passed for the documented commands;
this does not create a critic verdict.

Plan revision note, 2026-10-02 (06:43): confirmed participant deactivation now
complements suspension and cancellation tests. Browser suite passed 27/27;
coverage is 83.07/73.29/85.21/84.28 against the unchanged floors. The Gauntlet
review remains stale until an independent R05 critic is available.

Plan revision note, 2026-10-02 (07:20): Browser Mode now completes a synthetic
authoring draft through the returned `RASCUNHO` projection, blocked-publication
notice, unavailable clinical actions and recovery cleanup. Browser passed
33/33; integrated coverage is 85.66/77.80/88.64/86.94, still below unchanged
90/85/90/90. Typecheck, focused ESLint, format, secrets and diff-check passed.
The Gauntlet is still `ACTIVE/FIX_RETEST/STALE` with seven recorded rounds and
no fresh R05 critic; REM-03/04 same-UID decision remains pending.

Plan revision note, 2026-10-02 (07:29): final documentation gates passed except
`verify:evidence-consistency`, which fails closed without a current mutation
run ID. The existing Gauntlet was rebaselined after the docs sync and validated
without drift; it remains ACTIVE/FIX_RETEST/STALE at seven rounds, with no new
critic verdict.

Plan revision note, 2026-10-02 (07:37): participant Browser Mode now covers
synthetic invite activation and feedback ticket creation, with request
credentials, public projection and identifier redaction. Browser passed 34/34;
integrated coverage is 85.88/77.95/88.99/87.18 against unchanged
90/85/90/90 floors; inventory remains 174/212. `verify:evidence-consistency`
needs a genuine current mutation run ID. The test change invalidated the
previous Gauntlet fingerprint until rebaseline and revalidation.

Plan revision note, 2026-10-02 (07:42): the final docs/traceability sync was
rebaselined and `validate --check-drift` returned valid with no errors. The
existing Gauntlet remains ACTIVE/FIX_RETEST/STALE at seven rounds; no critic
verdict or fresh round was added.

Plan revision note, 2026-10-02 (08:07): three synthetic Operations Browser
journeys now cover individual formative progress, scoped appeal history and
read-only impact preview, plus continuing-education/reflection aggregates and
filters. Browser passed 38/38; integrated coverage is 87.36/81.89/91.15/88.71
against frozen 90/85/90/90. Functions now passes; statements, branches and
lines remain below their floors. Inventory remains 174/212. The Gauntlet
fingerprint is stale after the test delta and documentation updates; rebaseline
and drift validation passed after synchronization; the run remains
ACTIVE/FIX_RETEST/STALE at seven rounds, with no critic or new round claimed.
Evidence consistency still requires a real mutation run ID from a compatible
committed candidate.

Plan revision note, 2026-10-02 (08:32): participant Browser Mode now restores
a synthetic active session whose journey includes an existing `SALVA` attempt
and persisted reflection response, verifies the prefilled response, saves an
update and submits to the completed projection. Dashboard path/profile,
formative diagnostic and M01 runtime projections are also exercised without
exposing internal fields. Browser passed 39/39; integrated coverage is
87.53/82.41/91.59/88.88 against unchanged 90/85/90/90 floors. Functions
passes; statements, branches and lines remain below their floors. Inventory
remains 174/212. The Gauntlet remains ACTIVE/FIX_RETEST/STALE after fingerprint
synchronization; `validate --check-drift` returned `valid: true`. No new critic
or round is claimed. Real mutation evidence and the same-UID human decision
remain pending. Documentation, traceability, audit-consistency,
product-definition, exposure and CI contract gates passed.

Plan revision note, 2026-10-02 (09:08): Browser Mode now covers the scoped
read-only authoring queue, CSV formula-injection sanitization, audit pagination
and strict response rejection/retry, 401/403 redaction, confirmed account
recovery and invitation resend. Browser passed 46/46 across five files;
typecheck, focused ESLint/Prettier and repository format, secrets and diff
checks passed. Integrated coverage is
88.40/84.03/92.47/89.76 against the frozen 90/85/90/90 floors; functions
passes, while statements/branches/lines remain below. Inventory is 174/212.
The coverage summary is consistent; real mutation evidence still needs a
compatible committed candidate. The existing Gauntlet rebaseline and
`validate --check-drift` returned valid before this documentation sync. REM-02
stays open and the same-UID decision remains pending.

Plan revision note, 2026-10-02 (09:12): traceability, documentation,
audit-consistency, product-definition, exposure, CI contract, formatting,
secrets, ledger JSON and diff-check passed after synchronization. Browser
passed 46/46; typecheck and focused ESLint passed. Coverage-floor confirms
174/212 sources and frozen 90/85/90/90 floors; results are
88.40/84.03/92.47/89.76, so functions passes and three metrics remain open.
Evidence consistency confirms the coverage summary and fails only for missing
real mutation run ID. Gauntlet rebaseline/validate returned valid:true;
ACTIVE/FIX_RETEST/STALE remains at seven rounds with no fresh critic. REM-02
and the same-UID decision remain open.

Plan revision note, 2026-10-02 (09:43): Browser Mode now covers a denied
synthetic `SOLICITAR_AJUSTES` POST, including generic error handling and no
false decision/publication projection. Browser passed 48/48 across five files
under Node 22.23.2; typecheck, focused ESLint and Prettier passed. Integrated
coverage is 88.52/84.15/92.56/89.89 against frozen 90/85/90/90 floors, with
functions passing and statements/branches/lines open; inventory remains
174/212. Evidence consistency still requires a real mutation run ID. Runtime,
execution log, backlog, artifact and traceability were synchronized; the
documentation, CI, exposure, secrets and format gates passed. Official
Gauntlet rebaseline/validate returned valid:true; it remains
ACTIVE/FIX_RETEST/STALE at seven rounds without a fresh critic. The same-UID
decision remains pending.

Plan revision note, 2026-10-02 (10:22): Browser Mode passed 57/57 across five
files, adding synthetic coverage for denied impact preview, feedback-ticket
state transitions, prioritized remediation, activity selection/deep links, and
retries after transient activity, journey and B-07 diagnostic failures. The
latest integrated run passed 1539 tests (68 skipped) across 215 files and
measured 89.04/84.65/92.82/90.43 against frozen 90/85/90/90 floors. Functions
and lines pass; statements and branches remain open. Typecheck, focused ESLint
and Prettier pass. Inventory remains 174/212; evidence consistency still
requires a genuine mutation run ID from a compatible committed candidate.
REM-02 stays IN_PROGRESS and Gauntlet freshness remains STALE pending fresh
independent R05 capacity.

Plan revision note, 2026-10-02 (10:28): documentation, traceability, audit,
product, exposure, CI, secret, format, JSON and diff-check gates passed. The
official helper rebaselined `aaa-2026-09-06-r1`, and `validate --check-drift`
returned `valid: true`. The run remains ACTIVE/FIX_RETEST/STALE at seven rounds
without a fresh critic or new verdict; REM-02 and the same-UID decision remain
open.

Plan revision note, 2026-10-02 (11:09): Browser passed 61/61 across five files,
adding malformed feedback-history JSON recovery, status filtering and cursor
next/previous navigation. Typecheck, focused ESLint/Prettier and diff-check
passed. Integrated coverage is 90.03/85.31/94.71/91.24; 215 files passed,
1543 tests passed and 68 skipped. `verify:coverage-floor` passes at the frozen
90/85/90/90 floors with inventory 174/212. Evidence consistency still fails
only for the missing real mutation run ID from a compatible committed
candidate. REM-02 remains IN_PROGRESS for fresh R05 review; the same-UID human
decision remains pending. No production source changed.

Plan revision note, 2026-10-02 (11:31): the first fresh R05 critic returned
REVISE P2 because the previous-page request did not have an explicit status
preservation assertion. Added a post-click query check for `status=TRIADO` and
no cursor. Focused test passed 1/1, Browser passed 61/61, typecheck/ESLint/
Prettier passed, and integrated coverage passed at 90.03/85.31/94.71/91.24
with 174 included / 212 excluded and frozen floors. A fresh follow-up critic
returned PASS with no P0–P2 findings in the bounded delta. AUDIT-REM-02 is
completed locally. Evidence consistency still needs a genuine mutation run ID
from a compatible committed candidate; same-UID review decision remains open.

Plan revision note, 2026-10-02 (13:25): the local PostgreSQL 16 historical
restore drill now stops at `0053_aaa_content_integrity`, restores a custom
dump into an isolated target, verifies marker and Drizzle hash/timestamp
prefix, and applies only `0054_aaa_content_indexer_service`. Direct run passed
with head `0054`, four policies, forced RLS and both target table owners
matching a dedicated `NOSUPERUSER NOBYPASSRLS` role; duration was 1,764 ms
for the technical verification interval only. The opt-in integration test
passed 4/4; typecheck, focal ESLint/Prettier, migration/secret checks and
diff-check passed. Historical migrations through 0053 required local
`postgres`: a non-bypass role reproduced recursive `learning_activities` RLS
at migration 0030. Production migration-principal validation, grants,
constraints, corrupt-snapshot abort and operational RPO/RTO remain open.

Plan revision note, 2026-10-02 (14:02): a fresh critic returned REVISE with a
P1 cluster-identity gap and a P2 policy-metadata/predicate gap. The local
executor now uses only a private Unix socket, checks process identity before
DDL and verifies a socket client; the local evidence writer delegates to that
executor. Policy checks validate table, command, role, permissiveness and
published-content predicates. RED reproduced acceptance of `NOT` and
`COALESCE`; GREEN rejects these and unsupported boolean/function wrappers.
The opt-in PostgreSQL 16 migration/policy suite passed 7/7 and the direct drill
returned PASS in 1,645 ms for the complete synthetic fixture. The writer,
runbooks, traceability and continuity records were synchronized. Follow-up
fresh review and official Gauntlet sync remain pending; migration-principal,
grants/constraints, corrupt-snapshot and operational proof gaps remain open.

Plan revision note, 2026-10-02 (14:27): a new RED case showed that separate
`EXISTS` clauses could satisfy the policy check with `content_id`/`version`
links in one subquery and `status='PUBLICADO'` in another. The policy contract
now requires both links and the published status in the same
`content_versions` subquery under `version_record`, using PostgreSQL 16's
catalog expression. The focused policy test passed 3/3; the opt-in migration/
policy integration passed 7/7; direct drill PASS measured 1,695 ms for the
complete local fixture. Fresh independent review and official Gauntlet sync
remain pending; no RTO or production claim is made.

Plan revision note, 2026-10-02 (14:42): RED reproduced a second decoy in the
`content_versions` policy, where a separate `EXISTS` containing a published
status could satisfy the former fragment check. The checker now compares the
entire normalized PostgreSQL 16 catalog expression. The target row itself
must have `status='PUBLICADO'`; each `ai_suggestions` expression binds
`content_id`, `version` and published status in one `EXISTS`. PostgreSQL 16
integration passed 7/7 under Node 22.23.2; direct drill PASS measured 1,668 ms
for the full synthetic fixture. The exact positive fixture was aligned to the
catalog's emitted parentheses. Fresh review and Gauntlet sync remain pending.

Plan revision note, 2026-10-02 (14:50): adversarial review found the
normalizer removed every `::text` cast, allowing a noncatalog expression such
as `status::text` to compare equal. A new RED assertion reproduced it; GREEN
preserves casts and normalizes only whitespace, punctuation and nonliteral
case. The policy test passed 3/3 and opt-in PG16 integration passed 7/7 under
Node 22.23.2. Direct drill PASS measured 1,664 ms for the complete synthetic
fixture. Fresh critic and official Gauntlet sync remain pending.

Plan revision note, 2026-10-02 (15:19): RED required the PG16 integration to
report successful archive preflight and corrupt-snapshot rejection; it failed
before implementation. GREEN runs `pg_restore --list` and extracts the valid
custom archive to private temporary SQL before creating the target database.
A copy with its magic header changed is rejected by the same preflight, and a
catalog query proves the target database remains absent. The extraction file
is removed on success and failure. Under Node 22.23.2, the restore test passed
4/4, the migration/policy opt-in suite passed 7/7, and the direct drill passed
in 1,730 ms for the complete synthetic fixture. This proves only synthetic
archive corruption before target creation; schema-semantic incompatibility,
authorized grants/constraints, migration-principal approval and operational
RPO/RTO remain open. The prior fresh critic produced no verdict; Gauntlet stays
ACTIVE/FIX_RETEST/STALE and is not rebaselined.

Plan note, 2026-10-02 (15:46): one fresh critic returned APPROVE but changed
only the ignored Vitest result cache while executing tests. Its pre/post
Gauntlet fingerprints differed (`7e509a79d092d9cd4f798463b8bfebd5f4dcf8e7c06308c73d143fc9dd09eff6`
to `91ff3be61e12b4c3fe4c1b9215d405c0ae15cefeb6c3968368a0db5196676256`),
although the tracked/untracked Git diff hash was unchanged; under the
read-only Critic contract this verdict is INVALID. A second sealed, non-writing
Critic remained running after two and a half minutes and was closed without a
verdict; its fingerprint matched before/after at `91ff3be...`. Gauntlet remains
ACTIVE/FIX_RETEST/STALE. Continue the next local REM-09 slice by verifying
constraint catalog parity for content_versions and ai_suggestions; do not
invent production grants or migration-principal policy.

Plan note, 2026-10-02 (15:51): RED added required result `constraintsVerified`;
the opt-in PG16 drill failed until the restore integrity catalog was compared.
GREEN now compares source `0053` and restored target after `0054` for both
content tables: column type/nullability/identity/generated/default metadata,
all catalog constraints and `convalidated`, plus indexes and unique/primary/
valid/ready/definition flags. Restore integration passed 4/4; combined
migration/policy suite passed 7/7 with Vitest `--no-cache` and the existing
ignored results cache hash stayed unchanged. Direct drill PASS returned
`constraintsVerified=true`, `verificationDurationMs=1723`. This is bounded to
two synthetic tables. Production grants, full-database constraints, semantic
backup compatibility and migration-principal approval remain open. Fresh
review and official Gauntlet sync remain pending.

Plan note, 2026-10-02 (16:00): final no-cache opt-in migration/policy suite
passed 7/7 (restore-migrations 4/4); the ignored Vitest cache SHA remained
`6013aaa8f1bb8d6ac472f678d1a2328e30c40de66b01d195c9a5656c48035ef8`. Direct
disposable PG16 drill PASS reports valid archive preflight, rejection of the
synthetic corrupted header before target creation, `constraintsVerified=true`
for the two content tables, and `verificationDurationMs=1762`. This is bounded
synthetic evidence; semantic backup compatibility, full-database constraints,
authorized grants, migration-principal approval and operational RPO/RTO remain
open. Next obtain a sealed fresh review with complete pre/post-fingerprint
verification; do not rebaseline without a valid verdict.

Plan note, 2026-10-02 (16:19): the SPEC 0118 §32 structural-parity oracle is
now extracted to `restoreIntegrityCatalogMatches` and used by the drill. RED
failed with the missing module; tests now reject catalog differences in column
type, constraint/index definition, missing columns, unvalidated constraints
and unusable indexes. Focused restore passed 6/6 with the live case skipped;
the final opt-in PG16 migration/policy suite passed 10/10. Direct drill PASS
measured 1,774 ms and returned all preflight/catalog flags true; the existing
Vitest cache SHA remained unchanged.

A fresh sealed critic was closed after approximately 150 seconds without a
verdict. The official full fingerprint matched before/after at
`1175c8824ab98a2924e53d5c97764065a320118c81304cf41cbd5b540393b4c9`; no
verdict or rebaseline is inferred. The comparator proves only structural
catalog equality for the two synthetic content tables, not arbitrary archive
compatibility. Production grants, the approved migration principal and
operational restore evidence remain gated.

Plan note, 2026-10-02 (16:48): fresh sealed C4 returned APPROVE for the
bounded pre-existing restore-catalog/dependency delta. The official full
fingerprint matched before/after at
`38bdac60a9ef3aa8144d6369abe0fdf252141436c5719daeb388daf41629ce6b`; no tests
or writes were performed by the reviewer. This result does not cover later
changes, rebaseline Gauntlet or close REM-09.

Plan note, 2026-10-02 (16:54): RED added an opt-in assertion for a readable
archive with a valid `0053` journal but structural drift; it failed because
the drill had no such result. GREEN creates a second custom dump after adding
a synthetic column to `content_versions`, retains the journal, passes archive
preflight, restores and applies `0054`, then requires catalog comparison to
reject the mismatch against the pristine source snapshot. Restore integration
passed 7/7 under Node 22.23.2; direct PG16 drill PASS returned
`semanticSnapshotMismatchRejected=true` and `verificationDurationMs=2172`.
This is one controlled structural case, not general archive compatibility.
Obtain a new fresh critic with full pre/post fingerprint; keep Gauntlet
ACTIVE/FIX_RETEST/STALE and do not rebaseline without valid evidence.

Plan note, 2026-10-02 (17:09): C5 independently reviewed the new semantic-drift
fixture in sealed read-only context and returned APPROVE with no findings. It
confirmed valid `0053` journal preservation, archive preflight, restore,
application of `0054`, mismatch rejection, cleanup and bounded documentation.
The official complete fingerprint matched before/after at
`673584d9c4ed3c2674a2fc53a6a99456212d899859ad840759fb541826c2a6da`; the
reviewer ran no tests and made no writes. This does not establish arbitrary or
external archive compatibility, close REM-09 or pass the global Gauntlet.

Plan note, 2026-10-02 (17:24): REM-09 now applies the repository's local CI
`roleProvisionSql` after restoring `0053` and applying `0054`. RED reproduced
four missing output claims; GREEN checks effective privileges across public
relations against `applicationTablePrivileges`, the excluded
`knowledge_documents` table, app-role ownership/capabilities and default-deny
for a post-provision table. The 3-file opt-in migration/policy/governance suite
passed 40/40 under Node 22.23.2 with `--no-cache`; direct PG16 drill PASS
reported all four new grant/least-privilege flags and `verificationDurationMs`
2,186. This is local synthetic provisioner evidence, not a production grant
matrix or approved operational migration principal. Lint, typecheck, format,
Prettier, documentation, traceability,
audit/product/exposure/CI gates, migrations, secrets, production audit and diff
check passed. `verify:evidence-consistency` confirms coverage/audit but fails
closed for the missing genuine mutation run ID of a committed candidate. Keep
REM-09 open and the Gauntlet ACTIVE/FIX_RETEST/STALE without rebaseline.

Plan note, 2026-10-02 (17:37): final review found the synthetic role passwords
would be visible in `psql --command` arguments. The drill now writes generated
credentials only to a private mode-0600 SQL file in the disposable cluster
directory and removes the directory during cleanup. After the adjustment, the
PG16 direct drill passed with grant/least-privilege flags true in 2,230 ms;
the no-cache migration/policy/governance suite passed 40/40, and lint,
typecheck, format and syntax passed. Rerun documentation gates and obtain a
fresh bounded review with full pre/post fingerprint; keep the global Gauntlet
stale.

Plan note, 2026-10-02 (17:40): after credential-file hardening, migration/
policy/governance passed 40/40 and the direct PG16 drill passed in 2,230 ms.
Lint, typecheck, format, focused Prettier, documentation/traceability,
audit/product/exposure/CI, migrations, secrets, production audit, JSON and diff
checks passed. `verify:evidence-consistency` fails only for the absent genuine
mutation run ID of a compatible committed candidate. C6 fresh read-only review
with an official complete pre/post fingerprint is next; no rebaseline.

Plan note, 2026-10-02 (17:57): C6 returned REVISE P2 on possible credential echo
through `psql` stderr, and noted missing explicit malformed-row test coverage.
The official repository+state fingerprint matched before/after at
`17f5373ca79eb7ffd36fb864427fc210a3dac4123a73f08da528a341fa9ef12a`; no tests
were run by the reviewer. RED reproduced the absent safe formatter; GREEN now
suppresses stderr only for the role-provisioning SQL call and adds password
redaction/malformed-row regressions. Focused tests passed 10/10 (one live skip),
the opt-in restore/policy/governance suites passed 42/42, and the PG16 drill
passed with all expected flags in 2,215 ms. Next: finish the checkpoint and
provenance records, rerun applicable gates, then request a fresh bounded review
of the corrected delta. No global rebaseline.

Plan note, 2026-10-02 (18:10): post-sync lint, typecheck, format, focal
Prettier, documentation, traceability, audit consistency, product definition,
exposure, CI contract, migrations, secrets, syntax, ledger JSON and diff-check
passed. The opt-in migration/policy/governance suite passed 42/42 and direct
PG16 drill passed in 2,215 ms. Evidence consistency confirms coverage/audit but
fails closed on the absent genuine mutation run ID for a committed candidate.
Capture the official fingerprint and request fresh read-only critique of the
corrected stderr suppression; then finish current artifact hashes. No global
rebaseline or candidate certification.

Plan note, 2026-10-02 (18:24): the fresh Kepler review returned REVISE P2
because the preceding credential test did not exercise the psql call-site. Its
complete fingerprint matched pre/post at
`02afceb869730af4291e3c5e9fff255a63521bc7652e736e36b552a2e7437455`; the review
ran no tests. RED reproduced the missing injectable runner module. GREEN
extracted `createRestoreToolRunner` and `runRoleProvisioningCommand`; the test
now injects a nonzero psql failure with synthetic password text in stderr,
then asserts the production call path propagates only a suppressed diagnostic,
no cause and no secret in argv. Focused restore-migrations passed 10/10 with one
live skip; opt-in migration/policy/governance passed 42/42; the disposable
PG16 drill passed in 2,226 ms. Rerun all applicable code/documentation gates,
then request a fresh read-only critic on this exact snapshot. No rebaseline.

Plan note, 2026-10-02 (18:36): focal Prettier, documentation, traceability,
audit-consistency, ledger JSON parsing and diff-check passed after extraction
and after restoring the new append-only log records to chronological order at
EOF. These documentation gates used Node v24.20.0 outside the declared engine
range; the implementation-focused tests and drill ran under Node 22.23.2. The
next action is a complete official repository+state fingerprint followed by a
fresh static review of the runner, call-site and injected failure regression.
The evidence-consistency mutation-ID gate remains open; no global rebaseline.

Plan note, 2026-10-02 (18:51): fresh C7 review returned REVISE P2 because
`restoreIntegrityCatalogMatches` accepted identical source/target catalogs
whose column, constraint or index rows omitted compared fields. Its complete
official repository+state fingerprint matched pre/post at
`183b1b9810604a6187f7306d2138fb84004de40129febf940e7be8353e7b3807`; the critic
made no writes and ran no tests. RED reproduced `true` for the malformed pair.
GREEN added row-shape/type, allowed-table and duplicate-key validation; tests
cover incomplete and wrong-typed rows on both sides. Under Node 22.23.2, the
restore/policy/governance suites passed 42 tests with one conditional live skip,
typecheck and focused lint/format passed, and the PG16 drill passed in 2,192 ms.
Next: synchronize records, rerun gates, fingerprint and request a distinct fresh
review of the corrected comparator. No global rebaseline.

Plan note, 2026-10-02 (18:57): after syncing C7's malformed-row fix, the
restore/policy/governance suites passed 42 tests with one conditional live
skip; the direct disposable PG16 drill passed with all flags in 3,313 ms (a
partial technical interval, not RTO). Workspace lint, `tsc -b`, format and
Prettier, CI contract, secrets, traceability, migrations, product-definition,
exposure, documentation, audit-consistency, ledger JSON and diff-check passed
under Node 22.23.2. `verify:evidence-consistency` remains blocked by the absent
genuine mutation run ID for a compatible committed candidate. Capture the full
official fingerprint, request a distinct fresh review of the comparator, then
finish REM-08 current-file hashes; do not rebaseline globally.

Plan note, 2026-10-02 (19:03): fresh C8 review returned REVISE P2 because an
empty `tableNames` entry could match identically empty catalog rows and pass.
The official repository+state fingerprint matched pre/post at
`cc3fd50ba26b1a3a41da59328e7c31f0de2917e0d0e54a5c46796e221dbf0041`; the critic
ran no tests and made no writes. RED reproduced the pass. GREEN now validates
each table name as nonempty; the regression rejects equal catalogs with an
empty table name. Under Node 22.23.2, restore/policy/governance passed 43 tests
with one conditional live skip; lint/typecheck/format and all applicable CI,
security, traceability, migration and documentation gates passed; the direct
PG16 drill passed in 2,343 ms. Capture a new official fingerprint after record
sync, then request a distinct fresh review of the C9 snapshot. No rebaseline.

Plan note, 2026-10-02 (19:17): checkpoint prepared for session restart after
the C9 fix. Runtime state, execution log and remediation backlogs now point to
the same next step: capture the full official repository+state fingerprint,
then request a distinct fresh, bounded, read-only C10 review of the catalog
comparator, empty/malformed/duplicate rows and caller. Require matching
pre/post fingerprints; record a valid verdict and then finish REM-08 current
hashes. Keep the global approval state and open evidence-consistency gate
unchanged; no commit or rebaseline.
