# Round 19 final whole-branch review (9d6cf70..ac1da4a)

I reviewed the whole branch myself, in one pass. Read-only: no edits, no servers, no subagents.

What I read:
- the full diff (code, tests, e2e, CLAUDE.md, docs/editing.md, docs/voice.md, the feedback tracker)
- the spec, the ledger, every task report and review
- four screenshots: 1440 day open, 1440 night rest, 390 day rest, plus the 390 frames described in the ledger

What I ran: `pnpm vitest run tests/lib/voice.test.ts tests/lib/knowledge-tree.test.ts`, 33/33 passed. Everything else comes from the Task 9 report: verify 5/5, 955 unit tests, full e2e 799/0, perf 205,712 B.

## Strengths
- **The model change is small.** `TreeBranch` gains `headline` and `impact`, and leaves are technologies only (knowledge-tree.ts:150-160).
- **Every visitor-facing count is computed, none typed:** the rail, the cats and the Plants plaque. Plaques stay at 12 field + 7 computed, and only `tree-shape` changes, because its input changed.
- **`Disclosure.preview` is the right primitive.** It is a plain sibling between the button and the region. It is never in the trigger's name, never clipped by the collapsing wrapper, and visible with JavaScript off and in print. The reveal and print e2e specs prove it on the drawing.
- **The list and the drawing match.** Both show the headline at rest. Both put "What it changed" with the impact lines (verbatim, in order) first in the region, then kind · dates, siblings and case studies. The ids are unique (`tree-branch-*` / `tree-list-branch-*`).
- **Tests bite.** There are count guards against vacuous loops, and each new assertion has a fail-proof. I checked 37 / 16 / 11 / 5 by hand against portfolio.ts and DEMOTED_ENTRY_IDS:
  - 16 impact lines drawn, 5 on demoted entries (2 + 1 + 1 + 1), 21 in all
  - 5 drawn branches with no impact
- **Within the limits.** Retrieval is identical. Initial JS is +178 B (the spec allows "a few hundred"). Styling uses aliases only. Nothing new animates.

## Issues

### Critical
None.

### Important (must fix before merge)
1. **tests/lib/voice.test.ts:53-56 and :81-86: `PENDING_OWNER_REWRITE` does not guarantee the owner lines cannot ship unnoticed.**
   - **A mistyped path is caught.** The real offender is then not allowlisted, so the walk fails. Good.
   - **A stale path is not caught.** One is already stale today. `careerEntries.usc-cheme.learned` ("its author", portfolio.ts:704) never matches `THIRD_PERSON`, so that allowlist entry suppresses nothing. If the owner rewrites the line, nothing signals it. A leftover entry would also silently allow a future he/his in that field.
   - **The exact-three pin does not help.** It checks the paths' names, not their text.
   - **Nothing goes red while the set is non-empty.** CI is green today. Under the global rule "auto-merge once CI is green", this PR would merge with all three lines unwritten. Today the only gate is prose in progress.md and feedback-tracker.md.
   - **Fix:** pin each pending path to its current verbatim text, as a `Map<path, text>`, and assert that the walked string at that path `===` the pinned text. That fails on a mistyped path, on a stale entry and on the owner's rewrite. Then:
     - Open the PR as a draft, or explicitly held (CLAUDE.md allows holding), with auto-merge off.
     - The owner-text commit deletes the map and the pin test, and the walk must then pass with no allowlist.

### Minor / can wait (21)
Ledger-deferred minors, triaged:
1. T3: the fact trace is unit-blind and pool-wide ("3M+" would pass on "3 minutes"). Can wait.
2. T3: `headlines.length === 11` restates the count, and `e.headline!` throws instead of failing cleanly. Can wait.
3. T3: the "not indexed" check is substring-only. Can wait.
4. T5/T7: the list's preview (headline and chips) has no no-JS or print e2e. The drawing's has both. Can wait.
5. T5: the open-state preview has no unit test (the 1440-open screenshot shows it). Can wait.
6. T4: rewrapped comment widths. Can wait.
7. T6: `toBeVisible` does not see `opacity: 0`. Can wait.
8. T6/T7: pinned counts 11/16/10/4/5 restate content. Each fails loudly on a content change. Can wait.
9. T8: editing.md's recipe sounds more precise than the check (whitespace split, digit tokens only). Can wait.
10. T8: the example headline "Result in 12 words or fewer." contains a figure. Copy-pasted, it fails loudly. Can wait.
11. T2: `answer-corpus.ts:264` and `:428` "what it taught him" are chat source labels (Contact spec). Can wait.
12. T2: the headline-sources spec quotes the third-person drafts. It is historical and labelled. Can wait.
13. T2: the regex cannot see "Thien", "its author" or "the author". This becomes a known gap once #1 lands. Can wait.
14. T9: the open DoorDash panel pushes its technology leaves ~3000 px down (see concern 1). Can wait.
15. T9: chip-wrap divider at 390 (see concern 2). Can wait.
16. T9: third-person Worlds copy at `worlds.ts:34` and `:56`. Out of scope per spec §5. Can wait.

New in this review:

17. `src/lib/knowledge-tree.ts:64-65`: "The kind stays on the type so a leaf still says what it is wherever it is rendered". No renderer reads `kind`; only the React key at DrawnTree.tsx uses it. The `.filter(l => l.kind === "technology")` calls left in knowledge-tree.test.ts are no-ops. Reword the comment or drop the field. Can wait.
18. `tests/lib/voice.test.ts:53-55`: the out-of-scope list names `answer-corpus.ts:428` but not `:264`. Can wait.
19. `src/sections/CareerTree/DrawnTree.tsx:1187`: "Fourteen panels" predates this branch and is stale (11 drawn). Task 6 fixed the other "fourteen". Can wait.
20. `e2e/sections.spec.ts:406`: the comment cites "Task 4", a ledger term that means nothing in the repo. The numbers themselves are true. Can wait.
21. `docs/voice.md:17`: "quoted from the content layer as it stood at Round 19" is ambiguous. Two of the "before" strings no longer exist after Round 19; "before Round 19" is what is meant. Can wait.

## The three named concerns
1. **1440, the DoorDash panel pushes its leaves ~3000 px down. Not a regression.**
   - On main 9d6cf70 the leaf `<ul class="relative flex flex-col pt-5">` (DrawnTree.tsx:1163 on main) is already an in-flow sibling after `BranchPanel`. Since round 18, the panel has already held the full case studies.
   - So opening DoorDash on main already pushed its 18 leaves below the case studies.
   - Round 19 adds only the "What it changed" block (five lines, a few hundred px) to that push.
   - It is a pre-existing layout weakness: the technologies separate from their opened card. Fixing it means moving the leaf column out of flow, or to beside the panel, which touches the origin story's `data-tree-panel` / `[data-origin-host]` geometry.
   - That is a design change for a later round, not a fix now.
2. **390, wrapped chip lines start with a divider. Not a regression.**
   - `globals.css:893-903` documents it as a deliberate acceptance ("CSS has no selector for 'first on its line'").
   - The same `token-run` markup wrapped the same way on main inside the opened row.
   - Round 19 only makes it visible at rest on all 11 rows. Cosmetic; can wait.
3. **Third-person copy left in Journey-scoped strings: none visible.**
   - Every non-comment match under `src/sections/CareerTree` is inside a JSX or JS comment (CareerTree.tsx:110 included).
   - The jsdom render test checks the whole rendered `#tree` text, closed regions included, plus all act titles.
   - The three pending lines are not rendered on the Journey. `learned` and `context` of career entries are not drawn, and `/resume` lists work entries only. They reach visitors only through the chat corpus.
   - Third person remains in Worlds (`worlds.ts:34,56`) and in the chat source labels (`answer-corpus.ts:264,428`). Both are out of scope.

## Cross-task integration
- **Headline.** It is a `Disclosure` `preview` in both presentations (DrawnTree.tsx:806, KnowledgeTreeList.tsx:83) and is not in the trigger's name. The unit tests plus `reveal.spec` (no-JS, closed) and `print.spec` cover it.
- **Preview slot.** With no preview it renders nothing (the 2-children test). It sits between the button and the region.
- **Tech-only leaves.** Model, render ("draws no impact line as a leaf") and the rail/plaque counts all agree: 37 leaves, Heaviest 13 of 37.
- **List/drawing parity.** Same headline, same impact order, same region order. Chips at rest in the list; leaves in the drawing.
- **Counts.**

  | count | checked by |
  |---|---|
  | 37 leaves | rail/plaque production HTML (T9) |
  | 16 impact lines | unit tests (drawing and list) + e2e |
  | 11 headlines | unit tests + e2e |

  I re-derived each by hand.
- **Print and no-JS.** The preview is outside the region, so it always shows. Print still expands every region.
- **Docs match code.** CLAUDE.md's tree rule, the editing.md recipe and field comments, the type doc, the knowledge-tree banner, and the DrawnTree and KnowledgeTreeList docs are true at HEAD. The exceptions are minors 17-21.

## Declined to judge
- The LCP/TBT spread (machine load, unverified). Initial JS is the budget that matters, and it is flat within +178 B.
- Owner-authored headline wording ("Reverse engineering", "Our family restaurant"). These are the owner's rulings.
- Whether `headline` should be required by the type rather than by the test. The spec put the enforcement in tests.

## Assessment
**Ready to merge: not yet.** Fix #1, then hold the PR until the owner's three lines land and the pending map is deleted.

**Reasoning:** The implementation is correct, well-tested and within every budget. The only gap is that the merge gate for the owner lines is prose, not a check. One allowlist entry is already inert, and green CI would let an auto-merge ship all three.
