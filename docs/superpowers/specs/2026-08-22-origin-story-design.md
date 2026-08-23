# How It Grew — the origin story, a living tree, and the ground redesigned

**Date:** 2026-08-22 · **Status:** approved by Thien (in-session) · **Follows:** the companion duet

## What this is

Three connected changes to the Career Tree section:

1. **"How it grew"** — an on-demand, lazy-loaded, line-drawn animation: a bird
   carries a seed from Việt Nam to the US (December 2018), seasons pass year
   by year — each season a *force* that fed the growth, not a place — and the
   tree grows into today's knowledge tree, ending on a shoot that is
   deliberately not finished.
2. **A living tree, permanently** — the always-on drawing gains the same
   unfinished shoot at its highest tip: this tree is still growing, and both
   the story's last frame and the everyday figure say so.
3. **The ground redesigned** — the boxed "Root / Thien Le" plinth dissolves
   into the drawing (a ground line, a specimen label, an inscription), and
   the root system below it gets real botanical density.

## Hard constraints (Thien's, explicit)

- **Zero cost to the rest of the site.** The player ships in a dynamically
  imported chunk loaded only on button press; the initial page gains no JS.
  Target: player chunk < 15 KB gzipped. No canvas, no video, no new deps —
  SVG + the CSS animation idiom the site already uses (`stroke-dashoffset`,
  the `--ease-ink`/duration tokens).
- **Forces, not locations.** Exactly one geographic fact appears: Việt Nam →
  United States, December 2018. Every year after that is characterised by
  what fed the growth (education, work, milestones), derived from
  `careerEntries` — never typed into the player.
- **The tree is never finished.** The story's final beat and the always-on
  figure both end in an open, pale, incomplete shoot with a "still growing"
  annotation tied to the data's current year.
- Minimal look: existing type, hairlines, semantic aliases, blue only for
  annotation. WCAG 2.2 AA throughout.

## 1. Content & derivation

### `src/content/portfolio.ts` — the one new authored block

```ts
/** The move the whole tree grew from. The only geographic fact the origin
 *  story is allowed to draw. */
export const origin = {
  from: "Rạch Giá, Việt Nam",
  to: "United States",
  arrived: "December 2018",
  arrivedYear: 2018,
} as const;
```

Typed in `src/types/portfolio.ts` (`Origin` interface, readonly fields).

### `src/lib/origin-story.ts` — pure derivation (server-safe, no Date)

- `interface Season { year: number; forces: { learning: number; work: number; milestones: number }; kind: "rain" | "sun" | "storm" | "quiet"; caption: string }`
- `seasonsFor(): readonly Season[]` — one Season per year from
  `origin.arrivedYear` through `careerYearSpan().lastYear`. Force counts =
  career entries whose `sortKey` year matches, by `type`. Kind precedence:
  `milestones > 0` → `"storm"` (weathered and grew), else `learning > 0` →
  `"rain"` (education feeding the roots), else `work > 0` → `"sun"` (steady
  working growth), else `"quiet"`. Captions are authored templates around
  the computed counts (same discipline as `companion-dialogue.ts`); a quiet
  year's caption is honest ("2019 — quiet growth underground").
- `growthStage(year): number` — 0..1 fraction of the span elapsed, driving
  how much of the tree silhouette has grown by that season.
- Unit-tested against the real content (counts must equal what the timeline
  rail reports; every caption ≤ 72 chars; first season is 2018, last is
  `careerYearSpan().lastYear`).

## 2. The stage — `OriginStory` player

- **Control:** a quiet text button in the tree figure's margin area at
  ≥1024px (drawing presentation only): "Watch how it grew". Client-mounted
  (a tiny always-loaded island renders just the button; no-JS visitors never
  see a dead control). On press it `import()`s the player chunk.
- **Player:** absolutely-positioned overlay filling the figure's box
  (`bg-ground`, no layout shift), playing authored beats over its own
  minimal SVG:
  1. **Flight** — a small line bird arcs the sky band; a dashed path draws
     behind it. Label: `Việt Nam → United States · December 2018` (from
     `origin`, the only place named).
  2. **Seed** — dropped at the trunk's x; a small mound; the label fades.
  3. **Seasons** — for each `Season`: its weather glyph (sun = radiating
     strokes, rain = falling hatching, storm = darker hatch + one bent
     stroke, quiet = a bare horizon) plays over the growing silhouette while
     the year + caption show. The silhouette (simple trunk/limbs, drawn with
     `stroke-dashoffset`) reaches `growthStage(year)` each season.
  4. **The reveal** — the overlay fades out and the real figure's existing
     ink draw-in re-runs (drop `data-inked` from the figure wrapper for one
     frame, then restore — the "Career tree figure" CSS replays), so the
     story literally becomes the tree the visitor was already looking at.
  5. **Still growing** — as the reveal settles, the permanent unfinished
     shoot (see §3) is the last thing to draw, and the player's final
     caption is "…and still growing." Then the player unmounts.
- **Pacing & control:** ~3s per beat, seasons ~2s each (9 years ≈ 18s; whole
  show ≈ 30s). Click anywhere on the stage → advance one beat (duet idiom).
  Escape, the close control ("Skip"), or scrolling to another section →
  end immediately, restore the figure, unmount.
- **Cats:** if the pair are roaming, the player dispatches
  `origin-story: "start" | "end"` CustomEvents on `document`; `Companion`
  walks the pair to sit near the figure for the duration (reusing the tour's
  walk-to-spots mechanics; escort/nap/tour priority unchanged — a forced
  state simply wins and the cats don't come). Stretch scope: if this
  couples badly it ships without cats and the event stays for later.

## 3. The living tree & the ground (always-on changes)

### The unfinished shoot (`DrawnTree.tsx`)

One additional path at the canopy's highest tip: thinner (0.75 stroke),
`text-fg-subtle`, ending open (no leaf, no node), with a small aria-hidden
annotation beside it — `still growing · {careerYearSpan().lastYear}` — in
the figure's existing annotation type. It participates in the ink draw-in
last (`--ink-delay` after everything else). The same fact already lives in
the rail's rings note, so the annotation restates nothing new.

### The ground band (`KnowledgeTree.tsx` — replaces the boxed plinth at ≥1024px)

- The `border border-rule bg-surface` box is removed at `lg:`. In its place:
  a **ground line** (single hairline the trunk visually passes through,
  `GroundHatch` earth ticks below it as today), with:
  - `profile.name` set small in the display face at the trunk's base — a
    botanical specimen label, not a headline;
  - `profile.philosophy` as a fine italic inscription centred along the
    ground line;
  - the `{kinds} kinds · {technologies} technologies` eyebrow kept beneath
    (same computed facts, same rail-style type).
- Below 1024px (list presentation) the block keeps its role as the list's
  header but loses the box too: hairline top rule, same content, no bg.
- `data-cat-nap` stays on the band (the cats nap at the ground line).
- No contrast regressions: text stays on `bg-ground`; re-run `pnpm contrast`
  untouched (no token changes).

### Root density (`DrawnTree.tsx`, `RootSystem`)

Each category's root forks 2–3 levels deep with deterministic variation
(the same `hash01`/`vary` idiom the branches use), plus fine feeder-root
texture between the mains (sub-0.5 stroke, `fg-subtle`). `ROOT_H` may grow
modestly (≤ 240) if the composition needs depth. The underground must read
as the canopy's mirror in care, not an afterthought.

## 4. Accessibility & fallbacks

- The player container: `role="group"`, `aria-label="How the tree grew"`,
  one `role="status"` polite region carrying each beat's caption text (the
  drawing is `aria-hidden` decoration over those real captions).
- "Skip" is a real button; Escape ends; focus returns to "Watch how it
  grew" on close.
- `prefers-reduced-motion`: pressing the button renders a **static
  storyboard** instead — the beats as captioned frames (flight, seed, one
  frame per season kind present, the finished-but-growing tree), fully
  readable, no animation.
- No-JS: the button never mounts; the section is unchanged.
- The always-on changes (shoot, ground band, roots) are server-rendered
  exactly like the rest of the figure; print/no-JS/reduced-motion see them
  complete via the existing ink-reveal fallbacks.

## 5. Performance budget

- Initial page: **+0 KB JS** (button island is a few hundred bytes inside
  the existing section chunk; player is a separate lazy chunk).
- Player chunk target < 15 KB gzipped; no images, no fonts, no deps.
- No layout shift (overlay sits in the figure's existing box).
- Lighthouse desktop/mobile scores must not regress vs the branch baseline.

## Testing

- Unit: `origin-story.ts` derivation (season list, kinds, captions vs real
  content; budget on caption length; deterministic).
- e2e (drawing viewport): button visible ≥1024 and absent on mobile; press
  → player appears with status captions; click advances; Escape restores
  figure and focus; reduced-motion → storyboard renders with all captions;
  axe clean with player open; the unfinished shoot + annotation present in
  the always-on figure; ground band renders unboxed with name + inscription.
- Full gate: `pnpm verify` + Playwright matrix (workers ≤ 3 on this
  machine).

## Out of scope

- Sound, parallax, any non-SVG rendering.
- Autoplay of any kind; the story never starts itself.
- Additional geography (cities never appear).
