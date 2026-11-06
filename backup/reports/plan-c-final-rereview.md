# Final fix wave re-review — Round 18 Plan C

Range `e8c6dfc..80d0a13` (8 commits). Read-only. One pass over the whole diff
(`review-e8c6dfc..80d0a13.diff`), then targeted reads of the touched files at
HEAD. No suite re-run. Checks I ran are listed under each verdict.

## Finding verdicts

- **I1 autoplay test flake (Testing Library's 1 s default)** — ADDRESSED. `tests/sections/WorldsStage.autoplay.test.tsx:97,100-104`: `{ timeout: 10_000 }` on both `findByRole` and `waitFor`. The global default is not raised.
- **I2 chapter chosen mid-flight dropped** — ADDRESSED. `GlobeCanvas.tsx:1411-1423`: if `v.playing`, `focusWorld` lands the flight in place (`playing=false`, `flight=1`, `landed`, `seed`, `onLanded`) and then calls `lookAt(chapter)`. Because `playing` is now false, `step()` honours `target`, and nothing later overwrites it. New e2e at `worlds.spec.ts:551-604`; the report says it was mutation-proven.
- **I3 accent as decoration on two skins** — ADDRESSED. `gl/shaders.ts:222` reads `mix(color, palest, glow)`. `uAccent` is removed from the shader, `SPHERE_UNIFORMS`, `SphereColors`, `setColors` and `sphereColors()`. A grep of `src` finds no `uAccent`.
- **I4 8 MB coverage buffer pinned / baked when unusable** — ADDRESSED.
  - The module cache is gone.
  - `GlobeCanvas.tsx:1101-1108` bakes inline only when `gl && read.colors && !forced.matches`.
  - `sphere.ts:165-172` uses `coverage` only in `texImage2D`, and no returned closure captures `options`.
- **I5 WCAG 1.2.1 text alternative** — ADDRESSED, per the ruling.
  - `CaseStudy.tsx:190,268-270,385-389` gives the existing tagline an id and passes it to `aria-describedby` (`ProjectRecording.tsx:64`).
  - The unit test renders the real `CaseStudy` for all four recorded projects and asserts that `toHaveAccessibleDescription(tagline)` holds.
- **I6 CLAUDE.md gl list** — ADDRESSED. `CLAUDE.md:76` lists `context`, `coastline-texture`, `robot`, `shaders`, `sphere`, which matches `ls src/sections/Worlds/gl/`. The figure is now dated (see M-docs below).
- **M1 `toHaveTextContent("")`** — ADDRESSED. `WorldsStage.test.tsx:202` now uses `toBeEmptyDOMElement()`.
- **M2 video has no intrinsic size** — ADDRESSED. `ProjectRecording.tsx:67` adds `aspect-video`, and a unit test asserts the class.
- **M3 four identical button names** — ADDRESSED. `ProjectRecording.tsx:81`: `aria-label="Play the screen recording of <title>"`. The visible text leads the name, so 2.5.3 holds.
- **M4 stage name says "world … beside it"** — ADDRESSED. `WorldsStage.tsx:398-399` now says "Every chapter is also a button in the list." in both states.
- **M5 `uCrossing` declared and unread** — ADDRESSED. It is removed from the shader, `SPHERE_UNIFORMS`, `SphereState`, `REST_STATE`, the upload and GlobeCanvas's `crossing: v.flight`. A grep of `src` finds no `uCrossing`.
- **M6 `usa` in lib/worlds.ts comment** — ADDRESSED. `src/lib/worlds.ts:263-264` now says "`living-earth` could not be opened from its arrival pin".
- **Trim 1 (ProjectRecording: plain button, preference read at press)** — ADDRESSED.
  - The `Button` import is gone, and so is `useSyncExternalStore`.
  - `useState<null | { loop }>` is set in `onClick` from `matchMedia(...).matches`.
  - No client file imports `ui/Button` or `ui/ExternalLink` any more (checked every importer for `"use client"`).
- **Trim 2 (WorldsStage: CSS motion-reduce instead of the hook)** — ADDRESSED. `useReducedMotion`, `subscribeReducedMotion`, `REDUCE` and the `useSyncExternalStore` import are removed. The toggle group is `hidden flex-wrap gap-2 motion-reduce:flex` (`WorldsStage.tsx:561-565`).

## Out-of-list commit 9079204 (sphere test literal backspace)

Verified fixed, and the test can now fail.
- `git show e8c6dfc:tests/lib/sphere.test.ts` contains 2 bytes of 0x08. HEAD contains 0, and `od -c` shows the characters `\b` at lines 231-232.
- Checked in Node: the HEAD regexes `/\*\s*0\.42\b/` and `/\*\s*0\.44\b/` do not match the current GlobeCanvas source. Both match once a `m * 0.42;` or `h * 0.44;` restatement is appended.

## Specific checks

- **skins.ts `draws` strings still true.**
  - Night side, "the planet turned to the dark, its coastlines lit": `sea` and `shore` sit near `darkest`, the lambert term is inverted, and after lighting `glow` mixes toward `palest`. The coastlines read as lit lines on a dark disc. True.
  - Volcanic, "fissures cracking along every coastline": `glow = coast * step(0.3, grain)` is unchanged, now pale on a near-darkest planet. True.
  - The other three skins never set `glow`.
  - Not measured: no skin label-contrast probe exists, so the pale glow under overlay labels was checked by eye only (fix report).
- **Robot toggle, `display:none` vs reduce.**
  - `hidden` is `display:none`, which takes the group and its buttons out of the a11y tree and the tab order. The new e2e `toHaveCount(0)` via `getByRole` confirms the walk case (`worlds.spec.ts:1450-1453`).
  - Under reduce, `motion-reduce:flex` wins, because Tailwind v4 emits variant utilities after base ones. The existing reduced-motion e2e asserts both buttons are visible and ≥44 px, and the axe reduced-motion audit passed (report).
  - It is not SSR'd unless Technology is current, and Technology never is at load.
- **aria-describedby ids unique and resolving.**
  - The id is `${project.id}-tagline${scope}`, the same scheme as `titleId`.
  - The three render sites: `DrawnTree` (no scope; drawn entries only), `UnbranchedCaseStudies` (no scope; demoted entries only, which are disjoint from drawn), and `KnowledgeTreeList` (`idScope="list"`). So the ids stay unique per case study.
  - The unit test asserts that the id resolves to the tagline for all four recordings.
- **Plain play button.**
  - `PLAY_BUTTON_CLASS` contains `min-h-11` (44 px).
  - The focus style is the global `*:focus-visible` (`globals.css:450`), the same as Button's.
  - There is no `bg-[color:var(--accent)]`, which the test asserts. Accent appears only on hover, identical to Button `secondary`.
  - The test pins the className as `===` a rendered `<Button variant="secondary" size="sm">`.
- **Mid-flight chapter fix, reduced motion and keyboard.**
  - Under reduce, `fly()` never sets `playing`, so the new branch is dead there and `lookAt` snaps as before.
  - Keyboard picks (Enter or Space on a chapter button) go through the same `select()` → `focusWorld`. Roving arrows only move focus.
  - Out of view: `focusWorld` lands first, then the `[currentId]` effect calls `settle()`. `settleMotion` snaps to `target`, which is now the chapter, so the result is correct there too.
- **Buffer cache removal: remount and theme change.**
  - A theme or tone change goes through `setColors` keyed on the raw strings (`GlobeCanvas.tsx:~543`), so the texture stays on the GPU and nothing re-bakes.
  - On a StrictMode or HMR remount, the effect cleanup `stop()` disposes the sphere, including its texture, and the effect re-runs and re-bakes about 40 ms. The review accepted this.
  - Context loss and forced colours switching on later go through `fallBack()`, which never re-uploads. No path needs the old cached buffer.
- **Comments and docs.**
  - CLAUDE.md "199.5 KB after round 18 Plan C" checks out: 204,258 / 1024 = 199.47 KB.
  - The gl list is correct.
  - The tracker arithmetic is correct: +1,524 B = 204,258 − 202,734, and −420 B = 204,678 − 204,258.
  - The tracker's claim that ExternalLink went with Button holds (no client importer remains).
  - The new GlobeCanvas, ProjectRecording, WorldsStage, shaders and sphere comments are all true. ProjectRecording's "as CaseStudy's 'Discuss this project' link is" is true (`CaseStudy.tsx:350-356`).

## New breakage in the fix diff

None Critical. None Important.

- **Minor.** `WorldsStage.tsx` `select()`, together with `GlobeCanvas.tsx:1421`, swallows the chapter announcement when a visitor-pressed flight is interrupted.
  - Mid-flight after the "Take the flight" press (not autoplay), `quietRef` is false.
  - `select()` sets the chapter announcement, and in the same handler `focusWorld` → `onLanded` → `handleLanded` sets "The flight landed…". The two updates are batched and the last one wins, so a screen reader never hears the chapter's name.
  - Before the fix, both were spoken about 2 s apart.
  - The autoplayed case, which is I2's scenario, is unaffected because `quietRef` returns early.
- **Minor.** The fix leaves `gl/context.ts:47-48` stale.
  - The comment gives forced colours' rationale as "must not paint the accent", but the shader no longer has an accent.
  - Its second clause, "the shader cannot [honour the system palette]", is still true.
  - The `forced-colors` reason is now unreachable at mount from GlobeCanvas (it reports `no-program`), as the fix report already notes.

## Out-of-scope observations

- `e2e/worlds.spec.ts:498` uses the same `> 60` draws floor for the played crossing. It has the same frame-rate exposure as the robot-walk floor (see residual 1).
- m8 (`select()` does not spend the autoplay) is still open as a can-wait item. The new e2e avoids it by waiting for >10 draws first.

## Residuals

1. **The robot-walk e2e floor is a flaky frame-rate threshold. Reframe it; do not just loosen it.**
   - `worlds.spec.ts:1447` asserts `overlayDraws > 60` in a 2 s window, which means more than 30 Hz.
   - The walk is wall-clock normalised (`frameStep`), so a 30 Hz runner walks correctly and still fails. 60 at 1440 under `--workers=2` is exactly that.
   - What the assertion means to prove is "a per-frame loop started" as opposed to the 0–2 draws of no walk. That margin is huge at any frame rate.
   - Suggested reframe, using what `pressCounting` already returns:
     - `overlayDraws ≥ frames − 2`, so every rAF callback drew;
     - plus a small absolute floor (`> 10`) that a non-walk cannot reach;
     - or a floor scaled to the measured elapsed time (for example ≥ 10 Hz × elapsed).
   - Apply the same to `:498`.
2. The skin label contrast over the now-pale Night side and Volcanic glow is unmeasured. It was checked by eye only, and no probe exists.
3. Item 5's equivalence (tagline as the text alternative) rests on the controller's ruling. Per-recording descriptions remain a "For Thien" item.
4. `pickSurface`'s `forced-colors` reason is dead at mount. Behaviour is identical, but a later reader of `reason` sees `no-program`.

## Verdict

**Fix round:** all 12 findings and both trims addressed, and there is no new Critical or Important breakage. Two Minors and four residuals are listed above.
