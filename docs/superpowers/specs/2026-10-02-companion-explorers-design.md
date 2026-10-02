# Companion Explorers — design

Date: 2026-10-02. Owner-approved in conversation the same day ("1 Explorers,
do it!!"; design "approved").

## Intent

Thien's words: the cats "should go all around the page", and their talk must
be "more creative … not too much wordy, because it is cat, be playful, fur
rious, curious, not seriously and long ass text", with "icon or actions
related to that text … super recommended".

Today, at 1440px the cats stack in a ~72px right-hand gutter: `homeSpot()`
(`Companion.tsx:528-539`) is bottom-right, `heroMood` perches on the hero's
"Scroll" row, and `mateSpot()` puts the follower one stride below the lead in
the same column (`companion-space.ts:391-395`). Their subtitles run to 53
characters and read like captions on a museum label.

Success: a visitor scrolling the page sees two cats spread across the page,
moving on their own, saying short silly things with a little drawing and a
matching action — and when the visitor stops, the cats fall asleep and the
page goes still.

## Settled constraints (unchanged)

- Cats never rest on content (`p`, `a`, `button` …), never off-screen, never
  under the sticky header, never overlapping a bubble or caption
  (`e2e/companion.spec.ts:1026`, `:1112`, `:2307`).
- Touch (`pointer: coarse`) and `prefers-reduced-motion` keep today's parked,
  still cats with no bubbles, no Thien, no captions. No-JS mounts nothing.
- Every number in a line comes from `CompanionFacts`; no random source in the
  dialogue module; meows are authored.
- Ambient talk stays `aria-hidden` decoration; the tour HUD's `role="status"`
  remains the only live narrator.
- Semantic colour aliases only; blue is never decoration; no motion library,
  no icon font, no new runtime dependency.
- Priority cascade is kept: escort, tour, nap, secret, open toolkit, origin
  "watch", rush, pointer chase, bed and play scenes all outrank exploring.

## 1. Movement — the explorer

A new behaviour, `explore`, replaces the two places the cascade currently
falls through to standing still: "no pointer / idle → `homeSpot`" and "else →
settle on `restingPlaces()`" (`Companion.tsx` ~2985-3150). It is the default
while the reader is active.

- **Active** means a scroll, pointer move, key or click within the last
  `IDLE_MS` = 20 000 ms.
- **Picking a spot.** Each cat independently holds a target and, on arrival,
  dwells `4000–9000 ms` (uniform), then picks a new one. Candidates are
  sampled across the whole viewport and must pass the existing `isClearSpot`
  (content, header, reserved rects, toggle clearance all respected).
- **Splitting up.** Moon (grey, lead) prefers the left half of the viewport,
  Mi (tabby) the right half: a candidate on the preferred side is taken first;
  the other side is a fallback only when the preferred side has no clear spot
  in `EXPLORE_TRIES` = 12 samples. Two cats' targets are never in the same
  60px column and never closer than `EXPLORE_MIN_GAP` = 160px centre to
  centre. If no candidate satisfies everything, fall back to today's
  `restingPlaces()` answer for that cat.
- **New section.** On a section change the cats head for the new section's
  visible rectangle; if the section has a mood perch (`about` → the hero
  "Scroll" row, `contact` → `#contact aside`), the lead's first stop is that
  perch (keeps `e2e/companion.spec.ts:1051`), then exploring resumes.
- **Scroll ride.** `rideStep` behaviour is kept: a cat dwelling on a spot
  rides with the content; a target that scrolls out of view is re-picked.
- **Idle → nap.** After `IDLE_MS` with no input each cat finishes its current
  walk, stops on a clear spot and takes the `sleep` pose; when both sleep the
  rAF loop stops (keeps the 0-frames assertion, `e2e/companion.spec.ts:1230`).
  Any input wakes them: a `stretch` beat (~600 ms), then exploring resumes.
- **Modes.** `wander` mode (`companion-state.ts`) is folded into the default:
  explorers already wander. The stored value `wander` is read as `roam`, so
  no saved preference breaks. `resting` ("Send the cats to bed") is unchanged.
- **Home.** `homeSpot()` survives only for the open toolkit and the
  touch/reduced-motion parked layout.

The spot-picking logic lives in a pure function in `companion-space.ts`
(`pickExploreSpot(cat, other, viewport, probe, rng)`), with `rng` injected so
unit tests are deterministic. `Companion.tsx` only wires it into the cascade.

## 2. Voice

All 28 beats in `companion-dialogue.ts` (hello 3, ambient 4, encore 4, tour
10, story 7) are rewritten.

- `sub` ≤ `SUB_MAX_CHARS` = **32** (was 64). `sceneFor` already returns null
  past the limit; the test bound moves with it.
- Tone: playful, curious, punny, never solemn. One idea per line. Cat puns
  welcome ("purr-fectly", "fur real", "pawsome", "meow-velous"), never more
  than one per line.
- Meows keep the regex `/^[Mm][a-z!?.\- ]*$/i`.
- Facts: unchanged sources — role/organisation from `facts.about`, tree counts
  from `buildDrawnTree`, worlds from `resolveWorlds`, origin year from
  `origin.arrived`. No new fact types.
- The three currently unsourced behaviour claims (L87, L140, L141) are dropped
  or reworded so they claim nothing about the site's behaviour.

## 3. Icons and actions

`DialogueBeat` gains two optional fields:

```ts
type CatIcon = "yarn" | "fish" | "moth" | "paw" | "zzz" | "heart"
  | "sparkle" | "leaf" | "globe" | "mail" | "question" | "branch";
type CatAct = "bat" | "groom" | "stretch" | "eat" | "sleep" | "hop";

interface DialogueBeat { speaker; meow; sub; icon?: CatIcon; act?: CatAct }
```

- **Icons.** A new `CatIcon.tsx`: twelve inline SVGs, 12×12, 1.25 stroke,
  `currentColor` (inherits `text-fg`), `aria-hidden`, no text nodes. Rendered
  inside the meow bubble before the `<p>` (the bubble's single `<p>` and its
  meow-only text stay as they are, so `e2e/companion.spec.ts:2245` holds).
- **Actions.** While a beat with `act` is showing, the speaking cat holds
  that pose (existing `CatPose`s: `bat`, `groom`, `stretch`, `eat`, `sleep`),
  then returns to its walking/sitting pose. `hop` is new: a CSS keyframe
  (`translateY` 0 → -6px → 0, 360 ms, twice) on the cat wrapper, under the
  existing `prefers-reduced-motion: no-preference` guard. A cat mid-walk does
  not act; the beat's action plays when it next stands.
- Most beats carry an icon; actions appear on roughly half, so they stay a
  surprise rather than a tic.

## 4. Testing

Unit (`pnpm test`):
- `tests/lib/companion-dialogue.test.ts`: `SUB_MAX_CHARS` 32; every `icon` is
  a `CatIcon`, every `act` a `CatAct`; existing digit-from-facts, meow regex,
  no `..`, per-section coverage, tour stop coverage stay.
- `tests/lib/companion-space.test.ts`: `pickExploreSpot` never returns a spot
  failing the probe; with a seeded rng the two cats land in different halves
  and ≥160px apart; falls back to `restingPlaces` when nothing is clear.
- A render test for `CatIcon`: each name renders one `<svg>` with no text.

E2E (`pnpm test:e2e`, `--workers=2` on failure):
- `:686` wander test becomes "explorers visit both halves of the viewport
  within 24 s while the pointer moves".
- New: after `IDLE_MS` + margin with no input, both cats show the sleep pose
  and the page reaches 0 rAF frames per second; a scroll wakes them.
- Kept: overlap (`:2307`), off-screen/header (`:1112`), content (`:1026`),
  Contact perch (`:1051`), toggle clearance, bubble/caption structure,
  touch and reduced-motion, axe in both themes and all tones.

Perf: the companion is in the initial bundle, so record a `pnpm perf` row;
initial JS may grow by the icon SVGs and explorer logic (budget: ≤ 3 KB gz).

## Out of scope

Touch/reduced-motion behaviour; the tour's four stops and their order; the
play-scene catalogue (yarn, moth, bowl, chase, gift, peek, scratch, stalk);
mini-Thien's role as caption narrator; any fact or count definition.
