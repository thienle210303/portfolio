# Round 21 Phase 5 — The whole record (the notebook) — Implementation Plan

**Goal:** A new `#record` section between the Journey and Contact, built from the approved `NatRecordFinal` board (day and night): a notebook spread whose left page, "Pressed, waiting to dry.", holds a tree-ring slice (one ring per start year, widths and dots computed from content) with five taped highlights tied to their dots by string, a pressed lotus taped beside the title and the cà phê sữa đá / chè vignette; whose right page, "Everything I've done, by year.", lists every career entry by start year with filters and the one-open rows that used to close the Journey; and whose certificates are perforated postage stamps that open the real certificate in a native `<dialog>`.

**Spec:** `docs/superpowers/specs/2026-10-18-round-21-outdoors-design.md` — §5 (the whole record), §4 (the rows and their fragments move here), the Vietnamese touches (the pressed lotus; "cà phê sữa đá, while I write" / "chè, while I write"), §1 palette and night. **Visual source of truth:** `design/round-21-outdoors/v1/boards/NatRecordFinal(.Night).dc.html`, `previews/NatRecordFinal(.Night).png`, and the `// ---------- record, chosen ----------` block of `design/round-21-outdoors/v1/source/gen-nature.mjs` (`YEARS`, `KIND`, `stamp`, `stampArt`, `pressedLotus`, `STILL.suaDa`, `STILL.che`, the slots and the ring arithmetic). Precedents: `2026-10-20-round-21-phase-4-journey.md`, `2026-10-20-round-21-phase-6-contact.md`.

## Global constraints

- Unchanged rules: pnpm only; strict TS; Tailwind v4 `@theme`; **no new dependency**; semantic aliases only in components (hex lives in `globals.css` tokens and in generated `public/scenery/` files); WCAG 2.2 AA; both themes; retired anchors stay in the server HTML; `src/lib/` never imports from `src/sections/`.
- **Owner instruction (2026-10-21): no AT&T information is added.** The existing `att` certification stays as it is (it is on `/resume` today); it gets no stamp, no image and no date.
- **Never invent facts.** Certificate names, issuers and dates are read off the images (checked 2026-10-21, see "Facts read off the certificates").
- **Copy, verbatim from the board:** "Pressed, waiting to dry.", "My best ones, pressed between the pages. Give them a few years.", "A tree slice: 2018 at the heart, 2025 at the bark. Wider rings, busier years." (the years computed), "Everything I've done, by year.", "Nothing started this year.", "Certificates I've collected", the two vignette captions. First person (`docs/voice.md`).
- **Retrieval eval floors** 0.70 / 0.90 / 0.95 / 0.80, baseline 70.0 / 93.3 / 96.7 / 0.807. The Record's own copy and the certificates are **not** indexed (generic vocabulary). Career-entry and case-study documents now cite `#record` (`sectionId` is not on the search surface; the eval cannot move).
- **Perf:** baseline at `df1472b` (this worktree, production build, `:3230`, three runs, bytes identical): JS 193,799 B, **JS at load 167,236 B**, CSS 19,602 B, DOM 2293. JS at load may grow by about +1 KB at most.
- Ports 3230–3239 only; kill by exact PID; e2e through an untracked `playwright.r21.config.ts`, `--workers=2`.
- Cats are another branch's: no edit to `src/components/companion/*` beyond what `navItems` growing by one forces (the tour must visit every nav section).

## Architecture

- **Server first.** `src/sections/Record/Record.tsx` is a server component. Client code is one small module, `RecordFilters.tsx`: the filter buttons (`aria-pressed`), which set `data-filter` on the list (CSS hides the rest), reset to All when a ring link targets a hidden year, and a fallback for stamps in browsers without invoker commands. The rows reuse the Journey's client `TimelineAccordion` / `TimelineRow` (already in the bundle).
- **Rings are links.** One `<a href="#record-<year>">` per ring inside an inline SVG (painted outermost first so each annulus is its own hit area), named "2024: 5 entries". A plain fragment jump: works with JavaScript off. The year group is `:target`-marked.
- **Ring geometry is computed** in `src/lib/record.ts` from `careerEntries` (ring width `4.5 + 3.6 × entries started that year`, the board's arithmetic and wobble seeded the same way), so a new entry re-cuts the slice. Pure, server-only, unit tested.
- **The dialog needs no JavaScript.** Each stamp is `<button commandfor command="show-modal">`; the `<dialog>` holds a plain `<img loading="lazy">` whose props come from `next/image`'s `getImageProps()` on the server (optimised `srcset`, no client image runtime). A lazy image inside a closed dialog is never fetched until the dialog opens. Escape and focus return are the browser's. Award images (`cockyhacks`, `code-to-give`) open the same way from their rows.
- **Drawings are files.** `pressedLotus`, `STILL.suaDa`, `STILL.che` and the four stamp drawings are ported into `scripts/draw-scenery.mjs` (`fern` ported verbatim); `pnpm draw:scenery`; `tests/lib/scenery.test.ts` pins them. The slice is not a file: its rings come from content.
- **Layout.** ≥1280: the board's spread (the notebook breaks out of the content column, ≤1300 px). Below: the pages stack. The left page's slice-and-cards frame is board coordinates scaled by a container query (frame from 600 px of page width); under that (phones) the slice sits centred and the five cards follow two to a row, without strings. The year list and the stamps follow; the stamps wrap.
- **Fragments.** Every `journey-entry-<id>` is a Record row now (all 20 entries; the Journey's credentials line and its unbranched case studies go: the Record's rows hold them). `work-<projectId>` stays on the case-study article inside its row. The retired `#work` moves with the case studies to the Record; `#journey`, `#skills`, `#workshop` stay on the Journey.

## Tasks

1. **Content.** `CareerEntry.featured?: true` on `doordash`, `graduation`, `magellan`, `cockyhacks`, `code-to-give`; `CareerEntry.award?: { image, alt }` on `cockyhacks`, `code-to-give`; `Certification` gains `via?`, `stamp?` (`short`, `drawing`, `image`, `alt`); certifications updated and two added; `navItems` gains Record; a `record` copy export. Tests: the five ids exist and are the only featured; every certificate with a stamp has a date and an image file under 200 KB; no AT&T fact was added.
2. **`src/lib/record.ts`.** `recordYears()`, `kindCounts()`, `buildSlice()` (rings, dots, featured anchors). Tests: widths from counts, 2020 thin, one dot per entry, the featured five, counts sum to 20.
3. **Drawings.** Port into `draw-scenery.mjs`; scenery test gains the stems.
4. **Tokens.** Wood, bark and a study colour in the palette; `--wood-*`, `--kind-*`, `--art-record-vignette` aliases; contrast pairings for the year marks on wood.
5. **The section.** `Record.tsx`, `RecordSlice.tsx`, `RecordYears.tsx`, `Stamps.tsx`, `RecordFilters.tsx`; page order; Journey loses the timeline, credentials line and unbranched case studies; anchors split; answer corpus cites `record`. Unit tests follow the move.
6. **e2e.** `e2e/record.spec.ts` (ring jump, filters and counts, fragments with JS on and off, the dialog's focus and Escape, nothing fetched before the press, overflow 320–1920, axe both themes); existing specs follow the move.
7. **Docs, perf, screens.** CLAUDE.md, README, `docs/editing.md`, `docs/feedback-tracker.md` "Round 21 phase 5 — the Record"; screenshots in `reports/r21-p5-screens/`.

## Facts read off the certificates (2026-10-21)

| File | Reads | Date on it |
|---|---|---|
| `JP.jpg` | JPMorgan Chase & Co.; Software Engineering Virtual Experience; Certificate of Completion; issued by Forage | February 3rd, 2023 |
| `VISA.jpg` | Visa; Token Service Technology Virtual Experience Program; issued by Forage | February 4th, 2023 |
| `SE.jpg` | Coursera; HKUST; Specialization "Software Engineering", 3 courses | Jun 26, 2023 |
| `Walmart.jpg` | Walmart Global Tech; Advanced Software Engineering Job Simulation; issued by Forage | February 25th, 2024 |
| `Cocky.jpg` | CockyHacks 2024, Best Design, MentorHub | — |
| `FoodRoute.jpg` | Morgan Stanley Code to Give Hackathon, 2nd Place, Alpharetta 2023 | — |

Unclear or worth the owner's eye: `SE.jpg` is issued to "Nguyen MT Le" and `FoodRoute.jpg` to "Nguyen Le" (the legal name); the Forage certificates print verification codes, and the Cocky image names two teammates. All are published as the owner's own files.
