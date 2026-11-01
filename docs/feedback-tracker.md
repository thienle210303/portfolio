# Feedback tracker — Thien's review of 2026-08-17

Maintained by the project lead. One row per feedback item; status moves
`Evaluated → In progress → Implemented → Verified`. Work packages (WP-A…E)
group items so no two owners touch the same files.

## Evaluations

### FB-1 · Contact links (P1) — **Accepted**

**Affected:** `src/sections/Contact/QuickConnect.tsx`
**Evaluation:** Correct. The three links render as flat bordered rows with no
iconography and interchangeable weight; `lucide-react` is already a dependency
(used by SiteNav), so icons cost no new packages. The proposed copy direction
("You won't need to chase me — I'll find my way to you") matches the intent of
the existing one-field flow and reads playful-but-professional.
**Guardrails:** ≥44px tap targets, accessible names preserved, icons
`aria-hidden`, semantic aliases only.
**Owner:** Sonnet (WP-B) · **Validation:** e2e contact spec, axe, both themes.

### FB-2 · About Me layout (P0) — **Accepted**

**Affected:** `src/sections/Hero/HeroIdentity.tsx`, `Hero.tsx`
**Evaluation:** Correct. The About paragraphs render at the bottom of the hero
identity column; at ≥1360px that column is the narrower half of a two-column
grid, so the paragraphs sit alone with a large empty area beside them once the
code artifact ends. Supporting elements must come from the existing content
layer only (career entries, lenses, philosophy) — the site's rule is that
components never invent or restate facts.
**Owner:** Sonnet (WP-C) · **Validation:** 1024/1360/1440+ layouts, rail rules.

### FB-3 · Work and Selected Work (P0 hierarchy / P1 nav) — **Accepted in part**

**Affected:** `src/sections/SelectedWork/*`
**Accepted:** Stronger row hierarchy; a sticky-within-section project index on
desktop (Thien's stated preference — sticky, not viewport-fixed) with a compact
horizontal selector on mobile.
**Rejected (for now):** Screenshot/visual previews. No image assets exist in
the repo and the content rules forbid inventing them; the section's evidence is
deliberately typographic (metrics, workflow diagrams). Revisit when Thien
supplies real captures.
**Owner:** Opus (WP-D) · **Validation:** scroll-spy correctness, keyboard nav,
no content covered by sticky elements, 320–1440px overflow checks.

### FB-4 · Contact section consistency (P0) — **Accepted**

**Affected:** `src/sections/Contact/Contact.tsx`, companion color handling
**Evaluation:** Correct from the visitor's seat. Contact uses `tone="contrast"`
— a full inversion in day theme — right where visitors do their most
form-focused reading. Fix: move Contact to the quiet `deep` tone so the page
keeps a single closing contrast chapter (`Closing`), which preserves the
design system's "chapter break" device instead of deleting it.
**Cat color:** genuine bug — the fixed-position cat is colored from the root
(quiet) scope, so over any contrast section its line work nearly vanishes. The
cat becomes tone-aware (WP-A).
**Owner:** Sonnet (WP-B), cat color Opus (WP-A) · **Validation:** contrast
pairs unchanged (no token edits), both themes.

### FB-5 · Cat positioning and behavior (P0) — **Accepted**

**Affected:** `src/components/companion/*`
**Evaluation:** Correct. The cat trails the pointer by 104px — which is exactly
where the reading line is — and "Send the cat away" currently deletes it
permanently via localStorage with no visible way back. Fix: content-avoidance
(the cats keep to whitespace and never park over prose, controls, or forms), a
visible resting box in the corner where dismissed cats sleep, clickable to
release.
**Owner:** Opus (WP-A) · **Validation:** e2e companion spec updated to the new
contract; reduced-motion; touch devices; axe with panel open.

### FB-6 · Cat personality (P1) — **Accepted**

**Affected:** `src/components/companion/*`
**Evaluation:** Correct. Both cats are a single SVG on one button, sharing one
pose with only a half-phase gait offset — structurally incapable of
independent behavior. Fix: two independent cat instances (the grey leads, the
tabby follows/gets distracted), distinct timings and behaviors, one shared rAF
loop for performance.
**Owner:** Opus (WP-A) · **Validation:** performance (single rAF), reduced
motion parks both, no usability interference.

### FB-7 · Police cat (P2) — **Accepted, scoped**

**Affected:** `src/components/companion/*`
**Evaluation:** Feasible as an optional flourish folded into the dismissal
flow: sending the cats away has a police cat escort them to the resting box;
the box stays clickable to release; a separate explicit "disable the cats"
option keeps the old remove-for-good behavior. Reduced motion skips the
theatrics and jumps straight to the resting state.
**Owner:** Opus (WP-A) · **Validation:** never blocks pointer events outside
the cats; keyboard equivalent for every state change.

### FB-8 · Career Tree / Journey Graph (P2) — **Accepted, scoped**

**Affected:** `src/sections/CareerJourney/KnowledgeTree.tsx` + companion
**Evaluation:** Largely exists — the knowledge tree already draws
journey/work/skills from authored relationships. Scope: add a root node
representing Thien (name + philosophy) anchoring the five lenses, and the
requested easter egg — hovering/focusing the root sends the cats to sleep
beneath it (via a `data-cat-nap` contract the companion listens for). A full
SVG graph is rejected: the accessible list-tree is a deliberate decision
(reflow, screen readers, selection), and edge inference is forbidden by
`tests/lib/knowledge-tree.test.ts`.
**Owner:** Sonnet (WP-E) + Opus (WP-A) · **Validation:** mobile stays the
simple expandable tree; a11y semantics unchanged.

### Design direction note — black/white/gray palette

The site is already near-monochrome (cool paper/ink neutrals, white cards)
with **one** reserved hue: the annotation blue used for links, measured values
and the single primary control. Removing that hue would cost link affordance
and is load-bearing across the contrast tooling. **Holding blue as the single
accent** unless Thien explicitly asks for zero hue — flagged as the one open
question rather than silently changing it.

## Work packages

| WP | Owner | Items | Files | Status |
| --- | --- | --- | --- | --- |
| A | Opus | FB-4(cat), FB-5, FB-6, FB-7, FB-8(nap) | `src/components/companion/*`, `e2e/companion.spec.ts` | Implemented · verified |
| B | Sonnet | FB-1, FB-4(tone) | `src/sections/Contact/*` | Implemented · verified |
| C | Sonnet | FB-2 | `src/sections/Hero/*` | Implemented · verified |
| D | Opus | FB-3 | `src/sections/SelectedWork/*` | Implemented · verified |
| E | Sonnet | FB-8(root) | `src/sections/CareerJourney/KnowledgeTree.tsx` | Implemented · verified |

## Integration log (2026-08-17)

Verified: `pnpm verify` green (typecheck, lint, contrast, 183 unit tests,
production build) and the full Playwright matrix — 283 tests across six
viewports, both themes, all tones, axe audits — green. Visual pass done in a
real browser at 1440/390 in day and night.

Two integration defects found and fixed by the lead:

- **320px @ 200% zoom horizontal overflow.** The rail's `<dd>` can hold an
  unbreakable token (the hero's email address) whose min-content width
  stretched the whole endnote column below 1024px; a lens row then placed a
  flex item past the viewport edge — scrollable overflow where plain text
  would only be ink. Rail details and lens labels now `wrap-anywhere`
  (`Section.tsx`, `HeroAbout.tsx`).
- **Flaky companion spec.** The two-cats placement assertion sampled
  `style.transform` once, racing the first animation frame under full-suite
  load; it now polls for the settled state.

Follow-ups (not blocking, for a future pass):

- Reduced-motion/touch visitors get the cats pinned to the bottom-right
  corner (pre-existing placement), where they can sit over the footer's
  copyright line at the very bottom of the page. Worth a nudge or a footer
  safe-area.
- `scripts/screenshots.mjs` still shoots a `#resume` section and a
  "Deep Dive" control that no longer exist since the résumé became a route;
  the script needs a refresh before its next use.

Open question for Thien (unchanged): keep the single annotation blue, or go
truly zero-hue? Blue is currently load-bearing for links, measured values and
the primary control, and every pairing is contrast-checked.

## Round 2 (2026-08-17, after PR #4 opened)

| # | Item | Verdict | Package |
| --- | --- | --- | --- |
| FB2-1 | Rails sticky within section on laptop | Accepted — reverses a documented round-0 decision at the owner's call | F |
| FB2-2 | Remove hero social links | Accepted — Contact cards + footer already carry them | F |
| FB2-3 | Loop → decision graph | Accepted, assumed target = Philosophy problem-solving loop; drawn with nodes, decision diamonds, labelled branches, dashed loop-back — authored wording only | H |
| FB2-4 | "Do we need the AI Workflow Lab?" | Recommendation: keep — it evidences the agentic-workflow skills FB2-3/5 ask to showcase; awaiting owner decision before any removal | — |
| FB2-5 | Real drawn career tree | Accepted — desktop drawing (root plinth, trunk, paired boughs, openable leaves); mobile/AT keep the accessible list; authored edges only | I |
| FB2-6 | Cats disappear ("jail") | Accepted + real bug found: header (z-50) paints over companion (z-40) and placement offered the header band as clear; safe-area measured, per-frame clamp, idle sleep now walks to a visible corner bed (transient, never persisted) | G |
| FB2-7 | Follower speed jerk + more actions | Accepted — continuous eased speed with acceleration limiter; stretch/groom/bat/flick idle poses, sparse | G |
| FB2-8 | Closing keeps only Get in touch + Back to top | Accepted — footer below carries the links once | F |

Diagram note for Thien: the Test fork rejoins at Learn because the authored
content says learning happens on both outcomes; a routing fork (failure skips
Learn) would need a new authored sentence. Tree notes: the crown is honestly
lopsided (12 of 25 leaves under Software engineering — retag `lenses` in
`portfolio.ts` to rebalance); four milestone leaves open thin (no
technologies/case study authored).

**Cross-package contract (owned by the lead):** an element may declare
`data-cat-nap` (optionally `data-cat-nap="id"`). When the pointer rests on it
(or it receives focus-visible) for ~600ms, the companion cats walk to its
bottom edge and sleep until it is left. WP-A implements the listener; WP-E
declares the attribute on the tree root. No other package touches either side.

## Validation gate (every package)

- `pnpm typecheck && pnpm lint && pnpm test` scoped locally by the owner;
  full `pnpm verify` + `pnpm test:e2e` run once by the lead after integration.
- Both themes, all three tones; 320–1440px without horizontal overflow.
- Keyboard + reduced-motion paths for every new interaction.
- No raw `--color-*` tokens, no new dependencies, no npm/yarn lockfiles.

## Round 3 (2026-08-17)

| Item | Verdict | Outcome |
| --- | --- | --- |
| More playful cat actions (toys/laser) | Accepted; laser declined (palette rule — no hue for decoration) | Yarn-ball scene (bat, roll, chase) + moth scene (track, pounce), line-drawn, minutes apart, idle-gated, clear-spot probed, absent under reduced motion/touch |
| "Send away" → bed wording | Accepted | "Send the cats to bed" everywhere incl. accessible name |
| Remove "Off" from bed | Accepted (reverses part of round 1 at owner's call) | Bed has one wake control; permanent off lives in the toolkit only |
| Snoring | Accepted | Drifting mono z's over sleeping cats; display:none under reduced motion (repo's first CSS module carries the keyframes) |
| Contact business card | Accepted | Two panes >=1024px: contact column left, sticky identity card right (serif name, title, philosophy, ruled email/GitHub/LinkedIn block, giant quiet monogram); card prints; stacks card-first below 1024px |

Verified: pnpm verify green (typecheck, lint, contrast, 183 unit tests, build
including the new CSS module) and the full Playwright matrix 282 passed / 0
failed, both themes, all viewports.

## Round 4 (2026-08-17)

| Item | Verdict | Outcome |
| --- | --- | --- |
| Business card "awful" | Accepted — two real defects (copy button clipped off the card edge; email wrapped mid-address) plus a settings-list composition | Rewritten as true card geometry: name/title lockup, philosophy line, bottom-anchored ruled contact block, corner-cropped monogram; email owns its line, copy control on its own row; measured zero-overflow at 320-1440px, both themes. Note: 9/8 ratio, not 3/2 — CopyButton's fixed 44px height is the constraint; a compact CopyButton variant is the future unlock |
| Cats no longer on screen | Accepted — reproduced as a real regression | The idle clock only counted pointer movement, so a wheel-scrolling reader was "absent": bed at 14s, and scrolling never woke them. Scroll/resize/keydown/pointerdown now stamp presence; wake unthrottled; resize clamps synchronously (second bug: sleeping cats stranded off-viewport ~280ms after resize). New 34s reading-visitor e2e spec with negative control |
| Ask-this-site code snippet | Accepted | Prose/Code tabs on each answer; the code view renders the identical strings as a TypeScript literal through the shared CodeBlock (no score, no new claims); generator round-trip verified byte-for-byte; two e2e tests added |

Verified: pnpm verify green; full Playwright matrix run by the regression
agent on this tree (284 passed; one mid-run environmental flake re-passed);
contact + companion specs re-run clean at integration (61/61).

## Round 5 (2026-08-17)

| Item | Verdict | Outcome |
| --- | --- | --- |
| Cats transparent over text | Accepted — real defect (outline tabby, 0.42-wash grey) | Every companion drawing (poses, toys, furniture, police) renders a ground-filled silhouette under its ink, built from typed parts so open strokes get underlays, not auto-closed fills; tone sampler learned the deep ground. Known limit: knockout is section ground, not card surface — transient-only by content avoidance |
| Invest in playful behavior (eating, play) | Accepted | Three new scenes: shared bowl with a shouldering-off, chase ending in feigned innocence, yarn gift; new eat pose and dash flag; frequency raised (90s+rand180s), all idle/clear-spot/reduced-motion gates unchanged |
| Sleep furniture comedy | Accepted | Corner cluster: empty bed + carton (grey overflows it, front flap layered over him) + paper sheet (tabby flops); 22% pre-bedtime bed-kick variant; one Wake button, two snore streams; reduced motion gets the static scene |

Verified: pnpm verify green (188 unit tests, build); full Playwright matrix
285 passed / 0 failed; agent additionally verified companion e2e against the
production build and re-ran responsive + axe clean.

## Round 6 (2026-08-17/18)

| Item | Verdict | Outcome |
| --- | --- | --- |
| Code snippets wrap, not overflow | Accepted | CodeBlock wraps (pre-wrap + wrap-anywhere); scroll scrim, inert tab stop and .code-scroll retired; screen now matches what print always did; two spec contracts updated (responsive + interactions) |
| Career tree should look like a real tree | Accepted | Tapering double-stroke trunk, tangential boughs, meandering twigs, un-boxed leaves with lanceolate markers, root system under the horizon plinth; id-hash-deterministic variation; ink moved rule→fg-subtle for legibility; SVG replaced-element height bug found and fixed; DOM cost cut 313→93 added nodes |
| Ask This Site better + snippet sub-section | Accepted (interpretation: framed caption, not a new page section) | Code view captioned "This answer, as data" with one honest explainer; "Try asking" eyebrow; idle state speaks; results region framed from first paint |
| Business card "looks like a box" | Accepted | Inset engraved rule + corner registration ticks + printer's fleuron on the divider + tabular handle alignment + stronger monogram; all absolute-positioned ornament, ratio re-measured against a production build |

Lead integration: reconciled interactions.spec to the wrapping contract
(missed by WP-Q's grep, caught by WP-R), and hardened five companion tests
against warm-server/worker-load hydration races with a companionAwake()
poll plus load-sized timeouts. Verified: pnpm verify green (190 unit
tests); full Playwright matrix 285 passed / 0 failed on the re-run after
hardening.

## Round 7 plan (2026-08-18) — approved direction pending owner's go

1. **Cats**: toolkit becomes a "Play with the cats" menu (on-demand yarn /
   moth / dinner / chase via the existing scene engine) + "Send the cats to
   bed"; Jump-to/Reach-me removed as redundant. Page-aware section moods
   driven by the active-section signal (Work: sit by the active numeral;
   Contact: perch on the card; loop: walk the edge once). "Turn the cats
   off" leaves the panel; lead recommends the footer control become an
   on/off toggle so an exit survives (round-1 contract) — owner to confirm.
2. **Loop**: ring layout at desktop — nine stations on an ellipse, dashed
   loop-back closing the circle, philosophy line centered; detail via
   hover/expand; mobile keeps the vertical flow.
3. **Tree**: roots labeled with authored skill categories (labels only — no
   drawn skill→branch edges; authored-edges rule intact); leaf clusters
   scaled by real tech counts. Recommendation: tree becomes its own nav
   section placed after Work → Journey → Skills as the synthesis chapter,
   cross-linking all three (one link per direction, no restated facts).
4. **AI Lab**: lead with Ask This Site; add a "how this works" panel showing
   the real scoring code from src/lib/answers.ts with the ranking math;
   retire Workflow Explorer; replace with "How I solve problems with
   scraping knowledge" — content to be drafted from the scraper case
   studies for the owner's approval (authored-content dependency).
5. **Footer**: compress to one hairline-topped line — © · email · GitHub ·
   LinkedIn · Back to top (+ cats toggle per item 1).

Sequence: 5 → 1 → 2 → 3 → 4-restructure now, 4-content on approval.
Owner decisions requested: footer off-toggle keep/kill; ring yes/no; tree
as own section yes/no; draft scraping content for approval yes/no.

## Round 7 outcomes (2026-08-18)

| Item | Outcome |
| --- | --- |
| Cats: play menu, off retired | `off` deleted from the state machine; a stored `"off"` migrates to `resting` so nobody is stranded. Toolkit drops the jump/reach lists (the nav and Contact already carry them) for four on-demand scenes plus a police-escorted "Send the cats to bed". Section moods land in Work, Contact and beside the loop. Verified on a production build: resting schedules 0 rAF callbacks, axe clean with the panel open, reduced motion offers no scenes |
| Cats: play refusals | DEFECT found by an independent pass — `requestPlay` probes from wherever the cats are, and opening the panel calls them to an unprobed corner, so three sections refused every scene and the answer changed with how long the panel had been open. Fixed: the request now sweeps the places a cat could stand rather than the one point they occupy, and walks them there if needed, so a refusal means the page is genuinely full. Measured on a production build across 7 sections x 4 scenes x 2 click timings: 15/28 and 16/28 played before, 28/28 and 28/28 after, the two timings identical. 2,239 mid-scene samples: 0 cats resting on content, 0 off-screen, 0 behind the header |
| Loop → ring | Nine stations on an ellipse at equal arc length, one-way arcs, dashed 09→01 return, decisions spurring off the rim, philosophy at centre, detail revealed per station. Loop block 1751px → 727px at 1440 (−58%), 1886px → 918px at 390 (−51%). Two defects found and fixed: a fork printing its branches above their label, and an opened bottom station painting over the next section |
| Tree as its own section | `#tree` after Work → Journey → Skills, nav updated to match render order, cross-linked all three ways (leaves → case studies, tree → timeline, roots → skill categories, and each of those sections → tree). Rail states the crown's lopsidedness rather than hiding it |
| Tree: roots + foliage | Root count now derives from `skillCategories.length`; each category labels its own root tip, aligned by a shared fraction rather than a connector — labels only, no drawn skill→branch edge, which stays the forbidden inference. Foliage per bough scales with that branch's real technology count |
| Per-entry timeline links | REJECTED in round 7, then BUILT in round 8 at the owner's request. The three rejection reasons were requirements, not excuses: the timeline now widens its own filter when a fragment targets an entry it is hiding (cold load, hashchange, and re-click-same-hash), the anchor is the entry `<li>` with a scroll-margin landing it 80px down, and the link renders only inside an opened leaf. Honest cost, measured: in the mobile/AT list the default-open first lens contributes 12 links at load (+75% tab stops inside #tree at 390px). Accepted — in that presentation the branch row *is* the panel, so it is 12 links or no route back at all |
| Footer | One colophon line; ~80px saved on a phone, 20px on desktop. Recovery control deleted with the mode it escaped |
| AI Lab | Kept, per the owner. Added a collapsed "How this answers" panel: the real ranking loop excerpted from `lib/answers.ts`, the rule as notation, and an explicit "this is lexical retrieval, not a language model". A unit test asserts every quoted line still exists in the engine, so the excerpt cannot drift into a lie |
| Scraping workflow content | Deferred at the owner's request |

Process note: three packages were dispatched to two agents each. In every case
the second agent detected the collision before writing and switched to
verification, which is where the play-refusal defect, both ring defects and the
stale companion spec were caught. Duplicate dispatch was wasteful; the
verification pass it accidentally produced was not.

### Round 7 gate (2026-08-18)

`pnpm verify` green — typecheck, lint, contrast, 211 unit tests, production
build. Full Playwright matrix: **302 passed, 0 failed** across six viewports,
both themes, all tones, axe audits, including the Career Tree's new coverage.

The `accessibility.spec.ts` console-error test that failed intermittently
during the round passed in the uncontended run, confirming it was worker-load
contention from agents sharing the tree rather than a fault.

Known, out of scope, worth a future pass: the roaming lead cat is a button with
a 4/3px hit-target margin, so the drawn animal sits slightly inside its own
test box — meaning it can graze content by up to 4px at a boundary.

## Round 8 (2026-08-18) — deliberate builder/verifier split

Two builders, one package each, then a third agent whose only job was to
attack both and report without touching the code. The split was adopted after
round 7 produced the same benefit by accident.

| Change | Outcome |
| --- | --- |
| Tree leaf → timeline entry | Built with the three round-7 objections answered. Verifier attacked the document click listener against all 20 in-page hashes on the page plus modified/middle/right clicks: no interference, no double-handling, nothing swallowed. Landing measured at exactly 80px in every path including JS-off and reduced motion; 50 links, 0 dead fragments, 0 duplicate ids |
| Ring stations stop claiming state | `aria-expanded` removed rather than hiding content. Verifier confirmed via CDP that all nine details are in the accessibility tree at 1440/1024/768/390, nothing advertises a state it lacks, touch and print and reduced motion all work, heights unchanged |

**Verifier's adjudication of three "flaky" e2e failures**, which is why the
split earns its cost:

- `companion.spec.ts:502` — **a genuine test defect**, not a flake. It fails
  ~50% in isolation (5/10 with `--repeat-each`). The assertion is an
  un-polled instantaneous snapshot taken right after a poll that only checks
  a cat is *near* the card, not that it has *stopped* — so it photographs a
  cat mid-stride across content, which the design explicitly permits. The
  sibling test 25 lines above polls the same assertion and never fails.
- `content-integrity:54` and `contact:53` — **environmental**. 40/40 and
  60/60 in isolation. The verifier reproduced the exact failure signature by
  accidentally leaving a second `next dev` against the same `.next`.

**Separate real defect the verifier found while chasing that one:** the lead
cat's button is padded 4px/3px larger than its drawing, and the rAF loop
transforms the button — so `isClearSpot` probes a box offset 4px left and 3px
above the drawn animal, and can approve a resting spot where the cat overlaps
content by up to 4px. It bites hardest in the contact mood, which is placed
with exactly 3px of designed clearance. Previously logged as out of scope;
now measured and confirmed open.

## Round 8 close (2026-08-18)

Verifier findings, all fixed:

| Finding | Outcome |
| --- | --- |
| Ring stations could cover each other's text (pin 02, Tab to 03) | Each panel now measures its clearance against the panels sharing its x range and opens toward the roomier side. Station 02 — longest detail, 36px below it — grows upward into empty space instead of burying 03. Verified with `elementFromPoint` over every station's text at 1024/1280/1440, both themes |
| Document click listener had zero coverage | Two tests: re-click the current hash after filtering the entry away, and prove an ordinary in-page link leaves the filter untouched. Plus a unit test for the dead-fragment guard. *(History: round 18 deleted the timeline, its filter and that listener, and both tests went with them — neither guards anything today.)* |
| Landing asserted `>= 64` (would pass at 400px) | Pinned to the real 80px contract |
| "Without JS the links still work" overstated | Corrected: the *target* survives without JS; the route to it mostly does not, because the leaves are collapsed disclosures |
| Cat probe offset 4/3px from its drawing | Real bug, worse than it sounded: 23 of 37 probe-approved spots put the drawn cat on text; 0 of 37 after. The button is now inset by its own hit-target margin, so a cat's position is the top-left of the animal you can see. Tap target unchanged; the contact perch's 3px clearance is now real (measured 3.3px) |
| `companion.spec.ts:502` failing ~50% | Genuine test defect. Now waits for both cats to stop, latches that sample, asserts on it. The latch is load-bearing: mutation testing showed a plain poll still passed against a deliberately broken perch, because after 14s the cats abandon the mood and walk home to clear furniture |
| Tracker contradicted shipped code | Corrected: the "rejected" per-entry links, the removed disclosures, and a stale height figure |

Gate: `pnpm verify` green (215 unit tests, up from 211) and the full Playwright
matrix **334 passed / 0 failed** on a clean, uncontended tree.

Process: the deliberate builder→verifier split was worth its cost. The verifier
found one real product bug, one real test defect, one visual defect reachable
in two keystrokes, and three stale claims — and adjudicated three "flaky"
failures into one genuine test defect and two environmental, with evidence
rather than a shrug. One builder died mid-task to a server error; its work was
checked rather than assumed, and had in fact completed.

## Round 9 (2026-08-18)

Three items, all about the cats.

| ID | Feedback | Evaluation | Verdict | Priority | Owner |
| --- | --- | --- | --- | --- | --- |
| FB-9.1 | "when cat is active on my mouse and I choose action, they just stop doing and follow my mouse" | Reproduced in one run: the panel returns `data-cat-play="yarn"`, the next `mousemove` clears it. The loop drops any scene the frame the pointer moves, and made no distinction between a scene it offered and a scene the visitor chose — so with a mouse in your hand, four of the five menu items did nothing | **Accepted** | P0 | Opus |
| FB-9.2 | "In light mode, on closing section, the cat is just disappearing (color overlapping?)" | Correct, and it is exactly colour overlapping. Measured: the follower's computed `color` was `rgb(18,24,28)` against a `--ground` of `#12181c` — **contrast 1.00**, a cat drawn in the ground it is standing on. `syncTone` repoints a drawing's aliases, but `color` was inherited from the layer root, resolved outside every tone scope, so the tone class never reached `currentColor`. Only the page's one `contrast` section is dark enough in day theme for it to be fatal | **Accepted** | P0 | Opus |
| FB-9.3 | "How to make cat play around with content on the page? or have mode that cat go around instead of follow the mouse? … hiding on textbox. Scratching the text, or punch the text, hunting the text, run" | Two separable asks, both good. The mode is clean: a third `CompanionMode` where the pointer is ignored and the pair choose their own destinations. The content play is accepted in a scoped form — three scenes anchored to real elements (`peek` behind an opaque panel, `scratch` at a section's own hairline, `stalk` and pounce past a heading's end), all drawn by the companion. The page's own DOM is never mutated: a cat that could shove a heading around is a cat that can break a layout, and the "punch" reads just as well as a paw that stops short | **Accepted, scoped** | P1 | Opus |

### FB-9.1 and FB-9.2 — shipped (`2e2a986`)

Scenes now carry their provenance. A requested one is held against the pointer
and against nothing else: the escort, a nap, reopening the panel, the page
scrolling out from under the probe, and the scene finishing all still end it on
the frame they appear. Unprompted scenes still yield to the pointer — that rule
is what keeps the companion a companion.

Every drawing now names its colour on the element the tone class lands on. The
contract is written above `syncTone`, where the next person to add a drawn
element will read it. Side effect worth noting: the two cats had been different
colours everywhere on the page — the lead resolving `--fg-muted` correctly, the
follower carrying the root's `--fg` — and now match.

Both fixes are held by e2e tests that were run against the broken product
first. Without the fix they fail on the pointer move, and at 2.26:1.

Worth recording about FB-9.2: the pair only reach the closing section by
*following a cursor onto it*. Left alone they walk back up to whatever the
visitor is reading, and the closing section is short enough and last enough
that the reading band never lands on it. So the test drives the cursor the way
the visitor did rather than waiting for the cats to settle — a test that waited
would have passed against the bug forever.

### FB-9.3 — shipped (`7b4a3ce`, `105dc71`, and the pass below)

Wander is a third mode on the same storage key: the pointer is taken out of the
loop, the pair choose their own destinations from the machinery that already
picks resting places, and the fourteen-second idle bed is off, because in a mode
whose whole content is watching them, a visitor sitting still is the audience.

Three scenes are anchored to real elements. `peek` tucks the pair behind an
opaque panel and clips the drawing at its top edge — computed from their live
position, so the cut forms as they walk in and dissolves as they climb out.
`scratch` stands a cat under a section's own hairline and rakes at it.
`stalk` crouches, pounces and lands beside the last word of a heading.

One brief of mine was wrong and the builder was right to say so: I asked for the
pounce to land "past the heading's right edge", but an `h2` is a block, so its
right edge is the column edge — that would have put a cat four hundred pixels
out in the margin. It lands where the words stop instead.

### Verification pass

| Finding | Outcome |
| --- | --- |
| Waking from the bed threw the wander choice away | Fixed. Proved by reading storage across the round trip: the key was removed entirely and the menu came back offering "let them wander". A second key now answers "how do they behave when they are out" separately from "where are they now", which is exactly the pair of questions the bed splits |
| The stalk lost a cat at its punchline | Fixed, and the measurement is the report: the follower travelled 490px away from `(295,126)` and was still walking when the scene ended, because two beats named no position for her and the loop handed her back to a spot from before the scene. She now holds her mark across all 45 sampled frames |
| Two schedule calls ignored the mode | Fixed. A visitor who reloaded mid-wander waited 90–270s for the first scene instead of 30–90s |
| `data-cat-hide` on `CodeBlock` never worked once | Removed. Swept every 40px of the page: 0 usable hiding places out of 695 scroll positions at 1440 and 735 at 1024, because every code figure has something in the band above it — the hero's tab buttons, the lab's ask form. The business card is the only anchor, and the comment now says so |
| An anchored scene that declined cost 25 seconds | Fixed, and this was the important one. Away from Contact, four wander rolls in five named a scene with nowhere to happen, so the mode that promises the cats working the page mostly delivered two cats sitting down. The pool is now a fallback chain: the weights say what the companion would rather do, the page decides what it can do |
| A focused cat mid-`peek` put a blue ring on the panel it was hiding behind | Fixed by declining `peek` while the lead wears a focus ring, and ending one if the ring arrives. The 44px control is untouched — shrinking it was the other way to fix this, and it is the wrong way |
| `scratch` read as two cats standing near a line | Rebuilt. The stroke is now the whole animal leaning along the rule and back, three times, and it leaves three claw marks straddling the rule under the paw, drawn in the companion's own ink and gone when the scene is. Checked in both themes and measured symmetric: the marks land 0.4 of a cat-width ahead of the animal whichever way it faces, and are clamped so a cat scratching at the page edge cannot put half a mark outside the window |
| The content-scene e2e passed against a broken product 1 run in 3 | Fixed. It latched whichever anchored scene arrived first and only checked the clipping if that happened to be the peek. It now waits for a cat to be drawn clipped, and says why in the test |

The verifier also confirmed both P0 fixes independently: no drawn element
inherits its colour any more (7.19:1 over the closing section in day, 6.62:1 in
night, against 1.00 with the fix stripped), and no path takes a requested scene
away outside the five that should.

### One test I got wrong on the way

Worth recording because it was mine and it went both ways. The content-scene
end-to-end test was passing against a build with hiding switched off about one
run in three: it latched whichever anchored scene arrived first and only checked
the clipping when that happened to be the peek. I tightened it to wait for a
peek specifically — and it then failed outright, because a peek leads the wander
pool about three times in ten and attempts are thirty to ninety seconds apart,
so waiting for that one scene costs three or four attempts against a 210-second
budget.

A test that lies and a test that cannot finish are the same defect wearing
different clothes. The fix was to stop asking one test to prove two things: the
end-to-end test proves what an end-to-end wait can afford — that wandering
produces scenes anchored to the page — and the hiding is pinned in unit tests
that assert the walk-in is visible, that all three hiding beats hide, that the
cut takes away a real part of the animal while leaving the heads, and that the
reaching paw happens in exactly one beat. Flipping the hide flag turns them red.

What that leaves is one honest gap: nothing automated proves the *loop* writes
the clip the geometry describes. It is named in the test rather than papered
over, and it is checked by hand in both themes.

### Round 9 gate

`pnpm verify` green: typecheck, lint, **31 contrast pairings all at or above AA**
(lowest 4.66:1), **242 unit tests** — up from 215 at the close of round 8 — and a
clean production build.

The six-viewport Playwright matrix ran at **339 passed / 1 failed / 230 skipped**;
the single failure was the over-tightened companion test described above, and
nothing in the product. After the split, the companion suite at 1440 is **21
passed / 2 skipped / 0 failed**, and two minutes faster than it was while it sat
waiting for one particular scene.

## Round 10 (2026-08-23) — closed

Owner's items 2/3/4/5/7 (items 1 and 6 never arrived — eaten by the
terminal; owner pinged to resend). Decisions taken via four owner calls;
full design in `docs/superpowers/specs/2026-08-23-round-10-design.md`.

| WP | Owner | Scope | Files | Status |
| --- | --- | --- | --- | --- |
| A | Sonnet | Mini-Thien narrator, meow-only bubbles, bubble occupancy, journey→tree re-key, `data-cat-secret` listener | `src/components/companion/*`, `src/lib/companion-facts.ts`, companion specs | Dispatched |
| B | Sonnet | Origin story rebuilt on a single rAF master clock | `src/sections/CareerTree/OriginStory.tsx`, origin keyframes, origin tests | Dispatched |
| C | Sonnet | Tree absorbs Journey: one `#tree` section (+`#journey` alias), Tree/List toggle, nav −1 | `src/sections/CareerTree/*` (not OriginStory), `src/sections/CareerJourney/*`, `page.tsx`, `navItems` | Dispatched |
| D | Sonnet | Chat-thread Ask-me-anything, corpus from the content layer, env-gated live LLM (`ASK_LLM_*`, free by default), Workflow Explorer retired | `src/sections/AIWorkflowLab/*`, `src/lib/answers.ts`+corpus, `/api/ask`, `.env.example` | Dispatched |
| E | Lead | Four intents (opportunity · crazy idea · hello · secret 🤫), `data-cat-secret` declaration + spec | `contactIntents`, `ContactForm.tsx`, `e2e/contact.spec.ts` | Implemented |

Cross-package contracts (lead-owned): `data-cat-secret` (E declares, A
listens); section re-key (C merges sections, A re-keys companion); story
beat `CustomEvent` shape (B preserves, A consumes); `page.tsx` (C only).

### Round 10 outcomes

All five packages shipped. Four parallel Sonnet builders with disjoint file
ownership, then three matrix-driven fix rounds routed back to the owning
builders (context intact via resume), lead handling cross-cutting triage.

| WP | Outcome |
| --- | --- |
| A | Mini-Thien (shared `Silhouette`/`LineWork` primitives, bare contours, notebook) translates while cats keep meow-only puffs; bubbles/captions are reserved space and paint above the cats; tour HUD transcript went sr-only; `journey` retired as a companion key (7-stop tour); `data-cat-secret` creep shipped. Fix rounds: two-form locator strict-mode defect; a real target-size bug (cat parked on the toolkit toggle, 6.6px clear space) fixed via a separate control-rects registry — whose first version fed the follower's own position back into her target every frame and silently broke tour arrival (status region never filled); reverted at `findClearSpot`, kept at `mateSpot`/home, `sideStep` now offsets from the lead's live rect on a 120ms cadence |
| B | One rAF master clock replaces per-group `setTimeout`s + CSS-delay guesses; `planRelease`/`dueByElapsed` pure and unit-tested (14 tests). Fix rounds: the chronology e2e was racing the by-design staggered DOM release (poll, deadline from `STAGGER_STEP_MS`); then the poll exposed a real StrictMode bug — `claimedRef` survived the rehearsal unmount while the DOM re-pended, permanently stranding the arrival year's groups; conductor now resets all bookkeeping per real mount. Lead added: Escape/Skip-focus listeners moved to layout effects — a visible player that drops an Escape pressed before its passive effects ran was a real race the full-suite load exposed |
| C | One `#tree` section, `#journey` as a zero-size anchor (no-JS safe), Tree/List toggle with CSS-only defaults (desktop tree, mobile list), `forceCareerTreeView` as direct DOM writes to outrun `scrollIntoView`; per-entry fragments, widen-on-fragment, and the 80px landing all survive; nav −1 with the merged item labelled "Journey". Known trade-off: no-JS desktop cannot reach the List face (same class as the origin player). Lead fix round: the "cold load" e2e was actually a same-document hash hop (file-level beforeEach loads `/` first) and Next's dev router intermittently dropped the fragment before `hashchange` — measured `location.hash === ""` in 10/12 failures with the product blameless; the test now interposes `about:blank` so it truly cold-loads (12/12) |
| D | Ask This Site is the section lead: multi-turn thread, per-turn Prose/Code tabs with unique filenames, focus-preserving compose; corpus adds origin, philosophy, principles, loop (mechanical field-joins only); Workflow Explorer deleted; live mode env-gated on `ASK_LLM_*` (free by default — no key, no model, no cost) with retrieval-first grounding, 12/10min per-IP limit, zod caps; authored live/static notice pair. Fix rounds: Tailwind preflight strips implicit list roles — the new lists needed the codebase's explicit `role="list"` pattern; then the lead found the remaining failure was the spec's own `lastTurn` grabbing nested sourced-answer `<li>`s (role queries match descendants) — direct-child scoping fixed all seven |
| E | Four intents shipped (opportunity · crazy idea · hello+feedback · secret 🤫 with "The cats have been briefed. They'll deny everything."); `data-cat-secret` declared on the form while selected, pinned by a declaration-side e2e test |

### Round 10 gate

`pnpm verify` green: typecheck, lint, 31 contrast pairings all ≥ AA (lowest
4.66:1), **348 unit tests** (up from 242 at round 9), production build with
the new `/api/ask` route. Full Playwright matrix: **427 passed / 0 failed**
across six viewports, both themes, all tones, axe audits. Visual pass done
against a real browser at 1440 in day and night: tree face, list face, lab
chat with a live turn, contact with the secret intent selected and the cats
crept to the form.

Five matrix runs to green, every failure adjudicated: 16 → 12 → 1 → 1 → 0,
with four real product bugs found and fixed along the way (toolkit-toggle
target size, tour-arrival feedback loop, StrictMode-stranded story groups,
dropped-Escape listener window) and four test defects fixed where the test
was the liar (strict-mode locators, descendant listitem matching, a poll
racing a by-design stagger, a "cold load" that wasn't one).

Owner's items 1 and 6 from this round's list never arrived (terminal ate
them) — still awaiting a resend.

**Post-round resolution of items 1 and 6:** item 6 never existed (owner
confirmed), and item 1 turned out to be the `MaxListenersExceededWarning`
Gzip spam itself — benign, nothing to build. **Correction (2026-08-25):**
the round-10 diagnosis blamed the Claude Code CLI's log compression; a
later Playwright run caught the warning live with a `[WebServer]` prefix —
it is emitted by the `next dev` server process itself under concurrent
request load. Same verdict (harmless, ignorable), corrected culprit.

## Round 11 (2026-08-23) — the backlog round

Owner: "build the rest." Every deferred/open item from rounds 1–7, plus the
standing blue question (answered: **blue stays**).

| WP | Owner | Item | Outcome |
| --- | --- | --- | --- |
| F | Lead | Scraping-knowledge content (deferred round 7) | Drafted from the USC/DoorDash scraper case studies, approved by the owner verbatim, shipped as "How I solve problems with scraping knowledge" between the chat and the experiments (`ScrapingPlaybook.tsx`, content + type in the content layer). Four moves, each linking to the case study already proving its numbers; all five passages indexed into the chat corpus verbatim (the content-honesty test caught them and now pins them). Lab last-updated honestly bumped |
| G | Sonnet | Compact CopyButton + card ratio (round 4 note) | `variant="compact"`: 32px visible box, 44px tap target recovered via an exact `-inset-[7px]` pseudo-element — the naive −6px was a real bug (border shrinks the containing block to 30px; 42px ≠ 44px). Card re-cut to **13:10**, not 3:2: measured floors 260.4px @352px / 261.8px @384px leave true 3:2 short by 25.7px at the lg width, so 13:10 is the honest optimum, documented in the file. New unit tests (352 total) + e2e ratio/no-clip/hit-area tests. A trusted Playwright click on the copy control hangs against a headless clipboard — the hit-area test asserts capture-phase `event.target` instead |
| H | Sonnet | screenshots.mjs refresh (round 1 follow-up) | Capture list rebuilt to the current page (tree Tree/List faces, lab chat turn, contact intent, `/resume` route; `#resume`/"Deep Dive"/explorer captures deleted). Script was also Windows-broken (baked Linux paths, POSIX process handling) — fixed and proven end-to-end: 27 files produced, server started and cleanly stopped. **Found a real site bug:** home page under `@media print` collapses `#work` articles to 0px wide (~230,000px page, unrasterizable); `/resume` prints fine. Spawned as its own task (being fixed in a separate worktree session) |
| — | Lead | Blue vs zero-hue (open since round 0) | **Closed: blue stays.** Owner's call; links, measured values and the single primary control keep the annotation hue |
| — | Lead | Worktree lint pollution | `.claude/worktrees/**` added to eslint ignores — a concurrent session's nested `.next` artifacts were producing 10k phantom lint problems in this checkout |

### Round 11 gate

`pnpm verify` green: typecheck, lint, contrast, **352 unit tests** (up from
348), production build. Full Playwright matrix: **430 passed / 0 failed**,
first run — no fix rounds needed this time. Visual check at 1440 in both
themes: the playbook with its evidence links, the 13:10 card with the
compact copy control.

Open, tracked elsewhere: the home-page `@media print` collapse (WP-H's
find) is being fixed in its own worktree session.
**Resolved:** merged as PR #6 before this round's commit landed.

## Round 12 (2026-08-23/24)

Owner's six items; four owner calls taken (scrolling chat window · compact
hero + "Ask Thien" tab · evidence-facts rail · full tree inversion).
Design: `docs/superpowers/specs/2026-08-23-round-12-design.md`.

| Item | Owner | Outcome |
| --- | --- | --- |
| 1 · Origin story unstable on scroll | Sonnet (WP-I) | Root cause was real: the weather layer was `position: fixed` (portalled to body) and root-year beats panned the page with `scrollIntoView` — a fixed layer plus a programmatic scroll fighting the visitor's own is exactly the reported shearing. Both deleted; every visual now absolute inside the tree's frame; no more scroll-away-ends-the-show. New e2e proves the opposite property: scroll away, story keeps playing, scroll back, sky's box inside stage's box at every position. All round-10 contracts held. 11/11 scoped |
| 2 · Tree/List toggle looks broken | Lead | Segmented-control border bug: the shared middle edge belonged to List alone (`border-r-0` on Tree), so it always wore the other button's color. Both buttons now carry four borders, List overlaps `-ml-px`, pressed lifts `z-10` |
| 3 · Chat stacking up the page | Sonnet (WP-K) | Thread now a `role="log"` window, `max-h-[22rem]` (~1.5 turns), internal scroll, newest turn scrolled into view (instant under reduced motion), "Clear conversation" returns focus to the input. Real bug found: `scrollIntoView` walks every scrollable ancestor and lurched the whole page five-to-six-figure pixels — replaced with a container-scoped `scrollTo`, pinned by a dedicated "page doesn't lurch" e2e test. Round-10 "stays on screen" contract rewritten honestly |
| 4 · Compact hero snippet + "Ask Thien" tab | Sonnet (WP-K) | `CodeBlock` gains an opt-in `compact` prop (new fluid `--step--2` token); hero artifact tightens; fourth tab "Ask Thien" hosts a mini chat — one input, latest turn, sources, "Full conversation in the Lab →" — engine lazy-loaded on first tab activation (mounting the panel IS activation, proven by unit + e2e), static engine only, honest caption authored in content. Works at 320px |
| 5 · Skills rail unhelpful | Lead | Counts the reader's eyes can make are gone; the rail now says which technology the entries name most, across how many entries and which years — computed from `careerEntries[].technologies` only. Certifications count and the "Not shown: proficiency scores" line stay |
| 6 · Tree branches = experiences | Sonnet (WP-M) | Full inversion: `buildCareerTree()` — one branch per entry, chronological up the trunk (oldest lowest, verified 2021→2025 across grid rows), leaves = authored `technologies` + `impact` (tagged by kind; only technology leaves carry a cross-entry count). Lens branches retired; roots label-only (no invented category→entry edge); branch→`#journey-entry-<id>` links; leaf disclosures replaced by one disclosure per branch (14 tab stops, not 70+); mobile list mirrors; origin data-attribute contract verified live (1 shoot, 14 branches, 60 leaves); anti-inference tests rewritten and kept sharp. `buildKnowledgeTree()` survives solely for the hero's entries-per-lens list |
| — | Lead | Doc debt from the inversion settled: CLAUDE.md tree rules, docs/editing.md, Skills.tsx's `category.lenses` comment (now honestly "no consumer today") |

### Round 12 integration log

Six matrix runs to green — every intermediate failure adjudicated:

1. Old hero-tabs test asserted 3 tabs; "Ask Thien" makes 4 (the one seam of
   the ownership split — neither builder owned that pre-existing test).
2. Toolkit-obscured axe violation returned: the 120ms-throttled control-rect
   read went stale under load → replaced with a rect computed each frame
   from the loop's own state (zero DOM reads, zero staleness).
3. Escape test: the lazy player chunk missed a 5s expect under six-worker
   dev-compile contention (2.7s in isolation) → load-sized mount timeout at
   every open site, round-6 discipline.
4. Hero tabs at 390: pre-hydration click → retried click-and-verify unit.
5. Case-study disclosure at 390, same class → class fix: the sections
   suite's beforeEach now gates on `html[data-ink-ready]` (a client-effect
   stamp — a true post-hydration signal), guarded for the JS-off describe
   via the `__next_f` inline-script discriminator.
6. Toolkit axe a third time + a one-off 768 flake → the real invariant:
   `keepClearOfControl` enforces ≥24px+4 clearance between the follower and
   the lead's button at the one chokepoint where mood/tour positions are
   finalized (two earlier chokepoint attempts were caught wrong by the
   builder's own scoped runs and rejected); `sideStep` retired as
   superseded. The 768 flake passed 8/8 isolated and was left unchanged —
   the builder also proved the proposed `data-ink-ready` gate would be
   WRONG for companion.spec (InkReveal never stamps it under reduced
   motion) and refused it with evidence.

### Round 12 gate

`pnpm verify` green: typecheck, lint, contrast, **388 unit tests** (up from
352), production build. Full Playwright matrix: **459 passed / 0 failed**.
Visual pass at 1440 in both themes: the inverted tree (14 chronological
branches, 59 authored-fact leaves, honest rail), the hero's Ask Thien tab
answering with sources, the scrolling chat window pinned to the newest
turn. The origin story's scroll stability is pinned by its own new e2e
test rather than a screenshot.

## Round 13 (2026-08-24)

Two quick owner items after living with round 12:

| Item | Verdict | Outcome |
| --- | --- | --- |
| Leaves: achievements or `learned`? | Answered, no build | Achievements stay — impact lines are short and skimmable where `learned` lines are full reflective sentences; the lesson belongs in the opened branch panel, the proof on the branch |
| "On a small screen, it is no longer a tree" | Accepted, built (WP-N) | The mobile Tree face (`KnowledgeTreeList`) got its ink back: a y-stretching trunk SVG whose height comes from normal document flow (disclosures can never break it — zero measurement code), a deterministic curved bough per entry, year rings at year boundaries, a miniature "still growing" tip. Pure `aria-hidden` decoration over the unchanged accessible list, pinned by a new e2e test (one trunk, one bough per branch, all hidden, accessible button count unchanged). Verified at 320/390/430 with multiple disclosures open, both themes. Known nit, owner's call: the first row's ring + bough read as a slightly busy "knot" |

Gate: `pnpm verify` green, full Playwright matrix **463 passed / 0 failed**,
visual pass at 390 in both themes.

## Round 14 (2026-08-24)

Owner's items 1–3 (item 4 eaten by the terminal twice — still awaited).

| Item | Owner | Outcome |
| --- | --- | --- |
| 1 · Tree "awful" on mobile + laptop (messy, hard to read) | Sonnet (WP-O) | Diagnosed with DOM-geometry evidence before redesigning: leaf marks (40px) taller than their rows (30px) physically overlapping; per-leaf x-jitter turning each spine into a meander; 6.5–7× height mismatch between paired boughs driving the zigzag; 301px panels at 1024. Fixes: one straight twig per branch (blade tilt still varies), mark 40→26 with tightened pitch, calmed stagger (lean 24→16, cap 264→160), reclaimed width (gap-x-24→16, bough 48→32; panels 301→317px), mobile ring/bough knot separated (ring pinned to the trunk's own hairlines, bough departs below it). Contracts all held (56 scoped tree tests green). The builder could not screenshot in its environment and said so; the lead verified visually at 1024 and 390, both themes — dramatically calmer, chronology reads clean |
| 2 · Mini-Thien looks like Thien | Sonnet (WP-P) | Redrawn per the owner's description: tall lean frame, glasses, filled dark hair mass at 0.68 ink density (denser than the grey cat's 0.42 coat — ink standing in for "dark", blue stays forbidden) in a short ivy-league cut with raised crown and part-notch, one raised-eyebrow stroke, notebook kept. Verified at 3–6× density in both themes; 1x marginality is the pre-existing scale tradeoff, not a regression |
| 3 · Wander corners + scroll sprint | Sonnet (WP-P) | Wander destinations now uniform draws across the margin-inset viewport (10 tries through the existing isClearSpot gauntlet before falling back to the old pool) — the corner-seeking was `standingSpots`' whitespace grid, whose whitespace lives in the gutters. Facing decoupled: a deterministic per-arrival roll (FNV-1a, the drawing files' own idiom) faces a settled cat left or right at random. Speed: every path audited — all motion already flows through the shared advance/followTarget+ramp pair, so the cap held mathematically; it is now explicit in a pure `companion-motion.ts` with 12 tests incl. a 20,000px-jump case. Honest residual: cats are viewport-fixed, so during a fast scroll they still glide relative to the *text* — if that perception persists for the owner, the next lever is riding the page mid-scroll |

Gate: `pnpm verify` green (**410 unit tests**, up from 388), full Playwright
matrix **463 passed / 0 failed**, first run. Lead visual pass: tree at 1024
+ 390 both themes, mini-Thien at 3× both themes.

## Round 15 (2026-08-24)

Six items (the twice-eaten item 4 finally arrived: wordplay phrases).

| Item | Owner | Outcome |
| --- | --- | --- |
| 1 · Seed drops into empty air | Sonnet (WP-Q) | Measured: 2875px drawing, sky box covering the top 725px — the seed landed ~2150px above the ground. A new bottom-pinned `groundSlice` hosts the flight/seed beats (seed now ~37px off the true ground line); weather stays at the canopy where it belongs; captions follow their beat's box. New e2e pins the ground box to the stage's bottom edge within 2px. 12/12 scoped |
| 2 · Cats slide during scroll | Sonnet (WP-R) | The cats ride the page: per-frame scroll delta applied before any movement logic (uniform translation — preserves the round-12 clearance invariant), targets frozen while riding so the mover doesn't fight the correction (escort + the existing fast-scroll duck exempted, as the page's own scroll reactions), viewport clamp holds them on screen, 220ms settle then a capped-speed walk back. Wheel-tick e2e pins <60px content-relative drift; all 44 companion tests untouched-green |
| 3 · Loop + graph → workflow system | Sonnet (WP-S) | The ring stays the engine; an "Around the loop" layer attaches by one hairline bracket: four curated `workflowStages` drawn as verification gates (`watchFor`, hollow squares) and human checkpoints (`humanOwns`, hollow circles), every string verbatim, link back to the Lab. Declined honestly: the other six stages (legibility curation, not a content gap), the principles (already rendered a screen above), and any per-station edges (the two loops share no authored mapping). Mobile gets a compact list, not a mini-graph. Axe 4/4 both widths and themes |
| 4 · Wordplay phrases in the closing | Lead | Placement approved (closing); three drafts offered ("Turn an idea into an I-did" · "Practice makes AI" · "Learn as you build. Build as you learn.") — **awaiting the owner's wording approval**; ships as a follow-up content edit |
| 5 · Closing vs footer clash | Lead | The footer joins the closing's `tone-contrast` scope — one continuous dark final chapter, the hairline as the only seam; aliases only, axe-clean over the contrast palette |
| 6 · "I'll come to you" — how it works | Lead, answered | Same `/api/contact` route and the same three Resend env vars as the full form; until set, it opens the visitor's mail app prefilled, honestly labeled |

Gate: `pnpm verify` green (**422 unit tests**), full Playwright matrix
**489 passed / 0 failed**, first run. Lead visual pass at 1440 both themes:
the ring-with-gates figure, the unified dark closing+footer, the seed
landing on real ground (builder-verified with measured screenshots).

### Round 15 follow-up (2026-08-24/25)

Owner, seeing the merged chapter: two "Back to top"s in one screen —
"merge the closing to footer as well."

| Change | Outcome |
| --- | --- |
| One closing block | The closing's boxed "Back to top" deleted (the colophon's is the page's single exit); the footer's separating border removed — the fleuron is the typographic break. Thank-you → Get in touch → fleuron → colophon, one dark chapter |
| Ride × clamp axe regression | The merge-gate matrix caught the follower resting inside the lead's toggle clearance after a hard scroll: the ride's uniform translation preserves the pair's gap but per-cat viewport clamping does not, and the ride-freeze held the collapsed arrangement. Fixed in layers: (1) the ride-freeze applies the clearance invariant to the follower's post-clamp position; (2) `clearFollowOfToggle` extended to every settle chokepoint (restingPlaces, home, wanderTo); (3) a content-safety gate the builder caught itself — a pushed candidate may never land on prose; (4) the final piece: **toggle clearance is a hard AND-ed constraint of the settle search** (`searchClearOfToggle` — content-conflicted candidates discarded outright, pool widens until both rules hold, best-gap fallback, distance always preferred over overlap). 5 new pool tests |
| Audit samples the resting UI | The axe case-study test gained a settle-wait for the companions before auditing — sampling mid-walk fails on motion the design permits (round-8 mid-stride precedent). The transit window itself stays tracked (the filed follower-trailing chip) as a real design note |

Gate: `pnpm verify` green, full matrix **490 passed / 0 failed**. Item 4
(closing phrases) still awaits the owner's wording.

### Follower-trailing on long walks (2026-08-25, the filed follow-up executed)

The transit-crossing residual, closed structurally. On the page-length
walks (home branch, both mood-settle sub-cases) the follower now trails
the lead's live position via a pure `trailBehind` — one path, nothing to
cross — and simply keeps trailing his stationary spot once he arrives.
Wander was audited, attempted, and **reverted with evidence**: gating her
switch on catching up broke `wanderTo`'s own arrival contract (her ramped
follow curve never registered "settled" within the suite's own timeouts,
reproduced twice) — a mechanism that doesn't reliably settle is worse than
the smaller local exposure it addressed. Tour/watch/scene choreography
untouched. Along the way a real ordering gap in `resolveFollowClear` was
found and fixed: the fast path only content-checked when correcting a
toggle conflict, so a trail spot clear of the toggle but on prose slipped
through — `isClearSpot` now runs first, unconditionally (a live probe had
the follower resting on case-study text before the fix). Bounding
ride-drag distance was considered and not pursued — trailing alone closed
the gap completely.

Gate: `pnpm verify` green (**130 companion-suite unit tests** among 433
total), axe case-study **12/12 repeats**, gap-sampling walk-back **6/6**,
full matrix **491 passed / 0 failed**. Round-14 speed cap and the
round-12/15 clearance invariants byte-untouched.

### The sign-off (2026-08-25) — round 15 item 4 closes

Owner: "whatever makes it look good, unique and outstanding." The parting
line is the site's own joke told in its own materials: display italic with
the pun's pivot as an inline mono code token — *Turn an idea into an*
`i_did`. Three authored lines (`closingSignoffs`: `i_did` · Practice makes
`AI` · Learn as you build. Build as you learn.), one per deploy by
day-of-year, frozen into the static build so nothing can mismatch. Owner
follow-up ("too huge") compressed the merged chapter: 60% section rhythm
above, 35% below the fleuron — measured 900→620px.

Gate: `pnpm verify` green, full matrix **491 passed / 0 failed** (one
intermediate run failed 10 tests, all chromium-320, all unrelated specs,
all passing 20/20 scoped — a loaded-machine shard, recorded as
environmental). With this, every item from rounds 1–15 is shipped.

## Round 16 (2026-09-02) — Playground Earth

Design: `docs/superpowers/specs/2026-09-02-playground-earth-design.md`.

### Performance baseline

Measured with `pnpm perf` against a production build, Chromium at 4x CPU and
~1.6 Mbps. Re-run after every step that touches the initial chunk set.

| When | JS | CSS | Fonts | LCP | TBT | CLS | DOM nodes |
|---|---|---|---|---|---|---|---|
| Before round 16 | 207.4 KB | 14.2 KB | 331.4 KB | 3884 ms | 359 ms | 0 | 4369 |
| After the chat moved into the hero tab | 192.7 KB | 14.2 KB | 331.4 KB | 3840 ms | 456 ms | 0 | 4120 |
| After, same-commit re-run | 192.7 KB | 14.2 KB | 331.4 KB | 4032 ms | 260 ms | 0 | 4120 |
| After Philosophy and the Lab were removed | 188.2 KB | 13.5 KB | 331.4 KB | 4148 ms / 3692 ms | 580 ms / 474 ms | 0 | 3325 |
| Same row re-measured today at `61bef53` (3 runs) | 188.1 KB | 13.5 KB | 331.4 KB | 2928–4676 ms | 389–863 ms | 0 | 3325 |
| After the globe and the Workshop, `f794749` (4 runs) | 192.2 KB | 13.9 KB | 372.0 KB | 3520–4464 ms | 375–1087 ms | 0 | 3764 |
| Round 17 stage 1, boxes → rules, `55d0a43` (3 runs) | 197.0 KB | 14.1 KB | 372.0 KB | 3512–3992 ms | 484–541 ms | 0 | 3649 |
| Round 17 stage 2, Newsreader → Fraunces (3 runs) | 197.0 KB | 14.1 KB | **375.5 KB** | 3416–3636 ms | 229–719 ms | 0 | 3649 |

**Round 17, stage 2 — the display face swap costs 3.5 KB.** Newsreader gave
way to Fraunces (variable on `opsz` and `wght`, with `SOFT` and `WONK`
requested only so CSS can pin them to 0). The stage 1 and stage 2 rows are
the same commit before and after that one change, so the delta is
attributable: fonts 372.0 KB → 375.5 KB, **+3.5 KB**, with JS, CSS, CLS and
DOM nodes identical to the byte and to the node. LCP and TBT both land inside the run-to-run
noise this table has documented since round 16 — the Fraunces LCP range is
narrower than the baseline's and its TBT range is wider, and neither is a
signal at three runs.

Both rows report **0 responses with no `sizes()`**, so neither is
under-reported.

A fourth run, taken before these, measured fonts at 59.0 KB and CSS at
0.0 KB. It is discarded, and recorded here because the failure mode is worth
knowing: the `pnpm start` for it never bound, so the *previous* run's server
process was still on :3100 serving a `.next` that a later `pnpm build` had
overwritten underneath it. The stylesheet was then requested under a build id
that no longer existed — a 404 contributes no bytes, which is why CSS read as
zero. A CSS total of 0.0 KB on a page that obviously has styles is the tell.
Check the listening PID's start time against the build's, not just that the
port answers 200.

**The italic follow-up, now taken — see the row below.**

| Round 17 stage 3, display italic dropped (3 runs) | 197.0 KB | 14.0 KB | **223.8 KB** | 4592–5952 ms | 603–1128 ms | 0 | 3649 |

**Round 17, stage 3 — dropping the display italic saves 151.7 KB.** The
tracker's long-standing note that Newsreader *italic* was 143.6 KB for two
usages proved out against Fraunces: `style: ["normal", "italic"]` →
`["normal"]` takes fonts from 375.5 KB to **223.8 KB**, 40% of the font
payload and roughly forty times what swapping the whole display family cost.
CSS drops 0.1 KB with the second `@font-face` block. JS, CLS and DOM nodes
are unchanged.

It bought four italic lines, all now set in roman: the business card's
philosophy quote, the two world names (`WorldPanel`, `WorldsStage`), and the
closing sign-off.

**Read the LCP and TBT columns on these two rows against each other, not
against the rows above them.** This machine was materially slower during
stage 3 than during stage 2, and the control proves it rather than assuming
it: the *with-italic* build was re-measured back to back in the same session
and came back at 4212–5524 ms LCP / 345–1179 ms TBT, against its own earlier
3416–3636 ms / 229–719 ms with no code change between them. Against that
matched control the no-italic build measures 4584–5712 ms / 584–1185 ms —
overlapping ranges, no signal. Which is the expected result: the fonts load
`display: swap` and off the critical path, so removing one changes what is
downloaded, not when the page paints. The saving here is a byte saving and is
claimed as nothing else.

All rows in this stage report **0 responses with no `sizes()`**.

**A faux oblique is not a fallback.** With the file gone, a browser shears the
roman for any `italic` left on a `font-display` element, and on a
high-contrast serif at `--step-2` that reads as a rendering fault — so all
four call sites were changed to roman rather than left to synthesise.
Verified in the browser: three faces load (Fraunces normal, Plex Sans normal,
Plex Mono normal) and zero `.font-display` elements compute a non-normal
`font-style`. Note that Plex Sans and Plex Mono have never shipped an italic,
so every sans and mono italic on the page — the code block's strings and
comments included — has always been synthesised; this change makes the
display face consistent with them instead of being the one exception that
cost a file.

**The one to look at is the sign-off.** Of the four, it was the only line
where the slope did real work, marking the change of voice that makes a
parting line read as spoken rather than as one more heading. The mono pivot
chip now carries that alone, and a pivot-less signoff is genuinely quieter
than it was. If the slope is wanted back there, the honest options are paying
for the file or accepting the shear; there is no third one.

**e2e note.** `axe` and `responsive` both pass in full when run alone (14/14
and 24/24). Run as a pair on a loaded machine they produced one failure each
time, a *different* test on each run — `axe:318` at 375 and then `axe:347` at
1440 — and both passed in isolation immediately after. That is this repo's
documented worker-saturation flake, not a regression.

### Analytics (2026-09-30) — `d834264`

| When | JS | CSS | Fonts | LCP | TBT | CLS | DOM nodes |
|---|---|---|---|---|---|---|---|
| Round 17 stage 4, analytics added, gate on (3 runs) | **198.8 KB** | 14.0 KB | 223.8 KB | 3336–3572 ms | 278–524 ms | 0 | **3651** |

**Vercel Web Analytics and Speed Insights cost 1.8 KB of initial JavaScript
and two DOM nodes — and at `d834264` the `VERCEL_ENV` gate reclaimed neither.**
Read against the stage 3 row above: JS 197.0 KB → **198.8 KB**, DOM nodes
3649 → **3651**, with CSS, fonts and CLS unmoved. The two nodes were reclaimed
afterwards by gating the footer line; the byte cost still is not, and cannot
be by this gate. See [Footer gate](#footer-gate-2026-09-30) below.

The A/B this was meant to be did not work, and the reason is the finding.
Two builds were taken from one working tree at `d834264` with `VERCEL_ENV` as
the only variable, three `pnpm perf` runs each. They came back **identical in
every byte column** — JS 198.8 KB, CSS 14.0 KB, fonts 223.8 KB, CLS 0, 3651
DOM nodes, both ways. So the gate is not where the cost is, and a
gate-off/gate-on delta measures nothing. A third build, at `d834264^`, is
what actually isolates it: 197.0 KB / 14.0 KB / 223.8 KB / 3649 nodes, which
reproduces the stage 3 row to the tenth of a kilobyte and to the node. The
1.8 KB and the two nodes are therefore `d834264` itself, and `dad2553`, the
only other source change in between, moved no bytes at all.

**The commit message's bundle claim does not hold.** `d834264` says that
because every route prerenders, "on a preview or local build neither vendor
package reaches the client bundle at all, rather than shipping and then
no-oping at runtime." Capturing every response for both builds and diffing
the two lists (26 responses each) shows otherwise:
`_next/static/chunks/01v6f8nq-k-ez.js` — 28,861 bytes on the wire — carries
both vendor packages' code and their script URLs, and the homepage requests
it in **both** builds. Total script bytes are 203,620 either way. That chunk
is shared, not a vendor chunk: it also carries app code, so the 1.8 KB above
is the honest figure for what the packages added, not its 28.9 KB.

What the gate does change on the wire is three things and all of them small:
the document grows 117,691 → 117,828 bytes, the `/resume` RSC prefetch grows
2,799 → 2,845 bytes, and the gate-on build makes two extra script requests,
`/_vercel/insights/script.js` and `/_vercel/speed-insights/script.js`. Under
`pnpm start` both 404 with a zero-byte body — those paths are served by
Vercel's edge, not by Next — so their real cost is **not** in the row above
and will only be measurable against the deployed site.

None of this undercuts the gate's two stated reasons for existing, which are
about behaviour rather than bytes: it still keeps `@vercel/analytics` from
fetching its debug script during the Playwright run, and it still keeps
preview traffic out of a per-team event allowance. It just does not keep the
packages out of the initial chunk set, and the tracker should not be read as
saying it does. Reclaiming the 1.8 KB, if it is worth reclaiming, needs the
import to go behind something the bundler can drop — not the gate.

The two DOM nodes were `SiteFooter`'s disclosure line and the divider before
it, and at `d834264` they were **ungated**: they rendered in every
environment even though the sentence they carry is only true in production, so
a local or a preview build claimed measurement that was not happening. That
was the bug this row surfaced, and it is fixed below — the line now rides
`analyticsEnabled()` like the scripts do, which is what makes this row's node
count gate-dependent.

All nine runs across the three builds report **0 responses with no
`sizes()`**. Timings are noise at this sample size and no timing claim is
made: the three builds' LCP ranges (3108–5156, 3780–4836, 3336–3572 ms)
overlap, and their TBT ranges (476–1046, 406–1064, 278–524 ms) overlap too,
with the gate-on build — the one carrying *more* code — reading fastest on
both, which is the tell that the machine, not the build, is what moved.

Builds and servers for this row were run in a throwaway `git worktree` on
:3100, because `next build` clears `.next` and Next 16's dev server lives in
`.next/dev` — building in the main checkout would have pulled the floor out
from under a dev server that was already running on :3000.

### Footer gate (2026-09-30)

| When | JS | CSS | Fonts | LCP | TBT | CLS | DOM nodes |
|---|---|---|---|---|---|---|---|
| Footer line gated, `VERCEL_ENV=production` build (3 runs) | 198.8 KB | 14.0 KB | 223.8 KB | 3892–4964 ms | 674–1193 ms | 0 | **3651** |
| Footer line gated, plain build (3 runs) | 198.8 KB | 14.0 KB | 223.8 KB | 4240–5284 ms | 478–593 ms | 0 | **3649** |

**The disclosure line now rides `analyticsEnabled()`, so the page says it is
being measured only where it is.** `SiteFooter`'s "Anonymous page counts, no
cookies (Vercel)" and the `·` before it used to render in every environment
while the scripts they describe render in production only — the stage 4 row
above recorded the two nodes as ungated, and that was the finding, not a
footnote. The sentence is a claim about the page in the same register as a
rail figure or a globe plaque, and a claim that is false everywhere except a
production deployment does not belong in the content layer.

**Both rows were measured, not derived.** The node count is now
gate-dependent, so arithmetic on the old row would have been a guess: two
builds in a throwaway worktree on :3100, three `pnpm perf` runs each.
Gate-on reads **3651**, identical to the stage 4 row — the production page did
not change, which is the point. Gate-off reads **3649**, identical to the
stage 3 row, which is what the two reclaimed nodes look like.

**The bytes did not move, either way.** JS 198.8 KB, CSS 14.0 KB, fonts
223.8 KB, CLS 0 across all six runs. That is the stage 4 finding holding:
the gate is a behavioural boundary, not a bundle one, and the 1.8 KB the
vendor packages cost is still in the shared chunk in both builds. Gating one
paragraph of copy was never going to reclaim it.

All six runs report **0 responses with no `sizes()`**. No timing claim is
made — the two builds' LCP ranges (3892–4964, 4240–5284 ms) and TBT ranges
(674–1193, 478–593 ms) overlap, and the *lighter* build read slower on LCP,
which is this machine, not the code. The stage 4 row's own LCP/TBT columns
were left as recorded rather than overwritten with today's noise.

**e2e note.** The full suite at default workers came back 36 failed / 589
passed in 39.2m; at `--workers=2` the same tree came back **3 failed / 622
passed** in 31.0m. All three survivors are at the 1440 viewport and all three
are `toBeVisible` timeouts on elements that arrive after animation
(`ask.spec.ts:115`, `companion.spec.ts:748`, `origin.spec.ts:375`) — this
repo's documented worker-saturation flake, not a regression: a 36 → 3 collapse
from halving concurrency is load, not code. `e2e/accessibility.spec.ts` run
alone at `--workers=2` passes **42/42** across all six viewports, including
both analytics tests.

`e2e/accessibility.spec.ts` changed shape with this. It used to assert the
line is **visible**; Playwright only ever runs against `pnpm dev`, where
`VERCEL_ENV` is unset, so that test could only have kept passing if the gate
were broken. It now asserts the line is **absent**, which is the arm that
suite is in a position to see, and it sits directly beside the existing
"ships no analytics requests outside a production deployment" test — together:
no analytics traffic, and no sentence claiming there is. Both arms are pinned
in `tests/ui/SiteFooter.test.tsx`, which can stub the environment.

Moving the chat into the hero's fourth tab took 14.7 KB off the initial
JavaScript. TBT in the first "after" run measured 456 ms vs. a 359 ms
baseline, but the same-commit re-run above measured 260 ms — a 196 ms swing
with no code change between the two, consistent with this machine's known
run-to-run TBT noise, not a confirmed regression. JS, CSS, fonts, LCP, CLS
and DOM nodes did not move materially.

Removing Philosophy and the AI Workflow Lab (`ProblemSolvingLoop` alone was
~1,040 lines of client code with a 2,048-sample table computed at module
scope) took a further 4.5 KB off the initial JavaScript (192.7 KB → 188.2 KB)
and 0.7 KB off CSS (14.2 KB → 13.5 KB), against the row above. DOM nodes fell
from 4,120 to 3,325 — a 795-node drop, the largest single move this table has
recorded, consistent with two large sections and their markup leaving the
tree entirely. Fonts held at 331.4 KB, as expected: this round touched no
typefaces. Two `pnpm perf` runs against the same build disagreed on LCP
(4148 ms vs. 3692 ms, a 456 ms spread) and TBT (580 ms vs. 474 ms, a 106 ms
spread) — both cells record both numbers rather than picking one. Neither run
undercuts the 260–456 ms TBT band already on file, so no TBT change is
claimed either way; if anything both readings sit above the prior row's
best case, but given the documented 196 ms same-commit swing that is noise,
not a regression claim. LCP remains anchored to the same hero intro
paragraph and stays past the 2.5 s "good" threshold, as already noted below.

LCP element is the hero intro paragraph. Two standing facts this table exists
to keep honest:

- LCP is already past the 2.5 s "good" threshold on a phone. Nothing new may
  be added to the first screen.
- Newsreader **italic** is 143.6 KB of the 331.4 KB and is used in exactly two
  places (`BusinessCard.tsx:275`, `Closing.tsx:76`). Dropping that one axis is
  the single largest win available and is tracked as its own decision, not
  bundled into this work.

### The globe and the Workshop (2026-09-29)

Plan: `.superpowers/sdd/2026-09-28-playground-earth-globe-and-workshop/`.

**What shipped.** Two sections, both `tone="deep"`.

- **`#worlds`** — seven worlds on a drawn globe: 19 plaques, 3 decorations, 2
  worlds deliberately off the map. A Canvas 2D orthographic projector
  (`src/lib/globe.ts`), a build-time simplified coastline, and **no runtime
  dependency at all**. The canvas is an island reached through one `import()`
  in `WorldsStage.tsx`; the server-rendered list beside it carries every
  world, every plaque and every source, so the section is complete with the
  chunk blocked — `e2e/worlds.spec.ts` asserts that by aborting the request.
- **`#workshop`** — the nine-step loop run against one real project, five runs
  selectable, plus the ten agent stages underneath. Every piece of evidence is
  one authored field of that project, quoted verbatim; a station whose field
  is empty stays on screen and names the missing field.

**The honesty rule, and the test that holds it.** Every drawn object on the
globe is either a plaque — a typed reference to one field of one authored
record, rendered verbatim, no sub-sentences — or a decoration, which carries
no fact and is labelled `no plaque · decoration` in its own accessible name.
`tests/lib/worlds.test.ts` enforces the distinction string-for-string: a
plaque whose text is not `===` a string the content layer produces fails, and
the fix is always the reference or the authored field, never the assertion.

#### The measurement

Both ends measured **today, on this machine, with the same script**: a
detached worktree at `61bef53` (the commit before this plan's first change)
and one at `f794749` (HEAD), each built and served from its own directory so
nothing shared a `.next`. Seven `pnpm perf` runs in all, **zero skipped
responses in every one**.

**The headline is the delta, not the absolute:**

| | Before (`61bef53`) | After (`f794749`) | Δ |
|---|---|---|---|
| **Initial JS** — `pnpm perf`, `request.sizes()` | 188.1 KB | 192.2 KB | **+4.1 KB** |
| **Initial JS** — CDP `encodedDataLength` (out of band — see below) | 192.2 KB | 196.3 KB | **+4.1 KB** |
| Initial script responses | 11 | 11 | 0 |
| CSS | 13.5 KB | 13.9 KB | +0.4 KB |
| Fonts | 331.4 KB | 372.0 KB | **+40.6 KB** |
| Font responses | 5 | 8 | +3 |
| LCP | 2928–4676 ms | 3520–4464 ms | within noise |
| TBT | 389–863 ms | 375–1087 ms | within noise |
| CLS | 0 | 0 | 0 |
| DOM nodes | 3,325 | 3,764 | +439 |

**Two methods, one answer — but only one of them is `pnpm perf`.** `pnpm perf`
sums `request.sizes().responseBodySize`, and prints a second column summing
the `content-length` header (`scripts/perf.mjs`). The `encodedDataLength` row
above came from a **separate, out-of-band CDP session** driven by hand for
this comparison; the string `encodedDataLength` appears nowhere in this
repository, and nothing in `README.md`'s `pnpm perf` recipe reproduces that
row. Re-measuring it means attaching to `Network.loadingFinished` yourself.
The two numbers differ by a constant 4.1 KB at both ends — eleven responses'
worth of response headers, which `encodedDataLength` counts and
`responseBodySize` does not — and they agree on the delta **exactly**. The
tracker's recorded 188.2 KB also reproduced today at 188.1 KB, so that row was
sound.

**The 223.0 KB figure is reconciled, and it was never a discrepancy.** A
parallel pass put this branch at 223.0 KB against the tracker's 188.2 KB. It
was measuring a different thing: scroll the page until `#worlds` is within
200px of the viewport and the globe's `import()` fires, adding **27.3 KB in
two chunks** (22.9 + 4.4). 196.3 + 27.3 = **223.6 KB**. That is the cost of
the globe *once a visitor scrolls to it*, which is exactly what the lazy load
is for — and it is not in the initial bundle. Verified by name: no
`GlobeCanvas` or coastline chunk appears among the 11 initial scripts, at
either commit.

**A third-party note on the `content-length` cross-check:** it does not work
for scripts here. `next start` sends JS and CSS chunked, with no
`Content-Length` header at all, so that column reads 0.0 KB for both and is
only meaningful for fonts (where it matched to the byte: 372.0 KB). `pnpm perf`
prints it anyway, labelled as a floor, because a silent zero is worse than a
stated one.

**Fonts moved, and that is the one number worth arguing about.** +40.6 KB and
three extra font files, against a line this table already flags as the
single largest remaining win. The likeliest cause is the Vietnamese
`unicode-range` subsets: this round is the first to put "Kiên Giang", "Việt
Nam" and "cơm tấm" on the page, and a subset is only fetched once a glyph in
its range is used. Not investigated further here, and **not** something the
globe's chunk can be blamed for — it is a consequence of the content, not the
canvas. Worth its own look before the Newsreader-italic decision is taken.

**Two things that make "the lazy chunk does not touch the initial bundle" a
per-build claim rather than a guarantee:**

- **Next 16 dropped `First Load JS` from `next build` output**, as inaccurate
  for RSC. There is no build-time number to read any more, which is why
  `pnpm perf` exists and why this table is the only record.
- **Turbopack merges chunks under 50 KB uncompressed.** An `import()` is a
  request for a separate chunk, not a promise of one. Whether `GlobeCanvas`
  and its 53 KB of coastline stayed out has to be checked per build, by name,
  in the network log — which is what the check above does.

LCP is still anchored to the hero's intro paragraph (`P.mt-6.max-w-[56ch]`) at
both commits, so the "nothing new on the first screen" rule held: both new
sections are below the fold at 412×823.

#### Three mockup strings that did not survive contact with the rule

1. *The landing announcement.* The mockup's sr-only line said "A seed dropped
   at the arrival pin, and the career tree grows from that spot." Nothing drew
   a seed. It became "The flight landed in the United States." (`8e3fd7b`) and
   grew back to the fuller sentence only once `c004c1f` actually drew the
   seed. The region is sr-only, so the only people who would ever have
   received the false half were the ones who could not see that nothing was
   there.
2. *The United States world's decorations.* The mockup drew a mug and a
   library. Nobody had authored either, so the world ships with
   `decorations: []` and no `disclosure` — the recorded reason is the code
   comment beside it in `src/content/worlds.ts`, not a line on the page. The
   sentence "One object so far, and he named it himself. Nothing here was
   invented to fill the space." belongs to **Việt Nam**, which has one
   decoration and bounds the claim about it. Same instinct, two different
   mechanisms, and neither world states the other's.
3. *The Workshop's intro.* It claimed every line below was quoted from the
   project's own write-up. It is not: each step's label and detail are the
   loop's own method text, and on four of the five runs a station carries the
   gap sentence instead. It now says every piece of *evidence* is quoted,
   which is true (`9502cbd`), and the plan's own copy was narrowed to match so
   no implementer would transcribe the old claim back in (`7198972`).

#### Still open, both carried over from the spec, neither blocking

- **The four rewritten strings still need Thien's approval.**
  `labPositioning`, `labIntro[0]`, `labLiveNotice` and `heroAskCaption` in
  `src/content/ai-experiments.ts` were authored when the chat lived in the AI
  Workflow Lab and still describe "the chat box below". All four are
  unrendered — grep across `src/` finds no consumer of any of them — so
  nothing false reaches the page today, which is why this is a decision
  waiting on him rather than a defect.
- **The Workshop's `test` station is empty for four of five projects.** Only
  `dd-feasibility-agent` authors `whatFailed`. This no longer needs content:
  the station stays on screen and says *which field* is missing, so the gap is
  checkable against the case study. Four runs in five show it, which makes the
  disclosure the normal case rather than an apology. Authoring `whatFailed`
  for the other four is available as an improvement, not a fix.

### Outstanding: WCAG AA clearance regression on deep jumps to Contact

Round 15's "the follower trails the lead on long walks" fixed the
transit-crossing case (two independently-walking cats) but did not cover
every shape of jump, and the round-16 branch review found a live gap in
`trailBehind` (companion-motion.ts) rather than in anything this round
touched:

- A single deep jump straight to `#contact-heading` — reachable from the
  nav, the tour, or a bare URL fragment — measures **19.0px** of clearance
  between the follower and the toggle, below the 24px WCAG 2.5.8 target-size
  floor. **Confirmed pre-existing**: the same measurement, taken the same
  way, reproduces on unmodified `main`, so this is not something round 16
  introduced.
- A compound jump (landing somewhere and re-triggering a second walk before
  the first settles) measures **−45px** — real overlap, not just under the
  floor. This number is **unverified against `main`**; only the single-jump
  figure above has been cross-checked.

Recorded live as `test.fixme("the follower stays clear of the toggle during
a deep single jump to Contact", ...)` in `e2e/companion.spec.ts`, immediately
after the walk-back clearance test, so the defect survives in the tree
rather than only in a task report. Fixing `trailBehind`'s clamping for large
or back-to-back jumps is out of scope for this round (content removal) and
is not attempted here.

### The pinned stage at 412x823, where the pin is inert (round 18, Task 11)

**Read the title literally.** Every rule that makes the pin a pin — `position:
sticky`, the camera transform, the unborn-height transition, the six
`data-through` rules, the branch opacity transition — sits inside
`@media screen and (min-width: 80rem) and (prefers-reduced-motion:
no-preference)` (`src/app/globals.css:1983`), and `scripts/perf.mjs:24` runs a
**412 x 823** viewport. 80rem is 1280px, so none of it matched: nothing was
pinned, nothing transitioned, and the six new rules never applied. The numbers
below are real and the sizes are the point of the row, but **the pin's own
runtime cost is not measured here at all** — the title said it was, which is
why the title changed. The +0.5 KB of CSS is roughly 2.5 ms of parse on this
pipe.

Measured with `pnpm perf`'s script against two production builds served from
their own directories (`:3142` the commit before the task, `96221c6`;
`:3141` the stage with its drawing server-rendered), three runs each,
interleaved. **Zero skipped responses in every run.** The machine's
`chromium_headless_shell-1243` was not installed, so the script was run
unmodified except for pointing `launch()` at the installed
`chromium_headless_shell-1234`; sizes are what the row is about, and they do
not depend on the browser build.

| | Before (`96221c6`) | After | Δ |
|---|---|---|---|
| **Initial JS** — `pnpm perf`, `request.sizes()` | 200.7 KB | 199.4 KB | **−1.3 KB** |
| CSS | 14.1 KB | 14.6 KB | +0.5 KB |
| Fonts | 223.8 KB | 223.8 KB | 0 |
| DOM nodes | 4,270 | 4,302 | +32 |
| CLS | 0 | 0 | 0 |
| LCP (3 runs) | 3324 / 4520 / 4848 ms | 5348 / 5156 / 5604 ms | see below |
| TBT (3 runs) | 519 / 717 / 584 ms | 1331 / 1155 / 659 ms | see below |
| LCP element | `P.mt-6.max-w-[56ch]` — the hero intro (this build re-measured in Task 14, below) | not re-measured at this commit; its successor names the same element (below) | none |

Initial JS did not move: the stage is a client component, but it is handed the
drawing, the list, the credentials strip and the case-study prose as slots by
`CareerTree` (a Server Component), so none of that ships as JavaScript. The
stage's own module measures 3.9 KB raw / 1.7 KB gz inside the chunk it shares
with other client code. A first version that imported the drawing directly put
a 17 KB gz chunk in the initial scripts; that was the leak this row exists to
catch.

**LCP and TBT were higher in all three pairs after the change**, and this table
does not explain why.

**The LCP element line was blank on purpose, and Task 14 filled it** — see the
next section. This file's convention is to name
the selector per build (line 1062 names `P.mt-6.max-w-[56ch]`), and the task
report for these runs says only "the LCP element is the hero paragraph" without
distinguishing the two builds. The per-run output was not kept and `pnpm perf`
is deliberately not re-run in the fix round that wrote this paragraph, so the
honest entry is "not recorded", not a selector copied from a sentence that did
not claim to be per-build. **If the selector turns out to differ between the two
builds, the delta is an artefact and this question closes for free** — that is
the first thing to check when it is next measured.

What is known: every pin rule was inert at this viewport (see the heading note),
so the delta cannot be the pin's own work; the "Read the LCP and TBT columns on
these two rows against each other" note earlier in this file records the *same
build* re-measured back to back at 4212–5524 ms LCP against its own earlier
3416–3636 ms — non-overlapping ranges with no code change at all — and the delta
here is that shape and that size. Treated as unresolved rather
than explained away.

**The re-measurement belongs to Task 14, not here**, and it needs a matched
same-build control arm. It also has to wait for Task 12: `src/app/page.tsx:55`
and `:57` both render the case-study prose today, so anything timed against this
tree is timing a page with the same prose on it twice.

### Round 18 close: the re-measurement, with a same-build control (Task 14)

The Task 11 row above left two questions open: which element LCP named in each
build, and whether the stage's LCP/TBT rise was the stage or the session. This
measures both arms **in one session, interleaved** — test, control, test,
control, test, control — so whatever the machine was doing applied to both.

- **Test:** `370706c`, the end of round 18's Plan A — four sections, the
  duplicated case-study prose gone (Task 12), and the retired tree figure
  deleted (Task 14). Every commit after `68f2df1` touches only comments,
  unit tests or e2e specs, so the shipped code is `68f2df1`'s.
- **Control:** `96221c6`, the same "Before" build the Task 11 row used.

Both built from clean detached worktrees with `pnpm build` (no `VERCEL_ENV`, so
analytics off in both) and served with `pnpm start` on their own ports.
`scripts/perf.mjs` run unmodified except for pointing `launch()` at the
installed `chromium_headless_shell-1234`. **Zero skipped responses in all six
runs.** 412 × 823, so — as in the row above — the pin is inert and its own
runtime cost is still not what this measures.

| | Control (`96221c6`) | Test (`370706c`) | Δ |
|---|---|---|---|
| **Initial JS** — `request.sizes()` | 200.7 KB (all three runs) | 197.4 KB (all three runs) | **−3.3 KB** |
| CSS | 14.1 KB | 14.0 KB | −0.1 KB |
| Fonts | 223.8 KB | 223.8 KB | 0 |
| DOM nodes | 4,269 | 3,138 | **−1,131** |
| CLS | 0 | 0 | 0 |
| LCP (runs 1 / 2 / 3) | 5208 / 4716 / 5056 ms | 7136 / 3924 / 4660 ms | overlapping |
| TBT (runs 1 / 2 / 3) | 1257 / 986 / 1031 ms | 488 / 508 / 606 ms | lower in all three pairs |
| LCP element (every run) | `P#.mt-6 max-w-[56ch] text-[length` | `P#.mt-6 max-w-[56ch] text-[length` | same |
| Skipped responses | 0 / 0 / 0 | 0 / 0 / 0 | |

**Initial JS fell, it did not leak.** Against the last recorded figure (the
Task 11 row's 199.4 KB "After") the move is −2.0 KB, and against the matched
control −3.3 KB. Which of the round's later commits each byte came from was
not bisected; the direction is the point — the leak this check exists to catch adds
bytes. Checked by content, not by total: the coastline data (identified by a
coordinate run from `coastline-data.ts`) lives in one ~61 KB chunk that none of
the test build's 12 initial `<script>` tags names.

**The LCP question narrows; it does not fully close.** Both builds measured
here name the same LCP element in every run — the hero's intro paragraph. That
settles the selector for the Task 11 row's *Before* build (`96221c6`, the
control here), but the Task 11 *After* build was never re-measured, so whether
*its* LCP element differed is still unknown, and "the delta was not a selector
artefact" cannot be claimed for that row. What this row does show: the end of
Plan A names the same element as the pre-stage build, and with a matched
control in the same session the two arms' LCP ranges overlap (one test run is
the slowest of the six, one the fastest), so there is no LCP signal in either
direction between them. TBT is lower for the test build in all three pairs, consistent with
1,131 fewer DOM nodes to hydrate around; it is reported, not claimed as a
target.

**Machine state, said out loud:** a node process from another session (PID
4292, started 2026-09-30, >125,000 s of CPU) held a core throughout. It was
there for both arms equally, which is what interleaving is for, and it is why
absolute times here should not be compared with rows above this one.

### Companion explorers (2026-10-02)

The cats now explore the whole page while the reader is active, Moon on the
left and Mi on the right, and nap where they stop after 20 s (17 s at night)
with no input.
The pointer chase only fires within 200 px of the lead. Every line is now 32
characters or fewer, and most beats draw a small line icon in the bubble; about
half also play an action (`bat`, `groom`, `stretch`, `eat`, `sleep`, or the new
CSS `hop`). Spec: `docs/superpowers/specs/2026-10-02-companion-explorers-design.md`.
The companion ships in the initial bundle, so this row checks that against the
spec's budget, which is initial JS ≤ 3 KB gz over the plan's base.

Measured with `pnpm perf`'s script against three production builds, each in
its own detached worktree and served with `next start` on its own port.
`:3151` was the plan's base `ac35d1a`. `:3152` was `e9f60da`, after the icons
and acts but before the explorers. `:3153` was the branch head `c32ade6`. The
runs were interleaved (base, mid, head, three times). The script was run
unmodified except that `launch()` pointed at the installed
`chromium_headless_shell-1234`. **Zero skipped responses in all nine runs.**
`pnpm perf` measures at 412 × 823 touch, so the cats are parked here and the
explorers' runtime cost is not what this row measures. What it does measure is
the bytes.

| | Base (`ac35d1a`) | Mid (`e9f60da`) | Head (`c32ade6`) | Δ head − base |
|---|---|---|---|---|
| **Initial JS**, `request.sizes()` | 197.7 KB (all three runs) | 198.8 KB (all three runs) | 198.1 KB (all three runs) | **+0.4 KB** (+385 B) |
| CSS | 14.0 KB | 14.1 KB | 14.0 KB | +31 B |
| Fonts | 223.8 KB | 223.8 KB | 223.8 KB | 0 |
| DOM nodes | 3,138 | 3,138 | 3,138 | 0 |
| CLS | 0 | 0 | 0 | 0 |
| LCP (runs 1 / 2 / 3) | 3104 / 2984 / 3172 ms | 4464 / 3300 / 2396 ms | 3588 / 2696 / 4344 ms | overlapping |
| TBT (runs 1 / 2 / 3) | 802 / 469 / 1018 ms | 864 / 972 / 413 ms | 491 / 1292 / 671 ms | overlapping |
| LCP element (every run) | `P#.mt-6 max-w-[56ch] text-[length` | same | same | same |
| Skipped responses | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | |

**Within budget: +0.4 KB against a 3 KB allowance.** The mid arm splits the
delta. The icons and acts (Tasks 1–2) cost **+1.1 KB** (+1,122 B), inside the
review's estimate of 1–1.5 KB. The explorers (Tasks 3–4) then took **−0.7 KB**
back (−737 B), because they deleted more than they added: the wander candidate
pool, the idle bed furniture and its kick/shove, and `BED_WAKE_TRAVEL`. A
second method gave the same deltas to the byte. I summed the gzipped bodies of
each build's 12 initial `<script>` tags straight off the servers and got
238,175 / 239,297 / 238,560 B. Exactly one chunk name differs between base and
head, and that is the chunk holding the companion. The `content-length`
cross-check is not informative here: `next start` streams these responses
compressed with no `content-length`, so it reads 0.4 KB of JS in every run
(16 responses declared none) for all three arms.

LCP and TBT ranges overlap across all three arms, and every run names the same
LCP element. That is no signal in either direction, which fits with zero DOM
nodes added at this viewport.

**Machine state:** the other session's node process (PID 4292) was still
running. It affected all three arms equally.

**Browser check, both themes** (a throwaway Playwright script against `:3153`;
screenshots are in the plan's workspace under `task-5-shots/`). At 1440 × 900
with a fine pointer, by day and by night:

- **Bubble with icon.** Mi gave the hello duet's first beat with a heart icon,
  and mini-Thien carried "A visitor! Pet me? Pet me!".
- **Exploring.** Two moments were captured in `#worlds` while the pointer kept
  moving far from both cats. In both, Moon was in the left half and Mi in the
  right half, both walking.
- **Hop.** Mi was caught mid-hop in the Journey's scene, 3.9 px (day) and
  4.5 px (night) off the ground, with a branch icon and "11 branches! Climbing
  all!".
- **Nap.** Both asleep away from the corner, no bed drawn, 21.6 s (day) and
  20.6 s (night) after the last input.

At 390 × 844 with touch, the pair stayed parked together bottom-right, with no
bubble, no caption and no Thien, at the top of the page and in `#worlds`, in
both themes.

**Full e2e** against a production build of `c32ade6` at `--workers=2`:
**548 passed, 6 failed, 538 skipped** (1,092 total). All six failures are one
test, `worlds.spec.ts:7` ("every world, plaque and source is reachable with the
canvas chunk blocked"), once per viewport. It fails identically against the
plan's base `ac35d1a` built the same way, and again on a re-run at
`--workers=2`. The cause is in the test itself: its route pattern matches only
dev-server chunk names, and a production build hashes the name, so nothing is
aborted. This branch did not cause it. Every companion test passed.

### The chat moves to Contact (2026-10-04, round 18 Plan B, Task 7)

The chat left the hero's fourth tab for Contact's `#ask`. The lazy boundary
moved with it: `AskLoader.tsx` imports only React and fires the `import()` of
`AskThisSite` when `#ask` comes within 600px of the viewport, so the engine
and its index stay out of the initial bundle. The same change also touches
`Stage.tsx` (initial JS: a fragment below the stage is re-landed once the pin
goes live) and globals.css (the slot's reserved height). Two production
builds measured alternately with a throwaway copy of `scripts/perf.mjs` (only
change: the pinned `chromium_headless_shell-1234` path), `:3101` = `194e35d`,
`:3102` = this change, final build:

| When | JS | CSS | Fonts | LCP | TBT | CLS | DOM nodes |
|---|---|---|---|---|---|---|---|
| Before, `194e35d` (3 runs) | 197.8 KB | 14.0 KB | 223.8 KB | 2540–2832 ms | 652–897 ms | 0 | 3171 |
| After, chat in Contact (3 runs) | 198.0 KB | 14.0 KB | 223.8 KB | 2728–3584 ms | 435–789 ms | 0 | 3175 |
| After fix round 1: `--ask-room`, Stage landing gate (3 runs) | 198.1 KB | 14.0 KB | 223.8 KB | 2740–2800 ms | 351–850 ms | 0 | 3175 |

Initial JS: 202,584 → 202,744 bytes (**+160 B**), and 202,822 B (**+238 B**)
after fix round 1. That arm was measured on its own and compared with the
byte count of the `194e35d` build measured earlier the same day: bytes are
fixed per build, and its timings are not compared. Every run reported 0
responses with no `sizes()`. DOM nodes are +4 net: the `#ask` block in, the
hero's fourth tab out. The LCP and TBT ranges overlap between the arms and
are read as noise. The `content-length` cross-check is not usable on this
server: 16 responses declared none, so it is a floor of 0.4 KB JS, not a
total.

### The living Earth, measured (2026-10-05, round 18 Plan C, Task 11)

Plan C put a hand-written WebGL2 surface (`src/sections/Worlds/gl/`) under the
globe's Canvas 2D overlay, with the shipped 2D globe as the fallback. One
production build of `3b1ac4c` served on `:3111`, measured with a throwaway copy
of `scripts/perf.mjs` (only change: the pinned `chromium_headless_shell-1234`
path), against `main` at `71e3638` measured the same way (202,734 B):

| When | JS | CSS | Fonts | LCP | TBT | CLS | DOM nodes |
|---|---|---|---|---|---|---|---|
| Before, `main` `71e3638` (initial JS only) | 198.0 KB | not re-measured | not re-measured | not re-measured | not re-measured | not re-measured | not re-measured |
| After, Plan C (3 runs) | 199.9 KB | 14.0 KB | 223.8 KB | 3236–4260 ms | 422–977 ms | 0 | 3187 |
| After the final fix wave (3 runs) | 199.5 KB | 14.0 KB | 223.8 KB | 3464–4008 ms | 257–686 ms | 0 | 3188 |

Initial JS: 202,734 → 204,678 bytes (**+1,944 B**, inside Plan C's +1–2 KB
budget). All three runs reported 0 responses with no `sizes()` and an identical
byte count, which is fixed per build. LCP and TBT spread widely between runs
and are not compared with the earlier rows. The `content-length` cross-check is
still a floor (16 responses declare none): 0.4 KB JS.

**Content check.** Of the 12 scripts the page loads initially, none contains
`#version 300 es`, a run of twelve consecutive decimal coordinates, or the skins' `draws`
strings. All of them are in one lazy chunk (78,728 B raw; 29,353 B with
Python's default gzip, not `pnpm perf`'s measure), which the page reaches only
through `WorldsStage.tsx`'s `import()`.

**Full e2e** against that build at `--workers=2`: 709 passed, 1 failed, 736
skipped. The failure was `worlds.spec.ts:548` ("a drag rolls the planet and
then stops") at 768 px, once; re-run alone it passed at all six viewports.

**After the final fix wave** (round 18 Plan C, same method: one production
build served on `:3112`, a throwaway `scripts/perf.mjs` copy pointed at
`chromium_headless_shell-1234`): initial JS 204,258 B, which is **+1,524 B**
over `main`'s 202,734 B and −420 B against the Plan C row above. The trims
were `ProjectRecording` dropping the shared `Button` (and with it
`ExternalLink`) plus its reduced-motion subscription, and `WorldsStage`
showing the robot's lap toggle by CSS instead of a reduced-motion hook. All
three runs reported 0 responses with no `sizes()` and the same byte count;
the `content-length` cross-check is still a 0.4 KB floor. None of the 12
initial scripts contains `#version 300 es`. DOM nodes went 3187 → 3188; the
one node was not traced.
Full e2e at `--workers=2`: 715 passed, 1 failed, 736 skipped. The failure was
`worlds.spec.ts` "opening Technology walks it once" at 1440 px (60 overlay
draws in 2 s against a floor of more than 60, a frame-rate threshold under
load); re-run alone, 18 of 18 passed (`--repeat-each=3`, six viewports).

### The crossing replays, measured (2026-10-05, round 18 Plan D, Task 4)

The crossing now replays while the globe is watched (fly, land, hold 5 s,
reset, fly), with a "Stop the replay" state on the flight button. One
production build of the Task 4 working tree on `:3134`, a throwaway
`scripts/perf.mjs` copy pointed at `chromium_headless_shell-1234`, 3 runs:

| When | JS | CSS | Fonts | LCP | TBT | CLS | DOM nodes |
|---|---|---|---|---|---|---|---|
| After Plan D Task 4 (3 runs) | 199.8 KB | 14.0 KB | 223.8 KB | 2440–3024 ms | 335–642 ms | 0 | 3189 |

Initial JS 204,592 B in all three runs, 0 skipped responses: **+334 B** over
the final-fix-wave row's 204,258 B. That delta also carries Plan D Tasks 1–3,
which were not measured on their own. DOM nodes 3188 → 3189, not traced. The
`content-length` cross-check is still a 0.4 KB floor (16 responses declare
none).
Full e2e against that build at `--workers=2`: 738 passed, 2 failed, 736
skipped. Both failures were `contact.spec.ts` "the whole page has one blue
fill" at 320 and 375 px: the globe chunk was never fetched, because the test
scrolled the section's top into view and left the stage outside the import
observer's margin. Fixed in this commit by scrolling the stage; after the fix
`contact.spec.ts` passed 71 of 71 at all six viewports.

**Fix round 1** (same method, same port): initial JS **204,636 B** in all three
runs, 0 skipped. That is +44 B over the first Task 4 build and +378 B over
204,258 B. LCP 2436–2472 ms, TBT 402–556 ms, CLS 0. DOM nodes 3189 → 3190: the
career-tree line now hides a `<span>` inside its `<p>` instead of the `<p>`
itself. The four affected specs (worlds, axe, contact, companion) passed at
`--workers=2` across all six viewports: 419 passed, 0 failed, 499 skipped.

**Fix rounds 2 and 3** (same method, same port): initial JS **204,910 B** in all
three runs, 0 skipped. That is +274 B over fix round 1 (204,636 B) and **+652 B
over 204,258 B**. The new code is the press handlers (tap, globe drag or
scroll), their window listeners, and the shared `gestures.ts` constant. LCP
2640–2820 ms, TBT 258–564 ms, CLS 0, DOM nodes 3190. `worlds.spec.ts` at
`--workers=2`, six viewports: 240 passed, 0 failed.

**Plan D Task 5** (Moon and Sun over the robot's laps; same method, same port,
`pnpm perf` three runs): initial JS **205,035 B** in all three, 0 skipped. That
is +125 B over fix rounds 2 and 3 (204,910 B) and **+777 B over 204,258 B**:
two glyph paths in `glyphs.ts` (initial bundle through `WorldPanel`), two
decoration strings, and `robotSky`. LCP 2472–2708 ms, TBT 295–659 ms, CLS 0,
DOM nodes 3190. `worlds`, `axe` and `companion` specs at `--workers=2`, six
viewports: 366 passed, 0 failed, 480 skipped.

**Plan D Task 6** (canvas labels measured over the pale skins; residual H4).
Until now label contrast under the pale Night side and Volcanic skins was
checked by eye. `worlds.spec.ts` "canvas labels under every skin" now measures
it, for the labels of the Living Earth pose only (the open chapter's name and
the two cat names; other chapters' labels are not probed): for each of the five skins in both themes, with Living Earth open, it
redraws the overlay three times at rest (as drawn, halos off, words off),
takes the letters as the pixels the words changed, and reads the contrast of
each label's ink against the one-pixel ring touching them in the composited
bitmap. It fails below 4.5:1 at the label's 5th percentile.

It found a real failure. At the shipped `HALO_PX = 3.5` every skin fails in at
least one theme, always on the open "LIVING EARTH" label. Worst of the six
viewports, per skin, day / night: Ice Age 4.73 / 1.78, Night side 2.62 / 4.55,
Volcanic 2.71 / 2.92, Underwater 4.21 / 4.98, Desert 4.68 / 1.67. So the Night
side and Volcanic glow the brief worried about do fail, and so do the pale Ice
Age and Desert planets. `HALO_PX = 4.5` still left 3.88 on Desert at night, so
`HALO_PX = 5` is the smallest tried value that held across repeated runs (4.75
passed once and was not kept as too thin a margin). Halo off (`HALO_PX = 0`)
fails the probe on every skin (1.0:1 to 3.9:1, "LIVING EARTH"). Worst of the
six viewports at `HALO_PX = 5`, per skin:

| Skin | Day | Night |
| --- | --- | --- |
| Ice Age | 4.74 | 4.98 |
| Night side | 4.74 | 4.98 |
| Volcanic | 4.74 | 4.98 |
| Underwater | 4.74 | 4.98 |
| Desert | 4.74 | 4.98 |

Those figures are the ceiling, not a squeak: they are the two cat names' muted
ink against `--ground` itself, which is what a fully haloed ring measures. The
cats are hidden for the shots (DOM, they may walk across the stage). The halo
at 5 px does not reach the neighbouring marker discs (checked at 1440, night,
Desert). Initial JS is unchanged at **205,035 B** in all three `pnpm perf`
runs, 0 skipped (a constant, no new code in the bundle); LCP 2628-2812 ms,
TBT 281-708 ms, CLS 0, DOM nodes 3190.

### The hero says each thing once, and is shorter (2026-10-06, round 18 Plan D, Task 7)

The rail drops "Now" and "Based" (the positioning line and the first About
paragraph already say both) and the hero's padding and gaps tighten. One
production build on `:3137`, reduced motion, `document.fonts.ready`. Height of
`#about`:

| Hero height | 1440×900 | 390×844 |
|---|---|---|
| Before (`80d0a13`) | 1138 px | 1836 px |
| After | 1074 px | 1671 px |
| Brief's target | 1034 px | 1649 px |

The 22 px / 40 px shortfall against the target is the top padding, kept at 1x.
At 390 px, 0.6x top padding moved the seam between the last About paragraph and
the code artifact up 22 px, so the cats' load-time resting spot there left a cat
with its head on the paragraph (`companion.spec.ts` "neither cat comes to rest on
the hero's text", failed 3 of 3 alone at `gap-y-10` and at `gap-y-12`; the
`80d0a13` build passed 4 of 4). Restoring the top padding passes it. At 1440 the
same padding costs 40 px.

`pnpm perf` x3 against that build: initial JS **205,035 B**, 0 skipped
responses, CLS 0, DOM nodes 3184 (was 3189 after Task 4), LCP 2396-2456 ms,
TBT 325-355 ms. No JS changed; the delta from Task 4's 204,636 B is not from
this task.

### Plan D close-out (2026-10-06, round 18 Plan D, Task 11)

**Owner decisions in Plan D.**
- Location leaves the hero rail, because the prose already says it (spec §4 note).
- Skins are drawn in ink and paper only; the hue words in the spec describe intent (§5.3 note). A grep of `CLAUDE.md`, `README.md`, `docs/editing.md`, `src/content/skins.ts`, `src/lib/skins.ts` and `src/sections/Worlds/gl/shaders.ts` finds no skin hue described outside the spec.
- The crossing replays while the stage is in view and stops on deliberate interaction or "Stop the replay" (§5.5 note).
- Recordings sit outside the disclosure, above the action row, and on the credentials strip for Food Route and MentorHub; each carries a `recordingDescription` (§6.4 note). The MentorHub recording was gated on owner approval (privacy); it shipped on 2026-10-09 (see the consent note below).
- The résumé PDF is now the file the owner attached (below). The booking link reads "Book a call", not "Book twenty minutes", because the event length is unverified and a label without a duration is always true.
- The robot's full circle runs under a Moon over the dark lap and a Sun over the lit one (Technology; both are decorations, no plaque).
- One blue control per page: Contact's send is the only blue fill. "Get in touch" and the flight button are demoted to the plain recipe (`e2e/contact.spec.ts` "the whole page has one blue fill").
- The hero is shorter, and "Now" is dropped from the rail along with location; the positioning line and the Kiên Giang paragraph carry what they said.
- **Food Route ships trimmed, and the trim is a privacy fix.** The source GIF's first three frames (0 to 0.2 s) show a sign-in form with an email address. `public/media/foodroute.mp4` is cut with `-ss 0.3`. The exact command, which reproduces the shipped file byte for byte (289,730 B, 604x568, 22.7 s) from `D:/Project/Portfolio-v2/src/assets/experience/foodroute.gif` with ffmpeg 7.1:

  ```
  ffmpeg -ss 0.3 -i foodroute.gif -c:v libx264 -crf 30 -preset slow -pix_fmt yuv420p -an -movflags +faststart foodroute.mp4
  ffmpeg -i foodroute.mp4 -vframes 1 -q:v 4 foodroute.jpg
  ```

  A re-encode without `-ss 0.3` puts the email frame back. The poster is frame 0 of the trimmed mp4.

- **MentorHub ships whole and unedited, by owner consent (2026-10-09).** The owner reviewed the clip and approved every item: the teammates on About Us and Aarsh Patel on the Mentors list agreed to be shown, `thien@gmail.com` in the login is fake, and the browser's "password found in a data breach" popup and the dashboard details may be shown as is. No trim, blur or crop. `public/media/mentorhub.mp4` is 385,641 B, 1280x720, 15.37 s, from `D:/Project/Portfolio-v2/src/assets/experience/mentorhub.mp4` (1920x1080, pillarboxed) with ffmpeg 7.1; crf 30 was under the 1.5 MB ceiling, so nothing was raised or cut. The poster is a 0.2 s frame (the Welcome page) of the shipped mp4:

  ```
  ffmpeg -i mentorhub.mp4 -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 30 -preset slow -an -movflags +faststart -vf "scale='min(1280,iw)':-2" public/media/mentorhub.mp4
  ffmpeg -ss 0.2 -i public/media/mentorhub.mp4 -vframes 1 -vf "scale='min(1280,iw)':-2" -q:v 5 public/media/mentorhub.jpg
  ```

**G3, before and after.** Canvas-label contrast under the five skins was checked by eye; `worlds.spec.ts` "canvas labels under every skin" now measures it (Task 6). At `HALO_PX = 3.5` every skin failed in at least one theme (worst 1.67:1, Desert at night). At `HALO_PX = 5` the worst measured is 4.74 day / 4.98 night on every skin.

**H4.** Minima are the 4.74 / 4.98 figures in Task 6's table above: the two cat names' muted ink against `--ground`, which is what a fully haloed ring measures.

**G4: the résumé PDF's two $2.8M bullets.** `public/thien-le-resume.pdf` is now `Thien_Le_Software_Engineering_Resume.pdf` from the owner's Downloads (1 page, 135,831 B; was 135,813 B). `pdftotext -layout` shows the text differs from the previously shipped file in two places only: the scraper bullet now reads "cut runtime from 17 hours to 3 minutes" (it wrapped onto the next line), and the heading "PROJECT" became "PROJECTS". It contains "2.8M" and no phone number (the header carries email, LinkedIn and GitHub only). It still has two differently worded $2.8M bullets (lines 21 and 23 of the text):
- "Automated eight-stage SKU governance process with one run, restoring SKUs that generated $2.8M cumulative GOV"
- "Built a monthly 8-stage SKU governance pipeline, protecting $2.8M in sales and freeing capacity for new selection"

These are the owner's to fix. `/resume` renders `impact` only and carries one $2.8M line (`portfolio.ts:289`), so the route does not duplicate it. The route and the PDF now differ in wording, not in fact: the scraper line reads "runtime 17 hours to 3 minutes" on the route and "cut runtime from 17 hours to 3 minutes" in the PDF, and the SKU line differs as quoted above.

**G5: `BOOKING_URL`.** It is unset in `.env.example` and the booking control renders nothing until a URL is supplied (`src/lib/booking.ts`); the production HTML was checked and contains no "Book a call". The owner's URL, https://cal.com/thien-le/say-hi-meeting, returned HTTP 200 and still has to be set in Vercel (it is read at build time, so a redeploy follows).

**Perf, whole branch.** One production build of the Task 11 tree on `:3141`, a throwaway copy of `scripts/perf.mjs` pointed at `chromium_headless_shell-1234`, 3 runs:

| When | JS | CSS | Fonts | LCP | TBT | CLS | DOM nodes |
|---|---|---|---|---|---|---|---|
| After Plan D (3 runs) | 200.6 KB | 14.1 KB | 223.8 KB | 2412-2452 ms | 334-389 ms | 0 | 3191 |

Initial JS 205,415 B in all three runs, 0 skipped responses. That is **+1,157 B** over the pre-Plan-D 204,258 B and +2,681 B over `main`'s 202,734 B before Plan C. The `content-length` cross-check is still a 0.4 KB floor (16 responses declare none). None of the 12 initial scripts contains `#version 300 es`.

**Verification.** `pnpm verify`: 5/5 (937 unit tests, 51 files). Full e2e against the production build at `--workers=2`: 788 passed, 0 failed, 736 skipped (no re-runs needed).

### Plan D final fix wave (2026-10-06)

**Browser pass, both themes (the check Task 11 skipped).** Production build served on `:3142`, the headless shell at 1440×900, `localStorage.theme` set to `day` then `night` (the `<html data-theme>` read back as set). Screenshots `fw-{day,night}-*.png` in the SDD folder: hero, full page, Worlds mid-replay (button reads "Stop the replay"), Worlds after the press (reads "Take the flight"), Technology under reduced motion with the Moon (Unsupervised) and the Sun (Human in the loop), a case study before and after its recording is pressed (one `<video>` mounted, caption kept), Food Route's credentials line before and after, and Contact. No page errors, no console errors, no horizontal overflow in either theme.

What was seen:
- Both themes: the Moon is a thin crescent upper left of the globe and the Sun a round disc with rays in the same spot; both read as drawn objects, not text. The halo plate keeps the labels legible on the globe in both themes.
- The play buttons are plain outlined buttons with the caption under them, in both themes. Food Route's 604×568 frame letterboxes inside the 16:9 box (black bars either side), and no sign-in frame or email is visible after the press.
- Contact shows no blue fill before a reason is picked.
- Cats walk over text in several frames (hero rail label "OPEN TO", the Worlds heading, a credentials line). They roam by design, so a screenshot catches them anywhere; not treated as a defect.
- Night, Worlds mid-replay: the satellite glyph sits on the right end of the "LIVING EARTH" label ("EARTH" overprinted). In the day capture the satellite was elsewhere on its orbit. The satellite moves, so this is a passing overlap, but the label is briefly unreadable; unverified whether it recurs every orbit.
- Journey, pinned stage: element and viewport captures taken while an act change was mid-crossfade show two acts' text overlapping (the day-theme case-study capture shows the tree trunk behind "Discuss this project"; a viewport capture shows "Chess and a min-max bot" over the previous act's date line). That is a mid-transition frame; the settled frames are clean. Not investigated further.
- Night, Contact: the copy button's icon on the card is faint against the card. It is the existing control, unchanged in Plan D; not measured.
- Element screenshots of tall sections show the sticky nav stitched into the middle of the image; that is the capture method, not the page.

**Hero measurement.** The code artifact's top on the production build, three runs each: 896 px at 1280×800 and 870 px at 1024×768 (the old comment said 912 and 886; the `gap-y-14` to `gap-y-10` change moved it 16 px). `Hero.tsx` now says so.

**Right-click freeze.** `pressStart` now ignores a `pointerdown` with `button !== 0`, and a control-click on macOS, so a context menu that swallows the `pointerup` no longer leaves the press set (the loop stayed frozen under "Stop the replay"). Two unit tests failed against the old code and pass now.

### MentorHub recording (2026-10-09)

| When | JS | CSS | Fonts | LCP | TBT | CLS | DOM nodes |
|---|---|---|---|---|---|---|---|
| After MentorHub recording (3 runs) | 200.7 KB | 14.1 KB | 223.8 KB | 3164-5084 ms | 740-885 ms | 0 | 3194 |

Production build on `:3151`, a throwaway copy of `scripts/perf.mjs` pointed at `chromium_headless_shell-1234`. Initial JS 205,534 B in all three runs (+119 B over main's 205,415 B: the one description string), 0 skipped responses. LCP and TBT are well above Plan D's 2412-2452 ms / 334-389 ms; the JS, CSS, fonts and DOM nodes that the change could affect are flat, and the mp4 and jpg load only on the press (e2e), so the timing gap is read as machine load (unverified). `pnpm verify` 5/5 (939 unit tests); `sections`, `axe` and `responsive` e2e: 151 passed, 0 failed.

## Round 19 (2026-10-10) — voice rules and a first-person Journey

**Strings.** Every changed visible string is in the plan's table: [`docs/superpowers/plans/2026-10-10-round-19-voice-and-journey.md`](superpowers/plans/2026-10-10-round-19-voice-and-journey.md), "The first-person pass: every changed string". The headlines are traced in [`docs/superpowers/specs/2026-10-10-journey-headline-sources.md`](superpowers/specs/2026-10-10-journey-headline-sources.md).

**Owner checks.**
1. DoorDash headline: the owner's own words, "Reverse engineering scraper: 17 hours to 3 minutes", owner-authored; the fact trace checks the numbers 17 and 3 only.
2. `self-taught-gap.learned`, 3. `cs-switch.context`, 4. `usc-cheme.learned`: the owner will rewrite all three himself. Until his text lands they stay as they are, listed in `PENDING_OWNER_REWRITE` (`tests/lib/voice.test.ts`). **Merge is gated on that allowlist emptying.**

**Retrieval, before and after Task 2** (identical): 30 cases, recall@1 70.0%, recall@3 93.3%, recall@5 96.7%, MRR@10 0.805. Below rank 3, unchanged: "messy or duplicated data" rank 8, "how many retailers has he integrated" rank 5. Floors untouched.

**Leaves (Task 4, confirmed).** Technologies are the only leaves: 53 → 37 authored leaves, 30 distinct technologies. Per branch: usc-scraping 8→5, usc-ta 8→6, usc-honors-ta 4→3, schaeffler 6→4, wordification 9→6, doordash 18→13; the other five drawn entries 0. Rail "Heaviest" reads "Software Engineer · 13 of 37". The Plants plaque reads "11 branches · 37 authored leaves · 30 distinct technologies" in the production HTML.

**Perf.**

| When | JS | CSS | Fonts | LCP | TBT | CLS | DOM nodes |
|---|---|---|---|---|---|---|---|
| After round 19 (3 runs) | 200.9 KB | 14.1 KB | 223.8 KB | 2476-3540 ms | 337-984 ms | 0 | 3156 |

Production build on `:3169`, a throwaway copy of `scripts/perf.mjs` pointed at `chromium_headless_shell-1234`. Initial JS 205,712 B in all three runs, 0 skipped responses: **+178 B** over main's 205,534 B (read as the `preview` prop and the headline markup; not broken down per chunk). None of the initial scripts contains `#version 300 es`. DOM nodes fall 3194 → 3156 (impact lines left the twigs). LCP and TBT spread widely across the three runs on a loaded machine; read as load (unverified).

**Verification.** `pnpm verify`: 5/5 (955 unit tests, 52 files; contrast 31 pairings, lowest 4.66:1). Full e2e against the production build at `--workers=2`: 799 passed, 0 failed, 749 skipped (no re-runs needed). `legacy-anchors.spec.ts` passed in the full run and again alone (19 passed, 5 skipped).

**Browser pass.** Production build, headless shell, reduced motion, 1440×900 and 390×844, day and night, the DoorDash branch at rest and opened (`r19-{1440,390}-{day,night}-{rest,open}.png` in the SDD folder). No page errors in any run; `data-theme` read back as set.
- 1440, at rest: the panel shows "Software Engineer · DoorDash, Inc. 2025" with the headline under it; the thirteen technology leaves hang on the twig below. Schaeffler and Wordification panels below show their headlines too. Same in both themes.
- 1440, opened: "WHAT IT CHANGED" and the five impact lines, then "ROLE · OCTOBER 2025 — PRESENT", "Ran alongside Whatever I felt like learning (No institution)" and the case studies. The panel grows downward and pushes the twig's leaves below it (measured: the leaf column moves from just under the panel to under its new bottom), so the leaves are not visible beside the open panel. Nothing overlaps.
- 390, at rest: title, year, headline and the chips in the list row. Chips on a wrapped row start with their separator rule ("| Playwright", "| Databricks", "| gRPC"), so wrapped rows read indented against the first.
- 390, opened: the chips stay above "WHAT IT CHANGED" and its five lines.
- The cats sit bottom right in every 1440 frame and over the last impact line at 390; they roam by design.

## Round 20 phase 1 (2026-10-10) — speed

**Lag probe.** `pnpm lag` ([`scripts/lag.mjs`](../scripts/lag.mjs)) against a production build on `:3100`: desktop 1440×900, scroll top to bottom at 4x CPU, then unthrottled rest per section (5 s sample), then the first entry to `#worlds` at 4x CPU. The settle before each rest sample was 1 s for the baseline rows and is 10 s from Task 2 on: 1–6 s after the jump to a section the cats are still walking and talking in reaction to that scroll, so the baseline's rest columns include that motion and are not comparable to later rows.

| When | scroll4x fps / drops / worst frame / long tasks | rest busy % (about / worlds / tree / contact) | rAF calls per s (about / worlds / tree / contact) | hit tests per 5 s (about / worlds / tree / contact) | Worlds entry worst task |
|---|---|---|---|---|---|
| R20-P1 baseline (run 1) | 8.0 / 281 / 883 ms / 187 | 6.9 / 49.7 / 8.6 / 16.3 | 60.4 / 72.0 / 60.2 / 60.3 | 30 / 83 / 30 / 1172 | 781 ms |
| R20-P1 baseline (run 2) | 8.7 / 266 / 950 ms / 165 | 7.6 / 48.8 / 9.0 / 15.6 | 60.7 / 71.5 / 60.9 / 60.2 | 30 / 78 / 30 / 1170 | 510 ms |
| R20-P1 after Phase 1 (run 1, `7ac401a`) | 11.4 / 314 / 1717 ms / 292 | 8.2 / 34.6 / 5.6 / 6.1 | 60.1 / 43.8 / 32.8 / 39.1 | 75 / 26 / 24 / 28 (see note) | 152 ms (not comparable, see note) |
| R20-P1 after Phase 1 (run 2, `7ac401a`) | 13.3 / 313 / 283 ms / 259 | 9.7 / 37.1 / 5.3 / 7.8 | 60 / 54.3 / 48.8 / 40 | 75 / 26 / 28 / 28 (see note) | 106 ms (not comparable, see note) |
| R20-P1 second pass (run 1, `a3ca320`) | 44 / 68 / 133 ms / 7 | 7.1 / 6.3 / 3.2 / 5.4 | 60.1 / 47.1 / 24 / 48 | 75 / 28 / 24 / 28 (see note) | 74 ms (not comparable, see note) |
| R20-P1 second pass (run 2, `a3ca320`) | 43 / 72 / 133 ms / 10 | 7.3 / 2.3 / 4.4 / 7.1 | 60.1 / 17.4 / 48.4 / 53.1 | 75 / 22 / 28 / 28 (see note) | 77 ms (not comparable, see note) |

**After-rows, read with care.** Taken on `:3105` with the machine at about 71% CPU (baseline: about 100%), so fps is not a like-for-like gain. Targets and result: scroll4x fps >= 50 **missed** (11.4 / 13.3); worst frame <= 100 ms **missed** (1717 / 283 ms); rest busy < 5% **missed** (best section tree 5.3-5.6%, worlds 34.6-37.1%); Worlds entry worst task < 50 ms **missed by ruling** (152 / 106 ms). These after-figures are not comparable with the 510-781 ms baseline: since Task 5 the globe chunk prefetches after `load`, and a final-review trace measured the globe canvas mounting 1.0-1.3 s before the probe's entry window opens (2 s after `load`), so the window no longer contains the globe mount and first upload the baseline measured. "Hit tests per 5 s" no longer measures placement cost after Task 1: placement reads cached rects, and the column counts only the remaining `elementsFromPoint` callers. The rest window likely contains the cats' conversations as well as seated cats (rAF 33-60/s; not traced); the 10 s settle does not exclude a chat, so rest busy is not the seated-window figure (Task 2 ruling).

Shape matches `reports/lag-investigation.md` (rAF calls about 60/s in about, tree and contact and about 72/s in worlds, about 1170 hit tests in 5 s at contact, a long first entry to Worlds). Absolute scroll fps is far below that report's 24.7: the machine was at 100% CPU during both runs, which 4x throttling compounds (unverified as the cause). Compare later rows to these on the same machine, not to the report. "rAF calls per s" counts `requestAnimationFrame` calls scheduled, not frames painted, which is why worlds can exceed 60.

**Task 5 perf row** (`pnpm perf`, production build on `:3104`, after the palette cache and the post-`load` chunk observer): JS 202.2 KB, JS at load 173.0 KB (177,182 B against Task 3's 177,136 B), CSS 14.4 KB, fonts 223.8 KB, LCP 2960 ms, TBT 723 ms, CLS 0, 3155 DOM nodes, 0 skipped responses. The observer now attaches only after `load`, so the globe chunk and the coastline PNG do not appear among pre-load responses (no coastline request at all in a 4 s probe at 412×823).

**R20-P1 second pass (Tasks 7-10, `a3ca320`).** Production build on `:3114`, `pnpm lag` twice then `pnpm perf`, same machine, headless Chromium. Machine CPU (5 s average of `\Processor(_Total)\% Processor Time`, taken between runs, not during them): 83% before lag 1, 45.6% after lag 1, 46.0% before lag 2, 45.7% after, 44.0% before perf, 34.9% after. The baseline ran at about 100% and the first pass at about 71%, so the three sets are not like-for-like and the gain is partly the quieter machine. Scroll columns are "fps / drops / worst frame / long tasks". Criteria: scroll4x fps >= 50 **missed** (44 / 43); worst frame <= 100 ms **missed** (133 / 133); rest busy < 5% **missed** (about 7.1 / 7.3, contact 5.4 / 7.1, worlds 6.3 / 2.3, tree 3.2 / 4.4: tree met in both runs, worlds in run 2 only); Worlds entry worst task < 50 ms **missed** (74 / 77 ms; still not comparable with the baseline, see the first-pass note); JS at load falls **MET** (below). Worlds rest busy fell (34.6-37.1% -> 6.3 / 2.3%), but worlds rAF/s fell only in run 2 (47.1 / 17.4 against 43.8 / 54.3 in the first pass); the cause, the crossing now playing once (Task 9, a reversal of the earlier loop), is inferred, not traced; rest windows can still contain a cats' conversation, which stays full-rate by the Task 2 ruling, so rest numbers are not the seated-window figure. "Hit tests per 5 s" is as in the first pass (cached rects, only the remaining `elementsFromPoint` callers).

**Second pass perf row** (`pnpm perf`, `:3114`, `a3ca320`): JS 202.1 KB (206,985 B), JS at load 172.8 KB (176,938 B), CSS 14.4 KB, fonts 223.8 KB, LCP 2520 ms, TBT 485 ms, CLS 0, 3155 DOM nodes, 0 skipped responses. JS at load 201,987 B (baseline `f43c825`) -> 176,938 B: -25,049 B, -12.4%. **MET.** 8 s total 205,610 -> 206,985 B (+1,375 B; informational, counts the idle-loaded companion chunk).


**Phase 1 close perf row** (`pnpm perf`, production build on `:3105`, `7ac401a`, machine at about 71% CPU): JS 202.2 KB (207,041 B), JS at load 173.0 KB (177,182 B), CSS 14.4 KB, fonts 223.8 KB, LCP 3484 ms, TBT 315 ms, CLS 0, 3155 DOM nodes, 0 skipped responses. Baseline measured with this branch's `scripts/perf.mjs` against a production build of `f43c825` on `:3106` (two runs, identical bytes, 0 skipped): JS 205,610 B (200.8 KB), **JS at load 201,987 B (197.3 KB)**, CLS 0, 3155 DOM nodes. **Initial JS falls: MET on the load path** (201,987 -> 177,182 B, -24,805 B, -12.3%). The 8 s total did not fall (205,610 -> 207,041 B, +1,431 B) because perf waits past the idle load of the companion chunk; the Task 3 ruling defines "initial JS" as the load path. CLS 0 -> 0, DOM nodes 3155 -> 3155. TBT 615 / 926 ms on the baseline's two runs against 315 ms now (one run each side, machine load differed, so read as direction only).

## Round 20 phase 2 (2026-10-12) — scale, type, footer

Production build on `:3123` at `d7bc64f` (the commit before this one), headless shell, 1 run each. Machine CPU (5 s average of `\Processor(_Total)\% Processor Time`, between runs): 84.3% before perf, 40.6% after perf, 56.3% before lag, 38.8% after lag.

**Perf row** (`pnpm perf`, 0 skipped responses): JS 202.4 KB (207,260 B), JS at load 172.8 KB (176,946 B), CSS 14.1 KB, fonts 72.3 KB (74,024 B), LCP 2296 ms (a body paragraph, `P#.text-[length:var(--step-0)]`), TBT 210 ms, CLS 0, 3134 DOM nodes. Against the R20-P1 second pass (`a3ca320`: 206,985 / 176,938 B, fonts 223.8 KB, 3155 nodes): JS +275 B, JS at load +8 B, fonts -151.5 KB (Fraunces removed), DOM -21 nodes. LCP and TBT are not like-for-like: the P1 row ran at about 44% CPU, this one began at 84%, and the LCP element is now a different node because the headline scale changed (inferred).

| When | scroll4x fps / drops / worst frame / long tasks | rest busy % (about / worlds / tree / contact) | rAF calls per s (about / worlds / tree / contact) | hit tests per 5 s (about / worlds / tree / contact) | Worlds entry worst task |
|---|---|---|---|---|---|
| R20-P2 (run 1, `d7bc64f`) | 31.4 / 114 / 200 ms / 37 | 9.5 / 4.4 / 6.4 / 7.3 | 60 / 57.2 / 57.2 / 47.2 | 75 / 30 / 30 / 30 | 84 ms |

Comparability with the R20-P1 second-pass rows: the P1 pair began at 83% CPU (run 1, 44 fps) and 46% (run 2, 43 fps); this single run began at 56%, so it is not like-for-like with either. The page is shorter (no closing band, no hero floor) and the type scale changed, so scroll distance differs (inferred, not measured). Against the P1 second pass scroll4x fps fell (44 / 43 -> 31.4), worst frame rose (133 -> 200 ms) and about rest busy rose (7.1 / 7.3 -> 9.5); the cause was not isolated here, see the A/B below. Criteria as in P1: fps >= 50 missed, worst frame <= 100 ms missed, rest busy < 5% met in worlds only, Worlds entry < 50 ms missed.

**A/B against main** (`ab-lag-report.md`: main `7dfe59e` on `:3130` vs foundation `1437cb3` on `:3131`, `scripts/lag.mjs` interleaved 3 + 3 runs, same machine and time, headless Chromium 1440x900; machine CPU 29-94%, typically 45-60%, similar for both builds). Medians main vs foundation: scroll4x fps 36.5 vs 29.6 (main range 30.1-38.3, foundation 29.2-31.2), worst frame 167 vs 217 ms, long tasks 24 vs 47, drops 109 vs 122; rest busy about 8.3 vs 8.7, worlds 4.8 vs 5.4, tree 4.9 vs 5.4, contact 7.4 vs 7.8; Worlds entry 115 vs 90 ms. CDP traces (2 per build) show the same style, layout, paint, layerize and commit time, and the same hot functions. Verdict: not a demonstrated regression, because main's own spread (its run 5 matched foundation) covers the gap; a 5-10% effect is not ruled out and would need an idle machine and 8 or more runs per build.

**Verification.** `pnpm verify` 5/5 (1009 unit tests, 58 files; contrast 31 pairings, lowest 4.66:1). Full e2e at `--workers=2`: 919 passed, 767 skipped, 0 failed, no retries needed.

## Round 20 phase 3 (2026-10-17) — hero

Production build on `:3133` at `5d36963`, headless Chromium, `pnpm perf` once and `pnpm lag` three times. Machine CPU (5 s average of `\Processor(_Total)\% Processor Time`, between runs): 99.9% before perf, 95.5% after perf; 97.2% before lag 1, 100% after; 100% before and after lag 2; 99.8% before lag 3, 100% after. The machine was saturated for the whole pass (the e2e run had just finished and other apps were busy), so none of these rows is like-for-like with the R20-P1 or R20-P2 rows (about 40-85% CPU).

**Perf row** (`pnpm perf`, 0 skipped responses): JS 227.6 KB (233,096 B), JS at load 172.9 KB (177,029 B), CSS 14.1 KB, fonts 72.3 KB (74,024 B), LCP 2404 ms (the hero `h1#hero-heading`), TBT 1363 ms, CLS 0, 2996 DOM nodes. Against R20-P2 (`d7bc64f`: 207,260 / 176,946 B, fonts 74,024 B, 3134 nodes): JS at load +83 B, fonts unchanged, DOM -138 nodes (the code excerpts are gone). **JS total rose 25.2 KB** (25,836 B): the globe chunk (the 78.7 KB raw script containing the WebGL2 engine and the coastline data) now loads inside the 8 s window. Cause, measured not assumed: at 412x823 `#worlds` now starts at 834 px, because the hero is shorter, so it falls inside the post-`load` prefetch observer's `rootMargin: 100%` and the prefetch fires; before this phase the stage sat further down. The chunk is still lazy and absent from "JS at load", so first load is unaffected, but the recipe's "a move of more than a kilobyte or two means the engine leaked" is tripped for a benign reason: the JS total is a new baseline (about +25 KB, accepted by ruling: the prefetch is the intended post-`load`, one-screen-early behaviour and is off the load path), not comparable with R20-P2 or earlier rows; `JS at load` is now the leak detector. LCP is the headline now (the P2 LCP was a body paragraph); TBT is inflated by the saturated CPU and the prefetch, not comparable.

| When | scroll4x fps / drops / worst frame / long tasks | rest busy % (about / worlds / tree / contact) | rAF calls per s (about / worlds / tree / contact) | hit tests per 5 s (about / worlds / tree / contact) | Worlds entry worst task |
|---|---|---|---|---|---|
| R20-P3 (run 1, `5d36963`) | 22.3 / 167 / 267 ms / 83 | 9.6 / 6.1 / 3.5 / 9.2 | 60.1 / 36.7 / 18.2 / 48.9 | 75 / 28 / 24 / 28 | 84 ms |
| R20-P3 (run 2, `5d36963`) | 16.3 / 202 / 283 ms / 122 | 11.2 / 8.1 / 3.4 / 5.8 | 60.1 / 37.7 / 15.2 / 31.9 | 75 / 28 / 20 / 24 | 265 ms |
| R20-P3 (run 3, `5d36963`) | 15.9 / 207 / 267 ms / 125 | 12.9 / 5.2 / 6.2 / 7.5 | 60.4 / 28.6 / 42.1 / 60.2 | 75 / 24 / 26 / 30 | 179 ms |

Comparability: every run began at about 100% CPU, against 56% for the R20-P2 run (31.4 fps, worst frame 200 ms), so the fall in scroll4x fps (31.4 -> 22.3 / 16.3 / 15.9) and the Worlds entry worst task is mostly the machine, not the hero (inferred; not A/B'd against `d7bc64f` on the same machine). Criteria as before: fps >= 50 missed, worst frame <= 100 ms missed, rest busy < 5% met in tree (runs 1-2) and worlds (run 3) only, Worlds entry < 50 ms missed. The rAF-rate drops on worlds/tree match the earlier note that rest windows can contain a cats' conversation.

**Verification.** `pnpm verify` 5/5 (1007 unit tests, 59 files; contrast 31 pairings, lowest 4.66:1). Full e2e at `--workers=2` on `:3133`: 949 passed, 791 skipped, 0 failed, no retries needed (the two companion failures at 1440 px from Task 2 are fixed).

**R20-P4 Task 2 perf row** (globe stripped to coastlines, flight, robot and three stop pins; `pnpm perf`, production builds on `:3141`, CPU about 99-100% at both runs, 0 skipped responses). Before (`5ad0b73`): JS 231,056 B, JS at load 174,470 B. After: JS 228,178 B, JS at load 173,864 B (two runs, identical bytes), LCP 2700 / 2800 ms, TBT 1237 / 930 ms, CLS 0. JS at load -606 B (inside the ±1 KB gate: the engine has not leaked). Globe chunk (`data-chunk="globe-canvas"`): 79,771 B raw / 30,074 B gz -> 73,435 B raw / 27,711 B gz (-6,336 B raw, -2,363 B gz).

**R20-P4 Task 3 perf row** (Worlds laid out as one crossing and three stops; chapters, skins, plaques and `WorldPanel` deleted; `pnpm perf` against a production build on `:3142`, CPU about 91%, 0 skipped responses). Before (`254fb48`): JS 228,178 B, JS at load 173,864 B. After: JS 223,899 B, JS at load 169,423 B, LCP 2668 ms, TBT 1163 ms, CLS 0. Both fell (-4,279 B / -4,441 B): the chapter list, `WorldPanel`, the skin dial and the chapter data left the client bundle. Nothing rose, so the engine and the coastlines are still in the lazy chunk.

## Round 20 phase 4 (2026-10-17) — Earth

Production build on `:3143` at `ae0cdc6`, headless Chromium, `pnpm perf` once and `pnpm lag` three times. Machine CPU (5 s average of `\Processor(_Total)\% Processor Time`, between runs): 8.7% before perf, 5.0% after; 3.7 / 6.8% around lag 1, 6.6 / 10.1% around lag 2, 9.9 / 11.0% around lag 3. The machine was close to idle, unlike the R20-P2 (56%) and R20-P3 (about 100%) rows, so the lag rows are not like-for-like with either.

**Perf row** (`pnpm perf`, 0 skipped responses): JS 218.6 KB (223,853 B), JS at load 165.4 KB (169,377 B), CSS 14.2 KB, fonts 72.3 KB (74,024 B), LCP 1528 ms (`h1#hero-heading`), TBT 264 ms, CLS 0, 2902 DOM nodes. Against the R20-P4 Task 3 row (`254fb48` -> `7729c5b`: 223,899 / 169,423 B): JS -46 B, JS at load -46 B, so nothing leaked into the load path. Against R20-P3 (`5d36963`: 233,096 / 177,029 B): JS -9.0 KB, JS at load -7.5 KB, DOM -94 nodes. Globe chunk (`data-chunk="globe-canvas"`, `.next/static/chunks/29mnp60g8t74z.js`): 73,734 B raw / 27,902 B gz (`gzip -9`, so approximate) against 79,771 B / 30,074 B before Task 2. LCP and TBT are far below the saturated P3 values because the machine was idle, not comparable.

| When | scroll4x fps / drops / worst frame / long tasks | rest busy % (about / worlds / tree / contact) | rAF calls per s (about / worlds / tree / contact) | hit tests per 5 s (about / worlds / tree / contact) | Worlds entry worst task |
|---|---|---|---|---|---|
| R20-P4 (run 1, `ae0cdc6`) | 44.4 / 58 / 150 ms / 7 | 8.7 / 5.9 / 2.7 / 5.7 | 60.2 / 39.4 / 15.8 / 31 | 75 / 26 / 22 / 26 | 65 ms |
| R20-P4 (run 2, `ae0cdc6`) | 45.6 / 59 / 133 ms / 4 | 7.9 / 4.1 / 5.3 / 6.7 | 60.1 / 37.9 / 53.4 / 48.1 | 75 / 26 / 28 / 28 | 63 ms |
| R20-P4 (run 3, `ae0cdc6`) | 44.4 / 58 / 117 ms / 4 | 7.1 / 1.9 / 5 / 6.5 | 60.1 / 25.1 / 41.1 / 50.9 | 75 / 24 / 26 / 30 | 56 ms |

Comparability: runs began at 4-10% CPU, against 56% (R20-P2, 31.4 fps) and about 100% (R20-P3, 16-22 fps). The fps gain (about 44-46) is therefore mostly the machine (inferred; no same-machine A/B against `5d36963`). Criteria as before: fps >= 50 missed, worst frame <= 100 ms missed (117-150 ms), rest busy < 5% met in worlds (runs 2-3) and tree (run 1; run 3 is exactly 5), Worlds entry < 50 ms missed (56-65 ms).

**Verification.** `pnpm verify` 5/5 (961 unit tests, 60 files; contrast 31 pairings, lowest 4.66:1). Retrieval eval: recall@1 70.0% (floor 0.7), recall@3 93.3% (0.9), recall@5 96.7% (0.95), MRR@10 0.807 (0.8); recall@1 sits exactly on its floor. Full e2e at `--workers=2` on `:3143`: 914 passed, 706 skipped, 0 failed, no retries needed.

## Round 20 phase 5 (2026-10-17) — Journey

Production build on `:3153` at `35e1b7f`, headless Chromium, `pnpm perf` once and `pnpm lag` three times. Machine CPU (5 s average, between runs): 4.1% before perf, 6.5% after; 9.7 / 6.1% around lag 1, 6.3 / 6.9% around lag 2, 5.1 / 8.7% around lag 3. Close to idle, like the R20-P4 rows.

**Perf row** (0 skipped responses): JS 218.5 KB (223,734 B), JS at load 165.3 KB (169,273 B), CSS 13.7 KB, fonts 72.3 KB, LCP 1564 ms (`h1#hero-heading`), TBT 199 ms, CLS 0, 2135 DOM nodes. Against R20-P4 (`ae0cdc6`: 223,853 / 169,377 B): JS -119 B, JS at load -104 B, so nothing leaked into the load path; DOM 2902 -> 2135 nodes (-767).

| When | scroll4x fps / drops / worst frame / long tasks | rest busy % (about / worlds / tree / contact) | rAF calls per s (about / worlds / tree / contact) | hit tests per 5 s (about / worlds / tree / contact) | Worlds entry worst task |
|---|---|---|---|---|---|
| R20-P5 (run 1, `35e1b7f`) | 43.7 / 54 / 167 ms / 4 | 16.3 / 7.3 / 9.1 / 8 | 60.1 / 60 / 54.2 / 42.2 | 75 / 30 / 28 / 26 | 66 ms |
| R20-P5 (run 2, `35e1b7f`) | 43.9 / 49 / 167 ms / 6 | 14.9 / 8.9 / 6.5 / 5.1 | 60.2 / 34 / 25.4 / 27.3 | 75 / 24 / 24 / 24 | 53 ms |
| R20-P5 (run 3, `35e1b7f`) | 40.1 / 67 / 133 ms / 9 | 14.8 / 4.8 / 7.5 / 9.4 | 60 / 28 / 48.2 / 42.1 | 75 / 26 / 30 / 26 | 64 ms |

Against R20-P4 (44.4-45.6 fps, worst frame 117-150 ms, tree rest busy 2.7-5.3%): scroll fps is 1-4 fps lower, worst frame equal or worse, tree rest busy higher (6.5-9.1%), and `about` rest busy doubled (15% vs 7-9%). The tree box was not playing in any of these samples: at rest `#tree` leaves about 17% of the box in view, under the 50% gate, and `scroll4x` scrolls every frame, which keeps resetting the 600 ms dwell. The A/B below, run after the final-review fixes, splits the scroll by section.

**A/B against R20-P4** (`ae0cdc6` on `:3156` vs `19244fb` on `:3155`, both production builds, `pnpm lag` with per-section scroll bands, interleaved, CPU 5 s average before each run). `scrollHeight` is 10,792 px vs 9,741 px, and `frames` 249 vs 223: the `#tree` section is 1,051 px shorter (8,075 -> 7,024 px).

| Run | CPU before | total fps / drops / worst | about band fps | worlds band fps / drops / worst | tree band fps / drops / worst | contact band fps | rest busy % (about / worlds / tree / contact) |
|---|---|---|---|---|---|---|---|
| `ae0cdc6` 1 | 13.0% | 44.2 / 61 / 183 ms | 143.9 (2 frames) | 28.3 / 15 / 67 ms | 45.6 / 39 / 183 ms | 48.0 | 7.9 / 3.0 / 3.4 / 5.5 |
| `19244fb` 1 | 11.7% | 43.5 / 55 / 183 ms | 62.5 (2 frames) | 23.2 / 17 / 100 ms | 46.1 / 32 / 183 ms | 50.9 | 11.0 / 5.7 / 7.2 / 7.7 |
| `ae0cdc6` 2 | 8.0% | 44.8 / 55 / 183 ms | 89.3 (2 frames) | 28.3 / 13 / 67 ms | 46.3 / 36 / 183 ms | 49.4 | 9.3 / 4.3 / 5.4 / 6.3 |
| `19244fb` 2 | 7.9% | 43.7 / 56 / 117 ms | 88.5 (2 frames) | 22.2 / 17 / 83 ms | 46.5 / 34 / 117 ms | 52.5 | 12.5 / 2.6 / 9.4 / 5.5 |
| `ae0cdc6` 3 | 6.1% | 45.4 / 55 / 133 ms | 125.8 (2 frames) | 27.6 / 13 / 67 ms | 46.8 / 38 / 133 ms | 52.5 | 8.4 / 4.8 / 5.9 / 5.8 |
| `19244fb` 3 | 8.7% | 44.0 / 52 / 133 ms | 61.9 (2 frames) | 23.7 / 17 / 100 ms | 46.7 / 30 / 133 ms | 50.9 | 11.5 / 7.8 / 2.0 / 4.2 |

What it shows (measured): the Journey band is unchanged, 46.1-46.7 fps against 45.6-46.8, with fewer drops (30-34 against 36-39). The page lost 26 Journey frames, which are faster than the page mean, so the total fell even though the Journey band's own fps did not. The `worlds` band (17 frames) is slower in every pair, 22.2-23.7 fps against 27.6-28.3. Nothing in the globe changed; a trace of that band (below, "Fixes for both") puts the difference in Journey content painted every frame, mostly the tree box's drawing. `about` rest busy is higher in every pair (11.0-12.5% against 7.9-9.3%), so it is not machine noise. Tree rest busy overlaps (2.0-9.4% against 3.4-5.9%). An earlier interleaved set without CPU readings showed the same pattern.

**`about` rest trace** (CDP trace plus CPU profile of the same 5 s window `rest.about` samples, two runs per build). The top self-time difference is `PaintArtifactCompositor::Update`: 51 and 60 ms on `ae0cdc6`, 138 and 131 ms on `19244fb`. JS self time is not where the difference is. Forcing the tree box to `height: auto; overflow: visible` on `19244fb` brought it to 69 and 78 ms. So most of the extra compositing-update work at the top of the page comes from the tree box being a scroll container, even though it is off screen (two runs, inferred from that override, not a product change). The rest of the gap (about 15 ms) is not attributed.

**Fixes for both, and their re-measurement (open).** The `worlds`-band trace put the slowdown in the document's `Paint` (37-53 ms on `ae0cdc6` against 84-87 ms over the band's 17 frames). Hiding the tree box (`display: none`) recovered the band, and so did `content-visibility` on the timeline and the case studies below it. Under `content-visibility: auto` the box was still drawn, because the browser's own margin reaches it from Worlds. Three changes landed:
- The box is `data-far` beyond 200 px of the viewport unless a show runs: contents `content-visibility: hidden`, `overflow: clip`, so it is neither a scroll container nor drawn. With JS off it is never far.
- The timeline is `content-visibility: auto` at lg.
- The unbranched case studies are `content-visibility: auto` at lg.
- *Round 20 phase 6 removed the last two.* Their placeholder heights (1275 px, 3655 px) are exact only near 1440: rendered, the timeline is 1261-1275 px and the case studies 3653-3736 px across 1024-1920. At 1024 the case studies alone moved the footer 81 px once they rendered, which failed `ask.spec`'s footer test (reproduced on `main`). The tree box's `data-far` skip stays. Phase 6's lag A/B re-measures the band.

Interleaved traces after the fixes (`2977f07` against `ae0cdc6`, 3 pairs, machine at 92-100% CPU from other work) give these, with fps and worst frame under tracing at that load:

| Metric | `ae0cdc6` | `2977f07` |
|---|---|---|
| `about` rest `PaintArtifactCompositor::Update` | 91-105 ms | 68-71 ms |
| Worlds band `Paint` | 60-79 ms | 41-69 ms |
| Worlds band fps | 12.4-14.0 | 11.0-13.8 |
| Worlds band worst frame | 183-217 ms | 250-450 ms |

The worst frames on both builds are one rAF callback (the same `Z` in the shared chunk) whose length tracks the load, plus, on `2977f07`, one layout of about 170 ms near the band's end. That layout is inferred to be the box being drawn as it comes within 200 px. Not yet re-measured: the `pnpm lag` A/B. The machine never dropped below 20% CPU for a pair over about 75 minutes of gated attempts, so no lag row is recorded for the fixes.

**Verification.** `pnpm verify` 5/5 (942 unit tests, 59 files; contrast 31 pairings, lowest 4.66:1). Retrieval eval: recall@1 70.0% (floor 0.7), recall@3 93.3% (0.9), recall@5 96.7% (0.95), MRR@10 0.807 (0.8); unchanged from R20-P4, recall@1 sits exactly on its floor. Full e2e at `--workers=2` on `:3153`: 963 passed, 711 skipped, 0 failed, no retries needed.

## Round 20 phase 6 (2026-10-18) — Contact

Production builds at `ce84ad8` (HEAD of `round-20/contact`), headless Chromium. **The machine was saturated for the whole session**: `\Processor(_Total)\% Processor Time` read 98-100% before and after `pnpm perf` and in 9 of 13 five-minute gate checks (the other four read 25/25/23%, 29/21/23%, 48/49/32% and 45/37/41%, never below 20% for three samples), so the lag A/B gate (CPU < 20% for three consecutive 5 s samples, checked every 5 minutes for 60 minutes) never opened. The lag rows below are labelled with their CPU and are not comparable with the R20-P4 / R20-P5 rows (4-13% CPU).

**Perf row** (`pnpm perf`, default build, 0 skipped responses; CPU 100% before and after): JS 282.2 KB (288,957 B), JS at load 229.1 KB (234,637 B), CSS 13.7 KB, fonts 72.3 KB, LCP 2532 ms (`h1#hero-heading`), TBT 1292 ms, CLS 0, 2136 DOM nodes. Against R20-P5 (`35e1b7f`: 223,734 / 169,273 B): **JS +65,223 B (+63.7 KB), JS at load +65,364 B (+63.8 KB)**. This is the lead form's `leadSchema` pulling `zod` into the client chunk (`.next/static/chunks/0ny58ngn_w2cd.js`, 313,558 B raw, the only chunk containing zod's runtime), which the plan accepted. **Fixed in `2db7d4f`** (the schema moved to `src/app/api/contact/schema.ts`; the form hand-checks the shared patterns): re-measured at `50d0907`, default build, 0 skipped responses, CPU 22-28% before: JS 218.3 KB (223,555 B), **JS at load 165.3 KB (169,235 B)**, CSS 13.7 KB, fonts 72.3 KB, LCP 1576 ms, TBT 200 ms, CLS 0, 2136 DOM nodes; against R20-P5 JS -179 B and JS at load -38 B, so the zod cost is gone. LCP and TBT are inflated by the 100% CPU and say nothing about the change; DOM is unchanged (2135 -> 2136).

**A/B against R20-P4** (`ae0cdc6` on `:3165` vs HEAD `ce84ad8` on `:3166`, both production builds, this HEAD's `scripts/lag.mjs`, interleaved, CPU 5 s average before / after each run). `scrollHeight` 10,792 px vs 9,264 px and `frames` 249 vs 211: Phase 5's shorter `#tree` section.

| Run | CPU before / after | total fps / drops / worst / long tasks | about band fps | worlds band fps / drops / worst | tree band fps / drops / worst | contact band fps / drops / worst | rest busy % (about / worlds / tree / contact) | Worlds entry worst task |
|---|---|---|---|---|---|---|---|---|
| `ae0cdc6` 1 | 100 / 99.7% | 20.5 / 150 / 250 ms / 75 | 127.4 (2 frames) | 15.5 / 17 / 217 ms | 23.0 / 108 / 233 ms | 12.4 / 24 / 250 ms | 10.7 / 5.7 / 5.8 / 8.3 | 163 ms |
| HEAD 1 | 98.2 / 98.9% | 29.9 / 88 / 367 ms / 21 | 64.9 (2) | 26.2 / 15 / 67 ms | 28.9 / 70 / 367 ms | 53.3 / 2 / 33 ms | 12.4 / 3.7 / 10.1 / 7.2 | 113 ms |
| `ae0cdc6` 2 | 97.5 / 99.9% | 30.7 / 103 / 200 ms / 37 | 133.3 (2) | 15.7 / 16 / 200 ms | 32.0 / 78 / 167 ms | 41.0 / 8 / 67 ms | 8.1 / 5.2 / 8.8 / 5.4 | 114 ms |
| HEAD 2 | 99.7 / 48.8% | 30.7 / 77 / 333 ms / 17 | 82.3 (2) | 15.0 / 16 / 333 ms | 33.2 / 53 / 300 ms | 38.4 / 7 / 67 ms | 9.1 / 2.6 / 6.1 / 6.0 | 168 ms |
| `ae0cdc6` 3 | 56.2 / 39.7% | 44.4 / 56 / 117 ms / 7 | 165.3 (2) | 27.6 / 11 / 100 ms | 45.2 / 42 / 117 ms | 54.2 / 2 / 50 ms | 7.5 / 3.3 / 2.2 / 6.5 | 52 ms |
| HEAD 3 | 26.0 / 99.6% | 47.3 / 38 / 150 ms / 2 | 82.6 (2) | 26.2 / 14 / 100 ms | 50.8 / 21 / 150 ms | 50.5 / 2 / 50 ms | 7.5 / 1.6 / 5.4 / 9.7 | 230 ms |

rAF calls per s (about / worlds / tree / contact) and hit tests per 5 s are in `.superpowers/sdd/.../task-4-report.md`; they match the earlier rows (about 60 / 75, the rest vary with the cats).

What it shows (measured, noisy): with the machine at 100% the first two pairs are dominated by load (both builds 15-31 fps, worst frames 200-367 ms). Run 3 is the only lightly loaded pair (CPU 26-56% before): `ae0cdc6` 44.4 fps vs HEAD 47.3, worlds band 27.6 vs 26.2 fps with the same 100 ms worst frame, tree band 45.2 vs 50.8, contact 54.2 vs 50.5. So the Worlds-band slowdown seen in Phase 5 (22.2-23.7 fps against 27.6-28.3 for `ae0cdc6`) is **not reproduced**: the worlds band is at parity with `ae0cdc6` in run 3 (27.6 vs 26.2) and slower or equal in runs 1-2 only because of load, not in a consistent direction (HEAD faster in run 1, equal in run 2). The Journey (tree) band is equal or better on HEAD in all three pairs. `about` rest busy is 12.4 / 9.1 / 7.5% on HEAD against 10.7 / 8.1 / 7.5% on `ae0cdc6`, within the spread (Phase 5 had 11.0-12.5 against 7.9-9.3). Worlds entry worst task is not decided by this data (HEAD 113 / 168 / 230 ms, `ae0cdc6` 163 / 114 / 52 ms; load-driven). Caveat: three runs under 40-100% CPU cannot rule out a few-fps difference; only the run-3 pair is near the earlier rows' conditions, and it is one pair.

**Verification.** `pnpm verify` 5/5 (950 unit tests, 61 files; contrast 31 pairings, lowest 4.66:1). Retrieval eval: recall@1 70.0% (floor 0.7), recall@3 93.3% (0.9), recall@5 96.7% (0.95), MRR@10 0.807 (0.8); identical to R20-P5, recall@1 sits exactly on its floor, 30 cases (rank 8 "messy or duplicated data", rank 4 "how many retailers has he integrated"). Full e2e on the default build (no Resend env) at `--workers=2` on `:3163`: 915 passed, 795 skipped, 0 failed, no retries needed (41.9 min). `e2e/contact.spec.ts` alone on a build with dummy `RESEND_API_KEY` / `CONTACT_TO_EMAIL` / `CONTACT_FROM_EMAIL` (POSTs mocked): 30 passed, 78 skipped, 0 failed, covering the tests that only run when the form declares `data-delivery="api"`.

## Round 21 phase 1 (2026-10-18) — foundation

Production build at `d924109` plus this commit, headless Chromium, `pnpm start` on `:3172`. **The machine was saturated**: CPU read 100% before and after `pnpm perf` (and 100% before the e2e retries), so LCP and TBT say nothing about the change.

**Perf row** (`pnpm perf`, default build, 0 skipped responses): JS 218.3 KB (223,546 B), JS at load 165.3 KB (169,226 B), CSS 13.8 KB, fonts 71.0 KB (72,668 B), LCP 2704 ms (`h1#hero-heading`), TBT 1087 ms, CLS 0, 2053 DOM nodes. Against R20-P6 (`50d0907`: 223,555 / 169,235 B / fonts 72.3 KB): JS -9 B, JS at load -9 B, so no JS moved. Fonts: Bricolage Grotesque, Courier Prime and Newsreader italic cost 72,668 B in the same measure, about the same as R20-P6's faces. Bricolage ships the `latin` subset only (no `vietnamese` added): the test for "ệ" passes, and next/font still declares the latin-ext and vietnamese blocks, loaded by unicode-range on demand.

**Contrast.** `pnpm contrast`: 44 pairings, all >= AA. Lowest 4.52:1 (day, the single mark, deep sections: red on lichen-deep). No token was forced off its owner-approved value.

**Verification.** `pnpm verify` 5/5 (969 unit tests, 63 files). Retrieval eval unchanged from R20-P6: recall@1 70.0%, recall@3 93.3%, recall@5 96.7%, MRR@10 0.807.

Full e2e at `--workers=2` against `pnpm dev -p 3171`: 921 passed, 795 skipped, 12 failed. Isolated retry of the 12 against dev: 11 still failed (`scale.spec.ts:188` passed, a flake). Retried against the production build on `:3172`:
- `legacy-anchors.spec.ts:286` (x6 projects) and `origin.spec.ts:139` pass: dev-mode artifacts.
- `ask.spec.ts:463` and `:489` were real: the Bricolage swap made the idle chat taller than `--ask-room` at 520-639, 1024-1279 and 1280+ px. Fixed by re-measuring (static mode, 320-1920 px every 4 px): 49rem -> 54.5rem, 50.5rem -> 55.5rem, 44.5rem -> 46.5rem; comments updated. All of `ask.spec.ts` passes after.
- `companion.spec.ts:914` still fails at 1440: "a drawing over contact in night is invisible", ratio 1.82 against a floor of 3. Not fixed here (see Remaining risks below).

Remaining risk: the cats' ink at night over Contact. The test measures the cat's ink against the `--ground` of the element under it; at night Contact now carries light lantern surfaces, and `syncTone` repoints tone only for `.tone-*` zones, not `.bg-surface`. Inferred, not isolated. Needs an owner/Phase 2+ decision.
 **Closed in Phase 2:** explained by Phase 1's data-paper fix (globals.css paper scope + companion-space.ts syncTone); the failure no longer reproduces.

## Round 21 phase 2 (2026-10-19) — Worlds removed

Production build at `bd00ad2`, headless Chromium, `pnpm start` on `:3177`. CPU read 10% right after the perf runs (`Get-CimInstance Win32_Processor`; `wmic` is not installed), so unlike R21-P1 this machine was close to idle.

**Perf row** (`pnpm perf`, default build, 0 skipped responses, three runs, bytes identical): JS 188.8 KB (193,320 B), JS at load 162.9 KB (166,832 B), CSS 13.7 KB, fonts 62.5 KB (64,016 B), LCP 1544-2232 ms (`h1#hero-heading`), TBT 163-1244 ms (run-to-run noise, CLS 0), 2097 DOM nodes. Against R21-P1 (223,546 / 169,226 / fonts 72,668 B): JS -30,226 B (the globe chunk, as expected), JS at load -2,394 B (WorldsStage client code), fonts -8,652 B. LCP and TBT are not comparable: P1 ran on a saturated machine.

**DOM nodes rose 2053 -> 2097 (+44), unexplained.** The only DOM-affecting source change is one `sr-only` `#worlds` span in the hero (`src/sections/Hero/anchors.ts`). The count is stable across three runs, so it is not noise; P1's number came from a saturated run. A P1 rebuild to A/B it failed (Turbopack rejects a junctioned `node_modules`), so the cause is not isolated. Not a budget item, but worth a check in Phase 3 when the hero is rebuilt.

**Verification.** `pnpm verify` 5/5 (803 unit tests, 50 files; contrast 60 pairings, all >= AA, lowest 4.52:1). Retrieval eval: the thresholds pass; the scoreboard is not printed on a pass, and Task 5 recorded recall@1 70.0%, recall@3 93.3%, recall@5 96.7%, MRR@10 0.807 before and after, unchanged from R21-P1.

**e2e** at `--workers=2` against the production build on `:3177`: 685 passed, 755 skipped, 0 failed (15.7 min), so no retries were needed. The `companion.spec.ts:914` night-over-Contact failure recorded in P1 did not fail here. Explained by Phase 1's data-paper fix (globals.css paper scope + companion-space.ts syncTone); the P1 risk is closed.

**Screens** (`reports/r21-p2-screens/`, untracked): 1440x900 and 390x844, day and night. The nav reads About, Journey, Contact; `main` holds `#about`, `#tree`, `#contact` in that order; `#worlds` is an `sr-only` span in About.

**Size of the removal** (`git diff --stat main...HEAD`): 70 files changed, 251 insertions, 8263 deletions.

## Round 21 phase 3 (2026-10-19) — the hero

Production build at `607f6c5`, headless Chromium, `pnpm start` on `:3185`. **The machine was saturated**: CPU read 100% before the perf runs and 37% after (`Get-CimInstance Win32_Processor`), so LCP and TBT are noise.

**Perf row** (`pnpm perf`, default build, 0 skipped responses, three runs, bytes identical): JS 189.7 KB (194,232 B), JS at load 163.7 KB (167,670 B), CSS 15.5 KB (15,887 B), fonts 134.0 KB (137,168 B), LCP 2252-2580 ms, TBT 360-760 ms, CLS 0, 2191 DOM nodes. Against R21-P2 (193,320 / 166,832 / CSS 13.7 KB / fonts 64,016 B / 2097): JS +912 B, JS at load +838 B (inside the +3 KB budget), CSS +1.8 KB, **fonts +73,152 B**, DOM +94.

- **Fonts, a finding for the owner.** The three P2 files are unchanged (Bricolage latin 41,236 + Courier Prime 400 / 700 11,588 + 11,192 = 64,016 B). Two are new: Newsreader italic `latin`, 64,500 B, pulled by the hero's italic lines; and Bricolage's `vietnamese` unicode-range file, 8,652 B, which "ệ" in the field tag's "Kiên Giang, Việt Nam" (set in Bricolage per the owner's answer) pulls in on every load. At night "lẩu" also pulls Newsreader's `vietnamese` file, +12,024 B (not in perf's day row). The fix wave below cuts the Newsreader files by loading weight 400 only.
- **LCP element is the sky** (`span.scene-art`), not `h1#hero-heading`, in all three runs. Recorded, not hidden; raised with the owner.
- **Scenery.** `public/scenery/*.svg`: 14 files, 64,007 B raw, 14,533 B gzip. At perf's 412x823, day loads 8 of them (buffalo, sky-day, morning, rice-field and the four tag drawings: 11,568 B over the wire; bamboo, nón lá and pine are hidden below 1440, so the plan's 13 is a desktop count, not measured here); no `sky-night` or `evening` fetch in day.

**DOM.** Per section at 1440x900 (same snippet as before Task 1), before -> after: header 37 -> 37, `#about` 47 -> 137 (+90), `#tree` 1782 -> 1782, `#contact` 80 -> 80, footer 3 -> 3. Only `#about` moved: by tag it is now 41 div, 40 span, 8 button, 7 a, 7 dt, 7 dd, 5 p, 4 li, 4 svg, 10 path, 2 dl, 1 ul, 1 h1 (the four tags, the field tag and the scenery). The other +4 of perf's +94 is outside every section. **Phase 2's +44** is not in any section either: header, tree, contact and footer carry the counts they had before this phase, and perf counts `body *`, which also holds the companion layer (39 nodes at perf's 412x823, 50-56 at 1440) and about 105 inline RSC `<script>` tags. Inferred, not isolated: the companion mounts on idle after `load`, and P1's saturated run likely counted before it had, which would make +44 the cats, not the page.

**Verification.** `pnpm verify` 5/5 (844 unit tests, 54 files; contrast 60 pairings, all >= AA, lowest 4.52:1). Retrieval eval, printed: recall@1 70.0%, recall@3 93.3%, recall@5 96.7%, MRR@10 0.807, unchanged. The first `verify` failed on `TreeBox.test.tsx` "auto-plays once" (2 of 3 isolated runs at 96% CPU): `waitFor` saw the stage commit before the fake player's effect handed over `close`, so the close was a no-op. The test now waits for the mount (6/6 after).

**e2e** at `--workers=2` against the production build on `:3185`: 710 passed, 880 skipped, 0 failed (18.4 min); no retries needed.

**The flaky `companion.spec.ts:914`** ("stays visible over the section it is crossing", 1440): 5 of 10 failed on a production build, all "a drawing over contact in night is invisible", ratio 1.82. Measured: the follower walked ~50 px from bare sky onto the night business card (`.bg-surface`, lantern paper) inside the test's 400 ms double read, still without `data-paper` because `syncTone` samples every 320 ms. The test's `steady` compared section ids only, so a mid-crossing reading inside one section counted as settled. It now compares what `syncTone` keys on (section and whether a `.bg-surface` is behind). 10/10 after; threshold unchanged. P2's "closed by the data-paper fix" was half right: that fix is what makes the settled reading pass.

**Screens** (`reports/r21-p3-screens/close-*.png`, untracked): 1440x900, 1024x768, 390x844, 320x568, day and night, plus 1440 day with Kiên Giang turned (back line and "Read this part" show). Against `NatHero.png` / `NatHeroNight.png` at 1440, the differences beyond this plan's decisions ("Taylors", "Kiên Giang, Việt Nam" in Bricolage, body copy):
- The header is the site's (TL, About / Journey / Contact, theme, Let's talk), not the board's; unchanged by this phase.
- The headline breaks after "kid," (board: after "and this").
- "Book a call with me" has no underline at rest (board: underlined).
- The cats sit bottom right (not on the board).
- At 1024 "Kiên Giang" wraps to two lines on its tag.
- At 390 night the resting cats sit over the DoorDash tag's label; at 320 day over the Taylors tag's top; at 320 day a scenery bird touches "this" in the headline.

### R21-P3 fix wave

Production build, `pnpm start` on `:3187`, three `pnpm perf` runs per side, 0 skipped responses each. **CPU was busy**: 100/100/100% before, 80/84/99% after (`Get-CimInstance Win32_Processor`), so LCP and TBT are indicative only.

- **Newsreader `weight: "400"`.** Every `font-serif` use is regular italic, so the variable file (200-800) was all overhead. Newsreader italic latin 64,500 -> 24,408 B (-40,092 B); the night-only vietnamese file 12,024 -> 5,544 B, latin-ext 39,708 -> 15,248 B (build file sizes). Perf fonts 137,168 -> 97,076 B.
- **Sky preload.** `THEME_SCRIPT` adds `<link rel="preload" as="image" fetchpriority="high">` for `/scenery/sky-<theme>.svg` on `/` only; the sky is now requested before the second stylesheet, one fetch per theme, none on `/resume`, and with JS off the CSS still finds it.

| When | JS | JS at load | Fonts | LCP (3 runs) | TBT | CLS | DOM nodes |
|---|---|---|---|---|---|---|---|
| Before (`ad2f895`) | 194,232 B | 167,670 B | 137,168 B | 3100 / 2680 / 3344 ms | 644-2045 ms | 0 | 2191 |
| After | 194,232 B | 167,670 B | 97,076 B | 2796 / 2856 / 3468 ms | 617-819 ms | 0 | 2191 |

LCP element `span.scene-art` (the sky) in all six runs. LCP median 3100 -> 2856 ms, within the noise of a busy machine: the preload is verified to move the request earlier, not proven to move LCP. JS and JS at load did not move.

### R21-P3 phone hero (2026-10-20)

Below 1024 the clothesline hangs down the page (the owner-approved `NatHeroPhone` board): bamboo and nón lá at the right edge, the four tags alternating left and right on clothespins, the hint beside the last tag, my field tag at the line's foot, Moon / buffalo in a short rice patch / stool on the ground. Production build on `:3189`, one `pnpm perf` run, 0 skipped responses.

| When | JS | JS at load | CSS | Fonts | LCP | TBT | CLS | DOM nodes |
|---|---|---|---|---|---|---|---|---|
| After | 194,257 B | 167,695 B | 16,862 B | 97,076 B | 2720 ms | 463 ms | 0 | 2200 |

JS at load +25 B against 167,670 B (ChapterTags' class strings); the scenery is server-rendered CSS and SVG, no new JS.

## Round 21 phase 4 (2026-10-20) — the Journey

Branch `round-21/journey` (`26cd85a`..`c2fd447` plus this record), production build, `pnpm start` on `:3204`, headless Chromium. **The machine was saturated**: CPU 100% before the perf runs and 99% after (`Get-CimInstance Win32_Processor`), so LCP and TBT are noise.

**Perf row** (`pnpm perf`, default build, 0 skipped responses, three runs, bytes identical): JS 190.1 KB (194,612 B), JS at load 164.1 KB (168,049 B), CSS 17.6 KB (18,042 B), fonts 94.8 KB (97,076 B), other 136,203 B, LCP 2672 / 3016 / 3052 ms (LCP element `span.scene-art`, the hero's sky), TBT 367-539 ms, CLS 0, 2250 DOM nodes. Against this branch's own baseline at `3589620` (one run, same machine): JS 194,261 -> 194,612 (+351 B), **JS at load 167,698 -> 168,049 (+351 B, inside the +1 KB budget)**, CSS 17,268 -> 18,042 (+774 B), fonts unchanged, other 89,045 -> 136,203 (+47,158 B, the oak), DOM 2199 -> 2250 (+51). The +351 B is inferred, not isolated: `TreeBox.tsx` (a client module) now renders "Watch it grow" through `Button`.

- **Scenery.** Ten new files in `public/scenery/`: 252,958 B raw, 48,135 B gzip (`oak-leaves` 181,527 / 29,502; `oak` 37,013 / 9,927; `journey-rice` 14,731 / 2,870; `oak-branch` 7,205 / 1,957; `oak-moss` 4,706 / 1,202; `oak-branch-moss` 3,757 / 987; `journey-evening` 1,570 / 448; `lantern-night` 1,041 / 492; `journey-morning` 819 / 411; `lantern-day` 589 / 339). Over the wire in day, scrolled through: at 412x823 the Journey adds 7 requests, 47,380 B (oak, oak-leaves, oak-moss, oak-branch, oak-branch-moss, lantern-day, journey-morning); at 1440x900 6 requests, 46,953 B (the branch swapped for journey-rice). `sky-day.svg` is fetched once at both widths. "trà đá" pulls Newsreader's `latin-ext` file at night (not in perf's day row).
- **Tried and reverted:** `content-visibility: auto` on the oak's three containers, to keep the oak out of the load. It did not (other -2.9 KB: perf's window still reaches the Journey) and one of three runs showed CLS 0.0218.

**DOM.** Per section at 1440x900, before -> after: header 37 -> 37, `#about` 146 -> 146, **`#tree` 1782 -> 1830 (+48, budget +60)**, `#contact` 80 -> 80, footer 3 -> 3.

**Verification.** `pnpm verify` 5/5 (870 unit tests, 56 files; contrast 60 pairings, all >= AA, lowest 4.52:1). Retrieval eval, printed: recall@1 70.0%, recall@3 93.3%, recall@5 96.7%, MRR@10 0.807, unchanged with the new DoorDash impact line indexed. **e2e** at `--workers=2` against the production build: 790 passed, 1190 skipped, 0 failed (21.6 min), no retries needed.

**The owner's answers** (plan appendix, 2026-10-20): the corrected italic line and the new DoorDash impact line ship as approved; the 2 -> 25 workflow is `dd-feasibility-agent`, so the ticket's 2026 stub links to `#work-dd-feasibility-agent` (it opens the DoorDash row at the case study) and the 2025 half to the row; the hanging branch below 1280 is built; no rail; the 56px heading is kept.

**Decisions that changed the board or the plan:**
- **The stub is its own link.** Two papers joined at the perforation, each wrapped by its link, so the ring is never cut and nothing nests. Six tag links, not five.
- **From 640 to 1279 the branch runs down the middle and the tags take turns either side** (the hero's phone line does the same); one column at the right edge only below 640. The plan's single column left 60% of a 1024 screen empty. The branch rises into the crown to meet the limb, each tag hangs from a tapered twig of bark, and the branch fades out below the last tag.
- **Past 1440 the oak fades over its first 48 and last 96 px**, and the sky is one unwrapped tile: the frame's edges are on screen there, and a wrapped tile put a second sun at 1920.
- **Single tags' name row is `--step--1`**: at the board's 15px "Wordification 2024" wrapped its year in 140px.
- **"onboarded merchants/month" wraps to two lines** in the 210px ticket (the board sets it at 11px; the site's smallest step is 12.9px at 1440).
- `origin.spec.ts`'s "keyboard press from far above" now starts from the page top: the button sits ~160px above the box, so no scroll position has the button in view and the box far.
- `print.spec.ts`'s rail test no longer requires a rail (no section has one); its article-width check still bites.

**Screens** (`reports/r21-p4-screens/`, untracked): 360x740, 390x844, 414x896, 844x390, 768x1024, 1024x768, 1280x800, 1366x768, 1440x900, 1920x1080, day and night, plus 1440 day with "Watch it grow" playing. Against `NatJourney.png` / `NatJourneyNight.png` at 1440, beyond this plan's decisions: the site's header; the heading at x 160 (content column); tag values at `--step-4` (34px, board 32) and the ticket's at `--step-3` (28px, board 30); "Watch it grow" at x 72 (the gutter); the cats bottom right; the oak's fade at the viewport's edges. At 1280 the lantern is cut by the left edge (planned). At 390 the resting cats sit over the Wordification tag's year (the cats' branch owns them).

### R21-P4 phone fixes (reviewer, 2026-10-20)

- **One tree on a phone.** Below 640 the crown is mirrored and slid right so the foot of its trunk (board x 307 at y 640) stands on the branch the tags hang from; the branch is drawn at 100px there, as wide as the trunk, and starts 4px under it. The lantern, whose limb runs off the edge once mirrored, hangs from the long limb instead.
- **The branch's Spanish moss is dropped** (`oak-branch-moss.svg` deleted): hugging the stem it read as a rendering glitch. Scenery is now nine files, 249,201 B raw, 47,148 B gzip; a phone day load makes 6 Journey requests, not 7.
- **The "seam" at y ~860 was the screenshot, not the page.** The body's sky is `background-attachment: fixed`, and a full-page capture paints it one viewport high; a viewport screenshot of the same spot shows no seam. The screenshot script now takes a viewport tall enough for the stage.
- `pnpm verify` 5/5 (870 tests; eval 70.0 / 93.3 / 96.7 / 0.807); e2e journey + responsive + axe: 65 passed, 235 skipped, 0 failed.

## Round 21 phase 6 — Contact (2026-10-20)

The postcard board (`design/round-21-outdoors/v1/boards/NatContactPostcard*.dc.html`), built on `round-21/contact`. Plan: [2026-10-20-round-21-phase-6-contact.md](superpowers/plans/2026-10-20-round-21-phase-6-contact.md).

**Perf row** (`pnpm perf`, production build on `:3211`, default build (no Resend env), 0 skipped responses, five runs, bytes identical). **CPU read 100%** (`Win32_Processor.LoadPercentage`), so LCP (2740-4680 ms) and TBT (248-1382 ms) are noise.

| When | JS | JS at load | CSS | Fonts | LCP | TBT | CLS | DOM nodes |
|---|---|---|---|---|---|---|---|---|
| R21-P3 phone hero | 194,257 B | 167,695 B | 16,862 B | 97,076 B | 2720 ms | 463 ms | 0 | 2200 |
| After | 192,968 B | 166,405 B | 17,983 B | 102,620 B | 2740 ms | 623 ms | 0 | 2244 |

- **JS at load -1,290 B**: the business card is a server component again (the flip is retired); only `CopyButton` and the lead form stay client.
- **Fonts +5,544 B**: Newsreader italic's `vietnamese` file, pulled by "Xin chào," and "bánh tét and hoa mai, for Tết" (both Newsreader). The size matches the night-only file R21-P3 recorded; inferred, not isolated by request.
- **CSS +1,121 B**, **DOM +44** (the postcard, the seal, the scenery spans and the strip's two halves).
- Scenery: nine new committed SVGs (`public/scenery/`), 60,721 B raw in all, the postcard's picture 31,867 B of it. Only the active theme's lantern string is fetched (e2e).

**Contrast.** `pnpm contrast`: 62 pairings (+2: gold, `--greet`, on the night sky's top and bottom stops, 5.72:1 and 7.96:1), lowest 4.52:1 unchanged.

**Retrieval eval**, printed: recall@1 70.0%, recall@3 93.3%, recall@5 96.7%, MRR@10 0.807 (30 cases), unchanged. The chips changed (first person, four), not the engine or the eval set.

**Verification.** `pnpm verify` 5/5 (851 unit tests, 54 files). e2e against the production build on `:3211`, `--workers=2`: contact, ask, axe, responsive, print and companion specs 222 passed, 546 skipped, 0 failed; then the full suite 760 passed, 1052 skipped, 0 failed (19.4 min), no retries. An earlier full run failed 14, all from this phase's layout and fixed before the clean run: `scale.spec` held Contact's h2 to the 24-28px section-title size (the board sets "say hi." at the hero's display size; the test now pins the Journey only and gives Contact 40-72px), and a cold `/#ask` at 1024 and 1440 runs out of page before the 80px margin now that the chat is a short strip near the end (the test accepts a landing at the page's end with the whole strip on screen).

**Screens** (`reports/r21-p6-screens/`, untracked): `#contact` and the landing view at 360x740, 390x844, 414x896, 844x390, 768x1024, 1024x768, 1280x800, 1366x768, 1440x900 and 1920x1080, day and night; no horizontal overflow at any of them.

## Round 21 phase 7 — cats (2026-10-20/21)

Plan: `docs/superpowers/plans/2026-10-20-round-21-phase-7-cats.md`. Branch `round-21/cats`, main merged in at `7e3d650` (the Journey and Contact).

**What changed.** The cats are SVG symbol sprite sheets drawn once by `scripts/draw-cats.mjs` (`pnpm draw:cats`) into `public/cats/` — per cat a 3×3 of head directions, a 3×3 of reactions (blink, yawn, purr, startle, stretch, groom, bat, sniff, sleep) and an 8-frame walk, plus the police cat (Moon in a cap). The sleeping cell is the hero's "Moon, off duty" drawing itself. `tests/lib/cats.test.ts` fences the committed sheets. `CompanionCat` draws one `<use>` per frame instead of rebuilding a contour tree; the head follows a fine pointer while sitting, a press holds one reaction for 700 ms (one frame under reduced motion), the sitting tail sways in CSS. Coats (`--cat-coat`, mixed from `--fg-muted` into `--ground`) replace the ground knockout that read as patches on the sky. New: the Moon surprise (`companion-surprise.ts`; `MoonVisit` for reduced motion and touch), the parked pair's corner search (`pickCorner`: off controls, never on the focused one, peeking in from the edge when no corner is clear), the tree-show watchers seated beside the tree box, walks routed round text (`routeAround`, `slideOffText`, `walkClear`), bubbles kept off controls and prose.

**Size** (`pnpm perf`, production builds, 0 skipped responses, 3 runs each, bytes identical across runs):

| Build | JS | JS at load | Companion chunk (idle, raw / gzip) | DOM | CLS |
|---|---|---|---|---|---|
| main `0b5d8c4` (before) | 194,261 B | 167,698 B | 81,908 / 26,356 B | 2199 | 0 |
| `5ba2187` (cats, pre-merge) | 194,849 B | 167,696 B | 83,938 / 26,969 B | 2172 | 0 |
| main `df1472b` (Journey + Contact) | 193,799 B | 167,236 B | 81,908 / 26,356 B | 2293 | 0 / 0.0218 / 0 |
| `52390bd` (cats merged) | 195,491 B | 167,234 B | 86,746 / 28,071 B | 2266 | 0 |

JS at load −2 B against the same main; the idle companion chunk +1,715 B gzip (surprise, pointer tracking, corner search, routing); the sheets are 4.1 / 4.9 / 1.8 KB gzip (Moon / Mi / police), fetched with the chunk, not at load. DOM −27 nodes (one `<use>` per cat instead of a path tree). Two regressions found and fixed on the way: `createPortal` pulled react-dom's entry into a shared initial chunk (+103 B gzip at load; `MoonVisit` now draws on the fixed layer), and moving the parked pair by its insets was a layout shift (CLS 0.0042; now a transform).

**Verification.** `pnpm verify` 5/5 (909 unit tests, 58 files; contrast 62 pairings, lowest 4.52:1). Full e2e against a fresh production build of `52390bd` on `:3220`, `--workers=2`: 803 passed, 1207 skipped, 0 failed (39.3 min). Two companion specs were made independent of where the new watch leaves the pair (`queueARequest` waits for the lead to stop; the pointer that ends an unprompted scene moves towards the window's middle).

**Remaining.** The text routing is greedy (two corners at most, up to 4× the straight walk, inside the cats' band): a block of words as wide as the window is still crossed, by design rather than leave a cat stuck. Mini-Thien's spot is not checked against text (he stood on "Taylors, SC" in one 1280 night screen). The parked pair's peek shows Mi's tail, not a face.

### R21-P7 review fixes (2026-10-22/23)

Review: a cat stood on "Book a call with me" at 1366 (1366-day-walk.png); cats rested on the Record's cards, rows and stamps at 414 and 1280; the merge of main `ba45717` (the Record) and its tour stop. Fixes, all in `src/components/companion/`:

- **Never covering a control.** A cat whose walk crosses a link, a button or one of the Record's list items passes *under* it: the part of the cat over it is cut away by an even-odd clip (`passUnder`, `data-cat-under`), measured live each frame. A destination on one (a perch's trailing seat, a mate spot, an explorer's stop, a cat a scroll left at the window's edge) is nudged to clear ground (`offControls`), the explorer's stop moving with it. Where a phone's window holds no clear ground at all, a cat rests behind the row with only the part beside it showing. Mini-Thien's spot now prefers a clear head band (he had stood on "Taylors, SC").
- **Walks round words.** `routeAround` and `slideOffText` now follow a block's edge towards the end on the destination's side, keep that choice per destination, stay inside the cats' band, arrive straight at a stop that touches the block, and give up sliding after 2.5 s without progress. Each of those fixed a cat pacing on the spot (the nap and reading specs caught two of them).
- **Sheets fetched once.** `<use href="/cats/moon.svg#walk-3">` re-requested the file on every frame change (138 requests in 8 s; a phone page never reached network idle). Each sheet is now fetched once and each frame's symbol put on the page the first time it is drawn; the generator also joins consecutive stroke-only paths (Mi's sheet 735 -> 521 elements).
- **Merge.** The Record's tour stop and scene merged cleanly and play on the sprites; the stale `list-ink.tsx` comment is gone.

**e2e added:** at 1366 and 390 a screen at a time down the whole page, and over `#record` at 414 and 1280 with its list items, no cat walks over a control without passing under it or stays on one for about a second (checked to fail with `passUnder` off); the sheet test asserts one request per sheet.

**Size** (`pnpm perf`, production builds, 0 skipped, 3 runs, bytes identical): main `ba45717` JS 195,027 B, JS at load 168,400 B, companion chunk 26,418 B gz, 2,734 DOM nodes; this branch at `0c09d17` JS 198,194 B, **JS at load 168,396 B (-4 B)**, companion chunk 29,606 B gz (+3.2 KB, idle-loaded), 2,741 DOM nodes, CLS 0. Sheets 4.0 / 4.8 / 1.8 KB gz (Moon / Mi / police), fetched with the chunk.

**Verification** at `0c09d17`: `pnpm verify` 5/5 (932 unit tests, 60 files; contrast 62 pairings, lowest 4.52:1). Full e2e on a fresh production build, `--workers=2`: 821 passed, 1327 skipped, 0 failed (18.9 min).

## Round 21 phase 5 — the Record (2026-10-23)

The notebook board (`design/round-21-outdoors/v1/boards/NatRecordFinal*.dc.html`), built on `round-21/record` from `df1472b`. Plan: [2026-10-21-round-21-phase-5-record.md](superpowers/plans/2026-10-21-round-21-phase-5-record.md).

**Perf row** (`pnpm perf`, production builds, 0 skipped responses, three runs each, bytes identical within each build). Baseline: `df1472b` built in this worktree before any change, on `:3230`. After: this branch on `:3232`.

| When | JS | JS at load | CSS | Fonts | CLS | DOM nodes |
|---|---|---|---|---|---|---|
| Before (`df1472b`) | 193,799 B | 167,236 B | 19,602 B | 102,620 B | 0 / 0 / 0 | 2293 |
| After | 195,027 B | 168,400 B | 21,018 B | 117,868 B | 0.0218 in 4 of 6 runs | 2734 |

- **JS at load +1,164 B**: `RecordFilters.tsx` (the filters, the hidden-target reset, the invoker fallback) and `DialogImage.tsx`. The first build imported `getImageProps` from `next/image` in a server component, which put `next/image`'s client code in the initial JS (**+5,863 B**, measured, chunk compared against the baseline build); the image now mounts through a lazy client import on a dialog's first open, so `next/image` and the certificate load together on the press.
- **Fonts +15,248 B**: Newsreader italic's `latin-ext` file, pulled by the "đ" in "cà phê sữa đá, while I write" (spec copy). The Journey's "trà đá" already pulled it at night; now it loads by day too.
- **CLS 0.0218** is the hero, not the Record: the same shift (the bamboo pole and the hero's words, 39px down at ~5 s) reproduces on the `df1472b` build under perf's throttling (`reports/cls.mjs`, untracked); the baseline's three recorded runs happened to miss it.
- **DOM +441**: per section at 1440x900, `#tree` 1830 -> 492, `#record` 1736 (the rows of all 20 entries with their case studies, the slice, six dialogs), header 40, `#about` 146, `#contact` 119.
- **Scenery**: seven new files, 14,603 B raw, 4,329 B gzip (`stamp-rice` 6,067 / 1,329; `stamp-pine` 2,589 / 742; `stamp-fern` 2,183 / 755; `stamp-palmetto` 1,540 / 517; `pressed-lotus` 1,247 / 394; `record-morning` 521 / 305; `record-evening` 456 / 287). Certificate and award images: six files, 528,159 B, none over 140 KB, none fetched before a press (e2e).

**Contrast.** 62 pairings, lowest 4.52:1, unchanged: the wood, bark and kind marks carry no text (the kind is said in muted ink beside its mark).

**Retrieval eval**, printed: recall@1 70.0%, recall@3 93.3%, recall@5 96.7%, MRR@10 0.807, unchanged. Career-entry, case-study and degree documents cite `#record` now (`sectionId` is not on the search surface); the Record's own words and the certificates are not indexed.

**Decisions beyond the spec:**
- **No AT&T stamp** (owner instruction, 2026-10-21): the existing `att` certification is untouched and stays on `/resume`; the spec's "AT&T renders as a stamp with no dialog" is superseded.
- **Every entry is a Record row.** The Journey's timeline, its credentials line and its unbranched case studies are gone; the nine entries the drawing leaves out are rows like the rest, so their case studies, links and recordings open there.
- **`#work` lands on the Record** (the case studies are there); `#journey`, `#skills`, `#workshop` stay on the Journey.
- **Rows open to** the headline, impact (or `context` when an entry has none), technologies, type and dates, link, recording, award and case studies. "Ran alongside" stays on the drawing only.
- **Kind marks have shapes** (work a circle, study a square, milestone a diamond), so the kind never rests on colour; colours are their own `--kind-*` aliases (moss-deep, a new river teal, the red). Year labels are ink, not the board's red: red stays the single mark.
- **Card labels say the entry's type** ("Milestone"), not the board's "Award", which no field records.
- **The dialog needs no script**: invoker commands (`commandfor`/`command`), native Escape and focus return, `closedby="any"`; a click fallback for browsers without invokers rides in `RecordFilters.tsx`.
- **Layout**: the spread from 1280 (up to 1300px wide, as the board); stacked below. The left page's frame is the board's coordinates from 528px of page width (container query); on phones the slice is centred, the cards two to a row without strings, years over rows.
- Disclosure gained `dense` (32px rows from 1024; 44px below).
- The companion tour visits the Record (one line in `companion-tour.ts`, one scene in `companion-dialogue.ts`): `navItems` grew, and the tour derives from it.

**Verification.** `pnpm verify` 5/5 (894 unit tests, 58 files). Full e2e against a fresh production build on `:3232`, `--workers=2`: 806 passed, 1282 skipped, 0 failed (21.8 min). The run before it failed 22, all from this phase and fixed before the clean run: specs that still read the Journey's timeline (scale, print, reveal), the tour's stop count (three to four), and one companion nap test that passed on its isolated retry and in the clean run.

**Screens** (`reports/r21-p5-screens/`, untracked): `#record` at 360x740, 390x844, 414x896, 844x390, 768x1024, 1024x768, 1280x800, 1366x768, 1440x900 and 1920x1080, day and night, viewport-tall captures.

## Round 21 phase 8 — motion and polish (2026-10-24)

Spec §8 (`docs/superpowers/specs/2026-10-18-round-21-outdoors-design.md`) and the whole-site polish pass, on `round-21/motion` from `4d08a81`. The motion is CSS (`globals.css`, "Motion") plus `src/lib/glide.ts`; entrances are transforms only, so nothing is ever hidden (no JS, no `animation-timeline`, print and reduced motion all show the finished page).

**Perf row** (`pnpm perf`, production builds, 0 skipped responses, three runs each, bytes identical within each build). Baseline: `4d08a81` built in a second worktree. After: `round-21/motion` at its last commit.

| When | JS | JS at load | CSS | Fonts | CLS | DOM nodes |
|---|---|---|---|---|---|---|
| Before (`4d08a81`) | 198,990 B | 169,192 B | 21,052 B | 117,868 B | 0 / 0 / 0 | 2741 |
| After | 199,035 B | 168,821 B | 22,054 B | 117,868 B | 0 / 0 / 0 | 2743 |

- **JS at load -371 B** (budget: +512 B). The motion adds none; the one new line of script is `data-no-snap` in `TreeBox`'s Watch it grow handler.
- **CSS +1,002 B** as `pnpm perf` counts it: the entrances, the snap and the View Transition rules.
- LCP (2.3-2.7 s) and TBT (190-217 ms) are noisy at this throttle; the baseline's own three runs span 2316-2664 ms and 213-217 ms, and the new build's 2352-2556 ms and 203-216 ms.

**Decisions beyond the spec:**
- **Snapping is for scrolling.** `scroll-snap-type: y proximity` pulls a landing within about a third of a screen of a page's top back to that top: with it on everywhere, `/#record-2019` landed 489px off its row, a pressed card's row 126px off, and Watch it grow's centred box back to the Journey's top (20 e2e failures in the first full run). It now applies only while the URL names no fragment (`html:not(:has(:target), [data-no-snap])`); a nav click, a link or a cold load with a hash turns it off until the hash goes (Back), and Watch it grow sets `data-no-snap` for the visit. Wheel, touch and key scrolling are unchanged. The cost: after a first nav click a visitor no longer snaps.
- **Snapping off in the cat layout-shift probe** (`companion.spec.ts`), like scroll anchoring: a layout change makes the browser re-snap, a scroll the probe says it does not make.
- **Moon under 360**: it drops beside the headline's short lines (the rule is `!` so it beats the phone rule).
- **Tap targets**: the header logo, the Record's filters and the card's three links reach 44px below 1024; the card and postcard chips already reached it with a pseudo-element.

**Fixes found in the hunt** (each has an e2e):
- Contact at 320: the business card's rows set the grid track's minimum (309px in a 280px column), so the card and postcard ran 14px past the window and the page's clip cut their right edge. The track is `minmax(0, 1fr)` below lg.
- The "moon stays off the headline" check had never worked below 1024 (the computed `calc(100% + 520px)` read as NaN) and measured the whole headline block; it reads the calc and the headline line by line. That showed the moon under "curious" at 320.
- Focus ring on a Journey limb label cut by the tree box's top edge (three labels): the scroller keeps 24px of scroll padding.
- Headings wrapped one word on the last line ("dry.", "year."): `text-wrap: balance` on h1-h4; the field tag's stamp and values no longer strand a word.
- The Record's stamps hug the left below 1280: centred.

**Verification.** `pnpm verify` 5/5 (933 unit tests, 60 files; contrast 62 pairings, lowest 4.52:1). Full e2e on a fresh production build on `:3248`, `--workers=2`: 883 passed, 1523 skipped, 0 failed (20.4 min). The runs before it failed 20 (the snapping, above), then 2 (a ring click aimed at a notebook still opening; the card's links at 320), then 1 (the contact layout test read the postcard mid-entrance); each was fixed and re-run before the clean run.

**Not verified: WebKit.** No WebKit build is installed for this Playwright (`~/AppData/Local/ms-playwright` holds Chromium only), so the iOS sky fix (a fixed layer, not a `fixed` background) is checked in Chromium only.

**Screens** (`reports/r21-p8-screens/`, untracked): about, tree, record and contact at 320, 360, 390, 414, 768 (1800px tall), 844x390, 1024x768, 1280x800, 1366x768, 1440x900 and 1920x1080, day and night, viewport-tall captures stepped down each section.

## Round 21 polish 2 (2026-10-24/27)

Four small fixes from a hunt at phone widths, on `round-21/polish-2`. Started 2026-10-24 on `9b54c68` and stopped before its checks; finished 2026-10-27, re-applied on `78cae4a` (the Impeccable/Hallmark commit) by cherry-pick, and checked on a Mac (Chromium headless shell 1234, Node 24).

**Fixes** (each has a test):
- **Parked cats tuck off the edge rather than sit on words.** `pickCorner` used to skip the peek spots in its "covers no text" pass, so at 320 the pair sat on the postcard's "No message needed. I'll write first." and the chat's "I said" rather than peek in from the right edge. A peek now counts in that pass; every corner is still tried before any peek, so a clear corner still wins. Unit test, plus an e2e at 320 that scrolls the words to four heights.
- **Day-sky birds off the phone headline.** Below 1024 the sky is pinned right and only x < 920 of it shows, behind the headline at y 34 to 221 at every phone width; two birds sat on "curious" and "this" at 320. Birds that would start at x < 920 move 200 east (`scripts/draw-scenery.mjs`, `sky-day.svg` redrawn). The first attempt (clamping y) was wrong and is superseded in the same branch. The cost: a phone's morning has no birds. From 1024 they fly above the clothesline, clear of every word (checked at 1024, 1440 and 1920). Unit test: all five birds start at x >= 920.
- **A hyphenated word stays whole on a Journey tag.** "low-code." broke to "low- / code." on Schaeffler's tag; `\w+-\w+` runs are wrapped in a `whitespace-nowrap` span marked `data-whole-word` (the text is unchanged, and the no-nowrap test exempts the mark).
- **Field tag at 320: label over value below 380px.** The 104px label column wrapped five of the six values onto a second line ("Kiên Giang, / Việt Nam", "Taylors, / South Carolina"); below 380 each label stacks over its value.

**Checked by measurement and by eye** (`reports/r21-polish2-screens/`, untracked, before/after, day and night): "low-code." and "agent-driven" sit on one line inside their tag at 320, 390, 768, 1024, 1280, 1366, 1440 and 1920; the field tag's rows stay inside the tag at 320, 360, 375, 379, 380, 390 and 414; no bird at 320, 360, 390, 414 or 768; the parked pair peeks in clear of the postcard's and the chat's words at 320 and 360.

**Perf row** (`pnpm perf`, production builds on this Mac, 0 skipped responses, three runs each, bytes identical within each build). Baseline: `78cae4a` built in a second worktree. These are not comparable with phase 8's Windows row (this machine counts every script before `load`).

| When | JS | JS at load | CSS | Fonts | CLS | DOM nodes |
|---|---|---|---|---|---|---|
| Before (`78cae4a`) | 199,068 B | 199,068 B | 24,381 B | 117,868 B | 0 / 0 / 0 | 2601 |
| After | 199,059 B | 199,059 B | 24,418 B | 117,868 B | 0 / 0 / 0 | 2603 |

- **JS at load -9 B.** CSS +37 B (the `min-[380px]` grid and `whitespace-nowrap`); DOM +2 (the two whole-word spans). LCP 1072-1080 ms before, 1076-1084 ms after; TBT 0-4 ms.

**Verification.** `pnpm verify`: typecheck, lint, contrast (62 pairings, lowest 4.52:1) and 935 unit tests (60 files) pass; the build passes run outside the command sandbox (inside it next/font cannot reach Google Fonts and Turbopack cannot bind its worker port). Full e2e on a production build, `--workers=2`: 878 passed, 1528 skipped, 6 failed (14.7 min). None are the branch's; each was re-run three times on both builds:

| Test | polish-2 | `78cae4a` |
|---|---|---|
| legacy-anchors: a case study's fragment opens its row and lands on it (JS off; 320, 768, 1440) | 9 of 9 fail | 7 of 9 fail |
| origin: scrolling away mid-story doesn't end it (1440) | 3 of 3 fail | 3 of 3 fail |
| companion: they keep off the Wordification tag's year, Contact's lede and the postcard's greeting (a walking cat on the lede at 1280) | 1 of 3 fail | 2 of 3 fail |
| legacy-anchors: per-entry fragments land on their own Record row (`eastside-high` at 69px, not 80; 1440) | 0 of 3 fail | 0 of 3 fail |

Phase 8's clean run (883 passed) was on Windows; the first three fail on `main` on this Mac too, so they are open against `main`, not this branch. The fourth failed once in the full run only.

**Design checks.** Hallmark sloplint on the two changed components: 2 FAIL, 2 REFLEX, all on lines the branch does not touch and all intentional or noise under the-pass (26a/26b "no focus or active styling anywhere" is per-file; the focus ring is global; 64/67 are Courier Prime and the tracked stamp). Impeccable detect at 1440 and 390x844: 7 findings each, none from this branch (4 `text-occlusion` on the tag backs' "Read this part" and 2 `nested-cards` on the notebook page, both intentional; 1 `tight-leading` at 1.25x, which the branch does not touch).

**Not verified: WebKit**, as in phase 8.

## Round 21: e2e on a Mac (2026-10-27/28)

On `round-21/e2e-mac`, from polish 2. Three tests that also fail on `main` on this Mac (Chromium headless shell 1234; phase 8's clean run was on Windows), each diagnosed before it was touched.

**Fixed:**
- **A case study's fragment lands on it with JavaScript off** (`legacy-anchors` "a case study's fragment opens its row and lands on it": 7 of 9 failed on `main`, 9 of 9 on polish 2). The `:target` rule in `globals.css` opened the row through its `Disclosure` transitions: grid rows over `--dur-reveal`, visibility held hidden for the same delay. Where the first style pass did not yet match `:target`, the browser scrolled to the fragment on the reveal's first frame (document 6,009px, row hidden), and the opening row then grew the document to 6,803px and pushed the case study 1,281px below the landing (1440). That is a real reader with JavaScript off landing on nothing, not a test artefact. The targeted row now opens with `transition: none`. After: the case study is at 96px on the first frame at 1440, and the test passes 15 of 15 (5 each at 320, 768, 1440).
- **The origin story's off-screen test waits out the flight** (`origin` "scrolling away mid-story doesn't end it": 3 of 3 failed on `main`). Measured, the story does not pause when scrolled away: its captions change at the same times with and without the scroll. But the caption the test reads first is the flight's, held `FLIGHT_MS` (3s), not a season's 2s, and the test gave it 3s to change: a race a quicker machine loses. The wait is 5s and the comment says why. 5 of 5 after.

**Not fixed: a walking cat crosses Contact's lede at 1280** (`companion` "they keep off the Wordification tag's year, Contact's lede and the postcard's greeting": 2 of 3 failed on `main`, 1 of 3 and 2 of 3 on later runs). Two causes, both traced:
1. `groundProse` (what a walk goes round) includes text clipped out of sight. The scan keeps clipped boxes on purpose for resting (a false "occupied" only sends a cat elsewhere), but the walks read the same list: at 1280 the Journey tree box's lower branch labels lie, laid out, under Contact's header, and a walk spent both of `viaFor`'s detours going round those, then crossed the lede on its last leg. At the Record view, 40 of the 94 prose boxes a cat sees are clipped like this.
2. `slideOffText` picks its slide axis from the walk's main direction, not from the edge the step meets, so the follower under the lede, heading far up and right, was slid up into it, refused, and stepped across.

Both are fixed on `round-21/cats-lede-wip` (`b729705`, with unit tests): prose is cut to what its clipping ancestors show, and a slide follows the edge it meets. The lede probe then went from about 1 crossing in 2 to 0 in 15. **It is not merged** because it costs elsewhere: "each explorer leaves its stop on its own clock" failed 6 of 39 runs with it against 0 of 54 without, and 3 of 16 with the clipping change alone, so the clipping is the cause. With the phantom labels gone, the cats meet the Record's year column (the `H4`s at x 760-824, three tall blocks with 13px gaps, narrower than a 42px cat) and stall against it, walking on the spot at (712, 363) and (822, 190) until `slideMemo` gives up after 2.5s. The phantom boxes had been hiding that weakness. Fixing the lede for real means routing round a run of blocks as one obstacle, a decision about the cats' movement rather than a test fix.

**Verification.** Typecheck, lint, contrast and 935 unit tests pass; production build passes. On the final build: `legacy-anchors`, `origin` and `record` specs in full, 84 passed, 0 failed; "each explorer leaves its stop on its own clock" 3 of 3; the lede test still fails as on `main`. The last full e2e (which carried the cat changes too) was 883 passed, 1 failed (the clock test, above).

## Round 21: cats round runs of text (2026-10-28)

On `round-21/cats-runs`, from `round-21/e2e-mac`: the parked lede fix (`b729705`, as `78a4c52`), plus routing round a run of blocks as one (`8c97479`).

**What changed.**
- **Runs** (`proseRuns`). Two blocks of words are one run when they are stacked (sharing at least half the narrower one's width) or side by side (half the shorter one's height), and the gap is narrower than a cat plus `routeAround`'s 6px margin either side (62px across, 54px down). A walk goes round the run's box (`walkObstacles`). A run either end of the walk stands in goes back to its own blocks, so a stop in a notch beside a short heading is still reached.
- **Only stacked or side by side.** The first version grouped any two blocks a cat could not pass between. The postcard's greeting is 48px under Contact's lede and overlaps its last 75px, which made the header an L whose box ([80,113]-[851,383] at 1280) was mostly empty floor. The cats' stops were in it, the run came apart, and the lede was crossed every time (20 of 20). Found with a frame log of the follower's walk, after a guess about her seat proved wrong.
- **No way round, crossed at once.** At 1440 the year column and its rows are one run the height of the window ([760,65]-[1330,840], 9 blocks). Where neither end is inside the cats' band, `slideOffText` now crosses at once, as `routeAround` already did, instead of sliding to the band's edge first.
- **The clock test watches for a minute.** Stays run 6-18s, and a walk round the year column to the margin beside the timeline takes about 5s. Its 40s window left the tabby two departures, under the floor of three, in 3 of 20 runs. Each of those still had departures far apart, which is what the test checks.

**Measured** (the clock test's setup at 1440, six runs each, every walk recorded):

| | Path ÷ straight line (walks after the first) | Walking on the spot |
|---|---|---|
| `round-21/e2e-mac` | 1.11 | 4.4 s |
| `round-21/cats-runs` | 1.43 | 0.7 s |

The cats now go round the end of the year column, the only way to the margin that crosses no words, instead of pacing against it and then crossing. That trip is about twice the straight line.

**Repeat runs on the final build:**

| Test | Result |
|---|---|
| they keep off the Wordification tag's year, Contact's lede and the postcard's greeting | 20 of 20 (fails 1 in 2 on `round-21/e2e-mac`) |
| each explorer leaves its stop on its own clock | 20 of 20 with the minute window |
| Lede probe at 1280 (a walking cat ever on the lede, 25s; on the build before the slide rule) | 0 of 10 |

**Perf row** (`pnpm perf`, production builds on this Mac, three runs each, 0 skipped responses, bytes identical within each build). Baseline: `round-21/e2e-mac`.

| When | JS | JS at load | CSS | Fonts | CLS | DOM nodes |
|---|---|---|---|---|---|---|
| Before (`3807d17`) | 199,059 B | 199,059 B | 24,421 B | 117,868 B | 0 / 0 / 0 | 2603 |
| After | 199,706 B | 199,706 B | 24,421 B | 117,868 B | 0 / 0 / 0 | 2603 |

- **JS at load +647 B**: the clipping, the runs and the slide rule, all in the companion module. LCP 1084-1096 ms before, 1084-1092 ms after; TBT 0-1 ms.

**Verification.** Typecheck, lint and contrast pass. 945 unit tests pass, including a walk simulation that stalls against the year column without runs. Production build passes. Full e2e on the final build: 884 passed, 0 failed. Not checked: WebKit; the run boxes at 768 and 1024 beyond the full e2e.

## Round 22: the hero's actions (2026-10-28)

From the whole-site critique of 2026-10-28 (Impeccable, dual-agent, 25/36; snapshot in `.impeccable/critique/`, screens in `reports/r22-review/`, untracked). Owner's answers: all five priority issues this round, the hero first; the headline stays; one red per screen. On `round-22/hero`.

**What changed.** Each hero action now names where it lands.
- **"See what I've built"** (was "Start with where I'm from") goes to `#tree`, as before. The Journey opens on the work, and below 1024 it draws no origin at all, so the old label promised a place the link never showed.
- **"Send me a postcard"** (was "Book a call with me") when `BOOKING_URL` is unset: it goes to `#contact`, where the postcard is and no call can be booked. With a booking URL it still says "Book a call with me" and opens that link.
- **Below 640 the actions stack.** The shorter labels fit one row from 390 to 479, and there the quiet one ran into the phone line's bamboo pole, which starts 24px above the row's foot at the right (`hero.spec` "below 1024 the line's scenery clears the words and the actions" failed at 390). Stacked, both clear the pole at every width from 320 to 639, measured; from 640 they share a row with 70px to spare.
- **The headline is a recorded exception** to `docs/voice.md` rule 4, by the owner's ruling.

**Verification.** `pnpm verify`: typecheck, lint, contrast (62 pairings, lowest 4.52:1) and 945 unit tests pass; the build passes. Full e2e on a production build, `--workers=2`: 885 passed, 0 failed (16.7 min), including a new 460px case of the scenery test. Checked by eye at 1440 and 375, day and night. Impeccable detect at 1280 and 390: no finding in the hero (the same seven as the critique). Hallmark on `HeroIdentity.tsx`: 26a/26b only, per-file noise (the ring is global; `Button` owns the states). No perf row: neither file is a client component, so no JavaScript moved.

## Round 22: Contact, the postcard first (2026-10-29)

On `round-22/contact`, from `round-22/hero` (`ae308a4`). Two of the critique's Contact findings; the board's reds are a later step.

**What changed.**
- **The postcard leads, at every width** (owner's choice of three: "postcard first, mirrored"). It comes before my card in the markup and on the page, and inside it the address side (the form) comes before the picture. At 390 the name field is 354px under "say hi." (was 1,182px: the 470px card, then the 303px picture band). From 1024 the board is mirrored: the postcard left, the card right, the card turned +2.5° and the postcard −1.2° to match; side by side the form is the postcard's left half, the stamp and postmark moved in to stay off the divider. Reading, tab and visual order agree everywhere; the card is no longer the section's introduction.
- **"Ask" is a secondary control**: Button's `secondary` recipe by hand (outlined in `--rule`, ink text, squared like Send). It was a moss pill in `bg-accent`, a second primary beside "Send the postcard" and a fill in the colour kept for links, values and annotation.

**Tests.** "Tab runs from the postcard into my card" replaces "from my card into the postcard"; the layout test asserts the postcard left of / above the card; the unit test pins postcard → card → chat and form → picture. The parked-pair test at 320 scrolled to the postcard's words and relied on that bringing the lazy chat in range; with the card now between them it never loaded, so the test scrolls to `#ask` before reading "I said" (5 of 5 after).

**Perf row** (`pnpm perf`, production builds on this Mac, three runs each, 0 skipped responses, bytes identical within each build). Baseline: `ae308a4` built in a second worktree.

| When | JS | JS at load | CSS | Fonts | CLS | DOM nodes |
|---|---|---|---|---|---|---|
| Before (`ae308a4`) | 199,706 B | 199,706 B | 24,451 B | 117,868 B | 0 / 0 / 0 | 2603 |
| After | 199,707 B | 199,707 B | 24,427 B | 117,868 B | 0 / 0 / 0 | 2603 |

- **JS at load +1 B** (the Ask button's class string). LCP 1076-1104 ms before, 1084-1100 ms after; TBT 0-6 ms.

**Verification.** `pnpm verify`: typecheck, lint, contrast (62 pairings, lowest 4.52:1) and 945 unit tests pass; the build passes. Full e2e on a production build, `--workers=2`: 884 passed, 1 failed (15.6 min), the parked-pair test above, fixed and re-run 5 of 5. Checked by eye at 390, 768, 1024 and 1440, day and night (`reports/r22-contact/`, untracked); no horizontal overflow at any of them. Impeccable detect at 1280 and 390: the critique's seven, none in Contact. Hallmark on the three Contact files: 26a/26b per-file noise; 67 on the card's title, Courier's label voice.

## Round 22: the Record, and one red per screen (2026-10-29)

On `round-22/record`, from `round-22/contact` (`92f412c`). The critique's last two priority findings, plus two small ones.

**What changed.**
- **The pressed board stays in view** from 1280, where the pages lie side by side. `RecordPressed` is sticky 96px under the viewport's top, inside a wrapper that ends above the desk vignette. Opening DoorDash's row grows the right page by about 2,000px; that used to be bare ruled paper on the left, and now the slice (each ring a link to its year) and the five cards ride down beside the row. The board is 550px tall at 1440, so it fits a 720px-tall screen whole. Below 1280 the pages stack and nothing is sticky.
- **The five pressed are re-picked**: DoorDash, Wordification, Schaeffler, CockyHacks (Best Design) and the USC research scraping. They were DoorDash and four milestones (graduation, CockyHacks, Magellan, Code to Give), so the left page said "my best ones" over mostly awards. Now four are roles with a measured result and one is the award that has a certificate and a recording. The bold rows on the right page follow `featured`.
- **A milestone is lacquer, not red.** `--kind-milestone` now points at a new token, `--color-lacquer` (`#7d5410`, sơn mài's brown-gold). The diamond shape stays, so the kind never rests on colour alone. Lacquer is measured at 4.5:1 or better on the paper, the night paper and both woods (four new rows in `docs/contrast.md`; a mark needs only 3:1). The Record now has no red at all.
- **Contact keeps one red by day: the seal.** `--greet` ("Xin chào,") is ink by day; at night it is still the lanterns' gold, so the night board was already down to the seal. The lanterns, the flag stamp and the postcard's sun are drawings, not interface.
- **"No institution" → "On my own"** on the 2019 entry: the row read "Whatever I felt like learning, No institution", like a placeholder left in.
- **Contact's lede follows the page**: "Send me a postcard and I'll reach you, or take my card." (was "Take my card, or send me a postcard…", from when the card came first).
- **The form's error line counts and speaks in my voice**: "One thing above to fix, then this can reach me." (or "2 things…"). The email-or-phone error counts once. It was "Please fix the highlighted field." even with two fields marked.

**Triaged and left.** The ring bands (4-21px) stay for now and are still open: a ring is a shortcut to a year that is right beside it on the right page, but the year headings there are not links, so WCAG 2.5.8's equivalent exception does not strictly cover them. The fix is a year index on the right page, a separate change. The Résumé / Save contact chips are 34px to the eye and 44px to the pointer (`before:` grows the hit area), so the 41-42px the detector read is the visual box. The companion panels' rgba shadows are fixed on purpose, like the paper shadows. The stamp captions keep `line-clamp-2`; the dialog each stamp opens carries the full name.

**Tests.** The record unit test pins the new five. `record.spec` "a pressed card opens its row" now opens the last card (the USC research row, far down the right page). A new e2e test opens DoorDash's row and checks the board holds at 96px at 30% and 50% of the notebook and ends above the cup at its foot.

**Perf row** (`pnpm perf`, production build on this Mac, four runs, 0 skipped responses, bytes identical across runs). Before is the previous row.

| When | JS | JS at load | CSS | Fonts | CLS | DOM nodes |
|---|---|---|---|---|---|---|
| Before (`92f412c`) | 199,707 B | 199,707 B | 24,427 B | 117,868 B | 0 / 0 / 0 | 2603 |
| After | 199,742 B | 199,742 B | 24,466 B | 117,868 B | 0 / 0 / 0 / 0 | 2604 |

- **JS at load +35 B**: the counted error line in `LeadForm`. CSS +39 B (the sticky utilities and the lacquer token). DOM +1: the sticky wrapper. LCP 1076-1092 ms; TBT 0-5 ms.

**Verification.** `pnpm verify`: typecheck, lint, contrast (66 pairings, lowest 4.52:1) and 945 unit tests pass; the build passes. Full e2e on a production build: 886 passed, 0 failed (3.7 min); after the lede change, Contact, Record and the cats again on a fresh build: 133 passed. Against `pnpm dev`, `origin.spec` "a press mid-growth restarts it with one player…" fails with or without this branch's changes: it gets extra start/end pairs from dev mode's doubled effects. It passes against the production build, which is what the gate runs on. Checked by eye at 1440, day and night (the Record) and day (Contact).

## Round 22: owner's five (2026-10-29)

On `round-22/record`, after `e1ef3c3`. The owner's list: a sharper Contact line, the Journey's tree below 1280 ("looking broken"), an auto-scroll glitch, a boring nav, and a glitchy chat. Plus the open item from the last entry, the ring tap targets.

**What changed.**
- **The glitch: section scroll-snapping is gone.** The four pages had `scroll-snap-type: y proximity`, so stopping within about a third of a screen of a page's edge pulled you onto that page's top ("when I come too close to the border it zooms me to the board"). Removed, with TreeBox's `data-no-snap` hook. `motion.spec` now checks that a wheel scroll stopping 120px short of the Record's top stays there.
- **Contact's lede**: "One postcard, two lines, and the next move is mine." (10 words; the owner asked for attention and brevity).
- **The chat is one size from the start.** The thread is a fixed window (17rem, 20rem from 1024) with the resting promise inside it, so the first question no longer grows the strip by about 170px. "Clear" sits in the heading row, laid out but invisible and inert until there is a turn, so it no longer pushes the thread down 44px. A new turn lands at the window's top, not its bottom (a tall answer used to arrive at its last line). The turn labels sit above the text, not in a 4.75rem column (phones had about 230px for the answer). Source lines read "From …" in body type. On a touch screen an ask no longer focuses the field (which opened the keyboard), and it brings the thread into view if it is off screen. `--ask-room` is re-measured: now a step per width range (the idle chat changes height only where the suggestions re-wrap), never short, measured every 4px from 320 to 1920.
- **The nav.** The phone menu is a trail map: "The trail · 4 stops", each page a stop on a dashed twine path with its number, the one you are on filled and marked "you are here", and one fact per stop computed on the server (`profile.title`, the drawn branch count, the entry count, the postmark's place). TL bleeds off the foot at 6%, as on my card. On desktop each link carries its chapter number, drawn by CSS so the link's text is still just its label. TL itself now hangs on a small paper tag (`.brand-tag`, the "or try" tags' recipe, in the paper scope so it has dark ink at night) and swings level on hover.
- **The Journey below 1280 is one tree.** The crown is at least 900px wide (it was the viewport's width, so on a phone the trunk was a 12px twig) and placed so its trunk carries straight on into a new drawn trunk (`oak-trunk`, `-leaves`, `-moss`): it starts at the crown's exact trunk width at its cut (46.5 board units × 900/1440 = 29.1) and lean, then runs straight to new roots (`oak-roots`) at the stage's foot. It replaces `oak-branch`, a thin pole that rose into the crown's limb beside the crown's own trunk, which stopped flat in mid-air. Each tag hangs by its string from a leafy bough of its own (`oak-bough`, `-leaves`, stretched from the tag's middle into the trunk) instead of a 24px bark sliver. All drawn by `scripts/draw-scenery.mjs`.
- **Tags** (every `Tag`: the Journey's, the hero's chapter tags and field tag) get a reinforcing ring round the hole, as on a real shipping tag.
- **The Record's years are links**, 44px tall, under its heading. A ring can be 4px wide, under WCAG 2.5.8's 24px; these lead to the same years, and a filter that hides a year gives way to All, as it does for the rings.

**Perf row** (`pnpm perf`, production build, four runs, 0 skipped responses, bytes identical across runs). Before is the previous row.

| When | JS | JS at load | CSS | Fonts | CLS | DOM nodes |
|---|---|---|---|---|---|---|
| Before (`e1ef3c3`) | 199,742 B | 199,742 B | 24,466 B | 117,868 B | 0 | 2604 |
| After | 200,314 B | 200,314 B | 24,452 B | 117,868 B | 0 / 0 / 0 / 0 | 2660 |

- **JS at load +572 B**: the trail menu's markup in `SiteNav` and the chat's touch handling (the chat itself is lazy, so mostly the nav). DOM +56: the year links, the boughs, the trunk's layers, the tags' rings. LCP 1080-1100 ms; TBT 0-6 ms.

**Verification.** `pnpm verify`: typecheck, lint, contrast (66 pairings, lowest 4.52:1) and 945 unit tests pass (the scenery test re-checks every new file against a fresh draw); the build passes. Full e2e on a production build: 885 passed, 1 failed (`record.spec` read the desktop link's text, which then included its number; the number is now drawn by CSS). After that fix, the Record, navigation, axe (both themes, all tones), Journey, Ask, motion and scale suites on a fresh build: 319 passed. Checked by eye at 375, 846 and 1440, day and night.

## Round 22: one tree (2026-10-30)

On `round-22/record`, after `3286115`. The owner, on the Journey at 1600: "those journeys have 2 tree is pretty tough, how we make it better here? for user experience!" Below the oak (from 1024) sat a second tree, the drawn career tree, in a 720px box of its own holding a drawing about 2,000px tall: a scroll box inside the page, in thin lines under a painted oak, repeating what the Record's rows say right below it. The owner chose one tree, with Watch it grow growing the oak.

**What changed.**
- **The drawn tree is gone**: `DrawnTree`, `TreeBox`, the `OriginStory` player and its loader `WatchOrigin`, `tree-labels.ts`, and about 470 lines of the player's CSS. Every fact the drawing held (each entry's headline, technologies, impact) is in its Record row.
- **Watch it grow grows the oak** (`GrowOak.tsx`, a small client island). A press stamps `data-growing` on `#tree`: the oak opens out from its trunk's foot (below 1280 the trunk rises first, then the crown), each tag waits hidden and drops onto its string on its own `data-year` with the drop it already had on scroll, and the lantern comes last. A paper caption under the button (beside it from 1280) reads each beat of `growBeats()`: the flight, a season per year, "still growing". About 10 s; the button says Skip meanwhile, and Skip or Escape ends it at once. It hangs over the oak, so the page never moves (an e2e test pins the crown's offset). Not shown under reduced motion or with JS off: the grown oak is the end state. Below 1280 the button now sits under the heading, above the oak it grows; from 1280 it keeps its board spot.
- **The cats** narrate it through the same `origin-story` / `origin-story-beat` events, and sit just above the button to watch. Their facts no longer count the drawing's branches and leaves (nobody can see them now): they count the oak's tags ("5 tags! Batting all!") and every technology on the Record. The `origin-story-ack` events, which only the old player listened for, are gone.
- **The Journey's lead** was untrue once the drawing went ("Every job I've had is a branch, and the tools I used there are its leaves"): it is now "Planted in 2018 and still growing. Each tag holds a number I measured." A unit test holds the year to `origin.arrivedYear`. The nav's Journey stop reads "5 tags".

**Perf row** (`pnpm perf`, production build, four runs, 0 skipped responses, bytes identical across runs). Before is the previous row.

| When | JS | JS at load | CSS | Fonts | CLS | DOM nodes |
|---|---|---|---|---|---|---|
| Before (`3286115`) | 200,314 B | 200,314 B | 24,452 B | 117,868 B | 0 | 2660 |
| After | 199,372 B | 199,372 B | 23,754 B | 117,868 B | 0 / 0 / 0 / 0 | 2283 |

- **JS at load −942 B**: `TreeBox` and `WatchOrigin` out, `GrowOak` in (the player itself was a lazy chunk, never in this column). CSS −698 B. DOM −377: the drawing. LCP 1080-1100 ms; TBT 0-4 ms.

**Verification.** `pnpm verify`: typecheck, lint, contrast (66 pairings, lowest 4.52:1) and 920 unit tests pass (`TreeBox.test` and the old clock's tests went with the code; new tests drive the show on fake timers: beats, tag years, Skip, Escape, reduced motion, the cats' events); the build passes. Full e2e on a production build: 857 passed, 0 failed (3.5 min; `origin.spec` was retired with the player, the Journey spec now grows the oak at 1440 and 390). Checked by eye at 1600, 1440, 900 and 390, day and night. Hallmark's 26a/26b on `GrowOak.tsx` are noise: its control is the shared `Button`, which carries the focus ring (the Journey e2e measures it) and the states.

**Left for later.** `src/lib/knowledge-tree.ts` outlived the drawing: `buildCareerTree`, `buildDrawnTree`, `DEMOTED_ENTRY_IDS` and `concurrentWith` are tested but no longer rendered.

## Round 22: Bé Nhi (2026-10-30)

On `round-22/record`, after `8c8ca07`. Feedback from Thien's girlfriend: "add my girlfriend character dumb dumb cute cute easy mood changing!", with four photos of her. The owner chose both places offered: on a rope swing under the Journey's oak, which everyone sees, phones too, and walking with mini-Thien in the cats' scenes (desktop, roaming on). Her name on the page is what he calls her, Bé Nhi.

**What changed.**
- **Her drawing** (`src/components/companion/MiniNhi.tsx`), inline line work in mini-Thien's two-pass style, drawn from the photos' traits, never from the photos: long black hair parted in the middle (the one washed part, at mini-Thien's density), thin oval glasses, round cheeks, a buttoned cardigan, the bunny she carries. Five faces, each from a photo: `pout` (the mirror selfie), `grin` (the FaceTime), `huh`, `sleepy`, `hug`. Standing beside mini-Thien, sitting on the swing.
- **The swing** (`NhiSwing.tsx`, a client island inside `HangingTags`). From 1280 its ropes are tied round the oak's left limb at board x 212 and 264, between the lantern and the trunk; below 1280 it hangs from a bough of its own under the last tag, so the trunk runs on past her to its roots. She is ink on paper (`[data-paper]`) in both themes, like the tags. "Easy mood changing" with no timer: a press gives her a new mood and a push (one damped sway, none under reduced motion); she has changed her mind each time she comes back into view; she falls asleep at night and grins at the morning; she grins while the oak grows and hugs it at the end. Each change hangs her line over her head ("hứ!", "hihi!", "hả?", "zzz…", "mine!"); the caption beside the seat always says how she is ("Bé Nhi, pouting"). Only a press is announced (`aria-live`). Her words are `journey.swing` in the content file, not indexed by the chat.
- **With the cats**, she walks a step behind mini-Thien, the pair flipping together; every place that probes, clears or captions him uses the pair's width (`PAIR_W`). A new face every beat (`nhiMood`, picked by the beat's words).
- The caption first sat under the swing, in the strip where the cats wait above Watch it grow; the companion e2e caught them unable to settle, so from 1280 it sits beside the seat under the lantern.

**Perf row** (`pnpm perf`, production build, 0 skipped responses). Before is the previous row.

| When | JS | JS at load | CSS | Fonts | CLS | DOM nodes |
|---|---|---|---|---|---|---|
| Before (`8c8ca07`) | 199,372 B | 199,372 B | 23,754 B | 117,868 B | 0 | 2283 |
| After | 204,012 B | 204,012 B | 24,071 B | 117,868 B | 0 | 2321 |

- **JS at load +4,640 B**: the swing is a new interactive island on the page, so it loads with it: `NhiSwing` and her drawing (its paths are most of it). Expected, not a leak; the companion's lazy chunk carries its own copy of the drawing, not loaded up front. If it ever needs trimming, the five faces could render on the server with the island only switching which shows. CSS +317 B, DOM +38. LCP 1108 ms, TBT 2 ms.

**Verification.** `pnpm verify`: typecheck, lint, contrast (66 pairings, lowest 4.52:1) and 929 unit tests pass (`NhiSwing.test`: every face distinct, a press changes her mood and is announced, the push skipped under reduced motion, the show's and the theme's moods); the build passes. Full e2e on a production build: 860 passed, 0 failed (new: she swings clear of the tags at 1440 and 390 with a 44px target and changes on press; under reduced motion she changes and nothing moves). Checked by eye at 1440, 900 and 390, day and night, and the pair in the hello scene in both themes. Hallmark 26a/26b on `NhiSwing.tsx` are noise: the global `*:focus-visible` draws the ring, the push is her press state, and she is never disabled.

### Bé Nhi, cuter, with her bunny plush (2026-10-30)

Thien: "Make my girlfriends character more cuter more beautiful!", then "my girlfriend love miffy as well!! so add a plush miffy with her!".

**What changed** (`MiniNhi.tsx` only, plus the ride's height in globals.css).
- **Chibi proportions**: the head is nearly as big as the rest of her (face 16 units wide in a 28 box), legs shorter, little round shoes, mitten hands.
- **Her face**: big eyes, dark ovals with a catch-light and a lash, behind bigger round glasses; blush as three manga strokes on each cheek (strokes, not a tint: colour is never decoration); new faces for each mood: half-moon eyes under heavy lids for the pout, a "ω" smile for the hug, a bubble at her nose when she sleeps.
- **Her hair**: more volume, curtain bangs, tips curled in, a shine in the ground's colour, and a bow.
- **A collared cardigan**; standing, one arm waves.
- **The plush**: she loves Miffy, so she carries a bunny plush in a little dress, at her side standing and on her lap on the swing. It is not Miffy: no X mouth and no name, because Miffy's design belongs to its owners and they enforce it (they took Sanrio to court over a lookalike rabbit). Noted in CLAUDE.md so a later change does not draw the real one.
- The drawing now has two layers, behind (legs, cardigan, face, hair) and in front (arms, hands, plush, bow), each knocked out then inked, so what is in front of her hair is not washed by it.

**Perf row** (`pnpm perf`, production build, 0 skipped responses). Before is the previous row.

| When | JS | JS at load | CSS | Fonts | CLS | DOM nodes |
|---|---|---|---|---|---|---|
| Before (`d2f5d81`) | 204,012 B | 204,012 B | 24,071 B | 117,868 B | 0 | 2321 |
| After | 205,454 B | 205,454 B | 24,072 B | 117,868 B | 0 | 2352 |

- **JS at load +1,442 B**: the drawing's extra line work (her face, hair, plush); nothing else moved. DOM +31 (the swing's svg). LCP 1132 ms, TBT 6 ms.

**Verification.** `pnpm verify` passes (929 unit tests; contrast 66 pairings, lowest 4.52:1). Full e2e on a production build: 860 passed, 0 failed. Every mood checked by eye on a sheet at 4× and 1×, standing and sitting, on both grounds; then on the swing at 1440 by day and night and at 390, and beside mini-Thien in the hello scene.

## Round 22: five from the owner (2026-10-31)

On `round-22/record`, after `d2f5d81` (with the cuter Bé Nhi above, also uncommitted). Five notes from Thien, with screenshots.

1. **A cat sat on the Taylors tag** (below 1024, the other half cut out where it overlapped the tag). The cats' stops are probed against cached boxes, re-measured on scroll, resize, body resize and `animationend`; the hero's tags below 1024 sway with a scroll-driven animation that fires no `animationend`, so a stop could be probed against a tag that then swung under it. Not reproduced exactly (the closest run put a sleeping cat on the USC tag's corner at 820), so the fix is a net under every such path: a cat at rest whose drawn box still covers a control 600 ms later (`ON_CONTROL_MS`) re-measures the page and drops its held stop and settle spots, so it is sent somewhere clear. Once per spot, so a home that cannot clear does not churn (`Companion.tsx`, after `passUnder`).
2. **The bamboo looked AI.** Both poles are redrawn by a shared `culm()` in `scripts/draw-scenery.mjs`: a washed stalk that tapers going up with a slight lean, each node a raised ring over its sheath scar, a highlight down the lit side, fibre marks above the nodes, a new shoot at the tip; sprays of drooping, lance-shaped leaves with midribs, no two alike, the crowns irregular (more into the open sky than the line), a short sprig now and then down the pole.
3. **The oak looked off at medium widths** (a small crown capping a thin, tall trunk). From 640 to 1280 the crown is 128% of the stage (`--crown-w`), running off both edges: a fuller canopy and, sized from it, a thicker trunk. Boughs thicker (`OAK_BOUGH` w0 9 → 13).
4. **The Record's link and "See the award" ran into each other** (both inline-flex in a `space-y` stack): they are one wrapping row now with a gap. The recording beside them showed a blank frame in the screenshot; it plays here (Chromium, the app's browser, a production build), so as a guard the poster is also painted under the video, and the frame is never empty while the first frame loads.
5. **The tag shape.** The owner chose a classic shipping tag for every tag: both top corners cut deep at 45° (`.tag-cut`'s `--cut`, 30px, 36px on the Journey's tags; was 22px, which read as a card's clipped corners), the reinforced eyelet kept. The Journey's tags are taller (more paper above and below) and narrower below 1280 (240px on a phone, 236px from 640), so they hang as tags, not cards; their 1280+ widths are unchanged, since each hole meets its string on the limb. The hero's e2e focus-ring check now holds the back face's controls clear of the deeper cut at their own left edge.

**Perf row** (`pnpm perf`, production build, 0 skipped responses). Before is the previous row.

| When | JS | JS at load | CSS | Fonts | CLS | DOM nodes |
|---|---|---|---|---|---|---|
| Before (cuter Bé Nhi) | 205,454 B | 205,454 B | 24,072 B | 117,868 B | 0 | 2352 |
| After | 205,579 B | 205,579 B | 24,132 B | 117,868 B | 0 | 2355 |

- **JS at load +125 B**: the cats' check. CSS +60 B (the cut variable, the crown width). LCP 1084 ms, TBT 6 ms.

**Verification.** `pnpm verify` passes (929 unit tests; the scenery test holds both new bamboo files to a fresh draw; contrast 66 pairings, lowest 4.52:1). Full e2e on a production build: 860 passed, 0 failed. By eye: the bamboo at 800 (day) and 1440 (day and night), the Journey at 1440, 1000 and 390 (day and night), the hero tags at 800, the award row and the playing recording at 1440.
