# The Duet — two cats as subtitled storytellers

**Date:** 2026-08-22 · **Status:** approved by Thien (in-session) · **Builds on:** PR #5's companion system

## What this is

The two companion cats become a pair of playful storytellers. They speak in
meows; a subtitle beneath each bubble "translates" for the humans — the
conceit of subtitled foreign-film dialogue. One dialogue engine powers both
an ambient mode (short banter about the section the visitor is reading) and
the guided tour (the same stops, now performed as a two-voice exchange).
Single-voice field notes are retired; the duet is their replacement.

Minimal applies to the *look* (existing type, hairline borders, semantic
aliases, no new hues, no cartoon bubbles), not to capability — Thien's
explicit direction.

## Content model — `companion-dialogue.ts` (new, pure)

A **scene** is an ordered list of 2–4 **beats**:

```ts
interface DialogueBeat {
  readonly speaker: "grey" | "tabby";
  readonly meow: string; // authored per beat — personality via punctuation
  readonly sub: string;  // the "translation", playful authored copy
}
interface DialogueScene {
  readonly id: string;             // e.g. "hello", "ambient-work", "encore-work"
  readonly beats: readonly DialogueBeat[];
}
```

Rules, all enforced by unit tests:

- **Meows are authored, not generated.** Grey is terse ("Mrp."), tabby
  rambles ("Mrrrow-meow-meow!"). Personality lives in the meow text and the
  alternation rhythm, deterministically — no random source in the module.
- **Every number in a `sub` comes from `CompanionFacts`** (the server-computed
  facts object from `src/lib/companion-facts.ts`), template-filled exactly the
  way `companion-notes.ts` does today. The cats may joke; they may not invent
  a fact. A scene whose facts cannot resolve returns `null` and never plays.
- **Scene bank:** one `hello` scene (the pair introduce themselves and the
  conceit), one ambient scene per section that has facts (about, philosophy,
  work, journey, skills, tree, lab), and an optional `encore-<section>` scene
  where the facts object has a second thing worth saying. Sections with
  nothing to say stay silent — same "null means nothing to show" shape the
  notes used.
- Subtitle budget: ≤ 64 chars per beat (readable beside a cat, never a
  paragraph). Enforced at test time like `NOTE_MAX_CHARS` was.

Pure functions (all testable without DOM):

- `sceneFor(kind: "hello" | "ambient" | "encore", section, facts): DialogueScene | null`
- `beatDurationMs(beat): number` — reading-time clock from `sub` length
  (clamped, e.g. 2.4s–5s)
- `advance(run, now): DialogueRun | null` — next beat or scene complete
- `hasEncore(section, facts): boolean`

`DialogueRun` mirrors `TourRun`'s shape: `{ scene, beatIndex, beatStartedAt }`.

## Presentation — in `Companion.tsx`

- **Two bubble nodes**, one anchored per cat, painted per frame like the
  existing note bubble and clamped to the viewport with the same
  `paintNote`-style clamp (extended to serve both).
- Bubble content: meow line in the existing mono/uppercase note style; `sub`
  beneath it in smaller italic (`text-fg-subtle`, `--step--2`-ish). Existing
  border/background/tone-sampling (`syncTone`) — the bubbles must survive
  `contrast` sections the same way the cats do.
- Only the **active speaker's** bubble is visible; the handoff between cats
  is the rhythm. No arrows, no tails, no rounded-cartoon styling.
- The last beat of an ambient scene renders a small "…more?" affordance
  inside the bubble when `hasEncore` is true.

## Interaction

- **Advance:** click either cat or the visible bubble → next beat
  immediately. Otherwise beats auto-advance on `beatDurationMs`.
- **Encore ("nudge"):** clicking "…more?" plays the encore scene. Clicking a
  cat while everything is quiet starts the current section's ambient scene
  (or its encore if the ambient already played this visit).
- **Cancellation:** scrolling into a different section ends the scene
  mid-beat instantly — the cats never talk about a room the visitor left.
  Same listener discipline the notes used (`noteHideAt` generalized).
- **Priority:** forced states unchanged — escort > tour > nap all preempt
  ambient dialogue. A scene never interrupts a play scene mid-flight; it
  waits for quiet the way notes did.

## Tour integration

- `tourLine(sectionId, facts)` is replaced by a per-stop **exchange** from the
  same scene bank (`tour-<section>` scenes, 2 beats typical). The bubbles
  perform it meow-first above the cats.
- **TourHud** gains the accessible transcript: the `role="status"` region
  shows the subtitles as `Grey: … · Tabby: …` lines for the current stop
  (filled on arrival, exactly the current mount-empty-then-fill discipline).
  Buttons and stop counter unchanged; escort/nap priority unchanged.

## Cadence

- **Hello scene is guaranteed**, ~8s after the pair settle on a visitor's
  first quiet moment (reusing `NOTE_FIRST_DELAY_MS`'s slot — this replaces
  the deterministic first field note, and is the discoverability fix for
  "I never saw the bubbles").
- After hello: **at most one ambient scene per section per visit**
  (`noteShown` set generalized to `sceneShown`), with the existing visit-wide
  gap + odds machinery between spontaneous scenes. Visitor-initiated scenes
  (cat click, encore) bypass the odds but still respect the per-section
  once-per-visit memory for spontaneous replays.

## Accessibility & reduced motion

- Ambient scenes stay `aria-hidden` decoration — every fact they voice exists
  elsewhere on the page (rail, sections). No live regions for ambient talk.
- The tour remains the accessible narrator via the HUD's `role="status"`.
- Reduced motion: cats don't roam, so no ambient bubbles; the tour HUD still
  works textually, unchanged from today. No-JS: nothing mounts, unchanged.

## Testing

- **Vitest** (`tests/lib/companion-dialogue.test.ts`): scene selection per
  section; fact templating never emits a literal number not present in the
  facts fixture; null when facts missing; subtitle budget; alternating
  speakers; advance/complete; encore availability; beat duration clamps.
- **Playwright** (extend `companion.spec.ts`): hello appears with meow +
  subtitle and clears; click advances a beat; section change cancels
  mid-scene; tour HUD transcript carries both speakers' subtitles; bubbles
  stay inside the viewport at 1440 and 375; axe stays clean with a scene up.

## Out of scope (this pass)

- Choice-chip branching dialogue (only the single "…more?" encore).
- The falling-leaf scene under `#tree` (still deferred from PR #5).
- Tree/visual-design changes Thien hinted at — to be scoped separately.
