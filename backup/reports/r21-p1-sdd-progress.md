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
