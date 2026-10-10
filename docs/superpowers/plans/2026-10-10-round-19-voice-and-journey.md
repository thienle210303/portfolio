# Round 19 — Voice rules and the Journey, in first person: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write the voice rules down once. Make the Journey speak as Thien ("I", "my"). Give every drawn branch a one-line headline, keep technology chips as the only leaves, and move the impact lines behind the click.

**Architecture:** `CareerEntry` gains an optional `headline`. `buildCareerTree()` keeps technologies as the only `leaves` and carries `impact` and `headline` on the branch as separate fields. Every count that reads `totalLeaves()` follows from that one change: the rail, the globe's `tree-shape` plaque and the cats' line. `Disclosure` gains a `preview` slot that is always visible and sits between the trigger and the region. Both presentations use it, so the headline (and the mobile chips) are never part of the button's accessible name. The first-person pass is content-only: it changes strings, never code paths.

**Tech Stack:** Next.js 16 (App Router), TypeScript strict, Tailwind v4 via `@theme`, vitest + jsdom, Playwright + axe-core, pnpm only.

**Spec:** [docs/superpowers/specs/2026-10-10-round-19-voice-and-journey-design.md](../specs/2026-10-10-round-19-voice-and-journey-design.md). Headline sources: [2026-10-10-journey-headline-sources.md](../specs/2026-10-10-journey-headline-sources.md).

**Evidence:** every premise below was checked against `01177fa` (the spec commit on `round-19/journey-voice`). The **Premises** section gives file:line for each.

**Depends on:** `main` at `9d6cf70`.

## Global Constraints

- No new dependency of any kind. `pnpm install` needs `npm_config_package_lock=true`.
- Plaques stay at **12 quoted + 7 computed**, string-for-string. Their texts change only through the content layer. Never relax `tests/lib/worlds.test.ts` to a substring or a normalised comparison.
- The retrieval floors **0.9 / 0.95 / 0.7 / 0.8** (recall@3 / recall@5 / recall@1 / MRR) never move. `headline` is **not** indexed.
- Semantic aliases only (`text-fg`, `text-fg-muted`, `border-rule`, `bg-surface`, `text-accent`, `bg-ground`). Never a raw `--color-*` token or a hex value. Blue is never decoration.
- WCAG 2.2 AA, in both themes and all three tones.
- Reduced motion: nothing in this plan adds motion. The stage, the origin story and the reduced-motion path stay as they are.
- Zero frames at rest. Nothing here may add a `requestAnimationFrame`, a timer or an observer.
- Initial JS stays minimal: spec §7 allows a few hundred bytes. The last recorded row is **205,534 B** (`docs/feedback-tracker.md:1597`). This plan does not touch the globe chunk (`src/lib/globe.ts`, `src/sections/Worlds/*`). If a task does touch it, record a `pnpm perf` row. Task 9 measures either way, because of spec §7.
- `src/lib/` never imports from `src/sections/`.
- A false comment, doc or line of copy counts as **Important**. Fix or delete every comment a task makes untrue, in that task. The task lists name the comments that this plan makes false.
- A test that can pass while asserting nothing is worse than no test. Every new assertion carries a non-empty guard. It must also be shown to fail against a deliberate mutation, and that mutation goes in the task report.
- Never invent facts. Every headline figure traces to the same entry's `impact`, `context` or `built`. Owner-approved lines change **pronouns only**.

### Running e2e and perf in this worktree (every task)

- e2e: copy `playwright.config.ts` to an untracked `playwright.local.config.ts`, which is never committed. In the copy:
  - set `use.baseURL` and `webServer.port` to a free **31xx** port;
  - set `webServer.command` to `pnpm dev -p 31xx` and `reuseExistingServer: false`;
  - set `launchOptions.executablePath` to `C:/Users/thien/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe`.

  Run `npx playwright test -c playwright.local.config.ts <spec> --workers=2`.
- **Never pipe test output through `tail`.** It hides the failure count.
- Kill servers only by exact PID: `netstat -ano | grep ":31xx .*LISTEN"`, then `Stop-Process -Id <pid>`. **Leave port 3000 and its PID alone.**
- To retry an e2e flake, run that spec alone and report both runs. Never call a failure "pre-existing" without a run on `01177fa` that shows it.
- perf: run `pnpm build`, then `PORT=31xx pnpm start` in the background. Run a throwaway copy of `scripts/perf.mjs` pointed at the headless shell above, three times. Every run must report 0 skipped responses. Stop the server by PID.

## Review Focus

1. **The headline or the chips inside the trigger.** A headline in `summary` puts a sentence in every branch button's accessible name. A `<ul>` of chips inside a `<button>` is invalid HTML. → Task 5 tests that `preview` is outside the button. Tasks 6 and 7 test that the trigger's name does not contain the headline.
2. **An entry with no impact lines.** Five of the eleven drawn entries have `impact: []` (`portfolio.ts:620, 648, 676, 693, 710`). An empty "What it changed" label, or an empty `<ul>`, would be noise for a screen reader. → Tasks 6 and 7 test that those panels carry neither.
3. **An entry with no technologies.** The same five entries have `technologies: []`. Before this round they already had zero leaves. The mobile row must not render an empty chips list at rest. → Task 7 test.
4. **320 px.** A headline under a label in a narrow card must wrap, not overflow. → Task 7 runs `e2e/responsive.spec.ts`, which checks overflow from 320 to 1440 px.
5. **No-JS and print.** The headline must be in the server HTML and visible on paper. The impact lines must print, because print expands every disclosure. → Task 6 runs `e2e/print.spec.ts`. Task 6 also has a unit test that the headline is rendered with the disclosure closed.

---

## Premises (verified at `01177fa`)

| # | Premise | Where |
|---|---|---|
| P1 | Drawn = `careerEntries` minus the nine `DEMOTED_ENTRY_IDS` | `src/lib/knowledge-tree.ts:242-252`, `:269-271` |
| P2 | A branch's `leaves` are its technologies and then its impact lines | `knowledge-tree.ts:140-158`; type `:65-75`, `:98-100` |
| P3 | `totalLeaves()` sums `leaves.length`. Three consumers read it: the rail, the `tree-shape` plaque and the cats | `knowledge-tree.ts:290-292`; `CareerTree.tsx:60,89,95`; `src/lib/worlds.ts:87`; `src/lib/companion-facts.ts:109` → `companion-dialogue.ts:140,189` |
| P4 | The `tree-shape` test computes its expected string, so a count change does not break it | `tests/lib/worlds.test.ts:55` |
| P5 | Hand count: drawn technologies 37, impact lines 16 → leaves **53 → 37**; distinct technologies **30** (unchanged); Heaviest DoorDash **18 of 53 → 13 of 37** | `portfolio.ts:287-309, 331-338, 364-370, 396-403, 421-427, 730-733` (inferred by hand; Task 4 Step 4 confirms) |
| P6 | The desktop panel summary shows label · org · year. The panel holds kind · dates, Ran alongside and case studies, and says it never repeats impact | `src/sections/CareerTree/DrawnTree.tsx:781-846` (comment `:756-764`) |
| P7 | The mobile summary shows title and kind · dates. Chips and impact are inside the disclosure | `KnowledgeTreeList.tsx:78-145` |
| P8 | `Disclosure` renders `summary` inside the `<button>` and has no slot outside it | `src/components/ui/Disclosure.tsx:72-98` |
| P9 | Plaque refs: 12 field (4 roles, `usc-ta.impact[1]`, `usc-scraping.built[1]`, `.impact[0]`, `.learned`, 2 taglines, 2 cats) + 7 computed. **None quotes a field this plan changes** | `src/content/worlds.ts:36-45, 68-70, 81-82, 93-94, 105-107, 122-124` |
| P10 | `/resume` renders only `type: "work"` entries: role, org, dates, `context`, `impact`, technologies | `src/app/resume/page.tsx:96-136` |
| P11 | The chat indexes career `role`, `organization`, `context` (as `summary`), `impact` and `learned`. `built` and `responsibilities` are not indexed. Projects index `problem`, `learned`, `proof`, `assumption`, `pathsExplored`, technologies and metrics, but not `whyItMattered` | `src/lib/answer-sources.ts:68-92`, `:14-58`; `src/lib/answer-corpus.ts:392-433` |
| P12 | `he`, `his`, `him`, `himself`, `i`, `me` and `my` are stop words. **`myself` is not** | `src/lib/answers.ts:103-118` |
| P13 | The eval fixture pins `"The degree he finished, in computer science"`, and a harness asserts that every snippet exists | `tests/fixtures/answers-eval.ts:273`; `tests/lib/answers-retrieval.test.ts:125-131` |
| P14 | The floors | `answers-retrieval.test.ts:137, 141, 145, 149` |
| P15 | The career entry `context` and `learned` are not rendered on the Journey. `context` is on `/resume` for work entries only | `answer-corpus.ts:52-61` |
| P16 | Approved-as-written lines (2026-10-02): every `learned` of the six round-18 entries, `usc-honors-ta.responsibilities[1]`, the `cs-switch.context` remark, and chess `whyItMattered` | `portfolio.ts:600-606`, `:1149-1161` |
| P17 | Act titles are a literal map | `src/sections/CareerTree/acts.ts:42-55` |
| P18 | Journey lead: `"Started in a kitchen. Still growing."` | `CareerTree.tsx:135` |
| P19 | The `#tree` render-text helper already exists | `tests/sections/CareerTree.test.tsx:327-332` |
| P20 | e2e tells the two presentations apart by trigger names `Show detail — ` / `Show what … involved` | `e2e/sections.spec.ts:300-308` |
| P21 | Docs that state the old tree rule | `CLAUDE.md:144-146`; `docs/editing.md:98-103, 133-136` |
| P22 | Last perf row 205,534 B | `docs/feedback-tracker.md:1597` |

## The first-person pass: every changed string

Method: `grep -nwiE "he|his|him|himself|thien"` over `src/content/`, `src/sections/CareerTree/`, `src/lib/{knowledge-tree,anchors,origin-story}.ts` and `src/app/resume/`. Comment hits are excluded. So are names used as names (`profile.name`, the résumé label) and Contact's "Hi Thien," templates, which address Thien rather than use his name as a subject. The search also looked for indirect references ("author", "the owner"); the one hit is row U1.

| # | Field path | Before | After | Consumers | Pinned by | Flag |
|---|---|---|---|---|---|---|
| 1 | `careerEntries.usc-degree.context` (`portfolio.ts:439`) | The degree he finished, in computer science with a cybersecurity minor — after starting in chemical engineering. GPA 3.8. | The degree I finished, in computer science with a cybersecurity minor — after starting in chemical engineering. GPA 3.8. | chat (`summary`). Not drawn (demoted); not on `/resume` (learning); no plaque | `answers-eval.ts:273` (fixture → row F1) | — |
| 2 | `careerEntries.eastside-high.context` (`:617`) | Three years of American high school, started three weeks after landing, in a language he could read and write but not speak. | Three years of American high school, started three weeks after landing, in a language I could read and write but not speak. | chat | none | — |
| 3 | `careerEntries.fu-of-kyoto.context` (`:642`) | The family restaurant. Both sides of it — cooking on the line, and waiting tables in the language he was still learning. | The family restaurant. Both sides of it — cooking on the line, and waiting tables in the language I was still learning. | `/resume` (work entry); chat | none | — |
| 4 | `careerEntries.self-taught-gap.role` (`:661`) | Whatever he felt like learning | Whatever I felt like learning | Journey branch label (drawing + list), the "Ran alongside" line of every drawn non-milestone branch (it has no end, `portfolio.ts:656-659`), trigger accessible names; chat (`role`, doc `source`, label tokens) | `CareerTree.test.tsx:347-363` (reads the role dynamically) | — |
| 5 | `careerEntries.self-taught-gap.context` (`:673`) | Drove for Uber Eats, and taught himself whatever he was curious about. | Drove for Uber Eats, and taught myself whatever I was curious about. | chat. **Adds the token `myself`** (not a stop word, P12) | none | — |
| 6 | `careerEntries.self-taught-gap.learned` (`:678`) — approved | This is the only stretch of the record where nothing was assigned — which makes it the only evidence of what he does when nobody is asking. | This is the only stretch of the record where nothing was assigned — which makes it the only evidence of what I do when nobody is asking. | chat | none | **owner check** |
| 7 | `careerEntries.usc-cheme.context` (`:690`) | The first major. Not the one he graduated in. | The first major. Not the one I graduated in. | chat | none | — |
| 8 | `careerEntries.cs-switch.context` (`:707`) — approved remark | His friends told him to try it. He tried it, and it stuck — which is a more honest account of how most people find their field than any origin story about childhood computers. | My friends told me to try it. I tried it, and it stuck — which is a more honest account of how most people find their field than any origin story about childhood computers. | chat | none | **owner check** |
| 9 | `projects.chess-minmax.whyItMattered` (`:1174`) — approved | It is the one thing here that nobody asked him to build. | It is the one thing here that nobody asked me to build. | Journey, `CaseStudy` (`CaseStudy.tsx:393`), under the stage (its entry `usc-degree` is demoted). Not indexed (P11); no plaque; not on `/resume` | none | — |
| 10 | `ACTS["the-switch"].title` (`acts.ts:51`) | Friends talk him into it | Friends talk me into it | stage act title, scrubber `aria-valuetext` (`Stage.tsx:397, 465`) | none | — |
| F1 | eval fixture `answers-eval.ts:273` (mirror of row 1, not content) | The degree he finished, in computer science | The degree I finished, in computer science | retrieval eval | `answers-retrieval.test.ts:125-131` | — |

**Checked and left unchanged:**

| # | Field path | Text | Why | Flag |
|---|---|---|---|---|
| U1 | `careerEntries.usc-cheme.learned` (`:695`) — approved | Kept on the record on purpose. A portfolio that admits its author started somewhere else is worth more than one that pretends the line was straight. | No he/his/him, so the pronoun-only rule changes nothing. But "its author" refers to Thien in the third person, and Task 2's test cannot see it | **owner check** |
| U2 | Journey lead (`CareerTree.tsx:135`) | Started in a kitchen. Still growing. | No subject; not third person | — |

**Out of scope, found while searching.** These belong to the Worlds and Contact specs (spec §5). Task 2's test excludes them by naming its scope; it does not use an allowlist.
- `src/content/worlds.ts:34` `where`: "…the first place he lived here".
- `src/content/worlds.ts:56` `disclosure`: "Five objects, and he named every one. …"
- `src/lib/answer-corpus.ts:428`: chat source label "— what it taught him".

**Headline word counts** (whitespace tokens; spec §2.4 says ≤ 12): DoorDash has **13**. "Rebuilt a catalog scraper on a direct API: 17 hours to 3 minutes." **owner check**: the approved line breaks the spec's own cap. Task 3 is gated on the owner's choice. The two options are to cut a word from the line (the owner chooses which) or to state the cap as ≤ 13. This plan rewrites neither. The other ten headlines have 9–12 words.

---

## File Structure

- Create `docs/voice.md`. It holds the voice rules (Task 1).
- Create `tests/lib/voice.test.ts`. It holds the rules on content: no third person, and the headline rules (Tasks 2–3).
- Modify `src/content/portfolio.ts` (rows 1–9, plus the 11 headlines), `src/sections/CareerTree/acts.ts:51` and `tests/fixtures/answers-eval.ts:273`.
- Modify `src/types/portfolio.ts:252-279` (`CareerEntry.headline?`).
- Modify `src/lib/knowledge-tree.ts`: the model and its comments.
- Modify `src/components/ui/Disclosure.tsx` (`preview`), plus `tests/ui/Disclosure.test.tsx`.
- Modify `src/sections/CareerTree/DrawnTree.tsx`, `KnowledgeTreeList.tsx` and `CareerTree.tsx` (comments and rail), plus `tests/sections/CareerTree.test.tsx` and `tests/lib/knowledge-tree.test.ts`.
- Modify `src/lib/answer-corpus.ts:52-61` (comment only).
- Modify `CLAUDE.md:142-148`, `docs/editing.md` and `docs/feedback-tracker.md`.

## Task order, tiers, dependencies

| # | Task | Tier | Depends on |
|---|---|---|---|
| 1 | The voice guide | sonnet | — |
| 2 | First person on the Journey's content | sonnet | — (owner-check rows gate the merge, not the work) |
| 3 | Headlines on every drawn entry | sonnet | owner's DoorDash answer |
| 4 | Technologies are the only leaves | **opus** | 3 |
| 5 | `Disclosure` gets a `preview` slot | sonnet | — |
| 6 | The drawing: headline at rest, impact behind the click | sonnet | 4, 5 |
| 7 | The list: title, headline and chips at rest | sonnet | 4, 5 |
| 8 | Docs: the tree rule and the headline recipe | sonnet | 6, 7 |
| 9 | Whole-branch verification and the record | **opus** | 1–8 |

Run them in that order. Tasks 1, 2 and 5 touch no shared file, so they can run while the DoorDash answer is pending.

---

### Task 1: The voice guide

**Files:**
- Create: `docs/voice.md`

**Interfaces:**
- Produces: `docs/voice.md`, which later specs (About, Worlds, Contact) and Task 8 link to.

- [ ] **Step 1: Write `docs/voice.md`.** One page. It contains spec §2's six rules, in the spec's own wording, and nothing beyond them. For rule 6, use four before/after pairs, and take every pair from this plan's tables and the spec:
  - row 8 (cs-switch, third → first person);
  - row 10 (act title);
  - DoorDash `impact[0]` (`portfolio.ts:288`) → its approved headline, to show surface vs depth;
  - the Schaeffler sources line → its headline, to show that the figure stays with its source (spec §3, "The 96% stays attached…").

  Quote each one verbatim. Write no new example sentence.
- [ ] **Step 2: Check.** Run `grep -n "he \|his \|him " docs/voice.md`. The only hits allowed are the "before" halves. Every quoted string must exist in the spec or in `portfolio.ts` (grep each one).
- [ ] **Step 3: Commit**

```bash
git add docs/voice.md
git commit -m "Write the voice rules every section's copy follows"
```

---

### Task 2: First person on the Journey's content

**Files:**
- Modify: `src/content/portfolio.ts:439, 617, 642, 661, 673, 678, 690, 707, 1174`
- Modify: `src/sections/CareerTree/acts.ts:51`
- Modify: `tests/fixtures/answers-eval.ts:273`
- Create: `tests/lib/voice.test.ts`
- Test: `tests/sections/CareerTree.test.tsx` (add one test to `describe("the subjects #tree is cited for")`, reusing `journeyText()` at `:327-332`)

**Interfaces:**
- Produces: `THIRD_PERSON = /\b(he|his|him|himself)\b/i` and `QUOTATIONS_OF_OTHERS: ReadonlySet<string>` (field paths; starts **empty**), both exported from `tests/lib/voice.test.ts`'s module scope for Task 3's tests in the same file.

- [ ] **Step 1: Record the retrieval baseline.** At `01177fa`, read the scoreboard. Make a local, uncommitted edit that changes the recall@3 floor at `answers-retrieval.test.ts:137` to `2`, run `pnpm vitest run tests/lib/answers-retrieval.test.ts`, copy the printed scoreboard, then revert the edit. Run `git diff --stat tests/` to check the tree is clean.
- [ ] **Step 2: Write the failing tests.**
  - `tests/lib/voice.test.ts`, `"no career entry or case study speaks of me in the third person"`. Walk every string value in `careerEntries` and `projects`, recursing through arrays and objects, and record each one with its path (`careerEntries.<id>.<field>[i]`). Guard: `expect(strings.length).toBeGreaterThan(100)`. Then `expect(offenders).toEqual([])`, where `offenders` lists every `path: text` for which `THIRD_PERSON.test(text)` holds and the path is not in `QUOTATIONS_OF_OTHERS`. Add a comment that names the out-of-scope strings (`worlds.ts:34, 56`, `answer-corpus.ts:428`) and the spec section that defers them.
  - `CareerTree.test.tsx`, `"renders nothing on the Journey in the third person"`: `render(<CareerTree />)`. Guard: `journeyText().length > 1000`. Then `expect(journeyText().match(THIRD_PERSON_GLOBAL) ?? []).toEqual([])`, with `/\b(he|his|him|himself)\b/gi` defined locally. This test covers the act titles, the lead and the case studies as rendered.
- [ ] **Step 3: Run both.** Expected: FAIL. The first lists rows 1–9. The second lists `him` from the act title and the chess `whyItMattered`.
- [ ] **Step 4: Apply rows 1–10 and F1**, After column, exactly. Change nothing else on those lines. Leave U1 as it is. Leave the comments at `portfolio.ts:600-606, 664-671` alone: they are comments about the owner, not rendered copy.
- [ ] **Step 5: Run** `pnpm vitest run tests/lib/voice.test.ts tests/sections/CareerTree.test.tsx tests/lib/answers-retrieval.test.ts tests/lib/worlds.test.ts tests/lib/knowledge-tree.test.ts`. Expected: PASS. Read the scoreboard again (same local edit, then revert) and compare it with Step 1. The floors must still hold. Report the movement in recall@1/3/5 and MRR, and name any case that changed rank. Row 5 adds `myself` to the index.
- [ ] **Step 6: Prove the tests bite.** Temporarily set `acts.ts:51` back to "him". The render test must fail, and the content walk must not (act titles are not content). Then temporarily set `usc-cheme.context` back to "he". The content walk must fail; this field is not rendered on the Journey (P15). Revert both, and record the four results.
- [ ] **Step 7: Commit**

```bash
git add src/content/portfolio.ts src/sections/CareerTree/acts.ts tests/fixtures/answers-eval.ts tests/lib/voice.test.ts tests/sections/CareerTree.test.tsx
git commit -m "Speak in first person on the Journey: career entries, the chess case study and the act titles"
```

The report includes rows 6, 8 and U1, quoted, for the controller to take to the owner.

---

### Task 3: Headlines on every drawn entry

**Gate:** the owner's answer on the 13-word DoorDash headline. Apply the answer exactly as given. If the answer is "the cap is 13", the cap goes into `docs/voice.md` rule 4 and the test, and it gets a dated note under spec §2.

**Files:**
- Modify: `src/types/portfolio.ts:252-279`
- Modify: `src/content/portfolio.ts` (one `headline` per drawn entry, placed after `organization`)
- Test: `tests/lib/voice.test.ts`

**Interfaces:**
- Produces: `CareerEntry.headline?: string`, with a doc comment saying it is required on drawn entries, unindexed, and holds a figure only if the same entry's `impact`, `context` or `built` holds it.

- [ ] **Step 1: Write the failing tests** in `voice.test.ts`. Each test names `buildDrawnTree()` ids as `DRAWN_IDS`, with the guard `DRAWN_IDS.length === careerEntries.length - DEMOTED_ENTRY_IDS.length` and `> 0`.
  1. `"every drawn entry has a headline of at most 12 words"`: for each drawn id, `headline?.trim()` is truthy and `headline.trim().split(/\s+/).length <= 12` (or 13 per the gate).
  2. `"demoted entries need no headline"`: no assertion on them. Instead, assert that the drawn set and the demoted set partition `careerEntries`, so the rule above covers every non-demoted entry.
  3. `"a headline never introduces a figure"`: `figures = (s) => (s.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, ""))`. For each headline, every figure is in `figures([...impact, context, ...built].join(" "))`. Guard: at least 6 headlines carry a figure (doordash, wordification, schaeffler, usc-scraping, usc-ta, usc-honors-ta).
  4. `"headlines are not indexed"`: no document in `buildDocuments()` has `text` equal to, or containing, any headline. Guard: `headlines.length === 11`.
- [ ] **Step 2: Run.** Expected: FAIL (no field).
- [ ] **Step 3: Add the field and the 11 headlines** from spec §3's table, verbatim, using the gate's answer for DoorDash. In the type's doc comment, point to `docs/voice.md` rule 4. Do not touch `answer-sources.ts`: `careerIndexable` maps its fields explicitly (`:83-92`), so a new field stays unindexed.
- [ ] **Step 4: Run** `pnpm vitest run tests/lib/voice.test.ts tests/lib/answers-retrieval.test.ts`. Expected: PASS.
- [ ] **Step 5: Prove they bite.** Make each of these changes in turn, run the tests, and record the failing test:
  - change Schaeffler's `96%` to `97%` (test 3 fails);
  - delete `fu-of-kyoto.headline` (test 1 fails);
  - add `entry.headline` to the `summary` in `careerIndexable` (test 4 fails).

  Revert all three.
- [ ] **Step 6: Commit**

```bash
git add src/types/portfolio.ts src/content/portfolio.ts tests/lib/voice.test.ts
git commit -m "Give every drawn Journey entry a one-line headline traced to its own record"
```

---

### Task 4: Technologies are the only leaves

Cross-cutting. One model change moves three rendered counts: the rail, the `tree-shape` plaque and the cats' leaf line. Expected after the change: `11 branches · 37 authored leaves · 30 distinct technologies` (was 53), "Heaviest: Software Engineer · 13 of 37", and the cats' line "37 leaves".

**Files:**
- Modify: `src/lib/knowledge-tree.ts`:
  - `:4-25`, banner: "leaf … or an impact line it claims".
  - `:61-75`: the `TreeLeafKind` doc and the type.
  - `:84-106`: `TreeBranch`.
  - `:140-158`: `buildCareerTree`.
  - `:283-292`: the `totalLeaves` doc.
- Modify: `src/sections/CareerTree/CareerTree.tsx:28-32` (the "Heaviest" comment cites impact lines) and `:58-59`
- Modify: `src/lib/answer-corpus.ts:58-61` (comment: "its impact leaves" becomes "its impact lines behind the branch's click")
- Test: `tests/lib/knowledge-tree.test.ts:21-26, 44-83, 101-121`

**Interfaces:**
- Consumes: `CareerEntry.headline` (Task 3).
- Produces:
  - `type TreeLeafKind = "technology"`.
  - `TreeLeaf { kind: "technology"; text: string; alsoUsedIn: number }`.
  - `TreeBranch` gains `readonly headline: string | undefined` and `readonly impact: readonly string[]`. `impact` is the entry's `impact`, verbatim and in authored order, not de-duplicated.
  - `totalLeaves` and `treeTechnologies` keep their signatures.

  Any leftover `leaf.kind === "impact"` becomes a type error: `KnowledgeTreeList.tsx:57` stays broken until Task 7. To keep `pnpm typecheck` green at this commit, change that line in this task to read `branch.impact`, rendered the same way it is rendered today. Task 7 then moves it.

- [ ] **Step 1: Rewrite the tests.**
  - `:56-67` becomes `"carries the entry's impact lines verbatim and in order, not as leaves"`: `expect(branch.impact).toEqual(entry.impact)`, and no leaf's `text` is in `entry.impact` (unless the same string is also a technology; none is).
  - `:69-83` becomes `"draws every technology the entry authored, and nothing else as a leaf"`: the set of leaf texts equals `new Set(entry.technologies)`.
  - `:101-107` is deleted (impact leaves no longer exist), and the banner `:21-26` is updated to say why.
  - Add `"carries the entry's own headline"`: `branch.headline === entry.headline` for all branches. Guard: at least 11 are defined.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**, and fix every comment listed under **Files**. The rail term "Leaves · N authored facts" stays as it is: each technology leaf is still an authored fact.
- [ ] **Step 4: Run** `pnpm vitest run tests/lib tests/sections/CareerTree.test.tsx`, then `pnpm typecheck`. Expected: PASS. Write a throwaway `it.only`, never committed, that logs `resolveChapters()` plaques for `plants`, `facts.tree` and the rail. Report the logged values, and confirm P5's hand count or correct it in this plan's record (Task 9).
- [ ] **Step 5: Prove it bites.** Temporarily re-append the impact leaves in `buildCareerTree`. The "nothing else as a leaf" test must fail. Revert.
- [ ] **Step 6: Commit**

```bash
git add src/lib/knowledge-tree.ts src/sections/CareerTree/CareerTree.tsx src/sections/CareerTree/KnowledgeTreeList.tsx src/lib/answer-corpus.ts tests/lib/knowledge-tree.test.ts
git commit -m "Draw technologies as the tree's only leaves; carry impact and headline on the branch"
```

---

### Task 5: `Disclosure` gets a `preview` slot

**Files:**
- Modify: `src/components/ui/Disclosure.tsx:8-18` (prop), `:70-99` (render), and its banner comment
- Test: `tests/ui/Disclosure.test.tsx`

**Interfaces:**
- Produces: `DisclosureProps.preview?: ReactNode`. When given, it renders as a sibling **after** the `<button>` and **before** the region, wrapped in no extra element, visible whether the disclosure is open or closed, and not part of the trigger's accessible name.

- [ ] **Step 1: Write the failing tests.**
  - `"renders preview outside the trigger, visible while collapsed"`: `preview={<p>Seen at rest</p>}`. The text is visible. `trigger.contains(previewEl)` is false. The trigger's accessible name does not contain "Seen at rest". `previewEl.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING` is non-zero.
  - `"renders nothing extra without a preview"`: the container's child count matches today's (button + region).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** One line of render, plus the prop doc: "Always visible, outside the trigger, so it never joins the button's accessible name."
- [ ] **Step 4: Run** `pnpm vitest run tests/ui/Disclosure.test.tsx`. Expected: PASS. Mutation: render `preview` inside the `<button>`. The first test must fail. Revert.
- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Disclosure.tsx tests/ui/Disclosure.test.tsx
git commit -m "Let a disclosure show a preview outside its trigger"
```

---

### Task 6: The drawing — headline at rest, impact behind the click

**Files:**
- Modify: `src/sections/CareerTree/DrawnTree.tsx`
  - `:781-846` (`BranchPanel`);
  - comments at `:41-46`, `:88-101`, `:107-121`, `:597-616`, `:756-764` and `:894-897`. Each describes impact lines as leaves or says the panel never repeats them.
- Test: `tests/sections/CareerTree.test.tsx`; e2e `sections`, `print`, `origin`, `axe`, `interactions`

**Interfaces:**
- Consumes: `TreeBranch.headline` and `.impact` (Task 4), and `Disclosure.preview` (Task 5).
- Produces: the panel renders
  - `preview={branch.headline ? <p data-tree-headline="" className="…text-fg-muted…">{branch.headline}</p> : undefined}`;
  - then, inside the region:
    1. when `impact.length > 0`, a `<p className="eyebrow" id={\`tree-branch-${id}-changed\`}>What it changed</p>` and a `<ul role="list" aria-labelledby=…>` with one `<li>` per line;
    2. kind · dates (`:819-821`);
    3. Ran alongside (`:827-831`);
    4. case studies (`:837-841`).

  The trigger's labels stay as they are (`Show detail — …`, P20).

- [ ] **Step 1: Write the failing tests** (render `<CareerTree />`, then scope to the drawing: `[data-origin-host]`).
  1. `"shows each drawn branch's headline at rest, outside its trigger"`: for every drawn branch, with the disclosure closed, `[data-tree-headline]` inside that `[data-tree-branch=<id>]` has text `=== entry.headline`. The trigger `#tree-branch-<id>-trigger` does not contain it, and its accessible name does not include the headline. Guard: 11 matches.
  2. `"puts every impact line, verbatim and in order, in its own branch's panel"`: the `li` texts under `#tree-branch-<id>-panel` equal `entry.impact` (`toEqual`). Guard: total lines `=== 16`, or whatever Task 4 confirmed.
  3. `"draws no impact line as a leaf"`: no `[data-origin-tier="leaf"]` text inside the drawing equals any impact line.
  4. `"says nothing about change on a branch that authored none"`: for the five drawn entries with `impact: []`, "What it changed" is absent from their panel.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**, and rewrite every comment listed under **Files**. The foliage comments must say that the count is technologies only, and the "role with nine technologies and three impact lines" example must change to match.
- [ ] **Step 4: Run** the file, then `e2e/sections.spec.ts`, `print.spec.ts`, `origin.spec.ts`, `axe.spec.ts` and `interactions.spec.ts` at `--workers=2`. Expected: PASS. Then check `pnpm dev` at 1440 in both themes. A headline sits under each label. The panel opens to "What it changed". The origin story ("Watch how it grew") still grows every leaf.
- [ ] **Step 5: Prove they bite.** First, move the headline into `summary`: test 1 fails. Then reverse `impact` in the panel: test 2 fails. Revert both.
- [ ] **Step 6: Commit**

```bash
git add src/sections/CareerTree/DrawnTree.tsx tests/sections/CareerTree.test.tsx
git commit -m "Show each branch's headline at rest and its impact lines behind the click"
```

---

### Task 7: The list — title, headline and chips at rest

**Files:**
- Modify: `src/sections/CareerTree/KnowledgeTreeList.tsx:32-34` (banner: "one scannable headline"), `:55-163`
- Test: `tests/sections/CareerTree.test.tsx`; e2e `sections`, `responsive`, `axe`, `print`

**Interfaces:**
- Consumes: Tasks 4 and 5.
- Produces:
  - `summary` holds the title and the year, and nothing else (the kind · dates eyebrow leaves it).
  - `preview` holds `<p data-tree-headline>` and, when the entry has technologies, the existing chips `<ul aria-label="Technologies used — …" className="token-run">`, moved unchanged from `:104-128`.
  - The region holds:
    1. "What it changed" and the impact list (same markup and id scheme as Task 6, with prefix `tree-list-branch-`);
    2. kind · dates;
    3. Ran alongside;
    4. case studies.

  `defaultOpen={branchIndex === 0}` and the trigger labels stay as they are.

- [ ] **Step 1: Write the failing tests**, scoped to the list (`[data-tree-branch]` under the `ul` that `KnowledgeTreeList` renders).
  1. `"shows title, headline and chips without opening"`: the headline text `=== entry.headline` and is outside the trigger. The chips list's items equal `entry.technologies` (verbatim) and are outside the trigger. Guard: 11 rows.
  2. `"keeps impact, dates, siblings and case studies inside the disclosure"`: each of them is a descendant of `#tree-list-branch-<id>-panel`.
  3. `"renders no empty chips list"`: rows whose entry has `technologies: []` have no `[aria-label^="Technologies used"]`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the file, then `e2e/sections.spec.ts`, `responsive.spec.ts` (320–1440 px, no overflow), `axe.spec.ts` and `print.spec.ts` at `--workers=2`. Expected: PASS. Check `pnpm dev` at 375 and at 320 in both themes.
- [ ] **Step 5: Prove they bite.** Put the chips back inside the region: test 1 fails. Revert.
- [ ] **Step 6: Commit**

```bash
git add src/sections/CareerTree/KnowledgeTreeList.tsx tests/sections/CareerTree.test.tsx
git commit -m "Show title, headline and chips at rest on the Journey list"
```

---

### Task 8: Docs — the tree rule and the headline recipe

**Files:**
- Modify: `CLAUDE.md:142-148`. "its leaves are that entry's own `technologies` and `impact` fields" becomes: leaves are the entry's own `technologies`; its `impact` lines render verbatim in its panel; its `headline` is drawn under its label. Also add one line pointing to `docs/voice.md` under "Changing what the site says".
- Modify: `docs/editing.md:98-103` (the field comments), `:133-136` (the tree note), and a new recipe, "Write a headline": ≤ 12 words (or the gate's cap), required on drawn entries, every figure from the same entry, `tests/lib/voice.test.ts` enforces it, never indexed. Link to `docs/voice.md`.
- Modify: `README.md` only if a line there states the old leaf rule. At `01177fa`, none does (`README.md:195-225` lists fields only).

- [ ] **Step 1: Edit**, then run `grep -rn "impact leaves\|impact line it claims\|technologies\` and \`impact\` fields" CLAUDE.md docs/editing.md README.md src`. Expected: no hits.
- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md docs/editing.md
git commit -m "Document the headline recipe and the tree's new leaf rule"
```

---

### Task 9: Whole-branch verification and the record

**Files:**
- Modify: `docs/feedback-tracker.md` (a Round 19 section)

- [ ] **Step 1:** Run `pnpm verify`. Expected: 5/5.
- [ ] **Step 2:** Run the full `pnpm test:e2e` through the throwaway config at `--workers=2`. Report the pass, fail and skip counts. Re-run each failure alone and report both runs. `legacy-anchors.spec.ts` must pass, because the per-entry fragments are unchanged.
- [ ] **Step 3:** Run `pnpm perf` against a production build, 3 runs, 0 skipped. Compare initial JS with 205,534 B. Expected growth: a few hundred bytes at most (the `preview` prop). Larger growth means the content layer leaked into a client chunk: stop and report it.
- [ ] **Step 4:** Browser pass, `pnpm dev` on 31xx, both themes, at 1440, 375 and 320, with reduced motion on and off. Check the Journey drawing, the list, a panel opened, `/resume` (row 3's context reads in first person) and the globe's Plants plaque (the new leaf count).
- [ ] **Step 5:** Record in the tracker:
  - this plan's string table (by reference) and the owner's answers to the four owner checks;
  - the retrieval scoreboard before and after, from Task 2;
  - the confirmed leaf counts from Task 4;
  - the perf row;
  - the e2e counts.
- [ ] **Step 6: Commit**

```bash
git add docs/feedback-tracker.md
git commit -m "Record round 19's first-person pass, headlines and measurements"
```

---

## Out of scope

- Third-person copy in Worlds (`worlds.ts:34, 56`) and in the chat's source label (`answer-corpus.ts:428`). The About, Worlds and Contact specs take these (spec §5).
- Rendering `learned` or `context` on the Journey. The gap is noted at `answer-corpus.ts:62-68`, and this spec does not close it.
- The headline sources' flags 2, 3, 6 and 7. They were settled or left alone by spec §3 "Owner facts settled".

## Still with the owner

1. **DoorDash headline, 13 words** against the ≤ 12 cap: cut a word (the owner chooses which), or set the cap to 13. This gates Task 3.
2. **Row 6, `self-taught-gap.learned`**: in first person, an observer's inference becomes a claim about myself.
3. **Row 8, `cs-switch.context`**: "a more honest account" moves from the narrator's remark to self-assessment.
4. **U1, `usc-cheme.learned`**: "its author" is still third person, and no test sees it. Keep it, or switch it to first person.
