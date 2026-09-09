# UI visual round 8 — operations action rail

## Scope

- task: `UI-VIS-001`
- run: `UI-VIS-001-R8-OPERATIONS-RAIL`
- observed_at: `2026-09-06T17:24:49-0300`
- target: `/operations`
- change: expose the two management actions first in a compact anchor rail and
  reduce repeated management error panels to a horizontal desktop composition
  with a stacked mobile fallback.
- preserved: existing Portuguese copy, route contracts, permissions, API data,
  semantic state labels, and the existing generated Blender/Comfy assets.

## Acceptance and evidence

| Criterion                                                   | Procedure                                                                                                                                                                                          | Result                                                                                                                                                    | Evidence                                                                      |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| The rail exposes management actions before secondary queues | Focused Playwright run of `tests/e2e/visual-gauntlet.spec.ts -g "direct section index"` against the isolated Next dev server on `3111` using a temporary no-webserver config removed after the run | PASS, 1/1; eight links, `Adicionar veterinário` and `Profissionais` first                                                                                 | `tests/e2e/visual-gauntlet.spec.ts`; focused runner output                    |
| The focal surface retains accessibility baseline            | Same focused test with `AxeBuilder`                                                                                                                                                                | PASS, zero axe violations                                                                                                                                 | focused runner output                                                         |
| Responsive geometry remains bounded                         | Direct Playwright render at 1440/768/390 CSS px                                                                                                                                                    | PASS; `scrollWidth === clientWidth` at all three widths                                                                                                   | render procedure; screenshots below                                           |
| The rendered result is inspectable                          | Direct Playwright screenshots on isolated port `3111`                                                                                                                                              | OBSERVED; eight links at all three widths                                                                                                                 | screenshot hashes below                                                       |
| Source and type contracts remain valid                      | Prettier check, focused ESLint, `pnpm --dir apps/web typecheck`, `git diff --check`                                                                                                                | PASS                                                                                                                                                      | command output at this run                                                    |
| Production-shaped web artifact remains renderable           | `next build` in a temporary workspace, `next start` on `3112`, and the complete `visual-gauntlet.spec.ts` against the cookie-validating synthetic fixture                                          | PASS; build completed and visual suite `7/7` passed, including the three route-matrix viewports, rail, state variants, participant rehydration and stress | fresh Playwright output; temporary server and workspace removed after the run |

## Render identities

- `visual-round8-operations-1440.png` — SHA-256 `e2432193b40fe48efc073ef983fd21ceb742690f06c11337466af3d6fb1b9e3f`
- `visual-round8-operations-768.png` — SHA-256 `ebfe041233f8f8e125eab44737c4ac8ecfe3f0f812ed9a5c87eb6b36ee1aacde`
- `visual-round8-operations-390.png` — SHA-256 `1dd75f3d61f3a2dd389373817e13ea846dddd5dc8ac7dd21617f492dd2c2bb71`

## Critique and iteration

The fresh read-only critic returned `CONDITIONAL PASS` with HIGH confidence and
identified the largest gap as buried operational actions after repeated
secondary states. The correction was implemented in the same source slice and
re-rendered. No files were changed by the critic.

The permanent route-matrix command was first attempted against the isolated
development server. It did not reach `/operations`: the pre-existing keyboard
walk on `/` focused a `NEXTJS-PORTAL` host element without focus styling. This
remains a dev-harness limitation and was not converted into PASS. The source
was then rebuilt in an isolated temporary workspace and the complete visual
suite was rerun against `next start` on `3112`; the synthetic proxy fixture
was restored after an initial fixture process exit, and the final run passed
`7/7`.

## Tool route status

- Blender: `OBSERVED`; connected to `CVG_Visual_Asset` in Eevee, camera and
  orbital objects present, no missing external files. Existing asset remains
  `apps/web/public/assets/cvg-orbit-render.png`.
- ComfyUI: `OBSERVED`; local server healthy at the configured loopback target,
  RTX 3060 reported, template search returned available local/API options.
  Existing synthetic texture remains
  `apps/web/public/assets/eac4bfca_000.png`; no new queue was submitted for
  this bounded code iteration.
- OpenDesign: `BLOCKED`; active-context and project-list calls returned
  `Transport closed`. No project mutation or export is claimed.

## Limitations and next action

This is bounded local visual evidence only. Native browser zoom, assistive
technology, live PostgreSQL/RLS, production deployment, clinical content,
real participant data, and a global AAA verdict remain unverified. Next safe
action: select the next bounded local visual slice after this fresh
production-shaped pass; do not call the product globally AAA.

## Production-build revalidation after Round 8

After the dev-harness limitation, the current source was copied to an isolated
temporary workspace and rebuilt with `next build`; TypeScript and static page
generation completed successfully. `next start` served the artifact on
`127.0.0.1:3112` with the local cookie-validating proxy fixture on `3103`.
The complete current `tests/e2e/visual-gauntlet.spec.ts` then passed `7/7`:
three route-matrix viewports, the direct operations section index, participant
rehydration, loading/empty/success state variants, axe checks and frontend
stress/reflow. The first run exposed only that the synthetic fixture process
had exited; after restoring that fixture, the rerun passed and all temporary
processes/workspaces were stopped or removed.

The broader historical synthetic E2E record of `41/41` remains documented in
the canonical backlog/traceability history; this checkpoint claims the fresh
visual production-shaped result as `7/7`. This closes the bounded Round 8
visual verification, but does not change the limitations on native zoom,
assistive technology, live PostgreSQL/RLS, production deployment, clinical
content, real participant data or the global AAA verdict.

## Round 9 — mobile hierarchy and resilient error composition

- `recorded_at`: `2026-09-06T18:04:06-0300`
- `scope`: `/operations`, mobile rail and repeated operational error states;
  no API, domain, persistence, clinical-content or public-boundary change.
- `material findings addressed`: independent critics found mobile rail
  truncation/singleton wrapping, narrow error-message/button composition and
  small or low-contrast secondary copy. The implementation added a balanced
  two-column mobile rail, a dedicated primary management CTA, full-width
  stacked retry actions below `480px`, and a `14px`/`1.4+` readable secondary
  text floor with darker color.

### RED/GREEN and production-shaped evidence

- RED: the focused rail test first failed because the primary CTA marker was
  absent; after the CTA, layout, alert-stack and typography assertions were
  added, each corresponding stale-build failure was corrected.
- GREEN: the focused Playwright test passed `1/1` against the current dev
  render with axe zero, eight bounded links, balanced mobile rows, readable
  text metrics and stacked error actions.
- Production-shaped revalidation: the isolated `next build` completed, and
  the current `next start` run passed `tests/e2e/visual-gauntlet.spec.ts`
  `7/7` across the route matrix, section index, rehydration, state variants
  and stress checks.

### Current render identities

- `operations-1440.png` — SHA-256
  `c28bdee6d003682ed96e1c162d039dd8647998a40599976ef149fa0a5c7638b2`
- `operations-390.png` — SHA-256
  `cb2f2b756f738b27b48c5275071242e7176c0806783760726c0b223cf9c7d8ca`

### Independent critique

The fresh native-size visual critic `Beauvoir` returned `PASS` with high
confidence (`0.92`) and no material finding in the `1440px` or `390px`
renders. Motion and assistive-technology behavior were not inferred from
static screenshots. This is a bounded visual PASS, not a global AAA,
production, clinical or competence claim.

### Tool connection checkpoint

Blender remained connected on `127.0.0.1:9876` with scene
`CVG_Visual_Asset` and no missing files; ComfyUI remained healthy on its local
loopback service with the existing synthetic asset preserved. OpenDesign
active-context access still returned `Transport closed`; no OpenDesign run,
mutation or export is claimed.

## Round 10 — authoring/recovery and operations mobile scanability

- `recorded_at`: `2026-09-06T18:30:57-0300`
- `scope`: `/authoring`, `/recovery` and `/operations` responsive composition;
  no API, domain, persistence, clinical-content or public-boundary change.
- `initial revalidation`: production-shaped `next start` visual suite passed
  `9/9`; a fresh critic `Boole` returned `REVISE` with confidence `0.96` and
  identified one P1 in operations mobile (compressed scanning) plus P2s for
  authoring density, repeated freshness badges and secondary-text contrast.

### RED/GREEN and production-shaped evidence

- RED: the new operations scanability assertions failed because the direct
  report sections had no mobile grouping surface; the authoring grouping
  assertions likewise failed on transparent, ungrouped blocks. Recovery's
  invalid-state action had already been covered by its earlier RED/GREEN test.
- GREEN: mobile operations panels now receive bounded cards, readable section
  headings, full-width filters, larger table headers and padded empty states;
  repeated report freshness pills are suppressed on mobile while the aggregate
  management timestamp remains visible. Authoring metadata/choice groups now
  have explicit surfaces and stronger auxiliary-text contrast. The focused
  authoring/operations tests passed `2/2`, with axe zero and no global overflow.
- Production-shaped revalidation: `next build` passed; the complete current
  `tests/e2e/visual-gauntlet.spec.ts` passed `10/10` against `next start` on
  `127.0.0.1:3112` with the disposable cookie-validating fixture. The suite
  covers 1440/768/390 route matrices, action rail, authoring grouping,
  operations grouping, invalid recovery, rehydration, state variants, axe and
  frontend stress/reflow.

### Current render identities

The current route-matrix renders are generated from the production-shaped
artifact. Hashes are recorded for reproducibility; the generated screenshots
remain test evidence rather than release artifacts.

- 1440px: `home` `ef88b7183f79c5cfb2eca76b71be9627b87ba0b54f232ba0916c1ab127b8ced7`,
  `diagnostic` `ecc60ed9e1f43b5d782ef16a0ec42b071a0074ca47a2f858b4a888cd4d92c932`,
  `operations` `bc084fa8781c70fe96d88f28d001cbcd14e910a7876d1f1730f687d9ff677b33`,
  `authoring` `a15565b7bf2e643fff2437b9a1fb542f8859f5d3f6e5fda5300ee580e6126f63`,
  `recovery` `75a79e659136d56b5c2334ace36ed1cd6ca61ec374d843c2ae0e418dc9ac09d4`.
- 768px: `home` `610479327e97da969f72f12cb5309c7a4742ae625a33faa58a4618bd04f6f242`,
  `diagnostic` `6810ad48a4e19810bf3c876a040aa55571c0106c70f58749d9e1d4063bd64fd0`,
  `operations` `3a5106aa8a82a087da4733204a63faf6250d03c00782239d2435b0dd91f6d373`,
  `authoring` `32271537a41c60bd28cb2c12a1331e64242f60f66a3b468b54af7ec3e1857efa`,
  `recovery` `cedd50afc234d7da7113ed6a9dd5c106efab91f8df3a9924633d59c35c47e3eb`.
- 390px: `home` `e27f67ef3c2f5672f2409a1066ae78a3883f30291ed7049ec1816467c72952b6`,
  `diagnostic` `7902ed2411cba4d0111a1e83e52b0f1d01587a5fd8e223c188942fd70df6d625`,
  `operations` `8abd932d08499f5b865ec58ba27ea6149399515516d1c849b8ed87bd2d9eae3f`,
  `authoring` `45a7ee1f7516331f60b92779f390c15c04ad3ad824714999d9d8b0b5ec7b2be3`,
  `recovery` `5d8a362dc6385ed6f85bc7ab4ed0bbc89f9d4b5c7ad3be93026563aec386c8e4`.

### Independent critique and tool status

The post-correction fresh native-size critic `Chandrasekhar` returned `PASS`
with confidence `0.95` and no P0/P1/P2 finding. It specifically found no
material mobile scanning, legibility, overflow or action problem; tables were
recognized as intentionally horizontally scrollable. Static screenshots do
not prove native zoom or assistive-technology behavior.

Blender remained connected to `CVG_Visual_Asset` on `127.0.0.1:9876`, with
camera/orbit/light objects present and no missing files. ComfyUI remained
healthy on its local RTX-backed service; existing synthetic assets were
preserved and no new queue was required for this bounded code iteration.
OpenDesign active-context access returned `Transport closed`; no OpenDesign
Cloud or Local Codex run, mutation or export is claimed.

This is a bounded local visual PASS only. Live PostgreSQL/RLS, production
deployment, native zoom, assistive technology, clinical review/publication,
competence, `AAA-001` and global AAA/perfection remain outside the evidence.

### Final tool reconnection checkpoint

- `recorded_at`: `2026-09-06T18:45:48-0300`
- The Blender bridge had a transient disconnect during final cleanup. A fresh
  local Blender process was started with the MCP bridge on `localhost:9876`;
  the MCP readback now returns `CVG_Visual_Asset`, workspace `Layout`, camera
  `CVG_Visual_Camera`, core/ring/node/light objects and `missing_files: []`.
  The scene is synthetic and ephemeral; no repository file was overwritten.
- ComfyUI remains healthy on `127.0.0.1:8188`, with the existing synthetic
  texture preserved. The temporary fixture, Next dev/server and Playwright
  config/processes owned by this run were stopped/removed; Blender and ComfyUI
  are intentionally left available for the requested MCP workflow.

### Final verification checkpoint

- `corepack pnpm verify:traceability`: passed — manifest structurally valid with
  current artifact evidence.
- `corepack pnpm verify:documentation`: passed — canonical files, evidence,
  roadmap, backlog and traceability are consistent.
- `git diff --check`: passed with no output.
- The repository remains in `IN_PROGRESS`; selecting the next local bounded
  slice (`AAA-203`/`AAA-204`) and the live gates remain conditional on the
  declared human approval and disposable database URL.
