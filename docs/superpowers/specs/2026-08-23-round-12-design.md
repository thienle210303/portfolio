# Round 12 design — the tree becomes the timeline, the story stays in frame

Approved by Thien 2026-08-23 (four owner calls). Six items; two shipped by
the lead in-session (toggle borders, skills rail), three dispatched, one is
part of another.

## Decisions (owner's calls)

- Chat: **scrolling chat window** + a clear-conversation control.
- Hero code snippet: **compact rendering**, plus a fourth tab — a mini
  **"Ask Thien"** chatbot reusing the same engine.
- Skills rail: **evidence facts** (most-used technology, computed).
- Tree: **full inversion** — branches are experiences, leaves are what was
  done there.

## Lead-shipped (in this working tree already)

- **Item 2 · Tree/List toggle borders** (`ViewToggle.tsx`): both buttons now
  carry all four borders, List overlaps by `-ml-px`, pressed button lifts
  `z-10` so its own border wins the shared edge.
- **Item 5 · Skills rail** (`Skills.tsx`): counts replaced by computed
  evidence — most-used technology with its entry count and year span,
  derived from `careerEntries[].technologies` only (no name-joins);
  certifications count and the "Not shown" line stay.

## WP-I · Origin story lives in the frame (item 1)

**Files:** `src/sections/CareerTree/OriginStory.tsx`, origin keyframes in
`globals.css`, `src/lib/origin-story.ts` if needed, `e2e/origin.spec.ts`,
origin unit tests.

- Every story visual — sky, weather, captions, annotations — moves into the
  tree figure's own coordinate space (absolutely positioned within the
  drawing wrapper), so scrolling moves the whole picture as one object.
  Nothing is `position: fixed` to the viewport anymore.
- The scroll-away-ends-the-show machinery (IntersectionObserver on the sky
  slice, root-beat suspensions) is deleted rather than preserved: with
  nothing pinned to the screen there is nothing to shear, and a visitor who
  scrolls mid-story simply sees the story continuing in the drawing when
  they come back. Escape, Skip, click-to-advance, and the final beat still
  end it; the master clock (round 10) is untouched.
- Contracts preserved: the `origin-story-beat` / `origin-story` CustomEvent
  shapes (companion narrates from them), `releaseEverything`'s exit
  guarantee, reduced-motion path, `WatchOrigin.tsx` lazy-chunk boundary,
  and the DrawnTree data-attribute contract below (WP-M preserves it from
  the other side; neither touches the other's files).

## WP-K · Chat window + hero "Ask Thien" tab (items 3 + 4)

**Files:** `src/sections/AIWorkflowLab/AskThisSite.tsx`, a new shared mini
chat component (under `src/sections/AIWorkflowLab/`), `src/sections/Hero/*`
(the code artifact), `e2e/ask.spec.ts`, ask/hero unit tests. All hero-chat
e2e tests go in `ask.spec.ts` — NOT `sections.spec.ts`, which WP-M owns
this round.

- **Scrolling thread:** the conversation gets a max height and scrolls
  internally (newest answer scrolled into view on arrival), so the page
  stops growing. Keyboard-reachable scroll region with a proper accessible
  name; no focus traps; reduced motion skips smooth-scrolling. A "Clear
  conversation" control empties the thread (state only, nothing persisted
  to clear). The round-10 e2e contract "every turn stays on screen" becomes
  "every turn stays in the thread; the thread scrolls" — update the test to
  the new honest contract.
- **Compact hero rendering + Ask tab:** the hero code artifact's frame
  tightens (smaller type/padding — the artifact stops dominating the hero),
  and gains a fourth tab, "Ask Thien", hosting a mini chat: one input, the
  latest turn only, and a "full conversation in the Lab →" link to `#lab`.
  The engine chunk lazy-loads on first tab activation so the hero's initial
  cost does not grow. One honest caption line ("a lexical index over this
  page — no model") mirrors the Lab's framing; live mode is NOT wired here
  (the mini version is static-engine only, by design — the Lab is the full
  surface).
- The hero's three code tabs and their authored content are unchanged.

## WP-M · Tree inversion (item 6)

**Files:** `src/lib/knowledge-tree.ts`, `tests/lib/knowledge-tree.test.ts`,
`src/sections/CareerTree/{KnowledgeTree,KnowledgeTreeList,DrawnTree,
RootLabels,TreeFigure,CareerTree,cross-link}.tsx`, the tree-count
derivation lines in `src/lib/companion-facts.ts` (+ its test), tree parts
of `e2e/sections.spec.ts`. Do NOT touch: `OriginStory.tsx`, `WatchOrigin`,
`ViewToggle`, `Timeline*`, `view-state`, `anchors`, companion files beyond
the named count derivations.

- **The model inverts:** branches = career entries, in chronological order
  up the trunk (oldest lowest — the year rings already exist), each entry
  exactly once. Leaves = what was done there: the entry's `technologies`
  and `impact` items, both authored per entry. The five lens branches
  retire from the drawing. The duplication the owner reported (DoorDash on
  five branches) is structurally gone.
- **The anti-inference rule stands:** everything drawn comes from authored
  per-entry fields; no skill-name-to-technology-string joins, ever. The
  test file is rewritten to the new model but keeps assertions that refuse
  inference (a technology appearing in no entry draws nothing; a leaf
  exists only where its entry authored it).
- Roots stay the `skillCategories` labels linking to `#skills-<id>`
  (authored category → lens edges become label-only context or retire —
  whichever reads honestly, but no new inferred edges).
- Branch → timeline: each branch links to its own entry in the List face
  (`#journey-entry-<id>`, existing anchors and round-8 landing contract).
- Rail facts recomputed from the new model (entries, leaves, technologies).
- **Origin-story contract preserved:** every drawn group still stamps
  `data-origin-year` (an entry's year; a leaf inherits its entry's year),
  `data-origin-tier` (trunk|branch|leaf semantics), and exactly one
  still-growing shoot for the newest growth — WP-I animates against these
  attributes and never reads the model.
- Mobile/AT list (`KnowledgeTreeList`) mirrors the new model; a11y
  semantics (accessible list, disclosures) unchanged in kind.
- Companion facts: `tree.branches`/`leaves`/`technologies` re-derived from
  the new shape; the dialogue keys and templates are NOT yours to edit —
  if a template's phrasing stops being true, report it instead.

## Validation gate (every package)

- `pnpm typecheck && pnpm lint` + scoped vitest; scoped Playwright allowed
  per package (never the full matrix — the lead runs it at integration).
- Both themes, all tones; 320–1440px no overflow; keyboard + reduced
  motion; semantic aliases only; no raw `--color-*`; no new dependencies.
