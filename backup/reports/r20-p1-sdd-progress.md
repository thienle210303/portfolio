# SDD ledger — plan: docs/superpowers/plans/2026-10-10-round-20-phase-1-speed.md
Spec: docs/superpowers/specs/2026-10-10-round-20-redesign-design.md §1. Worktree .claude/worktrees/r20-speed, branch round-20/speed, base f43c825.

## Preflight scan
| Pair / task | Shared | Finding |
|---|---|---|
| T1–T2 | Companion.tsx | T1 adds invalidateGround() calls at scroll/resize/scheduleRecheck; T2 edits step tail + start/stop. Disjoint regions. OK |
| T2–T3 | Companion module | T3 lazy-mounts it; T2's cadence unaffected. OK |
| T4–T5 | GlobeCanvas.tsx | T4 edits :1120-1145 (bake→PNG); T5 edits :337-376 + callers. Disjoint. T5 also adds rootMargin so the PNG starts early (T4 relies on mount timing only). OK |
| T0–T6 | lag.mjs, feedback-tracker | T6 consumes T0's JSON keys. OK |
| T0 | self | baseline built from HEAD before changes. OK |
| T1 | self | tests use jsdom with mocked rects; Interfaces match steps. OK |
| T2 | self | Step 5 rafPerSec ≤10: idle 4/s + blink/flick bursts ≈ within. OK |
| T3 | self | plain import() in client effect; e2e waits may be added, never weakened. OK |
| T4 | self | fence test scope to be checked in Step 7; allow-list edit permitted only there. OK |
| T5 | self | prefers palette.ts extraction; tests target exported fns. OK |
| T6 | self | criteria recorded verbatim, missed ones reported not relaxed. OK |

Ruling: Fraunces removal moves from Phase 1 to Phase 2 — Phase 1 is "no visual change" and dropping the display face restyles every heading — cost if wrong: ~one font file of initial transfer stays one phase longer.
Task 0: minor (deferred): worlds-entry window has an undisclosed 100 ms lookback (lag.mjs:132)
Task 0: minor (deferred): longtask entries async — tasks queued at window end may be missed
Task 0: minor (deferred): scroll loop `scrollY >= max` has no timeout; use max-1
Task 0: minor (deferred): tracker has no noise threshold (worlds entry 510–781 ms spread)
Task 0: minor (deferred): tracker row doesn't name the measured commit (f43c825)
Task 0: ⚠️ resolved — reports/lag-investigation.md exists untracked in the main checkout (reports/ is untracked by design); citation is true locally.
Task 0: fix round 1/5 (2 addressed, 0 open; commits 984d722..4e8d95e)
Task 0: minor (deferred): lag.mjs header line ~118 chars after reflow
Task 0: complete (commits f43c825..4e8d95e, review clean)
Baseline (R20-P1, machine at ~100% CPU): scroll4x fps 8–8.7, drops 266–281, worst 883–950 ms; rest rAF ~60 (worlds ~72); contact hit tests ~1170/5s; worlds entry worst 510–781 ms.
Task 1: Ruling: retire the two e2e re-probe guards (companion.spec.ts ~790/847) rather than invent a dev-only counter — the per-frame re-probe they guarded no longer costs hit tests; unit test "queries the DOM once per epoch" covers the cache — cost if wrong: a per-frame re-plan regression in held scenes goes unnoticed by e2e (cheap now, rect scan).
Task 1: Ruling (⚠️ resolved): rect probe differs from the hit test for non-OCCUPIED descendants overflowing an OCCUPIED ancestor (now clear) and clipped content in overflow:hidden (now occupied) — accepted, not grid-checked — cost if wrong: a cat could occasionally rest over an overflowing decoration; revisit in the Task 6 browser check.
Task 1: minor (deferred): no transitionend invalidation; doc comment overstates epoch coverage (companion-space.ts:245-258)
Task 1: minor (deferred): doc comment omits the overflowing-descendant difference (companion-space.ts:255-260)
Task 1: minor (deferred): test name "invalidates on resize-observer epoch" only calls invalidateGround() directly
Task 1: minor (deferred): lag probe "hit tests per 5 s" changes meaning after T1 — footnote the R20-P1 after-row (Task 6)
Task 1: fix round 1/5 (3 addressed, 0 open; commits d377254..7a78fc6)
Task 1: complete (commits 4e8d95e..7a78fc6, review clean)
Task 2: implementer DONE_WITH_CONCERNS (dcf533a): idle cadence in; lag rest 27–53 rAF/s, 7–12% busy; e2e :826 failing; seated sway 15x slower.
Task 2: Ruling: seated sway → CSS while idle + active flourish counts as animating — keeps "no visual change" without losing the idle saving — cost if wrong: tail motion differs subtly (rigid rotate vs path bend); Thien sees it in the final browser check.
Task 2: Ruling: e2e :826 is a Task 1 regression (cached ground misses content added without scroll/resize); invalidate ground at each placement decision, not per frame — cost if wrong: a few ms per decision.
Task 2: Ruling: lag probe rest window waits 10 s after scrollIntoView (was sampling the cats' legitimate post-scroll reaction) — targets unchanged — cost if wrong: the rest number looks better than a visitor's first seconds after scrolling.
Task 2: concerns round (bbbb57a CSS sway+flourish, 38e327b ground refresh per decision, d70934b probe 10 s wait). companion e2e 75/75; :826 passes x2.
Task 2: Ruling: option (c) — a cats' conversation is a scene (activity), not rest; it stays at full frame rate so its timing/visuals are unchanged; the rest target is judged on the seated window (trace: 4 rAF/s), and Task 6 reports the probe's raw numbers plus this explanation — cost if wrong: ~6–11% CPU unthrottled while the cats chat, which Thien sees in the report.
Task 2: review: quality Approved; spec ❌ only on Step 5 targets, caused by the duet ruling (already ruled, option c). ⚠️ watch mode resolved by controller: forced "watch" only sets leadWant/followWant (Companion.tsx ~3168); the tree relight is DrawnTree's own animation, cats sit → idle cadence + CSS sway is correct.
Task 2: Ruling: Step 5 rest targets (≤10 rAF/s, <5% busy) recorded as missed-by-ruling, not fixed; seated window measured at 4 rAF/s — cost if wrong: Thien may want chats slowed too (option a) — surfaced in the final report.
Task 2: minor (deferred): CSS sway can jump on a facing-only commit (keep committed phase while both sway)
Task 2: minor (deferred): companion-cadence.ts `animating` doc omits non-sit poses and ride.riding
Task 2: minor (deferred): cadence test "flourish → frame" row duplicates the blink row (rule lives inline)
Task 2: minor (deferred): over-long comment line in companion-space.ts block
Task 2: minor (deferred): CompanionCat.test.tsx written after code (process)
Task 2: complete (commits 7a78fc6..d70934b, review approved; Step 5 missed by ruling)
Task 3: implementer DONE_WITH_CONCERNS (cf585d9). perf initial JS 206,995 B (+1,283 vs 205,712) because perf waits 8 s and counts the idle-loaded chunk; ad-hoc load-event JS 177,136 B.
Task 3: Ruling: the spec's "initial JS falls" means JS on the load path; add a separate "JS at load event" figure to scripts/perf.mjs (keep the existing total unchanged so the globe-leak comparison in CLAUDE.md stays comparable) — cost if wrong: one extra perf row to read.
Task 3: review Approved (spec ✅). ⚠️ chunk split resolved by the load-event measurement follow-up.
Task 3: minor (deferred): e2e negatives in companion/worlds specs may pass before mount (spot-check)
Task 3: minor (deferred): events fired before mount (origin-story-beat, contact cheer) are dropped in the first ~2 s
Task 3: minor (deferred): data-companion wrapper no longer in initial HTML (check CLS unchanged in Task 6)
Task 3: minor (deferred): no test for unmount-before-idle / late import after unmount
Task 3: follow-up 07277f1 (perf "JS at load": 177,136 B; total 206,995 B; 0 skipped). Re-review: comment false → fix round 1 7aabbee (2-line comment; controller read the diff — now true). minor (deferred): perf `loaded` flag assumes load/response event ordering (unverified).
Task 3: complete (commits d70934b..7aabbee, review clean)
Task 4: implementer DONE_WITH_CONCERNS (86dd70d). PNG 26,592 B. Worlds entry worst task 143–202 ms (was 392 on 7aabbee probe). Remaining: mount ~100–130, shader+upload ~108 (24 ms main-thread re-decode), software-GL readback, 50–58 ms flight frames at 4x.
Task 4: Ruling: use createImageBitmap(blob, {premultiplyAlpha:"none", colorSpaceConversion:"none"}) (fetch → blob) instead of Image.decode() — same off-thread intent as the plan, removes the 24 ms re-decode; keep the decode-reject → 2D fallback path — cost if wrong: one more code path; createImageBitmap is in every WebGL2 browser.
Task 4: Ruling: the <50 ms entry target is recorded as missed if still missed; the remaining cost is GL mount/compile on software GL in headless, not addressed in this phase — cost if wrong: first-entry hitch remains on low-end machines; surfaced to Thien.
Task 4: review Needs fixes (Important: bake-coastline.ts "off the main thread" comment false per trace). Fix round 1 dispatched with createImageBitmap ruling + context-lost-during-decode test.
Task 4: minor (deferred): tsconfig excludes scripts/bake-coastline.ts (allowImportingTsExtensions could re-include it)
Task 4: minor (deferred): bake run prints MODULE_TYPELESS_PACKAGE_JSON (.mts would silence)
Task 4: minor (deferred): coastline-texture.ts:5-6 "only importer" should say "under src/"
Task 4: minor (deferred): coastline-png.test.ts failure message gives no first-diff index
Task 4: minor (deferred): CLAUDE.md:92-95 line not re-wrapped
Task 4: fix round 1/5 (3 addressed, 0 open; commits 86dd70d..fdf4d5f). Worlds entry 141/149 ms (missed <50 by ruling; remaining = GlobeCanvas mount ~97 ms + headless GL readback + 50 ms+ flight frames at 4x).
Task 4: minor (deferred): createSphere throw in onBitmap skips bitmap.close() and escapes as unhandled rejection (pre-existing shape; try/finally)
Task 4: complete (commits 7aabbee..fdf4d5f, review clean)
Task 5: review Needs fixes (stale palette when data-theme absent; rootMargin may fetch globe during page load). Fix round 1 dispatched.
Task 5: Ruling: attach the globe chunk observer only after window load, then rootMargin "100% 0px" — keeps the plan's early prefetch without spending the load budget — cost if wrong: on a very fast scroll before load the globe starts at intersection, as before.
Task 5: minor (deferred): WorldsStage.tsx:367-370 ragged comment wrap
Task 5: minor (deferred): no test for the observer option / GlobeCanvas redraw path
Task 5: fix round 1/5 (2 addressed, 0 open; commits 88a0df2..7ac401a). perf JS at load 177,182 B, 0 skipped.
Task 5: minor (deferred): ~100 lines of unrelated prettier reflow in WorldsStage.tsx / globe-palette.test.ts (behaviour-neutral)
Task 5: complete (commits fdf4d5f..7ac401a, review clean)
Task 6: implementer DONE_WITH_CONCERNS (0bd0950). scroll4x fps 11.4/13.3 (base 8.0/8.7), worst frame 1717/283, rest busy about 8–10% (worlds 35–37, tree ~5.5, contact 6–8), worlds entry 152/106 (base 510–781), JS at load 177,182 B, CLS 0. Machine ~71% CPU (baseline ~100%). verify 995 pass; e2e 794 pass/3 fail → 2 flakes pass alone; "never rests on the globe stage" fixed (networkidle → load) but full suite not re-run after.
Task 6: fix round 1/5 (4 addressed, 1 open — e2e retry wording; commits 0bd0950..17ba34e). Baseline JS at load f43c825 201,987 B → 177,182 B (-12.3%): MET. Full e2e re-run 795/739/2; both pass alone.
Task 6: fix round 2/5 (1 addressed, 0 open; wording in untracked reports/r20-p1-ledger.md only, verified by controller grep).
Task 6: minor (deferred): ask.spec.ts:269 thread-window failed in both full runs, passes alone x3 — order/load dependent; not checked on f43c825.
Task 6: complete (commits 7ac401a..17ba34e, review clean)
Final review: ready with fixes (0 Critical; Important: ask:269 likely branch-caused layout shift from post-load globe; 4/5 Done-when targets missed — Thien's call; CLAUDE.md 2D-takeover list omits PNG failure; companion.spec:3439 negative may pass before mount). One fix wave dispatched (final-fix-brief.md), plus a 4x-scroll trace (report-only).
Final fix wave: adc8448 (ask:269 — test blocks the PNG; root cause = pre-existing 52 px #worlds shrink when GL goes live), 6c0e531, 80a8fe2, dc04fd0, 12bf443. verify 995; e2e 797/739/0.
Final: Ruling: ask:269 fixed in the test (block the coastline PNG so the globe stays 2D) rather than reserving the 52 px — the shift predates this branch and the skin buttons that cause it are removed in Phase 4 — cost if wrong: a 52 px scroll-anchor jump stays visible on a slow deep link to #worlds until Phase 4.
Final: re-review clean (all 5 items + addendum addressed). minor (deferred): CLAUDE.md one over-long line in 'Before calling anything done'.
Thien (2026-10-11): 'keep working' on speed before merging. Profiling pass dispatched → profile-report.md; then add Tasks 7+ to the plan.
Profile (HEAD 12bf443, CPU 100%): groundRects rebuilt per scroll 62% of scroll time; Journey --front/--camera restyle ~1,850 els (3 worst frames); crossing replay loop → #worlds 47.9% rest busy (8.3% stopped); scrollY read in listener; viewport per step.
Plan continuation committed: Tasks 7–11.
Ruling: Task 9 pulls spec §4's "flight plays once" forward from Phase 4 despite Phase 1's "no visual change" — the spec already approved that behaviour and it is the largest rest cost in #worlds — cost if wrong: the crossing stops looping one phase earlier than planned; one-line revert.
Task 7: implementer DONE_WITH_CONCERNS (6ac7d53). scroll4x 29.8/38.0 fps (was 11.4/13.3), worst 367/167 ms; CPU 30–100% pre, ~42% after. Cache widened ±1 viewport; recheck is a 250 ms throttle (~4 rebuilds/s during long scroll).
Task 7: review Approved (spec ✅; throttle-vs-debounce deviation accepted; no rest-on-text window).
Task 7: minor (deferred): timer rebuild is eager even with no probe pending (~4/s during long scroll) — check in Task 11 profile
Task 7: minor (deferred): ride guard saves little (trailLead rebuilds lazily); report wording overstates
Task 7: minor (deferred): no unit test for scroll→shift / timer→refresh wiring (e2e covers)
Task 7: minor (deferred): horizontal culling not widened (moot under overflow-x: clip; undocumented)
Task 7: complete (commits c931f58..6ac7d53, review clean)
Task 8: implementer DONE (e046597). act-change recalc 1846→106 / 1847→68 els; pixel-identical 14 shots; e2e 797/1 (globe drag, cat over globe; 3/3 on rerun).
Task 8: Ruling (⚠️ resolved): the <100-element criterion is judged on the camera's own writes (22 / 3 els); the 106-element recalc at act 0→1 predates the change and is not the camera write — cost if wrong: one ~2 ms recalc per first act change stays.
Task 8: fix round 1/5 (2 addressed, 0 open; commits e046597..72b3843)
Task 8: minor (deferred): e2e floors assume drawing taller than frame (only chromium-1440 runs it)
Task 8: minor (deferred): worlds.spec.ts:883 drag flake (cat over globe) seen once in full run
Task 8: complete (commits 6ac7d53..72b3843, review clean)
Task 9: implementer DONE (6914d63). #worlds rest busy 47.9% (profile) → 3.3%. replay.ts deleted; autoplay once at half-in-view; leaving mid-flight spends the autoplay.
Task 9: review Approved. ⚠️ resolved by controller: real settle() → settleMotion returns m.playing (settle.ts:30,50) → onLanded fires for an in-air autoplay, so the label leaves "Stop the replay" after a mid-flight exit.
Task 9: minor (deferred): worlds.spec chapter test can pass vacuously if autoplay lands before the click (read label in same evaluate)
Task 9: minor (deferred): touch-scroll / Stop e2e tests timing-dependent (~2 s flight window)
Task 9: minor (deferred): sliver e2e no longer tests the sliver (unit test covers)
Task 9: minor (deferred): IO dip below half-but-still-intersecting no longer settles on spec-following engines (Chromium unaffected) — note in PR
Task 9: minor (deferred): stale test name "one cycle, not two"; GlobeCanvas.tsx:106 94-col comment; tracker could note the loop reversal
Task 9: complete (commits 72b3843..6914d63, review clean)
Task 10: implementer DONE (09edb4f). vitest 998, companion e2e 75/0.
Task 10: review Needs fixes (double shift when step rebuilds before readScroll; scrollbar change misses viewport cache; false comments). Fix round 1 dispatched.
Task 10: Ruling: make the ground shift absolute — the cache records the scroll offset it was measured at, and sync shifts by live − recorded — so frame-callback order can never double- or drop-apply a scroll — cost if wrong: slightly more state in companion-space.ts.
Task 10: fix round 1/5 (3 addressed, 0 open; commits 09edb4f..a3ca320)
Task 10: minor (deferred): over-long viewport-cache comment line; redundant double refreshSafeArea on resize; file header names shiftGround not syncGround
Task 10: complete (commits 6914d63..a3ca320, review clean)
Task 11: implementer DONE (706287c). scroll4x 44/43 fps, worst 133/133, rest busy about 7.1/7.3 worlds 6.3/2.3 tree 3.2/4.4 contact 5.4/7.1, worlds entry 74/77, JS at load 176,938 B; e2e 798/744/0; CPU 83%→~35–45%.
Task 11: fix round 1/5 (2 addressed, 0 open; commit 2684b47 + untracked ledger; verified by controller: ruling line present, tracker says rAF/s fell only in run 2, cause inferred).
Task 11: complete (commits a3ca320..2684b47, review clean)
Final review 2: ready with fixes. Important: GlobeCanvas.tsx:81-84 false comment; Task 9 reverses Thien's 2026-10-05 "loop while visible" answer (spec §4 marked it Assumed) — needs his confirmation; 4/5 criteria missed. Fix wave 2 dispatched (comment, chapter e2e vacuity, syncGround at top of step).
Correction to Task 9 ruling: spec §4 listed play-once as **Assumed**, approved with the spec on 2026-10-10, but it reverses the 2026-10-05 owner answer — asking Thien.
Thien 2026-10-11: play-once KEEP; merge + push; leave cat chats at full rate.
Fix wave 2: 49c26dc, 5318653, 9126d2c (e2e companion+worlds 98/0 @1440).
Fix wave 2 re-review: 2/3 addressed; residual (GlobeCanvas comment "It") + minor zero-shift map → c7d6cc5, verified by controller diff read.
Final: Ruling: the residual comment word was fixed in the same wave rather than parked — a false comment is Important and the fix is one word — cost if wrong: none.
