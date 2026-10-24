# SDD ledger — plan: docs/superpowers/plans/2026-10-10-round-19-voice-and-journey.md

Worktree .claude/worktrees/journey-voice, branch round-19/journey-voice, base 9d6cf70 (origin/main). Spec 01177fa, plan ff77198 (opus planner verified premises with file:line).
Ruling: DoorDash headline = owner's own words "Reverse engineering scraper: 17 hours to 3 minutes" (owner-authored; fact-trace checks numbers 17/3 only) — cost: none.
Ruling: three owner-check lines (self-taught-gap.learned, cs-switch.context, usc-cheme.learned) — OWNER will rewrite; Task 2 waits for his text. Order: T1, T3, T5 first; T2 when text arrives; then T4, T6, T7, T8, T9.
Task 1: dispatched (sonnet, BASE ff77198)
Task 1: implementer DONE 06341e3 (docs only). Review dispatched.
Task 1: review → spec ✅, 1 Important (spec table vs owner DoorDash headline) — controller fixed spec doc (owner decision record) + voice.md heading wording in a doc-only commit; verified by grep.
Task 1: complete (commits ff77198..HEAD, review clean)
Task 3: dispatched (sonnet, BASE bc3f98b)
Task 3: implementer DONE 81cedd6 (943 unit; voice.test.ts; 3 fail-proofs). Review dispatched.
Task 3: review → spec ✅, quality approved, 0 Crit/Imp.
Task 3: minor (deferred): fact-trace unit-blind across entry; headlines.length===11 restates count / e.headline! throws; not-indexed checks exact text only.
Task 3: complete (commits bc3f98b..81cedd6, review clean)
Task 5: dispatched (sonnet, BASE 81cedd6)
Task 5: implementer DONE 471dc4d (945 unit; 5 e2e specs 159/0). Review dispatched.
Task 5: review → spec ✅, quality approved, 0 Crit/Imp.
Task 5: minor (deferred → T6/T7 e2e): preview JS-off/print visibility untested until first consumer; open-state preview untested.
Task 5: complete (commits 81cedd6..471dc4d, review clean)
Task 4: dispatched (opus, BASE 471dc4d)
Task 4: implementer DONE 1139fda (945 unit; retrieval floors held; e2e 635/0; leaves 53→37; tree-shape plaque '37 authored leaves'; desktop shows impact nowhere until T6 — interim, branch-only). Review dispatched (opus).
Task 4: review (opus) → spec ✅, quality needs fixes: 2 Important (false ratio comments; backwards test comment) + promoted: always-true check, false 'exactly what authored'/'same data' comments, typed 'thirteen'. Cross-task: Task 6 must delete DrawnTree.tsx:763 'not drawn yet' and keep 16-impact-line guard; re-point T6 brief at rewritten ranges. FIX_BASE 1139fda. Fix round 1/5 dispatched.
Task 4: fix round 1/5 (2 Important + 3 promoted addressed, 0 open; commits 1139fda..6c5e5ce)
Task 4: minor (deferred): rewrapped widths; impact test single guard.
Task 4: complete (commits 471dc4d..6c5e5ce, review clean)
Task 6: dispatched (sonnet, BASE 6c5e5ce)
Task 6: implementer DONE_WITH_CONCERNS 9894f94 (566 unit subset; e2e 209/6 → no-JS test moved to reveal.spec 7/7; other 5 specs not re-run after move). Review dispatched.
Task 6: review → spec ✅, quality approved, 0 Crit/Imp; controller promoted 2 stale comments (disclosing list omits impact; 'fourteen branches') + panel-closed assertion. Fix round 1/5 dispatched incl. re-run of the 5 specs.
Task 6: fix round 1/5 (3 addressed, 0 open; commits 9894f94..bc0d1f7) — controller verified small diff; 6 e2e specs 216/0.
Task 6: minor (deferred): toBeVisible misses opacity:0; hard-coded 11/16 guards.
Task 6: complete (commits 6c5e5ce..bc0d1f7, review clean)
Task 7: dispatched (sonnet, BASE bc0d1f7)
Task 7: implementer DONE 0ffbf9e (CareerTree 26/26; e2e 216/0). Review dispatched.
Task 7: review → spec ✅, quality approved, 0 Crit/Imp; promoted vacuous-loop guards + date-absence assertion. Fix round 1/5 dispatched.
Task 7: fix round 1/5 (2 addressed, 0 open; commits 0ffbf9e..0c7e6d7) — test-only, each guard fail-proven; controller accepted on evidence.
Task 7: minor (deferred): pinned 10/4/11/16 counts; no new e2e for list at rest.
Task 7: complete (commits bc0d1f7..0c7e6d7, review clean)
Task 8: dispatched (sonnet, BASE 0c7e6d7)
Task 8: implementer DONE 69b8ab6 (docs; tests/lib 626). Review dispatched.
Task 8: review → spec ✅, quality approved, 0 Crit/Imp.
Task 8: minor (deferred): recipe more precise-sounding than check (whitespace split, digit-only trace); example headline contains "12".
Task 8: complete (commits 0c7e6d7..69b8ab6, review clean)
Ruling: run Task 2 now on every string except the three owner-rewrite lines; those stay as-is, listed in the no-third-person test as an explicit PENDING-OWNER allowlist; merge is gated on the owner text replacing them and the allowlist emptying — cost: one small follow-up commit.
Task 2: dispatched (sonnet, BASE 69b8ab6)
Task 2: implementer DONE a54f124 (955 unit; retrieval identical 70/93.3/96.7/0.805; 8 strings pronoun-only; PENDING_OWNER_REWRITE = 3). Review dispatched.
Task 2: review → spec ✅, quality approved, 0 Crit/Imp.
Task 2: minor (deferred): allowlisted paths not checked for existence/still-offending; "its author"/"Thien" invisible to regex; answer-corpus.ts:428 label "what it taught him" (chat UI copy — later Contact spec); headline-sources.md historical.
Task 2: complete (commits 69b8ab6..a54f124, review clean; owner lines pending)
Task 9: dispatched (opus, BASE a54f124)
Task 9: DONE ac1da4a (verify 5/5, 955 unit; FULL e2e 799/0; perf 205,712 B = +178 vs main; 8 screenshots OK). Concerns: chip-wrap divider at 390 (cosmetic, pre-existing style); open DoorDash panel pushes tech labels ~3000px down; Worlds third-person copy (out of scope).
Task 9: complete (verification task; final review covers it)
FINAL: whole-branch review dispatched (opus) on 9d6cf70..ac1da4a.
FINAL review (opus): code ready, 0 Critical; 1 must-fix (pending allowlist doesn't fail on stale/rewritten lines; pin each to exact text). 21 can-wait. Concerns 1/2 not regressions. FINAL fix wave dispatched (sonnet, FIX_BASE ac1da4a).
FINAL fix wave implemented 295979a (pins: path→exact text; both failure modes proven). Waiting on owner's three lines before merge.
Owner lines applied 2cfb0c4 (his words, spelling/tense tidied); pins removed; 954 unit, retrieval 6/6. MERGED: main ff 9d6cf70→2cfb0c4. NOT pushed.
