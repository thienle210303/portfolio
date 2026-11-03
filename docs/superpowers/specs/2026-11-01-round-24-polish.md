# Round 24 — polish (2026-11-01)

Five asks from Thien after testing round 23's preview (the postcard sent and
stamped). Designed here, built by five parallel builders (A–E) in their own git
worktrees, reviewed and merged by the lead into `round-24/polish` (branched from
`round-23/polish`, whose PR is still open).

Owner decisions (2026-11-01, don't re-ask): the visitor's thank-you goes by
**email only**, and only once a domain of his own is verified in Resend (the
free plan covers it; the shared `onboarding@resend.dev` sender can only mail his
own inbox, and the site has no domain yet). **No SMS**: it is not free (a Twilio
trial texts only numbers you verify yourself). Bé Nhi's act is **"Hả?"**.

## Rules every builder follows

- Read `CLAUDE.md`, `DESIGN.md`, `docs/voice.md` and
  `.claude/skills/the-pass/SKILL.md` first. They win over this spec on conflict;
  say so in your report if one does. Read the round 23 spec
  (`docs/superpowers/specs/2026-11-01-round-23-polish.md`) for what your area
  already is.
- Aliases only in `src/components` and `src/sections` (`text-fg`, `bg-surface`,
  `text-accent`, `--control`, `--mark`, `--scene-*`, `--art-*`…). One `--control`
  and one `--mark` per screen. New drawings go in `scripts/draw-scenery.mjs`
  (`pnpm draw:scenery`), never hand-edited SVG, never a drawing or motion
  library. Both themes are first-class; every motion has a reduced-motion end
  state that says the same thing.
- No new dependencies. pnpm only. TypeScript strict. 44px targets, visible focus,
  no horizontal overflow at 320–1440px. WCAG 2.2 AA.
- Facts live in `src/content/portfolio.ts`; copy is first person (voice.md).
  Touch only your own objects in that file.
- **Shared files merge by hand.** In `globals.css` add your CSS in a block headed
  `Round 24, builder <X>: …` (or edit your area's existing block in place);
  don't reformat or move anyone else's. In `draw-scenery.mjs` only A, D and E
  may add drawings; re-run `pnpm draw:scenery` and commit the regenerated files.
- Update the tests your change breaks so they test the new truth; delete tests
  only together with the code they cover. Update the docs for your area
  (including your area's paragraph of `CLAUDE.md`).
- `src/lib/` never imports from `src/sections/`.
- **Ports.** Your dev server: `pnpm dev --port <yours>`. Your e2e:
  `E2E_PORT=<yours> pnpm test:e2e e2e/<spec>.ts --project=chromium-1440 --project=chromium-390`
  (add other projects when layout is at stake). Never use 3000 — the lead's
  server is there. Ports: A 3101, B 3102, C 3103, D 3104, E 3105.
- Node 24: `export PATH=/Users/thienle/.nvm/versions/node/v24.22.1/bin:$PATH`.
- Done = `pnpm verify` green, your area's e2e specs green, checked in a real
  browser in **both themes** at 1440 and 390 (Playwright screenshots are fine).
  Then commit on your worktree branch, message body ending with your
  `Co-Authored-By: Claude <your model> <noreply@anthropic.com>` line. Don't push.
- Report: what you built, files touched, anything in this spec you didn't do and
  why, screenshot paths (both themes, 1440 and 390), and test results.

## A — The postcard (ask 1)

Files: `src/sections/Contact/{LeadForm,Postcard,Contact}.tsx`,
`src/app/api/contact/{route,schema}.ts`, `src/lib/contact.ts`, `contactCopy` in
`portfolio.ts`, `.env.example`, the "stamped postcard" block in `globals.css`,
`tests/api/contact.test.ts`, `tests/sections/LeadForm.test.tsx`,
`e2e/contact.spec.ts`.

1. **The SENT stamp moves to empty paper, and looks inked.** Today it lands on
   the form, over the Send button and the phone line. Put it on the picture
   side, in the empty sky under "Greetings from / Taylors, SC" and clear of the
   sun, the pines and the heading (from the layout where the two sides sit side
   by side). Where the sides stack, put it on the nearest empty paper that is on
   screen when the confirmation shows; never over a control, a field or a word.
   Make it a real rubber-stamp impression and easy to see: bigger than now, a
   double-ruled frame, SENT in heavy caps, the date (the visitor's local date)
   and `TAYLORS SC` small, a few degrees off square, uneven ink (a grain or
   speckle mask from `draw-scenery.mjs`, so the ink thins and breaks at the
   edges like a worn stamp) without dropping its text below 4.5:1. It lands
   like a stamp: a short press-down (scale from slightly large to 1, a tiny
   squash, the ink settling), once; reduced motion shows it already there. Keep
   its colour inside the rules (it is not `--mark` if the screen already has
   one; check what the sun is). The text line ("Stamped and sent…") still
   carries the meaning for screen readers; the stamp stays `aria-hidden`.
2. **Email or phone, said before they try.** The rule already holds (the pair
   error, client and server). Make it visible up front: the two fields read as
   one requirement (for example a single marker and a short note under the pair,
   "One is enough, both is fine.", in my voice), and the error stays one
   message about the pair. No new required field.
3. **A thank-you email to the visitor, off until a domain is verified.** In
   `/api/contact`, after my own copy sends, when a new optional server env var
   `CONTACT_REPLY_FROM` is set (an address on a domain verified in Resend) and
   the visitor gave an email, send them a short thank-you through the same
   Resend client: from `Thien Le <CONTACT_REPLY_FROM>`, reply-to my address,
   subject and body from `contactCopy` (plain text plus minimal HTML, my voice,
   short: thanks, I'll write first, my site's address). **It never repeats
   anything the visitor typed, not even their name**: otherwise the form is a
   relay for spam to any address. A failed thank-you never fails the lead (log
   it). The response gains `thanked: boolean`; the page adds one line when it is
   true ("A thank-you is on its way to your inbox."). Phone-only: nothing is
   sent, no SMS. Document the variable in `.env.example` (and that it needs a
   verified domain, the free plan is enough) and in CLAUDE.md's postcard rule.
   Unit-test: thanked when set + email; not when unset, phone-only, or when my
   copy failed; thank-you failure still `ok: true`; the body never contains the
   submitted name/email/phone.

## B — The Ask answers (ask 2)

Files: `src/sections/Contact/AskThisSite.tsx` (and `AskLoader.tsx`,
`answer-code.ts` if needed), the Ask block in `globals.css`,
`tests/sections/AskThisSite.test.tsx`, `e2e/ask.spec.ts`. Don't change
retrieval or `src/lib/answers.ts` results: the retrieval eval must not move.

Thien: "make it more UI and more creative, style this better". Today a turn is
"you asked / I said", Prose/Code tabs, then plain paragraphs with a grey source
line and a small "More on this in … →". Make each turn an exchange of real
paper on the postcard board, in the house taste (real objects, not UI
furniture). A direction, yours to refine:

- **The question** is a slip the visitor handed over: a small torn note or
  ticket stub with "you asked", their words in the hand of the tags.
- **My answer** is a reply written back on notepaper: each sourced passage a
  clipping or index card taped in (washi tape, slight tilt, alternating), its
  source as a small inked label ("FROM ABOUT", "FROM THE DIARY"), and "More on
  this in … →" as a tag or tab on the card's edge. Measured values in the
  passage (`17h → 3m`, `99.9%`, `3M+`) set in `--accent` mono, because numbers
  beat adjectives; detect them, don't author them.
- **Live-model answers** look different on purpose (typed, not clipped:
  composed prose), keeping the "Live model" label; the decline stays plain.
- **Thinking** is ink, not a spinner: three ink dots or a pen line being drawn;
  reduced motion shows a static "writing…".
- **Prose / Code** become two index tabs or the card's back ("turn it over for
  the data"); keep both views and their accessible names.
- The idle state (the promise) and the "or try" tags match the new paper.
- New cards arrive with a short settle (drop and tilt in), never on reduced
  motion; the scroll window still keeps the page from growing.

Keep `role="log"`, the conversation list, focus behaviour, the module-scoped
thread cache and the dynamic import: none of this may move into the initial
bundle. Check contrast on every new paper/ink pairing in both themes and all
tones the strip sits in.

## C — Bé Nhi's "Hả?" (ask 3)

Files: `src/components/companion/MiniNhi.tsx`,
`src/sections/CareerTree/NhiSwing.tsx`, `journey.swing` in `portfolio.ts`, the
swing block in `globals.css`, `Companion.tsx` only where her mood is chosen,
`tests/sections/NhiSwing.test.tsx`, related unit tests, `e2e/journey.spec.ts`
and `e2e/companion.spec.ts` where they cover her.

Thien: "Bé Nhi must have an act, Hả?, surprised, like 'what did you say?', the
head slightly turned." Her `huh` mood exists (blank eyes, a small "o", a "?",
bubble `hả?`, caption "confused"). Turn it into an act:

- **The pose.** Her head (hair, face, glasses, bow) tilts about 12–15° and turns
  a little toward the visitor: the features slide 1–1.5 units sideways for a
  three-quarter look, the far eye a touch narrower. Brows up (two small arcs over
  the glasses), eyes wide with a shine, mouth a small open "o", one mitten hand
  cupped by her ear ("what did you say?"), two short manga surprise strokes by
  her head, the "?" kept. Cute first: "dumb dumb cute cute".
- **The words.** Bubble `Hả?` (capital H, the Vietnamese hook), caption
  "surprised" (or better, in the voice of the other captions).
- **The act.** On the swing it plays as a beat, not a still: the swing checks
  short, her head snaps into the tilt with a small overshoot (about 300ms), the
  bubble pops. Reduced motion: the end pose only. She does it as a real
  reaction, not only at random: when a press wakes her from `sleepy`, when the
  theme turns (the light changes on her), and at the thunderclap if Watch it
  grow has one (read `Weather.tsx`/`GrowOak.tsx`). Keep the other moods and the
  existing triggers.
- **Beside the cats** her `huh` uses the same tilted head (it is the same
  drawing).

Keep her `aria` story intact (the caption is what a screen reader hears), the
44px press target, and the bunny rule in CLAUDE.md.

## D — The rice field (ask 4)

Files: `scripts/draw-scenery.mjs` (`rice()`, `"rice-field"`, the buffalo
masks' surroundings), `src/sections/Hero/Scenery.tsx`, the hero scenery block in
`globals.css`, `public/scenery/*`, `tests/lib/scenery.test.ts`,
`e2e/hero.spec.ts`.

Thien: "the buffalo is good, but make the rice field more rice field!" Today the
hero's field is a row of arching grass stalks with seed heads. Draw a Vietnamese
paddy (ruộng lúa):

- **Flooded paddies**: still water lines with short reflection strokes, the
  earthen dykes (bờ ruộng) dividing them as gentle curves receding into the
  distance.
- **Transplanted rice in rows**: clumps (bụi lúa) of upright blades fanning from
  one point, planted in rows that converge with perspective (smaller and denser
  further back), each clump with a broken reflection in the water.
- **The near edge**: a few ripe stalks whose panicles (bông lúa) droop heavy, so
  the field reads as rice at a glance even at phone size.
- The buffalo stays exactly as she is: ploughing a flooded strip by day (add
  mud ripples behind the plough), asleep in front at night.

One-colour masks painted by aliases (`--scene-moss` for the rice,
`--scene-water` for water and reflections, or what the hero already uses), both
themes. Add a new generator rather than changing `rice()`, which the Journey,
the tags and the vignettes also use. Keep every caption off the field at every
breakpoint (text over stalks fails AA; see the comments in `Scenery.tsx`), keep
the files' gzip size reasonable (the scenery test caps it), and check 320, 390,
768, 1024, 1280 and 1440 in both themes.

## E — The Diary, a real book (ask 5)

Files: `src/sections/Record/*.tsx` (`DiaryBook.tsx` is the one client island),
the Diary blocks in `globals.css`, `record` in `portfolio.ts` if copy changes,
`draw-scenery.mjs` for any new drawing, `e2e/record.spec.ts`,
`e2e/legacy-anchors.spec.ts`, `e2e/fragments.spec.ts`, the Diary paragraph of
`CLAUDE.md`.

Thien: "more book experience instead of sliding pages; make it look more real,
more user experience, as detailed as possible." Today the pages are a
horizontal scroll-snap track (a spread of two from 1280, one page below) that
slides. Keep that track as the **no-JavaScript and reduced-motion book**, and
with JavaScript turn pages instead of sliding them:

- **The turn.** The right page lifts at its fore-edge and turns over the spine
  in 3D (CSS `perspective`, `rotateY` around the spine, `backface-visibility`:
  its front is the current right page, its back the next left page), with a
  shadow that sweeps across the page underneath and a curl highlight on the
  turning leaf. Back turns the other way. Below 1280 a single page turns around
  its left (bound) edge.
- **Drag a corner.** The dog-eared corners are handles: pointer-drag a corner
  and the leaf follows; release past halfway completes the turn, otherwise it
  falls back. Swipe on touch does the same (`touch-action: pan-y`, so vertical
  scrolling still works). ← and → still turn when the book has focus; the arrow
  buttons stay 44px.
- **The object.** Cloth-bound cover boards showing around the block, a spine
  gutter with its shadow and the pages' curve into it, page-stack edges on the
  fore-edges that thicken on the left and thin on the right as you read, a
  ribbon bookmark, paper grain, running heads (the chapter's years) and page
  numbers in the outer corners. The index tabs stay on the fore-edge. Every
  colour from the aliases (the ribbon is `--mark` only if the Diary's screen has
  no other mark).
- **Going far.** A contents line or a tab riffles: several leaves flick over
  fast to the target page. "p. 3 of 14" stays, in a polite live region.
- **Fragments and find.** Every legacy id still lands with JavaScript off
  (`legacy-anchors.spec.ts`). With JavaScript, a hash on load or `hashchange`
  opens the book at that page. Pages not on show are `inert` and
  `hidden="until-found"`, and on `beforematch` the book opens to the page the
  browser found, so find-in-page still works.
- **Reduced motion.** No 3D turn and no riffle: the page swaps at once. Print
  shows every page in flow.
- **Perf.** No library; keep `DiaryBook`'s JS small and record what it adds
  (`pnpm perf` is the lead's, but say what you added). The cats' hooks inside
  `#record` keep working.

Update CLAUDE.md's Diary description (it says "a book you swipe left and
right") to the new truth.

## Follow-up 2026-11-02: the phone's corner curl

Thien, on his phone: "on the phone! if we have so much limit then diary just
want page! 2 page make it ugly". Below 1280 the book shows one page, but the
turn rotated it about its bound edge: mid-turn the page squashed into the left
half with a straight edge while the next page showed beside it, so for a moment
the phone looked like a two-page spread.

His decision, a corner curl like Apple Books, picked over "flip in place" and
"keep the hinge turn with the next page shadowed": "the page peels back from
the corner you pull, showing its blank paper back, and the next page shows only
in the wedge under the curl. No straight seam down the middle, so it reads as
one page turning."

Built: wherever one page shows in leaf mode, a turn is a 2D curl inside the
page box (`curl` in `src/lib/diary-turn.ts`, unit-tested). The pulled corner
is on the fore-edge at the foot of what is on screen (the dog-ear when the foot
is visible) or at the hand's height; it travels across twice the page width,
rising as it goes, and the fold is the perpendicular bisector of where it was
and where it is, so the fold leans across the page through the turn and
straightens only as it leaves through the spine. The page stays flat on the
spine side (`clip-path`), its blank back (a sheet with the page's paper and
grain, no text) is reflected across the fold and clipped to the page, with
light along the curl, shadow toward its free edge and a faint shadow beside
it, and the next page shows only in the wedge, with a soft shadow along the
fold. Back turns run the curl from 1 to 0 with the page before on top; a
riffle curls its leaves one after another; a drag's corner follows the hand,
and on one page a release completes past half a page width of pull (a flick
always does). The spread (from 1280) keeps its 3D hinge turn unchanged; JS off
and reduced motion keep the scroll-snap track. One page's turning room shrinks
to the boards' lip.
