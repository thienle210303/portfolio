# Pre-flight — Round 18 Plan C (The Living Earth)

Scanned 2026-10-05 against worktree `plan-c` at `71e3638` (= main HEAD). Read-only scan; this file is the only output.
Plan: `docs/superpowers/plans/2026-09-30-round-18-plan-c-the-living-earth.md` (11 tasks). Spec §5, §6.4, §8, §9.1, §10.
Rules: `CLAUDE.md` (globe, plaques, fence, perf), `AGENTS.md`.

Legend: **T** true · **F** false · **M** moved/different (real location given) · **?** cannot verify locally.
"Verified" below means I ran it: jsdom probes were run inside this repo's vitest env (temp test files, deleted after; `git status` clean).

---

## 0. Current state in one paragraph

The globe is **Canvas 2D only**. No WebGL code exists anywhere (`grep -ri webgl src tests e2e` → nothing). One `<canvas data-chunk="globe-canvas" aria-hidden>` (GlobeCanvas.tsx:1106) draws plinth + cats, limb, graticule, coastlines as **strokes** (:415-441), the crossing arc + bird, markers and the satellite, all from `project()` in `src/lib/globe.ts`. The crossing already animates **on demand** ("Take the flight", drag east, ArrowRight; `fly()` GlobeCanvas.tsx:1049; reduced motion lands in one synchronous draw). The loop stops itself at rest, and `e2e/worlds.spec.ts` asserts zero globe draws at rest by patching `CanvasRenderingContext2D.prototype.clearRect` on `#worlds canvas` (:168-210, `expectAtRest` :244). `WorldsStage.tsx` `import()`s GlobeCanvas from an IntersectionObserver that **disconnects after the first hit** (:180-211). Seven worlds, 19 plaques (12 field + 7 computed), 3 decorations. The cats (companion explorers) avoid the stage (`data-cat-avoid`, WorldsStage.tsx:258) and `e2e/companion.spec.ts:2123-2230` counts `#worlds canvas` = 1. Plan B made `codeTabs` quote `src/lib/globe.ts:93-101` and `tests/lib/worlds.test.ts:116-126` **byte-for-byte**, enforced by `tests/lib/content.test.ts:449-466`. Latest initial JS: **198.1 KB (202,822 B)**, not 188.2 KB.

---

## 1. Premises, per task

### Header / Global Constraints

| Premise | Status | Evidence |
|---|---|---|
| Depends on Plan A: `origin.to`, `companions[].belongsTo`, four new projects, act anchors | T | portfolio.ts:110 (`"Taylors, South Carolina"`), :138/:146 (`belongsTo`), projects `chess-minmax` :1149, `conscea` :1178, `degreeworks-rebuild` :1209, `toy-storefront` :1241; `src/lib/anchors.ts` (`ACT_IDS`, `actAnchorId`, `actForProject`) |
| Initial-JS budget 188.2 KB | **F (stale)** | docs/feedback-tracker.md:1356-1360: 198.1 KB (202,822 B) after Plan B T7 fix round; 197.4 KB at Plan A close (:1223) |
| `pnpm perf` runs against a prod build; skipped count printed | T | package.json `perf`; scripts/perf.mjs:76-95,132-142 (skipped + content-length cross-check). Every recent row ran it with `launch()` pointed at `chromium_headless_shell-1234` (tracker :1213-1215, :1350-1351) — **?** whether it runs unmodified; `%LOCALAPPDATA%/ms-playwright` holds only `chromium*-1234`, Playwright is 1.62.1 |
| Coastline fence: GlobeCanvas only importer; test fails otherwise | T | tests/lib/coastline-data.test.ts:36-58 (walks `src/` only, exact `toEqual(["src/sections/Worlds/GlobeCanvas.tsx"])`); coastline-data.ts:18-21 |
| GlobeCanvas reaches the page only via `import()` in WorldsStage | T | WorldsStage.tsx:190; no static import elsewhere |
| Honesty test string-for-string | T | worlds.test.ts:115-138 (`AUTHORED.has`, `COMPUTED.has`) |
| "Shader colours read from computed custom properties" | T as a rule; existing 2D palette does this off the canvas element (GlobeCanvas.tsx:262-285), incl. a **forced-colors branch** using system keywords (:262-271). Plan never mentions forced colours. |
| Tokens are hex | T | globals.css:24 `--color-paper: #edf0f2`, :27 `--color-ink: #12181c` |
| Reduced motion "implemented in CSS and the loop" | CSS half **already exists** | globals.css:503-520 global `*` rule (animation 0.01ms, `transition: none`) |
| Tech Stack "WebGL2 with a WebGL1 and Canvas-2D fallback" | **F (self-contradiction)** | Task 1's own doc comment: "WebGL1 is deliberately not attempted" |

### Task 1 — context or honest fallback

| Premise | Status | Evidence |
|---|---|---|
| `src/sections/Worlds/gl/` exists | F (new) | `ls src/sections/Worlds` → GlobeCanvas, WorldPanel, Worlds, WorldsStage, coastline-data, glyphs |
| Test stubs compile & run in jsdom | T | `canvas.getContext = vi.fn(...) as never` fine; jsdom's own `getContext` returns `null` and logs "Not implemented" (verified) — stubbing is required, which the test does |
| `compileProgram` tests pass against the given impl | T | both return `null` via mocks; minor: vertex shader leaks when only the fragment fails |
| Review Focus 1 "Task 1 asserts the fallback **renders** with context stubbed to null" | **F** | Tests only assert `acquireRenderer(...).kind`; nothing renders anything |
| Review Focus 5 "a compile failure falls back rather than painting nothing" | **F (no wiring)** | `acquireRenderer` runs before compilation; once a canvas has a `webgl2` context it can never return `"2d"`, so a compile/link failure on that canvas cannot fall back to 2D on the same element. Nothing specifies a second canvas or a re-acquire. `webglcontextlost` not handled. |
| Three-outcome `Renderer` on one canvas | **conflicts with Task 3's own architecture** | Task 3 Step 3: GL canvas for the planet **plus** a 2D overlay canvas for everything positional — the overlay is always 2D; only the surface canvas needs a decision |

### Task 2 — bake coastlines into a texture

| Premise | Status | Evidence |
|---|---|---|
| `COASTLINES` is flat `[lon,lat,…]` rings | T | coastline-data.ts:9-11,23; 101 rings, 4,960 points, all closed (first pair == last) — computed |
| "pure function over an `OffscreenCanvas` (with `document.createElement("canvas")` fallback)", testable in vitest | **F** | In this repo's vitest jsdom env: `typeof OffscreenCanvas === "undefined"`, `typeof ImageData === "undefined"`, `canvas.getContext("2d") === null` (verified). No `canvas` npm package. Every Task 2 test would throw. |
| Returns `ImageData` | **F in jsdom** | `ImageData` undefined (verified) |
| Test 1: ring `[0,0,1,0,1,1,0,1]` at 360×180 → pixel `(y=90,x=180)` alpha > 0 | **F (arithmetic)** | y = (90−lat)/180·180 → the ring covers y ∈ [89,90]. Row 90 spans [90,91): outside (pixel centre lat −0.5). Row **89** is inside. Inferred, not run (no rasteriser exists yet). |
| Test 3 (antimeridian): pixel `(90,180)` alpha 0 | **vacuous** | A naive smear covers rows 89–90 boundary only, i.e. row 89; row 90 is 0 whether or not the split exists — the test cannot fail |
| "A ring whose longitude span exceeds 180° is split at the antimeridian and drawn as two paths" | **incomplete** | 3 rings have consecutive-point jumps |Δlon|>180 (computed): 1,320 pts with **2** jumps (Eurasia), 10 pts with 2 jumps (island), 556 pts with **1** jump — a ring around the pole (Antarctica). A one-jump ring cannot be split into two closed paths; it must be closed along the pole (lat −90). Span-based detection also misfires on rings legitimately wider than 180° without crossing. |
| "Modify coastline-data.test.ts to permit exactly `gl/coastline-texture.ts`" | **contradicts spec + CLAUDE.md** | spec §5.2: "`GlobeCanvas.tsx` remains its only permitted importer"; CLAUDE.md "The globe" para 3. And unnecessary: the plan's own signature `bakeCoastlineTexture(rings, w, h)` takes the rings as an argument, so GlobeCanvas can pass `COASTLINES` in. |
| Test file imports | T | test lives under `tests/`, which the fence does not walk (`root = src`) |

### Task 3 — a lit sphere

| Premise | Status | Evidence |
|---|---|---|
| Consumes `rotate`, `toVector`, `clampTilt`, `frameStep` from globe.ts, unchanged | T | globe.ts:44,65,234,276 |
| `globe.ts` axis convention matches the shader | **T for lon/lat, F for rotation order** | globe.ts:12-14,65-74: +x viewer, +y screen-right, +z north; forward = spin about north, **then** tilt. Shader `sphereUV` (lon=atan(x,z), lat=asin(y)) maps to the same lon/lat. But the shader applies `rotX(-uTilt) * rotY(-uSpin) * hit` = un-spin first, then un-tilt — the inverse must un-tilt first. At the default tilt (−12°, GlobeCanvas.tsx:298 `tilt: -12 * DEG`) the surface and the overlay disagree. GLSL `mat3(...)` is column-major, so the hand-written matrices are also transposed relative to how they read. Inferred from the maths, not run on a GPU. |
| Sphere geometry matches the overlay | **F** | Shader centres the sphere on the canvas with r = 0.92·min/2. The overlay's ball is `cx = w/2, cy = 0.44·h, radius = min(w, 0.82h)·0.42` with a plinth below (GlobeCanvas.tsx:857-866). Without `uCenter`/`uRadius` uniforms the lit sphere and the markers/arc sit in different places. |
| Test "falls back without a program": `createSphere(null, { coastlines: new ImageData(2,1) })` | **F (runtime)** | `ImageData` is undefined in vitest jsdom (verified) → ReferenceError before the assertion |
| Hex test proves colours come from the theme | **vacuous** | FRAGMENT_SOURCE has no `#` hex by construction, but hard-codes colours as `vec3(...)` floats: volcanic `0.86,0.35,0.12`, `0.95,0.42,0.10`, `0.16,0.08,0.06`; plants green `0.30,0.52,0.32`; ice `0.80,0.86,0.90`, `0.93,0.96,0.98`; desert `0.80,0.70,0.50`, `0.78,0.68,0.49`. That breaks the plan's own Global Constraint ("never hard-coded") and CLAUDE.md "Blue is the only hue … never decoration". |
| Forced colours | **missing** | Existing 2D path switches to `CanvasText/Canvas/GrayText/LinkText` (GlobeCanvas.tsx:262-271) and e2e asserts the authored accent never survives (worlds.spec.ts:586-669). The shader reads `--accent` → blue under forced colours. |
| `SphereState.chapter` indexes `CHAPTER_IDS` | **F (unproduced)** | Task 4 produces only `resolveChapters()`; nothing exports `CHAPTER_IDS`. `SKIN_IDS` comes from Task 5, which runs after Task 3 — the "add a test asserting the index of each id" instruction cannot be met at Task 3 time. |
| Shader chapter treatments cover the spec's six | **partial** | `uChapter` branches only for 1 (Sea), 3 (Plants), 5 (Technology). Spec §5.3 Sky (cloud band, aeroplane), Animals (Moon and Mi walk the limb), Plants' shoot into the Journey, Living Earth's "camera finds Kiên Giang, a light comes on" — none specified anywhere in the plan. |
| "Step 5: on `canvas2d` the existing 2D path runs untouched" | conflicts with two-layer design | With GL, the overlay must **stop** drawing the ball/coastlines (or both layers draw it); with no GL, it must draw them. The plan never says which existing draw calls move. |
| `pnpm test && pnpm dev` | T commands exist | package.json |

### Task 4 — seven worlds become six chapters

| Premise | Status | Evidence |
|---|---|---|
| Seven worlds: vietnam, usa, sea, sky, plants, animals, tech | T | content/worlds.ts:25-133; worlds.test.ts:58-67 |
| 19 plaques; 12 field + 7 computed | T | worlds.test.ts:92-112 (`[vietnam 1/1, usa 5/0, sea 3/1, sky 2/1, plants 2/0, animals 3/0, tech 3/0]`, `{field:12, computed:7}`); recomputed: 1+5+3+2+2+3+3 = 19 |
| `usa` holds "five careerEntry/careerEntryLine references" | T | worlds.ts:47-57 (4 `careerEntry` + 1 `careerEntryLine`) |
| `vietnam` holds `crossing` (computed) | T | worlds.ts:32 |
| New chapter id list `living-earth, sea, sky, plants, animals, technology` | **M** | Current id is `"tech"`, hard-coded as a string in GlobeCanvas.tsx:586 (`techOpen`) and :588 (`v.hits.push({ id: "tech" …})`). Renaming silently breaks the satellite's hit-test (no compile error). |
| `ResolvedWorld.point` → `ResolvedChapter.points[]` | consumers not listed | `point` read by Worlds.tsx:62 (`OFF_MAP_COUNT`), GlobeCanvas.tsx (marker loop ~:470, `focusWorld` :1086-1090), `coLocatedWorldIds` lib/worlds.ts:272-287, worlds.test.ts:70-82,257-335 |
| `resolveWorlds` consumers | **6 not listed** | src/lib/answer-corpus.ts:10,225-235 (labels use `world.name` → retrieval eval moves), src/lib/companion-facts.ts:3,93-103 (`count`), tests/lib/answers.test.ts:13,69, tests/sections/CareerTree.test.tsx:11,106, tests/sections/WorldsStage.test.tsx:5-7,47,73 (`"usa"`, `"vietnam"`), e2e/worlds.spec.ts:2-4 |
| Count 7 appears in tests/copy | **not listed** | tests/lib/companion-facts.test.ts:26 `toBe(7)`; companion-dialogue.ts:180 "`${count} worlds!`"; Worlds.tsx:7,78 heading "Seven worlds, and two cats…"; WorldsStage.tsx:11,336 list label "The seven"; selectors `/the seven/i` in WorldsStage.test.tsx:21,34, e2e/worlds.spec.ts:47,110,433,495,568,952, e2e/fragments.spec.ts:106 |
| Editing worlds.test.ts is free | **F — hero collision** | `codeTabs[1]` (portfolio.ts:214-231) is the verbatim text of worlds.test.ts:116-126 (`for (const world of resolved)`, `world.plaques`, `world.id`); `tests/lib/content.test.ts:449-458` fails if it stops being a byte-identical slice. Renaming `resolved` or the loop variable breaks the hero. |
| `coLocatedWorldIds` cases "keep every one" | T feasible | worlds.test.ts:257-335; real-content case expects `["plants"]` — still true if living-earth claims `origin-to` before plants |
| "Living Earth quotes `origin`; computed crossing km" (spec) | M | The `crossing` computed plaque text is `${from} → ${to} · ${arrived}` (lib/worlds.ts:96-100) — no km; km lives in the rail (Worlds.tsx:68). Also the same `crossing` plaque appears in Sky (worlds.ts:86) — pre-existing duplicate across two chapters. |

### Task 5 — five skins, none carrying a fact

| Premise | Status | Evidence |
|---|---|---|
| `DECORATION_LABEL` exists | T | lib/worlds.ts:61 `"no plaque · decoration"` |
| `skins.ts` imports `type SkinId` from `@/types/portfolio` | **F** | No step creates it; the snippet then never uses it → `@typescript-eslint/no-unused-vars` lint failure |
| Rail line uses `SKINS.length` | **F (undefined)** | The content export is `skins`; `SKINS` is never declared |
| Test "impossible for a skin to carry a plaque" (`"plaques" in skin`) | **vacuous** | `resolveSkins()` builds the object itself; a content entry that gains `plaques` is dropped by the mapper and the test stays green. The content array is `as const` with no `satisfies` type, so the type does **not** forbid it either. |
| "existing Plaques and Decorations rows now include the skins" | **self-contradiction** | Skins carry no plaque by definition; adding them to the Plaques row is false, and to Decorations double-counts with the new Skins row. Decorations also feed companion-facts.ts:94-95 ("N doodles"). |
| "Two toolbars … `<button aria-pressed>`" | **M** | Chapter selection today is a `<ul aria-labelledby="worlds-list-label">` of buttons with `aria-current` (WorldsStage.tsx:335-362); every unit/e2e selector finds it by list name |
| Skins under the 2D fallback | **missing** | Spec §5.2: no WebGL → "mode dial reduced to the labelled list". Skins cannot render in 2D; plan never disables/hides them. |
| WorldsStage may import runtime values | **risk** | WorldsStage is a client component in the initial bundle; resolved data must arrive as props from `Worlds.tsx` (server), as worlds do today (Worlds.tsx:37,80) |
| Skin `draws` copy | owner-tone risk | Owner wants copy "SHORT and creative" (memory round-18-scope, 2026-10-02); plan strings run to ~120 chars and become accessible names |

### Task 6 — the crossing, once, only while watching

| Premise | Status | Evidence |
|---|---|---|
| Consumes `greatCircle`, `frameStep`, `easeFraction` | T | globe.ts:126,276,295 |
| A crossing animation must be built | **F — it exists** | GlobeCanvas `fly()` :1049-1077, `step()` :612+ (FLIGHT_FRAMES/SEED_FRAMES, frame-rate-normalised), drag-east and ArrowRight paths, reduced-motion synchronous landing. A second `createCrossingLoop` would be a second rAF loop steering the same `view.flight`. |
| "WorldsStage starts it from the same IntersectionObserver that triggers the `import()` … and calls `stop()` when the stage leaves" | **F** | That observer `disconnect()`s on first intersection (WorldsStage.tsx:188-189) — it can never report leaving |
| Test 1: after start/stop/start, `frameCount` is 0 | **self-contradiction** | `frameCount` is defined as "frames actually scheduled"; the first `start()` schedules ≥ 1 (rAF exists in vitest jsdom, verified) |
| Test 2 `vi.stubGlobal("cancelAnimationFrame", …)` | leaks | no `unstubGlobals` in vitest.config.mts; no `vi.unstubAllGlobals()` in the snippet |
| Module location of `createCrossingLoop` | unspecified | Files list only GlobeCanvas/WorldsStage; test at tests/lib/ |
| Autoplay is compatible with shipped e2e | **F — collides** | worlds.spec.ts:339-349 (zero frames "untouched since load" 300 ms after the globe goes live — a 2.2 s autoplay draws), :714-724 ("Nothing has flown, so nothing may be claimed" — link count 0 before pressing), :800-893 (reduced-motion landing counts), axe.spec.ts:242-264 |
| Owner/spec position | T | spec §5.5: "plays once per visit, does not loop, does not start until the section is near the viewport"; owner quote "play once then reset but only when user visit the page" — "then reset" is not defined anywhere |

### Task 7 — the robot walks twice

| Premise | Status | Evidence |
|---|---|---|
| `robotPass` tests pass against the given implementation | **F (2 of 4 fail)** | Computed: `robotPass(0.25).cityLight = 0.5` (test wants `< 0.5`); `robotPass(0.75).cityLight = 0.7` (test wants `> 1`). Others pass (0 → −180; 0.5 → −180; 0.999 → 179.28; 1 → pass 2, 1.4). |
| Robot visible in the Technology chapter | **F** | Shader uses `uRobot` only inside `uSkin == 1` (Night side). Technology is `uChapter == 5`. With the default (no skin), the robot does nothing. |
| What drives `robot` progress | **missing** | No loop, trigger or duration specified; Task 6's loop is crossing-only |
| Reduced motion: "two static states behind a toggle" | **missing** | spec §5.5; plan has no toggle |
| Panel lines are decorations | T as instruction; changes counts | `tech` has 0 decorations today (worlds.ts:131) → exact-count test, rail Decorations, companion "doodles" all move |
| Files: `WorldPanel.tsx` | T exists | WorldPanel.tsx:1-110 |

### Task 8 — Việt Nam, furnished

| Premise | Status | Evidence |
|---|---|---|
| Current single decoration + disclosure text | T | worlds.ts:33-39 ("One object so far, and he named it himself…") |
| `GlyphId` union + `GLYPHS` record | T | types/portfolio.ts:388-405; glyphs.ts:18 `Record<GlyphId,string>` (adding ids forces paths — good) |
| bún cá string "from the town the crossing starts in" | **F vs owner decision** | Owner chose province level, no city, and explicitly "NOT Rạch Giá" (round 16; portfolio.ts:102-105 "Province level, no city (owner's decision, 2026-09-02)"). The crossing starts in "Kiên Giang, Việt Nam", not a town. Spec §5.4 only says the dish is from the province's capital. |
| Five things are owner-named | T (per spec) | spec §5.4 "Five objects, all owner-named" |
| Test runs before Task 4 | F | needs `living-earth` from Task 4 |

### Task 9 — reduced motion and keyboard

| Premise | Status | Evidence |
|---|---|---|
| `e2e/worlds.spec.ts` to be written | **M** | Exists, 1,014 lines, already covers reduced motion (:799-1013), keyboard (:106-116, :492-543), forced colours, rest; must be **extended** |
| Add a reduced-motion CSS block | **duplicate** | globals.css:503-520 already zeroes animation/transition page-wide |
| "no element's computed `animation-name` … is non-zero" | ill-defined | The global rule leaves `animation-name` set with 0.01 ms durations; assert durations, not names |
| "activating a marker moves focus to its panel and Escape returns it" | **no implementation** | Not current behaviour (`select()` WorldsStage.tsx:84-96 sets state + live region; canvas is aria-hidden with no DOM markers by design, GlobeCanvas.tsx doc "Accessibility"); Task 9 Step 3 implements CSS only |
| "axe … in both themes and all three tones" | M | `#worlds` is `tone="deep"` only (Worlds.tsx:73); axe.spec.ts:275-334 already audits it. Spec §8 asks for the **chapter/skin matrix**, which the plan omits. |
| `--workers=2` retry guidance | T | memory worktree-e2e-verification |

### Task 10 — recordings

| Premise | Status | Evidence |
|---|---|---|
| Sources in `D:/Project/Portfolio-v2/src/assets/experience/` with stated sizes | T | `ls -la`: toys.gif 45,054,906 · degreework.mp4 19,434,208 · foodroute.gif 10,564,667 · mentorhub.mp4 7,548,165 · chess.mp4 4,247,099 · conscea.mp4 2,081,208 = **88,930,253 B ≈ 88.9 MB**. Also chess.exe 14 MB (spec §11: not shipped). |
| ffmpeg on PATH with libx264 | **T** | `/c/ffmpeg-7.1-essentials_build/bin/ffmpeg` (Bash `which`, PowerShell `Get-Command`); `-encoders` lists libx264 |
| Source characteristics | measured | ffprobe: chess 1920×1080 16.2 s; conscea 1920×1080 8.3 s; degreework 1920×1080 **43.0 s**; mentorhub 1920×1080 15.4 s; foodroute.gif **604×568** 23.0 s; toys.gif 1920×1080 18.3 s |
| ffmpeg command is browser-safe | **F** | No `-pix_fmt yuv420p`: from GIF (rgb/pal8) input libx264 picks yuv444p (High 4:4:4), which Firefox/Safari will not play. `scale=1280:-2` **upscales** foodroute (604 wide). degreework at 43 s is the likeliest to miss 1.5 MB. |
| "Four" recordings | **inconsistent** | Spec §6.4 says "Four" then lists six; plan encodes six; plan commit says "four"; portfolio.ts:1120-1124: "Four builds … each with a real screen recording … Plan C wires the recordings in" = chess, conscea, degreework, toys |
| "rendered inside an opened branch in the Journey stage" | **M** | All four projects have `careerEntryId: "usc-degree"`, which is demoted (knowledge-tree.ts:242-252), so they render in `UnbranchedCaseStudies` ("Coursework and capstone", UnbranchedCaseStudies.tsx:25-44) inside each `CaseStudy`'s `Disclosure` (CaseStudy.tsx:367-421). mentorhub → `cockyhacks`, foodroute → `code-to-give`: demoted milestones with no case study at all. |
| `preload="none"` means nothing fetches until opened | **F (posters)** | `Disclosure` keeps children mounted while closed (Disclosure.tsx:99-114, visibility-hidden, by design); a mounted `<video poster>` fetches its poster at load. Four JPEGs would load on every visit. |
| Test `toHaveAttribute("muted")` | **F (verified)** | React client render sets the `muted` **property** only: rendered `<video … loop="" playsinline="" poster="/p.jpg">` with `hasAttribute("muted") === false`, `muted === true`; SSR emits `muted=""` |
| Test `aria-label` "A chess engine" | F-risk | Invented title; the project is "Chess and a min-max bot" (portfolio.ts:1150) |
| How a project maps to a recording id | unspecified | `Project` has no recording field; plan never says |
| Test location `tests/ui/` | M | Section components are tested in `tests/sections/` (Plan B R13) |
| Snippet imports | F | no `render/screen/ProjectRecording` imports |

### Task 11 — measure and record

| Premise | Status | Evidence |
|---|---|---|
| Baseline 188.2 KB | **F** | 198.1 KB / 202,822 B (tracker :1356-1360) |
| `pnpm verify` = typecheck → lint → contrast → test → build | T | package.json |
| CLAUDE.md describes a Canvas-2D renderer | T | CLAUDE.md "The globe" paras 2-3 |
| "Add the coastline-data fence's second permitted importer" | conflicts | see Task 2 row; R1 removes the need |
| How to build/serve for perf | procedure | memory worktree-e2e-verification: build + `PORT=3100 pnpm start` in a detached worktree; prior rows used a throwaway perf copy |

---

## 2. Cross-task conflicts

### Shared files / interfaces

| Pair | Shared file / interface | Producer → consumer | Found |
|---|---|---|---|
| 1 ↔ 3 | `acquireRenderer`, `compileProgram` | T1 → T3 | T1 models one canvas with three outcomes; T3 needs two canvases (GL surface + 2D overlay) and a fallback after compile failure that T1's API cannot express |
| 1 ↔ 6 | "Tasks 2, 3 and 6 consume both" (T1 Produces) | — | T6's Interfaces never use them; stale claim |
| 2 ↔ 3 | `bakeCoastlineTexture` → `SphereOptions.coastlines: ImageData` | T2 → T3 | `ImageData` does not exist in vitest jsdom; both tasks' tests die on it |
| 2 ↔ 11 | fence + CLAUDE.md fence sentence | T2 widens, T11 documents | both unnecessary under R1 |
| 3 ↔ 4 | `SphereState.chapter` = index into `CHAPTER_IDS` | nobody produces `CHAPTER_IDS` | T3 runs before T4; the index-contract test can't exist yet |
| 3 ↔ 5 | `uSkin` ints ↔ `SKIN_IDS` order | T5 produces after T3 consumes | same ordering defect |
| 3 ↔ 6 | `GlobeCanvas.tsx`, `SphereState.crossing` | both modify GlobeCanvas | T6's separate loop competes with GlobeCanvas's own `step()` for `view.flight` |
| 3 ↔ 7 | `shaders.ts`, `sphere.ts`, `uRobot` | T7 modifies T3's files | robot uniform only read under Night skin; T7 doesn't move it to the Technology chapter |
| 4 ↔ 5 | `src/lib/worlds.ts`, `tests/lib/worlds.test.ts`, the 19-count | sequential | T5's 19 test duplicates T4's (harmless) |
| 4 ↔ 7 | Technology chapter decorations | T7 adds two drawing lines | T4's exact-count test pins `tech … 0` decorations |
| 4 ↔ 8 | `living-earth` decorations, disclosure | T4 merges → T8 furnishes | T8 strictly after T4 |
| 4 ↔ hero (Plan B) | `tests/lib/worlds.test.ts:116-126` | quoted by `codeTabs[1]` | any rename inside that block breaks `content.test.ts:449-458` |
| 5 ↔ 6 ↔ 9 | `WorldsStage.tsx` | all three edit it | T5 dials, T6 autoplay observer, T9 keyboard; must be sequential |
| 5 ↔ 9 | dial semantics | T5 builds, T9 tests | T5 says `aria-pressed` toolbars; existing chapter list is `aria-current` — T9's tests must match whatever T5 keeps |
| 6 ↔ 9 | reduced motion | T6 loop branch, T9 CSS | CSS half already exists (globals.css:503) |
| 3/6/7 ↔ e2e | `#worlds canvas`, `clearRect` attribution | — | two canvases + GL draws invisible to `clearRect` → rest contract goes blind (worlds.spec.ts:168-256) and companion.spec.ts:2215 `toHaveCount(1)` fails |
| 10 ↔ 11 | `public/media/*`, perf row | T10 → T11 | posters would appear as image requests on load unless click-to-mount (R13) |
| 11 ↔ all | CLAUDE.md | — | only lines made false may change |

### Per-task self-consistency

- **T1** — Tech Stack promises WebGL1; T1 refuses it. Review Focus 1 and 5 claim assertions T1's tests do not make.
- **T2** — "pure … testable" vs OffscreenCanvas (absent in jsdom). Test 1 samples the wrong row; test 3 cannot fail. Fence widening contradicts spec §5.2 while the API already takes `rings` as a parameter.
- **T3** — "globe.ts survives untouched … the overlay and the surface agree" is false as written (rotation order, centre, radius). Hex test cannot catch the vec3 colours the shader actually hard-codes. Fallback test uses `ImageData`. `CHAPTER_IDS` consumed, never produced.
- **T4** — Consumers list is three files; at least twelve files and two e2e specs change. Renames `tech` → `technology` without touching GlobeCanvas's literal.
- **T5** — `SkinId` import unused and undefined; `SKINS` undefined; rail instruction contradicts the "skins carry no plaque" rule; "impossible to carry a plaque" test asserts nothing the mapper doesn't already guarantee.
- **T6** — `frameCount` test contradicts its own definition; the observer it reuses disconnects; it rebuilds a loop that exists.
- **T7** — Tests 1 and 2 fail against the given code; the robot is wired to the wrong uniform branch; no driver; spec's reduced-motion toggle absent.
- **T8** — draws string contradicts the province-only origin decision.
- **T9** — Asserts a focus/Escape behaviour nothing implements; adds CSS that already exists; "write the spec" for a file that exists.
- **T10** — Encodes six, commits "four"; posters break "nothing fetches"; `muted` test cannot pass; "inside an opened branch" is a case-study disclosure, not a branch.
- **T11** — Wrong baseline; documents a fence change that should not happen.

---

## 3. Collisions with work shipped after the plan

Commits since 2026-09-29: 134 (`git log --since=2026-09-29 --oneline | wc -l`). Relevant:

**Plan B hero excerpts (c13ccba).** `codeTabs` quotes `src/lib/globe.ts:93-101` (`project`) and `tests/lib/worlds.test.ts:116-126` verbatim; `tests/lib/content.test.ts:449-466` fails on any drift. e2e/ask.spec.ts:429-468, e2e/responsive.spec.ts:114-123, e2e/interactions.spec.ts:25 look up the region `"src/lib/globe.ts"`. → Task 3/6/7 must not edit `project()`; Task 4/5/7/8 must leave the honesty `it(...)` block byte-identical.

**Globe e2e contracts (round 16 + companion rounds).**
- `expectAtRest` / `measureGlobeFrames` (worlds.spec.ts:168-256): attributes draws via `CanvasRenderingContext2D.prototype.clearRect` on `document.querySelector("#worlds canvas")` (first canvas). A GL surface canvas placed first returns `null` for `getContext("2d")` → `draws: -1`; GL draws use `drawArrays`, so a looping GL surface would pass "at rest". Eight tests depend on this.
- `globeSignature` (:258-272) hashes the 2D canvas; if coastlines move to the GL layer the overlay may be nearly empty, weakening every "it moved" assertion (:355-1006, 13 call sites).
- `aimAtGlobe` (:316-330) requires `elementFromPoint` to match `#worlds canvas` — the topmost (overlay) must keep pointer events; the surface must be `pointer-events: none`.
- Forced colours (:586-669): authored accent must not survive.
- Rest-at-load (:339-349) and "nothing has flown, so nothing may be claimed" (:714-724) contradict autoplay (Task 6).
- axe.spec.ts:242-264 presses "Take the flight" to audit the landed state.

**Companion explorers.** `data-cat-avoid` on the stage (WorldsStage.tsx:258; read by companion-space.ts); companion.spec.ts:2123-2230 blocks the chunk by the `"globe-canvas"` string in its JS body (keep `data-chunk="globe-canvas"` in GlobeCanvas.tsx) and asserts `#worlds canvas` count 0 then **1** (:2158, :2215) — two canvases fail it. Companion facts: `worlds.count` (companion-facts.ts:93-103; test expects 7 at companion-facts.test.ts:26) and the tour line "`${count} worlds!`" (companion-dialogue.ts:180) — the 32-character line budget test applies (commit 569d490).

**Chat corpus.** answer-corpus.ts:219-235 indexes every plaque with `source: "${world.name} — …"` and a label built from `world.name`; renaming Việt Nam/United States to Living Earth changes retrieval text. `tests/lib/answers-retrieval.test.ts` floors must stay untouched (CLAUDE.md "never relax"; memory answer-gate-vs-index-surface).

**Journey.** The four recovered projects render in `UnbranchedCaseStudies` (Plan A), not in a branch. CareerTree.test.tsx:101-112 cross-checks the globe's tree-shape plaque against the drawn branches via `resolveWorlds()` — survives a rename only if updated.

**Perf.** Initial JS 198.1 KB (tracker :1356-1360). Turbopack merges chunks < 50 KB (tracker :1057-1059): check the coastline and shader source are absent from the initial scripts **by content** (a coordinate run, `#version 300 es`), as the round-18 close row did (:1236-1239).

**Plan A ledger Ruling 6** notes the crossing midpoint is now in the Laptev Sea (Arctic) — the Sea chapter's jellyfish and "flooding" sit in Arctic water; decoration only, no fact.

---

## 4. Owner blockers

### Spec §10

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Cal.com URL | Handled by Plan B (renders nothing without `BOOKING_URL`, https-only: commits 194e35d, b120ea4). Not a Plan C concern. | |
| 2 | Act 02's own sentence ("just being bored and live day by day") | **Still deliberately not authored**; not a Plan C concern | portfolio.ts:649-655 |
| 3 | `coordinates.to` for Taylors | **Decided** — 34.9133, −82.3108, sourced (Wikipedia, GNIS) | portfolio.ts:117-123 |

### Decided elsewhere (do not re-open)

- Hand-written WebGL, no library (spec §5.2; memory round-18-scope).
- Two axes, 6 chapters × 5 skins; Ice Age is a skin (spec §5.3; memory).
- Robot walks twice, ends lit (spec §5.3; memory).
- Recordings come across (spec §6.4 "Owner approved bringing them across").
- Crossing plays once per visit, near the viewport (spec §5.5).
- Five Việt Nam objects (spec §5.4).

### Open, with a default a controller can rule without stopping

| # | Question | Default |
|---|---|---|
| A | Skins as spec'd use **orange, green, sand, ice-blue** — CLAUDE.md: "Blue is the only hue … never decoration" | Skins are tonal treatments of ink / paper / accent only (no new hues, no new tokens, so `pnpm contrast` is untouched). Surface the conflict to the owner at the end with a screenshot of each skin. |
| B | "play once **then reset**" | Play once per page load when the stage is ≥ 50 % visible; stay landed (seed + link); "Face Việt Nam" still resets; "Take the flight" still replays. No auto-reset. |
| C | mentorhub and foodroute recordings (hackathon milestones, demoted, no case study) | Do not ship them this round; list them in the final report. |
| D | bún cá `draws` text | "a bowl of bún cá Rạch Giá" — no claim about which town the crossing started in. |
| E | New site prose: section heading/lead ("Seven worlds…"), list label "The seven", skin `draws`, the robot's two panel lines, Việt Nam disclosure | Write short, describe only the drawing, carry no fact about him; surface every new string verbatim in the final report (Plan A Ruling 14 precedent). |
| F | Sky / Animals / Living-Earth visual beats from spec §5.3 (cloud band, aeroplane, cats walking the limb, shoot into the Journey, "a light comes on") | Out of this plan's scope; record as deferred. Do not invent mid-task. |
| G | `public/media/*.mp4` committed to git (~≤ 6 MB) | Acceptable; spec approved shipping them. |

---

## 5. Recommended rulings (binding on every dispatch)

**R1 (T2, T11) The coastline fence does not change.** `bakeCoastlineTexture(rings, width, height)` takes the rings as an argument; `GlobeCanvas.tsx` imports `COASTLINES` and passes it in. `gl/coastline-texture.ts` must not import `coastline-data`. `tests/lib/coastline-data.test.ts` and CLAUDE.md's fence sentence stay as they are. *Reason:* spec §5.2 and CLAUDE.md both say GlobeCanvas stays the only importer, and the plan's own signature already makes a second importer unnecessary.

**R2 (T2, T3) The texture is a plain coverage buffer from a pure-JS rasteriser.** Return `{ width, height, data: Uint8ClampedArray }` (RGBA, land alpha 255, ocean 0), filled by an even-odd scanline fill sampled at pixel centres. No `OffscreenCanvas`, `ImageData` or 2D context in `gl/*` or in any unit test. Detect antimeridian crossings by consecutive points with |Δlon| > 180 (not by total span). Close a ring with exactly one crossing along the nearest pole. Tests:
- (a) A 10°×10° ring centred on (5°E, 5°N) is opaque at its centre pixel and transparent at (5,5).
- (b) The antimeridian ring is transparent at row 89, col 180, a pixel a naive smear **would** fill. Prove it by running the test against a deliberately naive version once.
- (c) The real Antarctica ring (one crossing) leaves the equator row transparent and the south-pole row opaque.
- (d) The output has exactly the requested size.
`createSphere`'s tests build the buffer literally. *Reason:* vitest jsdom has no `ImageData`, `OffscreenCanvas` or 2D context (verified). The plan's test 1 samples the wrong row and test 3 cannot fail. Antarctica is a one-jump ring that the plan's split rule mangles.

**R3 (T1, T3) Use two canvases, and fall back to the 2D globe.**
- Add a GL **surface** `<canvas aria-hidden data-globe-surface>` with `pointer-events: none`, *below* the existing 2D canvas. The 2D canvas keeps `data-chunk="globe-canvas"`, every handler and every positional draw.
- `acquireRenderer(surface)` returns `{kind:"webgl"}` or `{kind:"none"}` (drop `"canvas2d"`; the overlay is always 2D). WebGL1 is not attempted; strike it from the Tech Stack line.
- On `none`, a compile or link failure, `webglcontextlost`, or `forced-colors: active`, remove the surface and let the overlay draw limb, graticule and coastlines exactly as today. That is the shipped globe.
- With GL, the overlay still draws the limb and graticule strokes plus everything positional (arc, bird, markers, satellite, plinth, cats). Only the coastline strokes and the fill move to the shader. That keeps `globeSignature` meaningful.
- Unit-test the decision as a pure function (`pickSurface({gl, program, forcedColors})`), including the compile-failure case.
*Reason:* the plan's Renderer can't fall back after compilation on the same canvas. Forced colours must not paint `--accent` (worlds.spec.ts:586-669). Review Focus 1 and 5 need a real assertion.

**R4 (T3) Geometry comes from `globe.ts` and is tested, not trusted.**
- Upload `uCenter` and `uRadius` from `view.stroke` (cx = w/2, cy = 0.44h, radius as in GlobeCanvas.tsx:857-866) in device pixels.
- Upload a `mat3 uInverseRotation` computed in TypeScript as the exact inverse of `rotate(·, spin, tilt)`: un-tilt, then un-spin. Write it column-major for GLSL.
- Export a TS twin of the shader's screen→(lon, lat) mapping and assert it equals `unproject()` within 1e-6 at five or more (spin, tilt) pairs, including tilt = −12° and ±40°, and at off-centre pixels.
- `SPHERE_UNIFORMS` and its tests change to match.
- `src/lib/globe.ts` stays untouched. In particular, `project()` lines 93-101 are quoted by the hero.
*Reason:* the plan's shader centres the ball on the canvas and applies the rotations in reverse order, so markers and the lit surface would disagree at the default tilt.

**R5 (T3, T5, T7) No literal colours in the shader.**
- Colours enter only as `uInk`, `uPaper` and `uAccent`. They are read off the canvas element like `palette()` does, parsed from hex, and re-read on theme or `forced-colors` change through the existing MutationObserver and matchMedia hooks.
- Replace the hex test with one that fails on any `vec3(` literal whose arguments are not all `0.0`/`1.0` outside the light-direction line. Prove it fails against the plan's original source.
- Skins and chapters are mixes of the three inputs: Ice = paper-heavy, desaturated; Night = ink-heavy with accent points; Volcanic = ink with accent fissures; Underwater = inverted limb; Desert = paper-heavy grain; Plants = no green (raise land contrast instead).
- Owner blocker A is reported, not acted on.
*Reason:* Global Constraint "never hard-coded", CLAUDE.md "Blue is the only hue".

**R6 (T4) Merge rules.**
- Chapter ids are `["living-earth","sea","sky","plants","animals","tech"]`. Keep `"tech"`, which GlobeCanvas.tsx:586,588 hard-codes. Edit the plan test's `"technology"` to `"tech"`. Living Earth's display name is "Living Earth".
- Export `CHAPTER_IDS` (derived from content) from `src/lib/worlds.ts`, and `resolveChapters()`. Delete `resolveWorlds` with no alias.
- **Keep the `const resolved = …` binding and the `for (const world of resolved)` loop in worlds.test.ts:116-126 byte-identical.** `codeTabs[1]` quotes them. Run `tests/lib/content.test.ts`.
- Exact counts become `[["living-earth",6,1],["sea",3,1],["sky",2,1],["plants",2,0],["animals",3,0],["tech",3,0]]`, and `{field:12, computed:7}` is unchanged.
- `points: readonly GeoPoint[]`. `coLocatedWorldIds` keeps every existing case, rewritten over points, and real content still yields `["plants"]`. `focusWorld` faces `points[0]`, and both Living Earth markers select the chapter.
- Same commit: Worlds.tsx rail (`OFF_MAP_COUNT` = chapters with no points), heading and lead, WorldsStage list label (`"Chapters"`, selectors to `/chapters/i`), WorldsStage.test.tsx, e2e/worlds.spec.ts, e2e/fragments.spec.ts:106, companion-facts.test.ts:26 (→ 6), the companion tour line (keep ≤ 32 chars, e.g. "`${n} chapters! I'd nap on each.`"), CareerTree.test.tsx, answers.test.ts.
- Re-run `tests/lib/answers-retrieval.test.ts` with floors untouched.
*Reason:* about twelve unlisted consumers, plus a Plan B byte-identity fence.

**R7 (T5) Skins.**
- Add `interface Skin { id; name; draws }` to types/portfolio.ts and write `skins satisfies readonly Skin[]`. Derive `SKIN_IDS` from it.
- `ResolvedSkin` is exactly `{id, name, draws, label}`. Replace the `"plaques" in skin` test with a type-level case: a `// @ts-expect-error` `Skin` literal carrying `plaques`, so `pnpm typecheck` fails if the type ever grows one. Keep the runtime check too.
- Skins are **not** counted in the Plaques or Decorations rows, nor in companion-facts. Add one rail row: `Skins — N, the look only, carrying no fact`.
- The chapter selector stays the existing `aria-current` list. Skins are a separate labelled group of `aria-pressed` buttons (at most one pressed; pressing it again clears). They are ≥ 44 px, `aria-disabled` until a GL surface exists, and permanently disabled with "needs WebGL" in the name on fallback.
- Resolve skins in `Worlds.tsx` and pass them as props. WorldsStage imports only types from `lib/worlds` and `content/skins`.
- Write `draws` as one short clause each.
*Reason:* the plan's names are undefined, its test asserts nothing, its rail line contradicts itself, and it ignores the spec's fallback rule. The initial bundle must not pick up the content layer.

**R8 (T6) No second animation loop.** Drop `createCrossingLoop`.
- Autoplay calls the existing `controls.fly()` once per page load. Use a **separate**, persistent IntersectionObserver (threshold 0.5) that fires once controls are ready. The import observer stays as it is.
- Add `settle()` to `GlobeControls`. When the stage leaves the viewport mid-flight, finish the flight in one draw with zero further frames. Re-entry never replays.
- Mark the stage `data-crossing="landed"` once landed.
- An autoplayed landing renders the handoff link but does not write to the live region. A pressed one still announces.
- Under reduced motion the existing synchronous `fly()` path applies.
- Unit test with a fake IntersectionObserver: `fly` is called once across two entries; `settle` is called on exit mid-flight.
- Rewrite worlds.spec.ts "untouched since load", "the landing", "reduced motion" and axe.spec.ts:242-264. Wait on `data-crossing="landed"` before any rest measurement, and assert the link **is** present after autoplay. Rest ceilings stay as they are.
*Reason:* the flight already exists and is frame-rate-normalised. The plan's observer disconnects. Its test contradicts itself. The shipped e2e assumes nothing plays unasked.

**R9 (T7) Robot.**
- Keep `robotPass` as written. Change the tests to `robotPass(0.4).cityLight < 0.5` and `robotPass(0.9).cityLight > 1`, and keep the other two.
- Render the robot and city emission in the **Technology chapter**, not inside `uSkin == 1`. Night skin may also use `cityLight`.
- Drive progress from GlobeCanvas's existing `step()` while Technology is open: once per selection, about 6 s, ending at 1 (lit), then rest with zero frames.
- Under reduced motion, use a two-button `aria-pressed` toggle ("Unsupervised" / "Human in the loop") showing the two static states (spec §5.5).
- The two panel lines are `tech` decorations with `DECORATION_LABEL`. Update the exact-count test to `["tech",3,2]`.
*Reason:* two of four plan tests fail against the plan's code, the robot is wired to the wrong uniform, and no driver is specified.

**R10 (T8) Việt Nam.**
- The bún cá `draws` is "a bowl of bún cá Rạch Giá", with no town-of-origin claim. The other four keep the plan's strings, trimmed to a clause.
- Add `bowl`, `jar` and `blossom` to `GlyphId` and to `GLYPHS`, inside the ±12 box (glyphs.ts:33-39).
- The disclosure becomes "Five objects, and he named every one. Nothing here was invented to fill the space."
- Exact count: `living-earth … 5`. Runs after T4.
*Reason:* owner decision "province level, no city" (portfolio.ts:102-105).

**R11 (T9) Extend, don't duplicate.**
- Add no CSS unless T5–T7 introduced a CSS animation. globals.css:503 already covers reduced motion.
- Extend the existing e2e/worlds.spec.ts. Under `reduce`, every element in `#worlds` has computed `animation-duration` ≤ 0.01 ms and `transition-property: none`, and `expectAtRest(…, SILENT_HZ)` holds after toggling every chapter and skin.
- Drop "focus moves to the panel / Escape returns it". It is not in the spec, and the canvas markers are deliberately not DOM controls.
- axe matrix: `#worlds` in both themes × (each chapter with no skin + each skin on Living Earth) = 22 audits, plus the robot toggle under reduce.
*Reason:* the CSS exists, the focus behaviour has no implementation, and spec §8 asks for the chapter/skin matrix.

**R12 (T3; e2e harness, same commit as the surface lands) Keep the rest contract honest with two canvases.**
- Every `#worlds canvas` in worlds.spec.ts (`measureGlobeFrames`, `globeSignature`, `aimAtGlobe`, the forced-colours probe) and companion.spec.ts:2158,2215 becomes `#worlds canvas[data-chunk="globe-canvas"]`.
- `measureGlobeFrames` also patches `WebGL2RenderingContext.prototype.drawArrays` and counts calls on the surface canvas into `draws`.
- Add one test that pins "one GL draw per overlay draw while moving", mirroring `framesThatDrew`.
*Reason:* otherwise a looping GL surface passes "at rest", and the companion count test fails on two canvases.

**R13 (T10) Recordings.**
- Ship **four**: chess, conscea, degreework, toys. Add optional `recording?: string` (media id) to `Project` on the four recovered projects.
- `ProjectRecording` (client, `src/sections/CareerTree/`) renders inside `CaseStudy`'s Disclosure. It starts as a button "Play the screen recording"; only after the press does it mount `<video preload="none" muted playsInline controls poster=…>`. The aria-label is `${project.title} — screen recording`. Under reduced motion there is no `loop`.
- Tests in `tests/sections/`: assert `video.muted === true` (property) plus `renderToString` contains `muted=""`; `preload="none"`; no `autoplay`; and **no `<video>` or poster in the DOM before the press**.
- ffmpeg: add `-pix_fmt yuv420p -profile:v high`, use `scale='min(1280,iw)':-2`, and render posters at ≤ 1280 wide with `-q:v 5`. Each mp4 ≤ 1.5 MB (trim degreework with `-t` if crf 34 is not enough). Report every output's size and duration.
- e2e: zero `/media/` requests through a full scroll; after the press, exactly one mp4 and one jpg.
*Reason:* the Disclosure keeps children mounted, so posters would load on every visit. The `muted` attribute test cannot pass (verified). The GIF sources would encode as 4:4:4. Only four recordings have a home.

**R14 (T11) Perf and docs.**
- Baseline is **198.1 KB / 202,822 B**.
- Build and serve from a detached worktree (`PORT=3100 pnpm start`). If `chromium.launch()` cannot find a browser, point a throwaway copy of perf.mjs at `chromium_headless_shell-1234` and do not commit it.
- Three runs, zero skipped. Record before and after.
- Confirm by **content** that `#version 300 es` and a coastline coordinate run are absent from every initial script.
- CLAUDE.md: rewrite only the lines this plan makes false: the renderer description, "seven", and the fence sentence only if R1 is overruled. Update the 188.2 KB figure to the newly measured one.
*Reason:* the plan's number is stale, and this matches how every recent row was measured.

**R15 (all) Spec deviations go in the ledger, not into code.** Sky/Animals/Living-Earth beats (blocker F), skin hues (A), and mentorhub/foodroute (C) are recorded as deferred and listed in the final report with each new prose string verbatim (E). *Reason:* invented visuals or prose mid-task are what this round exists to stop.

**R16 (all) Order and tiers.**

| Step | Task | Model | Note |
|---|---|---|---|
| 1 | T4 chapters | sonnet | with R6's explicit sweep list |
| 2 | T8 Việt Nam | sonnet | needs `living-earth` |
| 3 | T5 skins (content, lib, dial disabled) | sonnet | needs `CHAPTER_IDS`; produces `SKIN_IDS` before the shader |
| 4 | T1 context | sonnet | reshaped by R3 |
| 5 | T2 texture | sonnet | R1 + R2 |
| 6 | T3 sphere + two-layer GlobeCanvas + R12 harness | **opus** | **split**: 3a pure modules (shaders, sphere, inverse rotation, index-contract test against `CHAPTER_IDS`/`SKIN_IDS`), 3b GlobeCanvas integration + e2e harness |
| 7 | T7 robot | **opus** | shader + loop + reduced-motion toggle |
| 8 | T6 autoplay | **opus** | rewritten per R8; owns the e2e rewrites |
| 9 | T9 a11y e2e | sonnet | R11 |
| 10 | T10 recordings | sonnet | independent of 1–9; may run any time but commits separately |
| 11 | T11 measure + docs | sonnet | controller re-checks the perf row |

**Drop:** `createCrossingLoop` (T6 as written). **Split:** T3 into 3a/3b. **Merge:** none. Run each task's e2e against a production build at `--workers=2`.

**R17 (all) Tests live where the repo keeps them.** `tests/lib/` for pure modules (gl/*, robotPass, texture), `tests/sections/` for components. Import paths from `src/lib/` into `src/sections/` stay one-way (CLAUDE.md); `gl/*` may import `@/lib/globe` and `@/lib/worlds`, never the reverse. *Reason:* repo convention and the lib→sections boundary.
