# Final whole-branch review — Round 18 Plan C ("the living Earth")

Range: `71e3638..e8c6dfc` on `round-18/plan-c` (22 commits). Reviewer: final seat, read-only.
Authority order used: spec §5, §6.4, §8 → CLAUDE.md → rulings R1–R17 → plan.

## What I ran (verified)

- `pnpm test`: 51 files, 896 tests, all pass (one full run; the autoplay flake did not appear this time).
- `npx vitest run tests/sections/WorldsStage.autoplay.test.tsx` alone: 10/10 pass. The first test takes 346 ms; the rest take 82–218 ms.
- `pnpm typecheck` and `pnpm lint` both pass.
- `package.json` and `pnpm-lock.yaml` are untouched by the branch, so no new dependency was added.
- The existing production build (`.next`, built 17:02 from `3b1ac4c`; e8c6dfc is docs-only) was inspected chunk by chunk with gzip -9 marginal sizes (see "Initial-JS trims").
- I did **not** re-run e2e or `pnpm perf`. Behaviour claims marked "e2e" rest on the specs I read plus the task reports' runs.

The diff was reviewed in passes: source first (GlobeCanvas, WorldsStage, gl/*, settle, ProjectRecording, content/lib), then tests, then docs.

## Strengths

- **The rest contract is honest with two canvases.**
  - The GL surface draws only from inside `draw()` (GlobeCanvas.tsx:547-566), so it has no loop of its own.
  - `measureGlobeFrames` counts `drawArrays` on the surface as well as `clearRect` on the overlay (e2e/worlds.spec.ts:179-240).
  - One test pins one GL draw per overlay draw while the globe moves (worlds.spec.ts:597).
- **The fallback really is the shipped globe.**
  - `sphereRef` stays null on every failure path, so the overlay strokes coastlines exactly as before (GlobeCanvas.tsx:580-597).
  - Context loss and forced colours switching on later both go through one `fallBack()` (:1128-1144).
  - e2e compares the lost-context frame to a no-WebGL frame for exact equality (worlds.spec.ts:1591).
- **The fences hold.**
  - `coastline-data` is imported only by GlobeCanvas. `gl/coastline-texture.ts` names it only in a comment.
  - `GlobeCanvas` and `gl/*` reach the page only through `import("./GlobeCanvas")` (WorldsStage.tsx:307). WorldsStage takes only a type from `gl/robot`.
  - `src/lib` imports nothing from `src/sections`. `lib/skins.ts` is kept out of the client bundle on purpose.
- **Plaques are untouched in substance.**
  - The counts are still `{field:12, computed:7}` and the total is 19.
  - The `@ts-expect-error` skin literal makes `pnpm typecheck` the fence against a skin ever carrying a plaque.
  - Every skin's accessible name ends in `DECORATION_LABEL` (lib/skins.ts:28).
  - `content.test.ts`, `coastline-data.test.ts` and `answers-retrieval.test.ts` are unchanged, so the retrieval floors did not move.
- **The shader geometry is derived, not re-typed.**
  - `inverseRotation` is built from `rotate()` itself (sphere.ts:143).
  - `globeStroke`/`sphereView` size both canvases from one function.
  - The colours enter only as `uInk`/`uPaper`/`uAccent`, read off the element like `palette()`.
- **`settleMotion` is a small pure function.** Every branch has a unit test, including "a still globe is left exactly as it was" and "a crossing dragged part-way is left alone". The robot ends lit by construction: `ROBOT_HOLDS["human-in-the-loop"] = 1`, `robotLights(1).behind = 1.4`, and every longitude ≤ 180 counts as walked.
- **Recordings cost nothing until pressed.** There is no `<video>` or poster before the press, and `preload="none"`. ffprobe confirms all four are 1280×720.

## Plan-level behaviour, end to end

| Behaviour | Verdict | Evidence |
|---|---|---|
| The crossing autoplays once per visit | Holds (code + unit + e2e) | `spentRef` is set before `fly()` (WorldsStage.tsx:344-347). Re-entry is covered by the autoplay unit test and worlds.spec.ts:489/518. "Per visit" means per page load (R8). |
| The robot walks twice and ends lit | Holds (code + unit); the e2e checks rest, not "lit" | GlobeCanvas.tsx:880-886 (`min(1, …)`); `settleMotion` sets `robot = 1`; robot.test.ts. Under reduced motion, e2e compares the lit screenshot with the "Human in the loop" hold. |
| Skins are disabled without WebGL | Holds | `skinsAvailable = forceSkins \|\| surfaceLive`. `handleSurfaceChange(false)` also takes off a worn skin (WorldsStage.tsx:200-204). e2e at worlds.spec.ts:1580. |
| The fallback is the shipped 2D globe | Holds | See Strengths. The fallback is one-way per visit (by design). |

**Cross-task integration risks, checked one by one:**

- **Context lost mid-flight or mid-walk.** Safe. The loop belongs to the overlay, `fallBack()` only swaps who draws coastlines and lights, and the overlay draws the robot's lights when there is no surface (GlobeCanvas.tsx:720-736).
- **Double `settle()`.** Safe. The second call sees `!v.running` and returns (:1384).
- **State surviving a fallback.** The worn skin is cleared. `robotHold`, flight and seed are view state and stay valid on the 2D globe. The coverage buffer survives: see I4.
- **Companion cats.** The stage still carries `data-cat-avoid`, and companion.spec now selects `canvas[data-chunk="globe-canvas"]`. No change in behaviour.
- **Autoplay against a visitor's chapter choice.** This one is a real interaction bug: see I2.

## Issues

### Critical

None.

### Important

**I1. The autoplay unit test flakes under full-suite load.** tests/sections/WorldsStage.autoplay.test.tsx:94 and :97-99.
- *Root cause (inferred, strongly supported).* `screen.findByRole(... /take the flight/ ...)` and the following `waitFor` use Testing Library's default `asyncUtilTimeout` of **1000 ms**, not vitest's `testTimeout: 20_000`.
  - Before the button appears, the dynamic `import("./GlobeCanvas")` has to resolve through vitest's mock registry, then two React commits have to land (`setCanvas`, then `onReady` → `setControlsReady`).
  - Alone, the first test takes 346 ms, the slowest of the file because it pays for the first dynamic import.
  - vitest.config.mts documents 3–6× wall-clock inflation when the 51 files run in parallel. 346 ms × 3–6 is about 1.0–2.1 s, which crosses 1000 ms.
  - The failure seen ("take the flight" not found) is exactly a findBy timeout.
- *Fix.* Follow the repo's existing precedent (tests/sections/Contact.test.tsx:50,60): `await screen.findByRole("button", { name: /take the flight/i }, { timeout: 10_000 })` and `await waitFor(() => …, { timeout: 10_000 })`. Do not raise the global `asyncUtilTimeout`.

**I2. A chapter chosen during the 2.2 s autoplayed flight is silently dropped.** GlobeCanvas.tsx:1004-1005 (`lookAt` sets `v.target`), :909 (target suppressed while `playing`), :872-875 (the landing overwrites `v.target` with the arrival pin).
- *Scenario.* At ≥1024 px the chapter list sits beside the stage, in view when autoplay fires. A visitor presses "Sea" or "Sky" within the first ~2 s.
  - The panel switches to Sea.
  - The camera finishes the flight and rests on Taylors, not Sea.
  - "Living Earth" (`points[0]` = Kiên Giang) is dropped the same way.
- This existed for pressed flights before, but autoplay now puts the flight in front of every visitor who never asked for it.
- *Fix.* In `focusWorld` (GlobeCanvas.tsx:1407), land a playing flight first: if `view.current.playing`, run the same body as `settle()` (`settleMotion`, then `onLandedRef.current()` if it landed), then `lookAt`. `quietRef` keeps an autoplayed landing silent.
- Add one unit or e2e case: select Sea mid-autoplay → the camera faces the Sea point.

**I3. Two skins paint the accent as decoration.** gl/shaders.ts:161-170 (Night side `glow = coast…`, Volcanic `glow = coast * …`) and :222 (`color = mix(color, uAccent, glow)`).
- A skin "carries no fact" by definition (rail, CLAUDE.md, spec §5.3). Blue coastlines and fissures under a skin are therefore blue as decoration, which CLAUDE.md forbids ("never decoration").
- R5's wording ("accent points / accent fissures") is the same wording the controller already overruled for the Technology lattice in the T3a ruling ("CLAUDE.md … outranks my R5 dispatch wording"). The branch is inconsistent with its own precedent.
- *Fix.* Mix the glow toward `palest` (Night side, "coastlines lit") and toward `palest`/`uInk` (Volcanic). This is one line in the shader.
- Alternatively, record an owner ruling that a visitor-chosen skin may use the accent, and say so in CLAUDE.md. Either way, re-run the skin label-contrast probe.

**I4. The 8 MB coverage buffer is pinned for the life of the page, and is baked even when it cannot be used.** GlobeCanvas.tsx:366-371 (module-level `coverage`), :1103-1108.
- `texImage2D` copies the 2048×1024×4 = 8,388,608 B into the GPU, but the module-level `let coverage` keeps the JS copy forever.
- The copy is kept after a fallback too, and the fallback never re-uploads, so it is pure waste on the phones this site is measured on.
- Under `forced-colors: active` at load, the 40 ms bake and the shader compile both run before `pickSurface` refuses them (T3b deferred minor).
- *Fix.* Read `forced.matches` and the context first, and bake only if a GL surface is possible. Bake into a local, pass it to `createSphere`, and drop the module cache. A StrictMode or HMR remount re-bakes in about 40 ms, which is acceptable.

**I5. The recordings are video-only with no text alternative (WCAG 1.2.1, Level A).** src/sections/CareerTree/ProjectRecording.tsx:43-53.
- The `aria-label` names the video, but nothing describes it. The site's declared target is 2.2 AA, which includes this Level A criterion.
- R15 forbids inventing copy, so the honest options are:
  - (a) `aria-describedby` pointing at text that already exists. For example, give the case study's Build or Proof block an id and reference it. This invents nothing, and Thien confirms that it is equivalent.
  - (b) Thien authors one sentence per recording.
- Until one of these is done, either hold `3b1ac4c` out of the merge or record an explicit owner acceptance.

**I6. CLAUDE.md presents an incomplete file list as complete.** CLAUDE.md:76-77 lists `gl/` as `context`, `coastline-texture`, `shaders`, `sphere`. `gl/robot.ts` exists and is part of the engine.
- By this review's standard, a false doc is Important.
- *Fix.* Add `robot`. While there, make "199.9 KB measured now" (:73) dated: "199.9 KB after round 18 Plan C".

### Minor

Each item below is marked must-fix (trivial, and either a false string or a test that asserts nothing) or can-wait.

**Must-fix before merge:**

- **M1.** tests/sections/WorldsStage.test.tsx:200: `expect(status).toHaveTextContent("")` matches any text, so it asserts nothing. *Fix:* `toBeEmptyDOMElement()`.
- **M2.** ProjectRecording.tsx:53: the `<video>` has no intrinsic size. It renders at 300×150 and then jumps to 16:9 when the poster arrives, which can land outside the 500 ms input exemption on slow networks. All four recordings are 1280×720 (ffprobe). *Fix:* add `aspect-video`, or `width={1280} height={720}`.
- **M3.** ProjectRecording.tsx:67-69: four identical "Play the screen recording" buttons, so a screen reader's list of buttons is ambiguous. *Fix:* `aria-label={`Play the ${project.title} screen recording`}`, or a visually hidden title. Neither adds new copy.
- **M4.** WorldsStage.tsx:418-419: the stage's accessible name says "Every world is also a button in the list beside it". The list is now called "Chapters", and R6's rename sweep missed this. *Fix:* "Every chapter is also a button in the list."
- **M5.** gl/shaders.ts:226-229: the comment says "`uCrossing` is declared for Task 6 and not yet read". Task 6 shipped without using it (R8), so the comment promises a future that is not coming, and the uniform is uploaded every frame for nothing (sphere.ts:270). *Fix:* reword to "declared, unread", or remove the uniform from the shader, `SPHERE_UNIFORMS`, `SphereState` and `REST_STATE`.
- **M6.** src/lib/worlds.ts:263: "so `usa` could not be opened". No `usa` id exists any more (T4 deferred). *Fix:* write `living-earth`.

**Can wait (new in this review):**

- **m7.** GlobeCanvas.tsx:775-777 hard-codes `"tech"` twice, though :213 says the satellite's hit "uses the same id" as `TECH_WORLD_ID`. Use the constant.
- **m8.** WorldsStage.tsx:177-189: `select()` does not spend the autoplay. A chapter chosen before half the stage is visible is then swung away by the autoplay. This is a behaviour call: spend on select, or not.
- **m9.** shaders.ts:188-192: the Technology lattice is a drawn surface treatment with no decoration line. That is defensible as a "look", like a skin, but CLAUDE.md says "every drawn object" is a plaque or a decoration. A controller or owner should decide whether a chapter treatment needs a line.

## Triage of the ledger's deferred minors

**Must fix before merge** (one line each):

- T3b: 8 MB coverage buffer retained → I4.
- T3b: bake and compile under forced colours at load → folded into I4.
- T5: `toHaveTextContent("")` vs `toBeEmptyDOMElement()` → M1.
- T10: video has no aspect ratio → M2.
- T10: four identical button names → M3.
- T10: WCAG 1.2.1 text alternative → I5.
- T11: CLAUDE.md:76-77 gl/ list is missing `robot.ts` → I6.
- T4: src/lib/worlds.ts:263 "`usa` could not be opened" → M6.
- Not a ledger minor: the autoplay flake → I1.

**Can wait:**

- **T4**
  - latent whole-chapter shift in `sharesAPin`: wait, no content triggers it.
  - duplicate "LIVING EARTH" labels: wait. The pins are ~156° apart, so rarely both face.
  - both pins use `star`: wait, owner glyph call.
  - e2e "far side" message: wait. It is a correct failure message, not a defect.
  - `CHAPTER_IDS` had no consumer: resolved, `shaders.ts` consumes it.
- **T8**
  - no test pins the ±12 glyph box: wait.
  - bún cá checked with `toContain`: wait.
  - bún bò and bún cá share the bowl glyph: wait, owner art.
  - glyphs not browser-checked: wait. The axe and screenshot e2e render them.
- **T5**
  - lowercase accessible names: wait.
  - opacity-70 on disabled skins: wait. Inactive controls are exempt from 1.4.3.
  - weak pressed-state cue: wait, design pass.
  - 44 px test checks the class only: wait. 2.5.8 needs 24 px, and `min-h-11` is 44.
  - near-tautological `SKIN_IDS` test: wait.
  - no editing.md recipe for skins: wait.
- **T1**
  - no test for shader deletes: wait.
  - `pickSurface` precedence untested: wait.
  - `toEqual({})` passthrough: wait.
  - premultipliedAlpha comment: wait.
  - three near-identical delete blocks: wait.
- **T2**
  - pole-closure threshold vs. its comment: wait, latent.
  - pole choice undocumented: wait.
  - square ring cannot catch swapped axes: wait.
  - Antarctica finder margin: wait.
  - no north-pole or east-to-west test: wait.
- **T3a**
  - two loopholes in the colour-literal check: wait.
  - loose `CHAPTER_INDEX` typing: wait.
  - null uniform-location path untested: wait.
  - lattice aliasing: wait.
  - day rim near-invisible: wait, blocker A.
  - Ice Age and Night side discs blend into the ground: wait, blocker A.
  - `atan(0,0)` at the pole: wait.
  - `draw()` allocates per frame: wait.
- **T3b**
  - one-way fallback: wait, by design.
  - three-tone check: wait. `#worlds` is always `deep`.
  - day rim 1.07:1 and night edge: wait, blocker A.
  - halo clips the marker ring: wait.
  - halo antialiased edge: wait.
  - graticule contrast on the disc: wait.
- **T7**
  - ~1.6 s with no visible change per lap: wait, owner call.
  - two identical robot glyphs: wait.
  - toggle stays live after the chunk failed: wait.
  - duplicate reduced-motion hook: wait, but see the trims below.
  - no e2e for "ends lit": wait, unit-covered.
  - header doc does not list the robot: wait, incomplete rather than false.
  - "brighter" in the day theme: wait, figurative.
  - off-screen walk: resolved by T6 `settle()`.
  - teardown left the walk mid-lap: resolved, GlobeCanvas.tsx:1042.
- **T6**
  - a bare tap spends the autoplay and announces: wait, the safe direction.
  - exact context-loss comparison only under reduced motion: wait.
  - viewports under 314 px tall never autoplay: wait. Thresholds `[0, .25, .5]` would fix it.
  - `settle` is a no-op mid mouse-drag: wait.
  - the `inViewRef` window before the first report: wait, harmless.
  - layout-shift check bites only at narrow widths: wait.
- **T9**
  - modifier guard not mutation-run: wait.
  - weak style-count floor (worlds.spec.ts:1705): wait.
  - arrow keys undiscoverable: wait.
  - skins move linearly rather than spatially: wait.
  - `buttons.last()` coupling: wait.
  - axe presses only "Unsupervised": wait.
  - crossing-landed asserted only at load: wait.
- **T10**
  - a rejected `play()` and the focus move are untested: wait.
  - reduced motion still plays after the press: wait. It is a decision, and the press is the user's own.
  - weak conscea poster: wait, owner.
  - e2e presses chess only: wait.
- **T11**
  - "199.9 KB measured now": wait, but fold into the I6 edit.
  - "the seven worlds had" in worlds.test: leave, it is history.
  - "world" wording in editing.md: wait.
  - thin tracker "Before" row: wait.

**Count:** 66 ledger can-wait items, plus 3 new can-wait items (m7–m9) = **69**.

## Initial-JS trims

The branch measures 204,678 B, against 202,734 B on main (**+1,944 B**, T11, three runs, 0 skipped). That is inside the 1–2 KB budget but at its edge, and spec §6.4 says initial JS "must not move" for the video.

I attributed the bytes in the built client chunk `3l--vcdc-s7ms.js` (34,564 B raw, 10,493 B gz) by removing each segment and re-gzipping at -9. These numbers are inferred, not `pnpm perf`'s measure.

| Contributor | Raw | ≈ gz marginal |
|---|---|---|
| `ProjectRecording` module (whole) | 2,756 B | **~667 B** |
| …of which the `Button` + external-link wrapper it inlines (`ProjectRecording` is the only client importer of `components/ui/Button`) | 1,763 B | ~400 B (est.) |
| Skins group JSX (WorldsStage) | 797 B | ~139 B |
| `moveFocusAmongButtons` (roving keys) | 392 B | ~162 B |
| Robot toggle JSX, names and state | 521 B | ~128 B |
| Autoplay observer effect | 316 B | ~88 B |
| `useReducedMotion` hook (deduplicates against ProjectRecording's identical media string) | 280 B | ~49 B |
| settle-on-choice effect, pointerdown spend, link visibility | 141 B | ~42 B |

Recommended trims, safest first:

1. **ProjectRecording: drop the `Button` import** and render a plain `<button type="button">` with the `secondary`/`sm` classes inlined. This keeps the look, removes the Button and external-link code from the client graph, and saves about 400 B gz.
   - In the same file, drop `PressedRecording`'s `useSyncExternalStore` subscription. Read `matchMedia(REDUCED_MOTION).matches` once in the press handler and store it with `pressed` (for example `useState<null | { loop: boolean }>`). The preference only matters at press time. This saves about 100 B more.
   - Do this in the same edit as M2 and M3.
2. **WorldsStage: replace `useReducedMotion` with CSS.**
   - Render the robot toggle whenever Technology is open, with `className="hidden motion-reduce:flex …"`. `display: none` takes it out of the accessibility tree.
   - `GlobeCanvas` already reads `reducedMotion()` itself (GlobeCanvas.tsx:1182), so this also removes a second source of truth, and drops `subscribeReducedMotion`, `useSyncExternalStore` and the hydration re-render.
   - Saves about 50–100 B gz.
   - Unit tests that stub `matchMedia` for the toggle must assert the class or move to e2e. The e2e reduced-motion test already covers the behaviour.
3. **Skins group: one accessible-name template.** Build the "needs WebGL" suffix once and reuse it for the visible span. This saves a few tens of bytes, so do it only if the file is being edited anyway.

**Do not trim** `moveFocusAmongButtons`: spec §5.5 requires the chapter and skin dials to be "arrow-key navigable".

Expected result of trims 1 and 2: roughly −0.5 to −0.6 KB, bringing Plan C to about +1.3–1.4 KB. Re-run `pnpm perf` (three runs, 0 skipped) and update the tracker row and CLAUDE.md:73 with the new figure.

## Declined to judge (outside plan or spec, for the executor to rule on)

- Spec §5.3 beats not built: Living Earth's terminator and "a light comes on", the Sky aeroplane and cloud band, Animals walking the limb, the Plants shoot into the Journey, Ice Age "arc freezes", Volcanic "rim burns orange". Deferred under R15 and blockers A and F. This is the controller's report item, not a code defect.
- Spec §5.5 "wheel to tilt": not in the plan or rulings, and not shipped before. Declined.
- The robot walks a longitude circle, not the terminator: recorded as an R15 deviation.
- "Then reset" from the owner's note on the autoplay: ruled out by R8 and sent to "For Thien".
- mentorhub and foodroute recordings not shipped: blocker C, R13.
- Lighthouse, LCP and TBT spread in the tracker row: noisy across runs, and not something this branch's code can be judged on.
- e2e flakes reported by T6 and T11 (cat target-size at 1440, drag-roll at 768): pre-existing or unrelated to the code paths changed here. I did not re-run them.

## Merge verdict

**Ready to merge: With fixes.** No Critical issues. The engine, fences, plaques, fallback and rest contract are sound.

Before merge, fix the six Important findings and the six must-fix minors:

- I1: the flake.
- I2: autoplay drops a chosen chapter.
- I3: accent as decoration in two skins.
- I4: the 8 MB buffer.
- I5: video text alternative, or an explicit owner acceptance.
- I6: CLAUDE.md gl list.
- M1–M6.

All are small, local edits. Then re-run `pnpm verify`, the worlds, sections and axe e2e at `--workers=2`, and `pnpm perf` if the initial-JS trims are taken.
