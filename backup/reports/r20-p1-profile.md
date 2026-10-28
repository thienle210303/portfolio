# Profile report: main-thread cost after Phase 1 (diagnostic only)

HEAD `12bf443`, production build (`pnpm build`, exit 0). I ran `pnpm start` on :3108 (pnpm PID 27244, node listener PID 48700) and killed it by PID with `/T` when done. Port 3108 is free again. Headless Chromium from `@playwright/test` with default launch args (the same as `scripts/lag.mjs`), at 1440×900. WebGL2 is available as ANGLE on SwiftShader (software GL).

Method: CDP tracing (`devtools.timeline`, `disabled-by-default-devtools.timeline(.frame)`, `blink.user_timing`, `v8`, `v8.execute`, `disabled-by-default-v8.cpu_profiler`) plus an init script. The init script counts rAF calls by calling chunk, with per-callback duration. It also counts and times `querySelectorAll(OCCUPIED)` (one call per `groundRects` rebuild), counts globe draws (`clearRect` on the globe canvas, WebGL `draw*`), and counts companion DOM mutation batches and React commits (a stub `__REACT_DEVTOOLS_GLOBAL_HOOK__`). Production has no browser source maps. I mapped minified names by reading the chunk at the profiler's line:col and matching the code to source. Scratch scripts and traces are in the session scratchpad.

**Machine load: 100 % CPU at start (3 samples: 100/100/100) and at end (97.7/100/99.9)**, from `Get-Counter '\Processor(_Total)\% Processor Time'`. Most of it is VS Code processes, which I did not touch. Every absolute ms figure below is inflated by that load. The 4x scroll ran at 9.4 fps, against 15–18 fps on an idle machine in final-fix-report item 5. The ratios and rankings are what to trust.

Chunk map: `1tf5chba3-lik.js` = companion, `2zm01ik4n8gip.js` = globe (`GlobeCanvas`), `07_vbg-nogzql.js` = Journey stage, `1p3d44_0e5dsm.js` = React.

## A. 4x-CPU scroll, top to bottom (40 px per rAF, same loop as `lag.mjs`)

324 frames in 34.2 s, **9.4 fps**. Section offsets: about 64, worlds 1138, tree 2962, contact 11594, max scroll 12973. Bands are split 450 px before each section's top.

| Band | Frames | > 50 ms | > 100 ms | Mean | Worst | Main-thread split for the band (ms) |
|---|---|---|---|---|---|---|
| hero | 18 | 17 | 5 | 91 | 187 | script 1270, paint/composite 196, style 64, layout 10 |
| worlds | 45 | 44 | 29 | 124 | 206 | script 3856, **paint/composite 1362**, style 67, layout 31 |
| tree | 216 | 207 | 94 | 107 | 371 | script 17559, paint/composite 2404, **style 1408**, layout 381 |
| contact | 44 | 40 | 11 | 87 | 171 | script 3054, paint/composite 424, style 57, layout 22 |

**Whole scroll, CPU-profile inclusive time (33.25 s sampled):**

| Inclusive time | Minified name and location | Source |
|---|---|---|
| **20.6 s (62 %)** | anon `1tf5chba3-lik.js:18:8316` | `groundRects()`, `companion-space.ts:277` |
| 21.0 s | `eE` :8289 | `occupied()`, which calls `groundRects()` |
| 21.0 s | `eq` :9736 | `isClearSpot()`, `companion-space.ts:627` |
| 18.4 s | `Z` :38183 | the companion rAF `step` (`Companion.tsx` ~3700–3900) |
| 11.6 s | `tV` :25215 | `resolveFollowClear()`, `Companion.tsx:809`. This is the follower's per-frame clearance probe. |
| 4.0 s | `ea` :56833 and :57098 | `reprobeHeld` → `heldExploreClear`, from the 250 ms `scheduleRecheck` timer |
| 3.9 s | `eY` :11067, `tM` :21642, `a` :49962 | `pickExploreSpot` / `exploreClear` / `planExplore` |

**Top self time:** `getBoundingClientRect` 7.5 s, `(program)` 6.9 s, `querySelectorAll` 5.3 s, `closest` 3.9 s, `groundRects` body 3.9 s, `eI` (`onScrollEvent`, `Companion.tsx:4112`) 1.8 s, `elementsFromPoint` 0.7 s.

**Category split for the whole scroll (ms):** script 25739, paint/composite 4386, task overhead 1630, style 1594, layout 443, GC 173.

**Counters over the scroll:**

- Companion rAF callbacks: 510, totalling **20.1 s** (max 131 ms).
- Globe rAF callbacks: 24, totalling 147 ms. Other rAF: 324 (the harness loop), 426 ms.
- `groundRects` rebuilds: **405 in 324 frames**. `querySelectorAll` alone took 5.29 s, 13 ms per call. It matches 1,198 of 3,460 elements.

### Worst 5 frames

| Frame | ms | scrollY | Split (ms) | Top self time |
|---|---|---|---|---|
| 126 | 371 | 5000 (tree, one frame after act 3→4) | style 255, script 91, paint 21 | `eI` 255 (a forced `UpdateLayoutTree` of 1,846 elements billed to the `scrollY` read), `getBoundingClientRect` 29, `(program)` 24, `elementsFromPoint` 17, `querySelectorAll` 16 |
| 112 | 314 | 4440 (tree, after act 2→3) | style 216, script 71, paint 20 | `eI` 217 (recalc of 1,852 elements), `elementsFromPoint` 18, `querySelectorAll` 18, `getBoundingClientRect` 16 |
| 138 | 275 | 5480 (tree, after act 4→5) | style 195, script 54, paint 18 | `eI` 117 (recalc of 1,854 elements), `(program)` 28 |
| 277 | 266 | 11040 (tree → contact hand-off) | layout 112 (517 of 4,054 objects dirty), script 106, style 31 | `eI` 144 (a forced *layout* this time), `getBoundingClientRect` 32, `querySelectorAll` 12; `groundRects` inclusive 63 |
| 276 | 265 | 11000 (same hand-off) | script 244 | `getBoundingClientRect` 45, `querySelectorAll` 29, `closest` 21, `groundRects` 20 self / 116 inclusive, plus a lazy chunk evaluating (`41qshcazcbsrz.js` via turbopack loader, 102 ms) |

Act changes landed at scrollY 3280, 3840, 4400, 4960, 5440 and 6360. The trace has 525 `UpdateLayoutTree` events. Only **5** of them touch 1,000 or more elements (1,846–1,854 each): 85, 216, 255, 192 and 152 ms, **900 ms in total, 56 % of all style time in the scroll**. **All 5 run inside the scroll `EventDispatch`**, forced by `onScrollEvent`'s `window.scrollY` read.

The globe appears in no worst frame. The worlds band does carry about 30 ms per frame of paint/composite, against about 10 ms in the other bands. **Inferred:** this is `Commit` waiting on the SwiftShader-backed canvas while it is in view.

## B. Rest, unthrottled (land; measure the first 15 s; then trace a 10 s window starting about 16 s after landing)

| Section | Busy, first 15 s | Busy, rest window | Companion rAF in rest window | Globe rAF in rest window | Other |
|---|---|---|---|---|---|
| #about | 12.7 % | **4.5 %** | 14.2/s, 13.0 ms/s (max 18.8 ms) | 0 | 0 |
| #worlds | 46.9 % | **47.9 %** | 17.3/s, 11.7 ms/s | **18.0/s, 27.3 ms/s** (max 9.1 ms) | 0 |
| #tree | 7.8 % | **4.0 %** | 11.4/s, 8.2 ms/s | 0 | 0 |
| #contact | 12.3 % | **7.8 %** | 21.7/s, 19.5 ms/s (max 26.9 ms) | 0 | 0 |

In the first 15 s after landing the companion runs 24–53 rAF/s, because the cats walk after the jump. The Journey stage asks for no frames at rest.

**Top self time at rest:**

- `(program)` dominates in every section.
- After it come the companion's `viewport()` (`eb` :7690, reads `clientWidth`/`clientHeight`; 18–61 ms per 10 s), `elementsFromPoint` (10–18 ms per 10 s, the tone hit test) and `querySelectorAll`.
- Worlds only: globe `draw` (`x`/`t` in `2zm01ik4n8gip.js:181`, 225 ms inclusive per 10 s) and `getPropertyValue` (35 ms, colour aliases read at draw time).

**#worlds: the globe draws continuously at rest, and the cause is the crossing replay loop.**

I logged globe draws for 30 s after landing:

- 557 draws, in bursts of `[0–2.2 s: 90]`, `[6.6–7.5 s: 38]`, `[8.1–10.9 s: 115]`, `[15.3–16.2 s: 36]`, `[16.8–19.6 s: 115]`, `[24.0–24.9 s: 40]`, `[25.5–28.3 s: 123]`.
- One cycle is about 8.7 s: a flight of about 2.8 s (115 draws), a hold, then a return of about 0.9 s (38 draws). Drawing takes about 4 s of every cycle.
- After pressing **"Stop the replay"**: **0 draws in 10 s, and busy falls from 47.9 % to 8.3 %.**
- It is not the robot walk, which needs Technology open, and not the settle. The landing settle is part of each flight burst.

**Cost of one globe frame on this software-GL machine** (10 s window, 181 globe draws):

| Where | Cost | How it was measured |
|---|---|---|
| JS | **~1.5 ms** | rAF callback time: 27.3 ms/s at 18/s |
| Main-thread `Commit` | **~14 ms** | 272 commits, 3,920 ms self, max 26 ms. The main thread blocks while the GL canvas is committed. |
| GPU process (`CrGpuMain`, SwiftShader) | **~34 ms CPU** | 6,227 ms per 10 s |

So about 16 ms of renderer main thread plus about 34 ms of another core, per frame. On a hardware GPU the commit and raster cost would be far smaller (**inferred**, not measured here).

## C. Specific suspects

### 1. Journey act change: `--front` / `--camera`

- **Where they are written:** both on `[data-stage-camera]` (`Stage.tsx:234-235`).
- **Fan-out:** that element has **2,013 descendants**, out of 3,218 in the document. The properties are ordinary inherited custom properties, so every descendant restyles. In the scroll trace each act-change recalc touched 1,846–1,854 elements.
- **Isolated, at the same scroll position:**
  - one write plus a style flush: **15–31 ms at 1x, 109–458 ms at 4x**;
  - writing `transform` or the unborn element's `height` directly: 0.0–0.2 ms at 1x, 0.8–3 ms at 4x;
  - registering `@property --camera { syntax: '<length>'; inherits: false; initial-value: 0px }`: **0.1–0.5 ms at 1x, 1.6–6.2 ms at 4x**. The transform still applies.
- **In the real scroll:** 5 recalcs of 85–255 ms at 4x, 900 ms in total. The three worst frames of the scroll (371, 314 and 275 ms) are these.

### 2. Companion scroll listener and the `groundRects` rebuild

- **The listener (`onScrollEvent`):** 323 calls in 34.2 s, one per scroll event. That is about 9.4/s here; on a real 60 Hz scroll it is one per frame. Each call takes **p50 1.5 ms, total 713 ms at 4x**, excluding forced style. Including the forced recalc it is p50 2.8 ms and max 256 ms, and 1,474 ms of style is billed to it. That style is suspect 1's cost, paid early.
- **The rebuild:** every scroll event calls `scheduleRecheck` → `invalidateGround()`. The next per-frame clearance probe (`resolveFollowClear` → `isClearSpot` → `occupied`) then rebuilds `groundRects`:
  - `querySelectorAll` over 1,198 matches,
  - then `closest` + `getBoundingClientRect` + `getComputedStyle` for each.
- **Rebuild cost:** **405 rebuilds during the scroll (1.25 per frame), about 51 ms each at 4x** (20.6 s inclusive ÷ 405), of which 13 ms is the `querySelectorAll`.
- **Not measured:** the rebuild cost at 1x. About 13 ms is **inferred** by dividing the 4x figure by 4.
- **At rest:** 0–2 rebuilds per 10 s, which is negligible.

### 3. Companion React re-renders (`setFrame`), counted as React commits while the companion was the only thing animating

| Section | Walking | Seated |
|---|---|---|
| #tree | 29.1/s | 11.8/s |
| #contact | 26.6/s | 10.2/s |
| #about | 24.8/s | 9.2/s |

- Walking runs at the `RENDER_INTERVAL` 32 ms cap of about 31/s.
- About 20 s after landing the commits fall to **0/s**, once both cats are asleep and the loop stops.
- Cost is small. React's scheduler takes 20–53 ms inclusive per 10 s at rest, under 0.5 % busy.
- The DOM mutation batches on the companion run higher, 66–89/s walking and 15–20/s seated, because `style.transform` is also written imperatively every rAF.

### 4. Other items in the top 10

- **Globe replay loop:** see B. It is the biggest *rest* cost on the page.
- **Worlds-band paint/composite during scroll:** about 20 ms per frame above the other bands. **Inferred:** this is the GL canvas commit on SwiftShader.
- **Tone hit test (`elementsFromPoint`):** 701 ms self in the scroll (about 2 %), and 10–18 ms per 10 s at rest.
- **`viewport()` (`companion-space.ts:175`):** reads `clientWidth`/`clientHeight` every step. It is the top named self-time function at rest in #contact (61 ms per 10 s), because it forces a layout when one is pending.
- **`t3` (:26676):** reads `offsetWidth`/`offsetHeight` (bubble placement), 104 ms in the scroll.
- **Lazy chunk at the tree → contact hand-off:** `41qshcazcbsrz.js` evaluates for 102 ms in frame 276. Which chunk this is was not checked.

## Ranked list

| # | Cause | Measured cost | Smallest suggested fix | Deleted by a later phase? |
|---|---|---|---|---|
| 1 | Companion `groundRects` rebuilt after every scroll event. `scheduleRecheck` invalidates per event, and the per-frame `resolveFollowClear` / `isClearSpot` probe rebuilds. | 405 rebuilds × ~51 ms at 4x = **20.6 s, 62 % of all scroll main-thread time**. It is in every band. | Stop invalidating on scroll. Keep the cache, shift the cached rects by the `scrollY` delta since build, and invalidate only in the 250 ms trailing recheck. Alternative: skip the follower's per-frame clearance probe while `ride.riding`. | **No.** The companion stays. |
| 2 | Journey act change writes inherited `--front`/`--camera` on the camera, which restyles 1,850 elements. | 5 × 85–255 ms at 4x (900 ms). These are the 3 worst frames of the scroll. Isolated: 16 ms at 1x, ~200 ms at 4x. | Register `@property --camera` and `--front` with `inherits: false`, measured at 0.1–0.5 ms. `--front` must then be written on `[data-stage-unborn]`, or set its `height` directly. | **Yes**, Phase 5 removes the pinned stage. |
| 3 | Globe crossing replay loop at rest in #worlds. | **47.9 % busy at rest, 8.3 % with it stopped.** About 18 draws/s for about 4 s of every 8.7 s cycle. One frame costs ~1.5 ms JS + ~14 ms commit wait on the main thread + ~34 ms GPU-process CPU (SwiftShader). | Play the crossing once on first sight, without looping. | **Yes**, Phase 4 removes the replay loop. |
| 4 | `onScrollEvent` reading `window.scrollY` synchronously. | 1.5 ms p50 per scroll event of its own (713 ms over the scroll). It also *hosts* #2's forced recalc. | Stamp the time only, and read `scrollY` in the next rAF step. This is moot once #2 is fixed. | No, the companion stays. #2's share goes with Phase 5. |
| 5 | GL canvas commit while Worlds is in view during scroll. | About 20 ms per frame extra paint/composite in the worlds band (**inferred**, software GL). | None now. Re-measure after Phase 4. Likely negligible on a hardware GPU. | Partly: Phase 4 removes drawing churn; the canvas stays. |
| 6 | Companion tone hit test plus `viewport()` / `offset*` reads per step. | About 0.8 s in the scroll (~2.5 %), ≤ 6 ms/s at rest. | Cache `viewport()` per resize, the way `refreshSafeArea` already does. | No. |
| 7 | Companion React commits. | 25–29/s walking, 9–12/s seated, 0 asleep; under 0.5 % busy at rest. | None needed. | No. |
