# Plan C — controller rulings (binding on every task; read with preflight.md §1-4)

Adopted verbatim from preflight.md §5 (R1-R17) by the controller, 2026-10-05. Owner blockers A-F per preflight §4 are deferred, not acted on (R15).


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
