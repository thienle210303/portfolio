# Round 21 phase 7 — the cats: report

Branch `round-21/cats`, commits `31be56b..4d8d440` on top of main `0b5d8c4`, main `df1472b` merged at `7e3d650`. Not pushed, not merged.

## Built
- `scripts/draw-cats.mjs` (`pnpm draw:cats`): seeded SVG symbol sheets in `public/cats/` (moon, mi, police). Per cat: `look-0..8` (3×3 head directions), `react-0..8` (blink, yawn, purr, startle, stretch, groom, bat, sniff, sleep), `walk-0..7`, and the sitting tail apart (`tail`, `tail-puff`) so CSS sways it. Drawn in the hero's line; the sleep cell is "Moon, off duty" itself. Moon: solid blue-grey coat, small ears. Mi: light coat, mackerel stripes, forehead M, tail rings, white socks, taller ears. Sheets open as a visible grid. Equality test: `tests/lib/cats.test.ts`.
- `CompanionCat.tsx`: one `<use>` per frame (same-origin external use inherits currentColor and the tone/paper aliases). Same props; `frameFor` and `lookCell` exported and unit-tested. Head tracking (fine pointer, motion allowed, sitting only; one shared rAF-throttled listener). Press = one reaction cell for 700 ms (one frame under reduced motion). Flick = glance back. Idle repertoire gains yawn and purr. Frames commit only when the sprite can show the change.
- Deleted: the contour builder and the ground-knockout masks (CompanionCat 750 → ~320 lines); MiniThien keeps its own small two-pass renderer.
- Moon surprise (`companion-surprise.ts`, unit-tested; loop wiring in Companion.tsx): first walking cat within 150 px of `[data-moon-off-duty]` stops, startles (startle cell + hop), creeps (¼ speed) to a probed seat left of the drawing (right on phones), sniffs, sits 7 s. Once per visit (sessionStorage in try/catch, in-memory fallback). Gets up if content arrives under the seat. Reduced motion / touch: `MoonVisit` — Mi simply sits beside it, once per visit; her seat in the corner button is left empty.
- Glitches: parked pair moves to a corner spot that covers no control (`pickCorner`; never the focused control; peeks in from the right edge where nothing is clear; moved by transform, CLS 0). Tree show: watchers sit beside the tree box, not clamped top-left. Patches: coats instead of ground fills. Bubbles/caption keep off controls and prose.
- After the merge (review notes): walks route round text (`routeAround`, `slideOffText`), explorers prefer stops whose straight walk crosses no text (`walkClear`), mood perches need a clear head band.

## Size (pnpm perf, 0 skipped, 3 runs, bytes identical)
| Build | JS at load | JS | companion chunk gzip |
|---|---|---|---|
| main 0b5d8c4 | 167,698 | 194,261 | 26,356 |
| main df1472b | 167,236 | 193,799 | 26,356 |
| cats merged 52390bd | 167,234 | 195,491 | 28,071 |
JS at load −2 B vs main; idle chunk +1.7 KB gz; sheets 4.1/4.9/1.8 KB gz. DOM 2293 → 2266. CLS 0.

## Tests
- `pnpm verify` 5/5: 909 unit tests (58 files), contrast 62 pairings ≥ AA.
- Full e2e, fresh production build, `--workers=2`: 803 passed, 1207 skipped, 0 failed.
- New e2e (companion.spec.ts, "cats (round 21)"): sheets served; Moon surprise (walking, once); reduced-motion visit (once); parked pair off hero controls and off the focused control (checked to fail with the corner pinned); tree watch beside its box; the three review cases (390 Wordification year, 1280 Contact lede incl. walking, phone "Greetings from"), 20/20 in repeat runs.

## Screens (reports/r21-p7-screens/)
390, 768, 1366, 1440 × day/night: sit, walk, react, panel, startle, sniff, surprise, sleep; phone top/react/moon/journey; merged-* after the merge. Observations: coats read as cats on both skies and on lantern paper; Mi's coat is dark at night with light ink, Moon mid-grey; the surprise reads (Moon sits by its twin); the phone visit puts Mi right of the drawing at the caption's baseline.

## Imperfect / open
- Text routing is greedy (≤2 corners, ≤4× walk, inside the cats' band): text as wide as the window is still crossed, rather than stall a cat.
- Mini-Thien's spot is not checked against text (stood on "Taylors, SC" in one 1280 night shot).
- The peeking parked pair shows Mi's rear/tail, not a face.
- Tour, watch, escort and chase walks are not routed (clocked walks; a chase follows the pointer).
- `pnpm` on this machine resolves to an nvm Node 20 shim; I ran everything through Node 26 (`node …/corepack/dist/pnpm.js`).

## Review round (2026-10-22/23), commits 861aa5c..5017b0f

- Main `ba45717` (the Record) merged at `67798f6`. Only conflict: the tracker, both sides kept. The Record's tour stop and scene merged cleanly and play on the sprites. Dropped the stale `list-ink.tsx` comment.
- "Book a call with me" at 1366: cats now pass *under* any link, button or Record list item they cross (the part of the cat over it is clipped, measured live). A destination on one is nudged to clear ground; the stop moves with it. Mini-Thien prefers a clear head band.
- Record at 414 and 1280: its list items are treated like controls. On a phone screen of full-width rows with no clear ground at all, a cat rests behind a row with only the part beside it showing.
- Fixed along the way: three ways a cat could pace on the spot (two stacked blocks, an end the band cannot reach, a follower routed round the lead). Also fixed: sheets were re-requested on every frame change (138 requests in 8 s); each is now fetched once, and frames go into the DOM only when first drawn.
- e2e: a coverage test at 1366/390 (whole page) and 414/1280 (`#record`). It fails with `passUnder` disabled (checked).
- Size vs main `ba45717`: JS at load 168,400 → 168,396 B; idle companion chunk 26,418 → 29,606 B gz; DOM 2,734 → 2,741.
- Validation at `0c09d17`: `pnpm verify` 5/5 (932 tests). Full e2e on a fresh production build: 821 passed, 1327 skipped, 0 failed.
- Open: a block of words wider than the window, or a dense stack where sliding gains nothing for 2.5 s, is still crossed (over prose; controls are passed under). Not my files: the Record builder's guard hook flagged `public/scenery/{pressed-lotus,record-*,stamp-*}.svg` in another checkout during my run. They are not in this worktree's changes.
