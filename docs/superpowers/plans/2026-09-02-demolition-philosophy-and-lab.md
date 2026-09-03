# Demolition: Philosophy and the AI Workflow Lab come out

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Philosophy section and the AI Workflow Lab section from
the site, along with everything that existed only to serve them, leaving the
page, the companion, the chat's search index and the whole test suite green.

**Architecture:** This is a demolition, not a construction. The hard part is
not deleting the two sections — it is the eleven things that point at them:
the nav, the companion's guided tour, the cats' per-section moods and
dialogue, the chat's retrieval corpus and its search-term aliases, the
accessibility audit's tone sample, the reveal spec's below-the-fold sample,
the screenshot script, and four test files that pin counts and section-id
regexes. Two of those fail *silently* rather than loudly, and this plan's
value is mostly in catching those.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind
v4 via `@theme`, Vitest + Testing Library, Playwright, pnpm.

Plan 2 of the Playground Earth redesign. Spec:
`docs/superpowers/specs/2026-09-02-playground-earth-design.md`.
Plan 1 (`2026-09-02-foundation-perf-gate-and-chat-move.md`) is complete and
moved the chat into the hero, which is what makes removing the Lab possible.

## The owner's instruction

Thien, 2026-09-02, on being shown the three Lab sentences that had become
false: *"nobody is gonna read that deleted it!!"* — and earlier, on whether
"remove that old AI section" meant the whole chapter: *"ya deleted it, nobody
is gonna read them."*

So both sections go. He has said it twice.

## What is deleted, and what is deliberately kept

**Deleted: everything that renders.** Both section components and their
subcomponents, their nav entries, their tests and e2e blocks, their documents
in the chat's retrieval corpus, and the companion keys that only existed for
them.

**Kept: the authored data in `src/content/`.** `principles`,
`problemSolvingLoop`, `philosophyIntro`, `experiments`, `learningLog`,
`scrapingPlaybook`, `workflowStages` and `aiTools` stay in the content files,
unrendered.

That distinction is deliberate and must not be "tidied up" by an implementer.
Three of those arrays are the raw material the approved design re-homes in
plan 3: `problemSolvingLoop`'s nine steps and `workflowStages`' ten stages
become the Workshop section, and `scrapingPlaybook` moves to Work. Deleting
them now would sabotage the next plan to save a few unreferenced exports. When
plan 3 is done, anything still unreferenced can go in a one-line cleanup.

**Consequence to state plainly:** after this plan, nothing on the site renders
those arrays, and nothing in the chat's index cites them. They are inert data
awaiting plan 3.

## Global Constraints

- **pnpm only.** Never introduce an npm or yarn lockfile.
- **No new dependency.**
- TypeScript is strict; keep it that way.
- Tailwind v4 is configured via `@theme` in `src/app/globals.css`. There is no
  `tailwind.config.js` and none may be created.
- Components style against the semantic aliases only — `text-fg`,
  `text-fg-muted`, `border-rule`, `bg-surface`, `text-accent`, `bg-ground`.
  Never a raw `--color-*` token, never a literal hex.
- Blue is the only hue, reserved for annotation, links, measured values and
  the single primary control per screen.
- **`navItems` order must keep matching the render order in
  `src/app/page.tsx`.** The nav doubles as the page's table of contents.
- Targets: WCAG 2.2 AA, Lighthouse 90+/95+/95+/95+.
- **Every chat answer must link to a section that exists.** This is the
  site's central honesty rule and the thing this plan is most likely to
  break. See Task 1 Step 4 and Task 2 Step 4.
- The gate is `pnpm verify` (typecheck → lint → contrast → test → build).
  **Run all of it, including lint**, before every commit. Plan 1 shipped a
  lint break by running only tests and typecheck.
- After each task, also run `pnpm test:e2e` for the specs that task touched.
  The full matrix runs in Task 3.
- Node 22.12+. A dev server may already hold port 3000.

## Two silent failure modes to understand before you start

Read these twice. Neither produces a red test on its own.

**1. Dead answer links.** `AskThisSite` renders, on every answer,
`href={`#${result.sectionId}`}` with the text "Read it in {sectionLabel} →".
If a corpus document keeps `sectionId: "philosophy"` after the section is
gone, the chat cheerfully links visitors to a fragment that does not exist.
Worse, both guards that could catch it are themselves permissive:
`tests/lib/answers.test.ts:67` is
`const LINKABLE_SECTIONS = /^(about|philosophy|work|lab|journey|skills)$/`
and `e2e/ask.spec.ts:99` is
`/^#(about|philosophy|work|lab|journey|resume)$/`.
Both still *accept* the dead ids. **Tighten the regexes in the same commit
that removes the documents**, or the safety net has a hole exactly where the
change is.

**2. The guided tour crashes.** `src/components/companion/companion-tour.ts:61`
is `const GREY_MIDDLE = ["work", "skills", "tree", "lab"] as const;` and
`stopsFor` (line 71) does
`...middle.map((sectionId) => STOP_BY_SECTION.get(sectionId)!)` — a non-null
assertion over a map built from `navItems`. Remove `nav-lab` from `navItems`
without editing `GREY_MIDDLE` and "Show me around" throws on the undefined
stop. `TOUR_STOPS` itself derives from `navItems` and shrinks on its own,
which is what makes this easy to miss.

---

### Task 1: Philosophy comes out, whole

The section and every dependent, in one commit, green at the end. Do not
split it — a half-removed nav item breaks the tour.

**Files:**
- Delete: `src/sections/Philosophy/Philosophy.tsx`,
  `src/sections/Philosophy/PrincipleList.tsx`,
  `src/sections/Philosophy/ProblemSolvingLoop.tsx`,
  `src/sections/Philosophy/WorkflowGraph.tsx`,
  `tests/sections/WorkflowGraph.test.tsx`
- Modify: `src/app/page.tsx`, `src/content/portfolio.ts` (navItems only),
  `src/lib/answer-corpus.ts`, `src/content/answer-expansion.ts`,
  `src/lib/companion-facts.ts`,
  `src/components/companion/companion-tour.ts`,
  `src/components/companion/companion-moods.ts`,
  `src/components/companion/companion-dialogue.ts`,
  `src/components/companion/Companion.tsx` (comments + one index comment),
  `tests/lib/companion-tour.test.ts`, `tests/lib/companion-dialogue.test.ts`,
  `tests/lib/companion-facts.test.ts`, `tests/lib/answers.test.ts`,
  `tests/fixtures/answers-eval.ts`, `e2e/sections.spec.ts`,
  `e2e/companion.spec.ts`, `e2e/ask.spec.ts`, `scripts/screenshots.mjs`,
  `README.md`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `navItems` is About · Work · Skills · Journey · AI Workflow Lab ·
  Contact (six entries — the Lab is still there until Task 2).
  `GREY_MIDDLE` is `["skills", "tree", "lab"]`. No corpus document carries
  `sectionId: "philosophy"`.

- [ ] **Step 1: Delete the section and take it out of the page**

```bash
git rm src/sections/Philosophy/Philosophy.tsx src/sections/Philosophy/PrincipleList.tsx src/sections/Philosophy/ProblemSolvingLoop.tsx src/sections/Philosophy/WorkflowGraph.tsx tests/sections/WorkflowGraph.test.tsx
```

In `src/app/page.tsx`: remove the `import Philosophy from …` line and the
`<Philosophy />` element. The file carries a long comment explaining the
section order as "an argument about what a visitor needs, in what order" —
update the sentence that names Philosophy ("how he works") rather than leaving
it describing a section that is gone.

In `src/content/portfolio.ts`, remove the `nav-philosophy` entry from
`navItems`. Change nothing else in that file.

- [ ] **Step 2: Fix the guided tour before you run anything**

In `src/components/companion/companion-tour.ts:61`:

```ts
const GREY_MIDDLE = ["skills", "tree", "lab"] as const;
```

`TOUR_STOPS[1]` is now `work` rather than `philosophy`, so `stopsFor` still
returns every stop exactly once: `about`, `work`, then the middle, then
`contact`. Verify that by reading `stopsFor` — do not assume it.

Update the doc comment above `GREY_MIDDLE`, which currently explains the
middle set in terms of a seven-item nav.

In `src/components/companion/Companion.tsx`, `showRouteChoice={tourView.index === 1 && …}`
still means "offer the fork after the second stop" and needs no code change,
but the comment naming Philosophy's scene as the fork point is now false —
correct it. Also correct the comment near line 2382 listing which sections get
no pose.

- [ ] **Step 3: Re-key the companion's moods, dialogue and facts**

- `companion-moods.ts`: remove the `"loop"` `MoodKind`, `loopDiagram()` (it
  queries `#philosophy ol[aria-labelledby="philosophy-loop-label"]`),
  `LAP_BUDGET` and `loopMood`. **Check whether `MoodRun.walked` / `MoodWalk`
  in `Companion.tsx` have any other producer** — the reader's map says
  `loopMood` is the only mood that ever supplies a path. If it is the only
  one, that machinery is now dead; report it as a concern rather than
  ripping it out in this task, because it is client-side motion code with
  its own tests.
- `companion-dialogue.ts`: remove `AMBIENT.philosophy` and `TOUR.philosophy`.
  Both read `f.philosophy.principles`.
- `companion-facts.ts`: remove the `philosophy` key from `CompanionFacts` and
  its `principles` import.
- Tests: `tests/lib/companion-dialogue.test.ts` has a `FACTS` fixture with
  `philosophy: { principles: 5 }` and an `AMBIENT_SECTIONS` list including
  `"philosophy"`. `tests/lib/companion-facts.test.ts` has a "counts the
  principles" case. `tests/lib/companion-tour.test.ts:57-72` asserts
  `grey[1].sectionId === "philosophy"` and the middle order
  `["work","skills","tree","lab"]`. Update all four to the new shape.

- [ ] **Step 4: Take Philosophy out of the chat's index — and close the hole in the guard**

In `src/lib/answer-corpus.ts`, remove every document pushed with
`sectionId: "philosophy"`, and the now-unused imports of `philosophyIntro`,
`principles` and `problemSolvingLoop`.

**One document needs re-tagging, not deleting.** `profile.philosophy` — the
line "Unsolved is not the same as unsolvable." — is still rendered in three
live places (the hero's rail, the business card, the career tree's plinth).
Re-tag that single document to a section that still exists rather than
dropping it, so the chat can still answer "what is his philosophy". `about`
is the natural home; confirm the hero's section id before you use it.

In `src/content/answer-expansion.ts`, remove the `sectionExpansions.philosophy`
key.

Then close the guard hole, in this same commit:

- `tests/lib/answers.test.ts:67` becomes
  `const LINKABLE_SECTIONS = /^(about|work|lab|journey|skills)$/;`
- `e2e/ask.spec.ts:99` becomes
  `/^#(about|work|lab|journey|resume)$/`
- The same file's `EXPECTED` string set (around lines 47-58) imports
  `philosophyIntro`/`principles`/`problemSolvingLoop`; remove those imports
  and the strings they contribute.

- [ ] **Step 5: Fix the eval fixture honestly**

`tests/fixtures/answers-eval.ts` drives `tests/lib/answers-retrieval.test.ts`,
which enforces recall@3 ≥ 90%, recall@5 ≥ 95%, top-1 ≥ 70% and MRR > 0.8 over
35 cases. Removing corpus documents can only hurt those numbers.

The case "what is his philosophy" (around line 319) expects
`profile.philosophy` and stays satisfiable via the re-tagged document from
Step 4. Any case whose only correct answer was a Philosophy-owned string must
be **removed**, not re-pointed at a loosely related document — a fixture that
accepts a different answer to keep a threshold green is a lie.

Run `pnpm vitest run tests/lib/answers-retrieval.test.ts` and report the new
metric values in your report, whether or not they moved.

- [ ] **Step 6: Update the e2e specs, the screenshot script and the README**

- `e2e/sections.spec.ts`: delete the whole `test.describe("philosophy")` block
  (lines ~132-176) and the now-unused imports of `problemSolvingLoop` at the
  top. Leave the `workflowStages` import if the Lab block still uses it.
- `e2e/companion.spec.ts`: three tour tests assert "stop N of 7" and that the
  fork appears at stop 2. The count becomes 6 after this task and 5 after
  Task 2. Update to 6 now; Task 2 updates it again. The fork is still at
  index 1, now after Work.
- `scripts/screenshots.mjs`: remove `"philosophy"` from `SECTIONS` (line ~52)
  and fix the comment above it.
- `README.md`: the intro sentence listing the page's sections, the "Philosophy
  deliberately has no rail" paragraph (already stale — it describes a
  nine-column layout that no longer exists), and the content table row.

- [ ] **Step 7: Run everything**

```bash
pnpm verify
```

Expected: green, including lint.

```bash
pnpm test:e2e sections companion ask
```

Expected: green. If a companion test fails, re-run that spec alone with
`--workers=2` before believing it — this repo has documented companion flakes
under six-worker load. Report honestly which failures were real.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Remove the Philosophy section and everything that pointed at it"
```

---

### Task 2: The AI Workflow Lab comes out, whole

Same shape, same discipline. The Lab has more dependents than Philosophy,
including two accessibility samples that must be re-pointed rather than lost.

**Files:**
- Delete: `src/sections/AIWorkflowLab/AIWorkflowLab.tsx`,
  `ExperimentEntry.tsx`, `LearningLog.tsx`, `ScrapingPlaybook.tsx`
- Move: `src/sections/AIWorkflowLab/AskThisSite.tsx`, `answer-code.ts`,
  `scoring-excerpt.ts` — see Step 1
- Modify: `src/app/page.tsx`, `src/content/portfolio.ts` (navItems only),
  `src/lib/answer-corpus.ts`, `src/content/answer-expansion.ts`,
  `src/lib/companion-facts.ts`, `src/app/api/ask/route.ts`,
  `src/components/companion/{companion-tour,companion-moods,companion-dialogue,companion-play}.ts`,
  `src/components/companion/Companion.tsx`,
  `tests/lib/{companion-tour,companion-dialogue,companion-facts,companion-scenes,answers,scoring-excerpt}.test.ts`,
  `tests/sections/AskThisSite.test.tsx`, `tests/sections/AskThienHeroTab.test.tsx`,
  `tests/fixtures/answers-eval.ts`,
  `e2e/{sections,companion,ask,axe,reveal,content-integrity}.spec.ts`,
  `scripts/screenshots.mjs`, `README.md`, `docs/editing.md`, `.env.example`,
  `CLAUDE.md`

**Interfaces:**
- Consumes: Task 1's `GREY_MIDDLE` and the tightened regexes.
- Produces: `navItems` is About · Work · Skills · Journey · Contact (five).
  `GREY_MIDDLE` is `["skills", "tree"]`. No corpus document carries
  `sectionId: "lab"`. The chat component lives outside a deleted directory.

- [ ] **Step 1: Move the chat out of the doomed directory first, as its own commit**

The chat now lives in `src/sections/AIWorkflowLab/` but is mounted only from
the hero. Deleting the directory around it would make the demolition diff
unreadable. Move it first:

```bash
git mv src/sections/AIWorkflowLab/AskThisSite.tsx src/sections/Hero/AskThisSite.tsx
git mv src/sections/AIWorkflowLab/answer-code.ts src/sections/Hero/answer-code.ts
git mv src/sections/AIWorkflowLab/scoring-excerpt.ts src/sections/Hero/scoring-excerpt.ts
```

`tests/sections/AskThisSite.test.tsx` does not move — only its import path
changes.

Then update every import: `src/sections/Hero/AskThienHeroTab.tsx`'s dynamic
`import("@/sections/AIWorkflowLab/AskThisSite")`, the two test files that
mock or import by module path (`tests/sections/AskThienHeroTab.test.tsx` uses
`vi.mock` with the old path — a stale mock path silently mocks nothing),
and `tests/lib/scoring-excerpt.test.ts`, which reads a file **from disk by
path** and will fail loudly if the path is wrong. Good.

Commit this move on its own before deleting anything, so the demolition diff
that follows is pure deletion.

```bash
pnpm verify && git add -A && git commit -m "Move the chat out of the Lab's directory, ahead of the demolition"
```

- [ ] **Step 2: Delete the section**

```bash
git rm src/sections/AIWorkflowLab/AIWorkflowLab.tsx src/sections/AIWorkflowLab/ExperimentEntry.tsx src/sections/AIWorkflowLab/LearningLog.tsx src/sections/AIWorkflowLab/ScrapingPlaybook.tsx
```

Remove the import and `<AIWorkflowLab />` from `src/app/page.tsx`, and update
the order comment, which currently argues at length about where the Lab
belongs in the reading order.

Remove `nav-lab` from `navItems` in `src/content/portfolio.ts`.

- [ ] **Step 3: Fix the tour again**

`src/components/companion/companion-tour.ts`:

```ts
const GREY_MIDDLE = ["skills", "tree"] as const;
```

Five stops now: `about`, `work`, `skills`, `tree`, `contact`. Update
`tests/lib/companion-tour.test.ts` and the "stop N of 6" assertions in
`e2e/companion.spec.ts` to 5.

- [ ] **Step 4: Take the Lab out of the chat's index, and tighten the guards again**

`src/lib/answer-corpus.ts`: remove every document with `sectionId: "lab"` —
the experiment question and verification documents, and the scraping playbook
documents — plus their imports.

`src/content/answer-expansion.ts`: remove `sectionExpansions.lab` and the
`subjectExpansions` entries keyed by the five experiment ids.

Tighten both guards, in this same commit:
- `tests/lib/answers.test.ts`: `const LINKABLE_SECTIONS = /^(about|work|journey|skills)$/;`
- `e2e/ask.spec.ts`: `/^#(about|work|journey|resume)$/`
- Remove that test file's imports of `experimentsIndexable`,
  `scrapingPlaybook` and `scrapingPlaybookIntro` and the strings they add to
  the allowed set.

`src/app/api/ask/route.ts:84-85`: `UNGROUNDED_REPLY` names "the AI Workflow
Lab" in prose shown to visitors. Rewrite that sentence so it names something
that exists. `tests/api/ask.test.ts` pins response shapes — check whether it
pins this string.

`tests/fixtures/answers-eval.ts`: the cases "feasibility agent" (~line 252)
and "what is he exploring with ai agents" (~line 324) expect experiment
documents. The first may still be satisfiable from the `dd-feasibility-agent`
case study in Work — verify rather than assume. Remove any case whose only
correct answer has left the page. Report the new retrieval metrics.

- [ ] **Step 5: Re-point the accessibility and reveal samples — do not just delete them**

`e2e/axe.spec.ts` audits `#lab` twice (lines ~201-206 and ~253-254) as its
**deep-tone** sample, once per theme. `e2e/reveal.spec.ts` uses `#lab`'s `h2`
at lines 54, 84 and 125-131 as its **below-the-fold** sample for the no-JS,
reduced-motion and print tests.

Deleting those tests would silently drop coverage of a whole tone and of the
reveal behaviour. Instead, re-point each at a section that still exists and
has the same property:

- Read `src/app/page.tsx` and each remaining section component to find which
  ones pass `tone="deep"`. Pick one that is genuinely below the fold. State
  in your report which you chose and why.
- Keep the same assertions. Only the selector changes.

- [ ] **Step 6: Companion odds and ends**

- `companion-moods.ts`: remove the `"lab"` `MoodKind` and `labMood` (it
  queries `#lab [role="tablist"]`).
- `companion-dialogue.ts`: remove the ambient, encore and tour scenes for
  `"lab"`.
- `companion-play.ts:300-322`: remove `LAB_MOTH_BOOST`, keyed on
  `flavor.section === "lab"`.
- `Companion.tsx`: line ~1793 grants encores only to `tree`/`lab`; line ~2399
  cheers at `work`/`lab` stops. Update both to the sections that remain.
- `companion-facts.ts`: remove the `lab` key and its `experiments` import.
- Tests: `tests/lib/companion-scenes.test.ts:333-364` asserts the moth leads
  more often in section `"lab"`; `companion-dialogue.test.ts` has
  `lab: { experiments: 6, verified: 4 }` in its fixture, `"lab"` in
  `AMBIENT_SECTIONS`, and `hasEncore("lab")`; `companion-facts.test.ts:63-66`
  asserts `facts.lab.*`. Update all of them.

- [ ] **Step 7: The remaining e2e and docs**

- `e2e/sections.spec.ts:206-217`: delete the `"ai workflow lab"` describe.
- `e2e/content-integrity.spec.ts:62-90`: this asserts every `Exploring`
  experiment renders a "No results yet" line. Nothing renders experiments any
  more — delete the block and its `exploring.length > 0` assertion.
- `scripts/screenshots.mjs`: remove `"lab"` from `SECTIONS` and the capture
  at lines ~166-173 that clicks a "Try asking" button and shoots
  `#lab-ask-heading + div`. The chat is in the hero now; either re-point the
  capture at the hero tab or drop it, and say which you did.
- `README.md`: the section list, the content table row, "Adding an AI
  experiment", "Updating the learning log", and the rail example.
- `docs/editing.md`: the content table row and the "Ask this site" consumer
  notes.
- `.env.example`: the `ASK_LLM_*` block cites `AIWorkflowLab.tsx` as where the
  boolean is computed. It is `Hero.tsx` now.
- `CLAUDE.md`: it names `src/content/ai-experiments.ts` as a live content
  source. Add one sentence saying those arrays are retained but unrendered
  pending plan 3, so the next reader is not misled.

- [ ] **Step 8: Run everything**

```bash
pnpm verify
pnpm test:e2e
```

The second is the full matrix, six viewports, about twelve minutes. Re-run any
failing spec alone with `--workers=2` before believing it, and report honestly
which failures were real.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Remove the AI Workflow Lab and everything that pointed at it"
```

---

### Task 3: Measure, record, and account for what is now orphaned

**Files:**
- Modify: `docs/feedback-tracker.md`

- [ ] **Step 1: Measure**

```bash
pnpm build
PORT=3100 pnpm start
```

then, in another shell:

```bash
pnpm perf
```

Two large client components are gone — `ProblemSolvingLoop` alone is about
1,040 lines of `"use client"` with a 2,048-sample table computed at module
scope. Expect initial JavaScript and DOM node count to fall.

- [ ] **Step 2: Record**

Add a row to the performance table in the Round 16 section of
`docs/feedback-tracker.md`:

```markdown
| After Philosophy and the Lab were removed | (JS) | (CSS) | (fonts) | (LCP) | (TBT) | (CLS) | (nodes) |
```

Fill every cell from your run. Then add a short paragraph naming what came
out and what it bought. **Do not claim a metric moved if two runs disagree** —
the row above yours records a 196 ms same-commit TBT swing for exactly that
reason. Run `pnpm perf` twice and say so.

- [ ] **Step 3: Account for the orphans**

Run these and put the results in your report:

```bash
grep -rn "philosophyIntro\|problemSolvingLoop\|principles\b" src --include=*.ts --include=*.tsx
```

```bash
grep -rn "experiments\|learningLog\|scrapingPlaybook\|workflowStages\|aiTools\|heroAskCaption\|labIntro\|labPositioning\|labLiveNotice" src --include=*.ts --include=*.tsx
```

Every hit should be inside `src/content/` itself or a type file. If anything
outside `src/content/` still references them, you missed a consumer — fix it.

List, in your report, exactly which content exports are now unreferenced.
That list is plan 3's input: it says what must be re-homed and what can
finally be deleted.

- [ ] **Step 4: Commit**

```bash
git add docs/feedback-tracker.md
git commit -m "Record what the demolition bought"
```

---

## What this plan deliberately does not do

- It does not add the `#worlds` or `#workshop` sections. The nav simply gets
  shorter. Those arrive with the globe and the Workshop in plan 3.
- It does not delete any authored content array. See "What is deleted, and
  what is deliberately kept" above.
- It does not touch the fonts, the hero, or the chat's behaviour.
