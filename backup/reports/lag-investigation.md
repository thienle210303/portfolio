# Lag investigation (main = 2cfb0c4)

Method: production build in a detached worktree, `next start` on :3190, headless Chromium (software GL, no real GPU), CDP Profiler plus PerformanceObserver. Desktop 1440x900 and mobile 390x844. Runs were unthrottled and at 4x CPU, which approximates a mid or low laptop or phone. Server killed by PID and worktree removed afterwards.

Caveat: no real GPU, so compositing and WebGL fill cost are not measured. Everything below is main-thread JS and layout cost, which is hardware-independent in shape.

## Ranked causes

### 1. Companion cats: the placement probe calls `document.elementsFromPoint` hundreds of times in one frame (desktop only)

Measured:
- Scroll 0 to 13k px at 4x CPU: `elementsFromPoint` was 7.1 s self time of about 14 s (the scroll takes 14 s at 24.7 fps, 91 dropped frames, 41 long tasks totalling 8.2 s).
- By scroll band at 4x CPU: tree acts 2387 ms of 7133 ms (60 frames over 33 ms, worst 433 ms). Hero to worlds 1189 ms (worst 417 ms).
- Unthrottled, at rest on `#contact`: 1282 calls in 5 s, 467 ms self time, 9% of wall.
- One call is about 0.23 ms; a single `exploreClear` candidate makes up to 45 calls (about 10 ms).
- Mobile 390: 0 calls. The cats do not roam on touch.

Why:
- `src/components/companion/companion-moods.ts:358` `exploreClear` probes the spot and its 4 corner offsets. Each probe is `isClearSpot` (3 hit tests, `companion-space.ts:574`) plus `headClear` (6 hit tests, `companion-space.ts:621`). That is 5 x 9 = 45 `elementsFromPoint` calls per candidate.
- `companion-space.ts:865-890` `pickExploreSpot` tries up to `EXPLORE_TRIES = 12` (`companion-space.ts:832`) random candidates per half.
- `planExplore` (`companion-moods.ts:456`) does this for both cats and both halves. `Companion.tsx:2312` calls it synchronously inside the rAF `step`, and `repickExplorer` (`Companion.tsx:2354`) does the same per cat. Worst case is roughly 12 x 45 x 4 = 2000+ hit tests in one frame.
- Text-dense sections (contact, tree) reject most candidates, so the search runs to the full 12 tries and a declined plan retries after `EXPLORE_DWELL` (`Companion.tsx:1212`, 4 s).
- Every `elementsFromPoint` and every `viewport()` read (`companion-space.ts:175`, `document.documentElement.clientWidth`) forces style and layout after any DOM mutation.

Fix:
- Hold the pick off the hot path. Scan for clear spots once per scroll-settle or resize, in `requestIdleCallback` or a 250 ms timer (`scheduleRecheck`, `Companion.tsx:3932`), and cache the result. `step` then only consumes the cache.
- Cut work per candidate. Drop the 4-corner `EXPLORE_REST_MARGIN` re-probe (`companion-moods.ts:358-372`) to one probe, or test the cat's rect against rects gathered once per recheck (a single `querySelectorAll(OCCUPIED)` with `getBoundingClientRect`) instead of hit-testing each point.
- Cap probes per frame to about 20 and continue the search next frame.
- Cache `viewport()` and `bounds()` per recheck, not per call.

### 2. Companion rAF loop never rests and re-renders React about 30 times a second

Measured:
- 60 rAF callbacks per second from the companion chunk at rest in every section (300 per 5 s at top, tree and contact).
- About 290 DOM mutations per second at rest (1468 in 5 s at the top).
- Unthrottled busy time at the top at rest: 502 ms per 5 s (10%).
- At 4x CPU the task time is 56 to 96% of wall clock at rest (top 56%, worlds 87%, tree 76%, contact 96%), with 12 to 17 long tasks of 50 to 160 ms per 5 s.
- The worlds figure includes the globe's own loop, so it is not all the companion's.

Why:
- `Companion.tsx:2129-2131` `start()` and `Companion.tsx:3822` `if (keepGoing) frameId = requestAnimationFrame(step)`. The comment says the loop is designed to stop for minutes, but in practice `keepGoing` stays true (blink, flick, tail and tone sync).
- `Companion.tsx:3814` `setFrame(next)` commits a React state update at `RENDER_INTERVAL = 32` ms (`Companion.tsx:353`). That re-renders a 5000-line component about 30 times a second for blink and flick.
- `syncTone` runs from the loop (`Companion.tsx:3758-3759`).

Fix:
- Drive blink, flick and phase through CSS animations or direct `style` or `class` writes via refs. They already do `paint()` for position.
- Only call `setFrame` when the pose actually changes, not for blink or flick.
- Let `keepGoing` go false when both cats are seated and idle, and wake on pointer or scroll (the `wake()` path already exists).
- Pause the loop with an `IntersectionObserver` or when the companion is off screen.

### 3. First entry to Worlds: synchronous coastline rasterisation blocks the main thread

Measured:
- Mobile 390 unthrottled: 133 ms dropped frame at scrollY 1272 (the worlds section).
- Desktop 4x CPU: worst frame 417 ms on the hero-to-worlds band, with a 240 ms function in the lazy globe chunk (`3sgdvo__hdt3p.js:180:12366`).
- That function allocates `new Uint8ClampedArray(8388608)` (8 MB) and scan-fills every coastline polygon.

Why: `src/sections/Worlds/gl/coastline-texture.ts` builds the coverage texture on the main thread in one go when the lazy chunk loads.

Fix:
- Pre-bake the texture at build time as a PNG or a typed array asset.
- Or rasterise in chunks across `requestIdleCallback` or `scheduler.yield()`, or in a Worker with `OffscreenCanvas`. Fetch it when `WorldsStage` IntersectionObserver fires with a larger `rootMargin`, so it is ready before the user arrives.

### 4. Hydration and load cost

Measured:
- Desktop unthrottled load: 4 long tasks (89, 92, 199, 115 ms).
- Mobile at 4x CPU: 6 long tasks, up to 771 ms.
- 3219 DOM nodes, page height 13.9k px (desktop).
- Initial JS 210 KB gz, 575 KB total transferred (fonts about 196 KB across 3 woff2, the largest file 121 KB).

Why: the whole page, including the 5000-line Companion and OriginStory, hydrates eagerly. Companion has no reason to be in the first paint.

Fix:
- `next/dynamic` the Companion with `ssr:false`, mounted after `requestIdleCallback`.
- Trim fonts to the weights and subsets actually used.
- Check `Stage`, `OriginStory` and `CareerTree` for being server components with small client islands.

### 5. Globe: `getComputedStyle` reads inside the draw path, and a loop that mostly rests

Measured:
- Mobile 4x CPU at worlds: `getPropertyValue` 158 ms per 5 s (about 3%), plus about 10 rAF per second from the globe at rest while settling.
- Desktop: the globe loop stops when not busy (`GlobeCanvas.tsx:975-985`), so it is not a steady cost.

Why: `GlobeCanvas.tsx:351-352` and `GlobeCanvas.tsx:371-373` (`sphereColors`) call `getComputedStyle` and `getPropertyValue` for 6 to 7 custom properties on every call.

Fix: cache the palette and invalidate it on a `data-theme` change (a MutationObserver on `<html>`) or on `forced-colors` changes.

## Things checked and found fine
- All scroll, wheel and touchmove listeners are passive or capture-passive. The only non-passive entries are `scroll` on document and on a DIV (capture `true`, no handler cost seen), and the companion's `resize`.
- IntersectionObservers: 8 at load. They are cheap. No scroll-driven rAF for the pinned Journey; the active act comes from the IO (`Stage.tsx:169`).
- Layout and style cost during a full scroll is small (LayoutDuration 0.094 s, RecalcStyleDuration 0.33 s in total unthrottled). The cost is JS and hit testing, not paint.
- Crossing replay loop (`OriginStory.tsx:1284`): not running in any measured resting state. It is not a contributor outside the act.
- Mobile at 390: 58.9 fps through a full scroll, 3 drops, no companion roaming. The lag is a desktop problem.

## Raw numbers
- Desktop scroll, unthrottled: 54 fps, 15 drops over 25 ms, one 161 ms long task.
- Desktop scroll, 4x CPU: 24.7 fps, 91 drops, 41 long tasks totalling 8.2 s. Drops are densest from 3000 to 8000 px (the Journey).
- Mobile scroll, unthrottled: 58.9 fps, 3 drops.
- rAF at rest, unthrottled: about 60 per second, all from the companion (globe adds about 10 per second only while visible and settling).
- Scripts: `scripts/perf.mjs` exists but was not used. The numbers above come from throwaway scripts in the scratchpad.
