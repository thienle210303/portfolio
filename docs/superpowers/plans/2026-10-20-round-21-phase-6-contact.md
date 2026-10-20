# Round 21 Phase 6 — Contact (the postcard) — Plan

**Goal:** Contact becomes the approved `NatContactPostcard` board (day and
night): "Xin chào," over "say hi.", phở by day / two beers and "Một, hai, ba,
dzô!" at night, a string of Hội An lanterns with hoa mai, my business card
clipped beside a postcard lead form, bánh tét captioned for Tết, and the chat
as a two-half strip below.

**Source of truth:** `design/round-21-outdoors/v1/boards/NatContactPostcard(.Night).dc.html`,
their previews, and the contact block of `source/gen-nature.mjs` (`lantern`,
`hoaMai`, `banhTet`, `STILL.pho`, `STILL.bia`, `daily("contact")`, the postcard
`scene`, the flag stamp and postmark). Spec §6 and the owner additions.

## Decisions (made here, recorded in the report)

- **Flip retired.** The card is a server component again (only `CopyButton` is
  client); the lead form is the postcard's address side, always visible.
- **Paper keeps the paper scope at night.** The board paints the night controls
  light green; the site's night paper scope makes paper read as day paper, so
  "Send the postcard" stays moss-deep on lantern. One rule, both themes.
- **"Ask" is moss (`--accent`), not moss-deep.** Spec text: "a round moss Ask".
  It keeps "one primary control per screen" (Send the postcard) true.
- **Greeting colour.** "Xin chào," and "Một, hai, ba, dzô!" use a `--greet`
  alias: the mark red by day, the scenery gold at night (board). Gold gains two
  sky pairings in `pnpm contrast`.
- **Sky.** Contact reuses the hero's sky file (`--art-sky`, already fetched),
  cropped to its top band and shifted so the sun / moon sits where the board
  puts it. No second sky file; no seeds or fireflies over the cards.
- **Text is HTML, never inside a drawing.** The postmark's "TAYLORS SC", the
  seal, the captions: an SVG used as an image cannot load the site's fonts.
- **Chips.** First person and answerable (the tokenizer drops stop words, so
  "Where are you from?" returns nothing). A unit test pins each chip to an
  answer and its section.

## Tasks (TDD, one commit each)

1. **Chips.** `SUGGESTED_QUESTIONS` → "What do you do at DoorDash?", "Are you
   from Việt Nam?", "What have you measured?", "What are your cats called?".
   Test: each returns an answer whose top result has the expected section
   (`about`, `about`/none, `tree`, none) and source. Update unit / e2e tests
   that click the old chips. Print the eval (floors unchanged).
2. **Drawings.** `// ---- Contact drawings ----` in `scripts/draw-scenery.mjs`:
   `lanterns-day`, `lanterns-night`, `hoa-mai` inside them, `postcard-scene`,
   `flag-stamp`, `postmark` (ink), `pho`, `bia`, `banh-tet`, `paper-clip`.
   `tests/lib/scenery.test.ts` lists gain them; files committed.
3. **Copy.** `contactCopy` gains the board's lines (greeting, heading, lead,
   postcard, Tết caption, cheer, chat strip); `postcardPlace` agrees with
   `profile.location` (test).
4. **Business card.** Seal, icons, quote on a moss rule, outlined chips, TL
   monogram, paper clip, slight turn. `tests/sections/BusinessCard.test.tsx`.
5. **Postcard.** Scene half + address half (stamp, postmark, fields on lines,
   "Send the postcard"), same schema / route / honeypot / mailto fallback.
   `tests/sections/LeadForm.test.tsx`, `Contact.test.tsx`.
6. **Chat strip.** `AskLoader` takes the heading; `AskThisSite` lays out "you
   asked / I said" on the left and the question line, round Ask and "or try"
   paper tags on the right; first-person copy. Re-measure `--ask-room`.
7. **Section and scenery.** Layout at every width (phone: lanterns band,
   heading + vignette, card, postcard stacked portrait, Tết, strip), the
   `/* Contact (round 21) */` CSS block, print cleanup.
8. **e2e + polish.** `contact.spec.ts` rewritten for the postcard; axe / ask /
   print updated; "no scenery over a control" and "no overflow 320–1920".
   Screenshots at ten sizes, day and night, into `reports/r21-p6-screens/`;
   fix what they show.
9. **Verify.** `pnpm verify`, e2e on a production build (contact, ask, axe,
   responsive, print, companion, then all), `pnpm perf` (JS at load ≤ +2 KB vs
   167,695 B), tracker section, `reports/r21-p6-report.md`.

## Files

`src/lib/answers.ts`, `src/content/portfolio.ts`, `src/types/portfolio.ts`,
`scripts/draw-scenery.mjs`, `public/scenery/*`, `src/components/scenery/Drawing.tsx`,
`src/sections/Contact/{Contact,BusinessCard,LeadForm,Postcard,AskLoader,AskThisSite}.tsx`,
`src/app/globals.css`, `scripts/contrast.mjs`, `docs/contrast.md`,
`tests/{lib,sections}/…`, `e2e/{contact,ask,axe,print}.spec.ts`,
`docs/feedback-tracker.md`.
