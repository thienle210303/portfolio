# Companion Explorers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The two cats roam the whole page while the reader is active, nap when the reader stops, and speak in short playful lines that carry a matching icon and action.

**Architecture:** The existing `wander` machinery (`planWander` in `companion-moods.ts`, `wanderTo` in `Companion.tsx`) becomes the default behaviour, re-planned by a new pure spot picker that splits the cats across the two halves of the viewport. The dialogue bank gains optional `icon`/`act` fields; a new `CatIcon.tsx` draws twelve inline SVGs, and the speaking cat holds the beat's pose (or a new CSS `hop`).

**Tech Stack:** Next.js 16 App Router, React, TypeScript strict, Tailwind v4 (`@theme` in CSS), Vitest, Playwright + axe-core. pnpm only.

**Spec:** `docs/superpowers/specs/2026-10-02-companion-explorers-design.md`

## Global Constraints

- pnpm only; TypeScript strict; no new runtime dependency; no motion library; no icon font.
- Semantic colour aliases only (`text-fg`, `border-rule`, `bg-surface` …) — never a raw `--color-*` token or hex. Icons use `currentColor`. Blue is never decoration.
- Cats never rest on content, never off-screen, never under the sticky header, never overlap a bubble/caption (`e2e/companion.spec.ts:1026`, `:1112`, `:2307`).
- Touch (`pointer: coarse`) and `prefers-reduced-motion`: parked still cats, no bubbles, no Thien, no captions — unchanged. No-JS mounts nothing.
- Every number in a `sub` comes from `CompanionFacts`; no `Math.random` in `companion-dialogue.ts`; meows match `/^[Mm][a-z!?.\- ]*$/i`.
- Ambient talk stays `aria-hidden`; the tour HUD's `role="status"` stays the only live narrator.
- Priority cascade kept: escort, tour, nap, secret, open toolkit, origin "watch", rush, pointer chase, bed, play scenes all outrank exploring.
- `SUB_MAX_CHARS` = 32. `EXPLORE_IDLE_MS` = 20 000. Dwell 4 000–9 000 ms. `EXPLORE_TRIES` = 12. `EXPLORE_MIN_GAP` = 160 px. Same-column rule: 60 px.
- Initial JS budget for this plan: ≤ 3 KB gz over the last recorded row.
- Never pipe `pnpm test:e2e` through `tail`/`head`; re-run failures with `--workers=2` before believing them.

## Review Focus

- A window with almost no whitespace (e.g. 760×560, Contact form filling the screen): explorers must fall back to legal spots, never stand on content — pinned in Task 3 (`pickExploreSpot` returns null → fallback) and the kept `:1026` e2e.
- A reader who only scrolls with the keyboard/wheel and never moves the mouse: they still count as active and the cats explore — pinned in Task 4 (activity includes scroll and key).
- A role/organisation long enough to push a templated line past 32 chars: the scene must not play rather than truncate — pinned in Task 1 (`sceneFor` returns null for an over-long org).
- A saved `localStorage` mode of `"wander"` from before this change: must load as `roam` with no error — pinned in Task 4.
- A beat with an `act` arriving while the speaker is mid-walk or mid-choreography (story storm dash, contact fake-nap): the act must wait or yield, never fight the scripted pose — pinned in Task 2.

---

### Task 1: Short playful dialogue with icons and actions

**Files:**
- Modify: `src/components/companion/companion-dialogue.ts`
- Test: `tests/lib/companion-dialogue.test.ts`

**Interfaces:**
- Produces:
  - `export type CatIcon = "yarn" | "fish" | "moth" | "paw" | "zzz" | "heart" | "sparkle" | "leaf" | "globe" | "mail" | "question" | "branch";`
  - `export const CAT_ICONS: readonly CatIcon[]` (all twelve, in that order)
  - `export type CatAct = "bat" | "groom" | "stretch" | "eat" | "sleep" | "hop";`
  - `export const CAT_ACTS: readonly CatAct[]`
  - `DialogueBeat` gains `readonly icon?: CatIcon; readonly act?: CatAct;`
  - `SUB_MAX_CHARS = 32`
  - `grey(meow, sub, icon?, act?)` / `tabby(meow, sub, icon?, act?)` helpers
  - `storyBeatScene` returns beats carrying the entry's `icon`/`act`.

- [ ] **Step 1: Write the failing tests** in `tests/lib/companion-dialogue.test.ts`:
  - `it("keeps every subtitle to 32 characters")` — over every hello/ambient/encore/tour scene for every section and every `storyBeatScene` kind (years 2019, null; storm true/false): `expect(beat.sub.length).toBeLessThanOrEqual(32)` and `expect(SUB_MAX_CHARS).toBe(32)`.
  - `it("uses only known icons and actions")` — every beat: `icon === undefined || CAT_ICONS.includes(icon)`; same for `act`/`CAT_ACTS`; and at least 60% of all beats carry an icon, and between 30% and 70% carry an act.
  - `it("drops a templated line rather than truncating it")` — `sceneFor("ambient", "about", { ...FACTS, about: { role: "Software Engineer", organization: "A Very Long Organisation Name Incorporated" } })` is `null`.
  - Update the existing length assertion at `:76-89` from 64 to `SUB_MAX_CHARS`. Keep every other existing test (digits-from-facts, meow regex, no `..`, section coverage, tour coverage, hello alternation, season/flight rules).

- [ ] **Step 2: Run** `pnpm vitest run tests/lib/companion-dialogue.test.ts` — expected FAIL (subs over 32, `CAT_ICONS` undefined).

- [ ] **Step 3: Implement.** Add the types/constants/fields above; extend the helpers with optional `icon`, `act`; give each `STORY_BEAT` entry optional `icon`/`act` and copy them onto the beat. Replace every line with exactly this copy (`{x}` = the fact named; `end(o)` = existing `endStop`):

| Bank | Speaker | Meow | Sub | Icon | Act |
|---|---|---|---|---|---|
| HELLO | tabby | `Mrrrow!` | `A visitor! Pet me? Pet me!` | heart | hop |
| HELLO | grey | `Mrp.` | `I guard the facts. Mostly.` | paw | — |
| HELLO | tabby | `Meow-mrrp!` | `Click me. I translate meows.` | question | — |
| AMBIENT.about (null unless role && organization) | grey | `Mrp. Meow.` | `Now at {organization}{end} Fancy!` | sparkle | — |
| AMBIENT.about | tabby | `Mrrrow?` | `Scroll down. It gets furrier.` | paw | hop |
| AMBIENT.tree | tabby | `Mrrrow! Meow!` | `{branches} branches! Climbing all!` | branch | hop |
| AMBIENT.tree | grey | `Meow.` | `{leaves} leaves. None of them fake.` | leaf | — |
| ENCORE.tree | grey | `Meow. Mrp.` | `{technologies} techs. I sniffed each.` | sparkle | — |
| ENCORE.tree | tabby | `Mrrrow?` | `Pick a branch. Peek inside!` | question | bat |
| ENCORE.tree | grey | `Mrp. Mrp.` | `{entries} entries. {work} were work.` | paw | — |
| ENCORE.tree | tabby | `Meow!` | `{milestones} milestones. Zoomies!` | sparkle | hop |
| TOUR.about | tabby | `Mrrrow!` | `Top of the page. That's him!` | heart | hop |
| TOUR.about | grey | `Mrp. Meow.` | role && organization ? `{organization}{end} Purr-fect.` : `The human. Facts check out.` | paw | — |
| TOUR.worlds | tabby | `Mrrrow!` | `{count} worlds! I'd nap on each.` | globe | stretch |
| TOUR.worlds | grey | `Mrp. Meow.` | `{plaques} plaques, plus {decorations} doodles.` | sparkle | — |
| TOUR.tree | tabby | `Meow meow meow!` | `Look up! {branches} branches!` | branch | hop |
| TOUR.tree | grey | `Mrp.` | `{leaves} leaves, {technologies} techs. Real.` | leaf | — |
| TOUR.tree | grey | `Mrp. Mrp.` | `{entries} entries. {work} were work.` | paw | groom |
| TOUR.tree | tabby | `Mrrrow!` | `Napped through it. Counts!` | zzz | sleep |
| TOUR.contact | tabby | `Mrrrow-meow-meow!` | `Say hi! Leave a note!` | mail | hop |
| TOUR.contact | grey | `Mrp.` | `Or just email. Fish welcome.` | fish | eat |
| STORY flight | — | `Mrrrow...` | `Long flight. {origin.arrived}{end}` | globe | — |
| STORY seed | — | `Mrp!` | `Right here. Plant it!` | leaf | hop |
| STORY rain | — | `Mrrp-meow.` | `{year} — rain. Slurp slurp.` | leaf | — |
| STORY storm | — | `Mrrrow!!` | `{year} — storm! Hide the yarn!` | yarn | hop |
| STORY sun | — | `Mrrp.` | `{year} — sunbeam. Purr-fect.` | sparkle | stretch |
| STORY quiet | — | `Mrp...` | `{year} — quiet. Big nap year.` | zzz | sleep |
| STORY still | — | `Meow!` | `…and still growing!` | branch | hop |

  Update the file banner's "Meows are authored" paragraph to add one sentence: icons and acts are authored per beat too, never chosen at random. Remove comments that describe the old lines' content (e.g. the `worlds` "nineteen plaques plus three decorations" note may stay only if still true of the new line — it is: "plus" keeps them disjoint).

- [ ] **Step 4: Run** `pnpm vitest run tests/lib/companion-dialogue.test.ts` — PASS. Run `pnpm typecheck` — PASS (callers of `DialogueBeat` are unaffected by optional fields).

- [ ] **Step 5: Commit** — `git add src/components/companion/companion-dialogue.ts tests/lib/companion-dialogue.test.ts && git commit -m "Give the cats short lines, an icon and an action each"`

---

### Task 2: Draw the icon, act out the line

**Files:**
- Create: `src/components/companion/CatIcon.tsx`
- Modify: `src/components/companion/Companion.tsx` (bubble JSX ~4734-4743; pose resolution where `grey.pose`/`tabby.pose` are set; beat start)
- Modify: `src/components/companion/CompanionCat.tsx` (accept a `hopping` flag → `data-cat-hop` on the wrapper)
- Modify: `src/app/globals.css` (one `@keyframes cat-hop` + rule)
- Test: `tests/ui/CatIcon.test.tsx` (create), `e2e/companion.spec.ts` (bubble assertions)

**Interfaces:**
- Consumes: `CatIcon`, `CAT_ICONS`, `CatAct`, `DialogueBeat.icon`, `DialogueBeat.act` from Task 1.
- Produces: `export function CatGlyph({ name }: { name: CatIcon }): JSX.Element` in `CatIcon.tsx` (named export; `CatIcon` is the type from Task 1).

- [ ] **Step 1: Write the failing render test** `tests/ui/CatIcon.test.tsx`: for each name in `CAT_ICONS`, render `<CatGlyph name={name} />`; assert exactly one `svg`, `aria-hidden="true"`, `width`/`height` `12`, `stroke="currentColor"`, `fill="none"`, and `container.textContent === ""`. Also assert the twelve rendered `innerHTML` strings are pairwise distinct.

- [ ] **Step 2: Run** `pnpm vitest run tests/ui/CatIcon.test.tsx` — FAIL (module missing).

- [ ] **Step 3: Implement `CatGlyph`** — a `Record<CatIcon, ReactNode>` of path data in a 12×12 viewBox, `strokeWidth={1.25}`, `strokeLinecap="round"`, `strokeLinejoin="round"`. Simple line drawings: yarn (circle + two crossing arcs + trailing tail), fish, moth (two wing loops + body), paw (pad + 4 toes), zzz (three stepped z's), heart, sparkle (four-point star), leaf, globe (circle + meridian + equator), mail (envelope), question (hook + dot), branch (stem + two forks).

- [ ] **Step 4: Run** the render test — PASS.

- [ ] **Step 5: Render the icon in the meow bubble.** In the bubble div, place `{beat.icon ? <CatGlyph name={beat.icon} /> : null}` BEFORE the existing single `<p>`, with the bubble becoming `inline-flex items-center gap-1`. The bubble keeps exactly one `<p>` whose text is the meow (`e2e/companion.spec.ts:2245` must still pass unchanged). Bubble stays `aria-hidden`.

- [ ] **Step 6: Act out the beat.** When a beat starts, record `{ speaker, act, until: beatStart + beatDurationMs(beat) }`. In the pose resolution for the speaking cat: if an act is live, the cat is standing (not walking), and no scripted choreography owns the pose this frame (contact fake-nap, rain huddle, storm dash/cheer, play scene), then the pose is `act` for `bat|groom|stretch|eat|sleep`, and for `hop` the pose stays `sit` and `CompanionCat` gets `hopping`. A cat mid-walk shows its walk pose; the act starts when it next stands, if the beat is still live. Acts never keep the rAF loop alive past the beat.

- [ ] **Step 7: Add the hop.** In `globals.css`, inside the existing `prefers-reduced-motion: no-preference` guard: `@keyframes cat-hop { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }` and `[data-cat-hop] { animation: cat-hop 180ms ease-out 0s 4 alternate; }` (360 ms, twice). Apply to an inner wrapper so it does not fight the outer `translate3d` positioning.

- [ ] **Step 8: E2E.** Add to `e2e/companion.spec.ts` (desktop, fine pointer): trigger a scene (click the tabby button), then assert the bubble contains one `svg[aria-hidden="true"]` and still exactly one `<p>` matching the meow regex. Add: for a beat whose act is `hop`, `[data-cat-hop]` appears within the beat and is gone after it. Keep `:2245`, `:2364`, `:2307`, touch/reduced-motion zero-bubble tests unchanged.

- [ ] **Step 9: Run** `pnpm typecheck && pnpm lint && pnpm vitest run tests/ui/CatIcon.test.tsx tests/lib/companion-dialogue.test.ts`, then the companion e2e via a throwaway config at `--workers=2` — PASS.

- [ ] **Step 10: Commit** — `git commit -m "Draw a little icon in each meow, and let the cat act the line out"`

---

### Task 3: Pick explorer spots across the whole page

**Files:**
- Modify: `src/components/companion/companion-space.ts`
- Modify: `src/components/companion/companion-moods.ts` (`planWander` → `planExplore`)
- Test: `tests/lib/companion-space.test.ts`, `tests/lib/companion-moods.test.ts` (whichever exists; create the moods file if absent)

**Interfaces:**
- Produces:
  - `export const EXPLORE_TRIES = 12; export const EXPLORE_MIN_GAP = 160; export const EXPLORE_COLUMN = 60;`
  - `export type Half = "left" | "right";`
  - `export function pickExploreSpot(half: Half, other: Point | null, view: { width: number; height: number }, top: number, probe: (p: Point) => boolean, rng: () => number): Point | null` — pure; samples up to `EXPLORE_TRIES` points uniformly inside `half` of `[EDGE, width-EDGE-CAT_W] × [top+8, height-EDGE-CAT_H]`; rejects a point failing `probe`, within `EXPLORE_MIN_GAP` (centre-to-centre) of `other`, or whose `Math.floor(x / EXPLORE_COLUMN)` equals `other`'s; if none found in `half`, repeats on the other half; returns null when both fail.
  - `export function planExplore(section: string | null, lead: Point, follow: Point, home: Point, firstInSection: boolean, rng?: () => number): MoodSpots | null` in `companion-moods.ts` — when `firstInSection` and `planMood(section, …)` returns a plan, return its spots (the perch); otherwise lead = `pickExploreSpot("left", follow, viewport(), safeTop(), isClearSpot, rng)`, follow = `pickExploreSpot("right", lead, …)`; if either is null, fall back to `findClearSpot` for that cat (today's behaviour); return null only if both fall back to nothing.
  - `planWander` is removed; its callers move to `planExplore`.

- [ ] **Step 1: Write failing unit tests** (`tests/lib/companion-space.test.ts`), using a seeded rng (e.g. mulberry32) and a fake probe:
  - `it("never returns a spot the probe rejects")` — probe rejects `x < 600`; 200 seeds; every non-null result has `x >= 600`.
  - `it("puts the two cats in different halves, at least 160px apart, never in one column")` — open probe, view 1440×900, top 64; for 200 seeds: `lead = pick("left", null)`, `follow = pick("right", lead)`; `lead.x + CAT_W/2 < 720`, `follow.x + CAT_W/2 >= 720`, `Math.hypot(...) >= 160`, columns differ.
  - `it("crosses to the other half when its own half is full")` — probe rejects the left half entirely; `pick("left", null)` returns a point in the right half.
  - `it("gives up with null when nothing is clear")` — probe always false → `null`.
  - `it("stays inside the viewport and below the header")` — every result within `[8, width-8-CAT_W] × [top+8, height-8-CAT_H]`.

- [ ] **Step 2: Run** `pnpm vitest run tests/lib/companion-space.test.ts` — FAIL.

- [ ] **Step 3: Implement** `pickExploreSpot` and `planExplore` per the Interfaces block. Update `companion-moods.ts`'s banner/comment for the removed `planWander` (no comment may describe deleted code as live).

- [ ] **Step 4: Run** the unit tests plus `pnpm typecheck` — PASS (Task 4 rewires the caller; until then keep the build green by pointing `wanderTo`'s call at `planExplore(…, false)`).

- [ ] **Step 5: Commit** — `git commit -m "Pick explorer spots anywhere clear, one cat per half"`

---

### Task 4: Make exploring the default, nap when the reader stops

**Files:**
- Modify: `src/components/companion/Companion.tsx` (cascade ~2985-3150, `wanderTo` ~2287, idle/sleep ~2385/2668/3677, section change ~1579-1595, mode handling ~1217/1560/4506/4798)
- Modify: `src/components/companion/companion-state.ts` (mode migration)
- Modify: `src/components/companion/ToolkitPanel.tsx` (remove the wander toggle)
- Test: `tests/lib/companion-state.test.ts` (create if absent), `e2e/companion.spec.ts`

**Interfaces:**
- Consumes: `planExplore(section, lead, follow, home, firstInSection, rng?)` from Task 3.
- Produces: `export const EXPLORE_IDLE_MS = 20_000;` (Companion.tsx); `SLEEP_AFTER` becomes `EXPLORE_IDLE_MS` (the night trim stays relative to it). `CompanionMode` loses `"wander"`; `readMode()` maps a stored `"wander"` to `"roam"`.

- [ ] **Step 1: Write failing tests.**
  - Unit (`tests/lib/companion-state.test.ts`): `it("reads a saved wander mode as roam")` — with `localStorage` `companion-roam`/`companion` holding the old wander value, the read mode is `"roam"` and nothing throws.
  - E2E (`e2e/companion.spec.ts`, fine pointer, 1440×900): replace the `:686` wander test with `it("explorers use both halves of the page while the reader is active")` — move the pointer in small steps (and scroll a little) for 24 s; sample both cats every 500 ms; assert the grey cat's centre was in the left half in ≥ 1 sample AND the tabby's in the right half in ≥ 1 sample, AND the pair visited > 3 distinct 60 px cells combined, AND they were never in the same 60 px column at the same sample.
  - E2E: `it("explorers nap when the reader stops, and the page goes still")` — after activity, stop all input for `EXPLORE_IDLE_MS + 6000`; both cats show the sleep pose (`data-pose="sleep"` or the existing sleep marker) and rAF frames/second reaches 0 (reuse the `:1230` measurement helper); then one `mouse.move` wakes them (pose leaves sleep within 2 s).
  - E2E: `it("a keyboard-only reader still counts as active")` — no mouse at all; press `PageDown` every 3 s for 24 s; cats are not asleep at the end and have moved > 1 cell.

- [ ] **Step 2: Run** the unit test and these three e2e tests (throwaway config, `--workers=2`) — FAIL.

- [ ] **Step 3: Implement.**
  - Activity clock: scroll, pointer move, keydown and click all stamp the same "last input" ref that `aloneFor` reads (today it reads `lastMoveRef`/`lastSignRef`; make sure scroll and keydown stamp one of them).
  - Cascade: the `wandering` branch becomes `exploring = roaming && aloneFor < EXPLORE_IDLE_MS` and is evaluated where `wandering` is today (after play scenes, before the idle branch). `wanderTo` calls `planExplore(section, grey.pos, tabby.pos, home, firstInSection)`; dwell on arrival = `4000 + rng() * 5000` ms (replacing `WANDER_STAY`/`WANDER_STAY_SPREAD`).
  - `firstInSection`: true for the first plan after a section change (the existing section-change handler clears `wanderRun`; add a flag it sets and `wanderTo` consumes).
  - Idle branch (`!pointer || aloneFor > sleepAfter`): no longer walks to `homeSpots`; it settles both cats on `nearbySpots()` (clear spots near where they stand) and lets the existing sleep-pose logic put them to sleep, after which the existing `keepGoing` check stops the loop. A visitor who never moved the pointer but scrolls is active (no more "no pointer → home").
  - Wake: on the first input after both are asleep, each cat plays `stretch` for 600 ms before exploring resumes.
  - Modes: delete the wander toggle from `ToolkitPanel` and the `mode === "wander"` toggling in `Companion.tsx`; `roaming` is `mode === "roam"`. `homeSpot()` remains only for the open toolkit and the parked layout.
  - Update every comment in the touched regions that describes wander mode, `planWander`, or "no pointer → home" as live.

- [ ] **Step 4: Run** `pnpm verify`, then e2e `companion`, `axe`, `sections` at `--workers=2` via a throwaway config — PASS. Specifically confirm the kept tests: `:1026` content, `:1051` contact perch, `:1112` off-screen/header, `:1230` zero frames, `:1413`/`:1502`/`:1593` scroll ride and toggle clearance, `:2307` overlap, touch and reduced-motion.

- [ ] **Step 5: Commit** — `git commit -m "Let the cats explore the whole page, and nap when you stop"`

---

### Task 5: Measure, record, and say so

**Files:**
- Modify: `docs/feedback-tracker.md` (perf row + a short "Companion explorers" note)
- Modify: `CLAUDE.md` only if a statement there about the companion is now false (check; do not add a section otherwise)

- [ ] **Step 1: Perf.** Build HEAD and the plan's base in two detached worktrees, serve each on its own 31xx port, run `pnpm perf` three times per arm interleaved (throwaway script copy with `executablePath` at the installed `chromium_headless_shell-1234`). Record initial JS, DOM nodes, LCP ms, LCP element, skipped count. Any skipped response → do not record that run. Initial JS delta must be ≤ 3 KB gz; a larger delta is a finding, not a row.
- [ ] **Step 2: Browser check, both themes.** Throwaway Playwright script at 1440×900 and 390×844 (touch): screenshots of the cats exploring (two different moments, both halves), a bubble with an icon, a hop, and the idle nap. Save to the plan's workspace; describe what was seen.
- [ ] **Step 3: Full e2e.** `pnpm test:e2e` at `--workers=2`, output to a file. Any failure is diagnosed against the plan's base before being called pre-existing.
- [ ] **Step 4: Commit** — `git commit -m "Record what the explorers cost and how they look"`
