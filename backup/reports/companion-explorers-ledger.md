# SDD ledger — plan: docs/superpowers/plans/2026-10-02-companion-explorers.md

Spec: docs/superpowers/specs/2026-10-02-companion-explorers-design.md (owner-approved 2026-10-02)
Worktree: D:\Project\portfolio\.claude\worktrees\companion-explorers, branch companion-explorers, base ac35d1a.
Owner chose execution: "either Native or Subagent (your recommended)" → subagent-driven (Companion.tsx is
4.8k lines with a priority cascade that has bitten past rounds; per-task review is worth the cost).
Baseline: companion-dialogue tests 24/24 at ac35d1a.

## Pre-flight conflict scan
| Pair / task | Shared | Producer → consumer | Finding |
|---|---|---|---|
| T1 ↔ T2 | companion-dialogue.ts types | T1 CatIcon/CatAct/CAT_ICONS/DialogueBeat.icon,act → T2 | consistent names (component is CatGlyph in CatIcon.tsx) |
| T3 ↔ T4 | planExplore, Companion.tsx wanderTo | T3 planExplore(section,lead,follow,home,firstInSection,rng?) → T4 | T3 step 4 repoints wanderTo minimally to keep build green; T4 owns the real wiring. OK |
| T2 ↔ T4 | Companion.tsx | sequential edits, different regions (bubble/pose vs cascade/modes) | OK |
| T4 ↔ T5 | e2e, perf | T5 measures T4's result | OK |
| T1 self | 28 beats copy table vs tests | verified by script: all subs ≤32 with real facts; acts 17/28 = 61% within 30-70%; icons 28/28 | OK |
| T2 self | "acts never keep rAF alive past the beat" vs e2e :1230 zero-frames | consistent | OK |
| T4 self | SLEEP_AFTER 14000 → EXPLORE_IDLE_MS 20000 | e2e waits keyed to the old 14 s will need lengthening — expected, in-task | noted for T4 dispatch |
| T5 self | perf base = plan base ac35d1a | OK |
Scan clean apart from the T4 note.
Task 1: dispatched (SONNET) BASE ac35d1a — copy fully specified in brief.
Task 1: implemented (commit 714d3f9, DONE_WITH_CONCERNS; dialogue 28/28, suite 635/635, typecheck+lint clean). Raised BEAT_MS_PER_CHAR 55→90 so beatDurationMs spans the new 32-char budget (old clamp test broke). Review dispatched (SONNET).
Task 1: review (SONNET) — spec ✅ (all 29 beats verbatim incl. fallback), BEAT_MS_PER_CHAR 90 judged correct and
  comments true; 1 Important: the 32-char test can't fail on length (sceneFor/storyBeatScene null over-long scenes,
  `if (scene)` skips them). Minors folded: dedupe allBeats, explicit non-empty guard, fallback coverage, pin the
  32 boundary. Minor deferred: Companion.tsx:1033-1035 comment about two-line subtitle wrap likely stale (Task 2's
  file); flight sub silently drops if origin.arrived ever exceeds 19 chars; `moth` icon unused.
Task 1: fix round 1 dispatched — resumed the implementer.
Task 1: fix round 1/5 (1 Important + 4 Minors addressed, 0 open; commits 714d3f9..569d490).
Task 1: complete (commits ac35d1a..569d490, review clean, 1 fix round)
Task 2: dispatched (OPUS) BASE 569d490 — Companion.tsx pose/bubble integration + new CSS + e2e; carries the
  deferred Companion.tsx:1033-1035 stale two-line-wrap comment.
Task 2: implemented (commit 1f0f10d, DONE_WITH_CONCERNS minor; unit 658/658, verify clean, companion e2e 63
  passed / 0 failed at --workers=2 on a production build, new e2e red-then-green). Deviations: hop keyframe
  0→-6px 180ms×4 alternate (brief's literal keyframes contradicted its own "360 ms, twice"); act computed per
  frame via liveAct() rather than stored; bubble+caption keep-out lifted 6px for a hop beat (CAT_HOP_RISE pinned
  to the keyframe by a test); rain-huddle/storm-dash yield untested; stale wrap comment fixed with measurement.
Ruling 1: the hop deviation stands — the spec's "360 ms, twice" is the binding intent and the brief's literal
  keyframes contradicted it. Cost if wrong: one CSS timing line.
Task 2: review dispatched (OPUS).
Task 2: review (OPUS) — spec ✅, both deviations accepted (keyframe + derived act); act yields verified path by
  path incl. untested rain huddle / storm dash; hop lift sound (only widens keep-out); tests non-vacuous; CatGlyph
  clean; est. +1–1.5 KB gz initial JS (half the 3 KB budget — Task 5 must report per-task deltas). Important: 2
  false comments (companion-dialogue.ts:403 "wrapper bounces"; Companion.tsx:1085 paintBeside anchor size).
Task 2: minor (deferred): bubble stays lifted for the whole hop beat, can jump 6px mid-beat if the speaker
  walks first then stands; back-to-back hop beats by one cat would bounce once (none authored); icon e2e has a
  short flake window if the hello's last beat ends between toHaveCount checks.
Task 2: fix round 1 dispatched — resumed implementer (2 Important + Companion.tsx:4211 stale "no tabby-only hop").
Task 2: fix round 1/5 (2 Important + 1 Minor addressed, 0 open; commits 1f0f10d..e9f60da). Minor (deferred): the
  storm-hop comment lists the startle dash but not the rain huddle (HUDDLE_MS 1800) that also gates via
  `choreographed` — true but incomplete.
Task 2: complete (commits 569d490..e9f60da, review clean, 1 fix round)
Task 3: dispatched (SONNET) BASE e9f60da — pure spot picker + planExplore; told to keep wander-mode behaviour
  working until Task 4 rewires the cascade.
Task 3: implemented (commit 1f9a3d3, DONE_WITH_CONCERNS; suite 667/667, 7 new pickExploreSpot tests red-then-green). Removed WANDER_*/wanderCandidates/settleAt; kept randomViewportPoint unreferenced; interim wander loses the mood-perch roll and WANDER_MIN until Task 4. Review dispatched (SONNET).
Task 3: review (SONNET) — spec ✅, quality Approved, 0 Important. Minors: (1) single-null fallback via findClearSpot
  does not keep 160px/column between the pair (brief-faithful); (2) cross-half fallback can put both in one half;
  (3) EDGE export unused — revert; (4) pickExploreSpot doc says "bounds() clamps" but re-derives — reword or share a
  pure boundsFor; (5) randomViewportPoint now unreferenced — CLAUDE.md's keep-rule covers content arrays only.
Ruling 2: fold Minors 1, 3, 4, 5 into Task 4's dispatch (Task 4 owns the explorer wiring and already edits these
  call paths): compute the fallback cat first and pick its partner against it; revert the EDGE export; reword
  the bounds doc; delete randomViewportPoint and its tests. Minor 2 stays (brief-mandated). Cost if wrong: Task 4
  carries ~20 extra lines.
Task 3: complete (commits e9f60da..1f9a3d3, review clean)
Task 4: dispatched (OPUS) BASE 1f9a3d3 with Ruling 2's riders.
Task 4: implemented (commit e79031f, DONE_WITH_CONCERNS; verify clean 674/674; companion+axe+sections e2e 133/0/0
  on production build --workers=2; 3 new e2e red on base then green; repeat-each=3 21/21; no kept wait changed).
  Concerns: idle cats go to the corner BED (bed check outranks explore/idle) — spec said nap where they stop;
  POINTER CHASE STILL OUTRANKS EXPLORING (spec kept the cascade) — "both halves" e2e keeps the pointer still and
  wheels; explorers use reader scene clock (90–270s), deleted e2e "plays with the page while it wanders"; edited
  companion-play.ts + scene-names.ts; crossing walks more frequent.
Task 4: review dispatched (OPUS) — asked to grade the two intent questions (bed vs nap-in-place; chase vs explore)
  against the owner's "go all around the page".
Task 4: review (OPUS) — spec ❌ on two INTENT points the spec itself caused, Critical: ungated pointer chase (any
  1px move → pair trails the cursor 2.4s, plan dropped in rouse()) defeats "go all around the page" for any
  reader with a hand on the mouse; Important: 4 false comments naming removed restingPlaces/wanderTo
  (companion-space.ts:830, :283-284; companion-motion.ts:233; tests/lib/companion-space.test.ts:120); idle →
  corner bed deviates from spec §1; "both halves" e2e parks the pointer and so hides the chase problem.
  Verified good: riders (a)-(d), mode migration, activity clock, new e2e non-vacuous, deletion clean.
Ruling 3: gate the pointer chase on proximity — chase only when the pointer is within CHASE_RADIUS = 200px of the
  lead; drop the explore plan only when a chase actually starts (not in rouse()); same gate on the scene-ending
  !parked check; restore the brief's e2e (pointer moving in small steps AWAY from both cats, while scrolling).
  Spec amended (commit above). Why: the owner's intent is binding over my spec's cascade line. Cost if wrong: one
  constant and one condition; cats chase less eagerly.
Ruling 4: idle cats NAP IN PLACE while roaming (no corner bed); the bed stays for "Send the cats to bed"; any input
  wakes them (no BED_WAKE_TRAVEL minimum while napping in place). Bed tests :1266/:1406 rewritten to the new rule,
  the zero-frames test kept. Spec amended. Why: approved design said "walk to a free spot and curl up asleep",
  and the owner asked for cats around the page, not in a corner. Cost if wrong: restore the bed branch.
Task 4: fix round 1 dispatched — resumed the implementer with Rulings 3-4 + 4 false comments + Minors (Tab-only
  keyboard e2e, exploring doc at night, perch follow-spot needless re-probe drop).
Task 4: fix round 1 implemented (commit a2f00a6; verify 674/674; companion+axe+sections 135/0/0; new/rewritten repeat-each=3 27/27; red on 1b932e7 shown). Idle bed (IdleFurniture, kick/shove, BED_WAKE_TRAVEL) removed entirely; proximity gate folded into the 'nobody steering' flag (far pointer no longer suppresses dialogue/scenes); toolkit-obscure test setup changed (assertions kept). Re-review dispatched (OPUS).
Task 4: fix round 1/5 (Critical chase gate, Ruling 4 nap-in-place, 4 false comments, 3 Minors — all ADDRESSED; all 4
  disclosures sound; 1 Important NEW: 4 comments at Companion.tsx:124, :1476, :2177, :2619-2622 still describe
  "any pointer move"; commits e79031f..a2f00a6).
Task 4: minor (deferred): [data-cat-bed] toHaveCount(0) checks are tripwires only (attribute gone from src);
  near-pointer chase e2e can't distinguish a chase from a coincidental explore walk; `not.toContain("sleep")`
  checks could trip on the story `quiet` beat's sleep act if a story ran mid-test.
Task 4: fix round 2 dispatched — comment-only (+ stale requestPlay doc :4140, optional bothInCorner constants).
Task 4: fix round 2/5 (4 of 5 comments addressed; 1 open — requestPlay's new 'only' list omits forced secret/watch/tour, resize, a second request; commits a2f00a6..cbf836c). Fix round 3 dispatched.
Task 4: fix round 3/5 (enumeration items all real; 1 open — omits the queued request's walk expiring
  (Companion.tsx:2696-2698, STAGE_WALK_MAX) and the arrival re-probe declining (:2706), neither through endPlay;
  commits cbf836c..0a09274). Reviewer also found an adjacent CODE bug: on those two routes askedRef is never
  cleared, so the next idle-timer scene is treated as asked and held through the pointer.
Ruling 5: round 4 (fresh OPUS implementer, per the skill's round-4 escalation) fixes BOTH — soften the comments
  to non-exhaustive wording and clear askedRef on the expiry/decline routes, with a failing test first. The bug
  is in code this task's comments describe and costs a line; leaving it would ship a stale-flag defect the
  comment now points straight at. Cost if wrong: one extra reset line.
Task 4: fix round 4 implemented by a fresh OPUS agent (commit c32ade6; comments name the two non-endPlay routes; askedRef cleared on both; 2 new e2e red 6/6 on 0a09274, green 15/15 repeat-each=5; verify 674/674; companion e2e 68/0/0). First use of page.clock in the suite. Re-review dispatched (SONNET).
Task 4: fix round 4/5 (both addressed, 0 open; commits 0a09274..c32ade6).
Task 4: complete (commits 1f9a3d3..c32ade6, review clean, 4 fix rounds; spec amended at 1b932e7 per Rulings 3-4)
Task 5: dispatched (OPUS) BASE c32ade6 — perf vs plan base ac35d1a (per-task deltas wanted: Task 2 est. +1-1.5 KB),
  browser check both themes + touch, full e2e at --workers=2, docs/feedback-tracker row.
Task 5: implemented (commit 0fe6bf1, docs only). perf +0.4 KB gz vs ac35d1a (icons +1.1, explorers −0.7), 0 skipped in 9 runs; e2e 548/6/538 — all 6 = worlds.spec.ts:7, fails identically on base ac35d1a (route pattern matches dev chunk names only); browser check both themes + touch done. Review dispatched (SONNET).
Task 5: review (SONNET) — spec ✅, Approved. Minors (deferred → final review): feedback-tracker "16 responses
  declared none" + Fonts/CLS cells unverifiable (raw perf output deleted); "slept where they had stopped"
  over-claims (no pre-nap position captured); "nap after 20 s" omits night's ~17 s; dangling fragment; worlds.spec.ts:7
  needs its own fix (dev-only route pattern) and its comment is stale.
Task 5: complete (commits c32ade6..0fe6bf1, review clean)

## Final whole-branch review
Final review dispatched (OPUS) over ac35d1a..0fe6bf1 (12 commits, 399 KB) with ledger triage + a11y of icons/hop/overlap, night-nap timing, worlds.spec.ts:7, 0-rAF in every mode.
Final review returned (OPUS): ready to merge WITH FIXES, 0 Critical. Important: (1) explorer stops rest the cat's
  head on content — isClearSpot never probes the top ~25px; measured 4/30 stops over a link, the hero p, a button
  (pre-existing probe, made much worse by default uniform exploring); (2) 6 false comments (e2e :373-375,
  :1529-1530; companion-moods.ts:51-52; companion-play.ts:42, :50-52; companion-state.ts:26); (3) 3 wording fixes
  in the feedback-tracker row. Night nap timing NOT a bug (walk remainder + polling swamp a 3 s delta).
  worlds.spec.ts:7 → separate task. FOR THIN: lockstep pair departures; "None of them fake"/"Real." claims;
  "Big nap year." and "I guard the facts. Mostly." joke against the person/facts on a recruiter page.
Final fix wave dispatched (OPUS, ONE implementer) with final-fix-wave.md. FIX_BASE 0fe6bf1.
Final fix wave implemented (commits 18b411e 7c3a1ab; verify 682; head-band e2e red on 0fe6bf1, explorer+nap 6/6 repeat-each=3 on HEAD; companion e2e 67/1 — toggle-clearance-while-riding fails 2/8 on base too, 8/8 alone on HEAD; perf +91 B). Went beyond brief: onPageMoved re-probe uses the head-band probe for explore stops (sticky rail slides over a resting cat's head). Pair-same-column assertion flakes on base and HEAD (samples walking cats) — left. Scoped re-review dispatched (OPUS).
Final fix wave re-review (OPUS): items 1-3 ADDRESSED (head band points/rule correct, bounded cost, comments true,
  dead bed checks truly dead, tracker wording right). Residuals:
Final: parked (Important) — onPageMoved re-check (Companion.tsx:3763-3765) applies the head band to fallback and
  nearbySpots stops that were picked WITHOUT it: three comments false (Companion.tsx:3754-3756,
  companion-moods.ts:339-340, companion-space.ts:607-608) and per-scroll re-plan churn returns in content-dense
  windows. Minimal fix: record headWasClear per spot at plan time; re-check isClearSpot(p) && (!headWasClear ||
  headClear(p)).
Final: parked (Important) — two e2e flakes INTRODUCED by this branch, not pre-existing on main: "pair stood in one
  60px column" (:1071) samples walking cats → use catPair(page,{still:true}) and a both-still count floor;
  "toggle clear while riding" (:1904) jumps before the pair settles (explorers leave the corner at once) → poll
  for still + gap ≥ 24 before the jump.
Final: minor (parked) — nap test head assertion overclaims for fallback/settled naps; companion-play.ts:50-53
  "active or idle" omits !napping and pointer!==null; standingRead floor counts samples not stops.
Ruling 6: per the skill there is no second fix wave, so these go to Thien with the finishing options rather than
  into an unreviewed commit; my recommendation is one small follow-up wave (all four fixes are specified to the
  line) before merging, because merging would put two red-flaky tests and a churn regression on main. Cost if
  wrong: a ~1h extra round.
Ruling 6 resolved by Thien: 'Fix first, then merge + push'. Follow-up wave dispatched (OPUS) with follow-up-wave.md, base 7c3a1ab.
Follow-up wave implemented (e621fb6 95f93c4; verify 687; explorer/nap/toggle 8/8 repeat-each=8 ×2; full companion e2e last run 68/0). Concerns: head-band hit under load on a head-clear stop with no drop (dynamic content e.g. globe 'Roll the planet…'/'07 Technology' arriving under a held cat without a scroll); 'stays visible over the section' times out on HEAD and 7c3a1ab; 375px axe toolkit-open target-size failed once under load. Scoped re-review dispatched (OPUS).
Follow-up wave re-review (OPUS): items 1, 2, 4 ADDRESSED. BLOCKS MERGE: (a) item 3's pre-jump settle poll empties
  the toggle-riding test (uniform ride + top clamp keeps gap ≥24 without the correction) — fix: no pre-jump poll;
  sample in rAF inside RIDE_SETTLE_MS (220 ms) after the jump, ≥3 samples, log index; (b) "stays visible over the
  section it is crossing" — branch-caused: CHASE_RADIUS means a circling cursor no longer draws the cats; comment
  :910 false; fix: steer the pointer to 120-150 px from the lead toward the target, then circle; test.setTimeout(90s).
  CAN FOLLOW: resting cat never re-probed on layout shift without scroll (ResizeObserver re-check; Companion.tsx:3752
  comment overclaims, pre-existing); unit mock at companion-scenes.test.ts:517 covers both cats' feet.
Ruling 7: the two blockers are test-only and within Thien's "fix first, then merge + push"; resume the follow-up
  implementer for them plus the trivial mock tightening and the :3752 overclaiming comment. The ResizeObserver
  re-probe stays a follow-up item for Thien (product behaviour change, pre-existing, ≤ one 4-9 s stay). Cost if
  wrong: one more short round.
Follow-up round 2 (cb88167): blockers A and B fixed with mutation proof (A: correction deleted → 4/8 fail; B: 5/8 → 8/8 in 6-10 s), small items done, verify 687, companion e2e 68/0 final. Residual: 375px axe toolkit-open target-size flake 2/7 full runs (tabby walking over 'Send the cats to bed'). Re-review dispatched (OPUS) incl. whether the axe flake is branch-caused and real.
Round 2 re-review (OPUS): A-D ADDRESSED. The 375px axe flake is BRANCH-CAUSED and REAL: main 30/30 vs branch 22/30;
  the flagged node is the toolkit TOGGLE (not "Send the cats to bed"): keepOutOfPanel drops both cats onto
  homeSpot().y keeping x, then the tabby walks left through the lead — covering the toggle 0.3-0.4 s in 14/20 opens
  (<24 px visible for ~0.1-0.18 s); existing test :2422 checks panel items only. Fix tried in a throwaway build:
  0/20 overlaps, axe 30/30, companion e2e 68/0.
Ruling 8: apply the reviewer's product fix (after the follower's keepOutOfPanel at Companion.tsx ~3518: on his row,
  she never stands on/right of him — x ≤ lead.x − CAT_W − FOLLOW_GAP) + extend :2422 to cover the toggle +
  axe 375px at --repeat-each=30. A WCAG 2.5.8 regression on the toggle blocks merge. Cost if wrong: a ~90 px
  sideways jump on the panel's first frame.
Round 3 (53ec294): toggle fix applied as reviewer specified; extended :2422 test red 24/24 on cb88167, green 24/24; axe 375px 30/30; verify 687; companion e2e 68/0. Scoped re-review dispatched (SONNET).
Round 3 re-review (SONNET): ADDRESSED, no new breakage, Ready to merge: Yes. Nits: left-edge limit is ~84 px not 76
  (EDGE); toggle assertion's `?.` guards could pass silently if the selector stopped matching.
FOR THIN / follow-ups: ResizeObserver re-probe for ground that shifts without a scroll; under-load head hits on
  head-clear stops; worlds.spec.ts:7 (dev-only route pattern); copy tone calls ("Big nap year.", "I guard the
  facts. Mostly.", "None of them fake"/"Real."); lockstep pair departures.
