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
| Document click listener had zero coverage | Two tests: re-click the current hash after filtering the entry away, and prove an ordinary in-page link leaves the filter untouched. Plus a unit test for the dead-fragment guard |
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
requested only so CSS can pin them to 0). The two rows above are the same
commit before and after that one change, so the delta is attributable: fonts
372.0 KB → 375.5 KB, **+3.5 KB**, with JS, CSS, CLS and DOM nodes identical
to the byte and to the node. LCP and TBT both land inside the run-to-run
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

**Not attempted here, and worth its own look:** the tracker's earlier note
that Newsreader *italic* was 143.6 KB of the font payload for two usages
applies to Fraunces too — the italic file is still fetched for what is now
three call sites (`BusinessCard`, `Closing`, `WorldPanel`). Dropping
`style: ["normal", "italic"]` to `["normal"]` would be by far the largest
font win available, much larger than this whole swap, but it changes how
three authored pieces of copy read and so is a design decision rather than a
measurement.

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
