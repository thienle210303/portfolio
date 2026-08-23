# Origin Story v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The origin story grows the REAL knowledge tree chronologically (roots 2018–2020, canopy from 2021, leaves in their true years) instead of a stand-in silhouette, and the caption box is replaced by the two cats narrating in duet bubbles with weather reactions — with a floating-annotation fallback and an sr-only accessible track.

**Architecture:** Server-side year-stamping (`data-origin-year`) on every growable group in `DrawnTree.tsx`; the player becomes a conductor that toggles `data-origin-pending` per beat (imperative DOM, cross-highlight idiom) under a `data-origin-running` figure gate, with a transparent sky layer replacing the covering overlay; the player emits `origin-story-beat` events consumed by `Companion.tsx` for bubbles + choreography; `companion-dialogue.ts` gains a `"story"` scene kind.

**Tech Stack:** unchanged (SVG + CSS tokens, TypeScript strict, vitest, Playwright).

**Spec:** `docs/superpowers/specs/2026-08-23-origin-story-v2-design.md` (amends v1). Read it first; its §1/§2 mechanisms are binding.

## Global Constraints

- All v1 constraints hold: pnpm; TS strict; no new deps; semantic aliases only; no Date/Math.random in render/derivation (hash01/vary only); ONE geographic fact (the flight label); player stays a lazy chunk (< 15 KB gz, re-measure); contrast byte-identical; e2e with `--workers=3`.
- The real tree must NEVER be left partial: every exit path (Skip, Escape, scroll-away, natural end, unmount, and any error) releases all `[data-origin-pending]` and removes `[data-origin-running]`.
- The sr-only `role="status"` narration keeps the mount-empty-then-fill discipline (first beat must announce).
- Story bubbles are decoration (`aria-hidden`, existing duet bubble nodes); the accessible narration lives in the player, not the companion.
- After every task: `pnpm typecheck && pnpm lint` green; contrast unchanged.

---

### Task 1: Year-stamping the real tree + the pending CSS

**Files:**
- Modify: `src/sections/CareerTree/DrawnTree.tsx`, `src/app/globals.css` (new bannered "Origin story v2 — chronological growth" block), `src/lib/origin-story.ts` (one helper), `tests/lib/origin-story.test.ts`
- Test: unit for the helper; e2e assertions land in Task 4.

**Interfaces:**
- Produces: `data-origin-year="YYYY"` on every growable group (leaves, branch/lens groups, trunk+ground-break, root mains+their feeders, shoot); CSS contract `[data-origin-running] [data-origin-pending]` = undrawn/collapsed/faded with release transitions mirroring `tree-draw`/`tree-grow`/`tree-fade` (same durations/easings, inside `@media (prefers-reduced-motion: no-preference)`); helper `rootYearFor(index: number, total: number): number` in `origin-story.ts` distributing root indices across `origin.arrivedYear .. firstCanopyYear-1` evenly and deterministically, plus `firstCanopyYear(): number` (min entry year across lens-tagged entries — derive from careerEntries sortKeys, matches careerYearSpan().firstYear).

- [ ] **Step 1: Failing unit tests** for `firstCanopyYear()` (equals `careerYearSpan().firstYear`) and `rootYearFor` (deterministic; every value within [arrivedYear, firstCanopyYear-1]; all pre-canopy years used when total ≥ span; monotonic in index).
- [ ] **Step 2:** Implement both helpers in `origin-story.ts` (pure; house comment voice). Tests green; full `pnpm vitest run`.
- [ ] **Step 3: Stamp DrawnTree.** Leaves: year from the entry's `sortKey.slice(0,4)` (the tree data model carries entries — trace `buildKnowledgeTree()`'s branch objects for where the entry/sortKey is available in DrawnTree's render; if only ids are present, extend the tree-building data minimally to carry `year` — prefer threading the existing sortKey through over re-deriving). Branch/lens groups: min of their leaves' years. Trunk + ground-break arc: `firstCanopyYear()`. Root mains (+ their feeder hairs, same group): `rootYearFor(i, total)`. Shoot: `careerYearSpan().lastYear`. All server-rendered attributes; zero client cost.
- [ ] **Step 4: The CSS block.** In globals.css, mirroring the ink pending pattern:

```css
@media screen and (prefers-reduced-motion: no-preference) {
  [data-origin-running] [data-origin-pending].tree-draw,
  [data-origin-running] [data-origin-pending] .tree-draw {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
  }
  /* …matching -grow / -grow-down / -fade pending rules, and release
     transitions identical in duration/easing to the ink block above… */
}
```

Follow the existing "Career tree figure" block's structure exactly; releases animate when `data-origin-pending` is removed while `data-origin-running` is present.
- [ ] **Step 5:** Visual sanity by hand: with dev server, in the console stamp `data-origin-running` on the figure and `data-origin-pending` on a few groups; verify they vanish/return with transitions; remove attributes. Screenshot before/after into the scratchpad.
- [ ] **Step 6:** Gates + commit `Teach every branch its year, and the roots their patience` (+ Co-Authored-By line for Claude Fable 5).

---

### Task 2: The conductor — player rework

**Files:**
- Modify: `src/sections/CareerTree/OriginStory.tsx` (major), `src/sections/CareerTree/WatchOrigin.tsx` (only if the close contract changes — aim for no change), `src/app/globals.css` (sky-layer keyframes stay; delete silhouette-only rules), `e2e/origin.spec.ts` minimal keep-green edits (full new coverage in Task 4).

**Interfaces:**
- Consumes: Task 1's attributes/CSS; `seasonsFor`, `growthStage`, `origin`, `firstCanopyYear` from `origin-story.ts`.
- Produces: `origin-story-beat` CustomEvent on `document`, `detail: { kind: "flight"|"seed"|"rain"|"sun"|"storm"|"quiet"|"still", year?: number, sub: string }` fired at each beat start (Task 3 consumes); the floating-annotation fallback element `[data-origin-annotation]`; the sr-only status track.

- [ ] **Step 1: Delete the covering stage.** Remove the silhouette SVG, the `bg-ground` overlay backdrop, and the reveal beat (and its `data-inked` re-trigger — retired per spec). The component keeps: Skip button, Escape/scroll-away/click-advance handling, the beat engine, storyboard branch (untouched), `origin-story` start/end events.
- [ ] **Step 2: The sky layer.** A transparent, `pointer-events-none` SVG positioned over the canopy area of the figure (the drawing wrapper provides the box): bird + drawing flight path + label (flight beat), seed drop + mound (seed beat), weather glyph + year numeral per season, nothing during "still". Click-to-advance moves to a full-stage transparent click target (`pointer-events-auto` on a wrapper that does NOT block the tree's own controls after the story ends — simplest: the wrapper only exists while running).
- [ ] **Step 3: The conductor.** On start: set `data-origin-running` on the figure; query all `[data-origin-year]`, stamp `data-origin-pending` on those with year > `origin.arrivedYear`... (stamp ALL of them pending, then immediately release year ≤ arrivedYear — in 2018 nothing but ground is visible). Per beat (flight/seed: release nothing; season year Y: release every group with year ≤ Y; still: release the shoot). Track released state in a ref to avoid re-querying (one initial query, cached NodeList). On EVERY exit (the existing single `end()` latch + the unmount cleanup): release all pending + remove `data-origin-running` synchronously.
- [ ] **Step 4: Narration surfaces.** The `role="status"` region becomes `sr-only` (keep mount-empty-then-fill). Add the visible fallback: `[data-origin-annotation]`, a bare mono annotation (`.eyebrow`-adjacent style, no border/bg) positioned near the ground line, showing the beat line — rendered ONLY when the cats aren't narrating: on start, the player checks whether the companion is available by dispatching `origin-story` "start" and listening for a single `origin-story-ack` CustomEvent the companion answers when it accepts the watch (Task 3 adds the ack; until then the annotation always shows — build it self-contained so Task 3 flipping the ack simply hides it).
- [ ] **Step 5: Beat events.** At each beat start dispatch `origin-story-beat` with the detail above (sub = the beat's caption). Also on "still".
- [ ] **Step 6:** Verify by hand at 1440 (headless screenshots to scratchpad): press play → tree empties to bare ground + roots grow through 2018–2020 (annotation visible pre-Task-3), canopy erupts 2021, leaves pop by year, storm year glyph, shoot last; Skip mid-2022 → full tree instantly, zero `[data-origin-pending]` (assert via evaluate); Escape same; chunk size re-measured (report it; expect smaller than v1's 3.3 KB or nearby).
- [ ] **Step 7:** Keep `e2e/origin.spec.ts` green with minimal edits (assertions about the old overlay/status visibility may need updating — the sr-only status still carries captions; visible-caption assertions move to the annotation).
- [ ] **Step 8:** Gates + commit `Let the story grow the tree itself, under an honest sky` (+ Co-Authored-By).

---

### Task 3: The cats take the microphone

**Files:**
- Modify: `src/components/companion/companion-dialogue.ts` (+ its test), `src/components/companion/Companion.tsx`
- Test: `tests/lib/companion-dialogue.test.ts` additions.

**Interfaces:**
- Consumes: `origin-story-beat` events (Task 2), the existing watch (`watchRef`), duet bubble machinery (`playDuetScene`/`setDuetBeat`/`duetRef`), rush/cheer refs.
- Produces: `origin-story-ack` CustomEvent (dispatched when the watch accepts, so the player hides its annotation); scene kind `"story"` in the dialogue module.

- [ ] **Step 1: Story scenes (TDD).** In `companion-dialogue.ts`: extend `SceneKind` with `"story"`; add `storyBeatScene(kind: "flight"|"seed"|"rain"|"sun"|"storm"|"quiet"|"still", year: number | null, facts: CompanionFacts, speaker: Speaker): DialogueScene | null` — ONE beat per scene, the given speaker, authored meow per kind, sub authored per kind with the year leading when present (rain: `${year} — rain for the roots. Drink up.`; storm: `${year} — a storm! Hold the trunk!`; sun: `${year} — steady sun, steady work.`; quiet: `${year} — quiet. Roots don't hurry.`; flight: `A long flight, a small seed. December 2018.`; seed: `Right here. This exact spot.`; still: `…and still growing.`). ≤ 64 chars, no cities, tests mirror the existing bank tests (budget, meow regex, alternation is the caller's job).
- [ ] **Step 2: The listener.** In `Companion.tsx`'s origin-story effect: on `"start"`, when the watch is accepted, dispatch `origin-story-ack` (document CustomEvent) so the player hides its annotation. Listen for `origin-story-beat`: while `watchRef.current` is non-null, build the story scene with an alternating speaker (a ref flip-flop), and play it through the duet machinery — story scenes bypass the quiet gate the way tour scenes do (extend the two `scene.kind !== "tour"` exemptions to also exempt `"story"`, OR give story scenes kind `"tour"`-like handling — prefer explicit `"story"` exemption, clearer).
- [ ] **Step 3: Choreography.** Same listener, per kind, existing mechanics only: `storm` → set `rushRef` for a short dash (reuse the existing rush shape/values); `sun` → set `cheerRef` (existing flourish); `rain` → nudge the watch spots so the follow sits adjacent to the lead (recompute spots once, closer together); any season with forces > 0 → brief tabby cheer. Guard everything on `watchRef.current` non-null; a forced state still drops watch + story bubbles (existing rules — verify the story kind is dropped by the forced/dozing clear, i.e. do NOT exempt story from THAT clear, only from the quiet-gate/section-change ones... CAREFUL: section-change cancel must ALSO exempt story? The visitor doesn't scroll during the show (the show cancels on scroll-away anyway) — leave section-change behavior as for ambient; the player's own scroll-away end will clear everything first).
- [ ] **Step 4:** Verify by hand: cats roaming + play → bubbles narrate alternating, storm dash, sun cheer, rain huddle; nap the cats first → no ack → the player's annotation shows instead; end → watch releases, encore may follow (existing).
- [ ] **Step 5:** Gates (unit suite + companion e2e at 1440, `--workers=3`) + commit `Hand the cats the story, and let the weather move them` (+ Co-Authored-By).

---

### Task 4: e2e + the full gate

**Files:**
- Modify: `e2e/origin.spec.ts` (grow-order + exit-cleanliness + narration-mode tests), possibly `e2e/companion.spec.ts` (one story-bubble test).

- [ ] **Step 1: Tests** (desktop project, `--workers=3`, derive expectations from imported content/helpers):
  - during the story, after advancing past the first canopy year: some `[data-origin-year]` ≤ that year has no `data-origin-pending`, and some group with a later year still has it;
  - Skip mid-story → `[data-origin-pending]` count is 0 and `[data-origin-running]` gone; same after Escape;
  - with cats roaming: a `[data-cat-bubble]` appears during the story (story narration) — reuse companion.spec.ts's settle helpers;
  - with cats napped (use the toolkit's send-to-bed first): the `[data-origin-annotation]` fallback is visible and carries a caption;
  - sr-only status still receives every beat's captions (assert non-visible but present text) — and axe stays clean mid-story;
  - reduced-motion storyboard unchanged (existing tests keep passing).
- [ ] **Step 2:** Full gate: `pnpm verify` + `pnpm exec playwright test --workers=3`. Tails in the report.
- [ ] **Step 3:** Manual dual-theme pass (roots growing, canopy eruption, storm with bubbles, no-cats annotation) — screenshots to scratchpad; defer to controller if blocked.
- [ ] **Step 4:** Commit `Prove the growth: years in order, exits clean, narrators of both kinds` (+ Co-Authored-By).

---

## Self-review notes

- Spec coverage: year-stamping+CSS (T1), conductor/sky/annotation/sr-only (T2), story scenes+ack+choreography (T3), tests (T4). Never-partial-tree constraint enforced at T2 Step 3 (every exit) and tested at T4.
- Type consistency: `origin-story-beat` detail shape identical T2 (producer) / T3 (consumer); `storyBeatScene` signature fixed here; `firstCanopyYear`/`rootYearFor` fixed in T1 and consumed in T1's stamping only.
- The T2→T3 ack ordering is safe: T2 ships with annotation always-on; T3 flips it off when cats accept. No placeholder mechanisms.
- One deliberate risk noted for reviewers: replacing the covering overlay means the tree's own leaves/panels are visible (collapsed) during the story — the pending state hides growable groups, and non-growable chrome (rail labels REMAIN visible; acceptable: they are margin facts, not story elements). If visual noise bothers, T2 may additionally fade `[data-origin-running]`'s RootLabels via one CSS rule — implementer's judgment, documented in the report.
