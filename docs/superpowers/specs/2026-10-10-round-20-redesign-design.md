# Round 20 — Redesign: smaller, faster, four sections redone

Owner feedback after the Round 19 deploy (2026-10-10): the page is too big
(text, spacing, a footer that fills half the screen), it lags, the hero's
"source code" excerpts look bad, the globe's content makes no sense, the
Journey is unreadable, and the contact form is hard to use. Directions were
picked from the design canvas
(https://claude.ai/artifact/DtnsC1ZKxmbV4CTmsL3AmE) and settled in a grilling
session. This spec records those decisions; it adds none of its own beyond
the ones marked **Assumed**.

Unchanged rules: pnpm only, strict TS, Tailwind v4 `@theme`, no new runtime
dependency, no 3D library, semantic aliases only, blue never decoration,
WCAG 2.2 AA, every fact from `src/content/portfolio.ts`, first person per
`docs/voice.md`, day/night toggle kept (every change is checked in both).

## Phases

Each phase is its own plan, branch and merge; ask before every push.

1. **Speed** — no visual change.
2. **Foundation** — type, spacing, fonts, footer.
3. **Hero** — Hero A with a terminal card.
4. **Earth** — Earth A, the origin story.
5. **Journey** — highlights, tree box, timeline.
6. **Contact** — chat, flip business card, lead form.

Phase 1 goes first so later phases are measured against a page that no
longer lags.

---

## 1. Speed

Source: `reports/lag-investigation.md` (local prod build, no GPU).

**Cats (kept).**
- `companion-space.ts:865` / `companion-moods.ts:358`: stop probing with
  `elementsFromPoint` inside the frame. Compute clear spots on a 250 ms
  debounce after scroll/resize, drop the 4-corner re-probe, and cap probes per
  frame.
- `Companion.tsx`: the rAF loop stops when both cats are idle and restarts on
  the next event that moves one. Blink and flick move to CSS or refs;
  `setFrame` runs only on a pose change.
- `layout.tsx:9`: the static import becomes a `next/dynamic` (`ssr: false`)
  mount after the browser is idle. The 5,000-line component leaves the
  initial bundle.

**Globe.**
- The coastline texture is baked at build time into a PNG served from
  `public/`, loaded as an image (decoded off the main thread). The runtime
  `bakeCoastlineTexture` call at `GlobeCanvas.tsx:1132` goes; the 2D fallback
  keeps the vector coastlines.
- `palette()` / `sphereColors()` (`GlobeCanvas.tsx:337`, `:370`) are cached
  and recomputed only on a theme change.
- Canvas resolution is capped at 2× DPR; drawing pauses while the globe is
  off screen.
- The globe chunk is prefetched when `#worlds` is within one viewport.

**Fonts.** Fraunces is dropped (Phase 2 uses Plex only).

**Done when:** at 4× CPU throttle a scroll through the Journey holds ≥ 50 fps
with no frame > 100 ms; at rest the main thread is < 5 % busy; the first
entry to Worlds has no task > 50 ms from the texture; initial JS falls (the
Companion leaves it). A `pnpm perf` row is recorded with zero skipped
responses.

## 2. Foundation (site-wide)

Every section, the nav, cards, buttons and the chat:

| | Target |
|---|---|
| Body | 15–16 px |
| Section titles | 24–28 px |
| Hero headline | 40–48 px |
| Space between sections | ~64 px desktop, ~48 px mobile |
| Content width | ~1120 px max |
| Header | ≤ 56 px |

- The `--step-*` and `--section-y` tokens in `globals.css` are rescaled; no
  section keeps a `100svh` floor (the hero included).
- Fonts: IBM Plex Sans + IBM Plex Mono (already loaded; the canvas's
  JetBrains Mono is not added). Fraunces is removed.
- **Footer** is one line, under 80 px:
  `© 2026 Thien Le · Two cats reviewed this code. Both approved.`
  The line is authored in `portfolio.ts`. The analytics disclosure stays as a
  link on the same line when analytics is on.
- **Assumed:** the `#closing` band (`Closing.tsx`, `closing` content) is
  removed; it is half of the "footer is half the screen" problem and repeats
  the Contact button.
- `pnpm contrast` re-run if any colour moves (none planned).

## 3. Hero — Hero A, terminal card

- Split layout from the Hero A board: eyebrow (role · employer), headline,
  one short paragraph, two actions (See my work → `#tree`, Book a call). The
  margin rail is removed.
- The code card becomes a dark terminal window with three tabs, each a
  command and its output:
  - `whoami`: role, employer, based in, from, focus, cats
  - `now`: what I'm working on now
  - `exploring`: the `aiTools` list
- Every value is read from `portfolio.ts`. Nothing is labelled as real source
  code. `codeTabs` (the hand-copied excerpts and "From this site's own source
  code.") is deleted.
- The output types out once (CSS steps, no JS timer). With reduced motion the
  text is shown complete. Tabs stay keyboard-operable (the existing `Tabs`).
- The terminal stays dark in both themes, using the `contrast` tone rather
  than literal colours.

## 4. Earth — Earth A, the origin story

- The globe and the flight stay, along with the robot and Sun/Moon on the
  walk.
- Beside the globe sits "One crossing, three stops":
  1. Kiên Giang, Việt Nam: where it starts
  2. Taylors, South Carolina, December 2018: landed, and high school three
     weeks later
  3. University of South Carolina, 2021–25: chemical engineering, then
     computer science
- Captions are content fields. Stops 1–2 come from `origin` and
  `eastside-high.headline`; stop 3's caption is a new authored field. Clicking
  a stop turns the globe to it.
- "Replay the flight" replaces the replay loop's controls. **Assumed:** the
  flight plays once when the section first comes into view, not in a loop.
- **Retired:** the six chapters (`src/content/worlds.ts`), the five skins
  (`src/content/skins.ts`, `src/lib/skins.ts`), the 19 plaques, `WorldPanel`,
  and the plaque/chapter/skin parts of `src/lib/worlds.ts` and its tests.
  `aiTools` stays in `portfolio.ts` (the terminal uses it).
- CLAUDE.md's globe section is rewritten. The fenced coastline-data rule, the
  no-3D-library rule, the WebGL2 → 2D fallback and the lazy chunk all stay.
  The plaque and skin rules go.

## 5. Journey — highlights, tree box, timeline

Three blocks, stacked, in this order.

1. **Highlights.** The Journey B cards: 17h → 3m, 99.9 %, 96 %, 3M+, 200+.
   Each card is one metric read from its entry and links to that entry's row
   below.
2. **Tree box.** `DrawnTree` sits in a fixed-height box.
   - It plays once on its own the first time it scrolls into view.
   - "See how it grows", in the Journey header, scrolls to the box and
     replays it.
   - With reduced motion the finished tree is shown, with no motion.
   - The pinned scroll stage (`Stage.tsx` and its sticky CSS) is removed.
   - The tree's rules in CLAUDE.md still hold: leaves are technologies,
     concurrency is computed, there are no roots.
3. **Timeline.** One row per drawn entry: year, role · organisation,
   headline.
   - Clicking a row expands it to show "What it changed" (the impact lines,
     verbatim), the technology chips, and the case study if one is attached.
     One row is open at a time.
   - The credentials line for demoted entries stays below.
   - The rows carry the `journey-entry-<id>` ids, so legacy anchors keep
     landing.

`KnowledgeTreeList`'s disclosure pattern is reused for the rows rather than
written again. Case-study titles are unchanged (Q7 turned out to be about the
contact form).

## 6. Contact — chat + flip business card

- **Left:** "Ask about my work" (`AskThisSite`) at the new sizes.
- **Right:** the business card (`BusinessCard.tsx`), restyled.
  - **Front:**
    - name, role, Taylors SC
    - email with a copy button (the existing `CopyButton`)
    - LinkedIn
    - Book a call (`BOOKING_URL`)
    - Résumé
    - "Save contact", which downloads a `.vcf` built from `profile` by a
      route handler
  - **Flip:** clicking the card's empty area, or its "Let me reach you"
    button, flips it.
    - The flip is a CSS 3D transform; with reduced motion it is an instant
      swap.
    - The hidden face is `inert`.
    - Focus moves to the first field on flip and back to the button when the
      card is flipped back.
  - **Back (lead form):** name (required), email or phone (at least one),
    then Send.
    - There is no message field.
    - One line explains the details are used only to reply.
    - The form posts to `/api/contact` with the schema changed to
      `{ name, email?, phone? }` and validation that one of email or phone is
      present.
    - The `mailto:` fallback stays for when the Resend env isn't set.
    - Success and error messages show on the card.
- **Removed:** `ContactForm.tsx`, `IntentChooser.tsx`, `contactIntents`, the
  intent-plus-project subject in `src/lib/contact.ts`, and case-study "contact
  me about this" prefill (those buttons now go to `#contact`).
- CLAUDE.md's contact-form bullet is rewritten to describe the lead form and
  its fallback.

## Testing (every phase)

- `pnpm verify`.
- `pnpm test:e2e` (both themes, all tones, reduced motion, keyboard, 320–1440
  px overflow).
- A browser check in both themes.
- Specs that assert on removed things are rewritten or deleted in the same
  phase: chapters, skins, plaques, the pinned stage, the intents, `codeTabs`
  and `#closing`. Legacy-anchor and axe coverage are never weakened.
- New tests:
  - the terminal values trace to content
  - the Earth stop captions trace to content
  - the highlight cards trace to entry metrics
  - the lead-form schema (one-of email/phone)
  - the vCard route
  - flip focus management (e2e)
- Phases 1 and 4 record a `pnpm perf` row in `docs/feedback-tracker.md`.

## Out of scope

The Worlds and Contact/chat voice passes (`worlds.ts:34,56` mostly disappear
with the chapters; `answer-corpus.ts:264,428` stays for a later round), and
any new content or metrics.
