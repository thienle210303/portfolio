# Round 10 design — narrator, one clock, merged journey, chatbot, four intents

Approved by Thien 2026-08-23. Five work packages, disjoint file ownership.
Items 1 and 6 of the owner's list never arrived (terminal ate them); this
spec covers items 2, 3, 4, 5, 7.

## Decisions (owner's calls, 2026-08-23)

- Cats speak **meow only**; a **mini line-drawn Thien** translates.
- The **tree absorbs Journey**: one section, tree face + "view as list"
  timeline toggle. Skills stays separate.
- Chatbot is **free by default**: lexical retrieval chat with no key set;
  a real RAG mode activates only when an LLM API key is configured
  (Resend→mailto pattern). No money spent until the owner sets a key.
- Contact intents become four: opportunity · crazy idea · hello ·
  **secret 🤫** (cats react). Feedback folds into hello.

## WP-A · Mini Thien narrator + meow-only bubbles (companion)

**Files:** `src/components/companion/*`, `e2e/companion.spec.ts`,
`tests/**` for companion.

- New drawn figure: mini-Thien in the companion's ink discipline — typed
  parts, ground-filled silhouette under open strokes (round-5 rule), colour
  named on the element the tone class lands on (round-9 contract above
  `syncTone`).
- Cat speech bubbles become **meow-only** comic puffs (`DialogueBeat.meow`);
  the `sub` translation renders in a caption anchored to mini-Thien, who
  walks in near the speaking cat when a scene starts (clear-spot probed) and
  leaves when it ends. Applies to ambient duets, the tour, and origin-story
  beats alike — one consistent rule: cats meow, Thien translates.
- **Collision fix (the reported bug):** bubble and caption rects register as
  occupied space so no cat may park on or walk a resting path onto them, and
  bubbles/captions paint above the cats.
- Accessibility unchanged in substance: the tour HUD's `role="status"`
  region stays the accessible narration (its visible transcript line may
  become sr-only now that mini-Thien is the visible translation); ambient
  bubbles and the narrator stay `aria-hidden` decoration.
- Reduced motion / touch: scenes already don't play there, so the narrator
  never appears — no new gate needed, but the e2e negative control asserts
  it.
- **Companion side of WP-C's merge:** the `journey` nav section disappears.
  Tour stops, `AMBIENT`/`ENCORE`/`TOUR` banks, and section moods re-key:
  `tree` keeps its scenes; the `journey` facts fold into `tree` encores or
  retire; total tour stops drop accordingly. WP-C does not touch companion
  files; WP-A does not touch section files.
- **Companion side of WP-E's secret intent:** a `data-cat-secret` attribute
  (declared by the Contact form when the secret intent is selected) makes
  the cats creep toward the form and perk up — same declarative contract
  style as `data-cat-nap`. Reduced motion: no theatrics.

## WP-B · Origin story on one clock

**Files:** `src/sections/CareerTree/OriginStory.tsx` (and its own keyframes
if any), origin-story lib/tests, any e2e spec that watches the growth.

- Root cause of the reported glitches: dozens of independent CSS
  transitions with inherited stagger custom properties, each free to start
  late relative to the others under load.
- Rebuild the reveal on a **single rAF master clock**: one progress value
  per beat; every element's visual state is a pure function of it (set per
  frame, e.g. custom properties on the container), so nothing can
  desynchronize. Compositor-friendly properties only (transform/opacity).
- Contracts preserved: the beat/caption sequence, the `CustomEvent` story
  beats the companion narrates from (WP-A depends on them), the
  `role="status"` caption announcements, Skip/Escape/close focus behavior,
  and the reduced-motion jump-to-final path.
- Must not edit `WatchOrigin.tsx`'s lazy-load contract or `CareerTree.tsx`
  (WP-C owns section files).

## WP-C · Tree absorbs Journey

**Files:** `src/sections/CareerTree/*` (except `OriginStory.tsx`),
`src/sections/CareerJourney/*` (absorbed/removed), `src/app/page.tsx`,
`navItems` in `src/content/portfolio.ts`, related e2e/unit specs.

- One section, id `#tree` kept, **also answering `#journey`** and every
  existing per-entry fragment (`TimelineEntry` anchors) — deep links from
  tree leaves, /resume, or old URLs must keep landing correctly.
- **View toggle** "Tree / List": desktop defaults to the tree; mobile and
  the accessible list presentation default to the list (the timeline).
  The timeline component moves in with its filters and the
  widen-filter-on-fragment behavior intact; a leaf→entry link switches the
  view and scrolls (80px landing contract from round 8 holds).
- Nav loses the Journey item; the merged item is labeled **Journey** (what
  a hiring manager scans for) pointing at `#tree`. Nav order still mirrors
  render order.
- Rail: computed facts from both faces (entries, branches, leaves,
  technologies) — no restated prose.
- Cross-links from Work and Skills update to the merged section. The
  `data-cat-nap` root contract stays. Authored-edges rule untouched
  (`tests/lib/knowledge-tree.test.ts` stays green and unedited).
- Does not touch companion files (WP-A re-keys the tour/dialogue).

## WP-D · Ask-me-anything chatbot replaces the Workflow Explorer

**Files:** `src/sections/AIWorkflowLab/*`, `src/lib/answers.ts` (+ new
corpus lib), `src/content/ai-experiments.ts` (authored copy), new
`src/app/api/ask/route.ts`, `src/app/page.tsx` handoff of one boolean if
needed, lab e2e/unit specs.

- `WorkflowExplorer` retires (component + its UI + its tests);
  `workflowStages` content stays (ExperimentEntry uses it).
- `AskThisSite` grows into the section lead: **chat-thread UI** — message
  history, multi-turn, input at the bottom, state in the component (nothing
  persisted). The Prose/Code answer views and the "How this answers" panel
  stay; the unit test pinning quoted engine lines to `lib/answers.ts`
  stays true.
- **Corpus expansion:** retrieval chunks derived from the content layer
  only — career entries, origin story, philosophy, skills, experiments.
  A derivation, never a restatement: no new facts invented, strings built
  from `portfolio.ts` / `ai-experiments.ts` values.
- **Static mode (default, free):** the existing lexical engine ranks and
  answers. No network, no key, works offline. Honesty framing unchanged.
- **Live mode (env-gated):** when `ASK_LLM_API_KEY` (+ `ASK_LLM_MODEL`,
  optional `ASK_LLM_URL`, OpenAI-compatible chat-completions via plain
  `fetch` — **no new dependency**) are set, `/api/ask` does RAG: retrieve
  top-k chunks, model composes, answer labeled as coming from a live
  model. In-memory per-IP rate limit + input length cap; system prompt
  confines answers to the supplied chunks. Server component computes the
  boolean (same shape as `emailDeliveryConfigured`); the "nothing here
  runs live" callout swaps to an authored live-mode sentence when true.
  `.env.example` documents the three vars.
- Section heading/lead copy updates are authored edits in
  `ai-experiments.ts`, made by this package.

## WP-E · Four contact intents + secret (lead-owned, done in-session)

**Files:** `contactIntents` in `src/content/portfolio.ts`,
`src/sections/Contact/*` (attribute declaration), contact e2e spec.

- Intents: `opportunity` (kept), `crazy-idea` (collaborate rewritten,
  silly), `hello` (absorbs feedback in its description), `secret` (playful
  subject + starter; selecting it sets `data-cat-secret` on the form
  region). `IntentChooser` is already generic — UI change is the attribute
  plus tests.
- The lead makes the `portfolio.ts` content edit **before** dispatch so
  WP-C is the only agent touching that file concurrently (navItems region
  only).

## Cross-package contracts (owned by the lead)

1. `data-cat-secret`: WP-E declares, WP-A listens. Nobody else touches
   either side.
2. Section re-key: WP-C merges sections; WP-A re-keys companion
   tour/dialogue/moods to match ("journey" retires as a key). Neither
   crosses into the other's files.
3. Story beat events: WP-B preserves the `CustomEvent` contract; WP-A may
   restyle who displays the translation but not the event shape.
4. `src/app/page.tsx`: WP-C owns it. If WP-D needs a server boolean, it
   computes it inside its own section server component instead.

## Validation gate (every package)

- `pnpm typecheck && pnpm lint && pnpm test` scoped by the owner; full
  `pnpm verify` + `pnpm test:e2e` once by the lead after integration.
- Both themes, all three tones; 320–1440px, no horizontal overflow.
- Keyboard + reduced-motion paths for every new interaction.
- Semantic aliases only; blue reserved; no raw `--color-*`; no new
  dependencies; no npm/yarn lockfiles; rail facts computed, never prose.
