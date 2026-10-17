# Round 20 Phase 4 — Earth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `#worlds` into Earth A, the origin story. The globe and the flight stay. Beside them sits "One crossing, three stops", and clicking a stop turns the globe to it. The six chapters, five skins, 19 plaques and `WorldPanel` are retired.

**Architecture:**
- Content gets an authored `originStops` list. A pure `buildStops()` in `src/lib/origin-stops.ts` resolves each stop's label, date and caption from existing records plus two new authored captions.
- `GlobeCanvas` loses chapters, skins, markers, satellite, plinth and sapling. It keeps the coastlines, the flight, the landing, the robot walk and Sun/Moon, and the 2D fallback, and gains three stop pins and `focusStop(id)`.
- `WorldsStage` becomes globe + stop list + "Replay the flight".

**Tech Stack:** Next.js 16, hand-written WebGL2 + Canvas 2D (no 3D library), vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-10-round-20-redesign-design.md` §4. The layout reference is the Earth A board in https://claude.ai/artifact/DtnsC1ZKxmbV4CTmsL3AmE.

## Global Constraints

- pnpm only. Strict TS. No new dependency. **No 3D library.** Semantic aliases only. Blue is never decoration. WCAG 2.2 AA in both themes and all tones. `src/lib/` never imports `src/sections/`.
- These stay as they are:
  - `coastline-data.ts` is importable only by `GlobeCanvas.tsx` under `src/`.
  - `GlobeCanvas` reaches the page only via `WorldsStage`'s `import()`.
  - The WebGL2 → 2D fallback stays one-way per visit.
  - The coverage PNG stays baked and pinned.
  - The post-load chunk prefetch stays.
- Stops, verbatim from spec §4:
  1. Kiên Giang, Việt Nam — "where it starts"
  2. Taylors, South Carolina, December 2018 — "landed, and high school three weeks later"
  3. University of South Carolina, 2021–25 — "chemical engineering, then computer science"
- Captions are content fields:
  - Stop 1's label and date come from `origin`.
  - Stop 2's caption is `eastside-high.headline`, verbatim.
  - Stops 1 and 3 get new authored captions in `portfolio.ts`, first person per `docs/voice.md`. Draft:
    - stop 1: "Where it starts."
    - stop 3: "Chemical engineering first, then computer science."
  - Stop 3's date comes from `usc-degree.dateRange`.
- **New fact:** USC's coordinates, Columbia SC, `{ lat: 33.9938, lon: -81.0300 }`. It is authored in `portfolio.ts` beside `origin.coordinates`, with a comment naming the source (the university's public campus location).
- The flight plays once on first view (Phase 1 ruling). "Replay the flight" replaces the replay controls. The robot walk with Sun/Moon stays: it walks one lap after each landing. The two-lap toggle and the Technology chapter that hosted it go. Under reduced motion it shows its default still.
- Retired: `src/content/worlds.ts`, `src/content/skins.ts`, `src/lib/skins.ts`, the chapter/plaque parts of `src/lib/worlds.ts` (keep `crossingKm`, moved or kept), `WorldPanel.tsx`, `scene-names.ts` if only plaques used it, and their tests.
- Chat corpus: plaque documents are dropped. Optionally add one document per stop, citing `#worlds`. The retrieval eval floors 0.9 / 0.95 / 0.7 / 0.8 never move. The companion's world facts and dialogue lines switch from chapters to stops.
- CLAUDE.md "The globe" section is rewritten. The plaque and skin rules go. The fence, no-3D, fallback and lazy-chunk rules stay.
- Section heading: "One crossing, three stops." The eyebrow and nav label stay "Worlds" (`navItems` unchanged).
- A false comment, doc or copy is an Important finding.
- Worktree `.claude/worktrees/r20-earth`, branch `round-20/earth`.
  - Install with `npm_config_package_lock=true pnpm install`.
  - Use ports 3140–3149, a throwaway playwright config and `--workers=2`.
  - Kill processes by exact PID only.
- Merge when done. Push is pre-approved (Thien, 2026-10-16).

## Review Focus

1. **No WebGL2 / forced colours.**
   - The 2D globe draws the three pins and the flight path.
   - Clicking a stop turns the 2D globe.
   - Nothing says "needs WebGL" any more.
   - *Test: Task 3, `stops work on the 2D globe`.*
2. **Keyboard on the stop list.**
   - Buttons are reachable in order.
   - `aria-pressed`/`aria-current` marks the active stop.
   - The live region announces the stop's place.
   - *Test: Task 3, `stops by keyboard`.*
3. **A stop clicked mid-flight.** The flight lands, then the globe turns to the stop, with no stuck "Stop the replay" label. *Test: Task 3, `stop chosen mid-flight lands first`.*
4. **Reduced motion.** No flight animation, no robot walk, a still pose. Clicking a stop snaps. *Test: Task 3, `reduced motion snaps to stops`.*
5. **#worlds layout shift.** Removing the skin buttons' "needs WebGL" line removes the 52 px shift. The `ask.spec` coastline-PNG block becomes unnecessary: remove it, and its test must still pass. *Task 3.*

---

### Task 1: Stops content and model; retire chapters, skins, plaques

**Files:**
- Modify: `src/content/portfolio.ts` — `originStops`; the new captions; the USC coordinates; `src/types/portfolio.ts`
- Create: `src/lib/origin-stops.ts`, `tests/lib/origin-stops.test.ts`
- Delete: `src/content/worlds.ts`, `src/content/skins.ts`, `src/lib/skins.ts`. Strip `src/lib/worlds.ts` down to `crossingKm` (or move `crossingKm` into `origin-stops.ts` and delete `worlds.ts`, updating importers).
- Modify:
  - `src/lib/answer-corpus.ts` — drop plaque docs; add stop docs
  - `src/lib/companion-facts.ts`, `src/components/companion/companion-dialogue.ts` — chapters → stops
  - `scene-names.ts`, if it is now unused
- Tests: delete or rewrite `tests/lib/worlds.test.ts`. Update `tests/lib/answers.test.ts`, `tests/sections/CareerTree.test.tsx:12,107` and `tests/lib/sphere.test.ts` imports as needed.

**Interfaces:**

```ts
export interface OriginStop { readonly id: "kien-giang" | "taylors" | "usc"; readonly place: string; readonly when: string; readonly caption: string; readonly coordinates: { lat: number; lon: number } }
export function buildStops(): readonly OriginStop[]
export const crossingKm: number   // unchanged value
```

Where each stop's fields come from:

| Stop | place | when | caption | coordinates |
|---|---|---|---|---|
| `kien-giang` | `origin.from` | authored `originStops[0].when` ("2003–2018", from `origin.born` year to `origin.arrivedYear`, computed) | authored | `origin.coordinates.from` |
| `taylors` | `origin.to` | `origin.arrived` | `eastside-high` `headline` | `origin.coordinates.to` |
| `usc` | `usc-degree` `organization` | `usc-degree` `dateRange` | authored | authored USC coordinates |

- [ ] **Step 1: Write the failing tests.**
  - `three stops in order`.
  - `stop values trace to content`: each field `===` its named source; the computed `when` equals `${born year}–${arrivedYear}`.
  - `taylors caption is the high-school headline verbatim`.
  - `usc has coordinates`.
  - `crossingKm unchanged`: the same number as before; record it from the current `lib/worlds.ts` first.
  - `corpus has no plaque documents`: no doc has a plaque id or source.
  - `retrieval floors hold`: run the existing eval test.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3: Implement the content and model.** Delete the retired modules. Fix every importer except `GlobeCanvas`, `WorldsStage`, `Worlds`, `WorldPanel` and `gl/shaders`: Task 2 and Task 3 own those. To keep the build green between tasks, those UI files may temporarily import from a thin local shim, or Task 1 may stop at a red build only if the reviewer is told. **Preferred:** keep the build green by having Task 1 leave `lib/worlds.ts`'s chapter exports in place, marked `@deprecated — removed in Task 3`, and delete them in Task 3.
- [ ] **Step 4:** Run the unit tests and `pnpm typecheck`.
- [ ] **Step 5: Commit:** `Model the origin story as three stops and drop the plaques from the chat`.

### Task 2: Globe without chapters

**Files:**
- Modify:
  - `src/sections/Worlds/GlobeCanvas.tsx`
  - `gl/shaders.ts` (drop the chapter and skin uniforms; keep the one rest look)
  - `gl/sphere.ts:20`
  - `glyphs.ts` (drop what only markers used)
- Tests: `tests/sections/GlobeCanvas*.test.tsx`, `tests/lib/sphere.test.ts`

**Interfaces:**
- `GlobeCanvas` props:
  - removed: `worlds`, `currentId`, `onSelect`, `skinId`, `onSurfaceChange`'s skin role, `robotHold`;
  - added: `stops: readonly OriginStop[]` and `activeStopId: OriginStop["id"] | null`;
  - kept: `onLanded`, `onReady`, `onSurfaceChange` (the stage still needs to know the surface is live).
- `GlobeControls`:
  - replace `focusWorld(id)` with `focusStop(id)`: land an in-air flight first (as `focusWorld` did), then `lookAt(-lon*DEG, -lat*DEG*0.55)`;
  - keep `fly`, `reset`, `settle`.
- Overlay: draw three stop pins (the active one accent-coloured) and a small label for the active stop. The flight arc stays as is.
- Robot: `robotPass` starts one lap after each `onLanded`, not when `currentId === "tech"`. Sun/Moon draw while it walks. Under reduced motion there is no walk.

- [ ] **Step 1: Update and write the unit tests.**
  - `focusStop lands an in-air flight then turns`.
  - `robot walks one lap after landing`: drive the mocked clock.
  - `no chapter or skin uniforms in the shader source`.
  - Keep the existing fallback and texture tests green.
- [ ] **Step 2:** Implement.
- [ ] **Step 3:** Run `pnpm perf` on port 3141. Check that `JS at load` is unchanged (±1 KB), which shows the engine has not leaked. The globe chunk should shrink; record it.
- [ ] **Step 4: Commit:** `Strip the globe to coastlines, the flight, the robot and three stop pins`.

### Task 3: Earth A section

**Files:**
- Modify: `src/sections/Worlds/WorldsStage.tsx`, `src/sections/Worlds/Worlds.tsx` (heading, lead, rail)
- Delete: `src/sections/Worlds/WorldPanel.tsx`, and the deprecated chapter exports left by Task 1
- Modify: `e2e/worlds.spec.ts` (rewrite around stops), `e2e/axe.spec.ts` (chapters/skins loop → stops), `e2e/fragments.spec.ts` (plaque-link steps removed), `e2e/ask.spec.ts` (remove the PNG block), `e2e/companion.spec.ts` (only if geometry changed), `tests/sections/WorldsStage*.test.tsx`, CLAUDE.md "The globe"

**Interfaces:**
- `WorldsStage({ stops, crossingKm })`.
- State: `activeStopId`, `announcement`, the flight state (unchanged), `surfaceLive`, `landed`.
- Layout, following the Earth A board:
  - ≥ 1024: the globe on the left, about 55%; the stop column on the right, with the eyebrow "Worlds", the h2 "One crossing, three stops.", and an `ol` of three stop buttons.
  - Each stop button shows its `when` (mono), `place` and `caption`.
  - Below the list: "Replay the flight" (quiet button; "Stop the replay" while in the air, as now).
  - Below 1024: stacked.
- Rail: "Crossing" (km, computed) and "Stops" (3, computed from `stops.length`). Nothing else.
- Lead line: one authored first-person sentence in `portfolio.ts`, or none. If you author one, it must restate no stop caption.

- [ ] **Step 1: Write the failing e2e tests** (port 3142). Run them at 1440 and 390 unless noted.
  - `three stops, in order, with captions from content`.
  - `clicking a stop turns the globe`: the canvas `data-active-stop` attribute changes, and the live region names the place.
  - `stops by keyboard`: Tab/Enter, with `aria-pressed`.
  - `stop chosen mid-flight lands first`.
  - `replay the flight replays once`.
  - `reduced motion snaps to stops`.
  - `stops work on the 2D globe`: force the fallback the way the existing "without WebGL2" spec does.
  - `no chapters, skins or plaques remain`: no "Chapters" eyebrow, no skin group, no "plaque" text, no "needs WebGL".
  - `#worlds height is stable when the surface goes live`: measure before and after the surface is live; the delta must be 0.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement. Rewrite CLAUDE.md's globe section: keep the fence, the no-3D measurements, the fallback, the PNG bake and the lazy chunk; drop the plaques, chapters and skins; add one sentence on stops and where their facts come from. Update `docs/editing.md` if it mentions chapters or plaques.
- [ ] **Step 4:** Run the full `worlds`, `axe`, `fragments`, `ask`, `companion`, `responsive` and `interactions` e2e specs (PASS; companion flake: retry once).
- [ ] **Step 5:** Take day and night screenshots at 1440 and 390 into `reports/r20-p4-screens/` (untracked). Look at them and report.
- [ ] **Step 6: Commit:** `Lay Worlds out as one crossing and three stops`.

### Task 4: Verify and record

- [ ] Run `pnpm verify`.
- [ ] Run the full `pnpm test:e2e` (port 3143). Retry each failure once in isolation; record the summary lines.
- [ ] Run `pnpm perf` (0 skipped; JS at load is the leak detector; record the globe chunk size) and `pnpm lag` ×3, with the CPU load for each.
- [ ] Add R20-P4 rows to the tracker. Write `reports/r20-p4-ledger.md` (untracked).
- [ ] **Commit:** `Record round 20 phase 4`.
