# CVG Gauntlet ExecPlan — 2026-08-23

## Purpose and outcome

Continue the CVG veterinary-training platform from its current brownfield BUILD/AUDIT state toward a production-oriented MVP, implementing the highest-impact locally verifiable slices from the approved PRD/SPEC and preserving explicit human, clinical, provider, and operational gates.

The immediate milestone is the next vertical product slice: a protected management projection of digital reflection activity by authorized scope/module, using allowlisted counts only and never exposing free-text reflection answers. This milestone does not publish clinical content, score reflection, infer practical competence, simulate a provider, or claim production operations.

## Classification and authority

- Project profile: brownfield, existing maintained monorepo with executable API, web, worker, persistence, contracts, tests, and audit records.
- Lifecycle: BUILD with AUDIT/VERIFY activity; Discovery, PRD, SPEC, and BUILD-documentation gates are approved in their canonical records.
- Depth: T3 system work, with T4 controls on authentication/authorization, data integrity, clinical governance, and production operations.
- Current pointer: `docs/99_runtime_state.md`.
- Product truth: approved PRD and SPEC under `BRIEFING/09.PROJETO_CVG_TREINAMENTO`.
- Chronology/evidence: append-only `docs/20_master_execution_log.md`.
- Priority/status: `docs/30_backlog_master.md`.
- No external mutation is authorized by this plan: no deploy, push, provider setup, credential rotation, production migration, clinical publication, or pilot.

## Constraints

- Follow the root `AGENTS.md` and nested instructions before changing target paths.
- Use TDD RED → GREEN → REFACTOR, strict TypeScript, Zod validation, server-side deny-by-default authorization, PostgreSQL as transactional authority, Qdrant as rebuildable derived index, and assistive/off-switchable AI.
- Do not use secrets, real veterinary records, tutors, photos, PDFs, protected source material, or identifying data in code, fixtures, logs, UI, or reports.
- Never allow AI/Qdrant to decide state, score, answer key, publication, approval, role, or autonomy.
- Preserve existing user changes; use `apply_patch`; review the diff; update state/log/backlog/traceability for material work.

## Current evidence and baseline

- Worktree at recovery: clean, branch `main`, eight commits ahead of `origin/main`.
- Current technical pointer: `REFLECTION-035 / AUD-P1-001`; participant reflection cycle is verified with `PASS_WITH_GAPS` in `BRIEFING/04.AUDIT/0512_reflection_digital_audit.md`.
- Current local release traceability gate: `CVG_TRACEABILITY_RELEASE=true pnpm verify:traceability` passed after the reflection/OPS commits.
- Existing reflection code: `packages/application/src/reflection-use-cases.ts`, `packages/contracts/src/reflection.ts`, `packages/persistence/src/activity-repository.ts`, API projection in `apps/api/src/http.ts`, participant UI in `apps/web/app/page.tsx`, and participant E2E coverage.
- Existing staff aggregation: dashboard use case/contract/repository and `/api/v1/dashboard` already aggregate authorized participant/module states, diagnostic profile, and digital participation report; the reflection aggregate is absent.
- Known external/human gaps remain open: B-07 content review/application, clinical publication/pilot, provider/MFA/external delivery, production grants/owner/credential rotation, collector/OTel/retention/traces, load/failover/restart/restore, and remote workflow evidence for the current SHA.

## Frozen Quality Bar v1

The bar is frozen before implementation. It may change only if the user changes the goal, an authoritative requirement changes, or a measurement is shown invalid; any revision must preserve the historical result and record the reason.

| ID               | Dimension                        | Target                                                                                                                                                                                                                           | Evidence method                                                                                     | Required                                  | Priority | Baseline/validity                                                                                                 |
| ---------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| GOAL-CORE-01     | full-stack correctness           | Participant activity/reflection actions reach the real API boundary, persist in PostgreSQL, and render the same state after reload; no hidden mock substitutes for the judged boundary                                           | targeted integration/live PostgreSQL plus participant E2E and reload assertion                      | yes                                       | critical | Reflection participant flow currently passes synthetically; live proof for the new aggregate is not yet available |
| GOAL-MGMT-02     | product usefulness/authorization | Staff can read reflection counts grouped by authorized scope/module/status only; cross-scope requests are denied or empty and no raw answer text, item IDs, or internal identifiers are returned                                 | strict contract/API test, repository isolation test, live PostgreSQL, staff E2E/axe                 | yes                                       | high     | Dashboard exists; reflection aggregate is missing                                                                 |
| GOAL-RULE-03     | learning safety                  | Digital reflection never produces score, answer key, clinical approval, practical competence, autonomy, or procedure authorization                                                                                               | domain/contract/API negative tests and rendered projection inspection                               | yes                                       | critical | Existing participant reflection declares `REFLEXAO_DIGITAL` and `PROIBIDO_MVP`                                    |
| GOAL-SEC-04      | security/privacy                 | Every staff query is authenticated, capability-checked, scope-checked server-side, validated at the trust boundary, and defended by transaction-scoped RLS where the table is queried                                            | HTTP matrix, authorization tests, RLS live negative tests, secret/exposure scans                    | yes                                       | critical | Existing dashboard and identity RLS provide patterns; new query must not weaken them                              |
| GOAL-DATA-05     | data integrity                   | PostgreSQL remains source of truth; counts are derived transactionally from persisted attempts/answers; invariants hold under empty, duplicate, latest-attempt, and concurrent/replay cases; migration is added only if required | repository unit tests, migration governance, live query/fixture, rollback or no-migration rationale | yes                                       | critical | Reflection uses existing attempt/answer tables; schema reuse is preferred                                         |
| GOAL-CONTRACT-06 | boundary contracts               | Request/query and response are strict, bounded, allowlisted, stable, and reject unexpected input; public participant projections remain unchanged except for approved fields                                                     | Zod contract tests, HTTP status/error tests, exposure scan                                          | yes                                       | high     | Existing dashboard/report contracts are strict; aggregate needs a dedicated contract or explicit extension        |
| GOAL-UX-07       | experience/accessibility         | Changed internal surface has loading, empty, error, forbidden/stale/retry states, semantic labels, keyboard/focus behavior, axe pass, and narrow viewport behavior                                                               | Playwright with axe at named viewport/state combinations and source inspection                      | yes                                       | high     | Operations E2E/axe already covers the page; new state must be integrated                                          |
| GOAL-OPS-08      | operations                       | Redacted operational snapshot remains truthful (`NO_DATA` instead of invented metrics); production collector/retention/traces/load/failover/restore are either observed or explicitly blocked, never implied                     | local operational tests plus audit evidence and gap record                                          | yes for release; advisory for local slice | high     | OPS-034 is local-only `PASS_WITH_GAPS`                                                                            |
| GOAL-TEST-09     | verification                     | TDD evidence exists; affected tests, full `pnpm verify`, build, E2E, migration/security/exposure checks pass; global coverage stays at or above 80% statements/branches/functions/lines                                          | exact commands and raw summaries recorded after the change                                          | yes                                       | critical | Prior verified baseline is above 80% in all metrics                                                               |
| GOAL-TRACE-10    | governance                       | Requirement → SPEC → module/contract → test → commit → artifact is current; runtime state, log, backlog, audit, and manifest agree; clean release traceability gate passes                                                       | `verify:traceability:release`, docs gates, diff review, commit/artifact inspection                  | yes                                       | critical | Current local gate passes; every new material artifact must be bound                                              |
| GOAL-CLIN-11     | clinical/authority boundary      | No implementation evidence is treated as clinical approval, publication, pilot authorization, CPD accreditation, or practical competence; human gates remain explicit                                                            | audit/backlog/state inspection and negative exposure tests                                          | yes                                       | critical | B-07 and publication/pilot gates remain human-controlled                                                          |

## Decomposition and ownership

### Scout decision (2026-08-23)

Two fresh read-only scouts independently confirmed that this is the largest local, user-relevant gap. Product evidence binds it to RF-072, RF-073, RF-074 and RN-064; the dominant risk is free-text response leakage across identity/scope boundaries. The architecture scout identified that `answers` has participant-only SELECT RLS, while `attempts` and assignments have staff-scope policies. Therefore the first implementation uses a separate internal read port/route and loops through authorized synthetic participant contexts inside one transaction, selecting answer item IDs/counts only. It does not add a table or broaden the `answers` policy. A set-based database function/view is deferred until representative scale evidence justifies it.

Frozen response shape for this milestone:

```ts
{
  kind: "reflection_management_aggregate",
  scopeId: string,
  generatedAt: string,
  modules: [{
    moduleId: string,
    totalAssignments: number,
    counts: {
      NAO_INICIADA: number,
      EM_ANDAMENTO: number,
      CONCLUIDA: number
    }
  }],
  evidence: "REFLEXAO_DIGITAL",
  practicalCompetenceClaim: "PROIBIDO_MVP"
}
```

The response contains no participant ID, email, answer text, attempt ID, item ID, score, ranking, or clinical decision. It uses `VIEW_PROGRAM_METRICS`, requires one explicit authorized `scopeId`, and keeps participant projections unchanged. `totalAssignments` is the explicit denominator and must equal the sum of the three status counts.

### Near-horizon DAG

```text
S0 product scout + S1 architecture/data scout (read-only)
  -> B0 contract and invariant freeze (Lead)
       -> B1 separate aggregate application/contract/repository/API (sequential shared-boundary work)
       -> B2 operations web/E2E (after B1 contract is stable)
            -> V0 targeted + live + E2E + full regression
                 -> C0 fresh independent critic
                      -> F0 targeted fix/retest if needed
                           -> I0 integration/docs/traceability/commit
                                -> N0 next largest gap
```

The manager aggregate lane owns only the reflection aggregate contract/use case/repository/API wiring and the relevant operations UI/tests. It must not alter the participant reflection semantics, clinical content, provider adapters, or unrelated operational dependencies. Because dashboard repository, `apps/api/src/http.ts`, and operations page are shared boundaries, implementation is sequenced under Lead ownership rather than written concurrently.

### Task ledger

| ID  | Role                    | Objective                                                                                                        | Dependencies       | Validation                                 | Status  |
| --- | ----------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------ | ------- |
| S0  | product scout           | Rank requirements/gaps and confirm next slice                                                                    | discovery evidence | read-only report                           | completed |
| S1  | architecture/data scout | Map current symbols/data and minimal safe aggregate boundary                                                     | current code/docs  | read-only report                           | completed |
| B0  | Lead                    | Freeze aggregate contract, invariants, and ownership                                                             | S0/S1              | reviewed plan + RED tests                  | completed |
| B1  | Lead                    | Implement separate aggregate domain/application/persistence/API with existing tables and participant-context RLS | B0                 | focused unit/contract/repository/API tests | completed |
| B2  | Lead                    | Integrate operations UI states and E2E/axe                                                                       | B1                 | Playwright state matrix                    | completed |
| V0  | Lead                    | Run live boundary and full regression checks                                                                     | B2                 | exact command evidence                     | completed |
| C0  | fresh critic            | Inspect artifact against relevant bar IDs without editing                                                        | V0                 | focused read-only PASS on persistence/contract boundary | completed |
| F0  | Lead                    | Fix largest confirmed gap and retest                                                                             | C0                 | focused + regression evidence              | completed |
| I0  | Lead                    | Reconcile docs/state/log/backlog/manifest and commit                                                             | V0/C0/F0           | release traceability                       | in_progress |

## Implementation strategy for the current milestone

1. Confirm from scouts whether existing attempt/answer rows can support counts without a migration. If not, stop at a contract/design correction rather than inventing a schema.
2. Define a bounded internal projection by one requested `scopeId` and `moduleId` with counts for `NAO_INICIADA`, `EM_ANDAMENTO`, and `CONCLUIDA`, no answer content and no participant-level output. Use `VIEW_PROGRAM_METRICS` and participant membership/transaction context.
3. Write RED tests for unauthorized scope, empty scope, duplicate/latest attempts, reflection item filtering, malformed query, and forbidden fields before implementation.
4. Implement the smallest immutable application projection, strict contract, separate repository/read port, internal API route, and operations rendering. Reuse existing RLS by setting `{scopeId, participantId}` per authorized participant in the surrounding transaction; never select `answers.response` and never broaden the answers policy.
5. Exercise the real PostgreSQL boundary with synthetic fixtures where environment capability permits; record explicit skips otherwise. Run E2E/axe against the operations page and then the full gate.
6. Obtain fresh independent criticism. Do not accept the builder's own verdict. Fix only observed material gaps and retest.
7. Update approved SPEC/API/runtime/audit documents, backlog, state, log, and traceability; commit only confirmed paths. Do not push or deploy.

## Recovery and rollback

- On resume, read `AGENTS.md`, this plan, `docs/99_runtime_state.md`, the latest log/backlog entries, `git status`, and current code/tests; reconcile stale pointers against executable reality.
- All local code/document changes are reversible through a normal follow-up commit; no destructive DB operation is authorized. Test databases/roles must be disposable and removed after validation.
- If a migration is needed, first produce a reversible expand/contract plan and validate it on a disposable PostgreSQL instance; do not apply it to production.
- If authorization, provider, clinical approval, external runtime, or remote CI is required, record the exact missing authority and continue only with safe local work.
- Never convert an unavailable check into PASS. Keep `PASS_WITH_GAPS`, `WAITING_HUMAN_APPROVAL`, or `BLOCKED` explicit as applicable.

## Current next action

Reconcile the focused independent C0 PASS with the full verification evidence,
commit the reviewed files locally, update the artifact SHA, and run the clean
release traceability gate. The live PostgreSQL boundary remains an explicit
unavailable check when its required environment variables are absent.

## Progress history

- 2026-08-23 recovery: read all files under `docs/` (state, log, backlog), applicable root/nested instructions, lifecycle gates, BUILD records, current reflection/OPS audits, and required Gauntlet/Orchestrate/Engineering references.
- 2026-08-23: `REFLECTION-035` participant slice and `OPS-034` local snapshot are existing evidence; the global project remains incomplete and the next largest local product gap is the protected management aggregate.
