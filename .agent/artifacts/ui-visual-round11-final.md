# UI-VIS-001 — Round 11 final visual evidence

- recorded_at: `2026-09-06T20:06:25-0300`
- scope: bounded visual frontend work in `apps/web`; no API, domain,
  persistence, clinical-content or public-boundary change;
- verdict: `PASS` bounded local visual lane. Fresh critics `Ptolemy`,
  `Lovelace` and `Raman` found no P0/P1. Remaining P2 observations are
  density/secondary-contrast polish in the long empty operations mobile view,
  not clipping or a blocked flow.

## Round changes

- Blender MCP supplied the synthetic asset
  `apps/web/public/assets/cvg-orbit-render-v2.png`: 1000×1000 RGBA,
  `587647` bytes, SHA256
  `ffc30f974ac2ab070c6bf0ee7a138965e971e2323ff3dcf00be8aef1fc968271`.
  The connected scene is `CVG_Visual_Asset`, workspace `Layout`, EEVEE,
  collection `CVG_Orbital_Asset_V2` with 17 objects, `CVG_V2_Camera`, seven
  CVG materials and the synthetic texture `eac4bfca_000.png`. No `.blend` was
  saved into the repository; the scene remains ephemeral.
- The shared shell now uses the Blender render as a restrained orbit motif
  with bounded drift motion and a lower-ornament recovery treatment.
- `/authoring` now exposes a clear queue-first command bar, disclosure-gated
  authoring tools, readable synthetic scope labels, consistent empty-state
  surfaces and a single dedicated primary action, `Criar ou abrir um item`.
- `/operations` is organized into three visual lanes, with a sticky section
  rail, overview-first navigation, 2×2 mobile metrics and an explicit
  horizontal-table affordance (`Deslize para ver todos os campos ↔`).
- `/recovery` uses a one-column, security-specific composition with reduced
  ornament contrast rather than inheriting the operational surface wholesale.

## RED/GREEN evidence

- RED: fresh visual critique identified operations mobile scanability, rail
  placement, table affordance, metric density and inconsistent authoring empty
  states; a second critique also identified a redundant authoring CTA.
- GREEN: lane grouping, sticky/overview-first rail, mobile table hint, 2×2
  metrics, consistent empty surfaces and the final single primary authoring
  action were implemented and rerendered.
- `tests/e2e/visual-gauntlet.spec.ts`: `11/11` passed in one worker in `57.4s`
  on the final built web artifact, covering 1440/768/390 matrices, section
  index, disclosure/focus, recovery, rehydration, variants and stress/reflow.
- `tests/e2e/authoring-review.spec.ts`: `5/5` passed in `8.6s`.
- `corepack pnpm --dir apps/web typecheck`: PASS.
- `corepack pnpm --dir apps/web build`: PASS.
- Prettier check and ESLint passed with zero errors; ESLint reports only the
  existing CSS-file ignored warning. `git diff --check`: PASS.

## Final render identities

The six retained route renders are synthetic local evidence, not release
artifacts:

- `operations-1440.png` — SHA256
  `81b565c16e7656062cab370b07d391f5c378b15651e3768369225e658b46c7f8`;
- `operations-390.png` — SHA256
  `e8c1a233803941b7c98f736cb232f930243431f601e748e32d1ccf30ff28d0ae`;
- `authoring-1440.png` — SHA256
  `144cdbac819814a4a361c60d99f5848365e99d96b06b9a57ad0046884737543d`;
- `authoring-390.png` — SHA256
  `88824b71ad4d11c2488cf2b8b818a0e20b26fe476e1ef488a8dc1f6180e513df`;
- `recovery-1440.png` — SHA256
  `e235ead029cb1d6d71eca348ba3bcab19ee62af46562102e13ada63aa351d8a7`;
- `recovery-390.png` — SHA256
  `9ef6c1c5bb08cc1f99fb5f404e8c538fbf2c7d241d5643613b5c081611f68473`.

## MCP status and limits

- Blender MCP readback is healthy and was performed after the user's request
  to connect Blender.
- ComfyUI `server_info` is healthy at `127.0.0.1:8188` on an RTX 3060 with
  12 GB VRAM; the existing synthetic texture was preserved and no real data
  was used.
- OpenDesign active-context access returned `Transport closed`; no mutation,
  export, cloud run or fabricated OpenDesign result is claimed.
- This evidence does not prove native zoom, assistive technology, real user
  review, live PostgreSQL/RLS, production deployment, clinical publication,
  remote workflow or a global AAA/perfection claim.
