@AGENTS.md

# Thien Le — Portfolio

Single-page Next.js 16 (App Router) portfolio. Full stack rationale and command
reference: [README.md](README.md).

## Non-negotiables

- **pnpm only** — never introduce an npm/yarn lockfile.
- TypeScript is strict; keep it that way.
- Tailwind v4 is configured via `@theme` in CSS — there is no
  `tailwind.config.js`. Don't create one.
- No database, no CMS, no component library. Every component under
  `src/components` and `src/sections` is bespoke — don't reach for a
  dependency to replace one without discussing it first.
- The postcard's lead form (name plus an email or phone, no message) sends
  through Resend and nothing else; it never opens the visitor's mail app. When
  `RESEND_API_KEY` / `CONTACT_TO_EMAIL` / `CONTACT_FROM_EMAIL` aren't all set
  (read at build time, see `.env.example`) or a send fails, it says so in
  first person and offers my address with a copy button. That is intentional,
  not a bug. A send is confirmed by a "SENT" stamp inked on the form.
- Targets: **WCAG 2.2 AA** and Lighthouse 90+/95+/95+/95+. These are design
  constraints, not afterthoughts — they're why there's no motion library, no
  icon font, and why sections render on the server by default.

## The design system ("The Pass, outdoors")

Two axes, and they must stay independent. Read the theme block in
`src/app/globals.css` before touching colour.

- **Theme** (`day` | `night`) is the visitor's choice, stamped on `<html>` as
  `data-theme` by an inline script before first paint.
- **Tone** (`base` | `deep` | `contrast`) is the author's choice per
  `<Section>`. It repoints the semantic aliases; it does not paint anything
  itself.

Rules that keep that working:

- **Components style against the semantic aliases only** — `text-fg`,
  `text-fg-muted`, `border-rule`, `bg-surface`, `text-accent`, `bg-ground`.
  Never a raw `--color-*` token, never a literal hex. A raw token freezes a
  component into one theme and one tone, which is exactly the bug the alias
  layer exists to prevent.
- **Moss-deep is the primary control, red is the single mark, the flag colours
  live only in the flag.** Which alias carries what: `--accent` for links,
  measured values and annotation; `--control` for the one primary control per
  screen; `--mark` for the single mark. Colour is never decoration.
- **The margin rail carries facts already true in the content layer** —
  counts, dates, sources, computed from the data. It never restates the prose
  beside it, and it never holds a fact that exists nowhere else.
- Changing any palette token means re-running `pnpm contrast`, which
  regenerates `docs/contrast.md` and **fails if any pairing drops below
  4.5:1**. Quiet sections are transparent and sit on the sky (`--sky`, built
  from `--color-morning-*` by day and `--color-dusk-high` → `--color-dusk-deep`
  by night), so text is checked against the sky's top and bottom stops as
  well as the flat grounds; by day the top stop, `--color-morning-high`, is
  the sky's darkest.

### The globe (removed)

The globe and its WebGL engine were removed in Round 21: the globe was
redundant, and it was the heaviest code on the page (the crossing moves to the
hero's clothesline in Round 21's hero phase). It is in git history. There is still no 3D library; do not add one.

### The scenery

The hero's, the Journey's, Contact's and the Record's drawings are generated SVG files under `public/scenery/`, written
by `scripts/draw-scenery.mjs` (`pnpm draw:scenery`), and
`tests/lib/scenery.test.ts` fails until the committed files match a fresh
draw — so change a drawing in the script, never by hand. One-colour drawings
are masks painted by an alias (`--twine`, `--scene-water`, `--scene-buffalo`,
`--scene-bark`, `--scene-moss`, `text-accent`); the theme-dependent pieces
(the sky, the phin & cơm tấm/lẩu & bia, bánh mì/trà đá and cà phê sữa đá/chè
vignettes, Moon in her võng, the Hội An lantern, lit at night) take their file
from `--art-sky` / `--art-vignette` / `--art-offduty` /
`--art-journey-vignette` / `--art-record-vignette` / `--art-lantern`, so the
theme swaps them in CSS with no script. The hero's buffalo is two masks painted
by `--scene-buffalo`: she ploughs by day (`buffalo-plow`, behind the rice) and
sleeps at night (`buffalo-sleep`, in front of it), shown with `.day-only` /
`.night-only`. The chapter tags' drawings are masks too: rice, a Venus
flytrap (Taylors grows it wild), an open book (USC), a laptop. The Record's tree slice is not a file:
its rings are computed from content (`src/lib/record.ts`) and drawn inline. The Journey's oak is three masks (`oak`, `oak-leaves`, `oak-moss`);
below 1280 it continues as `oak-trunk` (with `-leaves` and `-moss`), `oak-roots`
and a stretched `oak-bough` (with `-leaves`) per tag. `oak-leaves` is the one file over 40 KB raw (capped by its gzip size). Nothing is drawn at runtime and there is no drawing
library; the two figures, mini-Thien and Bé Nhi, are fixed inline SVG in
`src/components/companion/` because their poses and faces are state. `data-moon-off-duty` (Moon lying in her võng, hung between two bamboo stakes,
in `Scenery.tsx`) is a stable hook for Phase 7; keep it, once. The drawing
inside it carries `data-moon-art`, which is what the cats visit and sit beside
(it is an art span, not an inline `<svg>`).

### The header and the cats' layer (round 23)

The header is not a bar. `SiteHeader` is transparent, borderless and
`pointer-events-none`; three bits of paper sit on the sky: the TL tag, a torn
strip held by washi tape (the nav, no numbers, and the theme switch — a drawn
sun by day, crescent by night, no box) and a postage stamp for "Let's talk"
(paper and ink, never `--control` or `--mark`; hidden under 640px). Below 1024
the strip holds a "Menu" tag (punched hole) and the sun/moon, and the menu is a
notebook page. The current section gets an ink swash drawn on by its link's
`aria-current`. The drawings (`nav-torn`, `nav-swash`, `nav-sun`, `nav-moon`)
are in `draw-scenery.mjs` like the rest. **The strip's wrapper must carry no
transform or filter** — the phone menu's panel is `position: fixed` inside it —
so tilt, shadow and torn edge live on its aria-hidden layers. `--header-h` is
still 3.5rem.

The cats are above everything: the companion layer is `z-55`, over the header
(`z-50`). Only the skip link (60), native `<dialog>`s (top layer) and the open
phone menu are above it (`SiteNav` stamps `data-menu-open` on `<html>`, which
drops the layer to 40). A cat walking over a link or button is drawn on top and
marked `data-cat-under`, which gives it `pointer-events: none` so the press
reaches the control (round 21 cut the cat out behind the control instead — that
was the "hidden by UI"). Cats still keep out of the header's band when they
settle.

## Changing what the site says

The page is four sections, in this order: About (`#about` — the hero: my headline and two actions under a
clothesline of four chapter tags that turn over to my line about each, my
field tag with the LinkedIn QR at the line's end (below 1024 the line hangs
down the page from a bamboo pole, the tags either side, my field tag at its
foot), the morning/evening scenery
drawn by `pnpm draw:scenery` behind; no rail, no height floor: it
is as tall as its content), the Journey (`#tree`: a live oak whose limb
carries the highlight tags, the DoorDash one a ticket with a 2026 stub,
Bé Nhi (my girlfriend) on a rope swing, and "Watch it grow", which grows the
oak itself; below 1280 it is one tree: the crown's trunk runs on past the tags
and her swing to its roots, each on a bough of its own), the Record (`#record`, round 21 phase 5: a
notebook spread; the left page, "Pressed, waiting to dry.", holds a tree slice
whose rings link to their years and the five `featured` entries taped around
it; the right page lists every career entry by start year with All / Work /
Study / Milestones filters, as one-open rows that hold the impact lines and the
case studies, then the certificates as stamps that open the real certificate
in a native `<dialog>`; the pages stack below 1280) and Contact
(`#contact`, round 21's postcard: my business card beside a postcard whose
address side is the lead form, always visible, and the chat at `#ask` as a
strip below both).
`navItems` in `src/content/portfolio.ts` is the same four items in the same
order; the nav doubles as the page's table of contents (and the cats' guided
tour visits the same four).

The retired ids — `#journey`, `#work`, `#skills`, `#workshop`, `#worlds`, every
`journey-entry-<id>` and every `work-<projectId>` — are all still in the
server-rendered HTML and land with JavaScript off (`e2e/legacy-anchors.spec.ts`):
`#journey`, `#skills` and `#workshop` on the Journey; `#work` (the case studies)
and every `journey-entry-<id>` / `work-<projectId>` on the Record's rows;
`#worlds` on About via `src/sections/Hero/anchors.ts`. Nothing on the page links
to most of them; they exist for inbound links the site does not control, so
"unreferenced" is not a reason to delete one.

There is no résumé section on the page, and no HTML résumé any more (round 23).
The business card's Résumé chip is a link to `profile.resumePdf`; from 640px
with JavaScript it opens the PDF in a native `<dialog>` (`ResumeLink.tsx`, the
iframe's `src` set only on first open), below that the PDF itself. `/resume`
is the same PDF full page (back to the site, Download) so inbound links still
land. Do not reintroduce the résumé as a section or an HTML page.

Copy rules (first person, surface vs depth, headlines) live in
[docs/voice.md](docs/voice.md).

Everything factual lives in `src/content/portfolio.ts`; components read from
it and never restate a fact. One career entry feeds the Journey, the Record, the
résumé and the chat at once. Practical recipes — adding a
metric, adding a role, attaching a case study — are in
[docs/editing.md](docs/editing.md).

Round 18 deleted the AI Workflow Lab's content outright:
`src/content/ai-experiments.ts` no longer exists, and neither do
`workflowStages`, `experiments`, `learningLog`, `scrapingPlaybook`, the four
Lab strings, the `experimentsIndexable` adapter, the Workshop section and the
invented `problemSolvingLoop` / `principles` / `philosophyIntro`. Nothing is
"retained pending a home". If a later plan wants any of it back, it comes from
git history and a decision by Thien, not from this file.

One rule from that history is still true and worth keeping: **never index
agent-stage failure-mode strings** (the old `workflowStages[].watchFor`). Round
16 indexed them and shipped a precision hole — three of them were the corpus's
only carriers of the word "file", so "how do I file my taxes" retrieved them.
The fix was to take the strings off the indexed surface, which the retrieval
eval priced at zero, where gating the engine harder instead cost ten points of
recall@3. The strings are gone now, so no test fences them; the lesson is that
text whose vocabulary is generic costs precision everywhere and earns recall
nowhere the eval can see.

### The Journey's tree

There is one tree: the oak. Round 22 retired the drawn tree (`DrawnTree`, the
scroll box it grew in, `TreeBox`, and the origin-story player, `OriginStory`):
it was a second tree under the oak, in a scroll box of its own, and it repeated
the Record's rows. They are in git history; do not bring a second tree back.

- **Watch it grow grows the oak.** `GrowOak.tsx` stamps `data-growing` on
  `#tree`: the oak opens out from its trunk's foot, each tag drops on its
  `data-year`, the lantern comes last (globals.css, "Watch it grow"), and a
  caption under the button reads each beat of `growBeats()`
  (`src/lib/origin-story.ts`: the flight, a season per year, the shoot), each
  1.6s long. The cats narrate it through the same `origin-story` /
  `origin-story-beat` events they always have (round 23 adds `weather` to the
  beat's detail). It never starts under reduced motion or with JS off: the
  grown oak is the end state.
- **The show has weather (round 23).** Every `GrowBeat` carries a `weather`
  computed by `weatherFor` from the season, never typed per year: `plane` for the
  flight, `rain` (schooling), `sun` (plain work), `snow` (an empty year), `flood`
  (rain with a milestone), `thunderstorm` (any other storm year), `hurricane`
  (the one year with the most milestones; the earlier wins a tie) and a `ufo`
  for the shoot. `GrowOak` stamps `data-weather` (and `--beat-ms`) on `#tree`;
  `Weather.tsx` holds every piece, `aria-hidden`, and globals.css ("Watch it
  grow, with weather") shows and animates them in CSS alone. Plane, saucer,
  clouds, leaves, bolt, rain and snow are masks in `draw-scenery.mjs`; light is
  `--surface`, silhouettes `--fg`, water `--scene-water`; never `--mark` or the
  flag's gold. In the real content every working year also has a milestone, so
  the thunderstorm opens in sun. A lịch bloc beside the button tears off a page
  per year. `finish()` removes every weather attribute, whether the show ran out
  or was skipped.
- **The Record's rows own the fragments.** Each entry's row
  (`src/sections/Record/RecordYears.tsx`) carries `journey-entry-<id>` and its
  case studies' `work-<projectId>`; the tags link there. One row is open at a
  time; a fragment opens its row, and with JavaScript off `:target` does. The
  chat cites `#record` for entries, case studies and the degree.
- **Bé Nhi swings from the oak (round 22, her own request: "dumb dumb cute
  cute easy mood changing").** `NhiSwing.tsx` hangs her from the left limb
  between the lantern and the trunk (below 1280, from a bough under the last
  tag); a press gives her a new mood and a push, and she also changes on her
  own when she comes back into view, at nightfall and dawn, and while the oak
  grows. Her name, lines and captions are `journey.swing` in the content file;
  her drawing is `src/components/companion/MiniNhi.tsx`, inline line work like
  mini-Thien's (its faces are state, so it is not a `public/scenery/` file),
  drawn from her photos' traits, never from the photos. The same drawing walks
  a step behind mini-Thien in the cats' scenes, a new face each beat. She
  loves Miffy, so she carries a bunny plush in a little dress; it is a bunny
  of her own, never Miffy (no X mouth, no name): Miffy's design belongs to
  its owners, who enforce it.
- **`src/lib/knowledge-tree.ts` outlived the drawing.** Its authored-edge rules
  (`buildCareerTree`, `buildDrawnTree`, `DEMOTED_ENTRY_IDS`, `concurrentWith`)
  are still tested but no longer rendered; `careerYearSpan`,
  `stillGrowingCaption` and `totalTechnologies` still feed the show and the
  cats. If a drawing of entries ever returns, its edges are authored, never
  inferred by matching skill names against technology strings (the two
  vocabularies overlap 17 of 38 ways), and nothing is drawn below the ground
  line.

### `src/lib/` never imports from `src/sections/`

Through round 17 `src/lib/worlds.ts` imported an anchor helper from a section's
own folder, and deleting that section broke the library at compile time. Round
18 moved what the library needed into `lib/` (round 20 then deleted it with the
acts), and nothing under `src/lib/` imports from `src/sections/` now. Keep it
that way: when a library function needs something a section owns, the thing
moves into `lib/`. No lint rule or test fences this boundary, so grep for
`@/sections` under `src/lib/` before adding an import.

## Before calling anything done

Run `pnpm verify` (typecheck → lint → contrast → test → build). For UI changes,
also run `pnpm dev` and check the change in a real browser **in both themes**,
then run `pnpm test:e2e` (Playwright + axe-core) — it audits both themes and
all three tones, and checks keyboard nav, focus restoration, reduced motion,
and horizontal overflow at 320–1440px.

Also run `pnpm perf` against a production build for any change that could add
JavaScript, and record the row in
[docs/feedback-tracker.md](docs/feedback-tracker.md). Read the `JS at load`
column first: it is the primary leak detector, and a move of more than a
kilobyte or two means something moved into the initial bundle. The 8 s `JS`
total also counts chunks fetched on idle. `pnpm perf` prints a skipped-response
count and a `content-length` cross-check beside its own total; a run reporting
any skipped responses is under-reported and must not be recorded.
