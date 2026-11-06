# Round 21 phase 6 — Contact, the postcard: report

Branch `round-21/contact`, commits `b7b8f45..ec5dc1c` on top of `main` `0b5d8c4` (10 commits). Not merged, not pushed.

## What I built

- **Heading:** "Xin chào," (Newsreader italic, `lang="vi"`, red by day / gold at night via `--greet`) over the h2 "say hi." at the hero's display size; a bowl of phở beside it by day; two beers and "Một, hai, ba, dzô!" at night; the lede "Take my card, or send me a postcard and I'll reach you." The sun / moon sits beside the heading (reuses the hero's sky file, cropped to its top band, so no seeds or fireflies land on the paper).
- **Lantern string:** seven Hội An lanterns with hoa mai at both ends, quiet silk by day, lit with glow at night (two committed SVGs, theme-swapped by `.day-only` / `.night-only`; only the active one is fetched, e2e-checked).
- **Business card:** server component again. Name, title, the red "Thiện Lê" seal (HTML text, `lang="vi"`, sr-only "My seal:"), pin + location, the quote on a 2px moss rule, mono rows with icons (mail + round copy button, `github.com/…`, `in/…`; platform names sr-only so the visible text stays inside each link's name), Résumé / Save contact (/ Book a call when valid) as outlined chips with 44px hit areas, the TL monogram watermark (drawn by `::before`), paper clip, -2.5° turn. Still the section's only `<aside>`, still `data-cat-hide`.
- **Postcard:** `Postcard.tsx` (server) around `LeadForm` (client). Picture side = Taylors drawing (pines, palmetto, heron, rice, ripples, red sun) under "Greetings from / Taylors, SC"; address side = perforated Vietnam-flag stamp, TAYLORS SC postmark (text is HTML), "Leave a way to reach you.", "No message needed. I'll write first.", underline fields "Your name / Email / or phone", "Send the postcard". Same schema, route, honeypot and mailto fallback; zod stays server-only. Laid out by its own width (container query): side by side from 32rem, portrait below.
- **Tết:** bánh tét and "bánh tét and hoa mai, for Tết" under the postcard, all year.
- **Chat strip** (`#ask`): two halves on one paper. Left: "Ask me — I answer from what I've written here." (server-rendered, passed through `AskLoader` so it shows before the chunk loads), the thread as "you asked / I said" rows with "from: source" and "More on this in …", Clear conversation, How this answers. Right: "Your question" underline field, a round moss "Ask", and "or try" questions as small paper tags (the clip-path is on an inner span, so focus rings are never clipped). Prose/Code tabs, live mode, the thread cache all kept.
- **Chips:** "What do you do at DoorDash?", "Are you from Việt Nam?", "What have you measured?", "What are your cats called?". A unit test pins each to its top answer's source and section (`about`, `about`, `tree`, none for the cats) and rejects he/his/him/Thien.
- **Phone layout:** lantern string across the top (cropped from its left end, centred from 640px), heading + vignette, card (−1°), postcard turned portrait (300px picture band cut from the top of the drawing, then the address side), Tết, strip with the halves stacked. Scenery is scaled, not hidden (except the sun, desktop only).

## Decisions (mine, worth an owner glance)

1. **Night paper keeps the paper scope:** the board paints the night buttons light green; the site's night paper (lantern) scope makes paper read as day paper, so "Send the postcard" is moss-deep on lantern at night, and the postcard drawing uses day colours in both themes (one file).
2. **"Ask" is moss (`--accent`), not moss-deep:** spec text says "a round moss Ask", and it keeps one primary control fill per screen (Send the postcard). The control-fill e2e test still lists only the hero's and the postcard's buttons.
3. **Gold carries text at night** (`--color-gold`, already a scenery token) for "Xin chào," and the toast; two new contrast pairings on the night sky (5.72:1 top, 7.96:1 bottom).
4. **Copy rewritten to first person** in the chat: decline line ("I haven't written anything here that answers that, so I'd rather say so than guess."), the resting promise, placeholder "Ask about my work" (the board's "Ask anything about my work" truncated at 360px). Field labels follow the board ("Your name", "or phone"), so their accessible names changed and tests followed.
5. **Contact's h2 is display-sized** per the board; `scale.spec`'s 24–28px title rule now covers the Journey only.
6. **No eyebrow** on Contact (the board has none); section tone `base` (transparent on the sky) instead of `deep`.
7. **Print:** the postcard and the strip are `.no-print`; the card prints. The print rule that un-turns `[data-flip]` stays for the hero's tags.

## Tests

- Unit: 851 passed, 54 files (`pnpm verify` 5/5: typecheck, lint, contrast 62 pairings ≥ AA lowest 4.52:1, test, build).
- e2e on a production build (`:3211`, `--workers=2`): contact + ask + axe + responsive + print + companion 222 passed / 546 skipped / 0 failed; full suite 760 passed / 1052 skipped / 0 failed, no retries. An earlier full run had 14 failures, all caused by this phase and fixed (scale title rule, `/#ask` landing at the page's end); also fixed along the way: axe flagged the 6% monogram as low-contrast text (now `::before`), and the thread grew the page while the first turns filled it (now a fixed 22rem once a turn exists).
- New/rewritten: `e2e/contact.spec.ts` (postcard always the form, Tab order card → fields → Send, layout at 390/768/1024/1440, nothing spilling off the paper, **no scenery on top of any control** via `elementFromPoint`, night lanterns lit without fetching the day file), axe audit of the invalid postcard in both themes, `tests/sections/{BusinessCard,LeadForm,Contact}.test.tsx`, `tests/lib/{answers,content,scenery}.test.ts`, `tests/ui/Drawing.test.tsx`.

## Eval

recall@1 70.0%, recall@3 93.3%, recall@5 96.7%, MRR@10 0.807 (30 cases) — unchanged; no gate or floor touched.

## Perf (`pnpm perf`, production build, 0 skipped, CPU 100%)

JS 192,968 B, **JS at load 166,405 B (−1,290 B vs 167,695)**, CSS 17,983 B (+1,121), fonts 102,620 B (+5,544: Newsreader's vietnamese file, pulled by "Xin chào," / "Tết" — inferred), DOM 2244 (+44), CLS 0. LCP/TBT are noise on a saturated machine. Row recorded in `docs/feedback-tracker.md`.

## Screenshots (`reports/r21-p6-screens/`)

20 sizes × theme pairs (contact-* = the section, view-* = landing view), no horizontal overflow anywhere (320–1920 also covered by `responsive.spec`). Fixed from them: the sky's cloud painting over the lanterns (z-order), the postcard turning portrait at 1024 with pines under "Greetings from" (threshold 36→32rem, portrait band now cut from the top of the drawing), email truncating on the card at 1024 and 360 (row size/padding), email/phone fields too narrow on small phones (side by side only from a 20rem form), big gaps on phone, palmetto cut on the narrow picture side.

## Imperfect / for the controller

- The live companion cats walk over Contact text at some widths (e.g. over "Taylors, SC" at 360, the lede at 844×390); Phase 7 owns the cats.
- The left pine is slightly cropped on the postcard's picture at 1280–1366 (the picture side is narrower than the drawing's 340:440).
- At 1024–1279 the address side is narrow: email and phone stack and the form is taller than the board's.
- Chat source labels come from the corpus and are still third person ("About, in his own words", "what it taught him"); not changed here (corpus, not Contact copy).
- `--ask-room` re-measured in static mode only; live mode assumed no taller (its resting line is shorter).
- Shared files touched outside my blocks, small and line-local: `scripts/contrast.mjs` (gold pairing + doc sentence), `docs/contrast.md` (regenerated), `CLAUDE.md` / `README.md` / `docs/editing.md` (flip wording), `e2e/scale.spec.ts`, `e2e/sections.spec.ts`, `src/components/scenery/Drawing.tsx` (`ART_DRAWINGS` list, `postmark` in `INK_DRAWINGS`), `--ask-room` values in globals.css. Contact CSS is in one `/* Contact (round 21) */` block at the end of globals.css; drawings in `// ---- Contact drawings ----` with one `...contactDrawings()` line in `drawScenery()`.

## Follow-ups (coordinator and reviewer)

Commits `d602522` and `cddbeef`; the branch range is now `b7b8f45..cddbeef` (12 commits).

1. **Chat labels in first person.** Changed every visitor-visible he/his/him/"the site" string in the chat path: answer sources "About, in my own words" (×3), "…, what it taught me" and "… — what it taught me" (case-study and career lessons), "The idea everything here hangs from"; the live route's decline ("I haven't written anything here that answers that, … Try asking about my work, my background or my skills."); the live model's system prompt (now first person as Thien, and "say plainly that you haven't written about that"); the Code view's comment ("// From what I've written here."); How this answers ("nothing else about me, and nothing from outside this page"). Not touched: eval questions (visitor input), indexed body text, comments, stop words. Sources are not indexed, so retrieval is unchanged: **recall@1 70.0%, recall@3 93.3%, recall@5 96.7%, MRR@10 0.807**.
2. **Postcard pine at 1280–1366.** Side by side, the drawing is now `contain`ed on the bottom edge (never cropped); the spare sky above it holds "Greetings from". Email and phone sit side by side whenever the postcard is landscape (a named `postcard` container), which brings the address side back near the board's height, so the drawing fills the picture side again. Re-shot at 1280×800 and 1366×768, day and night: both pines, heron and palmetto whole.
3. **Ask strip gaps below 1024.** Cause: `--ask-room` was one step per breakpoint, the tallest height in each range, so phones got 100–300px of dead paper. It is now a straight line per range (14 ranges, 320–1920), fitted over the idle chat's height measured every 4px, never shorter than the chat and at most 40px taller (≤23px in all but one range). Below 1024 any remaining slack goes to the compose half (`grid-rows-[auto_1fr]`), never inside the thread. Re-shot at 360, 390, 768 and 1024, day and night: the strip ends at its last chip.
4. **"Một, hai, ba, dzô!" at 1440 night.** It is now the glasses' caption, set beside them from 360px (two lines at 360–639, one line from 640) at 15–17px. Under 360 it sits just over the rims. The moon (and sun) moved to just past the lede's end, between the caption and the first lantern, from 1280 only (narrower, the lanterns start there). The sky box now starts the file 60px in, so its halo is never cut flat.

**Verification after the follow-ups:** `pnpm verify` 5/5 (851 unit tests, contrast 62 pairings ≥ AA). On a fresh production build (`rm -rf .next`, `:3210`, `--workers=2`): contact, ask and axe 70 passed, 236 skipped, 0 failed; responsive 24 passed, 0 failed. Screens re-taken at all ten sizes, day and night: no overflow.

## Merge with main (round 21 phase 4, `4f312ba`)

Merge commit `0ed0290`. Every conflict was resolved by keeping both sides:
- **Scenery:** the Contact and Journey drawing blocks both stay in `scripts/draw-scenery.mjs`, and both file sets are written. The lists in `tests/lib/scenery.test.ts` and `Drawing.tsx` are the union of both sides. `pnpm draw:scenery` left the committed files unchanged.
- **CLAUDE.md:** main's Journey description plus the postcard Contact description.
- **Contrast:** one note in `scripts/contrast.mjs` and `docs/contrast.md`: gold on the night sky is measured, while the oak's bark and moss join the unmeasured fills. `pnpm contrast` gives 62 pairings, all at AA or above.
- **Feedback tracker:** both sections, phase 4 first, then phase 6.
- **`e2e/contact.spec.ts`:** the control fills are "Start with where I'm from", "Watch it grow" and "Send the postcard", and the test title says so.
- **`e2e/scale.spec.ts`:** main's Journey title test and my Contact display-size test, with no 24–28px check on `#contact h2`.

Verification after the merge:
- `pnpm verify` passes (876 unit tests in 56 files).
- The full e2e suite ran on a fresh production build (`rm -rf .next`, port 3213, `--workers=2`): 792 passed, 1182 skipped, 0 failed, in 20.2 minutes, with no retries.
- The 390 and 1440 Contact screenshots were re-taken, day and night, with no overflow. Contact looks the same as before the merge.
