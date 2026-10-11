# Round 20 Phase 1 — Speed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the measured lag (cats' hit-test storm, a loop that never rests, eager Companion hydration, the globe's main-thread texture bake and per-frame style reads) with no visual change.

**Architecture:** The cats keep every behaviour. The ground probe reads rects cached per layout epoch instead of calling `elementsFromPoint` per point. The loop drops to a slow idle cadence when nothing moves. The Companion chunk is mounted after idle. The globe's coverage texture becomes a committed PNG, baked by a script and pinned by a test, that the browser decodes off the main thread. Palette reads are cached per theme.

**Tech Stack:** Next.js 16 App Router, React, TypeScript strict, WebGL2, vitest (jsdom), Playwright. No new dependency.

**Spec:** `docs/superpowers/specs/2026-10-10-round-20-redesign-design.md` §1.

## Global Constraints

- pnpm only. Strict TS. No new runtime or dev dependency. No 3D library.
- No visual change in this phase. Fraunces removal moves to Phase 2: dropping it changes every heading, which is Phase 2's job. This is a deliberate deviation from spec §1's "Fonts" line.
- `src/sections/Worlds/coastline-data.ts` stays importable only by `GlobeCanvas.tsx` under `src/`. The bake script lives in `scripts/` and the pin test in `tests/`.
- `GlobeCanvas` reaches the page only via the `import()` in `WorldsStage.tsx`.
- The WebGL2 → 2D fallback stays one-way per visit, and a failed texture load is a fallback trigger.
- `src/lib/` never imports from `src/sections/`.
- Work in worktree `.claude/worktrees/r20-speed`, branch `round-20/speed`.
  - Install with `npm_config_package_lock=true pnpm install`.
  - Use ports 31xx for e2e and perf, with a throwaway playwright config, `--workers=2`, and the `chromium_headless_shell-1234` executablePath.
  - Kill servers by exact PID only, never by pattern. Leave PID 4292 and the other worktrees alone.
- A false comment, doc or copy is an Important finding. Update every comment these changes falsify, for example the "~40 ms, 8 MB" note at `GlobeCanvas.tsx:1125` and `EXPLORE_TRIES`' cost note.
- Merge into `main`, then ask Thien before pushing.

## Review Focus

1. **Cats near content that moves without a scroll**, such as a disclosure opening, a lazy chunk landing or fonts swapping. Expectation: the cats never rest on new text, because the ground cache is invalidated by the same body-resize/animation-end path that already triggers `scheduleRecheck`. *Test: Task 2 Step 1, `invalidates on resize-observer epoch`.*
2. **Theme toggled while the globe is idle.** Expectation: the next frame uses the new palette, with no stale colours. *Test: Task 5 Step 1, `palette cache keys on theme and forced-colors`.*
3. **The PNG fails to load**, whether offline, 404 or a decode error. Expectation: the globe stays on the 2D coastlines with no error UI, exactly like a WebGL failure. *Test: Task 4 Step 6, unit test with `decode()` rejecting.*
4. **The visitor interacts in the first second, before the Companion mounts.** Expectation: nothing breaks, and the cats appear when idle (≤ 2 s timeout fallback). *Test: Task 3 Step 1.*
5. **A sleeping or idle pair, with a blink or flick due.** Expectation: the blink and the flick still happen, at full frame rate while active. *Test: Task 2 Step 3 table rows `blink active → frame`.*

---

### Task 0: Lag probe and baseline

**Files:**
- Create: `scripts/lag.mjs`
- Modify: `package.json` (add `"lag": "node scripts/lag.mjs"`)
- Modify: `docs/feedback-tracker.md` (Round 20 baseline row)

**Interfaces:** Produces `pnpm lag` (env `LAG_URL`, default `http://localhost:3100/`), printing JSON:

```json
{
  "scroll4x": { "fps": 0, "drops": 0, "worstFrameMs": 0, "longTasks": 0 },
  "rest": {
    "<section>": { "busyPct": 0, "rafPerSec": 0, "hitTestsPer5s": 0 }
  },
  "worldsEntryWorstTaskMs": 0
}
```

`rest` is keyed by section, one entry each for `about`, `worlds`, `tree` and `contact`.

- [ ] **Step 1:** Write `scripts/lag.mjs`, modelled on `scripts/perf.mjs` (same Playwright require and the same header comment style).
  - Desktop 1440×900, CDP `Emulation.setCPUThrottlingRate {rate: 4}` for the scroll.
  - An `addInitScript` wraps `document.elementsFromPoint` and `requestAnimationFrame` with counters and installs a `longtask` PerformanceObserver.
  - Scroll top → bottom in 40 px steps, one per rAF. FPS comes from rAF deltas; a drop is a delta over 33 ms.
  - For rest, unthrottled: `scrollIntoView` each section, wait 1 s, then sample for 5 s. Busy % comes from the `Performance.getMetrics` `TaskDuration` delta divided by wall time.
  - For the Worlds entry, the longest long task within 3 s of `#worlds` intersecting.
- [ ] **Step 2:** Build `main` in the worktree, `PORT=3100 pnpm start` (record the PID), run `pnpm lag`, and kill by PID.
  - Expected: roughly the report's numbers: scroll4x fps around 25, `hitTestsPer5s` at contact ≥ 1000 and `rafPerSec` around 60 at rest.
- [ ] **Step 3:** Record the baseline as a "R20-P1 baseline" row in `docs/feedback-tracker.md`.
- [ ] **Step 4: Commit** `Add a desktop lag probe and record the round 20 baseline`.

### Task 1: Ground probe reads cached rects

**Files:**
- Modify: `src/components/companion/companion-space.ts:64-90` (OCCUPIED), `:240-243` (`occupied`)
- Modify: `src/components/companion/Companion.tsx` (call `invalidateGround()` where `scheduleRecheck` fires, and on scroll/resize)
- Test: `tests/lib/companion-space.test.ts`

**Interfaces:**
- Produces `export function pointInRects(x: number, y: number, rects: readonly RectLike[]): boolean`. It is pure; edges are inclusive.
- Produces `export function invalidateGround(): void`, which drops the cached rect list.
- `occupied(x, y)` becomes `pointInRects(x, y, groundRects())`. Here `groundRects()` lazily runs `document.querySelectorAll(OCCUPIED.join(","))` once per epoch:
  - it excludes elements inside `SELF`;
  - it maps each through `getBoundingClientRect()`;
  - it drops zero-area rects.
- `elementBehind` is unchanged; other callers keep it.
- Semantics are deliberately conservative: an occupied element covered by something else, or clipped, still counts as occupied. A false "occupied" only makes a cat choose another spot. Say so in the doc comment.

- [ ] **Step 1: Write failing tests:**
  - `pointInRects`: inside → true; on the edge → true; outside → false; empty list → false.
  - `queries the DOM once per epoch`: spy on `document.querySelectorAll`, call `isClearSpot` 50 times, and expect 1 call.
  - `invalidates on resize-observer epoch`: after `invalidateGround()`, the next probe queries again and sees a newly added `<p>` with a mocked rect, so the spot is no longer clear.
  - `ignores companion's own nodes`: a `[data-companion] button` under the point does not make it occupied.
- [ ] **Step 2:** `pnpm vitest run tests/lib/companion-space.test.ts`. Expected: the new tests FAIL (`pointInRects` is not exported).
- [ ] **Step 3:** Implement as described in Interfaces.
  - Invalidate on: `scroll` (one passive listener already exists; invalidate there), `resize`, and every `scheduleRecheck` entry (body resize / animation end).
  - Scroll invalidation rebuilds at most once per frame, because the rebuild is lazy.
- [ ] **Step 4:** Run the file, then all `tests/lib/companion-*.test.ts`. Expected: all PASS.
- [ ] **Step 5:** Fix the `EXPLORE_TRIES` and `isClearSpot` / `headClear` cost comments, which say "hit tests"; they are now rect checks.
- [ ] **Step 6: Commit** `Read the cats' ground from rects cached per layout, not a hit test per point`.

### Task 2: The loop rests when nothing moves

**Files:**
- Modify: `src/components/companion/Companion.tsx` (`step` tail around `:3782-3823`, `start`/`stop` around `:2120-2135`)
- Create: `src/components/companion/companion-cadence.ts`
- Test: `tests/lib/companion-cadence.test.ts`

**Interfaces:**

```ts
export const IDLE_TICK_MS = 250;
export type Cadence = "frame" | "idle" | "stop";
export function nextCadence(s: {
  busy: boolean;      // existing `busy` (rates > 0.05 or a run)
  asleep: boolean;    // both cats asleep
  animating: boolean; // a blink or flick is in progress on either cat, or a scene/duet/beat/tour is active
}): Cadence;
```

- `animating` or `busy` → `"frame"`.
- Otherwise `asleep` → `"stop"`, which is the existing behaviour.
- Otherwise → `"idle"`.

- [ ] **Step 1: Write failing table tests** for `nextCadence`. They cover all 8 combinations, plus named rows:
  - `blink active → frame`
  - `seated, awake, still → idle`
  - `asleep, still → stop`
- [ ] **Step 2:** Run. Expected: FAIL (the module does not exist).
- [ ] **Step 3:** Implement `nextCadence` and wire it into `step`. Replace `if (keepGoing) frameId = requestAnimationFrame(step)` with:
  - `"frame"` → rAF;
  - `"idle"` → `idleTimer = setTimeout(() => { lastFrameAt = 0; frameId = requestAnimationFrame(step); }, IDLE_TICK_MS)`, with `running` staying true;
  - `"stop"` → `running = false`.

  `stop()` also clears `idleTimer`, and `wake()` / `start()` cancel a pending `idleTimer` before requesting a frame.

  `lastFrameAt = 0` on an idle wake makes the next `dt` the same as a fresh start. This keeps motion integration from jumping 250 ms.

  `animating` comes from the movers' existing `blinkUntil` / `flickUntil` / `flickAt` fields and the existing scene/duet/beat refs. Do not invent new state.

  Blink and flick due-times are checked at idle-tick granularity. A blink can start up to 250 ms late, which is invisible because the gaps are already random (1.8–6 s).
- [ ] **Step 4:** Run the unit tests and `pnpm vitest run tests/lib/companion-*`. Expected: PASS.
- [ ] **Step 5:** Run `pnpm build && start` on 3101, then `pnpm lag`. Expected: `rafPerSec` at rest ≤ 10 in every section, and `busyPct` < 5 % at rest, unthrottled. Kill by PID.
- [ ] **Step 6:** Run the companion e2e spec (`e2e/companion.spec.ts`) on 3101 with the throwaway config. Expected: PASS. Known cat flake: retry once.
- [ ] **Step 7: Commit** `Let the cats' loop tick slowly when nothing is moving`.

### Task 3: Mount the Companion after idle

**Files:**
- Create: `src/components/companion/CompanionLoader.tsx` (`"use client"`)
- Modify: `src/app/layout.tsx:9`, `:232`
- Test: `tests/ui/CompanionLoader.test.tsx`

**Interfaces:**
- `export default function CompanionLoader({ facts }: { facts: CompanionFacts }): JSX.Element | null`. `CompanionFacts` is the existing return type of `buildCompanionFacts`.
- It renders nothing until `requestIdleCallback(cb, { timeout: 2000 })` fires. Where `requestIdleCallback` is missing, it falls back to `setTimeout(cb, 1200)`.
- Then it runs `import("./Companion")` and renders `<Companion facts={facts} />`.
- If the import fails, it renders nothing, silently.
- `layout.tsx` imports `CompanionLoader` instead of `Companion`. No `next/dynamic`: `ssr:false` is not allowed in a server layout, and a plain `import()` in an effect is the pattern `WorldsStage` already uses.

- [ ] **Step 1: Write failing tests** with fake timers and a mocked `./Companion`:
  - `renders nothing before idle`
  - `renders Companion after idle callback`
  - `falls back to setTimeout without requestIdleCallback`
  - `renders nothing when the import rejects`
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement and swap the import in `layout.tsx`.
- [ ] **Step 4:** Run `pnpm build`. Check that the page's initial JS dropped. Run `pnpm perf` on 3102: initial JS should be clearly below 205,712 B with 0 skipped responses. Record the number.
- [ ] **Step 5:** Run the full e2e suite on 3102. Expected: PASS.
  - Specs that assumed cats present at load (companion, axe, ask, origin) may need `await expect(page.locator("[data-companion]")).toBeAttached()` before interacting. Add waits; never weaken an assertion.
- [ ] **Step 6: Commit** `Mount the cats once the page is idle`.

### Task 4: Baked coastline texture

**Files:**
- Create: `scripts/bake-coastline.ts`. It runs with `node scripts/bake-coastline.ts` (Node 26 strips types natively) and imports `../src/sections/Worlds/coastline-data.ts` and `../src/sections/Worlds/gl/coastline-texture.ts` by relative path with the `.ts` extension.
- Create: `public/globe/coastline.png` (generated and committed)
- Create: `scripts/png.ts`, a minimal RGBA PNG encode/decode: signature, IHDR, one IDAT via `zlib.deflateSync`, filter 0 on every row, IEND, CRC via `zlib.crc32`.
- Modify: `src/sections/Worlds/gl/sphere.ts:32`, `:165-173`
- Modify: `src/sections/Worlds/GlobeCanvas.tsx:1120-1145`
- Modify: `package.json` (`"bake:coastline": "node scripts/bake-coastline.ts"`)
- Test: `tests/lib/coastline-png.test.ts`, `tests/lib/sphere.test.ts`

**Interfaces:**
- `scripts/png.ts`:
  - `encodeRgba(width: number, height: number, data: Uint8ClampedArray): Buffer`
  - `decodeRgba(png: Buffer): { width: number; height: number; data: Uint8Array }`. It only needs to read what `encodeRgba` writes.
- `SphereOptions.coverage: CoastlineTexture | TexImageSource`. When it is a `TexImageSource`, upload it with `texImage2D(TEXTURE_2D, 0, RGBA8, RGBA, UNSIGNED_BYTE, source)`, after `pixelStorei(UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)` and `pixelStorei(UNPACK_COLORSPACE_CONVERSION_WEBGL, NONE)`.
- Export a path constant from the GlobeCanvas module scope: `COASTLINE_PNG = "/globe/coastline.png"`.

- [ ] **Step 1: Write failing tests** in `tests/lib/coastline-png.test.ts`:
  - `the committed PNG is exactly today's bake`: `decodeRgba(readFileSync("public/globe/coastline.png"))` deep-equals `bakeCoastlineTexture(COASTLINES, 2048, 1024)`, comparing width, height and every byte.
  - `encode/decode round-trips` on a small 3×2 buffer.
- [ ] **Step 2:** Run. Expected: FAIL (no PNG yet).
- [ ] **Step 3:** Implement `scripts/png.ts` and `scripts/bake-coastline.ts`, then run `pnpm bake:coastline`.
  - Expected: `public/globe/coastline.png` exists. Note its size in the commit message; it should be well under 200 KB, because land/ocean compresses well.
  - If it is over 200 KB, stop and report it rather than tuning.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Accept `TexImageSource` in `createSphere`. Add a `sphere.test.ts` case, `uploads an image source without premultiply`, that asserts on the mocked gl calls.
- [ ] **Step 6:** In `GlobeCanvas`, replace the synchronous bake with:
  ```ts
  const img = new Image();
  img.src = COASTLINE_PNG;
  img.decode().then(() => /* createSphere(..., { coverage: img }) */)
  ```
  On reject, go through the same path as `!choice.useGl` (fallback, `setSurface(false)`). Until it resolves, the overlay keeps drawing the 2D coastlines, as it already does before `sphereRef` is set.

  Add a GlobeCanvas unit test (in `tests/sections/WorldsStage.test.tsx` or a new `GlobeCanvas.texture.test.tsx`) with `HTMLImageElement.prototype.decode` rejected. It expects the surface-change callback to be called with `false`.

  The runtime no longer imports `bakeCoastlineTexture`. Grep `src/` to confirm it is imported nowhere.
- [ ] **Step 7:** Check that `tests/lib/coastline-data.test.ts`'s fence still passes, since `scripts/` and `tests/` are outside its scan. If it scans the repo, add `scripts/bake-coastline.ts` and `tests/lib/coastline-png.test.ts` to its allow-list with a one-line why. This is the only permitted change to the fence.
- [ ] **Step 8:** Run `pnpm verify`, then `pnpm lag` on 3103. Expected: `worldsEntryWorstTaskMs` < 50. Also browser-check the globe in day and night: it should look identical to `main`. Kill by PID.
- [ ] **Step 9: Commit** `Bake the coastline texture at build time and let the browser decode it`.

### Task 5: Palette read once per theme, chunk prefetched early

**Files:**
- Modify: `src/sections/Worlds/GlobeCanvas.tsx:337-376` (`palette`, `sphereColors`), callers `:464`, `:558`
- Modify: `src/sections/Worlds/WorldsStage.tsx:378` (IntersectionObserver options)
- Test: `tests/sections/WorldsStage.test.tsx` or `tests/lib/globe-palette.test.ts`

**Interfaces:**
- Produces `export function themeKey(): string`, returning `` `${document.documentElement.dataset.theme ?? ""}|${forcedColors ? 1 : 0}` ``.
- `palette(element)` and `sphereColors(element)` memoise on `(element, themeKey())` with a `WeakMap<Element, { key: string; value: … }>`, so a theme toggle misses the cache on the next call.
- Tone is fixed per element, so it needs no key.
- Export both functions for the test, or move them to `src/sections/Worlds/palette.ts` and import from there. The second option keeps GlobeCanvas smaller and is preferred.

- [ ] **Step 1: Write failing tests:**
  - `palette cache keys on theme and forced-colors`: spy on `getComputedStyle`; two calls with the same theme → 1 read; flip `data-theme` → 2 reads, and the second result reflects the new mocked custom property.
  - `sphereColors key changes with theme`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement the memoisation.
- [ ] **Step 4:** Add `{ rootMargin: "100% 0px" }` to the `WorldsStage` chunk observer at `:378`, so the chunk and the PNG start one viewport early. Update the comment at `:368`.
- [ ] **Step 5:** Run `pnpm verify`, then the e2e worlds and axe specs on 3104 in both themes. Expected: PASS.
- [ ] **Step 6: Commit** `Read the globe's palette once per theme and fetch its chunk a screen early`.

### Task 6: Measure, record, merge

**Files:**
- Modify: `docs/feedback-tracker.md` (R20-P1 rows: `pnpm perf`, `pnpm lag`)
- Modify: `CLAUDE.md` (globe section), plus one sentence noting that the coverage texture is a committed PNG baked by `pnpm bake:coastline` and pinned by `tests/lib/coastline-png.test.ts`
- Modify: `reports/r20-p1-ledger.md` (create)

- [ ] **Step 1:** Build and start on 3105. Run `pnpm perf` (0 skipped responses) and `pnpm lag`, then kill by PID.
- [ ] **Step 2:** Compare against the spec §1 "Done when" criteria:
  - scroll4x fps ≥ 50
  - worstFrameMs ≤ 100
  - rest busyPct < 5 %
  - worldsEntryWorstTaskMs < 50
  - initial JS falls

  Record the numbers verbatim. If any criterion is missed, record it as missed and put it in the report for Thien. Do not relax it.
- [ ] **Step 3:** Run `pnpm verify` and the full `pnpm test:e2e` (throwaway config, 31xx, `--workers=2`). Expected: PASS.
- [ ] **Step 4:** Update CLAUDE.md, commit, merge into `main` with `--no-ff`, and ask Thien before pushing.
