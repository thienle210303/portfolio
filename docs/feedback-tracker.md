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
