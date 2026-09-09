# UI visual quality bar — CVG frontend — 2026-09-06

Status: BOUNDED PASS WITH LIMITATIONS — UI-VIS-08 `PASS`

## Scope

This bar covers only the visual surface of `apps/web`: the shared shell,
typography, surfaces, controls, states, responsive composition, motion and
locally generated decorative assets. It does not authorize changes to API
contracts, route behavior, clinical wording, authorization, persistence,
publication or participant data boundaries.

## Acceptance criteria

| ID        | Criterion                                                                                                                                                | Evidence required                                                          |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| UI-VIS-01 | `/`, `/diagnostic`, `/operations`, `/authoring` and `/recovery` retain their primary heading, landmark and contextual action at 1440px, 768px and 390px. | Fresh Playwright render matrix and screenshot inspection.                  |
| UI-VIS-02 | No global horizontal overflow. Intentional dashboard table scrolling remains bounded inside `.dashboard-table-wrap`.                                     | Browser measurement at every viewport plus pixel inspection.               |
| UI-VIS-03 | Every button, link, input, select and textarea has a visible keyboard focus ring and remains usable at narrow widths.                                    | Keyboard pass and axe-core scan.                                           |
| UI-VIS-04 | Loading, empty, error and success feedback remain distinct by layout and text, not color alone.                                                          | Synthetic fixture states or existing E2E paths; state inventory in report. |
| UI-VIS-05 | Motion is restrained, communicates entrance/interaction, and is disabled for `prefers-reduced-motion`.                                                   | Computed-style check with reduced-motion emulation.                        |
| UI-VIS-06 | No undefined visual tokens, broken asset requests or invalid CSS declarations in the rendered app.                                                       | Static token scan, browser console/network capture, build.                 |
| UI-VIS-07 | The visual pass does not regress behavior or contracts.                                                                                                  | `apps/web` build/typecheck, existing E2E/axe, diff review.                 |
| UI-VIS-08 | The independent critic finds no P0/P1 visual, accessibility or responsive defect in the bounded scope.                                                   | Fresh-context critic response after the final render.                      |

## Frozen design direction

The visual language is an editorial observatory: warm mineral paper, deep
forest controls, acid chartreuse signal, cool blue orbit accents, serif display
headings and translucent layered surfaces. The ComfyUI contour texture and the
Blender orbital render are decorative only; they never carry product meaning,
clinical claims or user data.

## Baseline evidence

- Baseline screenshots: `/tmp/cvg-baseline-1440--.png`,
  `/tmp/cvg-baseline-1440--diagnostic.png`,
  `/tmp/cvg-baseline-1440--operations.png`,
  `/tmp/cvg-baseline-1440--authoring.png`, and their 390px counterparts.
- Baseline finding: shared white cards, flat green controls, no texture system,
  no explicit reduced-motion transform reset and an undefined `--surface` token.
- The baseline was rendered against the repository web build on port 3110;
  unrelated services already occupied the default port 3100.

## Integration evidence and limits

- ComfyUI local generated and the repository now contains
  `apps/web/public/assets/eac4bfca_000.png` (1024×1024, inspected before use).
- Blender MCP connected to an isolated factory-startup instance and rendered
  `apps/web/public/assets/cvg-orbit-render.png` (1000×1000 RGBA, Eevee). The
  scene was saved only to `/tmp/cvg-visual-asset.blend`; no existing scene was
  opened or overwritten.
- OpenDesign transport was unavailable during discovery; no OpenDesign result
  is represented as evidence and no external artifact is required for this
  bounded implementation.

## Final round evidence

- Render matrix: `/tmp/cvg-round1-768-home.png`,
  `/tmp/cvg-round1-768-diagnostic.png`,
  `/tmp/cvg-round1-768-operations.png`,
  `/tmp/cvg-round1-768-authoring.png`,
  `/tmp/cvg-round1-768-recovery.png`, plus the 1440px/390px round-1 renders.
- Focus/reduced motion: `/tmp/cvg-round2-390-focus-input.png`,
  `/tmp/cvg-round2-390-reduced-motion.png` and
  `/tmp/cvg-round3-768-operations-table-focus.png`.
- Rich state: `/tmp/cvg-round3-768-operations-populated.png` shows populated
  metrics/tables with internal table scrolling; `/tmp/cvg-round3-390-authoring.png`
  shows one scope-load error and the corrected mobile hierarchy.
- Browser checks: axe zero on all five routes at 1440px/768px/390px; global
  `scrollWidth === clientWidth` at each viewport; both assets returned HTTP 200;
  reduced-motion computed animation/transition is `0.01ms` with transforms reset;
  focused native controls and `tabIndex=0` table wrappers expose a dark-green
  outline and chartreuse halo.
- Regression gates: `pnpm --dir apps/web build` PASS, final synthetic E2E
  `39/39` PASS, `pnpm --dir apps/web typecheck` PASS, focal ESLint/Prettier
  and `git diff --check` PASS. The permanent visual suite in
  `tests/e2e/visual-gauntlet.spec.ts` is `6/6`: the three viewport route
  matrices, loading/empty/success states, the rehydrated participant activity
  regression and the frontend stress pass. The authenticated fixture also
  passes axe with zero violations and proves the mobile privacy panel stacks
  below the activity.

## Revalidation after session-integrity rebaseline

- The rebaseline invalidated the prior visual evidence, so the current build
  was rendered again after the session rehydration slice.
- The first current run exposed a real mobile cascade defect: a later visual
  rule restored the two-column `learning-layout` at 390px, compressing the
  content column to approximately 9px. The final mobile rule now forces one
  column; the authenticated regression covers this exact failure mode.
- The authenticated activity shell also exposed an axe landmark violation
  caused by an `aside` nested inside a section landmark. The outer layout is
  now a neutral `div`, leaving the complementary landmark top-level without
  changing route behavior or public data.
- Latest authenticated renders are
  `test-results/visual-gauntlet-keeps-the--bdeae--activity-stacked-on-mobile/authenticated-1440.png`
  and `authenticated-390.png`; public matrix renders remain under the
  `visual-gauntlet-premium-*` result folders.
- The first fresh critic found P1 contrast on the privacy rail and P1/P2
  presentation defects in the authenticated header, disabled controls and
  authoring hero. The rail text, first-frame header opacity, disabled-state
  tokens and authoring `hero-copy` grouping were corrected and rerendered.
- The prior independent critic returned `PASS` with no P0/P1 blocker; its P2
  authoring grouping observation was fixed in the final render. Because the
  later semantic heading correction changed the implementation, a short
  delegated critic was requested for this revalidation and returned `REVISE`.
  Its inherited context makes it advisory `I0`, not a sealed independent
  acceptance; the bounded evidence is current, but the visual lane remains
  open for independent same-SHA closure.

## Final revalidation after critic findings

- `pnpm --dir apps/web build` PASS after the header/disabled-state, authoring
  composition and heading-hierarchy fixes.
- `tests/e2e/visual-gauntlet.spec.ts` PASS `6/6` and synthetic E2E PASS
  `39/39`; axe remains zero, the mobile participant layout remains stacked,
  and the desktop authenticated header is visible from the first frame.
- The final authoring desktop render groups “Registro editorial”, “Abrir item
  autoral” and its description in one reading column while keeping the access
  form in the adjacent column; the mobile authoring render remains usable.

## Stress and semantic revalidation

- `frontend-stress-evidence.json` records all five routes at 390px with
  `scrollWidth === clientWidth`, one `h1`, no undersized visible targets,
  successful 200% zoom reflow, successful long-copy mutation and CLS at or
  below `0.1`; the largest local asset is approximately 1.35 MB and each
  route remains below the transfer budget.
- The authoring queue remains the only `h1` state heading; draft/review panels
  use `h2`, preserving the route-level hierarchy without changing workflow
  behavior.
- The evidence packet is
  `.agent/artifacts/frontend-quality-packet.json`; the deterministic frontend
  gate report is `.agent/artifacts/frontend-quality-gates.json` and returns
  `PASS` for all four sections. Asset and token audit reports are retained in
  `.agent/artifacts/frontend-assets.json` and
  `.agent/artifacts/frontend-token-audit.json`.

## Final rerun after loading, target and disabled-select corrections

- The authenticated initial journey now exposes a loading heading/status
  before readiness; journey errors expose an alert.
- The interaction-target evidence includes native radio/checkbox labels and
  the populated operations `.account-actions` variant at 390px and 195px.
- `select:disabled` is explicitly styled and its measured text/background pair
  passes 5.99:1; visual `6/6`, E2E `39/39`, build, format, documentation,
  traceability, asset audit and all four quality gates pass.
- The narrow reflow check uses 195 CSS px as a deterministic proxy for 200%
  zoom. Native browser zoom and assistive technology were not independently
  measured.
- The final fresh-context critic is recorded in
  `.agent/artifacts/ui-visual-critic-2026-09-06-final.md` and returned `PASS`
  for UI-VIS-08 after inspecting the current route/state renders: no concrete
  P0/P1 visual, accessibility or responsive defect was observed. Earlier
  timed-out critic attempts remain historical evidence and are not used as
  approval.

## Closure and limitations

The bounded visual quality bar has current local evidence for the inspected
frontend surface and a bounded UI-VIS-08 `PASS`. The full root `pnpm verify`
has a prior PASS record; targeted build/typecheck, visual, stress,
quality-gate and synthetic E2E evidence is current. Native browser zoom and
screen-reader behavior were not independently measured. OpenDesign remained
unavailable due transport closure. This artifact does not claim live runtime
integration, production readiness, clinical publication, AAA-001 approval or
global product perfection.
