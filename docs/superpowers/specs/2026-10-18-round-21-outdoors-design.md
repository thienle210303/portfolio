# Round 21 — "The Pass, outdoors": a new look, four pages

Owner feedback after Round 20 (2026-10-18): the design looked "cheap and AI".
Directions were explored on the design canvas
(https://claude.ai/artifact/7qhYeRtHtWf3woKJPdH6sq) and the owner picked row
**1b, "The Pass, outdoors"**, refining it board by board. This spec records
those decisions. Anything not decided by the owner is marked **Assumed**.

Unchanged rules: pnpm only, strict TS, Tailwind v4 `@theme`, no new runtime
dependency, no 3D library, semantic aliases only, WCAG 2.2 AA, every fact
from `src/content/portfolio.ts`, day/night toggle kept (every change checked
in both), retired anchors stay in the server HTML.

New rule: **every word is me talking to you.** All copy, including chat
questions, suggestion chips and empty states, is first person ("What do you
do at DoorDash?", "Ask me"). `docs/voice.md` gains this line.

## The four pages

| # | Section | Id | What it is |
|---|---|---|---|
| 1 | Hero | `#about` | Clothesline from a bamboo pole to a pine, four chapter tags, my field tag |
| 2 | Journey | `#tree` | Live oak with the highlight tags hanging off it, then the drawn tree |
| 3 | The whole record | `#record` (new) | Notebook spread: pressed highlights + ring target, everything by year, certificate stamps |
| 4 | Contact | `#contact` (`#ask` kept) | My business card clipped beside a postcard lead form, chat strip below |

**Worlds is removed** (owner: "yes"). The clothesline tells the crossing now.
`#worlds` joins the retired ids and lands on `#about`. `navItems` becomes
About, Journey, Record, Contact.

## Phases

One plan, branch and merge per phase.

1. **Foundation**: palette, fonts, textures, night theme.
2. **Remove Worlds**: the globe and everything only it uses.
3. **Hero**: the clothesline.
4. **Journey**: the oak and the highlight tags.
5. **Record**: the notebook, rings and certificates.
6. **Contact**: the postcard.
7. **Cats**: redrawn as light sprite sheets, more actions.
8. **Motion**: the story slides page to page.

Phase 2 goes early because it deletes the heaviest code on the page; every
later perf row is measured without the globe.

---

## 1. Foundation

**Palette (day).** Lichen ground `#E4E8E0`, paper `#FBFBF8`, ink `#1D2321`,
muted `#56605A`, moss `#46603A`, moss-deep `#1F3A30` (the one primary control
per screen), twine `#8B7B5E`, hairline `#C9D0C8`, red `#C8102E` (one mark per
screen: the stamp, the selected tag, the route). The flag's red `#DA251D` and
yellow `#FFDD00` appear only inside the Vietnam flag and its stamp.

- "Blue is the only hue" in CLAUDE.md is replaced by: moss-deep is the primary
  control, red is the single mark, the flag colours live only in the flag.
- **Assumed — night theme:** the same drawing at dusk. Ground a deep moss-ink
  (~`#141A17`), paper a dark card (~`#1E2622`), lines and text lifted, red and
  moss brightened until `pnpm contrast` passes. A night board goes on the canvas
  for the owner before Phase 1 merges.
- `scripts/contrast.mjs` pairings are rewritten for the new tokens; every
  pairing ≥ 4.5:1 in both themes.

**Fonts** (self-hosted through `next/font/google`, not a runtime dependency):
Bricolage Grotesque (display and body), Courier Prime (tags, dates, data),
Newsreader italic (annotations only). IBM Plex is dropped.

**Shared pieces.** A `Tag` component (cut-corner paper, a twine hole, optional
flip), `Stamp` (perforated edge) and the line drawings (rice, pine, palmetto,
bamboo, fern, heron, oak) as static SVG components. No canvas, no runtime
drawing.

## 2. Remove Worlds

Delete `src/sections/Worlds/` (GL surface, `GlobeCanvas`, coastline data),
`src/lib/globe.ts`, `src/lib/origin-stops.ts` if nothing else uses it,
`public/globe/`, `scripts/bake-coastline.ts`, the coastline tests and the
`pnpm bake:coastline` script. `crossingKm()` goes with it unless a later phase
prints the distance. The CLAUDE.md globe section is rewritten to say the
globe was removed in round 21, and why. `e2e/legacy-anchors.spec.ts` gains
`#worlds`.

## 3. Hero

- **The line** runs from a bamboo pole (left) to a pine (right). Four tags hang
  on it in order, each built from content: 2003 Kiên Giang (`origin`), Dec 2018
  Taylors (`eastside-high`), 2021 USC (`usc-degree`), 2025 DoorDash
  (`doordash`). Each has a small drawing (rice, pine, palmetto, laptop).
- **A tag turns over** on press (a real `<button>`, `aria-expanded`) to my one
  line for that chapter and a "Read this part" link to where it continues. One
  tag open at a time. Reduced motion: no turn, the back face simply shows.
- **My field tag** hangs at the end: Name, Native to (with a small gold star),
  Transplanted, Habitat, Formerly, Companions, Status "Still growing". A QR code
  to `https://www.linkedin.com/in/thienle210303` that is also a link, and the
  "PRACTICE MAKES AI." stamp.
- **QR:** a static SVG committed to the repo. **Assumed:** generated once
  offline (segno) and verified by scanning with a phone before merge; no QR
  encoder ships.
- **Headline:** "Just a curious kid, and this is my youth." Body as today.
  Buttons: "Start with where I'm from" (to Journey), "Book a call with me".
- Rice field and a sleeping cat along the bottom. The terminal card is retired;
  its facts already live on the field tag.

## 4. Journey

- A live oak (drawn SVG, Spanish moss) whose long limb carries the highlight
  tags: 17h → 3m, 99.9%, 96%, 3M+, 200+, built from `buildHighlights()` as
  today, verbatim.
- "Watch it grow" opens the drawn knowledge tree (today's tree box and its
  rules unchanged: authored edges only, `DEMOTED_ENTRY_IDS`, computed
  concurrency).
- **Owner, 2026-10-18:** the one-open timeline rows move to the Record page
  (§5), which is now the full history. The `journey-entry-<id>` and `work-<projectId>`
  fragments move with them; the e2e legacy-anchor spec follows.

## 5. The whole record (new section)

A notebook spread.

- **Left page, "Pressed, waiting to dry."** A small tree-ring target: one ring
  per year 2018–2025, ring width from the number of entries that started that
  year (computed, 2020 is thin because nothing started), a dot per entry
  coloured by type (work, study, milestone). Five highlights are taped in around
  it (two down the side, three across the bottom), each tied to its dot by a
  string. Pressing a ring jumps to that year on the right page.
- **Which five** is an editorial call: a new authored `featured: true` on the
  entry (today: `doordash`, `graduation`, `magellan`, `cockyhacks`,
  `code-to-give`). Never computed.
- **Right page, "Everything I've done, by year."** All 20 entries grouped by
  start year, newest first; featured ones in bold. Each row opens to its
  `impact` lines and case studies (the old timeline's content) and carries its
  `journey-entry-<id>` / `work-<projectId>` ids. Filters: All, Work, Study,
  Milestones, with counts computed from content.
- **Certificates I've collected** are postage stamps (perforated, a small line
  drawing). A stamp opens a `<dialog>` with the real certificate image,
  lazy-loaded with `next/image`, so nothing loads until pressed. Award images
  attach to their milestone rows the same way.

**Content changes** (from `D:\Project\Portfolio-v2\src\assets\certificate`,
read off the certificates themselves):

| Certificate | Issuer | Date | Image |
|---|---|---|---|
| Software Engineering Virtual Experience | JPMorgan Chase & Co. (via Forage) | Feb 3, 2023 | `JP.jpg` |
| Token Service Technology Virtual Experience Program | Visa (via Forage) | Feb 4, 2023 | `VISA.jpg` |
| Software Engineering Specialization (3 courses) | HKUST on Coursera | Jun 26, 2023 | `SE.jpg` |
| Advanced Software Engineering Job Simulation | Walmart Global Tech (via Forage) | Feb 25, 2024 | `Walmart.jpg` |
| Technology Academy | AT&T | none on file | none |

Award images: `Cocky.jpg` → `cockyhacks`, `FoodRoute.jpg` → `code-to-give`.
Walmart and Coursera are new certifications; JPMorgan and Visa get their
dates and full names. Images go to `public/media/certificates/`.

## 6. Contact

- My business card exactly as on the live site, monogram "TL" watermark
  restored (removed in f1ccca5), paper-clipped and slightly turned.
- Beside it, the lead form is a postcard. The left half is a drawing of Taylors
  (pines, palmetto, heron, rice) with "Greetings from Taylors, SC". The right
  half is the address side: a Vietnam-flag stamp, a "TAYLORS SC" postmark, "Leave a way to
  reach you.", "No message needed. I'll write first.", name and email-or-phone
  on address lines, "Send the postcard". Same schema, route, honeypot and
  mailto fallback as Phase 6 of round 20.
- The chat becomes a strip under both: "Ask me", "I answer from what I've
  written here", first-person suggestion chips. The two cats sleep on it.
- The flip card is retired; the postcard is always visible.

## 7. Cats

Owner: draw them myself, lighter, more active. Following page-mascot's method
(not its package; MIT, read for the technique): each cat is a small set of
sprite sheets instead of today's 5,000-line render path.

- Sheets per cat, drawn by me in the site's fine-line style as SVG and
  rasterised once to WebP at build time: 3×3 head directions, 3×3 reactions
  (blink, yawn, stretch, purr, startle, ...), and a 6–8 frame walk cycle.
- The head follows the pointer when a cat sits (fine pointers only); a press
  plays a reaction; they walk, sit and sleep on the page's surfaces as now.
- **Assumed:** behaviour modules that still earn their keep (space, moods,
  cadence) are kept and pointed at the new renderer; the rest is deleted in
  the same phase. A size budget is recorded before and after.
- Reduced motion: no walking, no head tracking; a press still reacts with a
  single frame.

## 8. Motion

The story slides page to page with browser features, no library:

- CSS scroll-driven animations (`animation-timeline: view()`) for entrances: the
  clothesline tags sway in, the oak's tags drop, the notebook opens, the
  postcard settles.
- Each page snaps gently (`scroll-snap-type: y proximity`) so the four pages
  read as chapters without trapping scroll.
- View Transitions for in-page navigation (nav items, "Read this part").
- Everything off under `prefers-reduced-motion`. Browsers without
  scroll-driven animations get the static layout.
- Claude Motion may be used to prototype a move; what ships is hand-written
  CSS, because it has to pass the same accessibility and perf checks.

## Checks per phase

`pnpm verify`; `pnpm test:e2e` (both themes, all tones, keyboard, reduced
motion, 320–1440px overflow); `pnpm perf` with the `JS at load` row recorded;
screenshots in both themes into `reports/r21-p<n>-screens/`.

## Owner answers (2026-10-18)

- Spec approved as written; timeline rows move to the Record page (§4).
- Push after each phase (pre-approved).
- AT&T Technology Academy: no date or image exists; it renders as a stamp
  with no dialog.
- Night theme: a night board goes on the canvas before Phase 1 merges.
