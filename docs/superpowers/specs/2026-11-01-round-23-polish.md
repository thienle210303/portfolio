# Round 23 — polish (2026-11-01)

Thirteen asks from Thien, audited against the live site, designed here, built by
five parallel builders (A–E) in their own git worktrees, reviewed and merged by
the lead into `round-23/polish`.

Owner decisions (2026-11-01, don't re-ask): navbar = **paper strip**; "Moon, off
duty" becomes **Moon in a võng** (hammock); Diary fun facts are **drafted only
from facts already in `src/content/portfolio.ts`** and listed for his approval;
Resend is provisioned by the owner (the lead set `CONTACT_TO_EMAIL` and
`CONTACT_FROM_EMAIL` on Vercel; the key is the owner's to add).

## Rules every builder follows

- Read `CLAUDE.md`, `DESIGN.md`, `docs/voice.md` and
  `.claude/skills/the-pass/SKILL.md` first. They win over this spec on conflict;
  say so in your report if one does.
- Aliases only in `src/components` and `src/sections` (`text-fg`, `bg-surface`,
  `text-accent`, `--control`, `--mark`, `--scene-*`, `--art-*`…). One `--control`
  and one `--mark` per screen. New drawings go in `scripts/draw-scenery.mjs`
  (`pnpm draw:scenery`), never hand-edited SVG, never a drawing library. Both
  themes are first-class; every motion has a reduced-motion end state.
- No new dependencies. pnpm only. TypeScript strict. 44px targets, visible focus,
  no horizontal overflow at 320–1440px.
- Facts live in `src/content/portfolio.ts`. Copy is first person (voice.md).
- Update the tests your change breaks so they test the new truth; delete tests
  only together with the code they cover. Update the docs for your area
  (including your section's paragraph of `CLAUDE.md`).
- `src/lib/` never imports from `src/sections/`.
- **Ports.** Your dev server: `pnpm dev --port <yours>`. Your e2e:
  `E2E_PORT=<yours> pnpm test:e2e e2e/<spec>.ts --project=chromium-1440 --project=chromium-390`
  (add other projects when layout is at stake). Never use 3000 — the lead's
  server is there. Ports: A 3101, B 3102, C 3103, D 3104, E 3105.
- Done = `pnpm verify` green, your area's e2e specs green, checked in a real
  browser in **both themes** at 1440 and 390 (Playwright or the browser MCP).
  Then commit on your worktree branch (message body ends with
  `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). Don't push.

## A — Hero scenery (asks 1–4)

1. **Buffalo, recognisable, day ≠ night.** Rewrite `buffalo()` in
   `draw-scenery.mjs` as two one-colour masks painted by `--scene-buffalo`:
   - `buffalo-plow` (day): side view, walking, big crescent horns sweeping back
     and up, ears out sideways under them, hump of the shoulders, bony hip, thin
     tail with a tuft. A wooden yoke on its neck, traces to a simple plough
     (cày) behind it, a furrow line in the mud. An egret (cò) on its back is a
     welcome extra if it stays readable.
   - `buffalo-sleep` (night): lying on its belly, legs folded under, chin down,
     eye a closed curve, horns still the silhouette's signature, a small "z z".
   Recognisable at the phone size (52px tall) first. Swap with `.day-only` /
   `.night-only` (or an `--mask-*` var, whichever fits `Drawing`). Re-fit
   positions at every breakpoint so captions never sit on the stalks (text over
   stalks fails AA — see the comments in `Scenery.tsx`).
2. **"Moon, off duty" → Moon in a võng.** A Vietnamese hammock between two short
   bamboo stakes, Moon lying in it: ears and head over the edge, a paw and the
   tail dangling. By day eyes half-open; at night asleep with a "z". Theme-swapped
   art (`--art-offduty`, like `--art-vignette`) or masks + `.day-only`, your call.
   Keep `data-moon-off-duty` on the wrapper (exactly one) and the caption
   `${companions[0].name}, ${hero.offDuty}`. Read `MoonVisit.tsx` and
   `Companion.tsx` (search `moon-off-duty`) and keep the visit working; update
   `e2e/companion.spec.ts` / `e2e/hero.spec.ts` / `tests/sections/Hero.test.tsx`
   where they assume an inline `<svg>`.
3. **Vignettes.** Day (`--art-vignette` by day): the red stool with the cà phê
   phin **and a plate of cơm tấm** (broken-rice mound, grilled sườn, a fried egg,
   cucumber/tomato slices). Night: the blue stool with the lẩu **and bia** (a
   bottle and a glass with ice; reuse `bia`'s generator if it fits). Captions in
   `hero.vignette`: lower-case like today, e.g. "cà phê phin & cơm tấm, first" /
   "lẩu & bia, after work". Re-fit the box and its caption at every breakpoint.
4. **Chapter tags.** Taylors → `tag-flytrap` (a Venus flytrap: 3–4 trap leaves,
   lobes with cilia teeth, one open one shut, a thin flower stalk; it grows wild
   only in the Carolinas). USC → `tag-book` (an open book, fanned pages, a ribbon
   bookmark). Update `src/lib/hero.ts`; drop `tag-pine`/`tag-palmetto` files only
   if nothing else uses them.

Files you own: `Scenery.tsx`, `ChapterTags.tsx`, `src/lib/hero.ts`, the `hero`
block of `portfolio.ts`, the hero/vignette parts of `draw-scenery.mjs` and
`globals.css`. Specs: `e2e/hero.spec.ts`, `e2e/companion.spec.ts` (moon visit
tests only: `-g "moon"`), `e2e/responsive.spec.ts`.

## B — Watch it grow, with weather (ask 5)

The show already computes a season per year (`src/lib/origin-story.ts`: `rain`
for study, `sun` for work, `quiet` for an empty year, `storm` as an overlay for a
milestone). Make the weather **visible** over the oak, and make time visibly fly.

- Add `weather` to `GrowBeat`, computed from the season (still pure, still from
  content): `flight` → a plane crossing the sky; `sun`; `rain`; `quiet` → `snow`;
  `rain` + storm → `flood` (water rises from the oak's foot, then drains);
  the year with the most milestones → `hurricane` (the crown sways from the
  trunk's foot, leaves blow across, the sky darkens, one lightning flash);
  other storm years → `thunderstorm` (wind + flash, lighter); the last beat,
  `still` → a `ufo` cameo (glides in, beams at the lantern, zips off). Check the
  real distribution and say in the file banner why each appears. Keep `kind` and
  the `origin-story-beat` event contract unchanged for the cats (adding
  `weather` to the event detail is fine).
- `GrowOak` stamps `data-weather="<weather>"` on `#tree` per beat; CSS in
  globals.css ("Watch it grow") draws it. CSS gradients for rain/snow/beam,
  `draw-scenery.mjs` masks for the plane and the UFO and any leaf/cloud shape.
  `aria-hidden`, `pointer-events: none`; the caption (aria-live) carries the
  meaning. No canvas, no JS animation loop.
- **Time flying:** a lịch bloc (Vietnamese tear-off calendar) hung on a nail on
  the trunk or beside the button: big year number, and each beat a page tears
  off and flutters down. Paper is `bg-surface`; the year uses `--accent`.
- Beats are 850ms today — too fast to read weather. Make it ~1.6s per beat and
  keep Skip/Escape working. Captions stay ≤ `CAPTION_MAX_CHARS` and name the
  weather in first person (voice.md).
- Never starts under reduced motion or with JS off (it already doesn't).

Files you own: `GrowOak.tsx`, `origin-story.ts`, `OakScenery.tsx`/`CareerTree.tsx`
as needed, the `journey` block of `portfolio.ts`, the "Watch it grow" part of
`globals.css`, new weather drawings in `draw-scenery.mjs`. Specs:
`e2e/journey.spec.ts`, `e2e/motion.spec.ts`, `tests/lib/origin-story.test.ts`.

## C — The Diary (asks 6–9)

The Record becomes **the Diary: a book you swipe left and right.**

- **Name.** Visible name "Diary" (nav label in `navItems`, headings, the
  companion's words where they name the section). The section id stays `record`
  (the chat cites `#record`, the cats' tour uses it); add a zero-size `#diary`
  anchor beside the legacy ones.
- **Mechanics.** The book is a horizontal scroll-snap track of pages: one page
  per view below 1280, a two-page spread (snap per spread) from 1280. Native
  scroll = swipe on touch and trackpads, and it works with JavaScript off; a
  fragment (`#journey-entry-<id>`) scrolls the track to its page with JS off.
  A small client island adds: prev/next as dog-eared page corners (44px),
  ←/→ when the book has focus, "p. 3 of 14" (Courier Prime, aria-live polite).
  A spine shadow down the spread's middle. Page-turn feel via a scroll-driven
  animation (`animation-timeline: view(inline)`), only under
  `@supports` and `prefers-reduced-motion: no-preference`. The track is a
  focusable region with an accessible name.
- **Page 1 (left):** "Pressed, waiting to dry." — the lead, the tree slice
  (rings link to their chapter), the five `featured` taped in (each links to its
  page). **Page 2 (right): Contents** — chapters newest first (2025 … 2021,
  then "2018 – 2020"), each entry's title with dotted leaders and its page
  number, then "Certificates … p. N". Every line is a link to its page.
- **Filters = index tabs** sticking out of the book's fore-edge (right edge from
  1280, along the top edge below): All / Work / Study / Milestones with counts,
  in the kind colours `KindDot` already uses. Choosing one re-binds the book to
  that kind's pages (the summary, contents and certificates stay); page numbers
  and the indicator recount. Announce the count. With JS off the tabs aren't
  shown (or are plain links) and every page is there.
- **An entry's page** (no case studies — "case study make it bored"):
  kind + dates (mono), role (display), organisation; a 1–2 sentence description;
  **one highlighted figure** (the oak's highlight for that entry when it has one,
  in `--accent`); 2–4 short achievement bullets; **a small figure** that shows
  the work at a glance — drawn inline from data (two bars for a before/after,
  tally marks or dots for a count, the tree-slice idiom) or a `draw-scenery`
  drawing; and **a fun fact** in Newsreader italic on a sticky note. Entries with
  little to say (most milestones) share a page, up to three per page within
  their chapter. Awards keep their "see the award" dialog; a `recording` keeps
  its player.
- **Content model.** Add an optional `diary` block to `CareerEntry`, e.g.
  `{ bullets?: string[]; funFact?: string; figure?: DiaryFigure }`, with
  `DiaryFigure` a small union (`before-after` | `count` | `drawing`). Bullets may
  hold a figure only if the entry's `impact`/`context`/`headline` holds it — add
  a test like `highlights.test.ts` does. **Fun facts: draft only from facts
  already in `portfolio.ts`, nothing invented; mark each with
  `// DRAFT 2026-11-01 — awaiting Thien's approval`, and list every one in your
  report.** Don't index the `diary` block in the chat corpus.
- **2018 – 2020 is one chapter** (`src/lib/record.ts`: years before 2021 fold into
  one). Its pages: high school and the family kitchen together (Eastside High +
  Fu of Kyoto, both anchors), then what I taught myself — rewrite
  `self-taught-gap` to name it (he asked for it back on 2026-11-01): growing
  plants, a planted aquarium, trading stocks, investing and personal finance.
  Update the comment that says he cut that list. Keep `#record-2018`,
  `#record-2019`, `#record-2020` landing on the chapter (they were ring targets).
  The slice keeps a ring per year.
- **Certificates:** the last spread, stamps as today (each opens its certificate
  in the native `<dialog>`), each with a drawing of what it was about, no logos:
  JPMorgan → a bank façade with columns; Visa → a card with a token key;
  HKUST → code brackets and a gear; Walmart → a shopping cart. Replace the
  `stamp.drawing` union and the `stamp-*` files accordingly.
- **Removed:** case studies render nowhere on the page. Delete `CaseStudy.tsx`,
  `MetricTable.tsx`, `WorkflowDiagram.tsx`, `TimelineAccordion.tsx`,
  `RecordFilters.tsx`, `RecordYears.tsx` and anything else left unused (and their
  tests). `projects` data stays — the chat answers from it.
- **Anchors that must still land, JS on and off** (`e2e/legacy-anchors.spec.ts`):
  every `journey-entry-<id>` (its page), every `work-<projectId>` (zero-size on its
  entry's page), `#work` (DoorDash's page), `#record`, `#record-<year>`. The oak's
  tags link to these.
- Print (`e2e/print.spec.ts`): pages stack vertically. Perf: the island stays
  small; nothing heavy loads at start.

Files you own: everything under `src/sections/Record/`, `src/lib/record.ts`, the
`record`/`navItems`/`careerEntries`/`certifications` parts of `portfolio.ts`, the
`CareerEntry`/`Certification`/`RecordCopy` types, the Record part of
`globals.css`, stamp drawings in `draw-scenery.mjs`, the CareerTree components
you delete. Specs: `e2e/record.spec.ts`, `e2e/legacy-anchors.spec.ts`,
`e2e/print.spec.ts`, `e2e/responsive.spec.ts`, `e2e/axe.spec.ts -g record`.

## D — Résumé dialog and a postcard that sends (asks 10–11)

- **Résumé.** The business card's "Résumé" (and every other on-page link to
  `/resume`) is `<a href="/thien-le-resume.pdf">` that, from 640px with JS,
  opens a native `<dialog>`: a big paper sheet (up to ~1100px wide, ~90svh),
  title, "Download" (`download`), "Open in a new tab", close (44px, Escape,
  focus returns to the trigger). The body is an `<iframe>` of the PDF whose `src`
  is set **only when the dialog opens** (the PDF must not load with the page).
  Below 640px the link just opens the PDF (phones' own viewers beat an embedded
  one). `/resume` becomes the same viewer full-page (a slim header: back to the
  site, Download), so inbound links still work. The HTML résumé goes; update the
  sitemap/metadata if needed.
- **Postcard.** Production now has `CONTACT_TO_EMAIL` and `CONTACT_FROM_EMAIL`
  (the owner adds `RESEND_API_KEY`). Remove the mailto auto-open: a visitor never
  lands in their email app. When delivery isn't configured (local, previews
  without the key) or sending fails, say so in first person in the form, with my
  address and a copy button as the way out. When it sends: the postcard gets a
  postmark/"sent" stamp moment and a first-person line. Copy under the button
  says it goes straight to me. Keep the API's response contract, rate limit and
  validation; set `replyTo` to the visitor's email when given (check it is).
  Update `.env.example`, the CLAUDE.md non-negotiable about the fallback, the
  tests (`tests/api/contact.test.ts`, `tests/sections/LeadForm.test.tsx`) and
  `e2e/contact.spec.ts`.

Files you own: `src/sections/Contact/*` (not AskThisSite beyond its `/resume`
link), `src/app/resume/`, `src/app/api/contact/`, `src/lib/contact.ts`, the
`contactCopy`/`profile` résumé fields in `portfolio.ts`, `.env.example`.

## E — Navbar and cats on top (asks 12–13)

- **Paper strip.** No full-width bar, no hairline. The TL monogram tag stays
  left. The nav is a floating torn-paper strip (`bg-surface`, a deckled edge —
  a mask from `draw-scenery.mjs` or CSS), held by a piece of washi tape (the
  Record's `.record-tape` look), a hair of rotation, `paper-lift`. Items: About ·
  Journey · Diary · Contact (labels come from `navItems`; C renames Record) — no
  numbers. The current section gets a hand-drawn ink swash under it (a
  `draw-scenery.mjs` mask in `--accent`), drawn on when it changes (instant
  under reduced motion). The theme toggle is a drawn sun by day / crescent moon
  by night, no box. "Let's talk" becomes a postage stamp (perforated edge, as
  the Record's stamps) — not `--control`; it shares every screen.
- **Phone (<1024):** TL tag left; right, a "Menu" paper tag (punched hole, like
  the TL tag) and the sun/moon. No boxed buttons. Hide the stamp where it would
  crowd (it's in the menu anyway). The menu panel keeps its focus trap, Escape,
  scroll lock and the trail of stops; restyle it to match (a notebook page).
- Keep `--header-h` meaning what it means (scroll margins depend on it).
- **Cats always on top.** Reproduce first: find where a cat is hidden (use
  `document.elementsFromPoint` at a cat's centre while scrolling every section
  at 1440 and 390, both themes). Known: the cat layer is `fixed z-40`, the
  header `z-50`, the mobile menu `z-40`. Put the cats above all page content
  **and** the header; keep the open mobile menu, the skip link and native
  dialogs above the cats. Fix anything else you find covering them. Update
  `companion-space.ts`'s "behind the chrome" notes if the rule changes.

Files you own: `src/components/layout/*`, the header/nav parts of `globals.css`,
z-index lines in `src/components/companion/*`, nav drawings in
`draw-scenery.mjs`. Specs: `e2e/sections.spec.ts` (nav), `e2e/accessibility.spec.ts`,
`e2e/responsive.spec.ts`, `e2e/companion.spec.ts -g "layer|z-index|header"`.

## Merge order (lead)

E → A → B → D → C, re-running `pnpm draw:scenery` after each merge that touches
the script, then the full gate from `CLAUDE.md § Before calling anything done`
and `pnpm perf` (recorded in `docs/feedback-tracker.md`).
