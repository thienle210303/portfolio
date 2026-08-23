# How It Grew, v2 — the real tree grows, and the cats tell it

**Date:** 2026-08-23 · **Status:** approved by Thien (in-session) · **Amends:** `2026-08-22-origin-story-design.md` (§2's stage is superseded; §§1, 3, 5 and the constraints stand)

## Thien's two corrections, verbatim in spirit

1. No stand-in silhouette. The story must grow **the actual knowledge tree** —
   seed to the very tree the visitor was just looking at, which stays
   interactive the moment the story ends.
2. The caption box is gone. The **two cats narrate** in their meow+subtitle
   bubbles, and they **react** to the weather and the growth.

Confirmed decisions: quiet years 2018–2020 grow the **roots first** (full
beat length, not compressed); when the cats are unavailable, narration falls
back to a **bare floating annotation** near the ground line (no box), in the
figure's own annotation type.

## 1. Chronological growth of the real tree

### Year-stamping (server, `DrawnTree.tsx`)

Every growable group gains `data-origin-year`:

- **Leaves / leaf rows:** the entry's `sortKey` year — the leaf appears the
  year the work happened.
- **Branches (lens groups):** the earliest entry year in that lens.
- **Trunk (and ground break):** the first canopy year (earliest lens year).
- **Roots:** the underground has no authored years, so root mains are
  distributed deterministically (by index) across the pre-canopy years
  (2018 → first canopy year − 1) — presented honestly as foundation growth,
  never as a per-category dated claim. Feeder texture follows its main.
- **Unfinished shoot:** the final year (careerYearSpan().lastYear) — last.

All values computed from content (`sortKey`s), never typed. Deterministic.

### The conductor (client, `OriginStory.tsx` reworked)

- On story start: stamp `data-origin-running` on the figure and
  `data-origin-pending` on every `[data-origin-year]` group (imperative DOM,
  the same idiom `TreeFigure`'s cross-highlight uses). A new bannered CSS
  block (same `prefers-reduced-motion: no-preference` discipline) holds the
  pending state (undrawn/scaled/faded) and the release transitions — reusing
  the tree's existing draw/grow/fade transition values.
- Per season beat: release (`removeAttribute("data-origin-pending")`) every
  group whose year ≤ the beat's year. The tree assembles in the true order
  the career happened; roots grow through 2018–2020 while the surface stays
  bare; 2021 breaks ground.
- The **sky layer** (bird + flight path + seed drop + weather glyphs + year
  numeral) is a transparent SVG positioned over the canopy area — no
  `bg-ground` cover, no reveal-swap beat. The bird/seed play first, then
  seasons; the final beat releases the shoot: "…and still growing."
- **Every exit** (Skip, Escape, scroll-away, natural end, unmount) releases
  all pending groups instantly and removes `data-origin-running` — the tree
  is never left partial. The `data-inked` re-trigger trick is retired.
- Reduced-motion storyboard: unchanged from v1 (already approved).

## 2. The cats narrate and react

### Dialogue (extends `companion-dialogue.ts`)

New scene kind `"story"` — one-beat scenes authored per beat type (`flight`,
`seed`, `rain`, `sun`, `storm`, `quiet`, `still`), speakers alternating beat
to beat, year and force counts template-filled from the beat's `Season`.
Same rules as every other scene: meows authored, subs ≤ 64 chars, no
invented numbers, no city names.

### Choreography (extends `Companion.tsx`'s existing watch)

The player dispatches `origin-story-beat` CustomEvents
(`detail: { kind, year?, sub }`). While the watch is active, Companion:

- shows the beat's bubble on the alternating speaker (reusing the duet
  bubble machinery; story bubbles preempt/queue like tour beats — exempt
  from the quiet gate while watching);
- reacts with existing mechanics only: **storm** → a short startle dash
  (rush), **sun** → the cheer flourish, **rain** → the pair huddle (follow
  spot moves beside the lead), **any growth year** (forces > 0) → a small
  excited hop (cheer on the tabby). No new animation systems.

### Accessibility

- The player keeps a `role="status"` polite narration track — now
  **visually hidden** (`sr-only`): the bubbles are decoration; AT hears the
  real captions, first beat included (the mount-empty-then-fill fix stands).
- **No-cats fallback:** when the cats aren't roaming (napped, off,
  reduced-motion-adjacent modes), the beat line renders as a bare floating
  annotation near the ground line — mono annotation type, no border, no
  background — so sighted visitors always have narration.

## 3. Unchanged from v1

Lazy chunk (+0 KB initial; budget < 15 KB gz — re-measure after rework),
one-geography rule and its test enforcement, storyboard fallback, print/
no-JS posture (button SSRs inert per the amended v1 spec), always-on shoot/
ground/roots, WCAG 2.2 AA, semantic aliases only, no new deps.

## Testing deltas

- Unit: year-stamping derivation (every leaf's year = its entry's sortKey
  year; branch year = min of its leaves; root distribution deterministic and
  total); `"story"` scenes (budget, no cities, numbers from facts).
- e2e: during the story at 1440 — a leaf dated after the current beat is
  hidden and one dated before is visible (pending attribute assertions);
  every exit path leaves zero `[data-origin-pending]` remaining; bubbles
  appear while cats roam; floating annotation appears when cats are napped;
  sr-only status still carries every caption; axe clean mid-story.
