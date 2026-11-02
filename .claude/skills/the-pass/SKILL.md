---
name: the-pass
description: House taste for this portfolio ("The Pass, outdoors") and how Impeccable and Hallmark are used on it. Use before any UI, styling, layout, copy-on-page, motion or scenery work in this repo, before running /impeccable or /hallmark here, and when triaging either tool's findings. Wins over both tools on any conflict.
---

# The Pass

The site already has a design. Both tools are here to make it more finished
and more itself — never to swap it for theirs. Precedence, highest first:

1. `CLAUDE.md` and the sources it names (`globals.css`, `docs/voice.md`,
   `src/content/portfolio.ts`, `scripts/draw-scenery.mjs`, `design/`)
2. this skill
3. `DESIGN.md` / `PRODUCT.md` (pointers to 1)
4. Impeccable's and Hallmark's own advice

If a tool's advice would break a rule above it, drop the advice, say which
rule, and move on. Don't argue it into the design.

## Who does what

| Job | Tool | Why this one |
|---|---|---|
| Finish a section: spacing, type, states, small moments | `/impeccable polish`, `typeset`, `layout`, `clarify`, `harden` | Works inside an existing system |
| More character in one place | `/impeccable delight`, `bolder`, `quieter` | Scoped to a section, keeps the system |
| A critical read before changing anything | `/impeccable critique`, then `/hallmark audit <path>` | Two independent checklists; disagreements are the interesting part |
| Edit-time slop checks | both hooks (automatic) | Impeccable: rendered-layout rules; Hallmark: source gates |
| Study a reference (a screenshot or URL Thien likes) | `/hallmark` study | Pulls traits out to argue about; nothing is applied wholesale |

Never run on this site: Impeccable `colorize` (colour roles are fixed by the
aliases), `document` (it would copy the tokens into `DESIGN.md`; the file is a
pointer), `overdrive`, `init` over an existing `PRODUCT.md`; Hallmark theme
builds, `theme.mjs deal`/`draw`, and `redesign` (each replaces the system with
a catalogue theme). A brand-new page or route may use `/impeccable shape`,
inside this system.

## House taste — less "AI", more detail

- **Real objects, not UI furniture.** Content hangs on things from my life:
  clothesline tags, a bamboo pole, a live oak, a notebook spread, a postcard,
  stamps, a Hội An lantern, phin coffee and bánh mì vignettes. Before adding a
  card, a pill or a gradient, ask which object this content would sit on.
- **Detail is drawn, not decorated.** New illustration goes in
  `scripts/draw-scenery.mjs` as a mask or a theme-swapped file; never stock art,
  never a hand-edited SVG, never a runtime drawing library.
- **Colour is never decoration.** One `--control` and one `--mark` per screen;
  `--accent` only for links, measured values and annotation.
- **Numbers beat adjectives.** A headline is a result in 12 words or fewer,
  its figure from the same record. No adjectives about me.
- **Motion tells; text doesn't retell.** Every motion has a reduced-motion
  end state that says the same thing.
- **Both themes are first-class.** Day is a morning, night is a dusk with a
  lit lantern; a change isn't done until both read well.
- **The rail holds facts only** already true in the content (counts, dates,
  sources), never prose.
- **Finish the edges:** 44px targets, visible focus, empty and error states in
  first person, no overflow at 320px.

## Intentional choices both tools flag

Record each as a narrow exception with a reason; never "fix" it.

| Finding | Why it stays |
|---|---|
| Impeccable `text-occlusion` on `#…-back` tag links ("Read this part") | The clothesline tags turn over: the back face sits behind the front until the tag flips |
| Impeccable/Hallmark italic serif | Newsreader italic is the hero's handwriting voice (hint, tag backs, captions) |
| Hallmark 64/67 monospace or tracked uppercase labels (`.eyebrow`, `.rail dt`) | Courier Prime is the voice of tags, dates and data |
| Hallmark 48/7a `#000`/`#fff` in `@media print` and in `mask-image` | A print reset and mask alpha, not painted colour |
| Hallmark 48 literals in `icon.tsx` / `opengraph-image.tsx` | Rendered to images; CSS aliases don't exist there |
| Hallmark 20 (no Hallmark stamp in CSS) | This is not a Hallmark build |
| Impeccable `nested-cards` on `.diary-page` | A diary page holding taped-in entries and sticky notes; the depth is the object |

Exceptions: `npx impeccable ignores add-value <rule> <value> --file <path>
--reason "<why>"` for Impeccable; for Hallmark, list the gate here.

## Workflow for a UI change

1. Read `DESIGN.md`, then the source it points to for what you touch.
2. Make the change against the aliases (the guard hook blocks raw tokens and
   hex in `src/components` and `src/sections`).
3. Run `pnpm dev`, then both checks and triage each finding as **real** (fix it),
   **intentional** (table above) or **noise** (say so in one line):
   - `npx impeccable detect http://localhost:3000` and with `--viewport 390x844`
   - `node .claude/skills/hallmark/scripts/sloplint.mjs <changed files>`
4. Then the project gate in `CLAUDE.md § Before calling anything done`:
   `pnpm verify`, both themes in a browser, `pnpm test:e2e`, and `pnpm perf`
   if JavaScript could have moved.
