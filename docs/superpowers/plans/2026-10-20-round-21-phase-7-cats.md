# Round 21 Phase 7 — the cats

**Spec:** `docs/superpowers/specs/2026-10-18-round-21-outdoors-design.md` §7.
**Method:** page-mascot's technique (3×3 head directions, 3×3 reactions, a
walk cycle), not its package.

## Budget before (main `0b5d8c4`, production build, `pnpm perf`, 0 skipped)

JS 194,261 B, JS at load 167,698 B. Companion chunk (idle-loaded, not at
load): 81,908 B raw, 26,356 B gzip.

## Decisions

- **Sheets are SVG symbol sprites**, one file per cat under `public/cats/`
  (`moon.svg`, `mi.svg`, `police.svg`), drawn by `scripts/draw-cats.mjs`
  (seeded, deterministic, no newlines) and fenced by an equality test like the
  scenery's. Each file holds `look-0..8` (3×3 head directions, sitting),
  `react-0..8` (blink, yawn, purr, startle, stretch, groom, bat, sniff, sleep)
  and `walk-0..7`; its root lays the cells out as the sheets, so opening the
  file shows them. The page draws a frame with `<use href="/cats/moon.svg#walk-3">`:
  same-origin external `<use>` inherits `currentColor` and custom properties,
  so the ink follows theme, tone and `data-paper` exactly as today, and a frame
  change is one attribute. Not rasterised: an SVG sheet is smaller than any
  WebP of it at 2× and stays sharp.
- **Coats, not knockouts.** The old cats were filled with `var(--ground)` to
  hide what was behind them; on the sky gradient that flat fill read as a
  patch. Each cat now has a coat (`--cat-coat`, a mix of `--fg-muted` into
  `--ground`): Moon a solid blue-grey, Mi a light grey with mackerel stripes and
  white socks. A coat is meant to be seen, so it never reads as a hole.
- **CompanionCat keeps its props** (`variant`, `pose`, `phase`, `blinking`,
  `flick`, `hopping`, `swaying`, `scale`) so the loop, the space/moods/cadence/
  tour modules, RestingBox and the e2e hooks (`svg[data-cat]`,
  `data-cat-pose`, `data-cat-hop`) are unchanged. Its path-drawing body (the
  per-frame contour builder, Silhouette/LineWork masks) is deleted; MiniThien
  keeps its own copy of the two-pass helpers.
- **Head tracking and press reactions live in CompanionCat**, not the loop: one
  shared rAF-throttled `pointermove` listener (fine pointer, motion allowed,
  sitting only) picks a cell from the angle to the pointer with a dead zone; a
  press on the cat's button holds one reaction cell for 700 ms (one frame, no
  animation, under reduced motion). `flick` becomes a glance over the shoulder.
- **Moon surprise** (`companion-surprise.ts`, pure, unit-tested): the first
  walking cat within reach of `[data-moon-off-duty] svg` stops, startles (startle
  cell + hop), creeps to a clear seat beside it, sniffs, and sits. Once per
  visit (`sessionStorage`, try/catch). Reduced motion: Mi just sits beside it
  (a decorative copy portalled next to the drawing), once per visit.
- **Glitches:** (1) the parked pair (touch / reduced motion) is a fixed button
  in the corner and covered the hero's tags; it now moves to the clearest
  corner slot that covers no control, re-checked on scroll and focus.
  (2) Patches: coats, above. (3) Tree show: the watch fell back to `#tree`'s
  top + 72 px, which is far above the viewport mid-show, so both cats clamped
  to the top-left; the watch now anchors on the tree box's visible part.

## Tasks

1. Generator + sheets + equality test (`pnpm draw:cats`).
2. Sprite renderer in CompanionCat; MiniThien keeps the mask helpers; delete
   the contour code. Unit tests for frame selection and head direction.
3. Head tracking + press reactions + idle glances.
4. Moon surprise module + loop wiring + reduced-motion seat; tests.
5. Glitch fixes with tests.
6. Screens at 390/768/1366/1440, day and night; fix what reads wrong.
7. `pnpm verify`, e2e on a production build, `pnpm perf` after; tracker
   section; report.
