# SDD ledger — plan: docs/superpowers/plans/2026-10-18-round-21-phase-1-2-foundation.md

Spec: docs/superpowers/specs/2026-10-18-round-21-outdoors-design.md (reachable).
Worktree: .claude/worktrees/r21-foundation, branch round-21/foundation (Phase 1). Phase 2 gets its own worktree after Phase 1 merges.

## Pre-flight scan
| Pair / task | Produces vs consumes | Finding |
|---|---|---|
| T1 -> T2 | T1 keeps --accent-strong = --control; T2 deletes it and adopts --control/--fg-inverse | consistent |
| T1 night paper scope -> T2 primary recipe | inside night .bg-surface, --control=moss-deep, --fg-inverse=paper | consistent; primary on lantern paper reads like day |
| T1 -> T3 | T3 only touches the font @theme inline block | no overlap |
| T3 -> T6 | T3 asserts `#worlds h2`; T6 retargets to `#tree h2` | ordered correctly |
| T5 -> T7 | T5 drops buildStops from the corpus; T7 deletes origin-stops | ordered correctly |
| T6 -> T7 | T6 leaves src/sections/Worlds unimported; T7 deletes it | ordered correctly |
| T1 self | test `night palette is the owner's dusk set` must use the amended moonlit tokens (amendment 5c0a383) | Ruling below |
| T4 self | Step 8 "if any night value changed, wait for owner" | Ruling below |
| T2, T3, T5, T6, T7, T8 self | tests vs code vs files agree | clean |

Ruling: T1's night tests and pairings use the amended "moonlit field" tokens (5c0a383), not the first dusk set the plan body still names in places — the owner chose moonlit on 2026-10-18 after the plan was written — cost if wrong: a re-tint of night tokens.
Ruling: T4 Step 8 only waits on the owner if contrast forces a night token off the moonlit set; otherwise merge and push (pre-approved) — the owner already approved the moonlit board — cost if wrong: one push the owner wanted to see first.

## Tasks
Task 1: dispatched (BASE 5c0a383, implementer sonnet)
Task 1: implemented e5ba72b (DONE_WITH_CONCERNS: blueprint-grid hides night sky gradient; lantern-raised unused)
Task 1: review — spec ✅, quality needs changes (I1 night body gradient hidden by .blueprint-grid; I2 dark code scrim on lantern paper)
Ruling: I1 is fixed in Task 1, not deferred to Task 2 — the owner-approved night must render as soon as the palette lands — cost if wrong: a small rework when Phase 3 replaces the grid.
Task 1: minor (deferred): palette test selector depends on exact whitespace (palette.test.ts:1110)
Task 1: minor (deferred): lantern-raised token measured but unused by any alias
Task 1: fix round 1 dispatched (I1, I2, M3 twin parity), FIX_BASE e5ba72b
Task 1: fix round 1/5 (3 addressed, 1 new Important — sections' opaque ground hides the sky, Hero-only gradient steps; commits e5ba72b..98f6462)
Ruling: at night the sky is one fixed backdrop on body; quiet-tone sections let it show through, loud tone stays opaque — matches the owner's moonlit boards where every section sits under the same sky — cost if wrong: night sections lose their flat ground and need re-tinting.
Task 1: fix round 2 dispatched (A sky behind sections, B dead scrim, C single sky value), FIX_BASE 98f6462
Task 1: fix round 2 implemented 76226e5 (sky continuous, browser-checked)
Task 1: fix round 2/5 (3 addressed, 0 open; commits 98f6462..76226e5)
Task 1: minor (deferred): axe cannot resolve contrast over the sky gradient (nodes "incomplete"); lightest-stop ratios computed by hand >= 5.11
Task 1: minor (deferred): docs/contrast.md deep-tone pairings measured on dusk-deep; deep sections now sit on the sky
Task 1: minor (deferred): sticky header is a flat dusk bar, a shade darker than the sky top
Task 1: complete (commits 5c0a383..76226e5, review clean)
Task 2: dispatched (BASE 76226e5, implementer sonnet)
Task 2: implemented ef21da5 (DONE_WITH_CONCERNS: night inputs on paper 1.16:1 — paper scope left --ground dark; Worlds 'blue' hits left for Phase 2)
Ruling: the night paper scope repoints --ground to lantern-raised, fixed inside Task 2 because its axe gate depends on it — gives the unused token its job — cost if wrong: fields on night paper look a shade lighter than the card.
Ruling: 'blue' hits inside src/sections/Worlds are left for Task 7, which deletes the folder — cost if wrong: none, the grep is re-run after deletion.
Task 2: minor (deferred): CompanionToy.tsx:9-10 over-long rewrapped comment line
Task 2: minor (deferred): ProjectRecording.test.tsx:76 negative guard weaker than the equality before it
Task 2: complete (commits 76226e5..e1fcea4, review clean)
Task 3: dispatched (BASE e1fcea4, implementer sonnet)
Task 3: implemented d924109 (latin subset held for ệ; font bytes deferred to Task 4 perf)
Task 3: minor (deferred): globals.css font comment re-wrap
Task 3: minor (deferred): mono font-medium resolves to Courier 400 (static face) — later phases avoid font-medium on mono
Ruling: Task 3's font-byte figure is recorded by Task 4's perf run (its "fonts" column), with the latin subset holding for ệ — cost if wrong: one tracker line added later.
Task 3: complete (commits e1fcea4..d924109, review clean)
Task 4: dispatched (BASE d924109)
Task 4: implemented 69a1275 (verify 5/5, eval unchanged, perf JS within 9 B, fonts 72,668 B; also fixed --ask-room after the font swap)
Task 4: open — companion.spec.ts:914 cat ink-to-ground contrast 1.82 over Contact at night (syncTone ignores .bg-surface lantern)
Ruling: Task 4's own review is folded into the Phase 1 final whole-branch review (Task 4 is close-out records plus one --ask-room fix) — cost if wrong: the fix wave picks up any Task 4 finding.
Ruling: the owner's new "day is a morning field" (spec 4ef8e4f) lands in the Phase 1 fix wave: day sky on body, quiet sections transparent in both themes — so Phase 1 ships both themes on the same model — cost if wrong: one more contrast re-tune.
Final review (Phase 1): 1 Critical (cats on night lantern paper 1.82:1 — syncTone ignores .bg-surface), 1 Important (sky stops outside the contrast gate), 5 Minor; agrees with all rulings.
Fix wave dispatched (FIX_BASE 69a1275): C1 data-paper key, I2 sky tokens + pairings, minors (contrast.mjs:78 dusk-label, docs/editing.md:175, globals.css:1899 comment, companion-space.ts:1084 hex, palette test whitespace), plus the owner's day morning sky.
Fix wave: implemented 69a1275..b03c21b; pnpm verify 5/5 under portable Node 26.12 (machine default switched to Node 20.20.2 by someone else); e2e 309 passed 0 failed incl. companion.spec.ts:914
Fix wave re-review: 4/4 addressed, no new breakage.
Phase 1: minor (deferred to Phase 3): flat header and cat --ground fills sit on the sky gradient (tint band under header)
Phase 1: minor (deferred): prefers-reduced-transparency doesn't drop the sky; day body no longer draws the blueprint grid (intended)
Phase 1: complete (5c0a383..b03c21b); pnpm verify 5/5 on Node 26.12
## Phase 2 (worktree .claude/worktrees/r21-remove-worlds, branch round-21/remove-worlds from 5888211)
Phase 2 eval baseline: 70.0 / 93.3 / 96.7 / 0.807
Task 5: dispatched (BASE 5888211, implementer sonnet)
Task 5: implemented 2a6ed44 (eval identical 70.0/93.3/96.7/0.807; added "move" alias on About origin; edited origin-stops.test.ts)
Ruling: the brief's test query "where is he from" is all stop words and returned nothing before this task too; the test uses "is he from vietnam" and "when did he move to the US" instead — an engine/stop-word change is out of scope (CLAUDE.md: never tighten the gate) — cost if wrong: the Phase 6 chip "Where are you from?" may get no answer; Phase 6 must pick chip wording the engine can answer, verified by a test.
Task 5: review — spec ✅, quality needs changes (2 false comments naming the globe's stop; dead loop + duplicate assertion); fix round 1 dispatched, FIX_BASE 2a6ed44
Ruling: Task 5's fix round (10-line comment/test deletion, 2a6ed44..62629f4) was re-reviewed by the controller reading the diff, not a subagent — every finding maps to a visible line; full suite 973/973 — cost if wrong: a stale comment survives to the final review.
Task 5: fix round 1/5 (3 addressed, 0 open; commits 2a6ed44..62629f4)
Task 5: complete (commits 5888211..62629f4, review clean)
Task 6: dispatched (BASE 62629f4)
Task 6: implemented debf80d (DONE_WITH_CONCERNS: explorer test in #tree flaky 3/6; #tree visible at load so "not in viewport" asserts changed to scrollY; legacy case-study fragment fails at HEAD too (likely dev-mode, passed on prod in P1); node_modules repaired)
Task 6: review — spec ✅, quality needs changes. Explorer flake root cause: scrolling to #tree+200 auto-plays the TreeBox show, which pins both cats (~24s). Fix = read the explorers in #tree [data-timeline]; no threshold change. Legacy case-study test: dev-mode artifact (passes on prod 37/37).
Task 6: minor (deferred, separate look): while the tree's show plays, the cats' tour spot clamps to the top-left corner when the section top is off screen (Companion.tsx:2639)
Task 6: fix round 1 dispatched (explorer retarget, false companion-tour comment, test wording), FIX_BASE debf80d
Ruling: Task 6's fix round (test retarget + two comment fixes, debf80d..14dcf9a) re-reviewed by the controller reading the diff; evidence: explorer tests 10/10 on prod, companion+legacy 105 passed, unit 974 — cost if wrong: caught by the Phase 2 final review.
Task 6: fix round 1/5 (3 addressed, 0 open; commits debf80d..14dcf9a)
Task 6: complete (commits 62629f4..14dcf9a, review clean)
Task 7: dispatched (BASE 14dcf9a)
Task 7: implemented 09f446d (51 files, -7916 lines; verify 5/5, 803 tests)
Task 7: review — deletions exactly match the brief (33 files); 3 Important text slips (CLAUDE.md duplicated tail, two 'four sections'); fix round 1 dispatched, FIX_BASE 09f446d
Task 7: fix round 1/5 (4 addressed, 0 open; commits 09f446d..bd00ad2; controller checked the diff and CLAUDE.md tail); eval printed 70.0/93.3/96.7/0.807
Task 7: complete (commits 14dcf9a..bd00ad2, review clean)
Task 8: dispatched (BASE bd00ad2)
Task 8: implemented fcd39f5 (verify 5/5; e2e 685 passed 0 failed on prod; JS at load 169,226 -> 166,832 B; JS total 223,546 -> 193,320 B)
Task 8: notes — 60 vs 44 pairings is the P1 fix wave's 16 sky pairings (expected); companion.spec.ts:914 passes because of the P1 data-paper fix (expected); DOM nodes +44 unexplained (deferred to Phase 3, flagged in tracker)
Final review (Phase 2): 0 Critical, 2 Important (the "move" alias makes the chat answer off-topic questions; CLAUDE.md claims a clothesline that doesn't exist yet), 7 Minor.
Ruling: reverse the Task 5 "move" alias ruling — it answers "how do I move a file" from About; the CLAUDE.md watchFor lesson wins over recall on one origin query — cost: "when did he move…" is refused again, as on main.
Phase 3 must keep: ABOUT_LEGACY_SECTION_IDS spans at the very top of #about (aria-hidden sr-only scroll-mt-20); the tour fork is meaningless until Record adds a second middle stop.
Fix wave dispatched (FIX_BASE fcd39f5).
Fix wave (Phase 2): fcd39f5..42e7c78, all findings addressed (controller read the 10-file diff); verify 5/5 (802), e2e companion/legacy/sections 231 passed 0 failed on prod, eval 70.0/93.3/96.7/0.807.
Phase 2: complete.
