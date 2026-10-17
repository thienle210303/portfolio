# Round 20 Phase 5 — Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pinned scroll stage in `#tree` with three stacked blocks:
1. Highlight cards.
2. A tree box that plays its growth once and replays on "See how it grows".
3. Timeline rows that expand one at a time.

**Architecture:**
- Highlights come from a new authored `highlights` list in content. Each value is fact-traced to its entry, the same way the headline test does it.
- The timeline is `KnowledgeTreeList`, used at every width, turned into a single-open accordion. It now owns the `journey-entry-<id>` and `work-<projectId>` ids.
- The tree box shows `DrawnTree` statically. Its growth is the existing lazy `OriginStory` player. An `IntersectionObserver` starts it once on first view, and the header button scrolls to the box and starts it again.
- `Stage.tsx`, `acts.ts`, the act anchors and the pinned CSS are deleted.

**Tech Stack:** Next.js 16, React client islands, CSS, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-10-round-20-redesign-design.md` §5. Layout reference: the Journey A and B boards in https://claude.ai/artifact/DtnsC1ZKxmbV4CTmsL3AmE.

## Global Constraints

- pnpm only. Strict TS. No new dependency. Semantic aliases only. Blue is never decoration, and there is one primary control per screen. WCAG 2.2 AA in both themes. `src/lib/` never imports `src/sections/`.
- Block order, as in spec §5: Highlights, then the tree box, then the Timeline, then the credentials line, then the unbranched case studies.
- **Highlights:**
  - The cards are "17h → 3m", "99.9%", "96%", "3M+" and "200+", in that order.
  - Each card is one metric read from its entry, and it links to that entry's timeline row (`#journey-entry-<id>`).
  - Entries:

    | Card | Entry |
    |---|---|
    | 17h → 3m | `doordash` |
    | 99.9% | `wordification` |
    | 96% | `schaeffler` |
    | 3M+ | `usc-scraping` |
    | 200+ | `usc-ta` |

  - Every number in a card's value must appear in that entry's `headline` or `impact`. Tested.
- **Tree box:**
  - `DrawnTree` sits in a box with no pin and no camera.
  - The growth plays once on its own the first time the box is ≥ 50% in view.
  - "See how it grows", in the Journey header, scrolls to the box and replays it.
  - Under reduced motion the finished tree shows, with no motion. "See how it grows" still scrolls there, without animating.
  - The tree rules in CLAUDE.md still hold: leaves are technologies, concurrency is computed, there are no roots, and demoted entries stay off the tree.
- **Timeline:**
  - One row per drawn entry: year, role · organisation, headline.
  - Clicking a row expands it to show "What it changed" (the impact lines, verbatim), the technology chips, and the case study if one is attached.
  - Only one row is open at a time.
  - The rows carry the `journey-entry-<id>` ids.
  - The `KnowledgeTreeList` disclosure pattern is reused.
- **Retired ids:**
  - `#journey`, `#work`, `#skills`, `#workshop`, every `journey-entry-<id>` and every `work-<projectId>` stay in the server-rendered HTML.
  - With JavaScript off, they land on the Journey (`e2e/legacy-anchors.spec.ts`).
  - `act-*` anchors are deleted: nothing links to them.
- **Companion:** the origin-story events (`origin-story`, `origin-story-beat`, `origin-story-ack`) keep their contract. The cats must not rest on the timeline's or the highlights' text.
- **Copy:** case-study titles are unchanged. All copy follows `docs/voice.md`. A false comment, doc or copy is an Important finding.
- **Worktree and branch:** `.claude/worktrees/r20-journey`, branch `round-20/journey`.
- **Install:** `npm_config_package_lock=true pnpm install`.
- **Tests:** ports 3150–3159, a throwaway playwright config, `--workers=2`.
- **Processes:** kill by exact PID only.
- **Merging:** merge when done. Pushing is pre-approved.

## Review Focus

1. **Deep links.** `/#journey-entry-doordash` and `/#work-dd-scraper-platform` land on the right row and case study, with the row opened. This must hold with JavaScript on and with it off. *Test: Task 2, `legacy anchors land on rows`.*
2. **Keyboard on the accordion.** Enter/Space opens a row and closes the previously open one. Focus stays on the pressed row. `aria-expanded` is correct. *Test: Task 2.*
3. **The tree box below 1024 px.** The drawing is desktop-only today. At < 1024 px the box and "See how it grows" are hidden, and the highlights and timeline still read fully. *Test: Task 3, `phone shows no tree box`.*
4. **Replay while playing.** Pressing "See how it grows" mid-growth restarts cleanly, with one player mounted, never two, and the companion's origin-story ack stays balanced. *Test: Task 3.*
5. **Reduced motion.** There is no growth and no auto-play. The finished tree is visible, and the button only scrolls. *Test: Task 3.*

---

### Task 1: Highlight cards

**Files:**
- Modify: `src/content/portfolio.ts` (`highlights`) and `src/types/portfolio.ts`
- Create: `src/lib/highlights.ts`, `src/sections/CareerTree/JourneyHighlights.tsx`, `tests/lib/highlights.test.ts`
- Modify: `src/sections/CareerTree/CareerTree.tsx` (render above the stage for now; Task 2/3 move things around it)

**Interfaces:**

```ts
// content
export const highlights = [
  { entryId: "doordash", value: "17h → 3m", label: string },
  …
] as const satisfies readonly Highlight[];
// lib
export interface ResolvedHighlight { readonly entryId: string; readonly value: string; readonly label: string; readonly year: string; readonly organization: string; readonly href: `#journey-entry-${string}` }
export function buildHighlights(entries = careerEntries): readonly ResolvedHighlight[]
```

- **Label:** a short authored line in first person, ≤ 8 words. Its figures must trace too. Use the Journey B board's lines as drafts:
  - "Reverse engineering scraper: 17 hours to 3 minutes."
  - "Speech QA pipeline, validated audio accuracy."
  - "Throughput lift after paper sheets went low-code."
  - "Amazon and Kroger records, unattended for months."
  - "Students helped in open lab."
  - Then fix any figure that doesn't trace.
- **Year:** the entry's start year from `sortKey`.
- **Card:** a link (`<a href>`) whose accessible name includes the value, the label and the organisation.
- **Layout:** follow the Journey B bento. The first card spans two columns at ≥ 1024. Below that it is a 2-column grid, and 1 column at 320. The value uses `--step-4`; the rest uses body/eyebrow tokens. The first card is the `tone-contrast` card. The others use `bg-surface`, and their value is set in `text-accent`, because a measured value is a sanctioned use of blue.

- [ ] **Step 1: Write the failing tests.**
  - `five highlights in order`.
  - `every number in a value or label appears in its entry's headline or impact`: extract the digit runs (and "M+", "%" forms) and check each against `headline + impact.join(" ")`. Reuse the helper from `tests/lib/voice.test.ts` if one exists.
  - `href points at the entry row`.
  - `throws on an unknown entryId`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the unit tests and typecheck. Expected: PASS.
- [ ] **Step 5: Commit:** `Open the Journey with five measured highlights`.

### Task 2: Timeline rows; retire the stage

**Files:**
- Modify:
  - `src/sections/CareerTree/KnowledgeTreeList.tsx`: drop `lg:hidden` and render at every width as a single-open accordion. The chips move from the preview into the body. Rows get `id="journey-entry-<id>"`. Case studies use the main scope, so ids are `work-<id>` (not `-list`).
  - `src/components/ui/Disclosure.tsx`: only if a controlled `open`/`onToggle` is needed. Keep the default behaviour unchanged for other users.
  - `src/sections/CareerTree/CareerTree.tsx`: the order is Highlights, the tree (static, inside `[data-origin-host]` for now), the timeline, `CredentialsStrip`, `UnbranchedCaseStudies`. Keep the `LEGACY_SECTION_IDS` spans.
  - `src/sections/CareerTree/DrawnTree.tsx`: remove `BranchPanel`'s disclosure and case studies, since the timeline owns them now. Each branch shows label, year and headline at rest, and the branch label links to `#journey-entry-<id>`. Remove `data-branch-act`.
- Delete:
  - `src/sections/CareerTree/Stage.tsx` and `src/sections/CareerTree/acts.ts`.
  - `ENTRY_ACTS`, `ACT_IDS` and `actAnchorId` from `src/lib/anchors.ts`, along with whatever still imports them. Grep `src`, `tests`, `e2e` and `scripts`.
  - The Stage CSS in `globals.css` (~1866–2099, except anything `[data-origin-*]` still needs), and the dead `treeMood`/`data-cat-nap` path in `companion-moods.ts` if nothing renders it.
- Tests:
  - Delete `tests/sections/Stage.test.tsx` and `tests/lib/acts.test.ts`.
  - Update `tests/lib/anchors.test.ts` and `tests/sections/CareerTree.test.tsx`.
  - Update the e2e specs: `sections` (career tree block), `legacy-anchors`, `axe` (79-80, 185-217), `origin` (75, 97), `companion` (3772-3785), `ask` (467) and `print`.
  - Every assertion about the pin or the acts goes.
  - The assertions about content and anchors are rewritten against the rows. **Never weaken a legacy-anchor assertion.**
- Docs:
  - `CLAUDE.md`:
    - Lines ~91-95: "the pinned stage" becomes the three blocks.
    - Lines 138-169: the tree rules stay. Drop "Acts are authored". Drop the act-based "No roots / crossing as first act" wording but keep the no-roots rule.
  - `docs/editing.md` (:10, :71, :85-88, :99, :116, :138-160).

- [ ] **Step 1: Write the failing e2e tests** (port 3151; 1440 and 390):
  - `timeline rows: year, role · org, headline at rest`.
  - `one row open at a time` (click row 2, then row 3 is opened and row 2 closes).
  - `opened row shows What it changed, impact verbatim, chips, case study`.
  - `legacy anchors land on rows`:
    - `/#journey-entry-doordash` scrolls that row into view and opens it. With JS off, it is in the viewport.
    - `/#work-dd-scraper-platform` gives the case study in view, with its row open.
  - `no pinned stage`: no `[data-stage]`, no element whose computed `position` is `sticky` inside `#tree`.
  - `branch label links to its row`.
  - `highlight card jumps to its row`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement. For deep-link opening, open the row whose id, or a descendant's id, matches `location.hash` on load and on `hashchange`.
- [ ] **Step 4:** Run the updated e2e specs listed above plus `responsive`, `interactions` and `reveal` (PASS; companion flake: retry once).
- [ ] **Step 5: Commit:** `Replace the pinned stage with a one-open timeline and move the Journey's anchors onto its rows`.

### Task 3: The tree box and "See how it grows"

**Files:**
- Create: `src/sections/CareerTree/TreeBox.tsx` (`"use client"`), the box around `DrawnTree` + the player.
- Modify:
  - `src/sections/CareerTree/WatchOrigin.tsx`: expose a way to start the player programmatically, e.g. an exported `startOriginStory()` event or a `ref` handle. Keep its lazy `import()` and the zero-cost initial chunk.
  - `CareerTree.tsx`: the header gets the "See how it grows" button, shown at ≥ 1024 only.
  - `globals.css`: box sizing.
- Tests: `tests/sections/TreeBox.test.tsx`; e2e in `e2e/sections.spec.ts` or `e2e/origin.spec.ts`.

**Interfaces:**
- The box is ≥ 1024 px only (`hidden lg:block`), as the drawing was.
  - **Height decision.** Measure the tree's natural height at 1440. If it is ≤ 720 px, the box is that height. If it is taller, scale the tree to fit 720 px with a CSS `transform: scale()` on an inner wrapper, computed from the measured height.
  - Then verify that `OriginStory` still overlays correctly in the scaled box (`e2e/origin.spec.ts`). If scaling breaks the player's geometry, fall back to the natural height and record why.
- **Auto-play:**
  - An `IntersectionObserver` (threshold 0.5) starts the player once per page load.
  - It does not start under reduced motion.
  - It does not start if the visitor already pressed the button.
- **"See how it grows":**
  - It does `box.scrollIntoView({ block: "center" })` (instant, matching the site's no-smooth rule).
  - Then it starts or restarts the player. A press while playing closes the running player and opens a fresh one, so exactly one is ever mounted.
  - Under reduced motion it only scrolls.
- **Companion:** `origin-story` start/end, beat and ack events keep firing exactly as before. The companion e2e for origin must pass unchanged in its assertions.

- [ ] **Step 1: Write the failing tests:**
  - Unit:
    - `auto-plays once at 50% in view`
    - `does not auto-play under reduced motion`
    - `button restarts with exactly one player`
  - e2e (1440):
    - `see how it grows scrolls to the box and plays` (the box is in the viewport, the player is mounted, `data-origin-running` is present)
    - `phone shows no tree box and no button` (390)
    - `reduced motion: finished tree, no player`
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the e2e specs `origin`, `companion`, `sections`, `axe` and `print` (PASS). Run `pnpm lag` once to confirm the Journey scroll is not worse.
- [ ] **Step 5:** Take day and night screenshots of the whole `#tree` at 1440 and 390 into `reports/r20-p5-screens/` (untracked). Look at them and report.
- [ ] **Step 6: Commit:** `Let the tree grow in its own box, once on sight and again on request`.

### Task 4: Verify and record

- [ ] Run `pnpm verify`. The retrieval eval must hold its floors; record the numbers.
- [ ] Run the full `pnpm test:e2e` (port 3153). Retry each failure once in isolation.
- [ ] Run `pnpm perf` (0 skipped; JS at load) and `pnpm lag` ×3, with the CPU load for each run. The Journey band of the scroll should improve, since the pinned stage is gone.
- [ ] Add R20-P5 rows to the tracker and write `reports/r20-p5-ledger.md` (untracked).
- [ ] **Commit:** `Record round 20 phase 5`.
