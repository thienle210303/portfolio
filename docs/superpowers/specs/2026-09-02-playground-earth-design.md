# Round 16 design — Playground Earth: seven worlds the cats look after

**Status: proposed 2026-09-02. Nothing is built. Thirteen decisions below are
Thien's, and five of them block content work.**

Produced by a multi-agent design round: six readers mapped the affected code,
five designers pitched independent concepts, three researchers verified library
sizes, three judges scored every concept, and a synthesis merged the winner
with the best grafts. Playground Earth won all three judge lenses (191 points,
against 183, 181, 173 and 170).

Working mockup of the signature moment:
https://claude.ai/code/artifact/b390f6dc-466f-47c8-acb4-bc47ba9e75f8

The earlier "Structure First" proposal
(`2026-09-02-structure-first-design.md`) is **superseded and declined** — its
hero figure conflicts with this round's decision to leave the hero alone.

## The brief

Thien, 2026-09-02:

> Don't make it too professional, I want my personal portfolio website is more
> interactive and playful!! We could create an earth that could turn around
> drag around. In it is many different world. Vietnamese world, USA world, all
> cultural and thing that represent them. An animal world, plants world or sea
> world or fly world or technology world. I want the website more interactive
> and playful but mostly shows creative of turn idea into real work, real
> workflow. AI adaptation and the tree journey experience workflow. We could
> keep the contact session but more creative add on. Remove philosophy. Move
> the chat section in to code and we could remove that old AI section
> philosophy. Let redesign if needed and install anything if needed.

Standing from earlier the same day: "optimal to public on free plan vercel
without lagging" and "so unique about me".

## Measured baseline

Taken on this repo, production build, Chromium throttled to 4× CPU and
~1.6 Mbps. **These are real numbers, not estimates.**

| Metric | Today |
|---|---|
| JavaScript transferred | 207.4 KB gz |
| CSS transferred | 14.2 KB gz |
| Fonts transferred | 331.4 KB |
| Largest Contentful Paint | 3.88 s (the hero intro paragraph) |
| Total Blocking Time | 359 ms |
| Cumulative Layout Shift | 0 |
| Initial chunk set (rootMainFiles) | 130.7 KB gz |

Two conclusions the whole design rests on:

1. **There is no mobile headroom.** LCP is already over the 2.5 s "good"
   threshold. Any new drawn figure must stay out of the first screen.
2. **The largest single asset is one font.** Newsreader *italic* is 143.6 KB
   of the 331.4 KB, downloaded on every visit, and it is used in exactly two
   places (`BusinessCard.tsx:275`, `Closing.tsx:76`). Dropping that one axis
   frees about five times what this entire redesign costs. Treated as a
   separate decision, not bundled into this work.

## Why not three.js

All five independent designers rejected it, and the researchers verified why.
Against a 207 KB total JS budget, a minimal three.js scene is ~133 KB gz,
@react-three/fiber + drei ~254 KB, globe.gl ~509 KB. `cobe` is genuinely small
(~5.9 KB) but ships markers-as-dots and arcs only, attaches no event listeners,
has no SSR path, and its Earth is a raster dot-matrix that cannot be drawn in
the site's own ink.

The globe here uses **no runtime dependency at all**: an orthographic projector
(rotate → project → front-hemisphere test), Canvas 2D, and a build-time
simplified coastline. Measured in the mockup: **24.5 KB of engine raw, 18.4 KB
gz of coastline data, 1.8 ms per frame at 1440px, zero animation frames at
rest.**

## The page after the redesign

| Section | What it is | Replaces |
|---|---|---|
| `#about` | Hero, untouched. Identity, actions, rail, code artifact — with the **full chat** as its fourth tab. | `AskThienMini` |
| `#worlds` | **Playground Earth.** The star. Below the fold. | Philosophy (same nav slot) |
| `#work` | Selected Work, each case study opened by an idea→i_did strip, closed by the scraping playbook | the playbook's home in the Lab |
| `#skills` | Unchanged | — |
| `#tree` | Journey: the career tree, growing from the seed the globe dropped | — |
| `#workshop` | **"Turn an idea into an i_did."** The nine authored loop steps, run with a real project, with an agent lane underneath | AI Workflow Lab + ProblemSolvingLoop (same nav slot) |
| `#contact` | Let's talk, with the postcard | — |
| `#closing` | Unchanged sign-off, which now names a section that exists | — |

Nav becomes: About · Worlds · Work · Skills · Journey · Workshop · Contact.
Still seven items, so the companion tour keeps its stop count.

## The globe

**Placement.** One section, below the fold, never in the LCP viewport. This is
the design's central engineering decision and the reason it beat the concepts
that put the Earth in the hero.

**Drawing.** A hairline limb circle in `--fg`; a 30° graticule in `--rule`;
simplified Natural Earth 110m coastlines in `--fg-subtle`, pen lifted at the
limb; world markers with the cats' own ground knockout underneath. It sits on a
drawn plinth, hatched below, with the two cats asleep on it. Blue is spent on
exactly three things: the two authored pins, the flight arc, and the seed.

**The signature moment.** Roll the planet east and a four-stroke chevron bird
lifts off the coast of Việt Nam and crosses the Pacific *exactly as fast as you
turn it*. You are not watching a canned animation; you are flying him. When the
United States comes round, the bird lands, a seed drops, a sapling rises, and
the page hands off to the career tree that grows from that spot. A "Take the
flight" button plays it for anyone who would rather watch, and reduced motion
gets the finished frame with the caption.

**Interaction.** Pointer drag with a 6 px tap threshold and inertia decaying to
rest inside 1.5 s. `touch-action: pan-y` — never `none`, which would trap the
page scroll. `pointercancel` is handled identically to `pointerup`, because
that is what the browser sends the instant it claims the gesture for scrolling.
Tilt clamped to ±40°. Zero animation frames once it settles.

**Accessibility.** The canvas is `aria-hidden` decoration. The seven-button
world list is the actual feature, server-rendered and complete without the
canvas. The stage is a focusable `role="group"` with `aria-roledescription
="globe"`; arrow keys rotate, right arrow flies the bird, Home resets, and a
`role="status"` region announces each landing. Verified in the mockup: the
entire signature moment is reachable by keyboard alone, and there is no
horizontal overflow at 320 or 390px. Far-side markers leave the DOM rather than
fading, so tab order never reaches an invisible control.

## The honesty rule that makes the worlds possible

This is the design's key invention, and it is what lets the globe be culturally
rich without the site inventing anything.

Every drawn object on the globe is one of exactly two things:

- **A plaque.** A typed reference to one *field* of one authored record —
  `{ kind: "plaque", ref: { type, id, field, index? }, link }` — rendered
  **verbatim**. No plaque may quote a sub-sentence.
- **A decoration.** Carries no fact, and is labelled `no plaque · decoration`
  in its own accessible name.

A unit test enforces the distinction string-for-string. In the mockup: 18
plaques, 9 decorations, and the rail counts both.

### The seven worlds

| World | Where | Holds |
|---|---|---|
| Việt Nam | Rạch Giá, 10.01°N 105.08°E | the origin caption; four cultural objects **[NEEDS INPUT]** |
| United States | country centroid, no city | graduation, two hackathon awards, the Magellan award, the 200+ students line |
| Sea | derived midpoint of the crossing | breadth-first traversal, 2M+ records at 99.9%, the reliability lesson |
| Sky | apex of the flight arc | the origin caption, the computed seasons |
| Plants | the arrival pin | 14 branches · 59 leaves · 33 technologies; "still growing · 2025" |
| Animals | the plinth, not the map | the two cats and their seven scenes |
| Technology | in orbit, counter-rotating | the two DoorDash case studies, the four AI tools, the learning log |

## What is removed

- `src/sections/Philosophy/*` entirely, including `ProblemSolvingLoop.tsx`
  (1,045 lines of client island) and `WorkflowGraph.tsx`. The nine loop steps
  survive as the Workshop's stations; `principles[].detail` prose does not
  survive — and note the hero's `principles.ts` tab is *independently authored
  wording*, not a copy, so this is a real deletion.
- The AI Workflow Lab as a chapter: its shell, rail, callout and nav item. Its
  content is re-homed — experiments and tools to the Technology world, the
  playbook to Work, the stages to the Workshop.
- `AskThienMini.tsx` and the "Full conversation in the Lab →" link.
- Four authored strings become false when the chat moves. `labPositioning`
  needs a **rewrite**, not a clause excision — cutting the named clause strands
  an em dash mid-sentence.

## Build sequence

1. **Performance gate first.** Move the measurement scripts into `scripts/`,
   add `pnpm perf`, record the baseline table above in the tracker. Nothing
   else starts until the gate exists — today there is no perf check in CI.
2. **Owner sign-off** on the thirteen decisions.
3. Chat into the code artifact (this alone should *reduce* initial JS).
4. Content layer: extend `origin` with coordinates; add `src/content/worlds.ts`
   with the plaque/decoration schema and its guard tests.
5. Demolition and companion re-key, one green PR.
6. Work: the idea→i_did strips and the playbook coda.
7. Globe, static half (server-rendered list + SSR figure).
8. Globe, live half (the canvas island).
9. The flight and the tree handoff.
10. Workshop, live half.
11. Contact postcard.
12. Finish, docs, and the gate re-run.
13. *Separate round:* the cat shove.

## Decisions — answered by Thien, 2026-09-02

The five blocking questions are closed. His answers, and what each one changes:

1. **Việt Nam world objects → cơm tấm.** One object, named by him. It becomes
   both the world's map marker and its only decoration: a line-drawn plate of
   broken rice with a grilled chop and a fried egg. Nothing else is invented;
   the panel says plainly that one object is here so far. The earlier
   placeholder set (nón lá, lotus, phở, sampan) is discarded.
2. **Place name → "Kiên Giang, Việt Nam", province level, no city.** This is a
   change to `origin.from`, which currently reads "Rạch Giá, Việt Nam". Taking
   it at the content layer rather than only on the globe, so one string serves
   the globe, the origin story and every caption — the site must never carry
   two names for one place. Pin at ≈10.0°N, 105.1°E.
   *Consequence to confirm on sight: the career tree's origin-story captions
   will read "Kiên Giang" too.*
3. **US pin → country centroid**, unlabelled below country level. As proposed.
4. **The AI Workflow Lab → deleted**, with his reason: "nobody is gonna read
   them." That is stronger than the spec's original plan, so the plan changes:
   the five experiment articles and the learning-log essays are **retired from
   the page** rather than lovingly re-homed. What survives into the Technology
   world is only the short, concrete evidence — the two DoorDash case studies
   and the four AI tools. `src/content/ai-experiments.ts` stays in the repo,
   unrendered, so nothing is destroyed irreversibly and the decision is
   reversible by wiring it back up.
5. **The cats are real, and now named: Moon**, the blue cat, who leads, and
   **Mi**, the grey tabby, who follows. The Animals world names them; the
   plinth labels them under the two sleeping drawings. This is the most
   personal fact on the globe and it costs nothing.

Still open, not blocking the first build steps: the four rewritten strings need
his approval before they ship; the Workshop's `test` station is empty for four
of five projects; and `automotive-genai` has no `assumption` and no `metrics`.

Plus, worth knowing: the Workshop's `test` station is empty for four of five
projects (only `dd-feasibility-agent` authors `whatFailed`), and
`automotive-genai` has no `assumption` and no `metrics`. Both need either
authored content or a disclosed fallback.

## Validation gate

`pnpm verify` green; `pnpm test:e2e` across both themes, all tones,
320–1440px; keyboard and reduced-motion paths for every interaction; semantic
aliases only; no new runtime dependency; zero rAF at rest asserted by an e2e
that counts callbacks over 2 s; and the measured perf table re-run and
recorded before and after.
